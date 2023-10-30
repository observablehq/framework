# JavaScript reference

[Observable Markdown](./markdown) supports reactive JavaScript. JavaScript runs on the client, powered by the [Observable Runtime](https://github.com/observablehq/runtime). (In the future, JavaScript may also run during build to support data snapshot generation and server-side rendering.)

## Reactivity

You may be accustomed to code running sequentially from top to bottom, and manually evaluating code in a notebook; Observable is different: we use [dataflow](https://en.wikipedia.org/wiki/Dataflow_programming), as in a spreadsheet, to *automatically* run code in topological order as determined by [top-level variable](#top-level-variables) references. For example, here we reference variables `x` and `y` even though they are defined in a code block below:

```{js show}
x + y
```

When code (such as `x + y`) references variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs after the *defining* code. Since code runs independently of its order on the page, giving you the flexibility to arrange your code however you like.

### Top-level variables

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```{js show}
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively). Top-level variable declarations are effectively [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page, and code runs in topological rather than top-down document order. If multiple blocks define top-level variables with the same name, references to these variables will throw a duplicate definition error.

To prevent variables from being visible outside the current block, make them local with a block statement:

```{js show}
{
  const z = 3;
}
```

### Promises

When code refers to a promise defined in another code block, the referencing code implicitly awaits the promise. Most often, promises are used to load files, fetch data from a remote server, or query a database. As a contrived example, within the block below, `hello` is a promise that resolves via `setTimeout`; if you reference `hello` from another code block or expression, the other code won’t run until the timeout fires and will see `hello` as a string.

```{js show}
const hello = new Promise((resolve) => {
  setTimeout(() => {
    resolve("hello");
  }, 1000);
});
```

Hello is: ${hello}.

### Generators

When code refers to a [generator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator) defined in another code block, the referencing code automatically runs each time the generator yields a value. Values that change over time, such as interactive inputs and animation parameters, are often represented as generators. For example, you can use [Observable Inputs](https://github.com/observablehq/inputs) and the built-in [`view` function](#view(input)) to construct a live text input. Try entering your name into the box below:

```{js show}
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name"}));
```

Name is: ${name}.

The `view` function calls `Generators.input` under the hood, which takes an input element and returns a generator that yields the input’s value whenever it changes. The code above can be written more explicitly as:

```{js no-run}
const nameInput = Inputs.text({label: "Name", placeholder: "Enter your name"});
const name = Generators.input(nameInput);

display(nameInput);
```

As another example, you can use the built-in `Generators.observe` to represent the current pointer coordinates:

```{js show}
const pointer = Generators.observe((notify) => {
  const pointermoved = (event) => notify([event.clientX, event.clientY]);
  addEventListener("pointermove", pointermoved);
  notify([0, 0]);
  return () => removeEventListener("pointermove", pointermoved);
});
```

Pointer is: ${pointer.map(Math.round).join(", ")}.

#### Mutable(*value*)

Normally, only the code block that declares a top-level variable can define it or assign to it. (This constraint may helpfully encourage you to decouple code.) You can however use the `Mutable` function to declare a mutable generator, allowing other code to mutate the generator’s value. This approach is akin to React’s `useState` hook. For example:

```{js show}
const count = Mutable(0);
const increment = () => ++count.value;
const reset = () => count.value = 0;
```

In other code, you can now create buttons to increment and reset the count like so:

```{js show}
Inputs.button([["Increment", increment], ["Reset", reset]])
```

<style type="text/css">
@keyframes flash {
  from { background-color: var(--theme-foreground-focus); }
  to { background-color: none; }
}
.flash {
  animation-name: flash;
  animation-duration: 1s;
}
</style>

Count is: ${htl.html`<span class="flash">${count}</span>`}.

Within the defining code block, `count` is a generator and `count.value` can be read and written to as desired; in other code, `count` is the generator’s current value. Other code that references `count` will re-run automatically whenever `count.value` is reassigned — so be careful you don’t cause an infinite loop!

## Displaying content

A JavaScript fenced code block containing an expression will automatically display its value, as will an inline JavaScript expression. You can also manually display elements or inspect values by calling the built-in `display` function.

### display(*value*)

If `value` is a DOM node, adds it to the DOM. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

When `value` is not a DOM node, display will automatically create a suitable corresponding DOM node to display. The exact behavior depends on the input `value`, and whether display is called within a fenced code block or an inline expression. In fenced code blocks, display will use the [Observable Inspector](https://github.com/observablehq/inspector); in inline expressions, display will coerce non-DOM values to strings, and will concatenate values when passed an iterable.

You can call display multiple times within the same code block or inline expression to display multiple values. The display will be automatically cleared if the associated code block or inline expression is re-run.

### view(*input*)

As described above, this function displays the given `input` and then returns its corresponding generator via `Generators.input`. Use this to display an input element while also declaring the input’s current value as a reactive top-level variable.

## Imports

You can import a library from npm like so:

```{js show}
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```{js show}
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

You can also import JavaScript from local ES modules. This allows you to move code out of Markdown and into vanilla JavaScript files that can be shared by multiple pages — or even another application. And you can write tests for your code.

## Files

You can load files using the built-in `FileAttachment` function.

```{js show}
const gistemp = FileAttachment("gistemp.csv").csv({typed: true});
```

The following type-specific methods are supported: *csv*, *html*, *image*, *json*, *sqlite*, *text*, *tsv*, *xlsx*, *xml*, and *zip*. There are also generic methods: *arrayBuffer*, *blob*, and *url*. Each method returns a promise to the file’s contents (or URL).

We use static analysis to determine which files are used so that we can include only referenced files when building. The `FileAttachment` function accepts only literal strings; code such as `FileAttachment("my" + "file.csv")` or similar dynamic invocation is invalid syntax.
