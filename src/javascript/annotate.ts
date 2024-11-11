import {isPathImport} from "../path.js";

const annotate = process.env["OBSERVABLE_ANNOTATE_FILES"];
if (annotate && annotate !== "true") throw new Error(`unsupported OBSERVABLE_ANNOTATE_FILES: ${annotate}`);

/** Annotate a path to a local import or file so it can be reworked server-side. */
export const annotatePath = annotate
  ? (uri: string) => `${JSON.stringify(uri)}${isPathImport(uri) ? "/* observablehq-file */" : ""}`
  : JSON.stringify;
