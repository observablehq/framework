# JavaScript: Mutables

Normally, only the code block that declares a [top-level variable](./reactivity) can define it or assign to it. You can however use the `Mutable` function to declare a mutable generator, allowing other code to mutate the generator’s value.

`Mutable` is available by default in Markdown but you can import it explicitly like so:

```js echo
import {Mutable} from "npm:@observablehq/stdlib";
```

Then to use it:

```js echo
const count = Mutable(0);
const increment = () => ++count.value;
const reset = () => count.value = 0;
```

In other code, you can now create buttons to increment and reset the count like so:

```js echo
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

Count is: ${html`<span class="flash">${count}</span>`}.

```md
Count is: ${html`<span class="flash">${count}</span>`}.
```

This approach is akin to React’s `useState` hook.

Within the defining code block, `count` is a generator and `count.value` can be read and written to as desired; in other code, `count` is the generator’s current value. Other code that references `count` will re-run automatically whenever `count.value` is reassigned — so be careful you don’t cause an infinite loop!
