import * as d3 from "d3";

const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);
const start = d3.timeHour(d3.utcDay.offset(end, -7));
const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S"); // Convert dates into the format the EIA web API expects

// Electricity exported (in GWh) from the lower 48 US states to Canada and Mexico
const countryInterchangeUrl = `https://www.eia.gov/electricity/930-api/interchange/series_data?type[0]=TI&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&from_respondent[0]=US48&timezone=Eastern&limit=10000&offset=0`;

const tidySeries = (response, id, name) => {
  let series = response[0].data;
  let datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S");
  let dateFormat = d3.utcParse("%m/%d/%Y");
  return series.flatMap((s) => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        id: s[id],
        name: s[name],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i]
      };
    });
  });
};

const countryInterchangeSeries = await d3.json(countryInterchangeUrl).then((response) => {
  return tidySeries(response, "TO_RESPONDENT_ID", "TO_RESPONDENT_NAME");
});

process.stdout.write(d3.csvFormat(countryInterchangeSeries));
