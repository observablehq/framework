import assert from "node:assert";
import * as clack from "@clack/prompts";
import type {TtyEffects} from "../src/tty.js";
import {blue, bold, green, hangingIndentLog, red} from "../src/tty.js";

describe("hangingIndentLog", () => {
  it("works with a 80 character wide terminal", () => {
    const effects = {...noopEffects, outputColumns: 80};
    const {output, indent} = hangingIndentLog(effects, "Chapter 1:", text);
    assert.equal(indent.length, "Chapter 1: ".length);
    assert.deepEqual(output.split("\n"), expected80);
  });

  it("works with a 120 character wide terminal", () => {
    const effects = {...noopEffects, outputColumns: 120};
    const {output, indent} = hangingIndentLog(effects, "Ishmael:", text);
    assert.equal(indent.length, "Ishmael: ".length);
    assert.deepEqual(output.split("\n"), expected120);
  });

  it("works with color codes in the prefix", () => {
    const effects = {...noopEffects, outputColumns: 120};
    const colorfulText = text.replaceAll(/(.{8})/g, (match) =>
      [red, green, blue][Math.floor(Math.random() * 3)](match)
    );
    const {output, indent} = hangingIndentLog(effects, bold("Ishmael:"), colorfulText);
    // eslint-disable-next-line no-control-regex
    const cleanedOutput = output.replaceAll(/\x1b\[[0-9;]*m/g, "");
    assert.equal(indent.length, "Ishmael: ".length);
    assert.deepEqual(cleanedOutput.split("\n"), expected120);
  });

  it("doesn't wrap when tty is false", () => {
    const effects = {...noopEffects, isTty: false};
    const {output, indent} = hangingIndentLog(effects, "Ishmael:", text);
    assert.equal(indent.length, 0);
    assert.deepEqual(output, `Ishmael: ${text}`);
  });

  it("handles internal newlines", () => {
    const effects = noopEffects;
    const {output} = hangingIndentLog(effects, "newline", "hello\nworld");
    assert.deepEqual(output, "newline hello\n        world");
  });

  it("handles words longer than the terminal width", () => {
    const effects = {...noopEffects, outputColumns: 30};
    const {output} = hangingIndentLog(effects, "long", "always 012345689012345689012345689012345689 make progress");
    assert.deepEqual(output, "long always\n     012345689012345689012345689012345689\n     make progress");
  });
});

const noopEffects: TtyEffects = {
  clack,
  isTty: true,
  logger: {log() {}, warn() {}, error() {}},
  outputColumns: 80
};

const text =
  "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.";

const expected80 = [
  "Chapter 1: Call me Ishmael. Some years ago—never mind how long precisely—having",
  "           little or no money in my purse, and nothing particular to interest me",
  "           on shore, I thought I would sail about a little and see the watery",
  "           part of the world. It is a way I have of driving off the spleen and",
  "           regulating the circulation."
];
const expected120 = [
  "Ishmael: Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and",
  "         nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of",
  "         the world. It is a way I have of driving off the spleen and regulating the circulation."
];
