define({id: "0", inputs: ["y","display"], body: (y,display) => {
try {
  let [x] = y;
  x++;
  display(x);
} catch (e) {
  display(e);
}
}});
