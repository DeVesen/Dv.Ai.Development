# Umsetzungs-Auftrag — Strang 6: `analyze_iosp_compliance` (Angular/TypeScript, codebase-analyzer) · ARCHIV

> ⚠️ **ARCHIVIERT / HISTORISCH — nachgelagert geplant, nie umgesetzt.**
> Bau-Rezept aus dem ursprünglichen 6-Strang-Aufbau von `feature-delivery`. Dieses Tool
> (`analyze_iosp_compliance` für Angular/TypeScript) war als „später" eingestuft und wurde
> **nie gebaut**. Der Text bleibt als Design-Record erhalten, ist aber kein aktives Vorhaben.
> Verweis auf [`feature-delivery-handoff.md`](../feature-delivery-handoff.md) (selbst archiviert)
> und der Branch-Name sind veraltet.

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§12 (IOSP-Prinzip)** und **§20 (Strang-6-Prompt)**. Zuerst lesen.

## Kontext

Analog zu Strang 5, aber für **Angular/TypeScript** — schließt die .NET/Angular-IOSP-Asymmetrie: beide Stacks liefern dann identisch strukturierte deterministische IOSP-Befunde.

IOSP (Integration Operation Segregation Principle): Methode ist **Integration** (nur Methodenaufrufe, keine eigene Logik) oder **Operation** (Logik/Ausdrücke, keine internen Methodenaufrufe) — nie beides. `slieser/ccdanalyzers` deckt nur .NET ab → eigene Implementierung auf dem TypeScript-AST (ts-morph).

Repo: `C:\Develop\Dv.Ai.Development`. Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln/mergen). **Zuerst `CLAUDE.md` + `docs/mcp/codebase-analyzer.md` lesen.**

> **Voraussetzung: Strang 5 muss abgeschlossen sein** bevor diese Session startet (gleicher MCP-Server, `src/index.ts` wird von beiden Strängen bearbeitet → sequentiell).

## Dein Auftrag (nur Strang 6)

Erweitere `Mcp-Servers\Codebase.Analyzer.Mcp\` um `analyze_iosp_compliance` für TypeScript/Angular — als zweites Ziel desselben Tool-Namens (oder mit `language`-Parameter, Entscheidung nach Lesen des Strang-5-Ergebnisses — falls Strang 5 bereits `analyze_iosp_compliance` registriert hat, mit `language: "typescript"` erweitern, sonst neues Tool).

**Zuerst lesen** (etablierte Muster):
- `src/analyzers/ts-morph-analyzer.ts` — ts-morph-Analyse-Grundlage
- `src/features/ts-advanced-features.ts`, `src/features/ts-code-intelligence.ts` — ts-morph-Runner-Muster
- `src/index.ts` — aktuellen Stand nach Strang-5-Änderungen

### IOSP-Klassifikation auf TypeScript-AST (ts-morph)

Eigenständige Implementierung (kein ccdanalyzers-Äquivalent für TS):

**Intern vs. injected unterscheiden (kritisch):** Ein `this.xyz()`-Aufruf gilt als *klasseninterne Methode*, wenn `xyz` in `classDecl.getMethods().map(m => m.getName())` vorkommt. Aufrufe auf injected Members (`this.httpClient`, `this.router`, `this.store` etc.) sind *keine* klasseninternen Aufrufe — sie zählen nicht als Violation-Trigger.

**Integration-Methode:** Body enthält ausschließlich `CallExpression`-Statements (und ggf. `ReturnStatement` mit einer einzelnen Call-Expression). Keine `IfStatement`, `ForStatement`, `WhileStatement`, `BinaryExpression`, `ConditionalExpression`. Arrow Functions, die als Argumente einer Call-Expression übergeben werden (Callbacks, z.B. in `.pipe(map(...))`, `.forEach(...)`, `.subscribe(...)`), werden **nicht** auf Logik geprüft — nur Statement-Level-Knoten zählen.

**Operation-Methode:** Enthält Logik/Ausdrücke (`BinaryExpression`, `ConditionalExpression`, Kontrollfluss), aber **keine** Aufrufe von klasseninternen Methoden (Lookup: `classDecl.getMethods()`). Aufrufe auf injected Dependencies über `this` sind erlaubt.

**Violation:** Methode enthält sowohl Aufrufe klasseninterner Methoden (s.o.) als auch eigene Logik-Statements auf Statement-Ebene.

**Scope:** Klassen-Methoden in `.ts`-Dateien (ohne `spec.ts`, `node_modules`, `dist`), alle Klassen ohne Filter. Konstruktoren und Getter/Setter überspringen.

### Neue Datei

**`src/features/ts-iosp-runner.ts`** — ts-morph-basierter Runner:
- Nimmt `projectPath` (Windows-Absolutpfad)
- Liest alle relevanten `.ts`-Dateien über ts-morph
- Klassifiziert Methoden und meldet Violations

**Output:** identisches Schema wie Strang 5 (§20 Handoff-Spec):
```json
{
  "summary": { "methods": 0, "violations": 0 },
  "violations": [
    {
      "file": "",
      "method": "",
      "line": 0,
      "integrationCalls": ["this.serviceX()"],
      "operationExpr": ["if (x > 0)"],
      "msg": "Mixes integration (method calls) and operation (expressions/logic)"
    }
  ]
}
```

### Tool-Registrierung

In `src/index.ts`: falls Strang 5 `analyze_iosp_compliance` bereits mit `.NET`-Input registriert hat → `language`-Parameter (`"csharp"` | `"typescript"`) ergänzen und TS-Branch hinzufügen. Falls Strang 5 ein separates Tool registriert hat → neues Tool `analyze_iosp_compliance_angular` oder analog. Entscheide nach aktuellem `index.ts`-Stand — keine stille Annahme.

### Doku

- `docs/mcp/codebase-analyzer.md` aktualisieren (IOSP-Sektion für TS ergänzen).
- `.claude/skills/codebase-analyzer/SKILL.md` entsprechend anpassen.

## Parallelitäts-Sperre (KRITISCH — §19)

- Fasse **NUR** `Mcp-Servers\Codebase.Analyzer.Mcp\**` und `docs/mcp/codebase-analyzer.md` an.
- **NICHT anfassen:** `CLAUDE.md`, zentrale Skill-Index/Registry, `.claude/settings*`.
- Berühre **nicht** `Mcp-Servers\Dev.Mcp\`.
- **Muss sequentiell nach Strang 5** ausgeführt werden.

## Regeln

- Windows-Absolutpfade im Tool-Input. ts-morph-Muster aus bestehenden Analyzern übernehmen.
- Keine stillen Annahmen — insbesondere zur Tool-Registrierungs-Strategie (siehe oben). Kein Commit/Merge ohne Anweisung.

## Verifikation

- `npm run build` grün.
- Tool erscheint in MCP-Tool-Liste.
- Test gegen ein echtes Angular-Projekt: Service mit gemischter Methode (`this.helper()` + `if (x > 0)`) wird als Violation gemeldet; reine Operation-Methode nicht.
- Output-Schema identisch zu Strang-5-Output (nur `file`-Pfade zeigen `.ts` statt `.cs`).
