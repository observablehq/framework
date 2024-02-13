import {join} from "node:path";
import {type BuildEffects, FileBuildEffects} from "./build.js";
import {prepareOutput} from "./files.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {faint} from "./tty.js";

export async function convert(
  inputs: string[],
  output: string,
  effects: BuildEffects = new FileBuildEffects(output)
): Promise<void> {
  for (const input of inputs.map(resolveInput)) {
    effects.output.write(`${faint("loading")} ${input} ${faint("→")} `);
    const response = await fetch(input);
    if (!response.ok) throw new Error(`error fetching ${input}: ${response.status}`);
    const name = input.replace(/^https:\/\/api\.observablehq\.com\/document(\/@[^/]+)?\//, "").replace(/\//g, ",");
    const destination = join(output, `${name}.md`);
    await prepareOutput(destination);
    await effects.writeFile(destination, convertNodes((await response.json()).nodes));
  }
}

export function convertNodes(nodes): string {
  let string = "";
  let first = true;
  for (const node of nodes) {
    if (first) first = false;
    else string += "\n";
    string += convertNode(node);
  }
  return string;
}

export function convertNode(node): string {
  let string = "";
  if (node.mode !== "md") string += `\`\`\`${node.mode}${node.pinned ? " echo" : ""}\n`;
  string += `${node.value}\n`;
  if (node.mode !== "md") string += "```\n";
  return string;
}

export function resolveInput(input: string): string {
  let url: URL;
  if (isIdSpecifier(input)) url = new URL(`/d/${input}`, getObservableUiOrigin());
  else if (isSlugSpecifier(input)) url = new URL(`/${input}`, getObservableUiOrigin());
  else url = new URL(input);
  url.host = `api.${url.host}`;
  url.pathname = `/document${url.pathname.replace(/^\/d\//, "/")}`;
  return String(url);
}

function isIdSpecifier(string: string) {
  return /^([0-9a-f]{16})(?:@(\d+)|~(\d+)|@(\w+))?$/.test(string);
}

function isSlugSpecifier(string: string) {
  return /^(?:@([0-9a-z_-]+))\/([0-9a-z_-]+(?:\/[0-9]+)?)(?:@(\d+)|~(\d+)|@(\w+))?$/.test(string);
}
