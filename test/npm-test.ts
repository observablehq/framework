import assert from "node:assert";
import {mkdir} from "node:fs/promises";
import {join} from "node:path/posix";
import {extractNpmSpecifier, initializeNpmVersionCache, parseNpmSpecifier} from "../src/npm.js";
import {fromJsDelivrPath, getDependencyResolver, resolveNpmImport, rewriteNpmImports} from "../src/npm.js";
import {relativePath} from "../src/path.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

describe("getDependencyResolver(root, path, input)", () => {
  mockJsDelivr();
  it("finds /npm/ imports and re-resolves their versions", async () => {
    const root = "test/input/build/simple-public";
    const specifier = "/npm/d3-array@3.2.3/dist/d3-array.js";
    const resolver = await getDependencyResolver(root, "/_npm/d3@7.8.5/_esm.js", `import '${specifier}';\n`); // prettier-ignore
    assert.strictEqual(resolver(specifier), "../d3-array@3.2.4/dist/d3-array.js");
  });
  it("finds /npm/ import resolutions and re-resolves their versions", async () => {
    const root = "test/input/build/simple-public";
    const specifier = "/npm/d3-array@3.2.3/dist/d3-array.js";
    const resolver = await getDependencyResolver(root, "/_npm/d3@7.8.5/_esm.js", `import.meta.resolve('${specifier}');\n`); // prettier-ignore
    assert.strictEqual(resolver(specifier), "../d3-array@3.2.4/dist/d3-array.js");
  });
});

describe("parseNpmSpecifier(specifier)", () => {
  it("parses the name", () => {
    assert.deepStrictEqual(parseNpmSpecifier("d3-array"), {name: "d3-array", range: undefined, path: undefined});
  });
  it("parses the name and range", () => {
    assert.deepStrictEqual(parseNpmSpecifier("d3-array@1"), {name: "d3-array", range: "1", path: undefined});
    assert.deepStrictEqual(parseNpmSpecifier("d3-array@latest"), {name: "d3-array", range: "latest", path: undefined});
  });
  it("parses the name and path", () => {
    assert.deepStrictEqual(parseNpmSpecifier("d3-array"), {name: "d3-array", range: undefined, path: undefined});
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo"), {name: "d3-array", range: undefined, path: "foo"});
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo/bar"), {name: "d3-array", range: undefined, path: "foo/bar"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo.js"), {name: "d3-array", range: undefined, path: "foo.js"});
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo/bar.js"), {name: "d3-array", range: undefined, path: "foo/bar.js"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/+esm"), {name: "d3-array", range: undefined, path: "+esm"});
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo.js/+esm"), {name: "d3-array", range: undefined, path: "foo.js/+esm"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo/bar.js/+esm"), {name: "d3-array", range: undefined, path: "foo/bar.js/+esm"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo/+esm"), {name: "d3-array", range: undefined, path: "foo/+esm"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/foo/bar/+esm"), {name: "d3-array", range: undefined, path: "foo/bar/+esm"}); // prettier-ignore
    assert.deepStrictEqual(parseNpmSpecifier("d3-array/"), {name: "d3-array", range: undefined, path: ""});
  });
  it("parses the name, version, and path", () => {
    assert.deepStrictEqual(parseNpmSpecifier("d3-array@1/foo"), {name: "d3-array", range: "1", path: "foo"});
  });
});

describe("resolveNpmImport(root, specifier)", () => {
  mockJsDelivr();
  const root = "test/input/build/simple";
  it("implicitly adds ._esm.js for specifiers without an extension", async () => {
    assert.strictEqual(await resolveNpmImport(root, "d3-array"), "/_npm/d3-array@3.2.4/_esm.js");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src"), "/_npm/d3-array@3.2.4/src._esm.js");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/foo+bar"), "/_npm/d3-array@3.2.4/foo+bar._esm.js");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/foo+esm"), "/_npm/d3-array@3.2.4/foo+esm._esm.js");
  });
  it("replaces /+esm with /_esm.js or ._esm.js", async () => {
    assert.strictEqual(await resolveNpmImport(root, "d3-array/+esm"), "/_npm/d3-array@3.2.4/_esm.js");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src/+esm"), "/_npm/d3-array@3.2.4/src._esm.js");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src/index.js/+esm"), "/_npm/d3-array@3.2.4/src/index.js._esm.js"); // prettier-ignore
  });
  it("does not add ._esm.js for specifiers with a JavaScript extension", async () => {
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src/index.js"), "/_npm/d3-array@3.2.4/src/index.js");
  });
  it("does not add ._esm.js for specifiers with a non-JavaScript extension", async () => {
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src/index.css"), "/_npm/d3-array@3.2.4/src/index.css");
  });
  it("does not add /_esm.js for specifiers with a trailing slash", async () => {
    assert.strictEqual(await resolveNpmImport(root, "d3-array/"), "/_npm/d3-array@3.2.4/");
    assert.strictEqual(await resolveNpmImport(root, "d3-array/src/"), "/_npm/d3-array@3.2.4/src/");
  });
});

