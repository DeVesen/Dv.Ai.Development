# Prozess-Retrospektive: schlank und genauer

Status: bestätigt am 2026-09-29
Art: frei
Basis: 3ce509e

## Was, wie, wo, warum

Die Prozess-Retrospektive von dv-forge wertet eine Claude-Code-Session aus und schreibt daraus einen Erfahrungsbericht mit Verbesserungswünschen für Plugins, Skills, Hooks, Skripte, MCP-Server und die Arbeitsweise. Die Idee bleibt unangetastet; sie soll besser werden und vor allem deutlich weniger Tokens verbrauchen. · Aussage

Der größte Kostentreiber ist nicht die Textmenge, sondern die Zahl der Modell-Anfragen mal der Kontextgröße. Am Ende einer langen Session liest jede Anfrage rund 263k Tokens aus dem Cache mit. Der bisherige Ablauf mit Berichtsgerüst, Lesen des Gerüsts und mehreren Änderungen darin braucht mindestens 6, realistisch 8 bis 12 Anfragen; ein Ablauf ohne Gerüst kam mit 3 bis 5 aus. · Aussage

Deshalb wandert alles Deterministische aus dem Modell in Skripte: Messen, Rechnen, Prüfen, Zusammensetzen, Benennen. Das Modell liefert nur noch Urteil und Text. Zugleich werden Zählfehler behoben, die die Zahlen im Bericht verfälschen, und neue Messwerte machen Kosten sichtbar, die heute niemand sieht, etwa die Grundlast jeder Anfrage, die Kontextlast großer Ergebnisse und Cache-Neuaufbauten nach Pausen. · Aussage

## Theoretisches Verhalten nach Umsetzung

Der Mensch ruft die Retrospektive per Slash-Befehl auf, optional mit einer anderen Protokolldatei oder für einen Ausschnitt ab einem Befehl. Noch bevor das Modell die Anweisung liest, stehen darin die Fakten der Session und das Berichtsformat. Die Retrospektive selbst ist aus den Zahlen herausgeschnitten. · Aussage

Die Fakten nennen neben den bisherigen Zahlen die echten Eingaben des Menschen mit Eintragsnummer, aktive Zeit und Wartezeit, den Kontext je Anfrage, die Grundlast der ersten Anfrage, Cache-Neuaufbauten, die größte Kontextlast, lange Tool-Läufe, gleiche Läufe ohne Änderung dazwischen und die Harness-Hinweise. Zu jedem gemessenen Signal, das anschlägt, steht eine mögliche Ursache dabei. · Aussage

Einzelne Stellen liest das Modell über eine kurze Zeitleiste nach, nie per Textsuche im Rohprotokoll. Es schreibt nur einen Entwurf. Ein Skript prüft ihn, setzt daraus den Bericht zusammen, wählt den Dateinamen und liefert die Kurzfassung für den Chat, die Kosten der Retrospektive selbst und einen Vorschlag für die Workitem-Nummer. Die Retrospektive braucht so 2 bis 3 Modell-Anfragen. · Aussage

Ein weiteres Skript sortiert alle Berichte nach Ziel vor und zählt die MCP-Relevanz, damit das Zusammenführen zur Wunschliste weniger Modellarbeit braucht. · Aussage

## Soll-Vorgaben

- Der Skill lädt sich nie von selbst; seine Beschreibung belastet keine Session. · Aussage
- Die Berichte behalten den Aufbau der bisherigen Berichte: Kopf, Zahlen, MCP-Nutzung, Relevanz, Positiv, Reibung, Sparpotenzial, Neue Ideen, Kleinigkeiten. · Aussage
- Zahlen im Bericht stammen aus den Skripten; das Modell schreibt keine Zahlen ab. · Aussage
- Die feste Schwelle „ab rund 200k Kontext eine frische Session“ entfällt, weil der Nutzen von Preis und Cache-Laufzeit abhängt. · Aussage
- Nicht Teil der Umsetzung: die Retrospektive der eigenen Session in einen Subagent verlegen und für die Retrospektive auf ein kleineres Modell wechseln. · Aussage

## Akzeptanzkriterien

