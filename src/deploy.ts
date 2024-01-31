import {join} from "node:path";
import * as clack from "@clack/prompts";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {ClackEffects} from "./clack.js";
import {commandInstruction} from "./commandInstruction.js";
import type {Config} from "./config.js";
import {CliError, isHttpError} from "./error.js";
import type {Logger, Writer} from "./logger.js";
import {formatUser} from "./observableApiAuth.js";
import type {GetProjectResponse, WorkspaceResponse} from "./observableApiClient.js";
import {ObservableApiClient, type PostEditProjectRequest} from "./observableApiClient.js";
import type {ConfigEffects} from "./observableApiConfig.js";
import {
  type ApiKey,
  type DeployConfig,
  defaultEffects as defaultConfigEffects,
  getDeployConfig,
  getObservableApiKey,
  setDeployConfig
} from "./observableApiConfig.js";
import {Telemetry} from "./telemetry.js";
import type {TtyEffects} from "./tty.js";
import {blue, bold, defaultEffects as defaultTtyEffects, underline} from "./tty.js";

export const CREATE_NEW_PROJECT_SYMBOL: symbol = Symbol();

export interface DeployOptions {
  config: Config;
  message: string | undefined;
}

export interface DeployEffects extends ConfigEffects, TtyEffects {
  getObservableApiKey: (effects?: DeployEffects) => Promise<ApiKey>;
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
  getObservableApiKey,
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
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(effects);
  const apiClient = new ObservableApiClient({apiKey});
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
        "Migrating deploy config. You should delete the `deploy` field from your observable.config.ts file."
      );
      deployConfig.projectSlug = legacyConfig.deploy.project;
      deployConfig.workspaceLogin = legacyConfig.deploy.workspace.replace(/^@/, "");
      effects.setDeployConfig(config.root, deployConfig);
    } else {
      effects.clack.log.info(
        "You still have legacy config information in the `deploy` field of your observable.config.ts file. You should delete that section."
      );
    }
  }

  if (deployConfig.projectId && (!deployConfig.projectSlug || !deployConfig.workspaceLogin)) {
    const spinner = effects.clack.spinner();
    effects.clack.log.step("Your config has a project ID but no project slug or workspace login.");
    spinner.start("Searching for previous deploy target");
    const {workspaces} = await apiClient.getCurrentUser();
    let found = false;
    for (const workspace of workspaces) {
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
      spinner.stop(`Project @${deployConfig.workspaceLogin}/${deployConfig.projectSlug} matches.`);
    } else {
      spinner.stop("Project not found.");
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

  deployTarget ??= await promptDeployTarget(effects, apiClient, config);

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
    targetDescription = `${deployTarget.workspace.login}/${deployTarget.project.slug}`;
    const previousProjectId = deployConfig.projectId;
    if (previousProjectId && previousProjectId !== deployTarget.project.id) {
      effects.clack.log.warn(
        `This project was last deployed to a different project on Observable Cloud from ${bold(targetDescription)}.`
      );
      if (effects.isTty) {
        const choice = await effects.clack.confirm({message: "Do you want to deploy anyway?"});
        if (effects.clack.isCancel(choice) || !choice)
          throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    } else if (!previousProjectId) {
      effects.clack.log.warn(
        `There is an existing project on Observable Cloud named ${bold(
          `@${deployTarget.workspace}/${deployTarget.project.slug}`
        )} that is not associated with this repository. If you continue, you'll overwrite the existing content of the project.`
      );
      if (effects.isTty) {
        const choice = await effects.clack.confirm({message: "Do you want to deploy anyway?"});
        if (effects.clack.isCancel(choice) || !choice)
          throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
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
    const input = await effects.clack.text({message: "What changed in this deploy?"});
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
  logger.log(`Deployed project now visible at ${blue(deployInfo.url)}`);
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
  config: Config
): Promise<DeployTargetInfo> {
  if (!effects.isTty) throw new CliError("No deploy target configured, and running non-interactively.");

  effects.clack.log.info("You don't have a deploy target configured. Let's set that up.");

  let workspaces;
  try {
    ({workspaces} = await api.getCurrentUser());
  } catch (error) {
    if (isHttpError(error) && error.statusCode === 401) {
      throw new CliError(
        `You need to be logged in to deploy to Observable. Run ${commandInstruction("login")} to log in.`
      );
    }
    throw error;
  }
  if (workspaces.length === 0) {
    effects.clack.log.error(
      `You don't have any workspaces to deploy to. Go to ${underline(
        "https://observablehq.com/team/new"
      )} to create one.`
    );
    throw new CliError("No workspaces to deploy to.", {print: false, exitCode: 1});
  }
  let workspace: WorkspaceResponse;
  if (workspaces.length === 1) {
    workspace = workspaces[0];
  } else {
    const chosenWorkspace = await clack.select<{value: WorkspaceResponse; label: string}[], WorkspaceResponse>({
      message: "What workspace do you want to deploy to?",
      options: workspaces.map((w) => ({value: w, label: formatUser(w)}))
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
    const chosenProject = await effects.clack.select({
      message: "What project do you want to deploy to?",
      options: [
        {value: CREATE_NEW_PROJECT_SYMBOL, label: "Create a new project"},
        ...existingProjects.map((p) => ({value: p.slug, label: `${p.title} (${p.slug})`}))
      ]
    });
    if (clack.isCancel(chosenProject)) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    } else if (chosenProject !== CREATE_NEW_PROJECT_SYMBOL) {
      return {create: false, workspace, project: chosenProject as GetProjectResponse};
    }
  } else {
    const confirmChoice = await effects.clack.confirm({message: "Do you want to create a new project?"});
    if (effects.clack.isCancel(confirmChoice) || !confirmChoice) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    }
  }

  let title = config.title;
  if (title === undefined) {
    effects.clack.log.warn("You haven't configured a title for your project.");
    const titleChoice = await effects.clack.text({
      message: "What title do you want to use on the Platform?",
      placeholder: "This can be any text.",
      validate: (title) => (title ? undefined : "Titles are required and must be at least 1 character long.")
    });
    if (clack.isCancel(titleChoice)) {
      throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
    }
    title = titleChoice;
    effects.clack.log.info("You should add this to your observable.config.ts file.");
  }

  const projectSlugChoice = await effects.clack.text({
    message: "What do you want to use as your project slug?",
    initialValue: config.title ? slugify(config.title) : "",
    validate: (slug) =>
      slug.match(/^[a-z0-9-]+$/)
        ? undefined
        : "Slugs must be all lowercase and contain only letters, numbers, and hyphens."
  });
  if (clack.isCancel(projectSlugChoice)) {
    throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
  }
  projectSlug = projectSlugChoice;

  return {create: true, workspace, projectSlug, title};
}
