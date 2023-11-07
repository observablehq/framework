```dot
digraph D {

  A [shape=diamond]
  B [shape=box]
  C [shape=circle]

  A -> B [style=dashed]
  A -> C
  A -> D [penwidth=5, arrowhead=none]

}
```