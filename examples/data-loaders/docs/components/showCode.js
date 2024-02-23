import hljs from "https://cdn.jsdelivr.net/npm/highlight.js/+esm";

export function showCode(file, {language = file.name.match(/\.(\w+)$/)?.[1], copy = true, open = true} = {}) {
  const div = document.createElement("details");
  if (open) div.setAttribute("open", "open");
  div.innerHTML = `
    <summary><tt>${file.name}</tt>:</summary>
    <div class="observablehq-pre-container" data-language=${language}>
      <pre>loading file…</pre>
    </div>`;
  file.text().then((code) => {
    const pre = div.querySelector("pre");
    pre.innerHTML = hljs.highlight(code, {language}).value;
    if (copy) enableCopyButton(pre);
  });
  return div;
}

const copyButton = document.createElement("template");
copyButton.innerHTML = '<button title="Copy code" class="observablehq-pre-copy"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6C2 5.44772 2.44772 5 3 5H10C10.5523 5 11 5.44772 11 6V13C11 13.5523 10.5523 14 10 14H3C2.44772 14 2 13.5523 2 13V6Z M4 2.00004L12 2.00001C13.1046 2 14 2.89544 14 4.00001V12"></path></svg></button>'; // prettier-ignore

function enableCopyButton(pre) {
  const parent = pre.parentElement;
  const div = parent.insertBefore(document.createElement("div"), pre);
  Object.assign(div.dataset, pre.dataset);
  div.appendChild(copyButton.content.cloneNode(true).firstChild).addEventListener("click", copy);
  div.appendChild(pre);
}

async function copy({currentTarget}) {
  await navigator.clipboard.writeText(currentTarget.parentElement.textContent.trimEnd());
}
