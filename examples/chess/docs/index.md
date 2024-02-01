# A Year of Chess Rankings

Rankings from last 12 months of top 10 womens chess players.

```js
const topPlayers = await FileAttachment("data/top-ranked-players.json").json();
const months = [...new Set(topPlayers.map(d => d.month))];
```

```js
function bumpMarks(data, { r = 3, curve = "bump-x", tip, ...options }) {
  options = Plot.stackY2(options);
  return Plot.marks(
    Plot.line(data, { ...options, tip, stroke: options.z, curve, fill: null }),
    Plot.dot(data, { ...options, fill: options.z, r }),
    Plot.text(data, { fill: options.z, dy: -9, ...options, text: options.y }),
    Plot.text(
      data,
      Plot.selectFirst({
        ...options,
        text: options.z,
        dx: -(5 + (r || options.strokeWidth / 2)),
        textAnchor: "end",
        fill: "currentColor"
      }, { dx: 20 })
    ),
    Plot.text(
      data,
      Plot.selectLast({
        ...options,
        text: options.z,
        dx: 5 + (r || options.strokeWidth / 2),
        textAnchor: "start",
        fill: "currentColor"
      })
    )
  );
}
```

<div class="card">
${resize(( width) => Plot.plot({
  marginTop: 20,
  marginBottom: 35,
  marginLeft: 75,
  marginRight: 80,
  width,
  x: {
    domain: months,
    tickFormat: d => d3.utcFormat("%b %y")(new Date(d)),
    label: null,
    grid: true
  },
  y: {
    axis: null,
    domain: [10.5, 1]
  },
  color: {
    domain: d3
      .groupSort(
        topPlayers,
        (v) => v[0].Rank,
        (d) => d.Name
      )
      .reverse()
  },
  marks: [
    bumpMarks(topPlayers, {
      x: "month",
      z: "Name",
      order: "Rank",
      reverse: true,
      curve: "linear",
      strokeWidth: 24,
      strokeLinejoin: "round",
      strokeLinecap: "round",
      r: 0,
      dy: ".35em",
      fill: "white"
    })
  ]
}))}
</div>

_Data from the [International Chess Federation](https://ratings.fide.com/)._
