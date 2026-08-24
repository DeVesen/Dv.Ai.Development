# Design: topN-Cap für Coverage/Quality-Report-Tools

**Datum:** 2026-08-24 (revidiert nach Fehlstart im Deploy-Target)
**Status:** Approved (design), Implementierung läuft im Worktree `worktree-coverage-topn-cap`

## Problem

`analyze_coverage`, `analyze_test_quality` und `analyze_test_health` (alle in `src/index.ts` des MCP-Servers `Mcp-Servers/Codebase.Analyzer.Mcp`) hängen an ihre Markdown-Summary jeweils den **kompletten** Report als `JSON.stringify(report, null, 2)` an — unabhängig von Projektgröße. Die Markdown-Summary selbst cappt bereits informell auf 8–10 Einträge (hardcoded `.slice(0, 8)` / `.slice(0, 10)`), aber der JSON-Block danach enthält immer alle Files, alle Funktionen, alle AntiPatterns.

Bei großen Projekten führt das zu massivem Token-Verbrauch im Tool-Output und zwingt zum manuellen Parsen der zugrunde liegenden `lcov.info` / `coverage.cobertura.xml`, statt den Tool-Vertrag zu nutzen.

## Korrektur zur ursprünglichen Version dieser Spec

Die erste Version dieser Spec (und ihr Plan) wurde versehentlich gegen `C:\Develop\.apps\codebase-analyzer` geschrieben — das ist das **Deploy-Target** von `scripts/deploy.ps1` (Quelle: `Mcp-Servers\Codebase.Analyzer.Mcp`), kein Source-Repo. `deploy.ps1` leert das Target bei jedem Lauf vollständig vor dem Kopieren des `dist/`-Outputs. Jede dort vorgenommene Änderung wäre beim nächsten Deploy spurlos verschwunden. Diese revidierte Version zielt korrekt auf `Mcp-Servers\Codebase.Analyzer.Mcp\src` (TypeScript-Quelle, Teil des Repos `Dv.Ai.Development`, Branch `V2`).

