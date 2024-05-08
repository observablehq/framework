import * as clack from "@clack/prompts";
import isUnicodeSupported from "is-unicode-supported";
import wrapAnsi from "wrap-ansi";
import {blue, faint, green, red, stripColor, yellow} from "./tty.js";

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

type TestOptions = {output?: {write: (chunk: string) => void; columns?: number}};

export interface ClackWrapEffects {
  intro: (message?: string, testOptions?: TestOptions) => void;
  outro: (message?: string, testOptions?: TestOptions) => void;
  log: {
    message(message?: string, clackOptions?: clack.LogMessageOptions, testOptions?: TestOptions): void;
    info(message?: string, testOptions?: TestOptions): void;
    success(message?: string, testOptions?: TestOptions): void;
    step(message?: string, testOptions?: TestOptions): void;
    warn(message?: string, testOptions?: TestOptions): void;
    warning(message?: string, testOptions?: TestOptions): void;
    error(message?: string, testOptions?: TestOptions): void;
  };
}

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

function getWrapWidth({output}: TestOptions, reserved: number) {
  const terminalWidth = output?.columns ?? 80;
  return Math.min(terminalWidth - reserved, 80);
}

function writeWrapped(
  message: string,
  {
    prefix = "",
    prefixFirst = prefix,
    prefixLast = prefix
  }: {prefix?: string; prefixFirst?: string; prefixLast?: string},
  output: NonNullable<TestOptions["output"]>
): void {
  const prefixWidth = stripColor(prefix).length;
  if (stripColor(prefixFirst).length !== prefixWidth || stripColor(prefixLast).length !== prefixWidth)
    throw new Error("prefixes must have matching lengths");
  const lines = wrapAnsi(message, getWrapWidth({output}, prefixWidth))
    .split("\n")
    .map((l) => l.trimEnd());
  const withPrefixes = [prefixFirst + lines[0], ...lines.slice(1, -1).map((l) => prefix + l)];
  if (lines.length > 1) withPrefixes.push(prefixLast + lines.at(-1));
  output.write(withPrefixes.join("\n") + "\n");
}

export class WrappingClack implements ClackWrapEffects {
  intro(message: string = "", {output = process.stdout}: TestOptions = {}) {
    writeWrapped(message, {prefixFirst: `${faint(S_BAR_START)}  `, prefix: `${faint(S_BAR)}  `}, output);
  }
  outro(message: string = "", {output = process.stdout}: TestOptions = {}) {
    output.write(faint(S_BAR) + "\n");
    writeWrapped(message, {prefixLast: `${faint(S_BAR_END)}  `, prefix: `${faint(S_BAR)}  `}, output);
  }
  get log(): WrappingClackLog {
    return new WrappingClackLog();
  }
}

export class WrappingClackLog {
  message(
    message: string = "",
    {symbol}: clack.LogMessageOptions = {},
    {output = process.stdout}: TestOptions = {}
  ): void {
    output.write(faint(S_BAR) + "\n");
    writeWrapped(message, {prefix: `${faint(S_BAR)}  `, prefixFirst: `${symbol}  `}, output);
  }
  info(message?: string, testOptions?: TestOptions): void {
    this.message(message, {symbol: blue(S_INFO)}, testOptions);
  }
  success(message?: string, testOptions?: TestOptions): void {
    this.message(message, {symbol: green(S_SUCCESS)}, testOptions);
  }
  step(message?: string, testOptions?: TestOptions): void {
    this.message(message, {symbol: green(S_STEP_SUBMIT)}, testOptions);
  }
  warn(message?: string, testOptions?: TestOptions): void {
    this.message(message, {symbol: yellow(S_WARN)}, testOptions);
  }
  warning(message?: string, testOptions?: TestOptions): void {
    this.warn(message, testOptions);
  }
  error(message?: string, testOptions?: TestOptions): void {
    this.message(message, {symbol: red(S_ERROR)}, testOptions);
  }
}
