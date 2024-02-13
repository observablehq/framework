import {access} from "node:fs/promises";
import {join} from "node:path";
import {type BuildEffects, FileBuildEffects} from "./build.js";
import {isEnoent} from "./error.js";
import {prepareOutput} from "./files.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {faint} from "./tty.js";

async function readyOutput(dir, name) {
  const destination = join(dir, name);
  try {
    await access(destination, 0);
    return false;
  } catch (error) {
    if (isEnoent(error)) {
      await prepareOutput(destination);
      return true;
    }
    throw error;
  }
}

export async function convert(
  inputs: string[],
  {output, files: download_files}: {output: string; files: boolean},
  effects: BuildEffects = new FileBuildEffects(output)
): Promise<void> {
  for (const input of inputs.map(resolveInput)) {
    effects.output.write(
      `${faint("reading")} ${input.replace("https://api.observablehq.com/document/", "")} ${faint("→")} `
    );
    const response = await fetch(input);
    if (!response.ok) throw new Error(`error fetching ${input}: ${response.status}`);
    const name =
      input.replace(/^https:\/\/api\.observablehq\.com\/document(\/@[^/]+)?\//, "").replace(/\//g, ",") + ".md";
    const ready = await readyOutput(output, name);
    if (!ready) {
      effects.logger.warn(faint("skip"), name);
    } else {
      const {nodes, files} = await response.json();
      await effects.writeFile(name, convertNodes(nodes));
      if (download_files && files) {
        for (const file of files) {
          effects.output.write(`${faint("attachment")} ${file.name} ${faint("→")} `);
          const ready = await readyOutput(output, file.name);
          if (!ready) {
            effects.logger.warn(faint("skip"), file.name);
          } else {
            const response = await fetch(file.download_url);
            if (!response.ok) throw new Error(`error fetching ${file}: ${response.status}`);
            await effects.writeFile(file.name, Buffer.from(await response.arrayBuffer()));
            // TODO touch create_time: "2024-02-12T23:29:35.968Z";
          }
        }
      }
    }
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
