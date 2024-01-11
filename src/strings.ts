import type {TtyColor} from "./tty.js";
import {bold, magenta} from "./tty.js";

export function commandInstruction(command: string, color: TtyColor | null = (s) => magenta(bold(s))): string {
  if (!color) color = (s) => s;

  const prefix = process.env["npm_config_user_agent"]?.includes("yarn/")
    ? "yarn observable"
    : process.env["npm_config_user_agent"]?.includes("npm/") && process.env["npm_lifecycle_event"] === "npx"
    ? "npx observable"
    : process.env["npm_config_user_agent"]?.includes("npm/") && process.env["npm_lifecycle_event"] === "observable"
    ? "npm run observable"
    : // This probably isn't right, but we've run out of options
      "observable";

  return color(`${prefix} ${command}`);
}
