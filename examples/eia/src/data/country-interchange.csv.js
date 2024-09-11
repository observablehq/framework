import "dotenv/config";
import * as d3 from "d3";

// Access key from .env
const {EIA_KEY} = process.env;

const end = d3.timeDay.offset(d3.timeHour(new Date()), 1);
const start = d3.timeHour(d3.utcDay.offset(end, -7));
const convertDate = d3.timeFormat("%Y-%m-%dT%H");

// Electricity exported (in GWh) from the lower 48 US states to Canada and Mexico
const countryInterchangeUrl = `https://api.eia.gov/v2/electricity/rto/interchange-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&facets[fromba][]=US48&start=${convertDate(
  start
)}&end=${convertDate(end)}&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

const countryInterchange = await d3.json(countryInterchangeUrl);

const dateParse = d3.utcParse("%Y-%m-%dT%H");

const countryInterchangeSeries = await countryInterchange.response.data.map((d) => ({
  id: d.toba,
  name: d["toba-name"],
  date: dateParse(d.period),
  value: +d.value
}));

process.stdout.write(d3.csvFormat(countryInterchangeSeries));
