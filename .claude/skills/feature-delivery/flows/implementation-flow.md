# Implementations-Flow

Verbindliche Prompt-Vorlagen und Review-Raster: [../references/subagent-prompts.md](../references/subagent-prompts.md).

---

## ⚠️ MCP-First Build/Test — Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Build- oder Test-Lauf als Shell-Kommando — immer MCP.**

| Aufgabe | MCP-Tool | MCP-Server | VERBOTEN |
|---------|----------|-----------|---------|
| Angular Build | `build_angular_project` | dev-mcp | Shell `ng build` |
| Angular Test | `test_angular_project` | dev-mcp | Shell `ng test` |
| Angular Lint | `lint_angular_project` | dev-mcp | Shell `ng lint` |
| .NET Build | `build_dotnet_solution` | dev-mcp | Shell `dotnet build` |
| .NET Test | `test_dotnet_solution` | dev-mcp | Shell `dotnet test` |
| .NET Inspectcode | `run_inspectcode` | dev-mcp | Shell `jb inspectcode` |

**MCP nicht erreichbar → Hard Stop:**
`"⚠️ BLOCKER: dev-mcp nicht erreichbar — kein Build/Test-Lauf starten."`
Kein Shell-Fallback ohne explizite Nutzerfreigabe.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## ⚠️ Orchestrator-Delegation-Pflicht — Anti-Shortcut-Regel

**Impl-Loop-Orchestrator schreibt keinen Produkt-Code selbst — immer Scribes.**

**Verboten:**
- Orchestrator schreibt Produkt-Code statt Scribe zu delegieren
- Orchestrator- und Implementierer-Rolle in einem Turn zusammenlegen
- Kein Hard Gate / kein 7x Review-Loop trotz abgeschlossener Implementierung

**Transparenz-Pflicht vor Schritt 2:** Im Chat ausgeben:
`"Starte jetzt implement-scribe-agent fuer Slice [IMP-*]…"`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## From-existing-plan-Einstieg

- Laedt `requests/plans/plan-<feature>.md`
- **Hard Gate laeuft trotzdem** — prueft Umsetzbarkeit des geladenen Plans
- Ueberspringt den gesamten Planungs-Flow
- Dann: direkt in den Implementations-Flow (ab Hard Gate)

---

## Subagent-Typen und Agent-Definitionen

