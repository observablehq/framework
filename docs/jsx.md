# JSX <a href="https://github.com/observablehq/framework/releases/tag/v1.9.0" class="observablehq-version-badge" data-version="^1.9.0" title="Added in 1.9.0"></a>

[React](https://react.dev/) is a popular and powerful library for building interactive interfaces. React is typically written in [JSX](https://react.dev/learn/writing-markup-with-jsx), an extension of JavaScript that allows HTML-like markup. To use JSX and React, declare a JSX fenced code block (<code>\```jsx</code>). You can alternatively use a TSX fenced code block (<code>\```tsx</code>) if using JSX with [TypeScript](./javascript#type-script).

For example, to define a `Greeting` component that accepts a `subject` prop:

````md
```jsx
function Greeting({subject}) {
  return <div>Hello, <b>{subject}</b>!</div>
}
```
````

```jsx
function Greeting({subject}) {
  return <div>Hello, <b>{subject}</b>!</div>
}
```

Then call the built-in display function to render content:

````md
```jsx
display(<Greeting subject="JSX" />);
```
````

```jsx
display(<Greeting subject="JSX" />);
```

You can combine React with Framework’s built-in [reactivity](./reactivity) by passing reactive values as props. Try changing the `name` below.

```jsx echo
display(<Greeting subject={name || "anonymous"} />);
```

```js echo
const name = view(Inputs.text({label: "Name", placeholder: "Anonymous"}));
```

You can use hooks such as [`useState`](https://react.dev/reference/react/useState), [`useEffect`](https://react.dev/reference/react/useEffect), and [`useRef`](https://react.dev/reference/react/useRef). The `Counter` component below counts the number of times you click the button.

```jsx echo
function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      You clicked {count} times
    </button>
  );
}
```

```jsx echo
display(<Counter />);
```

React is available by default as `React` in Markdown, but you can import it explicitly like so:

```js run=false
import * as React from "npm:react";
```

If you prefer, you can import specific symbols, such as hooks:

```js run=false
import {useState} from "npm:react";
```

React DOM is also available as `ReactDOM` in Markdown, or can be imported as:

```js run=false
import * as ReactDOM from "npm:react-dom/client";
```

You can define components in JSX modules. For example, if this were `components/Card.jsx`:

```jsx run=false
export function Card({title, children} = {}) {
  return (
    <div className="card">
      {title ? <h2>{title}</h2> : null}
      {children}
    </div>
  );
}
```

You could then import the `Card` component as:

```js echo
import {Card} from "./components/Card.js";
```

<div class="note">

Use the `.js` file extension when importing JSX (`.jsx`) modules; JSX is transpiled to JavaScript during build.

</div>

And, as before, you can render a card using the display function:

```jsx echo
display(<Card title="A test of cards">If you can read this, success!</Card>);
```

Within a JSX fenced code block, the [display function](./javascript#explicit-display) behaves a bit differently from a JavaScript fenced code block or inline expression:
it replaces the previously-displayed content, if any. In addition, JSX fenced code blocks do not support implicit display; content can only be displayed explicitly.

<div class="note">

In the future we intend to support other JSX-compatible frameworks, such as Preact. We are also working on server-side rendering with client-side hydration; please upvote [#931](https://github.com/observablehq/framework/issues/931) if you are interested in this feature.

</div>

## Inline expressions

JSX is not currently supported in inline expression `${…}`; only JavaScript is allowed in inline expressions. However, you can declare a detached root using [`createRoot`](https://react.dev/reference/react-dom/client/createRoot):

```js echo
const node = document.createElement("SPAN");
const root = ReactDOM.createRoot(node);
```

Then use a JSX code block to render the desired content into the root:

```jsx echo
root.render(<>Hello, <i>{name || "anonymous"}</i>!</>);
```

Lastly, interpolate the root into the desired location with an inline expression:

<div class="card">
  <h2>Rendering into an inline expression</h2>
  ${node}
</div>

```md run=false
<div class="card">
  <h2>Rendering into an inline expression</h2>
  ${node}
</div>
```
