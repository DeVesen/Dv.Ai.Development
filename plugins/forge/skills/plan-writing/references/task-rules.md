# Task-Regeln

## Dateistruktur zuerst

Bevor du den ersten Task schreibst, listest du jede Datei, die entsteht oder sich ändert, mit ihrer Verantwortung. Hier fallen die Zerlegungsentscheidungen — die Tasks folgen daraus.

- Jede Datei hat eine klare Verantwortung und eine schmale, gut beschriebene Schnittstelle.
- Kleine, fokussierte Dateien statt großer Alleskönner. Verlässlich ändern lässt sich nur, was man als Ganzes im Kopf behält — für dich wie für den Umsetzer.
- Was sich gemeinsam ändert, liegt zusammen. Geschnitten wird nach Verantwortung, nicht nach technischer Schicht.
- Im bestehenden Code gelten die vorhandenen Muster. Du baust nicht eigenmächtig um. Ist eine Datei, die du ohnehin änderst, unhandlich geworden, darf der Plan ihre Teilung enthalten.

Jeder Task liefert danach eine Änderung, die für sich einen Sinn ergibt.

## Zuschnitt eines Tasks

Ein Task ist die kleinste Einheit mit eigenem Testzyklus, die einen eigenen Review wert ist.

- Setup, Konfiguration, Gerüst und Doku gehören in den Task, dessen Ergebnis sie braucht — nicht in eigene Tasks.
- Du teilst nur dort, wo ein Reviewer den einen Task ablehnen und den Nachbarn trotzdem annehmen könnte.
- Jeder Task endet mit einem Ergebnis, das sich unabhängig prüfen lässt.

## Schrittgröße

Ein Schritt ist genau eine Aktion von 2–5 Minuten. Der Zyklus pro Task:

1. fehlschlagenden Test schreiben
2. Test laufen lassen und den Fehlschlag bestätigen
3. minimalen Code schreiben, der den Test grün macht
4. Test laufen lassen und den Erfolg bestätigen
5. committen

## Verbotene Platzhalter

Jeder Schritt enthält den tatsächlichen Inhalt, den der Umsetzer braucht. Diese Muster sind Plan-Fehler — du schreibst sie nie:

- „TBD“, „TODO“, „später umsetzen“, „Details ergänzen“
- „passende Fehlerbehandlung ergänzen“, „Validierung hinzufügen“, „Randfälle behandeln“
- „Tests für das Obige schreiben“ ohne den Testcode selbst
- „wie Task N“ oder „analog zu Task N“ — du wiederholst den Code, weil der Umsetzer Tasks womöglich außer der Reihe liest
- Schritte, die sagen, was zu tun ist, ohne zu zeigen, wie — ein Code-Schritt braucht einen Code-Block
- Verweise auf Typen, Funktionen oder Methoden, die in keinem Task definiert sind und im Code nicht existieren
