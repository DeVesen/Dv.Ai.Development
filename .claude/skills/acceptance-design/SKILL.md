---
name: acceptance-design
description: >
  Prüft eine Anforderung auf test-fähige Akzeptanzkriterien und schärft sie bei Bedarf nach.
  Liefert eine geschärfte Akzeptanzliste im F1-Format (Testname + AAA-Stichpunkte + Status)
  plus Befund untestbarer Kriterien und Rückfragen bei Mehrdeutigkeit.
  Komplementär zu test-design (WAS testen vs. WIE testen).
  Trigger: schärfe Anforderung, Akzeptanzkriterien prüfen, Akzeptanzkriterien schärfen,
  testbare Kriterien, @acceptance-design, Anforderung auf Testbarkeit prüfen.
---

# Acceptance Design

Prüft Anforderungen auf Testbarkeit und schärft untestbare Kriterien nach. Die **WAS**-Hälfte
im TDD-Prinzip — komplementär zu `test-design` (die WIE-Hälfte: AAA, Namenskonvention).

## Wann dieser Skill gilt

- Anforderung (Prosa, ADO-Story, buddy-Plan-Prompt) soll auf Testbarkeit geprüft werden
- Akzeptanzkriterien sind schwammig, subjektiv oder nicht 1:1 in Tests übersetzbar
- Planung (feature-delivery Phase 1) braucht eine gesicherte F1-Akzeptanzliste
- Gezielt: `@acceptance-design`

**Opt-out:** `ohne acceptance-design`

## Ablauf (interaktiv)

1. **Lesen:** Anforderung vollständig aufnehmen.
2. **Prüfen:** Jedes Akzeptanzkriterium gegen den [Prüfkatalog](references/pruefkatalog.md) abgleichen.
3. **Schärfen:** Testbare Kriterien direkt in F1-Format übersetzen; untestbare schärfen oder als Rückfrage markieren.
4. **Fragen → Warten:** Nicht auflösbare Mehrdeutigkeiten dem Nutzer vorlegen — **warten**, bis Antwort kommt.
5. **Ausgeben:** Vollständige [Ausgabe](references/io-format.md) mit Akzeptanzliste + Befund + ggf. offenen Rückfragen.

**Keine stillen Annahmen:** Unklare Kriterien werden immer als Rückfrage markiert, nie geraten.

## Ladereihenfolge

1. **Immer:** [references/pruefkatalog.md](references/pruefkatalog.md), [references/io-format.md](references/io-format.md)
2. **Für Beispiele:** [references/beispiele.md](references/beispiele.md)

## Andockpunkt feature-delivery

`acceptance-design` ist **entkoppelt** von `feature-delivery` — feature-delivery erzeugt seine
Akzeptanzliste selbst (Phase 4b/6, §8/F1). Der Andockpunkt ist **Phase 1** (Anforderung klären):
Nutzer oder Plan-Orchestrator kann `@acceptance-design` aufrufen, bevor der Planungs-Flow startet,
um rohe Anforderungen zu sichern. Nicht zwingend verdrahtet — Standalone-Tool.

**buddy-Intake:** Optional — `@acceptance-design` vor `buddy intake` empfohlen, wenn Anforderungen
noch roh sind. Kein harter Skill-zu-Skill-Link.

**ado:** Kein Andockpunkt — Nutzer führt `@acceptance-design` manuell auf dem Story-Text aus.

## Referenzen

| Thema | Datei |
|-------|-------|
| Prüfkatalog „testbar" | [references/pruefkatalog.md](references/pruefkatalog.md) |
| I/O-Format | [references/io-format.md](references/io-format.md) |
| Beispiele testbar vs. untestbar | [references/beispiele.md](references/beispiele.md) |
| F1-Format (Quelle) | feature-delivery-handoff.md §8 |
| Symmetrie test-design | [../test-design/SKILL.md](../test-design/SKILL.md) |
