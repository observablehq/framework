import * as d3 from "d3";
import JSZip from "jszip";

// Construct web API call for last 7 days of hourly demand data in MWh
// Types: DF = forecasted demand, D = demand (actual), NG = net generation
const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);
const start = d3.timeHour(d3.utcDay.offset(end, -7));
const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S");
const usDemandUrl = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=DF&type[1]=D&type[2]=NG&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`;

const datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S");
const dateFormat = d3.utcParse("%m/%d/%Y");
const typeNameRemap = {DF: "demandForecast", D: "demandActual", NG: "netGeneration"};

// Flatten JSON from date / type / value hierarchy to a tidy array
const jsonToTidy = (data, id) => {
  let series = data[0].data
  return series.flatMap(s => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        name: typeNameRemap[s[id]],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i]
      }
    })
  })
};

// Roll up each hour's values into a single row for a cohesive tip
function tidyToRollup(data) {
  const rolledToDate = data.reduce((map, d) => {
    let value = map.get(d.date.getTime()) ?? { date: d.date, demandForecast: null, demandActual: null, netGeneration: null }
    value[d.name] = d.value
    return map.set(d.date.getTime() , value)
  }, new Map())

  const rolledUpSparse = []
  rolledToDate.forEach((d) => { rolledUpSparse.push(d) })
  return rolledUpSparse
}

const jsonData = await d3.json(usDemandUrl);
const tidySeries = jsonToTidy(jsonData, "TYPE_ID");
const summaryData = tidyToRollup(tidySeries);

const zip = new JSZip();
zip.file("summary.csv", d3.csvFormat(summaryData));
zip.file("detail.csv", d3.csvFormat(tidySeries));
zip.generateNodeStream().pipe(process.stdout);

