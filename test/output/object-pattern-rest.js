define({id: "0", outputs: ["x","y","rest"], body: () => {
const {x, y, ...rest} = {x: 1, y: 2, z: 3};
return {x,y,rest};
}});
