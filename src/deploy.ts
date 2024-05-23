import {createHash} from "node:crypto";
import type {Stats} from "node:fs";
import {readFile, stat} from "node:fs/promises";
import {join} from "node:path/posix";
import * as clack from "@clack/prompts";
import wrapAnsi from "wrap-ansi";
import type {BuildEffects, BuildManifest, BuildOptions} from "./build.js";
import {FileBuildEffects, build} from "./build.js";
import type {ClackEffects} from "./clack.js";
import {commandRequiresAuthenticationMessage} from "./commandInstruction.js";
import {RateLimiter, runAllWithConcurrencyLimit} from "./concurrency.js";
import type {Config} from "./config.js";
import {CliError, isApiError, isEnoent, isHttpError} from "./error.js";
import {visitFiles} from "./files.js";
import type {Logger} from "./logger.js";
import type {AuthEffects} from "./observableApiAuth.js";
import {defaultEffects as defaultAuthEffects, formatUser, loginInner, validWorkspaces} from "./observableApiAuth.js";
import {ObservableApiClient} from "./observableApiClient.js";
import type {
  DeployManifestFile,
  GetCurrentUserResponse,
  GetDeployResponse,
  GetProjectResponse,
  PostEditProjectRequest,
  WorkspaceResponse
} from "./observableApiClient.js";
import type {ConfigEffects, DeployConfig} from "./observableApiConfig.js";
import {defaultEffects as defaultConfigEffects, getDeployConfig, setDeployConfig} from "./observableApiConfig.js";
import {slugify} from "./slugify.js";
import {Telemetry} from "./telemetry.js";
import type {TtyEffects} from "./tty.js";
import {bold, defaultEffects as defaultTtyEffects, faint, inverse, link, underline, yellow} from "./tty.js";

const DEPLOY_POLL_MAX_MS = 1000 * 60 * 5;
const DEPLOY_POLL_INTERVAL_MS = 1000 * 5;
const BUILD_AGE_WARNING_MS = 1000 * 60 * 5;

export interface DeployOptions {
  config: Config;
  message?: string;
  deployPollInterval?: number;
  force: "build" | "deploy" | null;
  maxConcurrency?: number;
  deployId?: string;
}

export interface DeployEffects extends ConfigEffects, TtyEffects, AuthEffects {
  getDeployConfig: (sourceRoot: string) => Promise<DeployConfig>;
  setDeployConfig: (sourceRoot: string, config: DeployConfig) => Promise<void>;
  clack: ClackEffects;
  logger: Logger;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
  visitFiles: (root: string) => Generator<string>;
  stat: (path: string) => Promise<Stats>;
  build: ({config, addPublic}: BuildOptions, effects?: BuildEffects) => Promise<void>;
  readCacheFile: (sourceRoot: string, path: string) => Promise<string>;
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
  output: process.stdout,
  visitFiles,
  stat,
  build,
  readCacheFile
};

type DeployTargetInfo =
  | {create: true; workspace: {id: string; login: string}; projectSlug: string; title: string; accessLevel: string}
  | {create: false; workspace: {id: string; login: string}; project: GetProjectResponse};

/** Deploy a project to ObservableHQ */
export async function deploy(deployOptions: DeployOptions, effects = defaultEffects): Promise<void> {
  Telemetry.record({event: "deploy", step: "start", force: deployOptions.force});
  effects.clack.intro(`${inverse(" observable deploy ")} ${faint(`v${process.env.npm_package_version}`)}`);

  let deployInfo;
  if (deployOptions.deployId) {
    deployInfo = await continueExistingDeploy(deployOptions, effects, deployOptions.deployId);
  } else {
    deployInfo = await startNewDeploy(deployOptions, effects);
  }

  effects.clack.outro(`Deployed project now visible at ${link(deployInfo.url)}`);
  Telemetry.record({event: "deploy", step: "finish"});
}

async function continueExistingDeploy(
  deployOptions: DeployOptions,
  effects: DeployEffects,
  deployId: string
): Promise<GetDeployResponse> {
  const {apiClient} = await getApiClientAndCurrentUser(effects);

  await checkDeployCreated(apiClient, deployId);

  const buildFilePaths = await getBuildFilePaths(effects, deployOptions.config, deployOptions.force);

  await uploadFiles(effects, deployOptions.config, apiClient, deployId, buildFilePaths, deployOptions.maxConcurrency);
  await markDeployUploaded(effects, deployOptions.config, apiClient, deployId);
  const deployInfo = await pollForProcessingCompletion(effects, apiClient, deployId, deployOptions.deployPollInterval);

  return deployInfo;
}

