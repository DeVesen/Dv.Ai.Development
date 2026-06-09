import { Project, Node, SourceFile, SyntaxKind } from "ts-morph";
import {
  DEFAULT_MIN_CC,
  DEFAULT_MIN_LINES,
  ExtractionCandidate,
  ExtractionThresholds,
  MethodExtractionReport,
} from "./extraction-types.js";

const MIN_BLOCK_LOC = 5;
const NAME_STOPWORDS = new Set(["const", "let", "await", "return", "if", "for", "while", "var", "throw", "new"]);

export function findExtractionCandidates(
  filePath: string,
  thresholds?: ExtractionThresholds,
): MethodExtractionReport[] {
  const minLines = thresholds?.minLines ?? DEFAULT_MIN_LINES;
  const minCC = thresholds?.minCC ?? DEFAULT_MIN_CC;

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  let sf: SourceFile;
  try {
    sf = project.addSourceFileAtPath(filePath);
  } catch {
    throw new Error(`Could not load file: ${filePath}`);
  }

  const reports: MethodExtractionReport[] = [];
  for (const unit of collectExtractionMethodUnits(sf)) {
    const lines = unit.node.getEndLineNumber() - unit.node.getStartLineNumber();
    const { complexity } = computeComplexityFromNode(unit.node);
    const candidates =
      lines >= minLines && complexity >= minCC ? extractCandidatesFromUnit(unit.node, sf) : [];
    reports.push({ method: unit.name, lines, cyclomaticComplexity: complexity, candidates });
  }
  return reports;
}

interface ExtractionMethodUnit { name: string; node: Node; }

function collectExtractionMethodUnits(sf: SourceFile): ExtractionMethodUnit[] {
  const units: ExtractionMethodUnit[] = [];
  for (const cls of sf.getClasses()) {
    for (const method of cls.getMethods()) units.push({ name: method.getName(), node: method });
    for (const prop of cls.getProperties()) {
      const init = prop.getInitializer();
      if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init)))
        units.push({ name: prop.getName(), node: init });
    }
  }
  for (const fn of sf.getFunctions()) units.push({ name: fn.getName() ?? "(anonymous)", node: fn });
  return units;
}

function computeComplexityFromNode(node: Node): { complexity: number; branches: string[] } {
  let complexity = 1;
  const branches: string[] = [];
  node.forEachDescendant((child) => {
    const kind = child.getKind();
    switch (kind) {
      case SyntaxKind.IfStatement: complexity++; branches.push("if"); break;
      case SyntaxKind.ConditionalExpression: complexity++; branches.push("ternary"); break;
      case SyntaxKind.ForStatement: complexity++; branches.push("for"); break;
      case SyntaxKind.ForInStatement: complexity++; branches.push("for-in"); break;
      case SyntaxKind.ForOfStatement: complexity++; branches.push("for-of"); break;
      case SyntaxKind.WhileStatement: complexity++; branches.push("while"); break;
      case SyntaxKind.DoStatement: complexity++; branches.push("do-while"); break;
      case SyntaxKind.CaseClause: complexity++; branches.push("case"); break;
      case SyntaxKind.CatchClause: complexity++; branches.push("catch"); break;
      case SyntaxKind.AmpersandAmpersandToken: complexity++; branches.push("&&"); break;
      case SyntaxKind.BarBarToken: complexity++; branches.push("||"); break;
      case SyntaxKind.QuestionQuestionToken: complexity++; branches.push("??"); break;
    }
  });
  const counts: Record<string, number> = {};
  branches.forEach((b) => { counts[b] = (counts[b] ?? 0) + 1; });
  return { complexity, branches: Object.entries(counts).map(([k, v]) => (v > 1 ? `${k}×${v}` : k)) };
}

function extractCandidatesFromUnit(methodNode: Node, sf: SourceFile): ExtractionCandidate[] {
  const body = getExtractionMethodBody(methodNode);
  if (!body) return [];

  const sourceLines = sf.getFullText().split("\n");
  const topLevel = getExtractionTopLevelStatements(body);
  if (topLevel.length === 0) return [];

  const ranges: { startLine: number; endLine: number; nodes: Node[] }[] = [];
  let group: Node[] = [];
  const flushGroup = () => {
    if (group.length === 0) return;
    const startLine = group[0].getStartLineNumber();
    const endLine = group[group.length - 1].getEndLineNumber();
    if (endLine - startLine + 1 >= MIN_BLOCK_LOC) ranges.push({ startLine, endLine, nodes: [...group] });
    group = [];
  };

  for (const stmt of topLevel) {
    if (group.length > 0 && hasExtractionSeparatorBefore(sourceLines, stmt.getStartLineNumber())) flushGroup();
    group.push(stmt);
  }
  flushGroup();

  for (const stmt of topLevel) {
    const cf = getControlFlowBlockRange(stmt);
    if (!cf || cf.endLine - cf.startLine + 1 < MIN_BLOCK_LOC) continue;
    if (ranges.some((r) => rangesOverlap(r.startLine, r.endLine, cf.startLine, cf.endLine))) continue;
    ranges.push({ startLine: cf.startLine, endLine: cf.endLine, nodes: [stmt] });
  }

  return dedupeOverlappingRanges(ranges).map((r) => ({
    suggestedName: suggestExtractionName(r.nodes, sourceLines, r.startLine),
    startLine: r.startLine,
    endLine: r.endLine,
    parameters: deriveBlockParameters(r.nodes, topLevel, r.endLine),
  }));
}

function getExtractionMethodBody(node: Node): Node | undefined {
  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node)) return node.getBody();
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) return node.getBody();
  return undefined;
}

