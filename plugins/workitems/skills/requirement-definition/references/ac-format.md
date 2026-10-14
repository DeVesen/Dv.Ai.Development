# AC-Format

Akzeptanzkriterien auf **Nutzerebene**: was ein Nutzer tut und sieht. Keine Technik, kein Testname,
kein Bestandsabgleich. Das gehoert in die Detailspezifikation eines Steps.

## Form

Ein Kriterium pro Zeile, mit durchgehender ID `AC-nn` (zweistellig, lueckenlos ab `AC-01` ueber Requirement
und alle Steps):

```
AC-01 Gegeben <Vorbedingung>, wenn <Aktion>, dann <sichtbares Ergebnis>.
AC-02 (Negativ) Gegeben <Vorbedingung>, wenn <ungueltige Aktion>, dann <sichtbare Abweisung>.
```

- Genau ein Verhalten pro Kriterium.
- Das Format passt zur Definition of Ready (`AC-xx` mit Gegeben/Wenn/Dann), der Lint der DoR erkennt die Kriterien.
- Mindestens so viele Negativ-Kriterien, wie `limits.json` verlangt.
- Das Ergebnis ist auf der Oberflaeche oder im Ablauf sichtbar, nicht in einer Datenbank.

## Beispiel (Eingabefeld Nachname)

```
AC-01 Gegeben das Formular ist offen, wenn ich "Meier" eingebe, dann zeigt das Feld "Meier".
AC-02 (Negativ) Gegeben das Formular ist offen, wenn ich das Feld leer lasse und speichere, dann erscheint eine Meldung, dass der Nachname fehlt.
```

## Rueckfragen

Ist ein Kriterium nicht ohne Information schaerfbar: Frage stellen und **warten**, nichts annehmen.
