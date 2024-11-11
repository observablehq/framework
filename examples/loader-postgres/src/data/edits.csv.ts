import {csvFormat} from "d3-dsv";
import {run} from "./postgres.js";

process.stdout.write(
  csvFormat(
    await run(
      (sql) =>
        sql`WITH counts AS (SELECT DATE_TRUNC('day', e.time) AS "date", COUNT(*) AS "count"
  FROM document_events e
  JOIN documents d ON d.id = e.id
  JOIN users u ON u.id = d.user_id
  WHERE u.login = 'd3'
  GROUP BY 1)
SELECT g.date, COALESCE(c.count, 0) AS count
FROM GENERATE_SERIES(DATE '2019-01-01', DATE '2019-12-31', INTERVAL '1 DAY') AS g(date)
LEFT JOIN counts c ON c.date = g.date
ORDER BY 1 DESC`
    )
  )
);
