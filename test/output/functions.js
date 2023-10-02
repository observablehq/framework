define({id: 0, outputs: ["add","subtract"], body: () => {
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}
return {add,subtract};
}});
