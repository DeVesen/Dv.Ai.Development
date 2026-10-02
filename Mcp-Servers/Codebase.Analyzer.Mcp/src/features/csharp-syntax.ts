// csharp-syntax.ts — C# syntax tree via tree-sitter (WASM), in-process and warm.
// Unlike the Roslyn scripts (one dotnet-script run per call) a parse costs milliseconds here.
// Meant for fast read and insert tools, not for semantic analysis.

import { createRequire } from "module";
import { dirname, join } from "path";
import type { Language as TsLanguage, Node as TsNode, Parser as TsParser } from "@vscode/tree-sitter-wasm";

export type SyntaxNode = TsNode;

const require = createRequire(import.meta.url);
const wasmDir = dirname(require.resolve("@vscode/tree-sitter-wasm/wasm/tree-sitter.js"));

let parserPromise: Promise<TsParser> | null = null;

async function createParser(): Promise<TsParser> {
  const { Parser, Language } = require(join(wasmDir, "tree-sitter.js")) as {
    Parser: typeof TsParser;
    Language: typeof TsLanguage;
  };
  await Parser.init({ locateFile: (file: string) => join(wasmDir, file) });
  const csharp = await Language.load(join(wasmDir, "tree-sitter-c-sharp.wasm"));
  const parser = new Parser();
  parser.setLanguage(csharp);
  return parser;
}

export async function parseCSharp(code: string): Promise<SyntaxNode> {
  parserPromise ??= createParser();
  const tree = (await parserPromise).parse(code);
  if (!tree) throw new Error("C# parser returned no syntax tree");
  return tree.rootNode;
}

export const TYPE_DECLARATIONS = new Set([
  "class_declaration",
  "record_declaration",
  "struct_declaration",
  "interface_declaration",
]);

export function descendants(node: SyntaxNode, types: Set<string>): SyntaxNode[] {
  return node.descendantsOfType([...types]).filter((child): child is SyntaxNode => child !== null);
}

export function modifiersOf(node: SyntaxNode): string[] {
  return node.namedChildren.filter((child) => child?.type === "modifier").map((child) => child!.text);
}

// Members without an access modifier are public in interfaces, private elsewhere.
export function accessOf(node: SyntaxNode): string {
  const modifiers = modifiersOf(node);
  for (const access of ["public", "protected", "internal", "private"]) {
    if (modifiers.includes(access)) return access;
  }
  return node.parent?.parent?.type === "interface_declaration" ? "public" : "private";
}

export function nameOf(node: SyntaxNode): string {
  return node.childForFieldName("name")?.text ?? "";
}

export function oneLine(text: string, max = 200): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

// Member header: everything before the body ({...} or => ...), without trailing ; or {.
export function headerOf(node: SyntaxNode, source: string): string {
  const body = node.childForFieldName("body");
  const end = body ? body.startIndex : node.endIndex;
  return oneLine(source.slice(node.startIndex, end).replace(/[;{]\s*$/, ""));
}
