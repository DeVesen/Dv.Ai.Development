---
name: implementation-workflow
description: >
  Repo-Umsetzung: Hard Gate, 1–10 implement-agent (Slice inkl. Build/Test), iterativer Implement-Review-Loop max. 3× (Technik-Gate, 6 Reviews, implement-fix-planner-agent, Fix-Slices). build-log-filter + codebase-analyzer Pflicht. Trigger (kanonisch in Rule): implementiere/setze um/fix/einbauen/leg los, Plan ausführen, impliziter Repo-Code-Intent, @implementation-workflow-skill, Hard Gate, Schritt 2/IMP-\*, engl. apply changes/go ahead/ship it; Opt-out ohne implement-skill. Discovery via alwaysApply-Rule (disable-model-invocation: true — Skill nicht auto-invoked).
disable-model-invocation: true
---

# Parameter

| Parameter                 | Beschreibung                                                  |
| ------------------------- | ------------------------------------------------------------- |
| `{frontend-path}`         | Pfad zum Frontend-Projekt innerhalb von `{code-root}`         |
| `{backend-path}`          | Pfad zum Backend-Projekt innerhalb von `{code-root}`          |
| `{agent-index}`           | Datei mit der Repository-Agentenübersicht (z. B. `AGENTS.md`) |
| `{verification-commands}` | Datei mit den Verifikationsbefehlen für Agents                |


# Implementation Workflow

## ⚠️ MCP-First Build/Test — Anti-Shortcut-Regel (höchste Priorität, ohne Ausnahme)

**Kein Build- oder Test-Lauf als Shell-Kommando — immer MCP.**

| Aufgabe | MCP-Tool | MCP-Server | VERBOTEN |
|---------|----------|-----------|---------|
| Angular Build | `build_angular_project` | dev-angular-mcp | Shell `ng build` |
| Angular Test | `test_angular_project` | dev-angular-mcp | Shell `ng test` |
| .NET Build | `build_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet build` |
| .NET Test | `test_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet test` |

**Pro Lauf:** MCP-Tool aufrufen → `errors[]`, `warnings[]`, `summary`, `success` auswerten → nur MCP-`success: true` gilt als Verifikationsnachweis → im Bericht dokumentieren.

**MCP nicht erreichbar → Hard Stop:**
`„⚠️ BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar — kein Build/Test-Lauf starten."`
Kein Shell-Fallback ohne explizite Nutzerfreigabe; kein build-log-filter-Ausweichen ohne Freigabe.

**"path does not exist" ≠ MCP nicht erreichbar:** MCP läuft — der Pfad ist falsch. Vor BLOCKER systematisch prüfen:
1. `mcp-project-paths.md` (deployed) lesen → Kanon-Pfad für `{mcp-backend-path}`, `{mcp-backend-solution}`
2. Solution-Datei (`.sln`) statt Projekt-Pfad versuchen
3. Relativen Pfad ohne `/workspace/`-Präfix versuchen (Ableitung: `"/workspace/" + relPath aus skill-params.json`)
Erst nach diesen Versuchen ohne Erfolg → BLOCKER.
`test_dotnet_solution` / `test_angular_project` sind eigenständige MCP-Tools — separat aufrufen, auch wenn Build-MCP bereits lief.

**Kein Opt-out** (außer explizitem User-Text für B/C/D gemäß `{verification-commands}`).

**Transparenz-Pflicht:** Vor jedem Build/Test-Lauf im Chat ausgeben:
`„Führe jetzt Build/Test via [build_angular_project | test_angular_project | build_dotnet_solution | test_dotnet_solution] aus."`
Wenn dieser Satz nicht möglich, weil Shell statt MCP → **STOPP:** `„⚠️ MCP-First-Pflicht verletzt: [Kommando] ohne MCP-Aufruf. Nicht regelkonform."`

## ⚠️ Orchestrator-Delegation-Pflicht — Anti-Shortcut-Regel

**Orchestrator schreibt in Schritt 2+3 keinen Produkt-Code selbst — immer implement-agent.**

Auch wenn der Nutzer sagt „mach alles fertig", „stoppe nicht", „ein Turn":
→ Delegation bleibt Pflicht, kein Opt-out, keine Ausnahme.

