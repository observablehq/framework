import * as d3 from "d3";

const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);

const start = d3.timeHour(d3.utcDay.offset(end, -7));

const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S");

const usRegions = `&respondent[0]=CENT&respondent[1]=MIDW&respondent[2]=CAL&respondent[3]=FLA&respondent[4]=NW&respondent[5]=SW&respondent[6]=MIDA&respondent[7]=NA&respondent[8]=CAR&respondent[9]=SE&respondent[10]=NE&respondent[11]=NY&respondent[12]=TEN&respondent[13]=TEX`;

const regionDemandUrl = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=D&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000${usRegions}`;

const tidySeries = (response, id, name) => {
  // the response is an array with one element, which has a data property which is a list of series
  const series = response[0].data;
  // we flatten the series into one big array to
  // turn our region data into a tidy series suitable for Plot
  // TODO: check for hourly vs daily more efficiently
  const datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S");
  const dateFormat = d3.utcParse("%m/%d/%Y");
  return series.flatMap((s) => {
    return s.VALUES.DATES.map((d, i) => {
      return {
        id: s[id],
        name: s[name],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i],
        reported: s.VALUES.DATA_REPORTED[i],
        imputed: s.VALUES.DATA_IMPUTED[i],
      };
    });
  });
};

const regionalDemandSeries = await d3.json(regionDemandUrl).then((response) => {
  // return response
  return tidySeries(response, "RESPONDENT_ID", "RESPONDENT_NAME");
});

process.stdout.write(d3.csvFormat(regionalDemandSeries));
