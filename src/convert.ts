import {existsSync} from "node:fs";
import {utimes, writeFile} from "node:fs/promises";
import {join} from "node:path";
import * as clack from "@clack/prompts";
import type {ClackEffects} from "./clack.js";
import {prepareOutput} from "./files.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {bold, faint, inverse, red} from "./tty.js";

export interface ConvertEffects {
  clack: ClackEffects;
  prepareOutput(outputPath: string): Promise<void>;
  existsSync(outputPath: string): boolean;
  writeFile(outputPath: string, contents: Buffer | string): Promise<void>;
  touch(outputPath: string, date: Date | string | number): Promise<void>;
}

const defaultEffects: ConvertEffects = {
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
  {output, force = false, files: includeFiles}: {output: string; force?: boolean; files: boolean},
  effects: ConvertEffects = defaultEffects
): Promise<void> {
  let success = 0;
  clack.intro(`${inverse(" observable convert ")}`);
  for (const input of inputs) {
    let start = Date.now();
    let s = clack.spinner();
    try {
      const url = resolveInput(input);
      s.start(`Fetching ${url}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`error fetching ${url}: ${response.status}`); // TODO pretty
      const {nodes, files, update_time} = await response.json();
      const name = inferFileName(url);
      const path = join(output, name);
      await effects.prepareOutput(path);
      if (!force && effects.existsSync(path)) throw new Error(`${path} already exists`);
      await effects.writeFile(path, convertNodes(nodes));
      await effects.touch(path, update_time);
      s.stop(`Converted ${bold(path)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
      if (includeFiles) {
        for (const file of files) {
          start = Date.now();
          s = clack.spinner();
          s.start(`Downloading ${file.name}`);
          const response = await fetch(file.download_url);
          if (!response.ok) throw new Error(`error fetching ${file.download_url}: ${response.status}`);
          const filePath = join(output, file.name);
          await effects.prepareOutput(filePath);
          if (!force && effects.existsSync(filePath)) throw new Error(`${filePath} already exists`);
          await effects.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
          await effects.touch(filePath, file.create_time);
          s.stop(`Downloaded ${bold(file.name)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
        }
      }
      ++success;
    } catch (error) {
      s.stop(`Converting ${input} failed: ${red(String(error))}`);
    }
  }
  clack.outro(`${success} of ${inputs.length} notebook${inputs.length === 1 ? "" : "s"} converted`);
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
