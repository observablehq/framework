import {csv} from "d3-fetch";
import {csvFormat} from "d3-dsv";
import {utcParse} from "d3-time-format";

const parse = utcParse("%m/%d/%Y");
const data = await csv("https://www.freddiemac.com/pmms/docs/PMMS_history.csv").then((data) =>
  data.map(({date, pmms30, pmms15}) => ({
    date: parse(date),
    pmms30,
    pmms15
  }))
);

process.stdout.write(csvFormat(data));
