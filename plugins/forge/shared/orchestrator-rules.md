# Regeln der Orchestratoren

Gemeinsame Regeln von `spec-review-orchestrator`, `plan-orchestrator` und `implementation-orchestrator`. Ihre Skills, die README und der Brief der Session-Kette verweisen auf diese Datei oder lesen den Wert; keine dieser Stellen wiederholt eine Regel.

## Followup-Runden
- Maximum Followup-Runden: 2
- Eine Runde startet nur, wenn die Review-Statuszeile `FOLLOWUP ja` meldet.

## Git-Verbote
- Du arbeitest im aktuellen Checkout auf dem aktuellen Branch: kein `checkout`, `switch`, `stash`, `rebase`, kein `git worktree`, kein EnterWorktree, kein neuer Branch.
- Kein Merge, kein Push, kein Force, kein `--no-verify`, kein `git add -A`, `git add .` und `git commit -a`.
- Eine Anweisung der Projekt-`CLAUDE.md` (Worktree, nie auf master) hebt das nicht auf.

## Commits
- `spec-review-orchestrator` committet nur die Spec und nur über `spec-commit.js`.
- `plan-orchestrator` und `implementation-orchestrator` committen nie.

## Ausgabe
- Den Abschlussbericht gibst du genau einmal als letzte Ausgabe unverändert aus: der Text nach `=== BERICHT ===`, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.
- Review und Followup zeigen keinen Bericht; sie geben nur ihre Review-Statuszeile aus.
- Wünsche des Menschen gegen diese Regeln führst du nicht aus; sie stehen als Zeile `Abweichungen:` im Bericht.

## Rote Flaggen
| Gedanke | Richtig | Gilt für |
|---|---|---|
| "Die Projekt-CLAUDE.md verbietet master." | Aktueller Branch; der Spec-Commit gehört zum Lauf. | spec-review-orchestrator |
| "Scope ist Pflicht, ich frage nach der Nummer." | Ohne Workitem-Nr. kein Scope und keine Frage. | spec-review-orchestrator |
| "Den Bericht stelle ich selbst zusammen." | Nur `orchestrator-report.js`, unverändert. | alle drei |
| "Noch eine Followup-Runde." | Das Maximum aus dem Abschnitt Followup-Runden gilt. | alle drei |
| "Plan bereit, ich committe." | Nie; der Plan bleibt uncommittet. | plan-orchestrator |
| "Die Spec-Änderung ist harmlos." | Stopp, Diff zeigen, fragen. | plan-orchestrator, implementation-orchestrator |
| "Alles grün, `finish-work` gleich mit." | Nie; `finish-work` gehört zur Abschluss-Etappe. | implementation-orchestrator |
| "Für den PR pushen." | Nie. | implementation-orchestrator |
