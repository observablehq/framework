# Scrollytelling with IntersectionObserver

This example demonstrates how to implement scrollytelling in Observable Framework using `IntersectionObserver` and `position: sticky`.

<style>

.scroll-container {
  position: relative;
  margin: 1rem auto;
  font-family: var(--sans-serif);
}

.scroll-info {
  position: sticky;
  aspect-ratio: 16 / 9;
  top: calc((100% - 9 / 16 * 100vw) / 2);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  transition: ease background-color 0.5s;
  background-color: var(--theme-background-alt);
}

.scroll-info--step-1 {
  background-color: #4269d0;
}

.scroll-info--step-2 {
  background-color: #efb118;
}

.scroll-info--step-3 {
  background-color: #ff725c;
}

.scroll-info--step-4 {
  background-color: #6cc5b0;
}

.scroll-section {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: 1rem 0;
  display: flex;
  align-items: start;
  justify-content: center;
  border: solid 1px var(--theme-foreground-focus);
  background: color-mix(in srgb, var(--theme-foreground-focus) 5%, transparent);
  padding: 1rem;
  box-sizing: border-box;
}

</style>

<section class="scroll-container">
  <div class="scroll-info"></div>
  <div class="scroll-section" data-step="1">STEP 1</div>
  <div class="scroll-section" data-step="2">STEP 2</div>
  <div class="scroll-section" data-step="3">STEP 3</div>
  <div class="scroll-section" data-step="4">STEP 4</div>
</section>

The structure of the HTML is:

```html run=false
<section class="scroll-container">
  <div class="scroll-info"></div>
  <div class="scroll-section" data-step="1">STEP 1</div>
  <div class="scroll-section" data-step="2">STEP 2</div>
  <div class="scroll-section" data-step="3">STEP 3</div>
  <div class="scroll-section" data-step="4">STEP 4</div>
</section>
```

The CSS is:

```css run=false
.scroll-container {
  position: relative;
  margin: 1rem auto;
  font-family: var(--sans-serif);
}

.scroll-info {
  position: sticky;
  aspect-ratio: 16 / 9;
  top: calc((100% - 9 / 16 * 100vw) / 2);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  transition: ease background-color 0.5s;
  background-color: var(--theme-background-alt);
}

.scroll-info--step-1 {
  background-color: #4269d0;
}

.scroll-info--step-2 {
  background-color: #efb118;
}

.scroll-info--step-3 {
  background-color: #ff725c;
}

.scroll-info--step-4 {
  background-color: #6cc5b0;
}

.scroll-section {
  position: relative;
  aspect-ratio: 16 / 9;
  margin: 1rem 0;
  display: flex;
  align-items: start;
  justify-content: center;
  border: solid 1px var(--theme-foreground-focus);
  background: color-mix(in srgb, var(--theme-foreground-focus) 5%, transparent);
  padding: 1rem;
  box-sizing: border-box;
}
```

Lastly, here’s the JavaScript that updates the background:

```js echo
const info = document.querySelector(".scroll-info");
const targets = document.querySelectorAll(".scroll-section");

const observer = new IntersectionObserver((entries) => {
  for (const target of Array.from(targets).reverse()) {
    const rect = target.getBoundingClientRect();
    if (rect.top < innerHeight / 2) {
      info.textContent = target.dataset.step;
      info.className = `scroll-info scroll-info--step-${target.dataset.step}`;
      return;
    }
  }
  info.className = "scroll-info";
  info.textContent = "0";
}, {
  rootMargin: "-50% 0% -50% 0%"
});

for (const target of targets) observer.observe(target);

invalidation.then(() => observer.disconnect());
```
