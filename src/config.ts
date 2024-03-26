import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {stat} from "node:fs/promises";
import op from "node:path";
import {basename, dirname, join} from "node:path/posix";
import {cwd} from "node:process";
import {pathToFileURL} from "node:url";
import type MarkdownIt from "markdown-it";
import {LoaderResolver} from "./dataloader.js";
import {visitMarkdownFiles} from "./files.js";
import {formatIsoDate, formatLocaleDate} from "./format.js";
import {createMarkdownIt, parseMarkdownMetadata} from "./markdown.js";
import {isAssetPath, parseRelativeUrl, resolvePath} from "./path.js";
import {resolveTheme} from "./theme.js";

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
  md: MarkdownIt;
  loaders: LoaderResolver;
  watchPath?: string;
}

/**
 * Returns the absolute path to the specified config file, which is specified as a
 * path relative to the given root (if any). If you want to import this, you should
 * pass the result to pathToFileURL.
 */
function resolveConfig(configPath: string, root = "."): string {
  return op.join(cwd(), root, configPath);
}

// By using the modification time of the config, we ensure that we pick up any
// changes to the config on reload.
async function importConfig(path: string): Promise<any> {
  const {mtimeMs} = await stat(path);
  return (await import(`${pathToFileURL(path).href}?${mtimeMs}`)).default;
}

export async function readConfig(configPath?: string, root?: string): Promise<Config> {
  if (configPath === undefined) configPath = await resolveDefaultConfig(root);
  if (configPath === undefined) return normalizeConfig(undefined, root);
  return normalizeConfig(await importConfig(configPath), root, configPath);
}

async function resolveDefaultConfig(root?: string): Promise<string | undefined> {
  const jsPath = resolveConfig("observablehq.config.js", root);
  if (existsSync(jsPath)) return jsPath;
  const tsPath = resolveConfig("observablehq.config.ts", root);
  if (existsSync(tsPath)) return await import("tsx/esm"), tsPath; // lazy tsx
}

let cachedPages: {key: string; pages: Page[]} | null = null;

function readPages(root: string, md: MarkdownIt): Page[] {
  const files: {file: string; source: string}[] = [];
  const hash = createHash("sha256");
  for (const file of visitMarkdownFiles(root)) {
    if (file === "index.md" || file === "404.md") continue;
    const source = readFileSync(join(root, file), "utf8");
    files.push({file, source});
    hash.update(file).update(source);
  }
  const key = hash.digest("hex");
  if (cachedPages?.key === key) return cachedPages.pages;
  const pages: Page[] = [];
  for (const {file, source} of files) {
    const {data, title} = parseMarkdownMetadata(source, {path: file, md});
    if (data.draft) continue;
    const name = basename(file, ".md");
    const page = {path: join("/", dirname(file), name), name: title ?? "Untitled"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  cachedPages = {key, pages};
  return pages;
}

let currentDate = new Date();

export function setCurrentDate(date = new Date()): void {
  currentDate = date;
}

// The config is used as a cache key for other operations; for example the pages
// are used as a cache key for search indexing and the previous & next links in
// the footer. When given the same spec (because import returned the same
// module), we want to return the same Config instance.
const configCache = new WeakMap<any, Config>();

export function normalizeConfig(spec: any = {}, defaultRoot = "docs", watchPath?: string): Config {
  const cachedConfig = configCache.get(spec);
  if (cachedConfig) return cachedConfig;
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
    )}">${formatLocaleDate(currentDate)}</a>.`,
    interpreters
  } = spec;
  root = String(root);
  output = String(output);
  base = normalizeBase(base);
  if (style === null) style = null;
  else if (style !== undefined) style = {path: String(style)};
  else style = {theme: (theme = normalizeTheme(theme))};
  const md = createMarkdownIt(spec);
  let {title, pages, pager = true, toc = true} = spec;
  if (title !== undefined) title = String(title);
  if (pages !== undefined) pages = Array.from(pages, normalizePageOrSection);
  if (sidebar !== undefined) sidebar = Boolean(sidebar);
  pager = Boolean(pager);
  scripts = Array.from(scripts, normalizeScript);
  head = String(head);
  header = String(header);
  footer = String(footer);
  toc = normalizeToc(toc);
  deploy = deploy ? {workspace: String(deploy.workspace).replace(/^@+/, ""), project: String(deploy.project)} : null;
  search = Boolean(search);
  interpreters = normalizeInterpreters(interpreters);
  const config = {
    root,
    output,
    base,
    title,
    sidebar,
    pages,
    pager,
    scripts,
    head,
    header,
    footer,
    toc,
    style,
    deploy,
    search,
    md,
    loaders: new LoaderResolver({root, interpreters}),
    watchPath
  };
  if (pages === undefined) Object.defineProperty(config, "pages", {get: () => readPages(root, md)});
  if (sidebar === undefined) Object.defineProperty(config, "sidebar", {get: () => config.pages.length > 0});
  configCache.set(spec, config);
  return config;
}

function normalizeBase(base: any): string {
  base = String(base);
  if (!base.startsWith("/")) throw new Error(`base must start with slash: ${base}`);
  if (!base.endsWith("/")) base += "/";
  return base;
}

export function normalizeTheme(spec: any): string[] {
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
  if (isAssetPath(path)) {
    const u = parseRelativeUrl(join("/", path)); // add leading slash
    let {pathname} = u;
    pathname = pathname.replace(/\.html$/i, ""); // remove trailing .html
    pathname = pathname.replace(/\/$/, "/index"); // add trailing index
    path = pathname + u.search + u.hash;
  }
  return {name, path};
}

function normalizeInterpreters(spec: any): Record<string, string[] | null> {
  return Object.fromEntries(
    Object.entries<any>(spec ?? {}).map(([key, value]): [string, string[] | null] => {
      return [String(key), value == null ? null : Array.from(value, String)];
    })
  );
}

function normalizeToc(spec: any): TableOfContents {
  if (typeof spec === "boolean") spec = {show: spec};
  let {label = "Contents", show = true} = spec;
  label = String(label);
  show = Boolean(show);
  return {label, show};
}

export function mergeToc(spec: Partial<TableOfContents> = {}, toc: TableOfContents): TableOfContents {
  const {label = toc.label, show = toc.show} = spec;
  return {label, show};
}

export function mergeStyle(
  path: string,
  style: string | null | undefined,
  theme: string[] | undefined,
  defaultStyle: null | Style
): null | Style {
  return style === undefined && theme === undefined
    ? defaultStyle
    : style === null
    ? null // disable
    : style !== undefined
    ? {path: resolvePath(path, style)}
    : theme === undefined
    ? defaultStyle
    : {theme};
}
