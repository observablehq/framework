define({id: "0", outputs: ["a","b"], body: () => {
let a, b;
for ([a, b] of [[1, 2]]);
return {a,b};
}});
