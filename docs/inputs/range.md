---
keywords: sliders
---

# Range input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#range">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/range.js">Source</a> · The range input specifies a number between the given *min* and *max* (inclusive). This number can be adjusted roughly by sliding, or precisely by typing. A range input is also known as a slider.

By default, a range chooses a floating point number between 0 and 1 with full precision, which is often more precision than desired.

```js echo
const x = view(Inputs.range());
```

```js echo
x
```

The *step* option is strongly encouraged to set the desired precision (the interval between adjacent values). For integers, use *step* = 1. The up and down buttons in the number input will only work if a *step* is specified. To change the extent, pass [*min*, *max*] as the first argument.

```js echo
const y = view(Inputs.range([0, 255], {step: 1}));
```

The *min*, *max* and *step* options affect only the slider behavior, the number input’s buttons, and whether the browser shows a warning if a typed number is invalid; they do not constrain the typed number.

The *value* option sets the initial value, which defaults to the middle of the range: (*min* + *max*) / 2.

```js echo
const z = view(Inputs.range([0, 255], {step: 1, value: 0}));
```

```js echo
z
```

To describe the meaning of the input, supply a *label*. A *placeholder* string may also be specified; it will only be visible when the number input is empty.

```js echo
const gain = view(Inputs.range([0, 11], {label: "Gain", step: 0.1, placeholder: "0–11"}));
```

```js echo
gain
```

For more control over typography, the *label* may be an HTML element.

```js echo
const n = view(Inputs.range([1, 10], {label: html`Top <i>n</i>`, step: 1}));
```

You can even use a ${tex`\TeX`} label, if you’re into that sort of thing.

```js echo
const psir = view(Inputs.range([0, 1], {label: tex`\psi(\textbf{r})`}));
```

For an unbounded range, or simply to suppress the range input, you can use Inputs.number instead of Inputs.range. If you don’t specify an initial value, it defaults to undefined which causes referencing cells to wait for valid input.

```js echo
const m = view(Inputs.number([0, Infinity], {step: 1, label: "Favorite integer", placeholder: ""}));
```

```js echo
m
```

If differences in the numeric range are not uniformly interesting — for instance, when looking at log-distributed values — pass a *transform* function to produce a [nonlinear slider](https://mathisonian.github.io/idyll/nonlinear-sliders/). The built-in Math.log and Math.sqrt transform functions are recommended. If you supply a custom function, you should also provide an *invert* function that implements the inverse transform. (Otherwise, the Range will use [Newton’s method](https://en.wikipedia.org/wiki/Newton%27s_method) which may be inaccurate.)

```js echo
Inputs.range([1, 100], {transform: Math.log})
```

```js echo
Inputs.range([0, 1], {transform: Math.sqrt})
```

The *format* option allows you to specify a function that is called to format the displayed number. Note that the returned string must be a [valid floating-point number](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-floating-point-number) according to the HTML specification; no commas allowed!

```js echo
const f = view(Inputs.range([0, 1], {format: x => x.toFixed(2)}));
```

```js echo
f
```

To prevent a range’s value from being changed, use the *disabled* option.

```js echo
const d = view(Inputs.range([0, 1], {disabled: true}));
```

```js echo
d
```

## Options

**Inputs.range(*extent*, *options*)**

The available range input options are:

* *label* - a label; either a string or an HTML element
* *step* - the step (precision); the interval between adjacent values
* *format* - a format function; defaults to [formatTrim](https://github.com/observablehq/inputs?tab=readme-ov-file#inputsformattrimnumber)
* *placeholder* - a placeholder string for when the input is empty
* *transform* - an optional non-linear transform
* *invert* - the inverse transform
* *validate* - a function to check whether the number input is valid
* *value* - the initial value; defaults to (*min* + *max*) / 2
* *width* - the width of the input (not including the label)
* *disabled* - whether input is disabled; defaults to false

The given *value* is clamped to the given extent, and rounded if *step* is defined. However, note that the *min*, *max* and *step* options affect only the slider behavior, the number input’s buttons, and whether the browser shows a warning if a typed number is invalid; they do not constrain the typed number.

If *validate* is not defined, [*number*.checkValidity](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity) is used. While the input is not considered valid, changes to the input will not be reported.

The *format* function should return a string value that is compatible with native number parsing. Hence, the default [formatTrim](https://github.com/observablehq/inputs?tab=readme-ov-file#inputsformattrimnumber) is recommended.

If a *transform* function is specified, an inverse transform function *invert* is strongly recommended. If *invert* is not provided, the Range will fallback to Newton’s method, but this may be slow or inaccurate. Passing Math.sqrt, Math.log, or Math.exp as a *transform* will automatically supply the corresponding *invert*. If *min* is greater than *max*, *i.e.* if the extent is inverted, then *transform* and *invert* will default to `(value) => -value`.
