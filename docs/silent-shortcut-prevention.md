# Silent Shortcut Prevention

Dieses Dokument beschreibt die **Enforcement-Prinzipien**, die verhindern, dass Cursor-Agents vorgeschriebene Workflows oder MCPs still umgehen und stattdessen einfachere Alternativen wählen.

---

## Teil 1: Delegation Anti-Shortcuts (Planning & Implementation Workflow)

### Was war das Problem?

Beide Workflows — Planning und Implementation — hatten dasselbe Grundproblem: Die Modelle lesen die Regeln, verstehen sie — und ignorieren sie dann trotzdem pragmatisch. Sie führen die Arbeit selbst aus statt zu delegieren, weil das für das Modell "effizienter" erscheint. Und sie tun das **still**, ohne es zu melden.

### Leitprinzip

Der Kern aller Änderungen ist ein einziges Designprinzip: **Ein Agent der gegen eine Regel verstößt, muss das zwingend kommunizieren — er darf nicht einfach stillschweigend eine Alternative wählen.**

Bisher waren die Regeln als Verbote formuliert. Verbote kann ein Modell ignorieren. Die Umformulierung zielt auf **Selbst-Checks mit erzwungener Ausgabe**: Bevor du X tust, prüfe ob du Y ankündigen kannst. Wenn nicht — STOPP und melde es.

### Was konkret geändert wurde

**1. Anti-Shortcut-Regeln ganz oben in den Skill**

Statt die Pflichten irgendwo im Fließtext zu verstecken, stehen jetzt **explizite Verbots-Blöcke ganz am Anfang** jedes Skills — noch vor den Phasen-Gates. Das Modell liest den Skill von oben nach unten. Was oben steht, hat mehr Gewicht.

**2. Transparenz-Pflicht als Gate-Mechanismus**

Statt "du sollst delegieren" steht jetzt:

> Vor jeder Delegation sagst du laut im Chat, wen du startest.
> Wenn du diesen Satz nicht sagen kannst, weil du selbst ausführst — STOPP.

Das zwingt das Modell in eine logische Falle: Es muss entweder die Ankündigung schreiben (und damit den Subagent starten) oder den STOPP ausgeben. Es gibt keinen dritten Weg mehr — kein stilles Selbst-Ausführen.

**3. Konkrete STOPP-Formulierungen**

Vorher: vage Verbote ohne definierten Ausweg. Nachher: exakte Fehlermeldungs-Texte die das Modell ausgeben soll, inklusive Hinweis wie man neu startet.

**4. Hard Gate um Tool-Verfügbarkeit erweitert**

Zwei Zeilen in der Readiness-Checkliste:
- Ist der MCP erreichbar?
- Ist das Task-Tool / Subagent überhaupt startbar?

Damit ist "ich konnte keinen Subagent starten" kein stiller Fallback mehr, sondern ein expliziter BLOCKER.

**5. Compliance als Pflichtfeld im Abschlussformat**

Feld `MCP-Build/Test eingehalten: [ja | BLOCKER]` zwingt den Agenten, explizit zu bestätigen oder den Verstoß einzugestehen.

---

## Teil 2: MCP-First für Build/Test (dev-mcp)

### Das Problem

Agents nutzten `ng build`, `ng test`, `dotnet build`, `dotnet test` als Shell-Kommandos und pipeten die rohe Ausgabe durch build-log-filter. Die MCPs `build_angular_project`, `test_angular_project`, `build_dotnet_solution`, `test_dotnet_solution` filtern intern und geben `errors[]`, `warnings[]`, `summary` zurück — kein Raw-Output, kein build-log-filter benötigt.

Ohne explizite Enforcement-Sprache tenden Agents dazu:
1. Shell statt MCP zu verwenden, weil Shell "direkt" erscheint
2. "Zur Sicherheit" noch build-log-filter aufzurufen, obwohl das MCP bereits filtert
3. Still auf Shell auszuweichen, wenn ein MCP-BLOCKER erscheint

### Enforcement-Muster

**VERBOTEN-Tabelle statt Weich-Formulierung:**

| Verboten | Richtig |
|----------|---------|
| Shell: `ng build` | `build_angular_project` (dev-mcp) |
| Shell: `ng test` | `test_angular_project` (dev-mcp) |
| Shell: `dotnet build` | `build_dotnet_solution` (dev-mcp) |
| Shell: `dotnet test` | `test_dotnet_solution` (dev-mcp) |
| build-log-filter für diese Kommandos | MCPs filtern intern — `errors[]` direkt auswerten |

**Hard Stop statt stillem Fallback:**

> **Hard Stop — MCP nicht erreichbar:**
> `BLOCKER: dev-mcp nicht erreichbar`
> - Kein stiller Fallback auf Shell + build-log-filter
> - Nutzer informieren; erst nach **expliziter Freigabe**: Shell-Fallback

**Expliziter Scope-Ausschluss in build-log-filter.mdc:**

