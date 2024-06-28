import { getRepo } from "./github-repo.js";

process.stdout.write(JSON.stringify(await getRepo()));
