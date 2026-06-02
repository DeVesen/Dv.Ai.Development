import {
  Project,
  Node,
  SyntaxKind,
  SourceFile,
  ClassDeclaration,
  ObjectLiteralExpression,
} from "ts-morph";
import { readdirSync, statSync, existsSync, readFileSync } from "fs";
import { join, relative, extname, basename } from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AngularProjectIndex {
  generatedAt: string;
  projectRoot: string;
  summary: ProjectSummary;
  components: ComponentEntry[];
  services: ServiceEntry[];
  interfaces: InterfaceEntry[];
  enums: EnumEntry[];
  pipes: PipeEntry[];
  directives: DirectiveEntry[];
  guards: GuardEntry[];
  interceptors: InterceptorEntry[];
  routes: RouteEntry[];
  dependencyGraph: DependencyGraph;
  signalAdoptionReport: SignalAdoptionReport;
  couplingReport: CouplingReport;
}

export interface ProjectSummary {
  totalFiles: number;
  componentCount: number;
  serviceCount: number;
  interfaceCount: number;
  enumCount: number;
  pipeCount: number;
  directiveCount: number;
  guardCount: number;
  standaloneComponents: number;
  onPushComponents: number;
  signalInputs: number;
  legacyInputs: number;
  modernControlFlow: number;
  legacyControlFlow: number;
}

export interface ComponentEntry {
  name: string;
  file: string;
  line: number;
  selector: string | null;
  changeDetection: "OnPush" | "Default" | "unknown";
  isStandalone: boolean;
  inputs: InputOutputEntry[];
  outputs: InputOutputEntry[];
  injects: string[];
  lifecycleHooks: string[];
  methods: MethodEntry[];
  templateFile: string | null;
  styleFiles: string[];
  usesSignals: boolean;
  usesAsyncPipe: boolean;
  controlFlowSyntax: "modern" | "legacy" | "mixed" | "none";
  templateDependencies: string[];
}

export interface ServiceEntry {
  name: string;
  file: string;
  line: number;
  providedIn: string | null;
  injects: string[];
  publicMethods: MethodEntry[];
  usesHttpClient: boolean;
  returnsObservables: boolean;
  usesSignals: boolean;
  implementedInterfaces: string[];
}

export interface InterfaceEntry {
  name: string;
  file: string;
  line: number;
  methods: string[];
  properties: string[];
  extendedInterfaces: string[];
  implementedBy: string[];
}

export interface EnumEntry {
  name: string;
  file: string;
  line: number;
  values: string[];
  usedIn: string[];
}

export interface PipeEntry {
  name: string;
  pipeName: string;
  file: string;
  line: number;
  isPure: boolean;
}

export interface DirectiveEntry {
  name: string;
  selector: string | null;
  file: string;
  line: number;
  injects: string[];
  inputs: string[];
  outputs: string[];
}

export interface GuardEntry {
  name: string;
  file: string;
  line: number;
  type: "functional" | "class";
  guardType: string[];
}

export interface InterceptorEntry {
  name: string;
  file: string;
  line: number;
  type: "functional" | "class";
}

export interface RouteEntry {
  path: string;
  component: string | null;
  isLazy: boolean;
  guards: string[];
  redirectTo: string | null;
  file: string;
}

export interface InputOutputEntry {
  name: string;
  type: string | null;
  isSignal: boolean;
  isRequired: boolean;
  line: number;
}

export interface MethodEntry {
  name: string;
  isAsync: boolean;
  returnType: string | null;
  paramCount: number;
  lines: number;
}

export interface DependencyGraph {
  [className: string]: {
    dependsOn: string[];
    usedBy: string[];
    file: string;
  };
}

export interface SignalAdoptionReport {
  totalComponents: number;
  usingSignalInputs: number;
  usingSignalOutputs: number;
  usingComputedSignals: number;
  usingEffects: number;
  usingToSignal: number;
  stillUsingAsyncPipe: number;
  migrationCandidates: string[];
}

export interface CouplingReport {
  mostDepended: { name: string; usedByCount: number }[];
  mostDepending: { name: string; dependsOnCount: number }[];
  circularRiskPairs: string[];
}

// ─── File Scanner ─────────────────────────────────────────────────────────────

function scanTypeScriptFiles(rootPath: string, maxFiles = 500): string[] {
  const files: string[] = [];
  const ignored = ["node_modules", ".git", "dist", "coverage", ".angular", "e2e"];

  function walk(dir: string) {
    if (files.length >= maxFiles) return;
    try {
      for (const entry of readdirSync(dir)) {
        if (ignored.includes(entry)) continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) walk(fullPath);
        else if ([".ts"].includes(extname(fullPath)) && !fullPath.endsWith(".spec.ts") && !fullPath.endsWith(".d.ts"))
          files.push(fullPath);
      }
    } catch {}
  }

  walk(rootPath);
  return files;
}

