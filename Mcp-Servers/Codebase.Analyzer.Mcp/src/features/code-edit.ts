// code-edit.ts — edits that avoid reading whole files into the LLM context:
//   insert_member  (add a method/property/field to a class without reading the file first)
//   update_imports (rewrite import paths / usings across many files in one call)

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { extname, join } from "path";
import { Node } from "ts-morph";
import { languageOf, parseTypeScript } from "./code-reader.js";
import { descendants, nameOf, parseCSharp, TYPE_DECLARATIONS } from "./csharp-syntax.js";

// ─── insert_member ─────────────────────────────────────────────────────────────

export interface InsertMemberOptions {
  memberKind: "method" | "property" | "field";
  signature: string;
  body?: string;
  position: "end_of_class" | "after_member";
  afterMemberName?: string;
  className?: string;
}

export interface InsertMemberResult {
  success: boolean;
  filePath: string;
  className: string;
  insertedAtLine: number;
}

interface ClassLayout {
  className: string;
  closeLine: number; // 0-based line of the closing brace
  members: { name: string; startLine: number; endLine: number }[]; // 0-based
  unit: string;
}

async function csLayout(code: string, className?: string): Promise<ClassLayout> {
  const root = await parseCSharp(code);
  const types = descendants(root, TYPE_DECLARATIONS).filter((t) => t.type !== "interface_declaration" || className);
  const type = className ? types.find((t) => nameOf(t) === className) : types[0];
  if (!type) throw new Error(className ? `Type not found: ${className}` : "No class, record or struct found in file");
  const body = type.childForFieldName("body");
  if (!body) throw new Error(`${nameOf(type)} has no body`);
  const members = body.namedChildren.filter((m) => m !== null).map((m) => {
    const name = nameOf(m!) || m!.descendantsOfType("variable_declarator")[0]?.childForFieldName("name")?.text || "";
    return { name, startLine: m!.startPosition.row, endLine: m!.endPosition.row };
  });
  return { className: nameOf(type), closeLine: body.endPosition.row, members, unit: "    " };
}

function tsLayout(filePath: string, code: string, className?: string): ClassLayout {
  const file = parseTypeScript(filePath, code);
  const classes = file.getClasses();
  const cls = className ? classes.find((c) => c.getName() === className) : classes[0];
  if (!cls) throw new Error(className ? `Class not found: ${className}` : "No class found in file");
  const members = cls.getMembers().map((m) => ({
    name: Node.hasName(m) ? m.getName() : Node.isConstructorDeclaration(m) ? "constructor" : "",
    startLine: m.getStartLineNumber() - 1,
    endLine: m.getEndLineNumber() - 1,
  }));
  return { className: cls.getName() ?? "(anonymous)", closeLine: cls.getEndLineNumber() - 1, members, unit: "  " };
}

function indentOf(line: string): string {
  return /^\s*/.exec(line)?.[0] ?? "";
}

