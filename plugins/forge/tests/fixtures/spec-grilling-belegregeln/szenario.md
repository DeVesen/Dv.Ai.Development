# Szenario spec-grilling Belegregeln rot/grün

Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer. Beide Läufe mit dem Tool `Agent`, `subagent_type: "general-purpose"`, `model: "sonnet"`, je mit einer frischen Kopie von `plugins/forge/tests/fixtures/spec-grilling-belegregeln/spec.md`. Arbeitsordner ist die Checkout-Wurzel `<R>`. Der Bestandscode liegt unter `<R>/plugins/forge/tests/fixtures/spec-grilling-belegregeln/bestand`.

## Alte Fassung sichern
Vor der ersten Änderung am Skill: in Git Bash `git archive <BASIS> plugins/forge | tar -x -C "$(cygpath -u '<ALT>')"` entpacken, `<ALT>` ist ein neuer leerer Ordner unter dem Temp-Ordner, `<BASIS>` ist der Commit-Hash aus der Startprüfung. Die alte Fassung liegt dann unter `<ALT>/plugins/forge`.

## Kopie anlegen
Befehl: `node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'grill-'));fs.copyFileSync('plugins/forge/tests/fixtures/spec-grilling-belegregeln/spec.md',p.join(d,'spec.md'));console.log(p.join(d,'spec.md'))"` — Ausgabe: Pfad der Kopie, im roten Lauf `<KOPIE>`, im grünen `<KOPIE2>`.

## Rot: alte Fassung
`description: "Spec grillen mit alter Fassung"`, `prompt`:
```text
Lies <ALT>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau; <PLUGIN> ist <ALT>/plugins/forge. Argument: <KOPIE>. Der Bestandscode der Rampentabelle liegt unter <R>/plugins/forge/tests/fixtures/spec-grilling-belegregeln/bestand; lies ihn zuerst. Frag insbesondere, was „alle übrigen Funktionen der Spalten“ für eine Spalte bedeutet, die auf % steht. Stell mir die erste Runde Fragen. Antworte nur mit der Runde.
```
Ergebnis wörtlich notieren. Erwartet (rot): mindestens eins von beidem, eine Frage nach Sortieren oder Filtern einer Spalte, die auf % steht, ohne Beleg an der Spalte, oder eine Empfehlung mit „falls … sonst …“. Tritt keins auf, nennt der Abschluss das als `Szenario alte Fassung ohne Fehlschlag`.

## Grün: neue Fassung
Neue Kopie `<KOPIE2>`. `description: "Spec grillen mit neuer Fassung"`, `prompt`:
```text
Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau; <PLUGIN> ist <R>/plugins/forge. Argument: <KOPIE2>. Der Bestandscode der Rampentabelle liegt unter <R>/plugins/forge/tests/fixtures/spec-grilling-belegregeln/bestand; lies ihn zuerst. Frag insbesondere, was „alle übrigen Funktionen der Spalten“ für eine Spalte bedeutet, die auf % steht. Stell mir die erste Runde Fragen. Antworte nur mit der Runde.
```
Erwartet (grün): keine Frage und keine Option, die Filtern oder Sortieren der Spalten Start Power und End Power als bestehendes Verhalten voraussetzt, es sei denn als „Gibt es das heute?“ oder mit Beleg `rampe-spalten.ts:<Zeile>`, der kein Filter an der Spalte zeigt; keine Empfehlung mit „falls … sonst …“; wird Sortieren oder Filtern als neues Verhalten angesprochen, dann mit der Empfehlung „nicht in diese Story“. Fragen zu anderen Lücken der Spec (etwa Bezugsgröße der Prozent) sind erlaubt und kein Verstoß. Befehl: `git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling-belegregeln/spec.md <KOPIE2>` — erwartet: Exit 0 (Datei unverändert).

## Lücke schließen
Verstößt der Agent im grünen Lauf doch gegen eine Erwartung: die Ausrede wörtlich als Zeile in die Tabelle `Rote Flaggen` von `plugins/forge/skills/spec-grilling/SKILL.md`, Wortzahl des Rumpfs bleibt unter 500, Commit `git commit -m "fix(forge): close an evidence-rule loophole in spec-grilling" -- plugins/forge/skills/spec-grilling/SKILL.md`, grünen Lauf wiederholen. Nach zwei Wiederholungen ohne Erfolg: Abschluss mit Status FERTIG MIT OFFENEN PUNKTEN, die Ausrede steht wörtlich unter Offene Punkte.
