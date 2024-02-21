import assert from "node:assert";
import {readFile} from "../src/brandedFs.js";
import {FilePath} from "../src/brandedPath.js";
import {type CreateEffects, create} from "../src/create.js";
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
        FilePath("template-test/.gitignore"),
        FilePath("template-test/docs/components/timeline.js"),
        FilePath("template-test/docs/data/launches.csv.js"),
        FilePath("template-test/docs/data/events.json"),
        FilePath("template-test/docs/example-dashboard.md"),
        FilePath("template-test/docs/example-report.md"),
        FilePath("template-test/docs/index.md"),
        FilePath("template-test/observablehq.config.ts"),
        FilePath("template-test/package.json"),
        FilePath("template-test/README.md")
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
        FilePath("template-test/.gitignore"),
        FilePath("template-test/docs/index.md"),
        FilePath("template-test/observablehq.config.ts"),
        FilePath("template-test/package.json"),
        FilePath("template-test/README.md")
      ])
    );
  });
});

class TestCreateEffects implements CreateEffects {
  outputs = new Map<FilePath, string>();
  clack = new TestClackEffects();
  async sleep(): Promise<void> {}
  log(): void {}
  async mkdir(): Promise<void> {} // TODO test?
  async copyFile(sourcePath: FilePath, outputPath: FilePath): Promise<void> {
    this.outputs.set(outputPath, await readFile(sourcePath, "utf-8"));
  }
  async writeFile(outputPath: FilePath, contents: string): Promise<void> {
    this.outputs.set(outputPath, contents);
  }
}
