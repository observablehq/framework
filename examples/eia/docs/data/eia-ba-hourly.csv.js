import * as d3 from "d3";
import {readFileSync} from "node:fs";

// BA Hourly Demand
const regions = new Set([
  "California",
  "Carolinas",
  "Central",
  "Florida",
  "Mid-Atlantic",
  "Midwest",
  "New England",
  "New York",
  "Northwest",
  "Southeast",
  "Southwest",
  "Tennessee",
  "Texas",
  "United States Lower 48"
]);

const baHourlyData = JSON.parse(readFileSync("docs/data/baHourlyJSON-20240401-20240403.json"));

const baHourly = baHourlyData.response.data
  .filter((d) => d.type == "D") // Only use demand ("D")
  .filter((d) => !regions.has(d["respondent-name"])) // Exclude regions
  .map((d) => ({
    period: d.period,
    ba: d["respondent-name"],
    baAbb: d.respondent,
    value: d.value
  }));

process.stdout.write(d3.csvFormat(baHourly));
