import {getCurrentAgent, mockAgent} from "./undici.js";

export function mockDuckDB() {
  mockAgent();
  before(async () => {
    const agent = getCurrentAgent();
    const client = agent.get("https://extensions.duckdb.org");
    for (const p of ["mvp", "eh"]) {
      for (const name of ["json", "parquet"]) {
        client
          .intercept({path: `/v1.1.1/wasm_${p}/${name}.duckdb_extension.wasm`, method: "GET"})
          .reply(200, "", {headers: {"content-type": "application/wasm"}})
          .persist();
      }
    }
  });
}
