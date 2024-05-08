import assert from "node:assert";
import {PassThrough} from "node:stream";
import type {WrappingClack} from "../src/clack.js";
import {clackWithWrap} from "../src/clack.js";
import {blue, faint} from "../src/tty.js";

describe("WrappingClack", () => {
  function testSetup(): {clack: WrappingClack; stream: PassThrough; getOutput: () => string} {
    const clack = clackWithWrap.wrap;
    const stream = Object.assign(new PassThrough(), {columns: 10});
    let output = "";
    stream.on("data", (chunk) => {
      output += chunk;
    });
    return {clack, stream, getOutput: () => output};
  }

  it("should wrap intros", async () => {
    const {clack, stream, getOutput} = testSetup();
    clack.intro("0 1 2 3 4 5 6 7 8 9", {output: stream});
    assert.equal(
      getOutput(),
      [`${faint("┌")}  0 1 2 3`, `${faint("│")}  4 5 6 7`, `${faint("│")}  8 9`, ""].join("\n")
    );
  });

  it("should wrap outros", async () => {
    const {clack, stream, getOutput} = testSetup();
    clack.outro("0 1 2 3 4 5 6 7 8 9", {output: stream});
    assert.equal(
      getOutput(),
      [faint("│"), `${faint("│")}  0 1 2 3`, `${faint("│")}  4 5 6 7`, `${faint("└")}  8 9`, ""].join("\n")
    );
  });

  it("should wrap log.info", async () => {
    const {clack, stream, getOutput} = testSetup();
    clack.log.info("0 1 2 3 4 5 6 7 8 9", {output: stream});
    assert.equal(
      getOutput(),
      [faint("│"), `${blue("●")}  0 1 2 3`, `${faint("│")}  4 5 6 7`, `${faint("│")}  8 9`, ""].join("\n")
    );
  });
});
