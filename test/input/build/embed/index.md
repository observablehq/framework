# Embeds

This site has:
* an embed module called `chart.js`, present in `dynamicPaths`
* a potential embed module called `ignore-me.js` , that is not in `dynamicPaths`
* a page that would have the same URL `chart.js.md`
* a legitimate page named `horse.js.md`

**embeds.** `chart.js` should be built ❌, but not `ignore-me.js` ❌

**sidebar** The `horse.js` page should be in the side bar, but there should be no link to `chart.js`. ✔︎✔

**dependencies** The dependencies of `horse.js.md` ✔ and `chart.js` ❌ should be built. The dependencies of `chart.js.md` (Leaflet) should not be built ❌.