async function startNewDeploy(deployOptions: DeployOptions, effects: DeployEffects): Promise<GetDeployResponse> {
  const {apiClient, currentUser} = await getApiClientAndCurrentUser(effects);

  const deployConfig = await getUpdatedDeployConfig(effects, deployOptions.config, apiClient, currentUser);
  const {deployTarget, projectUpdates} = await getDeployTarget(
    deployOptions.config,
    effects,
    apiClient,
    currentUser,
    deployConfig
  );

  const buildFilePaths = await getBuildFilePaths(effects, deployOptions.config, deployOptions.force);

  const deployId = await createNewDeploy(effects, deployOptions, apiClient, deployTarget);
  await uploadFiles(effects, deployOptions.config, apiClient, deployId, buildFilePaths, deployOptions.maxConcurrency);
  await markDeployUploaded(effects, deployOptions.config, apiClient, deployId);
  const deployInfo = await pollForProcessingCompletion(effects, apiClient, deployId, deployOptions.deployPollInterval);
  await maybeUpdateProject(apiClient, deployTarget, projectUpdates);

  return deployInfo;
}

async function getApiClientAndCurrentUser(effects: DeployEffects) {
  let apiKey = await effects.getObservableApiKey(effects);
  const apiClient = new ObservableApiClient(apiKey ? {apiKey, clack: effects.clack} : {clack: effects.clack});

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
    const choice = await effects.clack.confirm({
      message,
      active: "Yes, log in",
      inactive: "No, cancel deploy"
    });
    if (!choice) {
      effects.clack.outro(yellow("Deploy canceled."));
    }
    if (effects.clack.isCancel(choice) || !choice)
      throw new CliError("User canceled deploy", {print: false, exitCode: 0});

    ({currentUser, apiKey} = await loginInner(effects));
    apiClient.setApiKey(apiKey);
  }

  if (!currentUser) throw new CliError(commandRequiresAuthenticationMessage);
  return {apiClient, currentUser};
}

// Make sure deploy exists and has an expected status.
async function checkDeployCreated(apiClient: ObservableApiClient, deployId: string) {
  try {
    const deployInfo = await apiClient.getDeploy(deployId);
    if (deployInfo.status !== "created") {
      throw new CliError(`Deploy ${deployId} has an unexpected status: ${deployInfo.status}`);
    }
    return deployInfo;
  } catch (error) {
    if (isHttpError(error)) {
      throw new CliError(`Deploy ${deployId} not found.`, {
        cause: error
      });
    }
    throw error;
  }
}

// Get the deploy config, updating if necessary.
async function getUpdatedDeployConfig(
  effects: DeployEffects,
  config: Config,
  apiClient: ObservableApiClient,
  currentUser: GetCurrentUserResponse
) {
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

  return deployConfig;
}