**Vollständiges Lesen Pflicht:** Skill end-to-end lesen vor dem ersten Schritt — kein Partial-Read und dann starten.

**Transparenz-Pflicht vor Schritt 2:** Im Chat ausgeben:
`„Starte jetzt implement-agent für Slice [IMP-*]…"`

**Wenn dieser Satz nicht möglich, weil Orchestrator selbst implementieren will → STOPP:**
`„⚠️ Orchestrator-Delegation verletzt: Slice [IMP-*] ohne implement-agent. Nicht regelkonform. Neu starten."`

**Verboten:**
- Orchestrator schreibt Produkt-Code statt implement-agent zu delegieren
- Orchestrator- und Implementierer-Rolle in einem Turn zusammenlegen
- Kein Technik-Gate / kein 6× Review-Loop trotz abgeschlossener Implementierung

## Subagent-Typen und Agent-Definitionen (host-neutral)

**Modellwahl** ausschließlich in `../../agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

### Rollen im Implementation Workflow

| Rolle | Schritt | Agent-Typ |
| -------------------------------- | ------------------------------- | --------------------------------- |
| **Orchestrator / Initial Agent** | 1, Integration, 3 Loop | *(Nutzer-Chat / Parent)* |
| **Implementierer** | 2 (1–10 Slices), 3 (Fix-Slices) | `implement-agent` |
| **Technik-Gate** | 3.1 (pro Iteration) | Orchestrator-Subagent / Host-Task |
| **Implement-Review ×6** | 3.2 (pro Iteration) | `implement-review-*-agent` |
| **Fix-Planung** | 3.6 (pro Iteration) | `implement-fix-planner-agent` |

**Subagent — Modell vor Task (Pflicht):** `subagent-model-before-task.md` — vor jedem Task Ziel-Profil lesen; primär Abschnitt `## Modell`, sonst YAML; Slugs nicht hier duplizieren.

- **implement-agent:** genau ein Slice (IMP-*); Build/Test slice-scoped via MCP; Unit-Tests im Slice; build-log-filter Pflicht auf jedem Lauf.
- **implement-review-*:** readonly; je eine Rolle; 6 parallele Läufe pro Iteration; MCP-Pflicht je Profil.
- **implement-fix-planner-agent:** Fix-Teilplan aus Review-Digest; MCP A–H + build-log-filter + Evidenz-Basis; keine Code-Implementierung.
- **Technik-Gate:** stack-weiter Build + Unit-Tests (max. 8 Turns je Phase); build-log-filter Pflicht; enge Gate-Fixes erlaubt.
- **Verboten:** `explore`/`generalPurpose` statt dedizierter Agent-Profile; Orchestrator-Build/Test bypass; Review-Fixes ohne Fix-Planer; build-log-filter überspringen.

### Ausführung je Host

| Host | Implementierung | Review-Loop (Schritt 3) |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Cursor** | Task-Subagent `implement-agent` | Technik-Gate + 6× `implement-review-*` + `implement-fix-planner-agent` + Fix-`implement-agent` |
| **Andere** | Sub-Lauf mit `implement-agent.md` als System-Prompt | Sub-Läufe mit jeweiligem Agent-`.md` als System-Prompt |

Neue Implementation-Agenten: unter `../../agents/` anlegen und hier eintragen.

## Trigger

**Kanonisch:** `.cursor/rules/implementation-workflow-skill.mdc`

`disable-model-invocation: true` — bei erkanntem Umsetzungsintent verlangt die alwaysApply-Rule vollständiges Lesen dieses Skills vor dem ersten Write.

Bei Zweifel: Hard Gate prüfen; bei UNKNOWN kritischen Punkten stoppen — nicht direkt editieren.

**Agent-Modus:** Gilt immer wenn die Implementation-Rule Umsetzungsabsicht erkennt (alwaysApply) — nicht nur bei @-Anhang dieses Skills.

## Überblick (Ablauf)

