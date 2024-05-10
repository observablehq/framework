import "dotenv/config";

const {GITHUB_TOKEN} = process.env;

export async function github(
  path,
  {authorization = GITHUB_TOKEN && `token ${GITHUB_TOKEN}`, accept = "application/vnd.github.v3+json"} = {}
) {
  const url = new URL(path, "https://api.github.com");
  const headers = {...(authorization && {authorization}), accept};
  const response = await fetch(url, {headers});
  if (!response.ok) throw new Error(`fetch error: ${response.status} ${url}`);
  return {headers: response.headers, body: await response.json()};
}

export async function* githubList(path, options) {
  const url = new URL(path, "https://api.github.com");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  const first = await github(String(url), options);
  yield* first.body;
  let nextUrl = findRelLink(first.headers, "next");
  while (nextUrl) {
    const next = await github(nextUrl, options);
    yield* next.body;
    nextUrl = findRelLink(next.headers, "next");
  }
}

function findRelLink(headers, name) {
  return headers
    .get("link")
    ?.split(/,\s+/g)
    .map((link) => link.split(/;\s+/g))
    .find(([, rel]) => rel === `rel="${name}"`)?.[0]
    .replace(/^</, "")
    .replace(/>$/, "");
}
