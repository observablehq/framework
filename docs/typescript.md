# TypeScript

[Observable Markdown](./markdown) supports TypeScript — an extension of JavaScript adding types to the language — in fenced code blocks and inline expressions.

`ts` code blocks use [esbuild](https://esbuild.github.io/) to parse TypeScript syntax and discard the type annotations. Inline expressions that fail to parse with JavaScript are likewise passed to esbuild, and replaced with the transform if it succeeds.

Note however that this support is limited to parsing the code and converting it to JavaScript; esbuild does not do any type checking.

TypeScript is also supported in [data loaders](./loaders).

````md
```ts
const message: string = "Hello, world!";
```
````

try this one:

```ts echo
const file: FileAttachment = FileAttachment("javascript/hello.txt");
```

```ts echo
file.text()
```

```ts echo
function add(a: number, b: number): number {
  return a + b;
}
```

The resulting function can be called from js cells as well as other ts cells:

```js echo
add(1, 3)
```

```ts echo
add(1 as number, 3)
```

Inline expressions are also converted when they appear to be written in TypeScript:

1 + 2 = ${add(1 as number, 2)}.

```md echo
1 + 2 = ${add(1 as number, 2)}.
```

Syntax errors are shown as expected:

```ts echo
function bad() ::: {
  return a + b;
}
```

Imports are transpiled too (here `sum.js` refers to `sum.ts`; by convention, TypeScript files have the `.ts` extension but are imported using `.js`):

```ts echo
import {sum} from "./sum.js";

display(sum(1, 2));
```