```
                    +---------------------------------+
                    | Start: implementation requested |
                    | (read skill; do not edit /      |
                    |  spawn subagents yet)           |
                    +----------------+----------------+
                                     |
                                     v
+-------------------------------------------------------------------+
| Schritt 1 + Hard Gate (readiness review)                          |
| All Hard Gate rows YES (or waived)?                               |
+--------------------------+----------------------------------------+
                           |
         +-----------------+-----------------+
         | NO / UNKNOWN                      | YES
         v                                   v
+-------------------------+    +--------------------------------------+
| Stop: ask user; no      |    | Implementation-ready                 |
| edits; no subagents;    |    | Ausführungsform vor Schritt 2        |
| abort until resolved    |    | (align with user if still ambiguous) |
+-------------------------+    +------------------+-------------------+
                                                  |
                                                  v
+-------------------------------------------------------------------+
| Schritt 2: 1–10 implementation subagents (sequential / parallel)   |
| build-log-filter PFLICHT auf jedem Build/Test-Lauf                 |
+--------------------------+----------------------------------------+
                           |
                           v
+------------------------------+
| Integration checkpoint        |
| outputs, drift, merge risk    |
+--------------+---------------+
               |
               v
+-------------------------------------------------------------------+
| Schritt 3: Implement-Review-Loop (max. 3 Iterationen):            |
| Technik-Gate → 6× Review → Fix-Planer → Fix-Slices; früh stoppen |
| build-log-filter PFLICHT auf jedem Build/Test-Lauf                |
+-------------------------------------------------------------------+
                                 |
                                 v
                    +-----------------------+
                    | End / closure         |
                    +-----------------------+
```

## Schritt 1 — Plan-Check und Readiness Review

1. Skill end-to-end lesen. Plan/Thread prüfen auf: explizite Dateien, Schritte, Akzeptanzkriterien, Constraints — kein angenommenes Verhalten.
2. Readiness Review (initial agent, selbe Session): fehlende Entscheidungen, Mehrdeutigkeiten, konfligierende Instruktionen; versteckte Abhängigkeiten, irreversible Schritte, Sicherheits-/Datenrisiken; Übereinstimmung mit Host-Repository-Regeln; Verifikierbarkeit des Ergebnisses.
3. Jede Zeile im **Hard Gate** bewerten. NO oder UNKNOWN (ohne User-Waiver) → blockiert.
4. **Blockiert:** Fokussierte Fragen stellen oder minimale Plan-Patches vorschlagen. Keine Implementation, keine Subagents, kein Fortschritt bis User bestätigt oder Plan aktualisiert.
5. Hard Gate bestanden → **implementation-ready** → direkt zu Ausführungsform vor Schritt 2.

## Hard Gate: Implementation Readiness

Fortfahren **nur** wenn alle Fragen YES (oder explizit vom User gewaivert). NO/UNKNOWN → stoppen: fragen; nicht editieren; nicht delegieren; keine Verifikationsbefehle außer read-only.

Bedingte Zeilen (10–13): YES wenn Bedingung nicht zutrifft (N/A).

| # | Frage |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Scope explizit (was in / out)? |
| 2 | Akzeptanzkriterien explizit und verifikabel? |
| 3 | Betroffene Bereiche klar (konkrete Pfade, Module oder explizite Discovery-Strategie)? |
| 4 | Host-Rules und relevante Skills identifiziert und geladen? |
| 5 | Risiken (Sicherheit, Daten, irreversible Schritte, Migrationen) adressiert oder eskaliert? |
| 6 | Iterativer Implement-Review-Loop (max. 3 Iterationen) als Pflicht akzeptiert — außer User wählt B/C/D explizit im Thread? |
| 7 | Welche Stacks betroffen — damit Schritt 3 Technik-Gate pro Stack laufen kann? |
| 8 | 1–10 implement-agents mit Slice-Grenzen aus finalem Plan; Technik-Gate pro geändertem Stack in Schritt 3 vereinbart? |
| 9 | Slice-Grenzen aus finalem Plan — keine neuen Splits erfinden? |
| 10 | ≥2 Slices: Ausführungs-Topologie (sequenziell/parallel) explizit? |
| 11 | ≥2 Slices: Slice-Unabhängigkeitsregeln explizit? |
| 12 | ≥2 Slices: Blocking-Abhängigkeiten zwischen Packages benannt? |
| 13 | ≥2 Slices: Integration-/Merge-Schritt und Drift-/Konflikt-Ownership definiert? |
| 14 | build-log-filter MCP erreichbar? Bei dotnet/ng Build/Test im Scope: Verfügbarkeit prüfen; bei UNKNOWN → BLOCKER: klären vor Delegation. |

