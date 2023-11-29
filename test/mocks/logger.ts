import assert from "node:assert";
import type {Logger} from "../../src/observableApiClient.js";

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
    this.assertLogLines(expected, this.logLines, {skipBlanks});
  }

  assertExactErrors(expected: RegExp[], {skipBlanks = true} = {}) {
    this.assertLogLines(expected, this.errorLines, {skipBlanks});
  }

  assertLogLines(expected: RegExp[], logLines: any[][], {skipBlanks = true} = {}) {
    const filteredLogs = logLines.filter((logArgs) => {
      if (skipBlanks) return logArgs.length > 0;
      return true;
    });

    assert.ok(
      filteredLogs.length >= expected.length,
      `Expecting at least ${expected.length} log lines, but only found ${filteredLogs.length}`
    );

    for (let i = 0; i < expected.length; i++) {
      const logArgs = filteredLogs[i];
      assert.equal(logArgs.length, 1, "Only know how to assert log lines with a single argument");
      assert.ok(
        logArgs[0].match(expected[i]),
        `Expected log line ${i} to match ${expected[i]}, but got ${JSON.stringify(logArgs[0])}`
      );
    }
  }
}
