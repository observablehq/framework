import {lineBreakG} from "acorn";

export class Sourcemap {
  constructor(input = "") {
    this._input = input;
    this._edits = [];
  }
  _bisectLeft(index) {
    let lo = 0;
    let hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start < index) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  _bisectRight(index) {
    let lo = 0;
    let hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start > index) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  insertLeft(index, value) {
    this.replaceLeft(index, index, value);
  }
  insertRight(index, value) {
    this.replaceRight(index, index, value);
  }
  delete(start, end) {
    this.replaceRight(start, end, "");
  }
  replaceLeft(start, end, value) {
    this._edits.splice(this._bisectLeft(start), 0, {start, end, value});
  }
  replaceRight(start, end, value) {
    this._edits.splice(this._bisectRight(start), 0, {start, end, value});
  }
  translate(position) {
    let index = 0;
    let ci = {line: 1, column: 0};
    let co = {line: 1, column: 0};
    for (const {start, end, value} of this._edits) {
      if (start > index) {
        const l = positionLength(this._input, index, start);
        const ci2 = positionAdd(ci, l);
        const co2 = positionAdd(co, l);
        if (positionCompare(co2, position) > 0) break;
        ci = ci2;
        co = co2;
      }
      const il = positionLength(this._input, start, end);
      const ol = positionLength(value);
      const ci2 = positionAdd(ci, il);
      const co2 = positionAdd(co, ol);
      if (positionCompare(co2, position) > 0) return ci;
      ci = ci2;
      co = co2;
      index = end;
    }
    const l = positionSubtract(position, co);
    return positionAdd(ci, l);
  }
  toString() {
    let output = "";
    let index = 0;
    for (const {start, end, value} of this._edits) {
      if (start > index) output += this._input.slice(index, start);
      output += value;
      index = end;
    }
    output += this._input.slice(index);
    return output;
  }
}

function positionCompare(a, b) {
  return a.line - b.line || a.column - b.column;
}

function positionLength(input, start = 0, end = input.length) {
  let match,
    line = 0;
  lineBreakG.lastIndex = start;
  while ((match = lineBreakG.exec(input)) && match.index < end) {
    ++line;
    start = match.index + match[0].length;
  }
  return {line, column: end - start};
}

function positionSubtract(b, a) {
  return b.line === a.line ? {line: 0, column: b.column - a.column} : {line: b.line - a.line, column: b.column};
}

function positionAdd(p, l) {
  return l.line === 0 ? {line: p.line, column: p.column + l.column} : {line: p.line + l.line, column: l.column};
}
