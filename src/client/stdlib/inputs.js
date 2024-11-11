import {file as _file} from "@observablehq/inputs";
import {AbstractFile} from "observablehq:stdlib";

export {
  button,
  checkbox,
  radio,
  toggle,
  color,
  date,
  datetime,
  form,
  range,
  number,
  search,
  searchFilter,
  select,
  table,
  text,
  email,
  tel,
  url,
  password,
  textarea,
  input,
  bind,
  disposal,
  formatDate,
  formatLocaleAuto,
  formatLocaleNumber,
  formatTrim,
  formatAuto,
  formatNumber
} from "@observablehq/inputs";

export const file = (options) => _file({...options, transform: localFile});

function localFile(file) {
  return new LocalFile(file);
}

class LocalFile extends AbstractFile {
  constructor(file) {
    super(file.name, file.type, file.lastModified, file.size);
    Object.defineProperty(this, "_", {value: file});
    Object.defineProperty(this, "_url", {writable: true});
  }
  get href() {
    return (this._url ??= URL.createObjectURL(this._));
  }
  async url() {
    return this.href;
  }
  async blob() {
    return this._;
  }
  async stream() {
    return this._.stream();
  }
}
