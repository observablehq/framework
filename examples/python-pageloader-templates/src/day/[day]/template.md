# Sales on {{ day|title }}s

```js
const sales = FileAttachment("sales.json").json()
  .then(ds => ds.map(d => ({...d, order_date: new Date(d.order_date)})));
```

```js
function withoutPizzaSize(name) {
  return name.replace(/\s*(small|medium|large|extra large)\s*$/i, "");
}

function pizzaSize(name) {
  return name.match(/\s*(small|medium|large|extra large)\s*$/i, "")[1];
}
```

```js
const sortedSales = d3.sort(sales, d => ["Small", "Medium", "Large", "Extra Large"].indexOf(pizzaSize(d.name)));
```

<div class="grid grid-cols-1">
  <div class="card">
    ${resize((width) => Plot.plot({
      width,
      marginLeft: 130,
      color: {legend: true, domain: ["Small", "Medium", "Large", "Extra Large"]},
      marks: [
        Plot.ruleX([0]),
        Plot.barX(sortedSales, Plot.groupY({x: "count"}, {
          y: d => withoutPizzaSize(d.name),
          z: d => d.name,
          fill: d => pizzaSize(d.name),
          tip: true,
        }))
      ]
    }))}
  </div>
</div>

{% include "extras/" + day + ".md" ignore missing %}
