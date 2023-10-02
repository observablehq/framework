define({id: 0, inputs: ["view","Inputs"], outputs: ["name"], body: (view,Inputs) => {
const exports = {};
const name = (exports.name = view(Inputs.text({label: "Name"})));
return exports;
}});
