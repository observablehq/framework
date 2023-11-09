import assert from "node:assert";
import {readFile} from "node:fs/promises";
import {Loader} from "../src/dataloader.js";

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const loader = Loader.find("test", "dataloaders/data1.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "node\n");
  });
  it("a .ts data loader is called with tsx", async () => {
    const loader = Loader.find("test", "dataloaders/data2.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "tsx\n");
  });
  it("a .sh data loader is called with sh", async () => {
    const loader = Loader.find("test", "dataloaders/data3.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "shell\n");
  });
  it("a .exe data loader is invoked directly", async () => {
    const loader = Loader.find("test", "dataloaders/data4.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "python3\n");
  });
  it("a .py data loader is called with python3", async () => {
    const loader = Loader.find("test", "dataloaders/data5.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "python3\n");
  });
  it("a .R data loader is called with Rscript", async () => {
    const loader = Loader.find("test", "dataloaders/data6.txt")!;
    const out = await loader.load({verbose: false});
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "Rscript\n");
  });
});
