# Scribe — Fix-Runde 2 (IMP-DOC-Scribe-Profile-Fix)

Slice-ID: IMP-DOC-Scribe-Profile-Fix
Welle: W2 (Fix-Runde)
Status: GREEN
Fix-Basis: PM-Verdikt Runde 1 + Digest Runde 1

## Summary

**Fix-Phase:** Drei Korrekturen in `implement-scribe-agent.md` basierend auf 🔴 + 🟡 + 🟢 Findings aus Runde 1:

1. **🔴 Fix — `## Datei-Handoff`-Abschnitt ergänzt**: Neuer Abschnitt nach der alten `## Rückgabe an Orchestrator`-Sektion (welche entfernt wurde). Enthält: Schreib-Anweisung für `scribe-<slice>.md` mit allen Pflichtfeldern + explizite „NUR Pointer + Verdikt-Kurzform"-Rückgabe. Damit löst der Slim-Payload-Pointer aus W1 korrekt auf.

2. **🟡 Fix — `## Post-Scribe-Verifikation`-Abschnitt ergänzt**: Neuer Abschnitt vor Datei-Handoff. Enthält: `mcp__dev-mcp__read_files_batch([alle Touched Paths])` Pflicht-Anweisung. Schließt die Sonnet/Opus-Scribe-Asymmetrie (Scribe-4-5 hatte die Anweisung weiterhin im Payload).

3. **🟢 Fix — Heading-Ebene `## Angular Hard Rules` → `###`**: Kosmetisch. Passt zur umgebenden `###`-Abschnitts-Struktur (Phase 1, Phase 2).

**PRESERVE-Liste (Guard) eingehalten:**
- `implement-scribe-agent.md` Z.41–47 Angular Hard Rules Inhalt: unberührt (nur Heading-Ebene geändert)
- Alle 5 korrekten Payload-Blöcke in subagent-prompts.md: nicht angefasst

## Touched Paths

- `.claude/agents/implement-scribe-agent.md`

## Build/Test-Matrix

| Lauf | Stack | Ergebnis |
|------|-------|---------|
| N/A  | md-only — kein Build/Test-Stack | N/A |

## Offene Risiken/Blocker

Keine.
