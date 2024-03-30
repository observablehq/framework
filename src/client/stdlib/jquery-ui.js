import $ from "npm:jquery";

self.jQuery = $;

await import("npm:jquery-ui/dist/jquery-ui.min.js/+esm");

export default $;
