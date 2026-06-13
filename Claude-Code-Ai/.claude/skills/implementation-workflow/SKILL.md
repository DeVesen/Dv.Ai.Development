---
name: implementation-workflow
description: >
  Repo-Umsetzung mit Hard Gate, 1-10 implement-agent (Slice inkl. Build/Test), iterativer
  Implement-Review-Loop max. 3x (Technik-Gate, 6 Reviews, implement-fix-planner-agent, Fix-Slices).
  build-log-filter + codebase-analyzer Pflicht. MCP-First Build/Test zwingend.
  Ausloesung: implementiere / setze um / fix / einbauen / leg los, Plan ausfuehren,
  impliziter Repo-Code-Intent, Hard Gate, IMP-*-Slices. Opt-out: ohne implement-skill.
when_to_use: >
  Vor jeder schreibenden Umsetzung im Repo. Nicht bei reiner Planung oder Erklaerung.
  Verbindlich wenn: implementiere, setze um, fix, leg los, go ahead, Plan ausfuehren,
  IMP-*-Slice umsetzen, Technik-Gate oder Implement-Review-Loop gefragt.
---

# Implementation Workflow

## ⚠️ MCP-First Build/Test — Anti-Shortcut-Regel (hoechste Prioritaet, ohne Ausnahme)

**Kein Build- oder Test-Lauf als Shell-Kommando — immer MCP.**

| Aufgabe | MCP-Tool | MCP-Server | VERBOTEN |
|---------|----------|-----------|---------|
| Angular Build | `build_angular_project` | dev-angular-mcp | Shell `ng build` |
| Angular Test | `test_angular_project` | dev-angular-mcp | Shell `ng test` |
| .NET Build | `build_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet build` |
| .NET Test | `test_dotnet_solution` | dev-dotnet-mcp | Shell `dotnet test` |

**Pro Lauf:** MCP-Tool aufrufen → `errors[]`, `warnings[]`, `summary`, `success` auswerten → nur MCP-`success: true` gilt als Verifikationsnachweis → im Bericht dokumentieren.

**MCP nicht erreichbar → Hard Stop:**
`"⚠️ BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar — kein Build/Test-Lauf starten."`
Kein Shell-Fallback ohne explizite Nutzerfreigabe; kein build-log-filter-Ausweichen ohne Freigabe.

**"path does not exist" = falscher Pfad, MCP laeuft:**
MCP hat geantwortet → MCP ist erreichbar → Shell ist kein zulaessiger Fallback, egal wie viele Pfade scheitern.

Pfad-Diagnose vor BLOCKER (Reihenfolge einhalten):
1. Projekt-MCP-Pfad-Dokumentation lesen → exakten Wert verwenden — nicht ableiten, nicht aus dem Gedaechtnis
2. Solution-Pfad (`.sln`) statt Projekt- oder Test-Pfad (`.csproj`) versuchen
3. Normalisierung: Backslash → Forward-Slash; `/workspace/`-Praefix pruefen und ggf. ergaenzen

Alle Pfad-Varianten gescheitert → **Pflicht-BLOCKER** im Chat ausgeben, dann stoppen:
```
⚠️ BLOCKER: dev-dotnet-mcp / dev-angular-mcp — Pfadaufloesung gescheitert.
Versucht: [vollstaendige Liste aller probierter Pfade]
Shell-Fallback: NICHT freigegeben. Bitte MCP-Pfad klaeren.
```
Kein `dotnet test` / `ng test` in der Shell — auch nicht "nur kurz zum pruefen", auch nicht nach N gescheiterten Pfaden.

`test_dotnet_solution` / `test_angular_project` sind eigenstaendige MCP-Tools — auch nach erfolgreichem `build_dotnet_solution` separat aufrufen.

**Kein Opt-out** (ausser explizitem User-Text fuer Shell-Fallback nach BLOCKER-Bestaetigung).

**Transparenz-Pflicht:** Vor jedem Build/Test-Lauf im Chat ausgeben:
`"Fuehre jetzt Build/Test via [build_angular_project | test_angular_project | build_dotnet_solution | test_dotnet_solution] aus."`
Wenn dieser Satz nicht moeglich, weil Shell statt MCP → **STOPP:** `"⚠️ MCP-First-Pflicht verletzt: [Kommando] ohne MCP-Aufruf. Nicht regelkonform."`

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## ⚠️ Orchestrator-Delegation-Pflicht — Anti-Shortcut-Regel

