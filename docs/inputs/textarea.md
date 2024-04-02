---
keywords: textbox
---

# Text area input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#textarea">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/textarea.js">Source</a> · The textarea input allows freeform multi-line text entry. For a single line, see the [text](./text) input.

In its most basic form, a textarea is a blank box whose value is the empty string. The textarea’s value changes as the user types into the box.

```js echo
const text = view(Inputs.textarea());
```

```js echo
text
```

We recommend providing a *label* and *placeholder* to improve usability. You can also supply an initial *value* if desired. The *label* may be either a text string or an HTML element, if more control over styling is desired.

```js echo
const bio = view(Inputs.textarea({label: "Biography", placeholder: "What’s your story?"}));
```

```js echo
bio
```

If the input will trigger some expensive calculation, such as fetching from a remote server, the *submit* option can be used to defer the textarea from reporting the new value until the user clicks the Submit button or hits Command-Enter. The value of *submit* can also be the desired contents of the submit button (a string or HTML).

```js echo
const essay = view(Inputs.textarea({label: "Essay", rows: 6, minlength: 40, submit: true}));
```

```js echo
essay
```

The HTML5 *spellcheck*, *minlength*, and *maxlength* options are supported. If the user enters invalid input, the browser may display a warning (e.g., “Use at least 80 characters”).

To prevent a textarea’s value from being changed, use the *disabled* option.

```js echo
const fixed = view(Inputs.textarea({label: "Fixed value", value: "Can’t edit me!", disabled: true}));
```

```js echo
fixed
```

## Options

**Inputs.textarea(*options*)**

The available text area options are:

* *label* - a label; either a string or an HTML element
* *value* - the initial value; defaults to the empty string
* *placeholder* - the [placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/placeholder) attribute
* *spellcheck* - whether to activate the browser’s spell-checker
* *autocomplete* - the [autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) attribute, as text or boolean
* *autocapitalize* - the [autocapitalize](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize) attribute, as text or boolean
* *minlength* - [minimum length](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/minlength) attribute
* *maxlength* - [maximum length](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/maxlength) attribute
* *required* - if true, the input must be non-empty; defaults to *minlength* > 0
* *validate* - a function to check whether the text input is valid
* *width* - the width of the input (not including the label)
* *rows* - the number of rows of text to show
* *resize* - if true, allow vertical resizing; defaults to *rows* < 12
* *submit* - whether to require explicit submission; defaults to false
* *readonly* - whether input is readonly; defaults to false
* *disabled* - whether input is disabled; defaults to false
* *monospace* - if true, use a monospace font

If *validate* is not defined, [*text*.checkValidity](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity) is used. While the input is not considered valid, changes to the input will not be reported.
