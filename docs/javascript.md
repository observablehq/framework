# JavaScript reference

Observable Markdown supports reactive JavaScript as both fenced code blocks and inline expressions. JavaScript runs on the client, powered by the [Observable Runtime](https://github.com/observablehq/runtime). (In the future, JavaScript may also run during build to support data snapshot generation and server-side rendering.)

### Top-level variables

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```js show
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively). Top-level variable declarations are [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page. If multiple blocks define top-level variables with the same name, references to these variables will throw a duplicate definition error.

To prevent variables from being visible outside the current block, make them local with a block statement:

```js show
{
  const z = 3;
}
```

### Reactive references

References to top-level variables in other code blocks are reactive: promises are implicitly awaited and generators are implicitly consumed. For example, within the block below, `hello` is a Promise. If you reference `hello` from another block, the other block won’t run until `hello` resolves and it will see a string.

```js show
const hello = new Promise((resolve) => {
  setTimeout(() => resolve("hello"), 1000);
});
```

Hello is: ${hello}.

Values that change over time, such as interactive inputs and animation parameters, are represented as [async generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator). You won’t typically implement a generator directly; instead you’ll use a built-in implementation. For example, Generators.input takes an input element and returns a generator that yields the input’s value whenever it changes. (You can also use the [Observable Inputs](https://github.com/observablehq/inputs) to construct beautiful inputs.) Try entering your name into the box below:

```js show
const nameInput = Inputs.text({label: "Name", placeholder: "Enter your name"});
const name = Generators.input(nameInput);

display(nameInput);
```

Name is: ${name}.

The built-in view function conveniently combines displaying a given input element and returning its corresponding generator. The above can be shortened as:

```js no-run
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name"}));
```

As another example, here is using the built-in Generators.observe to represent the current coordinates of the pointer:

```js show
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.

### Displaying content

A JavaScript fenced code block containing an expression will automatically display its value, as will an inline JavaScript expression. You can also manually display elements or inspect values by calling the built-in display function.

#### display(*value*)

If *value* is a DOM node, adds it to the DOM. Otherwise, converts the given *value* to a suitable DOM node and displays that instead. Returns the given *value*.

When *value* is not a DOM node, display will automatically create a suitable corresponding DOM node to display. The exact behavior depends on the input *value*, and whether display is called within a fenced code block or an inline expression. In fenced code blocks, display will use the [Observable Inspector](https://github.com/observablehq/inspector); in inline expressions, display will coerce non-DOM values to strings, and will concatenate values when passed an iterable.

You can call display multiple times within the same code block or inline expression to display multiple values. The display will be automatically cleared if the associated code block or inline expression is re-run.

#### view(*input*)

As described above, this function displays the given *input* and then returns its corresponding generator via Generators.input. Use this to display an input element while also declaring the input’s current value as a reactive top-level variable.

### Imports

You can import a library from npm like so:

```js show
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```js show
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

You can also import JavaScript from local ES modules. This allows you to move code out of Markdown and into vanilla JavaScript files that can be shared by multiple pages — or even another application. And you can write tests for your code.

### Files

You can load files using the built-in FileAttachment function.

```js show
const gistemp = await FileAttachment("gistemp.csv").csv({typed: true});
```

The following type-specific methods are supported: csv, html, image, json, sqlite, text, tsv, xlsx, xml, and zip. There are also generic methods: arrayBuffer, blob, and url. Each method returns a promise to the file’s contents (or URL).

We use static analysis to determine which files are used so that we can include only referenced files when building. The FileAttachment function accepts only literal strings; code such as `FileAttachment("my" + "file.csv")` or similar dynamic invocation is invalid syntax.
