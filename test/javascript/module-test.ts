import assert from "node:assert";
import type {FileInfo, ModuleInfo} from "../../src/javascript/module.js";
import {getFileHash, getFileInfo, getModuleHash, getModuleInfo} from "../../src/javascript/module.js";

const emptyHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// Note: if these hashes change, please verify that they’re correct by stepping
// through the code and verifying that they consider all the relevant files.
describe("getModuleHash(root, path)", () => {
  it("returns the transitive content hash for the specified module", () => {
    assert.strictEqual(getModuleHash("test/input/build/imports", "foo/foo.js"), "e743cc5455594df5a3bd78622594dfb7a8ddb9277957be9b9732f33a88955d82"); // prettier-ignore
    assert.strictEqual(getModuleHash("test/input/build/imports", "bar/bar.js"), "34442bce5f38762986a81229c551723cdc3d4c1509ac14dde193555e65013d76"); // prettier-ignore
    assert.strictEqual(getModuleHash("test/input/build/imports", "top.js"), "160847a6b4890d59f8e8862911bfbe3b8066955d31f2708cafbe51945c3c57b6"); // prettier-ignore
    assert.strictEqual(getModuleHash("test/input/build/fetches", "foo/foo.js"), "3bb4a170d2f3539934168741572d4aa3cd11da649d4ca88b408edefb5c287360"); // prettier-ignore
    assert.strictEqual(getModuleHash("test/input/build/fetches", "top.js"), "6c858de52de6ff26b19508e95448288da02fac62251b7ca2710a308a0ebfd7ba"); // prettier-ignore
  });
  it("returns the empty hash if the specified module does not exist", () => {
    assert.strictEqual(getModuleHash("test/input/build/imports", "does-not-exist.js"), emptyHash);
  });
  it("returns the file hash if the specified path is not a module", () => {
    assert.strictEqual(getModuleHash("test/input/build/imports", "foo/foo.md"), "fc5f03ef66ae950bcc54fca53c27bdd86d1d35a52cccc97d99d8585600e0cd1d"); // prettier-ignore
  });
});

describe("getModuleInfo(root, path)", () => {
  it("returns the information for the specified module", () => {
    assert.deepStrictEqual(redactModuleInfo("test/input/build/imports", "foo/foo.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "17e03fbc08c28530c84ab1163901890915302d3f1d5af2c9256e3e8cab1324a9",
      globalStaticImports: new Set(["npm:@example/url-import", "npm:d3"]),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set(["../bar/bar.js", "../top.js"])
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/build/imports", "bar/bar.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "7b0c5b1eef9d9dd624a7529a160a667516182000e863d81e077d606214bf2341",
      globalStaticImports: new Set(),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set(["./baz.js"])
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/build/imports", "bar/baz.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "2483067ede9abb8bc914e3275fb177cbe7898944a625d1da2226fbc16f833bec",
      globalStaticImports: new Set(),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set(["../foo/foo.js"])
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/build/imports", "top.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "a53c5d5b8a2e2f483fb15a0ac2cdb1cd162da4b02f9f47b47f0fbe237f3b6382",
      globalStaticImports: new Set(),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set()
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/build/fetches", "foo/foo.js"), {
      fileMethods: new Set(["json", "text"]),
      files: new Set(["./foo-data.csv", "./foo-data.json"]),
      hash: "2b1e6b6f73a700231a3c60915d358d5ac10b1665e65a1647d91bf597d48f874e",
      globalStaticImports: new Set(["observablehq:stdlib"]),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set()
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/build/fetches", "top.js"), {
      fileMethods: new Set(["json", "text"]),
      files: new Set(["./top-data.csv", "./top-data.json"]),
      hash: "2a35a381b4975e007db01eef32f3dadd74645b61a6cf0fe3746bcb4ae8c8b3cf",
      globalStaticImports: new Set(["observablehq:stdlib"]),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(),
      localStaticImports: new Set(["./foo/foo.js"])
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/imports", "dynamic-import.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "798a3d6d848c7b5facdcd14f893cd74d03336d74991f192443ff88fd1dfff038",
      globalStaticImports: new Set(),
      globalDynamicImports: new Set(),
      localDynamicImports: new Set(["./bar.js"]),
      localStaticImports: new Set()
    });
    assert.deepStrictEqual(redactModuleInfo("test/input/imports", "dynamic-npm-import.js"), {
      fileMethods: new Set(),
      files: new Set(),
      hash: "47b3d67acfc04995d3e58a8829855e583856010bb3c5d415747782da34d0dcc8",
      globalStaticImports: new Set(),
      globalDynamicImports: new Set(["npm:canvas-confetti"]),
      localDynamicImports: new Set(),
      localStaticImports: new Set()
    });
  });
  it("returns undefined if the specified module does not exist", () => {
    assert.strictEqual(getModuleInfo("test/input/build/imports", "does-not-exist.js"), undefined);
  });
  it("returns undefined if the specified module is invalid", () => {
    assert.strictEqual(getModuleInfo("test/input/build/imports", "foo/foo.md"), undefined);
  });
});

describe("getFileHash(root, path)", () => {
  it("returns the content hash for the specified file", () => {
    assert.strictEqual(getFileHash("test/input/build/files", "file-top.csv"), "01a7ce0aea79f9cddb22e772b2cc9a9f3229a64a5fd941eec8d8ddc41fb07c34"); // prettier-ignore
  });
  it("returns the empty hash if the specified file does not exist", async () => {
    assert.strictEqual(getFileHash("test/input/build/files", "does-not-exist.csv"), emptyHash);
  });
});

describe("getFileInfo(root, path)", () => {
  it("returns the info for the specified file", () => {
    assert.deepStrictEqual(redactFileInfo("test/input/build/files", "file-top.csv"), {hash: "01a7ce0aea79f9cddb22e772b2cc9a9f3229a64a5fd941eec8d8ddc41fb07c34", size: 16}); // prettier-ignore
    assert.deepStrictEqual(redactFileInfo("test/input/build/archives.posix", "dynamic.zip.sh"), {hash: "516cec2431ce8f1181a7a2a161db8bdfcaea132d3b2c37f863ea6f05d64d1d10", size: 51}); // prettier-ignore
    assert.deepStrictEqual(redactFileInfo("test/input/build/archives.posix", "static.zip"), {hash: "e6afff224da77b900cfe3ab8789f2283883300e1497548c30af66dfe4c29b429", size: 180}); // prettier-ignore
  });
  it("returns undefined if the specified file is created by a data loader", () => {
    assert.strictEqual(getFileInfo("test/input/build/archives.posix", "dynamic.zip"), undefined);
    assert.strictEqual(getFileInfo("test/input/build/archives.posix", "dynamic/file.txt"), undefined);
    assert.strictEqual(getFileInfo("test/input/build/archives.posix", "static/file.txt"), undefined);
  });
});

function redactModuleInfo(root: string, path: string): Omit<ModuleInfo, "mtimeMs"> | undefined {
  const info = getModuleInfo(root, path);
  if (!info) return;
  const {mtimeMs, ...rest} = info;
  return rest;
}

function redactFileInfo(root: string, path: string): Omit<FileInfo, "mtimeMs"> | undefined {
  const info = getFileInfo(root, path);
  if (!info) return;
  const {mtimeMs, ...rest} = info;
  return rest;
}
