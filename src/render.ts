import {readFile} from "fs/promises";
import MarkdownIt from "markdown-it";
import {computeHash} from "./hash.js";

const md = MarkdownIt();

export async function render(path: string): Promise<string> {
  const source = await readFile(path, "utf-8");
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {open} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});

</script>
${md.render(source)}`;
}
