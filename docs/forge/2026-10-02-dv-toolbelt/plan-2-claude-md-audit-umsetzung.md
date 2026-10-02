# Umsetzung — Plan: docs/forge/2026-10-02-dv-toolbelt/plan-2-claude-md-audit.md

## Abschlussbericht
# Abschluss — Plan 2: claude-md-audit

Bereich: `forge-base/plan-2-claude-md-audit..HEAD` (dd96cea..d04f200)
Tasks: 4, alle fertig, jedes Task-Review sauber, Final-Review sauber (Übergabe: ja), ohne Fix-Runden.
Commits: bf478e8 (Task 1), a21b11e (Task 2), 81560f5 (Task 3), d04f200 (Task 4). Fremder Commit im Bereich: b34e6d7 (plugins/forge, paralleler Lauf, nicht Teil dieses Plans).
Gesamtlauf: d04f200 grün (229 Tests, `node --test "plugins/toolbelt/tests/*.test.js"`).

## Urteile
1. Drift plugins/toolbelt/README.md akzeptiert — Mensch hat bestätigt; Änderung stammt aus Plan 1 (c0adbf2) — falls falsch: README-Zeile in Task 4 neu verankern.
2. Fremde uncommitted Änderungen unter plugins/forge bleiben unberührt; Umsetzer stagen nur eigene Dateien — falls falsch: fremde Änderungen in Toolbelt-Commits, Commit aufteilen.
3. Review-Paket Task 3 ab b34e6d7 statt a21b11e — fremder Commit dazwischen — falls falsch: Task-3-Review sah einen Commit zu wenig; Final-Review deckte den ganzen Bereich.

## Offene Punkte
- 🟡 SKILL.md: Aufruf `blocks hash` fehlt im nummerierten Ablauf (Schritt 1); steht nur im Abschnitt „Geschützte Blöcke“. Vorschlag Final-Review: Satz nach dem `size`-Aufruf in Schritt 1 plus Reihenfolge-Test analog `claudeMdAudit_Body_AsksForBackupBeforeCheckingAnything`.
- 🟡 makeBackup überschreibt vorhandenes Ziel still (COPYFILE_EXCL nachrüsten).
- 🟡 unifiedDiff: Tests für reine Einfügung/Löschung, leere Datei, abweichendes context fehlen; Kopf `-1,0` bei leerer alter Datei weicht von GNU `-0,0` ab.
- 🟢 Rest siehe Ledger-Auszug (Ordner als Quelle, `--to` auf Ordner, No-newline-Hinweis, CLI-Tests für verify-Fehlerpfade, Meldung bei entferntem mittleren Block, Marker-Paare, includes-Tests, „nie“-Stil).

## Urteile
- Urteil: Drift plugins/toolbelt/README.md akzeptiert — Mensch hat bestätigt; Änderung stammt aus Plan 1 (c0adbf2), die der Plan voraussetzt — falls falsch: README-Zeile in Task 4 neu verankern.
- Urteil: Fremde uncommitted Änderungen unter plugins/forge (paralleler Lauf) bleiben unberührt; Umsetzer stagen nur eigene Dateien — falls falsch: fremde Änderungen landen in Toolbelt-Commits, Commit aufteilen.
- Urteil: Review-Paket Task 3 ab b34e6d7 statt a21b11e — b34e6d7 ist fremder forge-Commit eines parallelen Laufs, dazwischen gelandet — falls falsch: Task-3-Review sah einen Commit zu wenig; Final-Review deckt den Bereich ohnehin.

## Zurückgestellt und geparkt
- Task 1: zurückgestellt: 🟡 makeBackup überschreibt vorhandenes Ziel still (copyFileSync ohne COPYFILE_EXCL) — lib/claude-md-guard.js:127
- Task 1: zurückgestellt: 🟢 Quelle als Ordner gibt Stacktrace statt GuardError — lib/claude-md-guard.js:124
- Task 1: zurückgestellt: 🟢 Kopfkommentare nennen Diff/Blöcke vorab — passt zum Plan
- Task 2: zurückgestellt: 🟡 Tests fehlen für reine Einfügung/Löschung, leere Datei, verschmelzende Hunks, abweichendes context — Zweig hunkRanges:121 und Null-Zeilen-Kopf :130-133 ungetestet
- Task 2: zurückgestellt: 🟢 Unterschied nur im letzten Zeilenumbruch ergibt "Keine Änderung", kein `\ No newline`-Hinweis
- Task 2: zurückgestellt: 🟢 LCS-Tabelle O(n·m) Speicher — für CLAUDE.md-Größen ok
- Task 3: zurückgestellt: 🟢 kein Test für `blocks verify` ohne --hashes (Exit 2) und CLI-Verify mit unterminiertem Block (Exit 1)
- Task 3: zurückgestellt: 🟢 entfernter mittlerer Block meldet letzten als "fehlt", nachrückende als "geändert" — folgt aus Plan-Vertrag
- Task 4: zurückgestellt: 🟢 Skill-Tests prüfen Textbausteine nur per includes, nicht Abschnittszuordnung — plan-vorgeschrieben
- Task 4: zurückgestellt: 🟢 SKILL.md:51 nutzt selbst „nie“, kritisiert aber in :93 Streng-Formeln — Wortlaut aus Plan

## Stand
- Stand: d04f200
- Gesamtlauf: d04f200 grün (229 Tests)
