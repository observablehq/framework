---
theme: parchment
toc: false
header: false
---

<style>
#observablehq-sidebar-toggle {display: none;}
</style>


```js
const subset = new Set(["Transportation and Utilities", "Mining and Extraction", "Finance", "Agriculture", "Information"]);
const industriesSubset = industries.filter(d => subset.has(d.industry));
const barData = [
  {Category: "Alpha", Value: 9.8},
  {Category: "Beta", Value: 7.8},
  {Category: "Gamma", Value: 6.3},
  {Category: "Delta", Value: 5},
  {Category: "Epsilon", Value: 4},
  {Category: "Zeta", Value: 3.2},
];
```

# Theme: parchment
## A preview of the `parchment` [theme](../themes)

<div class="grid grid-cols-2">
  <div class="card">${
    resize((width) => Plot.plot({
      title: "Construction unemployment reaches record high",
      subtitle: "And it’s not just seasonal variation",
      y: {grid: true, transform: (d) => d * 1000},
      color: {range: ["var(--theme-foreground-fainter)", "var(--theme-foreground-focus)"]},
      height: 320,
      width,
      marks: [
        Plot.ruleY([0]),
        Plot.axisY({label: "Unemployed (millions)", tickFormat: (d) => (d / 1e6).toFixed(1)}),
        Plot.lineY(industries, {x: "date", y: "unemployed", z: "industry", stroke: "var(--theme-foreground-fainter)", strokeWidth: 1}),
        Plot.lineY(industries, {x: "date", y: "unemployed", filter: (d) => d.industry === industry, stroke: "var(--theme-foreground-focus)", tip: true})
      ]
    }))
  }</div>
  <div class="card">${
    resize((width) => Plot.plot({
      title: "Vowels are some of the most frequent letters in English",
      x: {grid: true, percent: true},
      marginTop: 0,
      color: {domain: "AEIOUY", unknown: "var(--theme-foreground-fainter)", legend: true},
      height: 300,
      width,
      marks: [
        Plot.rectX(alphabet, {x: "frequency", y: "letter", fill: (d) => /[aeiouy]/i.test(d.letter) ? d.letter : "other", sort: {y: "-x"}, tip: {format: {x: true, y: true}}}),
        Plot.ruleX([0])
      ]
    }))
  }</div>
</div>

```js
const industry = view(Inputs.select(industries.map((d) => d.industry), {unique: true, sort: true, label: "Industry", value: "Construction"}));
```

Call me Ishmael. Some years ago — never mind how long precisely — having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.

```js
Inputs.table(penguins)
```

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people’s hats off — then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball. With a philosophical flourish Cato throws himself upon his sword; I quietly take to the ship.

There is nothing surprising in this. If they but knew it, almost all men in their degree, some time or other, cherish very nearly the same feelings towards the ocean with me.