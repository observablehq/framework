import {existsSync} from "node:fs";
import {utimes, writeFile} from "node:fs/promises";
import {join} from "node:path";
import * as clack from "@clack/prompts";
import type {ClackEffects} from "./clack.js";
import {CliError} from "./error.js";
import {prepareOutput} from "./files.js";
import {getObservableUiOrigin} from "./observableApiClient.js";
import {bold, faint, inverse, yellow} from "./tty.js";

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
  {output, force = false, files: includeFiles = true}: {output: string; force?: boolean; files?: boolean},
  effects: ConvertEffects = defaultEffects
): Promise<void> {
  const {clack} = effects;
  clack.intro(`${inverse(" observable convert ")}`);
  for (const input of inputs) {
    let start = Date.now();
    let s = clack.spinner();
    const url = resolveInput(input);
    const name = inferFileName(url);
    const path = join(output, name);
    s.start(`Downloading ${bold(path)}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`error fetching ${url}: ${response.status}`);
    const {nodes, files, update_time} = await response.json();
    s.stop(`Downloaded ${bold(path)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
    await maybeWrite(path, convertNodes(nodes), force, effects);
    await effects.touch(path, update_time);
    if (includeFiles) {
      for (const file of files) {
        start = Date.now();
        s = clack.spinner();
        s.start(`Downloading ${bold(file.name)}`);
        const filePath = join(output, file.name);
        const response = await fetch(file.download_url);
        if (!response.ok) throw new Error(`error fetching ${file.download_url}: ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        s.stop(`Downloaded ${bold(file.name)} ${faint(`in ${(Date.now() - start).toLocaleString("en-US")}ms`)}`);
        await maybeWrite(filePath, buffer, force, effects);
        await effects.touch(filePath, file.create_time);
      }
    }
  }
  clack.outro(`${inputs.length} notebook${inputs.length === 1 ? "" : "s"} converted`);
}

async function maybeWrite(
  path: string,
  contents: Buffer | string,
  force: boolean,
  effects: ConvertEffects
): Promise<void> {
  const {clack} = effects;
  if (effects.existsSync(path) && !force) {
    const choice = await clack.confirm({message: `${bold(path)} already exists; replace?`, initialValue: false});
    if (!choice) clack.outro(yellow("Cancelled convert"));
    if (clack.isCancel(choice) || !choice) throw new CliError("Cancelled convert", {print: false});
  }
  await effects.prepareOutput(path);
  await effects.writeFile(path, contents);
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
