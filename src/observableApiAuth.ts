import {commandInstruction} from "./commandInstruction.js";
import {CliError, isHttpError} from "./error.js";
import type {Logger} from "./logger.js";
import type {PostAuthRequestPollResponse} from "./observableApiClient.js";
import {ObservableApiClient, getObservableUiOrigin} from "./observableApiClient.js";
import type {ConfigEffects} from "./observableApiConfig.js";
import {
  type ApiKey,
  defaultEffects as defaultConfigEffects,
  getObservableApiKey,
  setObservableApiKey
} from "./observableApiConfig.js";
import type {TtyEffects} from "./tty.js";
import {bold, defaultEffects as defaultTtyEffects, hangingIndentLog, link, magenta, yellow} from "./tty.js";

const OBSERVABLE_UI_ORIGIN = getObservableUiOrigin();

/** Actions this command needs to take wrt its environment that may need mocked out. */
export interface AuthEffects extends ConfigEffects, TtyEffects {
  logger: Logger;
  getObservableApiKey: (effects: AuthEffects) => Promise<ApiKey>;
  setObservableApiKey: (info: {id: string; key: string} | null) => Promise<void>;
  exitSuccess: () => void;
}

const defaultEffects: AuthEffects = {
  ...defaultConfigEffects,
  ...defaultTtyEffects,
  logger: console,
  getObservableApiKey,
  setObservableApiKey,
  exitSuccess: () => process.exit(0)
};

export async function login(effects: AuthEffects = defaultEffects) {
  const apiClient = new ObservableApiClient();
  const requestInfo = await apiClient.postAuthRequest(["projects:deploy", "projects:create"]);
  const confirmUrl = new URL("/settings/api-keys/confirm", OBSERVABLE_UI_ORIGIN);

  hangingIndentLog(
    effects,
    magenta("Attention:"),
    `First copy your confirmation code: ${bold(yellow((await requestInfo).confirmationCode))}\n` +
      `and then open ${link(confirmUrl)} in your browser.`
  );

  let apiKey: PostAuthRequestPollResponse["apiKey"] | null = null;
  while (apiKey === null) {
    const requestPoll = await apiClient.postAuthRequestPoll(requestInfo.id);
    switch (requestPoll.status) {
      case "pending":
        break;
      case "accepted":
        apiKey = requestPoll.apiKey;
        break;
      case "expired":
        throw new CliError("That confirmation code expired. Please try again.");
      case "consumed":
        throw new CliError("That confirmation code has already been used. Please try again.");
      default:
        throw new CliError(`Received an unknown polling status ${requestPoll.status}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!apiKey) throw new CliError("No API key returned from server.");
  await effects.setObservableApiKey(apiKey);
}

export async function logout(effects = defaultEffects) {
  await effects.setObservableApiKey(null);
}

export async function whoami(effects = defaultEffects) {
  const {logger} = effects;
  const apiKey = await effects.getObservableApiKey(effects);
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

function formatUser(user: {name?: string; login: string}): string {
  return user.name ? `${user.name} (@${user.login})` : `@${user.login}`;
}
