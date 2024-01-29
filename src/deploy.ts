import readline from "node:readline/promises";
import {isatty} from "node:tty";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {Config} from "./config.js";
import {CliError, isHttpError} from "./error.js";
import type {Logger, Writer} from "./logger.js";
import { ObservableApiClient, type PostEditProjectRequest} from "./observableApiClient.js";
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
import {blue, bold, hangingIndentLog, magenta, yellow} from "./tty.js";

export interface DeployOptions {
  config: Config;
  message: string | undefined;
}

export interface DeployEffects extends ConfigEffects {
  getObservableApiKey: (effects?: DeployEffects) => Promise<ApiKey>;
  getDeployConfig: (sourceRoot: string) => Promise<DeployConfig | null>;
  setDeployConfig: (sourceRoot: string, config: DeployConfig) => Promise<void>;
  isTty: boolean;
  logger: Logger;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
  outputColumns: number;
}

const defaultEffects: DeployEffects = {
  ...defaultConfigEffects,
  getObservableApiKey,
  getDeployConfig,
  setDeployConfig,
  isTty: isatty(process.stdin.fd),
  logger: console,
  input: process.stdin,
  output: process.stdout,
  outputColumns: process.stdout.columns ?? 80
};

/** Deploy a project to ObservableHQ */
export async function deploy({config, message}: DeployOptions, effects = defaultEffects): Promise<void> {
  Telemetry.record({event: "deploy", step: "start"});
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(effects);
  const apiClient = new ObservableApiClient({apiKey});

  // Check configuration
  if (!config.deploy) {
    throw new CliError(
      "You haven't configured a project to deploy to. Please set deploy.workspace and deploy.project in your configuration."
    );
  }
  const roughSlugRe = /^[a-z0-9_-]+$/;
  if (!config.deploy.workspace.match(roughSlugRe)) {
    throw new CliError(
      `Your configuration specifies the workspace "${
        config.deploy.workspace
      }", but that isn't valid. Did you mean "${slugify(config.deploy.workspace)}"?`
    );
  }
  if (!config.deploy.project.match(roughSlugRe)) {
    throw new CliError(
      `Your configuration specifies the project "${
        config.deploy.project
      }", but that isn't valid. Did you mean "${slugify(config.deploy.project)}"?`
    );
  }

  let projectId: string | null = null;
  let projectUpdates: Partial<PostEditProjectRequest> = {};
  try {
    const projectInfo = await apiClient.getProject({
      workspaceLogin: config.deploy.workspace,
      projectSlug: config.deploy.project
    });
    projectId = projectInfo.id;
    projectUpdates = {
      ...(config.title !== projectInfo.title ? {title: config.title} : undefined)
    };
  } catch (error) {
    if (isHttpError(error) && error.statusCode === 404) {
      // Project doesn't exist yet, so ignore the error.
    } else {
      throw error;
    }
  }

  const deployConfig = await effects.getDeployConfig(config.root);
  if (projectId) {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    const previousProjectId = deployConfig?.projectId;
    if (previousProjectId && previousProjectId !== projectId) {
      const {indent} = hangingIndentLog(
        effects,
        magenta("Attention:"),
        `This project was last deployed to a different project on Observable Cloud from ${bold(
          `@${config.deploy.workspace}/${config.deploy.project}`
        )}.`
      );
      if (effects.isTty) {
        const choice = await promptConfirm(effects, `${indent}Do you want to deploy anyway?`, {default: false});
        if (!choice) {
          throw new CliError("User cancelled deploy", {print: false, exitCode: 0});
        }
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    } else if (previousProjectId && previousProjectId === projectId && typeof projectUpdates?.title === "string") {
       await apiClient.editProject(projectId, projectUpdates as PostEditProjectRequest);
    } else if (!previousProjectId) {
      const {indent} = hangingIndentLog(
        effects,
        yellow("Warning:"),
        `There is an existing project on Observable Cloud named ${bold(
          `@${config.deploy.workspace}/${config.deploy.project}`
        )} that is not associated with this repository. If you continue, you'll overwrite the existing content of the project.`
      );

      if (!(await promptConfirm(effects, `${indent}Do you want to continue?`, {default: false}))) {
        if (effects.isTty) {
          throw new CliError("Running non-interactively, cancelling deploy", {print: true, exitCode: 1});
        } else {
          throw new CliError("User cancelled deploy", {print: true, exitCode: 0});
        }
      }
    }
  } else {
    // Project doesn't exist, so ask the user if they want to create it.
    const {indent} = hangingIndentLog(
      effects,
      magenta("Attention:"),
      `There is no project on the Observable Cloud named ${bold(
        `@${config.deploy.workspace}/${config.deploy.project}`
      )}`
    );
    if (effects.isTty) {
      if (!config.title) {
        throw new CliError("You haven't configured a project title. Please set title in your configuration.");
      }
      if (!(await promptConfirm(effects, `${indent}Do you want to create it now?`, {default: false}))) {
        throw new CliError("User cancelled deploy.", {print: false, exitCode: 0});
      }
    } else {
      throw new CliError("Cancelling deploy due to non-existent project.");
    }

    const currentUserResponse = await apiClient.getCurrentUser();
    const workspace = currentUserResponse.workspaces.find((w) => w.login === config.deploy?.workspace);
    if (!workspace) {
      const availableWorkspaces = currentUserResponse.workspaces.map((w) => w.login).join(", ");
      throw new CliError(
        `Workspace ${config.deploy?.workspace} not found. Available workspaces: ${availableWorkspaces}.`
      );
    }
    const project = await apiClient.postProject({
      slug: config.deploy.project,
      title: config.title,
      workspaceId: workspace.id
    });
    projectId = project.id;
  }

  await effects.setDeployConfig(config.root, {projectId});

  // Create the new deploy on the server
  if (message === undefined) message = await promptUserForInput(effects.input, effects.output, "Deploy message: ");
  const deployId = await apiClient.postDeploy({projectId, message});

  // Build the project
  await build({config, clientEntry: "./src/client/deploy.js"}, new DeployBuildEffects(apiClient, deployId, effects));

  // Mark the deploy as uploaded
  const deployInfo = await apiClient.postDeployUploaded(deployId);
  logger.log(`Deployed project now visible at ${blue(deployInfo.url)}`);
  Telemetry.record({event: "deploy", step: "finish"});
}

async function promptUserForInput(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  question: string,
  defaultValue?: string
): Promise<string> {
  const rl = readline.createInterface({input, output});
  try {
    let value: string | null = null;
    do {
      value = await rl.question(question);
      if (!value && defaultValue) value = defaultValue;
    } while (!value);
    return value;
  } finally {
    rl.close();
  }
}

export async function promptConfirm(
  {input, output}: DeployEffects,
  question: string,
  opts: {default: boolean}
): Promise<boolean> {
  const rl = readline.createInterface({input, output});
  const choices = opts.default ? "[Y/n]" : "[y/N]";
  try {
    let value: string | null = null;
    while (true) {
      value = (await rl.question(`${question} ${choices} `)).toLowerCase();
      if (value === "") return opts.default;
      if (value.startsWith("y")) return true;
      if (value.startsWith("n")) return false;
      rl.write('Please answer "y" or "n".\n');
    }
  } finally {
    rl.close();
  }
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
