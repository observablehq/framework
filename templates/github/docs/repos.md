# Repos

${html`<image src="${user.avatar_url}" class="avatar">`}
Here are ${plural(repos.length, "repo")}${allRepos.reason === "user" ? ` you own${myOnly ? "": " or contribute to"}` : allRepos.reason === "org" ? " in your organization" : ""}:

```js
const value = sizeBy;

const chart = Treemap(
  myOnly ? repos.filter((d) => d.nameWithOwner.startsWith(user.login)) : repos,
  {
    path: (d) => `${d.nameWithOwner}`,
    width,
    label: (d) =>
      `${d.nameWithOwner.split("/")[1]} @${d.nameWithOwner.split("/")[0]}\n${
        value?.(d)?.toLocaleString("en-US") ?? ""
      }`,
    value: value ? (d) => value(d) || 0 : () => 1,
    link: (d) => `https://github.com/${d.nameWithOwner}`,
    height: width,
    zDomain,
    group: (d) => `${d.nameWithOwner.split("/")[0]}`,
  }
);

display(
  html`<div class="swatches">
      ${Swatches(
        chart.scales.color.domain(chart.scales.color.domain().slice(0, 9))
      )}
    </div>
    <style>
      .swatches span::before {
        opacity: 0.7;
      }
    </style>`
);

display(chart);
```

```js
const sizeBy = view(
  Inputs.select(
    new Map([
      ["⭐️  popularity", (d) => d.stargazerCount],
      ["💾  disk space", (d) => d.diskUsage],
      ["🌶  issues", (d) => d.issues.totalCount],
      ["①  unit", null],
    ]),
    { label: "size by" }
  )
);

const myOnly = view(Inputs.toggle({ label: "my repos" }));

const archived = view(Inputs.toggle({ label: "archived repos" }));
```

```js
const rawfiles = FileAttachment("files.json").json();
import { Treemap } from "/components/treemap.js";
import { Swatches } from "/components/color-legend.js";
```

```js
const allRepos = FileAttachment("repos.json").json();
```

```js
const repos = allRepos.repos.filter((d) =>
  archived ? !!d.archivedAt : !d.archivedAt
);
```

```js
const zDomain = d3.groupSort(
  allRepos.repos,
  (v) => -d3.sum(v, (d) => d.stargazerCount),
  (d) => d.nameWithOwner.split("/")[0]
);
```

```js
const user = FileAttachment("user.json").json();
```

<style>
  .avatar {
    position: absolute;
    right: -45px;
    height: auto;
    width: 80px;
    border-radius: 80px;
    border: 5px solid var(--theme-background);
  }
</style>

```js
import { plural } from "./components/plural.js";
```
