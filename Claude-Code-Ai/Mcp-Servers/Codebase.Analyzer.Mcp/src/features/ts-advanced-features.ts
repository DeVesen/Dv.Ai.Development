import {
  Project,
  Node,
  SourceFile,
  ClassDeclaration,
  MethodDeclaration,
  SyntaxKind,
  ts,
} from "ts-morph";
import { readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, extname, relative, dirname, resolve } from "path";
import { UntestedApiFinding } from "./untested-api-types.js";
import { SymbolReference } from "./symbol-reference-types.js";
import { GodClassScanResult, filterAndRank, toGodClassCandidate } from "./god-class-types.js";
import { computeClassMetrics } from "./ts-class-split.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TsAdvancedAnalysis {
  projectRoot: string;
  generatedAt: string;
  cyclomaticComplexity: ComplexityReport[];
  deadCode: DeadCodeReport[];
  nullabilityIssues: NullabilityIssue[];
  duplicates: DuplicateGroup[];
  refactoringSafety: RefactoringSafetyReport[];
  autoFixes: AutoFix[];
  crossFileDataflow: DataflowIssue[];
}

export interface ComplexityReport {
  file: string;
  className: string;
  methodName: string;
  line: number;
  complexity: number;
  severity: "ok" | "warning" | "critical";
  branches: string[];
}

export interface DeadCodeReport {
  file: string;
  name: string;
  kind: "method" | "property" | "class" | "interface" | "enum" | "function";
  line: number;
  visibility: string;
  reason: string;
}

export interface NullabilityIssue {
  file: string;
  line: number;
  code: string;
  issue: string;
  severity: "critical" | "warning";
  fix: string;
}

export interface DuplicateGroup {
  similarity: number;
  instances: {
    file: string;
    className: string;
    methodName: string;
    line: number;
    normalizedHash: string;
  }[];
  suggestion: string;
}

export interface RefactoringSafetyReport {
  file: string;
  className: string;
  memberName: string;
  line: number;
  usageCount: number;
  usages: { file: string; line: number; context: string }[];
  safeToRename: boolean;
  risks: string[];
}

export interface AutoFix {
  file: string;
  line: number;
  category:
    | "signal-input"
    | "signal-output"
    | "control-flow"
    | "inject-fn"
    | "onpush"
    | "standalone"
    | "async-pipe"
    | "unused-import";
  description: string;
  before: string;
  after: string;
  automated: boolean;
}

export interface DataflowIssue {
  file: string;
  line: number;
  fromClass: string;
  fromMethod: string;
  toClass: string;
  toMethod: string;
  issue: string;
  severity: "critical" | "warning";
  dataPath: string;
}

// ─── Project Loader ───────────────────────────────────────────────────────────

// Hard file cap shared by loadProject and findSymbolReferences so every scan
// path truncates at the same boundary and can surface a cap-reached warning.
const PROJECT_FILE_CAP = 400;

function loadProject(rootPath: string): { project: Project; sourceFiles: SourceFile[]; capReached: boolean } {
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
    } catch {}
  }
  walk(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of files) { try { project.addSourceFileAtPath(f); } catch {} }
  return { project, sourceFiles: project.getSourceFiles(), capReached };
}

// ─── 1. Cyclomatic Complexity ─────────────────────────────────────────────────

export function analyzeCyclomaticComplexity(rootPath: string): ComplexityReport[] {
  const { sourceFiles } = loadProject(rootPath);
  const reports: ComplexityReport[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const result = computeComplexity(method);
        const severity = result.complexity >= 15 ? "critical" : result.complexity >= 10 ? "warning" : "ok";
        if (severity !== "ok") {
          reports.push({
            file: relFile,
            className: cls.getName() ?? "(anonymous)",
            methodName: method.getName(),
            line: method.getStartLineNumber(),
            complexity: result.complexity,
            severity,
            branches: result.branches,
          });
        }
      }
    }

    // Also check standalone functions
    for (const fn of sf.getFunctions()) {
      const result = computeComplexityFromNode(fn);
      const severity = result.complexity >= 15 ? "critical" : result.complexity >= 10 ? "warning" : "ok";
      if (severity !== "ok") {
        reports.push({
          file: relFile,
          className: "(module)",
          methodName: fn.getName() ?? "(anonymous)",
          line: fn.getStartLineNumber(),
          complexity: result.complexity,
          severity,
          branches: result.branches,
        });
      }
    }
  }

  return reports.sort((a, b) => b.complexity - a.complexity);
}

function computeComplexity(method: MethodDeclaration): { complexity: number; branches: string[] } {
  return computeComplexityFromNode(method);
}

function computeComplexityFromNode(node: Node): { complexity: number; branches: string[] } {
  let complexity = 1; // base
  const branches: string[] = [];

  node.forEachDescendant((child) => {
    const kind = child.getKind();
    switch (kind) {
      case SyntaxKind.IfStatement:        complexity++; branches.push("if"); break;
      case SyntaxKind.ConditionalExpression: complexity++; branches.push("ternary"); break;
      case SyntaxKind.ForStatement:       complexity++; branches.push("for"); break;
      case SyntaxKind.ForInStatement:     complexity++; branches.push("for-in"); break;
      case SyntaxKind.ForOfStatement:     complexity++; branches.push("for-of"); break;
      case SyntaxKind.WhileStatement:     complexity++; branches.push("while"); break;
      case SyntaxKind.DoStatement:        complexity++; branches.push("do-while"); break;
      case SyntaxKind.CaseClause:         complexity++; branches.push("case"); break;
      case SyntaxKind.CatchClause:        complexity++; branches.push("catch"); break;
      case SyntaxKind.AmpersandAmpersandToken: complexity++; branches.push("&&"); break;
      case SyntaxKind.BarBarToken:        complexity++; branches.push("||"); break;
      case SyntaxKind.QuestionQuestionToken:   complexity++; branches.push("??"); break;
    }
  });

  // Deduplicate branch labels for summary
  const counts: Record<string, number> = {};
  branches.forEach((b) => { counts[b] = (counts[b] ?? 0) + 1; });
  const summary = Object.entries(counts).map(([k, v]) => v > 1 ? `${k}×${v}` : k);

  return { complexity, branches: summary };
}

