# Mapbox-gl

[Mapbox-gl](https://docs.mapbox.com/mapbox-gl-js/guides/) is a library for building web maps and web applications with Mapbox's modern mapping technology. Mapbox-gl is available by default as `mapboxgl` in Markdown, but you can import it explicitly like so:

```js echo
import mapboxgl from "npm:mapbox-gl";
```

When this library is invoked on a page, Observable Markdown automatically imports the required styles.

To use in a JavaScript code block, create a container div with the appropriate dimensions, then call the Map method:

```js
if (token) {
  const container = html`<div style="width: 696px; height: 400px;">`;
  display(html`<figure>
    ${container}
    <figcaption>Dynamic rendering, using an access token.</figcaption>
    </figure>
  `);
  const map = new mapboxgl.Map({
    container,
    accessToken: `${token}`,
    center: [2.2932, 48.86069], // starting position [longitude, latitude]
    zoom: 15.1,
    pitch: 62,
    bearing: -20
  });
} else {
  display(html`<figure style="max-width: 696px;">
    ${await FileAttachment("mapbox-gl-eiffel.png").image({style: "width: 696px; height: 400px; margin-bottom: -8px;"})}
    <figcaption>Static image; add your own access token for a dynamic experience.</figcaption>
    </figure>
  `);
}
```

<pre><code class="language-html">&lt;div id="map" style="width: 696px; height: 400px;">&lt;/div></code></pre>
<pre><code class="language-js">const accessToken = ${token ? JSON.stringify(token) : "`${API_ACCESS_TOKEN}`"};
const map = new mapboxgl.Map({
  accessToken,
  container: "map",
  center: [2.2932, 48.86069], // starting position [longitude, latitude]
  zoom: 15.1,
  pitch: 62,
  bearing: -20
});
invalidation.then(() => map.remove());</code>
</pre>

You will need to create a [Mapbox account](https://account.mapbox.com/) and obtain an API access token for your project. Paste it below to see in action:

```js
const token = view(Inputs.text({placeholder: "pk.xxxxx", label: "Your Mapbox access token"}));
```

For inspiration, see Mapbox’s [examples page](https://docs.mapbox.com/mapbox-gl-js/example/).
