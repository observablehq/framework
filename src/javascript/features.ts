import type {CallExpression, Identifier, Literal, Node, TemplateLiteral} from "acorn";
import {simple} from "acorn-walk";
import {getLocalPath} from "../files.js";
import type {Feature} from "../javascript.js";
import {defaultGlobals} from "./globals.js";
import {findReferences} from "./references.js";
import {syntaxError} from "./syntaxError.js";

export function findFeatures(node: Node, path: string, references: Identifier[], input: string): Feature[] {
  const featureMap = getFeatureReferenceMap(node);
  const features: Feature[] = [];

  simple(node, {
    CallExpression(node) {
      const {callee} = node;
      if (callee.type !== "Identifier") return;
      let type = featureMap.get(callee);
      // If this feature wasn’t explicitly imported into this cell, then ignore
      // function calls that are not references to the feature. For example, if
      // there’s a local variable called FileAttachment, that will mask the
      // built-in FileAttachment and won’t be considered a feature.
      if (!type) {
        if (!references.includes(callee)) return;
        const name = callee.name;
        if (name !== "FileAttachment") return;
        type = name;
      }
      features.push(getFeature(type, node, path, input));
    }
  });

  return features;
}

/**
 * Returns a map from Identifier to the feature type, such as FileAttachment.
 * Note that this may be different than the identifier.name because of aliasing.
 */
export function getFeatureReferenceMap(node: Node): Map<Identifier, Feature["type"]> {
  const declarations = new Set<{name: string}>();
  const alias = new Map<string, Feature["type"]>();
  let globals: Set<string> | undefined;

  // Find the declared local names of the imported symbol. Only named imports
  // are supported. TODO Support namespace imports?
  simple(node, {
    ImportDeclaration(node) {
      if (node.source.value === "npm:@observablehq/stdlib") {
        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "FileAttachment"
          ) {
            declarations.add(specifier.local);
            alias.set(specifier.local.name, specifier.imported.name);
          }
        }
      }
    }
  });

  // If the import is masking a global, don’t treat it as a global (since we’ll
  // ignore the import declaration below).
  for (const name of alias.keys()) {
    if (defaultGlobals.has(name)) {
      if (globals === undefined) globals = new Set(defaultGlobals);
      globals.delete(name);
    }
  }

  function filterDeclaration(node: {name: string}): boolean {
    return !declarations.has(node); // treat the imported declaration as unbound
  }

  const references = findReferences(node, {globals, filterDeclaration});
  const map = new Map<Identifier, Feature["type"]>();
  for (const r of references) {
    const type = alias.get(r.name);
    if (type) map.set(r, type);
  }
  return map;
}

export function getFeature(type: Feature["type"], node: CallExpression, path: string, input: string): Feature {
  const {
    arguments: args,
    arguments: [arg]
  } = node;

  // Forbid dynamic calls.
  if (args.length !== 1 || !isStringLiteral(arg)) {
    throw syntaxError(`${type} requires a single literal string argument`, node, input);
  }

  // Forbid file attachments that are not local paths; normalize the path.
  let name: string | null = getStringLiteralValue(arg);
  if (type === "FileAttachment") {
    const localPath = getLocalPath(path, name);
    if (!localPath) throw syntaxError(`non-local file path: ${name}`, node, input);
    name = localPath;
  }

  return {type, name};
}

export function isStringLiteral(node: any): node is Literal | TemplateLiteral {
  return (
    node &&
    ((node.type === "Literal" && /^['"]/.test(node.raw)) ||
      (node.type === "TemplateLiteral" && node.expressions.length === 0))
  );
}

// Note: only valid if isStringLiteral returned true;
export function getStringLiteralValue(node: any): string {
  return node.type === "Literal" ? (node.value as string) : node.quasis[0].value.cooked!;
}
