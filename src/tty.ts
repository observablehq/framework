import type {Logger} from "./logger.js";

export const bold = color(1, 22);
export const faint = color(2, 22);
export const italic = color(3, 23);
export const underline = color(4, 24);
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
    for (const token of tokens) {
      const tokenLength = stripColor(token).length;
      lastLineLength += tokenLength + 1;
      if (lastLineLength > lineBudget) {
        lines.push([]);
        lastLineLength = tokenLength;
      }
      lines.at(-1)?.push(token);
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
