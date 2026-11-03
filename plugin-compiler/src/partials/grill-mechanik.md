## Grill-Mechanik

Quelle: `forge/skills/spec-whiteboarding/references/grill-rounds.md`. Eine [[Grill-Runde]] ist eine Nachricht mit der kompletten [[Frontier]]. Danach antwortet der Mensch frei in Text, kein Auswahl-Dialog wie `AskUserQuestion`.

Format je Frage:

```
❓ **Q<n>** - **<Titel>**: <Frage, mit Optionen falls vorhanden>

➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
```

1. Die Nummern laufen über alle Runden fort.
2. Optionen stehen knapp in der Frage. TODO(forge/skills/spec-whiteboarding/references/grill-rounds.md): Die Quelle sagt „falls sinnvoll“ und nennt kein Kriterium.
3. Eine unverändert offene Frage aus früherer Runde wiederholst du verkürzt als `Q<n> <Titel> — <Empfehlung>`; ausgeschrieben nur, wenn sich die Lage geändert hat.
4. Ändert der Mensch den Umfang, stellst du die Frontier komplett neu auf; jede ersetzte Frage steht als `Q<n> entfällt, ersetzt durch Q<m>`.
5. Genau eine Empfehlung pro Frage, der Grund ausgeschrieben. Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung, etwa „Vermutung: kleinster Scope“.
6. Was du selbst entscheidest, steht im Block `Selbst entschieden` vor der ersten Frage, nicht als Frage: `- <Kurztitel>: <Entscheidung> · <Beleg-Tag> — <Grund>`.
7. Fakten und selbst Entschiedenes sind keine Fragen. Schließt ein bekannter Fakt Optionen aus, bietest du sie nicht an.
8. Beantwortet der Mensch eine Frage nicht eindeutig, fragst du in einem Satz nach, bevor du einen [[W-Eintrag]] buchst.