// ─── 2. Dead Code Detection ───────────────────────────────────────────────────

export function analyzeDeadCode(rootPath: string): DeadCodeReport[] {
  const { project, sourceFiles } = loadProject(rootPath);
  const reports: DeadCodeReport[] = [];

  // Build a global reference map: symbolName → used-anywhere
  const referencedNames = new Set<string>();

  for (const sf of sourceFiles) {
    // Collect all identifiers used in expressions (not declarations)
    sf.forEachDescendant((node) => {
      if (Node.isIdentifier(node)) {
        const parent = node.getParent();
        // Skip declaration names
        if (parent && (
          Node.isClassDeclaration(parent) ||
          Node.isMethodDeclaration(parent) ||
          Node.isPropertyDeclaration(parent) ||
          Node.isFunctionDeclaration(parent) ||
          Node.isInterfaceDeclaration(parent) ||
          Node.isEnumDeclaration(parent)
        ) && (parent as any).getNameNode?.() === node) return;

        referencedNames.add(node.getText());
      }
    });
  }

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      const clsName = cls.getName() ?? "";
      const isAngularClass = cls.getDecorators().some((d) =>
        ["Component", "Injectable", "Pipe", "Directive", "NgModule"].includes(d.getName())
      );

      // Private methods never referenced outside class
      for (const method of cls.getMethods()) {
        const scope = method.getScope();
        if (scope === "private" || scope === undefined) {
          const name = method.getName();
          const isLifecycle = ["ngOnInit","ngOnDestroy","ngAfterViewInit","ngOnChanges","ngDoCheck","constructor"].includes(name);
          if (isLifecycle) continue;

          // Check if called within the class body
          let calledInternally = false;
          cls.forEachDescendant((n) => {
            if (Node.isCallExpression(n)) {
              const expr = n.getExpression();
              if (Node.isPropertyAccessExpression(expr)) {
                if (expr.getExpression().getText() === "this" && expr.getName() === name)
                  calledInternally = true;
              }
            }
          });

          if (!calledInternally) {
            reports.push({
              file: relFile,
              name: `${clsName}.${name}`,
              kind: "method",
              line: method.getStartLineNumber(),
              visibility: "private",
              reason: "Private method never called within the class",
            });
          }
        }
      }

      // Private properties never read
      for (const prop of cls.getProperties()) {
        const scope = prop.getScope();
        if (scope !== "private") continue;
        const name = prop.getName();
        let readInternally = false;
        cls.forEachDescendant((n) => {
          if (Node.isPropertyAccessExpression(n)) {
            if (n.getExpression().getText() === "this" && n.getName() === name)
              readInternally = true;
          }
        });
        if (!readInternally) {
          reports.push({
            file: relFile,
            name: `${clsName}.${name}`,
            kind: "property",
            line: prop.getStartLineNumber(),
            visibility: "private",
            reason: "Private property never accessed within the class",
          });
        }
      }
    }

    // Exported functions/classes never referenced in project
    for (const fn of sf.getFunctions()) {
      if (!fn.isExported()) continue;
      const name = fn.getName();
      if (!name) continue;
      // Count references across all files (excluding the declaration itself)
      let refCount = 0;
      for (const other of sourceFiles) {
        if (other === sf) continue;
        other.forEachDescendant((n) => { if (Node.isIdentifier(n) && n.getText() === name) refCount++; });
      }
      if (refCount === 0) {
        reports.push({
          file: relFile,
          name,
          kind: "function",
          line: fn.getStartLineNumber(),
          visibility: "exported",
          reason: "Exported function never imported/used in rest of project",
        });
      }
    }

    // Interfaces never implemented or used as type
    for (const iface of sf.getInterfaces()) {
      if (!iface.isExported()) continue;
      const name = iface.getName();
      let refCount = 0;
      for (const other of sourceFiles) {
        if (other === sf) continue;
        other.forEachDescendant((n) => { if (Node.isIdentifier(n) && n.getText() === name) refCount++; });
      }
      if (refCount === 0) {
        reports.push({
          file: relFile,
          name,
          kind: "interface",
          line: iface.getStartLineNumber(),
          visibility: "exported",
          reason: "Interface never used as type or implemented anywhere in project",
        });
      }
    }

    // Unused imports
    for (const imp of sf.getImportDeclarations()) {
      for (const named of imp.getNamedImports()) {
        const name = named.getName();
        let usedInFile = false;
        sf.forEachDescendant((n) => {
          if (Node.isIdentifier(n) && n.getText() === name && n !== named.getNameNode())
            usedInFile = true;
        });
        if (!usedInFile) {
          reports.push({
            file: relFile,
            name: `import { ${name} } from '${imp.getModuleSpecifierValue()}'`,
            kind: "function",
            line: imp.getStartLineNumber(),
            visibility: "import",
            reason: "Unused import — can be removed",
          });
        }
      }
    }
  }

  return reports;
}

// ─── 3. Nullability / Type Flow Analysis ─────────────────────────────────────

