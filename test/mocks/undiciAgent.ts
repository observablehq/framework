import {MockAgent, getGlobalDispatcher, setGlobalDispatcher} from "undici";
import type {BaseFixtures, TestFixture} from "./composeTest.js";

export function withUndiciAgent<FIn extends BaseFixtures>(): TestFixture<FIn, FIn & {undiciAgent: MockAgent}> {
  return (testFunction) => {
    return async (args) => {
      const undiciAgent = new MockAgent();
      undiciAgent.disableNetConnect();
      const originalDispatcher = getGlobalDispatcher();
      setGlobalDispatcher(undiciAgent);

      try {
        await testFunction({...args, undiciAgent});
      } finally {
        undiciAgent.close();
        if (originalDispatcher) setGlobalDispatcher(originalDispatcher);
      }
    };
  };
}
