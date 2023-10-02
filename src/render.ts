import {readFile} from "fs/promises";
import {transpileMarkdown} from "./markdown.js";

export async function render(path: string): Promise<string> {
  return transpileMarkdown(await readFile(path, "utf-8"));
}
