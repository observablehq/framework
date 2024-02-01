import {readFile} from "fs/promises";
import {basename, join} from "path";
import MiniSearch from "minisearch";
import {visitMarkdownFiles} from "../../src/files.js"; // TODO proper load

const root = "./docs/"; // TODO proper root

const options = {
  fields: ["title", "text"], // fields to index for full-text search
  storeFields: ["title"],
  processTerm: (term) => term.match(/\d/g)?.length > 6 ? null : term.slice(0, 25).toLowerCase() // fields to return with search results
};
const index = new MiniSearch(options);

for await (const file of visitMarkdownFiles(root)) {
  if (file === "404.md" || file.startsWith("theme/")) continue;
  console.warn(`Indexing ${file}`);
  const text = (await readFile(join(root, file), "utf-8"))
    .replaceAll(/<[^>]+>/g, " ");

  // TODO h1, front-matter…
  const title = text.match(/^title: (.*)/m)?.[1] ?? text.match(/^# (.*)/)?.[1] ?? basename(file, ".md");
  const id = file === "index.md" ? "" : "" + file.slice(0, -3);
  index.add({id, title, text: text.replaceAll(/\W+/g, " ")});
}

// One way of passing the options to the client; better than nothing, but note
// that the client can only read the options that are serializable. It's fine
// for field names, though, which is what we want to share.
process.stdout.write(JSON.stringify(Object.assign({options}, index.toJSON())));
