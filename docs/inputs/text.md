# Text input

The Text input allows freeform single-line text entry. (For multiple lines, see [Textarea](./textarea)).

In its most basic form, a Text is a blank box whose value is the empty string. The Text’s value changes as the user types into the box.

```js echo
const text = view(Inputs.text());
```

```js echo
text
```

We recommend providing a *label* and *placeholder* to improve usability. You can also supply an initial *value* if desired.

```js echo
const name = view(Inputs.text({label: "Name", placeholder: "Enter your name", value: "Anonymous"}));
```

```js echo
name
```

The *label* may be either a text string or an HTML element, if more control over styling is desired.

```js echo
const signature = view(Inputs.text({label: html`<b>Fancy</b>`, placeholder: "What’s your fancy?"}));
```

```js echo
signature
```

For specific classes of text, such as email addresses and telephone numbers, you can supply one of the [HTML5 input types](https://developer.mozilla.org/en-US/docs/Learn/Forms/HTML5_input_types), such as email, tel (for a telephone number), or url, as the *type* option. Or, use a convenience method: Inputs.email, Inputs.password, Inputs.tel, or Inputs.url.

```js echo
const password = view(Inputs.password({label: "Password", value: "open sesame"}));
```

```js echo
password
```

The HTML5 *pattern*, *spellcheck*, *minlength*, and *maxlength* options are also supported. If the user enters invalid input, the browser may display a warning (e.g., “Enter an email address”). You can also check whether the current value is valid by calling [*form*.checkValidity](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-cva-checkvalidity).

```js echo
const email = view(Inputs.text({type: "email", label: "Email", placeholder: "Enter your email"}));
```

[TODO] fix below (had viewof operator before email.checkValidity(), not sure how to update)

```js echo
//[email, email.checkValidity()]
```

If the input will trigger some expensive calculation, such as fetching from a remote server, the *submit* option can be used to defer the Text from reporting the new value until the user clicks the Submit button or hits Enter. The value of *submit* can also be the desired contents of the submit button (a string or HTML).

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
  datalist: capitals.map(d => d.State)
}));
```

```js echo
state
```

To prevent a Text’s value from being changed, use the *disabled* option.

```js echo
const fixed = view(Inputs.text({label: "Fixed value", value: "Can’t edit me!", disabled: true}));
```

```js echo
fixed
```
