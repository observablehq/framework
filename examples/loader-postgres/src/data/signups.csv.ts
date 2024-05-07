import {csvFormat} from "d3-dsv";
import {utcDay} from "d3-time";
import {run} from "./postgres.js";

const end = utcDay();
const start = utcDay.offset(end, -90);

process.stdout.write(
  csvFormat(
    await run(
      (sql) =>
        sql`SELECT DATE_TRUNC('day', create_time) AS "date", COUNT(*) AS "count"
FROM users
WHERE create_time between ${start} and ${end}
GROUP BY 1
ORDER BY 1 DESC`
    )
  )
);
