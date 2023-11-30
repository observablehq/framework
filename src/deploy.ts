import readline from "node:readline/promises";
import type {BuildEffects} from "./build.js";
import {build} from "./build.js";
import type {Config} from "./config.js";
import type {Logger, Writer} from "./logger.js";
import {ObservableApiClient} from "./observableApiClient.js";
import {
  type ApiKey,
  type DeployConfig,
  getDeployConfig,
  getObservableApiKey,
  setDeployConfig
} from "./observableApiConfig.js";
import {blue} from "./tty.js";

export interface DeployOptions {
  config: Config;
}

export interface DeployEffects {
  getObservableApiKey: (logger: Logger) => Promise<ApiKey>;
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
export async function deploy({config}: DeployOptions, effects = defaultEffects): Promise<void> {
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(logger);
  const apiClient = new ObservableApiClient({apiKey});

  // Find the existing project or create a new one.
  const sourceRoot = config.root;
  const deployConfig = await effects.getDeployConfig(sourceRoot);
  let projectId = deployConfig?.project?.id;
  if (projectId) {
    logger.log(`Found existing project ${projectId}`);
  } else {
    logger.log("Creating a new project");
    const currentUserResponse = await apiClient.getCurrentUser();

    const title = await promptUserForInput(effects.input, effects.output, "New project title: ");
    const defaultSlug = slugify(title);
    const slug = await promptUserForInput(
      effects.input,
      effects.output,
      `New project slug [${defaultSlug}]: `,
      defaultSlug
    );

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

    const project = await apiClient.postProject({slug, title, workspaceId});
    projectId = project.id;
    await effects.setDeployConfig(sourceRoot, {project: {id: projectId, slug, workspace: workspaceId}});
    logger.log(`Created new project ${project.owner.login}/${project.slug}`);
  }

  // Create the new deploy.
  const message = await promptUserForInput(effects.input, effects.output, "Deploy message: ");
  const deployId = await apiClient.postDeploy({projectId, message});

  // Build the project
  await build({config, clientEntry: "./src/client/deploy.js"}, new DeployBuildEffects(apiClient, deployId, effects));

  // Mark the deploy as uploaded.
  const deployInfo = await apiClient.postDeployUploaded(deployId);
  logger.log(`Deployed project now visible at ${blue(deployInfo.url)}`);
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace("'", "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/-{2,}/g, "-");
}
