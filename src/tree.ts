import {ascending, max} from "d3-array";
import {stratify} from "d3-hierarchy";

export type TreeItem<T> = [path: string, value: T];

export interface TreeNode<T> {
  data?: TreeItem<T>;
  parent?: TreeNode<T>;
  children?: TreeNode<T>[];
  value: number;
  height: number;
  depth: number;
  id: string;
}

export function tree<T>(
  items: Iterable<TreeItem<T>>
): [indent: string, name: string, description: string, node: TreeNode<T>][] {
  const lines: [indent: string, name: string, description: string, node: TreeNode<T>][] = [];
  stratify()
    .path(
      ([path]) =>
        path.replace(/\.md$/, "") + // remove .md extension
        (path.endsWith("/") ? "" : "?") // distinguish files from folders
    )([...items, ["/"]]) // add root to avoid implicit truncation
    .sort(treeOrder)
    .count()
    .eachAfter((node: TreeNode<T>) => {
      const children = node.children;
      if (!children) return;
      let height = 0;
      for (let i = 0; i < children.length; ++i) {
        let child = children[i];
        if (child.children?.length === 1) {
          child = child.children![0];
          children[i] = child;
          child.parent = node;
          --child.depth;
        }
        height = Math.max(height, child.height + 1);
      }
      node.height = height;
    })
    .eachBefore((node: TreeNode<T>) => {
      let p = node;
      let indent = "";
      if (p.parent) {
        indent = (hasFollowingSibling(p) ? "├── " : "└── ") + indent;
        while ((p = p.parent!).parent) {
          indent = (hasFollowingSibling(p) ? "│   " : "    ") + indent;
        }
      }
      lines.push([
        indent || "┌",
        node.id.slice(node.parent?.id === "/" ? 1 : (node.parent?.id.length ?? 0) + 1).replace(/\?$/, ""),
        node.height ? ` (${node.value.toLocaleString("en-US")} page${node.value === 1 ? "" : "s"})` : "",
        node
      ]);
    });
  const width =
    (max(lines, ([indent, name, description]) => indent.length + description.length + stringLength(name)) || 0) + 1;
  return lines.map(([indent, name, description, node]) => [
    indent,
    name,
    description + " ".repeat(width - stringLength(name) - description.length - indent.length),
    node
  ]);
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
