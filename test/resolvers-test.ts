import assert from "node:assert";
import type {Config, ConfigSpec} from "../src/config.js";
import {normalizeConfig} from "../src/config.js";
import {parseMarkdown} from "../src/markdown.js";
import {getResolvers} from "../src/resolvers.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

function getOptions({path, ...config}: ConfigSpec & {path: string}): Config & {path: string} {
  return {...normalizeConfig(config), path};
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

describe("resolveLink(href) with {cleanUrls: false}", () => {
  const options = getOptions({root: "test/input", path: "sub/index.html", cleanUrls: false});
  const page = parseMarkdown("", options);
  async function getResolveLink() {
    const resolvers = await getResolvers(page, options);
    return resolvers.resolveLink;
  }
  it("appends .html to extension-less links", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo"), "./foo.html");
  });
  it("does not append .html to extensioned links", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png"), "./foo.png");
    assert.strictEqual(normalize("foo.html"), "./foo.html");
    assert.strictEqual(normalize("foo.md"), "./foo.md");
  });
  it("converts absolute paths to relative paths", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("/foo"), "../foo.html");
    assert.strictEqual(normalize("/foo.html"), "../foo.html");
    assert.strictEqual(normalize("/foo.png"), "../foo.png");
  });
  it("converts index links to directories", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo/index"), "./foo/");
    assert.strictEqual(normalize("foo/index.html"), "./foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "../");
    assert.strictEqual(normalize("/index.html"), "../");
    assert.strictEqual(normalize("index"), "./");
    assert.strictEqual(normalize("index.html"), "./");
  });
  it("preserves links to directories", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize(""), "./");
    assert.strictEqual(normalize("/"), "../");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "./foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
    assert.strictEqual(normalize("../foo/"), "../foo/");
    assert.strictEqual(normalize("../sub/"), "./");
  });
  it("preserves a relative path", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo"), "./foo.html");
    assert.strictEqual(normalize("./foo"), "./foo.html");
    assert.strictEqual(normalize("../foo"), "../foo.html");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
  });
  it("preserves the query", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png?bar"), "./foo.png?bar");
    assert.strictEqual(normalize("foo.html?bar"), "./foo.html?bar");
    assert.strictEqual(normalize("foo?bar"), "./foo.html?bar");
  });
  it("preserves the hash", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png#bar"), "./foo.png#bar");
    assert.strictEqual(normalize("foo.html#bar"), "./foo.html#bar");
    assert.strictEqual(normalize("foo#bar"), "./foo.html#bar");
  });
  it("preserves the query and hash", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png?bar#baz"), "./foo.png?bar#baz");
    assert.strictEqual(normalize("foo.html?bar#baz"), "./foo.html?bar#baz");
    assert.strictEqual(normalize("foo?bar#baz"), "./foo.html?bar#baz");
  });
});

describe("resolveLink(href) with {cleanUrls: true}", () => {
  const options = getOptions({root: "test/input", path: "sub/index.html", cleanUrls: true});
  const page = parseMarkdown("", options);
  async function getResolveLink() {
    const resolvers = await getResolvers(page, options);
    return resolvers.resolveLink;
  }
  it("does not append .html to extension-less links", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo"), "./foo");
  });
  it("does not append .html to extensioned links", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png"), "./foo.png");
    assert.strictEqual(normalize("foo.md"), "./foo.md");
  });
  it("removes .html from extensioned links", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.html"), "./foo");
  });
  it("converts absolute paths to relative paths", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("/foo"), "../foo");
    assert.strictEqual(normalize("/foo.html"), "../foo");
    assert.strictEqual(normalize("/foo.png"), "../foo.png");
  });
  it("converts index links to directories", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo/index"), "./foo/");
    assert.strictEqual(normalize("foo/index.html"), "./foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "../");
    assert.strictEqual(normalize("/index.html"), "../");
    assert.strictEqual(normalize("index"), "./");
    assert.strictEqual(normalize("index.html"), "./");
  });
  it("preserves links to directories", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize(""), "./");
    assert.strictEqual(normalize("/"), "../");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "./foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
    assert.strictEqual(normalize("../foo/"), "../foo/");
    assert.strictEqual(normalize("../sub/"), "./");
  });
  it("preserves a relative path", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo"), "./foo");
    assert.strictEqual(normalize("./foo"), "./foo");
    assert.strictEqual(normalize("../foo"), "../foo");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
  });
  it("preserves the query", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png?bar"), "./foo.png?bar");
    assert.strictEqual(normalize("foo.html?bar"), "./foo?bar");
    assert.strictEqual(normalize("foo?bar"), "./foo?bar");
  });
  it("preserves the hash", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png#bar"), "./foo.png#bar");
    assert.strictEqual(normalize("foo.html#bar"), "./foo#bar");
    assert.strictEqual(normalize("foo#bar"), "./foo#bar");
  });
  it("preserves the query and hash", async () => {
    const normalize = await getResolveLink();
    assert.strictEqual(normalize("foo.png?bar#baz"), "./foo.png?bar#baz");
    assert.strictEqual(normalize("foo.html?bar#baz"), "./foo?bar#baz");
    assert.strictEqual(normalize("foo?bar#baz"), "./foo?bar#baz");
  });
});
