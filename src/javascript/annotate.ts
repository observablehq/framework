import {readConfig} from "../config.js";
import {isPathImport} from "../path.js";

const unnormalizedConfig = await readConfig(undefined, undefined, false);
const configShouldAnnotate = Array.isArray(unnormalizedConfig.dynamicPaths)
  ? unnormalizedConfig.dynamicPaths.some((path) => path.endsWith(".js"))
  : typeof unnormalizedConfig.dynamicPaths === "function";

/** Annotate a path to a local import or file so it can be reworked server-side. */
export function annotatePath(uri: string) {
  const envShouldAnnotate =
    process.env["OBSERVABLE_ANNOTATE_FILES"] === "true"
      ? true
      : process.env["OBSERVABLE_ANNOTATE_FILES"] === "false"
      ? false
      : process.env["OBSERVABLE_ANNOTATE_FILES"];
  if (envShouldAnnotate !== true && envShouldAnnotate !== false && envShouldAnnotate !== undefined) {
    throw new Error(`unsupported OBSERVABLE_ANNOTATE_FILES: ${envShouldAnnotate}`);
  }

  const shouldAnnotate = envShouldAnnotate ?? configShouldAnnotate;
  return shouldAnnotate
    ? `${JSON.stringify(uri)}${isPathImport(uri) ? "/* observablehq-file */" : ""}`
    : JSON.stringify(uri);
}
