import "dotenv/config";

const {GITHUB_TOKEN} = process.env;

export async function github(
  path: string,
  {authorization = GITHUB_TOKEN && `token ${GITHUB_TOKEN}`, accept = "application/vnd.github.v3+json"} = {}
) {
  const url = new URL(path, "https://api.github.com");
  const headers = {...(authorization && {authorization}), accept};
  const response = await fetch(url, {headers});
  if (!response.ok) throw new Error(`fetch error: ${response.status} ${url}`);
  return {headers: response.headers, body: await response.json()};
}

export async function* githubList<T = any>(path: string, {reverse = true, ...options}: any = {}): AsyncGenerator<T> {
  const url = new URL(path, "https://api.github.com");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("page", "1");
  const first = await github(String(url), options);
  if (reverse) {
    let prevUrl = findRelLink(first.headers, "last");
    if (prevUrl) {
      do {
        const next = await github(prevUrl, options);
        yield* next.body.reverse(); // reverse order
        prevUrl = findRelLink(next.headers, "prev");
      } while (prevUrl);
    } else {
      yield* first.body.reverse();
    }
  } else {
    yield* first.body;
    let nextUrl = findRelLink(first.headers, "next");
    while (nextUrl) {
      const next = await github(nextUrl, options);
      yield* next.body; // natural order
      nextUrl = findRelLink(next.headers, "next");
    }
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
