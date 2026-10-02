// code-reader.ts — token-saving readers for single files:
//   read_signatures_only, read_method, read_class_summary
// TypeScript via ts-morph (in-memory), C# via tree-sitter. No project load, no compiler run.

import { readFileSync } from "fs";
import { extname } from "path";
import { Node, Project, Scope, SourceFile } from "ts-morph";
import { accessOf, descendants, headerOf, nameOf, oneLine, parseCSharp, SyntaxNode, TYPE_DECLARATIONS } from "./csharp-syntax.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SignatureEntry {
  type: string;
  access: string;
  signature: string;
  line: number;
}

export interface MethodEntry {
  className: string | null;
  signature: string;
  body: string;
  startLine: number;
  endLine: number;
}

export interface ClassSummary {
  className: string;
  kind: string;
  baseClass: string | null;
  interfaces: string[];
  properties: { name: string; type: string; access: string }[];
  methods: { name: string; returnType: string; parameters: string[]; line: number }[];
}

type Language = "typescript" | "csharp";

// ─── Shared ────────────────────────────────────────────────────────────────────

export function languageOf(filePath: string): Language {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".cs") return "csharp";
  if (ext === ".ts" || ext === ".tsx") return "typescript";
  throw new Error(`Unsupported file type: ${filePath} (expected .cs, .ts or .tsx)`);
}

const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: false } });

export function parseTypeScript(filePath: string, code: string): SourceFile {
  return project.createSourceFile(filePath.replace(/\\/g, "/").replace(/^[A-Za-z]:/, ""), code, { overwrite: true });
}

function looksLikeInterface(typeName: string): boolean {
  return /^I[A-Z]/.test(typeName);
}

// ─── TypeScript ────────────────────────────────────────────────────────────────

function tsAccess(node: Node): string {
  const scope = Node.isScoped(node) || Node.isScopeable(node) ? node.getScope() : undefined;
  if (scope === Scope.Private) return "private";
  if (scope === Scope.Protected) return "protected";
  const name = Node.hasName(node) ? node.getName() : "";
  return name.startsWith("#") ? "private" : "public";
}

