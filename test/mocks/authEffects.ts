import type {AuthEffects} from "../../src/observableApiAuth.js";
import {Deferred} from "../deferred.js";
import {TestClackEffects} from "./clack.js";
import {MockConfigEffects} from "./configEffects.js";
import {MockLogger} from "./logger.js";

export class MockAuthEffects extends MockConfigEffects implements AuthEffects {
  public logger = new MockLogger();
  public openBrowserDeferred = new Deferred<string>();
  public setApiKeyDeferred = new Deferred<{id: string; apiKey: string}>();
  public exitDeferred = new Deferred<void>();
  public isTty: boolean;
  public observableApiKey: string | null = null;
  public outputColumns: number = 80;
  public clack = new TestClackEffects();

  constructor({
    apiKey = null,
    isTty = true,
    env = {}
  }: {apiKey?: string | null; isTty?: boolean; env?: Record<string, string | undefined>} = {}) {
    super({env});
    this.observableApiKey = apiKey;
    this.isTty = isTty;
  }

  async getObservableApiKey(effects: AuthEffects = this) {
    if (effects !== this) throw new Error("don't pass unrelated effects to mock effects methods");
    if (!this.observableApiKey) return null;
    return {source: "test" as const, key: this.observableApiKey};
  }
  async setObservableApiKey(info) {
    this.setApiKeyDeferred.resolve(info);
    this.observableApiKey = info?.key;
  }
  openUrlInBrowser(url: string) {
    this.openBrowserDeferred.resolve(url);
    return Promise.resolve(undefined);
  }
  waitForEnter() {
    return Promise.resolve(undefined);
  }
  exitSuccess() {
    this.exitDeferred.resolve(undefined);
  }
}
