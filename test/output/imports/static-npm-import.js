define({id: "0", outputs: ["confetti"], body: async () => {
const {default: confetti} = await import("npm:canvas-confetti");

confetti();
return {confetti};
}});
