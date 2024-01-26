---
theme: dashboard
toc: false
---

# ${data.name} weather forecast

```js
const data = FileAttachment("./data/forecast.json").json().then(revive);

function revive(object, pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/) {
  if (Array.isArray(object)) {
    for (const key in object) {
      revive(object[key], pattern);
    }
  } else if (object && typeof object === "object") {
    for (const key in object) {
      if (object[key] == null) continue;
      if (typeof object[key] === "string" && pattern.test(object[key])) {
        object[key] = new Date(object[key]);
      } else {
        revive(object[key], pattern);
      }
    }
  }
  return object;
}
```

<div class="grid grid-cols-4" style="grid-auto-rows: 270px;">
  <div class="card" id="map"></div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "temperature",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true},
      marks: [
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: "temperature"}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: "temperature", stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "probabilityOfPrecipitation",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true},
      marks: [
        Plot.ruleY([0, 100]),
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.probabilityOfPrecipitation.value}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.probabilityOfPrecipitation.value, stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "dewpoint",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true},
      marks: [
        Plot.ruleY([0]),
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.dewpoint.value}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.dewpoint.value, stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "relativeHumidity",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true},
      marks: [
        Plot.ruleY([0]),
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.relativeHumidity.value}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => d.relativeHumidity.value, stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "windSpeed",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true},
      marks: [
        Plot.ruleY([0]),
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => parseWindSpeed(d.windSpeed)}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: (d) => parseWindSpeed(d.windSpeed), stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "windDirection",
      width,
      height: 200,
      nice: true,
      x: {ticks: "day"},
      y: {grid: true, label: null},
      marks: [
        Plot.link(data.forecast.properties.periods, {x1: "startTime", x2: "endTime", y: "windDirection"}),
        Plot.link(data.forecastHourly.properties.periods, {x1: "startTime", x2: "endTime", y: "windDirection", stroke: "var(--theme-foreground-focus)"})
      ]
    }))
  }</div>
</div>

```js
function parseWindSpeed(d) {
  return parseFloat(d); // e.g., "7 mph"
}
```

```js
const div = document.querySelector("#map");
const [lng, lat] = data.station.geometry.coordinates;
const map = L.map(div).setView([lat, lng], 11);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
L.geoJSON().addData(data.forecastHourly).addTo(map);
invalidation.then(() => map.remove());
```
