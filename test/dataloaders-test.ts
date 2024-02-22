import assert from "node:assert";
import os from "node:os";
import {readFile, stat, unlink, utimes} from "../src/brandedFs.js";
import {FilePath, fileJoin} from "../src/brandedPath.js";
import {type LoadEffects, Loader} from "../src/dataloader.js";

const noopEffects: LoadEffects = {
  logger: {log() {}, warn() {}, error() {}},
  output: {write() {}}
};

const lineEnding = os.platform() === "win32" ? "\r\n" : "\n";

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data1.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), "node\n");
  });
  it("a .ts data loader is called with tsx", async () => {
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data2.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), "tsx\n");
  });
  it("a .sh data loader is called with sh", async function () {
    if (process.platform === "win32") this.skip(); // sh loader is not supported on Windows
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data3.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), "shell\n");
  });
  it("a .exe data loader is invoked directly", async () => {
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data4.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), `python${lineEnding}`);
  });
  it("a .py data loader is called with python3", async () => {
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data5.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), `python3${lineEnding}`);
  });
  // Skipping because this requires R to be installed (which is slow in CI).
  it.skip("a .R data loader is called with Rscript", async () => {
    const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data6.txt"))!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile(fileJoin("test", out), "utf-8"), "Rscript\n");
  });
});

it("a dataloader can use use a stale cache", async () => {
  const out = [] as string[];
  const outputEffects: LoadEffects = {
    logger: {log() {}, warn() {}, error() {}},
    output: {
      write(a) {
        out.push(a);
      }
    }
  };
  const loader = Loader.find(FilePath("test"), FilePath("dataloaders/data1.txt"))!;
  // save the loader times.
  const {atime, mtime} = await stat(loader.path);
  // set the loader mtime to Dec. 1st, 2023.
  const time = new Date("2023-11-01");
  await utimes(loader.path, atime, time);
  // remove the cache set by another test (unless we it.only this test).
  try {
    await unlink(FilePath("test/.observablehq/cache/dataloaders/data1.txt"));
  } catch {
    // ignore;
  }
  // populate the cache (missing)
  await loader.load(outputEffects);
  // run again (fresh)
  await loader.load(outputEffects);
  // touch the loader
  await utimes(loader.path, atime, new Date(Date.now() + 100));
  // run it with useStale=true (using stale)
  const loader2 = Loader.find(FilePath("test"), FilePath("dataloaders/data1.txt"), {useStale: true})!;
  await loader2.load(outputEffects);
  // run it with useStale=false (stale)
  await loader.load(outputEffects);
  // revert the loader to its original mtime
  await utimes(loader.path, atime, mtime);
  assert.deepStrictEqual(
    // eslint-disable-next-line no-control-regex
    out.map((l) => l.replaceAll(/\x1b\[[0-9]+m/g, "")),
    [
      `load ${FilePath("test/dataloaders/data1.txt.js")} → `,
      "[missing] ",
      `load ${FilePath("test/dataloaders/data1.txt.js")} → `,
      "[fresh] ",
      `load ${FilePath("test/dataloaders/data1.txt.js")} → `,
      "[using stale] ",
      `load ${FilePath("test/dataloaders/data1.txt.js")} → `,
      "[stale] "
    ]
  );
});
