# JavaScript

Use JavaScript to render charts, inputs, and other dynamic, interactive, and graphical content on the client. JavaScript in [Markdown](./markdown) can be expressed either as [fenced code blocks](#fenced-code-blocks) or [inline expressions](#inline-expressions). You can also [import](./imports) JavaScript modules to share code across pages.

<div class="tip">JavaScript runs on load, and re-runs <a href="./reactivity">reactively</a> when variables change.</div>

## Fenced code blocks

JavaScript fenced code blocks (<code>```js</code>) are typically used to display content such as charts and inputs. They can also be used to declare top-level variables, say to load data or declare helper functions.

JavaScript blocks come in two forms: *expression* blocks and *program* blocks. An expression block looks like this (and note the lack of semicolon):

````md
```js
1 + 2
```
````

Expression blocks [implicitly display](#implicit-display), producing:

```js
1 + 2
```

A program block looks like this (note the semicolon):

```js echo
const foo = 1 + 2;
```

A program block doesn’t display anything by default, but you can call [`display`](#display-value) to display something.

JavaScript blocks do not show their code by default. If you want to show the code, use the `echo` directive:

````md
```js echo
1 + 2
```
````

The code is rendered below the output, like so:

```js echo
1 + 2
```

Alternatively, if you just want to show the code _without_ running it, set the `run` directive to `false`:

````md
```js run=false
1 + 2
```
````

If an expression evaluates to a DOM node, the node is inserted into the page directly above the code block. Use this to create dynamic content such as charts and tables.

```js echo
document.createTextNode("[insert chart here]") // some imagination required
```

You can use the [DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) to create content as above, but typically you’ll use a helper library such as [Hypertext Literal](./lib/htl), [Observable Plot](./lib/plot), or [D3](./lib/d3) to create content. For example, here’s a component that displays a greeting:

```js echo
function greeting(name) {
  return html`Hello, <i>${name}</i>!`;
}
```

```js echo
greeting("world")
```

And here’s a line chart of Apple’s stock price using [Observable Plot](./lib/plot):

```js echo
Plot.lineY(aapl, {x: "Date", y: "Close"}).plot({y: {grid: true}})
```

Code blocks automatically re-run when referenced [reactive variables](./reactivity) change, or when you edit the page during preview. The block below references the built-in variable `now` representing the current time in milliseconds; because `now` is reactive, this block runs sixty times a second and each each new span it returns replaces the one previously displayed.

```js echo
html`<span style=${{color: `hsl(${(now / 10) % 360} 100% 50%)`}}>Rainbow text!</span>`
```

<!-- (A technical note: the parser first attempts to parse the input as an expression; if that fails, it parses it as a program. So, code such as `{foo: 1}` is interpreted as an object literal rather than a block with a labeled statement.) -->

## Inline expressions

JavaScript inline expressions <code>$\{…}</code> interpolate values into Markdown. They are typically used to display numbers such as metrics, or to arrange visual elements such as charts into rich HTML layouts.

For example, this paragraph simulates rolling a 20-sided dice:

```md
You rolled ${Math.floor(Math.random() * 20) + 1}.
```

You rolled ${Math.floor(Math.random() * 20) + 1}. (Reload the page to re-roll.)

Like fenced code blocks, inline expressions automatically re-run when referenced reactive variables change or when you edit the page during preview.

The current time is ${new Date(now).toLocaleTimeString("en-US")}.

```md
The current time is ${new Date(now).toLocaleTimeString("en-US")}.
```

Likewise, if an inline expression evaluates to a DOM element or node, it will be inserted into the page. For example, you can…

interpolate a sparkline ${Plot.plot({axis: null, margin: 0, width: 80, height: 17, x: {type: "band", round: false}, marks: [Plot.rectY(aapl.slice(-15 - number, -1 - number), {x: "Date", y1: 150, y2: "Close", fill: "var(--theme-foreground-focus)"})]})}

```md echo
interpolate a sparkline ${Plot.plot({axis: null, margin: 0, width: 80, height: 17, x: {type: "band", round: false}, marks: [Plot.rectY(aapl.slice(-15 - number, -1 - number), {x: "Date", y1: 150, y2: "Close", fill: "var(--theme-foreground-focus)"})]})}
```

or even a reactive input ${Inputs.bind(html`<input type=range style="width: 120px;">`, numberInput)} ${number}

```md
or even a reactive input ${Inputs.bind(html`<input type=range style="width: 120px;">`, numberInput)} ${number}
```

into prose.

```js echo
const numberInput = Inputs.input(0);
const number = Generators.input(numberInput);
```

Expressions cannot declare top-level reactive variables. To declare a variable, use a code block instead. You can declare a variable in a code block (without displaying it) and then display it somewhere else using an inline expression.

## TypeScript <a href="https://github.com/observablehq/framework/pull/1632" class="observablehq-version-badge" data-version="prerelease" title="Added in #1632"></a>

TypeScript fenced code blocks (<code>```ts</code>) allow TypeScript to be used in place of JavaScript. You can also import TypeScript modules (`.ts`). Use the `.js` file extension when importing TypeScript modules; TypeScript is transpiled to JavaScript during build.

<div class="warning">

Framework does not perform type checking during preview or build. If you want the additional safety of type checks, considering using [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html).

</div>

<div class="note">

TypeScript fenced code blocks do not currently support [implicit display](#implicit-display), and TypeScript is not currently allowed in [inline expressions](#inline-expressions).

</div>

## Explicit display

The built-in [`display` function](#display-value) displays the specified value.

```js echo
const x = Math.random();

display(x);
```

You can display structured objects, too. Click on the object below to inspect it.

```js echo
display({hello: {subject: "world"}, numbers: [1, 2, 3, 4]})
```

Calling `display` multiple times will display multiple values. Values are displayed in the order they are received. Previously-displayed values will be cleared when the associated code block or inline expression is invalidated.

```js echo
for (let i = 0; i < 5; ++i) {
  display(i);
}
```

If you pass `display` a DOM node, it will be inserted directly into the page. Use this technique to render dynamic displays of data, such as charts and tables.

```js echo
display(html`Your lucky number is ${Math.floor(Math.random () * 10)}!`);
```

<div class="note">
  <p>This is a contrived example — you normally use an <a href="./javascript#inline-expressions">inline expression</a> to interpolate a value into Markdown. For example:</p>
  <pre><code class="language-md">Your lucky number is &dollar;{Math.floor(Math.random () * 10)}!</code></pre>
</div>

The `display` function returns the passed-in value. You can display any value (any expression) in code, not only top-level variables; use this as an alternative to `console.log` to debug your code.

```js echo
const y = display(Math.random());
```

The value of `y` is ${y}.

```md
The value of `y` is ${y}.
```

When the value passed to `display` is not a DOM element or node, the behavior of `display` depends on whether it is called within a fenced code block or an inline expression. In fenced code blocks, `display` will use the [inspector](https://github.com/observablehq/inspector).

```js echo
display([1, 2, 3]);
```

In inline expressions, `display` will coerce non-DOM values to strings and concatenate iterables.

${display([1, 2, 3])}

```md
${display([1, 2, 3])}
```

The `display` function is scoped to each code block, meaning that the `display` function is a closure bound to where it will display on the page. But you can capture a code block’s `display` function by assigning it to a top-level variable:

```js echo
const displayThere = display;
```

Then you can reference it from other cells:

```js echo
Inputs.button("Click me", {value: 0, reduce: (i) => displayThere(++i)})
```

## Implicit display

JavaScript expression fenced code blocks are implicitly wrapped with a call to [`display`](#display-value). For example, this arithmetic expression displays implicitly:

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

Implicit display also implicitly awaits promises.

## Responsive display

In Markdown, the built-in [`width` reactive variable](#width) represents the current width of the main element. This variable is implemented by [`Generators.width`](./lib/generators#width(element)) and backed by a [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver). The reactive width can be a handy thing to pass, say, as the **width** option to [Observable Plot](./lib/plot).

```js echo
Plot.barX([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width})
```

For non-top-level elements, as when rendering content within an inline expression, use the built-in [`resize` function](#resize(render)) instead. This takes a _render_ function which is called whenever the width or height [changes](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), and the element returned by the render function is inserted into the DOM.

```html echo
<div class="card">
  ${resize((width) => Plot.barX([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width}))}
</div>
```

If your container defines a height, such as `240px` in the example below, then you can use both the `width` and `height` arguments to the render function:

```html echo
<div class="grid grid-cols-2" style="grid-auto-rows: 240px;">
  <div class="card" style="padding: 0;">
    ${resize((width, height) => Plot.barY([9, 4, 8, 1, 11, 3, 4, 2, 7, 5]).plot({width, height}))}
  </div>
  <div class="card" style="padding: 0;">
    ${resize((width, height) => Plot.barY([3, 4, 2, 7, 5, 9, 4, 8, 1, 11]).plot({width, height}))}
  </div>
</div>
```

<div class="tip">If you are using <code>resize</code> with both <code>width</code> and <code>height</code> and see nothing rendered, it may be because your parent container does not have its own height specified. When both arguments are used, the rendered element is implicitly <code>position: absolute</code> to avoid affecting the size of its parent and causing a feedback loop.</div>

## display(*value*)

Displays the specified *value* in the current context, returning *value*. If *value* is a DOM element or node, it is inserted directly into the page. Otherwise, if the current context is a fenced code block, inspects the specified *value*; or, if the current context is an inline expression, coerces the specified *value* to a string and displays it as text.

```js echo
display(1 + 2);
```

See [Explicit display](#explicit-display) for more.

## resize(*render*)

Creates and returns a DIV element to contain responsive content; then, using a [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) to observe changes to the returned element’s size, calls the specified *render* function with the new width and height whenever the size changes. The element returned by the *render* function is inserted into the DIV element, replacing any previously-rendered content. This is useful for responsive charts.

```js echo
resize((width) => `I am ${width} pixels wide.`)
```

If the *render* function returns a promise, the promise is implicitly awaited. If the resulting value is null, the DIV element is cleared; otherwise, if the resulting value is not a DOM element, it is coerced to a string and displayed as text.

See [Responsive display](#responsive-display) for more.

## width

The current width of the main element in pixels as a reactive variable. A fenced code block or inline expression that references `width` will re-run whenever the width of the main element changes, such as when the window is resized; often used for responsive charts.

```js echo
width
```

See [`Generators.width`](./lib/generators#width-element) for implementation.

## now

The current time in milliseconds since Unix epoch as a reactive variable. A fenced code block or inline expression that references `now` will run continuously; often used for simple animations.

```js echo
now
```

See [`Generators.now`](./lib/generators#now) for implementation.
