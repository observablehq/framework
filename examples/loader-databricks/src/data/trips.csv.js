import {csvFormat} from "d3-dsv";
import {executeStatement} from "./databricks.js";

process.stdout.write(csvFormat(await executeStatement("SELECT * FROM samples.nyctaxi.trips LIMIT 100")));
