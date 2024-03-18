import * as d3 from "d3";

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

const jsonData = await d3.json(usDemandUrl);
const tidySeries = jsonToTidy(jsonData, "TYPE_ID");

process.stdout.write(d3.csvFormat(tidySeries));
