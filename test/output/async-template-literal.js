define({id: 0, inputs: ["md","promise","display"], body: async (md,promise,display) => {
display((
md`${await promise}`
))
}});
