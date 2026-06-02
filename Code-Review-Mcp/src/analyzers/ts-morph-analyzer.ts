import { Project, SyntaxKind, Node, ClassDeclaration, SourceFile } from "ts-morph";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TsMorphMetadata {
  filename: string;
  classes: ClassMeta[];
  imports: ImportMeta[];
  solidViolations: SolidViolation[];
  angularMeta?: AngularMeta;
  metrics: FileMetrics;
}

export interface ClassMeta {
  name: string;
  lineStart: number;
  methodCount: number;
  propertyCount: number;
  constructorDeps: string[];       // injected via constructor
  injectDeps: string[];            // injected via inject()
  implementedInterfaces: string[];
  extendedClass: string | null;
  decorators: string[];
  unusedMethods: string[];
  longMethods: { name: string; lines: number }[];
}

export interface ImportMeta {
  moduleSpecifier: string;
  namedImports: string[];
  isAngularCore: boolean;
  isThirdParty: boolean;
  isRelative: boolean;
}

export interface SolidViolation {
  principle: "SRP" | "OCP" | "LSP" | "ISP" | "DIP";
  severity: "critical" | "warning" | "suggestion";
  className: string;
  line: number;
  description: string;
  evidence: string;
}

export interface AngularMeta {
  componentSelector?: string;
  changeDetection?: string;       // "OnPush" | "Default"
  isStandalone?: boolean;
  inputs: { name: string; isSignal: boolean; line: number }[];
  outputs: { name: string; isSignal: boolean; line: number }[];
  hasHttpClientInComponent: boolean;
  hasBusinessLogicInComponent: boolean;
  usesNewKeyword: boolean;        // DIP: new ConcreteService() instead of inject()
  usesAsyncPipe: boolean;
  hasTrackBy: boolean;
  controlFlowSyntax: "modern" | "legacy" | "none"; // @if vs *ngIf
  lifecycleHooks: string[];
}

export interface FileMetrics {
  totalLines: number;
  classCount: number;
  interfaceCount: number;
  avgMethodsPerClass: number;
  maxMethodLines: number;
  importCount: number;
  concernCount: number;          // estimated distinct responsibilities
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export function analyzeTypeScript(code: string, filename: string): TsMorphMetadata {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filename, code);

  const classes = analyzeClasses(sourceFile);
  const imports = analyzeImports(sourceFile);
  const solidViolations = detectSolidViolations(classes, imports, sourceFile);
  const angularMeta = detectAngularMeta(sourceFile, classes, code);
  const metrics = computeMetrics(sourceFile, classes, imports);

  return { filename, classes, imports, solidViolations, angularMeta, metrics };
}

// ─── Class Analysis ───────────────────────────────────────────────────────────

function analyzeClasses(sourceFile: SourceFile): ClassMeta[] {
  return sourceFile.getClasses().map((cls) => {
    const methods = cls.getMethods();
    const constructorDeps = extractConstructorDeps(cls);
    const injectDeps = extractInjectDeps(cls);

    const longMethods = methods
      .map((m) => ({
        name: m.getName() ?? "(anonymous)",
        lines: (m.getEndLineNumber() - m.getStartLineNumber()),
      }))
      .filter((m) => m.lines > 25);

    // Detect methods that are declared but never called within same class
    const methodNames = new Set(methods.map((m) => m.getName()));
    const calledMethods = new Set<string>();
    cls.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        if (Node.isPropertyAccessExpression(expr)) {
          const obj = expr.getExpression().getText();
          if (obj === "this") calledMethods.add(expr.getName());
        }
      }
    });
    const unusedMethods = [...methodNames].filter(
      (n) => n && !calledMethods.has(n) && !["ngOnInit","ngOnDestroy","ngAfterViewInit","ngOnChanges","constructor"].includes(n ?? "")
    ) as string[];

    return {
      name: cls.getName() ?? "(anonymous)",
      lineStart: cls.getStartLineNumber(),
      methodCount: methods.length,
      propertyCount: cls.getProperties().length,
      constructorDeps,
      injectDeps,
      implementedInterfaces: cls.getImplements().map((i) => i.getText()),
      extendedClass: cls.getExtends()?.getText() ?? null,
      decorators: cls.getDecorators().map((d) => d.getName()),
      unusedMethods,
      longMethods,
    };
  });
}

function extractConstructorDeps(cls: ClassDeclaration): string[] {
  const ctor = cls.getConstructors()[0];
  if (!ctor) return [];
  return ctor.getParameters().map((p) => {
    const typeNode = p.getTypeNode();
    return typeNode ? typeNode.getText() : p.getName();
  });
}

function extractInjectDeps(cls: ClassDeclaration): string[] {
  const deps: string[] = [];
  cls.getProperties().forEach((prop) => {
    const init = prop.getInitializer();
    if (init && Node.isCallExpression(init)) {
      const expr = init.getExpression().getText();
      if (expr === "inject") {
        const args = init.getArguments();
        if (args.length > 0) deps.push(args[0].getText());
      }
    }
  });
  return deps;
}

