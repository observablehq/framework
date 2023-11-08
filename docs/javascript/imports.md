# Imports

You can import a library from npm like so:

```js show
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```js show
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

You can also import JavaScript from local ES modules.

```js no-run
import {foo} from "./foo.js"
```

This allows you to move code out of Markdown and into vanilla JavaScript files that can be shared by multiple pages — or even another application. And you can write tests for your code.

TK There is a [bug](https://github.com/observablehq/cli/issues/115) where npm protocol imports don’t work from local ES modules.
