# Umsetzung — Plan: docs/forge/2026-10-19-orchestrator-kette-followup-runden/plan.md

## Abschlussbericht
# Abschlussbericht Umsetzung — orchestrator-kette-followup-runden

Bereich: `forge-base/2026-10-19-orchestrator-kette-followup-runden..HEAD` (20 Commits, davon 2 Spec/Plan-Commits, 16 Task-Commits, 2 Fix-Wellen-Commits)
Tasks: 16 von 16 fertig, alle Task-Reviews ohne 🔴; Final-Review: 1 × 🔴 und 1 beheben-Punkt, in einer Fix-Welle behoben (Commits 463257d..cd3b05f), Re-Review: alle behoben, keine neuen 🔴. Gesamtlauf cd3b05f: 1140 Tests grün.

## Urteile
- Urteil: Ledger und task-1-brief.md stammen von einem früheren Lauf vor dem Plan-Rework (Commit 2de12cb) — Scan und Brief wurden neu erzeugt, Vorab-Scan-Zeile ersetzt — Kosten falls falsch: ein Task liefe gegen veralteten Brief; Brief wird je Task frisch aus dem aktuellen Plan erzeugt
- Urteil: unversionierte Reste von Task 1 (lib/chain.js, tests/chain.test.js, followup.js SLUG-Export) werden dem Umsetzer unter Kontext als zu prüfender Vorbestand gegeben, nicht gelöscht — löschen wäre destruktiv, blind übernehmen ungeprüft — Kosten falls falsch: Umsetzer verwirft oder übernimmt Reste; Review fängt es ab
- Urteil: Task-9-Review mit opus statt sonnet — Diff berührt Vertrag (Followup-Ausgabe, Re-Reviewer-Agent) über 8 Dateien — Kosten falls falsch: etwas höhere Reviewkosten
- Urteil: Global Constraint "Änderung an Spec/Plan während einer Runde wird nach der Runde erkannt" bleibt im spec-review-orchestrator ohne eigenen Text (Followup ändert die Spec legitim; Brief Task 13 verlangt nichts) — Final-Review prüft, ob die Constraint dort greifen muss — Kosten falls falsch: Zusatz-Fix-Welle im Final
- Urteil: Final-🔴 (implementation-followup-report.js:134, unbestätigter 🟡 wird als 🔴 geführt) widerspricht Plan Z.1790 samt Testerwartung; Maßstab Spec: AC-41 (✅ mit offenen 🟡 bleibt ohne Hindernis) und Regel "🟡 ist kein Hindernis" stützen das Finding — Fix gegen den Plantext beauftragt — Kosten falls falsch: Fix-Welle ändert gewolltes Hochstufen, Re-Review fängt es
- Urteil: Final-🟡 CONTEXT.md (untracked) wird nicht committet — Datei ist unversionierter Vorbestand des Menschen, kein Plan-Task und kein beheben-Punkt; kommt als offener Punkt in den Abschlussbericht — Kosten falls falsch: Glossar fehlt im frischen Checkout bis der Mensch es committet
- Urteil: Bericht der Fix-Welle (final-report.md) vom Controller aus der Fixer-Rückmeldung als Datei übertragen, weil der Fixer sie nicht anlegen durfte — Inhalt unverändert — Kosten falls falsch: Re-Reviewer las einen übertragenen statt eines selbst geschriebenen Berichts; er prüfte gegen den Diff

## Offene Punkte
- `CONTEXT.md` (Glossar „Ketten-Eintrag“, „Followup-Runde“) ist untracked und nicht committet; kein Plan-Task legt sie an. Mensch prüft und committet.
- 🟢 `orchestrator-report.js:21`: `MISSING_FOLLOWUP` sagt auch bei einer Runde „Stand vor dieser Runde“ statt „Stand nach dem Review“ (AC-38-Wortlaut).
- 🟢 `orchestrator-report.js:90`: Feld `followupRounds` wird nirgends gelesen.
- 🟢 `report-data.js:177`, `implementation-report.js` `greenEntry`: 🟢-Zeilen enden auf „(ohne Scout-Beschreibung)“.
- 🟢 `README.md:16`: „nur ⚠️ und ein Abbruch stoppen“ nennt den Stopp bei Änderung an Spec oder Plan nicht.
- Spec-Hinweis: AC-09 („Byte für Byte“) und AC-31 stehen im Konflikt; Umsetzung folgt der Soll-Vorgabe.
- Zurückgestellte 🟡/🟢 der Task-Reviews stehen im Ledger-Auszug neben dem Plan.

