---
theme: [coffee]
---

# coffee
This is a preview of how this [theme](./config#theme) will look when used on a project page.

<div class="grid grid-cols-2">
  <div class="card">
    <h2>This is a card</h2>
    <h3>Cards add polished formatting to page content.</h3>
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
  <div class="card">
    <h2>This is a card</h2>
    <h3>Cards add polished formatting to page content.</h3>
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
</div>