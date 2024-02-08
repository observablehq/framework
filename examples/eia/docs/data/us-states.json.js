import {readFileSync} from "node:fs";
import {merge, mesh} from "topojson-client";
import {presimplify, simplify} from "topojson-simplify";

const us = simplify(presimplify(JSON.parse(readFileSync("docs/data/us-counties-10m.json", "utf-8"))), 0.1);
us.objects.states.geometries = us.objects.states.geometries.filter(
  ({properties: {name}}) =>
    ![
      "Alaska",
      "Hawaii",
      "Guam",
      "Commonwealth of the Northern Mariana Islands",
      "American Samoa",
      "United States Virgin Islands",
      "Puerto Rico"
    ].includes(name)
);

process.stdout.write(
  JSON.stringify({
    type: "FeatureCollection",
    features: [
      {type: "Feature", id: "nation", geometry: merge(us, us.objects.states.geometries)},
      {type: "Feature", id: "statemesh", geometry: mesh(us, us.objects.states, (a, b) => a !== b)}
    ]
  }).replaceAll(/(\.(:?\d\d))\d+/g, "$1")
);
