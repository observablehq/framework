# Cards

The `card` class add polished styling to page content, including a background and border color determined by the current theme, rounded corners, and a styled title and subtitle. 


## Content

Cards can contain whatever content you like. 

```html echo
<div class="grid grid-cols-2"">
  <div class=card>
    <img src="../javascript/horse.jpg">
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
</div>
```

## Title and subtitle

Card titles and subtitles (added with H2 and H3 headers, respectively), match the title styling in [ Observable Plot](https://observablehq.com/plot/features/plots#other-options) as shown below. 

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

Cards can contain whatever content you want:



- Cards can contain whatever content you want (images, text, charts, tables).
- Cards can contain multiple elements (e.g. one card, two charts) - though probably not advised
- Cards have title and subtitle options (show example)
- Content does not *have* to be in a card (show example where side-by-side content with one in card, one not in card)