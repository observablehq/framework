import assert from "node:assert";
import {existsSync, readdirSync, statSync} from "node:fs";
import {open, readFile, rm} from "node:fs/promises";
import os from "node:os";
import {join, normalize, relative} from "node:path/posix";
import {difference} from "d3-array";
import {FileBuildEffects, build} from "../src/build.js";
import {readConfig, setCurrentDate} from "../src/config.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

const silentEffects = {
  logger: {log() {}, warn() {}, error() {}},
  output: {write() {}}
};

describe("build", () => {
  before(() => setCurrentDate(new Date("2024-01-10T16:00:00")));
  mockJsDelivr();

  // Each sub-directory of test/input/build is a test case.
  const inputRoot = "test/input/build";
  const outputRoot = "test/output/build";
  for (const name of readdirSync(inputRoot)) {
    const path = join(inputRoot, name);
    if (!statSync(path).isDirectory()) continue;
    if (isEmpty(path)) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only
      ? it.only
      : skip ||
        (name.endsWith(".posix") && os.platform() === "win32") ||
        (name.endsWith(".win32") && os.platform() !== "win32")
      ? it.skip
      : it)(`${inputRoot}/${name}`, async () => {
      const actualDir = join(outputRoot, `${outname}-changed`);
      const expectedDir = join(outputRoot, outname);
      const generate = !existsSync(expectedDir) && process.env.CI !== "true";
      const outputDir = generate ? expectedDir : actualDir;
      const addPublic = name.endsWith("-public");

      await rm(actualDir, {recursive: true, force: true});
      if (generate) console.warn(`! generating ${expectedDir}`);
      const config = Object.assign(await readConfig(undefined, path), {output: outputDir});
      await build({config, addPublic}, new TestEffects(outputDir));

      // In the addPublic case, we don’t want to test the contents of the public
      // files because they change often; replace them with empty files so we
      // can at least check that the expected files exist.
      if (addPublic) {
        const publicDir = join(outputDir, "_observablehq");
        for (const file of findFiles(publicDir)) {
          if (file.endsWith(".json")) continue; // e.g., minisearch.json
          await (await open(join(publicDir, file), "w")).close();
        }
      }

      if (generate) return;

      const actualFiles = new Set(findFiles(actualDir));
      const expectedFiles = new Set(findFiles(expectedDir));
      const missingFiles = difference(expectedFiles, actualFiles);
      const unexpectedFiles = difference(actualFiles, expectedFiles);
      if (missingFiles.size > 0) assert.fail(`Missing output files: ${Array.from(missingFiles).join(", ")}`);
      if (unexpectedFiles.size > 0) assert.fail(`Unexpected output files: ${Array.from(unexpectedFiles).join(", ")}`);

      for (const path of expectedFiles) {
        const actual = await readFile(join(actualDir, path), "utf8");
        const expected = await readFile(join(expectedDir, path), "utf8");
        assert.ok(actual === expected, `${path} must match snapshot`);
      }

      await rm(actualDir, {recursive: true, force: true});
    });
  }
});

function* findFiles(root: string): Iterable<string> {
  const visited = new Set<number>();
  const queue: string[] = [(root = normalize(root))];
  for (const path of queue) {
    const status = statSync(path);
    if (status.isDirectory()) {
      if (visited.has(status.ino)) throw new Error(`Circular directory: ${path}`);
      visited.add(status.ino);
      for (const entry of readdirSync(path)) {
        if (entry === ".DS_Store") continue; // macOS
        queue.push(join(path, entry));
      }
    } else {
      yield relative(root, path);
    }
  }
}

class TestEffects extends FileBuildEffects {
  constructor(outputRoot: string) {
    super(outputRoot, silentEffects);
  }
  async writeFile(outputPath: string, contents: string | Buffer): Promise<void> {
    if (typeof contents === "string" && outputPath.endsWith(".html")) {
      contents = contents.replace(/^(\s*<script>\{).*(\}<\/script>)$/gm, "$1/* redacted init script */$2");
    }
    return super.writeFile(outputPath, contents);
  }
}

function isEmpty(path: string): boolean {
  for (const f of readdirSync(path, {recursive: true, withFileTypes: true})) {
    if (f.isDirectory() || f.name === ".DS_Store") continue;
    return false;
  }
  return true;
}
