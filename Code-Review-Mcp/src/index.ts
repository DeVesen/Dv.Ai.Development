import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { recordCall, startLogViewer } from "./logviewer.js";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { extname, resolve } from "path";
import { analyzeTypeScript, extractAngularValidators, extractHttpCalls, TsMorphMetadata, AngularFormField, HttpCallEntry } from "./analyzers/ts-morph-analyzer.js";
import { analyzeCSharp, RoslynMetadata, RoslynPropertyAnnotation } from "./analyzers/roslyn-runner.js";
import { indexAngularProjectCached, AngularProjectIndex } from "./indexers/angular-indexer-runner.js";
import { indexDotnetProject, DotnetProjectIndex } from "./indexers/dotnet-indexer-runner.js";
import {
  analyzeCyclomaticComplexity, analyzeDeadCode, analyzeNullability,
  analyzeDuplicates, analyzeRefactoringSafety, generateAutoFixes, analyzeCrossFileDataflow
} from "./features/ts-advanced-features.js";
import { runDotnetAdvancedAnalysis } from "./features/dotnet-advanced-runner.js";
import { analyzeClassSplits } from "./features/ts-class-split.js";
import { runDotnetSplitAnalysis } from "./features/dotnet-split-runner.js";
import {
  analyzeMaintainability, analyzeTypeGraph, analyzeControlFlow,
} from "./features/ts-code-intelligence.js";
import { runDotnetIntelligence } from "./features/dotnet-intelligence-runner.js";
import { parseLcov, parseCobertura } from "./features/coverage-parser.js";
import { analyzeAngularTestQuality } from "./features/test-quality-analyzer.js";
import { runDotnetTestQuality } from "./features/dotnet-test-quality-runner.js";

// ─── Language Detection ───────────────────────────────────────────────────────

type Language = "dotnet" | "angular" | "unknown";

function detectLanguage(filename: string, content: string): Language {
  const ext = extname(filename).toLowerCase();
  if ([".cs", ".csproj", ".sln", ".fsx", ".fs"].includes(ext)) return "dotnet";
  if ([".ts", ".html", ".scss", ".css"].includes(ext)) {
    if (
      content.includes("@Component") ||
      content.includes("@Injectable") ||
      content.includes("@NgModule") ||
      content.includes("@Pipe") ||
      content.includes("@Directive") ||
      filename.includes(".component.") ||
      filename.includes(".service.") ||
      filename.includes(".module.")
    )
      return "angular";
    if (ext === ".ts") return "angular";
  }
  return "unknown";
}

// ─── Metadata → Prompt Section ────────────────────────────────────────────────

function formatTsMorphSection(meta: TsMorphMetadata, compact = false): string {
  const lines: string[] = ["## AST Analysis (ts-morph)\n"];

  lines.push(`**Metrics:** ${meta.metrics.totalLines} lines | ${meta.metrics.classCount} classes | ${meta.metrics.importCount} imports | ~${meta.metrics.concernCount} concerns`);

  if (meta.solidViolations.length > 0) {
    lines.push("\n### Pre-detected SOLID Violations:");
    for (const v of meta.solidViolations) {
      lines.push(`- [${v.principle}] [${v.severity}] Line ${v.line} in \`${v.className}\`: ${v.description}`);
      lines.push(`  Evidence: \`${v.evidence}\``);
    }
  }

  if (meta.angularMeta) {
    const am = meta.angularMeta;
    lines.push("\n### Angular Component Metadata:");
    lines.push(`- ChangeDetection: **${am.changeDetection}** ${am.changeDetection === "Default" ? "⚠️ consider OnPush" : "✅"}`);
    lines.push(`- Standalone: ${am.isStandalone ? "✅ yes" : "⚠️ no (legacy NgModule)"}`);
    lines.push(`- Control Flow: ${am.controlFlowSyntax === "modern" ? "✅ @if/@for" : am.controlFlowSyntax === "legacy" ? "⚠️ *ngIf/*ngFor (migrate to @if/@for)" : "n/a"}`);
    lines.push(`- HttpClient in Component: ${am.hasHttpClientInComponent ? "⚠️ yes (SRP violation)" : "✅ no"}`);
    lines.push(`- Uses new keyword for services: ${am.usesNewKeyword ? "⚠️ yes (DIP violation)" : "✅ no"}`);

    const legacyInputs = am.inputs.filter((i) => !i.isSignal);
    const legacyOutputs = am.outputs.filter((o) => !o.isSignal);
    if (legacyInputs.length > 0)
      lines.push(`- Legacy @Input() (migrate to input() signal): ${legacyInputs.map((i) => `${i.name} (line ${i.line})`).join(", ")}`);
    if (legacyOutputs.length > 0)
      lines.push(`- Legacy @Output() (migrate to output() signal): ${legacyOutputs.map((o) => `${o.name} (line ${o.line})`).join(", ")}`);
  }

  for (const cls of meta.classes) {
    if (cls.longMethods.length > 0) {
      lines.push(`\n### Long Methods in \`${cls.name}\`:`);
      for (const m of cls.longMethods) {
        lines.push(`- \`${m.name}\`: ${m.lines} lines (max recommended: 25)`);
      }
    }
  }

  return lines.join("\n");
}

function formatRoslynSection(meta: RoslynMetadata, compact = false): string {
  if (meta.error) {
    return `## AST Analysis (Roslyn)\n⚠️ ${meta.error} — review based on code only.\n`;
  }

  const lines: string[] = ["## AST Analysis (Roslyn)\n"];
  lines.push(`**Metrics:** ${meta.metrics.totalClasses} classes | ${meta.metrics.totalInterfaces} interfaces | ${meta.metrics.totalUsings} usings | avg ${meta.metrics.avgMethodsPerClass.toFixed(1)} methods/class`);

  if (meta.solidViolations.length > 0) {
    if (compact) {
      const critCount = meta.solidViolations.filter((v) => v.severity === "critical").length;
      lines.push(`\n**SOLID Violations:** ${meta.solidViolations.length} (${critCount} critical) — use format:"full" for details`);
    } else {
      lines.push("\n### Pre-detected SOLID/Quality Violations:");
      for (const v of meta.solidViolations) {
        lines.push(`- [${v.principle}] [${v.severity}] Line ${v.line} in \`${v.className}\`: ${v.description}`);
        lines.push(`  Evidence: \`${v.evidence}\``);
      }
    }
  }

  if (meta.apiValidationIssues && meta.apiValidationIssues.length > 0) {
    const criticalCount = meta.apiValidationIssues.filter((i) => i.severity === "critical").length;
    lines.push(`\n### API Validation Issues (${meta.apiValidationIssues.length} found, ${criticalCount} critical):`);
    for (const issue of meta.apiValidationIssues) {
      const icon = issue.severity === "critical" ? "🔴" : "⚠️";
      lines.push(`- ${icon} [${issue.issueType}] Line ${issue.line} in \`${issue.className}\`${issue.methodName ? `::${issue.methodName}` : ""}: ${issue.description}`);
      if (!compact) lines.push(`  Evidence: \`${issue.evidence}\``);
    }
  }

  // Property annotations per class
  for (const cls of meta.classes) {
    if (cls.propertyAnnotations && cls.propertyAnnotations.length > 0) {
      const annotated = cls.propertyAnnotations.filter((p) => p.annotations.length > 0).length;
      const unannotated = cls.propertyAnnotations.filter((p) => p.annotations.length === 0);
      if (compact) {
        // One summary line instead of per-property list
        if (unannotated.length > 0) {
          lines.push(`\n**${cls.isRecord ? "Record" : "Class"} \`${cls.name}\`:** ${annotated}/${cls.propertyAnnotations.length} properties annotated — missing: ${unannotated.map((p) => p.propertyName).join(", ")}`);
        }
      } else {
        if (unannotated.length > 0 || annotated > 0) {
          lines.push(`\n### ${cls.isRecord ? "Record" : "Class"} \`${cls.name}\` — Properties:`);
          for (const prop of cls.propertyAnnotations) {
            const annStr = prop.annotations.length > 0 ? ` [${prop.annotations.join(", ")}]` : " ⚠️ no annotations";
            lines.push(`- \`${prop.type} ${prop.propertyName}\`${annStr}${prop.isPrimaryConstructorParam ? " (primary ctor)" : ""}`);
          }
        }
      }
    }
  }

  for (const cls of meta.classes) {
    const issues: string[] = [];
    if (cls.resultWaitLines.length > 0)
      issues.push(`⚠️ .Result/.Wait() on lines: ${cls.resultWaitLines.join(", ")} (deadlock risk)`);
    if (cls.hardcodedSecretLines.length > 0)
      issues.push(`🔴 Possible hardcoded secrets on lines: ${cls.hardcodedSecretLines.join(", ")}`);
    if (cls.deepNestingLines.length > 0)
      issues.push(`⚠️ Deep nesting (>3) in methods starting at lines: ${cls.deepNestingLines.join(", ")}`);
    if (cls.longMethods.length > 0) {
      if (compact) {
        issues.push(`⚠️ ${cls.longMethods.length} long method(s)`);
      } else {
        issues.push(`⚠️ Long methods: ${cls.longMethods.map((m) => `${m.name} (${m.lines} lines)`).join(", ")}`);
      }
    }

    if (issues.length > 0) {
      lines.push(`\n### Class \`${cls.name}\` (line ${cls.lineStart}):`);
      if (!compact) {
        lines.push(`- Deps: ${cls.constructorDeps.join(", ") || "none"}`);
        lines.push(`- Base types: ${cls.baseTypes.join(", ") || "none"}`);
      }
      issues.forEach((i) => lines.push(`- ${i}`));
    }
  }

  if (!compact && meta.interfaces.length > 0) {
    const bigInterfaces = meta.interfaces.filter((i) => i.methodCount > 7);
    if (bigInterfaces.length > 0) {
      lines.push("\n### ISP Candidates (large interfaces):");
      for (const iface of bigInterfaces) {
        lines.push(`- \`${iface.name}\` has ${iface.methodCount} methods — consider splitting (ISP)`);
      }
    }
  }

  return lines.join("\n");
}

