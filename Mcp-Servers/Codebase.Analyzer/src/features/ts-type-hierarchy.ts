import { Project, Node, SourceFile, ClassDeclaration, InterfaceDeclaration } from "ts-morph";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, relative, resolve } from "path";
import { TypeHierarchyInfo, TypeHierarchyResult } from "./type-hierarchy-types.js";

const PROJECT_FILE_CAP = 400;

export const typeHierarchyScanState: { capReached: boolean } = { capReached: false };

export function findTypeHierarchy(
  rootPath: string,
  typeName: string,
  filePath?: string,
  direction: "up" | "down" | "both" = "both",
): TypeHierarchyResult {
  typeHierarchyScanState.capReached = false;

  const tsConfigPath = join(rootPath, "tsconfig.json");
  let sourceFiles: SourceFile[];
  let capReached = false;

  if (existsSync(tsConfigPath)) {
    try {
      const project = new Project({ tsConfigFilePath: tsConfigPath });
      const projectFiles = filterProjectSourceFiles(project.getSourceFiles());
      capReached = projectFiles.length > PROJECT_FILE_CAP;
      sourceFiles = capReached ? projectFiles.slice(0, PROJECT_FILE_CAP) : projectFiles;
    } catch {
      const loaded = loadProject(rootPath);
      sourceFiles = loaded.sourceFiles;
      capReached = loaded.capReached;
    }
  } else {
    const loaded = loadProject(rootPath);
    sourceFiles = loaded.sourceFiles;
    capReached = loaded.capReached;
  }
  typeHierarchyScanState.capReached = capReached;

  const anchors = collectTypeAnchors(filterAnchorFiles(sourceFiles, rootPath, filePath), typeName);
  if (anchors.length === 0)
    return { up: [], down: [], capReached };

  const up: TypeHierarchyInfo[] = [];
  const down: TypeHierarchyInfo[] = [];
  const seenUp = new Set<string>();
  const seenDown = new Set<string>();

  for (const anchor of anchors) {
    if (direction === "up" || direction === "both") {
      if (Node.isClassDeclaration(anchor))
        collectUpFromClass(anchor, sourceFiles, rootPath, up, seenUp);
      else if (Node.isInterfaceDeclaration(anchor))
        collectUpFromInterface(anchor, sourceFiles, rootPath, up, seenUp);
    }
    if (direction === "down" || direction === "both")
      collectDownFromAnchor(anchor, typeName, sourceFiles, rootPath, down, seenDown);
  }

  return { up, down, capReached: capReached || undefined };
}