export function analyzeNullability(rootPath: string): NullabilityIssue[] {
  const { sourceFiles } = loadProject(rootPath);
  const issues: NullabilityIssue[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());
    const text = sf.getFullText();
    const lines = text.split("\n");

    sf.forEachDescendant((node) => {
      // 1. Property access on potentially null/undefined value without optional chain
      if (Node.isPropertyAccessExpression(node)) {
        const obj = node.getExpression();
        const objText = obj.getText();

        // Check if the object is the result of a method that could return null
        if (Node.isCallExpression(obj)) {
          const callText = obj.getText();
          if (
            callText.includes("find(") ||
            callText.includes("querySelector") ||
            callText.includes("getElementById") ||
            callText.includes("get(") ||
            callText.includes("firstOrDefault")
          ) {
            const line = node.getStartLineNumber();
            const lineText = lines[line - 1]?.trim() ?? "";
            if (!lineText.includes("?.") && !lineText.includes("!.") && !lineText.includes("=== null") && !lineText.includes("if (")) {
              issues.push({
                file: relFile,
                line,
                code: lineText,
                issue: `"${callText}" may return null/undefined — accessing property without null-check`,
                severity: "warning",
                fix: `Use optional chaining: ${callText}?.${node.getName()} or add null-check before access`,
              });
            }
          }
        }
      }

      // 2. Non-null assertion operator (!) — risky
      if (node.getKind() === SyntaxKind.NonNullExpression) {
        const line = node.getStartLineNumber();
        const lineText = lines[line - 1]?.trim() ?? "";
        issues.push({
          file: relFile,
          line,
          code: lineText,
          issue: `Non-null assertion (!) used — runtime crash if value is actually null`,
          severity: "warning",
          fix: "Replace with proper null-check or optional chaining (?.) instead of (!.)",
        });
      }

      // 3. Implicit any via missing type annotations on signals
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression().getText();
        if (expr === "signal" || expr === "computed") {
          const typeArgs = node.getTypeArguments();
          if (typeArgs.length === 0) {
            const args = node.getArguments();
            if (args.length > 0 && args[0].getText() === "null" || args[0]?.getText() === "undefined") {
              const line = node.getStartLineNumber();
              issues.push({
                file: relFile,
                line,
                code: lines[line - 1]?.trim() ?? "",
                issue: `signal(null) without type parameter — TypeScript infers signal<null> instead of signal<YourType | null>`,
                severity: "warning",
                fix: `Provide explicit type: signal<UserDto | null>(null)`,
              });
            }
          }
        }
      }

      // 4. Array access without bounds check
      if (Node.isElementAccessExpression(node)) {
        const arg = node.getArgumentExpression();
        if (arg && Node.isNumericLiteral(arg) && arg.getText() === "0") {
          const parent = node.getParent();
          if (parent && !Node.isIfStatement(parent)) {
            const obj = node.getExpression();
            if (Node.isCallExpression(obj) && (obj.getText().includes("filter(") || obj.getText().includes("map("))) {
              const line = node.getStartLineNumber();
              issues.push({
                file: relFile,
                line,
                code: lines[line - 1]?.trim() ?? "",
                issue: "Array[0] access on filtered result without length check — may be undefined",
                severity: "warning",
                fix: "Use .at(0) ?? defaultValue or check .length > 0 first",
              });
            }
          }
        }
      }

      // 5. subscribe() without error handler
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isPropertyAccessExpression(expr) && expr.getName() === "subscribe") {
          const args = node.getArguments();
          // subscribe({next, error}) vs subscribe(fn) — check for missing error handler
          if (args.length === 1 && !Node.isObjectLiteralExpression(args[0])) {
            const line = node.getStartLineNumber();
            issues.push({
              file: relFile,
              line,
              code: lines[line - 1]?.trim() ?? "",
              issue: "subscribe() without error handler — unhandled errors will be swallowed",
              severity: "warning",
              fix: "Use subscribe({ next: ..., error: (err) => console.error(err) }) or catchError()",
            });
          }
        }
      }
    });
  }

  return issues;
}

// ─── 4. Structural Duplicate Detection ───────────────────────────────────────

export function analyzeDuplicates(rootPath: string): DuplicateGroup[] {
  const { sourceFiles } = loadProject(rootPath);

  interface MethodSignature {
    file: string;
    className: string;
    methodName: string;
    line: number;
    normalizedHash: string;
    bodyLength: number;
  }

  const signatures: MethodSignature[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const body = method.getBody();
        if (!body) continue;
        const bodyLength = method.getEndLineNumber() - method.getStartLineNumber();
        if (bodyLength < 4) continue; // skip trivial methods

        // Normalize: remove variable names, string literals, keep structure
        const normalized = normalizeMethodBody(body.getText());
        signatures.push({
          file: relFile,
          className: cls.getName() ?? "",
          methodName: method.getName(),
          line: method.getStartLineNumber(),
          normalizedHash: normalized,
          bodyLength,
        });
      }
    }
  }

  // Group by normalized hash
  const groups = new Map<string, MethodSignature[]>();
  for (const sig of signatures) {
    const existing = groups.get(sig.normalizedHash) ?? [];
    existing.push(sig);
    groups.set(sig.normalizedHash, existing);
  }

  const duplicateGroups: DuplicateGroup[] = [];
  for (const [hash, members] of groups) {
    if (members.length < 2) continue;
    duplicateGroups.push({
      similarity: 95,
      instances: members.map((m) => ({
        file: m.file,
        className: m.className,
        methodName: m.methodName,
        line: m.line,
        normalizedHash: hash.slice(0, 40),
      })),
      suggestion: `Extract to shared utility/base class. Methods: ${members.map((m) => `${m.className}.${m.methodName}`).join(", ")}`,
    });
  }

  return duplicateGroups.sort((a, b) => b.instances.length - a.instances.length);
}

