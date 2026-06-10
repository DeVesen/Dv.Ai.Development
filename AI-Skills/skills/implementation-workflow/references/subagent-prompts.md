## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{verification-commands}` | Datei mit den Verifikationsbefehlen fuer Agents |

# Subagent-Prompts — Implementation Workflow

Vorlagen zum Kopieren. Platzhalter in eckigen Klammern ersetzen.

**Agent-Typ (Pflicht):** Je Rolle passendes Profil unter [../../agents/](../../agents/). **Modell:** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) lesen; Slugs nicht im Prompt duplizieren.

**Workflow:** [SKILL.md](../SKILL.md) · **build-log-filter-Regel:** [build-log-filter.mdc](../../rules/build-log-filter.mdc)

**Orchestrator-Empfehlung (Schritt 2):** Für Task-Prompts mit Build/Test den Abschnitt **Implementierer (Slice — Build/Test + build-log-filter)** bevorzugen; **Implementierer (Slice — compact)** nur bei trivialen Slices ohne Build/Test.

---

## Implementierer (Slice — compact)

Für Slices **ohne** slice-scoped Build/Test oder als Kurzform mit Verweis auf [implement-agent.md](../../agents/implement-agent.md).

```markdown
You are a subagent for a fixed-scope implementation task.

Context:
- Final plan summary: [1–3 bullets]
- Your slice only: [boundaries, files/areas if known]

Required when the plan section **Umsetzungs-Topologie** is present:
- **Slice-ID:** [e.g. IMP-FE-Search-Rules]
- **Wave:** [e.g. W1 — parallel with IMP-BE-GW-Logging]

Rules:
- **Agent:** `implement-agent` — [implement-agent.md](../../agents/implement-agent.md).
- **Build/Test:** slice-scoped allowed; **build-log-filter** on every run.
- **Not allowed:** stack-wide Technik-Gate (Schritt 3 after integration).
- **Plan adherence:** Implement only this slice — no silent plan drift.

Reply with: summary, touched paths, open risks/blockers.
```

---

## Implementierer (Slice — Build/Test + build-log-filter)

**Standard-Vorlage** für Schritt-2-Task-Prompts mit slice-scoped Build/Test. build-log-filter-Checkliste: [build-log-filter.mdc](../../rules/build-log-filter.mdc).

```text
You are an implementation subagent for ONE plan slice (IMP-*) only.

Slice-ID: [e.g. IMP-FE-Search-Rules]
Working directory: [absolute path]

Hard rules:
- **Agent:** `implement-agent`. **Slice scope only** — not stack-wide Technik-Gate (Schritt 3).
- **Pre-Coding (wenn dev-filesystem-mcp verfügbar):** Vor erstem Code-Edit — `read_class_summary` oder `read_signatures_only` mit `file_path` unter `/project/...`; `read_method` nur für die konkrete Änderungsmethode. Kanon: [dev-filesystem-mcp/SKILL.md](../../dev-filesystem-mcp/SKILL.md). Schema vor Aufruf lesen.
- **Build/Test (slice-scoped):** dotnet/ng/npm build/test for this slice only.
- **Every** run: build-log-filter checklist 1–8; diagnose only from internally read MCP.
- **Forbidden:** stack-wide Technik-Gate; raw console without MCP chain.

Pre-Coding (wenn Dev-MCPs verfuegbar):
  Lesen: dev-filesystem-mcp — Kanon ../../dev-filesystem-mcp/SKILL.md (file_path, /project/...)
  Angular scaffold: dev-angular-mcp — Kanon ../../dev-angular-mcp/SKILL.md (project_root Host-Absolut)
  .NET scaffold: dev-dotnet-mcp — Kanon ../../dev-dotnet-mcp/SKILL.md (output_path, base_path)
  Schema vor jedem MCP-Aufruf lesen.

Reply with: summary, touched paths, Verifikations-Matrix per run, blockers.
```

---

## Technik-Gate pro Stack

