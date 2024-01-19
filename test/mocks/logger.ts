import assert from "node:assert";
import type {Logger} from "../../src/logger.js";

export class MockLogger implements Logger {
  public logLines: any[][] = [];
  public warnLines: any[][] = [];
  public errorLines: any[][] = [];

  log(...args: any[]) {
    this.logLines.push(args);
  }

  warn(...args: any[]) {
    this.warnLines.push(args);
  }

  error(...args: any[]) {
    this.errorLines.push(args);
  }

  assertExactLogs(expected: RegExp[], {skipBlanks = true} = {}) {
    this.assertLines(expected, this.logLines, {skipBlanks, exact: true});
  }

  assertExactWarns(expected: RegExp[], {skipBlanks = true} = {}) {
    this.assertLines(expected, this.warnLines, {skipBlanks, exact: true});
  }

  assertExactErrors(expected: RegExp[], {skipBlanks = true} = {}) {
    this.assertLines(expected, this.errorLines, {skipBlanks, exact: true});
  }

  assertAtLeastLogs(expected: RegExp[]) {
    this.assertLines(expected, this.logLines, {skipBlanks: true, exact: false});
  }

  private assertLines(expected: RegExp[], logLines: any[][], {skipBlanks, exact}) {
    const filteredLogs = logLines.filter((logArgs) => {
      if (skipBlanks) return logArgs.length > 0;
      return true;
    });

    if (exact) {
      assert.ok(
        filteredLogs.length === expected.length,
        `Expecting exactly ${expected.length} log lines, but found ${filteredLogs.length}`
      );
    } else {
      assert.ok(
        filteredLogs.length >= expected.length,
        `Expecting at least ${expected.length} log lines, but only found ${filteredLogs.length}`
      );
    }

    for (let i = 0; i < expected.length; i++) {
      if (exact) {
        const logArgs = filteredLogs[i].join(" ");
        assert.ok(
          logArgs.match(expected[i]),
          `Expected log line ${i} to match ${expected[i]}, but got ${JSON.stringify(logArgs[0])}`
        );
      } else {
        assert.ok(
          filteredLogs.some((logArgs) => logArgs.join(" ").match(expected[i])),
          `No log lines found matching ${expected[i]}`
        );
      }
    }
  }
}
