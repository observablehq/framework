import {readFile} from "node:fs/promises";
import {basename, dirname, join} from "node:path/posix";
import he from "he";
import MiniSearch from "minisearch";
import type {Config} from "./config.js";
import {visitMarkdownFiles} from "./files.js";
import type {Logger} from "./logger.js";
import {parseMarkdown} from "./markdown.js";
import {faint, strikethrough} from "./tty.js";

// Avoid reindexing too often in preview.
const indexCache = new WeakMap<Config["pages"], {json: string; freshUntil: number}>();
const reindexDelay = 10 * 60 * 1000; // 10 minutes

export interface SearchIndexEffects {
  logger: Logger;
}

const defaultEffects: SearchIndexEffects = {logger: console};

const indexOptions = {
  fields: ["title", "text", "keywords"], // fields to return with search results
  storeFields: ["title"],
  processTerm(term: string) {
    return (term.match(/\p{N}/gu)?.length ?? 0) > 6 ? null : term.slice(0, 15).toLowerCase();
  }
};

export async function searchIndex(config: Config, effects = defaultEffects): Promise<string> {
  const {root, pages, search, normalizePath} = config;
  if (!search) return "{}";
  const cached = indexCache.get(pages);
  if (cached && cached.freshUntil > Date.now()) return cached.json;

  // Get all the listed pages (which are indexed by default)
  const pagePaths = new Set(["/index"]);
  for (const p of pages) {
    if ("path" in p) pagePaths.add(p.path);
    else for (const {path} of p.pages) pagePaths.add(path);
  }

  // Index the pages
  const index = new MiniSearch(indexOptions);
  for (const file of visitMarkdownFiles(root)) {
    const sourcePath = join(root, file);
    const source = await readFile(sourcePath, "utf8");
    const path = `/${join(dirname(file), basename(file, ".md"))}`;
    const {body, title, data} = parseMarkdown(source, {...config, path});

    // Skip pages that opt-out of indexing, and skip unlisted pages unless
    // opted-in. We only log the first case.
    const listed = pagePaths.has(path);
    const indexed = data?.index === undefined ? listed : Boolean(data.index);
    if (!indexed) {
      if (listed) effects.logger.log(`${faint("index")} ${strikethrough(sourcePath)} ${faint("(skipped)")}`);
      continue;
    }

    // eslint-disable-next-line import/no-named-as-default-member
    const text = he
      .decode(
        body
          .replaceAll(/[\n\r]/g, " ")
          .replaceAll(/<style\b.*<\/style\b[^>]*>/gi, " ")
          .replaceAll(/<[^>]+>/g, " ")
      )
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}]/gu, " "); // keep letters & numbers

    effects.logger.log(`${faint("index")} ${sourcePath}`);
    index.add({id: normalizePath(path).slice("/".length), title, text, keywords: normalizeKeywords(data?.keywords)});
  }

  // Pass the serializable index options to the client.
  const json = JSON.stringify(
    Object.assign(
      {
        options: {
          fields: indexOptions.fields,
          storeFields: indexOptions.storeFields
        }
      },
      index.toJSON()
    )
  );

  indexCache.set(pages, {json, freshUntil: Date.now() + reindexDelay});
  return json;
}

function normalizeKeywords(keywords: any): string {
  return keywords ? String(keywords) : "";
}