```text
Rolle: Du fuehrst das Technik-Gate fuer genau einen Stack aus (Frontend oder Backend).
Kontext: aktuelle Iteration im Implement-Review-Loop.

Stack: [Frontend | Backend | Backend/Sub-Einheit]
Working directory: [absolute path]
Commands: aus [{verification-commands}] + Repo-Doku.

Phase 1 (Build-Fix, max 8 Turns):
1) Build ausfuehren.
2) Vollstaendiges Capture.
3) In-scope: filter_output/filter_output_stream immer (auch Exit 0), bei FAIL analyze_build_output.
4) Vor jedem MCP: "Rufe build-log-filter ...".
5) MCP down => BLOCKER: build-log-filter nicht erreichbar.
6) Bei FAIL minimale Fixes, wiederholen.

Phase 2 (Test-Fix, max 8 Turns, nur wenn Phase 1 OK):
1) Unit-Test-Command ausfuehren.
2) gleiche build-log-filter-Kette wie Phase 1.
3) Bei FAIL minimale Fixes, wiederholen.

Rueckgabe:
- Phase 1 OK/FAIL, Turns, Command
- Phase 2 OK/FAIL/SKIPPED, Turns, Command
- Verifikations-Matrix (eine Zeile pro Lauf)
- Kurzdiagnose je Lauf (nur aus intern gelesener MCP-Ausgabe)
- Geaenderte Pfade (nur Gate-Fixes)
```

---

## Implement-Review: Pessimist

```text
Rolle: implement-review-pessimist-agent (readonly).
Input:
- Finaler Plan + ACs
- Aktueller Diff / betroffene Pfade
- Technik-Gate-Status je Stack

Pflicht-MCP:
- detect_untested_public_api
- analyze_refactoring_safety
- find_symbol_references

Liefern:
- Nummerierte Risiko-/Blocker-Liste (priorisiert)
- Klar trennen: [KRITISCH] / [WESENTLICH] / [FORMAL]
```

## Implement-Review: Lehrer

```text
Rolle: implement-review-lehrer-agent (readonly).
Pflicht-MCP:
- review_git_diff
- review_files_batch (oder review_file)
- compare_validation_rules (wenn FE/BE-Validierung betroffen)

Liefern:
- Nummerierte fachliche Fehlerliste, priorisiert nach Schaden.
```

## Implement-Review: Normalo

```text
Rolle: implement-review-normalo-agent (readonly).
Pflicht-MCP:
- review_with_index
- analyze_duplicates

Liefern:
- Nummerierte Punkte zu Alltagstauglichkeit, Ship-Readiness, fehlenden Details.
```

## Implement-Review: Oberlehrer

```text
Rolle: implement-review-oberlehrer-agent (readonly).
Pflicht-MCP:
- review_file
- analyze_maintainability_index

Liefern:
- Mindestens 3 nummerierte Kritikpunkte + Note 1-6.
```

## Implement-Review: Professor

```text
Rolle: implement-review-professor-agent (readonly).
Pflicht-MCP:
- analyze_advanced_all
- analyze_test_quality

Liefern:
- Priorisierte Liste mit [KRITISCH]/[WESENTLICH]/[FORMAL]
- Gesamtnote 1-5 mit Begruendung.
```

## Implement-Review: Optimist

```text
Rolle: implement-review-optimist-agent (readonly).
Pflicht-MCP:
- review_with_index

Liefern:
- Nummerierte Staerken, bereits erfuellte ACs, tragfaehige Vereinfachungen.
```

---

## Review-Digest (Implement)

```text
### Review-Digest (Iteration [N])

#### Pessimist
- Punkt 1: ...

#### Lehrer
- Punkt 1: ...

#### Normalo
- Punkt 1: ...

#### Oberlehrer
- Punkt 1: ...
- Note: ...

#### Professor
- [KRITISCH] Punkt 1: ...
- Note: ...

#### Optimist
- Punkt 1: ...
```

---

## Gebuendelte Rueckfragen (vor Fix-Plan)

```text
Vor dem Fix — kurze Rueckfragen:
1. [Punkt A] — [Kontext]
2. [Punkt B] — [Kontext]

Bitte kurz beantworten, damit ich direkt weiterarbeiten kann.
```

---

## Fix-Planer (nach Review)

