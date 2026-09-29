# Umsetzung — Plan: docs/forge/2026-09-28-review-ablauf-regelwerk/plan.md

## Abschlussbericht
# Abschluss — Review-Ablauf: einmal suchen, Skript entscheidet

- Bereich: `forge-base/2026-09-28-review-ablauf-regelwerk..HEAD` (62097a6..226a798)
- Tasks: 18 von 18 fertig; Task 4 mit einer Fix-Runde, alle anderen im ersten Review sauber
- Final-Review: kein 🔴; ein Punkt „beheben“ (Schlusssatz in `review-followup/SKILL.md`) in einer Fix-Welle behoben (988fb18..226a798)
- Gesamtlauf: 226a798 grün (672 Tests, 0 fail, 6 skipped)

## Urteile
- Urteil: Scout-Ausfall nach Spec „W · Nachforderung des Scouts“ — Mensch bestätigt, Spec gilt — Doku in Task 14/17: Scout ausgefallen = Vermerk, kein `--ausgefallen`, Lauf geht weiter; Kosten falls falsch: Status-Rangfolge irrig
- Urteil: Nachprüfer meldet nur Urteile und Widersprüche nach Spec „W · AC-50“ — Mensch bestätigt — Task 11 Punkt 3 der Agenten entsprechend; Kosten falls falsch: Hinweise der Nachprüfung fehlen
- Urteil: AC-55 durch Task 3/4 abgedeckt (`rateFinding_ScriptCheckAtOpenQuestion_StaysRed`) — keine Änderung; Kosten falls falsch: fehlender Beleg
- Urteil: Task 7 Dateien per Byte-Kopie aus dem geprüften Prototyp — Schreibwerkzeug normalisiert “ — Kosten falls falsch: Prototyp weicht vom Brief ab (per diff identisch geprüft)
- Urteil: Task 14 mit sonnet statt haiku — Klarstellung weicht vom Brief ab — Kosten: etwas höher

## Offene Punkte
- Die Spec `docs/forge/2026-09-28-review-ablauf-regelwerk/spec.md` enthält eine vom Menschen bestätigte, noch uncommittete Änderung (W · Entfällt, W · AC-50, W · Nachforderung des Scouts, AC-55); die Umsetzung folgt ihr. Plan-W „Scout-Ausfall“ und „Findings der Nachprüfung“ sind damit überholt.
- 🟡 `review-flow.js`: fehlende oder kaputte Zustandsdateien führen zu TypeError statt `ERROR`-Zeile (nur bei falscher Schrittfolge) — empfohlen, nicht zwingend.
- 🟡 `review-groups.js` dupliziert `cell`/`itemLine`/`CLOSING_QUOTE` aus `aggregate-findings.js`.
- 🟢 Toter Suffix-Regex `· hochgestuft` in `followup.js:120`; weitere Politur-Punkte im Ledger.
- Typografische Anführungszeichen: Subagents normalisieren U+201C; betroffen waren ein Kommentar (Task 2), ein Test-String (Task 3) und eine Meldung (Task 5), jeweils ohne Wirkung.

## Urteile
- Urteil: Scout-Ausfall nach Spec „W · Nachforderung des Scouts“ — Mensch bestätigt, Spec gilt — Task 14/17 Doku: Scout ausgefallen = Vermerk, kein --ausgefallen, Lauf geht weiter; falsch: Status-Rangfolge irrig
- Urteil: Nachprüfer meldet nur Urteile und Widersprüche nach Spec „W · AC-50“ — Mensch bestätigt — Task 11 Punkt 3 der Agenten entfällt; Herabstufung bleibt Sicherheitsnetz; falsch: Hinweise der Nachprüfung fehlen
- Urteil: AC-55 durch Task 3/4 abgedeckt (rateFinding_ScriptCheckAtOpenQuestion_StaysRed) — keine Änderung — falsch: fehlender Beleg
- Urteil: Task 7 Dateien per Byte-Kopie aus dem geprüften Prototyp statt Abtippen — Schreibwerkzeug normalisiert “ in vielen Test-Literalen — falsch: Prototyp weicht vom Brief ab (per diff geprüft: identisch bis auf dokumentierte Stellen)
- Urteil: Task 14 mit sonnet statt haiku — Klarstellung weicht vom Brief ab (Prosa-Arbeit) — falsch: etwas höhere Kosten

## Zurückgestellt und geparkt
- Task 1: Bedenken: Rot-Schritt nicht separat gelaufen; followup.js entfernt weiter Suffix "· hochgestuft" (harmlos, Brief nennt es nicht)
- Task 1: zurückgestellt: followup.js:120 entfernt noch Suffix "· hochgestuft" (toter Code, harmlos)
- Task 2: zurückgestellt: 🟢 Kommentar-Anführungszeichen in document-units.js normalisiert; 🟢 unitOfQuote nimmt erste Einheit mit Zitat
- Task 3: zurückgestellt: 🟢 capped auch bei gelb/grün gefüllt; 🟢 Zweig "kein Objekt" ungetestet; Test-String-Anführungszeichen normalisiert
- Task 4: zurückgestellt: 🟡 cell/itemLine/CLOSING_QUOTE duplizieren aggregate-findings.js; 🟡 Tests für leere Gruppen/countColors fehlen
- Task 5: zurückgestellt: 🟢 Meldung „nicht geändert“ mit “…” statt „…“ (nur Text)
- Task 6: zurückgestellt: 🟢 verdictTable([]) und Skript-Urteil erledigt ungetestet
- Task 7: zurückgestellt: 🟡 fehlende/kaputte Zustandsdateien führen zu TypeError statt ERROR-Zeile (checklist/verify); 🟡 followup-checklist ungetestet (kommt in Task 17); 🟢 Commit-Message weicht ab
- Task 8: zurückgestellt: 🟢 Reset von paused bei Skill-Aufruf ungetestet
- Task 10: zurückgestellt: 🟢 Test prüft Kategorie im JSON-Beispiel nicht
- Task 11: zurückgestellt: 🟡 kein Test sichert Punkt 3 „Andere Schwächen meldest du nicht“ ab
- Task 12: zurückgestellt: 🟢 Regel 11 knapp (R-Eintrag je Stelle); 🟢 Antwort-Modus-Test nur Teilstrings
- Task 17: zurückgestellt: 🟡 review-followup/SKILL.md letzter Satz nennt noch „Reviewer der Nach-Review-Runde“; 🟢 Implementierungs-Teil nutzt weiter „Nach-Review“
- Task 18: zurückgestellt: 🟢 cli_BadArguments prüft --rounds redundant

## Stand
- Stand: 226a798
- Gesamtlauf: 988fb18 grün (672 Tests)
