import "dotenv/config";
const { GITHUB_REPO, NPM_PACKAGE } = process.env;
import { graphql } from "./github.js";

interface REPO_NODE {
  nameWithOwner: string;
  descriptionHTML: string;
  stargazerCount: number;
  diskUsage: number;
  issues: { totalCount: number };
  collaborators: { totalCount: number };
  watchers: { totalCount: number };
  defaultBranchRef: { name: string };
  NPM_PACKAGE: string | undefined;
}

export async function getRepo(): Promise<REPO_NODE> {
  if (GITHUB_REPO == null)
    throw new Error("Please specify a repository in GITHUB_REPO.");
  const { repository }: { repository: REPO_NODE } = await graphql({
    query: `query repo ($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        nameWithOwner
        descriptionHTML
        archivedAt
        stargazerCount
        diskUsage
        issues {totalCount}
        watchers {totalCount}
        defaultBranchRef {
          name
          target {... on Commit { history(first: 0) {totalCount} } }
        }
      }
    }`,
    owner: GITHUB_REPO.split("/")[0].replace(/^@/, ""),
    name: GITHUB_REPO.split("/")[1],
  });
  return { ...repository, NPM_PACKAGE };
}
