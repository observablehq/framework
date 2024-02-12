import * as Plot from "npm:@observablehq/plot";
import {FileAttachment} from "npm:@observablehq/stdlib";
// import * as d3 from "npm:d3";
import * as topojson from "npm:topojson-client";

const world = await FileAttachment("../data/countries-110m.json").json();

// const countryLookup = d3.rollup(
//   countries,
//   (v) => v[0].engagementRate,
//   (d) => (d.country === "United States" ? "United States of America" : d.country)
// );

const countryShapes = topojson.feature(world, world.objects.countries);
// const countryData = countryShapes.features.map((d) => ({...d, value: countryLookup.get(d.properties.name)}));

export function worldMap(data, {width, height, title, caption} = {}) {
  return Plot.plot({
    width,
    height,
    caption,
    projection: "equal-earth",
    color: {
      scheme: "cool",
      legend: true,
      label: "Engagement rate",
      tickFormat: "%"
    },
    marks: [
      Plot.graticule(),
      Plot.geo(countryShapes, {
        fill: "var(--theme-foreground-fainter)",
        stroke: "var(--theme-foreground)",
        strokeWidth: 0.25
      }),
      Plot.geo(countryShapes, {
        fill: "value",
        stroke: "var(--theme-foreground)",
        strokeWidth: 0.5
      }),
      Plot.sphere()
    ]
  });
}
