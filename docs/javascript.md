# JavaScript

Observable Framework supports JavaScript in Markdown for charts, inputs, and other dynamic, interactive, and graphical content. This client-side JavaScript runs in the browser on load, and re-runs automatically when [reactive variables](./javascript/reactivity) change or when you edit pages during preview.

JavaScript in Markdown can be expressed either as [fenced code blocks](#fenced-code-blocks) or [inline expressions](#inline-expressions). You can also write JavaScript modules alongside Markdown files and [import them](./javascript/imports) into Markdown. (And you can run JavaScript, TypeScript, Python, or any other programming language during build to generate data using [data loaders](./loaders).)

## Fenced code blocks

JavaScript fenced code blocks (<code>```js</code>) are typically used to [display content](./javascript/display) such as charts and inputs. They can also be used for logic by declaring top-level variables, say to load data or declare helper functions.

JavaScript blocks come in two forms: *expression* blocks and *program* blocks. An expression block looks like this (and note the lack of semicolon):

````md
```js
1 + 2
```
````

This produces:

```js
1 + 2
```

Note that JavaScript fenced code blocks do not echo their code by default. If you want to show the code, use the `echo` directive:

````md
```js echo
1 + 2
```
````

The code is displayed below the output, like so:

```js echo
1 + 2
```

If an expression evaluates to a DOM node, the node is displayed as-is.

```js echo
document.createTextNode("Hello, world!")
```

While you can use the [standard DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model) directly to create content, you’ll typically use a helper library such as the `html` and `svg` tagged template literals provided by [Hypertext Literal](./lib/htl), [Observable Plot](./lib/plot)’s `Plot.plot` method, or [D3](./lib/d3) to create DOM elements for display.

```js echo
html`1 + 2 &equals; <b>${1 + 2}</b>`
```

```js echo
Plot.lineY(aapl, {x: "Date", y: "Close"}).plot({y: {grid: true}})
```

Fenced code blocks automatically re-run when referenced [reactive variables](./javascript/reactivity) change (or when you edit the page during preview). The block below references the built-in variable `now` representing the current time in milliseconds; because `now` is reactive, this block runs sixty times a second and each each new span it returns replaces the one previously displayed.

```js echo
html`<span style=${{color: `hsl(${(now / 10) % 360} 100% 50%)`}}>Rainbow text!</span>`
```

A program block looks like this:

```js echo
const x = 1 + 2;
```

A program block doesn’t display anything by default, but you can call the built-in [`display` function](./javascript/display) explicitly. The above block defines the top-level variable `x` with a value of ${x}.

(A technical note: the parser first attempts to parse the input as an expression; if that fails, it parses it as a program. So, code such as `{foo: 1}` is interpreted as an object literal rather than a block with a labeled statement.)

## Inline expressions

Inline JavaScript expressions (<code>$\{…}</code>) interpolate values into Markdown. They are typically used to display numbers such as metrics, or to arrange visual elements such as charts into rich HTML layouts.

For example, this paragraph simulates rolling a 20-sided dice:

```md
You rolled ${Math.floor(Math.random() * 20) + 1}.
```

You rolled ${Math.floor(Math.random() * 20) + 1}. (Reload the page to re-roll.)

Like fenced code blocks, inline expressions automatically re-run when referenced reactive variables change (or when you edit the page during preview).

The current time is ${new Date(now).toLocaleTimeString("en-US")}.

```md
The current time is ${new Date(now).toLocaleTimeString("en-US")}.
```

As with code blocks, if an inline expression evaluates to a DOM element or node, it will be inserted into the page. For example, you can…

interpolate a sparkline ${Plot.plot({axis: null, margin: 0, width: 80, height: 17, x: {type: "band", round: false}, marks: [Plot.rectY(aapl.slice(-15), {x: "Date", y1: 150, y2: "Close", fill: "var(--theme-blue)"})]})}

```md echo
interpolate a sparkline ${Plot.plot({axis: null, margin: 0, width: 80, height: 17, x: {type: "band", round: false}, marks: [Plot.rectY(aapl.slice(-15), {x: "Date", y1: 150, y2: "Close", fill: "var(--theme-blue)"})]})}
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

Unlike code blocks, expressions cannot declare top-level reactive variables.