function loadProject(rootPath: string): { sourceFiles: SourceFile[]; capReached: boolean } {
  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular"];
  const files: string[] = [];
  let capReached = false;

  function walk(dir: string) {
    try {
      for (const entry of readdirSync(dir)) {
        if (ignored.includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (extname(full) === ".ts" && !full.endsWith(".spec.ts") && !full.endsWith(".d.ts")) {
          if (files.length >= PROJECT_FILE_CAP) { capReached = true; continue; }
          files.push(full);
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
  walk(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of files) { try { project.addSourceFileAtPath(f); } catch { /* skip */ } }
  return { sourceFiles: project.getSourceFiles(), capReached };
}

function isProjectSourceFile(filePath: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  if (p.includes("/node_modules/")) return false;
  if (p.endsWith(".d.ts")) return false;
  if (p.endsWith(".spec.ts")) return false;
  return true;
}

function filterProjectSourceFiles(sourceFiles: SourceFile[]): SourceFile[] {
  return sourceFiles.filter((sf) => isProjectSourceFile(sf.getFilePath()));
}

function filterAnchorFiles(sourceFiles: SourceFile[], rootPath: string, filePath?: string): SourceFile[] {
  if (!filePath) return sourceFiles;
  const norm = filePath.replace(/\\/g, "/");
  const abs = resolve(rootPath, filePath).replace(/\\/g, "/");
  return sourceFiles.filter((sf) => {
    const p = sf.getFilePath().replace(/\\/g, "/");
    return p === abs || p === norm || p.endsWith("/" + norm);
  });
}

function collectTypeAnchors(sourceFiles: SourceFile[], typeName: string): Node[] {
  const anchors: Node[] = [];
  for (const sf of sourceFiles) {
    const cls = sf.getClass(typeName);
    if (cls) anchors.push(cls);
    const iface = sf.getInterface(typeName);
    if (iface) anchors.push(iface);
  }
  return anchors;
}

function pushHierarchy(list: TypeHierarchyInfo[], seen: Set<string>, info: TypeHierarchyInfo): void {
  const key = `${info.name}:${info.file}:${info.line}`;
  if (seen.has(key)) return;
  seen.add(key);
  list.push(info);
}

function classKind(cls: ClassDeclaration): TypeHierarchyInfo["kind"] {
  return cls.isAbstract() ? "abstract" : "class";
}

function resolveTypeNameFromExpression(expr: Node, fallbackText: string): string {
  try {
    const type = expr.getType();
    const sym = type.getSymbol() ?? type.getAliasSymbol();
    if (sym) return sym.getName();
  } catch { /* fallback */ }
  const text = fallbackText.trim();
  const dot = text.lastIndexOf(".");
  return dot >= 0 ? text.slice(dot + 1) : text;
}

function typeInfoFromClass(cls: ClassDeclaration, rootPath: string): TypeHierarchyInfo {
  return {
    name: cls.getName() ?? "(anonymous)",
    file: relative(rootPath, cls.getSourceFile().getFilePath()).replace(/\\/g, "/"),
    line: cls.getStartLineNumber(),
    kind: classKind(cls),
  };
}

function typeInfoFromInterface(iface: InterfaceDeclaration, rootPath: string): TypeHierarchyInfo {
  return {
    name: iface.getName() ?? "(anonymous)",
    file: relative(rootPath, iface.getSourceFile().getFilePath()).replace(/\\/g, "/"),
    line: iface.getStartLineNumber(),
    kind: "interface",
  };
}

function findClassByName(sourceFiles: SourceFile[], name: string): ClassDeclaration | undefined {
  for (const sf of sourceFiles) {
    const cls = sf.getClass(name);
    if (cls) return cls;
  }
  return undefined;
}

function findInterfaceByName(sourceFiles: SourceFile[], name: string): InterfaceDeclaration | undefined {
  for (const sf of sourceFiles) {
    const iface = sf.getInterface(name);
    if (iface) return iface;
  }
  return undefined;
}

function typeInfoFromHeritage(
  expr: Node,
  rootPath: string,
  sourceFiles: SourceFile[],
  kindDefault: TypeHierarchyInfo["kind"],
): TypeHierarchyInfo | null {
  const name = resolveTypeNameFromExpression(expr, expr.getText());
  if (!name || name === "Object") return null;

  const declCls = findClassByName(sourceFiles, name);
  if (declCls) return typeInfoFromClass(declCls, rootPath);
  const declIface = findInterfaceByName(sourceFiles, name);
  if (declIface) return typeInfoFromInterface(declIface, rootPath);

  return {
    name,
    file: relative(rootPath, expr.getSourceFile().getFilePath()).replace(/\\/g, "/"),
    line: expr.getStartLineNumber(),
    kind: kindDefault,
  };
}

function collectUpFromClass(
  anchor: ClassDeclaration,
  sourceFiles: SourceFile[],
  rootPath: string,
  up: TypeHierarchyInfo[],
  seen: Set<string>,
): void {
  const chain: TypeHierarchyInfo[] = [];
  const visited = new Set<string>();
  let current: ClassDeclaration | undefined = anchor;

  while (current) {
    for (const impl of current.getImplements()) {
      const info = typeInfoFromHeritage(impl.getExpression(), rootPath, sourceFiles, "interface");
      if (info) pushHierarchy(up, seen, info);
    }

    const extendsClause = current.getExtends();
    if (!extendsClause) break;

    const info = typeInfoFromHeritage(extendsClause.getExpression(), rootPath, sourceFiles, "class");
    if (!info || info.name === "Object" || visited.has(info.name)) break;
    visited.add(info.name);
    chain.push(info);

    current = findClassByName(sourceFiles, info.name);
  }

  up.push(...chain.reverse());
}

function collectUpFromInterface(
  anchor: InterfaceDeclaration,
  sourceFiles: SourceFile[],
  rootPath: string,
  up: TypeHierarchyInfo[],
  seen: Set<string>,
): void {
  const chain: TypeHierarchyInfo[] = [];
  const visited = new Set<string>();
  let current: InterfaceDeclaration | undefined = anchor;

  while (current) {
    const parents = current.getExtends();
    if (parents.length === 0) break;

    const info = typeInfoFromHeritage(parents[0].getExpression(), rootPath, sourceFiles, "interface");
    if (!info || visited.has(info.name)) break;
    visited.add(info.name);
    chain.push(info);

    current = findInterfaceByName(sourceFiles, info.name);
  }

  up.push(...chain.reverse());
}

function expressionMatchesTypeName(expr: Node, typeName: string): boolean {
  return resolveTypeNameFromExpression(expr, expr.getText()) === typeName;
}

function collectDownFromAnchor(
  anchor: Node,
  typeName: string,
  sourceFiles: SourceFile[],
  rootPath: string,
  down: TypeHierarchyInfo[],
  seen: Set<string>,
): void {
  const anchorFile = anchor.getSourceFile().getFilePath();
  const anchorLine = anchor.getStartLineNumber();

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      if (cls.getSourceFile().getFilePath() === anchorFile && cls.getStartLineNumber() === anchorLine)
        continue;

      const extendsExpr = cls.getExtends()?.getExpression();
      const implementsAnchor = cls.getImplements().some((i) => expressionMatchesTypeName(i.getExpression(), typeName));
      const extendsMatch = extendsExpr ? expressionMatchesTypeName(extendsExpr, typeName) : false;

      if (extendsMatch || implementsAnchor)
        pushHierarchy(down, seen, typeInfoFromClass(cls, rootPath));
    }

    for (const iface of sf.getInterfaces()) {
      if (iface.getSourceFile().getFilePath() === anchorFile && iface.getStartLineNumber() === anchorLine)
        continue;

      if (iface.getExtends().some((e) => expressionMatchesTypeName(e.getExpression(), typeName)))
        pushHierarchy(down, seen, typeInfoFromInterface(iface, rootPath));
    }
  }

  down.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
}
