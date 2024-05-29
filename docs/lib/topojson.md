---
keywords: geojson
---

# TopoJSON

[TopoJSON](https://github.com/topojson/topojson) is an extension of [GeoJSON](https://geojson.org/), a format for encoding geometry and geographic data structures, that further encodes topology. The [TopoJSON client](https://github.com/topojson/topojson-client) library allows you to transform compact TopoJSON files to GeoJSON and display a map with — for instance — [Leaflet](./leaflet), [D3](./d3), or [Observable Plot](./plot). The TopoJSON client library is available in Markdown as `topojson`, but you can also import it like so:

```js echo
import * as topojson from "npm:topojson-client";
```

To demonstrate, let’s load a file that describes the counties, states and general outline of the United States, already projected using [Albers’ equal area-conic projection](https://d3js.org/d3-geo/conic#geoAlbersUsa) to a frame of 975&times;610 pixels:

```js echo
const us = FileAttachment("counties-albers-10m.json").json();
```
```js echo
us
```

We can then create a GeoJSON object for each feature we want to display. First, the general outline of the nation:

```js echo
const nation = topojson.feature(us, us.objects.nation);
```
```js echo
nation
```

The counties mesh, which includes each of the delimitations once (instead of once per county). This avoids an additional stroke on the perimeter of the map, which would otherwise mask intricate features such as islands and inlets.

```js echo
const countiesmesh = topojson.mesh(us, us.objects.counties);
```
```js echo
countiesmesh
```

The _statemesh_ likewise contains the internal borders between states, _i.e._, everything but the coastlines and country borders.

```js echo
const statemesh = topojson.mesh(us, us.objects.states, (a, b) => a !== b)
```
```js echo
statemesh
```

Putting it together as a map using [Observable Plot](./plot):

```js echo
Plot.plot({
  projection: "identity",
  width: 975,
  height: 610,
  marks: [
    Plot.geo(countiesmesh, {strokeOpacity: 0.5}),
    Plot.geo(statemesh, {strokeWidth: 0.75}),
    Plot.geo(nation, {strokeWidth: 1.5})
  ]
})
```

If you need to manipulate topologies, for example to simplify the shapes on-the-fly, you may need to import the [TopoJSON server](https://github.com/topojson/topojson-server) and [TopoJSON simplify](https://github.com/topojson/topojson-simplify) libraries, too.

```js echo run=false
import {topology} from "npm:topojson-server";
import {presimplify, simplify} from "npm:topojson-simplify";
```

For more details, please refer to the [TopoJSON documentation](https://github.com/topojson).
