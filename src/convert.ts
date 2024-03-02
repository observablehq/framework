import {existsSync} from "node:fs";
import {utimes, writeFile} from "node:fs/promises";
import {join} from "node:path/posix";
import * as clack from "@clack/prompts";
import wrapAnsi from "wrap-ansi";
import type {ClackEffects} from "./clack.js";
import {CliError} from "./error.js";
import {prepareOutput} from "./files.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {type TtyEffects, bold, cyan, faint, inverse, link, reset, defaultEffects as ttyEffects} from "./tty.js";

export interface ConvertEffects extends TtyEffects {
  clack: ClackEffects;
  prepareOutput(outputPath: string): Promise<void>;
  existsSync(outputPath: string): boolean;
  writeFile(outputPath: string, contents: Buffer | string): Promise<void>;
  touch(outputPath: string, date: Date | string | number): Promise<void>;
}

const defaultEffects: ConvertEffects = {
  ...ttyEffects,
  clack,
  async prepareOutput(outputPath: string): Promise<void> {
    await prepareOutput(outputPath);
  },
  existsSync(outputPath: string): boolean {
    return existsSync(outputPath);
  },
  async writeFile(outputPath: string, contents: Buffer | string): Promise<void> {
    await writeFile(outputPath, contents);
  },
  async touch(outputPath: string, date: Date | string | number): Promise<void> {
    await utimes(outputPath, (date = new Date(date)), date);
  }
};

export async function convert(
  inputs: string[],
  {output, force = false, files: includeFiles = true}: {output: string; force?: boolean; files?: boolean},
  effects: ConvertEffects = defaultEffects
): Promise<void> {
  const {clack} = effects;
  clack.intro(`${inverse(" observable convert ")}`);
  let n = 0;
  for (const input of inputs) {
    let start = Date.now();
    let s = clack.spinner();
    const url = resolveInput(input);
    const name = inferFileName(url);
    const path = join(output, name);
    if (await maybeFetch(path, force, effects)) {
      s.start(`Downloading ${bold(path)}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`error fetching ${url}: ${response.status}`);
      const {nodes, files, update_time} = await response.json();
      s.stop(`Downloaded ${bold(path)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
      await effects.prepareOutput(path);
      await effects.writeFile(path, convertNodes(nodes));
      await effects.touch(path, update_time);
      n++;
      if (includeFiles) {
        for (const file of files) {
          const path = join(output, file.name);
          if (await maybeFetch(path, force, effects)) {
            start = Date.now();
            s = clack.spinner();
            s.start(`Downloading ${bold(file.name)}`);
            const response = await fetch(file.download_url);
            if (!response.ok) throw new Error(`error fetching ${file.download_url}: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            s.stop(`Downloaded ${bold(file.name)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
            await effects.prepareOutput(path);
            await effects.writeFile(path, buffer);
            await effects.touch(path, file.create_time);
            n++;
          }
        }
      }
    }
  }
  clack.note(
    wrapAnsi(
      "Due to syntax differences between Observable notebooks and " +
        "Observable Framework, converted notebooks may require further " +
        "changes to function correctly. To learn more about JavaScript " +
        "in Framework, please read:\n\n" +
        reset(cyan(link("https://observablehq.com/framework/javascript"))),
      Math.min(64, effects.outputColumns)
    ),
    "Note"
  );
  clack.outro(
    `${inputs.length} notebook${inputs.length === 1 ? "" : "s"} converted; ${n} file${n === 1 ? "" : "s"} written`
  );
}

async function maybeFetch(path: string, force: boolean, effects: ConvertEffects): Promise<boolean> {
  const {clack} = effects;
  if (effects.existsSync(path) && !force) {
    const choice = await clack.confirm({message: `${bold(path)} already exists; replace?`, initialValue: false});
    if (!choice) return false;
    if (clack.isCancel(choice)) throw new CliError("Stopped convert", {print: false});
  }
  return true;
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

export function inferFileName(input: string): string {
  return new URL(input).pathname.replace(/^\/document(\/@[^/]+)?\//, "").replace(/\//g, ",") + ".md";
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
