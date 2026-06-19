// new-tools.ts — Implementation helpers for new MCP tools:
//   scout_symbol, scout_scope, analyze_slice_impact,
//   find_angular_route, find_angular_guard, find_dotnet_endpoint,
//   find_di_registration, analyze_planning_inventory, trace_api_contract,
//   find_api_consumers

import { existsSync, readdirSync, readFileSync } from "fs";
import { join, extname, resolve } from "path";
import { indexAngularProjectCached } from "../indexers/angular-indexer-runner.js";
import { resolveDotnetIndex } from "../indexers/dotnet-indexer-runner.js";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ScoutSymbolEntry {
  name: string;
  kind: string;
  filePath: string;
  line: number;
  summary: string;
  projectPath: string;
  referencesCount?: number;
}

export interface ScoutSymbolResult {
  found: boolean;
  symbols: ScoutSymbolEntry[];
  indexUsed: boolean;
  filesystemFallbackUsed: boolean;
  suggestedReads: string[];
}

export interface RouteEntry {
  routePath: string;
  component: string | null;
  filePath: string;
  line: number;
  guards?: string[];
}

export interface GuardEntry {
  name: string;
  filePath: string;
  line: number;
  canActivate?: boolean;
  canActivateChild?: boolean;
}

export interface EndpointEntry {
  controller: string;
  action: string;
  httpMethod: string;
  routeTemplate: string;
  filePath: string;
  line: number;
}

export interface DiRegistrationEntry {
  service: string;
  lifetime: string;
  filePath: string;
  line: number;
  registrationPattern: string;
}