// Get the deploy target, prompting the user as needed.
async function getDeployTarget(
  config,
  effects,
  apiClient,
  currentUser,
  deployConfig
): Promise<{deployTarget: DeployTargetInfo; projectUpdates: PostEditProjectRequest}> {
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

  deployTarget ??= await promptDeployTarget(effects, config, apiClient, currentUser);

  if (!deployTarget.create) {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    const targetDescription = `${deployTarget.project.title} (@${deployTarget.workspace.login}/${deployTarget.project.slug})`;
    if (deployConfig.projectId && deployConfig.projectId !== deployTarget.project.id) {
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
          effects.clack.outro(yellow("Deploy canceled."));
        }
        if (effects.clack.isCancel(choice) || !choice) {
          throw new CliError("User canceled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    } else if (deployConfig.projectId) {
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
          effects.clack.outro(yellow("Deploy canceled."));
        }
        if (effects.clack.isCancel(choice) || !choice) {
          throw new CliError("User canceled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Running non-interactively, cancelling due to conflictg");
      }
    }

    if (deployTarget.project.title !== config.title) {
      projectUpdates.title = config.title;
    }
  }

  if (deployTarget.create) {
    try {
      const project = await apiClient.postProject({
        slug: deployTarget.projectSlug,
        title: deployTarget.title,
        workspaceId: deployTarget.workspace.id,
        accessLevel: deployTarget.accessLevel
      });
      deployTarget = {create: false, workspace: deployTarget.workspace, project};
    } catch (error) {
      if (isApiError(error) && error.details.errors.some((e) => e.code === "TOO_MANY_PROJECTS")) {
        effects.clack.log.error(
          wrapAnsi(
            `The Starter tier can only deploy one project. Upgrade to unlimited projects at ${link(
              `https://observablehq.com/team/@${deployTarget.workspace.login}/settings`
            )}`,
            effects.outputColumns - 4
          )
        );
      } else {
        effects.clack.log.error(
          wrapAnsi(`Could not create project: ${error instanceof Error ? error.message : error}`, effects.outputColumns)
        );
      }
      effects.clack.outro(yellow("Deploy canceled"));
      throw new CliError("Error during deploy", {cause: error, print: false});
    }
  }

  await effects.setDeployConfig(config.root, {
    projectId: deployTarget.project.id,
    projectSlug: deployTarget.project.slug,
    workspaceLogin: deployTarget.workspace.login
  });

  return {deployTarget, projectUpdates};
}

// export for testing
export async function promptDeployTarget(
  effects: DeployEffects,
  config: Config,
  api: ObservableApiClient,
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
    const chosenWorkspace = await effects.clack.select<{value: WorkspaceResponse; label: string}[], WorkspaceResponse>({
      message: "Which Observable workspace do you want to use?",
      options: currentUser.workspaces
        .map((w) => ({value: w, label: formatUser(w)}))
        .sort((a, b) => b.value.role.localeCompare(a.value.role) || a.label.localeCompare(b.label)),
      initialValue: currentUser.workspaces[0] // the oldest workspace, maybe?
    });
    if (effects.clack.isCancel(chosenWorkspace)) {
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
    if (effects.clack.isCancel(chosenProject)) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
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
      effects.clack.outro(yellow("Deploy canceled."));
    }
    if (effects.clack.isCancel(confirmChoice) || !confirmChoice) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
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
    if (effects.clack.isCancel(titleChoice)) {
      throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
    }
    title = titleChoice;
    effects.clack.log.info("You should add this title to your observablehq.config.js file.");
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
  if (effects.clack.isCancel(projectSlugChoice)) {
    throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
  }
  projectSlug = projectSlugChoice;

  const accessLevel: string | symbol = await effects.clack.select({
    message: "Who is allowed to access your project?",
    options: [
      {value: "private", label: "Private", hint: "only allow workspace members"},
      {value: "public", label: "Public", hint: "allow anyone"}
    ]
  });
  if (effects.clack.isCancel(accessLevel)) {
    throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
  }

  return {create: true, workspace, projectSlug, title, accessLevel};
}

// Create the new deploy on the server.
async function createNewDeploy(
  effects: DeployEffects,
  deployOptions: DeployOptions,
  apiClient: ObservableApiClient,
  deployTarget: DeployTargetInfo
): Promise<string> {
  if (deployTarget.create) {
    throw Error("Incorrect deployTarget state");
  }

  let message = deployOptions.message;
  if (message === undefined) {
    const input = await effects.clack.text({
      message: "What changed in this deploy?",
      placeholder: "Enter a deploy message (optional)"
    });
    if (effects.clack.isCancel(input)) throw new CliError("User canceled deploy", {print: false, exitCode: 0});
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

  return deployId;
}

// Get the list of build files, doing a build if necessary.
async function getBuildFilePaths(effects: DeployEffects, config: Config, force: string | null): Promise<string[]> {
  let doBuild = force === "build";
  let buildFilePaths: string[] | null = null;

  // Check if the build is missing. If it is present, then continue; otherwise
  // if --no-build was specified, then error; otherwise if in a tty, ask the
  // user if they want to build; otherwise build automatically.
  try {
    buildFilePaths = await findBuildFiles(effects, config);
  } catch (error) {
    if (CliError.match(error, {message: /No build files found/})) {
      if (force === "deploy") {
        throw new CliError("No build files found.");
      } else if (!force) {
        if (effects.isTty) {
          const choice = await effects.clack.confirm({
            message: "No build files found. Do you want to build the project now?",
            active: "Yes, build and then deploy",
            inactive: "No, cancel deploy"
          });
          if (effects.clack.isCancel(choice) || !choice) {
            throw new CliError("User canceled deploy", {print: false, exitCode: 0});
          }
        }
        doBuild = true;
      }
    } else {
      throw error;
    }
  }

  // If we haven’t decided yet whether or not we’re building, check how old the
  // build is, and whether it is stale (i.e., whether the source files are newer
  // than the build). If in a tty, ask the user if they want to build; otherwise
  // deploy as is.
  if (!doBuild && !force && effects.isTty) {
    const leastRecentBuildMtimeMs = await findLeastRecentBuildMtimeMs(effects, config);
    const mostRecentSourceMtimeMs = await findMostRecentSourceMtimeMs(effects, config);
    const buildAge = Date.now() - leastRecentBuildMtimeMs;
    let initialValue = buildAge > BUILD_AGE_WARNING_MS;
    if (mostRecentSourceMtimeMs > leastRecentBuildMtimeMs) {
      effects.clack.log.warn(
        wrapAnsi(`Your source files have changed since you built ${formatAge(buildAge)}.`, effects.outputColumns)
      );
      initialValue = true;
    } else {
      effects.clack.log.info(wrapAnsi(`You built this project ${formatAge(buildAge)}.`, effects.outputColumns));
    }
    const choice = await effects.clack.confirm({
      message: "Would you like to build again before deploying?",
      initialValue,
      active: "Yes, build and then deploy",
      inactive: "No, deploy as is"
    });
    if (effects.clack.isCancel(choice)) throw new CliError("User canceled deploy", {print: false, exitCode: 0});
    doBuild = !!choice;
  }

  if (doBuild) {
    effects.clack.log.step("Building project");
    await effects.build(
      {config},
      new FileBuildEffects(config.output, join(config.root, ".observablehq", "cache"), {
        logger: effects.logger,
        output: effects.output
      })
    );
    buildFilePaths = await findBuildFiles(effects, config);
  }

  if (!buildFilePaths) throw new Error("No build files found.");
  return buildFilePaths;
}

function formatAge(age: number): string {
  if (age < 1000 * 60) {
    const seconds = Math.round(age / 1000);
    return `${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }
  if (age < 1000 * 60 * 60) {
    const minutes = Math.round(age / 1000 / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (age < 1000 * 60 * 60 * 12) {
    const hours = Math.round(age / 1000 / 60 / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return `at ${new Date(Date.now() - age).toLocaleString("en")}`;
}

async function readCacheFile(sourceRoot: string, path: string): Promise<string> {
  const fullPath = join(sourceRoot, ".observablehq", "cache", path);
  return await readFile(fullPath, "utf8");
}

async function findMostRecentSourceMtimeMs(effects: DeployEffects, config: Config): Promise<number> {
  let mostRecentMtimeMs = -Infinity;
  for await (const file of effects.visitFiles(config.root)) {
    const joinedPath = join(config.root, file);
    const stat = await effects.stat(joinedPath);
    if (stat.mtimeMs > mostRecentMtimeMs) {
      mostRecentMtimeMs = stat.mtimeMs;
    }
  }
  const cachePath = join(config.root, ".observablehq/cache");
  try {
    const cacheStat = await effects.stat(cachePath);
    if (cacheStat.mtimeMs > mostRecentMtimeMs) {
      mostRecentMtimeMs = cacheStat.mtimeMs;
    }
  } catch (error) {
    if (!isEnoent(error)) {
      throw error;
    }
  }
  return mostRecentMtimeMs;
}

async function findLeastRecentBuildMtimeMs(effects: DeployEffects, config: Config): Promise<number> {
  let leastRecentMtimeMs = Infinity;
  for await (const file of effects.visitFiles(config.output)) {
    const joinedPath = join(config.output, file);
    const stat = await effects.stat(joinedPath);
    if (stat.mtimeMs < leastRecentMtimeMs) {
      leastRecentMtimeMs = stat.mtimeMs;
    }
  }
  return leastRecentMtimeMs;
}

async function findBuildFiles(effects: DeployEffects, config: Config): Promise<string[]> {
  const buildFilePaths: string[] = [];
  try {
    for await (const file of effects.visitFiles(config.output)) {
      buildFilePaths.push(file);
    }
  } catch (error) {
    if (isEnoent(error)) {
      throw new CliError(`No build files found at ${config.output}`, {cause: error});
    }
    throw error;
  }
  if (!buildFilePaths.length) {
    throw new CliError(`No build files found at ${config.output}`);
  }
  return buildFilePaths;
}

async function uploadFiles(
  effects: DeployEffects,
  config: Config,
  apiClient: ObservableApiClient,
  deployId: string,
  buildFilePaths: string[],
  maxConcurrency?: number
) {
  const progressSpinner = effects.clack.spinner();
  progressSpinner.start("");

  // upload a manifest before uploading the files
  progressSpinner.message("Hashing local files");
  const manifestFileInfo: DeployManifestFile[] = [];
  await runAllWithConcurrencyLimit(buildFilePaths, async (path) => {
    const fullPath = join(config.output, path);
    const statInfo = await stat(fullPath);
    const hash = createHash("sha512")
      .update(await readFile(fullPath))
      .digest("base64");
    manifestFileInfo.push({path, size: statInfo.size, hash});
  });
  progressSpinner.message("Sending file manifest to server");
  const instructions = await apiClient.postDeployManifest(deployId, manifestFileInfo);
  const fileErrors: {path: string; detail: string | null}[] = [];
  for (const fileInstruction of instructions.files) {
    if (fileInstruction.status === "error") {
      fileErrors.push({path: fileInstruction.path, detail: fileInstruction.detail});
    }
  }
  if (fileErrors.length) {
    effects.clack.log.error(
      "The server rejected some files from the upload:\n\n" +
        fileErrors.map(({path, detail}) => `  - ${path} - ${detail ? `(${detail})` : "no details"}`).join("\n")
    );
  }
  if (instructions.status === "error" || fileErrors.length) {
    throw new CliError(`Server rejected deploy manifest${instructions.detail ? `: ${instructions.detail}` : ""}`);
  }
  const filesToUpload: string[] = instructions.files
    .filter((instruction) => instruction.status === "upload")
    .map((instruction) => instruction.path);

  // Upload the files
  const rateLimiter = new RateLimiter(5);
  const waitForRateLimit = filesToUpload.length <= 300 ? async () => {} : () => rateLimiter.wait();

  await runAllWithConcurrencyLimit(
    filesToUpload,
    async (path, i) => {
      await waitForRateLimit();
      progressSpinner.message(
        `${i + 1} / ${filesToUpload.length} ${faint("uploading")} ${path.slice(0, effects.outputColumns - 17)}`
      );
      await apiClient.postDeployFile(deployId, join(config.output, path), path);
    },
    {maxConcurrency}
  );
  progressSpinner.stop(
    `${filesToUpload.length} uploaded, ${buildFilePaths.length - filesToUpload.length} unchanged, ${
      buildFilePaths.length
    } total.`
  );
}

async function markDeployUploaded(
  effects: DeployEffects,
  config: Config,
  apiClient: ObservableApiClient,
  deployId: string
) {
  // Mark the deploy as uploaded
  let buildManifest: null | BuildManifest = null;
  try {
    const source = await effects.readCacheFile(config.root, "_build.json");
    buildManifest = JSON.parse(source);
    Telemetry.record({event: "deploy", buildManifest: "found"});
  } catch (error) {
    if (isEnoent(error)) {
      Telemetry.record({event: "deploy", buildManifest: "missing"});
    } else {
      // The error message here might contain sensitive information, so
      // don't send it in telemetry.
      Telemetry.record({event: "deploy", buildManifest: "error"});
      effects.clack.log.warn(`Could not read build manifest: ${error}`);
    }
  }
  await apiClient.postDeployUploaded(deployId, buildManifest);
}

async function pollForProcessingCompletion(
  effects: DeployEffects,
  apiClient: ObservableApiClient,
  deployId: string,
  deployPollInterval = DEPLOY_POLL_INTERVAL_MS
): Promise<GetDeployResponse> {
  // Poll for processing completion
  const spinner = effects.clack.spinner();
  spinner.start("Server processing deploy");
  const pollExpiration = Date.now() + DEPLOY_POLL_MAX_MS;
  let deployInfo: null | GetDeployResponse = null;
  pollLoop: while (true) {
    if (Date.now() > pollExpiration) {
      spinner.stop("Deploy timed out");
      throw new CliError(`Deploy failed to process on server: status = ${deployInfo?.status}`);
    }
    deployInfo = await apiClient.getDeploy(deployId);
    if (!deployInfo) {
      continue;
    }
    switch (deployInfo.status) {
      case "created":
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
  return deployInfo;
}

async function maybeUpdateProject(
  apiClient: ObservableApiClient,
  deployTarget: DeployTargetInfo,
  projectUpdates: PostEditProjectRequest
) {
  if (!deployTarget.create && typeof projectUpdates?.title === "string") {
    await apiClient.postEditProject(deployTarget.project.id, projectUpdates);
  }
}
