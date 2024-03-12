# Search input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#search" target="_blank">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/search.js" target="_blank">Source</a> · The search input allows freeform, full-text search of a tabular dataset (or a single column of values) using a simple query parser. It is often paired with a [table input](./table).

By default, the query is split into terms separated by spaces; each term is then prefix-matched against the property values (the fields) of each row in the data. Try searching for “gen” below to find Gentoo penguins.

```js
const searchInput = Inputs.search(penguins, {placeholder: "Search penguins…"});
const search = view(searchInput);
```

```js run=false
const search = view(Inputs.search(penguins, {placeholder: "Search penguins…"}));
```

```js echo
search
```

Or, as a table:

```js echo
Inputs.table(search)
```

```js
for (const abbr of document.querySelectorAll("abbr")) {
  abbr.title = `Search for “${abbr.textContent}”`;
  abbr.style.cursor = "default";
  abbr.onclick = () => {
    const input = searchInput.querySelector("input");
    input.value = abbr.textContent;
    input.dispatchEvent(new Event("input", {bubbles: true}));
  };
}
```

If you search for multiple terms, such as “<abbr>gen bis</abbr>” (for Gentoos on the Biscoe Islands) or “<abbr>gen fem</abbr>” (for female Gentoos), every term must match: there’s an implicit logical AND.

If you’d like different search syntax or behavior, pass the *filter* option. This function is passed the current search query and returns the [filter test function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) to be applied to the data.

## Options

**Inputs.search(*data*, *options*)**

The available search input options are:

* *label* - a label; either a string or an HTML element
* *query* - the initial search terms; defaults to the empty string
* *placeholder* - a placeholder string for when the query is empty
* *columns* - an array of columns to search; defaults to *data*.columns
* *locale* - the current locale; defaults to English
* *format* - a function to show the number of results
* *spellcheck* - whether to activate the browser’s spell-checker
* *autocomplete* - the [autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) attribute, as text or boolean
* *autocapitalize* - the [autocapitalize](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize) attribute, as text or boolean
* *filter* - the filter factory: a function that receives the query and returns a filter
* *width* - the width of the input (not including the label)
* *datalist* - an iterable of suggested values
* *disabled* - whether input is disabled; defaults to false
* *required* - if true, the search’s value is all *data* if no query; defaults to true

If a *filter* function is specified, it is invoked whenever the query changes; the function it returns is then passed each element from *data*, along with its zero-based index, and should return a truthy value if the given element matches the query. The default filter splits the current query into space-separated tokens and checks that each token matches the beginning of at least one string in the data’s columns, case-insensitive. For example, the query [hello world] will match the string “Worldwide Hello Services” but not “hello”.
