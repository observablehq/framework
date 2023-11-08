# Imports

You can import a library from npm like so:

```js show
import confetti from "npm:canvas-confetti";
```

Now you can reference the imported `confetti` anywhere on the page.

```js show
Inputs.button("Throw confetti!", {reduce: () => confetti()})
```

You can also import JavaScript from local ES modules. This allows you to move code out of Markdown and into vanilla JavaScript files that can be shared by multiple pages — or even another application. And you can write tests for your code.
