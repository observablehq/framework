import "dotenv/config";
import * as d3 from "d3";

// Access key from .env
const {EIA_KEY} = process.env;

// Construct web API call for last 7 days of hourly demand data in MWh
const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);
const start = d3.timeHour(d3.utcDay.offset(end, -7));
const convertDate = d3.timeFormat("%Y-%m-%dT%H");

const usDemandUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&facets[respondent][]=US48&start=${convertDate(
  start
)}&end=${convertDate(end)}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

// Types: DF = forecasted demand, D = demand (actual), NG = net generation, TI = total interchange
const typeNameRemap = {DF: "demandForecast", D: "demandActual", NG: "netGeneration", TI: "totalInterchange"};

const usDemandJSON = await d3.json(usDemandUrl);

const dateParse = d3.utcParse("%Y-%m-%dT%H");

const usDemand = await usDemandJSON.response.data.map((d) => ({
  name: typeNameRemap[d.type],
  date: dateParse(d.period),
  value: +d.value
}));

process.stdout.write(d3.csvFormat(usDemand));
