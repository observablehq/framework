import type {Dispatcher} from "undici";
import {MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";

let currentAgent: MockAgent | null = null;
let globalDispatcher: Dispatcher;
let refCount = 0;

export function mockAgent() {
  before(async () => {
    if (refCount++ !== 0) return;
    globalDispatcher = getGlobalDispatcher();
    currentAgent = new MockAgent();
    currentAgent.disableNetConnect();
    setGlobalDispatcher(currentAgent);
  });
  after(async () => {
    if (--refCount !== 0) return;
    currentAgent = null;
    setGlobalDispatcher(globalDispatcher!);
  });
}

export function getCurrentAgent(): MockAgent {
  const agent = currentAgent;
  if (!agent) throw new Error("mockAgent not initialized");
  return agent;
}
