import { extent } from "npm:d3-array";
import { format } from "npm:d3-format";
import * as Plot from "npm:@observablehq/plot";

// Colors and scale
const colorGenerating = "#88DCAD";
const colorUnavailable = "gray";
const color = Plot.scale({
  color: {
    type: "linear",
    domain: [-1, -.1501, -.15, 0, .15, .1501, 1],
    range: ["darkblue", "darkblue", "steelblue", "white", "orange", "darkorange", "darkorange"]
  }
});

// US map
export function balancingAuthoritiesMap({
  baHourlyChange,
  baHourlyLatest,
  eiaConnRefSpatial,
  eiaPoints,
  genOnlyBA,
  nation,
  statemesh,
  width
}) {
  return Plot.plot({
    width: Math.min(width, 620),
    height: Math.min(width, 620) * 0.6,
    color: {
      ...color,
      transform: (d) => d / 100,
      label: "Change in demand (%) from previous hour"
    },
    projection: {
      type: "albers",
      insetTop: 15,
    },
    r: {
      domain: extent(eiaPoints, (d) => d.radius),
      range: [4, 30]
    },
    marks: [
      Plot.geo(nation, { fill: "currentColor", fillOpacity: 0.1,  stroke: "var(--theme-background-alt)" }),
      Plot.geo(statemesh, { stroke: "var(--theme-background-alt)", strokeWidth: 0.8}),
      Plot.arrow(eiaConnRefSpatial, {
        filter: (d) => d.location1[0] > d.location2[0],
        x1: (d) => d.location1[0],
        y1: (d) => d.location1[1],
        x2: (d) => d.location2[0],
        y2: (d) => d.location2[1],
        stroke: "currentColor",
        strokeWidth: 0.5,
        opacity: 0.7,
        bend: 7,
        headLength: 0
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: "radius",
        stroke: "gray",
        strokeWidth: 1,
        filter: (d) => isNaN(baHourlyChange.get(d.name)) && !(d.region_id === "MEX" || d.region_id === "CAN"),
        fill: "#6D6D6D"
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: 4,
        symbol: "square",
        stroke: "gray",
        strokeWidth: 1,
        filter: (d) => d.region_id === "MEX" || d.region_id === "CAN",
        fill: "#6D6D6D"
      }),
      Plot.dot(eiaPoints, {
        filter: (d) => genOnlyBA.includes(d.id),
        x: "lon",
        y: "lat",
        r: "radius",
        fill: colorGenerating,
        stroke: "gray",
        strokeWidth: 1
      }),
      Plot.dot(eiaPoints, {
        x: "lon",
        y: "lat",
        r: "radius",
        stroke: colorUnavailable,
        strokeWidth: 1,
        filter: (d) => !isNaN(baHourlyChange.get(d.name)),
        fill: (d) => baHourlyChange.get(d.name)
      }),
      Plot.text(eiaPoints, {
        x: "lon",
        y: "lat",
        text: (d) => (d.radius > 10000 ? d.id : null),
        fontWeight: 800,
        fill: "black"
      }),
      Plot.tip(
        eiaPoints,
        Plot.pointer({
          x: "lon",
          y: "lat",
          title: (d) => d.region_id === "MEX" || d.region_id === "CAN" ? d.name :
            `${d.name} (${d.id})\nChange from previous hour: ${
              isNaN(baHourlyChange.get(d.name))
                ? "Unavailable"
                : baHourlyChange.get(d.name).toFixed(1) + "%"
            }\nLatest hourly demand: ${
              isNaN(baHourlyLatest.get(d.name))
                ? "Unavailable"
                : (baHourlyLatest.get(d.name) / 1000).toFixed(2) + " GWh"
            }`
        })
      )
    ]
  });
}

// Map legend
export function balancingAuthoritiesLegend(width) {
  return Plot.plot({
    marginTop: 15,
    width: Math.min(width - 30, 400),
    height: 60,
    y: { axis: null },
    marks: [
      Plot.raster({
        y1: 0,
        y2: 1,
        x1: -.19,
        x2: .19,
        fill: (x, y) => color.apply(x)
      }),
      Plot.ruleX([-.15, 0, .15], { insetBottom: -5 }),
      Plot.axisX([-.15, 0, .15], { tickFormat: format("+.0%"), tickSize: 0 }),
      Plot.dot(["Generating only", "Unavailable"], {
        x: [.23, .40],
        r: 5,
        dx: -8,
        fill: [colorGenerating, colorUnavailable],
        stroke: "grey"
      }),
      Plot.text(["Generating only", "Unavailable"], {
        x: [.23, .40],
        textAnchor: "start"
      })
    ]
  });
}