- **AC-01** Gegeben eine Session, in der ein Skill geladen wurde und eine Zusammenfassung stattfand, wenn die Fakten ermittelt werden, dann zählen weder der eingeblendete Skill-Text noch die Zusammenfassung als Eingabe des Menschen. · Aussage
- **AC-02** Gegeben eine Session mit mindestens einer Modell-Anfrage, wenn die Fakten ermittelt werden, dann enthalten sie die Zeile „Kontext je Anfrage: Ø <n>k, größte <n>k“. · Aussage
- **AC-03** Gegeben ein Aufruf mit Protokolldatei und zusätzlich einer Session-Kennung, wenn die Fakten ermittelt werden, dann wertet das Skript die Protokolldatei aus. · Aussage
- **AC-04** Gegeben ein Aufruf im fehlerverzeihenden Modus und eine nicht auffindbare Session, wenn die Fakten ermittelt werden, dann lautet die Ausgabe „Fakten nicht verfügbar: <Grund>“ und das Skript endet ohne Fehlercode. · Aussage
- **AC-05** Gegeben eine Session, in der die Retrospektive aufgerufen wurde, wenn die Fakten bis vor den letzten Aufruf der Retrospektive angefordert werden, dann zählen Anfragen, Tool-Aufrufe und Subagents ab diesem Aufruf nicht mit und die Fakten nennen den Schnitt; ohne einen solchen Aufruf bleibt die Session ganz. · Aussage
- **AC-06** Gegeben die Projekt-Einstellungen nennen erwartete MCP-Server, wenn die Fakten ermittelt werden, dann erscheint jeder davon, der ungenutzt blieb, als „erwartet, ungenutzt“, ohne dass der Aufruf ihn nennt, und die Einrichtungs-Anleitung von dv-forge führt die neue Einstellung. · Aussage
- **AC-07** Gegeben mindestens ein erwarteter MCP-Server blieb ungenutzt, wenn die MCP-Nutzung ausgegeben wird, dann nennt sie als Ersatz-Kandidaten die Zahl der Read-, Grep- und Glob-Aufrufe und der Shell-Fallbacks; wurden alle erwarteten genutzt, fehlt diese Zeile. · Aussage
- **AC-08** Gegeben eine Session, wenn die Fakten ermittelt werden, dann listen sie jede Eingabe, Unterbrechung und Ablehnung des Menschen mit Eintragsnummer, Uhrzeit und gekürztem Text; Slash-Befehle erscheinen als „/name Argumente“. · Aussage
- **AC-09** Gegeben eine Session mit Zeitstempeln, wenn die Fakten ermittelt werden, dann nennen sie aktive Minuten, Minuten des Wartens auf den Menschen, die längste Strecke ohne Text an den Menschen und die eingeblendeten Harness-Hinweise nach Art. · Aussage
- **AC-10** Gegeben eine Session, wenn die Fakten ermittelt werden, dann nennen sie den Kontext der ersten Anfrage mit den drei größten Anhängen davor sowie jeden Cache-Neuaufbau mit Uhrzeit und Pause davor, sonst „keiner“; als Neuaufbau zählt eine Anfrage, die mindestens 20k Tokens neu schreibt und weniger als die Hälfte des vorigen Kontexts aus dem Cache liest. · Aussage
- **AC-11** Gegeben Tool-Ergebnisse und eingeblendete Skill-Texte, wenn die Fakten ermittelt werden, dann listen sie die fünf größten Kontextlasten ab 1k Tokens als Größe mal Zahl der folgenden Anfragen, jeweils mit dem auslösenden Aufruf. · Aussage
- **AC-12** Gegeben Tool-Läufe mit Zeitstempeln, wenn die Fakten ermittelt werden, dann listen sie Läufe ab 60 Sekunden und jeden Build-, Test- oder Lint-Befehl, der ohne Dateiänderung dazwischen erneut lief; lange Befehle mit gleichem Anfang zählen nicht als gleich. · Aussage
- **AC-13** Gegeben gemessene Signale schlagen an, wenn die Fakten ausgegeben werden, dann steht unter „Hinweise zu den Signalen“ je angeschlagenem Signal genau eine Zeile mit möglicher Ursache oder Lösung; schlägt keines an, steht dort „keine Messwert-Signale“. · Aussage
- **AC-14** Gegeben die Fakten werden mit Snapshot angefordert, wenn das Skript endet, dann liegt außerhalb des Projekts eine Snapshot-Datei mit Zahlen, MCP-Nutzung, Schnittzeitpunkt, Branch, Spec-Pfaden und erwarteten MCP-Servern, und die Ausgabe nennt Snapshot und Entwurfspfad; ein Berichtsgerüst mit Platzhaltern entsteht nicht mehr. · Aussage
- **AC-15** Gegeben ein Entwurf, dem ein Pflichtabschnitt oder ein Pflichtfeld fehlt, dessen Ziel-Zeile keiner der drei Formen folgt, dessen Kosten oder Ersparnis weder Zahl noch „· Eindruck“ trägt, der für ein erwartetes MCP keine Relevanz-Zeile hat, der einen Dateinamen des Projekts außerhalb von „Im Projekt“ nennt oder dort ein Zitat trägt, das nicht im Protokoll steht, wenn der Bericht erzeugt werden soll, dann meldet das Skript jeden Verstoß einzeln, schreibt keine Berichtsdatei und endet mit Fehlercode. · Aussage
- **AC-16** Gegeben ein regelkonformer Entwurf und ein Snapshot, wenn der Bericht erzeugt wird, dann entsteht im Berichtsordner die Datei „<Datum>-<Thema>.md“, bei Kollision mit „-2“, „-3“ und so weiter; sie enthält den Kopf mit Modell, Skills und Datum, Zahlen und MCP-Nutzung aus dem Snapshot, die Abschnitte des Entwurfs und unter „Neue Ideen“ jedes neu:-Ziel, und der Entwurf ist danach gelöscht. · Aussage
- **AC-17** Gegeben der Bericht wurde geschrieben, wenn das Skript endet, dann nennt es Pfad, „Prüfung: 0 Verstöße“, die Zahl der Befunde, die ersten drei Kurzbefunde je Abschnitt, Anfragen und Tokens der Retrospektive selbst, einen Workitem-Kandidaten und den Befehl zum Vormerken der Datei für den Commit; der Kandidat kommt zuerst aus der Spec der Session, sonst aus dem Branch, sonst lautet er „keiner“. · Aussage
- **AC-18** Gegeben das Berichtsformat wird angefordert, wenn das Skript läuft, dann gibt es die Formatbeschreibung des Skills unverändert aus. · Aussage
- **AC-19** Gegeben ein Thema mit Großbuchstaben oder Leerzeichen, wenn der Bericht erzeugt werden soll, dann bricht das Skript mit Aufrufhinweis ab; fehlt der Entwurf, nennt die Meldung seinen Pfad. · Aussage
- **AC-20** Gegeben eine Session, wenn die Zeitleiste angefordert wird, dann erscheint je Eingabe, Text, Tool-Aufruf, Fehler und Zusammenfassung eine gekürzte Zeile mit Eintragsnummer und Uhrzeit; mit einer Eintragsnummer erscheinen dieser Eintrag und seine Nachbarn im Detail, und eine Nummer außerhalb des Protokolls wird gemeldet. · Aussage
- **AC-21** Gegeben mehrere Berichte im Berichtsordner, wenn die Vorsortierung läuft, dann erscheinen die Befunde nach Ziel gruppiert, größte Gruppe zuerst, und eine Tabelle zählt je MCP „gebraucht“, „hätte genützt“, „verzichtbar“ und „sonstig“; die konsolidierte Wunschliste und Entwürfe zählen nicht mit. · Aussage
- **AC-22** Gegeben der Mensch ruft die Retrospektive per Slash-Befehl auf, wenn der Skill lädt, dann stehen Fakten und Berichtsformat bereits im Skill-Text, die drei Skripte laufen ohne Berechtigungsfrage, und das Modell lädt den Skill nie von selbst. · Aussage
- **AC-23** Gegeben der Skill-Text, wenn ein Mensch ihn liest, dann nennt er die Zeitleiste statt einer Textsuche, Entwurf plus Skriptaufruf statt Gerüst, die fünf Urteils-Signale und die Commit-Regel mit Workitem-Kandidat, enthält keine feste Kontextschwelle und keine Referenz außer dem Berichtsformat, und die Projektbeschreibung nennt den neuen Aufruf. · Aussage

## Entscheidungen

- **W · Umfang** · Aussage — Alle Verbesserungsvorschläge und Korrekturen aus der Prüfung des Skills werden zusammengefasst und in einem Umsetzungsplan umgesetzt.
- **W · Nur manueller Aufruf** · Aussage — Der Skill wird nur noch per Slash-Befehl aufgerufen; Auslöser in natürlicher Sprache wie „wie lief das“ entfallen.
- **W · Entwurf plus Skriptaufruf** · Aussage — Das Modell schreibt einen Entwurf, ein Skript setzt daraus den Bericht zusammen; eine Shell-Umleitung direkt ins Skript spart eine Anfrage, geht aber nur in Bash.
- **W · Kein Subagent, kein Modellwechsel** · Aussage — Beides wird nicht umgesetzt: ein frischer Kontext oder ein anderes Modell schreibt den Kontext neu in den Cache und spart bei 2 bis 3 Anfragen nichts.
