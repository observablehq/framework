# Search input

[TODO] check on Hello, Inputs removed below. 

The Search input allows freeform, full-text search of a tabular dataset (or a single column of values) using a simple query parser. It is often paired with a [Table input](./table). 

By default, the query is split into terms separated by spaces; each term is then prefix-matched against the property values (the fields) of each row in the data. Try searching for “gen” below to find Gentoo penguins.

```js echo
const penguins = FileAttachment("penguins.csv").csv({typed: true});
```

```js echo
const search = view(Inputs.search(penguins));
```

```js echo
search // Open the array above to inspect the results.
```

Or, as a table: 

```js echo
Inputs.table(search)
```
[TODO] fix below to interactively search on click

If you search for multiple terms, such as ${htl.html`<a style="cursor: pointer; border-bottom: dotted 1px;" onclick=${() => { viewof search.query = "gen bis"; viewof search.dispatchEvent(new CustomEvent("input")); }}>“gen bis”`} (for Gentoos on the Biscoe Islands) or ${htl.html`<a style="cursor: pointer; border-bottom: dotted 1px;" onclick=${() => { viewof search.query = "gen fem"; viewof search.dispatchEvent(new CustomEvent("input")); }}>“gen fem”`} (for female Gentoos), every term must match: there’s an implicit logical AND.

[TODO] where should Observable Inputs general point now? Add an "Inputs overview" page? 

[TODO] view vs. viewof reference material? Currently points here: https://observablehq.com/@observablehq/views

The Search input is designed to work with other [Observable inputs](TODO) and especially [tables](./table). You can also refer to the current search results from any cell using a [view](https://observablehq.com/@observablehq/views). For example, to compute the median body mass of the matching penguins:

```js echo
d3.median(search, d => d.body_mass_g)
```

If you’d like different search syntax or behavior, pass the *filter* option. This function is passed the current search query and returns the [filter test function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) to be applied to the data.