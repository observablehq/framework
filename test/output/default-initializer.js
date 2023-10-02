define({id: 0, inputs: ["x"], outputs: ["fun"], body: (x) => {
function fun(foo = x) {}
return {fun};
}});
