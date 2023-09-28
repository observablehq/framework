export function open({hash} = {}) {
  const socket = new WebSocket(Object.assign(new URL("/_observablehq", location.href), {protocol: "ws"}));

  socket.onopen = () => {
    console.info("socket open");
    send({type: "hello", hash});
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.info("↓", message);
    switch (message.type) {
      case "reload": {
        location.reload();
        break;
      }
    }
  };

  socket.onerror = (error) => {
    console.error(error);
  };

  socket.onclose = () => {
    console.info("socket close");
  };

  function send(message) {
    console.info("↑", message);
    socket.send(JSON.stringify(message));
  }
}
