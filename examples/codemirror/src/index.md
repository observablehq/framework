---
theme: light
---

# CodeMirror

Here’s a basic editor powered by CodeMirror. Its value is exposed as `input`, and then the result of `eval`’ing `input` is shown below. Try editing the code and then running it with Shift-Enter or by clicking the Run button.

```js echo
const input = view(Editor({value: "1 + 2"}));
```

```js echo
eval(input)
```

The editor is implemented in a component:

```js echo
import {Editor} from "./components/Editor.js";
```

The implementation looks like this:

```js run=false
import {javascript} from "npm:@codemirror/lang-javascript";
import {EditorView, keymap} from "npm:@codemirror/view";
import {button} from "npm:@observablehq/inputs";
import {basicSetup} from "npm:codemirror";

export function Editor({
  value = "",
  style = "font-size: 14px;"
} = {}) {
  const parent = document.createElement("div");
  parent.style = style;
  parent.value = value;

  const run = () => {
    parent.value = String(editor.state.doc);
    parent.dispatchEvent(new InputEvent("input", {bubbles: true}));
  };

  const editor = new EditorView({
    parent,
    doc: value,
    extensions: [
      basicSetup,
      javascript(),
      keymap.of([
        {key: "Shift-Enter", preventDefault: true, run},
        {key: "Mod-s", preventDefault: true, run}
      ])
    ]
  });

  parent.addEventListener("input", (event) => event.isTrusted && event.stopImmediatePropagation());
  parent.appendChild(button([["Run", run]]));

  return parent;
}
```
