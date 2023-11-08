import {runLoader} from "../src/dataloader.js";
import {readFile, unlink} from "node:fs/promises";
import assert from "node:assert";

describe("data loaders are called with the appropriate command", () => {
  it("a .js data loader is called with node", async () => {
    const outputPath = ".observablehq/data1.txt";
    try {
      await runLoader("test/dataloaders/data1.txt.js", outputPath);
      assert.strictEqual(await readFile(outputPath, "utf-8"), "node\n");
    } finally {
      await unlink(outputPath);
    }
  });
  it("a .ts data loader is called with tsx", async () => {
    const outputPath = ".observablehq/data2.txt";
    try {
      await runLoader("test/dataloaders/data2.txt.ts", outputPath);
      assert.strictEqual(await readFile(outputPath, "utf-8"), "tsx\n");
    } finally {
      await unlink(outputPath);
    }
  });
  it("a .sh data loader is called as a shell script", async () => {
    const outputPath = ".observablehq/data3.txt";
    try {
      await runLoader("test/dataloaders/data3.txt.sh", outputPath);
      assert.strictEqual(await readFile(outputPath, "utf-8"), "shell\n");
    } finally {
      await unlink(outputPath);
    }
  });
});