function normalizeMethodBody(body: string): string {
  return body
    .replace(/\/\/[^\n]*/g, "")           // remove comments
    .replace(/["'`][^"'`]*["'`]/g, '"S"') // normalize string literals
    .replace(/\b\d+\b/g, "N")             // normalize numbers
    .replace(/\b[a-z_]\w*/g, "V")         // normalize variable names (lowercase start)
    .replace(/\s+/g, " ")                 // normalize whitespace
    .trim();
}

// ─── 5. Refactoring Safety ────────────────────────────────────────────────────

export function analyzeRefactoringSafety(rootPath: string, targetName?: string): RefactoringSafetyReport[] {
  const { sourceFiles } = loadProject(rootPath);
  const reports: RefactoringSafetyReport[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const name = method.getName();
        if (targetName && !name.includes(targetName)) continue;

        // Only analyze public methods (renaming private is safe within class)
        if (method.getScope() === "private") continue;

        const usages: RefactoringSafetyReport["usages"] = [];

        // Find all references across project
        for (const other of sourceFiles) {
          const otherRel = relative(rootPath, other.getFilePath());
          other.forEachDescendant((node) => {
            if (Node.isIdentifier(node) && node.getText() === name) {
              const parent = node.getParent();
              if (parent && Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) {
                usages.push({
                  file: otherRel,
                  line: node.getStartLineNumber(),
                  context: node.getParent()?.getParent()?.getText().slice(0, 80) ?? "",
                });
              }
            }
          });
        }

        const risks: string[] = [];
        const usageFiles = new Set(usages.map((u) => u.file));

        if (usages.length > 20) risks.push(`High usage count (${usages.length}) — many files would break`);
        if (usageFiles.size > 5) risks.push(`Used across ${usageFiles.size} different files`);

        // Check if used in templates (Angular HTML files)
        const htmlUsages = usages.filter((u) => u.file.endsWith(".html"));
        if (htmlUsages.length > 0) risks.push(`Used in ${htmlUsages.length} template(s) — template binding would break`);

        // Check if part of public API (interface)
        for (const iface of sf.getInterfaces()) {
          if (iface.getMethods().some((m) => m.getName() === name))
            risks.push(`Part of interface "${iface.getName()}" — interface must also be updated`);
        }

        reports.push({
          file: relFile,
          className: cls.getName() ?? "",
          memberName: name,
          line: method.getStartLineNumber(),
          usageCount: usages.length,
          usages: usages.slice(0, 10),
          safeToRename: risks.length === 0,
          risks,
        });
      }
    }
  }

  return reports.sort((a, b) => b.usageCount - a.usageCount);
}

// ─── 6. Auto-Fix Generation ───────────────────────────────────────────────────

export function generateAutoFixes(rootPath: string): AutoFix[] {
  const { sourceFiles } = loadProject(rootPath);
  const fixes: AutoFix[] = [];

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());
    const lines = sf.getFullText().split("\n");

    for (const cls of sf.getClasses()) {
      const isComponent = cls.getDecorators().some((d) => d.getName() === "Component");
      const isInjectable = cls.getDecorators().some((d) => d.getName() === "Injectable");

      // Fix 1: @Input() → input() signal
      for (const prop of cls.getProperties()) {
        if (prop.getDecorators().some((d) => d.getName() === "Input")) {
          const name = prop.getName();
          const typeNode = prop.getTypeNode()?.getText() ?? "unknown";
          const line = prop.getStartLineNumber();
          fixes.push({
            file: relFile,
            line,
            category: "signal-input",
            description: `Migrate @Input() "${name}" to input() signal`,
            before: lines[line - 1]?.trim() ?? "",
            after: `readonly ${name} = input<${typeNode}>();`,
            automated: true,
          });
        }

        // Fix 2: @Output() → output() signal
        if (prop.getDecorators().some((d) => d.getName() === "Output")) {
          const name = prop.getName();
          const line = prop.getStartLineNumber();
          const typeMatch = prop.getType().getText().match(/EventEmitter<([^>]+)>/);
          const innerType = typeMatch?.[1] ?? "void";
          fixes.push({
            file: relFile,
            line,
            category: "signal-output",
            description: `Migrate @Output() "${name}" to output() signal`,
            before: lines[line - 1]?.trim() ?? "",
            after: `readonly ${name} = output<${innerType}>();`,
            automated: true,
          });
        }
      }

      // Fix 3: Constructor injection → inject() function
      for (const ctor of cls.getConstructors()) {
        for (const param of ctor.getParameters()) {
          if (param.getDecorators().length > 0 || param.getTypeNode()) {
            const typeName = param.getTypeNode()?.getText() ?? "";
            const paramName = param.getName();
            const line = ctor.getStartLineNumber();
            if (typeName && !typeName.startsWith("string") && !typeName.startsWith("number") && !typeName.startsWith("boolean")) {
              fixes.push({
                file: relFile,
                line,
                category: "inject-fn",
                description: `Migrate constructor injection of "${typeName}" to inject()`,
                before: `constructor(private ${paramName}: ${typeName})`,
                after: `private readonly ${paramName} = inject(${typeName});`,
                automated: true,
              });
            }
          }
        }
      }

      // Fix 4: Missing OnPush
      if (isComponent) {
        const decorator = cls.getDecorator("Component");
        const argText = decorator?.getArguments()[0]?.getText() ?? "";
        if (!argText.includes("OnPush")) {
          const line = cls.getStartLineNumber();
          fixes.push({
            file: relFile,
            line,
            category: "onpush",
            description: `Add OnPush ChangeDetection to "${cls.getName()}"`,
            before: "@Component({ ... })",
            after: "@Component({ ..., changeDetection: ChangeDetectionStrategy.OnPush })",
            automated: true,
          });
        }
      }
    }

    // Fix 5: *ngIf → @if
    const rawText = sf.getFullText();
    if (rawText.includes("*ngIf=")) {
      const ngIfMatches = [...rawText.matchAll(/\*ngIf="([^"]+)"/g)];
      for (const match of ngIfMatches) {
        const condition = match[1];
        const lineNum = rawText.slice(0, match.index).split("\n").length;
        fixes.push({
          file: relFile,
          line: lineNum,
          category: "control-flow",
          description: `Migrate *ngIf to @if block`,
          before: `*ngIf="${condition}"`,
          after: `@if (${condition}) { ... }`,
          automated: false, // structural change, not automated
        });
      }
    }

    // Fix 6: *ngFor → @for
    if (rawText.includes("*ngFor=")) {
      const ngForMatches = [...rawText.matchAll(/\*ngFor="let (\w+) of ([^"]+)"/g)];
      for (const match of ngForMatches) {
        const item = match[1];
        const list = match[2].trim();
        const lineNum = rawText.slice(0, match.index).split("\n").length;
        fixes.push({
          file: relFile,
          line: lineNum,
          category: "control-flow",
          description: `Migrate *ngFor to @for block`,
          before: `*ngFor="let ${item} of ${list}"`,
          after: `@for (${item} of ${list}; track ${item}.id) { ... }`,
          automated: false,
        });
      }
    }

    // Fix 7: | async pipe → toSignal()
    if (rawText.includes("| async")) {
      const asyncMatches = [...rawText.matchAll(/(\w+\$)\s*\|\s*async/g)];
      for (const match of asyncMatches) {
        const obsName = match[1];
        const lineNum = rawText.slice(0, match.index).split("\n").length;
        fixes.push({
          file: relFile,
          line: lineNum,
          category: "async-pipe",
          description: `Replace "| async" with toSignal() for "${obsName}"`,
          before: `{{ ${obsName} | async }}`,
          after: `// In component: readonly data = toSignal(this.${obsName});\n// In template: {{ data() }}`,
          automated: false,
        });
      }
    }
  }

  return fixes;
}