export interface ApiConsumerEntry {
  filePath: string;
  line: number;
  httpCall: string;
  method: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function walkFiles(dir: string, extensions: string[], maxDepth = 8, currentDepth = 0): string[] {
  if (currentDepth > maxDepth) return [];
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "bin", "obj", ".angular", "coverage"].includes(entry.name)) continue;
        results.push(...walkFiles(fullPath, extensions, maxDepth, currentDepth + 1));
      } else if (extensions.includes(extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch { /* skip unreadable dirs */ }
  return results;
}

function inferKind(name: string, filePath: string): string {
  const fp = filePath.toLowerCase();
  if (fp.includes(".service.")) return "service";
  if (fp.includes(".component.")) return "component";
  if (fp.includes(".guard.")) return "guard";
  if (fp.includes(".pipe.")) return "pipe";
  if (fp.includes(".directive.")) return "directive";
  if (fp.includes(".interceptor.")) return "interceptor";
  if (fp.endsWith(".cs")) {
    if (name.endsWith("Controller")) return "controller";
    if (name.endsWith("Service")) return "service";
    if (name.endsWith("Repository")) return "repository";
    if (name.startsWith("I") && name.length > 1 && name[1] === name[1].toUpperCase()) return "interface";
    return "class";
  }
  if (name.startsWith("I") && name.length > 1) return "interface";
  return "class";
}

function buildSummary(entry: { kind: string; name: string; filePath: string }): string {
  const kindLabel: Record<string, string> = {
    service: "Injectable service",
    component: "Angular component",
    guard: "Route guard",
    pipe: "Angular pipe",
    directive: "Angular directive",
    interceptor: "HTTP interceptor",
    controller: "API controller",
    repository: "Data repository",
    interface: "Interface definition",
    class: "Class",
  };
  return `${kindLabel[entry.kind] ?? "Symbol"} — ${entry.name}`;
}

function suggestedReads(symbols: ScoutSymbolEntry[]): string[] {
  const reads = new Set<string>();
  for (const s of symbols.slice(0, 3)) {
    reads.add("read_class_summary");
    if (s.kind === "service" || s.kind === "controller") reads.add("read_method:search");
    if (s.kind === "component") reads.add("analyze_component_test_coverage");
  }
  return Array.from(reads);
}

// ─── scout_symbol ──────────────────────────────────────────────────────────────

export function scoutSymbol(
  query: string,
  projectPath: string,
  type: "angular" | "dotnet" | "auto",
  format: "paths_only" | "compact" | "full",
  fallbackToFilesystem: boolean,
  includeReferencesCount: boolean,
): ScoutSymbolResult {
  const absPath = resolve(projectPath);
  const q = query.toLowerCase();
  const symbols: ScoutSymbolEntry[] = [];
  let indexUsed = false;
  let filesystemFallbackUsed = false;

  // Detect type
  let detectedType = type;
  if (type === "auto") {
    if (existsSync(join(absPath, "angular.json")) || existsSync(join(absPath, "project.json"))) {
      detectedType = "angular";
    } else {
      detectedType = "dotnet";
    }
  }

  // Try index first
  try {
    if (detectedType === "angular") {
      const index = indexAngularProjectCached(absPath, true);
      indexUsed = true;
      const match = (name: string) => name.toLowerCase().includes(q);
      for (const c of index.components.filter((c) => match(c.name)))
        symbols.push({ name: c.name, kind: "component", filePath: c.file, line: c.line, summary: buildSummary({ kind: "component", name: c.name, filePath: c.file }), projectPath: absPath });
      for (const s of index.services.filter((s) => match(s.name)))
        symbols.push({ name: s.name, kind: "service", filePath: s.file, line: s.line, summary: buildSummary({ kind: "service", name: s.name, filePath: s.file }), projectPath: absPath });
      for (const i of index.interfaces.filter((i) => match(i.name)))
        symbols.push({ name: i.name, kind: "interface", filePath: i.file, line: i.line, summary: buildSummary({ kind: "interface", name: i.name, filePath: i.file }), projectPath: absPath });
      for (const p of index.pipes.filter((p) => match(p.name)))
        symbols.push({ name: p.name, kind: "pipe", filePath: p.file, line: p.line, summary: buildSummary({ kind: "pipe", name: p.name, filePath: p.file }), projectPath: absPath });
      for (const g of index.guards.filter((g) => match(g.name)))
        symbols.push({ name: g.name, kind: "guard", filePath: g.file, line: g.line, summary: buildSummary({ kind: "guard", name: g.name, filePath: g.file }), projectPath: absPath });
    } else {
      const index = resolveDotnetIndex(absPath, true);
      indexUsed = true;
      const match = (name: string) => name.toLowerCase().includes(q);
      for (const c of index.classes.filter((c) => match(c.name)))
        symbols.push({ name: c.name, kind: inferKind(c.name, c.file), filePath: c.file, line: c.line, summary: buildSummary({ kind: inferKind(c.name, c.file), name: c.name, filePath: c.file }), projectPath: absPath });
      for (const i of index.interfaces.filter((i) => match(i.name)))
        symbols.push({ name: i.name, kind: "interface", filePath: i.file, line: i.line, summary: buildSummary({ kind: "interface", name: i.name, filePath: i.file }), projectPath: absPath });
      for (const r of index.records.filter((r) => match(r.name)))
        symbols.push({ name: r.name, kind: "record", filePath: r.file, line: 0, summary: `Record/DTO — ${r.name}`, projectPath: absPath });
    }
  } catch {
    indexUsed = false;
  }

  // Filesystem fallback
  if (symbols.length === 0 && fallbackToFilesystem) {
    filesystemFallbackUsed = true;
    const extensions = detectedType === "angular" ? [".ts"] : [".cs"];
    const files = walkFiles(absPath, extensions);
    const namePattern = query.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const filePath of files) {
      const base = filePath.split(/[\\/]/).pop()!.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!base.includes(namePattern)) continue;
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const classMatch = line.match(/(?:export\s+(?:abstract\s+)?class|export\s+interface|export\s+enum)\s+(\w+)/);
          if (classMatch && classMatch[1].toLowerCase().includes(q)) {
            const name = classMatch[1];
            const kind = inferKind(name, filePath);
            symbols.push({ name, kind, filePath, line: i + 1, summary: buildSummary({ kind, name, filePath }), projectPath: absPath });
          }
        }
      } catch { /* skip */ }
      if (symbols.length >= 20) break;
    }
  }

  if (includeReferencesCount) {
    // Basic reference count via grep-style scan
    for (const sym of symbols) {
      try {
        const extensions = detectedType === "angular" ? [".ts", ".html"] : [".cs"];
        const files = walkFiles(absPath, extensions, 6);
        let count = 0;
        for (const f of files) {
          if (f === sym.filePath) continue;
          try {
            const content = readFileSync(f, "utf-8");
            const matches = content.match(new RegExp(`\\b${sym.name}\\b`, "g"));
            if (matches) count += matches.length;
          } catch { /* skip */ }
        }
        sym.referencesCount = count;
      } catch { /* skip */ }
    }
  }

  return {
    found: symbols.length > 0,
    symbols: symbols.slice(0, 20),
    indexUsed,
    filesystemFallbackUsed,
    suggestedReads: suggestedReads(symbols),
  };
}

