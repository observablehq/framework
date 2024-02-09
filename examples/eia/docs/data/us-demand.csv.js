import * as d3 from "d3";

const end = d3.timeDay.offset(d3.timeHour(new Date()), 1)

const start = d3.timeHour(d3.utcDay.offset(end, -7))

const convertDate = d3.timeFormat("%m%d%Y %H:%M:%S")

const usDemandUrl = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=D&type[1]=DF&type[2]=NG&type[3]=TI&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`

const tidySeries = (response, id, name) => {
    let series = response[0].data
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

const usOverviewSeries = await d3.json(usDemandUrl).then(response => {
    return tidySeries(response, "TYPE_ID", "TYPE_NAME")
  });

process.stdout.write(d3.csvFormat(usOverviewSeries));
