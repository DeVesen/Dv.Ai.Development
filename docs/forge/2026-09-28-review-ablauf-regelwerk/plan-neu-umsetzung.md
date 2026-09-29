# Umsetzung — Plan: docs/forge/2026-09-28-review-ablauf-regelwerk/plan-neu.md

## Abschlussbericht
# Abschluss — Umsetzung plan-neu

Plan: docs/forge/2026-09-28-review-ablauf-regelwerk/plan-neu.md
Spec: docs/forge/2026-09-28-review-ablauf-regelwerk/spec.md
Bereich: forge-base/plan-neu..HEAD (4edd963..e972584), 28 Commits, davon 27 aus dieser Umsetzung (7bd12ec stammt aus paralleler Arbeit an docs/forge/2026-09-29-lean-retrospective/plan.md).
Branch: claude/spec-review-loop-neuausrichtung-510gpn (vor Ort, kein Worktree).
Tasks: 18, alle fertig. Task 1 und Task 12 waren im Arbeitsstand schon erfüllt (ohne Commit), Task 11 nur Meldungstext nachgezogen.
Fix-Runden: Task 5 (1 Runde, Anführungszeichen), Task 7 (1 Runde, Skript-Kategorie). Final-Review: 1 × 🔴 + 5 × 🟡 + 1 × 🟢 in einer Fix-Welle behoben (8ef06d9..e972584), Re-Review sauber.
Gesamtlauf: e972584 — 770 Tests, 764 pass, 0 fail, 6 skipped (POSIX-only).

## Ergebnis
Spec- und Plan-Review laufen über die neuen Schritte von `review-flow.js` (Runde 1, eine Nacharbeit, Nachprüfung, Bericht) auf den neuen Modulen places/rules/groups/questions/attempts/flow-files/rated-items/round-one/rework-input/scout-check/rework-check/round-two/flow-report; Skript-Prüfungen der Plan-Review-Neuausrichtung laufen über `script-checks --runde runde-1|runde-2`. Die ältere Umsetzung (flow-legacy, document-units, review-rules, review-groups, flow-questions, flow-report-legacy, flow-workspace) ist nach Test-Port entfernt.

