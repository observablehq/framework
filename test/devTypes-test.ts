import assert from "node:assert";
import {readFileSync} from "node:fs";

describe("package.json", () => {
  const allowMismatch = new Set([
    "@types/cross-spawn",
    "@types/d3-array",
    "@types/d3-format",
    "@types/jsdom",
    "@types/mocha",
    "@types/node",
    "@types/tar",
    "@types/tar-stream",
    "@types/send",
    "@types/ws"
  ]);

  const buffer = readFileSync("package.json");
  const info = JSON.parse(buffer.toString());
  const packages = {
    ...info.dependencies,
    ...info.devDependencies,
    ...info.engines
  };
  const prefix = "@types/";

  for (const [name, version] of Object.entries(info.devDependencies)) {
    if (!name.startsWith(prefix)) continue;
    const libVersion = packages[name.slice(prefix.length)];

    it(`${name} matches library version`, function () {
      if (allowMismatch.has(name)) return this.skip();
      assert.strictEqual(version, libVersion);
    });
  }
});
