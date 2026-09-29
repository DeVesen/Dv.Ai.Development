# Umsetzung — Plan: docs/forge/2026-09-28-spec-review-neuausrichtung/plan.md

## Abschlussbericht
# Abschluss — Umsetzung spec-review-neuausrichtung

**Plan:** docs/forge/2026-09-28-spec-review-neuausrichtung/plan.md
**Spec:** docs/forge/2026-09-28-spec-review-neuausrichtung/spec.md
**Bereich:** `forge-base/2026-09-28-spec-review-neuausrichtung..HEAD` (8e9a2f4..d551372), Branch `claude/spec-review-loop-neuausrichtung-510gpn`, vor Ort
**Tasks:** 10 von 10 fertig, Final-Review sauber (Übergabe ja, 0 🔴)
**Gesamtlauf:** d551372 grün — 949 Tests, 943 pass, 0 fail, 6 plattformbedingte Skips (POSIX-only)

## Eigene Commits (15)
Im Bereich liegen 87 Commits; 72 stammen aus parallelen Umsetzungen anderer Pläne im selben Checkout (plan-review-neuausrichtung, review-ablauf-regelwerk/plan-neu, lean-retrospective) und einem Versionssprung (51e656d, 0.17.0). Eigene Commits:

| Task | Commits |
|---|---|
| 1 Rahmen der fünf Spec-Reviewer | 149f445 |
| 2 completeness | ad5aa0a, a46f0a7 (Fix) |
| 3 consistency | 1d61a36, 89e14dc (Fix) |
| 4 feasibility | 04744b1 |
| 5 clarity | 730ac63, c787e20 (Fix) |
| 6 profiles | 8a572c5 |
| 7 Scout mit Beleg | 501d57d, 44c15dc (Fix) |
| 8 Nacharbeit mit Beleg | 60df09a, ec2866d (Fix) |
| 9 Bericht mit Beleg | bc03462 |
| 10 Absicherung | d551372 |

## Verlauf
- Nach Task 4 Stopp: parallele Umsetzung plan-neu schrieb aktiv dieselben Dateien und baute den Review-Ablauf um (flow-questions.js, review-rules.js → rules.js, flow-report.js, review-flow.js, Tests). Tasks 5–6 danach unverändert umsetzbar.
- Vor Task 7 Stopp (Plan-Schnittstellen der Tasks 7–10 entfernt). Entscheidung des Menschen: Tasks 7–10 per Controller-Urteil auf die neue Architektur übertragen. Grundlage: Drift-Zuordnung (drift-7-10.md) und je Task eine Klarstellung.
- Fix-Runden: Tasks 2, 3, 5, 7, 8 je eine Runde, danach sauber. Kein Task am Cap, nichts geparkt.

