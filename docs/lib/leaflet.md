# Leaflet

[Leaflet](https://leafletjs.com/) is an open-source JavaScript library for mobile-friendly interactive maps.

Leaflet is available by default as `L` in Observable markdown, you can also import it explicitly:

```js echo
import * as L from "npm:leaflet";
```

To create a map, follow the [tutorial](https://leafletjs.com/examples/quick-start/):

```js echo
const div = Object.assign(display(document.createElement("div")), {style: "height: 400px;"});
const map = L.map(div).setView([51.505, -0.09], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
L.marker([51.5, -0.09]).addTo(map).bindPopup("A nice popup<br> indicating a point of interest.");
```
