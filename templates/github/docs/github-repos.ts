import { graphql } from "./github.js";
import { MAX_REPOS, GITHUB_REPOS, GITHUB_ORG } from "./config.js";

const githubRepos = GITHUB_REPOS
  ? new Set(GITHUB_REPOS.split(/,\s*/g).map((d) => d.toLowerCase().trim()))
  : null;

const contents = `{
  nameWithOwner # @d3/d3-geo
  descriptionHTML
  archivedAt
  stargazerCount # 178
  diskUsage
  # TODO ADD COUNT OF COMMITS BY USER
  # TODO filter to only count open issues
  issues {totalCount}
  # collaborators {totalCount} # needs "public_repo" scope
  watchers {totalCount}
  defaultBranchRef {name}
}`;

export async function getRepos() {
  interface N {
    nameWithOwner: string;
    descriptionHTML: string;
    stargazerCount: number;
    diskUsage: number;
    issues: { totalCount: number };
    collaborators: { totalCount: number };
    watchers: { totalCount: number };
    defaultBranchRef: { name: string };
  }
  const repos: N[] = [];

  if (githubRepos) {
    for (const repo of githubRepos) {
      const { repository: node }: { repository: N } = await graphql({
        query: `query repo ($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) ${contents}
        }`,
        owner: repo.split("/")[0].replace(/^@/, ""),
        name: repo.split("/")[1],
      });
      repos.push(node);
    }
  } else if (GITHUB_ORG) {
    let cursor = "";
    do {
      const {
        repositoryOwner: {
          repositories: { nodes, pageInfo },
        },
      } = (await graphql({
        query: `query repos($org: String!, $cursor: String) {
  repositoryOwner(login: $org) {
    ... on Organization {
      repositories(
        first: 100,
        after: $cursor,
        orderBy: {field: STARGAZERS, direction: DESC},
      ) {
        pageInfo {endCursor}
        nodes ${contents}
      }
    }
  }
}`,
        cursor,
        org: GITHUB_ORG,
      })) as {
        repositoryOwner: {
          repositories: { nodes: N[]; pageInfo: { endCursor: string } };
        };
      };
      cursor = pageInfo.endCursor;
      for (const node of nodes) {
        if (repos.length >= MAX_REPOS) {
          cursor = "";
          break;
        }
        repos.push(node);
      }
    } while (cursor);
  } /* user-connected repos */ else {
    let cursor = "";
    do {
      const {
        viewer: {
          repositories: { nodes, pageInfo },
        },
      } = (await graphql({
        query: `query($cursor: String) {
  viewer {
    repositories(
      first: 100,
      after: $cursor,
      orderBy: {field: STARGAZERS, direction: DESC},
      affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER],
      ownerAffiliations:[OWNER, ORGANIZATION_MEMBER, COLLABORATOR]
    ) {
      pageInfo {endCursor}
      nodes ${contents}
    }
  }
}`,
        cursor,
      })) as {
        viewer: {
          repositories: { nodes: N[]; pageInfo: { endCursor: string } };
        };
      };

      cursor = pageInfo.endCursor;
      for (const node of nodes) {
        if (repos.length >= MAX_REPOS) {
          cursor = "";
          break;
        }
        repos.push(node);
      }
    } while (cursor);
  }

  return { repos, reason: GITHUB_REPOS ? "list" : GITHUB_ORG ? "org" : "user" };
}
