# Look, Ma! JSR imports!

```js echo
import {printProgress} from "jsr:@luca/flag";

printProgress();
```

```js echo
import.meta.resolve("jsr:@luca/flag")
```

```js echo
import {decode} from "jsr:@quentinadam/hex";

display(decode("000102"));
```
