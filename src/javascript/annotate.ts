import {isPathImport} from "../path.js";

/**
 * Annotate a path to a local import or file so it can be reworked server-side.
 */

const annotate = process.env["OBSERVABLE_ANNOTATE_FILES"];
if (typeof annotate === "string" && annotate !== "true")
  throw new Error(`unsupported OBSERVABLE_ANNOTATE_FILES value: ${annotate}`);
export default annotate
  ? function (uri: string): string {
      return `${JSON.stringify(uri)}${isPathImport(uri) ? "/* observablehq-file */" : ""}`;
    }
  : JSON.stringify;
