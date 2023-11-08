import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import {isNodeError} from "../src/error.js";
import {type ParseResult, parseMarkdown, parseCodeInfo} from "../src/markdown.js";
import deepEqual from "fast-deep-equal";

describe("parseMarkdown(input)", () => {
  for (const name of readdirSync("./test/input")) {
    if (!name.endsWith(".md")) continue;
    const path = join("./test/input", name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;

    (only ? it.only : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const snapshot = parseMarkdown(await readFile(path, "utf8"), "test/input", "/");
      let allequal = true;
      for (const ext of ["html", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot[ext];
        const outfile = resolve("./test/output", `${basename(outname, ".md")}.${ext}`);
        const diffile = resolve("./test/output", `${basename(outname, ".md")}-changed.${ext}`);
        let expected;

        try {
          expected = await readFile(outfile, "utf8");
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
            console.warn(`! generating ${outfile}`);
            await writeFile(outfile, actual, "utf8");
            continue;
          } else {
            throw error;
          }
        }

        const equal = ext === "json" ? jsonEqual(expected, actual) : expected === actual;

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
          allequal = false;
          console.warn(`! generating ${diffile}`);
          await writeFile(diffile, actual, "utf8");
        }
      }
      assert.ok(allequal, `${name} must match snapshot`);
    });
  }
  it("parses fenced code info", () => {
    const attributes = [
      // Base cases
      {info: "js", value: {language: "js", attributes: {}}},
      {info: "javascript", value: {language: "javascript", attributes: {}}},
      {info: "js ", value: {language: "js", attributes: {}}},
      {info: "js 3839", value: {language: "js", attributes: {}}},
      {info: "js {show}", value: {language: "js", attributes: {show: true}}},
      {info: "{show}", value: {language: undefined, attributes: {show: true}}},
      {info: "{show:true}", value: {language: undefined, attributes: {show: true}}},
      {info: "{ show :true}", value: {language: undefined, attributes: {show: true}}},
      {info: "{show: true}", value: {language: undefined, attributes: {show: true}}},
      {info: "{show : true}", value: {language: undefined, attributes: {show: true}}},
      {info: "{show: true, run}", value: {language: undefined, attributes: {show: true, run: true}}},
      {info: "{show: true, run: false}", value: {language: undefined, attributes: {show: true, run: false}}},
      {info: '{show: true, run: "false"}', value: {language: undefined, attributes: {show: true, run: false}}},
      {
        info: "{show: true, run: abc, display: efg}",
        value: {language: undefined, attributes: {show: true, run: "abc", display: "efg"}}
      },
      {
        info: "{show:true,run:abc,display:efg}",
        value: {language: undefined, attributes: {show: true, run: "abc", display: "efg"}}
      },
      {
        info: "{show:true,run:abc,display:efg}",
        value: {language: undefined, attributes: {show: true, run: "abc", display: "efg"}}
      },

      // Error cases
      {info: "js {show:true", value: {language: "js", attributes: {show: true}}},
      {info: "js show:true}", value: {language: "js", attributes: {}}},
      {info: "js {show:true,show:false}", value: {language: "js", attributes: {show: false}}},
      {info: "{show: true run}", value: {language: undefined, attributes: {show: true}}},
      {info: "{1one: true, show: false}", value: {language: undefined, attributes: {show: false}}},
      {info: "{show: abc$(}", value: {language: undefined, attributes: {show: "abc"}}},
      {info: "{show:abc,,display:def ", value: {language: undefined, attributes: {show: "abc", display: "def"}}},

      // Class names
      {info: "js {.class1}", value: {language: "js", attributes: {}, classes: ["class1"]}},
      {info: "js {show:true,.class1}", value: {language: "js", attributes: {show: true}, classes: ["class1"]}},
      {
        info: "js {show:true,.class1,display:abc,.class2}",
        value: {language: "js", attributes: {show: true, display: "abc"}, classes: ["class1", "class2"]}
      },

      // IDs
      {info: "js {#myid}", value: {language: "js", attributes: {}, id: "myid"}},
      {info: "{#myid, show:true}", value: {language: undefined, attributes: {show: true}, id: "myid"}},
      {info: "{#myid: abc, show:true}", value: {language: undefined, attributes: {show: true}, id: undefined}}
    ];
    for (const {info, value} of attributes) {
      assert.deepStrictEqual(parseCodeInfo(info), {classes: [], id: undefined, ...value}, `mismatch for '${info}'`);
    }
  });
});

function jsonMeta({html, ...rest}: ParseResult): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
