import {readFile} from "fs/promises";
import {computeHash} from "./hash.js";
import {parseMarkdown} from "./markdown.js";

export async function render(path: string): Promise<string> {
  const source = await readFile(path, "utf-8");
  const parseResult = parseMarkdown(source);
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {open} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});

</script>
<script type="module">

import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";

const runtime = new Runtime();
const main = runtime.module();
${parseResult.js}
</script>
${parseResult.html}`;
}
