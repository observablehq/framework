define({id: "0", inputs: ["adventurer"], outputs: ["dogName"], body: (adventurer) => {
const dogName = adventurer.dog?.name;
return {dogName};
}});
