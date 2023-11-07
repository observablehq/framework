import {runLoader} from "../src/dataloader.js";
import {readFile, unlink} from "node:fs/promises";
import assert from "node:assert";

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const outputPath = ".observablehq/data1.txt.tmp";
    await runLoader("test/dataloaders/data1.js", outputPath);
    assert.strictEqual(await readFile(outputPath, "utf-8"), "node\n");
    await unlink(outputPath);
  });
  it("a .ts data loader is called with tsx", async () => {
    const outputPath = ".observablehq/data2.txt.tmp";
    await runLoader("test/dataloaders/data2.ts", outputPath);
    assert.strictEqual(await readFile(outputPath, "utf-8"), "tsx\n");
    await unlink(outputPath);
  });
  it("a .sh data loader is called as a shell script", async () => {
    const outputPath = ".observablehq/data3.txt.tmp";
    await runLoader("test/dataloaders/data3.sh", outputPath);
    assert.strictEqual(await readFile(outputPath, "utf-8"), "shell\n");
    await unlink(outputPath);
  });
});
