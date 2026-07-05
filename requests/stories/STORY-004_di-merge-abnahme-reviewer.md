---
id: STORY-004
parent: FEAT-001
type: story
status: planned
slug: di-merge-abnahme-reviewer
touches: [delivery-inspection/SKILL.md, subagent-prompts.md]
plan: requests/plans/plan-di-merge-abnahme-reviewer.md
---

# STORY-004 · ①-Merge · DI Normalo + Auftraggeber → „Abnahme" (6→5)

**Als** Terminal-PM
**möchte ich** die DI-Reviewer Normalo + Auftraggeber zu einem „Abnahme"-Reviewer (ein Spawn, ein
Kontext, eine `di-finding-abnahme.md`) mit **zwei getrennt ausgewiesenen Urteilen** verschmelzen,
**damit** die DI von 6 auf 5 Reviewer sinkt — bei erhaltener Doppel-Linse.

## Beschreibung

Fusion der **Hülle**, nicht der **Linse**: Ein Agent liefert zwei getrennt ausgewiesene Urteile —
**pragmatisch** (nutzbar/alltagstauglich?) + **streng** (unterschreibbar? das *Richtige* gebaut?).
Kollidieren die beiden Urteile, wird die Kollision **gemeldet, nie geglättet** — der Terminal-PM
sieht beide. Der Count-Guard in `delivery-inspection/SKILL.md` sinkt von N=6 auf **N=5**.

> Konventionswahl: Name „Abnahme" — falls ein anderes Wort gewünscht ist, genügt ein Wort.

## INVEST
- **I**: unabhängig — DI-Reviewer-Set + Count-Guard.
- **N**: Name verhandelbar; Struktur (zwei Urteile) fix.
- **S/T**: klein, testbar (Count-Guard + Urteils-Struktur).

## Akzeptanzkriterien

<!-- rd:ac:start -->
`DI_ReviewerCount_Ist5`
- Arrange: `delivery-inspection/SKILL.md` mit Count-Guard
- Act: Guard-Wert N prüfen
- Assert: N = 5 (vorher 6); Normalo + Auftraggeber nicht mehr als getrennte Reviewer gelistet
Status: neu

`Abnahme_LiefertZweiUrteile_PragmatischUndStreng`
- Arrange: „Abnahme"-Reviewer läuft (ein Spawn, eine `di-finding-abnahme.md`)
- Act: Ausgabe prüfen
- Assert: zwei getrennt ausgewiesene Urteile — pragmatisch + streng
Status: neu

`UrteilsKollision_WirdGemeldet_NieGeglaettet`
- Arrange: pragmatisch und streng kommen zu gegensätzlichem Ergebnis
- Act: Abnahme-Ausgabe prüfen
- Assert: beide Urteile bleiben sichtbar, Kollision explizit gemeldet; Terminal-PM sieht beide
Status: neu

`Abnahme_MitEinemFusioniertenUrteil_IstUngueltig`   (Negativ)
- Arrange: Abnahme-Ausgabe mit einem einzelnen, zusammengeglätteten Urteil
- Act: Struktur prüfen
- Assert: gilt als ungültig — genau zwei getrennte Urteile sind Pflicht (Linse nicht fusioniert)
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: Die übrigen vier DI-Reviewer bleiben unverändert; nur Normalo+Auftraggeber werden gemerged.
- Parallel: Primär-Datei `delivery-inspection/SKILL.md` disjunkt zu STORY-001 → parallel möglich;
  kleiner Rand-Edit an `subagent-prompts.md` (DI-Reviewer-Set) beachten.
