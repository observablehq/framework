import * as d3 from "d3";
import {readFileSync} from "node:fs";

// Electricity exported (in GWh) from the lower 48 US states to Canada and Mexico

const tidySeries = (response) => {
  let series = response[0].data;
  let datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S");
  let dateFormat = d3.utcParse("%m/%d/%Y");
  return series.flatMap((s) => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        id: s["TO_RESPONDENT_ID"],
        name: s["TO_RESPONDENT_NAME"],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i]
      };
    });
  });
};

const countryInterchangeSeriesJSON = JSON.parse(
  readFileSync("docs/data/countryInterchangeSeries-20240328-20240403.json")
);

const countryInterchangeSeries = tidySeries(countryInterchangeSeriesJSON);

process.stdout.write(d3.csvFormat(countryInterchangeSeries));
