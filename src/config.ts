import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import {stat} from "node:fs/promises";
import op from "node:path";
import {basename, dirname, extname, join} from "node:path/posix";
import {cwd} from "node:process";
import {pathToFileURL} from "node:url";
import type MarkdownIt from "markdown-it";
import wrapAnsi from "wrap-ansi";
import {LoaderResolver} from "./dataloader.js";
import {visitMarkdownFiles} from "./files.js";
import {formatIsoDate, formatLocaleDate} from "./format.js";
import {createMarkdownIt, parseMarkdownMetadata} from "./markdown.js";
import {isAssetPath, parseRelativeUrl, resolvePath} from "./path.js";
import {resolveTheme} from "./theme.js";
import {bold, yellow} from "./tty.js";

export interface TableOfContents {
  show: boolean;
  label: string;
}

export interface Page {
  name: string;
  path: string;
  pager: string | null;
}

export interface Section<T = Page> {
  name: string;
  collapsible: boolean; // defaults to false
  open: boolean; // defaults to true; always true if collapsible is false
  pages: T[];
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
  root: string; // defaults to src
  output: string; // defaults to dist
  base: string; // defaults to "/"
  title?: string;
  sidebar: boolean; // defaults to true if pages isn’t empty
  pages: (Page | Section<Page>)[];
  pager: boolean; // defaults to true
  scripts: Script[]; // deprecated; defaults to empty array
  head: string | null; // defaults to null
  header: string | null; // defaults to null
  footer: string | null; // defaults to “Built with Observable on [date].”
  toc: TableOfContents;
  style: null | Style; // defaults to {theme: ["light", "dark"]}
  search: boolean; // default to false
  md: MarkdownIt;
  normalizePath: (path: string) => string;
  loaders: LoaderResolver;
  watchPath?: string;
}

export interface ConfigSpec {
  root?: unknown;
  output?: unknown;
  base?: unknown;
  sidebar?: unknown;
  style?: unknown;
  theme?: unknown;
  search?: unknown;
  scripts?: unknown;
  head?: unknown;
  header?: unknown;
  footer?: unknown;
  interpreters?: unknown;
  title?: unknown;
  pages?: unknown;
  pager?: unknown;
  toc?: unknown;
  linkify?: unknown;
  typographer?: unknown;
  quotes?: unknown;
  cleanUrls?: unknown;
  markdownIt?: unknown;
}

interface ScriptSpec {
  src?: unknown;
  async?: unknown;
  type?: unknown;
}

interface SectionSpec {
  name?: unknown;
  open?: unknown;
  collapsible?: unknown;
  pages?: unknown;
  pager?: unknown;
}

interface PageSpec {
  name?: unknown;
  path?: unknown;
  pager?: unknown;
}

interface TableOfContentsSpec {
  label?: unknown;
  show?: unknown;
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
async function importConfig(path: string): Promise<ConfigSpec> {
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
    const page = {path: join("/", dirname(file), name), name: title ?? "Untitled", pager: data.pager ?? "main"};
    if (name === "index") pages.unshift(page);
    else pages.push(page);
  }
  cachedPages = {key, pages};
  return pages;
}

let currentDate: Date | null = null;

/** For testing only! */
export function setCurrentDate(date: Date | null): void {
  currentDate = date;
}

// The config is used as a cache key for other operations; for example the pages
// are used as a cache key for search indexing and the previous & next links in
// the footer. When given the same spec (because import returned the same
// module), we want to return the same Config instance.
const configCache = new WeakMap<ConfigSpec, Config>();

export function normalizeConfig(spec: ConfigSpec = {}, defaultRoot?: string, watchPath?: string): Config {
  const cachedConfig = configCache.get(spec);
  if (cachedConfig) return cachedConfig;
  const root = spec.root === undefined ? findDefaultRoot(defaultRoot) : String(spec.root);
  const output = spec.output === undefined ? "dist" : String(spec.output);
  const base = spec.base === undefined ? "/" : normalizeBase(spec.base);
  const style =
    spec.style === null
      ? null
      : spec.style !== undefined
      ? {path: String(spec.style)}
      : {theme: normalizeTheme(spec.theme === undefined ? "default" : spec.theme)};
  const md = createMarkdownIt({
    linkify: spec.linkify === undefined ? undefined : Boolean(spec.linkify),
    typographer: spec.typographer === undefined ? undefined : Boolean(spec.typographer),
    quotes: spec.quotes === undefined ? undefined : (spec.quotes as any),
    markdownIt: spec.markdownIt as any
  });
  const title = spec.title === undefined ? undefined : String(spec.title);
  const pages = spec.pages === undefined ? undefined : normalizePages(spec.pages);
  const pager = spec.pager === undefined ? true : Boolean(spec.pager);
  const toc = normalizeToc(spec.toc as any);
  const sidebar = spec.sidebar === undefined ? undefined : Boolean(spec.sidebar);
  const scripts = spec.scripts === undefined ? [] : normalizeScripts(spec.scripts);
  const head = spec.head === undefined ? "" : stringOrNull(spec.head);
  const header = spec.header === undefined ? "" : stringOrNull(spec.header);
  const footer = spec.footer === undefined ? defaultFooter() : stringOrNull(spec.footer);
  const search = Boolean(spec.search);
  const interpreters = normalizeInterpreters(spec.interpreters as any);
  const config: Config = {
    root,
    output,
    base,
    title,
    sidebar: sidebar!, // see below
    pages: pages!, // see below
    pager,
    scripts,
    head,
    header,
    footer,
    toc,
    style,
    search,
    md,
    normalizePath: getPathNormalizer(spec.cleanUrls),
    loaders: new LoaderResolver({root, interpreters}),
    watchPath
  };
  if (pages === undefined) Object.defineProperty(config, "pages", {get: () => readPages(root, md)});
  if (sidebar === undefined) Object.defineProperty(config, "sidebar", {get: () => config.pages.length > 0});
  configCache.set(spec, config);
  return config;
}

