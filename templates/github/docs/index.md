# GitHub Stats

## Overview

```js
const { repos, commits } = await FileAttachment("commits.json").json();
```

```js
const { issues } = await FileAttachment("issues.json").json();
```

```js
const user = await FileAttachment("user.json").json();
```

This GitHub collection covers ${plural(repos.length, "repo")} totalling ${plural(commits.length, "commit")} from ${plural(new Set(Plot.valueof(commits, "author_name")).size, "author")}.

## Top repos

```js
const topRepos = d3
  .sort(
    d3.rollups(
      commits,
      (v) => ({
        authors: new Set(Plot.valueof(v, "author_name")).size,
        commits: v.length,
        dates: d3.extent(v, (d) => d.created_at),
      }),
      (d) => d.repo
    ),
    (d) => -d[1].authors,
    (d) => -d[1].commits
  )
  .slice(0, 9);

const colorRepo = Plot.scale({
  color: {
    domain: topRepos.map((d) => d[0]),
    range: d3.schemeObservable10,
    unknown: d3.schemeObservable10[9],
  },
});
```

```js
display(
  html`<ul>
    ${topRepos.map(
      (d) =>
        html`<p
          ${{
            style: `border-bottom: 2px solid ${colorRepo.apply(d[0])}`,
          }}
        >
          <span
            ${{
              style: `color: ${colorRepo.apply(d[0])} !important;`,
            }}
            >▣</span
          >
          <span style="text-transform: uppercase;">${d[0]}</span>
          <small
            >(${plural(d[1].authors, "author")}, ${plural(
              d[1].commits,
              "commit"
            )})
          </small>
        </p>`
    )}
  </ul>`
);
```

## Overview

```js
display(
  Plot.plot({
    width,
    marginLeft: 60,
    x: { type: "utc" },
    y: { label: "commits" },
    color: colorRepo,
    marks: [
      Plot.rectY(
        commits,
        Plot.binX(
          { y: "count", interval: "year" },
          {
            x: "created_at",
            fill: "repo",
            order: colorRepo.domain,
            tip: true,
          }
        )
      ),
    ],
  })
);
```

---

_Data collected by @${user.login} on ${(() => {
  const d = new Date(FileAttachment("issues.json").lastModified);
  return html`<span title="${d3.isoFormat(d)}">${d.toLocaleDateString("en-US", { month: "long",day: "numeric", timeZone: "UTC"})}`})()}._

```js
import { plural } from "./components/plural.js";
```
