// @ts-expect-error lineBreakG is private
import {lineBreakG} from "acorn";

interface Edit {
  value: string;
  start: number;
  end: number;
}

interface Position {
  line: number;
  column: number;
}

export class Sourcemap {
  readonly input: string;
  private readonly _edits: Edit[];
  constructor(input: string) {
    this.input = input;
    this._edits = [];
  }
  private _bisectLeft(index: number): number {
    let lo = 0;
    let hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start < index) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  private _bisectRight(index: number): number {
    let lo = 0;
    let hi = this._edits.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._edits[mid].start > index) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  }
  insertLeft(index: number, value: string): typeof this {
    return this.replaceLeft(index, index, value);
  }
  insertRight(index: number, value: string): typeof this {
    return this.replaceRight(index, index, value);
  }
  delete(start: number, end: number): typeof this {
    return this.replaceRight(start, end, "");
  }
  replaceLeft(start: number, end: number, value: string): typeof this {
    return this._edits.splice(this._bisectLeft(start), 0, {start, end, value}), this;
  }
  replaceRight(start: number, end: number, value: string): typeof this {
    return this._edits.splice(this._bisectRight(start), 0, {start, end, value}), this;
  }
  translate(position: Position): Position {
    let index = 0;
    let ci: Position = {line: 1, column: 0};
    let co: Position = {line: 1, column: 0};
    for (const {start, end, value} of this._edits) {
      if (start > index) {
        const l = positionLength(this.input, index, start);
        const ci2 = positionAdd(ci, l);
        const co2 = positionAdd(co, l);
        if (positionCompare(co2, position) > 0) break;
        ci = ci2;
        co = co2;
      }
      const il = positionLength(this.input, start, end);
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
  trim(): typeof this {
    const input = this.input;
    if (input.startsWith("\n")) this.delete(0, 1); // TODO better trim
    if (input.endsWith("\n")) this.delete(input.length - 1, input.length); // TODO better trim
    return this;
  }
  toString(): string {
    let output = "";
    let index = 0;
    for (const {start, end, value} of this._edits) {
      if (start > index) output += this.input.slice(index, start);
      output += value;
      index = end;
    }
    output += this.input.slice(index);
    return output;
  }
}

function positionCompare(a: Position, b: Position): number {
  return a.line - b.line || a.column - b.column;
}

function positionLength(input: string, start = 0, end = input.length): Position {
  let match: RegExpExecArray;
  let line = 0;
  lineBreakG.lastIndex = start;
  while ((match = lineBreakG.exec(input)) && match.index < end) {
    ++line;
    start = match.index + match[0].length;
  }
  return {line, column: end - start};
}

function positionSubtract(b: Position, a: Position): Position {
  return b.line === a.line ? {line: 0, column: b.column - a.column} : {line: b.line - a.line, column: b.column};
}

function positionAdd(p: Position, l: Position): Position {
  return l.line === 0 ? {line: p.line, column: p.column + l.column} : {line: p.line + l.line, column: l.column};
}
