const probe = document.createElement("div");
probe.style.setProperty("transition-property", "color");
probe.style.setProperty("transition-duration", "0.001s");
const update = () => {
  const dark = getComputedStyle(probe)["color-scheme"];
  document.body.classList.toggle("dark", dark);
  document.body.classList.toggle("light", !dark);
};
update();
probe.addEventListener("transitionstart", update);
document.body.append(probe);