// ─── Import Analysis ──────────────────────────────────────────────────────────

function analyzeImports(sourceFile: SourceFile): ImportMeta[] {
  return sourceFile.getImportDeclarations().map((imp) => {
    const spec = imp.getModuleSpecifierValue();
    return {
      moduleSpecifier: spec,
      namedImports: imp.getNamedImports().map((n) => n.getName()),
      isAngularCore: spec.startsWith("@angular/"),
      isThirdParty: !spec.startsWith(".") && !spec.startsWith("/"),
      isRelative: spec.startsWith("."),
    };
  });
}

// ─── SOLID Violation Detection ────────────────────────────────────────────────

function detectSolidViolations(
  classes: ClassMeta[],
  imports: ImportMeta[],
  sourceFile: SourceFile
): SolidViolation[] {
  const violations: SolidViolation[] = [];

  for (const cls of classes) {
    // ── SRP: Too many responsibilities ────────────────────────────────────────
    const concernImports = imports.filter((i) => i.isThirdParty || i.isAngularCore);
    const httpImport = imports.find((i) => i.namedImports.includes("HttpClient"));
    const routerImport = imports.find((i) => i.namedImports.includes("Router"));
    const formImport = imports.find((i) => i.namedImports.includes("FormBuilder"));

    const isComponent = cls.decorators.includes("Component");
    if (isComponent && httpImport && (routerImport || formImport)) {
      violations.push({
        principle: "SRP",
        severity: "warning",
        className: cls.name,
        line: cls.lineStart,
        description: "Component directly handles HTTP, routing, and/or form logic. Move to dedicated services.",
        evidence: `Imports: ${[httpImport, routerImport, formImport].filter(Boolean).map((i) => i!.namedImports.join(", ")).join(", ")}`,
      });
    }

    if (cls.methodCount > 10) {
      violations.push({
        principle: "SRP",
        severity: cls.methodCount > 20 ? "critical" : "warning",
        className: cls.name,
        line: cls.lineStart,
        description: `Class has ${cls.methodCount} methods — likely handles multiple responsibilities.`,
        evidence: `Method count: ${cls.methodCount}`,
      });
    }

    // ── DIP: new ConcreteClass() instead of inject() ──────────────────────────
    const cls_node = sourceFile.getClass(cls.name);
    if (cls_node) {
      cls_node.forEachDescendant((node) => {
        if (Node.isNewExpression(node)) {
          const typeName = node.getExpression().getText();
          // Ignore Angular built-ins and primitive wrappers
          const ignoredNews = ["Date", "FormGroup", "FormControl", "FormArray", "Subject", "BehaviorSubject", "EventEmitter", "HttpHeaders", "HttpParams"];
          if (!ignoredNews.includes(typeName) && /^[A-Z]/.test(typeName)) {
            violations.push({
              principle: "DIP",
              severity: "warning",
              className: cls.name,
              line: node.getStartLineNumber(),
              description: `Direct instantiation of "${typeName}" violates DIP. Use inject() or DI token instead.`,
              evidence: `new ${typeName}(...)`,
            });
          }
        }
      });
    }

    // ── ISP: Interface with too many methods ──────────────────────────────────
    if (cls.implementedInterfaces.length > 0) {
      sourceFile.getInterfaces().forEach((iface) => {
        if (iface.getMethods().length > 7) {
          violations.push({
            principle: "ISP",
            severity: "suggestion",
            className: iface.getName(),
            line: iface.getStartLineNumber(),
            description: `Interface "${iface.getName()}" has ${iface.getMethods().length} methods — consider splitting into smaller interfaces.`,
            evidence: iface.getMethods().map((m) => m.getName()).join(", "),
          });
        }
      });
    }

    // ── OCP: Switch/if-else chains on type strings ────────────────────────────
    const cls_node2 = sourceFile.getClass(cls.name);
    if (cls_node2) {
      let switchCount = 0;
      cls_node2.forEachDescendant((node) => {
        if (Node.isSwitchStatement(node)) switchCount++;
      });
      if (switchCount >= 2) {
        violations.push({
          principle: "OCP",
          severity: "suggestion",
          className: cls.name,
          line: cls.lineStart,
          description: `${switchCount} switch statements found. Consider Strategy pattern or polymorphism to avoid modifying this class for new types.`,
          evidence: `${switchCount} switch statements`,
        });
      }
    }

    // ── LSP: Override without calling super + changing behavior ───────────────
    if (cls.extendedClass) {
      const cls_node3 = sourceFile.getClass(cls.name);
      cls_node3?.getMethods().forEach((method) => {
        const body = method.getBody()?.getText() ?? "";
        const hasSuper = body.includes("super.");
        const throwsNotImpl = body.includes("throw new Error") || body.includes("throw new NotImplemented");
        if (throwsNotImpl) {
          violations.push({
            principle: "LSP",
            severity: "critical",
            className: cls.name,
            line: method.getStartLineNumber(),
            description: `Method "${method.getName()}" throws unconditionally in a subclass, violating LSP substitutability.`,
            evidence: `extends ${cls.extendedClass}, method throws`,
          });
        }
      });
    }
  }

  return violations;
}

