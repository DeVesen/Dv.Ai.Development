# Skill-X — Design & Handoff-Protokoll

> **Status:** Design-Phase, nahezu abgeschlossen. **NOCH NICHTS umgesetzt** — keine Skill-/Agent-/MCP-Dateien erstellt.
> **Working Tree:** Branch `master`, sauber, up-to-date mit `origin/master`.
> **Zweck dieses Dokuments:** vollständiger, wasserdichter Wissensstand, damit **jeder Agent direkt weiterarbeiten** kann.
> **Sprache der Arbeit:** Deutsch. Stil: fundiert, klar, faktenkorrekt, kein Boilerplate.

---

## 1. Ziel & Kontext

**Skill-X** ist ein **Orchestrator-Skill** für vollständige Feature-Umsetzung in Kundenprojekten:

1. Nutzer gibt einen Prompt.
2. **Planung** durch Sub-Agents mit stärkeren Modellen.
3. Pläne werden durch **Prüfer** mit passenden Modellen reviewed.
4. Bei Funden → zurück an den **Plan-Fixer** zum Nachjustieren (Loop).
5. Fertiger Plan geht **automatisch** in die Umsetzung (kein manueller Gate).
6. **Schreiberlinge (Scribes)** implementieren.
7. Ergebnis läuft durch **statische Code-/Architekturanalyse**, **Review-** und **Test-Agents**.
8. Architektur, CodeStyle und Prinzipien werden in **Planung UND Implementation** durchgesetzt.

**Stack zuerst:** .NET und Angular.

**Prinzipien-Kanon:** Clean Code (Robert C. Martin). **Bei Widerspruch überwiegen SOLID + IODA + IOSP.**

---

## 2. Harte Rahmenbedingungen (festgelegt)

| Punkt | Festlegung |
|-------|-----------|
| Harness-Ort | Läuft lokal auf Svens Laptop, auch für Kundenprojekte. Vorerst nicht remote. |
| MCPs | `dev-mcp`, `codebase-analyzer`, `build-log-filter` sind **zwingender** Bestandteil des Harness — werden als vorhanden vorausgesetzt. |
| ReSharper/Rider + JB-Lizenz | Auf dem Laptop vorhanden — wird vorausgesetzt (`jb inspectcode` per CLI nutzbar). |
| Modelle | Nur **Opus** und **Sonnet**. **Kein Haiku** (zu wichtig). |
| Plan-Review-Loop | Max. **5** Iterationen. |
| Impl-Fix-Loop | Max. **5** Runden. |

---

## 3. Skill-X — Verzeichnisstruktur

```
.claude/skills/skill-x/
├── SKILL.md                          # Orchestrator-Einstieg + Trigger (Trigger TBD)
├── flows/
│   ├── planning-flow.md              # ehem. planning-workflow/SKILL.md
│   └── implementation-flow.md        # ehem. implementation-workflow/SKILL.md
├── references/
│   ├── principles-cleancode.md       # Westphal IODA + IOSP + SOLID + Clean Code
│   ├── archunit-baseline-template.cs # Regelklasse (.NET), Option A
│   ├── eslint-baseline.json          # Angular ESLint Baseline
│   └── subagent-prompts.md           # Auftrags-Vorlagen
└── agents/
    └── (siehe §5)
```

**Entfällt vollständig:** `.claude/skills/planning-workflow/` und `.claude/skills/implementation-workflow/` als eigenständige Skills.
**Keine Aliase** — die alten Trigger-Namen verschwinden (Schicksal der Trigger-Wörter `plane`/`implementiere`/`fix` → siehe §14, geparkt).

---

## 4. Modell-Schema (endgültig)

**Kein Haiku. Keine „Opus-high/low"-Unterscheidung** — technisch in Claude Code nicht steuerbar (extended-thinking-Budget ist nicht über Agent-Profile setzbar). Reale Unterscheidung ist **Opus vs. Sonnet**. (Falls Claude Code später ein `thinking_budget:`-Frontmatter unterstützt, nachrüstbar.)

