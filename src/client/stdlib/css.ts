export default function css({raw: strings}) {
  let string = strings[0];
  for (let i = 1, n = arguments.length; i < n; ++i) {
    const value = arguments[i]; // eslint-disable-line prefer-rest-params
    if (value != null) string += `${value}`;
    string += strings[i];
  }
  const style = document.createElement("style");
  style.textContent = string;
  return style;
}