## Ausführungsform vor Schritt 2

Nach implementation-ready, **vor** ersten Edits oder Subagent-Starts:

1. Genau **1–10** implement-agent-Subagents bestätigen — Scope aus finalem Plan. **Agent-Typ:** `implement-agent`.
2. **Parallel bevorzugt:** ≥2 unabhängige Slices in Parallel-Wave + Hard Gate 10–13 OK → Ausführungsform parallel.
3. Aus finalem Plan, Prior-Thread-Commits oder User-Instruction ableiten.
4. Noch ambig → **stopp**, kurze Alignment-Fragen.
5. Explizite frühere Bestätigungen = bindende Topologie danach.

Schritt 2 nur betreten wenn Ausführungsform mit Hard Gate übereinstimmt.

## Schritt 2 — Umsetzung (1–10 Implementierungs-Subagents)

**Orchestrator implementiert in Schritt 2 nicht.** Alle Produkt-Edits nur durch implement-agent-Subagents. Orchestrator koordiniert, integriert am Checkpoint und löst triviale Merge-Mechanik.

1. Ausführungs-Topologie ausführen.
2. **Subagents strikt:** nur zugewiesener Slice; kein Scope-Expand; keine stille Umplanung; keine Produkt-/Design-Entscheidungen außerhalb Plan. Build/Test via MCP (Anti-Shortcut-Regel gilt ohne Ausnahme). Kein stack-weites Technik-Gate — das ist Schritt 3.
3. **Agent-Typ:** `implement-agent` — Modell gemäß `subagent-model-before-task.md`.
4. Topologie explizit protokollieren: Anzahl (1–10), Grenzen aus Plan, sequenziell/parallel.
5. Jeder Subagent-Brief enthält:
   - Scope (was anfassen, was nicht).
   - Deliverables und Mapping zu Plan-Schritten.
   - Non-Goals: keine Produkt-/Design-Entscheidungen außerhalb Plan.
   - Wenn Plan Topologie liefert: Slice-ID, Wave, Topologie-Kontext.
   - **Pflicht:** `subagent-delegation-boilerplate.md` in jeden Task-Prompt.
   - **Pflicht:** Passenden Abschnitt aus [references/subagent-prompts.md](references/subagent-prompts.md) inkl. build-log-filter-Pflicht.
   - Rückgabe ohne Verifikations-Matrix (bei Build/Test) → ablehnen, neu delegieren.
6. Keine Abweichung vom finalen Plan ohne User-Freigabe.
7. Subagent-Output ≠ done — erst nach Integration-Checkpoint + Schritt 3.

### BoyScout pro Slice (Orchestrator, vor Integration-Checkpoint)

Nach Rückkehr jedes implement-agent-Slices (sofern kein `kein boyscout`/`skip boyscout`):
`suggest_boyscout_actions(filePaths: [alle vom Slice geänderten Dateien], type)` — Top-Findings kompakt im Slice-Report.

### Integration-Checkpoint (Orchestrator)

Nach allen implement-agent-Rückgaben, **vor** Schritt 3:
- Subagent-Outputs sammeln (Summaries, Touched Paths, Diffs/Artifacts).
- Geänderte Stacks klassifizieren → Technik-Gate-Scope in Schritt 3.
- Interface-/Contract-Drift zwischen Slices prüfen.
- Merge-/Konflikt-Risiko bewerten.

**Orchestrator-Edits nach Technik-Gate:** Wenn initial agent Repo-Dateien nach einem Technik-Gate-Lauf ändert → Technik-Gate als stale → in nächster Review-Iteration re-run für betroffene Stacks.

## Schritt 3 — Iterativer Implement-Review-Loop

Max. **3 Iterationen**. Orchestrator orchestriert; keine Rollensimulation statt Subagents.

**Pro Iteration:** Technik-Gate → 6× Review → Digest → Fix-Planer → Fix-Slices.

**Früher Abbruch:** Keine behebbaren Findings + Technik-Gate OK → Loop sofort beenden.

**Nach Iteration 3 mit offenen Findings:** Rest-Findings-Bericht; kein weiterer Fix-Zyklus.

**Review-Rollen (6, je Iteration parallel bevorzugt):**
`implement-review-pessimist-agent` | `implement-review-lehrer-agent` | `implement-review-normalo-agent` | `implement-review-oberlehrer-agent` | `implement-review-professor-agent` | `implement-review-optimist-agent`

