import assert from "node:assert";
import type * as clack from "@clack/prompts";
import type {ClackEffects} from "../../src/clack.js";

export class TestClackEffects implements ClackEffects {
  static cancelSymbol = Symbol("cancel");
  inputs: any[] = [];
  intro() {}
  outro() {}
  note() {}
  cancel() {}
  group: any = async (steps: clack.PromptGroup<any>) => {
    const results = {};
    for (const key in steps) {
      results[key] = await steps[key]({results});
    }
    return results;
  };
  async text({message, validate}: clack.TextOptions) {
    if (!this.inputs.length) throw new Error(`out of inputs for text: ${message}`);
    const result = this.inputs.shift();
    if (validate) validate(result);
    return result;
  }
  async select({message}: clack.SelectOptions<any, any>) {
    if (!this.inputs.length) throw new Error(`out of inputs for select: ${message}`);
    return this.inputs.shift();
  }
  async confirm({message}: clack.ConfirmOptions) {
    if (!this.inputs.length) throw new Error(`out of inputs for select: ${message}`);
    return this.inputs.shift();
  }
  spinner() {
    return {
      start() {},
      stop() {},
      message() {}
    };
  }
  log = new TestClackLogs();
  isCancel(value: unknown): value is symbol {
    return value === TestClackEffects.cancelSymbol;
  }
}

type ClackLogs = typeof clack.log;

class TestClackLogs implements ClackLogs {
  logged: {level: keyof typeof clack.log; message: string | undefined}[] = [];
  message(message?: string) {
    this.logged.push({level: "message", message});
  }
  info(message?: string) {
    this.logged.push({level: "info", message});
  }
  success(message?: string) {
    this.logged.push({level: "success", message});
  }
  step(message?: string) {
    this.logged.push({level: "step", message});
  }
  warn(message?: string) {
    this.logged.push({level: "warn", message});
  }
  warning(message?: string) {
    this.logged.push({level: "warning", message});
  }
  error(message?: string) {
    this.logged.push({level: "error", message});
  }

  assertLogged({message, level}: {message: string | RegExp; level?: keyof ClackLogs}) {
    assert.ok(
      this.logged.some((log) => {
        if (level && log.level !== level) return false;
        if (message instanceof RegExp) return message.test(log.message!);
        return log.message === message;
      }),
      `Expected to find a log line ${
        level ? `with level ${level} ` : ""
      }message ${message}\n\n        Actual logs:\n          * ${this.logged
        .map((d) => d.message)
        .join("\n          * ")}`
    );
  }
}
