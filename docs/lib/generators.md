# Observable Generators

The Observable standard library includes several generator utilities. These are available by default in Markdown as `Generators`, but you can import them explicitly:

```js echo
import {Generators} from "npm:@observablehq/stdlib";
```

## input(*element*)

Returns an async generator that yields whenever the given *element* emits an *input* event, with the given *element*’s current value. (It’s a bit fancier than that because we special-case a few element types.) The built-in [`view` function](<../javascript/inputs#view(element)>) uses this.

```js echo
const nameInput = display(document.createElement("input"));
const name = Generators.input(nameInput);
```

```js echo
name
```

## observe(*change*)

Returns an async generator that yields whenever the callback function *change* is called, with the value passed.

```js echo
const hash = Generators.observe((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  changed();
  return () => removeEventListener("hashchange", changed);
});
```
```js echo
hash
```

## queue(*change*)

Returns an async generator that yields whenever the callback function *change* is called, with the value passed. This is identical to Generators.observe, except that if *change* is called multiple times before the consumer has a chance to process the yielded result, values will not be dropped; use this if you require that the consumer not miss a yielded value.

```js run=false
const hash = Generators.queue((change) => {
  const changed = () => change(location.hash);
  addEventListener("hashchange", changed);
  changed();
  return () => removeEventListener("hashchange", changed);
});
```
```js echo
hash
```

## now()

Returns a generator that repeatedly yields `Date.now()`, forever. This generator is available by default as `now` in Markdown.

```js run=false
const now = Generators.now();
```

```js echo
now
```

## width(*element*)

Returns an async generator that yields the width of the given target *element*. Using a [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), the generator will yield whenever the width of the *element* changes. This generator for the `main` element is available by default as `width` in Markdown.

```js run=false
const width = Generators.width(document.querySelector("main"));
```

```js echo
width
```