## Urteile
- Urteil: Ledger und task-1-brief.md stammen von einem früheren Lauf vor dem Plan-Rework (Commit 2de12cb) — Scan und Brief wurden neu erzeugt, Vorab-Scan-Zeile ersetzt — Kosten falls falsch: ein Task liefe gegen veralteten Brief; Brief wird je Task frisch aus dem aktuellen Plan erzeugt
- Urteil: unversionierte Reste von Task 1 (lib/chain.js, tests/chain.test.js, followup.js SLUG-Export) werden dem Umsetzer unter Kontext als zu prüfender Vorbestand gegeben, nicht gelöscht — löschen wäre destruktiv, blind übernehmen ungeprüft — Kosten falls falsch: Umsetzer verwirft oder übernimmt Reste; Review fängt es ab
- Urteil: Task-9-Review mit opus statt sonnet — Diff berührt Vertrag (Followup-Ausgabe, Re-Reviewer-Agent) über 8 Dateien — Kosten falls falsch: etwas höhere Reviewkosten
- Urteil: Global Constraint "Änderung an Spec/Plan während einer Runde wird nach der Runde erkannt" bleibt im spec-review-orchestrator ohne eigenen Text (Followup ändert die Spec legitim; Brief Task 13 verlangt nichts) — Final-Review prüft, ob die Constraint dort greifen muss — Kosten falls falsch: Zusatz-Fix-Welle im Final
- Urteil: Final-🔴 (implementation-followup-report.js:134, unbestätigter 🟡 wird als 🔴 geführt) widerspricht Plan Z.1790 samt Testerwartung; Maßstab Spec: AC-41 (✅ mit offenen 🟡 bleibt ohne Hindernis) und Regel "🟡 ist kein Hindernis" stützen das Finding — Fix gegen den Plantext beauftragt — Kosten falls falsch: Fix-Welle ändert gewolltes Hochstufen, Re-Review fängt es
- Urteil: Final-🟡 CONTEXT.md (untracked) wird nicht committet — Datei ist unversionierter Vorbestand des Menschen, kein Plan-Task und kein beheben-Punkt; kommt als offener Punkt in den Abschlussbericht — Kosten falls falsch: Glossar fehlt im frischen Checkout bis der Mensch es committet
- Urteil: Bericht der Fix-Welle (final-report.md) vom Controller aus der Fixer-Rückmeldung als Datei übertragen, weil der Fixer sie nicht anlegen durfte — Inhalt unverändert — Kosten falls falsch: Re-Reviewer las einen übertragenen statt eines selbst geschriebenen Berichts; er prüfte gegen den Diff

