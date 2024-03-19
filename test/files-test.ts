import assert from "node:assert";
import {stat} from "node:fs/promises";
import os from "node:os";
import {getClientPath, getStylePath, maybeStat, prepareOutput, visitFiles, visitMarkdownFiles} from "../src/files.js";

describe("getClientPath(entry)", () => {
  it("returns the relative path to the specified source", () => {
    assert.strictEqual(getClientPath("main.js"), "test/build/src/client/main.js");
    assert.strictEqual(getClientPath("./main.js"), "test/build/src/client/main.js");
    assert.strictEqual(getClientPath("stdlib/resize.js"), "test/build/src/client/stdlib/resize.js");
    assert.strictEqual(getClientPath("./stdlib/resize.js"), "test/build/src/client/stdlib/resize.js");
  });
});

describe("geStylePath(entry)", () => {
  it("returns the relative path to the specified style", () => {
    assert.strictEqual(getStylePath("default.css"), "test/build/src/style/default.css");
  });
});

describe("prepareOutput(path)", () => {
  it("does nothing if passed the current directory", async () => {
    assert.strictEqual(await prepareOutput("."), undefined);
  });
});

describe("maybeStat(path)", () => {
  it("returns stat if the file does not exist", async () => {
    assert.deepStrictEqual(await maybeStat("README.md"), await stat("README.md"));
  });
  it("rethrows unexpected error", async () => {
    const expected = new Error();
    assert.rejects(
      () =>
        maybeStat({
          toString(): string {
            throw expected;
          }
        } as string),
      expected
    );
  });
  it("returns undefined if the file does not exist", async () => {
    assert.strictEqual(await maybeStat("does/not/exist.txt"), undefined);
  });
});

describe("visitFiles(root)", () => {
  it("visits all files in a directory, return the relative path from the root", async () => {
    assert.deepStrictEqual(await collect(visitFiles("test/input/build/files")), [
      "custom-styles.css",
      "file-top.csv",
      "files.md",
      "observable logo small.png",
      "observable logo.png",
      "subsection/additional-styles.css",
      "subsection/file-sub.csv",
      "subsection/subfiles.md"
    ]);
  });
  it("handles circular symlinks, visiting files only once", async function () {
    if (os.platform() === "win32") this.skip(); // symlinks are not the same on Windows
    assert.deepStrictEqual(await collect(visitFiles("test/input/circular-files")), ["a/a.txt", "b/b.txt"]);
  });
});

describe("visitMarkdownFiles(root)", () => {
  it("visits all Markdown files in a directory, return the relative path from the root", async () => {
    assert.deepStrictEqual(await collect(visitMarkdownFiles("test/input/build/files")), [
      "files.md",
      "subsection/subfiles.md"
    ]);
  });
});

async function collect(generator: AsyncGenerator<string>): Promise<string[]> {
  const values: string[] = [];
  for await (const value of generator) {
    if (value.startsWith(".observablehq/cache/")) continue;
    values.push(value);
  }
  return values;
}
