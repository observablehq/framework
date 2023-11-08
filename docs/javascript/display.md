# Display

A JavaScript fenced code block containing an expression will automatically display its value, as will an inline JavaScript expression. You can also manually display elements or inspect values by calling the built-in `display` function.

## display(*value*)

If `value` is a DOM node, adds it to the DOM. Otherwise, converts the given `value` to a suitable DOM node and displays that instead. Returns the given `value`.

When `value` is not a DOM node, display will automatically create a suitable corresponding DOM node to display. The exact behavior depends on the input `value`, and whether display is called within a fenced code block or an inline expression. In fenced code blocks, display will use the [Observable Inspector](https://github.com/observablehq/inspector); in inline expressions, display will coerce non-DOM values to strings, and will concatenate values when passed an iterable.

You can call display multiple times within the same code block or inline expression to display multiple values. The display will be automatically cleared if the associated code block or inline expression is re-run.
