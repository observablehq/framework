import assert from "node:assert";
import {rm} from "node:fs/promises";
import {join} from "node:path/posix";
import {resolveNodeImport} from "../src/node.js";
import {
  ensurePackageCache,
  isLocalNpmMode,
  resolvePackageImport,
  resolvePackageImports,
  setLocalNpmResolve
} from "../src/packageResolution.js";
import {mockJsDelivr} from "./mocks/jsdelivr.js";

describe("isLocalNpmMode() / setLocalNpmResolve(value)", () => {
  after(() => setLocalNpmResolve(false));
  it("defaults to false", () => {
    setLocalNpmResolve(false);
    assert.strictEqual(isLocalNpmMode(), false);
  });
  it("returns true when set to true", () => {
    setLocalNpmResolve(true);
    assert.strictEqual(isLocalNpmMode(), true);
  });
  it("returns false when set back to false", () => {
    setLocalNpmResolve(true);
    setLocalNpmResolve(false);
    assert.strictEqual(isLocalNpmMode(), false);
  });
});

describe("resolvePackageImport(root, specifier) in CDN mode", () => {
  mockJsDelivr();
  before(() => setLocalNpmResolve(false));
  after(() => setLocalNpmResolve(false));
  const root = "test/input/build/simple";
  it("resolves to a CDN path", async () => {
    assert.strictEqual(await resolvePackageImport(root, "d3-array"), "/_npm/d3-array@3.2.4/_esm.js");
  });
  it("resolves /+esm suffix to a CDN path", async () => {
    assert.strictEqual(await resolvePackageImport(root, "d3-array/+esm"), "/_npm/d3-array@3.2.4/_esm.js");
  });
  it("resolves with a JavaScript sub-path to a CDN path", async () => {
    assert.strictEqual(await resolvePackageImport(root, "d3-array/src/index.js"), "/_npm/d3-array@3.2.4/src/index.js");
  });
});

describe("resolvePackageImport(root, specifier) in local mode", () => {
  const testRoot = "test/output/package-resolution"; // unique to this test
  before(async () => {
    setLocalNpmResolve(true);
    await rm(join(testRoot, ".observablehq/cache/_node"), {recursive: true, force: true});
  });
  after(() => setLocalNpmResolve(false));
  it("resolves to a local node path", async () => {
    assert.strictEqual(await resolvePackageImport(testRoot, "d3-array"), "/_node/d3-array@3.2.4/index.js");
  });
  it("strips /+esm and resolves to a local node path", async () => {
    assert.strictEqual(await resolvePackageImport(testRoot, "d3-array/+esm"), "/_node/d3-array@3.2.4/index.js");
  });
  it("strips sub-path /+esm suffix and resolves to a local node path", async () => {
    assert.strictEqual(await resolvePackageImport(testRoot, "mime/lite/+esm"), "/_node/mime@4.0.6/lite.js");
  });
  it("resolves a different package to a local node path", async () => {
    assert.strictEqual(await resolvePackageImport(testRoot, "mime"), "/_node/mime@4.0.6/index.js");
  });
});

describe("resolvePackageImports(root, path)", () => {
  const testRoot = "test/output/package-resolution-imports"; // unique to this test
  before(() => rm(join(testRoot, ".observablehq/cache/_node"), {recursive: true, force: true}));
  after(() => setLocalNpmResolve(false));
  it("uses node resolution for /_node/ paths in CDN mode", async () => {
    setLocalNpmResolve(false);
    const nodePath = await resolveNodeImport(testRoot, "d3-array");
    assert.deepStrictEqual(await resolvePackageImports(testRoot, nodePath), [
      {method: "static", name: "../internmap@2.0.3/index.js", type: "local"}
    ]);
  });
  it("uses node resolution for /_node/ paths in local mode", async () => {
    setLocalNpmResolve(true);
    const nodePath = await resolveNodeImport(testRoot, "d3-array");
    assert.deepStrictEqual(await resolvePackageImports(testRoot, nodePath), [
      {method: "static", name: "../internmap@2.0.3/index.js", type: "local"}
    ]);
  });
});

describe("ensurePackageCache(root, path)", () => {
  const root = "test/output/package-resolution-cache"; // unique to this test
  after(() => setLocalNpmResolve(false));
  it("returns a local cache path for /_node/ paths in CDN mode", async () => {
    setLocalNpmResolve(false);
    const path = "/_node/d3-array@3.2.4/index.js";
    assert.strictEqual(
      await ensurePackageCache(root, path),
      join(root, ".observablehq", "cache", path)
    );
  });
  it("returns a local cache path for /_node/ paths in local mode", async () => {
    setLocalNpmResolve(true);
    const path = "/_node/d3-array@3.2.4/index.js";
    assert.strictEqual(
      await ensurePackageCache(root, path),
      join(root, ".observablehq", "cache", path)
    );
  });
  it("returns a local cache path for /_npm/ paths in local mode", async () => {
    setLocalNpmResolve(true);
    const path = "/_npm/d3-array@3.2.4/_esm.js";
    assert.strictEqual(
      await ensurePackageCache(root, path),
      join(root, ".observablehq", "cache", path)
    );
  });
});
