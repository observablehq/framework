import assert from "node:assert";
import {resolve} from "node:path";
import MarkdownIt from "markdown-it";
import {normalizeConfig as config, mergeToc, readConfig, setCurrentDate} from "../src/config.js";
import {LoaderResolver} from "../src/dataloader.js";

describe("readConfig(undefined, root)", () => {
  before(() => setCurrentDate(new Date("2024-01-10T16:00:00")));
  it("imports the config file at the specified root", async () => {
    const {md, loaders, ...config} = await readConfig(undefined, "test/input/build/config");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.deepStrictEqual(config, {
      root: "test/input/build/config",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      sidebar: true,
      pages: [
        {path: "/index", name: "Index"},
        {path: "/one", name: "One<Two"},
        {name: "Two", path: "/sub/two"},
        {name: "Closed subsection", open: false, pages: [{name: "Closed page", path: "/closed/page"}]}
      ],
      title: undefined,
      toc: {label: "On this page", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      deploy: {
        workspace: "acme",
        project: "bi"
      },
      search: false,
      watchPath: resolve("test/input/build/config/observablehq.config.js")
    });
  });
  it("returns the default config if no config file is found", async () => {
    const {md, loaders, ...config} = await readConfig(undefined, "test/input/build/simple");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.deepStrictEqual(config, {
      root: "test/input/build/simple",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      sidebar: true,
      pages: [{name: "Build test case", path: "/simple"}],
      title: undefined,
      toc: {label: "Contents", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      deploy: null,
      search: false,
      watchPath: undefined
    });
  });
});

describe("normalizeConfig(spec, root)", () => {
  const root = "test/input/build/config";
  it("coerces the title to a string", () => {
    assert.strictEqual(config({title: 42, pages: []}, root).title, "42");
    assert.strictEqual(config({title: null, pages: []}, root).title, "null");
  });
  it("considers the title optional", () => {
    assert.strictEqual(config({pages: []}, root).title, undefined);
    assert.strictEqual(config({title: undefined, pages: []}, root).title, undefined);
  });
  it("populates default pages", () => {
    assert.deepStrictEqual(config({}, root).pages, [
      {name: "One", path: "/one"},
      {name: "H1: Section", path: "/toc-override"},
      {name: "H1: Section", path: "/toc"},
      {name: "A page…", path: "/closed/page"},
      {name: "Two", path: "/sub/two"}
    ]);
  });
  it("coerces pages to an array", () => {
    assert.deepStrictEqual(config({pages: new Set()}, root).pages, []);
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
      {name: "42", path: "/true"},
      {name: "null", path: "/yes"},
      {name: "Index", path: "/foo/index"},
      {name: "Index.html", path: "/foo/index"},
      {name: "Page.html", path: "/foo"}
    ];
    assert.deepStrictEqual(config({pages: inpages}, root).pages, outpages);
  });
  it("allows external page paths", () => {
    const pages = [{name: "Example.com", path: "https://example.com"}];
    assert.deepStrictEqual(config({pages}, root).pages, pages);
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
      {name: "Anchor fragment on index", path: "/test/index#foo=bar"},
      {name: "Anchor fragment on index.html", path: "/test/index#foo=bar"},
      {name: "Anchor fragment on page.html", path: "/test#foo=bar"},
      {name: "Anchor fragment on slash", path: "/test/index#foo=bar"},
      {name: "Anchor fragment", path: "/test#foo=bar"},
      {name: "Query string on index", path: "/test/index?foo=bar"},
      {name: "Query string on index.html", path: "/test/index?foo=bar"},
      {name: "Query string on page.html", path: "/test?foo=bar"},
      {name: "Query string on slash", path: "/test/index?foo=bar"},
      {name: "Query string", path: "/test?foo=bar"}
    ];
    assert.deepStrictEqual(config({pages: inpages}, root).pages, outpages);
  });
  it("coerces sections", () => {
    const inpages = [{name: 42, pages: new Set([{name: null, path: {toString: () => "yes"}}])}];
    const outpages = [{name: "42", open: true, pages: [{name: "null", path: "/yes"}]}];
    assert.deepStrictEqual(config({pages: inpages}, root).pages, outpages);
  });
  it("coerces toc", () => {
    assert.deepStrictEqual(config({pages: [], toc: {}}, root).toc, {label: "Contents", show: true});
    assert.deepStrictEqual(config({pages: [], toc: {label: null}}, root).toc, {label: "null", show: true});
  });
  it("populates default toc", () => {
    assert.deepStrictEqual(config({pages: []}, root).toc, {label: "Contents", show: true});
  });
  it("promotes boolean toc to toc.show", () => {
    assert.deepStrictEqual(config({pages: [], toc: true}, root).toc, {label: "Contents", show: true});
    assert.deepStrictEqual(config({pages: [], toc: false}, root).toc, {label: "Contents", show: false});
  });
  it("coerces pager", () => {
    assert.strictEqual(config({pages: [], pager: 0}, root).pager, false);
    assert.strictEqual(config({pages: [], pager: 1}, root).pager, true);
    assert.strictEqual(config({pages: [], pager: ""}, root).pager, false);
    assert.strictEqual(config({pages: [], pager: "0"}, root).pager, true);
  });
  it("populates default pager", () => {
    assert.strictEqual(config({pages: []}, root).pager, true);
  });
  describe("deploy", () => {
    it("considers deploy optional", () => {
      assert.strictEqual(config({pages: []}, root).deploy, null);
    });
    it("coerces workspace", () => {
      assert.strictEqual(config({pages: [], deploy: {workspace: 538, project: "bi"}}, root).deploy?.workspace, "538");
    });
    it("strips leading @ from workspace", () => {
      assert.strictEqual(config({pages: [], deploy: {workspace: "@acme"}}, root).deploy?.workspace, "acme");
    });
    it("coerces project", () => {
      assert.strictEqual(config({pages: [], deploy: {workspace: "adams", project: 42}}, root).deploy?.project, "42");
    });
  });
});

describe("mergeToc(spec, toc)", () => {
  const root = "test/input/build/config";
  it("merges page- and project-level toc config", async () => {
    const toc = config({pages: [], toc: true}, root).toc;
    assert.deepStrictEqual(mergeToc({show: false}, toc), {label: "Contents", show: false});
    assert.deepStrictEqual(mergeToc({label: "On this page"}, toc), {label: "On this page", show: true});
    assert.deepStrictEqual(mergeToc({label: undefined}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({show: true}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({show: undefined}, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc({}, toc), {label: "Contents", show: true});
  });
});
