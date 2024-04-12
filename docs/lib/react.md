# React

```js echo
import {createRoot} from "react-dom/client";

const root = createRoot(display(document.createElement("DIV")));
```

```js echo
root.render(createContent());
```

```js echo
import {Fragment, jsx, jsxs} from "react/jsx-runtime";

function createContent() {
  return jsxs(Fragment, {
    children: [jsx("h1", {
      children: "Hello, world!"
    }), "\n", jsx("p", {
      children: "Below is an example of markdown in JSX."
    }), "\n", jsx("div", {
      style: {
        backgroundColor: 'violet',
        padding: '1rem'
      },
      children: jsxs("p", {
        children: ["Try and change the background color to ", jsx("code", {
          children: "tomato"
        }), "."]
      })
    })]
  });
}
```
