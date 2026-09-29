# Umsetzung — Plan: docs/forge/2026-09-29-lean-retrospective/plan.md

## Abschlussbericht
# Abschluss — Prozess-Retrospektive: schlank und genauer

Bereich: forge-base/2026-09-29-lean-retrospective..7f67a32 (eigene Commits; dazwischen 4 fremde Commits einer parallelen Session: 730ac63, c787e20, 86a4754, 8a572c5)
Tasks: 18 von 18 fertig · Fix-Runden: 1 (Task 13, typografisches Schlusszeichen) · Final-Review: sauber, Übergabe ja
Suite: 7f67a32 grün (907 pass, 0 fail, 6 skipped)

## Urteile
- Task-2-Review über 730ac63..2516872 statt 214851a..HEAD — fremder Commit dazwischen — Kosten falls falsch: fremder Code ungeprüft im Final-Bereich
- Stash-Panne des Task-2-Umsetzers: Index und CLAUDE.md bereinigt; ungetrackte Dateien aus stash@{0} bleiben liegen (Löschen blockiert), Stash intakt — Kosten falls falsch: Restdateien im Arbeitsbereich
- 🔴 Task 12 „vierte escapeRegExp-Kopie“ geparkt — Planentscheidung des Menschen (Followup Gruppe 1, Vorschlag 1) — Kosten falls falsch: vier Kopien bis zu einem chore-Commit

## Offene Punkte
- chore: plan-anchors.js, forge-config.js, lib/document-units.js auf lib/regexp.js umstellen
- retro-timeline page(): Eintrag mit mehr als 300 Zeilen ergibt leere Seite / --from-Schleife
- Testlücken: timeProfile/harnessHints-Randfälle, MCP_RUN/TOOLCHAIN_SCRIPT, summaryOrFallback, retroCost-Zweige, Exit 2 in session-facts
- idleReruns ohne Obergrenze; configuredExpect fängt jeden Fehler; ASCII-Anführungszeichen in Kommentaren retro-sort.js
- Aus Plan-Review offen: Snapshot-Felder mcp/numbers ungeprüft; Geheimnis-Muster erkennt --password ohne =, JSON "token": nicht
- Arbeitsbereich: ungetrackte Dateien aus stash@{0} (.claude/agents, .claude/skills/{delivery-inspection,feature-delivery,requirement-definition}, Requests/, StartUpClaude.md) und x.md liegen noch im Checkout

## Urteile
- Urteil: Task-2-Review über 730ac63..2516872 statt 214851a..HEAD — 730ac63 ist ein fremder Commit einer parallelen Session — falls falsch: fremder Code ungeprüft im Bereich des Final-Reviews
- Urteil: Umsetzer-Stash-Panne bereinigt (Index + CLAUDE.md), ungetrackte Stash-Dateien bleiben liegen (Löschen blockiert), Mensch informiert — Kosten falls falsch: Restdateien im Arbeitsbereich
- Urteil: 🔴 Task 12 „vierte escapeRegExp-Kopie“ nicht beheben — der Mensch wählte im Followup (Gruppe 1, Vorschlag 1) ausdrücklich, die drei Altkopien unangetastet zu lassen; Spec verlangt nichts — falls falsch: vier Kopien bis zu einem chore-Commit

