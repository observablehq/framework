# Text area input

The Text area input allows freeform multi-line text entry. (For a single line, see [Text](./text)).

In its most basic form, a Textarea is a blank box whose value is the empty string. The Textarea’s value changes as the user types into the box.

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

If the input will trigger some expensive calculation, such as fetching from a remote server, the *submit* option can be used to defer the Textarea from reporting the new value until the user clicks the Submit button or hits Command-Enter. The value of *submit* can also be the desired contents of the submit button (a string or HTML).

```js echo
const essay = view(Inputs.textarea({label: "Essay", rows: 6, minlength: 40, submit: true}));
```

```js echo
essay
```

The HTML5 *spellcheck*, *minlength*, and *maxlength* options are supported. If the user enters invalid input, the browser may display a warning (e.g., “Use at least 80 characters”). You can also check whether the current value is valid by calling [*form*.checkValidity](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity).

To prevent a Textarea’s value from being changed, use the *disabled* option.

```js echo
const fixed = view(Inputs.textarea({label: "Fixed value", value: "Can’t edit me!", disabled: true}));
```

```js echo
fixed
```