import assert from "node:assert";
import {normalizeConfig as config, mergeToc, readConfig, setCurrentDate} from "../src/config.js";

const root = "test/input/build/config";

describe("readConfig(undefined, root)", () => {
  before(() => setCurrentDate(new Date("2024-01-11T01:02:03")));
  it("imports the config file at the specified root", async () => {
    assert.deepStrictEqual(await readConfig(undefined, "test/input/build/config"), {
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
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-11T01:02:03">Jan 11, 2024</a>.',
      deploy: {
        workspace: "acme",
        project: "bi"
      },
      search: false,
      markdownIt: undefined
    });
  });
  it("returns the default config if no config file is found", async () => {
    assert.deepStrictEqual(await readConfig(undefined, "test/input/build/simple"), {
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
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-11T01:02:03">Jan 11, 2024</a>.',
      deploy: null,
      search: false,
      markdownIt: undefined
    });
  });
});

describe("normalizeConfig(spec, root)", () => {
  it("coerces the title to a string", async () => {
    assert.strictEqual((await config({title: 42, pages: []}, root)).title, "42");
    assert.strictEqual((await config({title: null, pages: []}, root)).title, "null");
  });
  it("considers the title optional", async () => {
    assert.strictEqual((await config({pages: []}, root)).title, undefined);
    assert.strictEqual((await config({title: undefined, pages: []}, root)).title, undefined);
  });
  it("populates default pages", async () => {
    assert.deepStrictEqual((await config({}, root)).pages, [
      {name: "One", path: "/one"},
      {name: "H1: Section", path: "/toc-override"},
      {name: "H1: Section", path: "/toc"},
      {name: "A page…", path: "/closed/page"},
      {name: "Two", path: "/sub/two"}
    ]);
  });
  it("coerces pages to an array", async () => {
    assert.deepStrictEqual((await config({pages: new Set()}, root)).pages, []);
  });
  it("coerces pages", async () => {
    const inpages = [
      {name: 42, path: true},
      {name: null, path: {toString: () => "yes"}}
    ];
    const outpages = [
      {name: "42", path: "true"},
      {name: "null", path: "yes"}
    ];
    assert.deepStrictEqual((await config({pages: inpages}, root)).pages, outpages);
  });
  it("coerces sections", async () => {
    const inpages = [{name: 42, pages: new Set([{name: null, path: {toString: () => "yes"}}])}];
    const outpages = [{name: "42", open: true, pages: [{name: "null", path: "yes"}]}];
    assert.deepStrictEqual((await config({pages: inpages}, root)).pages, outpages);
  });
  it("coerces toc", async () => {
    assert.deepStrictEqual((await config({pages: [], toc: {}}, root)).toc, {label: "Contents", show: true});
    assert.deepStrictEqual((await config({pages: [], toc: {label: null}}, root)).toc, {label: "null", show: true});
  });
  it("populates default toc", async () => {
    assert.deepStrictEqual((await config({pages: []}, root)).toc, {label: "Contents", show: true});
  });
  it("promotes boolean toc to toc.show", async () => {
    assert.deepStrictEqual((await config({pages: [], toc: true}, root)).toc, {label: "Contents", show: true});
    assert.deepStrictEqual((await config({pages: [], toc: false}, root)).toc, {label: "Contents", show: false});
  });
  it("coerces pager", async () => {
    assert.strictEqual((await config({pages: [], pager: 0}, root)).pager, false);
    assert.strictEqual((await config({pages: [], pager: 1}, root)).pager, true);
    assert.strictEqual((await config({pages: [], pager: ""}, root)).pager, false);
    assert.strictEqual((await config({pages: [], pager: "0"}, root)).pager, true);
  });
  it("populates default pager", async () => {
    assert.strictEqual((await config({pages: []}, root)).pager, true);
  });
  describe("deploy", () => {
    it("considers deploy optional", async () => {
      assert.strictEqual((await config({pages: []}, root)).deploy, null);
    });
    it("coerces workspace", async () => {
      assert.strictEqual(
        (await config({pages: [], deploy: {workspace: 538, project: "bi"}}, root)).deploy?.workspace,
        "538"
      );
    });
    it("strips leading @ from workspace", async () => {
      assert.strictEqual((await config({pages: [], deploy: {workspace: "@acme"}}, root)).deploy?.workspace, "acme");
    });
    it("coerces project", async () => {
      assert.strictEqual(
        (await config({pages: [], deploy: {workspace: "adams", project: 42}}, root)).deploy?.project,
        "42"
      );
    });
  });
});

describe("mergeToc(spec, toc)", () => {
  it("merges page- and project-level toc config", async () => {
    const toc = (await config({pages: [], toc: true}, root)).toc;
    assert.deepStrictEqual(mergeToc({show: false}, toc), {label: "Contents", show: false});
    assert.deepStrictEqual(mergeToc({label: "On this page"}, toc), {label: "On this page", show: true});
    assert.deepStrictEqual(mergeToc(false, toc), {label: "Contents", show: false});
    assert.deepStrictEqual(mergeToc(true, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc(undefined, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc(null, toc), {label: "Contents", show: true});
    assert.deepStrictEqual(mergeToc(0, toc), {label: "Contents", show: false});
    assert.deepStrictEqual(mergeToc(1, toc), {label: "Contents", show: true});
  });
});
