import { RoslynMetadata } from "./roslyn-runner.js";

export function formatRoslynSection(meta: RoslynMetadata, compact = false): string {
  if (meta.error) {
    const isAstEmpty = meta.error.includes('AST empty') ||
      (meta.classes.length === 0 && meta.interfaces.length === 0);
    const headline = isAstEmpty
      ? '⚠️ AST empty — Roslyn parse failed, review inconclusive. DO NOT conclude "no issues found".'
      : `⚠️ ${meta.error} — review based on code only.`;
    return `## AST Analysis (Roslyn)\n${headline}\n`;
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

  for (const cls of meta.classes) {
    if (cls.propertyAnnotations && cls.propertyAnnotations.length > 0) {
      const annotated = cls.propertyAnnotations.filter((p) => p.annotations.length > 0).length;
      const unannotated = cls.propertyAnnotations.filter((p) => p.annotations.length === 0);
      if (compact) {
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
