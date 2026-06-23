# Umsetzungs-Auftrag — Strang 1: `feature-delivery` (Skills + Agents)

> Dieser Prompt ist **self-contained**, aber die **Source-of-Truth** ist [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md). Lies sie **vollständig** zuerst — sie enthält alle Design-Entscheidungen mit Begründung. Dieser Auftrag ist der Einstieg, nicht die vollständige Spezifikation.

## Kontext

`feature-delivery` ist ein **Orchestrator-Skill** für vollständige Feature-Umsetzung in .NET + Angular: Prompt → Planung (Sub-Agents, Review-Loop) → automatische Implementation (Scribes, Quality Gates, Review-Loop) → fertiges, getestetes Feature. Er ersetzt die bisherigen Skills `planning-workflow` + `implementation-workflow` (die als interne `flows/` aufgehen).

Repo: `C:\Develop\Dv.Ai.Development`. Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln, nicht mergen). **Zuerst `CLAUDE.md` lesen** (Repo-Konventionen).

## Dein Auftrag (nur Strang 1)

Lege `.claude/skills/feature-delivery/` + die zugehörigen Agent-Profile + `.claude/startup.md` an. **Migriere** Inhalte aus den bestehenden `planning-workflow`/`implementation-workflow` Skills + deren Agents — **nicht** von null erfinden.

### Deliverables
1. **`.claude/skills/feature-delivery/SKILL.md`** — Orchestrator-Einstieg, drei Einstiege + Trigger (§16: `plane`/`nur planen` → Plan-only; `setze X um`/`implementiere X`/`liefere X`/`feature-delivery`/`fix` → End-to-end; `setze plan <X> um`/`implementiere plan <X>` → From-existing-plan), Lean-Mode (§13: primäre Trigger `schlank planen`/`lean planen`, Synonyme `kompakt planen`/`Solo-Planung`; `klein` bewusst NICHT; nicht kombinierbar mit From-existing-plan), Verweis auf `flows/` + `references/`.
   **Frontmatter-Pflicht:** `name: feature-delivery` + `description: >` (§16-Trigger als erkennbare Phrasen) + `when_to_use: >` — exakt das Schema der bestehenden Skills ([`.claude/skills/planning-workflow/SKILL.md:1-17`](.claude/skills/planning-workflow/SKILL.md), [`.claude/skills/implementation-workflow/SKILL.md:1-13`](.claude/skills/implementation-workflow/SKILL.md)).
