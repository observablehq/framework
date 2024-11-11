# Custom 2D input

Here is a 2D range input; click (or drag) to set the _xy_ value:

```js echo
const xyInput = Range2D();
const xy = view(xyInput);
```

Are here are two linked 1D range inputs:

```js echo
const xInput = Inputs.range([0, 1], {label: "x", step: 0.01});
const yInput = Inputs.range([0, 1], {label: "y", step: 0.01});
const x = view(xInput);
const y = view(yInput);
```

The inputs are linked; interacting with either the 2D input or the 1D inputs affects the other. This is implemented with _input_ event listeners: when the _xyInput_ emits an _input_ event, the current _xInput_.value and _yInput_.value are updated; and likewise when the _xInput_ or _yInput_ emits an _input_ event, the _xyInput_.value is updated. To avoid an infinite loop, each event listener checks if the event bubbles to distinguish direct and indirect input.

```js echo
xyInput.oninput = (event) => {
  if (!event.bubbles) return;
  xInput.value = xyInput.value[0];
  yInput.value = xyInput.value[1];
  xInput.dispatchEvent(new Event("input"));
  yInput.dispatchEvent(new Event("input"));
};
xInput.oninput = yInput.oninput = (event) => {
  if (!event.bubbles) return;
  xyInput.value = [xInput.value, yInput.value];
  xyInput.dispatchEvent(new Event("input"));
};
```

Lastly here’s the custom 2D range input implementation, which is stored in a separate module, `Range2D.js`. It uses a canvas element and pointer events to update the selected 2D value. Each value is in the interval [0, 1]. When the pointer is down and moves, an _input_ event is dispatched for compatibility with `Generators.input`.

```js run=false
export function Range2D({width = 100, height = 100, value = [0.5, 0.5]} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.border = "1px solid black";

  let down = false;
  canvas.onpointerup = () => (down = false);
  canvas.onpointerdown = (event) => {
    down = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.onpointermove(event);
  };
  canvas.onpointermove = (event) => {
    if (!down) return;
    event.preventDefault(); // prevent scrolling and text selection
    set([event.offsetX / width, event.offsetY / height]);
    canvas.dispatchEvent(new Event("input", {bubbles: true}));
  };

  const context = canvas.getContext("2d");

  function set([x, y]) {
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "red";
    context.fillRect(Math.floor(x * width), 0, 1, height);
    context.fillRect(0, Math.floor(y * height), width, 1);
    value = [x, y];
  }

  set(value);

  return Object.defineProperty(canvas, "value", {get: () => value, set});
}
```

To import `Range2D`:

```js echo
import {Range2D} from "./Range2D.js";
```
