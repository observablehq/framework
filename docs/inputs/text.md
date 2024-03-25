---
keywords: textbox
---

# Text input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#text">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/text.js">Source</a> · The text input allows freeform single-line text entry. For multiple lines, see the [text area](./textarea) input.

In its most basic form, a text input is a blank box whose value is the empty string. The text’s value changes as the user types into the box.

```js echo
const text = view(Inputs.text());
```

```js echo
text
```

We recommend providing a *label* and *placeholder* to improve usability. You can also supply an initial *value* if desired.

```js echo
const name = view(
  Inputs.text({
    label: "Name",
    placeholder: "Enter your name",
    value: "Anonymous"
  })
);
```

```js echo
name
```

The *label* may be either a text string or an HTML element, if more control over styling is desired.

```js echo
const signature = view(
  Inputs.text({
    label: html`<b>Fancy</b>`,
    placeholder: "What’s your fancy?"
  })
);
```

For specific classes of text, such as email addresses and telephone numbers, you can supply one of the [HTML5 input types](https://developer.mozilla.org/en-US/docs/Learn/Forms/HTML5_input_types), such as email, tel (for a telephone number), or url, as the *type* option. Or, use a convenience method: Inputs.email, Inputs.password, Inputs.tel, or Inputs.url.

```js echo
const password = view(Inputs.password({label: "Password", value: "open sesame"}));
```

```js echo
password
```

The HTML5 *pattern*, *spellcheck*, *minlength*, and *maxlength* options are also supported. If the user enters invalid input, the browser may display a warning (_e.g._, “Enter an email address”).

```js echo
const email = view(
  Inputs.text({
    type: "email",
    label: "Email",
    placeholder: "Enter your email"
  })
);
```

If the input will trigger some expensive calculation, such as fetching from a remote server, the *submit* option can be used to defer the text input from reporting the new value until the user clicks the Submit button or hits Enter. The value of *submit* can also be the desired contents of the submit button (a string or HTML).

```js echo
const query = view(Inputs.text({label: "Query", placeholder: "Search", submit: true}));
```

```js echo
query
```

To provide a recommended set of values, pass an array of strings as the *datalist* option. For example, the input below is intended to accept the name of a U.S. state; you can either type the state name by hand or click one of the suggestions on focus.

```js echo
const capitals = FileAttachment("us-state-capitals.tsv").tsv({typed: true});
```

```js echo
const state = view(Inputs.text({
  label: "U.S. state",
  placeholder: "Enter state name",
  datalist: capitals.map((d) => d.State)
}));
```

```js echo
state
```

To prevent a text input’s value from being changed, use the *disabled* option.

```js echo
const fixed = view(Inputs.text({label: "Fixed value", value: "Can’t edit me!", disabled: true}));
```

```js echo
fixed
```

## Options

**Inputs.text(*options*)**

The available text input options are:

* *label* - a label; either a string or an HTML element
* *type* - the [input type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types), such as “password” or “email”; defaults to “text”
* *value* - the initial value; defaults to the empty string
* *placeholder* - the [placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/placeholder) attribute
* *spellcheck* - whether to activate the browser’s spell-checker
* *autocomplete* - the [autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete) attribute, as text or boolean
* *autocapitalize* - the [autocapitalize](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize) attribute, as text or boolean
* *pattern* - the [pattern](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/pattern) attribute
* *minlength* - [minimum length](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/minlength) attribute
* *maxlength* - [maximum length](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/maxlength) attribute
* *min* - [minimum value](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/min) attribute (`YYYY-MM-DD` for the date type)
* *max* - [maximum value](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/max) attribute
* *required* - if true, the input must be non-empty; defaults to *minlength* > 0
* *validate* - a function to check whether the text input is valid
* *width* - the width of the input (not including the label)
* *submit* - whether to require explicit submission; defaults to false
* *datalist* - an iterable of suggested values
* *readonly* - whether input is readonly; defaults to false
* *disabled* - whether input is disabled; defaults to false

If *validate* is not defined, [*text*.checkValidity](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity) is used. While the input is not considered valid, changes to the input will not be reported.
