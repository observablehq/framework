import {createCanvas} from "canvas";
import {geoPath} from "d3";
import * as topojson from "topojson-client";

// Get the map file from the US Atlas package
// https://github.com/topojson/us-atlas
const url = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-albers-10m.json";
const us = await fetch(url).then(response => response.json());

// Create and configure a canvas
const width = 975;
const height = 610;
const canvas = createCanvas(width * 2, height * 2);
const context = canvas.getContext("2d");
context.scale(2, 2);

// https://observablehq.com/@d3/u-s-map-canvas
context.lineJoin = "round";
context.lineCap = "round";
// Use the null projection, since coordinates in US Atlas are already projected.
const path = geoPath(null, context);

context.fillStyle = "#fff";
context.fillRect(0, 0, width, height);

context.beginPath();
path(topojson.mesh(us, us.objects.counties, (a, b) => a !== b && (a.id / 1000 | 0) === (b.id / 1000 | 0)));
context.lineWidth = 0.5;
context.strokeStyle = "#aaa";
context.stroke();

context.beginPath();
path(topojson.mesh(us, us.objects.states, (a, b) => a !== b));
context.lineWidth = 0.5;
context.strokeStyle = "#000";
context.stroke();

context.beginPath();
path(topojson.feature(us, us.objects.nation));
context.lineWidth = 1;
context.strokeStyle = "#000";
context.stroke();

// Write the canvas to a PNG buffer
const buffer = canvas.toBuffer("image/png");

// Pipe the buffer to process.stdout
process.stdout.write(buffer);
