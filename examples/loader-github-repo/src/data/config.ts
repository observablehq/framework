import "dotenv/config";

const { GITHUB_REPO, GITHUB_TOKEN, NPM_PACKAGE } = process.env;

if (GITHUB_REPO === undefined)
  throw new Error("GITHUB_REPO must be defined in .env.");
if (GITHUB_TOKEN === undefined)
  throw new Error("GITHUB_TOKEN must be defined in .env.");

export { GITHUB_REPO, GITHUB_TOKEN, NPM_PACKAGE };
