import {join} from "node:path";
import * as clack from "@clack/prompts";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {ClackEffects} from "./clack.js";
import {commandRequiresAuthenticationMessage} from "./commandInstruction.js";
import type {Config} from "./config.js";
import {CliError, isHttpError} from "./error.js";
import type {Logger, Writer} from "./logger.js";
import {type AuthEffects, defaultEffects as defaultAuthEffects, formatUser, loginInner} from "./observableApiAuth.js";
import type {GetCurrentUserResponse, GetProjectResponse, WorkspaceResponse} from "./observableApiClient.js";
import {ObservableApiClient, type PostEditProjectRequest} from "./observableApiClient.js";
import type {ConfigEffects, DeployConfig} from "./observableApiConfig.js";
import {defaultEffects as defaultConfigEffects, getDeployConfig, setDeployConfig} from "./observableApiConfig.js";
import {Telemetry} from "./telemetry.js";
import type {TtyEffects} from "./tty.js";
import {blue, bold, defaultEffects as defaultTtyEffects, inverse, underline, yellow} from "./tty.js";

export interface DeployOptions {
  config: Config;
  message: string | undefined;
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
export async function deploy({config, message}: DeployOptions, effects = defaultEffects): Promise<void> {
  Telemetry.record({event: "deploy", step: "start"});
  effects.clack.intro(inverse(" observable deploy "));

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
      effects.clack.log.info(
        "Migrating deploy config. You should delete the `deploy` field from your observablehq.config.ts file."
      );
      deployConfig.projectSlug = legacyConfig.deploy.project;
      deployConfig.workspaceLogin = legacyConfig.deploy.workspace.replace(/^@/, "");
      effects.setDeployConfig(config.root, deployConfig);
    } else {
      effects.clack.log.info(
        "You still have legacy config information in the `deploy` field of your observablehq.config.ts file. You should delete that section."
      );
    }
  }

  let currentUser: GetCurrentUserResponse | null = null;
  let authError: null | "unauthenticated" | "forbidden" = null;
  try {
    if (apiKey) currentUser = await apiClient.getCurrentUser();
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
        ? "You must be logged in to Observable Cloud to deploy. Do you want to do that now?"
        : "Your authentication is invalid. Do you want to log in to Observable Cloud again?";
    const choice = await effects.clack.confirm({
      message,
      active: "Yes, log in",
      inactive: "No, cancel deploy"
    });
    if (!choice) {
      effects.clack.outro(yellow("Deploy cancelled."));
    }
    if (effects.clack.isCancel(choice) || !choice)
      throw new CliError("User cancelled deploy", {print: false, exitCode: 0});

    ({currentUser, apiKey} = await loginInner(effects));
    apiClient.setApiKey(apiKey);
  }
  if (!currentUser) throw new CliError(commandRequiresAuthenticationMessage);

  if (deployConfig.projectId && (!deployConfig.projectSlug || !deployConfig.workspaceLogin)) {
    const spinner = effects.clack.spinner();
    effects.clack.log.warn("The `projectSlug` or `workspaceLogin` is missing from your deploy.json.");
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
      throw new CliError(`Could not create project: ${error instanceof Error ? error.message : error}`, {cause: error});
    }
  } else {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    targetDescription = `${deployTarget.project.title} (@${deployTarget.workspace.login}/${deployTarget.project.slug})`;
    const previousProjectId = deployConfig.projectId;
    if (previousProjectId && previousProjectId !== deployTarget.project.id) {
      effects.clack.log.warn(
        `The \`projectId\` in your deploy.json does not match. Continuing will overwrite ${bold(targetDescription)}.`
      );
      if (effects.isTty) {
        const choice = await effects.clack.confirm({
          message: "Do you want to continue deploying?",
          active: "Yes, overwrite",
          inactive: "No, cancel"
        });
        if (!choice) {
          effects.clack.outro(yellow("Deploy cancelled."));
        }
        if (effects.clack.isCancel(choice) || !choice) {
          throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    } else if (previousProjectId) {
      effects.clack.log.info(`Deploying to ${bold(targetDescription)}.`);
    } else {
      effects.clack.log.warn(
        `The \`projectId\` in your deploy.json is missing. Continuing will overwrite ${bold(targetDescription)}.`
      );
      if (effects.isTty) {
        const choice = await effects.clack.confirm({
          message: "Do you want to continue deploying?",
          active: "Yes, overwrite",
          inactive: "No, cancel"
        });
        if (!choice) {
          effects.clack.outro(yellow("Deploy cancelled."));
        }
        if (effects.clack.isCancel(choice) || !choice) {
          throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
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
    const input = await effects.clack.text({
      message: "What changed in this deploy?",
      placeholder: "Enter a deploy message (optional)"
    });
    if (effects.clack.isCancel(input)) throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
    message = input;
  }
  const deployId = await apiClient.postDeploy({projectId: deployTarget.project.id, message});

  // Build the project
  await build({config, clientEntry: "./src/client/deploy.js"}, new DeployBuildEffects(apiClient, deployId, effects));

  // Mark the deploy as uploaded
  const deployInfo = await apiClient.postDeployUploaded(deployId);
  // Update project title if necessary
  if (previousProjectId && previousProjectId === deployTarget.project.id && typeof projectUpdates?.title === "string") {
    await apiClient.postEditProject(deployTarget.project.id, projectUpdates as PostEditProjectRequest);
  }
  effects.clack.outro(`Deployed project now visible at ${blue(deployInfo.url)}`);
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
    this.logger.log(outputPath);
    await this.apiClient.postDeployFile(this.deployId, sourcePath, outputPath);
  }
  async writeFile(outputPath: string, content: Buffer | string) {
    this.logger.log(outputPath);
    await this.apiClient.postDeployFileContents(this.deployId, content, outputPath);
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}

async function promptDeployTarget(
  effects: DeployEffects,
  api: ObservableApiClient,
  config: Config,
  currentUser: GetCurrentUserResponse
): Promise<DeployTargetInfo> {
  if (!effects.isTty) throw new CliError("Deploy not configured.");

  effects.clack.log.info("To configure deploy, we need to ask you a few questions.");

  if (currentUser.workspaces.length === 0) {
    effects.clack.log.error(
      `You don’t have any Observable workspaces. Go to ${underline("https://observablehq.com/team/new")} to create one.`
    );
    throw new CliError("No Observable workspace found.", {print: false, exitCode: 1});
  }
  let workspace: WorkspaceResponse;
  if (currentUser.workspaces.length === 1) {
    workspace = currentUser.workspaces[0];
    effects.clack.log.step(`Deploying to the ${bold(formatUser(workspace))} workspace.`);
  } else {
    const chosenWorkspace = await clack.select<{value: WorkspaceResponse; label: string}[], WorkspaceResponse>({
      message: "Which Observable workspace do you want to use?",
      options: currentUser.workspaces
        .map((w) => ({value: w, label: formatUser(w)}))
        .sort((a, b) => a.label.localeCompare(b.label)),
      initialValue: currentUser.workspaces[0] // the oldest workspace, maybe?
    });
    if (clack.isCancel(chosenWorkspace)) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
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
    const chosenProject = await effects.clack.select<{value: string | null; label: string}[], string | null>({
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
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    } else if (chosenProject !== null) {
      return {create: false, workspace, project: existingProjects.find((p) => p.slug === chosenProject)!};
    }
  } else {
    const confirmChoice = await effects.clack.confirm({
      message: "No projects found. Do you want to create a new project?",
      active: "Yes, continue",
      inactive: "No, cancel"
    });
    if (!confirmChoice) {
      effects.clack.outro(yellow("Deploy cancelled."));
    }
    if (effects.clack.isCancel(confirmChoice) || !confirmChoice) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    }
  }

  let title = config.title;
  if (title === undefined) {
    effects.clack.log.warn("You haven’t configured a title for your project.");
    const titleChoice = await effects.clack.text({
      message: "What title do you want to use?",
      placeholder: "Enter a project title",
      validate: (title) => (title ? undefined : "A title is required.")
    });
    if (clack.isCancel(titleChoice)) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    }
    title = titleChoice;
    effects.clack.log.info("You should add this title to your observablehq.config.ts file.");
  }

  // TODO This should refer to the URL of the project, not the slug.
  const defaultProjectSlug = config.title ? slugify(config.title) : "";
  const projectSlugChoice = await effects.clack.text({
    message: "What slug do you want to use?",
    placeholder: defaultProjectSlug,
    defaultValue: defaultProjectSlug,
    validate: (slug) =>
      !slug || slug.match(/^[a-z0-9-]+$/)
        ? undefined
        : "Slugs must be lowercase and contain only letters, numbers, and hyphens."
  });
  if (clack.isCancel(projectSlugChoice)) {
    throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
  }
  projectSlug = projectSlugChoice;

  return {create: true, workspace, projectSlug, title};
}
