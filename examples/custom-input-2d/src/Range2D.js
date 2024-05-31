export function Range2D({width = 100, height = 100, value = [0.5, 0.5]} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.border = "1px solid black";

  let down = false;
  canvas.onpointerup = () => (down = false);
  canvas.onpointerdown = (event) => {
    down = true;
    canvas.setPointerCapture(event.pointerId);
    canvas.onpointermove(event);
  };
  canvas.onpointermove = (event) => {
    if (!down) return;
    event.preventDefault(); // prevent scrolling and text selection
    set([event.offsetX / width, event.offsetY / height]);
    canvas.dispatchEvent(new Event("input", {bubbles: true}));
  };

  const context = canvas.getContext("2d");

  function set([x, y]) {
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "red";
    context.fillRect(Math.floor(x * width), 0, 1, height);
    context.fillRect(0, Math.floor(y * height), width, 1);
    value = [x, y];
  }

  set(value);

  return Object.defineProperty(canvas, "value", {get: () => value, set});
}
