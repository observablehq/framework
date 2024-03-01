define({id: "0", outputs: ["confetti"], body: async () => {
const {default: confetti} = await import("https://cdn.jsdelivr.net/npm/canvas-confetti");
confetti();


return {confetti};
}});
