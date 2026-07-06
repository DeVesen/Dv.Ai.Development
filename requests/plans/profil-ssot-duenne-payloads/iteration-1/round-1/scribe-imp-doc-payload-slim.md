# Scribe — IMP-DOC-Payload-Slim (W1)

Slice-ID: IMP-DOC-Payload-Slim
Welle: W1 (nach W0)
Status: GREEN

## Summary

**Red-Phase:** N/A — md-only slice, keine Test-Suite. Struktur-Assertions laufen als W2 (IMP-DOC-Verify).

**Green-Phase:** 10 Payload-Blöcke in `subagent-prompts.md` verschlankt (Block 1/plan-agent war bereits slimmed, wurde unveränert gelassen):
- Block 2 (PL): Ablauf Schritt 0-6 + Gate-Details + Review-Loop-Enumeration + Digest-Detail gestrichen → Pointer + variable Rundendaten
- Block 3 (PM): Urteil-Definitionen + Editier-Grenzen + Rückgabe-Format gestrichen → Pointer + variable Rundendaten
- Block 4 (Scribe 1-3): RED→GREEN-Schritte + MCP-Pflicht + OnPush-Block + Post-Scribe + Datei-Handoff gestrichen (OnPush vorher W0 ins Profil migriert) → Pointer + variable Rundendaten
- Blocks 5-11 (7 Impl-Review-*): Prüfschritte + Pflicht-MCP + Datei-Handoff + Rückgabe-Format je Block gestrichen; Design-Principles-Block: stale „IODA-Vorgaben aus Plan-Review-IODA" Input entfernt → Pointer + Kanon-Pointer + variable Rundendaten

## Touched Paths

- `.claude/skills/feature-delivery/references/subagent-prompts.md`

## Build/Test-Matrix

| Lauf | Stack | Ergebnis |
|------|-------|---------|
| N/A  | md-only — kein Build/Test-Stack | N/A |

## Offene Risiken/Blocker

Keine. AC-4-Hinweis: Der Grep-Treffer für "tier-gesteuertes Urteil" in der PM-Pointer-Zeile (`Ablauf tier-gesteuertes Urteil (...) in implement-supervisor.md`) ist kein Regression — es ist eine Pointer-Beschriftung, keine Ablauf-Kopie. Der Plan klassifiziert diese Zeile explizit als „Behalten als Pointer" (Block 3 Teilplan).
