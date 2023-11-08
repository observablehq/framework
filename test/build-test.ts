import {difference} from "d3-array";
import assert from "node:assert";
import {existsSync, readdirSync, statSync} from "node:fs";
import {readFile, rm} from "node:fs/promises";
import {join, normalize, relative} from "node:path";
import {build} from "../src/build.js";

describe("build", async () => {
  // Each sub-directory of test/input/build is a test case.
  const inputRoot = "test/input/build";
  const outputRoot = "test/output/build";
  for (const name of readdirSync(inputRoot)) {
    const path = join(inputRoot, name);
    if (!statSync(path).isDirectory()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only ? it.only : skip ? it.skip : it)(`${inputRoot}/${name}`, async () => {
      const actualDir = join(outputRoot, `${outname}-changed`);
      const expectedDir = join(outputRoot, outname);
      const generate = !existsSync(expectedDir) && process.env.CI !== "true";

      await rm(actualDir, {recursive: true, force: true});
      if (generate) console.warn(`! generating ${expectedDir}`);
      await build({sourceRoot: path, outputRoot: generate ? expectedDir : actualDir, addPublic: false});
      if (generate) return;

      const actualFiles = new Set(findFiles(actualDir));
      const expectedFiles = new Set(findFiles(expectedDir));
      const missingFiles = difference(actualFiles, expectedFiles);
      const unexpectedFiles = difference(expectedFiles, actualFiles);
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
        queue.push(join(path, entry));
      }
    } else {
      yield relative(root, path);
    }
  }
}
