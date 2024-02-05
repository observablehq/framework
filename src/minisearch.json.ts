import {readFile} from "node:fs/promises";
import {basename, join} from "node:path";
import matter from "gray-matter";
import MiniSearch from "minisearch";
import {visitMarkdownFiles} from "../src/files.js";
import type {BuildEffects} from "./build.js";
import type {Config} from "./config.js";
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
    let content = (await readFile(join(root, file), "utf-8")).replaceAll(/<[^>]+>/g, " ");
    let frontmatter;
    try {
      ({content, data: frontmatter} = matter(content, {}));
      content = content.replace(/^[\r\n]+/, "");
    } catch {
      // ignore front-matter parsing error
    }

    // Skip page opted out of indexing, and non-pages unless opted-in.
    // We only log the first case.
    if (pagePaths.has(`/${file.slice(0, -3)}`)) {
      if (frontmatter?.index === false) {
        log(`${faint("skip")} ${file}`);
        continue;
      }
    } else if (frontmatter?.index !== true) continue;

    const id = file === "index.md" ? "" : "" + file.slice(0, -3);
    const title =
      frontmatter?.title ??
      content.match(/^# (.*)/)?.[1] ??
      content.match(/<h1[>]*>(.*?)<\/h1>/i)?.[1] ??
      basename(file, ".md");
    log(`${faint("index")} ${id}: ${title}`);
    index.add({id, title, text: content.replaceAll(/\W+/g, " ")});
  }

  // One way of passing the options to the client; better than nothing, but note
  // that the client can only read the options that are serializable. It's fine
  // for field names, though, which is what we want to share.
  const json = JSON.stringify(Object.assign({options}, index.toJSON()));

  mem.set(config, {json, freshUntil: +new Date() + reindexingDelay});
  return json;
}
