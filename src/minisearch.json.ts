import {join} from "node:path";
import MiniSearch from "minisearch";
import {visitMarkdownFiles} from "../src/files.js";
import type {BuildEffects} from "./build.js";
import type {Config} from "./config.js";
import {parseMarkdown} from "./markdown.js";
import {faint} from "./tty.js";

// Avoid reindexing too often in preview.
const mem = new WeakMap();
const reindexingDelay = 10 * 60 * 1000;

export async function searchIndex(config: Config, effects?: BuildEffects): Promise<string> {
  const {root, pages, search} = config;
  const log = effects?.logger.log ?? console.info;
  if (!search) return "{}";
  if (mem.has(config) && mem.get(config).freshUntil > +new Date()) return mem.get(config).json;

  const options = {
    fields: ["title", "text"],
    storeFields: ["title"],
    processTerm: (term) => (term.match(/\d/g)?.length > 6 ? null : term.slice(0, 15).toLowerCase()) // fields to return with search results
  };
  const index = new MiniSearch(options);

  const pagePaths = new Set();
  for (const p of pages) {
    if ("path" in p) pagePaths.add(p.path);
    else for (const {path} of p.pages) pagePaths.add(path);
  }

  for await (const file of visitMarkdownFiles(root)) {
    const {html, title, data} = await parseMarkdown(join(root, file), {root, path: "/" + file.slice(0, -3)});

    // Skip page opted out of indexing, and non-pages unless opted-in.
    // We only log the first case.
    if (pagePaths.has(`/${file.slice(0, -3)}`)) {
      if (data?.index === false) {
        log(`${faint("skip")} ${file}`);
        continue;
      }
    } else if (data?.index !== true) continue;

    const id = file === "index.md" ? "" : "" + file.slice(0, -3);
    const text = html
      .replaceAll(/[\n\r]/g, " ")
      .replaceAll(/<style\b.*<\/style\b[^>]*>/gi, " ")
      .replaceAll(/<[^>]+>/g, " ")
      .replaceAll(/\W+/g, " ");

    log(`${faint("index")} ${id}: ${title}`);
    index.add({id, title, text});
  }

  // One way of passing the options to the client; better than nothing, but note
  // that the client can only read the options that are serializable. It's fine
  // for field names, though, which is what we want to share.
  const json = JSON.stringify(Object.assign({options}, index.toJSON()));

  mem.set(config, {json, freshUntil: +new Date() + reindexingDelay});
  return json;
}
