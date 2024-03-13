# CSS: Note

The `note`, `tip`, `warning`, and `caution` classes can be used to insert labeled notes (also known as callouts) into prose. These are intended to emphasize important information that could otherwise be overlooked.

<div class="note">This is a note.</div>

```html run=false
<div class="note">This is a note.</div>
```

<div class="tip">This is a tip.</div>

```html run=false
<div class="tip">This is a tip.</div>
```

<div class="warning">This is a warning.</div>

```html run=false
<div class="warning">This is a warning.</div>
```

<div class="caution">This is a caution.</div>

```html run=false
<div class="caution">This is a caution.</div>
```

Markdown is not supported within HTML, so if you want rich formatting or links within a note, you must write it as HTML. (In the future, we may add support for notes within Markdown.)

<div class="tip">
  <p>This is a <i>styled</i> tip using <small>HTML</small>.</p>
</div>

```html run=false
<div class="tip">
  <p>This is a <i>styled</i> tip using <small>HTML</small>.</p>
</div>
```

You can override the note’s label using the `label` attribute.

<div class="warning" label="⚠️ Danger ⚠️">No lifeguard on duty. Swim at your own risk!</div>

```html run=false
<div class="warning" label="⚠️ Danger ⚠️">No lifeguard on duty. Swim at your own risk!</div>
```

You can disable the label entirely with an empty `label` attribute.

<div class="note" label>This note has no label.</div>

```html run=false
<div class="note" label>This note has no label.</div>
```
