import assert from "node:assert";
import {readFile} from "node:fs/promises";
import type {CreateEffects} from "../src/create.js";
import {create} from "../src/create.js";
import {fromOsPath} from "../src/files.js";
import {TestClackEffects} from "./mocks/clack.js";
import {MockLogger} from "./mocks/logger.js";

describe("create", () => {
  it("instantiates the default template", async () => {
    const effects = new TestCreateEffects();
    effects.clack.inputs.push(
      "./template-test", // Where to create your project?
      "Template Test", // What to title your project?
      true, // Include sample files to help you get started?
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/src/.gitignore",
        "template-test/src/aapl.csv",
        "template-test/src/observable.png",
        "template-test/src/components/timeline.js",
        "template-test/src/data/events.json",
        "template-test/src/data/launches.csv.js",
        "template-test/src/example-dashboard.md",
        "template-test/src/example-report.md",
        "template-test/src/index.md",
        "template-test/src/penguins.csv",
        "template-test/observablehq.config.js",
        "template-test/package.json",
        "template-test/README.md"
      ])
    );
  });
  it("instantiates the empty template", async () => {
    const effects = new TestCreateEffects();
    effects.clack.inputs.push(
      "./template-test", // Where to create your project?
      "Template Test", // What to title your project?
      false, // Include sample files to help you get started?
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/src/.gitignore",
        "template-test/src/observable.png",
        "template-test/src/index.md",
        "template-test/observablehq.config.js",
        "template-test/package.json",
        "template-test/README.md"
      ])
    );
  });
});

class TestCreateEffects implements CreateEffects {
  isTty = true;
  outputColumns = 80;
  logger = new MockLogger();
  outputs = new Map<string, string>();
  clack = new TestClackEffects();
  async sleep(): Promise<void> {}
  async mkdir(): Promise<void> {} // TODO test?
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    this.outputs.set(fromOsPath(outputPath), await readFile(sourcePath, "utf-8"));
  }
  async writeFile(outputPath: string, contents: string): Promise<void> {
    this.outputs.set(fromOsPath(outputPath), contents);
  }
}
