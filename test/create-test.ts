import assert from "node:assert";
import {readFile} from "node:fs/promises";
import {default as prompts} from "prompts";
import {type CreateEffects, create} from "../src/create.js";

describe("create", async () => {
  it("instantiates the default template", async () => {
    const effects = new TestCreateEffects();
    prompts.inject([undefined, undefined]);
    await create({output: "template-test"}, effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/docs/components/bigNumber.js",
        "template-test/docs/data/launchHistory.csv.js",
        "template-test/docs/data/spaceHistory.json",
        "template-test/docs/example-dashboard.md",
        "template-test/docs/example-report.md",
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
  log(): void {}
  async mkdir(): Promise<void> {} // TODO test?
  async copyFile(sourcePath: string, outputPath: string): Promise<void> {
    this.outputs.set(outputPath, await readFile(sourcePath, "utf-8"));
  }
  async writeFile(outputPath: string, contents: string): Promise<void> {
    this.outputs.set(outputPath, contents);
  }
}
