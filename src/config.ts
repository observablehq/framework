import {basename, dirname, join} from "node:path";
import {visitMarkdownFiles} from "./files.js";
import {formatIsoDate, formatLocaleDate} from "./format.js";
import {parseMarkdown} from "./markdown.js";
import {resolveTheme} from "./theme.js";
import {resolvePath} from "./url.js";

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

export type Style =
  | {path: string} // custom stylesheet
  | {theme: string[]}; // zero or more named theme

export interface Script {
  src: string;
  async: boolean;
  type: string | null;
}

export interface Config {
  root: string; // defaults to docs
  output: string; // defaults to dist
  base: string; // defaults to "/"
  title?: string;
  sidebar: boolean; // defaults to true if pages isn’t empty
  pages: (Page | Section)[];
  pager: boolean; // defaults to true
  scripts: Script[]; // defaults to empty array
  head: string; // defaults to empty string
  header: string; // defaults to empty string
  footer: string; // defaults to “Built with Observable on [date].”
  toc: TableOfContents;
  style: null | Style; // defaults to {theme: ["light", "dark"]}
  deploy: null | {workspace: string; project: string};
  search: boolean; // default to false
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
    } catch (error: any) {
      if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
      continue;
    }
  }
  return normalizeConfig(undefined, root);
}

async function readPages(root: string): Promise<Page[]> {
  const pages: Page[] = [];
  for await (const file of visitMarkdownFiles(root)) {
    if (file === "index.md" || file === "404.md") continue;
    const parsed = await parseMarkdown(join(root, file), {root, path: file});
    const name = basename(file, ".md");
    const page = {path: join("/", dirname(file), name), name: parsed.title ?? "Untitled"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  return pages;
}

let currentDate = new Date();

export function setCurrentDate(date = new Date()): void {
  currentDate = date;
}

export async function normalizeConfig(spec: any = {}, defaultRoot = "docs"): Promise<Config> {
  let {
    root = defaultRoot,
    output = "dist",
    base = "/",
    sidebar,
    style,
    theme = "default",
    search,
    deploy,
    scripts = [],
    head = "",
    header = "",
    footer = `Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="${formatIsoDate(
      currentDate
    )}">${formatLocaleDate(currentDate)}</a>.`
  } = spec;
  root = String(root);
  output = String(output);
  base = normalizeBase(base);
  if (style === null) style = null;
  else if (style !== undefined) style = {path: String(style)};
  else style = {theme: (theme = normalizeTheme(theme))};
  let {title, pages = await readPages(root), pager = true, toc = true} = spec;
  if (title !== undefined) title = String(title);
  pages = Array.from(pages, normalizePageOrSection);
  sidebar = sidebar === undefined ? pages.length > 0 : Boolean(sidebar);
  pager = Boolean(pager);
  scripts = Array.from(scripts, normalizeScript);
  head = String(head);
  header = String(header);
  footer = String(footer);
  toc = normalizeToc(toc);
  deploy = deploy ? {workspace: String(deploy.workspace).replace(/^@+/, ""), project: String(deploy.project)} : null;
  search = Boolean(search);
  return {root, output, base, title, sidebar, pages, pager, scripts, head, header, footer, toc, style, deploy, search};
}

function normalizeBase(base: any): string {
  base = String(base);
  if (!base.startsWith("/")) throw new Error(`base must start with slash: ${base}`);
  if (!base.endsWith("/")) base += "/";
  return base;
}

function normalizeTheme(spec: any): string[] {
  return resolveTheme(typeof spec === "string" ? [spec] : spec === null ? [] : Array.from(spec, String));
}

function normalizeScript(spec: any): Script {
  if (typeof spec === "string") spec = {src: spec};
  let {src, async = false, type} = spec;
  src = String(src);
  async = Boolean(async);
  type = type == null ? null : String(type);
  return {src, async, type};
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

export function mergeStyle(path: string, style: any, theme: any, defaultStyle: null | Style): null | Style {
  return style === undefined && theme === undefined
    ? defaultStyle
    : style === null
    ? null // disable
    : style !== undefined
    ? {path: resolvePath(path, style)}
    : {theme: normalizeTheme(theme)};
}
