# JavaScript: Display

The Observable CLI encourages client-side JavaScript to render dynamic and interactive content, including charts and inputs. For example, below we say “hello world” with [Observable Plot](../lib/plot).

```js echo
Plot.plot({
  marks: [
    Plot.frame(),
    Plot.text(["hello world"], {frameAnchor: "middle"})
  ]
})
```

The code block above contains a JavaScript expression, a call to `Plot.plot`, that returns an SVG element. When a [JavaScript fenced code block](../javascript) contains an expression, the resulting value is displayed by implicitly wrapping the expression with a [`display`](#display(value)) call. The above is thus equivalent to:

```js echo
display(
  Plot.plot({
    marks: [
      Plot.frame(),
      Plot.text(["hello world"], {frameAnchor: "middle"})
    ]
  })
);
```

The `display` function displays the specified value wherever the code block is on the page. If you use the `echo` directive to echo the code, as above, the value is displayed _above_ the code (not below).

When the value is not a DOM node, display will automatically create a suitable corresponding DOM node to display using the [Observable Inspector](https://github.com/observablehq/inspector).

```js echo
1 + 2
```

Implicit display only applies to expression code blocks, not program code blocks: the value won’t implicit display if you add a semicolon. So, watch out for Prettier!

```js echo
1 + 2;
```

Implicit display also doesn’t apply if you reference the `display` function explicitly (_i.e._, we wouldn’t want to show `2` twice below).

```js echo
display(1), display(2)
```

The same is true for inline expressions `${…}`.

${1 + 2}

```md
${1 + 2}
```

${display(1), display(2)}

```md
${display(1), display(2)}
```

As shown above, you can manually display elements or inspect values by calling the built-in `display` function.

When the passed value is not a DOM node, the behavior of `display` displays on whether it is called within a fenced code block or an inline expression. In fenced code blocks, display will use the inspector.

```js echo
[1, 2, 3]
```

In inline expressions, display will coerce non-DOM values to strings, and will concatenate values when passed an iterable.

${display([1, 2, 3])}

```md
${display([1, 2, 3])}
```

You can call `display` multiple times within the same code block or inline expression to display multiple values.

```js echo
display(1);
display(2);
```

The `display` function returns the passed-in value, which can be useful for debugging.

```js echo
const x = display(Math.random());
```

The `display` function is scoped to each code block, meaning that the `display` function is a closure bound to where it will display on the page. But you can capture a code block’s `display` function by assigning it to a [top-level variable](./reactivity):

```js echo
const displayThere = display;
```

Then you can reference it from other cells:

```js echo
Inputs.button("Click me", {value: 0, reduce: (i) => displayThere(++i)})
```

Previously-displayed values will be cleared when the associated code block or inline expression is re-run.

The built-in [`view` function](#view(element)) is closely related to `display`. It displays the given element and then returns an [async generator](../lib/generators#generators.input(element)) that yields the input’s value. This makes it easy to both display an input element and expose its current value reactively to the rest of the page. For example, here is a simple HTML slider:

```js echo
const gain = view(html`<input type=range step=0.1 min=0 max=11 value=5>`);
```

Now you can reference the input’s value (here `gain`) anywhere. The code will run whenever the input changes; no event listeners required!

```md
The current gain is ${gain}!
```

The current gain is ${gain}!

## display(*value*)

If `value` is a DOM node, adds it to the DOM. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

## view(*element*)

The `view` function displays the given input *element* and then returns its corresponding [generator](./generators) via [`Generators.input`](../lib/generators#generators.input(element)). Use this to display an input element while also exposing the input’s value as a [reactive variable](./reactivity).
