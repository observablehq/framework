define({id: "0", outputs: ["foo"], body: () => {
function* foo() {
  yield 42;
}
return {foo};
}});
