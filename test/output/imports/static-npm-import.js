define({id: "0", outputs: ["confetti"], body: async () => {
const $module = await import("https://cdn.jsdelivr.net/npm/canvas-confetti");
if (!("default" in $module)) throw new SyntaxError("The requested module 'npm:canvas-confetti' does not provide an export named 'default'");
const {default: confetti} = $module;

confetti();
return {confetti};
}});
