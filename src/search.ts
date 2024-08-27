import {readFile} from "node:fs/promises";
import {join} from "node:path/posix";
import he from "he";
import MiniSearch from "minisearch";
import type {Config, SearchResult} from "./config.js";
import type {Logger, Writer} from "./logger.js";
import {parseMarkdown} from "./markdown.js";
import {faint, strikethrough} from "./tty.js";

// Avoid reindexing too often in preview.
const indexCache = new WeakMap<Config["pages"], {json: string; freshUntil: number}>();
const reindexDelay = 10 * 60 * 1000; // 10 minutes

export interface SearchIndexEffects {
  logger: Logger;
  output: Writer;
}

const defaultEffects: SearchIndexEffects = {
  logger: console,
  output: process.stdout
};

const indexOptions = {
  fields: ["title", "text", "keywords"], // fields to return with search results
  storeFields: ["title"],
  processTerm(term: string) {
    return (term.match(/\p{N}/gu)?.length ?? 0) > 6 ? null : term.slice(0, 15).toLowerCase();
  }
};

type MiniSearchResult = Omit<SearchResult, "path" | "keywords"> & {id: string; keywords: string};

export async function searchIndex(config: Config, effects = defaultEffects): Promise<string> {
  const {pages, search, normalizePath} = config;
  if (!search) return "{}";
  const cached = indexCache.get(pages);
  if (cached && cached.freshUntil > Date.now()) return cached.json;

  // Index the pages
  const index = new MiniSearch<MiniSearchResult>(indexOptions);
  for await (const result of indexPages(config, effects)) index.add(normalizeResult(result, normalizePath));
  if (search.index) for await (const result of search.index()) index.add(normalizeResult(result, normalizePath));

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

async function* indexPages(config: Config, effects: SearchIndexEffects): AsyncIterable<SearchResult> {
  const {root, pages, loaders} = config;

  // Get all the listed pages (which are indexed by default)
  const pagePaths = new Set(["/index"]);
  for (const p of pages) {
    if (p.path !== null) pagePaths.add(p.path);
    if ("pages" in p) for (const {path} of p.pages) pagePaths.add(path);
  }

  for await (const path of config.paths()) {
    const loader = loaders.find(`${path}.md`);
    if (!loader) throw new Error(`page not found: ${path}`);
    const {params} = loader;
    const sourceFile = await loader.load(effects);
    const sourcePath = join(root, sourceFile);
    const source = await readFile(sourcePath, "utf8");
    const {body, title, data} = parseMarkdown(source, {...config, path, params});

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
    yield {path, title, text, keywords: normalizeKeywords(data?.keywords)};
  }
}

function normalizeResult(
  {path, keywords, ...rest}: SearchResult,
  normalizePath: Config["normalizePath"]
): MiniSearchResult {
  return {id: normalizePath(path), keywords: keywords ?? "", ...rest};
}

function normalizeKeywords(keywords: any): string {
  return keywords ? String(keywords) : "";
}
