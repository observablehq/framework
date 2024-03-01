import {join} from "node:path";
import * as clack from "@clack/prompts";
import wrapAnsi from "wrap-ansi";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {ClackEffects} from "./clack.js";
import {commandRequiresAuthenticationMessage} from "./commandInstruction.js";
import type {Config} from "./config.js";
import {CliError, isApiError, isHttpError} from "./error.js";
import type {Logger, Writer} from "./logger.js";
import {
  type AuthEffects,
  defaultEffects as defaultAuthEffects,
  formatUser,
  loginInner,
  validWorkspaces
} from "./observableApiAuth.js";
import {ObservableApiClient} from "./observableApiClient.js";
import {
  type GetCurrentUserResponse,
  type GetDeployResponse,
  type GetProjectResponse,
  type PostEditProjectRequest,
  type WorkspaceResponse
} from "./observableApiClient.js";
import {
  type ConfigEffects,
  type DeployConfig,
  defaultEffects as defaultConfigEffects,
  getDeployConfig,
  setDeployConfig
} from "./observableApiConfig.js";
import {slugify} from "./slugify.js";
import {Telemetry} from "./telemetry.js";
import type {TtyEffects} from "./tty.js";
import {bold, defaultEffects as defaultTtyEffects, inverse, link, underline, yellow} from "./tty.js";

const DEPLOY_POLL_MAX_MS = 1000 * 60 * 5;
const DEPLOY_POLL_INTERVAL_MS = 1000 * 5;

export interface DeployOptions {
  config: Config;
  message: string | undefined;
  deployPollInterval?: number;
}

