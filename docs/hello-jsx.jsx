import {useState} from "npm:react";
import {Card} from "./components/Card.js";

export default function App() {
  const [counter, setCounter] = useState(0);
  return (
    <>
      <h3>This is rendered by JSX! The current count is {counter}.</h3>
      <p>JSX is a syntax extension for JavaScript.</p>
      <Card title="Untitled card">It was written to be used with React.</Card>
      <p>Below is an example of markdown in JSX.</p>
      <p><button onClick={() => setCounter(counter + 1)}>Click me</button></p>
      <div
        style={{
          transition: "background 1000ms ease",
          backgroundColor: "brown",
          padding: "1rem"
        }}
      >
        <p>
          Try and change the background color to <code>tomato</code>.
        </p>
      </div>
    </>
  );
}