describe("extractNpmSpecifier(path)", () => {
  it("returns the npm specifier for the given local npm path", () => {
    assert.strictEqual(extractNpmSpecifier("/_npm/d3@7.8.5/_esm.js"), "d3@7.8.5/+esm");
    assert.strictEqual(extractNpmSpecifier("/_npm/d3@7.8.5/dist/d3.js"), "d3@7.8.5/dist/d3.js");
    assert.strictEqual(extractNpmSpecifier("/_npm/d3@7.8.5/dist/d3.js._esm.js"), "d3@7.8.5/dist/d3.js/+esm");
    assert.strictEqual(extractNpmSpecifier("/_npm/mime@4.0.1/lite._esm.js"), "mime@4.0.1/lite/+esm");
    assert.strictEqual(extractNpmSpecifier("/_npm/@uwdata/vgplot@0.7.1/_esm.js"), "@uwdata/vgplot@0.7.1/+esm");
  });
  it("throws if not given a local npm path", () => {
    assert.throws(() => extractNpmSpecifier("/npm/d3@7.8.5/+esm"), /invalid npm path/);
    assert.throws(() => extractNpmSpecifier("d3@7.8.5"), /invalid npm path/);
  });
});

describe("fromJsDelivrPath(path)", () => {
  it("returns the local npm path for the given jsDelivr path", () => {
    assert.strictEqual(fromJsDelivrPath("/npm/d3@7.8.5/+esm"), "/_npm/d3@7.8.5/_esm.js");
    assert.strictEqual(fromJsDelivrPath("/npm/d3@7.8.5/dist/d3.js"), "/_npm/d3@7.8.5/dist/d3.js");
    assert.strictEqual(fromJsDelivrPath("/npm/d3@7.8.5/dist/d3.js/+esm"), "/_npm/d3@7.8.5/dist/d3.js._esm.js");
  });
  it("throws if not given a jsDelivr path", () => {
    assert.throws(() => fromJsDelivrPath("/_npm/d3@7.8.5/_esm.js"), /invalid jsDelivr path/);
    assert.throws(() => fromJsDelivrPath("d3@7.8.5"), /invalid jsDelivr path/);
  });
});

// prettier-ignore
describe("rewriteNpmImports(input, resolve)", () => {
  it("rewrites /npm/ imports to /_npm/", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'export * from "../../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
  });
  it("rewrites /npm/…+esm imports to _esm.js", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'export * from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites /npm/ imports to a relative path", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/dist/d3.js", v)), 'import "../../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/dist/d3-array.js";\n', (v) => resolve("/_npm/d3@7.8.5/d3.js", v)), 'import "../d3-array@3.2.4/dist/d3-array.js"/* observablehq-file */;\n');
  });
  it("rewrites named imports", () => {
    assert.strictEqual(rewriteNpmImports('import {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import {sort} from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites empty imports", () => {
    assert.strictEqual(rewriteNpmImports('import "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites default imports", () => {
    assert.strictEqual(rewriteNpmImports('import d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import d3 from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites namespace imports", () => {
    assert.strictEqual(rewriteNpmImports('import * as d3 from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import * as d3 from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites named exports", () => {
    assert.strictEqual(rewriteNpmImports('export {sort} from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'export {sort} from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites namespace exports", () => {
    assert.strictEqual(rewriteNpmImports('export * from "/npm/d3-array@3.2.4/+esm";\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'export * from "../d3-array@3.2.4/_esm.js"/* observablehq-file */;\n');
  });
  it("rewrites dynamic imports with static module specifiers", () => {
    assert.strictEqual(rewriteNpmImports('import("/npm/d3-array@3.2.4/+esm");\n', (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
    assert.strictEqual(rewriteNpmImports("import('/npm/d3-array@3.2.4/+esm');\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@${version}/+esm`);\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), "import(`/npm/d3-array@${version}/+esm`);\n");
  });
  it("ignores dynamic imports with dynamic module specifiers", () => {
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@${version}/+esm`);\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), "import(`/npm/d3-array@${version}/+esm`);\n");
  });
  it("strips the sourceMappingURL declaration", () => {
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n//# sourceMappingURL=index.js.map", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
    assert.strictEqual(rewriteNpmImports("import(`/npm/d3-array@3.2.4/+esm`);\n//# sourceMappingURL=index.js.map\n", (v) => resolve("/_npm/d3@7.8.5/_esm.js", v)), 'import("../d3-array@3.2.4/_esm.js"/* observablehq-file */);\n');
  });
});

describe("initializeNpmVersionCache(root, dir)", () => {
  const root = join("test", "input", "npm");
  const dir = join(root, ".observablehq", "cache", "_npm");
  before(async () => {
    await mkdir(join(dir, "@observablehq", "plot@0.6.11"), {recursive: true});
    await mkdir(join(dir, "@observablehq", "sample-datasets@1.0.1"), {recursive: true});
    await mkdir(join(dir, "d3-dsv@3.0.0"), {recursive: true});
    await mkdir(join(dir, "d3-dsv@3.0.1"), {recursive: true});
    await mkdir(join(dir, "htl@0.3.1"), {recursive: true});
    await mkdir(join(dir, "leaflet@1.9.4"), {recursive: true});
  });
  it("reads the contents of the specified _npm cache", async () => {
    const cache = await initializeNpmVersionCache(root);
    assert.deepStrictEqual(
      cache,
      new Map([
        ["@observablehq/plot", ["0.6.11"]],
        ["@observablehq/sample-datasets", ["1.0.1"]],
        ["d3-dsv", ["3.0.1", "3.0.0"]],
        ["htl", ["0.3.1"]],
        ["leaflet", ["1.9.4"]]
      ])
    );
  });
  it("dir defaults to _npm", async () => {
    assert.deepStrictEqual(await initializeNpmVersionCache(root, "_npm"), await initializeNpmVersionCache(root));
  });
});

function resolve(path: string, specifier: string): string {
  return specifier.startsWith("/npm/") ? relativePath(path, fromJsDelivrPath(specifier)) : specifier;
}
