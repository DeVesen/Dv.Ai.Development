---
id: STORY-004
parent: FEAT-001
type: story
status: implemented
slug: requirement-definition-feature-zwang
touches:
  - requirement-definition/SKILL.md
---

# requirement-definition: Feature-Zwang (keine Waisen-Story)

**Als** Nutzer des Harness
**möchte ich**, dass requirement-definition nie eine Story ohne Feature-Bezug anlegt
**damit** jede Story garantiert an genau einem Feature hängt (und deterministisch einem Worktree
zuordenbar ist).

## Beschreibung

Feature-Zwang (RD1):
- **Story-Direkteinstieg** und **Micro-Change-Pfad** müssen zuerst fragen:
  „zu welchem Feature? [existierendes Feature wählen / neues Minimal-Feature anlegen]".
- `parent` wird **immer** gesetzt — nie eine Story ohne `parent` schreiben.
- „Neues Minimal-Feature" = eager-write-Stub (`status: offen`), Dialog füllt später (kein Zwang zur
  vollen Feature-Zeremonie sofort — Overhead bewusst akzeptiert).

## INVEST
Erfüllt. Unabhängig von den feature-delivery-Stories (andere Datei), eigenständig wertvoll.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`FeatureZwang_StoryDirekteinstieg_FragtNachFeature`
- Arrange: Nutzer startet Story-Direkteinstieg ohne Feature-Kontext
- Act: Skill-Start
- Assert: Skill fragt „zu welchem Feature?" mit Optionen existierend/neu; keine Story wird ohne `parent` geschrieben
Status: neu

`FeatureZwang_NeuesMinimalFeatureGewaehlt_LegtStubAnUndSetztParent`
- Arrange: Nutzer wählt „neues Minimal-Feature"
- Act: Feature-Stub-Anlage + Story-Anlage
- Assert: `FEAT-NNN`-Stub (`status: offen`) entsteht; Story-Frontmatter erhält `parent: FEAT-NNN`
Status: neu

`FeatureZwang_MicroChangePfad_ErzwingtEbenfallsFeature`
- Arrange: Micro-Change erkannt
- Act: vereinfachter Draft
- Assert: auch hier Feature-Pflicht; kein parentloses Ergebnis
Status: neu

`FeatureZwang_StoryOhneGewaehltesFeature_KeinWrite`   (Negativ)
- Arrange: interner Zustand ohne gewähltes/angelegtes Feature
- Act: Versuch, Story-Datei zu schreiben
- Assert: kein Write ohne `parent`
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Fachliche Basis für STORY-001 (deterministische Branch-Ableitung aus `parent`).
