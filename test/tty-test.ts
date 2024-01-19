import assert from "node:assert";
import {blue, green, red, stripColor, wrapLog} from "../src/tty.js";
import {MockLogger} from "./mocks/logger.js";

const process = {
  stdout: {isTTY: true, columns: 80},
  stderr: {isTTY: true, columns: 80}
};

describe("wrapLog", () => {
  let logger: MockLogger;
  beforeEach(() => {
    logger = new MockLogger();
  });

  it("works with a 80 character wide terminal", () => {
    const effects = {logger, process};
    wrapLog(text, effects);
    assert.deepEqual(logger.logLines[0][0].split("\n"), expected80);
  });

  it("works with a 120 character wide terminal", () => {
    const effects = {logger, process: {...process, stdout: {isTTY: true, columns: 120}}};
    wrapLog(text, effects);
    assert.deepEqual(logger.logLines[0][0].split("\n"), expected120);
  });

  it("works with color codes", () => {
    const effects = {logger, process: {...process, stdout: {isTTY: true, columns: 120}}};
    const colorfulText = text.replaceAll(/(.{8})/g, (match) =>
      [red, green, blue][Math.floor(Math.random() * 3)](match)
    );
    wrapLog(colorfulText, effects);
    // eslint-disable-next-line no-control-regex
    const cleanedOutput = stripColor(logger.logLines[0][0]);
    assert.deepEqual(cleanedOutput.split("\n"), expected120.map(stripColor));
  });

  it("doesn't wrap when tty is false", () => {
    const effects = {logger, process: {...process, stdout: {isTTY: false, columns: 80}}};
    wrapLog(text, effects);
    assert.deepEqual(logger.logLines[0][0], text);
  });
});

const text =
  "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.";

const expected80 = [
  "Call me Ishmael. Some years ago—never mind how long precisely—having little",
  "\u001b[2m↳\u001b[22m or no money in my purse, and nothing particular to interest me on shore, I",
  "\u001b[2m↳\u001b[22m thought I would sail about a little and see the watery part of the world. It",
  "\u001b[2m↳\u001b[22m is a way I have of driving off the spleen and regulating the circulation."
];
const expected120 = [
  "Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing",
  "\u001b[2m↳\u001b[22m particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is",
  "\u001b[2m↳\u001b[22m a way I have of driving off the spleen and regulating the circulation."
];
