---
sidebar: false
header: false
footer: false
pager: false
---

I am a responsive iframe.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada ante orci, a sodales mi faucibus eu. Nunc leo nunc, cursus vitae blandit vestibulum, porttitor vel enim. Aenean sagittis ornare sapien, et dictum erat aliquet ac. Mauris vitae fringilla arcu. Mauris faucibus lorem laoreet diam tincidunt blandit.

Maecenas aliquet, nisi ac imperdiet molestie, libero neque tempor lacus, sit amet pellentesque lacus sapien in tellus. Fusce ex sem, scelerisque in massa sit amet, mollis pulvinar nibh. Integer rutrum sagittis mauris in pharetra. Maecenas accumsan est sit amet nunc scelerisque scelerisque. Nam rutrum nunc placerat lectus varius rutrum. Fusce viverra dolor felis, vitae aliquam velit viverra in.

```js
const observer = new ResizeObserver(([entry]) => parent.postMessage({height: entry.target.offsetHeight}, "*"));
observer.observe(document.documentElement);
invalidation.then(() => observer.disconnect());
```
