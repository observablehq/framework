---
toc: false
theme: dashboard
---
# A Year of Chess Rankings

Rankings of the top ${TOP_N_COUNT} players of _standard_ chess in the last ${MONTHS_OF_DATA} months.

```js
const { womens, mens, MONTHS_OF_DATA, TOP_N_COUNT } = await FileAttachment("data/top-ranked-players.json").json();
const titleMap = {
  "GM": "Grand Master",
  "WGM": "Womens Grand Master"
};
const mixBlendMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "lighten" : "darken";
```

```js
function bumpMarks(data, { r = 3, curve = "bump-x", ...options }, [firstMonth, lastMonth]) {
  options = Plot.stackY2(options);
  options.y.label = "rank";
  return Plot.marks(
    Plot.line(data, { ...options, stroke: options.z, curve, fill: null, mixBlendMode}),
    Plot.text(data, { ...options, text: options.y, fill: "black" }),
    Plot.text(
      data.filter(d => d.month === lastMonth),
      Plot.selectFirst({
        ...options,
        text: options.z,
        dy: 0,
        dx: 10 + (r || options.strokeWidth / 2),
        textAnchor: "start",
        fill: "currentColor",
      }),
    ),
    Plot.text(
      data.filter(d => d.month === firstMonth),
      Plot.selectLast({
        ...options,
        text: options.z,
        dy: 0,
        dx: -(10 + (r || options.strokeWidth / 2)),
        textAnchor: "end",
        fill: "currentColor"
      })
    )
  );
}

function bumpChart(data, width) {
  const months = [...new Set(data.map(d => d.month))].sort();
  const tickFormat = dateString => {
    const date = new Date(dateString);
    return d3.utcFormat(date.getMonth() === 0 ? "%b %y" : "%b")(date);
  }

  return Plot.plot({
    marginTop: 20,
    marginBottom: 35,
    marginLeft: 125,
    marginRight: 125,
    width,
    x: {
      domain: months,
      tickFormat,
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
          data,
          (v) => v[0].rating,
          (d) => d.name
        )
        .reverse()
    },
    marks: [
      bumpMarks(data, {
        x: "month",
        z: "name",
        order: "rating",
        reverse: true,
        strokeWidth: 24,
        strokeLinejoin: "round",
        strokeLinecap: "round",
        r: 0,
        dy: ".35em",
        fill: "white",
        tip: true,
        channels: {rating: "rating"},
        title: (d) => `name: ${d.name}\ntitle: ${titleMap[d.title] ?? ""}\nborn: ${d.born}/nrating: ${d.rating}`,
        href: ({ id }) => `https://ratings.fide.com/profile/${id}`,
        target: "_blank"
      }, [months.at(0), months.at(-1)])
    ]
  })
}
```

<div class="grid">
  <div class="card">
    <h1>Womens</h1>
    ${resize((width) => bumpChart(womens, width))}
  </div>
  <div class="card">
    <h1>Mens</h1>
    ${resize((width) => bumpChart(mens, width))}
  </div>
</div>

_Data from the [International Chess Federation](https://ratings.fide.com/)._
