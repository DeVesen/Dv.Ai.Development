# Umsetzungs-Auftrag — Strang 4: `acceptance-design` (Skill + Agent)

> **Source-of-Truth:** [docs/feature-delivery-handoff.md](../feature-delivery-handoff.md), v.a. **§15 (acceptance-design)**, **§8 (TDD/F1-Format)**, **§14 (test-design Symmetrie)**. Zuerst lesen.

## Kontext

`acceptance-design` ist ein **eigenständiger** Skill: er prüft eine Anforderung auf **test-fähige Akzeptanzkriterien** und schärft sie bei Bedarf nach. Er ist die **WAS**-Hälfte (welche Kriterien, testbar formuliert) — komplementär zu `test-design` (die **WIE**-Hälfte: AAA, Namenskonvention). Beide Symmetrie siehe §14.

**Entkopplung (wichtig):** `feature-delivery` referenziert diesen Skill **NICHT** zwingend — es erzeugt seine Akzeptanzliste selbst. `acceptance-design` ist eine DRY-Zentralisierung der Definition „test-fähiges Akzeptanzkriterium" + Standalone-Tool. Du baust **unabhängig**.

Repo: `C:\Develop\Dv.Ai.Development`. Branch: `claude/skill-x-agent-framework-xj2zi3` (nicht wechseln/mergen). **Zuerst `CLAUDE.md` + `.claude/skills/test-design/SKILL.md` lesen** (für die Symmetrie + Stil).

## Dein Auftrag (nur Strang 4)

### Zuerst: Detail-Design klären (war für diese Session offen, §15)
Das Kern-Konzept steht (§15). **Offen und hier zu entscheiden** (mit Sven abstimmen, keine stillen Annahmen):
- Ausformulierung der **Prüfkriterien** für „testbar" (Vorschlag aus §15: messbares/eindeutiges Ergebnis · atomar · beobachtbar über API/UI · klare Vorbedingung/Aktion/Ergebnis, AAA-fähig).
- **Umhüllung** des Outputs: Der Output-**Kern** ist durch das F1-Format (§8) bereits gebunden (Testname nach test-design-Konvention + AAA-Stichpunkte + Markierung neu/erweitern/unberührt) — **nicht neu erfinden**. Hier nur festlegen, wie **Befund untestbarer Kriterien** + **Rückfragen** an die F1-Liste angehängt/strukturiert werden.
- **Wer referenziert** acceptance-design: Andockpunkt **feature-delivery Phase 1** ist laut §15 bereits **geklärt** (nur dokumentieren). Offen (Vorschlag erarbeiten, mit Sven bestätigen): Verdrahtung zu **buddy-Intake** / **ado**.

**Ablauf (harter Gate):** Schritt A — die offenen Punkte als Vorschlag formulieren und Sven vorlegen → **auf Freigabe warten**. Schritt B — **erst nach Freigabe** die Deliverables schreiben. **Keine** Deliverable-Datei vor der Freigabe anlegen.

### Deliverables
1. **`.claude/skills/acceptance-design/SKILL.md`** — aktiver Prüf-/Schärf-Skill mit Konventions-Kern. Eigener Trigger (`schärfe Anforderung`, `Akzeptanzkriterien prüfen`, `@acceptance-design`). Interaktiv (fragen → warten → schärfen). Andockpunkt feature-delivery Phase 1 dokumentieren.
2. **`.claude/skills/acceptance-design/references/*`** — Prüfkriterien-Katalog + I/O-Format + Beispiele (test-fähig vs. untestbar).
3. **`.claude/agents/acceptance-design-agent.md`** — **leicht (Sonnet)**, schlanker fokussierter Prompt, **keine** Sub-Delegation (arbeitet selbst). Modell per **YAML-Frontmatter `model: claude-sonnet-4-6`** (§4-Modellschema = Sonnet; **kein** `## Modell`-Body-Abschnitt — der ist nur für delegierende Orchestratoren). Profil-Struktur an einem bestehenden Sonnet-Agent ausrichten (Vorlage: `.claude/skills/planning-workflow/agents/plan-agent-scout.md`): Frontmatter (`name`/`model`/`description`) + Body mit Rolle, **Pflicht-Dokumente inkl. `.claude/references/agent-compliance.md`** (wie alle Repo-Agents), Rückgabe. Hinweis: `.claude/agents/` ist neu/leer — Zielort gemäß §3/§19, ggf. anlegen.

## Parallelitäts-Sperre (KRITISCH — §19)

Du arbeitest **parallel** zu Strang 1 (feature-delivery) und Strang 2 (dev-mcp).
- Fasse **NUR** `.claude/skills/acceptance-design/**` und `.claude/agents/acceptance-design-agent.md` an.
- **NICHT anfassen** (geteilte Index-Dateien): `CLAUDE.md`, zentrale Skill-Index/Registry, `.claude/settings*`. Eintragung in die Skill-Liste macht der finale Integrations-Schritt.
- Fasse **nicht** `skills/feature-delivery/` oder `skills/test-design/` an (nur lesen für Stil/Symmetrie).

## Regeln
- Stil an `test-design` orientieren (kompakt, Framework-/Stack-bewusst, deutschsprachig).
- MCP-First für Datei-Ops. Keine stillen Annahmen — Detail-Design mit Sven abstimmen. Kein Commit/Merge ohne Anweisung.

## Verifikation
- Skill-Frontmatter + Trigger valide (Trigger im `description: >`-Block eingebettet wie test-design — kein separates `triggers:`-Array; echter Auto-Trigger erst nach finalem Integrations-Schritt), Ladereihenfolge stimmig.
- Prüfkriterien an Beispielen durchgespielt (testbar vs. untestbar korrekt klassifiziert).
- Agent-Profil: Frontmatter `model: claude-sonnet-4-6`, `.claude/references/agent-compliance.md` als Pflicht-Dokument verdrahtet, keine Sub-Delegation, fokussierter Prompt.
- Output-Format kompatibel mit dem F1-Format (§8) des Handoff-Docs.
