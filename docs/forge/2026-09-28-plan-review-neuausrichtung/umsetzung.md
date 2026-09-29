# Umsetzung — Plan: docs/forge/2026-09-28-plan-review-neuausrichtung/plan.md

## Abschlussbericht
# Abschluss — Plan-Review neu ausrichten

Bereich: `forge-base/2026-09-28-plan-review-neuausrichtung..HEAD` (2ebd0c6..ea353e4)
Tasks: 12 von 12 fertig, davon 1 mit Fix-Runde (Task 9, 1/5). Final-Review: sauber, Übergabe ja.
Gesamtlauf auf ea353e4: 714 pass, 0 fail, 6 plattformbedingte Skips.
Fremde Commits im Bereich (paralleler Agent, docs/forge/2026-09-29-lean-retrospective/): 43072b4, 0acc9ff.

## Urteile
- Urteil: trotz Drift (agents.test.js seit a46f0a7 durch 1d61a36, 89e14dc, 04744b1 geändert) umsetzen — Mensch bestätigt; Umsetzer arbeiten auf aktuellem Stand — Anker-Zeilennummern in agents.test.js können abweichen, Nacharbeit je Task.
- Urteil: ⚠️ Task 2 "review-flow nutzt readContext" ist keine Lücke — Task 5 verdrahtet es laut Plan — falls falsch: Final-Review findet fehlende Nutzung
- Urteil: ⚠️ Task 3 runScriptChecks ohne context aufgerufen ist keine Lücke — Task 5 übergibt { doc, spec, repo } laut Plan — falls falsch: Final-Review
- Urteil: ⚠️ Task 6 "capped/ADVISORY in unverändertem Code" ist keine Lücke — CLI-Test prüft rot=0 gelb=2 und capped, Rot/Grün belegt — falls falsch: Final-Review
- Urteil: ⚠️ Task 7 AC-38..AC-40 gegen Spec abgeglichen — Prüfpunkt 3 nennt je Soll-Vorgabe ein Finding, fehlenden Abschnitt = jede fehlt, Abweichung — keine Lücke — falls falsch: Final-Review
- Urteil: ⚠️ Task 8 AC-30-Test bleibt grün — Bericht belegt 59/59 grün in agents.test.js — falls falsch: Gesamtlauf in Task 12 fällt auf
- Urteil: ⚠️ Task 11 Test wäre ohne Filter nie rot — gewollter Charakterisierungstest, der Plan erwartet grün ohne Codeänderung (AC-24 als Absicherung) — falls falsch: Test schützt schwächer, kein Folgeschaden

## Offene Punkte
- 🟡 Final: `review-flow.js:252/:325` — Die Stelle "Task" ist grob (E · Dieselbe Stelle im Plan). Ein Reviewer-🔴 und ein Skript-Befund am selben Task werden gemeinsam zum Skript-Punkt. Behebt die Nacharbeit nur den Skript-Befund, gilt der Reviewer-🔴 ungeprüft als erledigt. Vorschlag als Folgepunkt: KI-Items gemischter Gruppen trotzdem auf die Prüfliste setzen, das Urteil kombiniert bilden, die Stelle nur einmal zählen.
- 🟢 Final: `plugins/forge/.claude-plugin/plugin.json` — Version vor dem Merge anheben (z. B. 0.17.0).
- 🟡 Task 4: Regel "lückenlos ab 1" steht doppelt (`numberingFindings`, `numberingError`). Folgeschritt wäre ein gemeinsames Prädikat.
- 🟢 Task 9: roter Zwischenstand auf 085f3f9 (behoben in f8cae04). Task 12: ea353e4 hat die Attribution Haiku 4.5. Beides beim Squash-Merge bereinigen.
- 🟢 Weitere zurückgestellte Politur-Punkte siehe Ledger-Auszug.

