define({id: "0", outputs: ["confetti"], body: async () => {
const {default: confetti} = await import("./_npm/canvas-confetti@1.9.2/+esm.js");
confetti();


return {confetti};
}});
