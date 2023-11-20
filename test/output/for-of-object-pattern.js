define({id: "0", outputs: ["a","b"], body: () => {
let a, b;
for ({a, b} of [{a: 1, b: 2}]);
return {a,b};
}});
