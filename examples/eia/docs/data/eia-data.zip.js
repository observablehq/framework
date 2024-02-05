import "dotenv/config";
import JSZip from "jszip";
import {timeDay, timeHour, utcDay} from "d3-time";
import {json} from "d3-fetch";
import {csvFormat} from "d3-dsv";

// Access key from .env
const {EIA_KEY} = process.env;

// Start and end dates
const end = timeDay.offset(timeHour(new Date()), 1);
const start = timeHour(utcDay.offset(end, -7));

// BA Interchange
const baInterchangeUrl = `https://api.eia.gov/v2/electricity/rto/interchange-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

const baInterchange = await json(baInterchangeUrl);

// BA Hourly Demand
const baHourlyUrl = `https://api.eia.gov/v2/electricity/rto/region-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

const baHourly = await json(baHourlyUrl);

// Sub-BA Hourly Demand
const subregionHourlyUrl = `https://api.eia.gov/v2/electricity/rto/region-sub-ba-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;
const subregionHourly = await json(subregionHourlyUrl);

// Country interchange
//const countryInterchangeUrl = `https://api.eia.gov/v2/electricity/rto/interchange/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`

//const countryInterchange = await json(countryInterchangeUrl);;

// By fuel type
const fuelTypeUrl = `https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=${EIA_KEY}&frequency=hourly&data[0]=value&start=${start.toISOString().substring(0, 10)}T00&end=${end.toISOString().substring(0, 10)}T00&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=5000`;

const fuelType = await json(fuelTypeUrl);

// Zip
const zip = new JSZip();

zip.file("ba-interchange.csv", csvFormat(baInterchange.response.data));
zip.file("ba-hourly.csv", csvFormat(baHourly.response.data));
zip.file("fuel-type.csv", csvFormat(fuelType.response.data));
zip.file("subregion-hourly.csv", csvFormat(subregionHourly.response.data));

zip.generateNodeStream().pipe(process.stdout);