// ─── Review Logic ─────────────────────────────────────────────────────────────

function performReview(
  code: string,
  filename: string,
  focusAreas: string[],
  format: "full" | "compact" = "full"
): string {
  const language = detectLanguage(filename, code);
  const compact = format === "compact";

  if (language === "unknown")
    return `File "${filename}" is not a recognized .NET or Angular file.`;

  const focusLine = focusAreas.length > 0 ? `Focus: ${focusAreas.join(", ")}\n\n` : "";

  if (language === "angular") {
    let meta: TsMorphMetadata;
    try {
      meta = analyzeTypeScript(code, filename);
    } catch (e) {
      return `## AST Analysis Failed\n⚠️ ${(e as Error).message}`;
    }
    const body = `# Code Analysis: ${filename} (Angular/TypeScript)\n${focusLine}${formatTsMorphSection(meta, compact)}`;
    return compact ? body : `${body}\n\n## Raw AST\n\`\`\`json\n${JSON.stringify(meta, null, 2)}\n\`\`\``;
  } else {
    const meta = analyzeCSharp(code, filename);
    const apiValidationNote = focusAreas.includes("api-validation") && meta.apiValidationIssues && meta.apiValidationIssues.length > 0
      ? `\n> **api-validation focus:** ${meta.apiValidationIssues.length} issue(s) found — see "API Validation Issues" section below.\n`
      : "";
    const body = `# Code Analysis: ${filename} (.NET/C#)\n${focusLine}${apiValidationNote}${formatRoslynSection(meta, compact)}`;
    return compact ? body : `${body}\n\n## Raw AST\n\`\`\`json\n${JSON.stringify(meta, null, 2)}\n\`\`\``;
  }
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({ name: "code-review-mcp", version: "2.2.0" });

// Auto-track all tool calls for the log viewer
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srv = server as any;
  const _orig = srv.tool.bind(server) as (...args: unknown[]) => unknown;
  srv.tool = (name: string, desc: string, schema: unknown, handler: (p: unknown) => unknown) =>
    _orig(name, desc, schema, async (p: unknown) => {
      const t0 = Date.now();
      const result = await (handler(p) as Promise<{ content: Array<{ type: string; text: string }> }>);
      const text = result?.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
      recordCall(name, p, text.length, Date.now() - t0, text.slice(0, 600));
      return result;
    });
}

const focusAreasSchema = z
  .array(z.enum(["solid", "security", "performance", "angular-best-practices", "api-validation"]))
  .default(["solid", "security", "performance", "angular-best-practices"])
  .describe("Which review categories to focus on. Use 'api-validation' to highlight missing DataAnnotations, unvalidated POST/PUT endpoints, and DTO contract issues.");

const formatSchema = z
  .enum(["full", "compact"])
  .default("full")
  .describe("'full' includes the Raw AST JSON block (complete metadata). 'compact' skips Raw AST and shortens per-property detail — ideal for planning inventories with many files. API Validation Issues are always shown in full regardless of format.");

server.tool(
  "review_file",
  "Review a single .cs, .ts, .html, or .scss file. Uses ts-morph (Angular) or Roslyn (.NET) for deep AST-based SOLID analysis before the LLM review.",
  {
    filePath: z.string().describe("Absolute or relative path to the file"),
    focusAreas: focusAreasSchema,
    format: formatSchema,
  },
  ({ filePath, focusAreas, format }) => {
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath))
      return { content: [{ type: "text", text: `File not found: ${absolutePath}` }], isError: true };
    const code = readFileSync(absolutePath, "utf-8");
    return { content: [{ type: "text", text: performReview(code, filePath, focusAreas, format) }] };
  }
);

server.tool(
  "review_code",
  "Review a code snippet inline. Specify filename for language detection.",
  {
    code: z.string().describe("Source code to review"),
    filename: z.string().describe('e.g. "UserService.cs" or "user.component.ts"'),
    focusAreas: focusAreasSchema,
    format: formatSchema,
  },
  ({ code, filename, focusAreas, format }) => {
    return { content: [{ type: "text", text: performReview(code, filename, focusAreas, format) }] };
  }
);

server.tool(
  "review_git_diff",
  "Review all changed Angular/.NET files in the current git diff",
  {
    repoPath: z.string().default(".").describe("Path to git repository root"),
    staged: z.boolean().default(false).describe("true = staged only, false = unstaged"),
    focusAreas: focusAreasSchema,
    format: formatSchema,
  },
  async ({ repoPath, staged, focusAreas, format }) => {
    let diffOutput: string;
    try {
      const flag = staged ? "--cached" : "";
      diffOutput = execSync(`git -C "${repoPath}" diff ${flag} --unified=5`, {
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (e) {
      return { content: [{ type: "text", text: `git diff failed: ${(e as Error).message}` }], isError: true };
    }

    if (!diffOutput.trim())
      return { content: [{ type: "text", text: "No changes found in git diff." }] };

    const fileBlocks = parseDiff(diffOutput);
    const supportedExts = [".cs", ".ts", ".html", ".scss", ".css"];
    const relevant = fileBlocks.filter((f) => supportedExts.includes(extname(f.filename).toLowerCase()));

    if (relevant.length === 0)
      return { content: [{ type: "text", text: "No .NET or Angular files found in the diff." }] };

    const reviews: Record<string, string> = {};
    for (const file of relevant)
      reviews[file.filename] = performReview(file.content, file.filename, focusAreas, format);

    return { content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }] };
  }
);

server.tool(
  "review_files_batch",
  "Review multiple files at once with full AST analysis for each",
  {
    filePaths: z.array(z.string()).describe("List of file paths to review"),
    focusAreas: focusAreasSchema,
    format: formatSchema,
  },
  ({ filePaths, focusAreas, format }) => {
    const reviews: Record<string, string> = {};
    for (const filePath of filePaths) {
      const absolutePath = resolve(filePath);
      if (!existsSync(absolutePath)) { reviews[filePath] = "File not found"; continue; }
      const code = readFileSync(absolutePath, "utf-8");
      reviews[filePath] = performReview(code, filePath, focusAreas, format);
    }

    if (format === "compact") {
      // Build endpoint inventory table across all .cs controller files
      const inventoryRows: string[] = [];
      for (const filePath of filePaths) {
        const absolutePath = resolve(filePath);
        if (!existsSync(absolutePath) || !filePath.endsWith(".cs")) continue;
        const code = readFileSync(absolutePath, "utf-8");
        const meta = analyzeCSharp(code, filePath);
        for (const cls of meta.classes) {
          const isController = cls.attributes.some((a: string) => a.includes("ApiController") || a.includes("Controller")) || cls.name.endsWith("Controller");
          if (!isController) continue;
          for (const method of (cls.methodAnnotations ?? [])) {
            if (!method.httpVerb) continue;
            const dtoParam = method.parameters.find((p: { type: string }) => /^[A-Z]/.test(p.type) && !["Guid", "string", "int", "bool"].includes(p.type));
            const validationIssue = meta.apiValidationIssues?.find((i: { methodName?: string }) => i.methodName === method.methodName);
            const validationStatus = validationIssue ? "⚠️ check" : dtoParam ? "✅ ok" : "—";
            inventoryRows.push(`| \`${cls.name}\` | \`${method.methodName}\` | ${method.httpVerb} | \`${dtoParam?.type ?? "—"}\` | ${validationStatus} |`);
          }
        }
      }

      const inventoryTable = inventoryRows.length > 0
        ? `## Endpoint Inventory\n\n| Controller | Method | Verb | DTO Type | Validation |\n|---|---|---|---|---|\n${inventoryRows.join("\n")}\n\n---\n\n`
        : "";

      const parts = Object.entries(reviews).map(([f, r]) => `### ${f}\n${r}`).join("\n\n---\n\n");
      return { content: [{ type: "text", text: inventoryTable + parts }] };
    }

    return { content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }] };
  }
);

server.tool(
  "analyze_ast_only",
  "Run only the AST analyzer (ts-morph or Roslyn) without the LLM review — fast structural metadata",
  {
    filePath: z.string().describe("Path to .cs or .ts file"),
  },
  async ({ filePath }) => {
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath))
      return { content: [{ type: "text", text: `File not found: ${absolutePath}` }], isError: true };

    const code = readFileSync(absolutePath, "utf-8");
    const language = detectLanguage(filePath, code);

    if (language === "angular") {
      const meta = analyzeTypeScript(code, filePath);
      return { content: [{ type: "text", text: JSON.stringify(meta, null, 2) }] };
    } else if (language === "dotnet") {
      const meta = analyzeCSharp(code, filePath);
      return { content: [{ type: "text", text: JSON.stringify(meta, null, 2) }] };
    }

    return { content: [{ type: "text", text: `Unsupported file type: ${filePath}` }] };
  }
);

// ─── Validation Comparison Helpers ───────────────────────────────────────────

