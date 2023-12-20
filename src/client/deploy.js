export * from "./index.js";

const origin = process.env.OBSERVABLEHQ_ORIGIN;
const parent = window.parent; // capture to prevent reassignment

function messaged(event) {
  if (!event.isTrusted || event.origin !== origin || event.source !== parent || !event.data.observablehq) return;
  event.stopImmediatePropagation();
  const message = event.data;
  if (message.type === "hello") {
    postMessage({type: "hello"});
  } else if (message.type === "load_script") {
    import(message.url).then(
      () => postMessage({type: "load_script_complete", url: message.url}),
      (error) => postMessage({type: "load_script_error", url: message.url, error: error.message})
    );
  }
}

addEventListener("message", messaged);

postMessage({type: "hello"});

function postMessage(message) {
  parent.postMessage({observablehq: true, ...message}, origin);
}
