define({id: 0, inputs: ["field"], outputs: ["x"], body: (field) => {
const exports = {};
const x = (exports.x = ({[field]: value}) => value);
return exports;
}});
