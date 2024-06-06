/* eslint-disable import/no-named-as-default-member */
import he from "he";
import hljs from "highlight.js";
import type {DOMWindow} from "jsdom";
import {JSDOM, VirtualConsole} from "jsdom";
import {isAssetPath, relativePath, resolveLocalPath} from "./path.js";

const ASSET_ATTRIBUTES: readonly [selector: string, src: string][] = [
  ["a[href][download]", "href"],
  ["audio source[src]", "src"],
  ["audio[src]", "src"],
  ["img[src]", "src"],
  ["img[srcset]", "srcset"],
  ["link[href]", "href"],
  ["picture source[srcset]", "srcset"],
  ["video source[src]", "src"],
  ["video[src]", "src"]
];

const PATH_ATTRIBUTES: readonly [selector: string, src: string][] = [
  ["a[href]", "href"],
  ["audio source[src]", "src"],
  ["audio[src]", "src"],
  ["img[src]", "src"],
  ["img[srcset]", "srcset"],
  ["link[href]", "href"],
  ["picture source[srcset]", "srcset"],
  ["video source[src]", "src"],
  ["video[src]", "src"]
];

export function isJavaScript({type}: HTMLScriptElement): boolean {
  if (!type) return true;
  type = type.toLowerCase();
  return type === "text/javascript" || type === "application/javascript" || type === "module";
}

export function parseHtml(html: string): DOMWindow {
  return new JSDOM(`<!DOCTYPE html><body>${html}`, {virtualConsole: new VirtualConsole()}).window;
}

interface Assets {
  files: Set<string>;
  localImports: Set<string>;
  globalImports: Set<string>;
  staticImports: Set<string>;
}

export function findAssets(html: string, path: string): Assets {
  const {document} = parseHtml(html);
  const files = new Set<string>();
  const localImports = new Set<string>();
  const globalImports = new Set<string>();
  const staticImports = new Set<string>();

  const maybeFile = (specifier: string): void => {
    if (isAssetPath(specifier)) {
      const localPath = resolveLocalPath(path, specifier);
      if (!localPath) return console.warn(`non-local asset path: ${specifier}`);
      files.add(relativePath(path, localPath));
    } else {
      globalImports.add(specifier);
    }
  };

  for (const [selector, src] of ASSET_ATTRIBUTES) {
    for (const element of document.querySelectorAll(selector)) {
      const source = decodeURI(element.getAttribute(src)!);
      if (src === "srcset") {
        for (const s of parseSrcset(source)) {
          maybeFile(s);
        }
      } else {
        maybeFile(source);
      }
    }
  }

  for (const script of document.querySelectorAll<HTMLScriptElement>("script[src]")) {
    let src = script.getAttribute("src")!;
    if (isJavaScript(script)) {
      if (isAssetPath(src)) {
        const localPath = resolveLocalPath(path, src);
        if (!localPath) {
          console.warn(`non-local asset path: ${src}`);
          continue;
        }
        localImports.add((src = relativePath(path, localPath)));
      } else {
        globalImports.add(src);
      }
      if (script.getAttribute("type")?.toLowerCase() === "module" && !script.hasAttribute("async")) {
        staticImports.add(src); // modulepreload
      }
    } else {
      maybeFile(src);
    }
  }

  return {files, localImports, globalImports, staticImports};
}

export function rewriteHtmlPaths(html: string, path: string): string {
  const {document} = parseHtml(html);

  const resolvePath = (specifier: string): string => {
    return isAssetPath(specifier) ? relativePath(path, specifier) : specifier;
  };

  for (const [selector, src] of PATH_ATTRIBUTES) {
    for (const element of document.querySelectorAll(selector)) {
      const source = decodeURI(element.getAttribute(src)!);
      element.setAttribute(src, src === "srcset" ? resolveSrcset(source, resolvePath) : encodeURI(resolvePath(source)));
    }
  }

  return document.body.innerHTML;
}

export interface HtmlResolvers {
  resolveFile: (specifier: string) => string;
  resolveImport: (specifier: string) => string;
  resolveScript: (specifier: string) => string;
  resolveLink: (href: string) => string;
}

