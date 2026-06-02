import {
  Project, Node, SourceFile, ClassDeclaration,
  MethodDeclaration, SyntaxKind,
} from "ts-morph";
import { readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassSplitAnalysis {
  file: string;
  className: string;
  line: number;
  lcom: LcomResult;
  methodClusters: MethodCluster[];
  fieldAccessMap: FieldAccessEntry[];
  dependencyGroups: DependencyGroup[];
  splitSuggestions: SplitSuggestion[];
  shouldSplit: boolean;
  splitUrgency: "none" | "low" | "medium" | "high" | "critical";
}

export interface LcomResult {
  score: number;          // 0.0 – 1.0 (1.0 = completely incoherent)
  methodCount: number;
  fieldCount: number;
  sharedFieldPairs: number;
  interpretation: string;
}

export interface MethodCluster {
  clusterId: number;
  methods: string[];
  sharedFields: string[];
  sharedDependencies: string[];
  suggestedName: string;
}

export interface FieldAccessEntry {
  fieldName: string;
  type: string | null;
  readByMethods: string[];
  writtenByMethods: string[];
  exclusiveToCluster: number | null; // null = shared across clusters
}

export interface DependencyGroup {
  dependency: string;       // injected service/token name
  usedByMethods: string[];
  suggestedOwner: string;   // which new class should own this dep
}

export interface SplitSuggestion {
  newClassName: string;
  responsibility: string;
  methods: string[];
  fields: string[];
  dependencies: string[];
  reasoning: string;
  estimatedLines: number;
}

// ─── Project Loader ───────────────────────────────────────────────────────────

function loadProject(rootPath: string): SourceFile[] {
  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular"];
  const files: string[] = [];

  function walk(dir: string) {
    if (files.length > 400) return;
    try {
      for (const entry of readdirSync(dir)) {
        if (ignored.includes(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (extname(full) === ".ts" && !full.endsWith(".spec.ts") && !full.endsWith(".d.ts"))
          files.push(full);
      }
    } catch {}
  }
  walk(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of files) { try { project.addSourceFileAtPath(f); } catch {} }
  return project.getSourceFiles();
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function analyzeClassSplits(rootPath: string, targetClass?: string): ClassSplitAnalysis[] {
  const sourceFiles = loadProject(rootPath);
  const results: ClassSplitAnalysis[] = [];

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      const name = cls.getName() ?? "";
      if (targetClass && !name.toLowerCase().includes(targetClass.toLowerCase())) continue;

      // Skip tiny classes
      const methods = cls.getMethods().filter((m) => !["constructor"].includes(m.getName()));
      if (methods.length < 3) continue;

      const analysis = analyzeClass(cls, sf, rootPath);
      if (targetClass || analysis.shouldSplit) {
        results.push(analysis);
      }
    }
  }

  return results.sort((a, b) => {
    const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
    return urgencyOrder[a.splitUrgency] - urgencyOrder[b.splitUrgency];
  });
}

// ─── Core Analysis ────────────────────────────────────────────────────────────

function analyzeClass(cls: ClassDeclaration, sf: SourceFile, rootPath: string): ClassSplitAnalysis {
  const className = cls.getName() ?? "(anonymous)";
  const relFile = relative(rootPath, sf.getFilePath());
  const methods = cls.getMethods().filter((m) => m.getName() !== "constructor");
  const lifecycleHooks = new Set(["ngOnInit", "ngOnDestroy", "ngAfterViewInit", "ngOnChanges", "ngDoCheck"]);

  // ── 1. Collect all class fields (properties + inject() calls) ──────────────
  const fields = collectFields(cls);

  // ── 2. Build Field Access Map ─────────────────────────────────────────────
  const fieldAccessMap = buildFieldAccessMap(cls, fields, methods);

  // ── 3. Build Dependency Map (injected services per method) ─────────────────
  const injectedDeps = collectInjectedDeps(cls);
  const depUsageMap = buildDependencyUsageMap(cls, injectedDeps, methods);

  // ── 4. Build internal call graph (which methods call which) ───────────────
  const callGraph = buildCallGraph(cls, methods);

  // ── 5. Compute LCOM ───────────────────────────────────────────────────────
  const lcom = computeLcom(methods, fieldAccessMap);

  // ── 6. Find method clusters via connected components ──────────────────────
  const clusters = findMethodClusters(methods, fieldAccessMap, depUsageMap, callGraph, lifecycleHooks);

  // ── 7. Annotate field access map with cluster ownership ───────────────────
  annotateFieldClusters(fieldAccessMap, clusters);

  // ── 8. Build dependency groups ────────────────────────────────────────────
  const dependencyGroups = buildDependencyGroups(depUsageMap, clusters);

  // ── 9. Generate split suggestions ─────────────────────────────────────────
  const splitSuggestions = generateSplitSuggestions(className, clusters, fieldAccessMap, dependencyGroups, methods);

  // ── 10. Determine urgency ──────────────────────────────────────────────────
  const { shouldSplit, splitUrgency } = computeUrgency(lcom, clusters, methods.length);

  return {
    file: relFile,
    className,
    line: cls.getStartLineNumber(),
    lcom,
    methodClusters: clusters,
    fieldAccessMap,
    dependencyGroups,
    splitSuggestions,
    shouldSplit,
    splitUrgency,
  };
}

// ─── Field Collection ─────────────────────────────────────────────────────────

interface FieldInfo { name: string; type: string | null; isInjected: boolean }

function collectFields(cls: ClassDeclaration): FieldInfo[] {
  const fields: FieldInfo[] = [];

  for (const prop of cls.getProperties()) {
    const init = prop.getInitializer();
    const isInject = init && Node.isCallExpression(init) && init.getExpression().getText() === "inject";
    fields.push({
      name: prop.getName(),
      type: prop.getTypeNode()?.getText() ?? null,
      isInjected: !!isInject,
    });
  }

  // Constructor params as fields
  for (const ctor of cls.getConstructors()) {
    for (const param of ctor.getParameters()) {
      if (param.getScope() || param.isReadonly()) {
        fields.push({
          name: param.getName(),
          type: param.getTypeNode()?.getText() ?? null,
          isInjected: true,
        });
      }
    }
  }

  return fields;
}

// ─── Field Access Map ─────────────────────────────────────────────────────────

function buildFieldAccessMap(
  cls: ClassDeclaration,
  fields: FieldInfo[],
  methods: MethodDeclaration[]
): FieldAccessEntry[] {
  const map: FieldAccessEntry[] = fields.map((f) => ({
    fieldName: f.name,
    type: f.type,
    readByMethods: [],
    writtenByMethods: [],
    exclusiveToCluster: null,
  }));

  for (const method of methods) {
    const methodName = method.getName();
    const body = method.getBody();
    if (!body) continue;

    body.forEachDescendant((node) => {
      // this.fieldName access
      if (Node.isPropertyAccessExpression(node)) {
        const obj = node.getExpression();
        const propName = node.getName();
        if (obj.getKind() === SyntaxKind.ThisKeyword) {
          const entry = map.find((e) => e.fieldName === propName);
          if (!entry) return;

          const parent = node.getParent();
          // Write: this.field = ... or this.field += ...
          if (Node.isBinaryExpression(parent) && parent.getLeft() === node) {
            if (!entry.writtenByMethods.includes(methodName))
              entry.writtenByMethods.push(methodName);
          } else {
            if (!entry.readByMethods.includes(methodName))
              entry.readByMethods.push(methodName);
          }
        }
      }
    });
  }

  // Filter out fields with no usage (likely Angular lifecycle-injected)
  return map.filter((e) => e.readByMethods.length + e.writtenByMethods.length > 0);
}

// ─── Injected Dependency Usage ────────────────────────────────────────────────

function collectInjectedDeps(cls: ClassDeclaration): Map<string, string> {
  const deps = new Map<string, string>(); // fieldName → type

  for (const prop of cls.getProperties()) {
    const init = prop.getInitializer();
    if (init && Node.isCallExpression(init) && init.getExpression().getText() === "inject") {
      const typeArg = init.getArguments()[0]?.getText() ?? "unknown";
      deps.set(prop.getName(), typeArg);
    }
  }

  for (const ctor of cls.getConstructors()) {
    for (const param of ctor.getParameters()) {
      const type = param.getTypeNode()?.getText() ?? "";
      if (type) deps.set(param.getName(), type);
    }
  }

  return deps;
}

function buildDependencyUsageMap(
  cls: ClassDeclaration,
  deps: Map<string, string>,
  methods: MethodDeclaration[]
): Map<string, Set<string>> {
  // depName → Set<methodName>
  const usage = new Map<string, Set<string>>();
  for (const [dep] of deps) usage.set(dep, new Set());

  for (const method of methods) {
    const body = method.getBody();
    if (!body) continue;
    const methodName = method.getName();

    body.forEachDescendant((node) => {
      if (Node.isPropertyAccessExpression(node)) {
        const obj = node.getExpression();
        if (obj.getKind() === SyntaxKind.ThisKeyword) {
          const propName = node.getName();
          if (usage.has(propName)) {
            usage.get(propName)!.add(methodName);
          }
        }
      }
    });
  }

  return usage;
}

// ─── Internal Call Graph ──────────────────────────────────────────────────────

function buildCallGraph(cls: ClassDeclaration, methods: MethodDeclaration[]): Map<string, Set<string>> {
  // caller → Set<callee>
  const graph = new Map<string, Set<string>>();
  const methodNames = new Set(methods.map((m) => m.getName()));

  for (const method of methods) {
    const caller = method.getName();
    const callees = new Set<string>();
    const body = method.getBody();
    if (!body) { graph.set(caller, callees); continue; }

    body.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          if (expr.getExpression().getKind() === SyntaxKind.ThisKeyword) {
            const callee = expr.getName();
            if (methodNames.has(callee)) callees.add(callee);
          }
        }
      }
    });

    graph.set(caller, callees);
  }

  return graph;
}

