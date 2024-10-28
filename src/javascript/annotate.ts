import {isPathImport} from "../path.js";

/**
 * Annotate a path to a local import or file so it can be reworked server-side.
 */
export default process.env["ANNOTATE_FILES"]
  ? function (uri: string): string {
      return `${JSON.stringify(uri)}${isPathImport(uri) ? "/* observablehq-file */" : ""}`;
    }
  : JSON.stringify;