export function rewriteHtml(
  html: string,
  {resolveFile = String, resolveImport = String, resolveScript = String, resolveLink = String}: Partial<HtmlResolvers>
): string {
  const {document} = parseHtml(html);

  const resolvePath = (specifier: string): string => {
    return isAssetPath(specifier) ? resolveFile(specifier) : resolveImport(specifier);
  };

  for (const [selector, src] of ASSET_ATTRIBUTES) {
    for (const element of document.querySelectorAll(selector)) {
      const source = decodeURI(element.getAttribute(src)!);
      element.setAttribute(src, src === "srcset" ? resolveSrcset(source, resolvePath) : encodeURI(resolvePath(source)));
    }
  }

  for (const script of document.querySelectorAll<HTMLScriptElement>("script[src]")) {
    const src = decodeURI(script.getAttribute("src")!);
    script.setAttribute("src", encodeURI((isJavaScript(script) ? resolveScript : resolveFile)(src)));
  }

  for (const a of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = decodeURI(a.getAttribute("href")!);
    a.setAttribute("href", encodeURI(resolveLink(href)));
    if (!/^(\w+:)/.test(href)) continue;
    if (!a.hasAttribute("target")) a.setAttribute("target", "_blank");
    if (!a.hasAttribute("rel")) a.setAttribute("rel", "noopener noreferrer");
  }

  // Syntax highlighting for <code> elements. The code could contain an inline
  // expression within, or other HTML, but we only highlight text nodes that are
  // direct children of code elements.
  for (const code of document.querySelectorAll("code[class*='language-']")) {
    const language = [...code.classList].find((c) => c.startsWith("language-"))?.slice("language-".length);
    if (!language) continue;
    if (code.parentElement?.tagName === "PRE") code.parentElement.setAttribute("data-language", language);
    if (!hljs.getLanguage(language)) continue;
    let html = "";
    code.normalize(); // coalesce adjacent text nodes
    for (const child of code.childNodes) {
      html += isText(child)
        ? hljs.highlight(child.textContent!, {language}).value
        : isElement(child)
        ? child.outerHTML
        : "";
    }
    code.innerHTML = html;
  }

  // Wrap <h2 id> etc. elements in <a> tags for linking.
  for (const h of document.querySelectorAll<HTMLHeadingElement>("h1[id], h2[id], h3[id], h4[id]")) {
    const a = document.createElement("a");
    a.className = "observablehq-header-anchor";
    a.href = `#${h.id}`;
    a.append(...h.childNodes);
    h.append(a);
  }

  return document.body.innerHTML;
}

function parseSrcset(srcset: string): string[] {
  return srcset
    .trim()
    .split(/\s*,\s*/)
    .filter((src) => src)
    .map((src) => src.split(/\s+/)[0]);
}

function resolveSrcset(srcset: string, resolve: (specifier: string) => string): string {
  return srcset
    .trim()
    .split(/\s*,\s*/)
    .filter((src) => src)
    .map((src) => {
      const parts = src.split(/\s+/);
      const path = resolve(parts[0]);
      if (path) parts[0] = encodeURI(path);
      return parts.join(" ");
    })
    .join(", ");
}

function isText(node: Node): node is Text {
  return node.nodeType === 3;
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

/**
 * Denotes a string that contains HTML source; when interpolated into an html
 * tagged template literal, it will not be escaped. Use Html.unsafe to denote
 * dynamic strings that are known to be safe.
 */
export class Html {
  private constructor(readonly html: string) {}
  static unsafe(html: string): Html {
    return new Html(html);
  }
  toString() {
    return this.html;
  }
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  const parts: string[] = [];
  for (let i = 0; i < strings.length; ++i) {
    parts.push(strings[i]);
    if (i < values.length) {
      const value = values[i];
      if (value == null) continue;
      if (typeof value[Symbol.iterator] === "function") {
        for (const v of value as Iterable<unknown>) {
          if (v == null) continue;
          parts.push(v instanceof Html ? v.html : he.escape(String(v)));
        }
      } else {
        parts.push(value instanceof Html ? value.html : he.escape(String(value)));
      }
    }
  }
  return Html.unsafe(parts.join(""));
}

html.unsafe = Html.unsafe;
