# Umsetzung — Plan: docs/forge/2026-09-30-stack-toolchain-skills/plan.md

## Abschlussbericht
# Abschlussbericht — stack-toolchain-skills

Bereich: forge-base/2026-09-30-stack-toolchain-skills..HEAD (f54153e..0ada8a8)
Tasks: 16 von 16 fertig, alle Task-Reviews sauber, kein Fix-Zyklus nötig. Final-Review: sauber (opus).
Gesamtlauf: forge 913, dotnet 81 + 6 erwartete Windows-Skips, angular 88 — alle grün (belegt von Umsetzer Task 15).
Windows-Prüfung AC-10: bestanden (Task 1 und Task 7).

## Urteile
Urteil: Task-Review 6 und 12 (Hook, Befehlserkennung per Regex) mit opus statt sonnet — Hook-Verträge sind heikel — kostet nur Review-Tokens, falls unnötig
Urteil: Briefe der Tasks 14-16 werden vom installierten Plugin (Cache 0.17.0) noch mit der alten Auflösung erzeugt; Schreibweisen `dv-forge: <stack>-<kommando>` in Briefen können als Cache-Pfade erscheinen — Umsetzer bekommt Hinweis unter Kontext, Plan-Text ist maßgeblich — kostet Fehlinterpretation in Task 14-16, falls Hinweis fehlt
Urteil: Briefe 14-16 mit plugins/forge/scripts/plan-tasks.js (Repo, nach Task 13 ohne Auflösung) statt Cache-Version erzeugt — Cache-0.17.0 hätte Plan-Text 'dv-forge: <stack>-<kommando>' in Cache-Pfade umgeschrieben und Tests/Fixtures verfälscht — kostet nichts außer Abweichung vom Standardaufruf, falls Repo-Skript anders formatiert (Ausgabe geprüft: gleich)
Urteil: Final 🟡 retro-measures.js nicht in Fix-Welle — Regel final-review.md sieht Fix nur für 🔴 oder `beheben` vor; Lücke liegt im Plan, nicht im Diff — kostet: Retro-Messung idleReruns übersieht die neuen Befehle, bis nachgezogen

## Offene Punkte
- 🟡 plugins/forge/scripts/lib/retro-measures.js:155 TOOLCHAIN_SCRIPT erkennt dv-dotnet-test / dv-angular-build nicht (Plan-Lücke). Fix: Präfix `dv-` zulassen, Test in retro-measures.test.js ergänzen.
- 🟡 plugins/relay/skills/relay-using-git-worktrees/SKILL.md:157 und relay-finishing-a-development-branch/SKILL.md:46 sowie docs/offene-aufgaben.md (Z. 26, 71) verweisen auf entfernte forge-Toolchain-Skripte (plan-seitig ausgeklammert).
- 🟡 Abnahme in echter Sitzung: nach /plugin update Subagent `dv-dotnet-test --path …` ausführen und „baue das Backend“ testen (AC-01 bis 03, 08, 28, 29).
- 🟡 hookEnabled: kein Test für verschachtelte Schalter-Dateien (beide Plugins).
- 🟡 toolchain-guard.js: \n in Zeichenklasse = Fehlalarm bei mehrzeiliger Commit-Message; MAX_COMMAND_LENGTH ungetestet; npx ng test|lint nicht einzeln getestet; npm --prefix/npm t nicht erfasst (Spec verlangt es nicht).
- 🟢 Init-Skill: `<liste>` als kommagetrennt kennzeichnen. Weitere 🟢 siehe Ledger-Auszug.

## Urteile
- Urteil: Task-Review 6 und 12 (Hook, Befehlserkennung per Regex) mit opus statt sonnet — Hook-Verträge sind heikel — kostet nur Review-Tokens, falls unnötig
- Urteil: Briefe der Tasks 14-16 werden vom installierten Plugin (Cache 0.17.0) noch mit der alten Auflösung erzeugt; Schreibweisen `dv-forge: <stack>-<kommando>` in Briefen können als Cache-Pfade erscheinen — Umsetzer bekommt Hinweis unter Kontext, Plan-Text ist maßgeblich — kostet Fehlinterpretation in Task 14-16, falls Hinweis fehlt
- Urteil: Briefe 14-16 mit plugins/forge/scripts/plan-tasks.js (Repo, nach Task 13 ohne Auflösung) statt Cache-Version erzeugt — Cache-0.17.0 hätte Plan-Text 'dv-forge: <stack>-<kommando>' in Cache-Pfade umgeschrieben und Tests/Fixtures verfälscht — kostet nichts außer Abweichung vom Standardaufruf, falls Repo-Skript anders formatiert (Ausgabe geprüft: gleich)
- Urteil: Final 🟡 retro-measures.js nicht in Fix-Welle — Regel final-review.md sieht Fix nur für 🔴 oder `beheben` vor; Lücke liegt im Plan, nicht im Diff — kostet: Retro-Messung idleReruns übersieht die neuen Befehle, bis nachgezogen