// ─── LCOM Computation (LCOM4 variant) ────────────────────────────────────────

function computeLcom(methods: MethodDeclaration[], fieldMap: FieldAccessEntry[]): LcomResult {
  const n = methods.length;
  if (n < 2) return { score: 0, methodCount: n, fieldCount: fieldMap.length, sharedFieldPairs: 0, interpretation: "Too few methods to compute LCOM" };

  const methodNames = methods.map((m) => m.getName());
  let sharedPairs = 0;
  let totalPairs = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalPairs++;
      const a = methodNames[i];
      const b = methodNames[j];
      const aFields = new Set(fieldMap.filter((f) => f.readByMethods.includes(a) || f.writtenByMethods.includes(a)).map((f) => f.fieldName));
      const bFields = new Set(fieldMap.filter((f) => f.readByMethods.includes(b) || f.writtenByMethods.includes(b)).map((f) => f.fieldName));
      const shared = [...aFields].some((f) => bFields.has(f));
      if (shared) sharedPairs++;
    }
  }

  const score = totalPairs > 0 ? 1 - (sharedPairs / totalPairs) : 0;

  let interpretation: string;
  if (score < 0.3) interpretation = "✅ High cohesion — class is well-focused";
  else if (score < 0.5) interpretation = "⚠️ Moderate cohesion — consider reviewing responsibilities";
  else if (score < 0.7) interpretation = "⚠️ Low cohesion — class likely handles multiple concerns";
  else interpretation = "🔴 Very low cohesion — strong SRP violation, split recommended";

  return { score: Math.round(score * 100) / 100, methodCount: n, fieldCount: fieldMap.length, sharedFieldPairs: sharedPairs, interpretation };
}

