import assert from "node:assert";
import {resolve} from "node:path";
import MarkdownIt from "markdown-it";
import {normalizeConfig as config, mergeToc, readConfig, setCurrentDate} from "../src/config.js";
import {LoaderResolver} from "../src/loader.js";

const DUCKDB_DEFAULTS = {
  bundles: ["eh", "mvp"],
  extensions: {
    json: {
      source: "https://extensions.duckdb.org/",
      install: true,
      load: false
    },
    parquet: {
      source: "https://extensions.duckdb.org/",
      install: true,
      load: false
    }
  }
};

describe("readConfig(undefined, root)", () => {
  before(() => setCurrentDate(new Date("2024-01-10T16:00:00")));
  it("imports the config file at the specified root", async () => {
    const {md, loaders, paths, normalizePath, ...config} = await readConfig(undefined, "test/input/build/config");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.strictEqual(typeof normalizePath, "function");
    assert.deepStrictEqual(config, {
      root: "test/input/build/config",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      globalStylesheets: [
        "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap"
      ],
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
      home: "Home",
      toc: {label: "On this page", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      search: null,
      watchPath: resolve("test/input/build/config/observablehq.config.js"),
      duckdb: DUCKDB_DEFAULTS
    });
  });
  it("returns the default config if no config file is found", async () => {
    const {md, loaders, paths, normalizePath, ...config} = await readConfig(undefined, "test/input/build/simple");
    assert(md instanceof MarkdownIt);
    assert(loaders instanceof LoaderResolver);
    assert.strictEqual(typeof normalizePath, "function");
    assert.deepStrictEqual(config, {
      root: "test/input/build/simple",
      output: "dist",
      base: "/",
      style: {theme: ["air", "near-midnight"]},
      globalStylesheets: [
        "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap"
      ],
      sidebar: true,
      pages: [{name: "Build test case", path: "/simple", pager: "main"}],
      title: undefined,
      home: "Home",
      toc: {label: "Contents", show: true},
      pager: true,
      scripts: [],
      head: "",
      header: "",
      footer:
        'Built with <a href="https://observablehq.com/" target="_blank">Observable</a> on <a title="2024-01-10T16:00:00">Jan 10, 2024</a>.',
      search: null,
      watchPath: undefined,
      duckdb: DUCKDB_DEFAULTS
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
  it("defaults the home to the escaped title", () => {
    assert.strictEqual(config({title: "dollar&pound", pages: []}, root).home, "dollar&amp;pound");
    assert.strictEqual(config({title: 42, pages: []}, root).home, "42");
    assert.strictEqual(config({title: null, pages: []}, root).home, "null");
  });
  it("populates default pages", () => {
    assert.deepStrictEqual(config({}, root).pages, [
      {name: "One", path: "/one", pager: "main"},
      {name: "H1: Section", path: "/toc-override", pager: "main"},
      {name: "H1: Section", path: "/toc", pager: "main"},
      {name: "A page…", path: "/closed/page", pager: "main"},
      {name: "Two", path: "/sub/two", pager: "main"}
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
      {name: "42", path: "/true", pager: "main"},
      {name: "null", path: "/yes", pager: "main"},
      {name: "Index", path: "/foo/index", pager: "main"},
      {name: "Index.html", path: "/foo/index", pager: "main"},
      {name: "Page.html", path: "/foo", pager: "main"}
    ];
    assert.deepStrictEqual(config({pages: inpages}, root).pages, outpages);
  });
  it("allows external page paths", () => {
    const pages = [{name: "Example.com", path: "https://example.com", pager: null}];
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
    assert.deepStrictEqual(config({pages: inpages}, root).pages, outpages);
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
});

describe("normalizePath(path) with {cleanUrls: false} (deprecated)", () => {
  const root = "test/input";
  const normalize = config({cleanUrls: false}, root).normalizePath;
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

describe("normalizePath(path) with {cleanUrls: true} (deprecated)", () => {
  const root = "test/input";
  const normalize = config({cleanUrls: true}, root).normalizePath;
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

describe("normalizePath(path) with {preserveExtension: true}", () => {
  const root = "test/input";
  const normalize = config({preserveExtension: true}, root).normalizePath;
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

describe("normalizePath(path) with {preserveExtension: false}", () => {
  const root = "test/input";
  const normalize = config({preserveExtension: false}, root).normalizePath;
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

describe("normalizePath(path) with {preserveIndex: true}", () => {
  const root = "test/input";
  const normalize = config({preserveIndex: true}, root).normalizePath;
  it("preserves index links", () => {
    assert.strictEqual(normalize("foo/index"), "foo/index");
    assert.strictEqual(normalize("foo/index.html"), "foo/index");
    assert.strictEqual(normalize("../index"), "../index");
    assert.strictEqual(normalize("../index.html"), "../index");
    assert.strictEqual(normalize("./index"), "./index");
    assert.strictEqual(normalize("./index.html"), "./index");
    assert.strictEqual(normalize("/index"), "/index");
    assert.strictEqual(normalize("/index.html"), "/index");
    assert.strictEqual(normalize("index"), "index");
    assert.strictEqual(normalize("index.html"), "index");
  });
  it("converts links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/index");
    assert.strictEqual(normalize("./"), "./index");
    assert.strictEqual(normalize("../"), "../index");
    assert.strictEqual(normalize("foo/"), "foo/index");
    assert.strictEqual(normalize("./foo/"), "./foo/index");
    assert.strictEqual(normalize("../foo/"), "../foo/index");
    assert.strictEqual(normalize("../sub/"), "../sub/index");
  });
});

describe("normalizePath(path) with {preserveIndex: true, preserveExtension: true}", () => {
  const root = "test/input";
  const normalize = config({preserveIndex: true, preserveExtension: true}, root).normalizePath;
  it("preserves index links", () => {
    assert.strictEqual(normalize("foo/index"), "foo/index.html");
    assert.strictEqual(normalize("foo/index.html"), "foo/index.html");
    assert.strictEqual(normalize("../index"), "../index.html");
    assert.strictEqual(normalize("../index.html"), "../index.html");
    assert.strictEqual(normalize("./index"), "./index.html");
    assert.strictEqual(normalize("./index.html"), "./index.html");
    assert.strictEqual(normalize("/index"), "/index.html");
    assert.strictEqual(normalize("/index.html"), "/index.html");
    assert.strictEqual(normalize("index"), "index.html");
    assert.strictEqual(normalize("index.html"), "index.html");
  });
  it("converts links to directories", () => {
    assert.strictEqual(normalize(""), "");
    assert.strictEqual(normalize("/"), "/index.html");
    assert.strictEqual(normalize("./"), "./index.html");
    assert.strictEqual(normalize("../"), "../index.html");
    assert.strictEqual(normalize("foo/"), "foo/index.html");
    assert.strictEqual(normalize("./foo/"), "./foo/index.html");
    assert.strictEqual(normalize("../foo/"), "../foo/index.html");
    assert.strictEqual(normalize("../sub/"), "../sub/index.html");
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

describe("normalizeConfig(duckdb)", () => {
  const root = "";
  it("uses the defaults", () => {
    const {duckdb} = config({}, root);
    assert.deepEqual(duckdb, DUCKDB_DEFAULTS);
  });
  it("supports install: false and load: false", () => {
    const {duckdb} = config({duckdb: {extensions: {json: {install: false, load: false}}}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      json: {
        source: "https://extensions.duckdb.org/",
        install: false,
        load: false
      }
    });
  });
  it("supports null", () => {
    const {duckdb} = config({duckdb: {extensions: {json: null}}}, root);
    assert.deepEqual(
      duckdb.extensions,
      Object.fromEntries(Object.entries(DUCKDB_DEFAULTS.extensions).filter(([name]) => name !== "json"))
    );
  });
  it("defaults load: false for known auto-loading extensions", () => {
    const {duckdb} = config({duckdb: {extensions: {aws: {}}}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      aws: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: false
      }
    });
  });
  it("defaults source: core for known core extensions", () => {
    const {duckdb} = config({duckdb: {extensions: {mysql: {}}}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      mysql: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: true
      }
    });
  });
  it("defaults source: community for unknown extensions", () => {
    const {duckdb} = config({duckdb: {extensions: {h3: {}}}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      h3: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: true
      }
    });
  });
  it("supports core, community and https:// sources", () => {
    const {duckdb} = config(
      {
        duckdb: {
          extensions: {
            foo: {source: "core"},
            bar: {source: "community"},
            baz: {source: "https://custom-domain"}
          }
        }
      },
      root
    );
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      foo: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: true
      },
      bar: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: true
      },
      baz: {
        source: "https://custom-domain/", // URL normalization
        install: true,
        load: true
      }
    });
  });
  it("supports source: string shorthand", () => {
    const {duckdb} = config(
      {
        duckdb: {
          extensions: {
            foo: "core",
            bar: "community",
            baz: "https://custom-domain"
          }
        }
      },
      root
    );
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      foo: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: true
      },
      bar: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: true
      },
      baz: {
        source: "https://custom-domain/", // URL normalization
        install: true,
        load: true
      }
    });
  });
  it("supports load: boolean shorthand", () => {
    const {duckdb} = config({duckdb: {extensions: {json: true, foo: true, bar: false}}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      json: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: true
      },
      foo: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: true
      },
      bar: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: false
      }
    });
  });
  it("supports sources shorthand", () => {
    const {duckdb} = config({duckdb: {extensions: ["spatial", "h3"]}}, root);
    assert.deepEqual(duckdb.extensions, {
      ...DUCKDB_DEFAULTS.extensions,
      spatial: {
        source: "https://extensions.duckdb.org/",
        install: true,
        load: true
      },
      h3: {
        source: "https://community-extensions.duckdb.org/",
        install: true,
        load: true
      }
    });
  });
  it("rejects invalid names", () => {
    assert.throws(() => config({duckdb: {extensions: {"*^/": true}}}, root), /invalid extension/i);
  });
  it("rejects invalid sources", () => {
    assert.throws(() => config({duckdb: {extensions: {foo: "file:///path/to/extension"}}}, root), /invalid source/i);
    assert.throws(() => config({duckdb: {extensions: {foo: "notasource"}}}, root), /invalid url/i);
  });
});
