import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, normalize, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {transpileJavaScript} from "../src/javascript.js";
import {renderDefineCell} from "../src/render.js";

function isValidJsFile(inputRoot: string, fileName: string) {
  if (!fileName.endsWith(".js")) return false;
  const path = join(inputRoot, fileName);
  return statSync(path).isFile();
}

describe("transpileJavaScript(input)", () => {
  const transpileJavascriptInputsPath = "./test/input";
  for (const name of readdirSync(transpileJavascriptInputsPath)) {
    if (!isValidJsFile(transpileJavascriptInputsPath, name)) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    const path = join("./test/input", name);
    (only ? it.only : skip ? it.skip : it)(path, async () => {
      const outfile = resolve("./test/output", `${basename(outname, ".js")}.js`);
      const diffile = resolve("./test/output", `${basename(outname, ".js")}-changed.js`);
      const actual = renderDefineCell(
        await transpileJavaScript(await readFile(path, "utf8"), {id: "0", root: "test/input", sourcePath: "/"})
      );
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

describe("imports", () => {
  const importsInputsPath = "./test/input/imports";
  for (const name of readdirSync(importsInputsPath)) {
    if (!isValidJsFile(importsInputsPath, name) || !name.includes("import")) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;
    const path = join(importsInputsPath, name);
    (only ? it.only : skip ? it.skip : it)(path, async () => {
      const outfile = resolve("./test/output/imports", `${basename(outname, ".js")}.js`);
      const actual = renderDefineCell(
        await transpileJavaScript(await readFile(path, "utf8"), {
          id: "0",
          root: normalize(importsInputsPath),
          sourcePath: "/"
        })
      );

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
      assert.ok(equal, `${name} must match snapshot`);
    });
  }
});
