---
id: STORY-001
parent: FEAT-001
type: story
status: planned
slug: profil-ssot-duenne-payloads
touches: [subagent-prompts.md, plan-agent.md, implement-round-executor.md, implement-supervisor.md, implement-scribe-agent.md, implement-review-*.md]
plan: requests/plans/plan-profil-ssot-duenne-payloads.md
---

# STORY-001 · ② Profil = Single Source of Truth, dünne Payloads

**Als** Harness-Pflegender
**möchte ich**, dass jeder Sub-Agent-Payload nur Pointer + variable Rundendaten trägt und der Ablauf
ausschließlich im Agent-Profil lebt,
**damit** der Eingangs-Pfad keine Profil-Dopplung mehr transportiert (größter Einzel-Gewinn:
`plan-agent`-Payload).

## Beschreibung

Heute ist jeder Payload in `subagent-prompts.md` eine zweite Kopie seines Profils. Der Ablauf wird
per Boilerplate-Punkt 1 ohnehin garantiert aus dem Profil gelesen — die Payload-Kopie ist reine
Redundanz. Der `plan-agent`-Payload trippelt sogar `planning-flow.md` + Profil + Payload.

Gilt für: PL (`implement-round-executor`), PM (`implement-supervisor`), Scribe, alle Impl-Reviewer,
Fix-Planer, `plan-agent`. Payload trägt nach der Diät nur noch: **Pointer** (auf Profil/Kanon) +
**variable Rundendaten** (Runde M, Slice-IDs, Pfade).

## INVEST
- **I**: unabhängig verifizierbar an den Payload-Blöcken in `subagent-prompts.md`.
- **N/V**: verhandelbar, klarer Nutzer-Wert (Token-Ersparnis Eingangs-Pfad).
- **E**: schätzbar — begrenzte Menge Payload-Blöcke.
- **S**: klein — mechanische Reduktion.
- **T**: testbar über Struktur-Assertions auf die Payloads.

## Akzeptanzkriterien

<!-- rd:ac:start -->
`Payload_PlanAgent_TraegtNurPointerUndRundendaten`
- Arrange: `plan-agent`-Payload in `subagent-prompts.md`
- Act: Payload-Block lesen
- Assert: kein wörtlich aus `planning-flow.md`/Profil kopierter Ablaufblock; nur Pointer + variable Rundendaten
Status: neu

`Payload_ImplReviewer_OhneProfilDopplung`
- Arrange: Payload eines Impl-Reviewers (z. B. risk/verifier)
- Act: Payload-Block lesen
- Assert: Ablaufschritte stehen nur im Profil, Payload referenziert sie per Pointer
Status: neu

`Boilerplate_Punkt1_ProfilRead_Unveraendert`   (Guard)
- Arrange: Boilerplate-Regelwerk der Sub-Agent-Übergabe
- Act: Boilerplate-Punkt 1 („Profil vollständig lesen") prüfen
- Assert: unverändert vorhanden — der Ablauf bleibt garantiert gelesen
Status: unberuehrt

`Payload_MitProfilKopie_IstRegression`   (Negativ)
- Arrange: ein beliebiger überarbeiteter Payload
- Act: nach wörtlicher Profil-/Flow-Kopie suchen
- Assert: keine Payload dupliziert ihren Profil-Ablauf; ein Treffer gilt als Regression
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: „Pointer" = Verweis auf Profil-/Kanon-Datei ohne Inline-Kopie; „variable Rundendaten" =
  runden-/slice-spezifische Werte, die nicht im Profil stehen können.
