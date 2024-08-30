# Issues

```js
const { issues } = await FileAttachment("issues.json").json();
```

## Burndown chart

```js
const today = new Date();
const burndown = d3.sort(
  most_discussed
    .filter((d) => !d.pull_request)
    .flatMap((issue) => {
      const start = new Date(issue.created_at);
      const end = new Date(
        issue.closed_at ??
          (issue.state === "closed" ? issue.updated_at : undefined) ??
          today
      );
      const dates = d3.utcMonth.range(
        d3.utcMonth.offset(d3.utcMonth.floor(start), -1),
        d3.utcMonth.offset(d3.utcMonth.floor(end), 1)
      );
      return dates.map((date, i) => {
        return {
          start: start,
          value: i === 0 || i === dates.length - 1 ? 0 : 1,
          date,
        };
      });
    }),
  (d) => d.start
);

const start = d3.min(burndown, (d) => d.start);
```

<div class="card grid grid-cols-1" style="grid-auto-rows: 400px;">${
  resize((width, height) => Plot.plot({
    width,
    height,
    marginRight: 60,
    round: true,
    y: {axis: "right", grid: true, label: "↑ Open issues"},
    marks: [
      Plot.areaY(burndown, Plot.filter((d) => d.date >= start, {x: "date", y: "value", curve: "step-after", fill: "start"})),
      Plot.ruleY([0])
    ]
  }))
}
</div>

## By repo

```js
const normalize = view(Inputs.toggle({ label: "normalize" }));
```

```js
const selectedProject = view(
  Plot.barX(
    issues,
    Plot.groupY(
      { x: "count" },
      {
        fill: "repo",
        tip: true,
        order: "-sum",
        y: "state",
        offset: normalize ? "normalize" : undefined,
      }
    )
  ).plot({
    width,
    style: "overflow: visible;",
    marginLeft: 80,
    x: { percent: !!normalize },
  })
);
```

```js
//display(selectedProject);
```

```js
const most_discussed = d3.sort(
  (selectedProject ?? issues).filter(
    (d) => d.state.startsWith("open") // note: gitlab uses "opened"
  ),
  (d) => -d.comments - d.reactions
);

// display(most_discussed);

const links = new Map(
  most_discussed.map(({ id, url }) => [
    id,
    html`<a href="${url}" target="_blank">#${id}</a>`,
  ])
);
```

```js
const searched = view(Inputs.search(most_discussed));
```

```js
display(
  Inputs.table(searched, {
    rows: 40,
    columns: [
      "id",
      "title",
      "repo",
      "comments",
      "reactions",
      "created_at",
      "user",
    ],
    width: {
      id: "4em",
      title: "40%",
      repo: "3em",
      comments: "4em",
      reactions: "4em",
      user: "4em",
    },
    format: {
      id: (id) => links.get(id),
      created_at: (d) => {
        const delay = d3.utcDay.count(new Date(d), new Date());
        return delay > 80
          ? `${d3.utcMonth.count(new Date(d), new Date())} months ago`
          : `${delay} days ago`;
      },
    },
  })
);
```

<div style="min-height: 100vh"></div>