// ─── Method Cluster Detection (Union-Find) ────────────────────────────────────

function findMethodClusters(
  methods: MethodDeclaration[],
  fieldMap: FieldAccessEntry[],
  depMap: Map<string, Set<string>>,
  callGraph: Map<string, Set<string>>,
  lifecycleHooks: Set<string>
): MethodCluster[] {
  const methodNames = methods.map((m) => m.getName());
  const parent: Record<string, string> = {};
  methodNames.forEach((n) => (parent[n] = n));

  function find(x: string): string {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a: string, b: string) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Connect methods that share fields
  for (const entry of fieldMap) {
    const users = [...entry.readByMethods, ...entry.writtenByMethods];
    for (let i = 0; i < users.length - 1; i++) {
      if (methodNames.includes(users[i]) && methodNames.includes(users[i + 1]))
        union(users[i], users[i + 1]);
    }
  }

  // Connect methods that share injected dependencies
  for (const [, methodSet] of depMap) {
    const users = [...methodSet].filter((m) => methodNames.includes(m));
    for (let i = 0; i < users.length - 1; i++) union(users[i], users[i + 1]);
  }

  // Connect methods via call graph
  for (const [caller, callees] of callGraph) {
    for (const callee of callees) {
      if (methodNames.includes(caller) && methodNames.includes(callee))
        union(caller, callee);
    }
  }

  // Group by root
  const groups = new Map<string, string[]>();
  for (const name of methodNames) {
    const root = find(name);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(name);
  }

  return [...groups.values()].map((members, idx) => {
    // Shared fields for this cluster
    const sharedFields = fieldMap
      .filter((f) => members.some((m) => f.readByMethods.includes(m) || f.writtenByMethods.includes(m)))
      .map((f) => f.fieldName);

    // Shared deps for this cluster
    const sharedDeps: string[] = [];
    for (const [dep, methodSet] of depMap) {
      if (members.some((m) => methodSet.has(m))) sharedDeps.push(dep);
    }

    const suggestedName = suggestClusterName(members, sharedDeps, sharedFields);

    return { clusterId: idx, methods: members, sharedFields, sharedDependencies: sharedDeps, suggestedName };
  }).filter((c) => c.methods.length > 0);
}