2. **`flows/planning-flow.md`** — aus `planning-workflow/SKILL.md` migriert + erweitert: TDD-Akzeptanz→Test-Liste (§8/F1), Scout-Test-Kartierung (§8/F3), Bounded-Context-Denken in Phase 4a (§12), Plan-Fixer-Blocker A1, Max-5-Handling A2, Plan-Persistenz A3 (§6).
3. **`flows/implementation-flow.md`** — aus `implementation-workflow/SKILL.md` migriert + erweitert: zweistufiger Test-First-Scribe (§7/§8), Quality Gates (§9) inkl. codebase-analyzer-Review-Kanal (5 focusAreas) + Security-`critical`=immer-blockierend, IODA-Review, From-existing-plan-Einstieg.
4. **`references/principles-cleancode.md`** — voller Kanon (§12): IODA·IOSP·SOLID·Clean Code + YAGNI·DRY·KISS + DDD-Leitplanken (A Bounded Context, B Entity-Durchstecherei) + Fehlerbehandlung + Inter-Service-Kommunikation + Security; Präzedenz SOLID+IODA. Mit Beispielen.
5. **`references/archunit-baseline-template.cs`** — Regelklasse-Template (§11), inkl. neue Regel „keine Entity-Durchstecherei" (Persistence-Entities nicht in Controller-Signaturen).
6. **`references/eslint-baseline.json`** + **`references/eslint-boundaries-template.js`** — §11 (Zonen core/shared/features + 4 Start-Regeln).
7. **`references/subagent-prompts.md`** — Auftrags-Vorlagen für alle Sub-Agents. **Zusammenführen** der beiden Quellen: `.claude/skills/planning-workflow/references/subagent-prompts.md` (Scouts, Interface-Designer, Topic-Planer, Merger, Plan-Reviews, Synthesizer) + `.claude/skills/implementation-workflow/references/subagent-prompts.md` (Scribe/Slice, Technik-Gate, Impl-Reviews, Fix-Planer). Zusätzlich neue Vorlagen für: `plan-fixer-agent`, `plan-review-ioda-agent`, `implement-review-ioda-agent`, `implement-loop-orchestrator`, `implement-scribe-agent`, `implement-scribe-opus-agent`.
8. **Agent-Profile unter `.claude/skills/feature-delivery/agents/`** (§4 Modell, §5 Katalog) — Konvention: skill-genested, Referenzierung per Relativpfad aus SKILL.md/flows (wie alle bestehenden Agents unter `.claude/skills/*/agents/`; **kein** `.claude/agents/` — das ist für Agents, die harness-weit discoverable sein müssen, was hier nicht zutrifft).

   **Modell-Pinning (PFLICHT für jedes Profil):**
   - YAML-Frontmatter `model: claude-opus-4-8` (Opus) bzw. `model: claude-sonnet-4-6` (Sonnet) gemäß §4-Tabelle — das ist die maschinenlesbare Steuerung.
   - Zusätzlich `## Modell`-Abschnitt im Body (Repo-Konvention, primäre Quelle für delegierende Orchestratoren per `.claude/references/subagent-model-before-task.md`).
   - **Achtung Modell-Mismatches:** Folgende übernommene Profiles haben im Quell-Repo `claude-opus-4-8`, §4 weist ihnen aber **Sonnet** zu → beim Übernehmen Modell auf §4 korrigieren (§4 gewinnt, Bestandswert überschreiben): `plan-agent-topic-planner`, `plan-review-oberlehrer`, `plan-review-professor`, `implement-review-oberlehrer`, `implement-review-professor`, `implement-review-lehrer`.

   **Neue Profiles** (6):
   - `plan-review-ioda-agent` (Opus), `implement-review-ioda-agent` (Opus), `implement-loop-orchestrator` (Opus), `implement-scribe-agent` (Sonnet), `implement-scribe-opus-agent` (Opus), `plan-fixer-agent` (Opus)

   **Plan-Orchestrator** (`plan-agent`, Opus) — **KEINE bestehende Datei**; im Quell-Repo ist er die inline-Sektion `## Orchestrator-Konfiguration` in `.claude/skills/planning-workflow/SKILL.md:270` (aktuell `model: inherit`). Extrahiere diese Sektion als neues Agent-Profil `plan-agent.md` und pinne `model: claude-opus-4-8` (inherit→Opus ist Absicht). Die Phasen 4a (Interface-Design/Topic-Map), 4c (Merge) und 6 (Synthese/Topologie) werden im Quell-Repo an drei dedizierte Agents delegiert: `plan-agent-interface-designer.md` (Phase 4a, Opus), `plan-agent-merger.md` (Phase 4c), `plan-agent-synthesizer.md` (Phase 6) — alle unter `.claude/skills/planning-workflow/agents/`. Im neuen Design (Handoff §5/§6) werden diese Phasen vom Plan-Orchestrator selbst getragen. **Entscheidung:** Falte den Inhalt dieser drei Agents in das neue `plan-agent.md` ein (Phasen-Logik, Prompts); die drei Standalone-Dateien entfallen dann beim Integrations-Schritt. Falls du begründete Bedenken siehst, nach Sven fragen (Regel: keine stillen Annahmen).

   **Scribes** (`implement-scribe-agent` Sonnet, `implement-scribe-opus-agent` Opus) — **Migrations-Quelle:** `.claude/skills/implementation-workflow/agents/implement-agent.md` (Slice-Ausführung + MCP Build/Test slice-scoped als Basis). Ableiten durch Aufteilen nach Runde/Modell + Erweiterung um zweistufigen Test-First-Ablauf (§7/§8). `implement-agent.md` selbst entfällt beim Integrations-Schritt.

   **Übernommene/anzupassende Profiles** (14): `plan-agent-scout` (Sonnet), `plan-agent-topic-planner` (→ Sonnet, s.o.), `plan-review-optimist` (Sonnet), `plan-review-pessimist` (Opus), `plan-review-normalo` (Sonnet), `plan-review-oberlehrer` (→ Sonnet, s.o.), `plan-review-professor` (→ Sonnet, s.o.), `implement-fix-planner-agent` (Opus), `implement-review-pessimist` (Opus), `implement-review-lehrer` (→ Sonnet, s.o.), `implement-review-normalo` (Sonnet), `implement-review-oberlehrer` (→ Sonnet, s.o.), `implement-review-professor` (→ Sonnet, s.o.), `implement-review-optimist` (Sonnet).

   **Roster gesamt: 21 Profile** (6 neu + 1 Plan-Orchestrator materialisiert + 14 übernommen).