### Jede Iteration

**3.1 Technik-Gate pro Stack**

Ein Lauf pro geändertem Stack. Commands aus `{verification-commands}` und Repo-Docs — nicht raten. build-log-filter Pflicht auf jedem Lauf. Task-Prompt: Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md). Phasen: Build-fix loop (max. 8 Turns) → Unit-test-fix loop (max. 8 Turns, nur wenn Build OK). Enge Gate-Fixes erlaubt; nach Turn-Exhaustion eskalieren.

**3.2 Sechs Implement-Reviews (parallel, readonly)**

6 Subagents, je eine Rolle. **Verboten:** Rollensimulation im Orchestrator-Thread. Jeder erhält: finaler Plan + ACs, aktueller Diff/Touched Paths, Technik-Gate-Status pro Stack. Task-Prompts: jeweiliger Abschnitt in [references/subagent-prompts.md](references/subagent-prompts.md). MCP Pflicht je Agent-Profil.

**3.3 Review-Digest:** Alle 6 Reports → Review-Digest (Iteration N).

**3.4 Findings klassifizieren:**
- Eindeutig fixbar: Correctness-Lücken, fehlende Tests, Rule-Violations.
- Klärungsbedürftig: Produkt-/Design-Ambiguität, konfligierende AC-Interpretation.

**3.5 Gebündelte Nutzer-Rückfragen:** Wenn klärungsbedürftig → eine gebündelte Frage. Warten vor Fix-Planer/Fix-Slices.

**3.6 Fix-Planer:** Genau ein `implement-fix-planner-agent` pro Iteration. **Verboten:** Orchestrator-authored Fix-Pläne; Fix-Slices ohne Fix-Planer-Output.

**3.7 Fix-Slices:** `implement-agent` pro Fix-Slice. build-log-filter Pflicht auf jedem Build/Test-Lauf.

**3.8 Iterations-Zusammenfassung:** Iteration-Nr., Finding-Anzahl je Reviewer, was gefixt, Technik-Gate OK/FAIL pro Stack, ob nächste Iteration startet oder Loop endet.

**3.9 Abbruchbedingung:**
1. Sauber: keine behebbaren Findings + Technik-Gate OK (außer User-Opt-out B/C/D).
2. Maximum: nach Iteration 3 — unabhängig von offenen Findings.

**3.10 Rest-Findings nach Maximum** — Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md).

### Schritt-3-Closure (Orchestrator)

1. Plan alignment: jeder Plan-Schritt und AC geprüft oder erklärt.
2. Loop-Evidenz: Iterations-Anzahl; Technik-Gate-Matrix pro Stack/Iteration; 6 Reviews je Iteration; Fix-Planer mit Evidenz-Basis; Fix-Slices; Rest-Findings-Bericht wenn nötig.
3. build-log-filter-Compliance: Technik-Gate green nur mit abgeschlossenen Läufen + build-log-filter je anwendbarem Kommando; sonst `BLOCKIERT (build-log-filter)` oder FAIL — keine falsche Closure.
4. Closure-Format: Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md).
5. Optional Clean-Code-Review — nur nach User-Bestätigung.

## Orchestrator-Konfiguration

Konfiguration des **implement-agent** — Implementierungs-Subagent für Schritt 2 (genau einen Plan-Slice).

### Rolle

**Implementierungs-Subagent** im Implementation Workflow Schritt 2. Setzt genau einen Plan-Slice um — Code und lokale Qualitätssicherung innerhalb des Slice-Scopes.

**Kein** stack-weites Technik-Gate — das ist Schritt 3 (Orchestrator).

### Pflicht: Rules prüfen und anwenden (erster Schritt, ohne Ausnahme)

> **Bevor du deinen Slice startest — lade in dieser Reihenfolge:**
>
> 0. **agent-compliance.md** — immer; Orchestrator-/Subagent-Pflicht, Delegations-Boilerplate.
> 1. **implementation-workflow-skill.mdc** — immer; Subagent-Pflicht, build-log-filter-Kette, Verifikations-Matrix.
> 2. **build-log-filter.mdc** — immer; Ausführungs-Checkliste 1–8 für jeden Build-/Test-Lauf.
> 3. **codebase-analyzer.mdc** — immer; MCP-First für Analyse.
> 4. **angular-skills.mdc** — wenn FE-Slice im Scope.
> 5. **backend-ef-migrations-skill.mdc** — wenn EF/Migrations im Slice-Scope.
>
> Kein Überspringen. Erst danach: Slice-Implementierung starten.