function normalizeDotnetAnnotation(annotation: string): string {
  if (annotation === "Required") return "required";
  if (annotation === "EmailAddress") return "email";
  if (annotation === "Phone") return "phone";
  if (annotation === "Url") return "url";
  const strLen = annotation.match(/StringLength\((\d+)/);
  if (strLen) return `maxLength:${strLen[1]}`;
  const maxLen = annotation.match(/MaxLength\((\d+)/);
  if (maxLen) return `maxLength:${maxLen[1]}`;
  const minLen = annotation.match(/MinLength\((\d+)/);
  if (minLen) return `minLength:${minLen[1]}`;
  const range = annotation.match(/Range\((\d+),\s*(\d+)/);
  if (range) return `range:${range[1]}-${range[2]}`;
  const regex = annotation.match(/RegularExpression\(["']([^"']+)["']/);
  if (regex) return `pattern:${regex[1]}`;
  return annotation.toLowerCase();
}

function toCamelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

server.tool(
  "compare_validation_rules",
  "Compare Angular reactive-form validators with .NET DTO DataAnnotations. Returns a delta matrix showing which fields are fully aligned, missing validation in backend, missing in frontend, or have conflicting constraints (e.g. FE maxLength:50 vs BE maxLength:100). Requires an Angular component/form file and a .NET DTO/Request class file.",
  {
    angularFormFile: z.string().describe("Path to the Angular .ts component or form file"),
    dotnetDtoFile: z.string().describe("Path to the .NET .cs DTO / Request class file"),
  },
  ({ angularFormFile, dotnetDtoFile }) => {
    const angularPath = resolve(angularFormFile);
    const dotnetPath = resolve(dotnetDtoFile);

    if (!existsSync(angularPath))
      return { content: [{ type: "text", text: `Angular file not found: ${angularPath}` }], isError: true };
    if (!existsSync(dotnetPath))
      return { content: [{ type: "text", text: `.NET file not found: ${dotnetPath}` }], isError: true };

    const angularCode = readFileSync(angularPath, "utf-8");
    const dotnetCode = readFileSync(dotnetPath, "utf-8");

    // Angular side: extract form fields and validators
    const angularFields = extractAngularValidators(angularCode, angularFormFile);

    // .NET side: run Roslyn and get property annotations
    const dotnetMeta = analyzeCSharp(dotnetCode, dotnetDtoFile);
    const dtoSuffixes = ["Request", "Dto", "Model", "Command", "Body", "Input", "Payload"];
    const dtoClass = dotnetMeta.classes.find((c) =>
      dtoSuffixes.some((s) => c.name.endsWith(s))
    ) ?? dotnetMeta.classes[0];

    const dotnetProperties = dtoClass?.propertyAnnotations ?? [];

    // Build normalized lookup maps
    const angularMap = new Map<string, string[]>(
      angularFields.map((f) => [f.name.toLowerCase(), f.validators])
    );
    const dotnetMap = new Map<string, string[]>(
      dotnetProperties.map((p) => [
        toCamelCase(p.propertyName).toLowerCase(),
        p.annotations.map(normalizeDotnetAnnotation),
      ])
    );

    // Collect all field names from both sides
    const allFields = new Set([...angularMap.keys(), ...dotnetMap.keys()]);

    interface MatrixRow {
      fieldName: string;
      angularValidators: string[];
      dotnetAnnotations: string[];
      status: "ok" | "missing-be" | "missing-fe" | "conflict";
      details: string;
    }

    const matrix: MatrixRow[] = [];
    let fullyAligned = 0, missingInBackend = 0, missingInFrontend = 0, conflicting = 0;

    for (const field of allFields) {
      const feValidators = angularMap.get(field) ?? [];
      const beAnnotations = dotnetMap.get(field) ?? [];

      const onlyInFe = feValidators.filter((v) => !beAnnotations.includes(v));
      const onlyInBe = beAnnotations.filter((v) => !feValidators.includes(v));

      let status: MatrixRow["status"];
      let details: string;

      if (feValidators.length === 0 && beAnnotations.length === 0) {
        status = "ok";
        details = "No constraints on either side";
      } else if (onlyInFe.length === 0 && onlyInBe.length === 0) {
        status = "ok";
        details = "Fully aligned";
        fullyAligned++;
      } else if (feValidators.length > 0 && beAnnotations.length === 0) {
        status = "missing-be";
        details = `FE enforces: ${feValidators.join(", ")} — BE has no DataAnnotations`;
        missingInBackend++;
      } else if (feValidators.length === 0 && beAnnotations.length > 0) {
        status = "missing-fe";
        details = `BE requires: ${beAnnotations.join(", ")} — FE has no validators`;
        missingInFrontend++;
      } else {
        status = "conflict";
        details = [
          onlyInFe.length > 0 ? `FE only: ${onlyInFe.join(", ")}` : "",
          onlyInBe.length > 0 ? `BE only: ${onlyInBe.join(", ")}` : "",
        ].filter(Boolean).join(" | ");
        conflicting++;
      }

      matrix.push({ fieldName: field, angularValidators: feValidators, dotnetAnnotations: beAnnotations, status, details });
    }

    const result = {
      angularFile: angularFormFile,
      dotnetFile: dotnetDtoFile,
      dotnetClass: dtoClass?.name ?? "(not found)",
      summary: {
        totalFields: allFields.size,
        fullyAligned,
        missingInBackend,
        missingInFrontend,
        conflicting,
      },
      matrix,
    };

    const lines: string[] = [
      `# Validation Comparison: ${angularFormFile} ↔ ${dotnetDtoFile}`,
      `**DTO class:** \`${result.dotnetClass}\``,
      `**Total fields:** ${allFields.size} | ✅ Aligned: ${fullyAligned} | ⚠️ Missing BE: ${missingInBackend} | ⚠️ Missing FE: ${missingInFrontend} | ❌ Conflict: ${conflicting}`,
      "",
      "## Delta Matrix",
      "| Field | Angular Validators | .NET Annotations | Status | Details |",
      "|-------|-------------------|-----------------|--------|---------|",
    ];
    for (const row of matrix) {
      const statusIcon = row.status === "ok" ? "✅" : row.status === "conflict" ? "❌" : "⚠️";
      lines.push(`| \`${row.fieldName}\` | ${row.angularValidators.join(", ") || "—"} | ${row.dotnetAnnotations.join(", ") || "—"} | ${statusIcon} ${row.status} | ${row.details} |`);
    }

    return { content: [{ type: "text", text: lines.join("\n") + "\n\n## Raw JSON\n```json\n" + JSON.stringify(result, null, 2) + "\n```" }] };
  }
);

server.tool(
  "find_api_callers",
  "Scan an Angular .ts file (service or component) for all HttpClient calls (GET/POST/PUT/PATCH/DELETE) and return a table showing which class/method calls which URL pattern. Optionally filter by endpoint pattern. Use this to answer 'which Angular component calls endpoint X?' or to build a FE→BE call map for contract reviews.",
  {
    filePath: z.string().describe("Path to the Angular .ts service or component file"),
    endpointPattern: z.string().optional().describe("Optional filter — only return calls whose URL contains this string (e.g. 'experiments', 'search')"),
  },
  ({ filePath, endpointPattern }) => {
    const absolutePath = resolve(filePath);
    if (!existsSync(absolutePath))
      return { content: [{ type: "text", text: `File not found: ${absolutePath}` }], isError: true };

    const code = readFileSync(absolutePath, "utf-8");
    let calls = extractHttpCalls(code, filePath);

    if (endpointPattern) {
      const pattern = endpointPattern.toLowerCase();
      calls = calls.filter((c) => c.urlPattern.toLowerCase().includes(pattern));
    }

    if (calls.length === 0) {
      return { content: [{ type: "text", text: `No HttpClient calls found in \`${filePath}\`${endpointPattern ? ` matching "${endpointPattern}"` : ""}.` }] };
    }

    const lines: string[] = [
      `# HTTP Calls in \`${filePath}\``,
      `**${calls.length} call(s) found**${endpointPattern ? ` matching \`${endpointPattern}\`` : ""}`,
      "",
      "| Class | Method | HTTP Verb | URL Pattern | Line |",
      "|-------|--------|-----------|-------------|------|",
    ];
    for (const c of calls) {
      lines.push(`| \`${c.containingClass}\` | \`${c.containingMethod}\` | **${c.httpMethod}** | \`${c.urlPattern}\` | ${c.line} |`);
    }

    return { content: [{ type: "text", text: lines.join("\n") + "\n\n## Raw JSON\n```json\n" + JSON.stringify(calls, null, 2) + "\n```" }] };
  }
);

// ─── Index Formatters ─────────────────────────────────────────────────────────

function formatAngularIndexForLLM(index: AngularProjectIndex): string {
  const s = index.summary;
  const lines: string[] = [];

  lines.push(`# Angular Project Index`);
  lines.push(`Generated: ${index.generatedAt} | Root: ${index.projectRoot}\n`);

  lines.push(`## Summary`);
  lines.push(`- ${s.componentCount} components (${s.standaloneComponents} standalone, ${s.onPushComponents} OnPush)`);
  lines.push(`- ${s.serviceCount} services | ${s.interfaceCount} interfaces | ${s.enumCount} enums | ${s.pipeCount} pipes`);
  lines.push(`- Signal inputs: ${s.signalInputs} ✅ | Legacy @Input(): ${s.legacyInputs} ⚠️`);
  lines.push(`- Modern @if/@for: ${s.modernControlFlow} ✅ | Legacy *ngIf/*ngFor: ${s.legacyControlFlow} ⚠️\n`);

  lines.push(`## Components`);
  for (const c of index.components) {
    lines.push(`### ${c.name} (${c.file}:${c.line})`);
    lines.push(`- Selector: ${c.selector ?? "n/a"} | CD: ${c.changeDetection} | Standalone: ${c.isStandalone}`);
    lines.push(`- Injects: ${c.injects.join(", ") || "none"}`);
    if (c.inputs.length) lines.push(`- Inputs: ${c.inputs.map((i) => `${i.name}${i.isSignal ? " (signal)" : " ⚠️legacy"}`).join(", ")}`);
    if (c.outputs.length) lines.push(`- Outputs: ${c.outputs.map((o) => `${o.name}${o.isSignal ? " (signal)" : " ⚠️legacy"}`).join(", ")}`);
    if (c.lifecycleHooks.length) lines.push(`- Lifecycle: ${c.lifecycleHooks.join(", ")}`);
    if (c.controlFlowSyntax === "legacy") lines.push(`- ⚠️ Uses legacy *ngIf/*ngFor — migrate to @if/@for`);
    if (c.changeDetection === "Default") lines.push(`- ⚠️ Missing OnPush ChangeDetection`);
    if (c.injects.some((d) => d.includes("HttpClient"))) lines.push(`- ⚠️ SRP: HttpClient directly in component`);
  }

  lines.push(`\n## Services`);
  for (const s of index.services) {
    lines.push(`### ${s.name} (${s.file}:${s.line})`);
    lines.push(`- ProvidedIn: ${s.providedIn ?? "none"} | HTTP: ${s.usesHttpClient} | Observables: ${s.returnsObservables} | Signals: ${s.usesSignals}`);
    lines.push(`- Injects: ${s.injects.join(", ") || "none"}`);
    lines.push(`- Implements: ${s.implementedInterfaces.join(", ") || "none"}`);
    if (s.publicMethods.length) lines.push(`- Methods: ${s.publicMethods.map((m) => `${m.name}${m.isAsync ? "(async)" : ""}`).join(", ")}`);
  }

  lines.push(`\n## Interfaces`);
  for (const i of index.interfaces) {
    lines.push(`- **${i.name}** (${i.file}:${i.line}) | Methods: ${i.methods.join(", ")} | ImplementedBy: ${i.implementedBy.join(", ") || "⚠️ none"}`);
  }

  lines.push(`\n## Enums`);
  for (const e of index.enums) {
    lines.push(`- **${e.name}** (${e.file}) → ${e.values.join(", ")}`);
  }

  if (index.routes.length) {
    lines.push(`\n## Routes`);
    for (const r of index.routes) {
      const lazy = r.isLazy ? " [lazy]" : "";
      const guards = r.guards.length ? ` guards: ${r.guards.join(", ")}` : "";
      lines.push(`- "/${r.path}"${lazy} → ${r.component ?? r.redirectTo ?? "?"}${guards}`);
    }
  }

  lines.push(`\n## Coupling Report`);
  lines.push(`Most depended-on: ${index.couplingReport.mostDepended.slice(0, 5).map((e) => `${e.name}(${e.usedByCount})`).join(", ")}`);
  lines.push(`Most dependencies: ${index.couplingReport.mostDepending.slice(0, 5).map((e) => `${e.name}(${e.dependsOnCount})`).join(", ")}`);
  if (index.couplingReport.circularRiskPairs.length)
    lines.push(`⚠️ Circular risks: ${index.couplingReport.circularRiskPairs.join(" | ")}`);

  lines.push(`\n## Signal Migration Candidates`);
  if (index.signalAdoptionReport.migrationCandidates.length)
    lines.push(index.signalAdoptionReport.migrationCandidates.join(", "));
  else
    lines.push("✅ All components using modern signals");

  return lines.join("\n");
}

function formatDotnetIndexForLLM(index: DotnetProjectIndex): string {
  if (index.error) return `# .NET Project Index\n⚠️ ${index.error}`;

  const s = index.summary;
  const lines: string[] = [];

  lines.push(`# .NET Project Index`);
  lines.push(`Generated: ${index.generatedAt} | Root: ${index.projectRoot}\n`);

  lines.push(`## Summary`);
  lines.push(`- ${s.totalClasses} classes | ${s.totalInterfaces} interfaces | ${s.totalEnums} enums | ${s.totalRecords} records`);
  lines.push(`- Controllers: ${s.controllerCount} | Services: ${s.serviceCount} | Repositories: ${s.repositoryCount}`);
  lines.push(`- Async methods: ${s.totalAsyncMethods} | ⚠️ .Result/.Wait(): ${s.classesWithResultWait} classes`);
  lines.push(`- ⚠️ DIP violations: ${s.classesWithDipViolations} classes | OCP risks (switch): ${s.totalSwitchStatements}`);
  lines.push(`- ⚠️ Orphan interfaces: ${s.interfacesWithoutImplementation} | Namespaces: ${s.uniqueNamespaces}\n`);

  lines.push(`## Classes by Layer`);
  const byLayer: Record<string, typeof index.classes> = {};
  for (const cls of index.classes) {
    if (!byLayer[cls.layer]) byLayer[cls.layer] = [];
    byLayer[cls.layer].push(cls);
  }
  for (const [layer, classes] of Object.entries(byLayer)) {
    lines.push(`\n### ${layer}`);
    for (const cls of classes) {
      const flags: string[] = [];
      if (cls.dipViolations.length) flags.push(`⚠️ DIP(${cls.dipViolations.length})`);
      if (cls.resultWaitLines.length) flags.push(`🔴 .Result/.Wait`);
      if (cls.longMethods.length) flags.push(`⚠️ LongMethods(${cls.longMethods.length})`);
      if (cls.switchCount >= 2) flags.push(`⚠️ OCP(${cls.switchCount} switches)`);

      lines.push(`- **${cls.name}** (${cls.file}:${cls.line}) ${flags.join(" ")}`);
      lines.push(`  Deps: ${cls.constructorDeps.join(", ") || "none"} | Implements: ${cls.implementedInterfaces.join(", ") || "none"}`);
      if (cls.publicMethods.length)
        lines.push(`  Methods: ${cls.publicMethods.slice(0, 8).map((m) => `${m.name}${m.isAsync ? "(async)" : ""}`).join(", ")}`);
    }
  }

  lines.push(`\n## Interfaces`);
  for (const i of index.interfaces) {
    const noImpl = i.implementedBy.length === 0 ? " ⚠️ no implementation" : "";
    lines.push(`- **${i.name}** (${i.file}:${i.line}) | ${i.methodCount} methods | ImplementedBy: ${i.implementedBy.join(", ") || "none"}${noImpl}`);
  }

  lines.push(`\n## Enums`);
  for (const e of index.enums) {
    lines.push(`- **${e.name}** [${e.namespace}] → ${e.values.join(", ")}`);
  }

  if (index.records.length) {
    lines.push(`\n## Records (DTOs)`);
    for (const r of index.records) {
      lines.push(`- **${r.name}** (${r.file}) ${r.isPositional ? "[positional]" : ""} → ${r.properties.join(", ")}`);
    }
  }

  lines.push(`\n## Architecture Report`);
  if (index.architectureReport.layerViolations.length) {
    lines.push(`\n### ⚠️ Layer Violations`);
    index.architectureReport.layerViolations.forEach((v) => lines.push(`- ${v}`));
  }
  if (index.architectureReport.godClassCandidates.length)
    lines.push(`\n⚠️ God Class Candidates: ${index.architectureReport.godClassCandidates.join(", ")}`);
  if (index.architectureReport.orphanInterfaces.length)
    lines.push(`⚠️ Orphan Interfaces: ${index.architectureReport.orphanInterfaces.join(", ")}`);

  lines.push(`\n## Coupling Report`);
  lines.push(`Most depended-on: ${index.couplingReport.mostDepended.slice(0, 5).map((e) => `${e.name}(${e.count})`).join(", ")}`);
  if (index.couplingReport.circularRiskPairs.length)
    lines.push(`⚠️ Circular risks: ${index.couplingReport.circularRiskPairs.join(" | ")}`);

  return lines.join("\n");
}

// ─── Index Tools ──────────────────────────────────────────────────────────────

server.tool(
  "index_project",
  "Generate a full structural index of an Angular or .NET project. Run this once before reviewing — it gives the LLM a complete map of all classes, interfaces, enums, services, dependencies, and SOLID/architecture issues across the entire codebase.",
  {
    projectPath: z.string().describe("Root path of the Angular or .NET project"),
    type: z.enum(["angular", "dotnet", "auto"]).default("auto").describe("Project type. 'auto' detects by presence of angular.json or .csproj"),
    format: z.enum(["llm", "json"]).default("llm").describe("'llm' = readable text for LLM context, 'json' = raw structured data"),
    useCache: z.boolean().default(true).describe("Use cached index if < 5 minutes old"),
  },
  async ({ projectPath, type, format, useCache }) => {
    const absPath = resolve(projectPath);
    if (!existsSync(absPath))
      return { content: [{ type: "text", text: `Path not found: ${absPath}` }], isError: true };

    // Auto-detect type
    let detectedType = type;
    if (type === "auto") {
      const { readdirSync: rd } = await import("fs");
      const { join: pjoin } = await import("path");
      if (existsSync(pjoin(absPath, "angular.json")) || existsSync(pjoin(absPath, "project.json")))
        detectedType = "angular";
      else if (rd(absPath).some((f: string) => f.endsWith(".csproj") || f.endsWith(".sln")))
        detectedType = "dotnet";
      else
        return { content: [{ type: "text", text: `Could not auto-detect project type in: ${absPath}\nPlease specify type: "angular" or "dotnet"` }], isError: true };
    }

    if (detectedType === "angular") {
      const index = indexAngularProjectCached(absPath, useCache);
      const output = format === "json" ? JSON.stringify(index, null, 2) : formatAngularIndexForLLM(index);
      return { content: [{ type: "text", text: output }] };
    } else {
      const index = indexDotnetProject(absPath, useCache);
      const output = format === "json" ? JSON.stringify(index, null, 2) : formatDotnetIndexForLLM(index);
      return { content: [{ type: "text", text: output }] };
    }
  }
);

server.tool(
  "find_in_index",
  "Search the project index for a specific class, interface, enum, service, or component by name. Returns its location, dependencies, and related types — without re-scanning the project.",
  {
    projectPath: z.string().describe("Root path of the project"),
    type: z.enum(["angular", "dotnet"]).describe("Project type"),
    query: z.string().describe("Name to search for (partial match supported)"),
  },
  async ({ projectPath, type, query }) => {
    const absPath = resolve(projectPath);
    const q = query.toLowerCase();
    const results: unknown[] = [];

    if (type === "angular") {
      const index = indexAngularProjectCached(absPath, true);
      const match = (name: string) => name.toLowerCase().includes(q);

      index.components.filter((c) => match(c.name)).forEach((c) => results.push({ kind: "Component", ...c }));
      index.services.filter((s) => match(s.name)).forEach((s) => results.push({ kind: "Service", ...s }));
      index.interfaces.filter((i) => match(i.name)).forEach((i) => results.push({ kind: "Interface", ...i }));
      index.enums.filter((e) => match(e.name)).forEach((e) => results.push({ kind: "Enum", ...e }));
      index.pipes.filter((p) => match(p.name)).forEach((p) => results.push({ kind: "Pipe", ...p }));
    } else {
      const index = indexDotnetProject(absPath, true);
      const match = (name: string) => name.toLowerCase().includes(q);

      index.classes.filter((c) => match(c.name)).forEach((c) => results.push({ kind: "Class", ...c }));
      index.interfaces.filter((i) => match(i.name)).forEach((i) => results.push({ kind: "Interface", ...i }));
      index.enums.filter((e) => match(e.name)).forEach((e) => results.push({ kind: "Enum", ...e }));
      index.records.filter((r) => match(r.name)).forEach((r) => results.push({ kind: "Record", ...r }));
    }

    if (results.length === 0)
      return { content: [{ type: "text", text: `No matches found for "${query}" in ${projectPath}` }] };

    return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
  }
);

server.tool(
  "review_with_index",
  "Review a file with full project context. Automatically loads the project index first so the LLM understands the entire dependency graph before reviewing the single file.",
  {
    filePath: z.string().describe("Path to the file to review"),
    projectPath: z.string().describe("Root path of the project for index context"),
    type: z.enum(["angular", "dotnet"]).describe("Project type"),
    focusAreas: focusAreasSchema,
  },
  async ({ filePath, projectPath, type, focusAreas }) => {
    const absFile = resolve(filePath);
    const absProject = resolve(projectPath);

    if (!existsSync(absFile))
      return { content: [{ type: "text", text: `File not found: ${absFile}` }], isError: true };

    const code = readFileSync(absFile, "utf-8");

    const indexContext = type === "angular"
      ? formatAngularIndexForLLM(indexAngularProjectCached(absProject, true))
      : formatDotnetIndexForLLM(indexDotnetProject(absProject, true));

    const fileAnalysis = performReview(code, filePath, focusAreas);

    const output = `## Project Index\n${indexContext}\n\n---\n\n${fileAnalysis}`;
    return { content: [{ type: "text", text: output }] };
  }
);

// ─── Advanced Analysis Tools ──────────────────────────────────────────────────

const projectTypeSchema = z.enum(["angular", "dotnet"]).describe("Project type");
const projectPathSchema = z.string().describe("Root path of the project");

// Tool: Cyclomatic Complexity
server.tool(
  "analyze_complexity",
  "Compute cyclomatic complexity for every method in the project. Flags methods with complexity ≥ 10 (warning) or ≥ 15/20 (critical). Works for both Angular (ts-morph) and .NET (Roslyn).",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeCyclomaticComplexity(abs);
      const summary = `Found ${results.length} complex methods. Top offenders:\n` +
        results.slice(0, 5).map((r) => `  [${r.severity}] ${r.className}.${r.methodName} (${r.file}:${r.line}) → CC=${r.complexity} [${r.branches.join(", ")}]`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "complexity");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.cyclomaticComplexity ?? [];
      const summary = `Found ${items.length} complex methods.\n` +
        items.slice(0, 5).map((r) => `  [${r.severity}] ${r.className}.${r.methodName} (${r.file}:${r.line}) → CC=${r.complexity}`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Dead Code
server.tool(
  "analyze_dead_code",
  "Find unused private methods/fields, unreferenced exported functions, unused interfaces, and unused imports across the entire project.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeDeadCode(abs);
      const summary = `Found ${results.length} dead code items.\n` +
        results.slice(0, 8).map((r) => `  [${r.kind}] ${r.name} (${r.file}:${r.line}) — ${r.reason}`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "deadcode");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.deadCode ?? [];
      const summary = `Found ${items.length} dead code items.\n` +
        items.slice(0, 8).map((r) => `  [${r.kind}] ${r.name} (${r.file}:${r.line}) — ${r.reason}`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Nullability / Type Flow
server.tool(
  "analyze_nullability",
  "Detect null-safety issues: non-null assertions, missing null-checks after nullable returns, unhandled Observable subscriptions, FirstOrDefault() NRE risks, and missing ArgumentNullException guards.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeNullability(abs);
      const criticals = results.filter((r) => r.severity === "critical").length;
      const summary = `Found ${results.length} nullability issues (${criticals} critical).\n` +
        results.filter((r) => r.severity === "critical").slice(0, 5)
          .map((r) => `  🔴 ${r.file}:${r.line} — ${r.issue}`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "nullflow");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.nullabilityIssues ?? [];
      const criticals = items.filter((r) => r.severity === "critical").length;
      const summary = `Found ${items.length} nullability issues (${criticals} critical).\n` +
        items.filter((r) => r.severity === "critical").slice(0, 5)
          .map((r) => `  🔴 ${r.file}:${r.line} — ${r.issue}\n     Fix: ${r.fix}`).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Structural Duplicates
server.tool(
  "analyze_duplicates",
  "Find structurally identical methods across the codebase using normalized AST hashing. Ignores variable names and string literals — finds real logic duplicates that should be extracted.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeDuplicates(abs);
      const summary = `Found ${results.length} duplicate method groups.\n` +
        results.slice(0, 5).map((g) =>
          `  Group (${g.instances.length} copies): ${g.instances.map((i) => `${i.className}.${i.methodName}`).join(", ")}\n  → ${g.suggestion}`
        ).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "duplicates");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.duplicates ?? [];
      const summary = `Found ${items.length} duplicate method groups.\n` +
        items.slice(0, 5).map((g) =>
          `  Group (${g.instances.length} copies): ${g.instances.map((i) => `${i.className}.${i.methodName}`).join(", ")}\n  → ${g.suggestion}`
        ).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Refactoring Safety
server.tool(
  "analyze_refactoring_safety",
  "Before renaming or modifying a method/class, check how many files use it, whether it's part of an interface contract, used in templates, or virtual/override. Returns full usage map and risk assessment.",
  {
    projectPath: projectPathSchema,
    type: projectTypeSchema,
    targetName: z.string().optional().describe("Optional: filter to specific method/class name"),
  },
  async ({ projectPath, type, targetName }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeRefactoringSafety(abs, targetName);
      const risky = results.filter((r) => !r.safeToRename);
      const summary = `Analyzed ${results.length} public members. ${risky.length} have rename risks.\n` +
        risky.slice(0, 5).map((r) =>
          `  ⚠️ ${r.className}.${r.memberName} (${r.usageCount} usages) — ${r.risks.join("; ")}`
        ).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results.slice(0, 20), null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "refactoring");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.refactoringSafety ?? [];
      const risky = items.filter((r) => !r.safeToRename);
      const summary = `Analyzed ${items.length} public members. ${risky.length} have rename risks.\n` +
        risky.slice(0, 5).map((r) =>
          `  ⚠️ ${r.className}.${r.memberName} (${r.usageCount} usages) — ${r.risks.join("; ")}`
        ).join("\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items.slice(0, 20), null, 2) }] };
    }
  }
);

// Tool: Auto-Fix
server.tool(
  "generate_auto_fixes",
  "Generate concrete before/after code fixes for the entire project. Angular: @Input()→input(), @Output()→output(), constructor→inject(), *ngIf→@if, | async→toSignal(), missing OnPush. .NET: .Result→await, missing CancellationToken, missing null-guards, switch→pattern-matching, explicit types.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const fixes = generateAutoFixes(abs);
      const automated = fixes.filter((f) => f.automated).length;
      const summary = `Generated ${fixes.length} fixes (${automated} fully automated).\n\n` +
        fixes.slice(0, 10).map((f) =>
          `  [${f.category}] ${f.file}:${f.line} ${f.automated ? "🤖" : "👤"}\n  ${f.description}\n  Before: ${f.before}\n  After:  ${f.after}`
        ).join("\n\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(fixes, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "autofix");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const fixes = res.autoFixes ?? [];
      const automated = fixes.filter((f) => f.automated).length;
      const summary = `Generated ${fixes.length} fixes (${automated} fully automated).\n\n` +
        fixes.slice(0, 10).map((f) =>
          `  [${f.category}] ${f.file}:${f.line} ${f.automated ? "🤖" : "👤"}\n  ${f.description}\n  Before: ${f.before}\n  After:  ${f.after}`
        ).join("\n\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(fixes, null, 2) }] };
    }
  }
);

// Tool: Cross-File Dataflow
server.tool(
  "analyze_dataflow",
  "Trace how data flows between classes across files. Detects: nullable returns used without null-check in callers, unawaited Tasks (fire-and-forget), unsubscribed Observables, and data crossing service boundaries without validation.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    if (type === "angular") {
      const results = analyzeCrossFileDataflow(abs);
      const criticals = results.filter((r) => r.severity === "critical").length;
      const summary = `Found ${results.length} cross-file dataflow issues (${criticals} critical).\n` +
        results.filter((r) => r.severity === "critical").slice(0, 6).map((r) =>
          `  🔴 ${r.file}:${r.line}\n     ${r.fromClass}.${r.fromMethod}() → ${r.toClass}.${r.toMethod}\n     ${r.issue}`
        ).join("\n\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "dataflow");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.crossFileDataflow ?? [];
      const criticals = items.filter((r) => r.severity === "critical").length;
      const summary = `Found ${items.length} cross-file dataflow issues (${criticals} critical).\n` +
        items.filter((r) => r.severity === "critical").slice(0, 6).map((r) =>
          `  🔴 ${r.file}:${r.line}\n     ${r.fromClass}.${r.fromMethod}() → ${r.toClass}.${r.toMethod}\n     ${r.issue}`
        ).join("\n\n");
      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Full Advanced Analysis (all 7 at once)
server.tool(
  "analyze_advanced_all",
  "Run all 7 advanced analyses in one shot: complexity, dead code, nullability, duplicates, refactoring safety, auto-fixes, and cross-file dataflow. Returns a unified report.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    let report: Record<string, unknown>;

    if (type === "angular") {
      const [complexity, deadCode, nullability, duplicates, refactoring, autoFixes, dataflow] = await Promise.all([
        Promise.resolve(analyzeCyclomaticComplexity(abs)),
        Promise.resolve(analyzeDeadCode(abs)),
        Promise.resolve(analyzeNullability(abs)),
        Promise.resolve(analyzeDuplicates(abs)),
        Promise.resolve(analyzeRefactoringSafety(abs)),
        Promise.resolve(generateAutoFixes(abs)),
        Promise.resolve(analyzeCrossFileDataflow(abs)),
      ]);

      report = {
        projectRoot: abs, generatedAt: new Date().toISOString(), type: "angular",
        summary: {
          complexMethods: complexity.length,
          deadCodeItems: deadCode.length,
          nullabilityIssues: nullability.length,
          duplicateGroups: duplicates.length,
          refactoringRisks: refactoring.filter((r) => !r.safeToRename).length,
          autoFixesAvailable: autoFixes.length,
          dataflowIssues: dataflow.length,
          criticalIssues:
            nullability.filter((n) => n.severity === "critical").length +
            dataflow.filter((d) => d.severity === "critical").length,
        },
        cyclomaticComplexity: complexity,
        deadCode,
        nullabilityIssues: nullability,
        duplicates,
        refactoringSafety: refactoring.slice(0, 20),
        autoFixes,
        crossFileDataflow: dataflow,
      };
    } else {
      const res = runDotnetAdvancedAnalysis(abs, "all");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      report = {
        ...res,
        summary: {
          complexMethods: res.cyclomaticComplexity?.length ?? 0,
          deadCodeItems: res.deadCode?.length ?? 0,
          nullabilityIssues: res.nullabilityIssues?.length ?? 0,
          duplicateGroups: res.duplicates?.length ?? 0,
          refactoringRisks: res.refactoringSafety?.filter((r) => !r.safeToRename).length ?? 0,
          autoFixesAvailable: res.autoFixes?.length ?? 0,
          dataflowIssues: res.crossFileDataflow?.length ?? 0,
          criticalIssues:
            (res.nullabilityIssues?.filter((n) => n.severity === "critical").length ?? 0) +
            (res.crossFileDataflow?.filter((d) => d.severity === "critical").length ?? 0),
        },
      };
    }

    return { content: [{ type: "text", text: JSON.stringify(report, null, 2) }] };
  }
);

// Tool: Suggest Class/Component Splits
server.tool(
  "suggest_class_splits",
  "Analyzes classes and components to suggest how to split them. Uses LCOM (Lack of Cohesion of Methods), method clustering via Union-Find on shared fields/dependencies/call graph, field access map, and dependency groups. Returns concrete split proposals with method assignments, field ownership, dependency allocation, and estimated line counts.",
  {
    projectPath: projectPathSchema,
    type: projectTypeSchema,
    targetClass: z.string().optional().describe("Optional: analyze only a specific class/component by name (partial match)"),
  },
  async ({ projectPath, type, targetClass }) => {
    const abs = resolve(projectPath);

    if (type === "angular") {
      const results = analyzeClassSplits(abs, targetClass);

      if (results.length === 0)
        return { content: [{ type: "text", text: targetClass ? `No split needed for "${targetClass}" — class is well-focused.` : "No split candidates found in project." }] };

      const text = results.map((r) => formatAngularSplitReport(r)).join("\n\n" + "─".repeat(60) + "\n\n");
      return { content: [{ type: "text", text: text + "\n\n" + JSON.stringify(results, null, 2) }] };

    } else {
      let results: ReturnType<typeof runDotnetSplitAnalysis>;
      try {
        results = runDotnetSplitAnalysis(abs, targetClass);
      } catch (e) {
        return { content: [{ type: "text", text: `⚠️ .NET split analyzer error: ${(e as Error).message}` }], isError: true };
      }

      if (results.length === 0)
        return { content: [{ type: "text", text: targetClass ? `No split needed for "${targetClass}" — class is well-focused.` : "No split candidates found in project." }] };

      const text = results.map((r) => formatDotnetSplitReport(r)).join("\n\n" + "─".repeat(60) + "\n\n");
      return { content: [{ type: "text", text: text + "\n\n" + JSON.stringify(results, null, 2) }] };
    }
  }
);

// ─── Split Report Formatters ──────────────────────────────────────────────────

function formatAngularSplitReport(r: ReturnType<typeof analyzeClassSplits>[number]): string {
  const lines: string[] = [];
  const urgencyIcon = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", none: "✅" }[r.splitUrgency];

  lines.push(`## ${urgencyIcon} ${r.className}  (${r.file}:${r.line})`);
  lines.push(`**Split Urgency:** ${r.splitUrgency.toUpperCase()}  |  **LCOM Score:** ${r.lcom.score} — ${r.lcom.interpretation}`);
  lines.push(`**Methods:** ${r.lcom.methodCount}  |  **Fields:** ${r.lcom.fieldCount}  |  **Clusters found:** ${r.methodClusters.length}`);

  lines.push(`\n### Method Clusters (natural split boundaries)`);
  for (const cluster of r.methodClusters) {
    lines.push(`\n**Cluster ${cluster.clusterId + 1} → "${cluster.suggestedName}"**`);
    lines.push(`- Methods: ${cluster.methods.join(", ")}`);
    if (cluster.sharedFields.length) lines.push(`- Shared fields: ${cluster.sharedFields.join(", ")}`);
    if (cluster.sharedDependencies.length) lines.push(`- Shared deps: ${cluster.sharedDependencies.join(", ")}`);
  }

  lines.push(`\n### Field Access Map`);
  for (const f of r.fieldAccessMap) {
    const owner = f.exclusiveToCluster !== null ? `→ Cluster ${f.exclusiveToCluster + 1}` : "→ SHARED (complicates split)";
    lines.push(`- \`${f.fieldName}\` ${owner}  reads: [${f.readByMethods.join(", ")}]  writes: [${f.writtenByMethods.join(", ")}]`);
  }

  if (r.splitSuggestions.length) {
    lines.push(`\n### 💡 Proposed Split`);
    for (const s of r.splitSuggestions) {
      lines.push(`\n**${s.newClassName}** (~${s.estimatedLines} lines)`);
      lines.push(`- Responsibility: ${s.responsibility}`);
      lines.push(`- Methods: ${s.methods.join(", ")}`);
      if (s.fields.length) lines.push(`- Owns fields: ${s.fields.join(", ")}`);
      if (s.dependencies.length) lines.push(`- Inject: ${s.dependencies.join(", ")}`);
      lines.push(`- Reasoning: ${s.reasoning}`);
    }
  }

  return lines.join("\n");
}

function formatDotnetSplitReport(r: ReturnType<typeof runDotnetSplitAnalysis>[number]): string {
  const lines: string[] = [];
  const urgencyIcon = ({ critical: "🔴", high: "🟠", medium: "🟡", low: "🟢", none: "✅" } as Record<string, string>)[r.splitUrgency] ?? "⚪";

  lines.push(`## ${urgencyIcon} ${r.className}  (${r.file}:${r.line})`);
  lines.push(`**Split Urgency:** ${r.splitUrgency.toUpperCase()}  |  **LCOM Score:** ${r.lcom.score} — ${r.lcom.interpretation}`);
  lines.push(`**Methods:** ${r.lcom.methodCount}  |  **Fields:** ${r.lcom.fieldCount}  |  **Clusters found:** ${r.methodClusters.length}`);

  lines.push(`\n### Method Clusters`);
  for (const cluster of r.methodClusters) {
    lines.push(`\n**Cluster ${cluster.clusterId + 1} → "${cluster.suggestedName}"**`);
    lines.push(`- Methods: ${cluster.methods.join(", ")}`);
    if (cluster.sharedFields.length) lines.push(`- Shared fields: ${cluster.sharedFields.join(", ")}`);
    if (cluster.sharedDependencies.length) lines.push(`- Shared deps: ${cluster.sharedDependencies.join(", ")}`);
  }

  lines.push(`\n### Field Access Map`);
  for (const f of r.fieldAccessMap) {
    const owner = f.exclusiveToCluster !== null ? `→ Cluster ${f.exclusiveToCluster + 1}` : "→ SHARED";
    lines.push(`- \`${f.fieldName}: ${f.typeName}\` ${owner}  reads: [${f.readByMethods.join(", ")}]  writes: [${f.writtenByMethods.join(", ")}]`);
  }

  if (r.splitSuggestions.length) {
    lines.push(`\n### 💡 Proposed Split`);
    for (const s of r.splitSuggestions) {
      lines.push(`\n**${s.newClassName}** (~${s.estimatedLines} lines)`);
      lines.push(`- Responsibility: ${s.responsibility}`);
      lines.push(`- Methods: ${s.methods.join(", ")}`);
      if (s.fields.length) lines.push(`- Owns fields: ${s.fields.join(", ")}`);
      if (s.dependencies.length) lines.push(`- Constructor deps: ${s.dependencies.join(", ")}`);
      lines.push(`- Reasoning: ${s.reasoning}`);
    }
  }

  return lines.join("\n");
}

// ─── Code Intelligence Tools ──────────────────────────────────────────────────

// Tool: Maintainability Index + LCOM
server.tool(
  "analyze_maintainability_index",
  "Computes the Microsoft Maintainability Index (0–100, graded A–F) per method using Halstead Volume + Cyclomatic Complexity + Lines of Code. Also reports LCOM (class cohesion) per class. Lower score = harder to maintain. Works for Angular (ts-morph) and .NET (Roslyn).",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);

    if (type === "angular") {
      const results = analyzeMaintainability(abs);
      const fGrade = results.filter((r) => r.grade === "F").length;
      const dGrade = results.filter((r) => r.grade === "D").length;
      const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.maintainabilityIndex, 0) / results.length) : 0;

      const summary = [
        `## Maintainability Index Report (Angular)`,
        `**Average MI:** ${avg}/100  |  **Grade F:** ${fGrade} methods  |  **Grade D:** ${dGrade} methods\n`,
        `### Worst Methods (Grade D & F):`,
        ...results.filter((r) => r.grade <= "D").slice(0, 10).map((r) =>
          `  [${r.grade}] MI=${r.maintainabilityIndex} — ${r.className}.${r.methodName} (${r.file}:${r.line})\n` +
          `         CC=${r.components.cyclomaticComplexity} | HV=${r.components.halsteadVolume} | LOC=${r.components.linesOfCode} | LCOM=${r.lcom}\n` +
          `         ${r.interpretation}`
        ),
      ].join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };

    } else {
      const res = runDotnetIntelligence(abs, "maintainability");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const items = res.maintainabilityIndex ?? [];
      const fGrade = items.filter((r) => r.grade === "F").length;
      const avg = items.length > 0 ? Math.round(items.reduce((s, r) => s + r.maintainabilityIndexScore, 0) / items.length) : 0;

      const summary = [
        `## Maintainability Index Report (.NET)`,
        `**Average MI:** ${avg}/100  |  **Grade F:** ${fGrade} methods\n`,
        `### Worst Methods:`,
        ...items.filter((r) => r.grade <= "D").slice(0, 10).map((r) =>
          `  [${r.grade}] MI=${r.maintainabilityIndexScore} — ${r.className}.${r.methodName} (${r.file}:${r.line})\n` +
          `         CC=${r.cyclomaticComplexity} | HV=${r.halsteadVolume} | LOC=${r.linesOfCode} | LCOM=${r.lcom}\n` +
          `         ${r.interpretation}`
        ),
      ].join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(items, null, 2) }] };
    }
  }
);

