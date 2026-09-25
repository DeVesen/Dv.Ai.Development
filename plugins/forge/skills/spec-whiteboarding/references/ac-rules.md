# Regeln für Akzeptanzkriterien

## Form

`- **AC-<NN>** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.`

- **Gegeben:** der Zustand vor der Aktion, konkret genug, um ihn herzustellen.
- **Wenn:** genau eine Aktion eines Anwenders oder des Systems.
- **Dann:** ein Ergebnis, das jemand ohne Blick in den Code sehen oder messen kann.

## Prüfbar

- Ein AC ist prüfbar, wenn zwei Personen unabhängig voneinander zum selben Urteil „erfüllt" oder „nicht erfüllt" kommen.
- Zahlen, Grenzen und Texte stehen im AC, wenn das Ergebnis von ihnen abhängt.
- Verboten: „funktioniert korrekt", „ist möglich", „sollte", „idealerweise". Ebenso Maßwörter ohne Maß wie „schnell" oder „benutzerfreundlich".

## Abdeckung

- Jedes beschriebene Verhalten hat mindestens ein AC.
- Mindestens ein Negativ- oder Randfall, wenn fachlich relevant: ungültige Eingabe, fehlende Berechtigung, leere Menge, Grenzwert.
- Ein AC beschreibt, WAS geschieht, nicht WIE: keine Klassen, Endpunkte, Tabellen oder Dateipfade.

## Beispiele

| Schwach | Prüfbar |
|---|---|
| Der Export funktioniert korrekt. | **AC-03** Gegeben eine Liste mit 3 Einträgen, wenn der Anwender „Exportieren" wählt, dann erhält er eine CSV-Datei mit einer Kopfzeile und 3 Datenzeilen. |
| Leere Listen sollten sinnvoll behandelt werden. | **AC-04** Gegeben eine Liste ohne Einträge, wenn der Anwender die Liste öffnet, dann ist „Exportieren" deaktiviert und ein Hinweis nennt den Grund. |
