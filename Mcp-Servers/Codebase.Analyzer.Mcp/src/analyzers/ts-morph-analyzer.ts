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

// ─── Angular HTTP Call Extraction ────────────────────────────────────────────

export interface HttpCallEntry {
  httpMethod: string;     // "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  urlPattern: string;     // first argument string / template literal
  containingClass: string;
  containingMethod: string;
  line: number;
}

export function extractHttpCalls(code: string, filename: string): HttpCallEntry[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filename, code);
  const entries: HttpCallEntry[] = [];
  const httpVerbs = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);

  sourceFile.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    if (!Node.isPropertyAccessExpression(expr)) return;
    const methodName = expr.getName().toLowerCase();
    if (!httpVerbs.has(methodName)) return;

    // Check the object is "http" or ends with ".http" (injected HttpClient)
    const objText = expr.getExpression().getText();
    if (!objText.endsWith("http") && !objText.endsWith("this.http") && !objText.includes("Http")) return;

    // Extract URL pattern from first argument
    const args = node.getArguments();
    let urlPattern = "(dynamic)";
    if (args.length > 0) {
      const first = args[0];
      if (Node.isStringLiteral(first) || Node.isNoSubstitutionTemplateLiteral(first)) {
        urlPattern = first.getLiteralValue();
      } else if (Node.isTemplateExpression(first)) {
        // Convert template literal to pattern — strip backtick syntax
        const raw = first.getHead().getText().replace(/^`/, "").replace(/\$\{$/, "");
        urlPattern = raw + "{...}";
      } else {
        urlPattern = first.getText().slice(0, 80);
      }
    }

    // Determine containing class and method
    let containingClass = "(module)";
    let containingMethod = "(top-level)";
    let current: Node | undefined = node.getParent();
    while (current) {
      if (Node.isMethodDeclaration(current) || Node.isArrowFunction(current) || Node.isFunctionDeclaration(current)) {
        if (Node.isMethodDeclaration(current)) containingMethod = current.getName() ?? "(anonymous)";
      }
      if (Node.isClassDeclaration(current)) {
        containingClass = current.getName() ?? "(anonymous)";
        break;
      }
      current = current.getParent();
    }

    entries.push({
      httpMethod: methodName.toUpperCase(),
      urlPattern,
      containingClass,
      containingMethod,
      line: node.getStartLineNumber(),
    });
  });

  return entries;
}

// ─── Angular Form Validator Extraction ───────────────────────────────────────

export interface AngularFormField {
  name: string;
  validators: string[];  // normalized: "required", "maxLength:100", "minLength:2", "email", "pattern:..."
  line: number;
}

export function extractAngularValidators(code: string, filename: string): AngularFormField[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(filename, code);
  const fields: AngularFormField[] = [];

  sourceFile.forEachDescendant((node) => {
    if (!Node.isCallExpression(node)) return;
    const expr = node.getExpression();
    const methodName = Node.isPropertyAccessExpression(expr) ? expr.getName() : "";
    if (methodName !== "group") return;

    const args = node.getArguments();
    if (args.length === 0) return;
    const firstArg = args[0];
    if (!Node.isObjectLiteralExpression(firstArg)) return;

    firstArg.getProperties().forEach((prop) => {
      if (!Node.isPropertyAssignment(prop)) return;
      const fieldName = prop.getNameNode().getText().replace(/['"]/g, "");
      const init = prop.getInitializer();
      const validators = init ? parseValidatorsFromText(init.getText()) : [];
      fields.push({ name: fieldName, validators, line: prop.getStartLineNumber() });
    });
  });

  // Also detect standalone FormControl / fb.control() patterns
  sourceFile.forEachDescendant((node) => {
    if (!Node.isNewExpression(node)) return;
    const typeName = node.getExpression().getText();
    if (typeName !== "FormControl") return;
    const args = node.getArguments();
    if (args.length < 2) return;
    // Try to infer field name from variable assignment context
    const parent = node.getParent();
    let fieldName = "(unknown)";
    if (Node.isVariableDeclaration(parent)) {
      fieldName = parent.getName();
    } else if (Node.isPropertyAssignment(parent) && Node.isPropertyAssignment(parent)) {
      fieldName = parent.getNameNode().getText().replace(/['"]/g, "");
    }
    const validators = parseValidatorsFromText(args[1].getText());
    if (validators.length > 0) {
      fields.push({ name: fieldName, validators, line: node.getStartLineNumber() });
    }
  });

  return fields;
}

function parseValidatorsFromText(text: string): string[] {
  const validators: string[] = [];
  if (/Validators\.required\b/.test(text)) validators.push("required");
  if (/Validators\.email\b/.test(text)) validators.push("email");
  const maxLen = text.match(/Validators\.maxLength\((\d+)\)/);
  if (maxLen) validators.push(`maxLength:${maxLen[1]}`);
  const minLen = text.match(/Validators\.minLength\((\d+)\)/);
  if (minLen) validators.push(`minLength:${minLen[1]}`);
  const maxVal = text.match(/Validators\.max\((\d+)\)/);
  if (maxVal) validators.push(`max:${maxVal[1]}`);
  const minVal = text.match(/Validators\.min\((\d+)\)/);
  if (minVal) validators.push(`min:${minVal[1]}`);
  const pattern = text.match(/Validators\.pattern\(([^)]+)\)/);
  if (pattern) validators.push(`pattern:${pattern[1].trim().replace(/['"]/g, "")}`);
  return validators;
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

export { getCompilerDiagnostics } from "../features/ts-compiler-diagnostics.js";
