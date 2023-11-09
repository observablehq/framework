import {Loader} from "../src/dataloader.js";
import {readFile} from "node:fs/promises";
import assert from "node:assert";

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const loader = Loader.find("test", "dataloaders/data1.txt")!;
    const out = await loader.load();
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "node\n");
  });
  it("a .ts data loader is called with tsx", async () => {
    const loader = Loader.find("test", "dataloaders/data2.txt");
    const out = await loader!.load();
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "tsx\n");
  });
  it("a .sh data loader is called as a shell script", async () => {
    const loader = Loader.find("test", "dataloaders/data3.txt");
    const out = await loader!.load();
    assert.strictEqual(await readFile("test/" + out, "utf-8"), "shell\n");
  });
});
