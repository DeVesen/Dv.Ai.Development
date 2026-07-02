# Umsetzungs-Auftrag — Strang 3: dev-mcp Tool `analyze_angular_architecture` · ARCHIV

> ⚠️ **ARCHIVIERT / HISTORISCH — ausgeführt, wird nicht gepflegt.**
> Bau-Rezept aus dem ursprünglichen 6-Strang-Aufbau von `feature-delivery`. **Ausgeführt** —
> das Tool `analyze_angular_architecture` existiert heute im dev-mcp.
> Aktuelle Referenz: [`docs/mcp/dev-mcp.md`](../mcp/dev-mcp.md). Branch-Name und der Verweis auf
> [`feature-delivery-handoff.md`](../feature-delivery-handoff.md) (selbst archiviert) sind veraltet.
> Der Body bleibt als Design-/Implementierungs-Record erhalten.

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§10 (dev-mcp Erweiterungen)** und **§20 (Strang-3-Prompt)**. Zuerst lesen.

## Kontext

`feature-delivery` Gate 2 nutzt `eslint-plugin-boundaries` für Zonen-Checks — aber `ng lint` erkennt **nicht**: ob ein `*ApiService` wirklich unter `core/api/` liegt (Placement), ob ein `*ApiService` ausschließlich `HttpClient` injiziert (kein Business-Logic-Schmuggel), ob `HttpClient` direkt in einem Feature-Service injiziert wird (statt über einen ApiService). Dieses Tool schließt diese Lücke über TypeScript-AST-Analyse.

Repo: `C:\Develop\Dv.Ai.Development`. MCP-Server: `Mcp-Servers\Dev.Mcp\Dev.Mcp\` (Dev.Mcp.csproj). Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln/mergen). **Zuerst `CLAUDE.md` + `docs/mcp/dev-mcp.md` lesen.**

> **Abhängigkeit:** Strang 2 (`run_inspectcode`, `lint_angular_project`) ist bereits abgeschlossen — `Tools\InspectionTools.cs`, `Tools\LintTools.cs`, `Services\InspectionRunner.cs`, `Services\LintRunner.cs` existieren als Referenz-Implementierungen. Dieses gleiche Pattern übernehmen.

## Dein Auftrag (nur Strang 3)

Erweitere `Mcp-Servers\Dev.Mcp\Dev.Mcp\` um ein Tool. Lies zuerst `Tools\AngularTools.cs` + `Services\AngularRunner.cs` + `Tools\LintTools.cs` + `Services\LintRunner.cs`, um das etablierte Muster zu verstehen (Tools-Klasse, Service-Klasse, Models-Klasse, Registrierung via `WithTools<...>` in `Program.cs`).

### Tool — `analyze_angular_architecture`

**Input:** `projectPath` (Windows-Absolutpfad zum Angular-Projekt).

**Mechanik:** Statische Analyse des TypeScript-Quelltexts — kein Build erforderlich. Der Service liest `.ts`-Dateien (ohne `node_modules`, `dist`, `.angular`) und prüft drei Regeln:

1. **Placement-Check:** Klassen mit `*ApiService` im Namen → müssen unter `src/app/core/api/` liegen. Alles andere ist `misplaced`.
2. **Naming-Contract-Check:** Klassen unter `core/api/` → dürfen nur `HttpClient` injizieren (kein `Router`, kein weiterer Service, kein `Store`). Verletzt der Code den durch den Namen versprochenen HTTP-only-Vertrag → `namingViolations`.
3. **HttpClient-in-Feature-Check:** Klassen unter `features/*/services/` → dürfen **nicht** direkt `HttpClient` injizieren (müssen ApiService nutzen). Verstöße = `httpInFeatureService`.

**Implementierungs-Ansatz:** Regex/String-Parsing auf Datei-Inhalt ist ausreichend für diese drei Regeln (kein vollständiges TypeScript-Parser-Framework nötig — Dateiinhalt ist deterministisch lesbar). Falls der Implementierer einen besseren Weg sieht (z. B. Aufruf eines npm-Scripts), Sven fragen.

> **Injection-Patterns:** Beide Varianten per Regex erkennen:
> - Constructor-Injection: `constructor(\s*[^)]*\b(HttpClient|Router|...)\b` im Konstruktor-Parameter
> - Functional Injection (Angular 14+): `inject\(HttpClient\)`, `inject\(Router\)` etc. als Feldinitialisierung
>
> Beide Patterns auf denselben Dateiinhalt anwenden — entweder reicht als Treffer.

**Output (token-optimiert, exakt §20 Handoff-Spec):**
```json
{
  "summary": { "filesScanned": 0, "violations": 0 },
  "misplaced": [{ "class": "", "path": "", "expectedZone": "core/api/" }],
  "httpInFeatureService": [{ "class": "", "path": "" }],
  "namingViolations": [{ "file": "", "issue": "" }]
}
```
`namingViolations.issue` beschreibt den Naming-Contract-Bruch, z. B. `"ApiService injects Router — violates HTTP-only contract"`.

`summary.violations` = `misplaced.Count + httpInFeatureService.Count + namingViolations.Count`.

**Zonierung (für die Implementierung):**
```
src/app/
├── core/api/          ← ApiServices (nur HttpClient)
├── shared/components/ ← Dumb Components
└── features/<name>/services/  ← Feature-Services (kein HttpClient direkt)
```

> **Pfad-Normalisierung:** Alle Dateipfade vor Regelprüfungen mit `/` als Separator normalisieren (`path.Replace('\\', '/')`). Regeln wie `src/app/core/api/` sonst auf Windows nicht auflösbar.
>
> **`features/*/services/` — Glob-Tiefe:** Genau eine Wildcard-Ebene (`features/<name>/services/`). Tiefer verschachtelte Pfade (`features/auth/pages/services/`) fallen **nicht** unter diese Regel.

### Neue Dateien (nach etabliertem Muster)

- `Models\AngularArchModels.cs` — Output-DTOs
- `Services\AngularArchRunner.cs` — Analyse-Logik (Dateien lesen, Regeln auswerten)
- `Tools\AngularArchTools.cs` — MCP-Tool-Klasse, registriert sich via `WithTools<AngularArchTools>`

### Doku

- `docs/mcp/dev-mcp.md` um das Tool ergänzen.
- `.claude/skills/dev-mcp/SKILL.md` um das Tool ergänzen.

## Parallelitäts-Sperre (KRITISCH — §19)

- Fasse **NUR** `Mcp-Servers\Dev.Mcp\Dev.Mcp\**`, `docs/mcp/dev-mcp.md` und `.claude/skills/dev-mcp/SKILL.md` an.
- **NICHT anfassen:** `CLAUDE.md`, zentrale Skill-Index/Registry, `.claude/settings*` — macht der finale Integrations-Schritt.
- Berühre **nicht** `Mcp-Servers\Codebase.Analyzer.Mcp\` (Strang 5/6).
- **Kann parallel zu Strang 5 laufen** (verschiedene MCP-Server).

## Regeln

- Windows-Absolutpfade durchgängig. Namespace `Dev.Mcp.*`.
- Keine stillen Annahmen. Kein Commit/Merge ohne Anweisung.

## Verifikation

- Tool baut + startet im MCP-Server (`dotnet build` grün).
- Output-Schema wie oben: drei Arrays, `summary.violations` = Summe aller Verstöße.
- Tool erscheint in der MCP-Tool-Liste.
- Test gegen ein echtes Angular-Projekt: fehlerhaft platzierter `*ApiService` wird als `misplaced` gemeldet; korrekt platzierter nicht.
