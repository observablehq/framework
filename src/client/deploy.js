export * from "./index.js";

const origin = process.env.OBSERVABLEHQ_ORIGIN;
const parent = window.parent; // capture to prevent reassignment

let listener = null;
let queuedMessages = [];

async function messaged(event) {
  if (!event.isTrusted || event.origin !== origin || event.source !== parent) return;
  event.stopImmediatePropagation();
  const message = event.data;

  if (message.type === "hello") {
    postMessage({type: "hello"});
  } else if (message.type === "load_script") {
    try {
      if (listener) throw new Error("a script is already loaded");
      const module = await import(message.url);
      if (module.listener) {
        listener = module.listener;
        queuedMessages.forEach((m) => listener(m));
        queuedMessages = null;
      }
      postMessage({type: "load_script_complete", url: message.url, re: message.id});
    } catch (error) {
      postMessage({type: "load_script_error", url: message.url, error: error.message, re: message.id});
    }
  } else if (listener) {
    listener(message);
  } else {
    if (queuedMessages) {
      queuedMessages.push(message);
    } else {
      console.errror("Bug: tried to enqueue a message after the queue was cleared");
    }
  }
}

let fingerprint = `c-${Math.random().toString(36).slice(2, 8).padStart(6, "0")}`;
let nextId = 0;
function postMessage(message) {
  parent.postMessage({id: `${fingerprint}-${++nextId}`, ...message}, origin);
}

addEventListener("message", messaged);
postMessage({type: "hello"});