export interface DeployEffects extends ConfigEffects, TtyEffects, AuthEffects {
  getDeployConfig: (sourceRoot: string) => Promise<DeployConfig>;
  setDeployConfig: (sourceRoot: string, config: DeployConfig) => Promise<void>;
  clack: ClackEffects;
  logger: Logger;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

const defaultEffects: DeployEffects = {
  ...defaultConfigEffects,
  ...defaultTtyEffects,
  ...defaultAuthEffects,
  getDeployConfig,
  setDeployConfig,
  clack,
  logger: console,
  input: process.stdin,
  output: process.stdout
};

type DeployTargetInfo =
  | {create: true; workspace: {id: string; login: string}; projectSlug: string; title: string}
  | {create: false; workspace: {id: string; login: string}; project: GetProjectResponse};

/** Deploy a project to ObservableHQ */
export async function deploy(
  {config, message, deployPollInterval = DEPLOY_POLL_INTERVAL_MS}: DeployOptions,
  effects = defaultEffects
): Promise<void> {
  const {clack} = effects;
  Telemetry.record({event: "deploy", step: "start"});
  clack.intro(inverse(" observable deploy "));

  let apiKey = await effects.getObservableApiKey(effects);
  const apiClient = new ObservableApiClient(apiKey ? {apiKey} : {});
  const deployConfig = await effects.getDeployConfig(config.root);

  if (deployConfig.workspaceLogin && !deployConfig.workspaceLogin.match(/^@?[a-z0-9-]+$/)) {
    throw new CliError(
      `Found invalid workspace login in ${join(config.root, ".observablehq", "deploy.json")}: ${
        deployConfig.workspaceLogin
      }.`
    );
  }
  if (deployConfig.projectSlug && !deployConfig.projectSlug.match(/^[a-z0-9-]+$/)) {
    throw new CliError(
      `Found invalid project slug in ${join(config.root, ".observablehq", "deploy.json")}: ${deployConfig.projectSlug}.`
    );
  }

  const legacyConfig = config as unknown as {deploy: null | {project: string; workspace: string}};
  if (legacyConfig.deploy && deployConfig.projectId) {
    if (!deployConfig.projectSlug || !deployConfig.workspaceLogin) {
      clack.log.info("Copying deploy information from the config file to deploy.json.");
      deployConfig.projectSlug = legacyConfig.deploy.project;
      deployConfig.workspaceLogin = legacyConfig.deploy.workspace.replace(/^@/, "");
      effects.setDeployConfig(config.root, deployConfig);
    }
    clack.log.info("The `deploy` section of your config file is obsolete and can be deleted.");
  }

  let currentUser: GetCurrentUserResponse | null = null;
  let authError: null | "unauthenticated" | "forbidden" = null;
  try {
    if (apiKey) {
      currentUser = await apiClient.getCurrentUser();
      // List of valid workspaces that can be used to create projects.
      currentUser = {...currentUser, workspaces: validWorkspaces(currentUser.workspaces)};
    }
  } catch (error) {
    if (isHttpError(error)) {
      if (error.statusCode === 401) authError = "unauthenticated";
      else if (error.statusCode === 403) authError = "forbidden";
      else throw error;
    } else {
      throw error;
    }
  }

  if (!currentUser) {
    const message =
      authError === "unauthenticated" || authError === null
        ? "You must be logged in to Observable to deploy. Do you want to do that now?"
        : "Your authentication is invalid. Do you want to log in to Observable again?";
    const choice = await clack.confirm({
      message,
      active: "Yes, log in",
      inactive: "No, cancel deploy"
    });
    if (!choice) {
      clack.outro(yellow("Deploy canceled."));
    }
    if (clack.isCancel(choice) || !choice) throw new CliError("User canceled deploy", {print: false, exitCode: 0});

    ({currentUser, apiKey} = await loginInner(effects));
    apiClient.setApiKey(apiKey);
  }
  if (!currentUser) throw new CliError(commandRequiresAuthenticationMessage);

  if (deployConfig.projectId && (!deployConfig.projectSlug || !deployConfig.workspaceLogin)) {
    const spinner = clack.spinner();
    clack.log.warn("The `projectSlug` or `workspaceLogin` is missing from your deploy.json.");
    spinner.start(`Searching for project ${deployConfig.projectId}`);
    let found = false;
    for (const workspace of currentUser.workspaces) {
      const projects = await apiClient.getWorkspaceProjects(workspace.login);
      const project = projects.find((p) => p.id === deployConfig.projectId);
      if (project) {
        deployConfig.projectSlug = project.slug;
        deployConfig.workspaceLogin = workspace.login;
        effects.setDeployConfig(config.root, deployConfig);
        found = true;
        break;
      }
    }
    if (found) {
      spinner.stop(`Project @${deployConfig.workspaceLogin}/${deployConfig.projectSlug} found.`);
    } else {
      spinner.stop(`Project ${deployConfig.projectId} not found. Ignoring…`);
    }
  }

  let deployTarget: DeployTargetInfo;
  const projectUpdates: PostEditProjectRequest = {};
  if (deployConfig.workspaceLogin && deployConfig.projectSlug) {
    try {
      const project = await apiClient.getProject({
        workspaceLogin: deployConfig.workspaceLogin,
        projectSlug: deployConfig.projectSlug
      });
      deployTarget = {create: false, workspace: project.owner, project};
      if (config.title !== project.title) projectUpdates.title = config.title;
    } catch (error) {
      if (!isHttpError(error) || error.statusCode !== 404) {
        throw error;
      }
    }
  }

  deployTarget ??= await promptDeployTarget(effects, apiClient, config, currentUser);

  const previousProjectId = deployConfig?.projectId;
  let targetDescription: string;

  if (deployTarget.create) {
    try {
      const project = await apiClient.postProject({
        slug: deployTarget.projectSlug,
        title: deployTarget.title,
        workspaceId: deployTarget.workspace.id
      });
      deployTarget = {create: false, workspace: deployTarget.workspace, project};
    } catch (error) {
      if (isApiError(error) && error.details.errors.some((e) => e.code === "TOO_MANY_PROJECTS")) {
        clack.log.error(
          wrapAnsi(
            `The Starter tier can only deploy one project. Upgrade to unlimited projects at ${link(
              `https://observablehq.com/team/@${deployTarget.workspace.login}/settings`
            )}`,
            effects.outputColumns - 4
          )
        );
      } else {
        clack.log.error(
          wrapAnsi(`Could not create project: ${error instanceof Error ? error.message : error}`, effects.outputColumns)
        );
      }
      clack.outro(yellow("Deploy canceled"));
      throw new CliError("Error during deploy", {cause: error, print: false});
    }
  } else {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    targetDescription = `${deployTarget.project.title} (@${deployTarget.workspace.login}/${deployTarget.project.slug})`;
    const previousProjectId = deployConfig.projectId;
    if (previousProjectId && previousProjectId !== deployTarget.project.id) {
      clack.log.warn(
        `The \`projectId\` in your deploy.json does not match. Continuing will overwrite ${bold(targetDescription)}.`
      );
      if (effects.isTty) {
        const choice = await clack.confirm({
          message: "Do you want to continue deploying?",
          active: "Yes, overwrite",
          inactive: "No, cancel"
        });
        if (!choice) {
          clack.outro(yellow("Deploy canceled."));
        }
        if (clack.isCancel(choice) || !choice) {
          throw new CliError("User canceled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    } else if (previousProjectId) {
      clack.log.info(`Deploying to ${bold(targetDescription)}.`);
    } else {
      clack.log.warn(
        `The \`projectId\` in your deploy.json is missing. Continuing will overwrite ${bold(targetDescription)}.`
      );
      if (effects.isTty) {
        const choice = await clack.confirm({
          message: "Do you want to continue deploying?",
          active: "Yes, overwrite",
          inactive: "No, cancel"
        });
        if (!choice) {
          clack.outro(yellow("Deploy canceled."));
        }
        if (clack.isCancel(choice) || !choice) {
          throw new CliError("User canceled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Running non-interactively, cancelling due to conflictg");
      }
    }
  }

  await effects.setDeployConfig(config.root, {
    projectId: deployTarget.project.id,
    projectSlug: deployTarget.project.slug,
    workspaceLogin: deployTarget.workspace.login
  });

  // Create the new deploy on the server
  if (message === undefined) {
    const input = await clack.text({
      message: "What changed in this deploy?",
      placeholder: "Enter a deploy message (optional)"
    });
    if (clack.isCancel(input)) throw new CliError("User canceled deploy", {print: false, exitCode: 0});
    message = input;
  }

  let deployId;
  try {
    deployId = await apiClient.postDeploy({projectId: deployTarget.project.id, message});
  } catch (error) {
    if (isHttpError(error)) {
      if (error.statusCode === 404) {
        throw new CliError(`Project @${deployTarget.workspace.login}/${deployTarget.project.slug} not found.`, {
          cause: error
        });
      } else if (error.statusCode === 403) {
        throw new CliError(
          `You don't have permission to deploy to @${deployTarget.workspace.login}/${deployTarget.project.slug}.`,
          {cause: error}
        );
      }
    }
    throw error;
  }

  // Build the project
  await build({config}, new DeployBuildEffects(apiClient, deployId, effects));

  // Mark the deploy as uploaded
  await apiClient.postDeployUploaded(deployId);

  // Poll for processing completion
  const spinner = clack.spinner();
  spinner.start("Server processing deploy");
  const pollExpiration = Date.now() + DEPLOY_POLL_MAX_MS;
  let deployInfo: null | GetDeployResponse = null;
  pollLoop: while (true) {
    if (Date.now() > pollExpiration) {
      spinner.stop("Deploy timed out");
      throw new CliError(`Deploy failed to process on server: status = ${deployInfo?.status}`);
    }
    deployInfo = await apiClient.getDeploy(deployId);
    switch (deployInfo.status) {
      case "pending":
        break;
      case "uploaded":
        spinner.stop("Deploy complete");
        break pollLoop;
      case "error":
        spinner.stop("Deploy failed");
        throw new CliError("Deploy failed to process on server");
      default:
        spinner.stop("Unknown status");
        throw new CliError(`Unknown deploy status: ${deployInfo.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, deployPollInterval));
  }
  if (!deployInfo) throw new CliError("Deploy failed to process on server");

  // Update project title if necessary
  if (previousProjectId && previousProjectId === deployTarget.project.id && typeof projectUpdates?.title === "string") {
    await apiClient.postEditProject(deployTarget.project.id, projectUpdates as PostEditProjectRequest);
  }
  clack.outro(`Deployed project now visible at ${link(deployInfo.url)}`);
  Telemetry.record({event: "deploy", step: "finish"});
}

class DeployBuildEffects implements BuildEffects {
  readonly logger: Logger;
  readonly output: Writer;
  constructor(
    private readonly apiClient: ObservableApiClient,
    private readonly deployId: string,
    effects: DeployEffects
  ) {
    this.logger = effects.logger;
    this.output = effects.output;
  }
  async copyFile(sourcePath: string, outputPath: string) {
    const relativePath = outputPath.replace(/^\//, "");
    this.logger.log(relativePath);
    try {
      await this.apiClient.postDeployFile(this.deployId, sourcePath, relativePath);
    } catch (error) {
      if (isApiError(error) && error.details.errors.some((e) => e.code === "FILE_QUOTA_EXCEEDED")) {
        throw new CliError("You have reached the total file size limit.", {cause: error});
      }
      // 413 is "Payload Too Large", however sometimes Cloudflare returns a
      // custom Cloudflare error, 520. Sometimes we also see 502. Handle them all
      if (isHttpError(error) && (error.statusCode === 413 || error.statusCode === 503 || error.statusCode === 520)) {
        throw new CliError(`File too large to deploy: ${sourcePath}. Maximum file size is 50MB.`, {cause: error});
      }
      throw error;
    }
  }
  async writeFile(outputPath: string, content: Buffer | string) {
    const relativePath = outputPath.replace(/^\//, "");
    this.logger.log(relativePath);
    try {
      await this.apiClient.postDeployFileContents(this.deployId, content, relativePath);
    } catch (error) {
      if (isApiError(error) && error.details.errors.some((e) => e.code === "FILE_QUOTA_EXCEEDED")) {
        throw new CliError("You have reached the total file size limit.", {cause: error});
      }
      throw error;
    }
  }
}

// export for testing
export async function promptDeployTarget(
  effects: DeployEffects,
  api: ObservableApiClient,
  config: Config,
  currentUser: GetCurrentUserResponse
): Promise<DeployTargetInfo> {
  if (!effects.isTty) throw new CliError("Deploy not configured.");
  const {clack} = effects;

  clack.log.info("To configure deploy, we need to ask you a few questions.");

  if (currentUser.workspaces.length === 0) {
    clack.log.error(
      `You don’t have any Observable workspaces. Go to ${underline("https://observablehq.com/team/new")} to create one.`
    );
    throw new CliError("No Observable workspace found.", {print: false, exitCode: 1});
  }
  let workspace: WorkspaceResponse;
  if (currentUser.workspaces.length === 1) {
    workspace = currentUser.workspaces[0];
    clack.log.step(`Deploying to the ${bold(formatUser(workspace))} workspace.`);
  } else {
    const chosenWorkspace = await clack.select<{value: WorkspaceResponse; label: string}[], WorkspaceResponse>({
      message: "Which Observable workspace do you want to use?",
      options: currentUser.workspaces
        .map((w) => ({value: w, label: formatUser(w)}))
        .sort((a, b) => b.value.role.localeCompare(a.value.role) || a.label.localeCompare(b.label)),
      initialValue: currentUser.workspaces[0] // the oldest workspace, maybe?
    });
    if (clack.isCancel(chosenWorkspace)) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
    }
    workspace = chosenWorkspace;
  }

  let projectSlug: string | null = null;
  let existingProjects: GetProjectResponse[] = [];
  try {
    existingProjects = await api.getWorkspaceProjects(workspace.login);
  } catch (error) {
    if (isHttpError(error) && error.statusCode === 404) {
      throw new CliError(`Workspace ${workspace.login} not found.`, {cause: error});
    }
    throw error;
  }

  if (existingProjects.length > 0) {
    const chosenProject = await clack.select<{value: string | null; label: string}[], string | null>({
      message: "Which project do you want to use?",
      options: [
        {value: null, label: "Create a new project"},
        ...existingProjects
          .map((p) => ({
            value: p.slug,
            label: `${p.title} (${p.slug})`
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      ]
    });
    if (clack.isCancel(chosenProject)) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
    } else if (chosenProject !== null) {
      return {create: false, workspace, project: existingProjects.find((p) => p.slug === chosenProject)!};
    }
  } else {
    const confirmChoice = await clack.confirm({
      message: "No projects found. Do you want to create a new project?",
      active: "Yes, continue",
      inactive: "No, cancel"
    });
    if (!confirmChoice) {
      clack.outro(yellow("Deploy canceled."));
    }
    if (clack.isCancel(confirmChoice) || !confirmChoice) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
    }
  }

  let title = config.title;
  if (title === undefined) {
    clack.log.warn("You haven’t configured a title for your project.");
    const titleChoice = await clack.text({
      message: "What title do you want to use?",
      placeholder: "Enter a project title",
      validate: (title) => (title ? undefined : "A title is required.")
    });
    if (clack.isCancel(titleChoice)) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
    }
    title = titleChoice;
    clack.log.info("You should add this title to your observablehq.config.ts file.");
  }

  // TODO This should refer to the URL of the project, not the slug.
  const defaultProjectSlug = config.title ? slugify(config.title) : "";
  const projectSlugChoice = await clack.text({
    message: "What slug do you want to use?",
    placeholder: defaultProjectSlug,
    defaultValue: defaultProjectSlug,
    validate: (slug) =>
      !slug || slug.match(/^[a-z0-9-]+$/)
        ? undefined
        : "Slugs must be lowercase and contain only letters, numbers, and hyphens."
  });
  if (clack.isCancel(projectSlugChoice)) {
    throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
  }
  projectSlug = projectSlugChoice;

  return {create: true, workspace, projectSlug, title};
}