```text
Rolle: implement-fix-planner-agent.
Du erstellst einen Fix-Teilplan, implementierst NICHT.

Pflicht-Rules (1-5):
1) implementation-workflow-skill.mdc
2) build-log-filter.mdc
3) codebase-analyzer.mdc
4) codebase-analyzer/SKILL.md
5) angular-skills.mdc / backend-ef-migrations-skill.mdc (falls Scope passt)

Input:
- Finaler Plan + ACs
- Review-Digest (6 Rollen)
- Technik-Gate-Status je Stack
- klassifizierte Findings
- Diff-/Pfadliste

MCP-Reihenfolge A-H (verbindlich):
A index_project + find_in_index
B review_git_diff
C review_files_batch/review_file
D analyze_complexity + analyze_refactoring_safety
E detect_untested_public_api
F analyze_test_quality
G find_symbol_references
H compare_validation_rules

build-log-filter:
- Technik-Gate nur ueber MCP-/Kurzdiagnosen interpretieren.
- Optionale Diagnose-Laeufe erlaubt, aber nicht stack-weite Abschlusspruefung.
- Vor jedem MCP: "Rufe build-log-filter ...".
- MCP down => BLOCKER: build-log-filter nicht erreichbar (kein Fix-Plan ausgeben).

Liefern:
1) Konkrete Fix-Schritte (Datei/Symbol/Reihenfolge)
2) Scope (Stack/Topic)
3) Lokale ACs
4) Risiken/offene Punkte
5) Vorgeschlagene IMP-Slice-IDs + Wellen/Blocking
6) Abgrenzung (nicht anfassen)
7) Evidenz-Basis (Pflicht):
   - MCP-Calls + ok/fallback
   - ggf. Diagnose-Laeufe (Command, Exit, Kurzdiagnose)
   - Technik-Gate-Bezug je Slice
```

---

## Implementierer (Fix-Slice)

```text
Rolle: implement-agent.
Input:
- Fix-Teilplan (verbindlich)
- zugewiesener Fix-Slice (IMP-*)

Regeln:
- Nur dieser Slice.
- Build/Test slice-scoped.
- build-log-filter pro Lauf.
- keine stille Scope-Erweiterung.

Rueckgabe:
- Summary
- Touched paths
- Build/Test-Matrix
- offene Risiken/Blocker
```

---

## Abschlussformat (Orchestrator)

```markdown
## Summary
- Ergebnis vs. Plan: [complete | partial]
- Iterationen: [Anzahl] von max. 3
- Loop-Ende: [sauber | Maximum mit Rest-Findings]

## Iterativer Review-Loop
- Technik-Gate je Iteration/Stack: [OK/FAIL/SKIPPED]
- Reviews je Iteration: 6 Rollen ausgefuehrt [ja/nein]
- Fix-Planer je Iteration: [vorhanden + Evidenz-Basis ja/nein]
- Umgesetzte Fix-Slices: [Liste]
- Letzte Iteration ohne behebbares Finding: [ja/nein]

## Rest-Findings (nur bei Maximum mit offenen Punkten)
- Pessimist: [Punkte oder —]
- Lehrer: [Punkte oder —]
- Normalo: [Punkte oder —]
- Oberlehrer: [Punkte oder —]
- Professor: [Punkte oder —]
- Optimist: [Punkte oder —]
- Technik-Gate letzte Iteration: [OK/FAIL/SKIPPED]

## Offene Punkte
- [falls vorhanden; bei Rest-Findings hier Empfehlung: manuell / User-Entscheidung / akzeptiertes Rest-Risiko]
```

---

## Rest-Findings nach Maximum (Orchestrator)

Nur wenn nach **Iteration 3** noch behebbare oder wesentliche Findings offen sind — **kein** vierter Review-Zyklus.

```markdown
## Rest-Findings nach 3 Iterationen

Technik-Gate (Iteration 3): [OK/FAIL/SKIPPED je Stack]

### Pessimist
- [noch offen] ...

### Lehrer
- ...

### Normalo
- ...

### Oberlehrer
- ...

### Professor
- [KRITISCH/WESENTLICH/FORMAL] ...

### Optimist
- ...

**Hinweis:** Review-Loop-Maximum erreicht — keine weitere automatische Fix-Runde. User-Entscheidung oder manuelle Nacharbeit empfohlen fuer offene Punkte.
```
