import assert from "node:assert";
import type {Logger} from "../../src/observableApiClient.js";

export class MockLogger implements Logger {
  public logLines: any[][] = [];
  public errorLines: any[][] = [];

  log(...args: any[]) {
    this.logLines.push(args);
  }

  error(...args: any[]) {
    this.errorLines.push(args);
  }

  assertExactLogs(expected: RegExp[], {skipBlanks = true} = {}) {
    const filteredLogs = this.logLines.filter((logArgs) => {
      if (skipBlanks) return logArgs.length > 0;
      return true;
    });

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
