import {readFile} from "fs/promises";
import MarkdownIt from "markdown-it";
import {computeHash} from "./hash.js";
import hljs from "highlight.js";

const md = MarkdownIt({
  html: true,
  highlight(str, language) {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(str, {language}).value;
      } catch (error) {
        console.error(error);
      }
    }
  }
});

export async function render(path: string): Promise<string> {
  const source = await readFile(path, "utf-8");
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {Runtime, Inspector} from "https://cdn.jsdelivr.net/npm/@observablehq/runtime@5/+esm";
import {open} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(computeHash(source))}});

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
${md.render(source)}`;
}
