# JSX

Framework supports [React](https://react.dev/) and [JSX](https://react.dev/learn/writing-markup-with-jsx). This provides a convenient way of writing dynamic HTML in JavaScript, using React to manage state and rendering. To use JSX, declare a JSX fenced code block (<code>```jsx</code>), and then call the built-in display function to display some content.

````md
```jsx
display(<i>Hello, <b>JSX</b>!</i>);
```
````

This produces:

```jsx
display(<i>Hello, <b>JSX</b>!</i>);
```

JSX is especially convenient for authoring reusable components. These components are typically imported from JSX modules (`.jsx`), but you can also declare them within JSX fenced code blocks.

```jsx echo
function Greeting({subject = "you"} = {}) {
  return <div>Hello, <b>{subject}</b>!</div>
}
```

Naturally, you can combine JSX with Framework’s built-in reactivity. This is typically done by passing in reactive values as props. Try changing the `name` below.

```jsx echo
display(<Greeting subject={name} />);
```

```js echo
const name = view(Inputs.text({label: "Name", value: "Anonymous"}));
```

Below we import a JSX component and render it.

```jsx echo
import {Counter} from "./components/Counter.js";

display(<Counter title="Hello, JSX" />);
```

With a JSX fenced code block, the [display function](./javascript#explicit-display) behaves a bit differently:

- It replaces the previously-displayed content, if any
- It never uses the inspector

In addition, JSX fenced code blocks should always display explicitly; JSX fenced code blocks do not support implicit display of expressions.

React is available by default as `React` in Markdown, and you don’t need to import React when authoring components in JSX modules. If needed, you can import React explicitly like so:

```js run=false
import * as React from "npm:react";
```

You can also import specific symbols, such as hooks:

```js run=false
import {useState} from "npm:react";
```

Always use the `.js` file extension to import JSX modules. JSX modules are transpiled to JavaScript during build and served with a `.js` extension.

```jsx run=false
import {useState} from "npm:react";
import {Card} from "./Card.js";

export function Counter({title = "Untitled"} = {}) {
  const [counter, setCounter] = useState(0);
  return (
    <Card title={title}>
      <p>
        <button onClick={() => setCounter(counter + 1)}>Click me</button>
      </p>
      <p>The current count is {counter}.</p>
      <div
        style={{
          transition: "background 250ms ease",
          color: "white",
          backgroundColor: counter & 1 ? "brown" : "steelblue",
          borderRadius: "0.5rem",
          padding: "1rem"
        }}
      >
        This element has a background color that changes.
      </div>
    </Card>
  );
}
```

JSX components can import other JSX components. The component above imports `Card.jsx`, which looks like this:

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
