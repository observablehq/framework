const files = new Map();

export function registerFile(name, info) {
  const href = new URL(name, location).href;
  if (info == null) {
    files.delete(href);
  } else {
    const {path, mimeType, lastModified} = info;
    const file = new FileAttachmentImpl(new URL(path, location).href, name.split("/").pop(), mimeType, lastModified);
    files.set(href, file);
  }
}

export function FileAttachment(name, base = location) {
  if (new.target !== undefined) throw new TypeError("FileAttachment is not a constructor");
  const file = files.get(new URL(name, base).href);
  if (!file) throw new Error(`File not found: ${name}`);
  return file;
}

async function remote_fetch(file) {
  const response = await fetch(await file.url());
  if (!response.ok) throw new Error(`Unable to load file: ${file.name}`);
  return response;
}

export class AbstractFile {
  constructor(name, mimeType = "application/octet-stream", lastModified) {
    Object.defineProperties(this, {
      name: {value: `${name}`, enumerable: true},
      mimeType: {value: `${mimeType}`, enumerable: true},
      lastModified: {value: +lastModified, enumerable: true}
    });
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
  async dsv({delimiter = ",", array = false, typed = false} = {}) {
    const [text, d3] = await Promise.all([this.text(), import("npm:d3-dsv")]);
    const format = d3.dsvFormat(delimiter);
    const parse = array ? format.parseRows : format.parse;
    return parse(text, typed && d3.autoType);
  }
  async csv(options) {
    return this.dsv({...options, delimiter: ","});
  }
  async tsv(options) {
    return this.dsv({...options, delimiter: "\t"});
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
    const [Arrow, Parquet, buffer] = await Promise.all([import("npm:apache-arrow"), import("npm:parquet-wasm").then(async (Parquet) => (await Parquet.default(import.meta.resolve("npm:parquet-wasm/esm/parquet_wasm_bg.wasm")), Parquet)), this.arrayBuffer()]); // prettier-ignore
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
  constructor(href, name, mimeType, lastModified) {
    super(name, mimeType, lastModified);
    Object.defineProperty(this, "href", {value: href});
  }
  async url() {
    return this.href;
  }
}

Object.defineProperty(FileAttachmentImpl, "name", {value: "FileAttachment"}); // prevent mangling
FileAttachment.prototype = FileAttachmentImpl.prototype; // instanceof
