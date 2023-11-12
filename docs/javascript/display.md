# JavaScript: Display

The reason we write client-side JavaScript is to display stuff! So how does that work?

```js show
Plot.plot({
  marks: [
    Plot.frame(),
    Plot.text(["hello world"], {frameAnchor: "middle"})
  ]
})
```

The call to `Plot.plot` above is a JavaScript expression. This expression returns an SVG element. When a JavaScript fenced code block contains an expression (but not a program — more on that in a sec), the resulting value is displayed by implicitly wrapping the expression with a `display` call. The above is thus equivalent to:

```js show
display(
  Plot.plot({
    marks: [
      Plot.frame(),
      Plot.text(["hello world"], {frameAnchor: "middle"})
    ]
  })
);
```

The `display` function automatically displays the specified value wherever the code chunk is on the page. If you use the `show` directive to show the code, as above, the evaluated value is shown _above_ the code (not below).

When `value` is not a DOM node, display will automatically create a suitable corresponding DOM node to display.

```js show
1 + 2
```

It _won’t_ display if you have a semicolon. So, watch out for Prettier.

```js show
1 + 2;
```

It also won’t display if you reference the `display` function explicitly (_i.e._, we wouldn’t want to show `2` twice below).

```js show
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

When the passed value is not a DOM node, the behavior of `display` displays on whether it is called within a fenced code block or an inline expression.

In fenced code blocks, display will use the [Observable Inspector](https://github.com/observablehq/inspector).

```js show
[1, 2, 3]
```

In inline expressions, display will coerce non-DOM values to strings, and will concatenate values when passed an iterable.

${display([1, 2, 3])}

```md
${display([1, 2, 3])}
```

You can call `display` multiple times within the same code block or inline expression to display multiple values.

```js show
display(1);
display(2);
```

The `display` function returns the passed-in value, which can be useful for debugging.

```js show
const x = display(Math.random());
```

The `display` function is scoped to each code chunk. But you can capture a code chunk’s `display` function by assigning it to a [top-level variable](./reactivity):

```js show
const displayThere = display;
```

Then you can reference it from other cells:

```js show
Inputs.button("Click me", {value: 0, reduce: (i) => displayThere(++i)})
```

Previously-displayed values will be cleared when the associated code block or inline expression is re-run.

## display(*value*)

If `value` is a DOM node, adds it to the DOM. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

## view(*input*)

See [JavaScript: Inputs](./inputs).
