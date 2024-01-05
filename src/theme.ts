import {createHash} from "node:crypto";
import type {ParseResult} from "./markdown.js";
import {relativeUrl} from "./url.js";

export function styleUrl(path: string, theme?: string, preview?: boolean): string {
  const [name, query] =
    theme !== undefined ? ["style-" + styleHash(theme), preview ? `?${encodeURIComponent(theme)}` : ""] : ["style", ""];
  return relativeUrl(path, `/_observablehq/${name}.css${query}`);
}

export function styleHash(str: string): string {
  return createHash("sha256").update(str).digest("hex").slice(0, 16);
}

export function normalizeTheme(theme: any): ParseResult["theme"] {
  return theme ? (typeof theme === "string" ? validate(theme) : Array.from(theme, validate).join(",")) : undefined;
}

function validate(theme: any): string {
  theme = String(theme);
  if (theme.match(/[^\w-]/)) throw new Error(`unsupported theme name ${theme}`);
  return theme;
}
