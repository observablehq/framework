import {readFile, stat} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path";
import {visitFiles} from "./files.js";
import {parseMarkdown} from "./markdown.js";

export interface Page {
  name: string;
  path: string;
}

export interface Section {
  name: string;
  open: boolean; // defaults to true
  pages: Page[];
}

export interface TableOfContents {
  label: string; // defaults to "Contents"
  show: boolean; // defaults to true
}

export interface Config {
  title?: string;
  pages: (Page | Section)[]; // TODO rename to sidebar?
  toc: TableOfContents;
}

export async function readConfig(root: string): Promise<Config> {
  for (const ext of [".js", ".ts"]) {
    try {
      const configPath = join(process.cwd(), root, ".observablehq", "config" + ext);
      const configStat = await stat(configPath);
      // By using the modification time of the config, we ensure that we pick up
      // any changes to the config on reload. TODO It would be better to either
      // restart the preview server when the config changes, or for the preview
      // server to watch the config file and hot-reload it automatically.
      return normalizeConfig((await import(`${configPath}?${configStat.mtimeMs}`)).default, root);
    } catch {
      continue;
    }
  }
  return normalizeConfig({}, root);
}

async function readPages(root: string): Promise<Page[]> {
  const pages: Page[] = [];
  for await (const file of visitFiles(root)) {
    if (file === "404.md" || extname(file) !== ".md") continue;
    const parsed = await parseMarkdown(await readFile(join(root, file), "utf-8"), root, file);
    const name = basename(file, ".md");
    const page = {path: `/${join(dirname(file), name)}`, name: parsed.title ?? "Untitled"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  return pages;
}

export async function normalizeConfig(spec: any, root: string): Promise<Config> {
  let {title, pages = await readPages(root), toc = true} = spec;
  if (title !== undefined) title = String(title);
  pages = Array.from(pages, normalizePageOrSection);
  toc = normalizeToc(toc);
  return {title, pages, toc};
}

function normalizePageOrSection(spec: any): Page | Section {
  return ("pages" in spec ? normalizeSection : normalizePage)(spec);
}

function normalizeSection(spec: any): Section {
  let {name, open = true, pages} = spec;
  name = String(name);
  open = Boolean(open);
  pages = Array.from(pages, normalizePage);
  return {name, open, pages};
}

function normalizePage(spec: any): Page {
  let {name, path} = spec;
  name = String(name);
  path = String(path);
  return {name, path};
}

function normalizeToc(spec: any): TableOfContents {
  if (typeof spec === "boolean") spec = {show: spec};
  let {label = "Contents", show = true} = spec;
  label = String(label);
  show = Boolean(show);
  return {label, show};
}

export function mergeToc(spec: any, toc: TableOfContents): TableOfContents {
  let {label = toc.label, show = toc.show} = typeof spec !== "object" ? {show: spec} : spec ?? {};
  label = String(label);
  show = Boolean(show);
  return {label, show};
}
