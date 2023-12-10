import {type Dispatcher, MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";

export let currentAgent: MockAgent | null = null;

export function mockAgent() {
  let globalDispatcher: Dispatcher;
  let refCount = 0;

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
