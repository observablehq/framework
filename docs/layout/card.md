# Cards

The `card` class adds polished styling to page content, including a background and border color determined by the current theme, rounded corners, and a styled title and subtitle. 

```html echo
  <div class=card>
  <h2>This is a card title</h2>
  <h3>This is a card subtitle</h3>
  ${
    Plot.plot({
  marks: [
    Plot.cell(weather, {
      x: d => d.date.getUTCDate(),
      y: d => d.date.getUTCMonth(),
      fill: "temp_max"
    })
  ]
})
  }
  </div>
```


## Card content

Cards can contain whatever content you like, including text, images, big number boxes, charts and more. 

```html echo
<div class="grid grid-cols-2 grid-rows-2">
  <div class=card>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
  <div class=card>
    </div>
  <div class=card>${
    Plot.plot({
  marks: [
    Plot.barX(olympians, Plot.groupY({x: "count"}, {y: "nationality", sort: {y: "x", reverse: true, limit: 5}})),
    Plot.ruleX([0])
  ]
})
  }
  </div>
  <div class=card>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
    <div class=card>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    </div>
</div>
```

## Title and subtitle
<!-- TODO update bignumber name and link based on final naming decisions-->
Card titles and subtitles (added with H2 and H3 headers, respectively), match the title styling in [ Observable Plot](https://observablehq.com/plot/features/plots#other-options) and the [Dash.number]() component as shown below. 

```html echo
<div class="grid grid-cols-2"">
  <div class=card><h2>A card title added as a card element</h2>
    <h3>A card subtitle added as a card element</h3>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <p>Massa sapien faucibus et molestie ac feugiat sed lectus. Sit amet volutpat consequat mauris nunc congue nisi. Maecenas pharetra convallis posuere morbi leo urna molestie at.</p>
    </div>
  <div class=card>${
    Plot.plot({
    marks: [
        Plot.dot(penguins, {x: "body_mass_g", y: "flipper_length_mm"})
    ],
    title: "A title added in Observable Plot",
    subtitle: "A subtitle added in Observable Plot"
  })
  }</div>
</div>
```

## Content without cards

Content does not have to be in a card. Below, explanatory text is added to the right of a card.

```html echo
<div class="grid grid-cols-2"">
  <div class=card>
    ${
      Plot.plot({
    marks: [
        Plot.dot(penguins, {x: "body_mass_g", y: "flipper_length_mm", fill: "species", tip: true})
    ],
    color: {legend: true}
  })
  }
    </div>
  <div>
    <p>Structural size measurements, including flipper length (mm) and body mass (g), were recorded for 344 individual penguins (${penguins.filter(d => d.species == "Adelie").length} Adélie, ${penguins.filter(d => d.species == "Chinstrap").length} Chinstrap, and ${penguins.filter(d => d.species == "Gentoo").length} Gentoo) at islands near Palmer Archipelago, Antarctica from 2007 — 2009. Data source: Gorman et al. (2014). </p>
  </div>
</div>
```


- Cards can contain whatever content you want (images, text, charts, tables).
- Cards can contain multiple elements (e.g. an input and a chart)
- Cards have title and subtitle options (show example)
- Content does not *have* to be in a card (show example where side-by-side content with one in card, one not in card)