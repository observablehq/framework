# Hello JSR

```js echo
import {randomIntegerBetween, randomSeeded} from "jsr:@std/random";

const prng = randomSeeded(1n);

display(randomIntegerBetween(1, 10, {prng}));
```
