import assert from "node:assert";
import {stat} from "node:fs/promises";
import os from "node:os";
import {extname} from "node:path/posix";
import {getClientPath, getStylePath, maybeStat, prepareOutput, visitFiles} from "../src/files.js";
import {isParameterized} from "../src/route.js";

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
  it("visits all files in a directory, return the relative path from the root", () => {
    assert.deepStrictEqual(collect(visitFiles("test/input/build/files")), [
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
  it("handles circular symlinks, visiting files only once", function () {
    if (os.platform() === "win32") this.skip(); // symlinks are not the same on Windows
    assert.deepStrictEqual(collect(visitFiles("test/input/circular-files")), ["a/a.txt", "b/b.txt"]);
  });
  it("ignores .observablehq at any level", function () {
    assert.deepStrictEqual(collect(visitFiles("test/files")), ["visible.txt", "sub/visible.txt"]);
  });
});

describe("visitFiles(root, test)", () => {
  it("skips directories and files that don’t pass the specified test", () => {
    assert.deepStrictEqual(
      collect(visitFiles("test/input/build/params", (name) => isParameterized(name) || extname(name) !== "")),
      ["observablehq.config.js", "[dir]/index.md", "[dir]/loaded.md.js"]
    );
    assert.deepStrictEqual(collect(visitFiles("test/input/build/params", (name) => !isParameterized(name))), [
      "observablehq.config.js"
    ]);
  });
});

function collect(generator: Generator<string>): string[] {
  const values: string[] = [];
  for (const value of generator) {
    if (value.startsWith(".observablehq/cache/")) continue;
    values.push(value);
  }
  return values;
}
