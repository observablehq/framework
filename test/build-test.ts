import assert from "node:assert";
import {existsSync, readdirSync, statSync} from "node:fs";
import {open, readFile} from "node:fs/promises";
import {join, normalize, relative} from "node:path";
import {difference} from "d3-array";
import type {OutputFileConsumer} from "../src/build.js";
import {RealOutputFileConsumer, build} from "../src/build.js";

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
      const expectedDir = join(outputRoot, outname);
      const addPublic = name.endsWith("-public");

      const generate = !existsSync(expectedDir) && process.env.CI !== "true";
      if (generate) {
        await generateSnapshots({sourceRoot: path, outputDir: expectedDir, addPublic});
        return;
      }
      const output = new TestOutputFileConsumer(addPublic);
      await build({sourceRoot: path, output, verbose: false, addPublic});

      const actualFiles = output.fileNames;
      const expectedFiles = new Set(findFiles(expectedDir));
      const missingFiles = difference(expectedFiles, actualFiles);
      const unexpectedFiles = difference(actualFiles, expectedFiles);
      if (missingFiles.size > 0) assert.fail(`Missing output files: ${Array.from(missingFiles).join(", ")}`);
      if (unexpectedFiles.size > 0) assert.fail(`Unexpected output files: ${Array.from(unexpectedFiles).join(", ")}`);

      for (const path of expectedFiles) {
        const actual = output.files[path];
        const expected = await readFile(join(expectedDir, path));
        assert.ok(actual.compare(expected) === 0, `${path} must match snapshot`);
      }
    });
  }
});

async function generateSnapshots({sourceRoot, outputDir, addPublic}) {
  console.warn(`! generating ${outputDir}`);
  await build({sourceRoot, output: new RealOutputFileConsumer(outputDir), verbose: false, addPublic});

  // In the addPublic case, we don’t want to test the contents of the public
  // files because they change often; replace them with empty files so we
  // can at least check that the expected files exist.
  if (addPublic) {
    const publicDir = join(outputDir, "_observablehq");
    for (const file of findFiles(publicDir)) {
      await (await open(join(publicDir, file), "w")).close();
    }
  }
}

function* findFiles(root: string): Iterable<string> {
  const visited = new Set<number>();
  const queue: string[] = [(root = normalize(root))];
  for (const path of queue) {
    const status = statSync(path);
    if (status.isDirectory()) {
      if (visited.has(status.ino)) throw new Error(`Circular directory: ${path}`);
      visited.add(status.ino);
      for (const entry of readdirSync(path)) {
        if (entry === ".DS_store") continue; // macOS
        queue.push(join(path, entry));
      }
    } else {
      yield relative(root, path);
    }
  }
}

function isPublicPath(path: string): boolean {
  return path.startsWith("_observablehq");
}

class TestOutputFileConsumer implements OutputFileConsumer {
  files: Record<string, Buffer> = {};
  fileNames: Set<string> = new Set();

  constructor(readonly addPublic: boolean) {}

  _addFile(relativePath: string, contents: Buffer) {
    if (isPublicPath(relativePath)) {
      // Public files, if stored, are always blank in tests.
      if (this.addPublic) {
        contents = Buffer.from("");
      } else {
        return;
      }
    }
    this.fileNames.add(relativePath);
    this.files[relativePath] = contents;
  }

  async copyFile(sourcePath: string, relativeOutputPath: string): Promise<void> {
    this._addFile(relativeOutputPath, await readFile(sourcePath));
  }

  async writeFile(relativeOutputPath: string, contents: string | Buffer): Promise<void> {
    this._addFile(relativeOutputPath, Buffer.from(contents));
  }
}
