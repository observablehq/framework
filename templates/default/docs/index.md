---
theme: alt
toc: false
---

<style>

:root {
  --hero-font-size: 14vw;
}

@media (min-width: 640px) {
  :root {
    --hero-font-size: 72px;
  }
}

</style>

<div style="display: flex; flex-direction: column; align-items: center; font-family: var(--sans-serif); margin: 4rem 0; text-wrap: balance; text-align: center;">
  <span style="font-weight: 900; font-size: var(--hero-font-size); line-height: 1; padding: 2rem 0; background: linear-gradient(30deg, var(--theme-foreground-focus), currentColor); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Hello, Observable Framework</span>
  <span style="font-weight: 500; max-width: 34em; font-size: 20px; color: var(--theme-foreground-muted);">Welcome to your new project! Edit&nbsp;<code style="font-size: 90%;">docs/index.md</code> to change this page.</span>
  <p><a href="https://cli.observablehq.com/getting-started" target="_blank">Getting started<span style="display: inline-block; margin-left: 0.25rem;">↗︎</span></a></p>
</div>

<div class="grid grid-cols-2" style="grid-auto-rows: 504px;">
  <div class="card">${
    resize((width) => Plot.plot({
      title: "Your awesomeness over time 🚀",
      subtitle: "Up and to the right!",
      width,
      y: {grid: true, label: "Awesomeness"},
      marks: [
        Plot.ruleY([0]),
        Plot.lineY(aapl, {x: "Date", y: "Close", tip: true})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "How big are penguins, anyway? 🐧",
      width,
      grid: true,
      x: {label: "Body mass (g)"},
      y: {label: "Flipper length (mm)"},
      color: {legend: true},
      marks: [
        Plot.linearRegressionY(penguins, {x: "body_mass_g", y: "flipper_length_mm", stroke: "species"}),
        Plot.dot(penguins, {x: "body_mass_g", y: "flipper_length_mm", stroke: "species", tip: true})
      ]
    }))
  }</div>
</div>

---

## Next steps

Here are some ideas of things you could try…

<div class="grid grid-cols-4">
  <div class="card">
    Chart your own data using <a href="https://cli.observablehq.com/lib/plot"><code>Plot</code></a> and <a href="https://cli.observablehq.com/javascript/files"><code>FileAttachment</code></a>. Make it responsive using <a href="https://cli.observablehq.com/javascript/display#responsive-display"><code>resize</code></a>.
  </div>
  <div class="card">
    Create a <a href="https://cli.observablehq.com/routing">new page</a> by adding a Markdown file (<code>whatever.md</code>) to the <code>docs</code> folder.
  </div>
  <div class="card">
    Add a drop-down menu using <a href="https://cli.observablehq.com/javascript/inputs"><code>Inputs.select</code></a> and use it to filter the data shown in a chart.
  </div>
  <div class="card">
    Write a <a href="https://cli.observablehq.com/loaders">data loader</a> that queries a local database or API, generating a data snapshot on build.
  </div>
  <div class="card">
    Import a <a href="https://cli.observablehq.com/javascript/imports">recommended library</a> from npm, such as <a href="https://cli.observablehq.com/lib/leaflet">Leaflet</a>, <a href="https://cli.observablehq.com/lib/dot">GraphViz</a>, <a href="https://cli.observablehq.com/lib/tex">TeX</a>, or <a href="https://cli.observablehq.com/lib/duckdb">DuckDB</a>.
  </div>
  <div class="card">
    Ask for help, or share your work or ideas, on the <a href="https://talk.observablehq.com/">Observable Forum</a>.
  </div>
  <div class="card">
    Visit <a href="https://github.com/observablehq/cli">Framework on GitHub</a> and give us a star. Or file an issue if you’ve found a bug!
  </div>
</div>
