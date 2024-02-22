import * as Plot from "npm:@observablehq/plot"
import {extent, format, timeFormat} from "npm:d3"

// Top 5 balancing authorities chart
export function top5BalancingAuthoritiesChart(width, height, top5Demand, maxDemand) {
  return Plot.plot({
    marginTop: 8,
    marginLeft: 250,
    height: height - 4,
    width,
    y: {label: null, tickSize: 0},
    x: {label: null, grid: true, tickSize: 0, tickPadding: 2, domain: [0, maxDemand / 1000], nice: true},
    marks: [
      Plot.barX(top5Demand, {
        y: "name",
        x: (d) => d.value / 1000,
        fill: "#9498a0",
        sort: {y: "x", reverse: true, limit: 10},
        tip: true,
        title: ({ name, value }) => `name: ${name}\ndemand: ${value / 1000} GWh`
      })
    ]
  })
}

// US electricity demand, generation and forecasting chart
export function usGenDemandForecastChart(width, height, detailData, summaryData, currentHour) {
  return Plot.plot({
    width,
    marginTop: 0,
    height: height - 50,
    y: {label: null},
    x: {type: "time", tickSize: 0, tickPadding: 3, label: "Date"},
    color: {
      legend: true,
      domain: ["Demand", "Day-ahead demand forecast", "Net generation"],
      range: ["#ff8ab7", "#6cc5b0", "#a463f2"]
    },
    tip: { frameAnchor: "bottom-left",  },
    grid: true,
    marks: [
      Plot.ruleX([currentHour], {strokeOpacity: 0.5}),
      Plot.line(detailData, {x: "date", y: (d) => d.value / 1000, stroke: "name", strokeWidth: 1.2}),
      Plot.ruleX(summaryData, Plot.pointerX({
        x: "date",
        strokeDasharray: [2,2],
        channels: {
          date: {value: "date", label: "Date"},
          d: {value: "D", label: "Demand"},
          df: {value: "DF", label: "Demand forecast"},
          ng: {value: "NG", label: "Net generation"}
        },
        tip: {
          format: {
            date: (d) => timeFormat("%-m/%-d %-I %p")(d),
            d: (d) => `${format(".1f")(d / 1000)} GWh`,
            df: (d) => `${format(".1f")(d / 1000)} GWh`,
            ng: (d) => `${format(".1f")(d / 1000)} GWh`
          },
          fontSize: 12,
          anchor: "bottom",
          frameAnchor: "top"
        }
      }))
    ]
  })
}

// Canada & Mexico interchange area chart
export function countryInterchangeChart(width, height, usDemandGenForecast, countryInterchangeSeries, currentHour) {
  return Plot.plot({
    width,
    marginTop: 0,
    height: height - 50,
    color: {legend: true, range: ["#B6B5B1", "#848890"]},
    grid: true,
    x: {type: "time", domain: extent(usDemandGenForecast.map((d) => d.date)), tickSize: 0, tickPadding: 3},
    y: {label: "GWh exported", labelOffset: 0, tickSize: 0, tickSpacing: 20},
    marks: [
      Plot.ruleX([currentHour], {strokeOpacity: 0.5}),
      Plot.areaY(countryInterchangeSeries, {
        x: "date",
        y: (d) => d.value / 1000,
        curve: "step",
        fill: "name",
        tip: true
      }),
      Plot.ruleY([0], {strokeOpacity: 0.3})
    ]
  })
}