// ─── scout_scope ───────────────────────────────────────────────────────────────

export interface ScoutQuestion {
  id: string;
  query: string;
  type?: string;
  project_path?: string;
}

export interface ScoutScopeRow {
  id: string;
  query: string;
  strategy: string;
  mcp: string;
  tool: string;
  result: string;
  nextStep: string;
}

export function scoutScope(
  questions: ScoutQuestion[],
  defaultProjectPath: string,
  defaultType: "angular" | "dotnet" | "auto",
  format: "scout_table" | "compact" | "full",
): { rows: ScoutScopeRow[]; markdown: string } {
  const rows: ScoutScopeRow[] = [];

  for (const q of questions) {
    const projectPath = q.project_path ?? defaultProjectPath;
    const type = (q.type as "angular" | "dotnet" | "auto" | undefined) ?? defaultType;
    const result = scoutSymbol(q.query, projectPath, type, "compact", true, false);

    const strategy = result.indexUsed ? "index" : result.filesystemFallbackUsed ? "filesystem" : "none";
    const resultStr = result.found
      ? `${result.symbols.length} Treffer: ${result.symbols[0].filePath.split(/[\\/]/).pop()}:${result.symbols[0].line}`
      : "kein Treffer";
    const nextStep = result.found && result.suggestedReads.length > 0 ? result.suggestedReads[0] : "-";

    rows.push({
      id: q.id,
      query: q.query,
      strategy,
      mcp: "codebase-analyzer",
      tool: "scout_symbol",
      result: resultStr,
      nextStep,
    });
  }

  let markdown = "";
  if (format === "scout_table") {
    markdown = "| # | Ziel / Repo-Frage | Strategie | MCP | Tool | Ergebnis | Nächster Schritt |\n";
    markdown += "|---|-------------------|-----------|-----|------|----------|------------------|\n";
    for (const row of rows) {
      markdown += `| ${row.id} | ${row.query} | ${row.strategy} | ${row.mcp} | ${row.tool} | ${row.result} | ${row.nextStep} |\n`;
    }
  } else {
    markdown = rows.map((r) => `${r.id}: ${r.query} → ${r.result}`).join("\n");
  }

  return { rows, markdown };
}

// ─── find_angular_route ────────────────────────────────────────────────────────

export function findAngularRoute(
  projectPath: string,
  routePath: string,
): { routes: RouteEntry[]; truncated: boolean } {
  const absPath = resolve(projectPath);
  const q = routePath.toLowerCase();
  const routes: RouteEntry[] = [];

  // Try index first
  try {
    const index = indexAngularProjectCached(absPath, true);
    for (const r of index.routes) {
      if (r.path.toLowerCase().includes(q)) {
        routes.push({
          routePath: r.path,
          component: r.component ?? null,
          filePath: r.file,
          line: 0,
          guards: r.guards,
        });
      }
    }
  } catch { /* ignore */ }

  // Filesystem fallback if no index results
  if (routes.length === 0) {
    const files = walkFiles(absPath, [".ts"]);
    const pathPat = new RegExp(`path:\\s*['"\`]([^'"\`]*${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^'"\`]*)['"\`]`, "i");
    for (const filePath of files) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(pathPat);
          if (m) {
            // Try to find component on same or nearby line
            const block = lines.slice(Math.max(0, i - 1), i + 5).join(" ");
            const compMatch = block.match(/component:\s*(\w+)/);
            routes.push({
              routePath: m[1],
              component: compMatch ? compMatch[1] : null,
              filePath,
              line: i + 1,
            });
          }
        }
      } catch { /* skip */ }
      if (routes.length >= 20) break;
    }
  }

  const truncated = routes.length > 20;
  return { routes: routes.slice(0, 20), truncated };
}

// ─── find_angular_guard ────────────────────────────────────────────────────────

