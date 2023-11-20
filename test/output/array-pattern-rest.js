define({id: "0", outputs: ["x","y","rest"], body: () => {
const [x, y, ...rest] = [1, 2, 3];
return {x,y,rest};
}});
