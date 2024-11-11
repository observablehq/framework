import {readFile} from "node:fs/promises";

process.stdout.write(`# Telemetry

Observable Framework collects anonymous usage data to help us improve the product. This data is sent to Observable and is not shared with third parties. Telemetry data is covered by [Observable’s privacy policy](https://observablehq.com/privacy-policy).

You can [opt-out of telemetry](#disabling-telemetry) by setting the \`OBSERVABLE_TELEMETRY_DISABLE\` environment variable to \`true\`.

## What is collected?

The following data is collected:

~~~ts run=false
${(await readFile("./src/telemetryData.d.ts", "utf-8")).trim()}
~~~

To inspect telemetry data, set the \`OBSERVABLE_TELEMETRY_DEBUG\` environment variable to \`true\`. This will print the telemetry data to stderr instead of sending it to Observable. See [\`telemetry.ts\`](https://github.com/observablehq/framework/blob/main/src/telemetry.ts) for source code.

## What is not collected?

We never collect identifying or sensitive information, such as environment variables, file names or paths, or file contents.

## Disabling telemetry

Setting the \`OBSERVABLE_TELEMETRY_DISABLE\` environment variable to \`true\` disables telemetry collection entirely. For example:

~~~sh
OBSERVABLE_TELEMETRY_DISABLE=true npm run build
~~~

Setting the \`OBSERVABLE_TELEMETRY_DEBUG\` environment variable to \`true\` also disables telemetry collection, instead printing telemetry data to stderr. Use this to inspect what telemetry data would be collected.
`);
