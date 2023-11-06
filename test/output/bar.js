define({id: "0", outputs: ["bar"], body: () => {
const bar = new Symbol("bar");
return {bar};
}});
