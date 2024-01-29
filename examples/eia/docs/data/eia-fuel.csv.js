import * as d3 from "d3";

const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);

const start = d3.timeHour(d3.utcDay.offset(end, -7));

const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S");

// From Ian's notebook: https://observablehq.com/@observablehq/eia-hourly-electric-grid-monitor
// NG is net generation
// this one queries just for the US48 region
const fuelGenUrl = `https://www.eia.gov/electricity/930-api/region_data_by_fuel_type/series_data?type[0]=NG&respondent[0]=US48&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&offset=0`

const tidySeries = (response, id, name) => {
    // the response is an array with one element, which has a data property which is a list of series
    let series = response[0].data
    // we flatten the series into one big array to
    // turn our region data into a tidy series suitable for Plot
    // TODO: check for hourly vs daily more efficiently
    let datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S")
    let dateFormat = d3.utcParse("%m/%d/%Y")
    return series.flatMap(s => {
      return s.VALUES.DATES.map((d,i) => {
        return {
          id: s[id],
          name: s[name],
          date: datetimeFormat(d) ? datetimeFormat(d) : dateFormat(d),
          value: s.VALUES.DATA[i],
          reported: s.VALUES.DATA_REPORTED[i],
          imputed: s.VALUES.DATA_IMPUTED[i]
        }
      })
    })
  }

const generationByFuel = await d3.json(fuelGenUrl).then(response => {
    // return response
    return tidySeries(response, "FUEL_TYPE_NAME", "RESPONDENT_NAME")
  })

process.stdout.write(d3.csvFormat(generationByFuel));
