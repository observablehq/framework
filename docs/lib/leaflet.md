---
keywords: geojson, maps
---

# Leaflet

[Leaflet](https://leafletjs.com/) is an “open-source JavaScript library for mobile-friendly interactive maps.” Leaflet is available by default as `L` in Observable markdown. You can import it explicitly like so:

```js echo
import * as L from "npm:leaflet";
```

If you import Leaflet, Leaflet’s stylesheet will automatically be added to the page.

To create a map, follow the [tutorial](https://leafletjs.com/examples/quick-start/):

```js echo
const div = display(document.createElement("div"));
div.style = "height: 400px;";

const map = L.map(div)
  .setView([51.505, -0.09], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
})
  .addTo(map);

L.marker([51.5, -0.09])
  .addTo(map)
  .bindPopup("A nice popup<br> indicating a point of interest.")
  .openPopup();
```
