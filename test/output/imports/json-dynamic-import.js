define({id: "0", outputs: ["data"], body: async () => {
const data = await import("./_import/data.json?sha=7c4ee899b2e4bcd92b425368ebbefeda017a77ad176d66356a0190b7e62f83da", {assert: {type: "json"}});
return {data};
}});