function memberLines(options: InsertMemberOptions, indent: string, unit: string, csharp: boolean): string[] {
  const signature = options.signature.trim();
  if (options.memberKind !== "method" || /;\s*$/.test(signature) || /=>/.test(signature)) return ["", `${indent}${signature}`];
  const header = signature.replace(/\s*\{\s*$/, "");
  const body = options.body ?? (csharp ? "throw new NotImplementedException();" : "throw new Error('Not implemented');");
  const bodyLines = body.split(/\r?\n/).map((line) => (line.trim() ? `${indent}${unit}${line.trimEnd()}` : ""));
  // C# puts the opening brace on its own line, TypeScript on the header line.
  const opening = csharp ? [`${indent}${header}`, `${indent}{`] : [`${indent}${header} {`];
  return ["", ...opening, ...bodyLines, `${indent}}`];
}

export async function insertMember(filePath: string, options: InsertMemberOptions): Promise<InsertMemberResult> {
  const code = readFileSync(filePath, "utf-8");
  const eol = code.includes("\r\n") ? "\r\n" : "\n";
  const lines = code.split(/\r?\n/);
  const csharp = languageOf(filePath) === "csharp";
  const layout = csharp ? await csLayout(code, options.className) : tsLayout(filePath, code, options.className);

  let insertAt: number;
  if (options.position === "after_member") {
    if (!options.afterMemberName) throw new Error("after_member_name is required when position=after_member");
    const member = layout.members.find((m) => m.name === options.afterMemberName);
    if (!member) throw new Error(`Member not found in ${layout.className}: ${options.afterMemberName}`);
    insertAt = member.endLine + 1;
  } else {
    if (!/^\s*}/.test(lines[layout.closeLine])) {
      throw new Error(`Closing brace of ${layout.className} shares its line with other code; use a regular edit instead`);
    }
    insertAt = layout.closeLine;
  }

  const firstMember = layout.members[0];
  const indent = firstMember ? indentOf(lines[firstMember.startLine]) : indentOf(lines[layout.closeLine]) + layout.unit;
  const unit = /^\t+$/.test(indent) ? "\t" : layout.unit;
  const added = memberLines(options, indent, unit, csharp);
  lines.splice(insertAt, 0, ...added);
  writeFileSync(filePath, lines.join(eol), "utf-8");
  return { success: true, filePath, className: layout.className, insertedAtLine: insertAt + 2 };
}

// ─── update_imports ────────────────────────────────────────────────────────────

export interface ImportChange {
  file: string;
  line: number;
  oldImport: string;
  newImport: string;
}

export interface UpdateImportsResult {
  success: boolean;
  filesScanned: number;
  filesUpdated: number;
  changes: ImportChange[];
}

const SKIPPED_DIRS = new Set(["node_modules", "bin", "obj", "dist", ".git", ".angular", ".vs"]);
const EXTENSIONS: Record<string, string[]> = { typescript: [".ts", ".tsx"], csharp: [".cs"], auto: [".ts", ".tsx", ".cs"] };

function sourceFiles(dir: string, extensions: string[]): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : sourceFiles(join(dir, entry.name), extensions);
    return extensions.includes(extname(entry.name).toLowerCase()) ? [join(dir, entry.name)] : [];
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewrite(code: string, csharp: boolean, oldPath: string, newPath: string): string {
  const old = escapeRegex(oldPath);
  if (csharp) {
    return code.replace(new RegExp(`((?:global\\s+)?using\\s+(?:static\\s+)?(?:\\w+\\s*=\\s*)?)${old}(\\s*;)`, "g"), `$1${newPath}$2`);
  }
  return code
    .replace(new RegExp(`(\\bfrom\\s+['"])${old}(['"])`, "g"), `$1${newPath}$2`)
    .replace(new RegExp(`(\\bimport\\s*\\(\\s*['"])${old}(['"])`, "g"), `$1${newPath}$2`)
    .replace(new RegExp(`(^\\s*import\\s+['"])${old}(['"])`, "gm"), `$1${newPath}$2`);
}

export function updateImports(target: string, oldPath: string, newPath: string, language: "typescript" | "csharp" | "auto"): UpdateImportsResult {
  const extensions = EXTENSIONS[language];
  const files = statSync(target).isDirectory() ? sourceFiles(target, extensions) : [target];
  const changes: ImportChange[] = [];
  let filesUpdated = 0;
  for (const file of files) {
    const csharp = extname(file).toLowerCase() === ".cs";
    const code = readFileSync(file, "utf-8");
    const updated = rewrite(code, csharp, oldPath, newPath);
    if (updated === code) continue;
    writeFileSync(file, updated, "utf-8");
    filesUpdated += 1;
    const before = code.split(/\r?\n/);
    updated.split(/\r?\n/).forEach((line, index) => {
      if (line !== before[index]) changes.push({ file, line: index + 1, oldImport: before[index].trim(), newImport: line.trim() });
    });
  }
  return { success: true, filesScanned: files.length, filesUpdated, changes };
}
