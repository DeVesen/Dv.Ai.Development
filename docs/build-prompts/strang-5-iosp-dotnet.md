# Umsetzungs-Auftrag — Strang 5: `analyze_iosp_compliance` (.NET/C#, codebase-analyzer)

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§12 (IOSP-Prinzip)** und **§20 (Strang-5-Prompt)**. Zuerst lesen.

## Kontext

IOSP (Integration Operation Segregation Principle, Stefan Lieser / Clean Code Developer) besagt: Eine Methode ist entweder **Integration** (ruft nur andere Methoden auf, keine eigene Logik) oder **Operation** (Logik/Ausdrücke/I-O, keine internen Methodenaufrufe) — nie beides. Gemischte Methoden sind IOSP-Verletzungen.

Das codebase-analyzer MCP (`Mcp-Servers\Codebase.Analyzer.Mcp\`, Node/TypeScript) analysiert bereits .NET-Code über eine Roslyn-Bridge (`src/analyzers/roslyn-runner.ts` + `src/features/dotnet-*-runner.ts`). Dieses Tool ergänzt die deterministische IOSP-Prüfung auf Methoden-Ebene.

Repo: `C:\Develop\Dv.Ai.Development`. Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln/mergen). **Zuerst `CLAUDE.md` + `docs/mcp/codebase-analyzer.md` lesen.**

> **Wichtig:** Strang 6 (Angular/ts-morph) teilt denselben MCP-Server → Strang 5 **zuerst**, Strang 6 danach (sequentiell).

## Dein Auftrag (nur Strang 5)

Erweitere `Mcp-Servers\Codebase.Analyzer.Mcp\` um `analyze_iosp_compliance` für C#/.NET.

**Zuerst lesen** (etablierte Muster verstehen):
- `src/features/dotnet-advanced-runner.ts` — **primäres Muster**: Project-Root-Input, eigenes `.csx`-Skript, `DOCKER_SCRIPT_PATH`-Konvention, `normalizePascalToCamel`
- `src/analyzers/roslyn-runner.ts` — Bridge-Architektur als Hintergrund (verarbeitet **Einzeldateien** — kein Vorbild für IOSP)
- `src/index.ts` — Tool-Registrierung verstehen

### Referenz-Logik: `slieser/ccdanalyzers`

Stefan Lieser ist Co-Autor des IOSP-Prinzips. Sein Open-Source-Roslyn-Analyzer (MIT-Lizenz) liegt unter:
`https://github.com/slieser/ccdanalyzers`
Kernlogik: `CleanCodeDeveloper.Analyzers/IOSPAnalyzer.cs`

**Aufgabe:** Diese Klassifikationslogik (Integration vs. Operation) in die Roslyn-Bridge übernehmen/adaptieren. **Nicht** das NuGet-Paket einbinden (Kundenabstimmung) — Logik verstehen und im bestehenden Roslyn-Runner-Kontext re-implementieren oder als eigenem C#-Helper neu schreiben.

**Klassifikation (aus IOSPAnalyzer.cs-Logik):**
- **Integration:** Methoden-Body enthält ausschließlich Methodenaufrufe (keine Arithmetik, kein `if`/`while`/`for`, keine Operatoren, keine Literale außer Argumente)
- **Operation:** enthält Logik/Ausdrücke, aber keine Aufrufe projekt-interner Methoden (externe/Framework-Calls wie `DateTime.Now`, Repository-Calls o.ä. gelten nicht als intern und sind erlaubt)
- **Violation:** Methode ist weder rein Integration noch rein Operation

### Neue Dateien

**`roslyn-analyzer/roslyn-iosp.csx`** — neues C#-Skript mit der IOSP-Klassifikationslogik (aus `IOSPAnalyzer.cs` adaptiert). Muster: `roslyn-advanced.csx`. Input: Solution/Project-Root-Pfad als Argument (`Args[0]`). Ausgabe: JSON mit Methoden-Liste und Violations.

**`src/features/dotnet-iosp-runner.ts`** — TypeScript-Runner nach dem Muster von `dotnet-advanced-runner.ts`:
- `const DOCKER_SCRIPT_PATH = "/app/roslyn-analyzer/roslyn-iosp.csx"` + lokale `resolveScriptPath()`-Funktion (Muster aus `dotnet-advanced-runner.ts` übernehmen)
- Ruft `roslyn-iosp.csx` via `spawnSync("dotnet", ["script", "--no-cache", resolveScriptPath(), "--", rootPath])` auf
- Normalisiert PascalCase→camelCase (Hilfsfunktion aus Muster übernehmen)
- Gibt token-optimiertes Ergebnis zurück

**Output (exakt §20 Handoff-Spec):**
```json
{
  "summary": { "methods": 0, "violations": 0 },
  "violations": [
    {
      "file": "",
      "method": "",
      "line": 0,
      "integrationCalls": [""],
      "operationExpr": [""],
      "msg": "Mixes integration (method calls) and operation (expressions/logic)"
    }
  ]
}
```

### Tool-Registrierung

In `src/index.ts`: neues Tool `analyze_iosp_compliance` registrieren — analog zu bestehenden dotnet-Tools (input: `solutionPath` oder `projectPath` als Windows-Absolutpfad).

### Doku

- `docs/mcp/codebase-analyzer.md` um das Tool ergänzen (Sektion „Statische Analyse" oder neue Sektion „IOSP").
- `.claude/skills/codebase-analyzer/SKILL.md` (falls vorhanden) entsprechend ergänzen.

## Parallelitäts-Sperre (KRITISCH — §19)

- Fasse **NUR** `Mcp-Servers\Codebase.Analyzer.Mcp\**` und `docs/mcp/codebase-analyzer.md` an.
- **NICHT anfassen:** `CLAUDE.md`, zentrale Skill-Index/Registry, `.claude/settings*`.
- Berühre **nicht** `Mcp-Servers\Dev.Mcp\` (das ist Strang 2/3).
- **Kann parallel zu Strang 3 laufen** (verschiedene MCP-Server). Muss **vor Strang 6** abgeschlossen sein.

## Regeln

- Windows-Absolutpfade im Tool-Input. Keine stillen Annahmen.
- Falls die IOSPAnalyzer-Logik beim Lesen unklar ist oder die Roslyn-Bridge-Integration aufwändig abzuweichen scheint: Sven fragen statt still vereinfachen.
- Kein Commit/Merge ohne Anweisung.

## Verifikation

- `npm run build` (oder äquivalentes Build-Kommando im Codebase.Analyzer.Mcp-Verzeichnis) grün.
- Tool erscheint in der MCP-Tool-Liste.
- Test gegen `test-fixtures/index-solution/App.sln` (liegt im Repo): eine gemischte Methode wird als Violation gemeldet; eine reine Integration-Methode nicht. Optional: eigenes `test-fixtures/iosp/dotnet/`-Fixture mit `expected.json` anlegen (Muster: `test-fixtures/boyscout-actions/dotnet/`).
- Output-Schema entspricht obiger Spezifikation.
