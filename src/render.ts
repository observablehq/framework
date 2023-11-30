import {type Config} from "./config.js";
import {type Html, html} from "./html.js";
import {type ImportResolver, createImportResolver} from "./javascript/imports.js";
import {type FileReference, type ImportReference} from "./javascript.js";
import {type CellPiece, type ParseResult, parseMarkdown} from "./markdown.js";
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

function render(
  parseResult: ParseResult,
  {root, path, preview, resolver, template, ...options}: RenderOptions & RenderInternalOptions
): string {
  return template(
    {
      path,
      title:
        parseResult.title || options.title
          ? String(
              html`<title>${[parseResult.title, parseResult.title === options.title ? null : options.title]
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
    },
    options
  );
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
