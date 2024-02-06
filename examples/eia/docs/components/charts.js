import {extent} from "npm:d3-array";
import * as Plot from "npm:@observablehq/plot";

// Top 5 balancing authorities chart
export function top5BalancingAuthoritiesChart(width, height, top5LatestDemand) {
  return Plot.plot({
    marginTop: 0,
    marginLeft: 250,
    height: height - 20,
    width,
    y: {label: null},
    x: {label: null, grid: true},
    marks: [
      Plot.barX(top5LatestDemand, {
        y: "name",
        x: (d) => d.value / 1000,
        fill: "gray",
        sort: {y: "x", reverse: true, limit: 10}
      }),
      Plot.ruleX([0])
    ]
  });
}

// US electricity demand, generation and forecasting chart
export function usGenDemandForecastChart(width, height, usDemandGenForecast) {
  return Plot.plot({
    width,
    marginTop: 0,
    height: height - 50,
    y: {label: null},
    x: {type: "time"},
    color: {
      legend: true,
      domain: ["Day-ahead demand forecast", "Demand", "Net generation"],
      range: ["#6cc5b0", "#ff8ab7", "#a463f2"]
    },
    grid: true,
    marks: [
      Plot.line(usDemandGenForecast, {x: "date", y: (d) => d.value / 1000, stroke: "name", strokeWidth: 1.2, tip: true})
    ]
  });
}

// Canada & Mexico interchange area chart
export function countryInterchangeChart(width, height, usDemandGenForecast, countryInterchangeSeries) {
  return Plot.plot({
    width,
    marginTop: 0,
    height: height - 50,
    color: {legend: true, range: ["#B6B5B1", "gray"]},
    grid: true,
    y: {label: null},
    x: {type: "time", domain: extent(usDemandGenForecast.map((d) => d.date))},
    marks: [
      Plot.areaY(countryInterchangeSeries, {x: "date", y: (d) => d.value / 1000, curve: "step", fill: "id", tip: true}),
      Plot.ruleY([0])
    ]
  });
}
