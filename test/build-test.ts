import {readdirSync, rmSync, statSync} from "fs";
import {build} from "../src/build.js";
import {join, resolve} from "path";
import {isNodeError} from "../src/error.js";
import assert from "assert";
import {readFile, unlink, writeFile} from "fs/promises";
import {prepareOutput} from "../src/files.js";

describe("build - verify build command output", async () => {
  // Each sub-directory of test/input/build is a test case.
  for (const name of readdirSync("./test/input/build")) {
    const path = join("./test/input/build", name);
    if (!statSync(path).isDirectory()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only ? it.only : skip ? it.skip : it)(`test/input/build/${name}`, async () => {
      const actualDir = resolve("./test/output/build-actual", `${outname}`);
      const expectedDir = resolve("./test/output/build", `${outname}`);
      rmSync(actualDir, {recursive: true, force: true});

      await build({sourceRoot: path, outputRoot: actualDir, addPublic: false});

      const expectedDirs: string[] = [];
      expectedDirs.push(expectedDir);
      while (expectedDirs.length > 0) {
        const expectedDir = expectedDirs.pop()!;
        for (const expectedFile of readdirSync(expectedDir)) {
          const expectedPath = join(expectedDir, expectedFile);
          if (statSync(expectedPath).isDirectory()) {
            expectedDirs.push(expectedPath);
            continue;
          }
          const actualPath = expectedPath.replace("/build/", "/build-actual/");
          let actual;
          try {
            actual = await readFile(actualPath, "utf8");
          } catch (error) {
            if (isNodeError(error) && error.code === "ENOENT") {
              assert.fail(`Missing output file ${actualPath}`);
            }
          }
          let expected;
          try {
            expected = await readFile(expectedPath, "utf8");
          } catch (error) {
            if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
              console.warn(`! generating ${expectedPath}`);
              prepareOutput(expectedPath);
              await writeFile(expectedPath, actual, "utf8");
              continue;
            } else {
              throw error;
            }
          }

          const equal = expected === actual;

          const diffPath = expectedPath.replace("/build/", "/build-changed/");
          if (equal) {
            unlink(actualPath);
            if (process.env.CI !== "true") {
              try {
                await unlink(diffPath);
                console.warn(`! deleted ${diffPath}`);
              } catch (error) {
                if (!isNodeError(error) || error.code !== "ENOENT") {
                  throw error;
                }
              }
            }
          } else {
            console.warn(`! generating ${diffPath}`);
            prepareOutput(diffPath);
            await writeFile(diffPath, actual, "utf8");
          }

          assert.ok(equal, `${name} must match snapshot`);
        }
      }
      const actualDirs: string[] = [actualDir];
      while (actualDirs.length > 0) {
        const dir = actualDirs.pop()!;
        for (const unexpectedFile of readdirSync(dir)) {
          if (statSync(join(dir, unexpectedFile)).isDirectory()) {
            actualDirs.push(join(dir, unexpectedFile));
            continue;
          }
          assert.fail(`Unexpected file ${unexpectedFile} in ${dir}`);
        }
      }
    });
  }
});
