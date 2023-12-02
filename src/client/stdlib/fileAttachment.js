const files = new Map();

export function registerFile(name, file) {
  if (file == null) files.delete(name);
  else files.set(name, file);
}

export function FileAttachment(name) {
  if (new.target !== undefined) throw new TypeError("FileAttachment is not a constructor");
  const file = files.get((name += ""));
  if (!file) throw new Error(`File not found: ${name}`);
  const {url, mimeType} = file;
  return new FileAttachmentImpl(url, name, mimeType);
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

class AbstractFile {
  constructor(name, mimeType) {
    Object.defineProperty(this, "name", {value: name, enumerable: true});
    if (mimeType !== undefined) Object.defineProperty(this, "mimeType", {value: mimeType + "", enumerable: true});
  }
  async blob() {
    return (await remote_fetch(this)).blob();
  }
  async arrayBuffer() {
    return (await remote_fetch(this)).arrayBuffer();
  }
  async text() {
    return (await remote_fetch(this)).text();
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
  async sqlite() {
    return import("observablehq:stdlib/sqlite").then((sqlite) => sqlite.SQLiteDatabaseClient.open(remote_fetch(this)));
  }
  async zip() {
    const [{default: JSZip}, buffer] = await Promise.all([import("npm:jszip"), this.arrayBuffer()]);
    return new ZipArchive(await JSZip.loadAsync(buffer));
  }
  async xml(mimeType = "application/xml") {
    return new DOMParser().parseFromString(await this.text(), mimeType);
  }
  async html() {
    return this.xml("text/html");
  }
  async xlsx() {
    const [{Workbook}, buffer] = await Promise.all([import("observablehq:stdlib/xslx"), this.arrayBuffer()]);
    return Workbook.load(buffer);
  }
}

const FileAttachmentImpl = class FileAttachment extends AbstractFile {
  constructor(url, name, mimeType) {
    super(name, mimeType);
    Object.defineProperty(this, "_url", {value: url});
  }
  async url() {
    return (await this._url) + "";
  }
};

FileAttachment.prototype = FileAttachmentImpl.prototype; // instanceof

class ZipArchive {
  constructor(archive) {
    Object.defineProperty(this, "_", {value: archive});
    this.filenames = Object.keys(archive.files).filter((name) => !archive.files[name].dir);
  }
  file(path) {
    const object = this._.file((path += ""));
    if (!object || object.dir) throw new Error(`file not found: ${path}`);
    return new ZipArchiveEntry(object);
  }
}

class ZipArchiveEntry extends AbstractFile {
  constructor(object) {
    super(object.name);
    Object.defineProperty(this, "_", {value: object});
    Object.defineProperty(this, "_url", {writable: true});
  }
  async url() {
    return this._url || (this._url = this.blob().then(URL.createObjectURL));
  }
  async blob() {
    return this._.async("blob");
  }
  async arrayBuffer() {
    return this._.async("arraybuffer");
  }
  async text() {
    return this._.async("text");
  }
  async json() {
    return JSON.parse(await this.text());
  }
}
