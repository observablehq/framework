import assert from "node:assert";
import {visitFiles} from "../src/files.js";

describe("visitFiles(root)", () => {
  it("visits all files in a directory, return the relative path from the root", async () => {
    assert.deepStrictEqual(await collect(visitFiles("test/input/build/files")), [
      "custom-styles.css",
      "file-top.csv",
      "files.md",
      "subsection/additional-styles.css",
      "subsection/file-sub.csv",
      "subsection/subfiles.md"
    ]);
  });
  it("handles circular symlinks, visiting files only once", async () => {
    assert.deepStrictEqual(await collect(visitFiles("test/input/circular-files")), ["a/a.txt", "b/b.txt"]);
  });
});

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of generator) values.push(value);
  return values;
}
