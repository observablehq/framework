import {dirname, join} from "node:path";
import {localImportPrefixes} from "./constants.js";

export const isLocalImport = (value) => {
  return localImportPrefixes.some((prefix) => value.startsWith(prefix));
};

export const getPathFromRoot = (root, sourcePath, value) => {
  if (sourcePath && sourcePath.startsWith(root)) return join(dirname(sourcePath), value);
  return join(root, value);
};
