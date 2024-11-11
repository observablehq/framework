import * as vgplot from "npm:@uwdata/vgplot";
import {getDefaultClient} from "observablehq:stdlib/duckdb";

export default async function vg() {
  const coordinator = new vgplot.Coordinator();
  const api = vgplot.createAPIContext({coordinator});
  const duckdb = (await getDefaultClient())._db;
  coordinator.databaseConnector(vgplot.wasmConnector({duckdb}));
  return api;
}