> **VERBOTEN:** build-log-filter für `ng build` / `ng test` / `dotnet build` / `dotnet test` wenn MCPs verfügbar — auch nicht „zur Sicherheit".

**Compliance-Nachweis in Rückgabe:**
```
Build/Test: MCP-Tool build_angular_project OK (success=true, 0 errors)
MCP-Build/Test eingehalten: ja
```

### Scope-Trennung

| Kommando | Tool | Grund |
|----------|------|-------|
| `ng build`, `ng test` | dev-mcp (MCP-First) | MCP filtert intern |
| `dotnet build`, `dotnet test` | dev-mcp (MCP-First) | MCP filtert intern |
| `ng serve`, `npm start` | build-log-filter (Shell) | Kein MCP für Dev-Server |
| Shell-Fallback nach BLOCKER | build-log-filter | Nur nach Nutzerfreigabe |

---

## Teil 3: Composite-First für Mehrschritt-MCP-Ketten (NEU)

### Das Problem

Wenn Composite-Tools existieren (scout_symbol, scout_scope, analyze_slice_impact), dürfen Agents NICHT mehr die alte Mehrschritt-Kette fahren. Stattdessen: ein einziger Composite-Call.

### Verbotene Ketten (wenn Composite verfügbar)

| Verboten (Kette) | Richtig (Composite) |
|------------------|---------------------|
| `index_project` → `find_in_index` → `find_by_content` (Symbol suchen) | `scout_symbol(query, projectPath, format: compact)` |
| 3–5× `scout_symbol` für Buddy-Repo-Fragen | `scout_scope(questions[], defaultProjectPath)` |
| `analyze_compiler_diagnostics` → `suggest_boyscout_actions` → `detect_untested_public_api` → `analyze_refactoring_safety` | `analyze_slice_impact(changed_file_paths=[], format="compact")` |
| `find_api_callers` + manuelles BE-Mapping | `trace_api_contract(angular_service_path="...")` |
| `git_changed_files` → manuell Test-Filter ableiten | `slice_test_targets(changed_file_paths=[], stack="auto")` |

**Hard Stop:** Wenn das Composite-Tool verfügbar ist, darf der Agent nicht still die alte Kette ausführen — er muss das Composite aufrufen.

### Cache prüfen vor Index-Rebuild

```
VERBOTEN: index_project() aufrufen wenn index_status() stale=false anzeigt
RICHTIG: index_status() prüfen → bei stale=false Cache nutzen
```

---

## Gemeinsames Prinzip

Modelle reagieren besser auf **positive Handlungsanweisungen** ("tu X") als auf Verbote ("tu nicht Y"). Deshalb ist das Muster überall gleich:

1. Was du tun musst (**Ankündigung / VERBOTEN-Tabelle**)
2. Was passiert wenn du es nicht tust (**STOPP + Fehlermeldung**)
3. Wie der Nutzer neu starten kann (**Reparatur-Prompt / Fallback-Freigabe**)

---

## Betroffene Dateien (beide Teile)

| Datei | Art der Änderung |
|-------|-----------------|
| `.cursor/rules/dev-tooling-mcp.mdc` | VERBOTEN-Tabelle + Hard Stop Build/Test |
| `.claude/skills/dev-tooling-mcp/SKILL.md` | Build/Test-Routing + VERBOTEN-Block |
| `.cursor/rules/build-log-filter.mdc` | MCP-FIRST Sektion + Scope-Ausschluss |
| `.claude/skills/build-log-filter/SKILL.md` | Außer-Scope-Sektion |
| `.claude/skills/implementation-workflow/SKILL.md` | Anti-Shortcut-Regel + MCP-Pflicht-Section |
| `.claude/agents/implement-agent.md` | MCP-Pflicht-Tabelle + Hard Stop |
| `.claude/skills/angular-developer/SKILL.md` | ng build → MCP |
| `.claude/skills/angular-developer/references/op-tooling.md` | Build/Test MCP-Sektion |
| `.claude/skills/dev-mcp/SKILL.md` | Neue Tools (39 gesamt) + Windows-Pfade |
| `.claude/references/verification-commands.md` | MCP als Primary Path |
| `planning-workflow/SKILL.md` | Anti-Shortcut-Regel + Transparenz-Pflicht |
| `planning-workflow/references/subagent-prompts.md` | Compliance-Felder |
| `planning-workflow-skill.mdc` | Plan-Mode-Gate + Transparenz-Pflicht |

---

## Checkliste: Neues MCP einführen

1. **VERBOTEN-Tabelle** in Router-Skill und Auto-Rule
2. **Hard Stop Formulierung** in Kanon-Skill und Agenten-Profil
3. **Scope-Ausschluss** im konkurrierenden Tool (build-log-filter.mdc)
4. **Compliance-Nachweis** in Agent-Rückgabe-Format definieren
5. **Trigger-Formulierung** in Descriptions: Tool-Name nennen, nicht nur Kommando
6. **Fallback dokumentieren**: Wo, wann, mit welcher Nutzerfreigabe
