define({id: "0", inputs: ["view","Inputs"], outputs: ["name"], body: (view,Inputs) => {
const name = view(Inputs.text({label: "Name"}));
return {name};
}});
