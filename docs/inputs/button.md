# Button

A Button emits an *input* event when you click it. Buttons may be used to trigger the evaluation of cells, say to restart an animation.

For example, below is an animation (using [yield](../javascript/generators)) that progressively hides a bar. The <code>progress</code> cell references <code>replay</code>, so it will run automatically whenever the replay button is clicked. If you click the button while the animation is still running, the animation will be interrupted and restart from the beginning.

```js echo
const replay = view(Inputs.button("Replay"))
```

[TODO]: unbreak this code block for progress bar

```js echo
// const progress = {
//   replay;
//   const width = 360;
//   const height = 20;
//   const context = DOM.context2d(width, height);
//   context.canvas.style.border = "solid 1px black";
//   for (let i = width; i >= 0; --i) {
//     context.clearRect(0, 0, width, height);
//     context.fillRect(0, 0, i, height);
//     yield context.canvas;
//   }
// }
```

You can also use buttons to count clicks. While the value of a button is often not needed, it defaults to zero and is incremented each time the button is clicked.

```js echo
const clicks = view(Inputs.button("Click me"))
```

```js echo
clicks
```

Interpolate input values into markdown using [inline expressions](../javascript#inline-expressions):

You have clicked ${clicks} times. 

```md
You have clicked ${clicks} times.
```

You can change this behavior by specifying the *value* and *reduce* options: *value* is the initial value, and *reduce* is called whenever the button is clicked, being passed the current value and returning the new value. The value of the button below is the last time the button was clicked, or null if the button has not been clicked.

```js echo
const time = view(Inputs.button("Update", {value: null, reduce: () => new Date}))
```

```js
time
```

Note that even if the value of the button doesn’t change, it will still trigger any cells that reference the button’s value to run. (The Observable runtime listens for *input* events on the view, and doesn’t check whether the value of the view has changed.)

For multiple buttons, pass an array of [*content*, *reduce*] tuples. For example, to have a counter that can be incremented, decremented, and reset:

```js echo
const counter = view(Inputs.button([
  ["Increment", value => value + 1],
  ["Decrement", value => value - 1],
  ["Reset", value => 0]
], {value: 0, label: "Counter"}))
```

```js echo
counter
```

The first argument to Button is the contents of the button. It’s not required, but it’s strongly encouraged.

```js echo
const x = view(Inputs.button())
```

The contents of the Button can be an HTML element if desired, say for control over typography.

```js echo
const y = view(Inputs.button(html`<i>Fancy</i>`))
```

Like other basic inputs, buttons can have an optional label, which can also be either a text string or an HTML element.

```js echo
const confirm = view(Inputs.button("OK", {label: "Continue?"}))
```

[TODO] unbreak JavaScript code below to output markdown text

```js echo
// confirm ? md`Confirmed!` : md`Awaiting confirmation…`
confirm ? "Confirmed!" : "Awaiting confirmation..."
```

You can also use a button to copy something to the clipboard.

```js echo
Inputs.button("copy to clipboard", {value: null, reduce: () => navigator.clipboard.writeText(time)})
```





