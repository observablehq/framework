import { github } from "./github.js";
const { body: user } = await github("user");
console.log(JSON.stringify(user));
