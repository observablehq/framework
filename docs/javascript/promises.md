# JavaScript: Promises

A [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) represents the result of an asynchronous operation — such as loading data, importing a module dynamically, running an animation, or even waiting for the user to do something — and is the foundational primitive of asynchronous programming in JavaScript.

<div class="tip">If you aren’t yet familiar with promises in JavaScript, we highly encourage you to read MDN’s <i><a href="https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises">How to use promises</a></i> and <i><a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises">Using promises</a></i> guides first.</div>

Because asynchronous operations are so common when building interactive interfaces, Framework

When code refers to a promise defined in another code block, the referencing code implicitly awaits the promise.

Most often, promises are used to load files, fetch data from a remote server, or query a database. TK Elaborate some more and give more specific examples of promises, including `FileAttachment`, `fetch`, `db.sql`, waiting to click on a button.

As a contrived example, within the block below, `hello` is a promise that resolves via `setTimeout`; if you reference `hello` from another code block or expression, the other code won’t run until the timeout fires and will see `hello` as a string.

```js echo
const hello = new Promise((resolve) => {
  setTimeout(() => {
    resolve("hello");
  }, 1000);
});
```

Hello is: ${hello}.