// ─── 7. Cross-File Dataflow Analysis ─────────────────────────────────────────

export function analyzeCrossFileDataflow(rootPath: string): DataflowIssue[] {
  const { sourceFiles } = loadProject(rootPath);
  const issues: DataflowIssue[] = [];

  // Build a map of method return types per class
  const methodReturnTypes = new Map<string, { returnType: string; file: string; isNullable: boolean }>();

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        const key = `${cls.getName()}.${method.getName()}`;
        const returnType = method.getReturnTypeNode()?.getText() ?? method.getReturnType().getText();
        const isNullable = returnType.includes("| null") || returnType.includes("| undefined") || returnType.includes("?");
        methodReturnTypes.set(key, {
          returnType,
          file: relative(rootPath, sf.getFilePath()),
          isNullable,
        });
      }
    }
  }

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      const injects = new Set<string>();

      // Collect injected services
      cls.getProperties().forEach((prop) => {
        const init = prop.getInitializer();
        if (init && Node.isCallExpression(init) && init.getExpression().getText() === "inject") {
          const arg = init.getArguments()[0]?.getText();
          if (arg) injects.add(arg);
        }
      });
      cls.getConstructors().forEach((ctor) => {
        ctor.getParameters().forEach((p) => {
          const t = p.getTypeNode()?.getText();
          if (t) injects.add(t);
        });
      });

      // Find method calls on injected services
      cls.forEachDescendant((node) => {
        if (!Node.isCallExpression(node)) return;
        const expr = node.getExpression();
        if (!Node.isPropertyAccessExpression(expr)) return;

        const obj = expr.getExpression();
        const methodName = expr.getName();
        const objText = obj.getText().replace("this.", "");

        // Get the type of the object
        let serviceType: string | null = null;
        cls.getProperties().forEach((prop) => {
          if (prop.getName() === objText) {
            const init = prop.getInitializer();
            if (init && Node.isCallExpression(init) && init.getExpression().getText() === "inject") {
              serviceType = init.getArguments()[0]?.getText() ?? null;
            }
          }
        });

        if (!serviceType) return;

        const key = `${serviceType}.${methodName}`;
        const returnInfo = methodReturnTypes.get(key);

        if (returnInfo?.isNullable) {
          // Check if result is used without null guard
          const parent = node.getParent();
          if (parent && Node.isPropertyAccessExpression(parent)) {
            const grandParent = parent.getParent();
            const lineText = parent.getText();
            if (!lineText.includes("?.") && !lineText.includes("??")) {
              issues.push({
                file: relFile,
                line: node.getStartLineNumber(),
                fromClass: serviceType,
                fromMethod: methodName,
                toClass: cls.getName() ?? "",
                toMethod: cls.getMethods().find((m) => {
                  return m.getStartLineNumber() <= node.getStartLineNumber() &&
                         m.getEndLineNumber() >= node.getStartLineNumber();
                })?.getName() ?? "(unknown)",
                issue: `${serviceType}.${methodName}() returns "${returnInfo.returnType}" but result used without null-check`,
                severity: "warning",
                dataPath: `${serviceType}.${methodName}() → ${cls.getName()}.property access`,
              });
            }
          }
        }

        // Detect: Observable returned but not subscribed or piped
        if (returnInfo?.returnType.includes("Observable")) {
          const parent = node.getParent();
          if (parent && !Node.isCallExpression(parent) && !Node.isAwaitExpression(parent)) {
            const parentText = parent.getText();
            if (!parentText.includes(".subscribe") && !parentText.includes(".pipe") && !parentText.includes("toSignal")) {
              issues.push({
                file: relFile,
                line: node.getStartLineNumber(),
                fromClass: serviceType,
                fromMethod: methodName,
                toClass: cls.getName() ?? "",
                toMethod: "(unknown)",
                issue: `${serviceType}.${methodName}() returns Observable but result is not subscribed, piped, or converted with toSignal()`,
                severity: "critical",
                dataPath: `${serviceType}.${methodName}() → unhandled Observable`,
              });
            }
          }
        }
      });
    }
  }

  return issues;
}

