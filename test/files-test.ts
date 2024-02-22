import assert from "node:assert";
import os from "node:os";
import {stat} from "../src/brandedFs.js";
import {FilePath} from "../src/brandedPath.js";
import {maybeStat, prepareOutput, visitFiles, visitMarkdownFiles} from "../src/files.js";

describe("prepareOutput(path)", () => {
  it("does nothing if passed the current directory", async () => {
    assert.strictEqual(await prepareOutput(FilePath(".")), undefined);
  });
});

describe("maybeStat(path)", () => {
  it("returns stat if the file does not exist", async () => {
    assert.deepStrictEqual(await maybeStat(FilePath("README.md")), await stat(FilePath("README.md")));
  });
  it("rethrows unexpected error", async () => {
    const expected = new Error();
    assert.rejects(
      () =>
        maybeStat({
          toString(): string {
            throw expected;
          }
        } as FilePath),
      expected
    );
  });
  it("returns undefined if the file does not exist", async () => {
    assert.strictEqual(await maybeStat(FilePath("does/not/exist.txt")), undefined);
  });
});

describe("visitFiles(root)", () => {
  it("visits all files in a directory, return the relative path from the root", async () => {
    assert.deepStrictEqual(await collect(visitFiles(FilePath("test/input/build/files"))), [
      FilePath("custom-styles.css"),
      FilePath("file-top.csv"),
      FilePath("files.md"),
      FilePath("observable logo small.png"),
      FilePath("observable logo.png"),
      FilePath("subsection/additional-styles.css"),
      FilePath("subsection/file-sub.csv"),
      FilePath("subsection/subfiles.md")
    ]);
  });
  it("handles circular symlinks, visiting files only once", async function () {
    if (os.platform() === "win32") this.skip(); // symlinks are not the same on Windows
    assert.deepStrictEqual(await collect(visitFiles(FilePath("test/input/circular-files"))), [
      FilePath("a/a.txt"),
      FilePath("b/b.txt")
    ]);
  });
});

describe("visitMarkdownFiles(root)", () => {
  it("visits all Markdown files in a directory, return the relative path from the root", async () => {
    assert.deepStrictEqual(await collect(visitMarkdownFiles(FilePath("test/input/build/files"))), [
      FilePath("files.md"),
      FilePath("subsection/subfiles.md")
    ]);
  });
});

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of generator) values.push(value);
  return values;
}