## Urteile (mit Kosten, falls falsch)
- Urteil: Umsetzung auf Branch claude/spec-review-loop-neuausrichtung-510gpn, HEAD 4edd963 statt Checkout 3ce509e — Mensch hat es auf Rückfrage ausdrücklich so entschieden (gegen W · Plan-Basis); Base-Tag forge-base/plan-neu = 4edd963 — falls falsch: Umsetzung muss auf 3ce509e neu laufen.
- Urteil: Leitlinie für den Bestand — plan-neu ist das Soll; Code im Arbeitsstand, der das Soll schon erfüllt, bleibt und wird nur um fehlende Tests ergänzt; Abweichungen werden an plan-neu angeglichen; „Create“ auf eine vorhandene Datei heißt: Datei auf den Plan-Stand bringen, nicht blind überschreiben; Erweiterungen aus der Plan-Review-Neuausrichtung (2dce143..4edd963, u. a. plan-checks.js, Skript-Prüfungen, --only) bleiben funktionsfähig, ihre Tests grün; ersetzte Module (z. B. document-units.js, review-rules.js, review-groups.js, flow-questions.js) werden entfernt, sobald nichts sie mehr nutzt — falls falsch: Nacharbeit an Modulgrenzen, eventuell Rückbau.
- Urteil: Task 1 ohne Task-Review — Arbeitsstand erfüllt Task 1 schon (fba4a4d), Umsetzer hat nichts committet, review-package meldet „Bereich leer“; Plan-Testname severityRules_TwoYellowAtOnePlace_StayYellowWithoutEscalation fehlt, gleichwertiger severityRules_TwoYellow_NoLongerEscalate existiert — falls falsch: Final-Review findet Lücke, kleiner Test-Nachtrag.
- Urteil: Task 2 mit opus statt sonnet — places.js ersetzt im Arbeitsstand lib/document-units.js (Nutzer umstellen, Neuausrichtung erhalten), das braucht breites Code-Verständnis — falls falsch: Mehrkosten eines Laufs.
- Urteil: Task-2-⚠️ keine Lücken — Fixture-Unterbefehle rate/rework-input entstehen in Task 7, ACs 23/25 durch 11 Plan-Tests gedeckt, Abbau Altmodule in Tasks 3–10 vorgesehen — falls falsch: Final-Review meldet es.
- Urteil: Task 3 mit sonnet statt haiku — Plan legt tests/review-rules.test.js neu an, die Datei existiert schon als Test des alten lib/review-rules.js; Zusammenführen braucht Urteil — falls falsch: Mehrkosten.
- Urteil: Task-3-⚠️ keine Lücke — Skript-Prüfungen laufen laut Plan über scriptItems (Task 7) an rateFinding vorbei; fehlender Rot-Beleg bei neuem Modul zulässig — falls falsch: Task-7-Review/Final-Review meldet es.
- Urteil: Commit 7bd12ec (lean-retrospective plan.md) im Bereich 3016e7b..f512035 stammt nicht aus dieser Umsetzung, sondern aus paralleler Arbeit auf demselben Branch; bleibt unberührt, zählt nicht zu Task 4 — falls falsch: nichts, Datei liegt außerhalb des Plans.
- Urteil: Tasks 2–4 auf Anführungszeichen-Normalisierung geprüft (Code Points Brief vs Datei) — betroffen nur Prosa, Code sauber; Regel 7 zur Klarstellung ergänzt — falls falsch: Final-Review.
- Urteil: Task 7 mit opus statt sonnet — review-flow.js existiert mit allen Schritten und Skript-Prüfungen der Neuausrichtung; Runde 1 umbauen ohne Nacharbeit/Nachprüfung/Bericht und plan-checks zu brechen braucht Design-Urteil — falls falsch: Mehrkosten.
- Urteil: Tasks 7–9 dürfen Nacharbeit/Nachprüfung/Bericht vorerst über die Altmodule laufen lassen, bis Task 8–10 sie neu fassen; alte Tests entfallen nur, wenn Plan-Tests sie abdecken oder plan-neu bewusst anders will (im Bericht begründet) — falls falsch: Verhaltenslücke zwischen Tasks, Final-Review prüft.
- Urteil: Task-7-🔴 scriptItems-Kategorie ist echt — Klarstellung „Kategorie der Skript-Befunde bleibt erhalten“ meinte die Mitführung im Finding, nicht item.category; Brief und E · Befunde der Skript-Prüfungen verlangen skript-prüfung — falls falsch: Plan-Check-Kategorie im Bericht nur über item.finding sichtbar.
- Urteil: Task-9-⚠️ keine Lücke — ANSWER_ENTRY Code Points 201E/201C geprüft; Aufruf script-checks --runde runde-2 muss flow.md (Task 16) nennen, als Kontext dorthin — falls falsch: Nachprüfung ohne Skript-Prüfungen.
- Urteil: Task 10 — altes lib/flow-report.js wird flow-report-legacy.js (+Test), neues nach Plan; gleiche Legacy-Strategie wie Tasks 3/4 — falls falsch: Umbenennung rückgängig, gering.
- Urteil: Task-10-⚠️ keine Lücke — Anführungszeichen im Test per Code Point geprüft (201E/201C), Tests laut Bericht grün — falls falsch: Final-Review.
- Urteil: Task 11 mit haiku statt sonnet — prepare.js hat kein DEFAULT_ROUNDS/rounds/N= mehr (988fb18), Auftrag ist überwiegend Belegen und ggf. fehlende Plan-Tests ergänzen — falls falsch: Nachlauf mit sonnet.
- Urteil: Task-11-⚠️ USAGE/FLAGS ohne --rounds per grep bestätigt — falls falsch: Final-Review.
- Urteil: Task 12 mit haiku statt sonnet — guard-orchestrator.js hat pause, paused-Freigabe und review-flow.js in ALLOWED_SCRIPTS schon (acfb979), Auftrag ist Belegen — falls falsch: Nachlauf mit sonnet.
- Urteil: Task 12 ohne Task-Review — Bestand erfüllt Brief, nichts committet, Paket wäre leer — falls falsch: Final-Review.
- Urteil: Tasks 13–15 — Schärfungen der Spec-/Plan-Review-Neuausrichtung an den Agenten bleiben; Plan-Schritte ergänzen nur Fehlendes, bei Unvereinbarkeit gilt die spätere Schärfung — falls falsch: Agenten weichen vom plan-neu-Wortlaut ab, Final-Review/Implementierungs-Review bewertet.
- Urteil: Task-14-⚠️ COLOR_WORD fehlt, weil Task 13 den bestehenden Farbwort-Test (specAndPlanReviewers_Body_NameCategoriesNeverColours) behielt statt COLOR_WORD neu anzulegen; Emoji-Regex im Verifier-Test gleichwertig für den Zweck — falls falsch: Farbwörter im Verifier-Text blieben ungetestet.
- Urteil: Task 16 mit opus statt haiku — flow.md existiert und muss vom Legacy-Aufruf auf die neuen Schritte umgestellt werden, samt Skript-Prüfungen der Neuausrichtung; kein Abschreiben — falls falsch: Mehrkosten.
- Urteil: Task-17-⚠️ „Nach der Nacharbeit“ (Anker-Refresh) in plan-review ohne Haken in flow.md — nicht sicher als Lücke belegbar, als 🟡 ans Final-Review — falls falsch: Anker-Refresh läuft im neuen Ablauf nicht.
- Urteil: Fix-Welle mit opus — Abbau der Altmodule samt Test-Port und Umstellung plan-checks.js braucht breites Code-Verständnis — falls falsch: Mehrkosten.

