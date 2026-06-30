---
id: STORY-003
type: story
status: implemented
slug: globale-deferred-tool-policy-agent-compliance
---

# STORY-003 — Globale Deferred-Tool-Policy in agent-compliance.md

Als AI-Workflow-Entwickler möchte ich, dass `.claude/references/agent-compliance.md` eine globale Policy enthält, die alle Agents anweist, vor jedem deferred Tool ToolSearch auszuführen, damit InputValidationError bei deferred Schemas strukturell vermieden wird — ohne je nach Einzelfall lokal dokumentieren zu müssen.

## Kontext

SendMessage scheiterte in der Session mit InputValidationError — Schema war deferred, ToolSearch wurde nicht vorab aufgerufen. Das Muster tritt strukturell wiederholt auf, nicht session-spezifisch. Die implement-loop-orchestrator.md referenziert bereits `.claude/references/` (Zeilen 122–126) — eine Policy dort erreicht den Orchestrator ohne lokale Redundanz.

Entscheidung (grill-me Option B): Globale Policy in `agent-compliance.md`, nicht lokal im Orchestrator.

## Scope (drin / bewusst nicht drin)

**Drin:**
- Einzeiliger Policy-Eintrag in `agent-compliance.md`: "Vor jedem deferred Tool: ToolSearch('select:\<name\>') ausführen"
- Eigener Abschnitt oder klar auffindbare Stelle (keine Versteckung in Fließtext)

**Nicht drin:**
- Änderungen an Orchestrator- oder Agent-Profilen (keine lokale Kopie)
- Auflistung aller deferred Tools (zu volatil — Regel gilt generell)

## INVEST

- **I** — unabhängig von STORY-001/002/004
- **N** — Policy-Formulierung ist Pflicht, keine Empfehlung
- **V** — eine Zeile in einer Datei
- **E** — trivial: eine Datei, ein Eintrag
- **T** — testbar per Datei-Read

<!-- rd:ac:start -->
`AgentCompliance_DeferredToolPolicy_EintragsVorhanden`
- Arrange: `.claude/references/agent-compliance.md`
- Act: Datei lesen
- Assert: Policy-Eintrag vorhanden: "Vor jedem deferred Tool: ToolSearch('select:\<name\>') ausführen"; nicht im Fließtext versteckt
Status: neu

`AgentCompliance_DeferredToolPolicy_KlarAuffindbar`
- Arrange: agent-compliance.md, Policies-Struktur
- Act: Policy-Abschnitt lokalisieren
- Assert: Eintrag in eigenem benannten Abschnitt oder als Bullet in existierendem Policy-Block; kein Scrollen durch >20 Zeilen ohne Fund
Status: neu

`AgentCompliance_OhnePolicy_InputValidationErrorBeiDeferred` (Negativ)
- Arrange: agent-compliance.md ohne Deferred-Tool-Eintrag (alter Zustand)
- Act: Agent ruft SendMessage ohne vorheriges ToolSearch auf
- Assert: InputValidationError — Schema nicht geladen; Nutzereingriff nötig
Status: neu
<!-- rd:ac:end -->
