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
  const [counter, setCounter] = useState(0);
  return jsxs(Fragment, {
    children: [
      jsx("p", {
        children: ["Hello, world! ", counter]
      }),
      "\n",
      jsx("p", {
        children: "This content is rendered by React."
      }),
      "\n",
      jsx("div", {
        style: {
          backgroundColor: "indigo",
          padding: "1rem"
        },
        onClick: () => setCounter(counter + 1),
        children: jsxs("p", {
          children: [
            "Try changing the background color to ",
            jsx("code", {
              children: "tomato"
            }),
            "."
          ]
        })
      })
    ]
  });
}
```
