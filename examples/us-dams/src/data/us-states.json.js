import {readFileSync} from "node:fs";
import {merge, mesh} from "topojson-client";
import {presimplify, simplify} from "topojson-simplify";

const us = simplify(presimplify(JSON.parse(readFileSync("src/data/us-counties-10m.json", "utf-8"))), 0.005);

process.stdout.write(
  JSON.stringify({
    type: "FeatureCollection",
    features: [
      {type: "Feature", id: "nation", geometry: merge(us, us.objects.states.geometries)},
      {type: "Feature", id: "statemesh", geometry: mesh(us, us.objects.states, (a, b) => a !== b)}
    ]
  }).replaceAll(/(\.(:?\d\d))\d+/g, "$1")
);
