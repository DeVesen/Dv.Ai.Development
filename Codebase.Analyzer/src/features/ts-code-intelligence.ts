import {
  Project, Node, SourceFile, ClassDeclaration, MethodDeclaration,
  SyntaxKind, Type, Symbol as MorphSymbol,
} from "ts-morph";
import { readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TsCodeIntelligenceReport {
  projectRoot: string;
  generatedAt: string;
  maintainabilityIndex: MaintainabilityReport[];
  typeGraph: TypeGraphReport;
  controlFlowReport: CfgReport[];
}

// ── Maintainability ───────────────────────────────────────────────────────────
export interface MaintainabilityReport {
  file: string;
  className: string;
  methodName: string;
  line: number;
  maintainabilityIndex: number;   // 0–100 (Visual Studio scale)
  grade: "A" | "B" | "C" | "D" | "F";
  components: {
    cyclomaticComplexity: number;
    halsteadVolume: number;
    linesOfCode: number;
  };
  lcom: number;                   // class-level LCOM (0–1)
  interpretation: string;
}

// ── Type Graph ────────────────────────────────────────────────────────────────
export interface TypeGraphReport {
  nodes: TypeNode[];
  edges: TypeEdge[];
  cycles: string[][];
  orphanTypes: string[];
  mostConnected: { name: string; connections: number }[];
  angularSpecific: AngularTypeRelations;
}

export interface TypeNode {
  id: string;
  name: string;
  kind: "class" | "interface" | "enum" | "type" | "component" | "service" | "pipe" | "directive";
  file: string;
  line: number;
  isExported: boolean;
  genericParams: string[];
}

export interface TypeEdge {
  from: string;
  to: string;
  relation: "extends" | "implements" | "uses" | "injects" | "returns" | "parameter" | "generic" | "template-ref";
  file: string;
  line: number;
}

export interface AngularTypeRelations {
  componentToService: { component: string; service: string }[];
  serviceToRepository: { service: string; repository: string }[];
  inputOutputTypes: { component: string; inputName: string; type: string }[];
  routeToComponent: { path: string; component: string }[];
}

// ── CFG / Unreachable Code ────────────────────────────────────────────────────
export interface CfgReport {
  file: string;
  className: string;
  methodName: string;
  line: number;
  unreachableBlocks: UnreachableBlock[];
  missingReturnPaths: MissingReturnPath[];
  alwaysTrueConditions: AlwaysTrueCondition[];
  infiniteLoopRisks: InfiniteLoopRisk[];
}

export interface UnreachableBlock {
  line: number;
  code: string;
  reason: string;
}

export interface MissingReturnPath {
  path: string;
  line: number;
  suggestion: string;
}

export interface AlwaysTrueCondition {
  line: number;
  code: string;
  reason: string;
}

export interface InfiniteLoopRisk {
  line: number;
  loopType: string;
  reason: string;
}

// ─── Project Loader ───────────────────────────────────────────────────────────

function loadProject(rootPath: string): { project: Project; sourceFiles: SourceFile[] } {
  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular"];
  const files: string[] = [];
  function walk(dir: string) {
    if (files.length > 400) return;
    try {
      for (const e of readdirSync(dir)) {
        if (ignored.includes(e)) continue;
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walk(full);
        else if (extname(full) === ".ts" && !full.endsWith(".spec.ts") && !full.endsWith(".d.ts"))
          files.push(full);
      }
    } catch {}
  }
  walk(rootPath);
  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of files) { try { project.addSourceFileAtPath(f); } catch {} }
  return { project, sourceFiles: project.getSourceFiles() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MAINTAINABILITY INDEX + LCOM
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeMaintainability(rootPath: string): MaintainabilityReport[] {
  const { sourceFiles } = loadProject(rootPath);
  const reports: MaintainabilityReport[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      const className = cls.getName() ?? "(anonymous)";
      const classLcom = computeClassLcom(cls);

      for (const method of cls.getMethods()) {
        const methodName = method.getName();
        const body = method.getBody();
        if (!body) continue;

        const loc = method.getEndLineNumber() - method.getStartLineNumber();
        if (loc < 2) continue;

        const cc = computeCyclomaticComplexity(method);
        const hv = computeHalsteadVolume(method);
        const mi = computeMaintainabilityIndex(cc, hv, loc);
        const grade = miGrade(mi);

        reports.push({
          file: relFile,
          className,
          methodName,
          line: method.getStartLineNumber(),
          maintainabilityIndex: mi,
          grade,
          components: { cyclomaticComplexity: cc, halsteadVolume: hv, linesOfCode: loc },
          lcom: classLcom,
          interpretation: interpretMI(mi, classLcom),
        });
      }
    }
  }

  return reports.sort((a, b) => a.maintainabilityIndex - b.maintainabilityIndex);
}

function computeCyclomaticComplexity(method: MethodDeclaration): number {
  let cc = 1;
  method.forEachDescendant((n) => {
    switch (n.getKind()) {
      case SyntaxKind.IfStatement:
      case SyntaxKind.ConditionalExpression:
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
      case SyntaxKind.CaseClause:
      case SyntaxKind.CatchClause:
      case SyntaxKind.AmpersandAmpersandToken:
      case SyntaxKind.BarBarToken:
      case SyntaxKind.QuestionQuestionToken:
        cc++; break;
    }
  });
  return cc;
}

function computeHalsteadVolume(method: MethodDeclaration): number {
  // Operators: keywords, binary/unary operators, punctuation
  // Operands: identifiers, literals
  const operators = new Set<string>();
  const operands = new Set<string>();
  let totalOperators = 0;
  let totalOperands = 0;

  method.forEachDescendant((n) => {
    const kind = n.getKind();
    const text = n.getText();

    // Operators
    if ([
      SyntaxKind.PlusToken, SyntaxKind.MinusToken, SyntaxKind.AsteriskToken,
      SyntaxKind.SlashToken, SyntaxKind.EqualsToken, SyntaxKind.EqualsEqualsToken,
      SyntaxKind.EqualsEqualsEqualsToken, SyntaxKind.AmpersandAmpersandToken,
      SyntaxKind.BarBarToken, SyntaxKind.ExclamationToken, SyntaxKind.QuestionToken,
      SyntaxKind.IfKeyword, SyntaxKind.ForKeyword, SyntaxKind.WhileKeyword,
      SyntaxKind.ReturnKeyword, SyntaxKind.NewKeyword, SyntaxKind.ThrowKeyword,
    ].includes(kind)) {
      operators.add(text); totalOperators++;
    }
    // Operands
    if ([SyntaxKind.Identifier, SyntaxKind.NumericLiteral, SyntaxKind.StringLiteral,
         SyntaxKind.TrueKeyword, SyntaxKind.FalseKeyword, SyntaxKind.NullKeyword].includes(kind)) {
      operands.add(text); totalOperands++;
    }
  });

  const n1 = operators.size;   // distinct operators
  const n2 = operands.size;    // distinct operands
  const N1 = totalOperators;
  const N2 = totalOperands;
  const vocabulary = n1 + n2;
  const length = N1 + N2;
  if (vocabulary === 0 || length === 0) return 0;
  return Math.round(length * Math.log2(vocabulary));
}

function computeMaintainabilityIndex(cc: number, hv: number, loc: number): number {
  // Microsoft's formula: MI = max(0, (171 - 5.2*ln(HV) - 0.23*CC - 16.2*ln(LOC)) * 100/171)
  if (hv <= 0 || loc <= 0) return 100;
  const raw = 171 - 5.2 * Math.log(hv) - 0.23 * cc - 16.2 * Math.log(loc);
  return Math.round(Math.max(0, Math.min(100, raw * 100 / 171)));
}

function miGrade(mi: number): "A" | "B" | "C" | "D" | "F" {
  if (mi >= 80) return "A";
  if (mi >= 65) return "B";
  if (mi >= 50) return "C";
  if (mi >= 30) return "D";
  return "F";
}

function interpretMI(mi: number, lcom: number): string {
  const miText = mi >= 80 ? "✅ Highly maintainable"
    : mi >= 65 ? "🟢 Good maintainability"
    : mi >= 50 ? "🟡 Moderate — consider refactoring"
    : mi >= 30 ? "🟠 Low maintainability — refactor soon"
    : "🔴 Very hard to maintain — refactor now";

  const lcomText = lcom >= 0.7 ? " | 🔴 Very low class cohesion"
    : lcom >= 0.5 ? " | 🟠 Low class cohesion"
    : lcom >= 0.3 ? " | 🟡 Moderate cohesion"
    : " | ✅ Good cohesion";

  return miText + lcomText;
}

function computeClassLcom(cls: ClassDeclaration): number {
  const methods = cls.getMethods();
  const n = methods.length;
  if (n < 2) return 0;

  const fieldNames = new Set(cls.getProperties().map((p) => p.getName()));
  const methodFields = new Map<string, Set<string>>();

  for (const m of methods) {
    const used = new Set<string>();
    m.forEachDescendant((node) => {
      if (Node.isPropertyAccessExpression(node) &&
          node.getExpression().getKind() === SyntaxKind.ThisKeyword) {
        const name = node.getName();
        if (fieldNames.has(name)) used.add(name);
      }
    });
    methodFields.set(m.getName(), used);
  }

  let shared = 0; let total = 0;
  const names = methods.map((m) => m.getName());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      total++;
      const a = methodFields.get(names[i]) ?? new Set();
      const b = methodFields.get(names[j]) ?? new Set();
      if ([...a].some((f) => b.has(f))) shared++;
    }
  }
  return total > 0 ? Math.round((1 - shared / total) * 100) / 100 : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TYPE GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeTypeGraph(rootPath: string): TypeGraphReport {
  const { sourceFiles } = loadProject(rootPath);
  const nodes: TypeNode[] = [];
  const edges: TypeEdge[] = [];
  const nodeIds = new Map<string, string>(); // name → id

  function getId(name: string): string {
    if (!nodeIds.has(name)) nodeIds.set(name, `n${nodeIds.size}`);
    return nodeIds.get(name)!;
  }
  function addEdge(from: string, to: string, relation: TypeEdge["relation"], file: string, line: number) {
    if (from && to && from !== to) edges.push({ from: getId(from), to: getId(to), relation, file, line });
  }

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    // ── Classes ────────────────────────────────────────────────────────────────
    for (const cls of sf.getClasses()) {
      const name = cls.getName() ?? "";
      if (!name) continue;
      const decorators = cls.getDecorators().map((d) => d.getName());
      const kind = decorators.includes("Component") ? "component"
        : decorators.includes("Injectable") ? "service"
        : decorators.includes("Pipe") ? "pipe"
        : decorators.includes("Directive") ? "directive"
        : "class";

      nodes.push({
        id: getId(name), name, kind, file: relFile,
        line: cls.getStartLineNumber(), isExported: cls.isExported(),
        genericParams: cls.getTypeParameters().map((tp) => tp.getName()),
      });

      // extends
      const base = cls.getExtends();
      if (base) addEdge(name, base.getExpression().getText(), "extends", relFile, cls.getStartLineNumber());

      // implements
      for (const impl of cls.getImplements())
        addEdge(name, impl.getExpression().getText(), "implements", relFile, cls.getStartLineNumber());

      // inject() deps → injects edges
      for (const prop of cls.getProperties()) {
        const init = prop.getInitializer();
        if (init && Node.isCallExpression(init) && init.getExpression().getText() === "inject") {
          const dep = init.getArguments()[0]?.getText().replace(/<.*>/, "");
          if (dep) addEdge(name, dep, "injects", relFile, prop.getStartLineNumber());
        }
        // Constructor deps
        const typeNode = prop.getTypeNode();
        if (typeNode) {
          const typeName = typeNode.getText().replace(/<.*>/, "").replace(/\[\]/, "").replace(/\?/, "");
          if (typeName && /^[A-Z]/.test(typeName)) addEdge(name, typeName, "uses", relFile, prop.getStartLineNumber());
        }
      }

      // Constructor injection
      for (const ctor of cls.getConstructors()) {
        for (const param of ctor.getParameters()) {
          const t = param.getTypeNode()?.getText().replace(/<.*>/, "") ?? "";
          if (t && /^[A-Z]/.test(t)) addEdge(name, t, "injects", relFile, ctor.getStartLineNumber());
        }
      }

      // Method return types + parameter types
      for (const method of cls.getMethods()) {
        const ret = method.getReturnTypeNode()?.getText() ?? "";
        const cleanRet = ret.replace(/Promise<|Observable<|Array<|Task<|\[\]|>|\?/g, "").trim();
        if (cleanRet && /^[A-Z]/.test(cleanRet)) addEdge(name, cleanRet, "returns", relFile, method.getStartLineNumber());

        for (const param of method.getParameters()) {
          const pt = param.getTypeNode()?.getText() ?? "";
          const cleanPt = pt.replace(/<.*>|\[\]|\?/g, "");
          if (cleanPt && /^[A-Z]/.test(cleanPt)) addEdge(name, cleanPt, "parameter", relFile, method.getStartLineNumber());
        }
      }

      // Generic type usage in class body
      for (const tp of cls.getTypeParameters()) {
        const constraint = tp.getConstraint();
        if (constraint) {
          const t = constraint.getText().replace(/<.*>/, "");
          if (/^[A-Z]/.test(t)) addEdge(name, t, "generic", relFile, cls.getStartLineNumber());
        }
      }
    }

    // ── Interfaces ─────────────────────────────────────────────────────────────
    for (const iface of sf.getInterfaces()) {
      const name = iface.getName();
      nodes.push({
        id: getId(name), name, kind: "interface", file: relFile,
        line: iface.getStartLineNumber(), isExported: iface.isExported(),
        genericParams: iface.getTypeParameters().map((tp) => tp.getName()),
      });
      for (const ext of iface.getExtends())
        addEdge(name, ext.getExpression().getText(), "extends", relFile, iface.getStartLineNumber());
    }

    // ── Enums ──────────────────────────────────────────────────────────────────
    for (const en of sf.getEnums()) {
      const name = en.getName();
      nodes.push({ id: getId(name), name, kind: "enum", file: relFile, line: en.getStartLineNumber(), isExported: en.isExported(), genericParams: [] });
    }

    // ── Type Aliases ───────────────────────────────────────────────────────────
    for (const ta of sf.getTypeAliases()) {
      const name = ta.getName();
      nodes.push({ id: getId(name), name, kind: "type", file: relFile, line: ta.getStartLineNumber(), isExported: ta.isExported(), genericParams: [] });
    }
  }

  // ── Angular-specific relations ────────────────────────────────────────────
  const angularSpecific = extractAngularRelations(sourceFiles, rootPath);

  // ── Cycles ────────────────────────────────────────────────────────────────
  const cycles = detectCycles(nodes, edges);

  // ── Orphan types ──────────────────────────────────────────────────────────
  const referenced = new Set(edges.flatMap((e) => [e.from, e.to]));
  const orphanTypes = nodes
    .filter((n) => !referenced.has(n.id) && n.kind !== "enum" && n.isExported)
    .map((n) => n.name);

  // ── Most connected ────────────────────────────────────────────────────────
  const connectionCount = new Map<string, number>();
  for (const e of edges) {
    connectionCount.set(e.to, (connectionCount.get(e.to) ?? 0) + 1);
  }
  const mostConnected = [...connectionCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, connections]) => ({ name: nodes.find((n) => n.id === id)?.name ?? id, connections }));

  return { nodes, edges, cycles, orphanTypes, mostConnected, angularSpecific };
}