**Orchestrator schreibt in Schritt 2+3 keinen Produkt-Code selbst — immer implement-agent.**

Auch wenn der Nutzer sagt "mach alles fertig", "stoppe nicht", "ein Turn":
→ Delegation bleibt Pflicht, kein Opt-out, keine Ausnahme.

**Vollstaendiges Lesen Pflicht:** Skill end-to-end lesen vor dem ersten Schritt — kein Partial-Read und dann starten.

**Transparenz-Pflicht vor Schritt 2:** Im Chat ausgeben:
`"Starte jetzt implement-agent fuer Slice [IMP-*]…"`

**Wenn dieser Satz nicht moeglich, weil Orchestrator selbst implementieren will → STOPP:**
`"⚠️ Orchestrator-Delegation verletzt: Slice [IMP-*] ohne implement-agent. Nicht regelkonform. Neu starten."`

**Verboten:**
- Orchestrator schreibt Produkt-Code statt implement-agent zu delegieren
- Orchestrator- und Implementierer-Rolle in einem Turn zusammenlegen
- Kein Technik-Gate / kein 6x Review-Loop trotz abgeschlossener Implementierung

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Pflicht bei Umsetzung

Vor jeder schreibenden Umsetzung:

- Diesen Skill end-to-end lesen
- Workflow bis Abschluss befolgen

**Orchestrator:** Bei jeder Subagent-Delegation `subagent-delegation-boilerplate.md` in den Task-Prompt — Subagents muessen Skills einhalten, nicht nur laden.

**Konfliktaufloesung:**

| Nutzer sagt | Pflicht |
|-------------|---------|
| ohne Subagents | BLOCKER (oder expliziter Skill-Opt-out) |
| ohne Review | BLOCKER, ausser dokumentierter Opt-out im Thread |
| ohne Technik-Gate | BLOCKER |
| ohne Fix-Planer | BLOCKER bei Review-basierten Fixes |

**Nicht auslosen:** Reine Erklaerung/Ask, reine Planung ohne Writes, reiner Plan-Review ohne Umsetzung.

**Opt-out:** Explizit nur bei Formulierungen wie `ohne implementation-skill`.

---

## Subagent-Typen und Agent-Definitionen (host-neutral)

**Modellwahl** ausschliesslich in `.claude/agents/*.md` (Abschnitt `## Modell`) — nicht hier duplizieren.

### Rollen im Implementation Workflow

| Rolle | Schritt | Agent-Typ |
| -------------------------------- | ------------------------------- | --------------------------------- |
| **Orchestrator / Initial Agent** | 1, Integration, 3 Loop | *(Nutzer-Chat / Parent)* |
| **Implementierer** | 2 (1–10 Slices), 3 (Fix-Slices) | `implement-agent` |
| **Technik-Gate** | 3.1 (pro Iteration) | Orchestrator-Subagent / Host-Task |
| **Implement-Review x6** | 3.2 (pro Iteration) | `implement-review-*-agent` |
| **Fix-Planung** | 3.6 (pro Iteration) | `implement-fix-planner-agent` |

**Subagent — Modell vor Task (Pflicht):** Agent-Profil unter `.claude/agents/` lesen; primaer Abschnitt `## Modell`; Slugs nicht hier duplizieren.

- **implement-agent:** genau ein Slice (IMP-*); Build/Test slice-scoped via MCP; Unit-Tests im Slice; build-log-filter Pflicht auf jedem Lauf.
- **implement-review-*:** readonly; je eine Rolle; 6 parallele Laeufe pro Iteration; MCP-Pflicht je Profil.
- **implement-fix-planner-agent:** Fix-Teilplan aus Review-Digest; MCP A–H + build-log-filter + Evidenz-Basis; keine Code-Implementierung.
- **Technik-Gate:** stack-weiter Build + Unit-Tests (max. 8 Turns je Phase); build-log-filter Pflicht; enge Gate-Fixes erlaubt.
- **Verboten:** `explore`/`generalPurpose` statt dedizierter Agent-Profile; Orchestrator-Build/Test bypass; Review-Fixes ohne Fix-Planer; build-log-filter ueberspringen.

