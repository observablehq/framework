import readline from "node:readline/promises";
import {commandRequiresAuthenticationMessage} from "./auth.js";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {Logger, Writer} from "./logger.js";
import {ObservableApiClient, getObservableUiHost} from "./observableApiClient.js";
import type {DeployConfig} from "./observableApiConfig.js";
import {getDeployConfig, getObservableApiKey, setDeployConfig} from "./observableApiConfig.js";

export interface DeployOptions {
  sourceRoot: string;
}

export interface DeployEffects {
  getObservableApiKey: () => Promise<string | null>;
  getDeployConfig: (sourceRoot: string) => Promise<DeployConfig | null>;
  setDeployConfig: (sourceRoot: string, config: DeployConfig) => Promise<void>;
  logger: Logger;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}

const defaultEffects: DeployEffects = {
  getObservableApiKey,
  getDeployConfig,
  setDeployConfig,
  logger: console,
  input: process.stdin,
  output: process.stdout
};

/** Deploy a project to ObservableHQ */
export async function deploy({sourceRoot}: DeployOptions, effects = defaultEffects): Promise<void> {
  const apiKey = await effects.getObservableApiKey();
  const {logger} = effects;
  if (!apiKey) {
    logger.log(commandRequiresAuthenticationMessage);
    return;
  }
  const apiClient = new ObservableApiClient({apiKey, logger});

  // Find the existing project or create a new one.
  const deployConfig = await effects.getDeployConfig(sourceRoot);
  let projectId = deployConfig?.project?.id;
  if (projectId) {
    logger.log(`Found existing project ${projectId}`);
  } else {
    logger.log("Creating a new project");
    const currentUserResponse = await apiClient.getCurrentUser();
    const slug = await promptUserForInput(effects.input, effects.output, "New project name: ");
    let workspaceId: string | null = null;
    if (currentUserResponse.workspaces.length == 0) {
      logger.error("Current user doesn't have any Observable workspaces!");
      return;
    } else if (currentUserResponse.workspaces.length == 1) {
      workspaceId = currentUserResponse.workspaces[0].id;
    } else {
      const workspaceNames = currentUserResponse.workspaces.map((x) => x.name);
      const index = await promptUserForChoiceIndex(
        effects.input,
        effects.output,
        "Available Workspaces",
        workspaceNames
      );
      workspaceId = currentUserResponse.workspaces[index].id;
    }

    projectId = await apiClient.postProject(slug, workspaceId);
    await effects.setDeployConfig(sourceRoot, {project: {id: projectId, slug, workspace: workspaceId}});
    logger.log(`Created new project id ${projectId}`);
  }

  logger.log(`Deploying project id ${projectId}`);

  // Create the new deploy.
  const deployId = await apiClient.postDeploy(projectId);
  logger.log(`Created new deploy id ${deployId}`);

  // Build the project
  await build({sourceRoot}, new DeployBuildEffects(apiClient, deployId, effects));

  // Mark the deploy as uploaded.
  await apiClient.postDeployUploaded(deployId);
  logger.log(`Deployed project now visible at ${getObservableUiHost()}/p/${projectId}`);
}

async function promptUserForInput(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  question: string
): Promise<string> {
  const rl = readline.createInterface({input, output});
  try {
    let value: string | null = null;
    do value = await rl.question(question);
    while (!value);
    return value;
  } finally {
    rl.close();
  }
}

async function promptUserForChoiceIndex(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  title: string,
  choices: string[]
): Promise<number> {
  const validChoices: string[] = [];
  const promptLines: string[] = ["", title, "=".repeat(title.length)];
  for (let i = 0; i < choices.length; i++) {
    validChoices.push(`${i + 1}`);
    promptLines.push(`${i + 1}. ${choices[i]}`);
  }
  const question = promptLines.join("\n") + "\nChoice: ";
  const rl = readline.createInterface({input, output});
  try {
    let value: string | null = null;
    do value = await rl.question(question);
    while (!validChoices.includes(value));
    return parseInt(value) - 1; // zero-indexed
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
