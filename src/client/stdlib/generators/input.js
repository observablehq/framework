import {observe} from "./observe.js";

export function input(element) {
  return observe((change) => {
    const event = eventof(element);
    let value = valueof(element);
    const inputted = () => change(valueof(element));
    element.addEventListener(event, inputted);
    if (value !== undefined) change(value);
    return () => element.removeEventListener(event, inputted);
  });
}

function valueof(element) {
  switch (element.type) {
    case "range":
    case "number":
      return element.valueAsNumber;
    case "date":
      return element.valueAsDate;
    case "checkbox":
      return element.checked;
    case "file":
      return element.multiple ? element.files : element.files[0];
    case "select-multiple":
      return Array.from(element.selectedOptions, (o) => o.value);
    default:
      return element.value;
  }
}

function eventof(element) {
  switch (element.type) {
    case "button":
    case "submit":
    case "checkbox":
      return "click";
    case "file":
      return "change";
    default:
      return "input";
  }
}