| Modell | Rollen |
|--------|--------|
| **Opus** | Plan-Orchestrator (Phasen 1,2,4a,4c,6) · Plan-Fixer (alle Runden) · plan-review-pessimist · plan-review-ioda · **Impl-Loop-Orchestrator (delegierter Agent)** · Fix-Planer (alle Runden) · implement-review-pessimist · implement-review-ioda · **Scribe Runden 4–5** |
| **Sonnet** | Scout · Topic-Planer · plan-review-optimist/normalo/oberlehrer/professor · **Scribe Runden 1–3** · implement-review-optimist/normalo/oberlehrer/professor/**lehrer** |

---

## 5. Agenten-Katalog

### Plan-Review: 6 Reviewer (5 alt + IODA neu)
`optimist (S)` · `pessimist (O)` · `normalo (S)` · `oberlehrer (S)` · `professor (S)` · **`ioda (O)` [NEU]**

### Impl-Review: 7 Reviewer (6 alt inkl. `lehrer` + IODA neu)
`pessimist (O)` · **`ioda (O)` [NEU]** · `lehrer (S)` · `normalo (S)` · `oberlehrer (S)` · `professor (S)` · `optimist (S)`
> `lehrer` bleibt erhalten — deckt **fachliche Korrektheit** ab, die kein anderer Reviewer prüft (entschieden).

### Neue Agenten (Detail)

| Agent | Modell | Rolle |
|-------|--------|-------|
| `plan-fixer-agent` | Opus | **Patcher, kein Neu-Planer.** Input: Review-Digest + aktuelle Plan-Arbeitsversion. Ändert **nur** geflaggte Abschnitte. Kein Scouting, kein Neudenken, kein Scope-Expand. **Regel:** Erfordert ein Finding eine größere Änderung als ein gezielter Patch → nicht selbst entscheiden, als **Blocker** an Orchestrator zurück. |
| `plan-review-ioda-agent` | Opus | Prüft den **Plan konzeptuell** auf IODA/IOSP (vorausschauend: trennt die geplante Dekomposition Orchestrierung vs. Logik? IOSP-Layering der Interfaces?). |
| `implement-review-ioda-agent` | Opus | Prüft den **Code konkret** auf IODA-Verstöße (Methoden, die Integration + Operation mischen). |
| `implement-loop-orchestrator` | Opus | Fährt den Implementations-Loop als **delegierter Agent** (nicht der Parent) → unabhängig vom Session-Modell auf Opus pinbar. |
| `implement-scribe-agent` | Sonnet | Scribe Runden 1–3. |
| `implement-scribe-opus-agent` | Opus | Scribe Runden 4–5 (Eskalation). |

> Zwei **separate** IODA-Agents (Plan + Implement), **kein** Mode-Switch in einer Datei — die Prompts sind fundamental verschieden („wird dieser Plan IODA-konform sein?" vs. „verletzt dieser Code IODA?").

### Übernommene Agenten (aus alten Workflows)
`plan-agent` (→ Plan-Orchestrator) · `plan-agent-scout` · `plan-agent-topic-planner` · `plan-review-{optimist,pessimist,normalo,oberlehrer,professor}` · `implement-fix-planner-agent` · `implement-review-{pessimist,lehrer,normalo,oberlehrer,professor,optimist}`.

---

## 6. Planungs-Flow

```
Phase 1+2  Anforderung klären (ohne Code)        Plan-Orchestrator (Opus)
Phase 3    Scouts 1–10 parallel (read-only)      Scout (Sonnet)
Phase 4a   Interface-Design / Topic-Map          Plan-Orchestrator (Opus)
Phase 4b   Topic-Planer 1–10 parallel            Topic-Planer (Sonnet)
Phase 4c   Merge zur Arbeitsversion              Plan-Orchestrator (Opus)
   │
   ▼  Plan-Review-Loop (max. 5 Iterationen)
        6 Reviewer parallel (siehe §5)
        Findings?  ja → Plan-Fixer (Opus) → nächste Iteration
                   nein / Max erreicht → weiter
   │
   ▼
Phase 6    Synthese, Komplexitäts-/Executor-Empfehlung,
           Umsetzungs-Topologie (Slices/Wellen)  Plan-Orchestrator (Opus)
   │
   ▼  AUTOMATISCH (kein manueller Gate)
Implementations-Flow
```

**Plan wird als Datei persistiert** (entschieden ⑦) — übersteht Kontext-Kompaktierung beim automatischen Handoff. *Pfad-Konvention noch festzulegen (§14).*

---

## 7. Implementations-Flow

```
Hard Gate (Readiness)            Impl-Loop-Orchestrator (Opus, delegiert)
   │
   ▼  Scribes 1–10 (parallel/sequenziell), Runden 1–3 Sonnet
        je Scribe: NUR slice-scoped Build/Test
   │
   ▼  Integration-Checkpoint (Merge aller Scribes)
   │
   ▼  QUALITY GATES (integrationsweit — NICHT pro Scribe) — siehe §8
   │
   ▼  Findings → Fix-Planer (Opus, immer) → Fix-Scribes → Gates erneut
        Runden 4–5: Scribe-Opus + Fix-Planer-Opus
   │
   ▼  Nach Runde 5 mit offenen Findings: Hard Stop + Rest-Findings-Bericht
```

---

## 8. Quality Gates (Hard-Power) — **korrigierte Reihenfolge**

**Wichtig (Tier-1-Korrektur):** Build ist **Vorbedingung**, nicht das letzte Gate. ArchUnitNET lädt **kompilierte Assemblies** via Reflection → ohne erfolgreichen Build nicht lauffähig. `jb inspectcode` braucht Restore/Build für brauchbare Ergebnisse.

```
1. BUILD (muss grün)              build_dotnet_solution / build_angular_project (dev-mcp)
      │  Vorbedingung — ohne grünen Build kein Gate 2/3/4
      ▼
2. STATISCHE ANALYSE (parallel)
      • run_inspectcode            (dev-mcp, NEU)
      • ArchUnitNET-Tests          via test_dotnet_solution
      • lint_angular_project       (dev-mcp, NEU)  → ng lint
      ▼
3. IODA-REVIEW                     implement-review-ioda-agent (Opus)
      ▼
4. TEST-SUITE                      test_dotnet_solution / test_angular_project (dev-mcp)
```

**Sequenz-Logik (Variante „C", angepasst):**
- **Errors** in Stufe 1 oder 2 → Stufe 3+4 warten, Fix zuerst.
- Nur **Warnings** → alle Stufen durchlaufen, **gebündelte Findings** an Fix-Planer.

**Gate-Ort:** Gates laufen am **Integration-Checkpoint** (nach Merge aller parallelen Scribes), **nicht** „nach jedem Scribe". Pro Scribe nur slice-scoped Build/Test.

**Gate-2-Bootstrap (Tier-1-Korrektur):** Einmaliger **Setup-Schritt**, getrennt vom Pro-Slice-Loop. Installiert in frisches Kundenprojekt:
- ArchUnitNET (NuGet-Paket + Regelklasse + Verdrahtung ins Test-Projekt)
- ESLint-Baseline (`@angular-eslint` + Config)
> Ohne diesen Schritt läuft der erste Gate-2-Lauf ins Leere.

---

## 9. dev-mcp — Erweiterungen (Teil des Features)

Ort: `Mcp-Servers/Dev.WindowsService.Mcp/`. Output **token-optimiert** (maschinen-dicht, gerade noch menschenlesbar, kein rohes XML/JSON).

| Tool | Input | Output |
|------|-------|--------|
| `run_inspectcode` | `solutionPath` | `{ summary:{errors,warnings,hints}, errors:[{file,line,rule,msg}], warnings:[...] }` |
| `lint_angular_project` | `projectPath` | `{ summary:{errors,warnings}, errors:[{file,line,rule,msg}], warnings:[...] }` |

Build + Test bereits vorhanden (`build_dotnet_solution`, `test_dotnet_solution`, `build_angular_project`, `test_angular_project`) — **unverändert**.

---

## 10. Baselines

### ArchUnitNET (Option A — nur Regelklasse, kein vollständiges Test-Projekt)
Template `references/archunit-baseline-template.cs`, wird in das **bestehende** Test-Projekt des Kunden kopiert. Baseline-Regeln (im Harness, pro Projekt verfeinerbar):
- Controller → Service → Repository Layering, **keine Sprünge**
- Kein direkter DB-Zugriff aus Controllern
- Domain-Modelle **frei** von Infrastructure-Abhängigkeiten
- **Keine** zirkulären Abhängigkeiten zwischen Schichten
- IODA-nah: Service-Methoden, die andere Services aufrufen, enthalten **keine** Inline-Logik
- Namenskonventionen: Services enden auf `Service`, Repositories auf `Repository`

### Angular ESLint (`references/eslint-baseline.json`)
`@angular-eslint` + custom Architektur-Regeln im Harness.
> **OFFEN (§14):** `eslint-plugin-boundaries` für echte Modul-Boundaries — Angular-Gate-2 ist sonst **flacher** als .NET (ESLint prüft primär Datei-/Import-Regeln, ArchUnitNET echte Schichten).

---

## 11. Prinzipien-Dokument (`references/principles-cleancode.md`)

Inhalt: **Westphal IODA** + **IOSP** + **klassisches SOLID** + **Clean Code (Robert C. Martin)**.
**Bei Widerspruch: SOLID + IODA überwiegen.**

---

## 12. Lean-Planning-Mode (kleine Aufgaben)

| Aspekt | Regel |
|--------|-------|
| Wer entscheidet „klein" | **Sven — explizit.** Der Skill erkennt das **nicht** selbst, hat **keine** Auto-Heuristik. |
| Was schrumpft | **Nur Planung:** Orchestrator (Opus) plant + prüft + reviewed **in sich selbst** — keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop. |
| Was bleibt voll | **Implementation unangetastet** — voller Scribe, alle Gates, voller Review-Loop. **Hier wird nie gespart.** |

**Framing:** bewusst **sanktionierte Ausnahme** zur alten Anti-Shortcut-Regel. Bleibt regelkonform, weil **nicht still**, sondern **nur nutzergetriggert**.
**Genaue Trigger-Formulierung: geparkt für den Schluss (§14).**

---

## 13. test-design — Verweis

- **Pflicht-Referenz für:** Scribe, alle implement-review-Agents, Fix-Planer. **Nicht** für Planungs-Agents (Scout, Topic-Planer, Plan-Orchestrator) — die schreiben keine Tests.
- **FAKT:** Skill `test-design` **existiert nicht** im Repo — nicht auf `origin/master`, nicht auf dem Feature-Branch, nirgends. Kein anders benannter `test-*`-Skill. Vermutlich **lokal-ungepusht** auf Svens Laptop.
- Existierende Test-Guidance verstreut in: `angular-developer-extension/references/testing.md`, `angular-developer/references/{testing-fundamentals,component-harnesses,op-testing}.md`.

---

## 14. Offene Punkte / zu klären

| # | Punkt | Stand / Empfehlung |
|---|-------|--------------------|
| ④ | `test-design` existiert nicht | Entscheiden: **(a)** von Laptop pushen · **(b)** auf verstreute Refs verweisen · **(c)** als Teil des Features neu erstellen |
| ⑨ | `eslint-plugin-boundaries` für Angular | Besprechen — Tiefe von Angular-Gate-2 |
| — | Plan-Fixer vs. Phase 6 Arbeitsteilung | Bestätigen: Plan-Fixer = iteratives Patchen pro Iteration; Phase 6 = finale Konsolidierung + Komplexitäts-/Executor-Empfehlung + Umsetzungs-Topologie |
| — | Plan-Persistenz: Pfad-Konvention | Festlegen (z. B. `plan-<feature>.md` oder unter `requests/`) |
| **Geparkt (Schluss)** | Finaler **Skill-Name** | Noch offen |
| **Geparkt (Schluss)** | **Trigger-Wörter** für Skill-X | Inkl. Schicksal von `plane`/`implementiere`/`fix` (→ Skill-X?) |
| **Geparkt (Schluss)** | **Lean-Mode-Trigger-Formulierung** | Noch offen |
| **Geparkt (Schluss)** | **Wer setzt um** | Vermutlich getrennte Agent-Prompts: einer für Skills, einer für MCP |

---

## 15. Entscheidungs-Log (abgeschlossen ✓)

- Modelle: nur Opus/Sonnet, **kein Haiku**. ✓
- „Opus-high/low" fallen gelassen (technisch nicht steuerbar). ✓
- Plan-Review-Loop **max. 5**. ✓
- Impl-Fix-Loop **max. 5**; Scribe 1–3 Sonnet, 4–5 Opus; Fix-Planer **immer Opus**. ✓
- Planning → Implementation **automatisch**. ✓
- `planning-workflow` + `implementation-workflow` als Skills **entfernt**, **keine Aliase**, werden zu `flows/`. ✓
- Skill-X = **Orchestrator**; planning + implementation als interne Flows. ✓
- `plan-fixer-agent` = **Patcher** (Opus). ✓
- **Zwei** IODA-Agents (Plan + Implement), beide Opus. ✓
- ArchUnitNET **Option A** (Regelklasse-Template). ✓
- ESLint-Baseline im Harness. ✓
- Gate-Sequenz korrigiert: **Build zuerst (Vorbedingung)** → statische Analyse parallel → IODA → Tests. ✓
- **Gate-2-Bootstrap** als einmaliger Setup-Schritt. ✓
- Gates **integrationsweit**, nicht pro-Scribe. ✓
- `run_inspectcode` + `lint_angular_project` in dev-mcp, token-optimiert. ✓
- Scope: Skill-X = **ein Feature** = Skills + MCP gemeinsam. ✓
- Prinzipien: Westphal IODA + IOSP + SOLID + Clean Code; bei Widerspruch SOLID+IODA. ✓
- ⑤ `lehrer` behalten → **7** Impl-Reviewer. ✓
- ⑥ Impl-Loop-Orchestrator = **delegierter Agent auf Opus**. ✓
- ⑦ Finalen Plan **als Datei** persistieren. ✓
- `test-design` Pflicht-Verweis für Scribe/Review/Fix-Planer (Existenz offen, §13). ✓

---

## 16. Branch / Repo-Status

- Designierter Feature-Branch (Harness): `claude/skill-x-agent-framework-xj2zi3`.
- Sven arbeitet lokal auf `master`; gewechselt, da noch **keine** Changes/Commits.
- **Aktuell:** Branch `master`, sauber, up-to-date mit `origin/master`.
- **Vor dem ersten Commit:** benannten Feature-Branch von `master` abzweigen (Name = finaler Skill-Name, geparkt).
- Noch **nichts implementiert** — reine Design-Phase.
