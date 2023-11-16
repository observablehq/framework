# DOT

[DOT](https://graphviz.org/doc/info/lang.html) is a language for expressing node-link diagrams using [Graphviz](https://graphviz.org). Observable Markdown’s implementation is powered by [Viz.js](https://github.com/mdaines/viz-js).

To use DOT, write a `dot` fenced code block:

````md
```dot
digraph G {
  rankdir = LR
  a -> b -> c
}
```
````

This produces:

```dot
digraph G {
  rankdir = LR
  a -> b -> c
}
```

Here are some more examples.

```dot echo
graph { n0 -- n1 -- n2 -- n3 -- n0 }
```

```dot echo
digraph { x -> y -> z }
```

```dot echo
digraph G {
  subgraph cluster_0 {
    a0 -> a1 -> a2 -> a3
    label = "process #1"
  }
  subgraph cluster_1 {
    b0 -> b1 -> b2 -> b3
    label = "process #2"
    color = blue
  }
  start -> a0
  start -> b0
  a1 -> b3
  b2 -> a3
  a3 -> a0
  a3 -> end
  b3 -> end
  start [shape = Mdiamond]
  end [shape = Msquare]
}
```
