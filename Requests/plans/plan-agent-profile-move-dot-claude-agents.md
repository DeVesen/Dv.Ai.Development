# Plan — STORY-004: Agent-Profile nach .claude/agents/ verschieben

Story: `Requests/stories/STORY-004_agent-profile-move-dot-claude-agents.md`
Modus: Lean End-to-end

---

## Goal

Alle `implement-*`- und `plan-*`-Agent-Profile aus `.claude/skills/feature-delivery/agents/` nach `.claude/agents/` verschieben, damit `subagent_type: "implement-scribe-agent"` ohne Retry auflöst.

**Ist:** Profile unter `.claude/skills/feature-delivery/agents/` — vom Harness nicht auto-discovered.  
**Soll:** Profile unter `.claude/agents/` — auto-discovered; `subagent_type`-Auflösung ohne Retry.

---

## Scope

**Drin:**
- Move aller 21 Agent-Profile: `.claude/skills/feature-delivery/agents/` → `.claude/agents/`
- Referenz-Update in 2 Flow-Dateien: `../agents/` → `.claude/agents/`
- Quell-Verzeichnis nach Move leer

**Nicht drin:**
- Inhaltliche Änderungen an den Profilen
- Änderungen an Profilen anderer Skills

---

## Betroffene Dateien

### Zu verschiebende Profile (21)

| Nr | Dateiname |
|----|-----------|
| 1 | implement-fix-planner-agent.md |
| 2 | implement-loop-orchestrator.md |
| 3 | implement-review-auditor-agent.md |
| 4 | implement-review-craft-agent.md |
| 5 | implement-review-design-principles-agent.md |
| 6 | implement-review-guard-agent.md |
| 7 | implement-review-readiness-agent.md |
| 8 | implement-review-risk-agent.md |
| 9 | implement-review-verifier-agent.md |
| 10 | implement-scribe-agent.md |
| 11 | implement-scribe-opus-agent.md |
| 12 | plan-agent-scout.md |
| 13 | plan-agent-topic-planner.md |
| 14 | plan-agent.md |
| 15 | plan-fixer-agent.md |
| 16 | plan-review-auditor-agent.md |
| 17 | plan-review-craft-agent.md |
| 18 | plan-review-design-principles-agent.md |
| 19 | plan-review-guard-agent.md |
| 20 | plan-review-readiness-agent.md |
| 21 | plan-review-risk-agent.md |

### Referenz-Updates (2 Dateien)

**`.claude/skills/feature-delivery/flows/planning-flow.md`**
- Alle `../agents/` → `.claude/agents/` (12 Treffer: 1x Modellwahl-Zeile + 11x Tabellen-Einträge)

**`.claude/skills/feature-delivery/flows/implementation-flow.md`**
- Alle `../agents/` → `.claude/agents/` (12 Treffer: 1x Modellwahl-Zeile + 11x Tabellen-Einträge)

### Geprüft — kein Update nötig

**`.claude/skills/feature-delivery/SKILL.md`** — Grep auf `agents/`: kein Treffer → kein Update
**`.claude/skills/feature-delivery/references/subagent-prompts.md`** — Grep auf `../agents/`: kein Treffer → kein Update

---

## Umsetzungs-Topologie

```
IMP-META-1 (sequenziell, 1 Scribe)
  Schritt 1: git mv für alle 21 Dateien (Liste oben, vollständig)
  Schritt 2: Edit planning-flow.md (replace_all ../agents/ → .claude/agents/)
  Schritt 3: Edit implementation-flow.md (replace_all ../agents/ → .claude/agents/)
  Schritt 4: Quell-Verzeichnis: leer lassen (kein git rm des Verzeichnisses —
             Story erlaubt explizit "Hinweis-Stub gelassen")
  Schritt 5: Verify (Glob .claude/agents/*.md → 22 Dateien,
             Glob .claude/skills/feature-delivery/agents/*.md → leer,
             Grep ../agents/ in flows → kein Treffer)
```

---

## Akzeptanz→Test-Liste (§8/F1)

| Slice | AC | Testname | Arrange | Act | Assert | Markierung |
|-------|-----|----------|---------|-----|--------|------------|
| IMP-META-1 | Alle 21 Profile + acceptance-design-agent.md in .claude/agents/ | `DotClaudeAgents_AllProfiles_Present` | — | Glob `.claude/agents/*.md` | 22 Dateien vorhanden (21 moved + 1 existing) | neu |
| IMP-META-1 | Kein implement-*/plan-*.md mehr im alten Pfad | `SkillAgents_AfterMove_Empty` | — | Glob `.claude/skills/feature-delivery/agents/*.md` | Keine Treffer | neu |
| IMP-META-1 | Alle `../agents/`-Refs in planning-flow.md weg | `PlanningFlow_NoOldAgentRefs` | — | Grep `../agents/` in planning-flow.md | Keine Treffer | neu |
| IMP-META-1 | Alle `../agents/`-Refs in implementation-flow.md weg | `ImplementationFlow_NoOldAgentRefs` | — | Grep `../agents/` in implementation-flow.md | Keine Treffer | neu |

---

## Quality Gates

Stack: Reine .md-Datei-Änderungen — kein Angular, kein .NET.

| Gate | Tool | Status |
|------|------|--------|
| Gate 1 Build | N/A | — |
| Gate 2 Static Analysis | N/A | — |
| Gate 3 Design Principles | N/A | — |
| Gate 4 Tests | N/A | — |
| 7 Reviewer | git diff (Markdown-Änderungen) | läuft nach Scribe |

---

## Uncertainty Audit

**Offen:** keine

**Selbst-entschieden:**
- Pfadformat in Referenz-Updates: `.claude/agents/` (repo-root-relativ, ohne führenden Slash) statt `../../../agents/` (relativ) — lesbarer als Dokumentations-Referenz. Bei Präferenz für Relativpfad: kurzer Hinweis genügt.
- Quell-Verzeichnis: leer lassen (kein Delete). Story erlaubt explizit beide Optionen; "Hinweis-Stub" gewählt, da risikoärmer.

## Plan-Coverage-Check — Reviewer-Overrides

**Override: Skeptiker KRITISCH (Profile-interne `../`-Pfade brechen nach Move)**
Profile-interne Pfade wie `` `../../test-design/SKILL.md` `` sind Dokumentationshinweise im System-Prompt-Text, keine mechanisch aufgelösten Dateipfade. Agents lösen Pfade relativ zum CWD auf — Profil-Datei-Speicherort hat keinen Einfluss auf Tool-Call-Pfadauflösung. Außerdem: Story schließt inhaltliche Profiländerungen explizit aus ("separater Scope"). → Kein Blocking-Befund.

**Override: Revisor / Dolmetscher (SKILL.md-Referenzen nicht im Plan)**
SKILL.md und subagent-prompts.md wurden empirisch auf `agents/`-Referenzen geprüft — kein Treffer. Update nicht nötig. Befund durch Daten widerlegt.
