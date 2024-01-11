import readline from "node:readline/promises";
import {isatty} from "node:tty";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {Config} from "./config.js";
import {CliError, isHttpError} from "./error.js";
import type {Logger, Writer} from "./logger.js";
import {ObservableApiClient} from "./observableApiClient.js";
import {
  type ApiKey,
  type DeployConfig,
  getDeployConfig,
  getObservableApiKey,
  setDeployConfig
} from "./observableApiConfig.js";
import {Telemetry} from "./telemetry.js";
import {blue} from "./tty.js";

export interface DeployOptions {
  config: Config;
}

export interface DeployEffects {
  getObservableApiKey: (logger: Logger) => Promise<ApiKey>;
  getDeployConfig: (sourceRoot: string) => Promise<DeployConfig | null>;
  setDeployConfig: (sourceRoot: string, config: DeployConfig) => Promise<void>;
  isTty: boolean;
  logger: Logger;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

const defaultEffects: DeployEffects = {
  getObservableApiKey,
  getDeployConfig,
  setDeployConfig,
  isTty: isatty(process.stdin.fd),
  logger: console,
  input: process.stdin,
  output: process.stdout
};

/** Deploy a project to ObservableHQ */
export async function deploy({config}: DeployOptions, effects = defaultEffects): Promise<void> {
  Telemetry.record({event: "deploy", step: "start"});
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(logger);
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
  try {
    const projectInfo = await apiClient.getProject({
      workspaceLogin: config.deploy.workspace,
      projectSlug: config.deploy.project
    });
    projectId = projectInfo.id;
  } catch (error) {
    if (isHttpError(error) && error.statusCode === 404) {
      // Project doesn't exist yet, so ignore the error.
    } else {
      throw error;
    }
  }

  if (projectId) {
    // Check last deployed state. If it's not the same project, ask the user if
    // they want to continue anyways. In non-interactive mode just cancel.
    const deployConfig = await effects.getDeployConfig(config.root);
    const previousProjectId = deployConfig?.projectId;
    if (previousProjectId && previousProjectId !== projectId) {
      logger.log(
        `The project @${config.deploy.workspace}/${config.deploy.project} does not match the expected project in ${config.root}/.observablehq/deploy.json`
      );
      if (effects.isTty) {
        const choice = await promptUserForInput(
          effects.input,
          effects.output,
          "Do you want to update the expected project and deploy anyways? [y/N]"
        );
        if (choice.trim().toLowerCase().charAt(0) !== "y") {
          throw new CliError("User cancelled deploy.", {print: false, exitCode: 2});
        }
      } else {
        throw new CliError("Cancelling deploy due to misconfiguration.");
      }
    }
  } else {
    // Project doesn't exist, so ask the user if they want to create it.
    // In non-interactive mode just cancel.
    if (effects.isTty) {
      const choice = await promptUserForInput(effects.input, effects.output, "No project exists. Create it now? [y/N]");
      if (choice.trim().toLowerCase().charAt(0) !== "y") {
        throw new CliError("User cancelled deploy.", {print: false, exitCode: 2});
      }
      if (!config.title) {
        throw new CliError("You haven't configured a project title. Please set title in your configuration.");
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
    } else {
      throw new CliError("Cancelling deploy due to non-existent project.");
    }
  }

  await effects.setDeployConfig(config.root, {projectId});

  // Create the new deploy on the server
  const message = await promptUserForInput(effects.input, effects.output, "Deploy message: ");
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
