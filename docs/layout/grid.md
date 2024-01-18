---
toc: false
theme: dashboard
---

# Layout:Grid

The CLI provides a set of grid CSS classes to help layout page content. These grids pair well with the [dashboard](./themes#dashboard) theme and the [card](./card) class. This page uses both.

To see these examples change dynamically, adjust the page width or collapse the sidebar on the left.

As with any CSS provided by the CLI, you can mix in standard CSS to customize pages.

## Classes

The following CSS classes are provided for grid layouts:

Class            | Description
---------------- | ------------
`grid`           | specify a grid layout for an element
`grid-cols-2`    | restrict grid to two columns
`grid-cols-3`    | restrict grid to three columns
`grid-cols-4`    | restrict grid to four columns
`grid-colspan-2` | specify that a grid cell spans two columns
`grid-colspan-3` | specify that a grid cell spans three columns
`grid-colspan-4` | specify that a grid cell spans four columns
`grid-rowspan-2` | specify that a grid cell spans two rows
`grid-rowspan-3` | specify that a grid cell spans three rows
`grid-rowspan-4` | specify that a grid cell spans four rows


## Two column grid

<div class="grid grid-cols-2">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card grid-rowspan-2"><h1>B</h1> 1 × 2</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card grid-colspan-2"><h1>D</h1>1 × 2</div>
  <div class="card grid-colspan-2 grid-rowspan-2"><h1>E</h1>2 × 2</div>
</div>

```html run=false
<div class="grid grid-cols-2">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card grid-rowspan-2"><h1>B</h1> 1 × 2</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card grid-colspan-2"><h1>D</h1>1 × 2</div>
  <div class="card grid-colspan-2 grid-rowspan-2"><h1>E</h1>2 × 2</div>
</div>
```

## Example Four Column Grid

<div class="grid grid-cols-4">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card"><h1>B</h1>1 × 1</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card"><h1>D</h1>1 × 1</div>
  <div class="card grid-colspan-3 grid-rowspan-2"><h1>E</h1>3 × 2</div>
  <div class="card grid-rowspan-2"><h1>F</h1>1 × 2</div>
  <div class="card grid-colspan-2"><h1>G</h1>2 × 1</div>
  <div class="card grid-colspan-2"><h1>H</h1>2 × 1</div>
</div>

```html run=false
<div class="grid grid-cols-4">
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card"><h1>B</h1>1 × 1</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="card"><h1>D</h1>1 × 1</div>
  <div class="card grid-colspan-3 grid-rowspan-2"><h1>E</h1>3 × 2</div>
  <div class="card grid-rowspan-2"><h1>F</h1>1 × 2</div>
  <div class="card grid-colspan-2"><h1>G</h1>2 × 1</div>
  <div class="card grid-colspan-2"><h1>H</h1>2 × 1</div>
</div>
```

## Example Three Column Grid with Customizations

Note that the minimum row height is set to 150px, and cell **D** does not use the `card` class.

<div
  class="grid grid-cols-3"
  style="grid-auto-rows: minmax(150px, auto); color: red;"
>
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card"><h1>B</h1>1 × 1</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="grid-rowspan-2"><h1>D</h1>1 × 2</div>
  <div class="card grid-colspan-2"><h1>E</h1>2 × 1</div>
  <div class="card grid-colspan-2"><h1>F</h1>2 × 1</div>
</div>

```html run=false
<div
  class="grid grid-cols-3"
  style="grid-auto-rows: minmax(150px, auto); color: red;"
>
  <div class="card"><h1>A</h1>1 × 1</div>
  <div class="card"><h1>B</h1>1 × 1</div>
  <div class="card"><h1>C</h1>1 × 1</div>
  <div class="grid-rowspan-2"><h1>D</h1>1 × 2</div>
  <div class="card grid-colspan-2"><h1>E</h1>2 × 1</div>
  <div class="card grid-colspan-2"><h1>F</h1>2 × 1</div>
</div>
```
