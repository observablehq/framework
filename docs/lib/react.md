# React

```js echo
import {createRoot} from "react-dom/client";

const root = createRoot(display(document.createElement("DIV")));
```

The code above creates a root; a place for React content to live. We render some content into the root below.

```js echo
root.render(jsxs(createContent, {}));
```

The content is defined as a component, but hand-authored using the JSX runtime. You wouldn’t normally write this code by hand, but Framework doesn’t support JSX yet. We’re working on it.

```js echo
import {useState} from "react";
import {Fragment, jsx, jsxs} from "react/jsx-runtime";

function createContent() {
  const [color, setColor] = useState("lightblue");
  return jsxs(Fragment, {
    children: [
      jsx("h4", {
        children: "Hello, world!"
      }),
      "\n",
      jsx("p", {
        children: "This content is rendered by React."
      }),
      "\n",
      jsx("button", {
        style: {
          backgroundColor: color,
          padding: "1rem"
        },
        onClick: () => setColor(`hsl(${Math.random()*360} 80% 70%)`),
        children: "Click me to change the background color."
      })
    ]
  });
}
```
