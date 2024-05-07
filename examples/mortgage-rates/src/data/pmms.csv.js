import {csvFormat} from "d3-dsv";
import {csv} from "d3-fetch";
import {utcParse} from "d3-time-format";

const parseDate = utcParse("%m/%d/%Y");

process.stdout.write(
  csvFormat(
    (await csv("https://www.freddiemac.com/pmms/docs/PMMS_history.csv")).map(({date, pmms30, pmms15}) => ({
      date: parseDate(date),
      pmms30,
      pmms15
    }))
  )
);
