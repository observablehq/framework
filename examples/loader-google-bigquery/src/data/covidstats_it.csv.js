import {csvFormat} from "d3-dsv";
import {runQuery} from "./google-bigquery.js";

const rows = await runQuery(`
  SELECT 
    FORMAT_TIMESTAMP('%Y-%m-%d', date) as date, 
    confirmed_cases 
  FROM 
    \`bigquery-public-data.covid19_italy.data_by_province\` 
  WHERE 
    name = "Lombardia"
    AND province_name = "Lecco"
    AND date BETWEEN '2020-05-01 00:00:00 UTC' AND '2020-05-15 00:00:00 UTC'
  GROUP BY 1,2
  ORDER BY 1 ASC;
`);

process.stdout.write(csvFormat(rows));
