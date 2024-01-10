# Testing the big number component

${Dash.BigNumber(1)}

<div class="card grid grid-cols-4">
  ${Dash.BigNumber(1127)}
  ${Dash.BigNumber(17, {secondary: 7, secondaryFormat: "+"})}
  ${Dash.BigNumber(1e9 * Math.E, {title: "e", subtitle: "Transcendental value", format: "s", secondary: -2/3, secondaryFormat: ".1%", secondaryTitle: "Year over year"})}
  ${Dash.BigNumber(1e9 * Math.E, {format: "s", secondary: -2/3, secondaryFormat: ".1%", secondaryColor: "steelblue"})}
</div>

<div class="card grid grid-cols-4">
  ${Dash.BigNumber(1127, {title: "A unit", secondary: 0})}
  ${Dash.BigNumber(10, {secondary: -7/17, secondaryFormat: ".0%", children: Plot.lineY({length: 100}, Plot.mapY("cumsum", {
    y: d3.randomNormal.source(d3.randomLcg(42))()
  })).plot({width: 300, height: 40, axis: false})})}
  ${Dash.BigNumber(1e9 * Math.E, {format: "s", secondary: -2/3, secondaryFormat: ".1%"})}
  ${Dash.BigNumber(1e9 * Math.E, {format: "s", secondary: -2/3, secondaryFormat: ".1%", secondaryColor: "steelblue", children: [html`<div>A bit of <em>explanation</em>.`, html`<div>Another bit of information.`]})}
</div>
