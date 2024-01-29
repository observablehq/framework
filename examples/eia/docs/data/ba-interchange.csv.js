import {timeDay, timeHour, utcDay} from "d3-time";
import {json} from "d3-fetch";
import {csvFormat} from "d3-dsv";

// Access key from .env
const {EIA_KEY} = process.env;

// Start and end dates
const end = timeDay.offset(timeHour(new Date()), 1);
const start = timeHour(utcDay.offset(end, -7));

// API query URL (tested here: https://observablehq.com/d/38e29b37f54d91b5)
const baInterchangeUrl = `https://api.eia.gov/v2/electricity/rto/interchange-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

// Get json and data
const baInterchangeJSON = await json(baInterchangeUrl);
const baInterchange = baInterchangeJSON.response.data;

// Write to standard output
process.stdout.write(csvFormat(baInterchange.response.data));