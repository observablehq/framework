import MarkdownIt from "markdown-it";
import {createServer} from "http";
import {readFile} from "fs/promises";

const md = MarkdownIt();
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = process.env.PORT ? +process.env.PORT : 3000;

// TODO
// - routing
// - header and footer
// - web socket
// - file watching
// - 'o' in the terminal opens the browser

const server = createServer(async (req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html");
  res.write(`<!DOCTYPE html>\n`);
  res.end(md.render(await readFile("./docs/index.md", "utf-8")));
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
