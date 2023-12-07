/* eslint-disable import/no-named-as-default-member */
import he from "he";

/**
 * Denotes a string that contains HTML source; when interpolated into an html
 * tagged template literal, it will not be escaped. Use Html.unsafe to denote
 * dynamic strings that are known to be safe.
 */
export class Html {
  private constructor(readonly html: string) {}
  static unsafe(html: string): Html {
    return new Html(html);
  }
  toString() {
    return this.html;
  }
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Html {
  const parts: string[] = [];
  for (let i = 0; i < strings.length; ++i) {
    parts.push(strings[i]);
    if (i < values.length) {
      const value = values[i];
      if (value == null) continue;
      if (typeof value[Symbol.iterator] === "function") {
        for (const v of value as Iterable<unknown>) {
          if (v == null) continue;
          parts.push(v instanceof Html ? v.html : he.escape(String(v)));
        }
      } else {
        parts.push(value instanceof Html ? value.html : he.escape(String(value)));
      }
    }
  }
  return Html.unsafe(parts.join(""));
}

html.unsafe = Html.unsafe;
