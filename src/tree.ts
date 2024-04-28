import {ascending, max} from "d3-array";
import {stratify} from "d3-hierarchy";

export type TreeItem<T> = [path: string, value?: T];

interface TreeNode<T> {
  data?: TreeItem<T>;
  parent?: TreeNode<T>;
  children?: TreeNode<T>[];
  height: number;
  depth: number;
  id: string;
}

export function tree<T>(items: Iterable<TreeItem<T>>): [indent: string, name: string, path: string, value?: T][] {
  const lines: [indent: string, name: string, node: TreeNode<T>][] = [];
  stratify()
    .path(([path]) => path)([...items, ["/"]]) // add root to avoid implicit truncation
    .sort(treeOrder)
    .eachBefore((node: TreeNode<T>) => {
      let p = node;
      let indent = "";
      if (p.parent) {
        indent = (hasFollowingSibling(p) ? "├── " : "└── ") + indent;
        while ((p = p.parent!).parent) {
          indent = (hasFollowingSibling(p) ? "│   " : "    ") + indent;
        }
      }
      lines.push([indent, node.id.split("/").pop() || ".", node]);
    });
  const width = (max(lines, ([indent, name]) => indent.length + stringLength(name)) || 0) + 1;
  return lines.map(([indent, name, node]) => [indent, stringPad(name, width - indent.length), node.id, node.data?.[1]]);
}

/** Like string.padEnd, but correctly handles graphemes via Intl.Segmenter. */
function stringPad(string: string, length: number): string {
  const n = length - stringLength(string);
  return n > 0 ? string + " ".repeat(n) : string;
}

/** Counts the number of graphemes in the specified string. */
function stringLength(string: string): number {
  return [...new Intl.Segmenter().segment(string)].length;
}

function hasFollowingSibling(node: TreeNode<unknown>): boolean {
  return node.parent != null && node.parent.children!.indexOf(node) < node.parent.children!.length - 1;
}

function treeOrder(a: TreeNode<unknown>, b: TreeNode<unknown>): number {
  return ascending(!a.children, !b.children) || ascending(a.id, b.id);
}
