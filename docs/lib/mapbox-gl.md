# Mapbox GL JS

[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) is a library for building web maps and web applications with Mapbox's modern mapping technology. Mapbox GL JS is available by default as `mapboxgl` in Markdown, but you can import it explicitly like so:

```js echo
import mapboxgl from "npm:mapbox-gl";
```

When this library is invoked on a page, Observable Markdown automatically imports the required styles.

To use in a JavaScript code block, create a container div with the appropriate dimensions, then call the Map method:

```js echo
const container = display(html`<div style="width: 696px; height: 400px;">`);
const map = new mapboxgl.Map({
  container,
  accessToken: "pk.eyJ1IjoiZmlsIiwiYSI6ImNscnV0ZWMzdzA2c2wybm14NGdhbDBqeXkifQ.he-qZ179Xez4BkAMk6vRfA",
  center: [2.2932, 48.86069], // starting position [longitude, latitude]
  zoom: 15.1,
  pitch: 62,
  bearing: -20
});
invalidation.then(() => map.remove());
```

You will need to create a [Mapbox account](https://account.mapbox.com/) and obtain an API access token for your project.

For inspiration, see Mapbox’s [examples page](https://docs.mapbox.com/mapbox-gl-js/example/).
