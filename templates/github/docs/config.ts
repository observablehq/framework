import "dotenv/config";
export const MAX_REPOS = Number(process.env.MAX_REPOS ?? 20);
export const MAX_ISSUES = Number(process.env.MAX_ISSUES ?? 1000);
export const MAX_COMMITS = Number(process.env.MAX_COMMITS ?? 1000);
export const { GITHUB_TOKEN, GITHUB_REPOS, GITHUB_ORG } = process.env;