function tsHeader(node: Node): string {
  const body = Node.isBodyable(node) ? node.getBody() : undefined;
  const text = body ? node.getText().slice(0, body.getStart() - node.getStart()) : node.getText();
  return oneLine(text.replace(/[;{]\s*$/, ""));
}

function tsSignatures(code: string, filePath: string, includePrivate: boolean): SignatureEntry[] {
  const file = parseTypeScript(filePath, code);
  const entries: SignatureEntry[] = [];
  const add = (type: string, node: Node) => {
    const access = tsAccess(node);
    if (!includePrivate && access === "private") return;
    entries.push({ type, access, signature: tsHeader(node), line: node.getStartLineNumber() });
  };
  for (const fn of file.getFunctions()) add("function", fn);
  for (const cls of file.getClasses()) {
    for (const ctor of cls.getConstructors()) add("constructor", ctor);
    for (const prop of cls.getProperties()) add("property", prop);
    for (const accessor of [...cls.getGetAccessors(), ...cls.getSetAccessors()]) add("accessor", accessor);
    for (const method of cls.getMethods()) add("method", method);
  }
  for (const iface of file.getInterfaces()) {
    for (const member of iface.getMembers()) add(Node.isMethodSignature(member) ? "method" : "property", member);
  }
  return entries.sort((a, b) => a.line - b.line);
}

function tsMethods(code: string, filePath: string, methodName: string, className?: string): MethodEntry[] {
  const file = parseTypeScript(filePath, code);
  const found: MethodEntry[] = [];
  const add = (owner: string | null, node: Node) =>
    found.push({ className: owner, signature: tsHeader(node), body: node.getText(), startLine: node.getStartLineNumber(), endLine: node.getEndLineNumber() });
  for (const cls of file.getClasses()) {
    if (className && cls.getName() !== className) continue;
    for (const method of cls.getMethods()) if (method.getName() === methodName) add(cls.getName() ?? null, method);
    for (const accessor of [...cls.getGetAccessors(), ...cls.getSetAccessors()]) if (accessor.getName() === methodName) add(cls.getName() ?? null, accessor);
    for (const prop of cls.getProperties()) {
      const init = prop.getInitializer();
      if (prop.getName() === methodName && init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) add(cls.getName() ?? null, prop);
    }
  }
  if (!className) for (const fn of file.getFunctions()) if (fn.getName() === methodName) add(null, fn);
  return found;
}

function tsClassSummary(code: string, filePath: string, className?: string): ClassSummary {
  const file = parseTypeScript(filePath, code);
  const classes = file.getClasses();
  const cls = className ? classes.find((c) => c.getName() === className) : classes[0];
  if (!cls) throw new Error(className ? `Class not found: ${className}` : "No class found in file");
  return {
    className: cls.getName() ?? "(anonymous)",
    kind: "class",
    baseClass: cls.getExtends()?.getText() ?? null,
    interfaces: cls.getImplements().map((i) => i.getText()),
    properties: cls.getProperties().map((p) => ({
      name: p.getName(),
      type: p.getTypeNode()?.getText() ?? oneLine(p.getInitializer()?.getText() ?? "unknown", 80),
      access: tsAccess(p),
    })),
    methods: cls.getMethods().map((m) => ({
      name: m.getName(),
      returnType: m.getReturnTypeNode()?.getText() ?? "inferred",
      parameters: m.getParameters().map((p) => oneLine(p.getText())),
      line: m.getStartLineNumber(),
    })),
  };
}

// ─── C# ────────────────────────────────────────────────────────────────────────

const CS_MEMBERS: Record<string, string> = {
  constructor_declaration: "constructor",
  property_declaration: "property",
  indexer_declaration: "indexer",
  method_declaration: "method",
};

function csTypeName(node: SyntaxNode): string | null {
  for (let current = node.parent; current; current = current.parent) {
    if (TYPE_DECLARATIONS.has(current.type)) return nameOf(current);
  }
  return null;
}

async function csSignatures(code: string, includePrivate: boolean): Promise<SignatureEntry[]> {
  const root = await parseCSharp(code);
  return descendants(root, new Set(Object.keys(CS_MEMBERS)))
    .map((node) => ({ node, access: accessOf(node) }))
    .filter(({ access }) => includePrivate || access !== "private")
    .map(({ node, access }) => ({
      type: CS_MEMBERS[node.type],
      access,
      signature: node.type === "property_declaration" ? oneLine(node.text) : headerOf(node, code),
      line: node.startPosition.row + 1,
    }));
}

async function csMethods(code: string, methodName: string, className?: string): Promise<MethodEntry[]> {
  const root = await parseCSharp(code);
  return descendants(root, new Set(["method_declaration", "constructor_declaration", "local_function_statement"]))
    .filter((node) => nameOf(node) === methodName)
    .map((node) => ({ node, owner: csTypeName(node) }))
    .filter(({ owner }) => !className || owner === className)
    .map(({ node, owner }) => ({
      className: owner,
      signature: headerOf(node, code),
      body: code.slice(node.startIndex, node.endIndex),
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
    }));
}

function csTypeText(node: SyntaxNode | null): string {
  return node ? oneLine(node.text) : "unknown";
}

async function csClassSummary(code: string, className?: string): Promise<ClassSummary> {
  const root = await parseCSharp(code);
  const types = descendants(root, TYPE_DECLARATIONS);
  const type = className ? types.find((t) => nameOf(t) === className) : types[0];
  if (!type) throw new Error(className ? `Type not found: ${className}` : "No class, record, struct or interface found in file");
  const baseTypes = type.namedChildren
    .find((child) => child?.type === "base_list")
    ?.namedChildren.filter((child) => child !== null && child.type !== "argument_list")
    .map((child) => oneLine(child!.text)) ?? [];
  const firstIsBase = type.type !== "interface_declaration" && baseTypes.length > 0 && !looksLikeInterface(baseTypes[0]);
  const members = type.childForFieldName("body")?.namedChildren.filter((child): child is SyntaxNode => child !== null) ?? [];
  return {
    className: nameOf(type),
    kind: type.type.replace("_declaration", ""),
    baseClass: firstIsBase ? baseTypes[0] : null,
    interfaces: firstIsBase ? baseTypes.slice(1) : baseTypes,
    properties: members
      .filter((m) => m.type === "property_declaration")
      .map((m) => ({ name: nameOf(m), type: csTypeText(m.childForFieldName("type")), access: accessOf(m) })),
    methods: members
      .filter((m) => m.type === "method_declaration")
      .map((m) => ({
        name: nameOf(m),
        returnType: csTypeText(m.childForFieldName("returns") ?? m.childForFieldName("type")),
        parameters: m.childForFieldName("parameters")?.namedChildren.filter((p) => p?.type === "parameter").map((p) => oneLine(p!.text)) ?? [],
        line: m.startPosition.row + 1,
      })),
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function readSignaturesOnly(filePath: string, includePrivate = false): Promise<SignatureEntry[]> {
  const code = readFileSync(filePath, "utf-8");
  return languageOf(filePath) === "csharp" ? csSignatures(code, includePrivate) : tsSignatures(code, filePath, includePrivate);
}

export async function readMethod(filePath: string, methodName: string, className?: string): Promise<MethodEntry[]> {
  const code = readFileSync(filePath, "utf-8");
  const found = languageOf(filePath) === "csharp" ? await csMethods(code, methodName, className) : tsMethods(code, filePath, methodName, className);
  if (found.length === 0) throw new Error(`Method not found: ${className ? `${className}.` : ""}${methodName}`);
  return found;
}

export async function readClassSummary(filePath: string, className?: string): Promise<ClassSummary> {
  const code = readFileSync(filePath, "utf-8");
  return languageOf(filePath) === "csharp" ? csClassSummary(code, className) : tsClassSummary(code, filePath, className);
}