function getExtractionTopLevelStatements(body: Node): Node[] {
  if (Node.isBlock(body)) return body.getStatements() as Node[];
  return [];
}

function hasExtractionSeparatorBefore(lines: string[], startLine: number): boolean {
  for (let i = startLine - 2; i >= 0; i--) {
    const trimmed = lines[i]?.trim() ?? "";
    if (trimmed === "") return true;
    if (trimmed.startsWith("//")) return true;
    if (trimmed.length > 0) return false;
  }
  return false;
}

function getControlFlowBlockRange(stmt: Node): { startLine: number; endLine: number } | null {
  let body: Node | undefined;
  if (Node.isIfStatement(stmt)) body = stmt.getThenStatement();
  else if (Node.isForStatement(stmt) || Node.isForOfStatement(stmt) || Node.isForInStatement(stmt) || Node.isWhileStatement(stmt))
    body = stmt.getStatement();
  else return null;
  if (!body || !Node.isBlock(body)) return null;
  return { startLine: body.getStartLineNumber(), endLine: body.getEndLineNumber() };
}

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 <= b2 && b1 <= a2;
}

function dedupeOverlappingRanges(ranges: { startLine: number; endLine: number; nodes: Node[] }[]) {
  const sorted = [...ranges].sort((a, b) => a.startLine - b.startLine || a.endLine - b.endLine);
  const kept: typeof ranges = [];
  for (const r of sorted) {
    const overlaps = kept.filter((k) => rangesOverlap(k.startLine, k.endLine, r.startLine, r.endLine));
    if (overlaps.length === 0) { kept.push(r); continue; }
    const rSize = r.endLine - r.startLine;
    const replaceIdx = overlaps.findIndex((k) => rSize < k.endLine - k.startLine && r.startLine >= k.startLine && r.endLine <= k.endLine);
    if (replaceIdx >= 0) kept[replaceIdx] = r;
  }
  return kept.sort((a, b) => a.startLine - b.startLine);
}

function suggestExtractionName(nodes: Node[], sourceLines: string[], startLine: number): string {
  for (let i = startLine - 2; i >= Math.max(0, startLine - 4); i--) {
    const trimmed = sourceLines[i]?.trim() ?? "";
    const m = trimmed.match(/^\/\/\s*(.+)$/);
    if (m) return extractionToCamelCase(m[1]);
    if (trimmed.length > 0 && !trimmed.startsWith("//")) break;
  }
  for (const node of nodes) {
    const verb = extractVerbFromStatement(node);
    if (verb) {
      const noun = extractFirstIdentifier(node);
      return noun && noun !== verb ? `${verb}${noun.charAt(0).toUpperCase()}${noun.slice(1)}` : verb;
    }
  }
  return "extractedBlock";
}

function extractionToCamelCase(text: string): string {
  const words = text.replace(/[^a-zA-Z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "extractedBlock";
  return words.map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())).join("");
}

function extractVerbFromStatement(node: Node): string | null {
  for (const id of node.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const lower = id.getText().toLowerCase();
    if (NAME_STOPWORDS.has(lower)) continue;
    return lower;
  }
  return null;
}

function extractFirstIdentifier(node: Node): string | null {
  const ids = node.getDescendantsOfKind(SyntaxKind.Identifier);
  return ids.length > 1 ? ids[1].getText() : ids[0]?.getText() ?? null;
}

function deriveBlockParameters(blockNodes: Node[], topLevel: Node[], blockEndLine: number): string[] {
  const blockStartLine = Math.min(...blockNodes.map((n) => n.getStartLineNumber()));
  const declaredInBlock = new Set<string>();
  const declaredBeforeBlock = new Set<string>();
  const usedInBlock = new Set<string>();
  const usedAfterBlock = new Set<string>();
  const methodParams = new Set<string>();

  const methodRoot = blockNodes[0]?.getFirstAncestor((a) =>
    Node.isMethodDeclaration(a) || Node.isFunctionDeclaration(a) || Node.isArrowFunction(a),
  );
  if (methodRoot && (Node.isMethodDeclaration(methodRoot) || Node.isFunctionDeclaration(methodRoot) || Node.isArrowFunction(methodRoot))) {
    for (const p of methodRoot.getParameters()) methodParams.add(p.getName());
  }

  for (const stmt of topLevel) {
    if (stmt.getStartLineNumber() >= blockStartLine) break;
    stmt.forEachDescendant((child) => {
      if (Node.isVariableDeclaration(child)) declaredBeforeBlock.add(child.getName().split(".")[0]);
    });
  }

  for (const node of blockNodes) {
    node.forEachDescendant((child) => {
      if (Node.isVariableDeclaration(child)) {
        declaredInBlock.add(child.getName().split(".")[0]);
      }
      if (Node.isIdentifier(child)) {
        const id = child.getText();
        if (NAME_STOPWORDS.has(id.toLowerCase()) || id === "this") return;
        const parent = child.getParent();
        if (parent && Node.isVariableDeclaration(parent) && parent.getNameNode() === child) return;
        if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === child) return;
        if (parent && Node.isCallExpression(parent) && parent.getExpression() === child) return;
        if (parent && Node.isNewExpression(parent) && parent.getExpression() === child) return;
        usedInBlock.add(id);
      }
    });
  }

  for (const stmt of topLevel) {
    if (stmt.getStartLineNumber() <= blockEndLine) continue;
    stmt.forEachDescendant((child) => {
      if (Node.isIdentifier(child)) usedAfterBlock.add(child.getText());
    });
  }

  return [...usedInBlock]
    .filter((n) => {
      if (declaredInBlock.has(n) || usedAfterBlock.has(n)) return false;
      if (methodParams.has(n)) return true;
      return !declaredBeforeBlock.has(n);
    })
    .sort();
}
