import fs from "node:fs/promises";
import path from "node:path";
import {createInterface} from "node:readline";
import type {Logger, WorkspaceResponse} from "./observableApiClient.js";
import {ObservableApiClient} from "./observableApiClient.js";
import type {ProjectConfig} from "./toolConfig.js";
import {getObservableApiKey, getProjectId, setProjectConfig} from "./toolConfig.js";

type DeployFile = {path: string; relativePath: string};
export interface CommandEffects {
  getObservableApiKey: () => Promise<string | null>;
  getProjectId: () => Promise<string | null>;
  getNewProjectSlug: () => Promise<string>;
  getNewProjectWorkspace: (workspaces: WorkspaceResponse[]) => Promise<string>;
  setProjectConfig: (config: ProjectConfig) => Promise<void>;
  getDeployFiles: () => Promise<DeployFile[]>;
  logger: Logger;
}

const defaultEffects: CommandEffects = {
  getObservableApiKey,
  getProjectId,
  getNewProjectSlug,
  getNewProjectWorkspace,
  setProjectConfig,
  getDeployFiles,
  logger: console
};

// Deploy a project to ObservableHQ.
export async function deploy(effects = defaultEffects): Promise<void> {
  const apiKey = await effects.getObservableApiKey();
  if (!apiKey) {
    effects.logger.log(`You haven't authenticated. Run "observable login" to authenticate.`);
    return;
  }
  const apiClient = new ObservableApiClient({
    apiKey,
    logger: effects.logger
  });

  // Find the existing project or create a new one.
  let projectId = await effects.getProjectId();
  if (projectId) {
    effects.logger.log(`Found existing project ${projectId}`);
  } else {
    effects.logger.log("Creating a new project");
    const currentUserResponse = await apiClient.getCurrentUser();

    const slug = await effects.getNewProjectSlug();
    let workspaceId: string = "";
    if (currentUserResponse.workspaces.length == 0) {
      effects.logger.error("Current user doesn't have any Observable workspaces!");
      return;
    } else if (currentUserResponse.workspaces.length == 1) {
      workspaceId = currentUserResponse.workspaces[0].id;
    } else {
      workspaceId = await effects.getNewProjectWorkspace(currentUserResponse.workspaces);
    }

    projectId = await apiClient.postProject(slug, workspaceId);
    if (!projectId) {
      effects.logger.error("Unable to create new project");
      return;
    }
    await effects.setProjectConfig({id: projectId, slug});
    effects.logger.log(`Created new project id ${projectId}`);
  }

  effects.logger.log(`Deploying project id ${projectId}`);

  // Create the new deploy.
  const deployId = await apiClient.postDeploy(projectId);
  if (!deployId) {
    console.error("Unable to create new deploy");
    return;
  }
  effects.logger.log(`Created new deploy id ${deployId}`);

  // Upload all the deploy files.
  const deployFiles = await effects.getDeployFiles();
  for (const deployFile of deployFiles) {
    await apiClient.postDeployFile(deployId, deployFile.path, deployFile.relativePath);
  }

  // Mark the deploy as uploaded.
  await apiClient.postDeployUploaded(deployId);
  effects.logger.log(`Deployed project now visible at https://observable.test:5000/p/${projectId}`);
}

async function getNewProjectSlug(): Promise<string> {
  return promptUserForInput("New project name: ");
}

async function getNewProjectWorkspace(workspaces: WorkspaceResponse[]): Promise<string> {
  const workspaceNames = workspaces.map((x) => x.name);
  const index = await promptUserForChoiceIndex("Available Workspaces", workspaceNames);
  return workspaces[index].id;
}

async function promptUserForInput(question: string): Promise<string> {
  const readline = createInterface({input: process.stdin, output: process.stdout});
  try {
    let value: string = "";
    do {
      value = await new Promise((resolve) => {
        readline.question(question, resolve);
      });
    } while (!value);
    return value;
  } finally {
    readline.close();
  }
}

async function promptUserForChoiceIndex(title: string, choices: string[]): Promise<number> {
  const validChoices: string[] = [];
  const promptLines: string[] = ["", title, "=".repeat(title.length)];
  for (let i = 0; i < choices.length; i++) {
    validChoices.push(`${i + 1}`);
    promptLines.push(`${i + 1}. ${choices[i]}`);
  }
  const question = promptLines.join("\n") + "\nChoice: ";
  const readline = createInterface({input: process.stdin, output: process.stdout});
  try {
    let value: string = "";
    do {
      value = await new Promise((resolve) => {
        readline.question(question, resolve);
      });
    } while (!validChoices.includes(value));
    return parseInt(value) - 1;
  } finally {
    readline.close();
  }
}

async function getDeployFiles(): Promise<DeployFile[]> {
  // TODO: we eventually want to build into a separate only-for-this-deploy tmp directory.
  const dir = "dist";
  const files: string[] = await filesInDir(dir);
  return files.map((x) => {
    return {
      path: x,
      relativePath: x.replace(dir + path.sep, "")
    };
  });
}

async function filesInDir(dir: string, files: string[] = []): Promise<string[]> {
  const fileList = await fs.readdir(dir);
  for (const file of fileList) {
    const name = `${dir}/${file}`;
    const stat = await fs.stat(name);
    if (stat.isDirectory()) {
      filesInDir(name, files);
    } else {
      files.push(name);
    }
  }
  return files;
}
