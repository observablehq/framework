# JavaScript reference

Observable Markdown features live, reactive JavaScript. There are two ways to write live JavaScript: fenced code blocks (<code>```js</code>) and inline expressions (<code>$\{…}</code>).

### Fenced code blocks

Code blocks are often used to display content such as charts and inputs. They can also declare top-level variables, say to load data or declare helper functions. Code blocks can contain either a single expression or zero or more statements. (The parser first parses the input as an expression; if that fails, it parses it as a program.)

### Inline expressions

Expressions implicitly display their associated value; they are often used to interpolate dynamic values such as metrics into prose, or to arrange visual elements such as charts into rich HTML layouts. Unlike code blocks, expressions cannot declare top-level variables.

### Top-level variables

A top-level variable declared in a fenced code block can be referenced in another code block or inline expression `${…}` on the same page. So if you say:

```js show
const x = 1, y = 2;
```

Then you can reference `x` and `y` anywhere else on the page. (Top-level variable declarations are [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page.) If multiple blocks define top-level variables with the same name, references to these variables will throw a duplicate definition error.

To prevent variables from being visible outside the current block, make them local with a block statement:

```js show
{
  const z = 3;
}
```

### Reactive references

References to top-level variables in other code blocks are reactive: promises are implicitly awaited and generators are implicitly consumed. For example, within the block below, `hello` is a Promise; but if you reference `hello` from another block, that block won’t run until `hello` resolves, where it will see a string.

```js show
const hello = Promises.delay(1000, "hello");
```

Hello is: ${hello}.

As a more complicated example using Generators.observe:

```js show
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.

## Displaying content

A JavaScript fenced code block containing an expression will automatically display its value, as will an inline expression. You can also manually display elements or inspect values by calling the built-in **display** function. A code block (and even an inline expression) can call display multiple times to display multiple values.

### display(*value*)

If *value* is a DOM node, adds it to the DOM. Otherwise, converts the given *value* to a suitable DOM node and displays that instead. Returns the given *value*.

When *value* is not a DOM node, the display is different for fenced code blocks and inline expressions. In fenced code blocks, display will use the [Observable Inspector](https://github.com/observablehq/inspector); whereas for inline expressions, display will coerce non-DOM values to strings and will display multiple values when passed an iterable.

### view(*input*)

It’s equivalent to Generators.input(display(*input*)). Use it to display an input element while also declaring the input’s current value as a reactive top-level variable.
