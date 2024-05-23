import assert from "node:assert";
import {resolve} from "node:path";
import MarkdownIt from "markdown-it";
import {normalizeConfig as config, mergeToc, readConfig, setCurrentDate} from "../src/config.js";
import {LoaderResolver} from "../src/dataloader.js";

describe("readConfig(undefined, root)", () => {
  before(() => setCurrentDate(new Date("2024-01-10T16:00:00")));
  it("imports the config file at the specified root", async () => {
    const {md, loaders, normalizePath, ...config} = await readConfig(undefined, "test/input/build/config");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.strictEqual(typeof normalizePath, "function");
    assert.deepStrictEqual(config, {
      root: "test/input/build/config",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      sidebar: true,
      pages: [
        {path: "/index", name: "Index", pager: "main"},
        {path: "/one", name: "One<Two", pager: "main"},
        {name: "Two", path: "/sub/two", pager: "main"},
        {
          name: "Closed subsection",
          collapsible: true,
          open: false,
          path: null,
          pager: "main",
          pages: [{name: "Closed page", path: "/closed/page", pager: "main"}]
        }
      ],
      title: undefined,
      toc: {label: "On this page", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      search: false,
      watchPath: resolve("test/input/build/config/observablehq.config.js")
    });
  });
  it("returns the default config if no config file is found", async () => {
    const {md, loaders, normalizePath, ...config} = await readConfig(undefined, "test/input/build/simple");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.strictEqual(typeof normalizePath, "function");
    assert.deepStrictEqual(config, {
      root: "test/input/build/simple",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      sidebar: true,
      pages: [{name: "Build test case", path: "/simple", pager: "main"}],
      title: undefined,
      toc: {label: "Contents", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      search: false,
      watchPath: undefined
    });
  });
  it("overrides the file's output path with a passed one", async () => {
    const config = await readConfig(undefined, "test/input/build/simple", "override");
    assert.equal(config.output, "override");
  });
});

describe("normalizeConfig(spec, root)", () => {
  const defaultRoot = "test/input/build/config";
  it("coerces the title to a string", () => {
    assert.strictEqual(config({title: 42, pages: []}, {defaultRoot}).title, "42");
    assert.strictEqual(config({title: null, pages: []}, {defaultRoot}).title, "null");
  });
  it("considers the title optional", () => {
    assert.strictEqual(config({pages: []}, {defaultRoot}).title, undefined);
    assert.strictEqual(config({title: undefined, pages: []}, {defaultRoot}).title, undefined);
  });
  it("populates default pages", () => {
    assert.deepStrictEqual(config({}, {defaultRoot}).pages, [
      {name: "One", path: "/one", pager: "main"},
      {name: "H1: Section", path: "/toc-override", pager: "main"},
      {name: "H1: Section", path: "/toc", pager: "main"},
      {name: "A page…", path: "/closed/page", pager: "main"},
      {name: "Two", path: "/sub/two", pager: "main"}
    ]);
  });
  it("coerces pages to an array", () => {
    assert.deepStrictEqual(config({pages: new Set()}, {defaultRoot}).pages, []);
  });
  it("coerces and normalizes page paths", () => {
    const inpages = [
      {name: 42, path: true},
      {name: null, path: {toString: () => "yes"}},
      {name: "Index", path: "/foo/index"},
      {name: "Index.html", path: "/foo/index.html"},
      {name: "Page.html", path: "/foo.html"}
    ];
    const outpages = [
      {name: "42", path: "/true", pager: "main"},
      {name: "null", path: "/yes", pager: "main"},
      {name: "Index", path: "/foo/index", pager: "main"},
      {name: "Index.html", path: "/foo/index", pager: "main"},
      {name: "Page.html", path: "/foo", pager: "main"}
    ];
    assert.deepStrictEqual(config({pages: inpages}, {defaultRoot}).pages, outpages);
  });
  it("allows external page paths", () => {
    const pages = [{name: "Example.com", path: "https://example.com", pager: null}];
    assert.deepStrictEqual(config({pages}, {defaultRoot}).pages, pages);
  });
  it("allows page paths to have query strings and anchor fragments", () => {
    const inpages = [
      {name: "Anchor fragment on index", path: "/test/index#foo=bar"},
      {name: "Anchor fragment on index.html", path: "/test/index.html#foo=bar"},
      {name: "Anchor fragment on page.html", path: "/test.html#foo=bar"},
      {name: "Anchor fragment on slash", path: "/test/#foo=bar"},
      {name: "Anchor fragment", path: "/test#foo=bar"},
      {name: "Query string on index", path: "/test/index?foo=bar"},
      {name: "Query string on index.html", path: "/test/index.html?foo=bar"},
      {name: "Query string on page.html", path: "/test.html?foo=bar"},
      {name: "Query string on slash", path: "/test/?foo=bar"},
      {name: "Query string", path: "/test?foo=bar"}
    ];
    const outpages = [
      {name: "Anchor fragment on index", path: "/test/index#foo=bar", pager: "main"},
      {name: "Anchor fragment on index.html", path: "/test/index#foo=bar", pager: "main"},
      {name: "Anchor fragment on page.html", path: "/test#foo=bar", pager: "main"},
      {name: "Anchor fragment on slash", path: "/test/index#foo=bar", pager: "main"},
      {name: "Anchor fragment", path: "/test#foo=bar", pager: "main"},
      {name: "Query string on index", path: "/test/index?foo=bar", pager: "main"},
      {name: "Query string on index.html", path: "/test/index?foo=bar", pager: "main"},
      {name: "Query string on page.html", path: "/test?foo=bar", pager: "main"},
      {name: "Query string on slash", path: "/test/index?foo=bar", pager: "main"},
      {name: "Query string", path: "/test?foo=bar", pager: "main"}
    ];
    assert.deepStrictEqual(config({pages: inpages}, {defaultRoot}).pages, outpages);
  });
  it("coerces sections", () => {
    const inpages = [{name: 42, pages: new Set([{name: null, path: {toString: () => "yes"}}])}];
    const outpages = [
      {
        name: "42",
        collapsible: false,
        open: true,
        path: null,
        pager: "main",
        pages: [{name: "null", path: "/yes", pager: "main"}]
      }
    ];
    assert.deepStrictEqual(config({pages: inpages}, {defaultRoot}).pages, outpages);
  });
  it("coerces toc", () => {
    assert.deepStrictEqual(config({pages: [], toc: {}}, {defaultRoot}).toc, {label: "Contents", show: true});
    assert.deepStrictEqual(config({pages: [], toc: {label: null}}, {defaultRoot}).toc, {label: "null", show: true});
  });
  it("populates default toc", () => {
    assert.deepStrictEqual(config({pages: []}, {defaultRoot}).toc, {label: "Contents", show: true});
  });
  it("promotes boolean toc to toc.show", () => {
    assert.deepStrictEqual(config({pages: [], toc: true}, {defaultRoot}).toc, {label: "Contents", show: true});
    assert.deepStrictEqual(config({pages: [], toc: false}, {defaultRoot}).toc, {label: "Contents", show: false});
  });
  it("coerces pager", () => {
    assert.strictEqual(config({pages: [], pager: 0}, {defaultRoot}).pager, false);
    assert.strictEqual(config({pages: [], pager: 1}, {defaultRoot}).pager, true);
    assert.strictEqual(config({pages: [], pager: ""}, {defaultRoot}).pager, false);
    assert.strictEqual(config({pages: [], pager: "0"}, {defaultRoot}).pager, true);
  });
  it("populates default pager", () => {
    assert.strictEqual(config({pages: []}, {defaultRoot}).pager, true);
  });
});

describe("normalizePath(path) with {cleanUrls: false}", () => {
  const defaultRoot = "test/input";
  const normalize = config({cleanUrls: false}, {defaultRoot}).normalizePath;
  it("appends .html to extension-less links", () => {
    assert.strictEqual(normalize("foo"), "foo.html");
  });
  it("does not append .html to extensioned links", () => {
    assert.strictEqual(normalize("foo.png"), "foo.png");
    assert.strictEqual(normalize("foo.html"), "foo.html");
    assert.strictEqual(normalize("foo.md"), "foo.md");
  });
  it("preserves absolute paths", () => {
    assert.strictEqual(normalize("/foo"), "/foo.html");
    assert.strictEqual(normalize("/foo.html"), "/foo.html");
    assert.strictEqual(normalize("/foo.png"), "/foo.png");
  });
  it("converts index links to directories", () => {
    assert.strictEqual(normalize("foo/index"), "foo/");
    assert.strictEqual(normalize("foo/index.html"), "foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "/");
    assert.strictEqual(normalize("/index.html"), "/");
    assert.strictEqual(normalize("index"), ".");
    assert.strictEqual(normalize("index.html"), ".");
  });
  it("preserves links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
    assert.strictEqual(normalize("../foo/"), "../foo/");
    assert.strictEqual(normalize("../sub/"), "../sub/");
  });
  it("preserves a relative path", () => {
    assert.strictEqual(normalize("foo"), "foo.html");
    assert.strictEqual(normalize("./foo"), "./foo.html");
    assert.strictEqual(normalize("../foo"), "../foo.html");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
  });
});

describe("normalizePath(path) with {cleanUrls: true}", () => {
  const defaultRoot = "test/input";
  const normalize = config({cleanUrls: true}, {defaultRoot}).normalizePath;
  it("does not append .html to extension-less links", () => {
    assert.strictEqual(normalize("foo"), "foo");
  });
  it("does not append .html to extensioned links", () => {
    assert.strictEqual(normalize("foo.png"), "foo.png");
    assert.strictEqual(normalize("foo.md"), "foo.md");
  });
  it("removes .html from extensioned links", () => {
    assert.strictEqual(normalize("foo.html"), "foo");
  });
  it("preserves absolute paths", () => {
    assert.strictEqual(normalize("/foo"), "/foo");
    assert.strictEqual(normalize("/foo.html"), "/foo");
    assert.strictEqual(normalize("/foo.png"), "/foo.png");
  });
  it("converts index links to directories", () => {
    assert.strictEqual(normalize("foo/index"), "foo/");
    assert.strictEqual(normalize("foo/index.html"), "foo/");
    assert.strictEqual(normalize("../index"), "../");
    assert.strictEqual(normalize("../index.html"), "../");
    assert.strictEqual(normalize("./index"), "./");
    assert.strictEqual(normalize("./index.html"), "./");
    assert.strictEqual(normalize("/index"), "/");
    assert.strictEqual(normalize("/index.html"), "/");
    assert.strictEqual(normalize("index"), ".");
    assert.strictEqual(normalize("index.html"), ".");
  });
  it("preserves links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/");
    assert.strictEqual(normalize("./"), "./");
    assert.strictEqual(normalize("../"), "../");
    assert.strictEqual(normalize("foo/"), "foo/");
    assert.strictEqual(normalize("./foo/"), "./foo/");
    assert.strictEqual(normalize("../foo/"), "../foo/");
    assert.strictEqual(normalize("../sub/"), "../sub/");
  });
  it("preserves a relative path", () => {
    assert.strictEqual(normalize("foo"), "foo");
    assert.strictEqual(normalize("./foo"), "./foo");
    assert.strictEqual(normalize("../foo"), "../foo");
    assert.strictEqual(normalize("./foo.png"), "./foo.png");
    assert.strictEqual(normalize("../foo.png"), "../foo.png");
  });
});

describe("mergeToc(spec, toc)", () => {
  const defaultRoot = "test/input/build/config";
  it("merges page- and project-level toc config", async () => {
    const toc = config({pages: [], toc: true}, {defaultRoot}).toc;
    assert.deepStrictEqual(mergeToc({show: false}, toc), {label: "Contents", show: false});
    assert.deepStrictEqual(mergeToc({label: "On this page"}, toc), {label: "On this page", show: true});
    assert.deepStrictEqual(mergeToc({label: undefined}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({show: true}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({show: undefined}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({}, toc), {label: "Contents", show: true});
  });
});