// ─── Decorator Helpers ────────────────────────────────────────────────────────

function getDecoratorArg(cls: ClassDeclaration, decoratorName: string): ObjectLiteralExpression | null {
  const decorator = cls.getDecorator(decoratorName);
  if (!decorator) return null;
  const args = decorator.getArguments();
  if (!args.length) return null;
  const arg = args[0];
  return Node.isObjectLiteralExpression(arg) ? arg : null;
}

function getStringProperty(obj: ObjectLiteralExpression, key: string): string | null {
  const prop = obj.getProperty(key);
  if (!prop || !Node.isPropertyAssignment(prop)) return null;
  const init = prop.getInitializer();
  if (!init) return null;
  const text = init.getText().replace(/['"` ]/g, "");
  return text || null;
}

function getBoolProperty(obj: ObjectLiteralExpression, key: string): boolean | null {
  const prop = obj.getProperty(key);
  if (!prop || !Node.isPropertyAssignment(prop)) return null;
  const text = prop.getInitializer()?.getText();
  if (text === "true") return true;
  if (text === "false") return false;
  return null;
}

// ─── Method Extractor ─────────────────────────────────────────────────────────

function extractMethods(cls: ClassDeclaration, publicOnly = false): MethodEntry[] {
  return cls.getMethods()
    .filter((m) => !publicOnly || m.getScope() === "public" || (!m.getScope()))
    .map((m) => ({
      name: m.getName(),
      isAsync: m.isAsync(),
      returnType: m.getReturnTypeNode()?.getText() ?? null,
      paramCount: m.getParameters().length,
      lines: m.getEndLineNumber() - m.getStartLineNumber(),
    }));
}

// ─── Inject Extractor ─────────────────────────────────────────────────────────

function extractInjects(cls: ClassDeclaration): string[] {
  const deps = new Set<string>();

  // inject() calls in properties
  cls.getProperties().forEach((prop) => {
    const init = prop.getInitializer();
    if (init && Node.isCallExpression(init)) {
      const expr = init.getExpression().getText();
      if (expr === "inject") {
        const arg = init.getArguments()[0]?.getText();
        if (arg) deps.add(arg.replace(/['"]/g, ""));
      }
    }
  });

  // Constructor params
  cls.getConstructors().forEach((ctor) => {
    ctor.getParameters().forEach((p) => {
      const typeText = p.getTypeNode()?.getText();
      if (typeText) deps.add(typeText);
    });
  });

  return [...deps];
}

// ─── Input/Output Extractor ───────────────────────────────────────────────────

function extractInputsOutputs(cls: ClassDeclaration): { inputs: InputOutputEntry[]; outputs: InputOutputEntry[] } {
  const inputs: InputOutputEntry[] = [];
  const outputs: InputOutputEntry[] = [];

  cls.getProperties().forEach((prop) => {
    const name = prop.getName();
    const line = prop.getStartLineNumber();
    const init = prop.getInitializer();
    const initText = init?.getText() ?? "";
    const typeText = prop.getTypeNode()?.getText() ?? null;

    // Signal inputs: input() / input.required()
    if (initText.startsWith("input(") || initText.startsWith("input.required(")) {
      inputs.push({ name, type: typeText, isSignal: true, isRequired: initText.includes("input.required"), line });
      return;
    }
    // Signal outputs: output()
    if (initText.startsWith("output(")) {
      outputs.push({ name, type: typeText, isSignal: true, isRequired: false, line });
      return;
    }
    // Legacy @Input()
    if (prop.getDecorators().some((d) => d.getName() === "Input")) {
      inputs.push({ name, type: typeText, isSignal: false, isRequired: false, line });
    }
    // Legacy @Output()
    if (prop.getDecorators().some((d) => d.getName() === "Output")) {
      outputs.push({ name, type: typeText, isSignal: false, isRequired: false, line });
    }
  });

  return { inputs, outputs };
}

// ─── Component Analyzer ───────────────────────────────────────────────────────

function analyzeComponent(cls: ClassDeclaration, sourceFile: SourceFile, rootPath: string): ComponentEntry {
  const args = getDecoratorArg(cls, "Component");
  const rawCode = sourceFile.getFullText();

  const selector = args ? getStringProperty(args, "selector") : null;
  const isStandalone = args ? (getBoolProperty(args, "standalone") ?? false) : false;
  const cdText = args?.getProperty("changeDetection")?.getText() ?? "";
  const changeDetection = cdText.includes("OnPush") ? "OnPush" : cdText.includes("Default") ? "Default" : "unknown";

  const { inputs, outputs } = extractInputsOutputs(cls);
  const injects = extractInjects(cls);

  const lifecycleHooks = cls.getMethods()
    .map((m) => m.getName())
    .filter((n) => ["ngOnInit", "ngOnDestroy", "ngAfterViewInit", "ngOnChanges", "ngDoCheck"].includes(n));

  const usesSignals = rawCode.includes("signal(") || rawCode.includes("computed(") || rawCode.includes("effect(") || rawCode.includes("toSignal(");
  const usesAsyncPipe = rawCode.includes("| async");

  const hasModern = rawCode.includes("@if") || rawCode.includes("@for") || rawCode.includes("@switch");
  const hasLegacy = rawCode.includes("*ngIf") || rawCode.includes("*ngFor") || rawCode.includes("*ngSwitch");
  const controlFlowSyntax = hasModern && hasLegacy ? "mixed" : hasModern ? "modern" : hasLegacy ? "legacy" : "none";

  // Template dependencies: find selector-like usages e.g. <app-user-card
  const templateDeps: string[] = [];
  const selectorMatches = rawCode.match(/<app-[a-z-]+/g) ?? [];
  selectorMatches.forEach((s) => { const n = s.slice(1); if (!templateDeps.includes(n)) templateDeps.push(n); });

  // Template/style file references
  const templateUrl = args ? getStringProperty(args, "templateUrl") : null;
  const styleUrls: string[] = [];
  const styleUrlsProp = args?.getProperty("styleUrls");
  if (styleUrlsProp) {
    const matches = styleUrlsProp.getText().match(/['"`]([^'"`]+\.(scss|css|less))['"`]/g) ?? [];
    matches.forEach((m) => styleUrls.push(m.replace(/['"`]/g, "")));
  }

  return {
    name: cls.getName() ?? "(anonymous)",
    file: relative(rootPath, sourceFile.getFilePath()),
    line: cls.getStartLineNumber(),
    selector,
    changeDetection: changeDetection as "OnPush" | "Default" | "unknown",
    isStandalone,
    inputs,
    outputs,
    injects,
    lifecycleHooks,
    methods: extractMethods(cls),
    templateFile: templateUrl,
    styleFiles: styleUrls,
    usesSignals,
    usesAsyncPipe,
    controlFlowSyntax,
    templateDependencies: templateDeps,
  };
}

// ─── Service Analyzer ─────────────────────────────────────────────────────────

function analyzeService(cls: ClassDeclaration, sourceFile: SourceFile, rootPath: string): ServiceEntry {
  const args = getDecoratorArg(cls, "Injectable");
  const rawCode = sourceFile.getFullText();
  const injects = extractInjects(cls);

  const providedInProp = args?.getProperty("providedIn");
  const providedIn = providedInProp
    ? providedInProp.getText().replace(/providedIn:\s*/, "").replace(/['"]/g, "").trim()
    : null;

  return {
    name: cls.getName() ?? "(anonymous)",
    file: relative(rootPath, sourceFile.getFilePath()),
    line: cls.getStartLineNumber(),
    providedIn,
    injects,
    publicMethods: extractMethods(cls, true),
    usesHttpClient: injects.some((d) => d.includes("HttpClient")),
    returnsObservables: rawCode.includes("Observable<") || rawCode.includes(": Observable"),
    usesSignals: rawCode.includes("signal(") || rawCode.includes("computed("),
    implementedInterfaces: cls.getImplements().map((i) => i.getText()),
  };
}

// ─── Route Scanner ────────────────────────────────────────────────────────────

function scanRoutes(sourceFiles: SourceFile[], rootPath: string): RouteEntry[] {
  const routes: RouteEntry[] = [];

  for (const sf of sourceFiles) {
    const text = sf.getFullText();
    if (!text.includes("Routes") && !text.includes("RouterModule") && !text.includes("provideRouter")) continue;

    // Simple regex-based route extraction (ts-morph AST for routes is very complex)
    const routeMatches = text.matchAll(/\{\s*path:\s*['"`]([^'"`]*)['"`][^}]*\}/gs);
    for (const match of routeMatches) {
      const block = match[0];
      const path = match[1];
      const isLazy = block.includes("loadComponent") || block.includes("loadChildren");
      const componentMatch = block.match(/component:\s*(\w+)/);
      const redirectMatch = block.match(/redirectTo:\s*['"`]([^'"`]+)['"`]/);
      const guardMatches = [...block.matchAll(/canActivate[^:]*:\s*\[([^\]]+)\]/g)];
      const guards = guardMatches.flatMap((g) => g[1].split(",").map((s) => s.trim()).filter(Boolean));

      routes.push({
        path,
        component: componentMatch?.[1] ?? null,
        isLazy,
        guards,
        redirectTo: redirectMatch?.[1] ?? null,
        file: relative(rootPath, sf.getFilePath()),
      });
    }
  }

  return routes;
}

// ─── Dependency Graph Builder ─────────────────────────────────────────────────

function buildDependencyGraph(
  components: ComponentEntry[],
  services: ServiceEntry[]
): DependencyGraph {
  const graph: DependencyGraph = {};
  const allEntries = [
    ...components.map((c) => ({ name: c.name, deps: c.injects, file: c.file })),
    ...services.map((s) => ({ name: s.name, deps: s.injects, file: s.file })),
  ];

  for (const entry of allEntries) {
    if (!graph[entry.name]) graph[entry.name] = { dependsOn: [], usedBy: [], file: entry.file };
    graph[entry.name].dependsOn = entry.deps;
  }

  // Build reverse: usedBy
  for (const [name, node] of Object.entries(graph)) {
    for (const dep of node.dependsOn) {
      const depName = dep.replace(/<.*>/, ""); // strip generics
      if (graph[depName]) {
        if (!graph[depName].usedBy.includes(name)) graph[depName].usedBy.push(name);
      }
    }
  }

  return graph;
}

// ─── Signal Adoption Report ───────────────────────────────────────────────────

function buildSignalReport(components: ComponentEntry[], services: ServiceEntry[], allFiles: SourceFile[]): SignalAdoptionReport {
  const allCode = allFiles.map((f) => f.getFullText()).join("\n");

  const usingSignalInputs = components.filter((c) => c.inputs.some((i) => i.isSignal)).length;
  const usingSignalOutputs = components.filter((c) => c.outputs.some((o) => o.isSignal)).length;
  const usingComputedSignals = (allCode.match(/computed\(/g) ?? []).length;
  const usingEffects = (allCode.match(/effect\(/g) ?? []).length;
  const usingToSignal = (allCode.match(/toSignal\(/g) ?? []).length;
  const stillUsingAsyncPipe = components.filter((c) => c.usesAsyncPipe).length;

  const migrationCandidates = components
    .filter((c) => c.usesAsyncPipe || c.inputs.some((i) => !i.isSignal) || c.outputs.some((o) => !o.isSignal))
    .map((c) => c.name);

  return {
    totalComponents: components.length,
    usingSignalInputs,
    usingSignalOutputs,
    usingComputedSignals,
    usingEffects,
    usingToSignal,
    stillUsingAsyncPipe,
    migrationCandidates,
  };
}

// ─── Coupling Report ──────────────────────────────────────────────────────────

function buildCouplingReport(graph: DependencyGraph): CouplingReport {
  const entries = Object.entries(graph);

  const mostDepended = entries
    .map(([name, node]) => ({ name, usedByCount: node.usedBy.length }))
    .sort((a, b) => b.usedByCount - a.usedByCount)
    .slice(0, 10);

  const mostDepending = entries
    .map(([name, node]) => ({ name, dependsOnCount: node.dependsOn.length }))
    .sort((a, b) => b.dependsOnCount - a.dependsOnCount)
    .slice(0, 10);

  // Simple circular risk: A depends on B, B depends on A
  const circularRiskPairs: string[] = [];
  for (const [name, node] of entries) {
    for (const dep of node.dependsOn) {
      if (graph[dep]?.dependsOn.includes(name)) {
        const pair = [name, dep].sort().join(" ↔ ");
        if (!circularRiskPairs.includes(pair)) circularRiskPairs.push(pair);
      }
    }
  }

  return { mostDepended, mostDepending, circularRiskPairs };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function indexAngularProject(rootPath: string): AngularProjectIndex {
  const tsFiles = scanTypeScriptFiles(rootPath);

  const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
  for (const f of tsFiles) {
    try { project.addSourceFileAtPath(f); } catch {}
  }

  const sourceFiles = project.getSourceFiles();

  const components: ComponentEntry[] = [];
  const services: ServiceEntry[] = [];
  const interfaces: InterfaceEntry[] = [];
  const enums: EnumEntry[] = [];
  const pipes: PipeEntry[] = [];
  const directives: DirectiveEntry[] = [];
  const guards: GuardEntry[] = [];
  const interceptors: InterceptorEntry[] = [];

  for (const sf of sourceFiles) {
    for (const cls of sf.getClasses()) {
      const decoratorNames = cls.getDecorators().map((d) => d.getName());

      if (decoratorNames.includes("Component")) {
        components.push(analyzeComponent(cls, sf, rootPath));
      } else if (decoratorNames.includes("Injectable")) {
        const name = cls.getName() ?? "";
        if (name.endsWith("Guard") || name.endsWith("guard")) {
          guards.push({
            name, file: relative(rootPath, sf.getFilePath()),
            line: cls.getStartLineNumber(), type: "class",
            guardType: ["canActivate"],
          });
        } else if (name.endsWith("Interceptor")) {
          interceptors.push({ name, file: relative(rootPath, sf.getFilePath()), line: cls.getStartLineNumber(), type: "class" });
        } else {
          services.push(analyzeService(cls, sf, rootPath));
        }
      } else if (decoratorNames.includes("Pipe")) {
        const args = getDecoratorArg(cls, "Pipe");
        const pipeName = args ? getStringProperty(args, "name") ?? "" : "";
        const isPureVal = args ? getBoolProperty(args, "pure") : null;
        pipes.push({
          name: cls.getName() ?? "",
          pipeName,
          file: relative(rootPath, sf.getFilePath()),
          line: cls.getStartLineNumber(),
          isPure: isPureVal !== false,
        });
      } else if (decoratorNames.includes("Directive")) {
        const args = getDecoratorArg(cls, "Directive");
        const { inputs, outputs } = extractInputsOutputs(cls);
        directives.push({
          name: cls.getName() ?? "",
          selector: args ? getStringProperty(args, "selector") : null,
          file: relative(rootPath, sf.getFilePath()),
          line: cls.getStartLineNumber(),
          injects: extractInjects(cls),
          inputs: inputs.map((i) => i.name),
          outputs: outputs.map((o) => o.name),
        });
      }

      // Functional guards (exported functions named canActivate...)
    }

    // Interfaces
    for (const iface of sf.getInterfaces()) {
      interfaces.push({
        name: iface.getName(),
        file: relative(rootPath, sf.getFilePath()),
        line: iface.getStartLineNumber(),
        methods: iface.getMethods().map((m) => m.getName()),
        properties: iface.getProperties().map((p) => p.getName()),
        extendedInterfaces: iface.getExtends().map((e) => e.getText()),
        implementedBy: [], // filled in post-pass
      });
    }

    // Enums
    for (const enumDecl of sf.getEnums()) {
      enums.push({
        name: enumDecl.getName(),
        file: relative(rootPath, sf.getFilePath()),
        line: enumDecl.getStartLineNumber(),
        values: enumDecl.getMembers().map((m) => m.getName()),
        usedIn: [], // filled in post-pass
      });
    }
  }

  // Post-pass: fill implementedBy on interfaces
  for (const iface of interfaces) {
    iface.implementedBy = [
      ...components.filter((c) => /* not tracked directly */ false).map((c) => c.name),
      ...services.filter((s) => s.implementedInterfaces.includes(iface.name)).map((s) => s.name),
    ];
  }

  const routes = scanRoutes(sourceFiles, rootPath);
  const dependencyGraph = buildDependencyGraph(components, services);
  const signalAdoptionReport = buildSignalReport(components, services, sourceFiles);
  const couplingReport = buildCouplingReport(dependencyGraph);

  const summary: ProjectSummary = {
    totalFiles: tsFiles.length,
    componentCount: components.length,
    serviceCount: services.length,
    interfaceCount: interfaces.length,
    enumCount: enums.length,
    pipeCount: pipes.length,
    directiveCount: directives.length,
    guardCount: guards.length,
    standaloneComponents: components.filter((c) => c.isStandalone).length,
    onPushComponents: components.filter((c) => c.changeDetection === "OnPush").length,
    signalInputs: components.reduce((sum, c) => sum + c.inputs.filter((i) => i.isSignal).length, 0),
    legacyInputs: components.reduce((sum, c) => sum + c.inputs.filter((i) => !i.isSignal).length, 0),
    modernControlFlow: components.filter((c) => c.controlFlowSyntax === "modern").length,
    legacyControlFlow: components.filter((c) => c.controlFlowSyntax === "legacy").length,
  };

  return {
    generatedAt: new Date().toISOString(),
    projectRoot: rootPath,
    summary,
    components,
    services,
    interfaces,
    enums,
    pipes,
    directives,
    guards,
    interceptors,
    routes,
    dependencyGraph,
    signalAdoptionReport,
    couplingReport,
  };
}
