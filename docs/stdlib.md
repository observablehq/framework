# stdlib

```js echo
const div = Object.assign(document.createElement("div"), {style: "height: 180px;"});
const map = L.map(display(div)).setView([51.505, -0.09], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
```

```js echo
const i = view(Inputs.range([0, 1], {label: "Test"}));
```

```js echo
i
```

```js echo
display(tex`E = mc^2`);
```

```js echo
display(dot`digraph G { a -> b -> c; }`);
```

```js echo
display(Generators);
```

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```
