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
          backgroundColor: counter & 1 ? "brown" : "steelblue",
          padding: "1rem"
        }}
      >
        This element has a background color that changes.
      </div>
    </Card>
  );
}