### Modell

| Feld | Wert |
| ---------- | --------------------------------------------- |
| **Primär** | `auto` (AUTO — vom Host / Task-Modellauswahl) |

`auto` nicht wählbar → stoppen, transparent melden.

### codebase-analyzer (Bevorzugt)

| Aufgabe | MCP-Call |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Symbole / Einstiegspunkte | `index_project` → `find_in_index` |
| Komplexität prüfen | `analyze_complexity` |
| Refactoring-Sicherheit | `analyze_refactoring_safety` |
| Build-/Test-Fehler analysieren | **build-log-filter** `analyze_build_output` (nach `filter_*`) — nicht codebase-analyzer |

### Mantra

**Clean Code · SOLID · YAGNI · minimaler Diff** — nur was der Plan für deinen Slice vorsieht.

### Erlaubt — nur im Slice-Scope

- **Build (MCP):** `build_dotnet_solution` (dev-dotnet-mcp), `build_angular_project` (dev-angular-mcp)
- **Test (MCP):** `test_dotnet_solution` (dev-dotnet-mcp), `test_angular_project` (dev-angular-mcp) — slice-relevant
- Unit-Tests anlegen und ausführen, die deinen Slice absichern
- Minimale Fixes, damit deine Build-/Test-Läufe für den Slice grün werden

**VERBOTEN:** Shell `ng build` / `ng test` / `dotnet build` / `dotnet test` ohne BLOCKER-Nachweis.

**MCP nicht erreichbar:** `BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar` → stoppen; kein Shell-Fallback ohne Nutzerfreigabe. Fallback: [`.cursor/rules/build-log-filter.mdc`](../../rules/build-log-filter.mdc) Schritte 1–8.

### Parallelität

Eigene `session_id` bei `filter_output_stream` — nicht mit anderen implement-agent-Läufen oder dem Orchestrator teilen.

### Verboten

- Scope über den Slice hinaus; stille Planänderung; unrequested Refactors
- Stack-weites Technik-Gate in Schritt 2
- Diagnose aus Roh-Konsole ohne abgeschlossene build-log-filter-Kette
- `terminals/*.txt` als Capture-Ersatz
- Build/Test-Ergebnis ohne MCP als verifiziert melden

### Rückgabe an Orchestrator

```
- Summary: …
- Touched paths: …
- Build/Test (Slice): Kommandos, OK/FAIL, Verifikations-Matrix-Zeilen pro Lauf
- Open risks / blockers: …
- build-log-filter-Lücken (falls): was am Filter unklar blieb → Nutzer-Hinweis
```

Auf Deutsch, kompakt.

---

## Pflegehinweis

Cursor: `.cursor/rules/implementation-workflow-skill.mdc` nach Änderungen abgleichen. Trigger: Rule + YAML-`description` + `{agent-index}` doppelt pflegen. `disable-model-invocation: true` beibehalten. Subagent-Prompt-Vorlagen: nur in [references/subagent-prompts.md](references/subagent-prompts.md).

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.

## Prompt-Vorlagen

Kopierbare Auftrags-Payloads — nicht Ersatz für Agent-Profile unter `../../agents/`:

| Abschnitt | Datei | Wann |
| ---------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Implementierer (compact) | references/subagent-prompts.md | Slice ohne Build/Test |
| Implementierer (Build/Test + build-log-filter) | references/subagent-prompts.md | Standard Schritt 2 mit slice-scoped Build/Test |
| Technik-Gate pro Stack | references/subagent-prompts.md | Pro Review-Iteration |
| Implement-Review (×6) | references/subagent-prompts.md | Pro Review-Iteration |
| Fix-Planer (nach Review) | references/subagent-prompts.md | Nach Review-Digest |
| Rest-Findings nach Maximum | references/subagent-prompts.md | Nach Iteration 3 mit offenen Findings |
| Abschlussformat (Orchestrator) | references/subagent-prompts.md | Nach Review-Loop |