function getPathNormalizer(spec: unknown = true): (path: string) => string {
  const cleanUrls = Boolean(spec);
  return (path) => {
    if (path && !path.endsWith("/") && !extname(path)) path += ".html";
    if (path === "index.html") path = ".";
    else if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
    else if (cleanUrls) path = path.replace(/\.html$/, "");
    return path;
  };
}

function defaultFooter(): string {
  const date = currentDate ?? new Date();
  return `Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="${formatIsoDate(
    date
  )}">${formatLocaleDate(date)}</a>.`;
}

function findDefaultRoot(defaultRoot?: string): string {
  if (defaultRoot !== undefined) return defaultRoot;
  const root = existsSync("docs") ? "docs" : "src";
  console.warn(
    wrapAnsi(
      `${yellow("Warning:")} the config file is missing the ${bold(
        "root"
      )} option, which specifies the path to the source root.${
        root === "docs"
          ? ` The recommended source root is ${bold('"src"')}; however, since ${bold(
              "docs"
            )} exists and was previously the default for this option, we will use ${bold('"docs"')}.`
          : ""
      } You can suppress this warning by specifying ${bold(`root: ${JSON.stringify(root)}`)} in the config file.\n`,
      Math.min(80, process.stdout.columns ?? 80)
    )
  );
  return root;
}

function normalizeBase(spec: unknown): string {
  let base = String(spec);
  if (!base.startsWith("/")) throw new Error(`base must start with slash: ${base}`);
  if (!base.endsWith("/")) base += "/";
  return base;
}

export function normalizeTheme(spec: unknown): string[] {
  return resolveTheme(typeof spec === "string" ? [spec] : spec === null ? [] : Array.from(spec as any, String));
}

function normalizeScripts(spec: unknown): Script[] {
  console.warn(`${yellow("Warning:")} the ${bold("scripts")} option is deprecated; use ${bold("head")} instead.`);
  return Array.from(spec as any, normalizeScript);
}

function normalizeScript(spec: unknown): Script {
  const script = typeof spec === "string" ? {src: spec} : (spec as ScriptSpec);
  const src = String(script.src);
  const async = script.async === undefined ? false : Boolean(script.async);
  const type = script.type == null ? null : String(script.type);
  return {src, async, type};
}

function normalizePages(spec: unknown): Config["pages"] {
  return Array.from(spec as any, (spec: SectionSpec | PageSpec) =>
    "pages" in spec ? normalizeSection(spec, normalizePage) : normalizePage(spec)
  );
}

function normalizeSection<T>(
  spec: SectionSpec,
  normalizePage: (spec: PageSpec, pager: string | null) => T
): Section<T> {
  const name = String(spec.name);
  const collapsible = spec.collapsible === undefined ? spec.open !== undefined : Boolean(spec.collapsible);
  const open = collapsible ? Boolean(spec.open) : true;
  const pager = spec.pager === undefined ? "main" : stringOrNull(spec.pager);
  const pages = Array.from(spec.pages as any, (spec: PageSpec) => normalizePage(spec, pager));
  return {name, collapsible, open, pages};
}

function normalizePage(spec: PageSpec, defaultPager: string | null = "main"): Page {
  const name = String(spec.name);
  let path = String(spec.path);
  if (isAssetPath(path)) {
    const u = parseRelativeUrl(join("/", path)); // add leading slash
    let {pathname} = u;
    pathname = pathname.replace(/\.html$/i, ""); // remove trailing .html
    pathname = pathname.replace(/\/$/, "/index"); // add trailing index
    path = pathname + u.search + u.hash;
  }
  const pager = spec.pager === undefined && isAssetPath(path) ? defaultPager : stringOrNull(spec.pager);
  return {name, path, pager};
}

function normalizeInterpreters(spec: {[key: string]: unknown} = {}): {[key: string]: string[] | null} {
  return Object.fromEntries(
    Object.entries(spec).map(([key, value]): [string, string[] | null] => {
      return [String(key), value == null ? null : Array.from(value as any, String)];
    })
  );
}

function normalizeToc(spec: TableOfContentsSpec | boolean = true): TableOfContents {
  const toc = typeof spec === "boolean" ? {show: spec} : (spec as TableOfContentsSpec);
  const label = toc.label === undefined ? "Contents" : String(toc.label);
  const show = toc.show === undefined ? true : Boolean(toc.show);
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

export function stringOrNull(spec: unknown): string | null {
  return spec == null || spec === false ? null : String(spec);
}
