import assert from "node:assert";
import os from "node:os";
import osPath from "node:path";
import {cross} from "d3-array";
import {type LoadEffects, Loader} from "../src/dataloader.js";
import {maybeStat} from "../src/files.js";
import {readFile, stat, unlink, utimes} from "../src/normalizedFs.js";

const noopEffects: LoadEffects = {
  logger: {log() {}, warn() {}, error() {}},
  output: {write() {}}
};

const EOL = os.platform() === "win32" ? "\r\n" : "\n";

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
  it("a .sh data loader is called with sh", async function () {
    if (process.platform === "win32") this.skip(); // sh loader is not supported on Windows
    const loader = Loader.find("test", "dataloaders/data3.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "shell\n");
  });
  it("a .exe data loader is invoked directly", async function () {
    if (!(await isOnPath("perl"))) this.skip();
    const loader = Loader.find("test", "dataloaders/data4.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "perl\n");
  }).slow();
  it("a .py data loader is called with python3", async () => {
    const loader = Loader.find("test", "dataloaders/data5.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), `python${EOL}`);
  });
  // Skipping because this requires R to be installed (which is slow in CI).
  it("a .R data loader is called with Rscript", async function () {
    if (!(await isOnPath("Rscript"))) this.skip();
    const loader = Loader.find("test", "dataloaders/data6.txt")!;
    const out = await loader.load(noopEffects);
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "Rscript\n");
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
  const loader = Loader.find("test", "dataloaders/data1.txt")!;
  // save the loader times.
  const {atime, mtime} = await stat(loader.path);
  // set the loader mtime to Dec. 1st, 2023.
  const time = new Date("2023-11-01");
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

async function isOnPath(binary: string): Promise<boolean> {
  // based on https://github.com/springernature/hasbin/blob/master/lib/hasbin.js#L55
  const envPath = (process.env["PATH"] ?? "").split(osPath.delimiter);
  const envPathExt = (process.env["PATHEXT"] ?? "").split(osPath.delimiter);
  if (!envPathExt.includes("")) envPathExt.push("");
  const potentialPaths = cross(envPath, envPathExt).map(([path, ext]) => osPath.join(path, binary + ext));
  for (const potential of potentialPaths) {
    const stat = await maybeStat(potential);
    if (stat?.isFile() && stat.mode & 0o111) return true;
  }
  return false;
}
