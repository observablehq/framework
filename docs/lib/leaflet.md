# Leaflet

```js echo
const div = Object.assign(display(document.createElement("div")), {style: "height: 400px;"});
const map = L.map(div).setView([51.505, -0.09], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
L.marker([51.5, -0.09]).addTo(map).bindPopup("A pretty CSS popup.<br> Easily customizable.").openPopup();
```
