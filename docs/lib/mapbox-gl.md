---
keywords: geojson, maps
---

# Mapbox GL JS

[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) is a library for building web maps and web applications with Mapbox’s modern mapping technology. Mapbox GL JS is available by default as `mapboxgl` in Markdown, but you can import it explicitly like so:

```js echo
import mapboxgl from "npm:mapbox-gl";
```

If you import Mapbox GL JS, its stylesheet will automatically be added to the page.

To create a map, create a container element with the desired dimensions, then call the `Map` constructor:

```js echo
const div = display(document.createElement("div"));
div.style = "height: 400px;";

const map = new mapboxgl.Map({
  container: div,
  accessToken: ACCESS_TOKEN, // replace with your token, "pk.…"
  center: [2.2932, 48.86069], // starting position [longitude, latitude]
  zoom: 15.1,
  pitch: 62,
  bearing: -20
});

invalidation.then(() => map.remove());
```

```js
const ACCESS_TOKEN = "pk.eyJ1Ijoib2JzZXJ2YWJsZWhxLWVuZy1hZG1pbiIsImEiOiJjbHMxaTBwdDkwYnRsMmpxeG12M2kzdWFvIn0.Ga6eIWP2YNQrEW4FzHRcTQ";
```

<div class="tip">You will need to create a <a href="https://account.mapbox.com/">Mapbox account</a> and obtain an API access token. Replace <code>ACCESS_TOKEN</code> with your token above.</div>

For inspiration, see Mapbox’s [examples page](https://docs.mapbox.com/mapbox-gl-js/example/).
