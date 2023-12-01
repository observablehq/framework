import assert from "node:assert";
import {readFile, stat, unlink, utimes} from "node:fs/promises";
import {type LoadEffects, Loader} from "../src/dataloader.js";

const noopEffects: LoadEffects = {
  logger: {log() {}, warn() {}, error() {}},
  output: {write() {}}
};

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const loader = Loader.find("test", "dataloaders/data1.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "node\n");
  });
  it("a .ts data loader is called with tsx", async () => {
    const loader = Loader.find("test", "dataloaders/data2.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "tsx\n");
  });
  it("a .sh data loader is called with sh", async () => {
    const loader = Loader.find("test", "dataloaders/data3.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "shell\n");
  });
  it("a .exe data loader is invoked directly", async () => {
    const loader = Loader.find("test", "dataloaders/data4.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "python3\n");
  });
  it("a .py data loader is called with python3", async () => {
    const loader = Loader.find("test", "dataloaders/data5.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "python3\n");
  });
  // Skipping because this requires R to be installed (which is slow in CI).
  it.skip("a .R data loader is called with Rscript", async () => {
    const loader = Loader.find("test", "dataloaders/data6.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "Rscript\n");
  });
});

describe("data loaders optionally use a stale cache", () => {
  it("a dataloader can use ", async () => {
    const out = [] as string[];
    const outputEffects: LoadEffects = {
      logger: {log() {}, warn() {}, error() {}},
      output: {
        write(a) {
          out.push(a);
        }
      }
    };
    const loader = Loader.find("test", "dataloaders/data1.txt")!;
    // save the loader times.
    const {atime, mtime} = await stat(loader.path);
    // set the loader mtime to Dec. 1st, 2023.
    const time = Date.UTC(2023, 11, 1) / 1000;
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
    await utimes(loader.path, atime, Date.now() + 100);
    // run it with useStale=true (using stale)
    const loader2 = Loader.find("test", "dataloaders/data1.txt", {useStale: true})!;
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
