import assert from "node:assert";
import {commandInstruction} from "../src/strings.js";
import {bold, magenta} from "../src/tty.js";

describe("commandInstructions", () => {
  it("makes the command bold and magenta", () => {
    assert.equal(commandInstruction("foo", {env: {}}), magenta(bold("observable foo")));
  });

  // These tests check for string include instead of equality so they ignore the
  // color escape codes used by default.

  it("defaults to no prefix", () => {
    const instruction = commandInstruction("foo", {env: {}});
    assert.ok(instruction.includes("observable foo"));
    assert.ok(!instruction.includes("npm"));
    assert.ok(!instruction.includes("npx"));
    assert.ok(!instruction.includes("yarn"));
  });

  it("detects npm run", () => {
    assert.ok(
      commandInstruction("foo", {
        env: {
          npm_config_user_agent: "npm/9.6.7 node/v20.3.1 linux x64 workspaces/false",
          npm_lifecycle_event: "observable"
        }
      }).includes("npm run observable foo")
    );
  });

  it("detects npx", () => {
    assert.ok(
      commandInstruction("foo", {
        env: {
          npm_config_user_agent: "npm/9.6.7 node/v20.3.1 linux x64 workspaces/false",
          npm_lifecycle_event: "npx"
        }
      }).includes("npx observable foo")
    );
  });

  it("detects yarn", () => {
    assert.ok(
      commandInstruction("foo", {
        env: {
          npm_config_user_agent: "yarn/1.22.21 npm/? node/v20.3.1 linux x64"
        }
      }).includes("yarn observable foo")
    );
  });

  it("respects the color argument", () => {
    assert.equal(commandInstruction("foo", {env: {}, color: (s) => `<< ${s} >>`}), "<< observable foo >>");
  });

  it("handles a null color argument", () => {
    assert.equal(commandInstruction("foo", {color: null, env: {}}), "observable foo");
  });
});