## Zurückgestellt und geparkt
- Task 1: Bedenken: Rot-Lauf nur für die 3 CLI-Tests, lib-Tests waren schon grün (Reihenfolge beim Anlegen)
- Task 1: Bedenken: mcp-usage.js bleibt CRLF
- Task 1: zurückgestellt: 🟢 Altprotokolle ohne origin zählen unmarkierte Zusammenfassung als Eingabe (plan-konform, kein Test)
- Task 2: zurückgestellt: 🟡 kein Test mehr für Exit 2 bei ungültigen Argumenten (session-facts.test.js)
- Task 2: zurückgestellt: 🟢 fehlende Leerzeile vor USAGE (session-facts.js:9)
- Task 3: zurückgestellt: 🟢 echter Zeilenumbruch statt \n im Lenient-Template (session-facts.js:87)
- Task 4: zurückgestellt: 🟡 timeProfile 3 Ebenen + zwei Zustände in einer Funktion (plan-vorgeschrieben)
- Task 4: zurückgestellt: 🟡 Randfall-Tests timeProfile/harnessHints fehlen (0/1 Zeitstempel, ohne Eingabe, isMeta)
- Task 4: zurückgestellt: 🟢 minutes() doppelt mit anderer Signatur (retro-measures vs session-facts); Kopfkommentar greift vor
- Task 5: Bedenken: Rot-Lauf nicht einzeln beobachtet (Test und Code in einem Schritt)
- Task 5: zurückgestellt: 🟢 Konstanten mitten in retro-measures.js; minutes() doppelt; clock(null)-Randfall ungetestet
- Task 6: zurückgestellt: 🟢 loadItems mischt Ergebnisse, Skill-Text und Trigger-Zustand; Randfall-Tests (Slash-Auslöser, unbekannt, Schwelle) fehlen
- Task 7: zurückgestellt: 🟡 idleReruns ohne Obergrenze (longRuns hat MAX)
- Task 7: zurückgestellt: 🟡 MCP_RUN- und TOOLCHAIN_SCRIPT-Zweig ungetestet
- Task 7: zurückgestellt: 🟢 countRerun mutiert state im reduce
- Task 8: zurückgestellt: 🟡 configuredExpect fängt jeden Fehler statt nur ConfigError (plan-wörtlich)
- Task 8: zurückgestellt: 🟢 session.cwd = options.cwd teils redundant zu projectOf
- Task 9: zurückgestellt: 🟢 Pipe-Glieder (echo | grep) zählen nicht als Lese-Fallback (bewusst)
- Task 10: zurückgestellt: 🟢 measure doppelt berechnet (render + run); Hilfsname facts im Test
- Task 11: zurückgestellt: 🟡 readSnapshot-Fehlerpfade und safeId ohne direkten Test (Task 14 testet CLI-seitig)
- Task 11: zurückgestellt: 🟢 branchOf-Git-Rückfall ungetestet
- Task 12: geparkt — 🔴 vierte escapeRegExp-Kopie (plan-vorgeschrieben) — Urteil: Planentscheidung des Menschen, Umstellung als eigener chore-Commit
- Task 12: zurückgestellt: 🟡 Zitatprüfung nur in der ersten *Im Projekt:*-Zeile (Format verlangt eine Zeile)
- Task 12: zurückgestellt: 🟡 Test ThreeDefects prüft nur die Anzahl
- Task 12: zurückgestellt: 🟢 LEGACY_NEW_NAME nur über Kommentar verständlich
- Task 13: zurückgestellt: 🟡 compose ohne Guard bei fehlendem Titel/Relevanz (findIndex -1)
- Task 14: zurückgestellt: 🟢 Race freeName/wx mit irreführender Meldung; shown-Aufbau in build; catch-Kommentar über statt an readMeta
- Task 15: zurückgestellt: 🟡 summaryOrFallback ohne Test
- Task 15: zurückgestellt: 🟡 retroCost „Protokoll fehlt“ und Spec-ohne-Workitem→Branch ungetestet
- Task 15: zurückgestellt: 🟢 „1 Anfragen“; retroCost mischt Guards und Rechnung
- Task 16: zurückgestellt: 🟡 page(): Eintrag mit mehr als MAX_ROWS Zeilen ergibt leere Seite und --from-Endlosschleife
- Task 16: zurückgestellt: 🟢 doppelte Leerzeile session-files.js:86; part.text ohne String-Prüfung
- Task 17: zurückgestellt: 🟡 ASCII " statt U+201C in Kommentaren retro-sort.js:21,37,44,56
- Task 17: zurückgestellt: 🟢 parseDraft je Bericht mehrfach
- Task 18: Bedenken: kein separater Rot-Lauf (Inhalt und Test in einem Schritt)
- Task 18: zurückgestellt: 🟢 Rot-Schritt übersprungen; Test bündelt drei Aussagen (plan-vorgegeben)

## Stand
- Stand: 7f67a32
- Gesamtlauf: 7f67a32 grün (907 pass, 0 fail, 6 skipped)
