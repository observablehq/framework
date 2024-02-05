let queue = [];
let user;

if (location.origin === "https://observablehq.com") {
  emit({
    type: "pageLoad",
    event_version: 1,
    data: {referrer: document.referrer.replace(/\?.*/, "")},
    tags: {}
  });

  fetch("https://api.observablehq.com/user", {credentials: "include"})
    .then((response) => (response.ok ? response.json() : null))
    .then((u) => (user = u), () => (user = null))
    .then(() => (sendEvents(queue), (queue = null))); // prettier-ignore
}

function emit(event) {
  event.time = new Date().toISOString();
  event.location = `${location.origin}${location.pathname}${location.search}`; // drop hash
  if (queue) queue.push(event);
  else sendEvents([event]);
}

function sendEvents(events) {
  if (!events.length) return;
  navigator.sendBeacon(
    "https://events.observablehq.com/beacon-events",
    JSON.stringify({
      events: events.map((event) => ({
        ...event,
        release: null,
        user_id: user?.id ?? null,
        user_agent: navigator.userAgent
      })),
      send_time: new Date().toISOString()
    })
  );
}
