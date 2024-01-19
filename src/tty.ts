import type {LogLevel, Logger} from "./logger.js";

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

function color(code: number, reset: number) {
  return (text: string) => `\x1b[${code}m${text}\x1b[${reset}m`;
}
export function stripColor(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

type TtyWriteStream = Pick<typeof process.stdout, "isTTY" | "columns">;
interface TtyEffects {
  process?: {stdout: TtyWriteStream; stderr: TtyWriteStream};
  logger: Logger;
}
const defaultEffects: TtyEffects = {
  logger: console
};

function writeStream(level: LogLevel, effects: TtyEffects) {
  switch (level) {
    case "log":
      return (effects.process ?? process).stdout;
    case "warn":
    case "error":
      return (effects.process ?? process).stderr;
  }
}

export function log(message: string, effects = defaultEffects, level: LogLevel = "log") {
  if (writeStream(level, effects).isTTY) {
    effects.logger[level](message);
  } else {
    effects.logger[level](stripColor(message));
  }
}

export function wrapLog(message: string, effects = defaultEffects, level: LogLevel = "log") {
  const stream = writeStream(level, effects);
  if (stream.isTTY) {
    const prefixLength = 2;
    const lineBudget = stream.columns - prefixLength;
    const tokens = message.split(" ");
    const lines: string[][] = [[]];
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
    effects.logger[level](lines.map((line) => line.join(" ")).join(`\n${faint("↳")} `));
  } else {
    effects.logger[level](stripColor(message));
  }
}