// Tool: Type Graph
server.tool(
  "analyze_type_graph",
  "Builds a complete type graph of the project: all classes, interfaces, enums, records, and type aliases as nodes; extends/implements/injects/returns/parameter/generic/template-ref as edges. Detects circular dependencies, orphan types, most-connected types, layer violations, and Angular-specific relations (component→service, service→repository, input types, routes).",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);

    if (type === "angular") {
      const graph = analyzeTypeGraph(abs);
      const summary = [
        `## Type Graph (Angular)`,
        `**Nodes:** ${graph.nodes.length}  |  **Edges:** ${graph.edges.length}`,
        `**Cycles detected:** ${graph.cycles.length}  |  **Orphan types:** ${graph.orphanTypes.length}\n`,
        graph.cycles.length > 0 ? `### ⚠️ Circular Dependencies:\n${graph.cycles.slice(0, 5).map((c) => `  ${c.join(" → ")}`).join("\n")}` : "### ✅ No circular dependencies",
        `\n### Most Connected Types (depended-on most):`,
        ...graph.mostConnected.slice(0, 8).map((n) => `  ${n.name}: ${n.connections} references`),
        graph.orphanTypes.length > 0 ? `\n### ⚠️ Orphan Types (exported but never used):\n  ${graph.orphanTypes.slice(0, 10).join(", ")}` : "",
        `\n### Angular Relations:`,
        `  Component→Service: ${graph.angularSpecific.componentToService.length} pairs`,
        `  Service→Repository: ${graph.angularSpecific.serviceToRepository.length} pairs`,
        `  Route→Component: ${graph.angularSpecific.routeToComponent.length} routes`,
        `  Input types tracked: ${graph.angularSpecific.inputOutputTypes.length}`,
      ].filter(Boolean).join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(graph, null, 2) }] };

    } else {
      const res = runDotnetIntelligence(abs, "typegraph");
      const graph = res.typeGraph;
      if (!graph) return { content: [{ type: "text", text: res.error ?? "No type graph generated" }] };

      const summary = [
        `## Type Graph (.NET)`,
        `**Nodes:** ${graph.nodes.length}  |  **Edges:** ${graph.edges.length}`,
        `**Cycles:** ${graph.cycles.length}  |  **Orphans:** ${graph.orphanTypes.length}  |  **Layer violations:** ${graph.layerViolations.length}\n`,
        graph.cycles.length > 0 ? `### ⚠️ Circular Dependencies:\n${graph.cycles.slice(0, 5).map((c) => `  ${c.join(" → ")}`).join("\n")}` : "### ✅ No circular dependencies",
        graph.layerViolations.length > 0 ? `\n### 🔴 Layer Violations:\n${graph.layerViolations.map((v) => `  ${v}`).join("\n")}` : "",
        `\n### Most Connected Types:`,
        ...graph.mostConnected.slice(0, 8).map((n) => `  ${n.name}: ${n.count} references`),
        graph.orphanTypes.length > 0 ? `\n### ⚠️ Orphan Types:\n  ${graph.orphanTypes.slice(0, 10).join(", ")}` : "",
      ].filter(Boolean).join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(graph, null, 2) }] };
    }
  }
);

