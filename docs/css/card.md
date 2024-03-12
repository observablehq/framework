# CSS: Card

The `card` class is used to group and delineate content. The `card` classes applies a background and border (with colors determined by the current [theme](../themes)). A card can have a title and subtitle using <code>h2</code> and <code>h3</code> elements, respectively.

```html echo
<div class="card" style="max-width: 640px;">
  <h2>It gets hotter during summer</h2>
  <h3>And months have 28–31 days</h3>
  ${Plot.cell(weather.slice(-365), {x: (d) => d.date.getUTCDate(), y: (d) => d.date.getUTCMonth(), fill: "temp_max", tip: true, inset: 0.5}).plot({marginTop: 0, height: 240, padding: 0})}
</div>
```

<div class="tip"><a href="../lib/plot">Observable Plot</a>’s <b>title</b> and <b>subtitle</b> options generate <code>h2</code> and <code>h3</code> elements, respectively, and so will inherit these card styles.</div>

Cards can be used on their own, but they most often exist in a [grid](./grid). Cards can contain whatever you like, including text, images, charts, tables, inputs, and more.

```html echo
<div class="grid grid-cols-2">
  <div class="card">
    <h2>Lorem ipsum</h2>
    <p>Id ornare arcu odio ut sem nulla pharetra. Aliquet lectus proin nibh nisl condimentum id venenatis a. Feugiat sed lectus vestibulum mattis ullamcorper velit. Aliquet nec ullamcorper sit amet. Sit amet tellus cras adipiscing. Condimentum id venenatis a condimentum vitae. Semper eget duis at tellus. Ut faucibus pulvinar elementum integer enim.</p>
    <p>Et malesuada fames ac turpis. Integer vitae justo eget magna fermentum iaculis eu non diam. Aliquet risus feugiat in ante metus dictum at. Consectetur purus ut faucibus pulvinar.</p>
  </div>
  <div class="card" style="padding: 0;">
    ${Inputs.table(industries)}
  </div>
</div>
```

<div class="tip">Remove the padding from a card if it contains only a table.</div>

To place an input inside a card, first declare a detached input as a [top-level variable](../javascript/reactivity#top-level-variables) and use [`Generators.input`](../lib/generators#inputelement) to expose its reactive value:

```js echo
const industryInput = Inputs.select(industries.map((d) => d.industry), {unique: true, sort: true, label: "Industry:"});
const industry = Generators.input(industryInput);
```

Then, insert the input into the card:

```html echo
<div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
  ${industryInput}
  ${resize((width) => Plot.plot({
    width,
    y: {grid: true, label: "Unemployed (thousands)"},
    marks: [
      Plot.areaY(industries.filter((d) => d.industry === industry), {x: "date", y: "unemployed", fill: "var(--theme-foreground-muted)", curve: "step"}),
      Plot.lineY(industries.filter((d) => d.industry === industry), {x: "date", y: "unemployed", curve: "step"}),
      Plot.ruleY([0])
    ]
  }))}
</div>
```
