import hljs from "https://cdn.jsdelivr.net/npm/highlight.js/+esm";

export function showCode(file, language = file.name.match(/\.(\w+)$/)?.[1]) {
  const div = document.createElement("details");
  div.innerHTML = `
    <summary>${file.name}</summary>
    <div class="observablehq-pre-container" data-language=${language}>
      <pre>loading file…</pre>
    </div>`;
  file.text().then((code) => (div.querySelector("pre").innerHTML = hljs.highlight(code, {language}).value));
  return div;
}