// Tool: CFG + Unreachable Code
server.tool(
  "analyze_control_flow",
  "Builds a control flow model per method and detects: unreachable code after return/throw/break, always-true/false conditions, missing return paths in non-void methods, infinite loop risks (while(true) without break, for without incrementor), nested subscribe() memory leaks (Angular), and async void methods (.NET).",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);

    if (type === "angular") {
      const results = analyzeControlFlow(abs);
      const totalUnreachable = results.reduce((s, r) => s + r.unreachableBlocks.length, 0);
      const totalInfinite = results.reduce((s, r) => s + r.infiniteLoopRisks.length, 0);
      const totalMissing = results.reduce((s, r) => s + r.missingReturnPaths.length, 0);

      const summary = [
        `## Control Flow Report (Angular)`,
        `**Methods with issues:** ${results.length}`,
        `**Unreachable blocks:** ${totalUnreachable}  |  **Missing return paths:** ${totalMissing}  |  **Infinite loop risks:** ${totalInfinite}\n`,
        ...results.slice(0, 8).map((r) => {
          const parts: string[] = [`### ${r.className}.${r.methodName} (${r.file}:${r.line})`];
          r.unreachableBlocks.forEach((b) => parts.push(`  🚫 Line ${b.line}: ${b.reason} → \`${b.code}\``));
          r.alwaysTrueConditions.forEach((c) => parts.push(`  ⚠️ Line ${c.line}: ${c.reason}`));
          r.missingReturnPaths.forEach((p) => parts.push(`  ⚠️ Missing return: ${p.path} (line ${p.line})`));
          r.infiniteLoopRisks.forEach((l) => parts.push(`  🔴 Line ${l.line}: ${l.reason}`));
          return parts.join("\n");
        }),
      ].join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };

    } else {
      const res = runDotnetIntelligence(abs, "cfg");
      if (res.error) return { content: [{ type: "text", text: `⚠️ .NET analyzer error: ${res.error}` }], isError: true };
      const results = res.controlFlow ?? [];
      const totalUnreachable = results.reduce((s, r) => s + r.unreachableBlocks.length, 0);
      const totalInfinite = results.reduce((s, r) => s + r.infiniteLoopRisks.length, 0);

      const summary = [
        `## Control Flow Report (.NET)`,
        `**Methods with issues:** ${results.length}`,
        `**Unreachable blocks:** ${totalUnreachable}  |  **Infinite loop risks:** ${totalInfinite}\n`,
        ...results.slice(0, 8).map((r) => {
          const parts: string[] = [`### ${r.className}.${r.methodName} (${r.file}:${r.line})`];
          r.unreachableBlocks.forEach((b) => parts.push(`  🚫 Line ${b.line}: ${b.reason}`));
          r.alwaysTrueConditions.forEach((c) => parts.push(`  ⚠️ Line ${c.line}: ${c.reason}`));
          r.missingReturnPaths.forEach((p) => parts.push(`  ⚠️ ${p.path} — ${p.suggestion}`));
          r.infiniteLoopRisks.forEach((l) => parts.push(`  🔴 [${l.loopType}] Line ${l.line}: ${l.reason}`));
          return parts.join("\n");
        }),
      ].join("\n");

      return { content: [{ type: "text", text: summary + "\n\n" + JSON.stringify(results, null, 2) }] };
    }
  }
);

