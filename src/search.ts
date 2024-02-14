import {basename, join} from "node:path";
import MiniSearch from "minisearch";
import type {Config} from "./config.js";
import {visitMarkdownFiles} from "./files.js";
import type {Logger} from "./logger.js";
import {parseMarkdown} from "./markdown.js";
import {faint} from "./tty.js";

// Avoid reindexing too often in preview.
const indexCache = new WeakMap();
const reindexingDelay = 10 * 60 * 1000; // 10 minutes

export interface SearchIndexEffects {
  logger: Logger;
}

const defaultEffects: SearchIndexEffects = {logger: console};

const indexOptions = {
  fields: ["title", "text"],
  storeFields: ["title"],
  processTerm(term) {
    return term.match(/\d/g)?.length > 6 ? null : term.slice(0, 15).toLowerCase(); // fields to return with search results
  }
};

export async function searchIndex(config: Config, effects = defaultEffects): Promise<string> {
  const {root, pages, search} = config;
  if (!search) return "{}";
  if (indexCache.has(config) && indexCache.get(config).freshUntil > +new Date()) return indexCache.get(config).json;

  // Get all the listed pages (which are indexed by default)
  const pagePaths = new Set();
  for (const p of pages) {
    if ("path" in p) pagePaths.add(p.path);
    else for (const {path} of p.pages) pagePaths.add(path);
  }

  // Index the pages
  const index = new MiniSearch(indexOptions);
  for await (const file of visitMarkdownFiles(root)) {
    const path = join(root, file);
    const {html, title, data} = await parseMarkdown(path, {root, path: "/" + file.slice(0, -3)});

    // Skip pages that opt-out of indexing, and skip unlisted pages unless
    // opted-in. We only log the first case.
    const listed = pagePaths.has(`/${file.slice(0, -3)}`);
    const indexed = data?.index === undefined ? listed : Boolean(data.index);
    if (!indexed) {
      if (listed) effects.logger.log(`${faint("skip")} ${file}`);
      continue;
    }

    // This is the (top-level) serving path to the indexed page. There’s
    // implicitly a leading slash here.
    const id = file.slice(0, basename(file) === "index.md" ? -"index.md".length : -3);

    const text = html
      .replaceAll(/[\n\r]/g, " ")
      .replaceAll(/<style\b.*<\/style\b[^>]*>/gi, " ")
      .replaceAll(/<[^>]+>/g, " ")
      .replaceAll(/\W+/g, " ");

    effects.logger.log(`${faint("search indexing")} ${path}`);
    index.add({id, title, text});
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

  indexCache.set(config, {json, freshUntil: +new Date() + reindexingDelay});
  return json;
}