## Offene Punkte
- guard-orchestrator.test.js:202 Beispiel-String mit altem Aufruf `review-flow.js round1` (kosmetisch).
- prepare.js:365 Kommentar nennt entfernten Schritt `followup-checklist`.
- Prüfliste ohne eigene Zeile „Herkunft:“, obwohl die Nachprüfer-Agenten danach fragen.
- Mehrere 🟡/🟢 vom Final-Review mit „bleibt“ bewertet (Testlücken in attempts/rework-check, Regex-Punkt, Arrange-Kommentare u. a.), siehe Ledger-Auszug.
- Umsetzung weicht bewusst von W · Plan-Basis ab (Mensch-Entscheidung: HEAD 4edd963 statt 3ce509e); plan-review nennt Skript-Prüfungen statt „Keine.“ (W · Skript-Prüfungen) nach Leitlinie Neuausrichtung.
- Uncommitted Änderungen des Menschen in docs/ (plan-neu.md, lean-retrospective/plan.md, zwei gelöschte docs/superpowers-Dateien) unberührt.

## Urteile
- Urteil: Umsetzung auf Branch claude/spec-review-loop-neuausrichtung-510gpn, HEAD 4edd963 statt Checkout 3ce509e — Mensch hat es auf Rückfrage ausdrücklich so entschieden (gegen W · Plan-Basis); Base-Tag forge-base/plan-neu = 4edd963 — falls falsch: Umsetzung muss auf 3ce509e neu laufen.
- Urteil: Leitlinie für den Bestand — plan-neu ist das Soll; Code im Arbeitsstand, der das Soll schon erfüllt, bleibt und wird nur um fehlende Tests ergänzt; Abweichungen werden an plan-neu angeglichen; „Create“ auf eine vorhandene Datei heißt: Datei auf den Plan-Stand bringen, nicht blind überschreiben; Erweiterungen aus der Plan-Review-Neuausrichtung (2dce143..4edd963, u. a. plan-checks.js, Skript-Prüfungen, --only) bleiben funktionsfähig, ihre Tests grün; ersetzte Module (z. B. document-units.js, review-rules.js, review-groups.js, flow-questions.js) werden entfernt, sobald nichts sie mehr nutzt — falls falsch: Nacharbeit an Modulgrenzen, eventuell Rückbau.
- Urteil: Task 1 ohne Task-Review — Arbeitsstand erfüllt Task 1 schon (fba4a4d), Umsetzer hat nichts committet, review-package meldet „Bereich leer“; Plan-Testname severityRules_TwoYellowAtOnePlace_StayYellowWithoutEscalation fehlt, gleichwertiger severityRules_TwoYellow_NoLongerEscalate existiert — falls falsch: Final-Review findet Lücke, kleiner Test-Nachtrag.
- Urteil: Task 2 mit opus statt sonnet — places.js ersetzt im Arbeitsstand lib/document-units.js (Nutzer umstellen, Neuausrichtung erhalten), das braucht breites Code-Verständnis — falls falsch: Mehrkosten eines Laufs.
- Urteil: Task-2-⚠️ keine Lücken — Fixture-Unterbefehle rate/rework-input entstehen in Task 7, ACs 23/25 durch 11 Plan-Tests gedeckt, Abbau Altmodule in Tasks 3–10 vorgesehen — falls falsch: Final-Review meldet es.
- Urteil: Task 3 mit sonnet statt haiku — Plan legt tests/review-rules.test.js neu an, die Datei existiert schon als Test des alten lib/review-rules.js; Zusammenführen braucht Urteil — falls falsch: Mehrkosten.
- Urteil: Task-3-⚠️ keine Lücke — Skript-Prüfungen laufen laut Plan über scriptItems (Task 7) an rateFinding vorbei; fehlender Rot-Beleg bei neuem Modul zulässig — falls falsch: Task-7-Review/Final-Review meldet es.
- Urteil: Commit 7bd12ec (lean-retrospective plan.md) im Bereich 3016e7b..f512035 stammt nicht aus dieser Umsetzung, sondern aus paralleler Arbeit auf demselben Branch; bleibt unberührt, zählt nicht zu Task 4 — falls falsch: nichts, Datei liegt außerhalb des Plans.
- Urteil: Tasks 2–4 auf Anführungszeichen-Normalisierung geprüft (Code Points Brief vs Datei) — betroffen nur Prosa, Code sauber; Regel 7 zur Klarstellung ergänzt — falls falsch: Final-Review.
- Urteil: Task 7 mit opus statt sonnet — review-flow.js existiert mit allen Schritten und Skript-Prüfungen der Neuausrichtung; Runde 1 umbauen ohne Nacharbeit/Nachprüfung/Bericht und plan-checks zu brechen braucht Design-Urteil — falls falsch: Mehrkosten.
- Urteil: Tasks 7–9 dürfen Nacharbeit/Nachprüfung/Bericht vorerst über die Altmodule laufen lassen, bis Task 8–10 sie neu fassen; alte Tests entfallen nur, wenn Plan-Tests sie abdecken oder plan-neu bewusst anders will (im Bericht begründet) — falls falsch: Verhaltenslücke zwischen Tasks, Final-Review prüft.
- Urteil: Task-7-🔴 scriptItems-Kategorie ist echt — Klarstellung „Kategorie der Skript-Befunde bleibt erhalten“ meinte die Mitführung im Finding, nicht item.category; Brief und E · Befunde der Skript-Prüfungen verlangen skript-prüfung — falls falsch: Plan-Check-Kategorie im Bericht nur über item.finding sichtbar.
- Urteil: Task-9-⚠️ keine Lücke — ANSWER_ENTRY Code Points 201E/201C geprüft; Aufruf script-checks --runde runde-2 muss flow.md (Task 16) nennen, als Kontext dorthin — falls falsch: Nachprüfung ohne Skript-Prüfungen.
- Urteil: Task 10 — altes lib/flow-report.js wird flow-report-legacy.js (+Test), neues nach Plan; gleiche Legacy-Strategie wie Tasks 3/4 — falls falsch: Umbenennung rückgängig, gering.
- Urteil: Task-10-⚠️ keine Lücke — Anführungszeichen im Test per Code Point geprüft (201E/201C), Tests laut Bericht grün — falls falsch: Final-Review.
- Urteil: Task 11 mit haiku statt sonnet — prepare.js hat kein DEFAULT_ROUNDS/rounds/N= mehr (988fb18), Auftrag ist überwiegend Belegen und ggf. fehlende Plan-Tests ergänzen — falls falsch: Nachlauf mit sonnet.
- Urteil: Task-11-⚠️ USAGE/FLAGS ohne --rounds per grep bestätigt — falls falsch: Final-Review.
- Urteil: Task 12 mit haiku statt sonnet — guard-orchestrator.js hat pause, paused-Freigabe und review-flow.js in ALLOWED_SCRIPTS schon (acfb979), Auftrag ist Belegen — falls falsch: Nachlauf mit sonnet.
- Urteil: Task 12 ohne Task-Review — Bestand erfüllt Brief, nichts committet, Paket wäre leer — falls falsch: Final-Review.
- Urteil: Tasks 13–15 — Schärfungen der Spec-/Plan-Review-Neuausrichtung an den Agenten bleiben; Plan-Schritte ergänzen nur Fehlendes, bei Unvereinbarkeit gilt die spätere Schärfung — falls falsch: Agenten weichen vom plan-neu-Wortlaut ab, Final-Review/Implementierungs-Review bewertet.
- Urteil: Task-14-⚠️ COLOR_WORD fehlt, weil Task 13 den bestehenden Farbwort-Test (specAndPlanReviewers_Body_NameCategoriesNeverColours) behielt statt COLOR_WORD neu anzulegen; Emoji-Regex im Verifier-Test gleichwertig für den Zweck — falls falsch: Farbwörter im Verifier-Text blieben ungetestet.
- Urteil: Task 16 mit opus statt haiku — flow.md existiert und muss vom Legacy-Aufruf auf die neuen Schritte umgestellt werden, samt Skript-Prüfungen der Neuausrichtung; kein Abschreiben — falls falsch: Mehrkosten.
- Urteil: Task-17-⚠️ „Nach der Nacharbeit“ (Anker-Refresh) in plan-review ohne Haken in flow.md — nicht sicher als Lücke belegbar, als 🟡 ans Final-Review — falls falsch: Anker-Refresh läuft im neuen Ablauf nicht.
- Urteil: Fix-Welle mit opus — Abbau der Altmodule samt Test-Port und Umstellung plan-checks.js braucht breites Code-Verständnis — falls falsch: Mehrkosten.