## Urteile
- Urteil: trotz Drift (agents.test.js seit a46f0a7 durch 1d61a36, 89e14dc, 04744b1 geändert) umsetzen — Mensch bestätigt; Umsetzer arbeiten auf aktuellem Stand — Anker-Zeilennummern in agents.test.js können abweichen, Nacharbeit je Task.
- Urteil: ⚠️ Task 2 "review-flow nutzt readContext" ist keine Lücke — Task 5 verdrahtet es laut Plan — falls falsch: Final-Review findet fehlende Nutzung
- Urteil: ⚠️ Task 3 runScriptChecks ohne context aufgerufen ist keine Lücke — Task 5 übergibt { doc, spec, repo } laut Plan — falls falsch: Final-Review
- Urteil: ⚠️ Task 6 "capped/ADVISORY in unverändertem Code" ist keine Lücke — CLI-Test prüft rot=0 gelb=2 und capped, Rot/Grün belegt — falls falsch: Final-Review
- Urteil: ⚠️ Task 7 AC-38..AC-40 gegen Spec abgeglichen — Prüfpunkt 3 nennt je Soll-Vorgabe ein Finding, fehlenden Abschnitt = jede fehlt, Abweichung — keine Lücke — falls falsch: Final-Review
- Urteil: ⚠️ Task 8 AC-30-Test bleibt grün — Bericht belegt 59/59 grün in agents.test.js — falls falsch: Gesamtlauf in Task 12 fällt auf
- Urteil: ⚠️ Task 11 Test wäre ohne Filter nie rot — gewollter Charakterisierungstest, der Plan erwartet grün ohne Codeänderung (AC-24 als Absicherung) — falls falsch: Test schützt schwächer, kein Folgeschaden

## Zurückgestellt und geparkt
- Task 1: zurückgestellt: 🟢 task-1-report.md Testzahlen im Bericht falsch (nur Bericht, kein Code)
- Task 2: zurückgestellt: 🟢 workspace.test.js:239-244 Fall "gültiges JSON, aber Array" in readContext ungetestet
- Task 3: zurückgestellt: 🟢 review-flow.js:250 vom Skript übernommener KI-Punkt verlangt weiter Nachprüfer-Urteil (verifierProblems), das verworfen wird
- Task 4: Bedenken: Kontext-Hinweis CRLF war falsch, Working Tree hat LF; Zeilenenden unverändert gelassen
- Task 4: zurückgestellt: 🟡 plan-checks.js:55-66 / plan-tasks.js:212-217 Regel "lückenlos ab 1" doppelt (numberingFindings vs numberingError); plan-vorgeschrieben; Vorschlag gemeinsames Prädikat
- Task 4: zurückgestellt: 🟢 plan-checks.test.js:366 Testname numbering_PlanWithoutTasks prüft alle drei Prüfungen
- Task 5: Bedenken: Rot-Lauf nicht belegt; Gesamtlauf 712 Tests, 706 pass, 0 fail, 6 weder pass noch fail (ungeklärt)
- Task 5: zurückgestellt: 🟢 task-5-report.md Rot-Lauf nicht protokolliert
- Task 5: zurückgestellt: 🟢 flow-workspace.js:140 require von writeContext hinter SCRIPT-Konstante (plan-vorgeschrieben)
- Task 6: zurückgestellt: 🟢 agents.test.js:116-122 Test prüft Satz als exakten Substring inkl. Emoji
- Task 6: Bedenken: ws.context('# Spec\n') im round1-Test ergänzt (nicht im Brief), nötig seit Task 5
- Task 7: zurückgestellt: 🟢 agents.test.js:79-91 Asserts prüfen nur Teilstrings (Bestandsstil)
- Task 8: zurückgestellt: 🟢 agents.test.js:441-452 Teilstring-Asserts koppeln an Wortlaut (Bestandsstil)
- Task 9: Bedenken: Test plan-review-buildability_Body_FormatCalibrationDecisionsLocations rot committet; Umsetzer vermutet Brief-Konflikt, Controller-Zählung: 9 schließende U+201C zu U+201D normalisiert (8faa1ff: 201E=13/201C=13, HEAD: 201E=11/201C=2/201D=9)
- Task 9: zurückgestellt: 🟡 task-9-report.md:57-80 Bericht meldet Brief-Konflikt statt Ursache, roter Test committet
- Task 9: zurückgestellt: 🟢 agents.test.js:125 Teilstring ohne abschließenden Punkt aus Brief
- Task 10: zurückgestellt: 🟢 plan-rework.md:26 Fortsetzungszeile liest sich als Teil von spec-rückfrage (plan-vorgeschrieben)
- Task 11: zurückgestellt: 🟢 review-flow-round1.test.js:40-41 zweiter deepEqual redundant; Testname round1_ statt roundOne_ (beides plan-vorgeschrieben)
- Task 12: zurückgestellt: 🟢 plan-review-skill.test.js:60 Fragment "Spec-Rückfragen offen" teilweise redundant (plan-vorgeschrieben)
- Task 12: zurückgestellt: 🟢 Commit ea353e4 Attribution nennt Claude Haiku 4.5 statt Session-Vorgabe

## Stand
- Stand: ea353e4
- Gesamtlauf: ea353e4 grün (714 pass, 0 fail, 6 skipped)
