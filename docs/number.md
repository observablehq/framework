# Big number test

This is a test of the `big` and `lil` classes.

<style type="text/css">

.big {
  font: 700 32px/1 var(--sans-serif);
}

.lil {
  font: 14px var(--sans-serif);
}

/* TODO move to theme */
:root {
  --theme-color-positive: #3ca951;
  --theme-color-negative: #ff725c;
  --theme-color-neutral: #efb118;
}

</style>

<span class="big">3,541</span>
<span class="lil" style="color: var(--theme-color-positive);">+18 ↗︎</span>

Test <span class="lil" style="color: var(--theme-color-positive);">+18 ↗︎</span> test

<div style="max-width: 640px; container-type: inline-size;">
  <div class="grid grid-cols-4">
    <div class="card">
      <h2>GitHub Stars</h2>
      <span class="big">3,541</span>
      <span class="lil" style="color: var(--theme-color-positive);">+18 ↗︎</span>
    </div>
    <div class="card">
      <h2>Daily pageviews</h2>
      <span class="big">3,699</span>
      <span class="lil" style="color: var(--theme-color-positive);">+2.5% ↗︎</span>
    </div>
    <div class="card">
      <h2>Daily npm downloads</h2>
      <span class="big">2,737</span>
      <span class="lil" style="color: var(--theme-color-negative);">−33.5% ↘︎</span>
    </div>
    <div class="card">
      <h2>Total npm downloads</h2>
      <span class="big">1,169,127</span>
  </div>
</div>

This has been a test of the `big` and `lil` classes.
