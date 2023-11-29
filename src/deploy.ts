import path from "node:path";
import readline from "node:readline/promises";
import {commandRequiresAuthenticationMessage} from "./auth.js";
import {visitFiles} from "./files.js";
import type {Logger} from "./observableApiClient.js";
import {ObservableApiClient, getObservableUiHost} from "./observableApiClient.js";
import type {DeployConfig} from "./toolConfig.js";
import {getDeployConfig, getObservableApiKey, setDeployConfig} from "./toolConfig.js";

type DeployFile = {path: string; relativePath: string};
export interface CommandEffects {
  getObservableApiKey: () => Promise<string | null>;
  getDeployConfig: (root: string) => Promise<DeployConfig | null>;
  setDeployConfig: (root: string, config: DeployConfig) => Promise<void>;
  logger: Logger;
  inputStream: NodeJS.ReadableStream;
  outputStream: NodeJS.WritableStream;
}

const defaultEffects: CommandEffects = {
  getObservableApiKey,
  getDeployConfig,
  setDeployConfig,
  inputStream: process.stdin,
  logger: console,
  outputStream: process.stdout
};

// Deploy a project to ObservableHQ.
export async function deploy(effects = defaultEffects, root = "docs", dir = "dist"): Promise<void> {
  const apiKey = await effects.getObservableApiKey();
  const {logger} = effects;
  if (!apiKey) {
    logger.log(commandRequiresAuthenticationMessage);
    return;
  }
  const apiClient = new ObservableApiClient({
    apiKey,
    logger
  });

  // Find the existing project or create a new one.
  const deployConfig = await effects.getDeployConfig(root);
  let projectId = deployConfig?.project?.id;
  if (projectId) {
    logger.log(`Found existing project ${projectId}`);
  } else {
    logger.log("Creating a new project");
    const currentUserResponse = await apiClient.getCurrentUser();
    const slug = await promptUserForInput(effects.inputStream, effects.outputStream, "New project name: ");
    let workspaceId: string | null = null;
    if (currentUserResponse.workspaces.length == 0) {
      logger.error("Current user doesn't have any Observable workspaces!");
      return;
    } else if (currentUserResponse.workspaces.length == 1) {
      workspaceId = currentUserResponse.workspaces[0].id;
    } else {
      const workspaceNames = currentUserResponse.workspaces.map((x) => x.name);
      const index = await promptUserForChoiceIndex(
        effects.inputStream,
        effects.outputStream,
        "Available Workspaces",
        workspaceNames
      );
      workspaceId = currentUserResponse.workspaces[index].id;
    }

    projectId = await apiClient.postProject(slug, workspaceId);
    await effects.setDeployConfig(root, {project: {id: projectId, slug, workspace: workspaceId}});
    logger.log(`Created new project id ${projectId}`);
  }

  logger.log(`Deploying project id ${projectId}`);

  // Create the new deploy.
  const deployId = await apiClient.postDeploy(projectId);
  logger.log(`Created new deploy id ${deployId}`);

  // Upload all the deploy files.
  const deployFiles = await getDeployFiles(dir);
  for (const deployFile of deployFiles) {
    await apiClient.postDeployFile(deployId, deployFile.path, deployFile.relativePath);
  }

  // Mark the deploy as uploaded.
  await apiClient.postDeployUploaded(deployId);
  logger.log(`Deployed project now visible at ${getObservableUiHost()}/p/${projectId}`);
}

async function promptUserForInput(
  inputStream: NodeJS.ReadableStream,
  outputStream: NodeJS.WritableStream,
  question: string
): Promise<string> {
  const rl = readline.createInterface({input: inputStream, output: outputStream});
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
  inputStream: NodeJS.ReadableStream,
  outputStream: NodeJS.WritableStream,
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
  const rl = readline.createInterface({input: inputStream, output: outputStream});
  try {
    let value: string | null = null;
    do value = await rl.question(question);
    while (!validChoices.includes(value));
    return parseInt(value) - 1; // zero-indexed
  } finally {
    rl.close();
  }
}

async function getDeployFiles(dir: string): Promise<DeployFile[]> {
  const deployFiles: DeployFile[] = [];
  for await (const file of visitFiles(dir)) {
    deployFiles.push({
      path: path.join(dir, file),
      relativePath: file
    });
  }
  return deployFiles;
}
