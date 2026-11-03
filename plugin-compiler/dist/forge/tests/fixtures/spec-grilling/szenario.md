# Szenario spec-grilling rot/grün

Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer. Beide Läufe mit dem Tool `Agent`, `subagent_type: "general-purpose"`, `model: "sonnet"`, je mit einer frischen Kopie von `plugins/forge/tests/fixtures/spec-grilling/spec.md`. Arbeitsordner ist die Checkout-Wurzel `<R>`.

## Kopie anlegen
Befehl: `node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'grill-'));fs.copyFileSync('plugins/forge/tests/fixtures/spec-grilling/spec.md',p.join(d,'spec.md'));console.log(p.join(d,'spec.md'))"` — Ausgabe: Pfad der Kopie, im roten Lauf `<KOPIE>`, im grünen `<KOPIE2>`.

## Rot: ohne Skill
`description: "Spec grillen ohne Skill"`, `prompt`:
```text
Grille die Spec <KOPIE> auf Grenzfälle, Widersprüche und Lücken. Stell mir die erste Runde Fragen. Meine Antwort auf eine Frage zur leeren Kundenliste lautet schon jetzt: "Bei leerer Liste ein Hinweistext statt einer Datei." Zeig, was du daraufhin an der Spec änderst. Antworte nur mit den Fragen und der Änderung.
```
Ergebnis wörtlich notieren. Erwartet (rot): mindestens eins von beidem, eine Frage nach dem Export-Format (CSV/Excel) oder eine Änderung ohne Vorher/Nachher bzw. direkt in die Datei geschrieben. Tritt keins auf, nennt der Abschluss der Umsetzung das als `Szenario ohne Skill ohne Fehlschlag`.

## Grün: mit Skill
Neue Kopie `<KOPIE2>`. `description: "Spec grillen mit Skill"`, `prompt`:
```text
Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau; <PLUGIN> ist <R>/plugins/forge. Argument: <KOPIE2>. Stell mir die erste Runde Fragen. Meine Antwort auf eine Frage zur leeren Kundenliste lautet schon jetzt: "Bei leerer Liste ein Hinweistext statt einer Datei." Zeig, was du daraufhin an der Spec änderst, und schreib nichts, solange ich es nicht bestätigt habe.
```
Erwartet (grün): keine Frage zum Export-Format; die Änderung erscheint mit Abschnitt, Vorher und Nachher; die neue Entscheidung als `- **W · … ** · Aussage — …`. Befehl: `git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling/spec.md <KOPIE2>` — erwartet: Exit 0 (Datei unverändert).

## Lücke schließen
Fragt der Agent im grünen Lauf doch nach dem Format oder schreibt er ohne Bestätigung: die Ausrede wörtlich als Zeile in die Tabelle `Rote Flaggen` von `plugins/forge/skills/spec-grilling/SKILL.md`, Commit `git commit -m "fix(forge): close a spec-grilling loophole" -- plugins/forge/skills/spec-grilling/SKILL.md`, grünen Lauf wiederholen.
