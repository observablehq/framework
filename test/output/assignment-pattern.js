define({id: "0", outputs: ["x","y","z"], body: () => {
const [x, y, z = 3] = [1, 2];
return {x,y,z};
}});
