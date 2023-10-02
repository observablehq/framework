define({id: 0, outputs: ["foo"], body: () => {
function foo() { return arguments.length; }
return {foo};
}});