export function findAngularGuard(
  projectPath: string,
  guardName: string,
): { guards: GuardEntry[]; truncated: boolean } {
  const absPath = resolve(projectPath);
  const q = guardName.toLowerCase();
  const guards: GuardEntry[] = [];

  // Try index first
  try {
    const index = indexAngularProjectCached(absPath, true);
    for (const g of index.guards) {
      if (g.name.toLowerCase().includes(q)) {
        guards.push({
          name: g.name,
          filePath: g.file,
          line: g.line,
          canActivate: g.guardType.includes("CanActivate"),
          canActivateChild: g.guardType.includes("CanActivateChild"),
        });
      }
    }
  } catch { /* ignore */ }

  // Filesystem fallback
  if (guards.length === 0) {
    const files = walkFiles(absPath, [".ts"]);
    for (const filePath of files) {
      if (!filePath.toLowerCase().includes("guard")) continue;
      try {
        const content = readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const classMatch = lines[i].match(/export\s+(?:class|function|const)\s+(\w+)/);
          if (classMatch && classMatch[1].toLowerCase().includes(q)) {
            guards.push({
              name: classMatch[1],
              filePath,
              line: i + 1,
              canActivate: content.includes("canActivate"),
              canActivateChild: content.includes("canActivateChild"),
            });
          }
        }
      } catch { /* skip */ }
    }
  }

  const truncated = guards.length > 20;
  return { guards: guards.slice(0, 20), truncated };
}

// ─── find_dotnet_endpoint ──────────────────────────────────────────────────────

const HTTP_VERBS = ["HttpGet", "HttpPost", "HttpPut", "HttpDelete", "HttpPatch", "HttpOptions", "HttpHead"];

