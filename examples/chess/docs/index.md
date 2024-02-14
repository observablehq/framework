# A year of chess rankings

Rankings of the top ${TOP_N_COUNT} players of _standard_ chess in the last ${MONTHS_OF_DATA} months.

```js
import {dark} from "./components/dark.js";
import {revive} from "./components/revive.js";
```

```js
const {womens, mens, MONTHS_OF_DATA, TOP_N_COUNT} = await FileAttachment("data/top-ranked-players.json").json().then(revive);
```

```js
function bumpChart(data, {x = "month", y = "rating", z = "name", interval = "month", width} = {}) {
  const rank = Plot.stackY2({x, z, order: y, reverse: true});
  const [xmin, xmax] = d3.extent(Plot.valueof(data, x));
  return Plot.plot({
    width,
    x: {
      [width < 480 ? "insetRight" : "inset"]: 120,
      label: null,
      grid: true
    },
    y: {
      axis: null,
      inset: 20,
      reverse: true
    },
    color: {
      scheme: "spectral"
    },
    marks: [
      Plot.lineY(data, Plot.binX({x: "first", y: "first", filter: null}, {
        ...rank,
        stroke: z,
        strokeWidth: 24,
        curve: "bump-x",
        sort: {color: "y", reduce: "first"},
        interval,
        render: halo({stroke: "var(--theme-background-alt)", strokeWidth: 27})
      })),
      Plot.text(data, {
        ...rank,
        text: rank.y,
        fill: "black",
        stroke: z,
        channels: {[y]: y, "title\0": (d) => formatTitle(d.title), federation: "federation", born: (d) => String(d.born)},
        tip: {format: {y: null, text: null}}
      }),
      width < 480 ? null : Plot.text(data, {
        ...rank,
        filter: (d) => d[x] <= xmin,
        text: z,
        dx: -20,
        textAnchor: "end"
      }),
      Plot.text(data, {
        ...rank,
        filter: (d) => d[x] >= xmax,
        text: z,
        dx: 20,
        textAnchor: "start"
      })
    ]
  })
}

function halo({stroke = "currentColor", strokeWidth = 3} = {}) {
  return (index, scales, values, dimensions, context, next) => {
    const g = next(index, scales, values, dimensions, context);
    for (const path of [...g.childNodes]) {
      const clone = path.cloneNode(true);
      clone.setAttribute("stroke", stroke);
      clone.setAttribute("stroke-width", strokeWidth);
      path.parentNode.insertBefore(clone, path);
    }
    return g;
  };
}

function formatTitle(title) {
  return title === "GM" ? "Grand Master" : title;
}
```

<div class="grid">
  <div class="card">
    <h2>Top ten women players</h2>
    ${resize((width) => bumpChart(womens, {width}))}
  </div>
  <div class="card">
    <h2>Top ten men players</h2>
    ${resize((width) => bumpChart(mens, {width}))}
  </div>
</div>

Data: [International Chess Federation](https://ratings.fide.com/)
