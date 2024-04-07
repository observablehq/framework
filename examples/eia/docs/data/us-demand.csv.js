import * as d3 from "d3";
import {readFileSync} from "node:fs";

// Types: DF = forecasted demand, D = demand (actual), NG = net generation

const datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S");
const dateFormat = d3.utcParse("%m/%d/%Y");
const typeNameRemap = {DF: "demandForecast", D: "demandActual", NG: "netGeneration"};

// Flatten JSON from date / type / value hierarchy to a tidy array
const jsonToTidy = (data) => {
  let series = data[0].data;
  return series.flatMap((s) => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        name: typeNameRemap[s["TYPE_ID"]],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i]
      };
    });
  });
};

const usOverview = JSON.parse(readFileSync("docs/data/usOverviewSeries-20240328-20240403.json"));

const tidySeries = jsonToTidy(usOverview);

process.stdout.write(d3.csvFormat(tidySeries));
