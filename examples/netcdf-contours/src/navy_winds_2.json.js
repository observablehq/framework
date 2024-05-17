import {readFile} from "node:fs/promises";
import {merge} from "d3-array";
import {contours} from "d3-contour";
import {geoStitch} from "d3-geo-projection";
import {NetCDFReader} from "netcdfjs";

// rearrange the data to go from 90° (North pole) to -90° (South pole)
function topdown(values, isize, jsize) {
  const v = new Float32Array(values);
  for (let j = 0; j < jsize; j++) {
    for (let i = 0; i < isize; i++) {
      v[(jsize - 1 - j) * isize + i] = values[j * isize + i];
    }
  }
  return v;
}

// torus: copy left column to the right
function cylinder(values, isize, jsize) {
  // return values;
  const v = new Float32Array(jsize * (isize + 1));
  for (let j = 0; j < jsize; j++) {
    for (let i = 0; i < isize + 1; i++) {
      v[j * (isize + 1) + i] = values[j * isize + (i % isize)];
    }
  }
  return v;
}

// Invert the pixel coordinates to [longitude, latitude]. This assumes the
// source GeoTIFF is in equirectangular coordinates.
//
// Note that inverting the projection breaks the polygon ring associations:
// holes are no longer inside their exterior rings. Fortunately, since the
// winding order of the rings is consistent and we’re now in spherical
// coordinates, we can just merge everything into a single polygon!
//
// We fix the cusps by: Adding contact points so that stitching works even if
// only 1 point is situated on either side of the antimeridian line; After
// stitching, removing the shared points (at 180°), as their latitude might be
// off, creating cusps.
//
// https://observablehq.com/@d3/geotiff-contours-ii
function invert(d) {
  const epsilon = 1e-5;
  const shared = {};

  let p = {
    type: "Polygon",
    coordinates: merge(
      d.coordinates.map((polygon) =>
        polygon.map((ring) =>
          ring.map((point) => [(point[0] / (isize + 1)) * 360 - 180, 90 - (point[1] / jsize) * 180]).reverse()
        )
      )
    )
  };

  // Add contact points with the antimeridian.
  p.coordinates = p.coordinates.map((ring) => {
    ring.pop();
    const r = [];
    for (let i = 0, l = ring.length; i < l; i++) {
      const p = ring[i];
      if (p[0] === 180 && ring[(i + l - 1) % l][0] < 180) r.push([p[0], p[1] + epsilon]);
      if (p[0] === -180 && ring[(i + l - 1) % l][0] > -180) r.push([p[0], p[1] - epsilon]);
      r.push(p);
      if (p[0] === 180 && ring[(i + 1) % l][0] < 180) r.push([p[0], p[1] - epsilon]);
      if (p[0] === -180 && ring[(i + 1) % l][0] > -180) r.push([p[0], p[1] + epsilon]);
    }
    r.push(r[0]);
    return r;
  });

  // Record the y-intersections with the antimeridian.
  p.coordinates.forEach((ring) => {
    ring.forEach((p) => {
      if (p[0] === -180 || p[0] === 180) {
        shared[p[1]] |= p[0] === -180 ? 1 : 2;
      }
    });
  });

  // Offset any unshared antimeridian points to prevent their stitching.
  p.coordinates.forEach((ring) => {
    ring.forEach((p) => {
      if ((p[0] === -180 || p[0] === 180) && shared[p[1]] !== 3) {
        p[0] = p[0] === -180 ? -179.9995 : 179.9995;
      }
    });
  });

  p = geoStitch(p);

  // After stitching remove the shared points -- they are off
  // see https://github.com/d3/d3-contour/issues/25
  p.coordinates = p.coordinates
    .map((ring) => {
      ring.pop();
      ring = ring.map((p) => {
        var p0 = ((p[0] + 180) * (isize + 1)) / isize - 180;
        return [p0, p[1]];
      });
      ring = ring.filter((p) => Math.abs(p[0]) < 179.9999);
      ring.push(ring[0]);
      return ring;
    })
    .filter((ring) => ring.length > 0);

  // If the MultiPolygon is empty, treat it as the Sphere.
  return p.coordinates.length
    ? {type: "Polygon", coordinates: p.coordinates, value: d.value}
    : {type: "Sphere", value: d.value};
}

const data = await readFile(new URL("./navy_winds_2.nc", import.meta.url));

const reader = new NetCDFReader(data);
const isize = reader.header.dimensions[0].size;
const jsize = reader.header.dimensions[1].size;

let values = reader.getDataVariable("UWND");
values = topdown(values, isize, jsize);
values = cylinder(values, isize, jsize);

const contour = contours()
  .smooth(true)
  .size([isize + 1, jsize]);

let polygons = contour(values);
polygons = polygons.map(invert);

process.stdout.write(JSON.stringify(polygons));