## Urteile
- Urteil: Fremde uncommittete Änderungen (docs/forge/2026-09-28-plan-review-neuausrichtung/spec.md, docs/forge/2026-09-29-lean-retrospective/*, docs/superpowers/*) bleiben unberührt; Umsetzer stagen nur eigene Dateien — gehören nicht zu diesem Plan — falls falsch: fremde Änderungen landen in Task-Commits, Nacharbeit per Revert.
- Urteil: Tasks 3–6 nicht gebündelt — je eigener Prüfauftragstext und eigene Tests, kein gleichartiger Einzeiler — falls falsch: drei Umsetzer-/Review-Läufe mehr als nötig.
- Urteil: Task-1-⚠️ (Prüfaufträge ohne Kategorie-Zuordnung, clarity Nr. 1 „Rand- und Fehlerfälle“) ist keine Lücke — Tasks 2–6 schreiben die Prüfaufträge laut Plan neu — falls falsch: Final-Review meldet es, Fix-Welle.
- Urteil: Fremde Commits 8eb546f und 9f6282b (nur docs/forge/2026-09-28-plan-review-neuausrichtung/plan.md und docs/forge/2026-09-28-review-ablauf-regelwerk/plan-neu.md, 09:15/09:20) stammen aus paralleler Arbeit im selben Checkout, nicht vom Umsetzer; sie bleiben im Branch, Task-3-Review-Paket startet bei 9f6282b, Final-Review bekommt den Hinweis — kein Plan-Bezug, kein Code — falls falsch: fremde Plan-Dateien gehören doch zu diesem Lauf und fehlen im Review.
- Urteil: Task-3-⚠️ (AC-06–08 nur als Prompt-Text per includes gesichert, kein Laufzeit-Lauf) ist keine Lücke — Plan-Architektur sichert Agent-Verhalten ausdrücklich über Prompt-Text-Tests ab — falls falsch: Implementierungs-Review fordert Beispiel-Läufe nach.
- Urteil: Stopp vor Task 5 — parallele Umsetzung 2026-09-28-plan-review-neuausrichtung im selben Checkout/Branch (Commits 8eb546f, 9f6282b, 2ebd0c6, 64ac4e3; uncommittet prepare.js, workspace.js, prepare.test.js, workspace.test.js); Tasks 5–8 schreiben agents.test.js, Task 10 prepare.test.js — Gefahr, fremde uncommittete Arbeit zu überschreiben oder mitzucommitten (Stopp-Grund 1) — Frage an Menschen.
- Urteil: Weiter gestoppt (13:03) — plan-neu (review-ablauf-regelwerk) schreibt aktiv spec-rework.md und agents.test.js (uncommittet, vor 30 s geändert) und hat seit 04744b1 alle Plan-Dateien der Tasks 5–10 umgebaut (spec-review-*.md, spec-rework.md, spec-review-scout.md, SKILL.md, flow-report.js, review-flow.js, review-rules.js, flow.md; flow-report.test.js → flow-report-legacy.test.js) — Tasks 7–10 passen voraussichtlich nicht mehr zum Code (Stopp-Grund 1 und 4) — Fortsetzung erst nach Ende von plan-neu mit Drift-Prüfung je Task.
- Urteil: Tasks 5–6 trotz Drift umsetzbar — plan-neu änderte in clarity/profiles nur Ausgabeformat (`location`, Pflichtfelder), alle Anker, Alttexte, `## Ziel`/`## Kategorie` und SPEC_CATEGORIES in rules.js passen — falls falsch: Task-Review findet Abweichung, Fix-Runde.
- Urteil: Tasks 7–10 nicht umsetzbar wie geplant — plan-neu hat flow-questions.js, review-rules.js (→ rules.js), flow-report.test.js, review-flow-round1/round2/followup.test.js entfernt oder ersetzt und review-flow.js/flow-report.js/spec-rework.md/SKILL.md umgebaut — Stopp-Grund 4 vor Task 7, Plan-Update nötig — falls falsch: Stunden verloren, die ein direkter Versuch gespart hätte.
- Urteil: Parallele Umsetzung 2026-09-29-lean-retrospective (gestartet ~13:52) toleriert — ihre Dateien (session-facts, retro-*, mcp-usage, forge-config, transcript, session-files, regexp, init/prozess-retrospektive-Skills) sind disjunkt zu Tasks 5–6 (clarity, profiles, agents.test.js); Umsetzer committen nur per Pfad und werten fremde rote Tests nicht als eigene — falls falsch: Commit-Vermischung oder index.lock-Konflikt, Nacharbeit per Revert.
- Urteil: Task-5-⚠️ AC-13 (kein Reviewer meldet Fehlerfall) hängt an Tasks 2–4/6 — Tasks 2–4 fertig, Task 6 folgt, Final-Review prüft übergreifend — falls falsch: Lücke im Final-Review.
- Urteil: Stopp vor Task 7 (Stopp-Grund 4) — Schnittstellen der Tasks 8–10 existieren nicht mehr (resultProblem(result, kind) → rules.resultProblem(result, review, name) + rework-check.entryProblem; report({…evidence}), finish/reworkFiles/evidenceOf fehlen, flow-report.js neu (collect/renderReport); rules.ADVISORY entfällt, rateFinding(finding, place, context)); Task 7 nur Test-Anker weg, aber Produces für Task 8 — Neuplanung 7–10 statt Raten — falls falsch: Wartezeit, die eine direkte Anpassung gespart hätte.
- Entscheidung Mensch (Stopp vor Task 7): Tasks 7–10 per dv-forge plan-writing gegen neuen Code neu planen, danach Fortsetzung dieser Umsetzung ab Task 7; Tasks 1–6 und Ledger bleiben.
- Entscheidung Mensch (14:28): trotz Drift umsetzen, Tasks 7–10 per Urteil auf neue Architektur übertragen (ersetzt „neu planen“).
- Urteil: Vor Task 7 eine Drift-Zuordnung (opus, nur lesend, schreibt drift-7-10.md) statt Anpassung je Umsetzer — Produces/Consumes 7→8→9 müssen über alle Tasks gleich übertragen werden — falls falsch: ein Agent-Lauf zu viel.
- Urteil: Tasks 7–10 werden nach drift-7-10.md (Abschnitte `## Task <n>` Punkt 3) auf HEAD übertragen; Klarstellung je Task in task-<n>-klarstellung.md hat Vorrang vor Brief-Ankern/Dateien — Spec bindend, Plan-Wortlaut bleibt wo er passt — falls falsch: Nacharbeit im Final-Review.
- Urteil: Designwahl 1 — parseScout bekommt Feld `preferredCount`; scout-check weist `preferredCount !== 1` ab; rework-input schreibt `**Bevorzugt: <n>**` nur bei genau einer gültigen Zeile, sonst keine Bevorzugt-Zeile — Spec „W · Kein eindeutiger bevorzugter Vorschlag“ ist sonst durch die Normalisierung (letzte Zeile gewinnt) verletzt, auch im Ausfallpfad — falls falsch: kleine Regression im geteilten Parser, abgedeckt durch followup/prepare/round-one-Tests.
- Urteil: Designwahl 2 — ausgefallener Scout speist weiter die Nacharbeit (plan-neu-Bereich), offener Punkt statt Task-8-Änderung — mehrdeutiges Bevorzugt ist durch Designwahl 1 schon abgefangen — falls falsch: seltener Pfad (3 ungültige Scout-Läufe) mit ungeprüften Vorschlägen.
- Urteil: Designwahl 3 — `evidenceForm`/`evidenceProblem` in rework-check.js, exportiert, Unit-Tests + 2 CLI-Tests — Bestandsmuster (questions.js exportiert Prüfer) — falls falsch: ein Export mehr.
- Urteil: Designwahl 4 — Meldungen in Bestandsform `evidence … (<location>)` statt Plan-Form `<location>: evidence …` — eine Form je Kanal; Spec legt Meldungstext nicht fest — falls falsch: Textänderung in 4 Meldungen.
- Urteil: Designwahl 5 — Berichtsdaten `{ place, evidence }` statt `{ key, evidence }` — `key` ist bei HEAD der normalisierte placeKey — falls falsch: Umbenennung.
- Urteil: Designwahl 6 — keine Skript-Prüfung der Scout-Beleg-Zeilen — bräuchte flow.md-Änderung (Global Constraint); fehlende Zeile = kein Beleg, sicher — falls falsch: Scout ohne Beleg-Zeilen bleibt unbemerkt.
- Urteil: Designwahl 7 — neuer Test für AC-29 (`aktiv` ohne profiles bei frei mit Glossar) — bestehender Test prüft `aktiv` nicht — falls falsch: ein Test mehr.
- Urteil: Task 10 bekommt zusätzlich einen Ersatztest für den von plan-neu (6ae4de8) entfernten Task-2-Test `classify_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle` (Titelüberschrift bei `Keine AC-ID in der Spec`), auf places/groups bei HEAD — Plan-Ergebnis von Task 2 wäre sonst ungesichert — falls falsch: ein Test mehr.
- Urteil: Modell Task 8 opus statt sonnet — höchstes Regressionsrisiko (Regeln 2/3/9 und Ausgabe-Vertrag von plan-neu, neuer Prüfcode, umgezogene Tests) — falls falsch: höhere Kosten.
- Urteil: Modell Task 10 sonnet statt haiku — Tests auf neue Signaturen und Prosa-Aufbau (prepare.test.js) statt Abschreiben; haiku normalisierte in Tasks 2/3 Anführungszeichen — falls falsch: höhere Kosten.
- Urteil: Task-7-Review mit opus statt sonnet — Diff ändert geteilten Vertrag (parseScout/scout-check für beide Reviews), 9 Dateien — falls falsch: höhere Kosten.
- Urteil: Task-7-❌ „preferredCount zählt nur PREFERRED-Treffer“ geht in die Fix-Schleife — Abweichung von der Klarstellung („jede `**Bevorzugt:`-Zeile“), und Task 8 baut darauf neues Verhalten ohne Rückfrage — falls falsch: eine Fix-Runde zu viel.
- Urteil: Task-7-❌ „Zusatztest parseScout_TwoPreferredLines_CountsBoth in followup.test.js“ bleibt — followup.test.js prüft parseScout indirekt, der Test sichert das neue Feld direkt; Klarstellung wollte nur keinen erzwungenen Test — falls falsch: ein Test zu viel.
- Urteil: Task-7-⚠️ (spec-rework liest Beleg-Zeilen in beiden Modi als Beleg, übernimmt sie nicht in die Spec) ist Task-8-Umfang — geht in Task-8-Klarstellung — falls falsch: Lücke im Final-Review.
- Urteil: Task 8 ergänzt in spec-rework.md eine Regel, dass eingerückte `Beleg:`-Zeilen unter einem Vorschlag nie in die Spec übernommen werden, auch im Folge-Modus — parseScout hängt sie seit Task 7 an den Vorschlagstext, der Folge-Modus setzt gewählte Vorschläge wörtlich um — falls falsch: ein Satz und eine Assertion zu viel.
- Urteil: Task-8-Review mit opus — Vertrag spec-rework/rework-check, neuer Prüfcode — falls falsch: höhere Kosten.
- Urteil: Task-8-🔴 (plan-vorgeschrieben) evidenceForm lehnt `Spec · <Stelle>` ab, wenn die Stelle ` · ` enthält (`Spec · W · <Kurztitel>`, `Spec · R1 · AC-02`) — Fix gegen den Plan-Code: Spec erlaubt Beleg „aus der Spec“, W-Einträge sind der naheliegende Spec-Beleg, Scout darf `Spec · <Stelle>` schreiben; E · Skript prüft die Beleg-Form bleibt gewahrt (Form `Spec · <Stelle>`), W · Beleg-Form unberührt — falls falsch: Spec-Belege mit ` · ` werden zu großzügig akzeptiert.
- Urteil: Task-8-⚠️ AC-21/22/23/31 nur als Agent-Text gesichert — Plan-Architektur wie bei Tasks 1–6 — keine Lücke.
- Urteil: Task 10 nimmt drift-Punkt 3d (review-flow-doc.test.js prüft „zuletzt `Nächster Schritt: <Text des Skills für den Status>`“ in flow.md) auf — AC-25–28 verlangen den nächsten Schritt im Bericht; die Verbindung Status → Skill-Text läuft über flow.md und ist sonst ungetestet — falls falsch: ein Test mehr.

## Offene Punkte
Aus dem Final-Review (kein Blocker, empfohlene Folge-Fixes in dieser Reihenfolge):
1. 🟡 `plugins/forge/agents/spec-rework.md:28` gegen `:31`/`:32` — Regel 3 schreibt den Datei-Beleg in den R-Eintrag, Regel 4 verbietet Dateinamen in der Spec ohne Ausnahme; Vorschlag: Regel 4 „; ausgenommen der Beleg in deinem R-Eintrag nach Regel 3“, `:31` auf „nie als Vorschlagstext in die Spec“ schärfen, Assertion ergänzen.
2. 🟡 `plugins/forge/skills/spec-review/SKILL.md:26` — „Bei `art=frei` prüfen alle Reviewer nur die innere Stimmigkeit“ widerspricht „W · Quellenabgleich bei `frei`“ (AC-03); Vorschlag: „… prüfen alle Reviewer die innere Stimmigkeit, `completeness` dazu die Quelle; …“.
3. 🟡 `plugins/forge/scripts/lib/rework-check.js:28-37` — `<Datei>` ohne Leerraum lehnt Projektpfade mit Leerzeichen ab; `keinen`, `n/a`, `-`, `AC-02` gehen als `<Datei>` durch.
4. 🟢 `spec-review-clarity.md:50` Ausgabe-Beispiel mit `widerspruch` statt `detail`; 🟢 `spec-review-verifier.md` führt alte Kategorie-Definitionen; 🟢 Versions-Bump vor Verteilung nötig (plugin.json steht auf 0.17.0 aus 51e656d, liegt vor Task 8).

Zurückgestellt mit Folge-Fix-Empfehlung des Final-Reviews:
- Designwahl 2: `rework-input.js:43` liest `scout.md` auch nach Scout-Ausfall (verletzt flow.md:28 von plan-neu); Folge-Fix im plan-neu-Bereich über `failedInstances(workspace)`.
- `prepare.js:286-290` `chooseProposal` ohne `preferredCount` (review-followup, Auswahl b, nach Scout-Ausfall).
- consistency Punkt 3 enger als spec.md:21 (Verweis ohne Funktionsbezug ohne Kategorie); Vorschlag „Jeder andere Verweis ist `detail`.“
- profiles Punkt 4 ohne Kategorie — Entscheidung des Menschen: `detail` oder `widerspruch`.
- Testlücken: `evidenceProblem` (`kein`/`keine`, Nicht-String, `unchanged`), `skill_Body_NextStepCommandsPerStatus` ohne Zeilenbindung, W-Formatmuster der fünf Reviewer, `cell(…)` im Berichtsabschnitt.
- `prepare.js:365` nennt entfernten Schritt `followup-checklist` (plan-neu-Bereich).

Alle weiteren zurückgestellten Punkte (Politur) stehen im Ledger-Auszug.

## Urteile
- Urteil: Fremde uncommittete Änderungen (docs/forge/2026-09-28-plan-review-neuausrichtung/spec.md, docs/forge/2026-09-29-lean-retrospective/*, docs/superpowers/*) bleiben unberührt; Umsetzer stagen nur eigene Dateien — gehören nicht zu diesem Plan — falls falsch: fremde Änderungen landen in Task-Commits, Nacharbeit per Revert.
- Urteil: Tasks 3–6 nicht gebündelt — je eigener Prüfauftragstext und eigene Tests, kein gleichartiger Einzeiler — falls falsch: drei Umsetzer-/Review-Läufe mehr als nötig.
- Urteil: Task-1-⚠️ (Prüfaufträge ohne Kategorie-Zuordnung, clarity Nr. 1 „Rand- und Fehlerfälle“) ist keine Lücke — Tasks 2–6 schreiben die Prüfaufträge laut Plan neu — falls falsch: Final-Review meldet es, Fix-Welle.
- Urteil: Fremde Commits 8eb546f und 9f6282b (nur docs/forge/2026-09-28-plan-review-neuausrichtung/plan.md und docs/forge/2026-09-28-review-ablauf-regelwerk/plan-neu.md, 09:15/09:20) stammen aus paralleler Arbeit im selben Checkout, nicht vom Umsetzer; sie bleiben im Branch, Task-3-Review-Paket startet bei 9f6282b, Final-Review bekommt den Hinweis — kein Plan-Bezug, kein Code — falls falsch: fremde Plan-Dateien gehören doch zu diesem Lauf und fehlen im Review.
- Urteil: Task-3-⚠️ (AC-06–08 nur als Prompt-Text per includes gesichert, kein Laufzeit-Lauf) ist keine Lücke — Plan-Architektur sichert Agent-Verhalten ausdrücklich über Prompt-Text-Tests ab — falls falsch: Implementierungs-Review fordert Beispiel-Läufe nach.
- Urteil: Stopp vor Task 5 — parallele Umsetzung 2026-09-28-plan-review-neuausrichtung im selben Checkout/Branch (Commits 8eb546f, 9f6282b, 2ebd0c6, 64ac4e3; uncommittet prepare.js, workspace.js, prepare.test.js, workspace.test.js); Tasks 5–8 schreiben agents.test.js, Task 10 prepare.test.js — Gefahr, fremde uncommittete Arbeit zu überschreiben oder mitzucommitten (Stopp-Grund 1) — Frage an Menschen.
- Urteil: Weiter gestoppt (13:03) — plan-neu (review-ablauf-regelwerk) schreibt aktiv spec-rework.md und agents.test.js (uncommittet, vor 30 s geändert) und hat seit 04744b1 alle Plan-Dateien der Tasks 5–10 umgebaut (spec-review-*.md, spec-rework.md, spec-review-scout.md, SKILL.md, flow-report.js, review-flow.js, review-rules.js, flow.md; flow-report.test.js → flow-report-legacy.test.js) — Tasks 7–10 passen voraussichtlich nicht mehr zum Code (Stopp-Grund 1 und 4) — Fortsetzung erst nach Ende von plan-neu mit Drift-Prüfung je Task.
- Urteil: Tasks 5–6 trotz Drift umsetzbar — plan-neu änderte in clarity/profiles nur Ausgabeformat (`location`, Pflichtfelder), alle Anker, Alttexte, `## Ziel`/`## Kategorie` und SPEC_CATEGORIES in rules.js passen — falls falsch: Task-Review findet Abweichung, Fix-Runde.
- Urteil: Tasks 7–10 nicht umsetzbar wie geplant — plan-neu hat flow-questions.js, review-rules.js (→ rules.js), flow-report.test.js, review-flow-round1/round2/followup.test.js entfernt oder ersetzt und review-flow.js/flow-report.js/spec-rework.md/SKILL.md umgebaut — Stopp-Grund 4 vor Task 7, Plan-Update nötig — falls falsch: Stunden verloren, die ein direkter Versuch gespart hätte.
- Urteil: Parallele Umsetzung 2026-09-29-lean-retrospective (gestartet ~13:52) toleriert — ihre Dateien (session-facts, retro-*, mcp-usage, forge-config, transcript, session-files, regexp, init/prozess-retrospektive-Skills) sind disjunkt zu Tasks 5–6 (clarity, profiles, agents.test.js); Umsetzer committen nur per Pfad und werten fremde rote Tests nicht als eigene — falls falsch: Commit-Vermischung oder index.lock-Konflikt, Nacharbeit per Revert.
- Urteil: Task-5-⚠️ AC-13 (kein Reviewer meldet Fehlerfall) hängt an Tasks 2–4/6 — Tasks 2–4 fertig, Task 6 folgt, Final-Review prüft übergreifend — falls falsch: Lücke im Final-Review.
- Urteil: Stopp vor Task 7 (Stopp-Grund 4) — Schnittstellen der Tasks 8–10 existieren nicht mehr (resultProblem(result, kind) → rules.resultProblem(result, review, name) + rework-check.entryProblem; report({…evidence}), finish/reworkFiles/evidenceOf fehlen, flow-report.js neu (collect/renderReport); rules.ADVISORY entfällt, rateFinding(finding, place, context)); Task 7 nur Test-Anker weg, aber Produces für Task 8 — Neuplanung 7–10 statt Raten — falls falsch: Wartezeit, die eine direkte Anpassung gespart hätte.
- Urteil: Vor Task 7 eine Drift-Zuordnung (opus, nur lesend, schreibt drift-7-10.md) statt Anpassung je Umsetzer — Produces/Consumes 7→8→9 müssen über alle Tasks gleich übertragen werden — falls falsch: ein Agent-Lauf zu viel.
- Urteil: Tasks 7–10 werden nach drift-7-10.md (Abschnitte `## Task <n>` Punkt 3) auf HEAD übertragen; Klarstellung je Task in task-<n>-klarstellung.md hat Vorrang vor Brief-Ankern/Dateien — Spec bindend, Plan-Wortlaut bleibt wo er passt — falls falsch: Nacharbeit im Final-Review.
- Urteil: Designwahl 1 — parseScout bekommt Feld `preferredCount`; scout-check weist `preferredCount !== 1` ab; rework-input schreibt `**Bevorzugt: <n>**` nur bei genau einer gültigen Zeile, sonst keine Bevorzugt-Zeile — Spec „W · Kein eindeutiger bevorzugter Vorschlag“ ist sonst durch die Normalisierung (letzte Zeile gewinnt) verletzt, auch im Ausfallpfad — falls falsch: kleine Regression im geteilten Parser, abgedeckt durch followup/prepare/round-one-Tests.
- Urteil: Designwahl 2 — ausgefallener Scout speist weiter die Nacharbeit (plan-neu-Bereich), offener Punkt statt Task-8-Änderung — mehrdeutiges Bevorzugt ist durch Designwahl 1 schon abgefangen — falls falsch: seltener Pfad (3 ungültige Scout-Läufe) mit ungeprüften Vorschlägen.
- Urteil: Designwahl 3 — `evidenceForm`/`evidenceProblem` in rework-check.js, exportiert, Unit-Tests + 2 CLI-Tests — Bestandsmuster (questions.js exportiert Prüfer) — falls falsch: ein Export mehr.
- Urteil: Designwahl 4 — Meldungen in Bestandsform `evidence … (<location>)` statt Plan-Form `<location>: evidence …` — eine Form je Kanal; Spec legt Meldungstext nicht fest — falls falsch: Textänderung in 4 Meldungen.
- Urteil: Designwahl 5 — Berichtsdaten `{ place, evidence }` statt `{ key, evidence }` — `key` ist bei HEAD der normalisierte placeKey — falls falsch: Umbenennung.
- Urteil: Designwahl 6 — keine Skript-Prüfung der Scout-Beleg-Zeilen — bräuchte flow.md-Änderung (Global Constraint); fehlende Zeile = kein Beleg, sicher — falls falsch: Scout ohne Beleg-Zeilen bleibt unbemerkt.
- Urteil: Designwahl 7 — neuer Test für AC-29 (`aktiv` ohne profiles bei frei mit Glossar) — bestehender Test prüft `aktiv` nicht — falls falsch: ein Test mehr.
- Urteil: Task 10 bekommt zusätzlich einen Ersatztest für den von plan-neu (6ae4de8) entfernten Task-2-Test `classify_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle` (Titelüberschrift bei `Keine AC-ID in der Spec`), auf places/groups bei HEAD — Plan-Ergebnis von Task 2 wäre sonst ungesichert — falls falsch: ein Test mehr.
- Urteil: Modell Task 8 opus statt sonnet — höchstes Regressionsrisiko (Regeln 2/3/9 und Ausgabe-Vertrag von plan-neu, neuer Prüfcode, umgezogene Tests) — falls falsch: höhere Kosten.
- Urteil: Modell Task 10 sonnet statt haiku — Tests auf neue Signaturen und Prosa-Aufbau (prepare.test.js) statt Abschreiben; haiku normalisierte in Tasks 2/3 Anführungszeichen — falls falsch: höhere Kosten.
- Urteil: Task-7-Review mit opus statt sonnet — Diff ändert geteilten Vertrag (parseScout/scout-check für beide Reviews), 9 Dateien — falls falsch: höhere Kosten.
- Urteil: Task-7-❌ „preferredCount zählt nur PREFERRED-Treffer“ geht in die Fix-Schleife — Abweichung von der Klarstellung („jede `**Bevorzugt:`-Zeile“), und Task 8 baut darauf neues Verhalten ohne Rückfrage — falls falsch: eine Fix-Runde zu viel.
- Urteil: Task-7-❌ „Zusatztest parseScout_TwoPreferredLines_CountsBoth in followup.test.js“ bleibt — followup.test.js prüft parseScout indirekt, der Test sichert das neue Feld direkt; Klarstellung wollte nur keinen erzwungenen Test — falls falsch: ein Test zu viel.
- Urteil: Task-7-⚠️ (spec-rework liest Beleg-Zeilen in beiden Modi als Beleg, übernimmt sie nicht in die Spec) ist Task-8-Umfang — geht in Task-8-Klarstellung — falls falsch: Lücke im Final-Review.
- Urteil: Task 8 ergänzt in spec-rework.md eine Regel, dass eingerückte `Beleg:`-Zeilen unter einem Vorschlag nie in die Spec übernommen werden, auch im Folge-Modus — parseScout hängt sie seit Task 7 an den Vorschlagstext, der Folge-Modus setzt gewählte Vorschläge wörtlich um — falls falsch: ein Satz und eine Assertion zu viel.
- Urteil: Task-8-Review mit opus — Vertrag spec-rework/rework-check, neuer Prüfcode — falls falsch: höhere Kosten.
- Urteil: Task-8-🔴 (plan-vorgeschrieben) evidenceForm lehnt `Spec · <Stelle>` ab, wenn die Stelle ` · ` enthält (`Spec · W · <Kurztitel>`, `Spec · R1 · AC-02`) — Fix gegen den Plan-Code: Spec erlaubt Beleg „aus der Spec“, W-Einträge sind der naheliegende Spec-Beleg, Scout darf `Spec · <Stelle>` schreiben; E · Skript prüft die Beleg-Form bleibt gewahrt (Form `Spec · <Stelle>`), W · Beleg-Form unberührt — falls falsch: Spec-Belege mit ` · ` werden zu großzügig akzeptiert.
- Urteil: Task-8-⚠️ AC-21/22/23/31 nur als Agent-Text gesichert — Plan-Architektur wie bei Tasks 1–6 — keine Lücke.
- Urteil: Task 10 nimmt drift-Punkt 3d (review-flow-doc.test.js prüft „zuletzt `Nächster Schritt: <Text des Skills für den Status>`“ in flow.md) auf — AC-25–28 verlangen den nächsten Schritt im Bericht; die Verbindung Status → Skill-Text läuft über flow.md und ist sonst ungetestet — falls falsch: ein Test mehr.

## Zurückgestellt und geparkt
- Task 1: zurückgestellt: 🟢 agents.test.js:293 prüft nur Existenz von `## Ziel`, nicht Reihenfolge vor `## Prüfauftrag`.
- Task 3: Bedenken: Umsetzer meldet `done` bei roter Suite (spec-review-completeness-Test scheitert; Task-3-Diff hat in agents.test.js drei U+201C aus Task 2 zu U+201D gemacht).
- Task 3: zurückgestellt: 🟡 spec-review-consistency.md:22 (plan-vorgeschrieben) — Punkt 3 vergibt `detail` nur für Verweise „bei einer Funktion, die die Spec selbst beschreibt“; Spec-Entscheidung spec.md:21 sagt allgemein „Verweis ist `detail`, außer einzige Beschreibung“; Verweis ohne Funktionsbezug bleibt ohne Kategorie.
- Task 3: zurückgestellt: 🟡 (außerhalb) spec-review-consistency.md:21 — Punkt 2 meldet Links/Ticket-Nummern ausnahmslos, auch `Workitem: <Nummer>` im Kopf (spec-format.md:10/33 nimmt Kopf aus).
- Task 4: zurückgestellt: 🟢 spec-review-feasibility.md:22-23 — Leerzeile vor `## Nicht deine Aufgabe` gelöscht.
- Task 4: zurückgestellt: 🟢 task-4-report.md ungenau (Zeilenzahlen, „ganze Suite“ = nur agents.test.js); 🟢 agents.test.js:361 pinnt ` ↔ `-Trenner in feasibility nicht (brief-konform); 🟢 Commit 04744b1 mit nicht verlangtem Body.
- Task 5: zurückgestellt: 🟡 task-5-report.md:52 nennt agents.test.js-Lauf (67) „ganze Suite“.
- Task 5: zurückgestellt: 🟡 (außerhalb) agents.test.js:41-50 prüft Formatmuster `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` der fünf Spec-Reviewer nicht; Tippfehler wie `<Belag-Tag>` bleiben unbemerkt.
- Task 6: zurückgestellt: 🟡 spec-review-profiles.md:29 (plan-vorgeschrieben) — Regel 4 (widersprüchliche gleichnamige Profil-Dateien) nennt keine Kategorie, obwohl `## Kategorie` sagt, der Prüfauftrag legt sie fest.
- Task 6: zurückgestellt: 🟢 agents.test.js:399-400 Leerzeile vor neuem Test fehlt; 🟢 task-6-report.md belegt Rot-Lauf nicht, Zeilenangaben ungenau.
- Task 7: Bedenken: vier Zusatztests über die Klarstellung hinaus (scoutCheck_NoPreferredLine_Invalid, scoutCheck_PreferredNumberBeyondProposals_Invalid, reworkInput_PreferredNumberBeyondProposals_NoPreferredLine, parseScout_PreferredLineInsideCodeFence_NotCounted).
- Task 7: Bedenken: prepare.js `chooseProposal` (Auswahl `b`) nutzt weiter `group.preferred` ohne `preferredCount`; nach Scout-Ausfall kann ungeprüftes scout.md über writeClosing (flow-report.js:116-123) in abschluss/ landen (Nähe Designwahl 2).
- Task 7: zurückgestellt: 🟡 (außerhalb) prepare.js:287-289 `chooseProposal` (Auswahl b) nutzt `group.preferred` ohne `preferredCount`; abgewiesenes scout.md erreicht über writeClosing den review-followup (Nähe Designwahl 2).
- Task 7: zurückgestellt: 🟢 rework-input.js:8/:25 nutzt Meldungsfunktion preferredProblem als Prädikat (besser preferredOf); 🟢 review-flow-round-one.test.js wiederholt vierzeiliges Arrange in 7 Tests.
- Task 8: Bedenken: evidenceForm exportiert, aber ohne eigenen Test (nur über evidenceProblem).
- Task 8: Bedenken: Regel 4 verbietet Dateinamen in der Spec, Regel 3 schreibt Beleg wie `src/export.js` in den R-Eintrag (AC-21 will das) — mögliche Spannung für Agent/Reviewer.
- Task 8: Bedenken: Designwahl 2 (ausgefallener Scout speist Nacharbeit) offen.
- Task 8: Bedenken: reworkCheck_ChangedWithEvidence_Ok war vor der Umsetzung schon grün (positiver Pfad, erwartet).
- Task 8: zurückgestellt: 🟡 spec-rework.md:28 gegen :32 — Regel 3 schreibt Datei-Beleg in den R-Eintrag, Regel 4 verbietet Dateinamen in der Spec ohne Ausnahme (auch Bedenken 2); Vorschlag: Regel 4 „; ausgenommen der Beleg im R-Eintrag nach Regel 3“. Final-Review: Kandidat beheben.
- Task 8: zurückgestellt: 🟡 review-flow-rework.test.js:88-116 — `kein`/`keine`, Nicht-String (`42`), `evidence` bei `unchanged`, `evidenceForm` direkt ungetestet (auch Bedenken 1).
- Task 8: zurückgestellt: 🟡 (außerhalb) rework-input.js:43 liest scout.md auch nach Scout-Ausfall (flow.md:28 „ohne seine Vorschläge weiter“); seit Task 8 kann ungültiges Scout-Ergebnis mit Bevorzugt+Beleg neues Verhalten ohne Frage bringen (Designwahl 2, Bedenken 3). Final-Review: Kandidat beheben.
- Task 8: zurückgestellt: 🟢 rework-check.js:30 toter Zweig `rest[0].trim() === ''`; 🟢 Testname FourBelegForms (3 Formen); 🟢 Helfer changedWith mitten in der Datei; 🟢 Commit-Body 60df09a mit ae/oe/ue statt Umlauten.
- Task 8: zurückgestellt: ⚠️ Weg von `Repo:` zum Nacharbeiter im review-followup (references/flow.md:11) im Final-Review prüfen.
- Task 9: Bedenken: Test …InvalidEntries mit fünf statt drei Einträgen (null, unchanged mit evidence, Leerraum), damit Filter/trim/`entry?.` greifen; Mutanten M1–M9 rot.
- Task 9: Bedenken: `cell(…)` im Berichtsabschnitt ungetestet; `isFilled` dupliziert privates `isFilledText` aus questions.js; nach Ausfall der Nacharbeit listet der Bericht Belege aus abgewiesener rework.json ungeprüft.
- Task 9: zurückgestellt: 🟡 review-flow-report.test.js:194-204 `…WithoutEvidence_NoEvidenceSection` ohne positiven Anker (Absturz bliebe grün); Vorschlag `assert.match(output, /^ENDE sauber nach Nachprüfung\n/)`.
- Task 9: zurückgestellt: 🟡 review-flow-report.test.js:127-134 Blank-Strings in `location`/`evidence` ungetestet (Mutant `isFilled` ohne trim bleibt grün).
- Task 9: zurückgestellt: 🟡 flow-report.js:118 `cell(…)` ungetestet (Zeilenumbruch in `Spec · <Stelle>` möglich).
- Task 9: zurückgestellt: 🟡 flow-report.js:44-50 Bericht listet nach Ausfall der Nacharbeit Belege aus abgewiesener rework.json ohne Formprüfung (Klarstellung Punkt 4 so vorgegeben); Alternative Filter `evidenceProblem(entry) === null`.
- Task 9: zurückgestellt: 🟢 isFilled dupliziert isFilledText; 🟢 Folge-Lauf-Arrange doppelt; 🟢 Abschnittsposition ungetestet.
- Task 10: Bedenken: Test e) pinnt den resolvePlace-Rückfall; Titelüberschrift ist bei HEAD keine eigene Stelle — ein Titel wie Basis/Status/Art/Workitem würde als Kopfzeile verworfen (Bestandsregel, ungetestet).
- Task 10: Bedenken: Test c) dupliziert das Arrange des Nachbartests; Brief-Annahme (Bestandstest belegt `aktiv` ohne profiles) stimmte nicht.
- Task 10: zurückgestellt: 🟡 skill.test.js:88-96 `skill_Body_NextStepCommandsPerStatus` prüft Sätze nur im Body, nicht in der Zeile ihres Status (Vertauschen bleibt grün); Vorschlag Zeilenprüfung wie plan-review-skill.test.js:81.
- Task 10: zurückgestellt: 🟡 review-rules.test.js:111-115 Set-Diagnose nennt Reviewer/Kategorie nicht; Vorschlag `notRed`-Liste.
- Task 10: zurückgestellt: 🟡 prepare.test.js:215-221 dupliziert Arrange des Nachbartests (Klarstellung c so vorgegeben).
- Task 10: zurückgestellt: 🟢 (außerhalb) rules.js:60 — Spec mit Titel exakt Basis/Status/Art/Workitem: AC-02-Finding wird als Kopfzeile verworfen.

## Stand
- Stand: d551372
- Gesamtlauf: d551372 grün (949 Tests, 943 pass, 6 skip POSIX-only)