## Zurückgestellt und geparkt
- Task 1: zurückgestellt: 🟢 run-toolchain.test.js pluginCopy räumt Temp-Ordner nicht auf (plan-vorgegeben, Politur)
- Task 2: zurückgestellt: 🟢 fake-toolchain.js Temp-Präfix `dv-forge-dotnet-` (plan-wörtlich); 🟢 Bericht ohne Rohausgabe
- Task 3: zurückgestellt: 🟢 markdown.js Frontmatter-Zeile ohne ":" ergibt Müll-Schlüssel (plan-wörtlich); 🟢 SKILL.md letzter Satz Fragment
- Task 4: zurückgestellt: 🟡 project-setup.test.js: kein Test für nächstgelegene Schalter-Datei in hookEnabled (verschachtelte Marker, {"hook":false} unten übersteuert true oben, kaputte Datei läuft nach oben weiter) — Task 10 kopiert die Datei, Test-Ergänzung wäre in beiden Plugins nötig
- Task 4: zurückgestellt: 🟢 withMcpSentence ohne CRLF-Test; 🟢 {"mcpServers": null} wird ergänzt statt ungültig
- Task 5: zurückgestellt: 🟢 parseArgs liest `--cwd --hook` als Wert, `--mcp a,a` Duplikate (harmlos); 🟢 CLI-Test hängt an git rev-parse im Temp-Ordner
- Task 6: zurückgestellt: 🟡 toolchain-guard.js:12 `\n` in Zeichenklasse: mehrzeilige quotierte Commit-Message mit `dotnet test` am Zeilenanfang wird abgelehnt (Fehlalarm, blockiert nur einen Aufruf mit Hinweis) — Task 12 kopiert das Muster
- Task 6: zurückgestellt: 🟢 Begründung nennt Lint, .NET-Hook sperrt kein Lint; 🟢 Matcher-Test prüft Ausschluss build_angular_project nicht
- Task 7: zurückgestellt: 🟢 run-toolchain.js status===null ohne Signal/Fehler -> Exit 0 (nicht erreichbar, plan-wörtlich)
- Task 8: zurückgestellt: 🟢 fake-toolchain.js Temp-Präfix `dv-forge-ng-` (plan-wörtlich)
- Task 9: zurückgestellt: 🟢 markdown.js Frontmatter-Zeile ohne ":" (plan-konform)
- Task 10: zurückgestellt: 🟢 Bericht mit ungenauen Zeilenzahlen/AC-Zuordnung; 🟢 Commit-Trailer "Claude Haiku 4.5" statt Sonnet 5.5 (Umsetzer-Modell, harmlos)
- Task 11: zurückgestellt: 🟢 skill-init.test.js prüft `/von Hand/` nur als Schlagwort (aus Brief)
- Task 12: zurückgestellt: 🟡 angular toolchain-guard.js:21 MAX_COMMAND_LENGTH=120 ohne Test (gilt auch für dotnet-Guard); 🟡 Tests prüfen `npx ng test|lint` nicht einzeln (nur build); 🟡 (außerhalb Scope) `npm --prefix web test`, `npm t` nicht erfasst (Spec verlangt es nicht)
- Task 12: zurückgestellt: 🟢 Test wiederholt Fälle; 🟢 Temp-Ordner nicht aufgeräumt
- Task 13: Bedenken: Brief nennt für alte Schreibweise Plugin-Cache-Pfad in Test-Fixtures, Umsetzer nutzte echte Schreibweise 'dv-forge: dotnet-test' (sonst nie rot)
- Task 13: zurückgestellt: 🟢 writeHeader-Pfad ohne eigenen Test (trivialer Durchreich-Pfad)
- Task 14: zurückgestellt: 🟢 Kommentar zu `## dv-forge`-Skip knapp; 🟢 Bericht mit ungenauen Zeilenzahlen
- Task 15: zurückgestellt: 🟢 description mischt "<stack>-<kommando>" in englischen Satz (Brief-wörtlich)
- Task 16: zurückgestellt: 🟢 workflows.md:45 Beispiel "dv-dotnet-build OK" nur im Bash-Tool gültig (Plan-Wortlaut)

## Stand
- Stand: 0ada8a8
- Gesamtlauf: 6b580d9 grün (forge 913, dotnet 81 + 6 erwartete Skips, angular 88; laut Umsetzer Task 15)
