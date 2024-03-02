import assert from "node:assert";
import {readFile} from "node:fs/promises";
import {type CreateEffects, create} from "../src/create.js";
import {fromOsPath} from "../src/files.js";
import {TestClackEffects} from "./mocks/clack.js";

describe("create", async () => {
  it("instantiates the default template", async () => {
    const effects = new TestCreateEffects();
    effects.clack.inputs.push(
      "./template-test", // Where to create your project?
      "Template Test", // What to title your project?
      true, // Include sample files to help you get started?
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(undefined, effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/docs/components/timeline.js",
        "template-test/docs/data/launches.csv.js",
        "template-test/docs/data/events.json",
        "template-test/docs/example-dashboard.md",
        "template-test/docs/example-report.md",
        "template-test/docs/index.md",
        "template-test/observablehq.config.ts",
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
    await create(undefined, effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/docs/index.md",
        "template-test/observablehq.config.ts",
        "template-test/package.json",
        "template-test/README.md"
      ])
    );
  });
});

class TestCreateEffects implements CreateEffects {
  outputs = new Map<string, string>();
  clack = new TestClackEffects();
  async sleep(): Promise<void> {}
  log(): void {}
  async mkdir(): Promise<void> {} // TODO test?
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    this.outputs.set(fromOsPath(outputPath), await readFile(sourcePath, "utf-8"));
  }
  async writeFile(outputPath: string, contents: string): Promise<void> {
    this.outputs.set(fromOsPath(outputPath), contents);
  }
}
