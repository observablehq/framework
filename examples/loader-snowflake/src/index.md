# Framework + Snowflake

This loads the data from Snowflake:

```js echo
const requests = FileAttachment("./data/api-requests.csv").csv({typed: true});
```

This displays the data in a table:

```js echo
Inputs.table(requests)
```
