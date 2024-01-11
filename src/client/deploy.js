export * from "./index.js";

const origin = process.env.OBSERVABLE_ORIGIN;
const parent = window.parent; // capture to prevent reassignment

let listener = null;
let queuedMessages = null;

async function messaged(event) {
  if (!event.isTrusted || event.origin !== origin || event.source !== parent) return;
  event.stopImmediatePropagation();
  const message = event.data;

  if (message.type === "hello") {
    postMessage({type: "hello"});
  } else if (message.type === "load_script") {
    try {
      if (listener) throw new Error("a script is already loaded");
      queuedMessages = [];
      const module = await import(message.url);
      if (module.listener) {
        listener = module.listener;
        queuedMessages.forEach((m) => Promise.resolve(m).then(listener));
        queuedMessages = null;
      }
      postMessage({type: "load_script_complete", url: message.url, re: message.id});
    } catch (error) {
      postMessage({type: "load_script_error", url: message.url, error: error.message, re: message.id});
    }
  } else if (listener) {
    listener(message);
  } else if (queuedMessages) {
    queuedMessages.push(message);
  }
}

let fingerprint = `c-${Math.random().toString(36).slice(2, 8).padStart(6, "0")}`;
let nextId = 0;
function postMessage(message) {
  parent.postMessage({id: `${fingerprint}-${++nextId}`, ...message}, origin);
}

addEventListener("message", messaged);
postMessage({type: "hello"});
