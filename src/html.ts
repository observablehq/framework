/* eslint-disable import/no-named-as-default-member */
import he from "he";
import hljs from "highlight.js";
import type {DOMWindow} from "jsdom";
import {JSDOM, VirtualConsole} from "jsdom";
import {relativePath, resolveLocalPath} from "./path.js";

const ASSET_PROPERTIES: readonly [selector: string, src: string][] = [
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

export function isAssetPath(specifier: string): boolean {
  return !/^(\w+:|#)/.test(specifier);
}

export function parseHtml(html: string): DOMWindow {
  return new JSDOM(`<!DOCTYPE html><body>${html}`, {virtualConsole: new VirtualConsole()}).window;
}

export function findAssets(html: string, path: string): Set<string> {
  const {document} = parseHtml(html);
  const assets = new Set<string>();

  const maybeAsset = (specifier: string): void => {
    if (!isAssetPath(specifier)) return;
    const localPath = resolveLocalPath(path, specifier);
    if (!localPath) return console.warn(`non-local asset path: ${specifier}`);
    assets.add(relativePath(path, localPath));
  };

  for (const [selector, src] of ASSET_PROPERTIES) {
    for (const element of document.querySelectorAll(selector)) {
      const source = decodeURIComponent(element.getAttribute(src)!);
      if (src === "srcset") {
        for (const s of parseSrcset(source)) {
          maybeAsset(s);
        }
      } else {
        maybeAsset(source);
      }
    }
  }

  return assets;
}

export function rewriteHtml(html: string, resolve: (specifier: string) => string = String): string {
  const {document} = parseHtml(html);

  const maybeResolve = (specifier: string): string => {
    return isAssetPath(specifier) ? resolve(specifier) : specifier;
  };

  for (const [selector, src] of ASSET_PROPERTIES) {
    for (const element of document.querySelectorAll(selector)) {
      const source = decodeURIComponent(element.getAttribute(src)!);
      element.setAttribute(src, src === "srcset" ? resolveSrcset(source, maybeResolve) : maybeResolve(source));
    }
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
      if (path) parts[0] = path;
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
