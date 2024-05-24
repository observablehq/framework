# markdown-it-container

This Framework example demonstrates how to use [`markdown-it-container`](https://github.com/markdown-it/markdown-it-container), which extends Markdown to allow `:::` syntax for styled containers.

First, install `markdown-it-container` with your preferred package manager such as npm or Yarn. Then, register the plugin using the **markdownIt** config option in your `observablehq.config.js` file. Declare as many custom containers as you like; below, we register three (`card`, `tip`, and `warning` — each corresponding to classes that are built-in to Framework).

```js run=false
import MarkdownItContainer from "markdown-it-container";

export default {
  root: "src",
  markdownIt: (md) =>
    md
      .use(MarkdownItContainer, "card") // ::: card
      .use(MarkdownItContainer, "tip") // ::: tip
      .use(MarkdownItContainer, "warning") // ::: warning
};
```

Below are some examples.

::: card
That’s a _nice_ card, ain’t it?
:::

```md run=false
::: card
That’s a _nice_ card, ain’t it?
:::
```

::: tip
That’s a _nice_ **tip**, ain’t it?
:::

```md run=false
::: tip
That’s a _nice_ **tip**, ain’t it?
:::
```

::: warning
That’s a _nice_ **warning**, ain’t it?
:::

```md run=false
::: warning
That’s a _nice_ **warning**, ain’t it?
:::
```
