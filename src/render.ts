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

import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import {open} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});

const codeBlocks = ${JSON.stringify(parseResult.codeBlocks)};

const runtime = new Runtime();
const main = runtime.module();

main
  .variable(new Inspector(document.querySelector("#plot")))
  .define("plot", ["Plot", "alphabet"], (Plot, alphabet) => Plot.plot({
    y: {percent: true},
    marks: [
      Plot.barY(alphabet, {x: "letter", y: "frequency", fill: "steelblue", sort: {x: "-y"}}),
      Plot.ruleY([0])
    ]
  }));

</script>
${parseResult.html}`;
}
