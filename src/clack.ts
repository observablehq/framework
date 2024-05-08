import * as clack from "@clack/prompts";
import isUnicodeSupported from "is-unicode-supported";
import wrapAnsi from "wrap-ansi";
import {blue, faint, green, red, yellow} from "./tty.js";

type Clack = typeof clack;

export interface ClackEffects {
  text: Clack["text"];
  intro: Clack["intro"];
  select: Clack["select"];
  confirm: Clack["confirm"];
  spinner: Clack["spinner"];
  note: Clack["note"];
  outro: Clack["outro"];
  cancel: Clack["cancel"];
  group<T>(prompts: clack.PromptGroup<T>, options?: clack.PromptGroupOptions<T>): Promise<unknown>;
  log: Clack["log"];
  isCancel: Clack["isCancel"];
  wrap: ClackWrapEffects;
}

export type ClackWrapEffects = Pick<ClackEffects, "intro" | "outro" | "log">;

export const clackWithWrap: ClackEffects = {
  ...clack,
  get wrap(): ClackWrapEffects {
    return new WrappingClack();
  }
};

// The symbols used below are from
// https://github.com/natemoo-re/clack/blob/45ee73bf33b25f9a8c7e1bb6117ccc165478bf4d/packages/prompts/src/index.ts
const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_INFO = s("●", "•");
const S_SUCCESS = s("◆", "*");
const S_WARN = s("▲", "!");
const S_ERROR = s("■", "x");
const S_STEP_SUBMIT = s("◇", "o");
const S_BAR_START = s("┌", "T");
const S_BAR = s("│", "|");
const S_BAR_END = s("└", "—");

function getWrapWidth(reserved = 0) {
  const terminalWidth = process.stdout.columns ?? 80;
  return Math.min(terminalWidth - reserved, 80);
}

function writeWrapped(
  message: string,
  {prefix = "", prefixFirst = prefix, prefixLast = prefix}: {prefix?: string; prefixFirst?: string; prefixLast?: string}
): void {
  if (prefix.length !== prefixFirst.length || prefix.length !== prefixLast.length)
    throw new Error("prefixes must have matching lengths");
  const lines = wrapAnsi(message, getWrapWidth(prefixFirst.length)).split("\n");
  const withPrefixes = [prefixFirst + lines[0], ...lines.slice(1, -1).map((l) => prefix + l)];
  if (lines.length > 1) withPrefixes.push(prefixLast + lines.at(-1));
  process.stdout.write(withPrefixes.join("\n") + "\n");
}

export class WrappingClack implements ClackWrapEffects {
  intro: Clack["intro"] = (message: string = "") => {
    writeWrapped(message, {prefixFirst: `${faint(S_BAR_START)}  `, prefix: `${faint(S_BAR)}  `});
  };
  outro: Clack["outro"] = (message: string = "") => {
    process.stdout.write(faint(S_BAR_END) + "\n");
    writeWrapped(message, {prefixLast: `${faint(S_BAR_END)}  `, prefix: `${faint(S_BAR)}  `});
  };
  get log(): Clack["log"] {
    return new WrappingClackLog();
  }
}

export class WrappingClackLog {
  message(message: string = "", {symbol}: clack.LogMessageOptions = {}): void {
    writeWrapped(message, {prefix: `${symbol ?? faint(S_BAR)}  `});
  }
  info(message?: string): void {
    this.message(message, {symbol: blue(S_INFO)});
  }
  success(message?: string): void {
    this.message(message, {symbol: green(S_SUCCESS)});
  }
  step(message?: string): void {
    this.message(message, {symbol: green(S_STEP_SUBMIT)});
  }
  warn(message?: string): void {
    this.message(message, {symbol: yellow(S_WARN)});
  }
  warning(message?: string): void {
    this.warn(message);
  }
  error(message?: string): void {
    this.message(message, {symbol: red(S_ERROR)});
  }
}
