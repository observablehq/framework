import {isPathImport} from "../path.js";

/** Annotate a path to a local import or file so it can be reworked server-side. */
export function annotatePath(uri: string) {
  return `${JSON.stringify(uri)}${isPathImport(uri) ? "/* observablehq-file */" : ""}`;
}