export function findDotnetEndpoint(
  projectPath: string,
  routeOrAction: string,
): { endpoints: EndpointEntry[]; truncated: boolean } {
  const absPath = resolve(projectPath);
  const q = routeOrAction.toLowerCase();
  const endpoints: EndpointEntry[] = [];

  // Try index to get controller file paths, then do targeted filesystem scan
  const controllerFiles = new Set<string>();
  try {
    const index = resolveDotnetIndex(absPath, true);
    for (const cls of index.classes) {
      const isController = cls.name.endsWith("Controller") ||
        cls.attributes.some((a: string) => a.includes("ApiController") || a.includes("Controller"));
      if (isController) controllerFiles.add(cls.file);
    }
  } catch { /* ignore */ }

  // Filesystem fallback (or targeted scan using index-discovered files)
  const filesToScan = controllerFiles.size > 0
    ? Array.from(controllerFiles).filter((f) => existsSync(f))
    : walkFiles(absPath, [".cs"]);

  if (filesToScan.length > 0 || endpoints.length === 0) {
    for (const filePath of filesToScan) {
      try {
        const content = readFileSync(filePath, "utf-8");
        if (!content.includes("Controller")) continue;
        const lines = content.split("\n");
        let currentController = "";
        for (let i = 0; i < lines.length; i++) {
          const classMatch = lines[i].match(/class\s+(\w+Controller)/);
          if (classMatch) currentController = classMatch[1];
          for (const verb of HTTP_VERBS) {
            if (lines[i].includes(`[${verb}`)) {
              const methodLine = lines.slice(i + 1, i + 4).find((l) => l.match(/\w+\s+\w+\s*\(/));
              const methodMatch = methodLine?.match(/(?:public|private|protected)?\s+\w+\s+(\w+)\s*\(/);
              const routeMatch = lines[i].match(/["']([^"']+)["']/);
              const methodName = methodMatch ? methodMatch[1] : "unknown";
              const route = routeMatch ? routeMatch[1] : methodName;
              if (route.toLowerCase().includes(q) || methodName.toLowerCase().includes(q)) {
                endpoints.push({
                  controller: currentController,
                  action: methodName,
                  httpMethod: verb.replace("Http", ""),
                  routeTemplate: route,
                  filePath,
                  line: i + 1,
                });
              }
            }
          }
        }
      } catch { /* skip */ }
      if (endpoints.length >= 20) break;
    }
  }

  const truncated = endpoints.length > 20;
  return { endpoints: endpoints.slice(0, 20), truncated };
}

// ─── find_di_registration ──────────────────────────────────────────────────────

const DI_PATTERNS = [
  { pattern: /AddSingleton<[^>]*>/, lifetime: "Singleton" },
  { pattern: /AddScoped<[^>]*>/, lifetime: "Scoped" },
  { pattern: /AddTransient<[^>]*>/, lifetime: "Transient" },
  { pattern: /AddSingleton\(/, lifetime: "Singleton" },
  { pattern: /AddScoped\(/, lifetime: "Scoped" },
  { pattern: /AddTransient\(/, lifetime: "Transient" },
];

export function findDiRegistration(
  projectPath: string,
  serviceName: string,
): { registrations: DiRegistrationEntry[]; truncated: boolean } {
  const absPath = resolve(projectPath);
  const q = serviceName.toLowerCase();
  const registrations: DiRegistrationEntry[] = [];

  const files = walkFiles(absPath, [".cs"]);
  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      if (!content.toLowerCase().includes(q)) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.toLowerCase().includes(q)) continue;
        for (const { pattern, lifetime } of DI_PATTERNS) {
          if (pattern.test(line)) {
            registrations.push({
              service: serviceName,
              lifetime,
              filePath,
              line: i + 1,
              registrationPattern: line.trim(),
            });
            break;
          }
        }
      }
    } catch { /* skip */ }
    if (registrations.length >= 20) break;
  }

  const truncated = registrations.length > 20;
  return { registrations: registrations.slice(0, 20), truncated };
}

// ─── analyze_planning_inventory ───────────────────────────────────────────────

export interface PlanningInventoryResult {
  endpoints: EndpointEntry[];
  routes: RouteEntry[];
  dtos: string[];
  markdown: string;
}

export function analyzePlanningInventory(
  filePaths: string[],
  format: "compact" | "full",
): PlanningInventoryResult {
  const endpoints: EndpointEntry[] = [];
  const routes: RouteEntry[] = [];
  const dtos: string[] = [];

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) continue;
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const isCs = filePath.endsWith(".cs");
      const isTs = filePath.endsWith(".ts");

      if (isCs) {
        let currentController = "";
        for (let i = 0; i < lines.length; i++) {
          const classMatch = lines[i].match(/class\s+(\w+Controller)/);
          if (classMatch) currentController = classMatch[1];

          // DTOs: records and classes ending in Request/Response/Dto
          const dtoMatch = lines[i].match(/(?:public\s+)?(?:record|class)\s+(\w+(?:Request|Response|Dto|Model))\b/);
          if (dtoMatch && !dtos.includes(dtoMatch[1])) dtos.push(dtoMatch[1]);

          for (const verb of HTTP_VERBS) {
            if (lines[i].includes(`[${verb}`)) {
              const routeMatch = lines[i].match(/["']([^"']+)["']/);
              const methodLine = lines.slice(i + 1, i + 4).find((l) => l.match(/(?:public|private)\s+\w+\s+\w+\s*\(/));
              const methodMatch = methodLine?.match(/(?:public|private|protected)?\s+\w+\s+(\w+)\s*\(/);
              endpoints.push({
                controller: currentController,
                action: methodMatch ? methodMatch[1] : "unknown",
                httpMethod: verb.replace("Http", ""),
                routeTemplate: routeMatch ? routeMatch[1] : "",
                filePath,
                line: i + 1,
              });
            }
          }
        }
      }

      if (isTs) {
        for (let i = 0; i < lines.length; i++) {
          // Angular routes
          const routeMatch = lines[i].match(/path:\s*['"`]([^'"`]*)['"`]/);
          if (routeMatch) {
            const block = lines.slice(Math.max(0, i - 1), i + 5).join(" ");
            const compMatch = block.match(/component:\s*(\w+)/);
            routes.push({
              routePath: routeMatch[1],
              component: compMatch ? compMatch[1] : null,
              filePath,
              line: i + 1,
            });
          }

          // TS interfaces as DTOs
          const ifaceMatch = lines[i].match(/export\s+interface\s+(\w+)/);
          if (ifaceMatch && !dtos.includes(ifaceMatch[1])) dtos.push(ifaceMatch[1]);
        }
      }
    } catch { /* skip */ }
  }

  // Build markdown
  const lines: string[] = [];
  if (endpoints.length > 0) {
    lines.push("## HTTP Endpoints\n");
    lines.push("| Controller | Action | Verb | Route |");
    lines.push("|---|---|---|---|");
    for (const e of endpoints) {
      lines.push(`| ${e.controller} | ${e.action} | ${e.httpMethod} | ${e.routeTemplate} |`);
    }
    lines.push("");
  }
  if (routes.length > 0) {
    lines.push("## Angular Routes\n");
    lines.push("| Path | Component |");
    lines.push("|---|---|");
    for (const r of routes) {
      lines.push(`| ${r.routePath} | ${r.component ?? "-"} |`);
    }
    lines.push("");
  }
  if (dtos.length > 0) {
    lines.push("## DTOs / Interfaces\n");
    lines.push(dtos.map((d) => `- ${d}`).join("\n"));
  }

  return { endpoints, routes, dtos, markdown: lines.join("\n") };
}

// ─── trace_api_contract ────────────────────────────────────────────────────────

export interface ApiContractResult {
  angularHttpCalls: Array<{ method: string; url: string; line: number; file: string }>;
  matchedEndpoints: EndpointEntry[];
  note: string;
}

export function traceApiContract(
  filePath: string,
): ApiContractResult {
  const absPath = resolve(filePath);
  const result: ApiContractResult = {
    angularHttpCalls: [],
    matchedEndpoints: [],
    note: "",
  };

  if (!existsSync(absPath)) {
    result.note = `File not found: ${absPath}`;
    return result;
  }

  try {
    const content = readFileSync(absPath, "utf-8");
    const lines = content.split("\n");
    const isCs = filePath.endsWith(".cs");
    const isTs = filePath.endsWith(".ts");

    if (isTs) {
      // Extract HttpClient calls
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const m = line.match(/\.(get|post|put|delete|patch)\s*(?:<[^>]*>)?\s*\(\s*[`'"](.*?)[`'"]/i);
        if (m) {
          result.angularHttpCalls.push({
            method: m[1].toUpperCase(),
            url: m[2],
            line: i + 1,
            file: absPath,
          });
        }
      }
      result.note = `Analyzed Angular service: ${result.angularHttpCalls.length} HTTP calls found.`;
    } else if (isCs) {
      // Extract endpoints from controller
      let currentController = "";
      for (let i = 0; i < lines.length; i++) {
        const classMatch = lines[i].match(/class\s+(\w+Controller)/);
        if (classMatch) currentController = classMatch[1];
        for (const verb of HTTP_VERBS) {
          if (lines[i].includes(`[${verb}`)) {
            const routeMatch = lines[i].match(/["']([^"']+)["']/);
            const methodLine = lines.slice(i + 1, i + 4).find((l) => l.match(/(?:public|private)\s+\w+\s+\w+\s*\(/));
            const methodMatch = methodLine?.match(/(?:public|private|protected)?\s+\w+\s+(\w+)\s*\(/);
            result.matchedEndpoints.push({
              controller: currentController,
              action: methodMatch ? methodMatch[1] : "unknown",
              httpMethod: verb.replace("Http", ""),
              routeTemplate: routeMatch ? routeMatch[1] : "",
              filePath: absPath,
              line: i + 1,
            });
          }
        }
      }
      result.note = `Analyzed .NET controller: ${result.matchedEndpoints.length} endpoints found.`;
    }
  } catch (e) {
    result.note = `Error reading file: ${(e as Error).message}`;
  }

  return result;
}

// ─── find_api_consumers ────────────────────────────────────────────────────────

export function findApiConsumers(
  projectPath: string,
  endpointPattern: string,
): { consumers: ApiConsumerEntry[]; truncated: boolean } {
  const absPath = resolve(projectPath);
  const q = endpointPattern.toLowerCase();
  const consumers: ApiConsumerEntry[] = [];

  const tsFiles = walkFiles(absPath, [".ts"]);
  for (const filePath of tsFiles) {
    try {
      const content = readFileSync(filePath, "utf-8");
      if (!content.toLowerCase().includes(q.replace(/\//g, ""))) continue;
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/\.(get|post|put|delete|patch)\s*(?:<[^>]*>)?\s*\(\s*[`'"](.*?)[`'"]/i);
        if (m && m[2].toLowerCase().includes(q)) {
          consumers.push({
            filePath,
            line: i + 1,
            httpCall: m[2],
            method: m[1].toUpperCase(),
          });
        }
      }
    } catch { /* skip */ }
    if (consumers.length >= 50) break;
  }

  const truncated = consumers.length > 50;
  return { consumers: consumers.slice(0, 50), truncated };
}
