# Level-Erkennung — Epic / Feature / Story

Bestimmt, auf welcher Ebene ein Wunsch einsteigt. Im Zweifel **hoeher** starten (Epic) und nach
unten korrigieren — nie ungefragt nach unten.

## Rubrik

| Level | Definition | Heuristik |
|-------|-----------|-----------|
| **Story** | Kleinstes Arbeitspaket; ein klar abgegrenztes Verhalten | In *einem* Sprint von *einem* Team baubar |
| **Feature** | Kohaerente Capability; ein zusammenhaengender Funktionsbereich | Braucht mehrere Stories, aber ein Thema |
| **Epic** | Geschaeftsziel/Initiative ueber mehrere Features | Meist mehrere Sprints, mehrere Capabilities |

## Beispielfragen zur Einordnung

- Beschreibt der Wunsch **ein** konkretes Verhalten („drei Checkboxen als Select")? → eher **Story**.
- Beschreibt er einen **Funktionsbereich** („Benutzerverwaltung")? → eher **Feature**.
- Beschreibt er ein **Ziel/eine Initiative** ueber mehrere Bereiche („Self-Service-Portal")? → **Epic**.
- Tauchen schon beim ersten Satz **mehrere unabhaengige Capabilities** auf? → **Epic**.

## Downgrade-Dialog (kein Downgrade ohne Bestaetigung)

- Epic klingt eher nach Feature → *„Das klingt eher nach einem Feature. Direkt als Feature einsteigen?"*
- Feature klingt eher nach Story → *„Das klingt eher nach einer Story. Als Story behandeln?"*
- Kein Level erkennbar → als Epic starten und **sofort** pruefen, ob Feature/Story passender ist.

## Disambiguierung bei expliziter Invocation

`/requirement-definition <LEVEL>? "<Text>" | <Pfad.md>`:
- Endet das Argument auf `.md` und die Datei existiert → **Datei-Modus** (Phase aus Frontmatter-`type`).
- Sonst **Freitext-Modus**; fehlt `<LEVEL>` → Rubrik oben anwenden.
