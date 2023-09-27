import MarkdownIt from "markdown-it";
import {createServer} from "http";
import {readFile} from "fs/promises";

const md = MarkdownIt();
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = process.env.PORT ?? 3000;

const server = createServer(async (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  res.end(md.render(await readFile("./docs/index.md", "utf-8")));
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
