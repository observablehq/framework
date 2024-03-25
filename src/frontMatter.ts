import matter from "gray-matter";
import {normalizeTheme} from "./config.js";

export interface FrontMatter {
  title?: string | null;
  toc?: {show?: boolean; label?: string};
  style?: string | null;
  theme?: string[];
  index?: boolean;
  keywords?: string[];
  draft?: boolean;
  sidebar?: boolean;
  sql?: {[key: string]: string};
}

interface FrontMatterException {
  reason: string;
  mark: {buffer: string};
}

export function readFrontMatter(input: string, build?: boolean): {content: string; data: FrontMatter} {
  try {
    const {content, data} = matter(input, {});
    return {content, data: normalizeFrontMatter(data)};
  } catch (error) {
    if (!build && "mark" in (error as any)) {
      const {
        reason,
        mark: {buffer}
      } = error as FrontMatterException;
      return {
        content: `<div class="observablehq--inspect observablehq--error">Invalid front matter\n${reason}</div>
        <pre>${String(buffer).slice(0, -1)}</pre>\n\n${input.slice(buffer.length + 6)}`,
        data: {}
      };
    }
    throw error;
  }
}

export function normalizeFrontMatter(spec: any = {}): FrontMatter {
  const frontMatter: FrontMatter = {};
  if (spec == null || typeof spec !== "object") return frontMatter;
  const {title, sidebar, toc, index, keywords, draft, sql, style, theme} = spec;
  if (title !== undefined) frontMatter.title = stringOrNull(title);
  if (sidebar !== undefined) frontMatter.sidebar = Boolean(sidebar);
  if (toc !== undefined) frontMatter.toc = normalizeToc(toc);
  if (index !== undefined) frontMatter.index = Boolean(index);
  if (keywords !== undefined) frontMatter.keywords = normalizeKeywords(keywords);
  if (draft !== undefined) frontMatter.draft = Boolean(draft);
  if (sql !== undefined) frontMatter.sql = normalizeSql(sql);
  if (style !== undefined) frontMatter.style = stringOrNull(style);
  if (theme !== undefined) frontMatter.theme = normalizeTheme(theme);
  return frontMatter;
}

function stringOrNull(spec: unknown): string | null {
  return spec == null ? null : String(spec);
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