// ─── Angular-specific Metadata ────────────────────────────────────────────────

function detectAngularMeta(
  sourceFile: SourceFile,
  classes: ClassMeta[],
  rawCode: string
): AngularMeta | undefined {
  const componentClass = classes.find((c) => c.decorators.includes("Component"));
  if (!componentClass) return undefined;

  const cls = sourceFile.getClass(componentClass.name);
  if (!cls) return undefined;

  // Read @Component decorator args
  const decorator = cls.getDecorator("Component");
  const decoratorText = decorator?.getArguments()[0]?.getText() ?? "";

  const changeDetection = decoratorText.includes("OnPush") ? "OnPush" : "Default";
  const isStandalone = decoratorText.includes("standalone: true");
  const selector = decoratorText.match(/selector:\s*['"`]([^'"`]+)['"`]/)?.[1];

  // @Input() / input() signal detection
  const inputs: AngularMeta["inputs"] = [];
  const outputs: AngularMeta["outputs"] = [];

  cls.getProperties().forEach((prop) => {
    const hasInputDecorator = prop.getDecorators().some((d) => d.getName() === "Input");
    const hasOutputDecorator = prop.getDecorators().some((d) => d.getName() === "Output");
    const init = prop.getInitializer();
    const initText = init?.getText() ?? "";
    const isInputSignal = initText.startsWith("input(") || initText.startsWith("input.required(");
    const isOutputSignal = initText.startsWith("output(");

    if (hasInputDecorator || isInputSignal) {
      inputs.push({ name: prop.getName(), isSignal: isInputSignal, line: prop.getStartLineNumber() });
    }
    if (hasOutputDecorator || isOutputSignal) {
      outputs.push({ name: prop.getName(), isSignal: isOutputSignal, line: prop.getStartLineNumber() });
    }
  });

  // Detect HttpClient directly in component (SRP violation)
  const allDeps = [...componentClass.constructorDeps, ...componentClass.injectDeps];
  const hasHttpClientInComponent = allDeps.some((d) => d.includes("HttpClient"));

  // Detect business logic heuristic: many private methods in component
  const hasBusinessLogicInComponent = componentClass.methodCount > 6;

  // Detect new ConcreteService() in component
  let usesNewKeyword = false;
  cls.forEachDescendant((node) => {
    if (Node.isNewExpression(node)) {
      const name = node.getExpression().getText();
      if (/Service|Repository|Client|Manager/.test(name)) usesNewKeyword = true;
    }
  });

  // Control flow syntax
  const usesModernCF = rawCode.includes("@if") || rawCode.includes("@for") || rawCode.includes("@switch");
  const usesLegacyCF = rawCode.includes("*ngIf") || rawCode.includes("*ngFor") || rawCode.includes("*ngSwitch");
  const controlFlowSyntax = usesModernCF ? "modern" : usesLegacyCF ? "legacy" : "none";

  // Lifecycle hooks
  const lifecycleHooks = cls.getMethods()
    .map((m) => m.getName())
    .filter((n) => ["ngOnInit","ngOnDestroy","ngAfterViewInit","ngOnChanges","ngDoCheck","ngAfterContentInit"].includes(n ?? "")) as string[];

  return {
    componentSelector: selector,
    changeDetection,
    isStandalone,
    inputs,
    outputs,
    hasHttpClientInComponent,
    hasBusinessLogicInComponent,
    usesNewKeyword,
    usesAsyncPipe: rawCode.includes("| async"),
    hasTrackBy: rawCode.includes("trackBy") || rawCode.includes("track "),
    controlFlowSyntax,
    lifecycleHooks,
  };
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function computeMetrics(
  sourceFile: SourceFile,
  classes: ClassMeta[],
  imports: ImportMeta[]
): FileMetrics {
  const totalMethods = classes.reduce((sum, c) => sum + c.methodCount, 0);
  const maxMethodLines = Math.max(0, ...classes.flatMap((c) => c.longMethods.map((m) => m.lines)));

  // Rough concern count: distinct top-level import domains
  const domains = new Set(imports.map((i) => i.moduleSpecifier.split("/")[0]));

  return {
    totalLines: sourceFile.getEndLineNumber(),
    classCount: classes.length,
    interfaceCount: sourceFile.getInterfaces().length,
    avgMethodsPerClass: classes.length > 0 ? Math.round(totalMethods / classes.length) : 0,
    maxMethodLines,
    importCount: imports.length,
    concernCount: domains.size,
  };
}
