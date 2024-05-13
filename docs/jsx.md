# JSX

Should this page be called React? Probably, since Framework only supports JSX for React. And also React isn’t really usable without JSX.

```js echo
import {createRoot} from "npm:react-dom/client";

const root = createRoot(display(document.createElement("DIV")));
```

The code above creates a root; a place for React content to live. We import a JSX component and render it into the root below.

```jsx echo
import App from "./hello-jsx.js";

root.render(<App />);
```