// ─── Coverage & Test Quality Tools ───────────────────────────────────────────

// Tool: Code Coverage
server.tool(
  "analyze_coverage",
  "Parses existing coverage reports — lcov.info (Angular/Jest/Karma) or coverage.cobertura.xml (.NET/Coverlet). Shows line/branch/function coverage per file, uncovered files, low-coverage hotspots, and uncovered method names. Run 'ng test --code-coverage' or 'dotnet test --collect:\"XPlat Code Coverage\"' first to generate the report.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);
    const report = type === "angular" ? parseLcov(abs) : parseCobertura(abs);

    if (report.source === "none") {
      const cmd = type === "angular"
        ? "ng test --code-coverage  (or: jest --coverage)"
        : 'dotnet test --collect:"XPlat Code Coverage"';
      return { content: [{ type: "text", text: `⚠️ No coverage report found.\n\nGenerate one first:\n  ${cmd}\n\n${report.hotspots[0]?.functionName ?? ""}` }] };
    }

    const s = report.summary;
    const lines = [
      `## Code Coverage Report (${type === "angular" ? "Angular/lcov" : ".NET/Cobertura"})`,
      `**Grade: ${s.grade}**  |  Line: ${s.lineCoverage}%  |  Branch: ${s.branchCoverage}%  |  Function: ${s.functionCoverage}%`,
      `Covered: ${s.coveredLines}/${s.totalLines} lines  |  ${s.coveredFunctions}/${s.totalFunctions} functions\n`,
    ];

    if (report.uncoveredFiles.length > 0)
      lines.push(`### 🔴 Uncovered Files (0%):\n${report.uncoveredFiles.slice(0, 8).map((f) => `  - ${f}`).join("\n")}`);

    if (report.lowCoverageFiles.length > 0) {
      lines.push(`\n### ⚠️ Low Coverage Files (<60%):`);
      report.lowCoverageFiles.slice(0, 10).forEach((f) => {
        lines.push(`  [${f.severity}] ${f.lineCoverage}% — ${f.file}`);
        if (f.uncoveredFunctions.length > 0)
          lines.push(`    Untested: ${f.uncoveredFunctions.slice(0, 5).join(", ")}`);
      });
    }

    lines.push(`\n### Top 10 Files by Coverage:`);
    report.files.slice(0, 10).forEach((f) => {
      const bar = "█".repeat(Math.round(f.lineCoverage / 10)) + "░".repeat(10 - Math.round(f.lineCoverage / 10));
      lines.push(`  ${bar} ${f.lineCoverage}% — ${f.file} (${f.coveredFunctions}/${f.totalFunctions} fn)`);
    });

    return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(report, null, 2) }] };
  }
);

