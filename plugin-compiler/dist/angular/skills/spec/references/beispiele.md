<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/spec.yaml (examples) -->

# Beispiele: Spec

## Akzeptanzkriterien, schwach und prüfbar

Quelle: forge/skills/spec-whiteboarding/references/ac-rules.md (Beispiele)

| Schwach | Prüfbar |
|---|---|
| Der Export funktioniert korrekt. | **AC-03** Gegeben eine Liste mit 3 Einträgen, wenn der Anwender „Exportieren“ wählt, dann erhält er eine CSV-Datei mit einer Kopfzeile und 3 Datenzeilen. |
| Leere Listen werden „sinnvoll“ behandelt. | **AC-04** Gegeben eine Liste ohne Einträge, wenn der Anwender die Liste öffnet, dann ist „Exportieren“ deaktiviert und ein Hinweis nennt den Grund. |
## Eine Grill-Runde

Quelle: forge/skills/spec-whiteboarding/references/grill-rounds.md (Beispiel)

```
Selbst entschieden:
- Export-Format: CSV · Aussage — „wir brauchen das nur für den Import ins Altsystem“; das Altsystem liest CSV.

❓ **Q4** - **Leere Liste**: Was zeigt die Übersicht ohne Einträge? a) Hinweistext b) leere Tabelle c) Sprung zum Anlegen

➡️ a) Hinweistext · ungeklärt — Vermutung: gängigster Fall; der Anwender sieht sofort, dass nichts fehlt.
```
