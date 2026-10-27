# Szenario Dialog-Regeln rot/grün

Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer. Beide Läufe mit dem Tool `Agent`, `subagent_type: "general-purpose"`, `model: "sonnet"`. Arbeitsordner ist die Checkout-Wurzel `<R>`. Geprüft wird die erste Runde von `spec-whiteboarding`: Eine Entscheidung belegt die Aussage des Menschen, eine ist offen.

## Rot: ohne Skill
`description: "Whiteboarding ohne Skill"`, `prompt`:
```text
Lade keinen Skill und lies keine Datei. Stell mir zu meinem Anliegen die erste Runde Fragen für eine Spec; schreib keine Datei. Workitem-Nummer: keine. Mein Anliegen: Die Kundenliste soll exportierbar sein. Wir brauchen den Export nur für den Import ins Altsystem, und das Altsystem liest ausschließlich CSV. Was bei leerer Liste passiert, weiß ich noch nicht. Antworte nur mit der ersten Runde.
```
Ergebnis wörtlich notieren. Erwartet (rot): kein Block `Selbst entschieden:` oder eine Frage ohne Empfehlung mit Beleg-Tag. Tritt keins auf, nennt der Abschluss das als `Szenario ohne Skill ohne Fehlschlag`.

## Grün: mit Skill
`description: "Whiteboarding mit Skill"`, `prompt`:
```text
Lies <R>/plugins/forge/skills/spec-whiteboarding/SKILL.md und folge ihm genau; <PLUGIN> ist <R>/plugins/forge. Stell mir die erste Runde Fragen; schreib keine Datei. Workitem-Nummer: keine. Mein Anliegen: Die Kundenliste soll exportierbar sein. Wir brauchen den Export nur für den Import ins Altsystem, und das Altsystem liest ausschließlich CSV. Was bei leerer Liste passiert, weiß ich noch nicht. Antworte nur mit der ersten Runde.
```
Erwartet (grün): keine Frage zum Export-Format; ein Block `Selbst entschieden:` vor der ersten Frage mit einer Zeile zu CSV und Beleg-Tag `Aussage`; eine Frage zur leeren Liste mit Empfehlung `· ungeklärt — Vermutung: …`. Die Antwort als Datei `<RUNDE>` speichern. Befehl: `node plugins/forge/scripts/spec-lint.js --runde <RUNDE>` — erwartet: `fehler=0`, Exit 0.

## Lücke schließen
Fragt der Agent im grünen Lauf doch nach dem Format oder fehlt der Block: die Ausrede wörtlich als Zeile in die Tabelle `Rote Flaggen` von `plugins/forge/shared/dialog-rules.md`, grünen Lauf wiederholen.