### Ausfuehrung je Host

| Host | Implementierung | Review-Loop (Schritt 3) |
| ---------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Claude Code** | Sub-Lauf mit `implement-agent.md` als System-Prompt | Sub-Laeufe mit jeweiligem Agent-`.md` als System-Prompt |

Neue Implementation-Agenten: unter `.claude/agents/` anlegen und hier eintragen.

---

## Ueberblick (Ablauf)

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
| edits; no subagents;    |    | Ausfuehrungsform vor Schritt 2        |
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
| Technik-Gate -> 6x Review -> Fix-Planer -> Fix-Slices; frueh stoppen |
| build-log-filter PFLICHT auf jedem Build/Test-Lauf                |
+-------------------------------------------------------------------+
                                 |
                                 v
                    +-----------------------+
                    | End / closure         |
                    +-----------------------+
```

---

## Schritt 1 — Plan-Check und Readiness Review

1. Skill end-to-end lesen. Plan/Thread pruefen auf: explizite Dateien, Schritte, Akzeptanzkriterien, Constraints — kein angenommenes Verhalten.
2. Readiness Review (initial agent, selbe Session): fehlende Entscheidungen, Mehrdeutigkeiten, konfligierende Instruktionen; versteckte Abhaengigkeiten, irreversible Schritte, Sicherheits-/Datenrisiken; Uebereinstimmung mit Host-Repository-Regeln; Verifizierbarkeit des Ergebnisses.
3. Jede Zeile im **Hard Gate** bewerten. NO oder UNKNOWN (ohne User-Waiver) → blockiert.
4. **Blockiert:** Fokussierte Fragen stellen oder minimale Plan-Patches vorschlagen. Keine Implementation, keine Subagents, kein Fortschritt bis User bestaetigt oder Plan aktualisiert.
5. Hard Gate bestanden → **implementation-ready** → direkt zu Ausfuehrungsform vor Schritt 2.

## Hard Gate: Implementation Readiness

Fortfahren **nur** wenn alle Fragen YES (oder explizit vom User gewaivert). NO/UNKNOWN → stoppen: fragen; nicht editieren; nicht delegieren; keine Verifikationsbefehle ausser read-only.

Bedingte Zeilen (10–13): YES wenn Bedingung nicht zutrifft (N/A).

| # | Frage |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Scope explizit (was in / out)? |
| 2 | Akzeptanzkriterien explizit und verifikabel? |
| 3 | Betroffene Bereiche klar (konkrete Pfade, Module oder explizite Discovery-Strategie)? |
| 4 | Host-Rules und relevante Skills identifiziert und geladen? |
| 5 | Risiken (Sicherheit, Daten, irreversible Schritte, Migrationen) adressiert oder eskaliert? |
| 6 | Iterativer Implement-Review-Loop (max. 3 Iterationen) als Pflicht akzeptiert — ausser User waehlt expliziten Opt-out im Thread? |
| 7 | Welche Stacks betroffen — damit Schritt 3 Technik-Gate pro Stack laufen kann? |
| 8 | 1–10 implement-agents mit Slice-Grenzen aus finalem Plan; Technik-Gate pro geaendertem Stack in Schritt 3 vereinbart? |
| 9 | Slice-Grenzen aus finalem Plan — keine neuen Splits erfinden? |
| 10 | >=2 Slices: Ausfuehrungs-Topologie (sequenziell/parallel) explizit? |
| 11 | >=2 Slices: Slice-Unabhaengigkeitsregeln explizit? |
| 12 | >=2 Slices: Blocking-Abhaengigkeiten zwischen Packages benannt? |
| 13 | >=2 Slices: Integration-/Merge-Schritt und Drift-/Konflikt-Ownership definiert? |
| 14 | build-log-filter MCP erreichbar? Bei dotnet/ng Build/Test im Scope: Verfuegbarkeit pruefen; bei UNKNOWN → BLOCKER: klaeren vor Delegation. |

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

## Ausfuehrungsform vor Schritt 2

Nach implementation-ready, **vor** ersten Edits oder Subagent-Starts:

1. Genau **1–10** implement-agent-Subagents bestaetigen — Scope aus finalem Plan. **Agent-Typ:** `implement-agent`.
2. **Parallel bevorzugt:** >=2 unabhaengige Slices in Parallel-Wave + Hard Gate 10–13 OK → Ausfuehrungsform parallel.
3. Aus finalem Plan, Prior-Thread-Commits oder User-Instruction ableiten.
4. Noch ambig → **stopp**, kurze Alignment-Fragen.
5. Explizite fruehere Bestaetigungen = bindende Topologie danach.

Schritt 2 nur betreten wenn Ausfuehrungsform mit Hard Gate uebereinstimmt.

---

## Schritt 2 — Umsetzung (1–10 Implementierungs-Subagents)

**Orchestrator implementiert in Schritt 2 nicht.** Alle Produkt-Edits nur durch implement-agent-Subagents. Orchestrator koordiniert, integriert am Checkpoint und loest triviale Merge-Mechanik.

1. Ausfuehrungs-Topologie ausfuehren.
2. **Subagents strikt:** nur zugewiesener Slice; kein Scope-Expand; keine stille Umplanung; keine Produkt-/Design-Entscheidungen ausserhalb Plan. Build/Test via MCP (Anti-Shortcut-Regel gilt ohne Ausnahme). Kein stack-weites Technik-Gate — das ist Schritt 3.
3. **Agent-Typ:** `implement-agent`.
4. Topologie explizit protokollieren: Anzahl (1–10), Grenzen aus Plan, sequenziell/parallel.
5. Jeder Subagent-Brief enthaelt:
   - Scope (was anfassen, was nicht).
   - Deliverables und Mapping zu Plan-Schritten.
   - Non-Goals: keine Produkt-/Design-Entscheidungen ausserhalb Plan.
   - Wenn Plan Topologie liefert: Slice-ID, Wave, Topologie-Kontext.
   - **Pflicht:** `subagent-delegation-boilerplate.md` in jeden Task-Prompt.
   - **Pflicht:** Passenden Abschnitt aus [references/subagent-prompts.md](references/subagent-prompts.md) inkl. build-log-filter-Pflicht.
   - Rueckgabe ohne Verifikations-Matrix (bei Build/Test) → ablehnen, neu delegieren.
6. Keine Abweichung vom finalen Plan ohne User-Freigabe.
7. Subagent-Output ≠ done — erst nach Integration-Checkpoint + Schritt 3.

### BoyScout pro Slice (Orchestrator, vor Integration-Checkpoint)

Nach Rueckkehr jedes implement-agent-Slices (sofern kein `kein boyscout`/`skip boyscout`):
`suggest_boyscout_actions(filePaths: [alle vom Slice geaenderten Dateien], type)` — Top-Findings kompakt im Slice-Report.

### Integration-Checkpoint (Orchestrator)

Nach allen implement-agent-Rueckgaben, **vor** Schritt 3:
- Subagent-Outputs sammeln (Summaries, Touched Paths, Diffs/Artifacts).
- Geaenderte Stacks klassifizieren → Technik-Gate-Scope in Schritt 3.
- Interface-/Contract-Drift zwischen Slices pruefen.
- Merge-/Konflikt-Risiko bewerten.

**Orchestrator-Edits nach Technik-Gate:** Wenn initial agent Repo-Dateien nach einem Technik-Gate-Lauf aendert → Technik-Gate als stale → in naechster Review-Iteration re-run fuer betroffene Stacks.

---

## Schritt 3 — Iterativer Implement-Review-Loop

Max. **3 Iterationen**. Orchestrator orchestriert; keine Rollensimulation statt Subagents.

**Pro Iteration:** Technik-Gate → 6x Review → Digest → Fix-Planer → Fix-Slices.

**Frueher Abbruch:** Keine behebbaren Findings + Technik-Gate OK → Loop sofort beenden.

**Nach Iteration 3 mit offenen Findings:** Rest-Findings-Bericht; kein weiterer Fix-Zyklus.

**Review-Rollen (6, je Iteration parallel bevorzugt):**
`implement-review-pessimist-agent` | `implement-review-lehrer-agent` | `implement-review-normalo-agent` | `implement-review-oberlehrer-agent` | `implement-review-professor-agent` | `implement-review-optimist-agent`

### Jede Iteration

**3.1 Technik-Gate pro Stack**

Ein Lauf pro geaendertem Stack. Build/Test-Befehle aus Repo-Doku — nicht raten. build-log-filter Pflicht auf jedem Lauf. Task-Prompt: Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md). Phasen: Build-fix loop (max. 8 Turns) → Unit-test-fix loop (max. 8 Turns, nur wenn Build OK). Enge Gate-Fixes erlaubt; nach Turn-Exhaustion eskalieren.

**3.2 Sechs Implement-Reviews (parallel, readonly)**

6 Subagents, je eine Rolle. **Verboten:** Rollensimulation im Orchestrator-Thread. Jeder erhaelt: finaler Plan + ACs, aktueller Diff/Touched Paths, Technik-Gate-Status pro Stack. Task-Prompts: jeweiliger Abschnitt in [references/subagent-prompts.md](references/subagent-prompts.md). MCP Pflicht je Agent-Profil.

**3.3 Review-Digest:** Alle 6 Reports → Review-Digest (Iteration N).

**3.4 Findings klassifizieren:**
- Eindeutig fixbar: Correctness-Luecken, fehlende Tests, Rule-Violations.
- Klaerungsbeduerftig: Produkt-/Design-Ambiguitaet, konfligierende AC-Interpretation.

**3.5 Gebuendelte Nutzer-Rueckfragen:** Wenn klaerungsbeduerftig → eine gebuendelte Frage. Warten vor Fix-Planer/Fix-Slices.

**3.6 Fix-Planer:** Genau ein `implement-fix-planner-agent` pro Iteration. **Verboten:** Orchestrator-authored Fix-Plaene; Fix-Slices ohne Fix-Planer-Output.

**3.7 Fix-Slices:** `implement-agent` pro Fix-Slice. build-log-filter Pflicht auf jedem Build/Test-Lauf.

**3.8 Iterations-Zusammenfassung:** Iteration-Nr., Finding-Anzahl je Reviewer, was gefixt, Technik-Gate OK/FAIL pro Stack, ob naechste Iteration startet oder Loop endet.

**3.9 Abbruchbedingung:**
1. Sauber: keine behebbaren Findings + Technik-Gate OK.
2. Maximum: nach Iteration 3 — unabhaengig von offenen Findings.

**3.10 Rest-Findings nach Maximum** — Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md).

### Schritt-3-Closure (Orchestrator)

1. Plan alignment: jeder Plan-Schritt und AC geprueft oder erklaert.
2. Loop-Evidenz: Iterations-Anzahl; Technik-Gate-Matrix pro Stack/Iteration; 6 Reviews je Iteration; Fix-Planer mit Evidenz-Basis; Fix-Slices; Rest-Findings-Bericht wenn noetig.
3. build-log-filter-Compliance: Technik-Gate green nur mit abgeschlossenen Laeufen + build-log-filter je anwendbarem Kommando; sonst `BLOCKIERT (build-log-filter)` oder FAIL — keine falsche Closure.
4. Closure-Format: Vorlage in [references/subagent-prompts.md](references/subagent-prompts.md).
5. Optional Clean-Code-Review — nur nach User-Bestaetigung.

---

## Orchestrator-Konfiguration

Konfiguration des **implement-agent** — Implementierungs-Subagent fuer Schritt 2 (genau einen Plan-Slice).

### Rolle

**Implementierungs-Subagent** im Implementation Workflow Schritt 2. Setzt genau einen Plan-Slice um — Code und lokale Qualitaetssicherung innerhalb des Slice-Scopes.

**Kein** stack-weites Technik-Gate — das ist Schritt 3 (Orchestrator).

### Pflicht: Rules pruefen und anwenden (erster Schritt, ohne Ausnahme)

> **Bevor du deinen Slice startest — lade in dieser Reihenfolge:**
>
> 0. **agent-compliance.md** — immer; Orchestrator-/Subagent-Pflicht, Delegations-Boilerplate.
> 1. **implementation-workflow/SKILL.md** — immer; Subagent-Pflicht, build-log-filter-Kette, Verifikations-Matrix.
> 2. **build-log-filter/SKILL.md** — immer; Ausfuehrungs-Checkliste 1–8 fuer jeden Build-/Test-Lauf.
> 3. **codebase-analyzer/SKILL.md** — immer; MCP-First fuer Analyse.
> 4. **angular-developer/SKILL.md** — wenn FE-Slice im Scope.
> 5. **backend-ef-migrations/SKILL.md** — wenn EF/Migrations im Slice-Scope.
>
> Kein Ueberspringen. Erst danach: Slice-Implementierung starten.

### Modell

| Feld | Wert |
| ---------- | --------------------------------------------- |
| **Primaer** | `auto` (AUTO — vom Host / Task-Modellauswahl) |

`auto` nicht waehlbar → stoppen, transparent melden.

### codebase-analyzer (Bevorzugt)

| Aufgabe | MCP-Call |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Symbole / Einstiegspunkte | `index_project` → `find_in_index` |
| Komplexitaet pruefen | `analyze_complexity` |
| Refactoring-Sicherheit | `analyze_refactoring_safety` |
| Build-/Test-Fehler analysieren | **build-log-filter** `analyze_build_output` (nach `filter_*`) — nicht codebase-analyzer |

### Mantra

**Clean Code · SOLID · YAGNI · minimaler Diff** — nur was der Plan fuer deinen Slice vorsieht.

### Erlaubt — nur im Slice-Scope

- **Build (MCP):** `build_dotnet_solution` (dev-dotnet-mcp), `build_angular_project` (dev-angular-mcp)
- **Test (MCP):** `test_dotnet_solution` (dev-dotnet-mcp), `test_angular_project` (dev-angular-mcp) — slice-relevant
- Unit-Tests anlegen und ausfuehren, die deinen Slice absichern
- Minimale Fixes, damit deine Build-/Test-Laeufe fuer den Slice gruen werden

**VERBOTEN:** Shell `ng build` / `ng test` / `dotnet build` / `dotnet test` ohne BLOCKER-Nachweis.

**MCP nicht erreichbar:** `BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar` → stoppen; kein Shell-Fallback ohne Nutzerfreigabe.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

### Parallelitaet

Eigene `session_id` bei `filter_output_stream` — nicht mit anderen implement-agent-Laeufen oder dem Orchestrator teilen.

### Verboten

- Scope ueber den Slice hinaus; stille Planaenderung; unrequested Refactors
- Stack-weites Technik-Gate in Schritt 2
- Diagnose aus Roh-Konsole ohne abgeschlossene build-log-filter-Kette
- `terminals/*.txt` als Capture-Ersatz
- Build/Test-Ergebnis ohne MCP als verifiziert melden

### Rueckgabe an Orchestrator

```
- Summary: …
- Touched paths: …
- Build/Test (Slice): Kommandos, OK/FAIL, Verifikations-Matrix-Zeilen pro Lauf
- Open risks / blockers: …
- build-log-filter-Luecken (falls): was am Filter unklar blieb → Nutzer-Hinweis
```

Auf Deutsch, kompakt.

---

## Pflegehinweis

Trigger: YAML-`description` + `when_to_use` aktuell halten. Subagent-Prompt-Vorlagen: nur in [references/subagent-prompts.md](references/subagent-prompts.md).

## Antwortformat

Keine Code-Beispiele ohne explizite Nachfrage.

## Prompt-Vorlagen

Kopierbare Auftrags-Payloads — nicht Ersatz fuer Agent-Profile unter `.claude/agents/`:

| Abschnitt | Datei | Wann |
| ---------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Implementierer (compact) | references/subagent-prompts.md | Slice ohne Build/Test |
| Implementierer (Build/Test + build-log-filter) | references/subagent-prompts.md | Standard Schritt 2 mit slice-scoped Build/Test |
| Technik-Gate pro Stack | references/subagent-prompts.md | Pro Review-Iteration |
| Implement-Review (x6) | references/subagent-prompts.md | Pro Review-Iteration |
| Fix-Planer (nach Review) | references/subagent-prompts.md | Nach Review-Digest |
| Rest-Findings nach Maximum | references/subagent-prompts.md | Nach Iteration 3 mit offenen Findings |
| Abschlussformat (Orchestrator) | references/subagent-prompts.md | Nach Review-Loop |
