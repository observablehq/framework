// Code adapted (barely) from Mike Bostock's Donut chart notebook (https://observablehq.com/@d3/donut-chart/2)

import * as d3 from "npm:d3";

export function donutChart(data, centerText, width, colorScale) {
  const height = width;
  const radius = Math.min(width, height) / 2;

  const arc = d3
    .arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius - 1);

  const pie = d3
    .pie()
    .padAngle(1 / radius)
    .sort(null)
    .value((d) => d.value);

  const color = d3
    .scaleOrdinal()
    .domain(data.map((d) => d.name))
    .range(colorScale);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  svg
    .append("g")
    .selectAll()
    .data(pie(data))
    .join("path")
    .attr("fill", (d) => color(d.data.name))
    .attr("d", arc)
    .append("title")
    .text((d) => `${d.data.name}: ${d.data.value.toLocaleString()}`);

  svg
    .append("g")
    .attr("font-family", "sans-serif")
    .attr("font-size", 11)
    .attr("text-anchor", "middle")
    .selectAll()
    .data(pie(data))
    .join("text")
    .attr("transform", (d) => `translate(${arc.centroid(d)})`)
    .call((text) =>
      text
        .append("tspan")
        .filter((d) => d.endAngle - d.startAngle > 0.1)
        .attr("y", "-0.5em")
        .attr("font-weight", "bold")
        .text((d) => d.data.name)
    )
    .call((text) =>
      text
        .filter((d) => d.endAngle - d.startAngle > 0.25)
        .append("tspan")
        .attr("x", 0)
        .attr("y", "0.7em")
        .attr("fill-opacity", 0.7)
        .text((d) => d.data.value.toLocaleString("en-US"))
    );

  svg
    .append("text")
    .attr("text-anchor", "middle")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text(centerText);

  return svg.node();
}
