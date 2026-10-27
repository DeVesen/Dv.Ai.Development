# Aufträge an Subagents

Alle Subagents lesen nur. Sie entscheiden nichts und schreiben nichts; du entscheidest, korrigierst das Paket und trägst ihr Ergebnis ins Prüfprotokoll ein. Jeder Auftrag nennt den ausgeschriebenen Paketpfad und die Pfade des Ziels.

## Prüf-Subagents

Höchstens vier je Lauf, Modell `sonnet`. Die Zahl der gestarteten steht im Prüfprotokoll unter `**Prüf-Subagents:**`.

### Alt-Block-Prüfung

> Lies jede Datei unter `<paketpfad>/tasks/`. Prüfe für jeden Task, ob der Block unter `## Alt` wörtlich in der genannten Datei des Ziels steht. Antworte je Task mit einer Zeile: `T-nn <datei>:<zeile> — gefunden` oder `T-nn <datei> — nicht gefunden: <nächstliegender Wortlaut>`. Ändere nichts.

### Probelauf-Prüfung

> Lies `<paketpfad>/START-PROMPT.md`, `<paketpfad>/PLAN.md` und alle Tasks. Spiele den Zielablauf nach dem Umbau trocken durch: Wer ruft wen mit welchem Format auf, wer liest das Ergebnis? Liste jede Lücke mit Stelle und Folge, oder antworte: keine Lücke. Ändere nichts.

### Nachrechnen

Nur wenn ein Erwartungswert aus Skript-Verhalten folgt, etwa die Normalisierung von Schlüsseln.

> Rechne diese Erwartungswerte am Code des Ziels nach: <liste>. Du darfst die Skripte des Ziels dafür aufrufen, aber keine Datei ändern. Antworte je Wert: Aufruf, Ausgabe, stimmt oder stimmt nicht.

## Plan-Prüfer

Je Runde ein frischer Subagent mit Modell `fable`, lesend, nur Paket und Ziel.

> Prüfe das Paket unter `<paketpfad>` gegen das Ziel unter `<zielpfade>`. Ist jeder Task ohne Suchen umsetzbar (Alt und Neu wörtlich, TDD-Schritte, Verifikation nur eigener Dateien)? Hat jedes AC einen Testnamen oder einen wörtlichen Nachweis? Passen Wellen, Checkpoints, Commits und Abbruchregeln zusammen? Stufe jede Anmerkung ein: 🔴 blockt die Umsetzung, 🟡 ist ein Hinweis, 🟢 hat keine Konsequenz. Antworte je Anmerkung mit einer Zeile: Einstufung, Stelle, Konsequenz, Vorschlag. Ändere nichts.

Nach jeder Runde arbeitest du die Anmerkungen ein und schreibst die Runde ins Prüfprotokoll: jede Anmerkung mit `→ Korrektur: <text>` oder `→ offen`.
