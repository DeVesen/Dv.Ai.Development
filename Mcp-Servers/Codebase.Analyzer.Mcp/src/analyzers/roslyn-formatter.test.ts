import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatRoslynSection } from "./roslyn-formatter.js";
import type { RoslynMetadata } from "./roslyn-runner.js";

const emptyMeta = (): RoslynMetadata => ({
  filename: "test.cs",
  classes: [],
  interfaces: [],
  usings: [],
  solidViolations: [],
  apiValidationIssues: [],
  metrics: { totalClasses: 0, totalInterfaces: 0, totalUsings: 0, avgMethodsPerClass: 0, maxMethodsInClass: 0, totalSolidViolations: 0, criticalViolations: 0, totalApiValidationIssues: 0, criticalApiValidationIssues: 0 },
});

describe("formatRoslynSection", () => {
  it("ReviewGitDiff_CSharpDateiLeerAST_WarnungAusgegeben", () => {
    const meta: RoslynMetadata = {
      ...emptyMeta(),
      error: "AST empty — Roslyn parse failed, review inconclusive",
    };
    const output = formatRoslynSection(meta, false);
    assert.ok(output.includes("AST empty"), `expected 'AST empty' in: ${output}`);
    assert.ok(output.includes("review inconclusive"), `expected 'review inconclusive' in: ${output}`);
    assert.ok(output.includes("DO NOT conclude"), `expected 'DO NOT conclude' in: ${output}`);
  });

  it("ReviewGitDiff_CSharpDateiLeerAST_WarnungImCompactModus", () => {
    const meta: RoslynMetadata = {
      ...emptyMeta(),
      error: "AST empty — Roslyn parse failed, review inconclusive",
    };
    const output = formatRoslynSection(meta, true);
    assert.ok(output.includes("AST empty"), `compact mode must also warn: ${output}`);
    assert.ok(output.includes("DO NOT conclude"), `compact must not suppress warning: ${output}`);
  });

  it("ReviewGitDiff_CSharpDateiMitInhalt_KeineWarnung", () => {
    const meta: RoslynMetadata = {
      ...emptyMeta(),
      classes: [{
        name: "Foo",
        isRecord: false,
        lineStart: 1,
        methodCount: 1,
        propertyCount: 0,
        constructorDeps: [],
        newExpressions: [],
        longMethods: [],
        switchCount: 0,
        deepNestingLines: [],
        attributes: [],
        baseTypes: [],
        asyncMethods: [],
        resultWaitLines: [],
        hardcodedSecretLines: [],
        isAbstract: false,
        isSealed: false,
        isPartial: false,
        propertyAnnotations: [],
        methodAnnotations: [],
      }],
      metrics: { totalClasses: 1, totalInterfaces: 0, totalUsings: 0, avgMethodsPerClass: 1, maxMethodsInClass: 1, totalSolidViolations: 0, criticalViolations: 0, totalApiValidationIssues: 0, criticalApiValidationIssues: 0 },
    };
    const output = formatRoslynSection(meta, false);
    assert.ok(!output.includes("AST empty"), `no warning expected for non-empty AST: ${output}`);
    assert.ok(output.includes("Metrics"), `expected metrics section: ${output}`);
  });

  it("ReviewGitDiff_NichtTrivialCSharp_LeerAST_OhneError_isAstEmptyFallback_WarnungSichert", () => {
    // isAstEmpty via empty classes+interfaces even without 'AST empty' in error text
    const meta: RoslynMetadata = {
      ...emptyMeta(),
      error: "Roslyn runner timed out",
    };
    const output = formatRoslynSection(meta, false);
    // classes=[] and interfaces=[] → isAstEmpty=true → DO NOT conclude warning
    assert.ok(output.includes("DO NOT conclude"), `empty AST fallback must show strong warning: ${output}`);
  });

  it("ReviewGitDiff_FehlerMitAST_GibtNurRosenFehlerAus", () => {
    // meta.error set but classes are non-empty → not isAstEmpty → plain error message
    const meta: RoslynMetadata = {
      ...emptyMeta(),
      classes: [{
        name: "Bar",
        isRecord: false,
        lineStart: 5,
        methodCount: 0,
        propertyCount: 0,
        constructorDeps: [],
        newExpressions: [],
        longMethods: [],
        switchCount: 0,
        deepNestingLines: [],
        attributes: [],
        baseTypes: [],
        asyncMethods: [],
        resultWaitLines: [],
        hardcodedSecretLines: [],
        isAbstract: false,
        isSealed: false,
        isPartial: false,
        propertyAnnotations: [],
        methodAnnotations: [],
      }],
      error: "Partial parse — some constructs unsupported",
    };
    const output = formatRoslynSection(meta, false);
    assert.ok(output.includes("review based on code only"), `non-empty AST error must use plain message: ${output}`);
    assert.ok(!output.includes("DO NOT conclude"), `must not show strong warning when AST non-empty: ${output}`);
  });
});
