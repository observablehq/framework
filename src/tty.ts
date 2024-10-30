import {isatty} from "node:tty";
import * as clack from "@clack/prompts";
import pc from "picocolors";
import type {ClackEffects} from "./clack.js";
import type {Logger} from "./logger.js";

export const reset = pc.reset;
export const bold = pc.bold;
export const faint = pc.gray;
export const italic = pc.italic;
export const underline = pc.underline;
export const inverse = pc.inverse;
export const strikethrough = pc.strikethrough;
export const red = pc.red;
export const green = pc.green;
export const yellow = pc.yellow;
export const blue = pc.blue;
export const magenta = pc.magenta;
export const cyan = pc.cyan;

export interface TtyEffects {
  clack: ClackEffects;
  isTty: boolean;
  logger: Logger;
  outputColumns: number;
}

const noSpinner = () => ({
  start(msg?: string) {
    console.log(msg);
  },
  stop(msg?: string, code?: number) {
    console.log(msg, code ?? "");
  },
  message(msg?: string) {
    console.log(msg);
  }
});

export const defaultEffects: TtyEffects = {
  clack: process.stdout.isTTY ? clack : {...clack, spinner: noSpinner},
  isTty: isatty(process.stdin.fd),
  logger: console,
  outputColumns: Math.min(80, process.stdout.columns ?? 80)
};

export function stripColor(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function hangingIndentLog(
  effects: TtyEffects,
  prefix: string,
  message: string
): {output: string; indent: string} {
  let output;
  let indent;
  if (effects.isTty) {
    const prefixLength = stripColor(prefix).length + 1;
    const lineBudget = effects.outputColumns - prefixLength;
    const tokens = message.split(" ");
    const lines: string[][] = [[]];
    indent = " ".repeat(prefixLength);
    let lastLineLength = 0;
    while (tokens.length) {
      let token = tokens.shift()!;
      let newline = false;
      if (token.includes("\n")) {
        let rest;
        [token, rest] = token.split("\n", 2);
        tokens.unshift(rest);
        newline = true;
      }
      const tokenLength = stripColor(token).length;
      lastLineLength += tokenLength + 1;
      if (lastLineLength > lineBudget) {
        lines.push([]);
        lastLineLength = tokenLength;
      }
      lines.at(-1)?.push(token);
      if (newline) {
        lines.push([]);
        lastLineLength = tokenLength;
      }
    }
    output = prefix + " ";
    output += lines.map((line) => line.join(" ")).join("\n" + indent);
  } else {
    output = `${prefix} ${message}`;
    indent = "";
  }
  effects.logger.log(output);
  return {output, indent};
}

export function link(url: URL | string): string {
  if (url instanceof URL) url = url.href;
  return underline(url);
}
