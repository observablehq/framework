import * as d3 from "d3"

// Construct web API call for last 7 days of hourly demand data in MWh
// Types: DF = forecasted demand, D = demand (actual), NG = net generation
const end = d3.timeDay.offset(d3.timeHour(new Date()), 1)
const start = d3.timeHour(d3.utcDay.offset(end, -7))
const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S")
const usDemandUrl = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=DF&type[1]=D&type[2]=NG&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`

const tidySeries = (response, id, name) => {
  const datetimeFormat = d3.utcParse("%m/%d/%Y %H:%M:%S")
  const dateFormat = d3.utcParse("%m/%d/%Y")

  let series = response[0].data
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

const detailSeries = await d3.json(usDemandUrl).then(response => {
  return tidySeries(response, "TYPE_ID", "TYPE_NAME")  
});

// Roll up an hourly summary of the 1 to 3 values into a single string that can be shown as a tip
const summaryMap = detailSeries.reduce((map, d) => {
  let summary = map.get(d.date.valueOf()) || ""
  summary += `\n${d.name}: ${d3.format(".1f")(d.value / 1000)} GWh`
  map.set(d.date.valueOf(), summary)
  return map
}, new Map())

// Add the tip to every row
detailSeries.forEach((d) => d.textSummary = summaryMap.get(d.date.valueOf()))

process.stdout.write(d3.csvFormat(detailSeries))