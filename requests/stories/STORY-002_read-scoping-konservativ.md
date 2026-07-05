---
id: STORY-002
parent: FEAT-001
type: story
status: implemented
plan: requests/plans/plan-read-scoping-konservativ.md
slug: read-scoping-konservativ
touches: [subagent-prompts.md]
---

# STORY-002 · ④ Read-Scoping konservativ

**Als** Harness-Pflegender
**möchte ich** beweisbare Read-Redundanz entfernen und klar überdimensionierte Voll-Reads auf benannte
Sektionen verengen,
**damit** Sub-Agents nur den nötigen Kontext lesen — ohne die Anti-Shortcut-Regel zu verletzen.

## Beschreibung

Konservativ, nicht aggressiv: Nur **beweisbare** Redundanz + **klar** überdimensionierte Voll-Reads.
Konkret: der Doppel-Read von `codebase-analyzer/SKILL.md` beim Fix-Planer (Pflicht-Punkt 2 = 3) wird
entfernt. Große Skills werden auf eine **benannte Sektion** verengt, wo ein sauberer Anker existiert;
im Zweifel bleibt der volle Read. Boilerplate bleibt **unangetastet** — die Steuerung läuft nur über
das im Payload *Benannte*, die Boilerplate-Regel „nicht paraphrasieren/weglassen" bleibt gewahrt.

## INVEST
- **I**: unabhängig — betrifft die Read-Anweisungen in den Payloads.
- **S/T**: klein und testbar (Read-Listen prüfbar).
- **N**: konservativ verhandelbar (im Zweifel voller Read) — bewusste Under-Reading-Vermeidung.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`FixPlaner_CodebaseAnalyzerRead_NurEinmal`
- Arrange: Fix-Planer-Payload mit Pflicht-Read-Punkten
- Act: Read-Anweisungen für `codebase-analyzer/SKILL.md` zählen
- Assert: genau ein Read; der Doppel-Read (Punkt 2 = 3) ist entfernt
Status: neu

`GrosseSkills_MitSauberemAnker_AufSektionVerengt`
- Arrange: Payload, der einen großen Skill mit sauberem Sektions-Anker liest
- Act: Read-Anweisung prüfen
- Assert: Read verweist auf die benannte Sektion statt auf den Voll-Read
Status: neu

`Boilerplate_NichtParaphrasieren_Unveraendert`   (Guard)
- Arrange: Boilerplate-Regelwerk
- Act: Regel „nicht paraphrasieren/weglassen" prüfen
- Assert: unverändert; Boilerplate nicht editiert
Status: unberuehrt

`SkillOhneSauberenAnker_BleibtVollRead`   (Negativ)
- Arrange: Skill ohne sauberen Sektions-Anker
- Act: Read-Anweisung prüfen
- Assert: voller Read bleibt bestehen — kein aggressives Scoping erzwungen (Under-Reading vermieden)
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Offener Punkt (nicht-blockierend): Welche großen Skills einen „sauberen Anker" haben, entscheidet
  die Implementierung pro Datei — im Zweifel voller Read.
- Abhängigkeit: teilt sich `subagent-prompts.md` mit STORY-001/003/005 → seriell dagegen.
