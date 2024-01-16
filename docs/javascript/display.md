# JavaScript: Display

The built-in `display` function displays the specified value.

```js echo
const x = Math.random();

display(x);
```

If you pass `display` a DOM element or node, it will be inserted directly into the page. Use this technique to render dynamic displays of data, such as charts and tables.

```js echo
const span = document.createElement("span");
span.appendChild(document.createTextNode("Your lucky number is "));
span.appendChild(document.createTextNode(Math.floor(Math.random () * 10)));
span.appendChild(document.createTextNode("!"));
display(span);
```

You can create DOM elements using the standard [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction) or a helper library of your choosing. For example, the above can be written using [Hypertext Literal](../lib/htl) as:

```js echo
display(html`Your lucky number is ${Math.floor(Math.random () * 10)}!`);
```

You can call `display` multiple times to display multiple values. Values are displayed in the order they are received. Previously-displayed values will be cleared when the associated code block or inline expression is re-run.

```js echo
for (let i = 0; i < 5; ++i) {
  display(i);
}
```

The `display` function returns the passed-in value. You can display any value (any expression) in code, not only top-level variables; use this as an alternative to `console.log` to debug your code.

```js echo
const y = display(Math.random());
```

The value of `y` is ${y}.

```md
The value of `y` is ${y}.
```

When the value passed to `display` is not a DOM element or node, the behavior of `display` depends on whether it is called within a fenced code block or an inline expression. In fenced code blocks, `display` will use the [Observable Inspector](https://github.com/observablehq/inspector).

```js echo
display([1, 2, 3]);
```

In inline expressions, `display` will coerce non-DOM values to strings and concatenate iterables.

${display([1, 2, 3])}

```md
${display([1, 2, 3])}
```

## Implicit display

JavaScript expression fenced code blocks are implicitly wrapped with a call to [`display`](#display(value)). For example, this arithmetic expression displays implicitly:

```js echo
1 + 2 // implicit display
```

Implicit display only applies to expression code blocks, not program code blocks: the value won’t implicitly display if you add a semicolon. (Watch out for [Prettier](https://prettier.io/)!)

```js echo
1 + 2; // no implicit display
```

Implicit display also doesn’t apply if you reference the `display` function explicitly (_i.e._, we wouldn’t want to show `2` twice below).

```js echo
display(1), display(2) // no implicit display
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

## display(*value*)

If `value` is a DOM node, adds it to the page. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

The `display` function is scoped to each code block, meaning that the `display` function is a closure bound to where it will display on the page. But you can capture a code block’s `display` function by assigning it to a [top-level variable](./reactivity):

```js echo
const displayThere = display;
```

Then you can reference it from other cells:

```js echo
Inputs.button("Click me", {value: 0, reduce: (i) => displayThere(++i)})
```

## view(*element*)

The `view` function displays the given DOM *element* (typically an input) and then returns its corresponding value [generator](./generators) via [`Generators.input`](../lib/generators#input(element)). Use this to display an input while also exposing the input’s value as a [reactive variable](./reactivity). For example, here is a simple HTML slider:

```js echo
const gain = view(html`<input type=range step=0.1 min=0 max=11 value=5>`);
```

Now you can reference the input’s value (here `gain`) anywhere. The code will run whenever the input changes; no event listeners required!

```md
The current gain is ${gain}!
```

The current gain is ${gain}!
