import {readFile} from "fs/promises";
import {ParseResult, parseMarkdown} from "./markdown.js";
import {computeHash} from "./hash.js";

export async function render(path: string): Promise<string> {
  const source = await readFile(path, "utf-8");
  const parseResult = parseMarkdown(source);
  return generatePreviewPage(parseResult, computeHash(source));
}

export function renderServerlessSource(source: string): string {
  const parseResult = parseMarkdown(source);
  return generateServerlessPage(parseResult);
}

export function generatePreviewPage(parseResult: ParseResult, hash): string {
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {open, define} from "/_observablehq/client.js";

open({hash: ${JSON.stringify(hash)}});
${parseResult.js}
</script>${
    parseResult.data
      ? `
<script type="application/json">
${JSON.stringify(parseResult.data)}
</script>`
      : ""
  }
${parseResult.html}`;
}

export function generateServerlessPage(parseResult: ParseResult): string {
  return `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="stylesheet" type="text/css" href="/_observablehq/style.css">
<script type="module">

import {define} from "/_observablehq/client.js";

${parseResult.js}
</script>${
    parseResult.data
      ? `
<script type="application/json">
${JSON.stringify(parseResult.data)}
</script>`
      : ""
  }
${parseResult.html}`;
}
