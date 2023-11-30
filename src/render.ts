import {parseHTML} from "linkedom";
import {type Config, type Page, type Section, mergeToc} from "./config.js";
import {type Html, html} from "./html.js";
import {type ImportResolver, createImportResolver} from "./javascript/imports.js";
import {type FileReference, type ImportReference} from "./javascript.js";
import {type CellPiece, type ParseResult, parseMarkdown} from "./markdown.js";
import {findLink} from "./pager.js";
import {relativeUrl} from "./url.js";

export interface Render {
  html: string;
  files: FileReference[];
  imports: ImportReference[];
}

export interface RenderOptions extends Config {
  root: string;
  path: string;
  resolver: (cell: CellPiece) => CellPiece;
}

export async function renderPreview(source: string, options: RenderOptions): Promise<Render> {
  const parseResult = await parseMarkdown(source, options.root, options.path);
  return {
    html: render(parseResult, {...options, preview: true}),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

export async function renderServerless(source: string, options: RenderOptions): Promise<Render> {
  const parseResult = await parseMarkdown(source, options.root, options.path);
  return {
    html: render(parseResult, options),
    files: parseResult.files,
    imports: parseResult.imports
  };
}

export function renderDefineCell(cell): string {
  const {id, inline, inputs, outputs, files, body, databases} = cell;
  return `define({${Object.entries({id, inline, inputs, outputs, files, databases})
    .filter((arg) => arg[1] !== undefined)
    .map((arg) => `${arg[0]}: ${JSON.stringify(arg[1])}`)
    .join(", ")}, body: ${body}});\n`;
}

type RenderInternalOptions =
  | {preview?: false} // serverless
  | {preview: true}; // preview

function render(parseResult: ParseResult, options: RenderOptions & RenderInternalOptions): string {
  const {root, path, pages, title, preview, resolver} = options;
  const toc = mergeToc(parseResult.data?.toc, options.toc);
  const headers = toc.show ? findHeaders(parseResult) : [];

  const elements = {
    title:
      parseResult.title || title
        ? String(
            html`<title>${[parseResult.title, parseResult.title === title ? null : title]
              .filter((title): title is string => !!title)
              .join(" | ")}</title>\n`
          )
        : "",
    main: parseResult.html,
    root: relativeUrl(path, "/"),
    base: path === "/404" ? '<base href="/">\n' : "",
    data: parseResult.data,
    preloads: String(renderImportPreloads(parseResult, path, createImportResolver(root, "_import"))),
    module: String(
      html`<script type="module">

${html.unsafe(
  `import {${preview ? "open, " : ""}define} from ${JSON.stringify(
    relativeUrl(path, "/_observablehq/client.js")
  )};\n\n${preview ? `open({hash: ${JSON.stringify(parseResult.hash)}, eval: (body) => (0, eval)(body)});\n` : ""}
${parseResult.cells.map(resolver).map(renderDefineCell).join("")}`
)}

</script>`
    )
  };

  return `<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<head>
${elements.title}${elements.base}<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap">
<link rel="stylesheet" type="text/css" href="${elements.root}_observablehq/style.css">${
    elements.data?.template
      ? `\n<link rel="stylesheet" type="text/css" href="${elements.root}_observablehq/${elements.data.template}.css">`
      : ""
  }
${elements.preloads}
${elements.module}
</head>
<body>
${pages.length > 0 ? renderSidebar(title, pages, path) : ""}
${headers.length > 0 ? renderToc(headers, toc.label) : ""}
<div id="observablehq-center">
<main id="observablehq-main" class="observablehq">
${elements.main}
</main>
<footer id="observablehq-footer">
${renderPager(path, options)}
<div>© ${new Date().getUTCFullYear()} Observable, Inc.</div>
</footer>
</div>
</body>
`;
}

function renderSidebar(title = "Home", pages: (Page | Section)[], path: string): Html {
  return html`<input id="observablehq-sidebar-toggle" type="checkbox">
<nav id="observablehq-sidebar">
  <ol>
    <li class="observablehq-link${path === "/index" ? " observablehq-link-active" : ""}"><a href="${relativeUrl(
      path,
      "/"
    )}">${title}</a></li>
  </ol>
  <ol>${pages.map((p, i) =>
    "pages" in p
      ? html`${i > 0 && "path" in pages[i - 1] ? html`</ol>` : ""}
    <details${p.open ? " open" : ""}>
      <summary>${p.name}</summary>
      <ol>${p.pages.map((p) => renderListItem(p, path))}
      </ol>
    </details>`
      : "path" in p
      ? html`${i > 0 && "pages" in pages[i - 1] ? html`\n  </ol>\n  <ol>` : ""}${renderListItem(p, path)}`
      : ""
  )}
  </ol>
</nav>
<script>{
  const toggle = document.querySelector("#observablehq-sidebar-toggle");
  const initialState = localStorage.getItem("observablehq-sidebar");
  if (initialState) toggle.checked = initialState === "true";
  else toggle.indeterminate = true;
}</script>`;
}

interface Header {
  label: string;
  href: string;
}

function findHeaders(parseResult: ParseResult): Header[] {
  return Array.from(parseHTML(parseResult.html).document.querySelectorAll("h2"))
    .map((node) => ({label: node.textContent, href: node.firstElementChild?.getAttribute("href")}))
    .filter((d): d is Header => !!d.label && !!d.href);
}

function renderToc(headers: Header[], label = "Contents"): Html {
  return html`<aside id="observablehq-toc">
<nav>
<div>${label}</div>
<ol>${headers.map(
    ({label, href}) => html`\n<li class="observablehq-secondary-link"><a href="${href}">${label}</a></li>`
  )}
</ol>
</nav>
</aside>
`;
}

function renderListItem(p: Page, path: string): Html {
  return html`\n    <li class="observablehq-link${
    p.path === path ? " observablehq-link-active" : ""
  }"><a href="${relativeUrl(path, prettyPath(p.path))}">${p.name}</a></li>`;
}

function prettyPath(path: string): string {
  return path.replace(/\/index$/, "/") || "/";
}

function renderImportPreloads(parseResult: ParseResult, path: string, resolver: ImportResolver): Html {
  const specifiers = new Set<string>(["npm:@observablehq/runtime"]);
  for (const {name} of parseResult.imports) specifiers.add(name);
  const inputs = new Set(parseResult.cells.flatMap((cell) => cell.inputs ?? []));
  if (inputs.has("d3") || inputs.has("Plot")) specifiers.add("npm:d3");
  if (inputs.has("Plot")) specifiers.add("npm:@observablehq/plot");
  if (inputs.has("htl") || inputs.has("html") || inputs.has("svg") || inputs.has("Inputs")) specifiers.add("npm:htl");
  if (inputs.has("Inputs")) specifiers.add("npm:@observablehq/inputs");
  if (inputs.has("dot")) specifiers.add("npm:@viz-js/viz");
  if (inputs.has("mermaid")) specifiers.add("npm:mermaid").add("npm:d3");
  if (inputs.has("tex")) specifiers.add("npm:katex");
  const preloads = new Set<string>();
  for (const specifier of specifiers) {
    preloads.add(resolver(path, specifier));
  }
  if (parseResult.cells.some((cell) => cell.databases?.length)) {
    preloads.add(relativeUrl(path, "/_observablehq/database.js"));
  }
  return html`${Array.from(preloads, (href) => html`\n<link rel="modulepreload" href="${href}">`)}`;
}

function renderPager(path: string, options: Pick<Config, "pages" | "pager" | "title">): Html | "" {
  const link = options.pager && findLink(path, options);
  return link
    ? html`\n<nav>${link.prev ? renderRel(path, link.prev, "prev") : ""}${
        link.next ? renderRel(path, link.next, "next") : ""
      }</nav>`
    : "";
}

function renderRel(path: string, page: Page, rel: "prev" | "next"): Html {
  return html`<a rel="${rel}" href="${relativeUrl(path, prettyPath(page.path))}"><span>${page.name}</span></a>`;
}
