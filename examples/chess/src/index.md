# A year of chess rankings

Rankings of the top ${TOP_N_COUNT} players of _standard_ chess in the last ${MONTHS_OF_DATA} months.

```js
import {revive} from "./components/revive.js";
import {BumpChart} from "./components/BumpChart.js";
```

```js
const {womens, mens, MONTHS_OF_DATA, TOP_N_COUNT} = await FileAttachment("data/top-ranked-players.json").json().then(revive);
```

<div class="grid">
  <div class="card">
    <h2>Top ten women players</h2>
    ${resize((width) => BumpChart(womens, {width}))}
  </div>
  <div class="card">
    <h2>Top ten men players</h2>
    ${resize((width) => BumpChart(mens, {width}))}
  </div>
</div>

Data: [International Chess Federation](https://ratings.fide.com/)