## Zurückgestellt und geparkt
- Task 2: Bedenken: document-units.js und tests/lib/flow-workspace.js bleiben, weil review-flow.js, review-groups.js, plan-checks.js und vier review-flow-Tests sie nutzen; Abbau in Tasks 3–10
- Task 2: zurückgestellt: 🟢 places.js:114 Kommentar über sectionKeys beschreibt parsePlaces (plan-vorgeschrieben)
- Task 2: zurückgestellt: 🟢 places.js:40 isHeaderKey ohne Aufrufer/Test in diesem Task (spätere Tasks nutzen es)
- Task 2: zurückgestellt: 🟡 document-units.js und tests/lib/flow-workspace.js parallel zu places.js/review-flow-fixture.js bis Umstellung
- Task 3: Bedenken: Rot-Schritt nicht separat gefahren; alter Test per git mv nach tests/review-rules-legacy.test.js, lib/review-rules.js bleibt (Nutzer review-flow.js, review-groups.js)
- Task 3: zurückgestellt: 🟡 rules.js rateFinding ohne Pfad für Skript-Prüfungs-Befunde (plan-konform; Task 7 scriptItems führt sie getrennt) — bei Umstellung beachten
- Task 3: zurückgestellt: 🟢 rules.js:38 Fehlertext „Finding ist kein Objekt“ ohne Stelle (plan-konform)
- Task 4: Bedenken: lib/review-groups.js bleibt (Nutzer flow-report.js, review-flow.js); Ausgabe aggregate-findings.js nur über Aggregat-Tests belegt, kein direkter Vorher/Nachher-Vergleich
- Task 4: zurückgestellt: 🟢 review-groups.test.js:71-101 fünf Tests ohne // Arrange (plan-vorgeschrieben)
- Task 4: zurückgestellt: 🟡 lib/review-groups.js parallel zu groups.js bis Umstellung flow-report.js/review-flow.js
- Task 5: zurückgestellt: 🟢 review-questions.test.js ohne // Arrange bei Tests ohne Setup (plan-vorgeschrieben)
- Task 5: zurückgestellt: 🟢 questions.js:19 Kommentar-Schreibweise der Anführungszeichen geändert
- Task 6: zurückgestellt: 🟡 attempts.js:51,57 unbekannte Art oder Nicht-Objekt in versuche.json wirft TypeError statt FlowError (plan-vorgeschrieben)
- Task 6: zurückgestellt: 🟡 review-attempts.test.js fehlen Tests für Deduplizierung in failedInstances, isKind, Reihenfolge
- Task 6: zurückgestellt: 🟢 review-attempts.test.js:116 Testname „AfterPause“ ohne Pause
- Task 7: Bedenken: lib/flow-legacy.js (alter review-flow.js) per Weiche für Positionsargumente; neues lib/script-checks.js mit Schritt script-checks schreibt runde-1/skript-pruefung.json aus PLAN_CHECKS
- Task 7: Bedenken: scriptItems übernimmt optionales category/check aus Skript-Befund, plan-neu E-Eintrag sieht immer skript-prüfung vor
- Task 7: Bedenken: resolvePlace trennt Reviewer-Finding und Skript-Befund zur selben AC in zwei 🔴-Stellen (Altablauf legte zusammen)
- Task 7: zurückgestellt: 🟡 script-checks.js SCRIPT_CHECKS doppelt zu review-groups.js:10, checkContext doppelt zu flow-legacy.js scriptContext
- Task 7: zurückgestellt: 🟡 rated-items.js:545 Reviewer heißt skript:<check> statt skript (SCRIPT_REVIEWER)
- Task 7: zurückgestellt: 🟢 runLegacyCall wandelt jeden Fehler in FlowError, Stack geht verloren (befristet)
- Task 7: zurückgestellt: 🟡 resolvePlace trennt Reviewer-Finding und Skript-Befund zur selben AC in zwei Stellen (Task 2)
- Task 7: zurückgestellt: 🟡 flow-legacy.js 408 Zeilen mit vielen Verantwortungen, entfällt nach Tasks 8–10/16/17
- Task 8: zurückgestellt: 🟡 rework-check.js:51-57 coverageProblem meldet keine unerwarteten Stellen in results (plan-vorgeschrieben)
- Task 8: zurückgestellt: 🟡 review-flow-rework.test.js fehlen Tests für Ausgang doppelt, status unbekannt, questions fehlt, results/Antwort fehlt bei Antworten
- Task 8: zurückgestellt: 🟢 rework-check.js:88-105 checkRework mit neun Guard-Zeilen
- Task 8: zurückgestellt: 🟡 checkAnswers liest fragen.json ohne eigene Meldung, wenn rework-check nie lief (readJson aus Task 7)
- Task 9: Bedenken: Rot-Schritt nicht separat gefahren; neue Option --runde für script-checks
- Task 9: zurückgestellt: 🟢 Rot-Lauf fehlt bei neuem Verhalten (Prozessmangel)
- Task 9: zurückgestellt: 🟢 round-two.js:120 readVerifier liefert bei Problem Objekt ohne verdicts/findings (plan-konform)
- Task 10: zurückgestellt: 🟢 flow-report.js:207-220 collect mischt Einlesen, Ableitung und Prüfung (plan-konform)
- Task 11: zurückgestellt: 🟡 prepare.test.js:155 Assertion zu --only ohne Wert entfernt, Zweig hasMissingValue ohne eigenen Test (Neuausrichtung-Verhalten)
- Task 11: zurückgestellt: 🟢 prepare.test.js:144 --rounds doppelt geprüft
- Task 13: zurückgestellt: 🟢 agents.test.js neuer Test prüft location-Text und „keines leer“ in einem Test
- Task 14: Bedenken: Verifier-Leerform enthält zusätzlich reviewer/summary, „Du suchst nicht neu“ statt „keine neuen Findings“ (spätere Schärfung); COLOR_WORD existiert in agents.test.js nicht
- Task 14: zurückgestellt: 🟡 plan-review-verifier.md:16 nennt keine Punkte „Frage beantwortet“ (Spec-Rückfrage), die round-two.js auch im Plan-Review erzeugt
- Task 14: zurückgestellt: 🟢 agents.test.js:399 Farb-Regex prüft nur Emojis, keine Farbwörter
- Task 15: Bedenken: zwei ältere Agenten-Tests an Plan-Text angepasst (reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions, spec-rework_Body_AnswerModeWritesWEntriesAfterREntries)
- Task 15: Bedenken: plan-rework bündelt keine Fragen mehr (rework-check liest Spec-Rückfrage aus reason); Bündel-Feld places statt locations
- Task 15: Bedenken: flow.md (Z. 29, 34) nennt noch Nacharbeit:/Fragen:/Antworten:/scout-input.md, Agenten erwarten neue Eingaben — bis Task 16/17 laufen Skills und Agenten auseinander
- Task 15: zurückgestellt: 🟡 spec-rework.md Antworten eintragen: R<n> doppeldeutig, keine Eingabe liefert die Liste gestellter Fragen (fragen.json nennen, mit Task 16)
- Task 15: zurückgestellt: 🟡 agents.test.js zwei Alt-Tests für plan-rework geschwächt (locations/questions/Bündelung entfallen, folgt aus Brief)
- Task 16: Bedenken: fragen.json als Eingabe für spec-rework im Antwort-Modus nicht übernommen (bräuchte Agenten-Änderung)
- Task 16: Bedenken: Skills spec-review/plan-review passen erst nach Task 17/18 zu flow.md
- Task 16: zurückgestellt: 🟢 flow.md Anhalten Schritt 4: Neustart im Antwort-Modus ohne fragen.json-Eingabe (braucht Agenten-Änderung)
- Task 16: zurückgestellt: 🟢 review-flow-doc.test.js Testnamen plan-konform, script-checks nur in eigenem Test
- Task 16: zurückgestellt: 🟡 Skills spec-review/plan-review bis Task 17 inkonsistent zu flow.md, Skill-Tests prüfen nur Pfad
- Task 17: Bedenken: kein Rot-Lauf; Skript-Prüfungen-Baustein in plan-review nennt script-checks statt „Keine.“ (Neuausrichtung); Umsetzer schrieb keine Berichtsdatei, Controller hat Rückgabe als task-17-report.md abgelegt
- Task 17: zurückgestellt: 🟡 plan-review „Nach der Nacharbeit“ (Anker-Refresh) wird von flow.md nicht ausgelöst
- Task 17: zurückgestellt: 🟢 loop_Intro_PointsSpecAndPlanToSharedFlow ohne Act/Assert-Kommentare (Dateistil)
- Task 18: zurückgestellt: 🟡 review-followup references/flow.md:10,22 Ausfall von Nacharbeit/Nachprüfer nicht ausdrücklich geregelt (AUSGEFALLEN → Bericht fehlt)
- Task 18: zurückgestellt: 🟢 references/flow.md:25 „Lief ein Scout“ unscharf bei ausgefallenem Scout
- Task 18: zurückgestellt: 🟢 review-followup-skill.test.js:139 Punkt in Regex nicht escaped
- Task 18: zurückgestellt: 🟡 plan-review/SKILL.md:36-37 „Nach der Nacharbeit“ verwaist (plan-checks.js berechnet Anker selbst)

## Stand
- Stand: e972584
- Gesamtlauf: e972584 grün (770 Tests, 764 pass, 0 fail, 6 skipped) — laut Fix-Bericht
