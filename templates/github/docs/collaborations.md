# Collaborations

The graph below represents the collaborations in the selected repositories.

Nodes describe all the authors of the last ${Number(config.MAX_COMMITS).toLocaleString("en-US")} commits in any of the selected repos, and are sized by their total number of commits across the repos. Their color corresponds to the repo in which they did the largest number of commits.

Edges represent collaborations. How do we detect them? Whenever two authors edit the same subset of files during a given time period (a sliding window of 10 commits), their connection accrues points. The edges of the graph are the top-scored connections.

```js
// normalization
const maxValue = d3.max(links, (d) => d.value);
const maxCommits = d3.max(nodes, (d) => d.commits);
const nodeRadius = (d, i) =>
  2.5 + 20 * Math.pow((1 + (nodes[i].commits ?? 0)) / (1 + maxCommits), 0.33);
const nodeGroups = d3
  .groupSort(
    nodes,
    (v) => -d3.sum(v, (d) => d.commits),
    (d) => d.group
  )
  .slice(0, 9);

const chart = ForceGraph(
  { nodes, links },
  {
    nodeId: (d) => d.id,
    nodeGroup: (d) => (nodeGroups.includes(d.group) ? d.group : "other"),
    nodeTitle: (d) => `${d.id}\n${d.group}`,
    linkStrokeWidth: (l) => 5 * Math.sqrt(l.value / maxValue),
    width,
    nodeRadius,
    nodeStrength: -20,
    //linkStrength: 0.2,
    linkDistance: 2,
    height: width,
    nodeGroups,
    initialize: (simulation) =>
      simulation
        .force("x", d3.forceX().strength(0.05))
        .force("y", d3.forceY().strength(0.05))
        .force(
          "collide2",
          d3
            .forceCollide()
            .radius((d, i) => 2 + nodeRadius(d, i))
            .strength(0.4)
        ),
    invalidation, // a promise to stop the simulation when the cell is re-run
  }
);
display(Object.assign(chart, { style: "overflow: visible;" }));
```

```js
const color = view(
  Inputs.radio(["org", "repo"], { value: "repo", label: "color by" })
);
```

```js
import { ForceGraph } from "/components/force-graph.js";
```

```js
const clones = FileAttachment("clone.json").json();
const config = FileAttachment("config.json").json();
```

```js
function distance(a, b) {
  return (
    a.length &&
    b.length &&
    d3.intersection(a, b).size ** 2 / (a.length * b.length)
  );
}
```

```js
const pairs = new Map();
const authors = new Map();

for (const { repo, commits } of clones) {
  for (let i = 0; i < commits.length; ++i) {
    const a = commits[i];
    if (!authors.has(a.author))
      authors.set(a.author, {
        id: a.author,
        commits: 0,
        repos: [],
        orgs: [],
      });
    const author = authors.get(a.author);
    author.commits++;
    author.repos.push(repo);
    author.orgs.push(repo.split("/")[0]);

    for (let j = i + 1; j < commits.length && j < i + 10; ++j) {
      const b = commits[j];
      if (a.author === b.author) continue;
      const pair = [a.author, b.author].sort().join("\t");
      if (!pairs.has(pair)) pairs.set(pair, 0);
      pairs.set(pair, pairs.get(pair) + distance(a.files, b.files));
    }
  }
}

const nodes = [...authors].map(([, { commits, id, repos, orgs }]) => ({
  id,
  commits,
  // org: d3.mode(orgs),
  // repo: d3.mode(repos),
  group: d3.mode(color === "repo" ? repos : orgs),
}));
const links = d3
  .sort(pairs, ([, value]) => -value)
  .slice(0, 1000)
  .map(([pair, value]) => ({
    source: pair.split("\t")[0],
    target: pair.split("\t")[1],
    value,
  }));

// regroup the stray nodes
const solos = d3.difference(
  nodes.map((d) => d.id),
  links.map((d) => d.source),
  links.map((d) => d.target)
);
for (let i = 0; i < 2; ++i) {
  for (const [source, target] of d3.pairs(d3.shuffle([...solos])))
    links.push({ source, target, value: 5 });
}
```