// ─── Cluster Name Suggestion ──────────────────────────────────────────────────

function suggestClusterName(methods: string[], deps: string[], fields: string[]): string {
  // Heuristic: find common domain words in method names
  const words = methods.flatMap((m) => m.replace(/([A-Z])/g, " $1").trim().toLowerCase().split(" "));
  const counts = new Map<string, number>();
  words.forEach((w) => { if (w.length > 3) counts.set(w, (counts.get(w) ?? 0) + 1); });
  const topWord = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Check deps for domain hints
  const depHints = deps.map((d) => d.replace("Service", "").replace("Repository", "").replace("Http", "Http"));

  if (topWord) return capitalize(topWord) + "Service";
  if (depHints[0]) return depHints[0] + "Service";
  return "ExtractedService";
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Annotate Field Clusters ──────────────────────────────────────────────────

function annotateFieldClusters(fieldMap: FieldAccessEntry[], clusters: MethodCluster[]) {
  for (const field of fieldMap) {
    const users = new Set([...field.readByMethods, ...field.writtenByMethods]);
    const owningClusters = new Set<number>();

    for (const cluster of clusters) {
      if (cluster.methods.some((m) => users.has(m))) owningClusters.add(cluster.clusterId);
    }

    field.exclusiveToCluster = owningClusters.size === 1 ? [...owningClusters][0] : null;
  }
}

// ─── Dependency Groups ────────────────────────────────────────────────────────

function buildDependencyGroups(
  depMap: Map<string, Set<string>>,
  clusters: MethodCluster[]
): DependencyGroup[] {
  return [...depMap.entries()]
    .filter(([, methods]) => methods.size > 0)
    .map(([dep, methodSet]) => {
      const usedByMethods = [...methodSet];
      // Find which cluster uses this dep most
      let maxCount = 0;
      let ownerCluster = clusters[0];
      for (const cluster of clusters) {
        const count = cluster.methods.filter((m) => methodSet.has(m)).length;
        if (count > maxCount) { maxCount = count; ownerCluster = cluster; }
      }
      return { dependency: dep, usedByMethods, suggestedOwner: ownerCluster?.suggestedName ?? "Unknown" };
    });
}

// ─── Split Suggestions ────────────────────────────────────────────────────────

function generateSplitSuggestions(
  originalName: string,
  clusters: MethodCluster[],
  fieldMap: FieldAccessEntry[],
  depGroups: DependencyGroup[],
  allMethods: MethodDeclaration[]
): SplitSuggestion[] {
  if (clusters.length <= 1) return [];

  const methodLineMap = new Map(allMethods.map((m) => [m.getName(), m.getEndLineNumber() - m.getStartLineNumber()]));

  return clusters.map((cluster, idx) => {
    const exclusiveFields = fieldMap
      .filter((f) => f.exclusiveToCluster === cluster.clusterId)
      .map((f) => f.fieldName);

    const exclusiveDeps = depGroups
      .filter((d) => d.suggestedOwner === cluster.suggestedName)
      .map((d) => d.dependency);

    const estimatedLines = cluster.methods.reduce((sum, m) => sum + (methodLineMap.get(m) ?? 10), 0) + 20;

    const isOriginal = idx === 0;

    return {
      newClassName: isOriginal ? originalName : cluster.suggestedName,
      responsibility: describeResponsibility(cluster.methods, cluster.sharedDependencies),
      methods: cluster.methods,
      fields: exclusiveFields,
      dependencies: exclusiveDeps,
      reasoning: buildReasoning(cluster, fieldMap, isOriginal, originalName),
      estimatedLines,
    };
  });
}

function describeResponsibility(methods: string[], deps: string[]): string {
  const verbs = new Set<string>();
  for (const m of methods) {
    const match = m.match(/^(get|set|load|save|create|update|delete|send|fetch|validate|handle|process|format|build|compute|calculate|render|export|import)/);
    if (match) verbs.add(match[1]);
  }
  const domain = deps[0]?.replace(/Service|Repository|Client|Http/, "") ?? "Business";
  return `${[...verbs].join("/") || "Handles"} ${domain} operations`;
}

function buildReasoning(cluster: MethodCluster, fieldMap: FieldAccessEntry[], isOriginal: boolean, originalName: string): string {
  const parts: string[] = [];
  if (cluster.sharedFields.length > 0)
    parts.push(`Methods share fields: ${cluster.sharedFields.slice(0, 3).join(", ")}`);
  if (cluster.sharedDependencies.length > 0)
    parts.push(`Methods share dependencies: ${cluster.sharedDependencies.slice(0, 3).join(", ")}`);
  if (isOriginal)
    parts.push(`Retains core ${originalName} identity`);
  return parts.join(". ") || "Methods form a natural functional group.";
}

// ─── Urgency ──────────────────────────────────────────────────────────────────

function computeUrgency(lcom: LcomResult, clusters: MethodCluster[], methodCount: number): { shouldSplit: boolean; splitUrgency: ClassSplitAnalysis["splitUrgency"] } {
  if (clusters.length <= 1 && lcom.score < 0.4) return { shouldSplit: false, splitUrgency: "none" };
  if (clusters.length >= 4 || (lcom.score >= 0.7 && methodCount > 10)) return { shouldSplit: true, splitUrgency: "critical" };
  if (clusters.length >= 3 || lcom.score >= 0.6) return { shouldSplit: true, splitUrgency: "high" };
  if (clusters.length >= 2 || lcom.score >= 0.45) return { shouldSplit: true, splitUrgency: "medium" };
  return { shouldSplit: false, splitUrgency: "low" };
}
