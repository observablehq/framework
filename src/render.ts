import {readFile} from "fs/promises";
import {transpileMarkdown} from "./markdown";

export async function render(path: string): Promise<string> {
  return transpileMarkdown(await readFile(path, "utf-8"));
}
