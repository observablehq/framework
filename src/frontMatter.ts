import matter from "gray-matter";
import {normalizeTheme, stringOrNull} from "./config.js";
import {yellow} from "./tty.js";

export interface FrontMatter {
  title?: string | null;
  toc?: {show?: boolean; label?: string};
  style?: string | null;
  theme?: string[];
  head?: string | null;
  header?: string | null;
  footer?: string | null;
  pager?: string | null;
  index?: boolean;
  keywords?: string[];
  draft?: boolean;
  sidebar?: boolean;
  sql?: {[key: string]: string};
}

export function readFrontMatter(input: string): {content: string; data: FrontMatter} {
  try {
    const {content, data} = matter(input, {});
    return {content, data: normalizeFrontMatter(data)};
  } catch (error: any) {
    if ("mark" in error) {
      console.warn(`${yellow("Invalid front matter:")} ${error.reason}`);
      return {data: {}, content: input};
    }
    throw error;
  }
}

export function normalizeFrontMatter(spec: any = {}): FrontMatter {
  const frontMatter: FrontMatter = {};
  if (spec == null || typeof spec !== "object") return frontMatter;
  const {title, sidebar, toc, index, keywords, draft, sql, head, header, footer, pager, style, theme} = spec;
  if (title !== undefined) frontMatter.title = stringOrNull(title);
  if (sidebar !== undefined) frontMatter.sidebar = Boolean(sidebar);
  if (toc !== undefined) frontMatter.toc = normalizeToc(toc);
  if (index !== undefined) frontMatter.index = Boolean(index);
  if (keywords !== undefined) frontMatter.keywords = normalizeKeywords(keywords);
  if (draft !== undefined) frontMatter.draft = Boolean(draft);
  if (sql !== undefined) frontMatter.sql = normalizeSql(sql);
  if (head !== undefined) frontMatter.head = stringOrNull(head);
  if (header !== undefined) frontMatter.header = stringOrNull(header);
  if (footer !== undefined) frontMatter.footer = stringOrNull(footer);
  if (pager !== undefined) frontMatter.pager = stringOrNull(pager);
  if (style !== undefined) frontMatter.style = stringOrNull(style);
  if (theme !== undefined) frontMatter.theme = normalizeTheme(theme);
  return frontMatter;
}

function normalizeToc(spec: unknown): {show?: boolean; label?: string} {
  if (spec == null) return {show: false};
  if (typeof spec !== "object") return {show: Boolean(spec)};
  const {show, label} = spec as {show: unknown; label: unknown};
  const toc: FrontMatter["toc"] = {};
  if (show !== undefined) toc.show = Boolean(show);
  if (label !== undefined) toc.label = String(label);
  return toc;
}

function normalizeKeywords(spec: unknown): string[] {
  return spec == null ? [] : typeof spec === "string" ? [spec] : Array.from(spec as any, String);
}

function normalizeSql(spec: unknown): {[key: string]: string} {
  if (spec == null || typeof spec !== "object") return {};
  const sql: {[key: string]: string} = {};
  for (const key in spec) sql[key] = String(spec[key]);
  return sql;
}
