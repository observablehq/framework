import {createHash} from "node:crypto";
import type {Stats} from "node:fs";
import {readFile, stat} from "node:fs/promises";
import {join} from "node:path/posix";
import * as clack from "@clack/prompts";
import wrapAnsi from "wrap-ansi";
import type {BuildEffects, BuildOptions} from "./build.js";
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
  build
};

type DeployTargetInfo =
  | {create: true; workspace: {id: string; login: string}; projectSlug: string; title: string; accessLevel: string}
  | {create: false; workspace: {id: string; login: string}; project: GetProjectResponse};

/** Deploy a project to ObservableHQ */
export async function deploy(
  {config, message, force, deployPollInterval = DEPLOY_POLL_INTERVAL_MS, maxConcurrency}: DeployOptions,
  effects = defaultEffects
): Promise<void> {
  const {clack} = effects;
  Telemetry.record({event: "deploy", step: "start", force});
  clack.intro(`${inverse(" observable deploy ")} ${faint(`v${process.env.npm_package_version}`)}`);

  let apiKey = await effects.getObservableApiKey(effects);
  const apiClient = new ObservableApiClient(apiKey ? {apiKey, clack} : {clack});
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

  let targetDescription: string;
  let buildFilePaths: string[] | null = null;
  let doBuild = force === "build";

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
          const choice = await clack.confirm({
            message: "No build files found. Do you want to build the project now?",
            active: "Yes, build and then deploy",
            inactive: "No, cancel deploy"
          });
          if (clack.isCancel(choice) || !choice) {
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
      clack.log.warn(
        wrapAnsi(`Your source files have changed since you built ${formatAge(buildAge)}.`, effects.outputColumns)
      );
      initialValue = true;
    } else {
      clack.log.info(wrapAnsi(`You built this project ${formatAge(buildAge)}.`, effects.outputColumns));
    }
    const choice = await clack.confirm({
      message: "Would you like to build again before deploying?",
      initialValue,
      active: "Yes, build and then deploy",
      inactive: "No, deploy as is"
    });
    if (clack.isCancel(choice)) throw new CliError("User canceled deploy", {print: false, exitCode: 0});
    doBuild = !!choice;
  }

  if (doBuild) {
    clack.log.step("Building project");
    await effects.build(
      {config},
      new FileBuildEffects(config.output, {logger: effects.logger, output: effects.output})
    );
    buildFilePaths = await findBuildFiles(effects, config);
  }

  if (!buildFilePaths) throw new Error("No build files found.");

  if (!deployTarget.create) {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    targetDescription = `${deployTarget.project.title} (@${deployTarget.workspace.login}/${deployTarget.project.slug})`;
    if (deployConfig.projectId && deployConfig.projectId !== deployTarget.project.id) {
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
    } else if (deployConfig.projectId) {
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

    if (deployTarget.project.title !== config.title) {
      projectUpdates.title = config.title;
    }
  }

  if (message === undefined) {
    const input = await clack.text({
      message: "What changed in this deploy?",
      placeholder: "Enter a deploy message (optional)"
    });
    if (clack.isCancel(input)) throw new CliError("User canceled deploy", {print: false, exitCode: 0});
    message = input;
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
  }

  await effects.setDeployConfig(config.root, {
    projectId: deployTarget.project.id,
    projectSlug: deployTarget.project.slug,
    workspaceLogin: deployTarget.workspace.login
  });

  // Create the new deploy on the server
  let deployId: string;
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

  const progressSpinner = clack.spinner();
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
    clack.log.error(
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

  // Update project title if necessary
  if (typeof projectUpdates?.title === "string") {
    await apiClient.postEditProject(deployTarget.project.id, projectUpdates as PostEditProjectRequest);
  }
  clack.outro(`Deployed project now visible at ${link(deployInfo.url)}`);
  Telemetry.record({event: "deploy", step: "finish"});
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
    clack.log.info("You should add this title to your observablehq.config.js file.");
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

  const accessLevel: string | symbol = await clack.select({
    message: "Who is allowed to access your project?",
    options: [
      {value: "private", label: "Private", hint: "only allow workspace members"},
      {value: "public", label: "Public", hint: "allow anyone"}
    ]
  });
  if (clack.isCancel(accessLevel)) {
    throw new CliError("User canceled deploy.", {print: false, exitCode: 0});
  }

  return {create: true, workspace, projectSlug, title, accessLevel};
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
