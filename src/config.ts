import {readFile} from "node:fs/promises";
import {basename, dirname, extname, join} from "node:path";
import {visitFiles} from "./files.js";
import {parseMarkdown} from "./markdown.js";
import {getClientPath} from "./rollup.js";

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
  root: string; // defaults to docs
  output: string; // defaults to dist
  title?: string;
  pages: (Page | Section)[]; // TODO rename to sidebar?
  pager: boolean; // defaults to true
  toc: TableOfContents;
  style: string; // defaults to default stylesheet
  deploy: null | {workspace: string; project: string};
}

export async function readConfig(configPath?: string, root?: string): Promise<Config> {
  if (configPath === undefined) return readDefaultConfig(root);
  const importPath = join(process.cwd(), root ?? ".", configPath);
  return normalizeConfig((await import(importPath)).default, root);
}

export async function readDefaultConfig(root?: string): Promise<Config> {
  for (const ext of [".js", ".ts"]) {
    try {
      return await readConfig("observablehq.config" + ext, root);
    } catch (error) {
      continue;
    }
  }
  return normalizeConfig(undefined, root);
}

async function readPages(root: string): Promise<Page[]> {
  const pages: Page[] = [];
  for await (const file of visitFiles(root)) {
    if (file === "index.md" || file === "404.md" || extname(file) !== ".md") continue;
    const parsed = await parseMarkdown(await readFile(join(root, file), "utf-8"), root, file);
    const name = basename(file, ".md");
    const page = {path: join("/", dirname(file), name), name: parsed.title ?? "Untitled"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  return pages;
}

export async function normalizeConfig(spec: any = {}, defaultRoot = "docs"): Promise<Config> {
  let {root = defaultRoot, output = "dist", style = getClientPath("./src/style/index.css"), deploy} = spec;
  root = String(root);
  output = String(output);
  style = String(style);
  let {title, pages = await readPages(root), pager = true, toc = true} = spec;
  if (title !== undefined) title = String(title);
  pages = Array.from(pages, normalizePageOrSection);
  pager = Boolean(pager);
  toc = normalizeToc(toc);
  deploy = deploy ? {workspace: String(deploy.workspace), project: String(deploy.project)} : null;
  return {root, output, title, pages, pager, toc, style, deploy};
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
