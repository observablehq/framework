# File input

<a href="https://github.com/observablehq/inputs/blob/main/README.md#file">API</a> · <a href="https://github.com/observablehq/inputs/blob/main/src/file.js">Source</a> · The file input specifies a local file and is intended for prompting the user to select a file from their own machine. The exposed value provides the same interface as [`FileAttachment`](../javascript/files) for convenient parsing in various formats such as text, image, JSON, CSV, ZIP, and XLSX.

By default, any file is allowed, and the value of the input resolves to null.

```js echo
const file = view(Inputs.file());
```

```js echo
file
```

We recommend providing a *label* to improve usability.

Specify the *accept* option to limit the allowed file extensions. This is useful when you intend to parse the file as a specific file format, such as CSV. By setting the *required* option to true, the value of the input won’t resolve until the user choses a file.

```js echo
const csvfile = view(Inputs.file({label: "CSV file", accept: ".csv", required: true}));
```

Once a file has been selected, you can read its contents like so:


```js echo
csvfile.csv({typed: true})
```

Here are examples of other supported file types.

```js echo
const jsonfile = view(Inputs.file({label: "JSON file", accept: ".json", required: true}));
```

```js echo
jsonfile.json()
```

```js echo
const textfile = view(Inputs.file({label: "Text file", accept: ".txt", required: true}));
```

```js echo
textfile.text()
```

```js echo
const imgfile = view(Inputs.file({label: "Image file", accept: ".png,.jpg", required: true}));
```

```js echo
imgfile.image()
```

```js echo
const xlsxfile = view(Inputs.file({label: "Excel file", accept: ".xlsx", required: true}));
```

```js echo
xlsxfile.xlsx()
```

```js echo
const zipfile = view(Inputs.file({label: "ZIP archive", accept: ".zip", required: true}));
```

```js echo
zipfile.zip()
```

The *multiple* option allows the user to pick multiple files. In this mode, the exposed value is an array of files instead of a single file.

```js echo
const files = view(Inputs.file({label: "Files", multiple: true}));
```

```js echo
files
```

## Options

**Inputs.file(*options*)**

The available file input options are:

* *label* - a label; either a string or an HTML element
* *required* - if true, a valid file must be selected
* *validate* - a function to check whether the file input is valid
* *accept* - the [acceptable file types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept)
* *capture* - for [capturing image or video data](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#capture)
* *multiple* - whether to allow multiple files to be selected; defaults to false
* *width* - the width of the input (not including the label)
* *disabled* - whether input is disabled; defaults to false

<div class="note">The value of file input cannot be set programmatically; it can only be changed by the user.</div>
