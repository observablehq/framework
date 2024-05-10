import {existsSync, readdirSync, statSync} from "node:fs";
import {readFile, writeFile} from "node:fs/promises";
import {join} from "node:path/posix";
import he from "he";
import {readConfig} from "../src/config.js";
import {visitMarkdownFiles} from "../src/files.js";
import {parseMarkdown} from "../src/markdown.js";

const base = "examples";

const config = await readConfig(undefined, ".");

for (const entry of readdirSync("examples")) {
  const dir = join(base, entry);
  const src = join(dir, "src");
  if (statSync(dir).isDirectory() && existsSync(src)) {
    for (const file of visitMarkdownFiles(src)) {
      const sourcePath = join(src, file);
      const source = await readFile(sourcePath, "utf8");
      const path = file;
      const {body, title, data} = parseMarkdown(source, {...config, path});
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
      console.warn({entry, file, text, title, data});
      const url = `https://observablehq.observablehq.cloud/framework-example-${entry}/`;
      await writeFile(
        `docs/examples-${entry}.md`,
        `---
index: true
title: ${title} (example)
---

<meta http-equiv="refresh" content="0; url=${url}">

[>>](${url}).

<div style="display:none">${text}</div>`
      );
    }
  }
}
