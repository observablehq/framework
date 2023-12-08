define({id: "0", inputs: ["md","promise","display"], body: async (md,promise,display) => {
display(await(
md`${await promise}`
))
}});
