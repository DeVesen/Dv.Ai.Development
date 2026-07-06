---
story: requests/stories/STORY-002_read-scoping-konservativ.md
status: plan
slug: read-scoping-konservativ
---

# Plan — STORY-002 · Read-Scoping konservativ

## Analyse

**Befund Doppel-Read (→ AC1):**
In `.claude/skills/feature-delivery/references/subagent-prompts.md`, Fix-Planer-Payload,
Zeilen 321–327:

```
Pflicht-Rules (0-5):
0) agent-compliance.md
1) feature-delivery/flows/implementation-flow.md
2) codebase-analyzer/SKILL.md
3) codebase-analyzer/SKILL.md (Analyse-Abschnitt)
4) angular-developer/SKILL.md / backend-ef-migrations/SKILL.md (falls Scope passt)
5) test-design/SKILL.md (Testfall-Reparaturen)
```

Punkt 2 = voller Read, Punkt 3 = dieselbe Datei mit "(Analyse-Abschnitt)"-Annotation.
`(Analyse-Abschnitt)` ist kein H2-Header in `codebase-analyzer/SKILL.md` — es ist ein
Verwendungskontext-Hinweis, kein sauberer Sektions-Anker. Echter Doppel-Read: Punkt 2 ≡ Punkt 3.

**Befund Sektions-Anker (→ AC2/AC4):**
`codebase-analyzer/SKILL.md` (749 Zeilen) hat saubere H2-Anker (`## PLANUNG — Vorgehen`,
`## IMPLEMENTIERUNG — Vorgehen`, `## NACH IMPLEMENTIERUNG — Vorgehen`, `## Validierungs- &
Contract-Reviews`, …), aber der Fix-Planer benötigt seine MCP-Reihenfolge A–H aus mindestens
5 verschiedenen Sektionen → kein einzelner sauberer Anker deckt den Fix-Planer-Gesamtbedarf ab.
Konservative Entscheidung: voller Read bleibt (Under-Reading-Vermeidung, AC4 greift).

Alle weiteren Payloads in `subagent-prompts.md` (PL, PM, Scribe, Reviewer, Session-Treiber)
haben keine expliziten Skill-Read-Anweisungen mit großen Dateien — AC2 ist vakuös bestanden:
kein False-Positive, kein unscoped verbliebener Read bei einem Skill mit sauberem Einzelanker.

---

## Umsetzungs-Topologie

**Einziger Slice: IMP-001** — keine Wellen, keine Blocking-Abhängigkeiten.

---

### IMP-001 — Fix-Planer Pflicht-Punkt 3 entfernen + Umnummerieren

**Datei:** `.claude/skills/feature-delivery/references/subagent-prompts.md`

**Bereich:** Fix-Planer-Payload, `Pflicht-Rules`-Block (Zeilen 321–327)

**Aktuelle Zeilen:**

```
Pflicht-Rules (0-5):
0) agent-compliance.md
1) feature-delivery/flows/implementation-flow.md
2) codebase-analyzer/SKILL.md
3) codebase-analyzer/SKILL.md (Analyse-Abschnitt)
4) angular-developer/SKILL.md / backend-ef-migrations/SKILL.md (falls Scope passt)
5) test-design/SKILL.md (Testfall-Reparaturen)
```

**Zielzustand:**

```
Pflicht-Rules (0-4):
0) agent-compliance.md
1) feature-delivery/flows/implementation-flow.md
2) codebase-analyzer/SKILL.md
3) angular-developer/SKILL.md / backend-ef-migrations/SKILL.md (falls Scope passt)
4) test-design/SKILL.md (Testfall-Reparaturen)
```

**Änderungen (minimal, 4 Zeilen):**
1. Zeile 321: `Pflicht-Rules (0-5):` → `Pflicht-Rules (0-4):`
2. Zeile 325: Punkt 3 (`3) codebase-analyzer/SKILL.md (Analyse-Abschnitt)`) entfernen
3. Zeile 326: `4)` → `3)` (Text identisch)
4. Zeile 327: `5)` → `4)` (Text identisch)

**Verboten (Boilerplate-Guard):** kein Eingriff in Payload-Regelwerk-Zeilen (MCP-Reihenfolge
A–H, Liefern-Liste 1–8, Input-Block, `Du erstellst…`-Zeilen) — ausschließlich Header + Liste
der Pflicht-Rules.

---

## AC-Mapping

| AC-ID | Prüfschritt nach IMP-001 | Erwartetes Ergebnis |
|-------|--------------------------|---------------------|
| `FixPlaner_CodebaseAnalyzerRead_NurEinmal` | `codebase-analyzer/SKILL.md` in Pflicht-Rules zählen | Genau 1 Treffer (Punkt 2) — kein zweiter Read |
| `GrosseSkills_MitSauberemAnker_AufSektionVerengt` | Verbleibende Pflicht-Rules auf unscoped große Skills mit sauberem H2-Einzelanker prüfen | Keiner gefunden → kein False-Positive, vakuös bestanden |
| `Boilerplate_NichtParaphrasieren_Unveraendert` | Alle Nicht-Änderungszeilen im Fix-Planer-Block auf Identität prüfen | Unverändert — nur Punkt 3 entfernt + Nummern angepasst |
| `SkillOhneSauberenAnker_BleibtVollRead` | Punkt 2 (`codebase-analyzer/SKILL.md`) prüfen: voller Read ohne Sektions-Einschränkung? | Ja — bleibt voller Read; kein aggressives Scoping |

---

## Randbedingungen

- **Hot-Datei**: `subagent-prompts.md` wurde von STORY-001 verändert — Plan basiert auf dem
  verifizierten aktuellen Stand (Zeilen 315–355, Branch `claude/read-redundancy-scoping-5tr40f`).
- **Under-Reading**: `codebase-analyzer/SKILL.md` bleibt voller Read — kein Scoping auf
  Teilsektion, da kein sauberer Einzelanker für den Fix-Planer-Gesamtbedarf (A–H) existiert.
- **Boilerplate**: MCP-Reihenfolge A–H, Liefern-Liste, Input-Abschnitt — nichts davon wird
  berührt.
