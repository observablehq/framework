// Import d3 functions:
import { tsvFormat } from "d3-dsv";
import { json } from "d3-fetch";
import { timeDay, timeHour, utcDay } from "d3-time";
import { timeFormat, utcParse } from "d3-time-format";

// Time endpoints and conversion to EIA API expected format
const end = timeDay.offset(timeHour(new Date()), 1)
const start = timeHour(utcDay.offset(end, -7))
const convertDate = timeFormat("%m%d%Y %H:%M:%S")

// Access and wrangle data
const url = `https://www.eia.gov/electricity/930-api/region_data/series_data?type[0]=D&type[1]=DF&type[2]=NG&type[3]=TI&start=${convertDate(start)}&end=${convertDate(end)}&frequency=hourly&timezone=Eastern&limit=10000&respondent[0]=US48`

const tidySeries = (response, id, name) => {
    let series = response[0].data
    return series.flatMap(s => {
        return s.VALUES.DATES.map((d, i) => {
            return {
                id: s[id],
                name: s[name],
                date: d,
                value: s.VALUES.DATA[i]
            }
        })
    })
}

const usElectricity = await json(url).then(response => {
    return tidySeries(response, "TYPE_ID", "TYPE_NAME")
});

// Write to stdout as TSV
process.stdout.write(tsvFormat(usElectricity));