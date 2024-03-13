import assert from "node:assert";
import {readFile, stat, unlink, utimes} from "node:fs/promises";
import os from "node:os";
import type {LoadEffects} from "../src/dataloader.js";
import {LoaderResolver} from "../src/dataloader.js";

const noopEffects: LoadEffects = {
  logger: {log() {}, warn() {}, error() {}},
  output: {write() {}}
};

describe("LoaderResolver.find(path)", () => {
  const loaders = new LoaderResolver({root: "test"});
  it("a .js data loader is called with node", async () => {
    const loader = loaders.find("dataloaders/data1.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "node\n");
  });
  it("a .ts data loader is called with tsx", async () => {
    const loader = loaders.find("dataloaders/data2.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "tsx\n");
  });
  it("a .sh data loader is called with sh", async function () {
    if (os.platform() === "win32") this.skip();
    const loader = loaders.find("dataloaders/data3.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "shell\n");
  });
  it("a .exe data loader is invoked directly", async () => {
    const loader = loaders.find("dataloaders/data4.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), `python3${os.EOL}`);
  });
  it("a .py data loader is called with python3", async () => {
    const loader = loaders.find("dataloaders/data5.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), `python3${os.EOL}`);
  });
  // Skipping because this requires R to be installed (which is slow in CI).
  it.skip("a .R data loader is called with Rscript", async () => {
    const loader = loaders.find("dataloaders/data6.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "Rscript\n");
  });
});

describe("LoaderResolver.find(path, {useStale: true})", () => {
  const loaders = new LoaderResolver({root: "test"});
  it("data loaders optionally use a stale cache", async () => {
    const out = [] as string[];
    const outputEffects: LoadEffects = {
      logger: {log() {}, warn() {}, error() {}},
      output: {
        write(a) {
          out.push(a);
        }
      }
    };
    const loader = loaders.find("dataloaders/data1.txt")!;
    // save the loader times.
    const {atime, mtime} = await stat(loader.path);
    // set the loader mtime to Dec. 1st, 2023.
    const time = new Date(2023, 11, 1);
    await utimes(loader.path, atime, time);
    // remove the cache set by another test (unless we it.only this test).
    try {
      await unlink("test/.observablehq/cache/dataloaders/data1.txt");
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
    const loader2 = loaders.find("dataloaders/data1.txt", {useStale: true})!;
    await loader2.load(outputEffects);
    // run it with useStale=false (stale)
    await loader.load(outputEffects);
    // revert the loader to its original mtime
    await utimes(loader.path, atime, mtime);
    assert.deepStrictEqual(
      // eslint-disable-next-line no-control-regex
      out.map((l) => l.replaceAll(/\x1b\[[0-9]+m/g, "")),
      [
        "load test/dataloaders/data1.txt.js → ",
        "[missing] ",
        "load test/dataloaders/data1.txt.js → ",
        "[fresh] ",
        "load test/dataloaders/data1.txt.js → ",
        "[using stale] ",
        "load test/dataloaders/data1.txt.js → ",
        "[stale] "
      ]
    );
  });
});

describe("LoaderResolver.getFileHash(path)", () => {
  it("returns the content hash for the specified file’s data loader", async () => {
    const loaders = new LoaderResolver({root: "test/input/build/archives.posix"});
    assert.strictEqual(loaders.getFileHash("dynamic.zip.sh"), "516cec2431ce8f1181a7a2a161db8bdfcaea132d3b2c37f863ea6f05d64d1d10"); // prettier-ignore
    assert.strictEqual(loaders.getFileHash("dynamic.zip"), "516cec2431ce8f1181a7a2a161db8bdfcaea132d3b2c37f863ea6f05d64d1d10"); // prettier-ignore
    assert.strictEqual(loaders.getFileHash("dynamic/file.txt"), "516cec2431ce8f1181a7a2a161db8bdfcaea132d3b2c37f863ea6f05d64d1d10"); // prettier-ignore
    assert.strictEqual(loaders.getFileHash("static.zip"), "e6afff224da77b900cfe3ab8789f2283883300e1497548c30af66dfe4c29b429"); // prettier-ignore
    assert.strictEqual(loaders.getFileHash("static/file.txt"), "e6afff224da77b900cfe3ab8789f2283883300e1497548c30af66dfe4c29b429"); // prettier-ignore
  });
  it("returns the empty hash if the specified file does not exist", async () => {
    const loaders = new LoaderResolver({root: "test/input/build/files"});
    assert.strictEqual(loaders.getFileHash("does-not-exist.csv"), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"); // prettier-ignore
  });
});
