import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {transpileJavaScript} from "../src/javascript.js";

describe("transpileJavaScript(input)", () => {
  for (const name of readdirSync("./test/input")) {
    if (!name.endsWith(".js")) continue;
    const path = join("./test/input", name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const outfile = resolve("./test/output", `${basename(outname, ".js")}.js`);
      const diffile = resolve("./test/output", `${basename(outname, ".js")}-changed.js`);
      const actual = await transpileJavaScript(await readFile(path, "utf8"), 0);
      let expected;

      try {
        expected = await readFile(outfile, "utf8");
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
          console.warn(`! generating ${outfile}`);
          await writeFile(outfile, actual.js, "utf8");
          return;
        } else {
          throw error;
        }
      }

      const equal = expected === actual.js;

      if (equal) {
        if (process.env.CI !== "true") {
          try {
            await unlink(diffile);
            console.warn(`! deleted ${diffile}`);
          } catch (error) {
            if (!isNodeError(error) || error.code !== "ENOENT") {
              throw error;
            }
          }
        }
      } else {
        console.warn(`! generating ${diffile}`);
        await writeFile(diffile, actual.js, "utf8");
      }

      assert.ok(equal, `${name} must match snapshot`);
    });
  }
});
