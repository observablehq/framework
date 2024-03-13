import os from "node:os";
import * as clack from "@clack/prompts";
import type {ClackEffects} from "./clack.js";
import {commandInstruction, commandRequiresAuthenticationMessage} from "./commandInstruction.js";
import {CliError, isHttpError} from "./error.js";
import type {GetCurrentUserResponse, PostAuthRequestPollResponse} from "./observableApiClient.js";
import {ObservableApiClient, getObservableUiOrigin} from "./observableApiClient.js";
import type {ConfigEffects} from "./observableApiConfig.js";
import {
  type ApiKey,
  defaultEffects as defaultConfigEffects,
  getObservableApiKey,
  setObservableApiKey
} from "./observableApiConfig.js";
import {Telemetry} from "./telemetry.js";
import type {TtyEffects} from "./tty.js";
import {bold, defaultEffects as defaultTtyEffects, inverse, link, yellow} from "./tty.js";

const OBSERVABLE_UI_ORIGIN = getObservableUiOrigin();

export const VALID_TIERS = new Set(["starter_2024", "pro_2024", "enterprise_2024"]);

/** Actions this command needs to take wrt its environment that may need mocked out. */
export interface AuthEffects extends ConfigEffects, TtyEffects {
  clack: ClackEffects;
  getObservableApiKey: (effects: AuthEffects) => Promise<ApiKey | null>;
  setObservableApiKey: (info: {id: string; key: string} | null) => Promise<void>;
  exitSuccess: () => void;
}

export const defaultEffects: AuthEffects = {
  ...defaultConfigEffects,
  ...defaultTtyEffects,
  clack,
  getObservableApiKey,
  setObservableApiKey,
  exitSuccess: () => process.exit(0)
};

export async function login(effects: AuthEffects = defaultEffects, overrides = {}) {
  const {clack} = effects;
  Telemetry.record({event: "login", step: "start"});
  clack.intro(inverse(" observable login "));

  const {currentUser} = await loginInner(effects, overrides);

  if (currentUser.workspaces.length === 0) {
    clack.log.warn(`${yellow("Warning:")} You don't have any workspaces to deploy to.`);
  } else if (currentUser.workspaces.length > 1) {
    clack.note(
      [
        "You have access to the following workspaces:",
        "",
        ...currentUser.workspaces.map((workspace) => ` * ${formatUser(workspace)}`)
      ].join("\n")
    );
  }
  clack.outro("Logged in");
  Telemetry.record({event: "login", step: "finish"});
}

export async function loginInner(
  effects: AuthEffects,
  {pollTime = 1000} = {}
): Promise<{currentUser: GetCurrentUserResponse; apiKey: ApiKey}> {
  const {clack} = effects;
  const apiClient = new ObservableApiClient();
  const requestInfo = await apiClient.postAuthRequest({
    scopes: ["projects:deploy", "projects:create"],
    deviceDescription: os.hostname()
  });
  const confirmUrl = new URL("/auth-device", OBSERVABLE_UI_ORIGIN);
  confirmUrl.searchParams.set("code", requestInfo.confirmationCode);

  clack.log.step(
    `Your confirmation code is ${bold(yellow(requestInfo.confirmationCode))}\n` +
      `Open ${link(confirmUrl)}\nin your browser, and confirm the code matches.`
  );
  const spinner = clack.spinner();
  spinner.start("Waiting for confirmation...");

  let apiKey: PostAuthRequestPollResponse["apiKey"] | null = null;
  while (apiKey === null) {
    await new Promise((resolve) => setTimeout(resolve, pollTime));
    const requestPoll = await apiClient.postAuthRequestPoll(requestInfo.id);
    switch (requestPoll.status) {
      case "pending":
        break;
      case "accepted":
        apiKey = requestPoll.apiKey;
        break;
      case "expired":
        spinner.stop("Failed to confirm code.", 2);
        Telemetry.record({event: "login", step: "error", code: "expired"});
        throw new CliError("That confirmation code expired.");
      case "consumed":
        spinner.stop("Failed to confirm code.", 2);
        Telemetry.record({event: "login", step: "error", code: "consumed"});
        throw new CliError("That confirmation code has already been used.");
      default:
        spinner.stop("Failed to confirm code.", 2);
        Telemetry.record({event: "login", step: "error", code: `unknown-${requestPoll.status}`});
        throw new CliError(`Received an unknown polling status ${requestPoll.status}.`);
    }
  }

  if (!apiKey) {
    Telemetry.record({event: "login", step: "error", code: "no-key"});
    throw new CliError("No API key returned from server.");
  }
  await effects.setObservableApiKey(apiKey);

  apiClient.setApiKey({source: "login", key: apiKey.key});
  let currentUser = await apiClient.getCurrentUser();
  currentUser = {...currentUser, workspaces: validWorkspaces(currentUser.workspaces)};
  spinner.stop(`You are logged into ${OBSERVABLE_UI_ORIGIN.hostname} as ${formatUser(currentUser)}.`);
  return {currentUser, apiKey: {...apiKey, source: "login"}};
}

export async function logout(effects = defaultEffects) {
  await effects.setObservableApiKey(null);
}

export async function whoami(effects = defaultEffects) {
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(effects);
  if (!apiKey) throw new CliError(commandRequiresAuthenticationMessage);
  const apiClient = new ObservableApiClient({apiKey});

  try {
    const user = await apiClient.getCurrentUser();
    logger.log();
    logger.log(`You are logged into ${OBSERVABLE_UI_ORIGIN.hostname} as ${formatUser(user)}.`);
    logger.log();
    logger.log("You have access to the following workspaces:");
    for (const workspace of user.workspaces) {
      logger.log(` * ${formatUser(workspace)}`);
    }
    logger.log();
  } catch (error) {
    if (isHttpError(error) && error.statusCode == 401) {
      if (apiKey.source === "env") {
        logger.log(`Your API key is invalid. Check the value of the ${apiKey.envVar} environment variable.`);
      } else if (apiKey.source === "file") {
        logger.log(`Your API key is invalid. Run ${commandInstruction("login")} to log in again.`);
      } else {
        logger.log("Your API key is invalid.");
      }
    } else {
      throw error;
    }
  }
}

export function formatUser(user: {name?: string; login: string}): string {
  return user.name ? `${user.name} (@${user.login})` : `@${user.login}`;
}

export function validWorkspaces(
  workspaces: GetCurrentUserResponse["workspaces"]
): GetCurrentUserResponse["workspaces"] {
  return workspaces.filter(
    (w) =>
      VALID_TIERS.has(w.tier) &&
      (w.role === "owner" ||
        w.role === "member" ||
        (w.role === "guest_member" &&
          w.projects_info.some((info) => info.project_role === "owner" || info.project_role === "editor")))
  );
}
