import assert from "node:assert";
import {readdir, readFile, stat, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {renderPreview} from "../src/render.js";

describe("renderPreview(input)", async () => {
  for (const name of await readdir("./test/input")) {
    if (!name.endsWith(".md")) continue;
    const path = join("./test/input", name);
    if (!(await stat(path)).isFile()) continue;
    it(`test/input/${name}`, async () => {
      const outfile = resolve("./test/output", `${basename(name, ".md")}.html`);
      const diffile = resolve("./test/output", `${basename(name, ".md")}-changed.html`);
      const actual = renderPreview(await readFile(path, "utf8"));
      let expected;

      try {
        expected = await readFile(outfile, "utf8");
      } catch (error) {
        if (error.code === "ENOENT" && process.env.CI !== "true") {
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
            if (error.code !== "ENOENT") {
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