Zusätzlich wurde beim Whole-Branch-Review des Fehlstarts ein echter Spec-Fehler gefunden (siehe „Sortierung vor Cap" unten) und in diese Version eingearbeitet.

## Betroffene Dateien

Alle in `Mcp-Servers\Codebase.Analyzer.Mcp\src`:

| Tool | Datei | Gecappte Arrays im Report |
|------|-------|-----------------------------|
| `analyze_coverage` | `src/index.ts` (~Zeile 1707) | `files`, `uncoveredFiles`, `lowCoverageFiles` (inkl. `uncoveredFunctions` je Eintrag — bleibt ungecappt) |
| `analyze_test_quality` | `src/index.ts` (~Zeile 1752) | `antiPatterns`, `coverageGaps` (inkl. `untestedMethods` je Eintrag — bleibt ungecappt) |
| `analyze_test_health` | `src/index.ts` (~Zeile 2083) | kombiniert `coverage` + `quality` — beide obigen Strukturen verschachtelt unter `{ coverage, quality }` |

Report-Shapes: `src/features/coverage-parser.ts` (`CoverageReport`, Felder `files`/`uncoveredFiles`/`lowCoverageFiles`/`hotspots`), `src/features/test-quality-analyzer.ts` (`TestQualityReport`, Felder `antiPatterns`/`coverageGaps`).

## Lösung

### 1. Gemeinsamer Cap-Helper

Neue Datei `src/features/report-cap.ts`:

```typescript
export function capArrays<T extends Record<string, unknown>>(
  obj: T,
  topN: number,
  arrayKeys: (keyof T)[]
): T {
  const result: Record<string, unknown> = { ...obj };
  for (const key of arrayKeys) {
    const arr = result[key as string];
    if (Array.isArray(arr) && arr.length > topN) {
      result[key as string] = arr.slice(0, topN);
      result[`${String(key)}Truncated`] = true;
      result[`${String(key)}Count`] = arr.length;
    }
  }
  return result as T;
}
```

- Reine Funktion, keine Seiteneffekte auf das Original-Objekt (Shallow-Copy).
- Cappt nur Top-Level-Arrays des übergebenen Objekts — bei `analyze_test_health` wird der Helper separat auf `coverage` und `quality` angewendet, bevor beide in `{ coverage, quality }` zusammengeführt werden.
- Marker-Konvention: `<key>Truncated: true` + `<key>Count: <Originallänge>` als Geschwister-Properties auf derselben Ebene wie das Array — kein Nested-Wrapper.
- Verschachtelte Arrays innerhalb eines Eintrags (z. B. `lowCoverageFiles[i].uncoveredFunctions`, `coverageGaps[i].untestedMethods`) werden NICHT gecappt — nur die Top-Level-Listen. Scope-Grenze: das sind bereits kleine, pro-Datei begrenzte Listen, kein Bloat-Treiber.

### 2. Sortierung vor dem Cap (neu — Korrektur aus dem Whole-Branch-Review)

`antiPatterns` und `coverageGaps` liegen in `test-quality-analyzer.ts` unsortiert in Datei-Iterationsreihenfolge vor (`allAntiPatterns.push(...)` pro Datei ohne Sortierung; `findCoverageGaps` mischt `testFileExists: true` und `false`). Die Prosa filtert vorher (`.filter(p => p.severity === "critical")`, `.filter(g => !g.testFileExists)`), der ungefilterte JSON-Cap würde bei großen Projekten beliebige, nicht notwendigerweise kritische Einträge behalten — genau die Einträge, die die Prosa als wichtig hervorhebt, könnten aus dem JSON verschwinden.

**Fix:** Vor dem Aufruf von `capArrays` werden `antiPatterns` und `coverageGaps` in `src/index.ts` (nicht im Analyzer selbst — kein Verhaltensbruch für andere Konsumenten von `analyzeAngularTestQuality`/`runDotnetTestQuality`) nach Relevanz sortiert:

```typescript
const sortedAntiPatterns = [...report.antiPatterns].sort((a, b) =>
  (a.severity === "critical" ? 0 : a.severity === "warning" ? 1 : 2) -
  (b.severity === "critical" ? 0 : b.severity === "warning" ? 1 : 2)
);
const sortedCoverageGaps = [...(report.coverageGaps ?? [])].sort((a, b) =>
  Number(a.testFileExists) - Number(b.testFileExists)
);
```

Diese sortierten Kopien werden sowohl der Prosa-Filterung als auch `capArrays` zugrunde gelegt, damit Prosa und JSON dieselbe Prioritätsreihenfolge zeigen. `coverage.files`/`coverage.lowCoverageFiles` sind in `coverage-parser.ts:309/321` bereits aufsteigend nach `lineCoverage` sortiert (schlechteste zuerst) — dort ist keine zusätzliche Sortierung nötig.

### 3. Parameter `topN`

An allen drei Tool-Schemas ergänzt:

```typescript
topN: z.number().int().min(1).max(200).default(10)
  .describe("Max entries per list in both the prose summary and the JSON payload. Truncated lists carry a `<key>Truncated`/`<key>Count` marker.")
```

### 4. Prosa-Summary vereinheitlichen + Truncation-Hinweis

Die bisher hardcodierten `.slice(0, 8)` / `.slice(0, 10)` Aufrufe werden durch `.slice(0, topN)` ersetzt. Nach jeder gecappten Prosa-Liste wird — analog zum bestehenden Hausmuster in `analyze_method_extraction_candidates` (`src/index.ts:1896-1897`, `… and ${totalCandidates - ROW_CAP} more (full list in JSON below).`) — ein Hinweis ergänzt, wenn die Liste tatsächlich gekürzt wurde:

```typescript
if (report.files.length > topN)
  lines.push(`  … and ${report.files.length - topN} more (full list capped in the JSON below — increase topN to see more).`);
```

Dieser Hinweis ist hier wichtiger als beim Extraction-Tool, weil dort "full list in JSON below" noch stimmte — hier ist die JSON-Liste jetzt ebenfalls gecappt, der Hinweis muss das sagen statt "vollständige Liste".

### 5. JSON-Payload cappen

Vor dem `JSON.stringify(...)`-Aufruf wird `capArrays` auf das jeweilige Report-Objekt angewendet:

- `analyze_coverage`: `capArrays(report, topN, ["files", "uncoveredFiles", "lowCoverageFiles"])`
- `analyze_test_quality` (Angular-Zweig): `capArrays({ ...report, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps }, topN, ["antiPatterns", "coverageGaps"])` — analog für den .NET-Zweig
- `analyze_test_health`: `{ coverage: capArrays(coverage, topN, [...]), quality: capArrays({ ...quality, antiPatterns: sortedAntiPatterns, coverageGaps: sortedCoverageGaps }, topN, [...]) }`

## Rückwärtskompatibilität

Default `topN = 10` liegt nah am bisherigen Verhalten (8–10 hardcoded). Für kleine/mittlere Projekte (< 10 Einträge je Liste) ändert sich nichts sichtbar außer der (harmlosen) neuen Sortierung von `antiPatterns`/`coverageGaps` — bei < 10 Einträgen ist ohnehin nichts gecappt, aber die Sortierung selbst ist bei jeder Projektgröße aktiv (verändert nur Reihenfolge, keine Inhalte). Für große Projekte ersetzt der explizite Marker den bisherigen stillen Voll-Dump, und die Sortierung stellt sicher, dass die wichtigsten Einträge nicht wegfallen.

## Testing

- Unit-Tests für `capArrays` (neue Datei `src/features/report-cap.test.ts`, ausgeführt mit `node --import tsx --test src/features/report-cap.test.ts` — das ist die in diesem Repo etablierte Test-Konvention, siehe `src/analyzers/roslyn-formatter.test.ts`):
  - `topN` größer als Arraylänge → kein Truncated-Marker, Array unverändert
  - `topN` kleiner als Arraylänge → Array gekürzt, `Truncated: true`, `Count` = Originallänge
  - `topN` gleich Arraylänge → kein Marker
  - leeres Array → kein Marker
  - mehrere `arrayKeys` gleichzeitig, nur einer davon truncated → nur der eine bekommt Marker
  - Objekt ohne diese Keys → Funktion wirft nicht, gibt Objekt unverändert zurück
  - Original-Objekt bleibt unmutiert (Shallow-Copy-Test)
- Kein zusätzlicher Sortier-Test als eigene Unit — die Sortierlogik ist zwei Zeilen Inline-Code in `src/index.ts`, keine exportierte Funktion; wird im End-to-End-Smoke-Check (Task 4/5) mitverifiziert.

## Out of Scope

- Verschachtelte Arrays innerhalb einzelner Report-Einträge (`uncoveredFunctions`, `untestedMethods`) — bleiben unangetastet.
- `hotspots` in `CoverageReport` bleibt ungecappt (bereits durch den Parser selbst auf 30 begrenzt, `coverage-parser.ts:323`) — kein Bloat-Treiber in der Praxis, aber inkonsistent mit `topN`-Anspruch; separates Ticket bei Bedarf.
- `recommendations` in `analyze_test_health` bleibt bei der bestehenden Slice-Grenze, wird aber ebenfalls auf `topN` umgestellt (siehe Plan Task 4) — semantisch keine der drei gecappten Report-Listen, aber dieselbe Codestelle nutzt bereits eine hardcodierte Slice-Zahl (5), die sinnvollerweise denselben Parameter übernimmt statt eine zweite Zahl einzuführen.
- Auslagern des vollen Reports in eine Datei — kann als spätere Erweiterung nachgezogen werden, falls `topN` allein nicht ausreicht.
- Cap für `suggest_boyscout_actions` und andere Tools mit ähnlichem `JSON.stringify(result, null, 2)`-Muster — nicht Teil dieser ursprünglichen Idee, separates Ticket bei Bedarf.
- Guard in `capArrays` gegen `topN === undefined`/`null` — alle drei Aufrufer kommen über zod mit `.default(10)`, ein `undefined` kann bei diesen Call-Sites nicht auftreten.