**Modellwahl** ausschliesslich in `../agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

### Rollen im Implementations-Flow

| Rolle | Schritt | Modell | Agent-Datei |
|-------|---------|--------|-------------|
| **Impl-Loop-Orchestrator** | Gesamter Flow | Opus | `../agents/implement-loop-orchestrator.md` |
| **Scribe Runden 1-3** | Slice-Implementierung | Sonnet | `../agents/implement-scribe-agent.md` |
| **Scribe Runden 4-5** | Eskalation | Opus | `../agents/implement-scribe-opus-agent.md` |
| **Pessimist** | Review | Opus | `../agents/implement-review-pessimist-agent.md` |
| **IODA-Reviewer** | Review | Opus | `../agents/implement-review-ioda-agent.md` |
| **Lehrer** | Review | Sonnet | `../agents/implement-review-lehrer-agent.md` |
| **Normalo** | Review | Sonnet | `../agents/implement-review-normalo-agent.md` |
| **Oberlehrer** | Review | Sonnet | `../agents/implement-review-oberlehrer-agent.md` |
| **Professor** | Review | Sonnet | `../agents/implement-review-professor-agent.md` |
| **Optimist** | Review | Sonnet | `../agents/implement-review-optimist-agent.md` |
| **Fix-Planer** | Fix-Planung | Opus | `../agents/implement-fix-planner-agent.md` |

---

## Implementations-Flow-Struktur

```
Hard Gate (Readiness)              Impl-Loop-Orchestrator (Opus, delegierter Agent)
   │  (gilt fuer End-to-end UND From-existing-plan)
   │  Prueft Umsetzbarkeit des Plans (Scope, ACs, Akzeptanzliste, Slices)
   │
   ▼  Scribes 1-10 (parallel oder sequenziell je Topologie)
        Runden 1-3: implement-scribe-agent (Sonnet)
        Runden 4-5: implement-scribe-opus-agent (Opus)

        Je Scribe ZWEISTUFIG (Test-First, §8):
          1) Tests schreiben/aktualisieren — 1:1 nach Plan-Akzeptanzliste (Red)
             Neue/erweiterte Tests MUESSEN zuerst fehlschlagen (F2)
          2) Implementierung bis Tests gruen (Green)

        Je Scribe: NUR slice-scoped Build/Test via dev-mcp
   │
   ▼  Integration-Checkpoint (nach Merge ALLER Scribes, NICHT pro Scribe)
        - Subagent-Outputs sammeln (Summaries, Touched Paths)
        - Geaenderte Stacks klassifizieren → Gate-Scope
        - Interface-/Contract-Drift pruefen
   │
   ▼  QUALITY GATES (integrationsweit — NICHT pro Scribe):

        1. BUILD (muss gruen — Vorbedingung)
             build_dotnet_solution / build_angular_project (dev-mcp)
             Ohne gruenen Build kein Gate 2/3/4

        2. STATISCHE ANALYSE (parallel, nach grunem Build):
             • run_inspectcode               (dev-mcp) → token-opt. JSON
             • ArchUnitNET-Tests             via test_dotnet_solution (dev-mcp)
             • lint_angular_project          (dev-mcp) → ng lint inkl. eslint-plugin-boundaries
             • review_git_diff               (codebase-analyzer)
                  alle 5 focusAreas: security · performance · api-validation
                                     angular-best-practices · solid
                  Befunde speisen als Evidenz die 7 LLM-Reviewer
             • analyze_iosp_compliance       (codebase-analyzer, nachgelagert Strang 5/6)
                  IOSP-Befunde je Methode; ArchUnit-IOSP-Regel bleibt Backstop

        3. IODA-REVIEW: implement-review-ioda-agent (Opus)
             Prueft Code auf IODA-Architektur (Bausteinschnitt, Dekomposition, PoMO)
             IOSP-Mechanik: bis Strang-6-Deployment prueft ioda-agent IOSP fuer Angular selbst

        4. TEST-SUITE: test_dotnet_solution / test_angular_project (dev-mcp)
             Gruen = Akzeptanzkriterien erfuellt (§8/F2)
   │
   ▼  7 Reviewer parallel (readonly):
        pessimist (O) · ioda (O) · lehrer (S) · normalo (S) · oberlehrer (S) · professor (S) · optimist (S)

        lehrer prueft zusaetzlich:
          - Fachliche Korrektheit (kein anderer Reviewer)
          - Deckt die finale Test-Suite alle Akzeptanzkriterien ab? (§8/F4)

        codebase-analyzer review_git_diff-Befunde → speisen als Evidenz alle Reviewer
   │
   ▼  Findings → Fix-Planer (Opus, immer) → Fix-Scribes → Gates erneut
        Runden 4-5: implement-scribe-opus-agent + Fix-Planer-Opus
   │
   ▼  Nach Runde 5 mit offenen Findings: Hard Stop + Rest-Findings-Bericht
