# Hello dashboard

This is a dashboard.

<div class="grid grid-cols-3">
  <div class="grid-colspan-2 grid-rowspan-2">1</div>
  <div>2</div>
  <div>3</div>
</div>

<div class="grid grid-cols-3">
  <div class="grid-colspan-2">4</div>
  <div>5</div>
</div>

This dashboard features a bento box layout. I am writing some words here to demonstrate how prose might fit between sections of a dashboard. Currently you have to write a lot of CSS grid, but we could create reusable components.

<div class="grid grid-cols-3">
  <div>6</div>
  <div>7</div>
</div>

<style type="text/css">

.grid {
  margin: 1rem 0;
  display: grid;
  grid-auto-rows: 192px;
  gap: 1rem;
}

.grid-cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid > * {
  background: var(--theme-background-color-alt);
  border: solid 1px rgba(var(--theme-foreground-rgb), 0.2);
  border-radius: 0.75rem;
  padding: 1rem;
}

.grid-colspan-2 {
  grid-column: span 2;
}

.grid-rowspan-2 {
  grid-row: span 2;
}

</style>
