# Markdown reference

See [GitHub’s guide to Markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax) for an introduction. In addition to standard Markdown features — headings, formatting, tables, and the like — Observable Markdown supports [reactive JavaScript](./javascript).

### Fenced code blocks

JavaScript fenced code blocks are typically used to display content such as charts and inputs. They can also declare top-level variables, say to load data or declare helper functions. An expression code block looks like this (note the lack of semicolon):

````md
```js
1 + 2
```
````

This produces:

```js
1 + 2
```

A program code block looks like this:

````md
```js
const x = 1 + 2;
```
````

```js
const x = 1 + 2;
```

A program code block doesn’t display anything by default, but you can call the built-in [display function](./javascript#display(value)) explicitly. The above block defines the top-level variable `x` with a value of ${x}.

(A technical note: the parser first attempts to parse the input as an expression; if that fails, it parses it as a program. So, code such as `{foo: 1}` is interpreted as an object literal rather than a block with a labeled statement.)

### Inline expressions

Inline JavaScript expressions interpolate live values into Markdown. They are typically used to display dynamic numbers such as metrics, or to arrange visual elements such as charts into rich HTML layouts.

For example, this paragraph simulates rolling a 20-sided dice:

```md
You rolled ${Math.floor(Math.random() * 20) + 1}.
```

You rolled ${Math.floor(Math.random() * 20) + 1}. Reload the page to re-roll.

Unlike code blocks, expressions cannot declare top-level variables.
