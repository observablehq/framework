import {pathToFileURL} from "node:url";
import {createElement} from "react";
import {renderToPipeableStream} from "react-dom/server";

const {default: render} = await import(pathToFileURL(process.argv[2]).href);

const {pipe} = renderToPipeableStream(createElement(render), {
  onShellReady() {
    pipe(process.stdout);
  }
});