```

---

## Schritt 1 — Hard Gate: Implementation Readiness

Fortfahren **nur** wenn alle Fragen YES (oder explizit vom User gewaivert). NO/UNKNOWN → stoppen: fragen; nicht editieren; nicht delegieren.

Bedingte Zeilen (10-13): YES wenn Bedingung nicht zutrifft (N/A).

| # | Frage |
|---|-------|
| 1 | Scope explizit (was in / out)? |
| 2 | Akzeptanzkriterien und Akzeptanz→Test-Liste (§8/F1) explizit und verifikabel? |
| 3 | Betroffene Bereiche klar (konkrete Pfade, Module oder explizite Discovery-Strategie)? |
| 4 | Host-Rules und relevante Skills identifiziert und geladen? |
| 5 | Risiken (Sicherheit, Daten, irreversible Schritte, Migrationen) adressiert oder eskaliert? |
| 6 | Iterativer Impl-Fix-Loop (max. 5 Runden) als Pflicht akzeptiert? |
| 7 | Welche Stacks betroffen → Quality Gates konfigurierbar? |
| 8 | 1-10 Scribes mit Slice-Grenzen aus finalem Plan; Gates integrationsweit vereinbart? |
| 9 | Slice-Grenzen aus finalem Plan — keine neuen Splits erfinden? |
| 10 | >=2 Slices: Ausfuehrungs-Topologie (sequenziell/parallel) explizit? |
| 11 | >=2 Slices: Slice-Unabhaengigkeitsregeln explizit? |
| 12 | >=2 Slices: Blocking-Abhaengigkeiten zwischen Packages benannt? |
| 13 | >=2 Slices: Integration-/Merge-Schritt und Drift-/Konflikt-Ownership definiert? |
| 14 | dev-mcp erreichbar? Bei dotnet/ng Build/Test im Scope: Verfuegbarkeit pruefen; bei UNKNOWN → BLOCKER klaeren. |

---

## Schritt 2 — Scribes (1-10 Implementierungs-Subagents)

**Impl-Loop-Orchestrator implementiert nicht.** Alle Produkt-Edits nur durch Scribes.

1. Ausfuehrungs-Topologie ausfuehren (aus finalem Plan Phase 6).
2. **Scribes strikt:** nur zugewiesener Slice; kein Scope-Expand; keine stille Umplanung.
3. Topologie explizit protokollieren: Anzahl (1-10), Grenzen aus Plan, sequenziell/parallel.
4. Jeder Scribe-Brief enthaelt:
   - Scope (was anfassen, was nicht)
   - Deliverables + Mapping zu Plan-Schritten
   - Akzeptanzliste (Testname + AAA-Stichpunkte) fuer diesen Slice (§8/F1)
   - Test-First-Pflicht: Neue/erweiterte Tests zuerst RED, dann GREEN (§8/F2)
   - Non-Goals: keine Produkt-/Design-Entscheidungen ausserhalb Plan
   - Pflicht: passenden Abschnitt aus `../references/subagent-prompts.md` inkl. MCP-First-Pflicht
5. Keine Abweichung vom finalen Plan ohne User-Freigabe.
6. Scribe-Output ≠ done — erst nach Integration-Checkpoint + Quality Gates.

### Integration-Checkpoint (nach allen Scribes, vor Gates)

- Subagent-Outputs sammeln (Summaries, Touched Paths, Diffs)
- Geaenderte Stacks klassifizieren → Gate-Scope
- Interface-/Contract-Drift zwischen Slices pruefen
- Merge-/Konflikt-Risiko bewerten

---

## Schritt 3 — Iterativer Impl-Fix-Loop

Max. **5 Runden**. Impl-Loop-Orchestrator orchestriert; keine Rollensimulation statt Subagents.

**Pro Runde:** Quality Gates → 7x Review → Digest → Fix-Planer → Fix-Scribes.

**Frueherer Abbruch:** Keine behebbaren Findings + alle Gates gruen → Loop sofort beenden.

**Nach Runde 5 mit offenen Findings:** Rest-Findings-Bericht; kein weiterer Fix-Zyklus.

### Quality-Gate-Sequenz-Logik

- **Errors in Gate 1 oder 2** → Gate 3+4 warten; Fix zuerst
- **Nur Warnings** → alle Gates durchlaufen; gebündelte Findings an Fix-Planer
- **Security-Findings (severity `critical`)** → **immer blockierend** wie Errors — unabhaengig vom Kanal (codebase-analyzer / inspectcode), **nie** als Warning gebuendelt durchgewunken

### Jede Runde

**3.1 Quality Gates (integrationsweit)**

Gate-Reihenfolge einhalten (Build → Statische Analyse → IODA → Tests). Alle Gates dokumentiert rueckmelden.

**3.2 Sieben Impl-Reviews (parallel, readonly)**

7 Subagents, je eine Rolle. Verboten: Rollensimulation im Orchestrator-Thread.
Jeder erhaelt: finaler Plan + ACs + Akzeptanzliste, aktueller Diff/Touched Paths, Gate-Status pro Stack, codebase-analyzer review_git_diff-Befunde als Evidenz.
Task-Prompts: jeweiliger Abschnitt in `../references/subagent-prompts.md`.

**3.3 Review-Digest:** Alle 7 Reports → Review-Digest (Runde N).

**3.4 Findings klassifizieren:**
- Eindeutig fixbar: Correctness-Luecken, fehlende Tests, Rule-Violations, Security-Befunde
- Klaerungsbeduerftig: Produkt-/Design-Ambiguitaet, konfligierende AC-Interpretation

**3.5 Gebuendelte Nutzer-Rueckfragen:** Wenn klaerungsbeduerftig → eine gebuendelte Frage. Warten vor Fix-Planer.

**3.6 Fix-Planer (Opus, immer):** Genau ein `implement-fix-planner-agent` pro Runde. Verboten: Orchestrator-authored Fix-Plaene; Fix-Scribes ohne Fix-Planer-Output. Fix-Planer dedupliziert Doppel-Findings aus inspectcode + codebase-analyzer (v. a. `solid`-Ueberschneidungen).

**3.7 Fix-Scribes:** Scribe-Typ je nach Runde (Runden 1-3: Sonnet; Runden 4-5: Opus).

**3.8 Iterations-Zusammenfassung:** Runden-Nr., Finding-Anzahl je Reviewer, was gefixt, Gate-Status, ob naechste Runde startet oder Loop endet.

**3.9 Abbruchbedingung:**
1. Sauber: keine behebbaren Findings + alle Gates gruen.
2. Maximum: nach Runde 5 — unabhaengig von offenen Findings.

**3.10 Rest-Findings nach Maximum** — Vorlage in `../references/subagent-prompts.md`.

---

## §8 — Test-First / TDD (verbindlich)

**Prinzip:** Akzeptanzkriterien werden test-faehig formuliert (Planung) und vor der Implementierung als Tests geschrieben (Scribe). Die Tests spiegeln die Akzeptanzkriterien → gruene Tests = erfuellte Akzeptanz.
*Warum:* Tests nach der Implementierung testen nur den Ist-Zustand (was zufaellig gebaut wurde), nicht die Soll-Vorgabe. Test-First bindet die Umsetzung an die Anforderung.

| # | Festlegung | Detail |
|---|-----------|--------|
| **F1** | **Plan-Deliverable: Akzeptanzliste** | 1:1 aus Planungs-Flow — Testname (test-design-Konvention) + AAA-Stichpunkte + Markierung (neu/erweitern/unberührt). Scribe implementiert 1:1 nach dieser Vorgabe. |
| **F2** | **Roter Schritt erzwingen** | Scribe verifiziert: neue/erweiterte Tests fehlschlagen zuerst (Red), bevor Implementierung beginnt. Beweist dass der Test echt prueft. Unberuehrte Bestandstests ausgenommen. |
| **F4** | **Akzeptanz-Coverage als Review-Check** | `lehrer`-Reviewer prueft: deckt die finale Test-Suite alle Akzeptanzkriterien ab? Kein neues Gate-Tool — nur Review-Check. |

**Scribe-Ablauf (zweistufig, pro Slice):**
1. Tests nach Plan-Akzeptanzliste schreiben/aktualisieren (Red fuer neu/erweitert)
2. Implementierung bis Tests gruen (Green)

**test-design** ist die Brücke Akzeptanz→Testcode:
- `.cs`/`.csproj` → [../test-design/frameworks/dotnet.md](../test-design/frameworks/dotnet.md)
- `*.spec.ts`/Angular → [../test-design/frameworks/angular.md](../test-design/frameworks/angular.md)
- Namenskonvention: `<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>`

---

## MCP-First Reference

| Aufgabe | MCP-Tool | MCP-Server |
|---------|----------|-----------|
| .NET Build | `build_dotnet_solution` | dev-mcp |
| .NET Test | `test_dotnet_solution` | dev-mcp |
| .NET Inspectcode | `run_inspectcode` | dev-mcp |
| Angular Build | `build_angular_project` | dev-mcp |
| Angular Test | `test_angular_project` | dev-mcp |
| Angular Lint | `lint_angular_project` | dev-mcp |
| Git-Diff Review | `review_git_diff` | codebase-analyzer |
| IOSP Compliance | `analyze_iosp_compliance` | codebase-analyzer |
| Index/Symbol-Suche | `index_project`, `find_in_index` | codebase-analyzer |

---

## Gate-2-Bootstrap (Einmalig je Kundenprojekt)

Bevor `feature-delivery` produktiv laeuft, einmaliger Setup-Schritt (Teil von `.claude/startup.md`):

1. **ArchUnitNET:** NuGet + Regelklasse (`../references/archunit-baseline-template.cs` → bestehendes Test-Projekt kopieren) + Verdrahtung
2. **ESLint-Baseline:** `@angular-eslint` aus `../references/eslint-baseline.json` installieren
3. **Optional:** `eslint-plugin-boundaries` mit Zonen-Template (`../references/eslint-boundaries-template.js`) — falls Projekt core/shared/features-Struktur nutzt; Zonen projektspezifisch anpassen

Ohne diesen Schritt laeuft Gate-2 beim ersten Lauf ins Leere.

---

## BoyScout pro Slice (vor Integration-Checkpoint)

Nach Rueckkehr jedes Scribes (sofern kein `kein boyscout`/`skip boyscout`):
`suggest_boyscout_actions(filePaths: [alle vom Slice geaenderten Dateien], type)` — Top-Findings kompakt im Slice-Report.

---

## Closure (nach Review-Loop)

1. Plan alignment: jeder Plan-Schritt und AC geprueft oder erklaert.
2. Loop-Evidenz: Runden-Anzahl; Gate-Matrix pro Stack/Runde; 7 Reviews je Runde; Fix-Planer mit Evidenz-Basis; Fix-Scribes; Rest-Findings-Bericht wenn noetig.
3. MCP-Compliance: Gate gruen nur mit abgeschlossenen MCP-Laeufen; kein Shell-Bypass.
4. Closure-Format: Vorlage in `../references/subagent-prompts.md`.

---

## Pflegehinweis

Trigger: SKILL.md-Frontmatter aktuell halten. Subagent-Prompt-Vorlagen: nur in `../references/subagent-prompts.md`.

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.
