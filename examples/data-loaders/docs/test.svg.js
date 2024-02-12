import { csv } from "d3-fetch";
import * as Plot from "@observablehq/plot";

const penguins = await csv("https://raw.githubusercontent.com/allisonhorst/palmerpenguins/main/inst/extdata/penguins.csv");

const chart = Plot.plot({
    marks: [
        Plot.dot(penguins, { x: "flipper_length_mm", y: "body_mass_g" })
    ]
});

process.stdout.write(chart);