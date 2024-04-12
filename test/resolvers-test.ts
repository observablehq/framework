import assert from "node:assert";
import type {Config} from "../src/config.js";
import {normalizeConfig} from "../src/config.js";
import {parseMarkdown} from "../src/markdown.js";
import {getResolvers} from "../src/resolvers.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

function getOptions({root, path}: {root: string; path: string}): Config & {path: string} {
  return {...normalizeConfig({root}), path};
}

describe("getResolvers(page, {root, path})", () => {
  mockJsDelivr();
  const builtins = ["npm:@observablehq/runtime", "npm:@observablehq/stdlib", "observablehq:client"];
  it("resolves directly-attached files", async () => {
    const options = getOptions({root: "test/input", path: "attached.md"});
    const page = parseMarkdown("${FileAttachment('foo.csv')}", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.files, new Set(["./foo.csv"]));
  });
  it("ignores files that are outside of the source root", async () => {
    const options = getOptions({root: "test/input", path: "attached.md"});
    const page = parseMarkdown("${FileAttachment('../foo.csv')}", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.files, new Set([]));
  });
  it("detects file methods", async () => {
    const options = getOptions({root: "test/input", path: "attached.md"});
    const page = parseMarkdown("${FileAttachment('foo.csv').csv}", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(["npm:d3-dsv", ...builtins]));
  });
  it("detects local static imports", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport './bar.js';\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(["./bar.js", ...builtins]));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./bar.js"]));
  });
  it("detects local transitive static imports", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport './other/foo.js';\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(["./other/foo.js", "./bar.js", ...builtins]));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./other/foo.js", "./bar.js"]));
  });
  it("detects local transitive static imports (2)", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport './transitive-static-import.js';\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(["./transitive-static-import.js", "./other/foo.js", "./bar.js", ...builtins])); // prettier-ignore
    assert.deepStrictEqual(resolvers.localImports, new Set(["./transitive-static-import.js", "./other/foo.js", "./bar.js"])); // prettier-ignore
  });
  it("detects local transitive dynamic imports", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport './dynamic-import.js';\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(["./dynamic-import.js", ...builtins]));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./dynamic-import.js", "./bar.js"]));
  });
  it("detects local transitive dynamic imports (2)", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport('./dynamic-import.js');\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(builtins));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./dynamic-import.js", "./bar.js"]));
  });
  it("detects local transitive dynamic imports (3)", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport('./transitive-dynamic-import.js');\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(builtins));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./transitive-dynamic-import.js", "./other/foo.js", "./bar.js"])); // prettier-ignore
  });
  it("detects local transitive dynamic imports (4)", async () => {
    const options = getOptions({root: "test/input/imports", path: "attached.md"});
    const page = parseMarkdown("```js\nimport('./transitive-static-import.js');\n```", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(builtins));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./transitive-static-import.js", "./other/foo.js", "./bar.js"])); // prettier-ignore
  });
  it("detects local dynamic imports", async () => {
    const options = getOptions({root: "test/input", path: "attached.md"});
    const page = parseMarkdown("${import('./foo.js')}", options);
    const resolvers = await getResolvers(page, options);
    assert.deepStrictEqual(resolvers.staticImports, new Set(builtins));
    assert.deepStrictEqual(resolvers.localImports, new Set(["./foo.js"]));
  });
});
