import assert from "node:assert";
import {FileAttachment, registerFile} from "../../../src/client/stdlib/fileAttachment.js";

describe("FileAttachment(name)", () => {
  before(() => {
    globalThis.location = new URL("http://localhost:3000/test") as any;
    registerFile("./test.csv", {"name":"./test.csv","mimeType":"text/csv","path":"./_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"}); // prettier-ignore
  });
  after(() => {
    delete (globalThis as any).location;
  });
  it("returns the file at the specified path", async () => {
    const f = FileAttachment("./test.csv");
    assert.strictEqual(f.name, "test.csv");
    assert.strictEqual(f.mimeType, "text/csv");
    assert.strictEqual(await f.url(), "http://localhost:3000/_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"); // prettier-ignore
  });
  it("normalizes the specified file path", async () => {
    const f = FileAttachment("test.csv");
    assert.strictEqual(f.name, "test.csv");
    assert.strictEqual(f.mimeType, "text/csv");
    assert.strictEqual(await f.url(), "http://localhost:3000/_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"); // prettier-ignore
  });
  it("resolves the specified path relative to the current location", async () => {
    const f = FileAttachment("/test.csv");
    assert.strictEqual(f.name, "test.csv");
    assert.strictEqual(f.mimeType, "text/csv");
    assert.strictEqual(await f.url(), "http://localhost:3000/_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"); // prettier-ignore
  });
  it("resolves the specified path relative to the specified location (1)", async () => {
    const f = FileAttachment("/test.csv", "http://localhost:3000/sub/path");
    assert.strictEqual(f.name, "test.csv");
    assert.strictEqual(f.mimeType, "text/csv");
    assert.strictEqual(await f.url(), "http://localhost:3000/_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"); // prettier-ignore
  });
  it("resolves the specified path relative to the specified location (2)", async () => {
    const f = FileAttachment("../test.csv", "http://localhost:3000/sub/path");
    assert.strictEqual(f.name, "test.csv");
    assert.strictEqual(f.mimeType, "text/csv");
    assert.strictEqual(await f.url(), "http://localhost:3000/_file/test.csv?sha=edd06c0d902e9ce083a9a5d8d0e655732c72e8129d3c60bfe69d228265e892d6"); // prettier-ignore
  });
  it("returns a canonical instance", async () => {
    const f1 = FileAttachment("/test.csv");
    const f2 = FileAttachment("/test.csv");
    assert.strictEqual(f1, f2);
  });
  it("throws an error if the file does not exist", async () => {
    assert.throws(() => FileAttachment("does-not-exist.csv"), /file not found/i);
    assert.throws(() => FileAttachment("test.csv?found=not"), /file not found/i);
    assert.throws(() => FileAttachment("test.csv", "http://localhost:3000/sub/path"), /file not found/i);
  });
  it("throws an error if used as a constructor", async () => {
    assert.throws(() => new FileAttachment("test.csv"), /not a constructor/i);
  });
});
