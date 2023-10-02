define({id: 0, inputs: [], outputs: ["foo"], body: () => {
function* foo() {
  yield 42;
}
return {foo};
}});
