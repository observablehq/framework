const files = new Map();

export function registerFile(name, file) {
  const url = new URL(name, location).href;
  if (file == null) files.delete(url);
  else files.set(url, file);
}

export function FileAttachment(name, base = location.href) {
  if (new.target !== undefined) throw new TypeError("FileAttachment is not a constructor");
  const url = new URL(name, base).href;
  const file = files.get(url);
  if (!file) throw new Error(`File not found: ${name}`);
  const {path, mimeType} = file;
  return new FileAttachmentImpl(new URL(path, base).href, name.split("/").pop(), mimeType);
}

async function remote_fetch(file) {
  const response = await fetch(await file.url());
  if (!response.ok) throw new Error(`Unable to load file: ${file.name}`);
  return response;
}

async function dsv(file, delimiter, {array = false, typed = false} = {}) {
  const [text, d3] = await Promise.all([file.text(), import("npm:d3-dsv")]);
  const parse = delimiter === "\t" ? (array ? d3.tsvParseRows : d3.tsvParse) : array ? d3.csvParseRows : d3.csvParse;
  return parse(text, typed && d3.autoType);
}

export class AbstractFile {
  constructor(name, mimeType = "application/octet-stream") {
    Object.defineProperty(this, "name", {value: `${name}`, enumerable: true});
    Object.defineProperty(this, "mimeType", {value: `${mimeType}`, enumerable: true});
  }
  async blob() {
    return (await remote_fetch(this)).blob();
  }
  async arrayBuffer() {
    return (await remote_fetch(this)).arrayBuffer();
  }
  async text(encoding) {
    return encoding === undefined
      ? (await remote_fetch(this)).text()
      : new TextDecoder(encoding).decode(await this.arrayBuffer());
  }
  async json() {
    return (await remote_fetch(this)).json();
  }
  async stream() {
    return (await remote_fetch(this)).body;
  }
  async csv(options) {
    return dsv(this, ",", options);
  }
  async tsv(options) {
    return dsv(this, "\t", options);
  }
  async image(props) {
    const url = await this.url();
    return new Promise((resolve, reject) => {
      const i = new Image();
      if (new URL(url, document.baseURI).origin !== new URL(location).origin) i.crossOrigin = "anonymous";
      Object.assign(i, props);
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Unable to load file: ${this.name}`));
      i.src = url;
    });
  }
  async arrow() {
    const [Arrow, response] = await Promise.all([import("npm:apache-arrow"), remote_fetch(this)]);
    return Arrow.tableFromIPC(response);
  }
  async parquet() {
    const [Arrow, Parquet, buffer] = await Promise.all([import("npm:apache-arrow"), import("npm:parquet-wasm/esm/arrow1.js").then(async (Parquet) => (await Parquet.default(), Parquet)), this.arrayBuffer()]); // prettier-ignore
    return Arrow.tableFromIPC(Parquet.readParquet(new Uint8Array(buffer)).intoIPCStream());
  }
  async sqlite() {
    const [{SQLiteDatabaseClient}, response] = await Promise.all([import("observablehq:stdlib/sqlite"), this.arrayBuffer()]); // prettier-ignore
    return SQLiteDatabaseClient.open(response);
  }
  async zip() {
    const [{ZipArchive}, buffer] = await Promise.all([import("observablehq:stdlib/zip"), this.arrayBuffer()]);
    return ZipArchive.from(buffer);
  }
  async xml(mimeType = "application/xml") {
    return new DOMParser().parseFromString(await this.text(), mimeType);
  }
  async html() {
    return this.xml("text/html");
  }
  async xlsx() {
    const [{Workbook}, buffer] = await Promise.all([import("observablehq:stdlib/xlsx"), this.arrayBuffer()]);
    return Workbook.load(buffer);
  }
}

class FileAttachmentImpl extends AbstractFile {
  constructor(url, name, mimeType) {
    super(name, mimeType);
    Object.defineProperty(this, "_url", {value: url});
  }
  async url() {
    return `${await this._url}`;
  }
}

Object.defineProperty(FileAttachmentImpl, "name", {value: "FileAttachment"}); // prevent mangling
FileAttachment.prototype = FileAttachmentImpl.prototype; // instanceof
