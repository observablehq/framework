# Mermaid

[Mermaid](https://mermaid.js.org/) is a language for expressing node-link diagrams, flowcharts, sequence diagrams, and many other types of visualizations. (See also [DOT](./dot).) Observable provides a `mermaid` tagged template literal for convenience. This is available by default in Markdown, or you can import it like so:

```js echo
import mermaid from "npm:@observablehq/mermaid";
```

To use in a JavaScript code block:

```js echo
mermaid`graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;`
```

You can also write Mermaid in a `mermaid` fenced code block:

````md
```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```
````

This produces:

```mermaid
graph TD;
    A-->B;
    A-->C;
    B-->D;
    C-->D;
```

Here are some more examples.

```mermaid echo
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
```

```mermaid echo
classDiagram
Class01 <|-- AveryLongClass : Cool
Class03 *-- Class04
Class05 o-- Class06
Class07 .. Class08
Class09 --> C2 : Where am i?
Class09 --* C3
Class09 --|> Class07
Class07 : equals()
Class07 : Object[] elementData
Class01 : size()
Class01 : int chimp
Class01 : int gorilla
Class08 <--> C2: Cool label
```
