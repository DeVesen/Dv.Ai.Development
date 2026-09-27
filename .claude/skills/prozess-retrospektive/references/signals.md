# Signale

Zwei Blickrichtungen: **Reibung** (was hakte) und **Sparpotenzial** (was kostete mehr als nötig). Beim Sparpotenzial zählt nicht nur, was es schon gibt: Wiederkehrende Handarbeit ist ein Kandidat für etwas **Neues**.

## Reibung

| Signal | Typische Ursache |
|---|---|
| Subagent mit vielen neuen Tokens für kleine Aufgabe | zu breiter Auftrag, falsches Modell, fehlende Vorauswahl |
| Tool-Fehler oder blockierter Aufruf, danach Umweg | Hook zu streng, Regel fehlt im Skill, falsches Werkzeug |
| gleicher Aufruf direkt wiederholt | unklares Ergebnis, fehlende Prüfung |
| Rückfrage oder Korrektur durch den Menschen | Missverständnis, fehlende Vorgabe in `CLAUDE.md` oder Skill |
| MCP erwartet, aber 0 Aufrufe | für diese Arbeit verzichtbar oder übersehen; im Bericht je MCP entscheiden |
| Shell-Fallback-Kandidat (`dotnet`, `ng`, `npm` über Bash) | vorgesehener Weg umgangen: Hook fehlt, Skill-Regel zu weich oder Werkzeug nicht erreichbar |
| Zusammenfassung des Kontexts | zu viel Text im Hauptkontext statt in Dateien |
| Skill geladen, aber nicht befolgt | Regel zu weich, Form passt nicht zum Fehler |

## Sparpotenzial

| Signal (Abschnitt „Sparpotenzial“ im Skript) | Mögliche Lösung |
|---|---|
| großes Tool-Ergebnis, das nur zum Teil gebraucht wurde | gefiltertes Skript, gezieltes Lese-Tool, Ausgabe in Datei statt Kontext |
| dieselbe Datei mehrfach gelesen | Zusammenfassung in Datei, Lese-Tool für Ausschnitte, Übergabe an Subagent als Datei |
| wiederkehrender Shell-Befehl oder Befehlsfolge | eigenes Skript, Hook zum festen Zeitpunkt |
| gleiche Abfolge von Schritten in jeder Session | Skill, der die Abfolge festlegt, oder Skript, das sie ausführt |
| Modell sucht, rät oder rechnet, was deterministisch ist | Skript oder MCP-Tool statt Modellarbeit |
| teures Modell für einfache Arbeit | Subagent mit kleinerem Modell |
| Mensch wartet auf etwas, das parallel laufen könnte | Hintergrund-Aufgabe, parallele Subagents |

**Maßstab:** Spart es Zeit, Tokens oder Geld, ohne dass der Ersatz teurer ist? Geld folgt aus den Tokens; einen Betrag nennst du nur mit bekanntem Preis, sonst mit ` · Eindruck`.
