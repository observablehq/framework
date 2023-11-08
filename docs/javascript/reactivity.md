# Reactivity

You may be accustomed to code running sequentially from top to bottom, and manually evaluating code in a notebook; Observable is different: we use [dataflow](https://en.wikipedia.org/wiki/Dataflow_programming), as in a spreadsheet, to *automatically* run code in topological order as determined by [top-level variable](#top-level-variables) references. For example, here we reference variables `x` and `y` even though they are defined in a code block below:

```js show
x + y
```

When code (such as `x + y`) references variables (such as `x` and `y`) defined by other code, the *referencing* code automatically runs after the *defining* code. Since code runs independently of its order on the page, giving you the flexibility to arrange your code however you like.

### Top-level variables

A top-level variable declared in a JavaScript fenced code block can be referenced in another code block or inline expression on the same page. So if you say:

```js show
const x = 1, y = 2;
```

Then you can reference `x` and `y` elsewhere on the page (with values ${x} and ${y}, respectively). Top-level variable declarations are effectively [hoisted](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting); you can reference variables even if the defining code block appears later on the page, and code runs in topological rather than top-down document order. If multiple blocks define top-level variables with the same name, references to these variables will throw a duplicate definition error.

To prevent variables from being visible outside the current block, make them local with a block statement:

```js show
{
  const z = 3;
}
```
