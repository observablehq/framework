import * as vgplot from "npm:@uwdata/vgplot";
import {getDefaultClient} from "observablehq:stdlib/duckdb";

export default async function vg() {
  const coordinator = vgplot.coordinator();
  const api = vgplot.createAPIContext({coordinator});
  const duckdb = (await getDefaultClient())._db; // TODO live update
  coordinator.databaseConnector(vgplot.wasmConnector({duckdb}));
  return api;
}
