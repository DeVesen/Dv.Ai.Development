---
id: STORY-005
parent: FEAT-001
type: story
status: implemented
slug: requirement-definition-feature-name-grammatik
depends_on: [STORY-004]
touches: [requirement-definition/SKILL.md]
---

# requirement-definition: Eigener Feature-Name-Grammatik

**Als** Nutzer des Harness
**möchte ich** beim Anlegen eines Features per `feature "<name>" [prompt]` einen eigenen Namen mitgeben
**damit** Titel und Slug (inkl. evtl. DevOps-ID) meiner Wahl entsprechen statt automatisch abgeleitet
zu werden.

## Beschreibung

Name-Grammatik (RD2), **nur für Level `feature`**:

| Eingabe | "…" = Name? | Verhalten |
|---|---|---|
| `feature "<name>" [prompt]` | ja | Name → Titel + Slug; `[prompt]` = Inhalt |
| `feature [prompt]` | nein | wie heute — Titel/Slug aus `[prompt]`/Kontext |
| `feature "<name>"` | ja | Name gesetzt, Inhalt aus Kontext |

- Name → dt. Titel **und** ASCII-Slug (Slug-Regel: ä→ae etc., ~50 Zeichen).
- `epic`/`story` unverändert (Slot bleibt Text).
- `FEAT-NNN` bleibt automatisch über den Glob-Pre-Write-Gate — Nummer nicht steuerbar.

## INVEST
Erfüllt. Kleiner, klar abgegrenzter Grammatik-Zusatz; unabhängig testbar.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`NameGrammatik_FeatureMitNameUndPrompt_NameWirdTitelUndSlug`
- Arrange: `feature "Benutzerübersicht & Rollen" <prompt-text>`
- Act: Feature-Anlage
- Assert: Titel = „Benutzerübersicht & Rollen"; Datei `FEAT-NNN_benutzeruebersicht-rollen.md`; Inhalt aus `<prompt-text>`
Status: neu

`NameGrammatik_FeatureOhnePrompt_InhaltAusKontext`
- Arrange: `feature "X"` ohne Prompt
- Act: Feature-Anlage
- Assert: Name gesetzt; Inhalt aus Kontext; Stub angelegt
Status: neu

`NameGrammatik_FeatureNurPrompt_WieBisher`   (Abgrenzung)
- Arrange: `feature <prompt>` ohne Anführungszeichen
- Assert: Titel/Slug aus `<prompt>`/Kontext abgeleitet (heutiges Verhalten)
Status: neu

`NameGrammatik_EpicOderStory_SlotBleibtText`   (Negativ/Abgrenzung)
- Arrange: `epic "…"` bzw. `story "…"`
- Assert: Anführungszeichen = Text, NICHT Name
Status: neu

`NameGrammatik_FeatNummer_BleibtAutomatisch`   (Negativ)
- Arrange: Name mitgegeben
- Assert: `FEAT-NNN` weiterhin über Glob-Gate vergeben, nicht durch die Eingabe steuerbar
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Serialisiert nach STORY-004 (gleiche Datei `requirement-definition/SKILL.md`).
