import {csvFormat} from "d3-dsv";
import {run} from "./snowflake.js";

const start = new Date("2024-01-01");
const end = new Date("2024-01-08");

process.stdout.write(
  csvFormat(
    await run((query) =>
      query(
        `SELECT '/' || path AS "path", COUNT(*) AS "count"
FROM fct_api_logs
WHERE time between :1 and :2
AND STARTSWITH(path, 'document/@d3/')
GROUP BY 1
HAVING "count" >= 10
ORDER BY 2 DESC`,
        [start, end]
      )
    )
  )
);