## Zurückgestellt und geparkt
- Task 1: zurückgestellt: 🟡 chain.test.js:384-410 removeByWorktree ohne Test für andere Schreibweise des Worktree-Pfads (sameDir)
- Task 2: zurückgestellt: 🟢 chain.js:50 parseOptions-Meldung unterscheidet fehlenden Wert nicht von unbekanntem Flag (brief-konform)
- Task 2: zurückgestellt: 🟢 chain.js:56-58 required prüft auf Falsy, leerer Wert zählt als fehlend
- Task 2: zurückgestellt: 🟢 guard-orchestrator.test.js:268 Guard-Test nur für write, nicht lookup/remove
- Task 3: zurückgestellt: 🟢 chain-reports.test.js:242 lockere Assertion includes||endsWith (brief-konform)
- Task 3: zurückgestellt: 🟢 flow-report.js:57 ungenutzte Variable _chain, gleiches Muster wie _steps
- Task 4: zurückgestellt: 🟡 chain-reports.test.js:352-364 Embedded-Test vergleicht nur stdout, nicht die Berichtsdatei mit/ohne Eintrag (plan-vorgeschrieben)
- Task 4: zurückgestellt: 🟡 implementation-report-text.test.js:383-425 Fall incomplete mit Eintrag ungetestet
- Task 4: zurückgestellt: 🟢 task-4-report.md:5 Rot-Lauf unvollständig dokumentiert
- Task 5: Bedenken: Brief nennt unter Dateien den bestehenden Testnamen ...CleanImplementationNamesFinishWorkItself; neuer Test heißt reviewFollowupFlow_NextStep_ImplementationEntryAddsWorktreeFinishStepAndPushLine (Name aus Schritt 1/2)
- Task 5: zurückgestellt: 🟡 flow.md:53 "in jedem der Fälle oben" umfasst dem Wortlaut nach auch den plan-review-Fall (plan-vorgeschrieben)
- Task 5: zurückgestellt: 🟡 review-followup-skill.test.js:55-62 prüft nur Teilstrings, nicht Reihenfolge der neuen Zeile
- Task 6: Bedenken: Wortzahl finish-work/SKILL.md 341 statt 336 aus dem Brief, Grenze <500 eingehalten
- Task 6: zurückgestellt: 🟢 work-skills.test.js:63 ohne Arrange/Act/Assert-Kommentare (plan-vorgeschrieben, Nachbartests ebenso)
- Task 6: zurückgestellt: ⚠️ geklärt: Schreibpfad (Task 14: --worktree "<R>") und Entfernpfad (Task 6: --worktree "<R>") stimmen im Plan überein — keine Lücke
- Task 7: zurückgestellt: 🟢 review-flow-report.test.js doppelte grüne Stelle in Runde 1 und Nachprüfung: Gewinner (Nachprüfung) nicht per description abgesichert
- Task 7: zurückgestellt: 🟢 report-data.js:177 grüne Beschreibungen tragen Zusatz "(ohne Scout-Beschreibung)" aus fallbackDescription; beim Rendern in Task 8/11 beachten
- Task 8: zurückgestellt: 🟡 implementation-report.test.js kein Fall für green: [] bzw. gemischte Gruppen (🔴+🟢)
- Task 8: zurückgestellt: 🟢 implementation-report.js Zeilen mit zwei Zuweisungen lang
- Task 8: zurückgestellt: ⚠️ geklärt: Konsument von green ist Task 10 (Plan Z.1846, "green als Feld der Berichtsdaten, Tasks 7, 8, 9") — Feldform passt, keine Lücke
- Task 9: zurückgestellt: 🟡 flow.md:43 (+:17, :30) eingebetteter Lauf bei blockiert/keine Änderung: Schritt 3 der Nachprüfung (--ohne ...) nicht eindeutig geführt, <BD> könnte fehlen (plan-vorgeschrieben) — beheben, Final-Review prüfen
- Task 9: zurückgestellt: 🟡 implementation-followup-report.js:86 Zweig unconfirmed>0 bei sauberem Gesamturteil ungetestet
- Task 9: zurückgestellt: 🟢 followup-report.js:127/129 isConfirmed doppelt berechnet; :41/:54 Begriff "Urteilszeile" doppeldeutig; :57 Titelsuche ohne Backtick-Toleranz; flow.md:51-52 Vorrang BEHALTEN nur per Reihenfolge; test:165 Name parseAnswer_ prüft CLI-Lauf
- Task 9: zurückgestellt: ⚠️ geklärt: Verbraucher von green/offersFollowup/BEHALTEN ist Task 10 (Plan Z.1846), kommt in der Reihenfolge danach — keine Lücke
- Task 10: zurückgestellt: 🟡 orchestrator-report.test.js green und followupRounds ohne eigenen Test (brief gibt keine vor) — beheben, Final-Review prüfen
- Task 10: zurückgestellt: 🟡 orchestrator-report.js:63-64 mergeGreen: offene Einträge ohne key lassen green-Einträge ohne key herausfallen (Altdaten-Randfall)
- Task 10: zurückgestellt: 🟢 Testname enthält "SecondFollowup" (brief-vorgegeben)
- Task 10: zurückgestellt: ⚠️ geklärt: Renderer orchestrator-report-text.js wertet green/followupRounds in Task 11 aus (Plan Z.2081 Consumes mergeReports mit green) — keine Lücke
- Task 11: zurückgestellt: 🟢 orchestrator-report.test.js:337-344 Test OnlyGreenFindings ohne Arrange-Kommentar (plan-vorgeschrieben)
- Task 12: Bedenken: 6 statt 3 Tests rot vor Umsetzung (angepasste Assertions); Einrückung Schritt 5 mit 3 statt 5 Leerzeichen wie Bestand; Wortzahl Body 505 (Grenze 550)
- Task 12: zurückgestellt: 🟢 plan-orchestrator/SKILL.md:44 lange Zeile in Schritt 5.3
- Task 12: zurückgestellt: ⚠️ geklärt: chain.js write --stage plan (Task 2, Review sauber) und Mehrfach---followup in orchestrator-report.js (Task 10, Review sauber) wie angenommen umgesetzt — keine Lücke
- Task 13: zurückgestellt: 🟢 spec-review-orchestrator.test.js:148-152 mehrere Assertions je Test (üblich, brief-vorgegeben)
- Task 13: zurückgestellt: ⚠️ geklärt: Runde bei ⛔/❓ mit FOLLOWUP ja deckt Spec Z.30 ("jedem Ergebnis außer ⚠️") und SKILL Schritt 3/4 ab — keine Lücke
- Task 14: Bedenken: 7 statt 2 Tests rot vor Umsetzung (geänderte Assertions); Schritt 5 regelt Runde 1 mit ✅ und FOLLOWUP nein nur implizit (Brief-Wortlaut)
- Task 14: Bedenken: Vorfall beim Rot-Lauf: Skill-Datei per git checkout-index überschrieben, aus Scratchpad-Sicherung wiederhergestellt, Läufe und Commit-Diff neu geprüft (2 Dateien, +50 −17) — Review prüft den Diff
- Task 14: zurückgestellt: 🟢 SKILL.md Schritt 5 regelt Runde 1 mit ✅ und FOLLOWUP nein nur implizit (Brief-Wortlaut)
- Task 14: zurückgestellt: 🟢 Task-Bericht: Commit-Trailer nennt Claude Haiku 5.5; Wortzahl des Skill-Bodys nicht gemessen (Test <700 grün)
- Task 14: zurückgestellt: ⚠️ geklärt: chain.js write (Task 2) und Mehrfach-followup (Task 10) wie angenommen umgesetzt und reviewt; Marker aus Task 9 vorhanden — keine Lücke
- Task 15: zurückgestellt: ⚠️ geklärt: README-Aussagen (Followup bei FOLLOWUP ja, Ketten-Eintrag unter <git-common-dir>/dv-forge/chain/, finish-work entfernt Eintrag) stimmen mit Tasks 2, 6, 12-14 überein, Final-Review prüft zusätzlich — keine Lücke

## Stand
- Stand: cd3b05f
- Gesamtlauf: cd3b05f grün (1140 Tests)