// ─── 8. Untested Public API (static coverage proxy, heuristic) ───────────────
// Own spec-aware walk — does NOT reuse loadProject (which filters out .spec.ts).
// findCoverageGaps / analyzeAngularTestQuality stay untouched (reuse by copy).
//
// Known limitations (intentional — heuristic, no type resolution):
//   • Inheritance: members inherited from a base class are NOT attributed to the
//     subclass; only members declared on the class itself are scanned.
//   • Standalone exported functions (no enclosing class) are out of scope — the
//     scan is class-anchored. Both would require full symbol resolution.
//   • ES #private fields/methods carry no scope modifier (getScope() === "public"),
//     so they are excluded explicitly by their leading "#" to avoid false positives.

const UNTESTED_API_FILE_CAP = 400;

// Set by detectUntestedPublicApi; read by the index.ts handler to surface a cap warning.
export const untestedApiScanState: { capReached: boolean } = { capReached: false };

const NG_LIFECYCLE_HOOKS = new Set([
  "ngOnInit", "ngOnDestroy", "ngOnChanges", "ngDoCheck",
  "ngAfterContentInit", "ngAfterContentChecked",
  "ngAfterViewInit", "ngAfterViewChecked", "constructor",
]);

export function detectUntestedPublicApi(path: string, depth: "file" | "project"): UntestedApiFinding[] {
  untestedApiScanState.capReached = false;
  const findings: UntestedApiFinding[] = [];

  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular"];
  const isSpec = (f: string) => f.endsWith(".spec.ts") || f.endsWith(".test.ts");

  const sourceFiles: string[] = [];
  const testFiles: string[] = [];

  if (depth === "file") {
    if (isSpec(path) || path.endsWith(".d.ts") || extname(path) !== ".ts") return findings;
    sourceFiles.push(path);
    // Spec-conform: consider spec files in the SAME or any PARENT directory; the
    // import gate below decides which of them actually exercise a given class.
    for (const cand of specCandidatesUpward(path)) testFiles.push(cand);
  } else {
    const walk = (dir: string) => {
      try {
        for (const entry of readdirSync(dir)) {
          if (ignored.includes(entry)) continue;
          const full = join(dir, entry);
          if (statSync(full).isDirectory()) { walk(full); continue; }
          if (extname(full) !== ".ts") continue;
          if (isSpec(full)) { testFiles.push(full); continue; }
          if (full.endsWith(".d.ts")) continue;
          if (sourceFiles.length >= UNTESTED_API_FILE_CAP) { untestedApiScanState.capReached = true; continue; }
          sourceFiles.push(full);
        }
      } catch {}
    };
    walk(path);
  }

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of [...sourceFiles, ...testFiles]) { try { project.addSourceFileAtPath(f); } catch {} }

  // Read each spec's text once for the import gate + member matching.
  const specTexts = new Map<string, string>();
  for (const t of testFiles) {
    const sf = project.getSourceFile(t);
    specTexts.set(t, sf?.getFullText() ?? safeRead(t));
  }

  const base = depth === "project" ? path : dirname(path);

  for (const srcPath of sourceFiles) {
    const sf = project.getSourceFile(srcPath);
    if (!sf) continue;
    const relFile = relative(base, srcPath) || srcPath;

    for (const cls of sf.getClasses()) {
      const clsName = cls.getName() ?? "";
      // A class counts as tested when ANY spec file IMPORTS it (real import gate).
      // reason "no_test_file" is reserved for classes no spec references at all.
      const importingSpecs = clsName
        ? testFiles.filter((t) => importsClass(specTexts.get(t) ?? "", clsName))
        : [];
      const classHasTest = importingSpecs.length > 0;

      for (const member of collectPublicMembers(cls)) {
        if (!classHasTest) {
          findings.push({ symbol: `${clsName}.${member.name}`, file: relFile, line: member.line, reason: "no_test_file" });
          continue;
        }
        const referenced = importingSpecs.some((t) => referencesMember(specTexts.get(t) ?? "", member.name));
        if (!referenced) {
          findings.push({ symbol: `${clsName}.${member.name}`, file: relFile, line: member.line, reason: "no_reference_found" });
        }
      }
    }
  }

  return findings;
}

// Public methods, properties and accessors of a class. get+set accessors of the
// same name are deduplicated so a single symbol yields a single finding.
function collectPublicMembers(cls: ClassDeclaration): { name: string; line: number }[] {
  const seen = new Set<string>();
  const members: { name: string; line: number }[] = [];
  const add = (name: string, line: number) => {
    // ES #private members have no scope modifier — exclude by their leading "#".
    if (name.startsWith("#") || NG_LIFECYCLE_HOOKS.has(name) || seen.has(name)) return;
    seen.add(name);
    members.push({ name, line });
  };
  for (const m of cls.getMethods()) { if (!isNonPublicScope(m.getScope())) add(m.getName(), m.getStartLineNumber()); }
  for (const p of cls.getProperties()) { if (!isNonPublicScope(p.getScope())) add(p.getName(), p.getStartLineNumber()); }
  for (const a of [...cls.getGetAccessors(), ...cls.getSetAccessors()]) {
    if (!isNonPublicScope(a.getScope())) add(a.getName(), a.getStartLineNumber());
  }
  return members;
}

function isNonPublicScope(scope: string | undefined): boolean {
  return scope === "private" || scope === "protected";
}

// Collect *.spec.ts / *.test.ts in the file's directory and every ancestor
// directory (non-recursive per level). Cheap readdir per level; bounded by depth.
function specCandidatesUpward(srcPath: string): string[] {
  const specs: string[] = [];
  let dir = dirname(srcPath);
  let prev = "";
  while (dir && dir !== prev) {
    try {
      for (const entry of readdirSync(dir)) {
        if (entry.endsWith(".spec.ts") || entry.endsWith(".test.ts")) specs.push(join(dir, entry));
      }
    } catch {}
    prev = dir;
    dir = dirname(dir);
  }
  return specs;
}

