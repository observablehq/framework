define({id: "0", outputs: ["a","b"], body: () => {
let a = null;
let b = false;
a ||= b;
return {a,b};
}});
