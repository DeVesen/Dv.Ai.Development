---
id: STORY-005
parent: FEAT-001
type: story
status: implemented
slug: auditor-aufloesen-inner-7-auf-6
touches: [implement-review-auditor-agent.md, implement-review-verifier-agent.md, implementation-flow.md, subagent-prompts.md]
---

# STORY-005 · ③ auditor auflösen (Inner 7 → 6)

**Als** Impl-Reviewer-Set-Verantwortlicher
**möchte ich** den auditor auflösen, seine einzigartige Prüfung (Plan-Coverage-Vollständigkeit) an
verifier vererben und Go/No-Go streichen,
**damit** der Inner-Standard von 7 auf 6 Reviewer sinkt — ohne Verlust der einzigartigen Prüfung.

## Beschreibung

Die *eine* einzigartige Prüfung des auditors — unabhängige **Plan-Coverage-Vollständigkeit** („alle
Testfall-Skizzen aus dem Planpaket umgesetzt?") — erbt **verifier** als expliziter Checklisten-Punkt
(verifier besitzt AC-Coverage ohnehin). **Go/No-Go entfällt** (redundant zu readiness
SHIP/CONDITIONAL/NO-SHIP). Der Inner-Standard sinkt auf 6: risk · design-principles · verifier ·
readiness · craft · guard. Das Profil `implement-review-auditor-agent.md` wird **gelöscht** und sein
Payload aus `subagent-prompts.md` entfernt. Der Change-Scope-Classifier in `implementation-flow.md`
geht von Standard-7 auf 6.

## INVEST
- **I**: unabhängig — auditor-Profil, verifier-Profil, Classifier, Reviewer-Set.
- **V**: ein Reviewer weniger, einzigartige Prüfung erhalten.
- **S/T**: klein, testbar (Set-Zählung + verifier-Checkliste + Datei-Löschung).

## Akzeptanzkriterien

<!-- rd:ac:start -->
`InnerReviewerSet_Ist6`
- Arrange: Change-Scope-Classifier in `implementation-flow.md` + Reviewer-Set in `subagent-prompts.md`
- Act: Standard-Set zählen
- Assert: 6 Reviewer — risk · design-principles · verifier · readiness · craft · guard; auditor nicht mehr gelistet
Status: neu

`Verifier_PruetPlanCoverageVollstaendigkeit`
- Arrange: verifier-Profil `implement-review-verifier-agent.md`
- Act: Checklisten-Punkte prüfen
- Assert: expliziter Punkt „alle Testfall-Skizzen aus dem Planpaket umgesetzt?" (Plan-Coverage) vorhanden
Status: erweitern

`AuditorProfilUndPayload_Entfernt`
- Arrange: Repo-Stand nach der Änderung
- Act: nach `implement-review-auditor-agent.md` + auditor-Payload suchen
- Assert: Profil-Datei gelöscht, Payload aus `subagent-prompts.md` entfernt
Status: neu

`GoNoGo_NochVorhanden_IstFehler`   (Negativ)
- Arrange: Reviewer-Kanon/Digest-Format nach der Änderung
- Act: nach „Go/No-Go" suchen
- Assert: kein Go/No-Go mehr (entfällt, redundant zu readiness SHIP/CONDITIONAL/NO-SHIP)
Status: neu
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Annahme: Plan-Coverage-Vollständigkeit ist mit verifiers bestehender AC-Coverage kompatibel und
  nicht mit ihr identisch (eigener Checklisten-Punkt).
- Abhängigkeit: teilt sich `subagent-prompts.md` (Reviewer-Set) mit STORY-001/002/003 → seriell dagegen.