function safeRead(file: string): string {
  try { return readFileSync(file, "utf-8"); } catch { return ""; }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Import-statement gate (regex-based, heuristic — NOT a semantically resolved
// import): the class name must appear inside an import statement of the spec. A
// bare textual mention is intentionally NOT enough (no weak fallback).
function importsClass(specText: string, clsName: string): boolean {
  if (!clsName) return false;
  const esc = escapeRegExp(clsName);
  return new RegExp(`import[^;]*\\b${esc}\\b[^;]*from`, "m").test(specText);
}

function referencesMember(specText: string, name: string): boolean {
  if (!name) return false;
  const esc = escapeRegExp(name);
  if (new RegExp(`\\.${esc}\\b`).test(specText)) return true;            // property / method access
  if (new RegExp(`\\b${esc}\\s*\\(`).test(specText)) return true;        // call
  if (new RegExp(`['"\`][^'"\`]*\\b${esc}\\b[^'"\`]*['"\`]`).test(specText)) return true; // string literal
  return false;
}

// ─── 9. Symbol References (call-site detail level after refactoring safety) ───
// Anchors on real declarations (class/function/var/interface/enum + member
// methods/properties/accessors). Uses ts-morph findReferences() only when a
// tsconfig.json exists at the root (type-aware), otherwise an identifier
// text-match fallback in the spirit of analyzeRefactoringSafety.

// Set by findSymbolReferences; read by the index.ts handler to surface a cap warning.
export const symbolReferencesScanState: { capReached: boolean } = { capReached: false };

export function findSymbolReferences(rootPath: string, symbolName: string, filePath?: string): SymbolReference[] {
  symbolReferencesScanState.capReached = false;
  const tsConfigPath = join(rootPath, "tsconfig.json");

  if (existsSync(tsConfigPath)) {
    try {
      const project = new Project({ tsConfigFilePath: tsConfigPath });
      // getSourceFiles() includes node_modules/*.d.ts/lib files; restrict to
      // project sources before counting so the cap and the slice operate on the
      // same population that loadProject would yield (no false-positive cap, no
      // accidental truncation of source/anchor files).
      const projectFiles = filterProjectSourceFiles(project.getSourceFiles());
      const capped = projectFiles.length > PROJECT_FILE_CAP;
      const sourceFiles = capped ? projectFiles.slice(0, PROJECT_FILE_CAP) : projectFiles;
      symbolReferencesScanState.capReached = capped;
      const viaRefs = findViaReferences(rootPath, sourceFiles, symbolName, filePath);
      // Reuse the already-loaded source set for the fallback when no anchor
      // declaration resolved, instead of reloading the project via loadProject.
      return viaRefs ?? findViaTextMatch(rootPath, sourceFiles, symbolName, filePath);
    } catch {
      // fall through to the text-match fallback below
    }
  }

  const { sourceFiles, capReached } = loadProject(rootPath);
  symbolReferencesScanState.capReached = capReached;
  return findViaTextMatch(rootPath, sourceFiles, symbolName, filePath);
}

// Project-source predicate, mirroring the loadProject filters (node_modules,
// *.d.ts and *.spec.ts are excluded). Shared by the source-file pre-filter and
// the findReferences pass so both report the same population.
function isProjectSourceFile(filePath: string): boolean {
  const p = filePath.replace(/\\/g, "/");
  if (p.includes("/node_modules/")) return false;
  if (p.endsWith(".d.ts")) return false;
  if (p.endsWith(".spec.ts")) return false;
  return true;
}

// Restrict a tsconfig-loaded project to its own source files.
function filterProjectSourceFiles(sourceFiles: SourceFile[]): SourceFile[] {
  return sourceFiles.filter((sf) => isProjectSourceFile(sf.getFilePath()));
}

function filterAnchorFiles(sourceFiles: SourceFile[], rootPath: string, filePath?: string): SourceFile[] {
  if (!filePath) return sourceFiles;
  const norm = filePath.replace(/\\/g, "/");
  const abs = resolve(rootPath, filePath).replace(/\\/g, "/");
  // Suffix match must respect a path boundary so user.ts does not match superuser.ts.
  return sourceFiles.filter((sf) => {
    const p = sf.getFilePath().replace(/\\/g, "/");
    return p === abs || p === norm || p.endsWith("/" + norm);
  });
}

function collectAnchors(sourceFiles: SourceFile[], symbolName: string): Node[] {
  const anchors: Node[] = [];
  for (const sf of sourceFiles) {
    const cls = sf.getClass(symbolName); if (cls) anchors.push(cls);
    const fn = sf.getFunction(symbolName); if (fn) anchors.push(fn);
    const vr = sf.getVariableDeclaration(symbolName); if (vr) anchors.push(vr);
    const iface = sf.getInterface(symbolName); if (iface) anchors.push(iface);
    const en = sf.getEnum(symbolName); if (en) anchors.push(en);
    for (const c of sf.getClasses()) {
      const m = c.getMethod(symbolName); if (m) anchors.push(m);
      const p = c.getProperty(symbolName); if (p) anchors.push(p);
      const g = c.getGetAccessor(symbolName); if (g) anchors.push(g);
      const s = c.getSetAccessor(symbolName); if (s) anchors.push(s);
    }
  }
  return anchors;
}

function declarationPositions(anchors: Node[]): Set<string> {
  const positions = new Set<string>();
  for (const a of anchors) {
    const nameNode = (a as { getNameNode?: () => Node | undefined }).getNameNode?.();
    if (nameNode) positions.add(`${a.getSourceFile().getFilePath()}:${nameNode.getStart()}`);
  }
  return positions;
}

// Returns null when there are no anchors in the type-aware pass, so the caller
// can decide whether the fallback applies. An empty array means "no references".
function findViaReferences(rootPath: string, sourceFiles: SourceFile[], symbolName: string, filePath?: string): SymbolReference[] | null {
  const anchors = collectAnchors(filterAnchorFiles(sourceFiles, rootPath, filePath), symbolName);
  if (anchors.length === 0) return null;

  const declPositions = declarationPositions(anchors);
  const results: SymbolReference[] = [];
  const seen = new Set<string>();

  for (const anchor of anchors) {
    let refSymbols;
    try { refSymbols = (anchor as unknown as { findReferences: () => ReturnType<MethodDeclaration["findReferences"]> }).findReferences(); }
    catch { continue; }
    for (const rs of refSymbols) {
      for (const ref of rs.getReferences()) {
        if (ref.isDefinition()) continue;
        const node = ref.getNode();
        // findReferences() searches the whole project (incl. .spec.ts/.d.ts/
        // node_modules); keep only project sources so the type-aware path and
        // the text-match fallback report the same population.
        if (!isProjectSourceFile(node.getSourceFile().getFilePath())) continue;
        if (declPositions.has(`${node.getSourceFile().getFilePath()}:${node.getStart()}`)) continue;
        pushReference(results, seen, rootPath, node);
      }
    }
  }

  return results.sort(sortByFileLine);
}

function findViaTextMatch(rootPath: string, sourceFiles: SourceFile[], symbolName: string, filePath?: string): SymbolReference[] {
  // Even with no resolvable declaration we still report the name/text matches:
  // the purpose is to surface usages, including external/non-declared symbols.
  // declPositions is then empty, so nothing is excluded as a declaration.
  const anchors = collectAnchors(filterAnchorFiles(sourceFiles, rootPath, filePath), symbolName);
  const declPositions = declarationPositions(anchors);
  const results: SymbolReference[] = [];
  const seen = new Set<string>();

  for (const sf of sourceFiles) {
    sf.forEachDescendant((node) => {
      if (!Node.isIdentifier(node) || node.getText() !== symbolName) return;
      if (declPositions.has(`${sf.getFilePath()}:${node.getStart()}`)) return;
      pushReference(results, seen, rootPath, node);
    });
  }

  return results.sort(sortByFileLine);
}

function pushReference(results: SymbolReference[], seen: Set<string>, rootPath: string, node: Node): void {
  const sf = node.getSourceFile();
  const { line, column } = sf.getLineAndColumnAtPos(node.getStart());
  const relFile = relative(rootPath, sf.getFilePath()).replace(/\\/g, "/");
  const key = `${relFile}:${line}:${column}`;
  if (seen.has(key)) return;
  seen.add(key);
  const lineText = sf.getFullText().split("\n")[line - 1] ?? "";
  results.push({
    file: relFile,
    line,
    surroundingMethod: surroundingMethodName(node),
    snippet: lineText.trim().slice(0, 80),
  });
}

function surroundingMethodName(node: Node): string | null {
  // Climb to the nearest *named* enclosing unit (method, function, constructor,
  // accessor, property — matching the .NET path). Anonymous arrow/function
  // expressions are skipped, so a reference inside a property initializer such as
  // `data = computed(() => this.foo())` reports the property as the unit.
  const ancestor = node.getFirstAncestor((a) => {
    if (
      Node.isMethodDeclaration(a) ||
      Node.isFunctionDeclaration(a) ||
      Node.isConstructorDeclaration(a) ||
      Node.isGetAccessorDeclaration(a) ||
      Node.isSetAccessorDeclaration(a) ||
      Node.isPropertyDeclaration(a)
    ) return true;
    if (Node.isArrowFunction(a) || Node.isFunctionExpression(a))
      return !!(a as { getName?: () => string | undefined }).getName?.();
    return false;
  });
  if (!ancestor) return null;
  if (Node.isConstructorDeclaration(ancestor)) return "constructor";
  return (ancestor as { getName?: () => string | undefined }).getName?.() ?? null;
}

function sortByFileLine(a: SymbolReference, b: SymbolReference): number {
  return a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file);
}

// ─── God Class Detection ──────────────────────────────────────────────────────

export const godClassScanState: { capReached: boolean } = { capReached: false };

function loadGodClassSourceFiles(rootPath: string): { sourceFiles: SourceFile[]; capReached: boolean } {
  const tsConfigPath = join(rootPath, "tsconfig.json");
  if (existsSync(tsConfigPath)) {
    try {
      const project = new Project({ tsConfigFilePath: tsConfigPath });
      const projectFiles = project.getSourceFiles().filter((sf) => {
        const p = sf.getFilePath().replace(/\\/g, "/");
        return !p.includes("/node_modules/") && !p.endsWith(".d.ts") && !p.endsWith(".spec.ts");
      });
      const capReached = projectFiles.length > PROJECT_FILE_CAP;
      return {
        sourceFiles: capReached ? projectFiles.slice(0, PROJECT_FILE_CAP) : projectFiles,
        capReached,
      };
    } catch {
      return loadProject(rootPath);
    }
  }
  return loadProject(rootPath);
}

export function detectGodClasses(rootPath: string, top = 10): GodClassScanResult {
  godClassScanState.capReached = false;
  const { sourceFiles, capReached } = loadGodClassSourceFiles(rootPath);
  godClassScanState.capReached = capReached;

  const candidates = [];
  let scannedClassCount = 0;

  for (const sf of sourceFiles) {
    const relFile = relative(rootPath, sf.getFilePath());
    for (const cls of sf.getClasses()) {
      const name = cls.getName() ?? "";
      if (!name) continue;
      const methods = cls.getMethods().filter((m) => m.getName() !== "constructor");
      if (methods.length < 3) continue;

      scannedClassCount++;
      const metrics = computeClassMetrics(cls);
      const candidate = toGodClassCandidate(name, relFile, cls.getStartLineNumber(), metrics);
      if (candidate) candidates.push(candidate);
    }
  }

  return {
    candidates: filterAndRank(candidates, top),
    capReached: capReached || undefined,
    scannedClassCount,
  };
}
