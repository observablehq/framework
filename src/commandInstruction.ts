import {getObservableUiOrigin} from "./observableApiClient.js";
import type {TtyColor} from "./tty.js";
import {bold, magenta} from "./tty.js";

export function commandInstruction(
  command: string,
  {
    color = (s) => magenta(bold(s)),
    env = process.env
  }: {color?: TtyColor | null; env?: Record<string, string | undefined>} = {}
): string {
  if (!color) color = (s) => s;

  const prefix = env["npm_config_user_agent"]?.includes("yarn/")
    ? "yarn observable"
    : env["npm_config_user_agent"]?.includes("npm/") && env["npm_lifecycle_event"] === "npx"
    ? "npx observable"
    : env["npm_config_user_agent"]?.includes("npm/") && env["npm_lifecycle_event"] === "observable"
    ? "npm run observable"
    : // This probably isn't right, but we've run out of options
      "observable";

  return color(`${prefix} ${command}`);
}

export const commandRequiresAuthenticationMessage = `You need to be authenticated to ${
  getObservableUiOrigin().hostname
} to run this command. Please run ${commandInstruction("login")}.`;
