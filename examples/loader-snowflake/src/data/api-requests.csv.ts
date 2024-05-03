import {csvFormat} from "d3-dsv";
import {utcDay} from "d3-time";
import {run} from "./snowflake.js";

const end = utcDay();
const start = utcDay.offset(end, -1);

process.stdout.write(
  csvFormat(
    await run((query) =>
      query(
        `SELECT normalized_path AS "path", COUNT(*) AS "count"
FROM fct_api_logs
WHERE time between :1 and :2
GROUP BY 1
ORDER BY 2 DESC`,
        [start, end]
      )
    )
  )
);
