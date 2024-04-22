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
      "default", // Include sample files to help you get started?
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/docs/aapl.csv",
        "template-test/docs/observable.png",
        "template-test/docs/components/timeline.js",
        "template-test/docs/data/events.json",
        "template-test/docs/data/launches.csv.js",
        "template-test/docs/example-dashboard.md",
        "template-test/docs/example-report.md",
        "template-test/docs/index.md",
        "template-test/docs/penguins.csv",
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
      "empty", // Include sample files to help you get started?
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-test/.gitignore",
        "template-test/docs/observable.png",
        "template-test/docs/index.md",
        "template-test/observablehq.config.js",
        "template-test/package.json",
        "template-test/README.md"
      ])
    );
  });
  it("instantiates the github template", async () => {
    const effects = new TestCreateEffects();
    effects.clack.inputs.push(
      "./template-github", // Where to create your project?
      "GitHub Stats", // What to title your project?
      "github", // Include sample files to help you get started?
      "", // token
      "", // repos or org
      null, // Install dependencies?
      false // Initialize git repository?
    );
    await create(effects);
    assert.deepStrictEqual(
      new Set(effects.outputs.keys()),
      new Set([
        "template-github/README.md",
        "template-github/docs/clone.json.ts",
        "template-github/docs/collaborations.md",
        "template-github/docs/commits.json.ts",
        "template-github/docs/components/DOM.js",
        "template-github/docs/components/color-legend.js",
        "template-github/docs/components/force-graph.js",
        "template-github/docs/components/plural.js",
        "template-github/docs/components/treemap.js",
        "template-github/docs/config.json.ts",
        "template-github/docs/config.ts",
        "template-github/docs/files.json.ts",
        "template-github/docs/files.md",
        "template-github/docs/github-repos.ts",
        "template-github/docs/github.ts",
        "template-github/docs/index.md",
        "template-github/docs/issues.json.ts",
        "template-github/docs/issues.md",
        "template-github/docs/repos.json.ts",
        "template-github/docs/repos.md",
        "template-github/docs/user.json.ts",
        "template-github/docs/user.md",
        "template-github/package.json"
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
