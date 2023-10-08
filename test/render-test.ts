import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {renderPreview} from "../src/render.js";

describe("renderPreview(input)", () => {
  for (const name of readdirSync("./test/input")) {
    if (!name.endsWith(".md")) continue;
    const path = join("./test/input", name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const outfile = resolve("./test/output", `${basename(outname, ".md")}.html`);
      const diffile = resolve("./test/output", `${basename(outname, ".md")}-changed.html`);
      const actual = renderPreview(await readFile(path, "utf8")).html;
      let expected;

      try {
        expected = await readFile(outfile, "utf8");
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
          console.warn(`! generating ${outfile}`);
          await writeFile(outfile, actual, "utf8");
          return;
        } else {
          throw error;
        }
      }

      const equal = expected === actual;

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
        await writeFile(diffile, actual, "utf8");
      }

      assert.ok(equal, `${name} must match snapshot`);
    });
  }
});
