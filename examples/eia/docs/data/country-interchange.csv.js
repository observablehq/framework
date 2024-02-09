import {csvFormat} from "d3-dsv";
import {json} from "d3-fetch";
import {timeDay, timeHour, utcDay} from "d3-time";
import {timeFormat, utcParse} from "d3-time-format";

const end = timeDay.offset(timeHour(new Date()), 1)
const start = timeHour(utcDay.offset(end, -7))
const convertDate = timeFormat("%m%d%Y %H:%M:%S") // Convert dates into the format the EIA web API expects

// Electricity exported (in GWh) from the lower 48 US states to Canada and Mexico
const countryInterchangeUrl = `https://www.eia.gov/electricity/930-api/interchange/series_data?type[0]=TI&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&from_respondent[0]=US48&timezone=Eastern&limit=10000&offset=0`

const tidySeries = (response, id, name) => {
  // The response is an array with one element, which has a data property which is a list of series
  let series = response[0].data
  // Flatten the series into one big array to turn our region data into a tidy series suitable for Plot
  // TODO: It would be better to check for hourly vs daily more efficiently.
  let datetimeFormat = utcParse("%m/%d/%Y %H:%M:%S")
  let dateFormat = utcParse("%m/%d/%Y")
  return series.flatMap(s => {
    return s.VALUES.DATES.map((d,i) => {
      return {
        id: s[id],
        name: s[name],
        date: datetimeFormat(d) ?? dateFormat(d),
        value: s.VALUES.DATA[i]
      }
    })
  })
}

const countryInterchangeSeries = await json(countryInterchangeUrl).then(response => {
  return tidySeries(response, "TO_RESPONDENT_ID", "TO_RESPONDENT_NAME")
})

process.stdout.write(csvFormat(countryInterchangeSeries));