function extractAngularRelations(sourceFiles: SourceFile[], rootPath: string): AngularTypeRelations {
  const componentToService: { component: string; service: string }[] = [];
  const serviceToRepository: { service: string; repository: string }[] = [];
  const inputOutputTypes: { component: string; inputName: string; type: string }[] = [];
  const routeToComponent: { path: string; component: string }[] = [];

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      const name = cls.getName() ?? "";
      const decorators = cls.getDecorators().map((d) => d.getName());
      const isComponent = decorators.includes("Component");
      const isService = decorators.includes("Injectable");

      const deps = [
        ...cls.getConstructors().flatMap((c) => c.getParameters().map((p) => ({ name: p.getName(), type: p.getTypeNode()?.getText() ?? "" }))),
        ...cls.getProperties()
          .filter((p) => { const init = p.getInitializer(); return init && Node.isCallExpression(init) && init.getExpression().getText() === "inject"; })
          .map((p) => { const init = p.getInitializer() as any; return { name: p.getName(), type: init.getArguments()[0]?.getText() ?? "" }; }),
      ];

      if (isComponent) {
        for (const dep of deps) {
          if (dep.type.endsWith("Service") || dep.type.endsWith("Facade"))
            componentToService.push({ component: name, service: dep.type });
        }

        // input() / @Input() types
        for (const prop of cls.getProperties()) {
          const init = prop.getInitializer();
          if (init && Node.isCallExpression(init)) {
            const expr = init.getExpression().getText();
            if (expr === "input" || expr === "input.required") {
              const typeArg = init.getTypeArguments()[0]?.getText() ?? prop.getTypeNode()?.getText() ?? "unknown";
              inputOutputTypes.push({ component: name, inputName: prop.getName(), type: typeArg });
            }
          } else if (prop.getDecorators().some((d) => d.getName() === "Input")) {
            inputOutputTypes.push({ component: name, inputName: prop.getName(), type: prop.getTypeNode()?.getText() ?? "unknown" });
          }
        }
      }

      if (isService) {
        for (const dep of deps) {
          if (dep.type.endsWith("Repository") || dep.type.endsWith("Repo") || dep.type.endsWith("Store"))
            serviceToRepository.push({ service: name, repository: dep.type });
        }
      }
    }

    // Routes
    const text = sf.getFullText();
    if (text.includes("Routes") || text.includes("provideRouter")) {
      const routeMatches = [...text.matchAll(/path:\s*['"`]([^'"`]*)['"`][^}]*component:\s*(\w+)/gs)];
      for (const m of routeMatches) routeToComponent.push({ path: m[1], component: m[2] });
    }
  }

  return { componentToService, serviceToRepository, inputOutputTypes, routeToComponent };
}

function detectCycles(nodes: TypeNode[], edges: TypeEdge[]): string[][] {
  const adj = new Map<string, string[]>();
  const idToName = new Map(nodes.map((n) => [n.id, n.name]));

  for (const e of edges.filter((e) => ["extends", "implements", "injects"].includes(e.relation))) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]) {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart).map((id) => idToName.get(id) ?? id));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    for (const next of adj.get(node) ?? []) dfs(next, [...path, node]);
    inStack.delete(node);
  }

  for (const node of adj.keys()) dfs(node, []);
  return cycles.slice(0, 20);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CFG + UNREACHABLE CODE
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeControlFlow(rootPath: string): CfgReport[] {
  const { sourceFiles } = loadProject(rootPath);
  const reports: CfgReport[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());
    const lines = sf.getFullText().split("\n");

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const report = analyzeMethodCFG(method, relFile, lines);
        if (report.unreachableBlocks.length > 0 ||
            report.missingReturnPaths.length > 0 ||
            report.alwaysTrueConditions.length > 0 ||
            report.infiniteLoopRisks.length > 0) {
          reports.push(report);
        }
      }
    }
  }

  return reports;
}

function analyzeMethodCFG(method: MethodDeclaration, file: string, lines: string[]): CfgReport {
  const report: CfgReport = {
    file,
    className: (method.getParent() as ClassDeclaration).getName() ?? "",
    methodName: method.getName(),
    line: method.getStartLineNumber(),
    unreachableBlocks: [],
    missingReturnPaths: [],
    alwaysTrueConditions: [],
    infiniteLoopRisks: [],
  };

  const body = method.getBody();
  if (!body) return report;

  const stmts = Node.isBlock(body) ? body.getStatements() : [];

  // ── 1. Unreachable code after return/throw ─────────────────────────────────
  for (let i = 0; i < stmts.length - 1; i++) {
    const stmt = stmts[i];
    const isTerminator = Node.isReturnStatement(stmt) || Node.isThrowStatement(stmt) || Node.isBreakStatement(stmt) || Node.isContinueStatement(stmt);
    if (isTerminator) {
      const next = stmts[i + 1];
      const line = next.getStartLineNumber();
      report.unreachableBlocks.push({
        line,
        code: lines[line - 1]?.trim() ?? "",
        reason: `Unreachable — preceded by ${Node.isReturnStatement(stmt) ? "return" : Node.isThrowStatement(stmt) ? "throw" : "break/continue"} statement`,
      });
    }
  }

  // ── 2. Always-true conditions ──────────────────────────────────────────────
  method.forEachDescendant((node) => {
    if (Node.isIfStatement(node)) {
      const cond = node.getExpression();

      // true / false literals
      if (cond.getKind() === SyntaxKind.TrueKeyword) {
        report.alwaysTrueConditions.push({ line: node.getStartLineNumber(), code: cond.getText(), reason: "Condition is always true (literal true)" });
      }
      if (cond.getKind() === SyntaxKind.FalseKeyword) {
        report.alwaysTrueConditions.push({ line: node.getStartLineNumber(), code: cond.getText(), reason: "Condition is always false (literal false) — else branch unreachable" });
      }

      // x === x
      if (Node.isBinaryExpression(cond)) {
        const op = cond.getOperatorToken().getText();
        if ((op === "===" || op === "==") && cond.getLeft().getText() === cond.getRight().getText()) {
          report.alwaysTrueConditions.push({ line: node.getStartLineNumber(), code: cond.getText(), reason: `Comparing identical expressions: "${cond.getLeft().getText()}" === "${cond.getRight().getText()}"` });
        }
        // typeof x === "string" where x is string literal
        if (op === "===" && cond.getLeft().getText().startsWith("typeof")) {
          const rightText = cond.getRight().getText();
          if (rightText === '"undefined"') {
            report.alwaysTrueConditions.push({ line: node.getStartLineNumber(), code: cond.getText(), reason: "typeof check — verify this is actually necessary given TypeScript strict nullability" });
          }
        }
      }
    }
  });

  // ── 3. Missing return paths ────────────────────────────────────────────────
  const retType = method.getReturnTypeNode()?.getText() ?? "";
  const isVoid = retType === "void" || retType === "" || retType === "Promise<void>";
  const isAsync = method.isAsync();

  if (!isVoid) {
    // Check if all if-else branches have return
    method.forEachDescendant((node) => {
      if (Node.isIfStatement(node) && !node.getElseStatement()) {
        // If without else in non-void method — potential missing return path
        const ifBody = node.getThenStatement();
        const hasReturn = ifBody.getDescendantsOfKind(SyntaxKind.ReturnStatement).length > 0;
        if (hasReturn) {
          // The else path falls through — check if method ends with return
          const lastStmt = stmts[stmts.length - 1];
          const lastIsReturn = lastStmt && Node.isReturnStatement(lastStmt);
          if (!lastIsReturn) {
            report.missingReturnPaths.push({
              path: `if (${node.getExpression().getText().slice(0, 40)}) → else`,
              line: node.getStartLineNumber(),
              suggestion: "Add explicit return or throw in the else/fallthrough path",
            });
          }
        }
      }
    });
  }

  // ── 4. Infinite loop risks ────────────────────────────────────────────────
  method.forEachDescendant((node) => {
    // while(true) without break
    if (Node.isWhileStatement(node)) {
      const cond = node.getExpression();
      if (cond.getKind() === SyntaxKind.TrueKeyword) {
        const hasBreak = node.getStatement().getDescendantsOfKind(SyntaxKind.BreakStatement).length > 0;
        if (!hasBreak) {
          report.infiniteLoopRisks.push({
            line: node.getStartLineNumber(),
            loopType: "while(true)",
            reason: "while(true) loop with no break statement — potential infinite loop",
          });
        }
      }
    }

    // for loop with no increment modification
    if (Node.isForStatement(node)) {
      const incrementor = node.getIncrementor();
      if (!incrementor) {
        report.infiniteLoopRisks.push({
          line: node.getStartLineNumber(),
          loopType: "for",
          reason: "for loop with no incrementor — counter never changes",
        });
      }
    }

    // forEach / subscribe inside subscribe (nested subscription)
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isPropertyAccessExpression(expr) && expr.getName() === "subscribe") {
        node.forEachDescendant((inner) => {
          if (Node.isCallExpression(inner)) {
            const innerExpr = inner.getExpression();
            if (Node.isPropertyAccessExpression(innerExpr) && innerExpr.getName() === "subscribe") {
              report.infiniteLoopRisks.push({
                line: inner.getStartLineNumber(),
                loopType: "nested subscribe",
                reason: "subscribe() inside subscribe() — memory leak risk, use switchMap/mergeMap instead",
              });
            }
          }
        });
      }
    }
  });

  return report;
}

// ─── Combined Entry Point ─────────────────────────────────────────────────────

export function runFullCodeIntelligence(rootPath: string): TsCodeIntelligenceReport {
  return {
    projectRoot: rootPath,
    generatedAt: new Date().toISOString(),
    maintainabilityIndex: analyzeMaintainability(rootPath),
    typeGraph: analyzeTypeGraph(rootPath),
    controlFlowReport: analyzeControlFlow(rootPath),
  };
}
