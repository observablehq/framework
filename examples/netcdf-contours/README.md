[Framework examples →](../)

# From NetCDF to GeoJSON contours

View live: <https://observablehq.observablehq.cloud/framework-example-netcdf-contours/>

This Observable Framework example demonstrates how to use the [`netcdfjs` library](https://github.com/cheminfo/netcdfjs) to read a NetCDF file within a JavaScript data loader, and then convert to GeoJSON using [d3-geo-voronoi](https://github.com/Fil/d3-geo-voronoi). The resulting geometry is displayed using Observable Plot. The data loader is in [`src/data/navy_winds_2.json.js`](./src/data/navy_winds_2.json.js). The example data is global marine winds from NOAA’s Pacific Marine Environmental Laboratory.
