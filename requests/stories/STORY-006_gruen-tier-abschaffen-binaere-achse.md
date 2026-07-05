---
id: STORY-006
parent: FEAT-001
type: story
status: ready
slug: gruen-tier-abschaffen-binaere-achse
touches: [reviewer-gate-canon.md, secondbrain-schema.md, subagent-prompts.md, implementation-flow.md]
---

# STORY-006 · ⑥ 🟢 abgeschafft — Tier-Achse binär 🔴/🟡

**Als** Reviewer
**möchte ich** nur noch 🔴 (blockt) und 🟡 (meldet, blockt nicht) melden, den §3-Tripwire auf „kein
Finding" kippen und die Mindest-Mengen streichen,
**damit** die 🟢-Findings die Pipeline nicht mehr mit folgenlosem Rauschen belasten — bei erhaltenen
Positiv-Blöcken §8.3.

## Beschreibung

Die dreistufige Tier-Achse wird binär: nur noch 🔴 + 🟡. Konkret in `reviewer-gate-canon.md`:
- **§3-Tripwire kippt:** Präferenz/Politur ohne Folge → **kein Finding** (statt „→ 🟢"). §1 + §3
  verschmelzen zu: *keine Folge → nicht aufführen.*
- **Mindest-Mengen gestrichen** (craft ≥3, auditor ≥5 — waren die 🟢-Fabrik).
- **§5/§7-🟢-Fluchttüren** („höchstens 🟢-Notiz" / „🟢-only") → **„nicht melden".**
- **Positiv-Blöcke §8.3 bleiben** (PRESERVE-Liste, Ship-/AC-Map — keine 🟢-Findings, sondern
  mandatierte Deliverables).

In `secondbrain-schema.md`: der Tier-Zähler `Tier 🟢 offen` und die 🟢-Klassifikation im Digest-Roll-up
entfallen. In `subagent-prompts.md`: 🟢 aus allen Rückgabe-Kurzformen. In `implementation-flow.md`:
Digest-/Abschlussformat ohne 🟢.

## INVEST
- **I**: unabhängig — Kanon + Schema + Kurzformen.
- **V**: weniger folgenloses Rauschen auf jeder Pipeline-Stufe.
- **S**: mittel — breiter, aber mechanischer Ripple über zwei Kanon-Dateien.
- **T**: testbar (Abwesenheit 🟢, Tripwire-Text, Zähler-Struktur).

Bewusst isoliert als eigene Story (statt in ③ integriert): breiter Ripple über `reviewer-gate-canon.md`
+ `secondbrain-schema.md`, unabhängig verifizierbar.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`TierAchse_IstBinaer_RotGelb`
- Arrange: `reviewer-gate-canon.md` nach der Änderung
- Act: nach 🟢-Tier-Definitionen suchen
- Assert: nur 🔴 + 🟡 definiert; keine 🟢-Tier-Stufe mehr
Status: neu

`Tripwire_PraeferenzOhneFolge_ErzeugtKeinFinding`
- Arrange: §3-Tripwire-Text (verschmolzen mit §1)
- Act: Regel für folgenlose Präferenz/Politur prüfen
- Assert: „keine Folge → nicht aufführen"; kein „→ 🟢"
Status: neu

`MindestMengen_CraftUndAuditor_Gestrichen`
- Arrange: Reviewer-Kanon
- Act: nach Mindest-Mengen (craft ≥3, auditor ≥5) suchen
- Assert: keine Mindest-Mengen mehr vorhanden
Status: neu

`SecondbrainTierZaehler_OhneGruen`
- Arrange: `secondbrain-schema.md`
- Act: nach `Tier 🟢 offen` / 🟢-Klassifikation suchen
- Assert: 🟢-Zähler und 🟢-Digest-Klassifikation entfernt
Status: neu

`PositivBloecke_§8.3_BleibenErhalten`   (Negativ/Guard)
- Arrange: §8.3-Positiv-Blöcke (PRESERVE-Liste, Ship-/AC-Map)
- Act: prüfen, ob sie mit den 🟢-Findings mitentfernt wurden
- Assert: §8.3 unverändert vorhanden — mandatierte Deliverables, kein Kollateralschaden
Status: unberuehrt
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: §8.3-Positiv-Blöcke sind klar von 🟢-Findings unterscheidbar (Deliverables vs. Findings).
- Abhängigkeit: kleiner Rand-Edit an `subagent-prompts.md` (Rückgabe-Kurzformen) → gegen STORY-001 beachten.