// Tool: Test Quality
server.tool(
  "analyze_test_quality",
  "Statically analyzes test files without running them. Detects: tests without assertions, tautological assertions (expect(true).toBe(true)), mock-heavy tests, happy-path-only tests, missing error/null scenarios, unhandled async, real timers, no Arrange/Act/Assert structure (.NET), focused/skipped tests. Also finds source files with no test counterpart. Works for Angular (Jest/Jasmine .spec.ts) and .NET (xUnit/NUnit/MSTest).",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);

    if (type === "angular") {
      const report = analyzeAngularTestQuality(abs);
      const s = report.summary;

      const lines = [
        `## Test Quality Report (Angular)`,
        `**Quality Score: ${s.qualityScore}/100 (${s.grade})**`,
        `Tests: ${s.totalTests} in ${s.totalTestFiles} files  |  Avg assertions: ${s.avgAssertionsPerTest}`,
        `Without assertions: ${s.testsWithoutAssertions}  |  Weak assertions: ${s.testsWithWeakAssertions}  |  Happy-path-only: ${s.testsWithOnlyHappyPath}\n`,
      ];

      const critical = report.antiPatterns.filter((p) => p.severity === "critical");
      if (critical.length > 0) {
        lines.push(`### 🔴 Critical Issues (${critical.length}):`);
        critical.slice(0, 8).forEach((p) => {
          lines.push(`  ${p.file} — "${p.testName}" (line ${p.line})`);
          lines.push(`  → ${p.description}`);
          lines.push(`  Fix: ${p.fix}\n`);
        });
      }

      if (report.coverageGaps.filter((g) => !g.testFileExists).length > 0) {
        lines.push(`\n### ⚠️ Source Files Without Tests:`);
        report.coverageGaps.filter((g) => !g.testFileExists).slice(0, 8).forEach((g) => {
          lines.push(`  ${g.sourceFile} → create ${g.suggestedTestFile}`);
          lines.push(`  Untested: ${g.untestedMethods.slice(0, 4).join(", ")}`);
        });
      }

      if (report.recommendations.length > 0) {
        lines.push(`\n### 💡 Recommendations:`);
        report.recommendations.forEach((r) => lines.push(`  • ${r}`));
      }

      return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(report, null, 2) }] };

    } else {
      const report = runDotnetTestQuality(abs);
      if (report.error) return { content: [{ type: "text", text: `⚠️ ${report.error}` }] };

      const s = report.summary!;
      const lines = [
        `## Test Quality Report (.NET)`,
        `**Quality Score: ${s.qualityScore}/100 (${s.grade})**`,
        `Tests: ${s.totalTests} in ${s.totalTestFiles} files  |  Avg assertions: ${s.avgAssertionsPerTest}`,
        `Without assertions: ${s.testsWithoutAssertions}  |  Weak: ${s.testsWithWeakAssertions}  |  Happy-path-only: ${s.testsWithOnlyHappyPath}\n`,
      ];

      const critical = (report.antiPatterns ?? []).filter((p) => p.severity === "critical");
      if (critical.length > 0) {
        lines.push(`### 🔴 Critical Issues (${critical.length}):`);
        critical.slice(0, 8).forEach((p) => {
          lines.push(`  ${p.file} — "${p.testName}" (line ${p.line})`);
          lines.push(`  → ${p.description}`);
          lines.push(`  Fix: ${p.fix}\n`);
        });
      }

      const noTestFile = (report.coverageGaps ?? []).filter((g) => !g.testFileExists);
      if (noTestFile.length > 0) {
        lines.push(`\n### ⚠️ Classes Without Test Files:`);
        noTestFile.slice(0, 8).forEach((g) => {
          lines.push(`  ${g.sourceFile} → create ${g.suggestedTestFile}`);
          lines.push(`  Untested: ${g.untestedMethods.slice(0, 4).join(", ")}`);
        });
      }

      if ((report.recommendations ?? []).length > 0) {
        lines.push(`\n### 💡 Recommendations:`);
        (report.recommendations ?? []).forEach((r) => lines.push(`  • ${r}`));
      }

      return { content: [{ type: "text", text: lines.join("\n") + "\n\n" + JSON.stringify(report, null, 2) }] };
    }
  }
);