9. **`.claude/startup.md`** — eigenständiges Harness-Dokument, interaktiver Konfig-Leitfaden (§18-Struktur: Voraussetzungen, Gate-2-Bootstrap, optionale Maßnahmen 3a–3g, Verifikation, Checkliste). Kennt die Skills; die Skills kennen es **nicht**. Hinweis im Dokument ergänzen: „Diese Datei wird vom Harness NICHT automatisch geladen (auto-geladen werden nur `CLAUDE.md`/`SKILL.md`) — sie ist ein manuell zu öffnendes Bootstrap-Dokument."

### Pflicht-Referenzen für die Agents (in Ladereihenfolge verdrahten)
- Scribe + alle `implement-review-*` + Fix-Planer → `test-design` (§14, existiert bereits unter `.claude/skills/test-design/`).
- Alle Agents → `principles-cleancode.md`.
- `feature-delivery` referenziert `acceptance-design` (Strang 4) **NICHT** zwingend — es ist entkoppelt (§15). Nicht darauf warten.

## Parallelitäts-Sperre (KRITISCH — §19)

Du arbeitest **parallel** zu Strang 2 (dev-mcp), Strang 4 (acceptance-design) und Strang 5/6 (codebase-analyzer IOSP — nachgelagert, kein echter Konflikt) auf demselben Branch im selben Working Tree.
- Fasse **NUR** `.claude/skills/feature-delivery/**` und `.claude/startup.md` an. Kein anderer Pfad.
- **NICHT anfassen** (geteilte Index-Dateien → Last-Write-Wins-Konflikt): `CLAUDE.md`, eine etwaige zentrale Skill-Index/Registry-Datei, `.claude/settings*`. Deren Aktualisierung (Skill-Liste, Entfernung der alten Skills) macht ein **finaler, sequentieller Integrations-Schritt** — nicht du.
- **Alte Skill-Ordner** `planning-workflow/` + `implementation-workflow/` sind **READ-ONLY-Quellen** — keine Datei darin bearbeiten oder löschen. Alle übernommenen Agents werden als **neue Dateien** unter `.claude/skills/feature-delivery/agents/` geschrieben; die Originale bleiben unangetastet bis zum Integrations-Schritt.
- Falls du Arbeit in eigene Sub-Agents aufteilst: Jeder Sub-Agent erbt diese Sperre vollständig — kein Sub-Agent darf Dateien außerhalb von `.claude/skills/feature-delivery/**` und `.claude/startup.md` schreiben.

## Regeln
- MCP-First: `dev-mcp` für Datei-Ops/Scaffolding, `codebase-analyzer` für Analyse. Windows-Absolutpfade.
- Keine stillen Annahmen — bei Mehrdeutigkeit im Handoff-Doc: Sven fragen.
- Kein Commit/Merge ohne Svens explizite Anweisung.
- Umfang ist groß (21 Agent-Profile + 2 Flows + SKILL + references + startup.md) — gliedere sinnvoll, ggf. in eigene Sub-Agents aufteilen.

## Verifikation
- **Pfad-Check:** `git status` zeigt Änderungen ausschließlich unter `.claude/skills/feature-delivery/**` und `.claude/startup.md` — kein anderer Pfad berührt.
- **Agent-Roster vollständig:** Alle 21 Profile vorhanden (6 neu + 1 Plan-Orchestrator + 14 übernommen, s. Deliverable 8). Kein `name:` aus dem Roster fehlt oder ist doppelt.
- **Pfad-Referenzen korrekt:** SKILL.md und flows referenzieren alle Agents per Relativpfad auf `feature-delivery/agents/` — kein Verweis zeigt noch auf die Altpfade unter `planning-workflow/agents/` oder `implementation-workflow/agents/`.
- **Frontmatter-Pflicht:** Jedes Profil hat `model:` ∈ `{claude-opus-4-8, claude-sonnet-4-6}` + `name:` + `description:`. `## Modell`-Abschnitt im Body vorhanden. Modell-Zuordnung korrekt per §4 (Achtung: 6 bekannte Mismatches oben, §4 gewinnt).
- **SKILL.md-Frontmatter:** `name:`, `description: >`, `when_to_use: >` vorhanden; Trigger aus §16 + §13 in `description`/`when_to_use` erkennbar.
- **Interne Konsistenz:** Alle §-Bezüge, Datei-Links, Agent-Namen stimmig?
- **Abgleich Handoff §3–§18:** nichts aus dem Strang-1-Scope ausgelassen?
