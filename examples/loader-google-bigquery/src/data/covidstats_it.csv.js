import { csvFormat, csvParse } from "d3-dsv";
import { runQuery } from "./google-bigquery.js";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const query = `
  SELECT 
    FORMAT_TIMESTAMP('%Y-%m-%d', date) as formatted_date, 
    confirmed_cases 
  FROM 
    \`bigquery-public-data.covid19_italy.data_by_province\` 
  WHERE 
    name = "Lombardia"
    AND province_name = "Lecco"
    AND date BETWEEN '2020-05-01 00:00:00 UTC' AND '2020-05-15 00:00:00 UTC'
  GROUP BY 1,2
  ORDER BY 1 ASC;
`;

(async () => {
  try {
    const rows = await runQuery(query);

    console.log("Query Results:", rows);

    if (rows.length === 0) {
      console.log("No data returned from the query.");
      return;
    }

    const csvData = csvFormat(
      rows.map(d => ({
        formatted_date: d.formatted_date,
        confirmed_cases: d.confirmed_cases
      }))
    );

    const filePath = join(__dirname, "covidstats_it.csv");
    await fs.writeFile(filePath, csvData);
    console.log(`CSV file written successfully to ${filePath}`);

    const fileContent = await fs.readFile(filePath, "utf8");
    const parsedData = csvParse(fileContent, { typed: true });

    console.log("Parsed Data:", parsedData);

  } catch (error) {
    console.error('Error running query or processing file:', error);
  }
})();