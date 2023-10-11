define({id: "0", inputs: ["field"], outputs: ["x"], body: (field) => {
const x = ({[field]: value}) => value;
return {x};
}});
