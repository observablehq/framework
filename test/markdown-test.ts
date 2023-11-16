import assert from "node:assert";
import {readdirSync, statSync} from "node:fs";
import {mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {basename, join, resolve} from "node:path";
import deepEqual from "fast-deep-equal";
import {isNodeError} from "../src/error.js";
import {type CodeInfo, type ParseResult, parseCodeInfo, parseMarkdown} from "../src/markdown.js";

describe("parseMarkdown(input)", () => {
  const inputRoot = "test/input";
  const outputRoot = "test/output";
  for (const name of readdirSync(inputRoot)) {
    if (!name.endsWith(".md")) continue;
    const path = join(inputRoot, name);
    if (!statSync(path).isFile()) continue;
    const only = name.startsWith("only.");
    const skip = name.startsWith("skip.");
    const outname = only || skip ? name.slice(5) : name;

    (only ? it : skip ? it.skip : it)(`test/input/${name}`, async () => {
      const snapshot = parseMarkdown(await readFile(path, "utf8"), "test/input", name);
      let allequal = true;
      for (const ext of ["html", "json"]) {
        const actual = ext === "json" ? jsonMeta(snapshot) : snapshot[ext];
        const outfile = resolve(outputRoot, `${basename(outname, ".md")}.${ext}`);
        const diffile = resolve(outputRoot, `${basename(outname, ".md")}-changed.${ext}`);
        let expected;

        try {
          expected = await readFile(outfile, "utf8");
        } catch (error) {
          if (isNodeError(error) && error.code === "ENOENT" && process.env.CI !== "true") {
            console.warn(`! generating ${outfile}`);
            await mkdir(outputRoot, {recursive: true});
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
});

function testCodeInfo(input) {
  const info: Partial<CodeInfo> = parseCodeInfo(input);
  if (info.language === undefined) delete info.language;
  if (Object.keys(info.attributes!).length === 0) delete info.attributes;
  if (info.classes!.length === 0) delete info.classes;
  if (info.id === undefined) delete info.id;
  return info;
}

describe("parseCodeInfo(input)", () => {
  it("parses bare language tags", () => {
    assert.deepStrictEqual(testCodeInfo("js"), {language: "js"});
    assert.deepStrictEqual(testCodeInfo("javascript"), {language: "javascript"});
    assert.deepStrictEqual(testCodeInfo("java_script"), {language: "java_script"});
  });
  // TODO FIXME?
  it.skip("parses hyphenated tags", () => {
    assert.deepStrictEqual(testCodeInfo("java-script"), {language: "java-script"});
  });
  it("ignores trailing whitespace", () => {
    assert.deepStrictEqual(testCodeInfo("js "), {language: "js"});
  });
  it("ignores trailing garbage", () => {
    assert.deepStrictEqual(testCodeInfo("js 3839"), {language: "js"});
  });
  it("returns undefined language if leading whitespace", () => {
    assert.deepStrictEqual(testCodeInfo(" js"), {});
  });
  it("parses attributes with no language tag", () => {
    assert.deepStrictEqual(testCodeInfo("{show}"), {attributes: {show: true}});
  });
  it("parses empty attributes", () => {
    assert.deepStrictEqual(testCodeInfo("js{}"), {language: "js"});
    assert.deepStrictEqual(testCodeInfo("{}"), {});
  });
  it("parses attributes with a language tag", () => {
    assert.deepStrictEqual(testCodeInfo("js {show}"), {language: "js", attributes: {show: true}});
  });
  it("does not require separating whitespace from language tag", () => {
    assert.deepStrictEqual(testCodeInfo("js{show}"), {language: "js", attributes: {show: true}});
  });
  it("ignores whitespace around attribute names and values", () => {
    assert.deepStrictEqual(testCodeInfo("{show:true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{ show :true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show: true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show : true}"), {attributes: {show: true}});
  });
  it("ignores whitespace around attributes", () => {
    assert.deepStrictEqual(testCodeInfo(" {show:true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show:true} "), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo(" {show:true} "), {attributes: {show: true}});
  });
  it("treats tabs as whitespace", () => {
    assert.deepStrictEqual(testCodeInfo("{show:true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{\tshow\t:true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show:\ttrue}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show\t:\ttrue}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("\t{show:true}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show:true}\t"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("\t{show:true}\t"), {attributes: {show: true}});
  });
  it("parses boolean attribute values", () => {
    assert.deepStrictEqual(testCodeInfo("{show: false}"), {attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("{show: true}"), {attributes: {show: true}});
  });
  it("parses shorthand boolean attributes as true", () => {
    assert.deepStrictEqual(testCodeInfo("{show}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{a, b, c}"), {attributes: {a: true, b: true, c: true}});
  });
  it("ignores case for boolean attribute values", () => {
    assert.deepStrictEqual(testCodeInfo("{show: FALSE}"), {attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("{show: TRUE}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show: False}"), {attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("{show: True}"), {attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show: fALsE}"), {attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("{show: TrUe}"), {attributes: {show: true}});
  });
  // TODO FIXME
  it.skip("does not consider quoted true and false values as booleans", () => {
    assert.deepStrictEqual(testCodeInfo('{show: "false"}'), {attributes: {show: "false"}});
    assert.deepStrictEqual(testCodeInfo('{show: "true"}'), {attributes: {show: "true"}});
    assert.deepStrictEqual(testCodeInfo("{show: 'false'}"), {attributes: {show: "false"}});
    assert.deepStrictEqual(testCodeInfo("{show: 'true'}"), {attributes: {show: "true"}});
  });
  it("parses number attribute values as strings", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 0}"), {attributes: {show: "0"}});
    assert.deepStrictEqual(testCodeInfo("{show: 1}"), {attributes: {show: "1"}});
    assert.deepStrictEqual(testCodeInfo("{a: 1, b: 2, c: 3}"), {attributes: {a: "1", b: "2", c: "3"}});
  });
  it("parses hyphen-, underscore-, and period-separated unquoted attribute values as strings", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 2020-01-01}"), {attributes: {show: "2020-01-01"}});
    assert.deepStrictEqual(testCodeInfo("{show: 2020_01_02}"), {attributes: {show: "2020_01_02"}});
    assert.deepStrictEqual(testCodeInfo("{show: 2020.01.03}"), {attributes: {show: "2020.01.03"}});
  });
  // TODO FIXME?
  it.skip("parses slash-separated attribute values as strings", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 2020/01/02}"), {attributes: {show: "2020/01/02"}});
  });
  it("unquoted attribute values must be alphanum, dash, underscore, or period", () => {
    assert.deepStrictEqual(testCodeInfo("{show: abc$(}"), {attributes: {show: "abc"}});
  });
  it("parses double-quoted strings", () => {
    assert.deepStrictEqual(testCodeInfo('{show: "hello"}'), {attributes: {show: "hello"}});
    assert.deepStrictEqual(testCodeInfo('{a: "A", b: "B", c: "C"}'), {attributes: {a: "A", b: "B", c: "C"}});
  });
  it("parses double-quoted strings with commas, curly braces, etc.", () => {
    assert.deepStrictEqual(testCodeInfo('{show: "hello, world!"}'), {attributes: {show: "hello, world!"}});
    assert.deepStrictEqual(testCodeInfo('{show: "{foo: bar}"}'), {attributes: {show: "{foo: bar}"}});
    assert.deepStrictEqual(testCodeInfo('{show: "{foo: bar"}'), {attributes: {show: "{foo: bar"}});
    assert.deepStrictEqual(testCodeInfo('{a: "A}", b: "{B", c: "{}"}'), {attributes: {a: "A}", b: "{B", c: "{}"}});
  });
  it("parses single-quoted strings", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 'hello'}"), {attributes: {show: "hello"}});
    assert.deepStrictEqual(testCodeInfo("{a: 'A', b: 'B', c: 'C'}"), {attributes: {a: "A", b: "B", c: "C"}});
  });
  it("parses single-quoted strings with commas, curly braces, etc.", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 'hello, world!'}"), {attributes: {show: "hello, world!"}});
    assert.deepStrictEqual(testCodeInfo("{show: '{foo: bar}'}"), {attributes: {show: "{foo: bar}"}});
    assert.deepStrictEqual(testCodeInfo("{show: '{foo: bar'}"), {attributes: {show: "{foo: bar"}});
    assert.deepStrictEqual(testCodeInfo("{a: 'A}', b: '{B', c: '{}'}"), {attributes: {a: "A}", b: "{B", c: "{}"}});
  });
  it("parses double-quoted strings with single quotes", () => {
    assert.deepStrictEqual(testCodeInfo("{show: \"hello 'world'\"}"), {attributes: {show: "hello 'world'"}});
  });
  it("parses double-quoted strings with escaped double quotes", () => {
    assert.deepStrictEqual(testCodeInfo('{show: "hello \\"world\\""}'), {attributes: {show: 'hello "world"'}});
  });
  it("parses single-quoted strings with double quotes", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 'hello \"world\"'}"), {attributes: {show: 'hello "world"'}});
  });
  it("parses single-quoted strings with escaped single quotes", () => {
    assert.deepStrictEqual(testCodeInfo("{show: 'hello \\'world\\''}"), {attributes: {show: "hello 'world'"}});
  });
  it.skip("parses multiple attributes", () => {
    assert.deepStrictEqual(testCodeInfo("{show: true, run}"), {attributes: {show: true, run: true}});
    assert.deepStrictEqual(testCodeInfo("{show: true, run: false}"), {attributes: {show: true, run: false}});
    assert.deepStrictEqual(testCodeInfo('{show: true, run: "false"}'), {attributes: {show: true, run: false}});
    assert.deepStrictEqual(testCodeInfo("{a: true, b: abc, d: efg}"), {attributes: {a: true, b: "abc", d: "efg"}});
    assert.deepStrictEqual(testCodeInfo("{a:true,b:abc,c:efg}"), {attributes: {a: true, b: "abc", c: "efg"}});
    assert.deepStrictEqual(testCodeInfo("{a:true,b:abc,c:efg}"), {attributes: {a: true, b: "abc", c: "efg"}});
  });
  // TODO FIXME the unterminated string value is converted a boolean
  it.skip("does not require attributes to be terminated", () => {
    assert.deepStrictEqual(testCodeInfo("js {show: true"), {language: "js", attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("js {show: foo"), {language: "js", attributes: {show: "foo"}});
  });
  it("ignores attributes without opening curly brace", () => {
    assert.deepStrictEqual(testCodeInfo("js show}"), {language: "js"});
    assert.deepStrictEqual(testCodeInfo("js show:true}"), {language: "js"});
    assert.deepStrictEqual(testCodeInfo("js show {a: b}"), {language: "js"});
    assert.deepStrictEqual(testCodeInfo("js show:true {a: b}"), {language: "js"});
  });
  it("when attributes have the same name, the last one wins", () => {
    assert.deepStrictEqual(testCodeInfo("js {show: true, show: false}"), {language: "js", attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("js {show, show: false}"), {language: "js", attributes: {show: false}});
  });
  // TODO FIXME shouldn’t b be either a boolean attribute, or part of a’s value?
  it("ignores trailing garbage after unquoted attributes", () => {
    assert.deepStrictEqual(testCodeInfo("{a b}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a b, c}"), {attributes: {a: true, c: true}});
    assert.deepStrictEqual(testCodeInfo("{a: true b}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a: true b, c: one}"), {attributes: {a: true, c: "one"}});
  });
  it("ignores trailing garbage after quoted attributes", () => {
    assert.deepStrictEqual(testCodeInfo("{a: 'true' b}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a: 'true' b, c: one}"), {attributes: {a: true, c: "one"}});
  });
  it("treats attribute names as case-sensitive", () => {
    assert.deepStrictEqual(testCodeInfo("{a: 'a', A: 'A'}"), {attributes: {a: "a", A: "A"}});
    assert.deepStrictEqual(testCodeInfo("{aa: 'aa', aA: 'aA'}"), {attributes: {aa: "aa", aA: "aA"}});
  });
  it("ignores attribute names that don’t start with a-zA-Z", () => {
    assert.deepStrictEqual(testCodeInfo("{1one: true, show: false}"), {attributes: {show: false}});
    assert.deepStrictEqual(testCodeInfo("{$foo}"), {});
    assert.deepStrictEqual(testCodeInfo("{a, $b, c}"), {attributes: {a: true, c: true}});
  });
  it("ignores multiple commas", () => {
    assert.deepStrictEqual(testCodeInfo("{a,,}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a,,b}"), {attributes: {a: true, b: true}});
    assert.deepStrictEqual(testCodeInfo("{,,a}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a, , }"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a, , b}"), {attributes: {a: true, b: true}});
    assert.deepStrictEqual(testCodeInfo("{, , a}"), {attributes: {a: true}});
    assert.deepStrictEqual(testCodeInfo("{a: a,,}"), {attributes: {a: "a"}});
    assert.deepStrictEqual(testCodeInfo("{a: a,,b: b}"), {attributes: {a: "a", b: "b"}});
    assert.deepStrictEqual(testCodeInfo("{,,a: a}"), {attributes: {a: "a"}});
  });
  it("parses class names", () => {
    assert.deepStrictEqual(testCodeInfo("{.class1}"), {classes: ["class1"]});
    assert.deepStrictEqual(testCodeInfo("{.class1, .class2}"), {classes: ["class1", "class2"]});
  });
  it("parses language tag and class names", () => {
    assert.deepStrictEqual(testCodeInfo("js{.class1}"), {language: "js", classes: ["class1"]});
    assert.deepStrictEqual(testCodeInfo("js {.class1}"), {language: "js", classes: ["class1"]});
  });
  it("parses attributes and class names", () => {
    assert.deepStrictEqual(testCodeInfo("{show, .class1}"), {attributes: {show: true}, classes: ["class1"]});
    assert.deepStrictEqual(testCodeInfo(" {show, .class1}"), {attributes: {show: true}, classes: ["class1"]});
  });
  // TODO FIXME allow CSS style syntax?
  it.skip("parses combined classnames", () => {
    assert.deepStrictEqual(testCodeInfo("{.class1.class2}"), {classes: ["class1", "class2"]});
    assert.deepStrictEqual(testCodeInfo("{.class1#id}"), {id: "myid", classes: ["class1"]});
  });
  it("parses ids", () => {
    assert.deepStrictEqual(testCodeInfo("{#myid}"), {id: "myid"});
  });
  it("parses ids and class names", () => {
    assert.deepStrictEqual(testCodeInfo("{#myid, .myclass}"), {id: "myid", classes: ["myclass"]});
    assert.deepStrictEqual(testCodeInfo("{.myclass, #myid}"), {id: "myid", classes: ["myclass"]});
  });
  it("parses ids and attributes", () => {
    assert.deepStrictEqual(testCodeInfo("{#myid, show}"), {id: "myid", attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show, #myid}"), {id: "myid", attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{#myid,show}"), {id: "myid", attributes: {show: true}});
    assert.deepStrictEqual(testCodeInfo("{show,#myid}"), {id: "myid", attributes: {show: true}});
  });
  it("if multiple ids are specified, the last one wins", () => {
    assert.deepStrictEqual(testCodeInfo("{#a, #b}"), {id: "b"});
  });
});

function jsonMeta({html, ...rest}: ParseResult): string {
  return JSON.stringify(rest, null, 2);
}

function jsonEqual(a: string, b: string): boolean {
  return deepEqual(JSON.parse(a), JSON.parse(b));
}