// Tool: Combined Coverage + Quality
server.tool(
  "analyze_test_health",
  "Combines coverage report + static test quality in one shot. Shows overall test health: what is covered, what is tested well, and what is missing. Best run after 'ng test --code-coverage' or 'dotnet test --collect:\"XPlat Code Coverage\"'.",
  { projectPath: projectPathSchema, type: projectTypeSchema },
  async ({ projectPath, type }) => {
    const abs = resolve(projectPath);

    const coverage = type === "angular" ? parseLcov(abs) : parseCobertura(abs);
    const quality = type === "angular"
      ? analyzeAngularTestQuality(abs)
      : runDotnetTestQuality(abs);

    if ("error" in quality && quality.error)
      return { content: [{ type: "text", text: `⚠️ Test quality analyzer error: ${quality.error}` }], isError: true };

    const qs = "summary" in quality ? quality.summary : null;
    const cs = coverage.summary;

    const lines = [
      `## Test Health Dashboard (${type === "angular" ? "Angular" : ".NET"})`,
      ``,
      `### Coverage  [${cs.grade}]`,
      `  Line: ${cs.lineCoverage}%  |  Branch: ${cs.branchCoverage}%  |  Function: ${cs.functionCoverage}%`,
      ``,
      `### Quality   [${qs?.grade ?? "?"}]`,
      `  Score: ${qs?.qualityScore ?? "n/a"}/100  |  ${qs?.totalTests ?? 0} tests  |  Avg ${qs?.avgAssertionsPerTest ?? 0} assertions/test`,
      `  Without assertions: ${qs?.testsWithoutAssertions ?? 0}  |  Happy-path-only: ${qs?.testsWithOnlyHappyPath ?? 0}`,
      ``,
      `### Top Priorities:`,
    ];

    // Priority 1: uncovered files
    if (coverage.uncoveredFiles.length > 0)
      lines.push(`  🔴 ${coverage.uncoveredFiles.length} files with 0% coverage`);

    // Priority 2: tests without assertions
    if ((qs?.testsWithoutAssertions ?? 0) > 0)
      lines.push(`  🔴 ${qs!.testsWithoutAssertions} tests with NO assertions — false confidence`);

    // Priority 3: low coverage + no quality test
    const lowCov = coverage.lowCoverageFiles.filter((f) => f.severity === "critical").length;
    if (lowCov > 0)
      lines.push(`  🟠 ${lowCov} files with <30% coverage`);

    // Priority 4: recommendations
    const allRecs = [
      ...("recommendations" in quality ? quality.recommendations ?? [] : []),
    ];
    allRecs.slice(0, 5).forEach((r) => lines.push(`  • ${r}`));

    if (coverage.source === "none")
      lines.push(`\n  ⚠️ No coverage report found — run tests with coverage first`);

    return {
      content: [{
        type: "text",
        text: lines.join("\n") + "\n\n" + JSON.stringify({ coverage, quality }, null, 2),
      }],
    };
  }
);

// ─── Git Diff Parser ──────────────────────────────────────────────────────────

function parseDiff(diff: string): { filename: string; content: string }[] {
  const files: { filename: string; content: string }[] = [];
  const parts = diff.split(/^diff --git /m).filter(Boolean);
  for (const part of parts) {
    const filenameMatch = part.match(/^a\/.+ b\/(.+)$/m);
    if (!filenameMatch) continue;
    const filename = filenameMatch[1].trim();
    const lines = part.split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1));
    files.push({ filename, content: lines.join("\n") });
  }
  return files;
}

// ─── Start ────────────────────────────────────────────────────────────────────

const logViewerPort = parseInt(process.env.LOG_VIEWER_PORT ?? "8090", 10);
startLogViewer(logViewerPort);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("code-review-mcp v2.2 running (compact format, find_api_callers, FromQuery-fix)");
