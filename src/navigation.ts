import {readFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path";
import {readConfig} from "./config.js";
import {isEnoent} from "./error.js";
import {visitFiles} from "./files.js";
import {type ParseResult, parseMarkdown} from "./markdown.js";
import {type RenderOptions} from "./render.js";

export async function readPages(root: string): Promise<NonNullable<RenderOptions["pages"]>> {
  const config = await readConfig(root);
  if (config?.pages) return config?.pages;
  const pages: RenderOptions["pages"] = [];
  for await (const file of visitFiles(root)) {
    if (file === "404.md" || extname(file) !== ".md") continue;
    let parsed: ParseResult;
    try {
      parsed = parseMarkdown(await readFile(join(root, file), "utf-8"), root, file);
    } catch (error) {
      if (!isEnoent(error)) throw error; // internal error
      continue;
    }
    const name = basename(file, ".md");
    const page = {path: `/${join(dirname(file), name)}`, name: parsed.title ?? "Untitled"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  return pages;
}
