import {isatty} from "node:tty";
import type {Logger} from "./logger.js";

export const reset = color(0, 0);
export const bold = color(1, 22);
export const faint = color(2, 22);
export const italic = color(3, 23);
export const underline = color(4, 24);
export const inverse = color(7, 27);
export const strikethrough = color(9, 29);
export const red = color(31, 39);
export const green = color(32, 39);
export const yellow = color(33, 39);
export const blue = color(34, 39);
export const magenta = color(35, 39);
export const cyan = color(36, 39);

export type TtyColor = (text: string) => string;

function color(code: number, reset: number): TtyColor {
  return process.stdout.isTTY ? (text: string) => `\x1b[${code}m${text}\x1b[${reset}m` : String;
}

export interface TtyEffects {
  isTty: boolean;
  logger: Logger;
  outputColumns: number;
}

export const defaultEffects: TtyEffects = {
  isTty: isatty(process.stdin.fd),
  logger: console,
  outputColumns: process.stdout.columns ?? 80
};

function stripColor(s: string): string {
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
