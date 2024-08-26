import assert from "node:assert";
import {mkdir, readFile, rm, stat, unlink, utimes, writeFile} from "node:fs/promises";
import os from "node:os";
import {join} from "node:path/posix";
import type {LoadEffects} from "../src/loader.js";
import {LoaderResolver} from "../src/loader.js";

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
    const loaderPath = join(loader.root, loader.path);
    // save the loader times.
    const {atime, mtime} = await stat(loaderPath);
    // set the loader mtime to Dec. 1st, 2023.
    const time = new Date(2023, 11, 1);
    await utimes(loaderPath, atime, time);
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
    await utimes(loaderPath, atime, new Date(Date.now() + 100));
    // run it with useStale=true (using stale)
    const loader2 = loaders.find("dataloaders/data1.txt", {useStale: true})!;
    await loader2.load(outputEffects);
    // run it with useStale=false (stale)
    await loader.load(outputEffects);
    // revert the loader to its original mtime
    await utimes(loaderPath, atime, mtime);
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

describe("LoaderResolver.getSourceFileHash(path)", () => {
  const time = new Date(Date.UTC(2023, 11, 1));
  it("returns the content hash for the specified file’s data loader", async () => {
    await utimes("test/input/build/archives.posix/dynamic.zip.sh", time, time);
    await utimes("test/input/build/archives.posix/static.zip", time, time);
    const loaders = new LoaderResolver({root: "test/input/build/archives.posix"});
    assert.strictEqual(loaders.getSourceFileHash("dynamic.zip.sh"), "516cec2431ce8f1181a7a2a161db8bdfcaea132d3b2c37f863ea6f05d64d1d10"); // prettier-ignore
    assert.strictEqual(loaders.getSourceFileHash("dynamic.zip"), "64acd011e27907a2594fda3272bfc951e75db4c80495ce41e84ced61383bbb60"); // prettier-ignore
    assert.strictEqual(loaders.getSourceFileHash("dynamic/file.txt"), "64acd011e27907a2594fda3272bfc951e75db4c80495ce41e84ced61383bbb60"); // prettier-ignore
    assert.strictEqual(loaders.getSourceFileHash("static.zip"), "e6afff224da77b900cfe3ab8789f2283883300e1497548c30af66dfe4c29b429"); // prettier-ignore
    assert.strictEqual(loaders.getSourceFileHash("static/file.txt"), "76ac155a1184b392ed40fb79eff680d5bf57e8afd9a494b1066f26dfd1e4c5e6"); // prettier-ignore
  });
  it("returns the empty hash if the specified file does not exist", async () => {
    const loaders = new LoaderResolver({root: "test/input/build/files"});
    assert.strictEqual(loaders.getSourceFileHash("does-not-exist.csv"), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"); // prettier-ignore
  });
});

describe("LoaderResolver.get{Source,Output}LastModified(path)", () => {
  const time1 = new Date(Date.UTC(2023, 11, 1));
  const time2 = new Date(Date.UTC(2024, 2, 1));
  const loaders = new LoaderResolver({root: "test"});
  it("both return the last modification time for a simple file", async () => {
    await utimes("test/input/loader/simple.txt", time1, time1);
    assert.strictEqual(loaders.getSourceLastModified("input/loader/simple.txt"), +time1);
    assert.strictEqual(loaders.getOutputLastModified("input/loader/simple.txt"), +time1);
  });
  it("both return an undefined last modification time for a missing file", async () => {
    assert.strictEqual(loaders.getSourceLastModified("input/loader/missing.txt"), undefined);
    assert.strictEqual(loaders.getOutputLastModified("input/loader/missing.txt"), undefined);
  });
  it("returns the last modification time of the loader in preview, and of the cache, on build", async () => {
    await utimes("test/input/loader/cached.txt.sh", time1, time1);
    await mkdir("test/.observablehq/cache/input/loader/", {recursive: true});
    await writeFile("test/.observablehq/cache/input/loader/cached.txt", "2024-03-01 00:00:00");
    await utimes("test/.observablehq/cache/input/loader/cached.txt", time2, time2);
    assert.strictEqual(loaders.getSourceLastModified("input/loader/cached.txt"), +time1);
    assert.strictEqual(loaders.getOutputLastModified("input/loader/cached.txt"), +time2);
    // clean up
    try {
      await unlink("test/.observablehq/cache/input/loader/cached.txt");
      await rm("test/.observablehq/cache/input/loader", {recursive: true});
    } catch {
      // ignore;
    }
  });
  it("returns the last modification time of the data loader in preview, and null in build, when there is no cache", async () => {
    await utimes("test/input/loader/not-cached.txt.sh", time1, time1);
    assert.strictEqual(loaders.getSourceLastModified("input/loader/not-cached.txt"), +time1);
    assert.strictEqual(loaders.getOutputLastModified("input/loader/not-cached.txt"), undefined);
  });
});
