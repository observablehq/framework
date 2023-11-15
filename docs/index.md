# Observable CLI

```js
const width = 640;
const height = 320;
const betterPastel = ["#b0deff", "#ffd19a", "#fff8a6"];
const padRadius = 2;
const center = {r: 125};
const random = d3.randomUniform.source(d3.randomLcg(42))(5, 20);
const circles = Array.from({length: 600}, (_, i) => ({r: random()}));

d3.packSiblings([center, ...circles]);

for (const c of circles) {
  c.x = Math.round(c.x - center.x);
  c.y = Math.round(c.y - center.y);
}

center.x = center.y = 0;

const svg = d3
  .create("svg")
  .attr("viewBox", `${-width / 2} ${-height / 2} ${width} ${height}`)
  .attr("style", "width: 100%; height: auto; display: block;");

svg
  .selectAll()
  .data(circles)
  .join("circle")
  .attr("cx", (d) => d.x)
  .attr("cy", (d) => d.y)
  .attr("fill", (d, i) => betterPastel[i % 3])
  .attr("r", 0)
  .on("pointerenter", (event, d) =>
    d3
      .select(event.currentTarget)
      .transition()
      .ease(d3.easeCircleOut)
      .attr("r", 0)
      .transition()
      .delay(5000)
      .attr("r", Math.max(1, d.r - padRadius))
  )
  .transition()
  .delay((d, i) => i * 3)
  .attr("r", (d) => Math.round(Math.max(1, d.r - padRadius)));

svg
  .append("path")
  .attr("transform", `scale(${(center.r - padRadius) / 12}) translate(-12,-12)`)
  .attr("fill", "currentColor")
  .attr(
    "d",
    "M12.1450213,20.7196596 C11.0175263,20.7196596 10.0411956,20.4623004 9.216,19.9475745 C8.39080438,19.4328485 7.75761923,18.7343023 7.31642553,17.8519149 C6.87523184,16.9695275 6.55251166,16.0340475 6.34825532,15.0454468 C6.14399898,14.0568461 6.04187234,12.990644 6.04187234,11.8468085 C6.04187234,10.9971021 6.09497819,10.1841741 6.20119149,9.408 C6.30740479,8.63182591 6.50348793,7.84340826 6.78944681,7.0427234 C7.07540569,6.24203855 7.44306158,5.54757741 7.89242553,4.95931915 C8.34178948,4.37106089 8.93003892,3.89310822 9.65719149,3.52544681 C10.3843441,3.1577854 11.2136124,2.97395745 12.1450213,2.97395745 C13.2725163,2.97395745 14.2488469,3.23131658 15.0740426,3.74604255 C15.8992382,4.26076853 16.5324233,4.95931474 16.973617,5.84170213 C17.4148107,6.72408952 17.7375309,7.65956953 17.9417872,8.64817021 C18.1460436,9.6367709 18.2481702,10.702973 18.2481702,11.8468085 C18.2481702,12.6965149 18.1950644,13.5094429 18.0888511,14.285617 C17.9826378,15.0617911 17.7824696,15.8502088 17.4883404,16.6508936 C17.1942113,17.4515785 16.8265554,18.1460396 16.3853617,18.7342979 C15.944168,19.3225561 15.3600036,19.8005088 14.6328511,20.1681702 C13.9056985,20.5358316 13.0764302,20.7196596 12.1450213,20.7196596 Z M14.245196,13.9469832 C14.8285807,13.3635984 15.1202688,12.6635472 15.1202688,11.8468085 C15.1202688,11.0300698 14.8358729,10.3300186 14.2670728,9.74663382 C13.6982726,9.16324904 12.9909292,8.87156103 12.1450213,8.87156103 C11.2991134,8.87156103 10.5917699,9.16324904 10.0229698,9.74663382 C9.45416961,10.3300186 9.1697738,11.0300698 9.1697738,11.8468085 C9.1697738,12.6635472 9.45416961,13.3635984 10.0229698,13.9469832 C10.5917699,14.530368 11.2991134,14.822056 12.1450213,14.822056 C12.9909292,14.822056 13.6909804,14.530368 14.245196,13.9469832 Z M12,24 C18.627417,24 24,18.627417 24,12 C24,5.372583 18.627417,0 12,0 C5.372583,0 0,5.372583 0,12 C0,18.627417 5.372583,24 12,24 Z"
  );

display(svg.node());
```

The **Observable command-line interface (CLI)** is a static site generator for creating beautiful notebooks, reports, and dashboards written in Markdown with reactive JavaScript. Use it to

- develop and preview pages locally; and
- build and host pages on any static file server, including GitHub Pages.

Current features:

- [Observable Markdown](./markdown)
- [Reactive JavaScript](./javascript/), as both fenced code blocks and inline expressions
- Import from npm and local ES modules
- Local preview server with hot module replacement
- Static site generator
- File attachments
- Light and dark mode
- Navigation sidebar

In development:

- Table of contents sidebar
- Database queries
- Database query snapshots
- Data tables for interactive visual summaries of tabular data
- SQL code blocks
- Server-side fetch
- Server-side fetch snapshots
- Secrets (environment variables)
- ${tex`\TeX`} and Graphviz blocks
- Incremental reloading for file attachments
- Custom headers, footers, and themes

In the future, the Observable CLI will integrate seamlessly with the [Observable cloud platform](https://observablehq.com), making it easy for you to deploy and develop pages collaboratively with your team.
