import { Project, Node, MethodDeclaration, ClassDeclaration, SyntaxKind } from "ts-morph";
import { readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IospViolation {
  file: string;
  method: string;
  line: number;
  integrationCalls: string[];
  operationExpr: string[];
  msg: string;
}

export interface IospResult {
  summary: { methods: number; violations: number };
  violations: IospViolation[];
}

// ─── Project Loader ───────────────────────────────────────────────────────────

function loadTsFiles(rootPath: string): string[] {
  const ignored = new Set(["node_modules", ".git", "dist", "coverage", ".angular"]);
  const files: string[] = [];

  function walk(dir: string) {
    if (files.length > 400) return;
    try {
      for (const entry of readdirSync(dir)) {
        if (ignored.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (
          extname(full) === ".ts" &&
          !full.endsWith(".spec.ts") &&
          !full.endsWith(".d.ts")
        ) files.push(full);
      }
    } catch {}
  }

  walk(rootPath);
  return files;
}

// ─── Internal Call Detection ──────────────────────────────────────────────────
//
// A `this.xyz()` call is "internal" only when `xyz` appears in the class's own
// getMethods() list. Calls on injected dependencies (`this.httpClient.get()`,
// `this.router.navigate()`) are NOT internal — they share the same `this.x()`
// surface syntax but `x` will not be in the class method set.
//
// Arrow-function callbacks (e.g. `.pipe(map(...))`, `.subscribe(...)`) are
// skipped entirely — only statement-level call nodes are checked.

function findInternalCalls(
  method: MethodDeclaration,
  internalNames: Set<string>
): string[] {
  const body = method.getBody();
  if (!body) return [];

  const found = new Set<string>();

  body.forEachDescendant((node, traversal) => {
    // Do not descend into callbacks — arrow funcs and function expressions
    if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
      traversal.skip();
      return;
    }

    if (Node.isCallExpression(node)) {
      const callee = node.getExpression();
      if (Node.isPropertyAccessExpression(callee)) {
        const obj = callee.getExpression();
        const name = callee.getName();
        if (obj.getKind() === SyntaxKind.ThisKeyword && internalNames.has(name)) {
          found.add(`this.${name}()`);
        }
      }
    }
  });

  return [...found];
}

// ─── Operation Logic Detection ────────────────────────────────────────────────
//
// Only statement-level constructs count. We do NOT recurse into nested scopes
// (arrow callbacks are captured by the caller's findInternalCalls, not here).

function findOperationLogic(method: MethodDeclaration): string[] {
  const body = method.getBody();
  if (!body || !Node.isBlock(body)) return [];

  const items: string[] = [];

  for (const stmt of body.getStatements()) {
    if (Node.isIfStatement(stmt)) {
      items.push(`if (${stmt.getExpression().getText().slice(0, 40)})`);
    } else if (
      Node.isForStatement(stmt) ||
      Node.isForOfStatement(stmt) ||
      Node.isForInStatement(stmt)
    ) {
      items.push("for (...)");
    } else if (Node.isWhileStatement(stmt)) {
      items.push("while (...)");
    } else if (Node.isDoStatement(stmt)) {
      items.push("do { ... } while (...)");
    } else if (Node.isSwitchStatement(stmt)) {
      items.push(`switch (${stmt.getExpression().getText().slice(0, 30)})`);
    } else if (Node.isTryStatement(stmt)) {
      items.push("try { ... }");
    } else if (Node.isReturnStatement(stmt)) {
      const expr = stmt.getExpression();
      if (expr && (Node.isBinaryExpression(expr) || Node.isConditionalExpression(expr))) {
        items.push(`return ${expr.getText().slice(0, 60)}`);
      }
    } else if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        const init = decl.getInitializer();
        if (init && (Node.isBinaryExpression(init) || Node.isConditionalExpression(init))) {
          items.push(`${decl.getName()} = ${init.getText().slice(0, 50)}`);
        }
      }
    } else if (Node.isExpressionStatement(stmt)) {
      const expr = stmt.getExpression();
      if (Node.isBinaryExpression(expr) || Node.isConditionalExpression(expr)) {
        items.push(expr.getText().slice(0, 60));
      }
    }
  }

  return items;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export function runTsIospAnalysis(projectPath: string): IospResult {
  const files = loadTsFiles(projectPath);
  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of files) {
    try { project.addSourceFileAtPath(f); } catch {}
  }

  let methodCount = 0;
  const violations: IospViolation[] = [];

  for (const sf of project.getSourceFiles()) {
    const relFile = relative(projectPath, sf.getFilePath());

    for (const cls of sf.getClasses()) {
      // Build lookup of this class's own method names (not injected dependency members)
      const internalNames = new Set(cls.getMethods().map((m) => m.getName()));

      for (const method of cls.getMethods()) {
        methodCount++;

        const integrationCalls = findInternalCalls(method, internalNames);
        const operationExprs = findOperationLogic(method);

        if (integrationCalls.length > 0 && operationExprs.length > 0) {
          violations.push({
            file: relFile,
            method: `${cls.getName() ?? "(anon)"}.${method.getName()}`,
            line: method.getStartLineNumber(),
            integrationCalls,
            operationExpr: operationExprs,
            msg: "Mixes integration (method calls) and operation (expressions/logic)",
          });
        }
      }
    }
  }

  return {
    summary: { methods: methodCount, violations: violations.length },
    violations,
  };
}
