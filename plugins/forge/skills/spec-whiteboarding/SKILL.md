---
name: spec-whiteboarding
description: Use when a request, idea, or complaint has just been raised, nothing written down exists yet, and it should become a spec.md for the dv-forge spec review — before brainstorming, planning, or any code. Also use when acceptance criteria for a not-yet-written feature are still vague or missing. Triggers: "lass uns das durchdenken", "Whiteboard", "Spec whiteboarding", "was will ich eigentlich", "erstmal aufschreiben was ich will". Not for the technical design doc, not for the implementation plan, not for a status report on finished work.
---

# Spec Whiteboarding

Whiteboard-Sitzung: Mensch und Claude grillen ein Vorhaben, bis kein offener Punkt übrig ist. Ergebnis ist eine in sich abgeschlossene, funktionale Spec — WAS, nicht WIE —, die `/dv-forge:spec-review` ohne Anpassung prüfen kann.

## Grundhaltung — ab Aufruf, bis die Spec geschrieben und bestätigt ist

1. **Whiteboard.** Kein Code zeigen. Knapp sagen, wonach in Code, Git oder Historie gesucht wurde und was dabei herauskam. Abläufe und Vergleiche als Skizze über `visualize` (Boxen mit höchstens fünf Wörtern, höchstens zwei Farben), Text drumherum knapp.
2. **Belegpflicht.** Jede Aussage, Empfehlung und Antwort-Option trägt einen Beleg-Tag:

   | Tag | Nur wenn |
   |---|---|
   | `Aussage` | im Chat wörtlich zitierbar |
   | `Git` | aus Diff, Log oder Blame belegbar |
   | `Historie` | aus working-capturing oder Memory belegbar |
   | `Anhang` | aus Workitem, Bild oder Datei belegbar |
   | `ungeklärt` | nichts davon trifft zu |

   `ungeklärt` heißt fragen, nie raten. Im Zweifel die schwächere Stufe.
3. **Sperre.** Kein brainstorming, kein Plan, kein Code, bis die Spec geschrieben und bestätigt ist.
4. **Fakten selbst suchen.** Was Code, Git, Historie oder Anhang beantworten, wird nie beim Menschen erfragt. Fakten sind Claudes Job, Entscheidungen die des Menschen.

## Ablauf

1. **Design-Tree:** offene Punkte sammeln — Was/Wie/Wo/Warum, Verhalten danach, Soll-Vorgaben, Akzeptanzkriterien nach `references/ac-rules.md`.
2. **Runden:** je Runde die komplette Frontier im Format aus `references/grill-rounds.md`. Antworten verbuchen, Frontier neu berechnen, bis sie leer ist.
3. **Bestätigen:** Inhalt, Titel und Slug vorlegen. Erst nach ausdrücklicher Bestätigung aller drei schreiben.
4. **Zielordner prüfen:** Existiert `docs/forge/YYYY-MM-DD-<slug>/` bereits, nachfragen und einen abweichenden Slug vorschlagen. Nie überschreiben.
5. **Schreiben:** ausschließlich als Datei `docs/forge/YYYY-MM-DD-<slug>/spec.md`, Format nach `references/spec-format.md`. Eine andere Ausgabeform gibt es nicht.
6. **Übergabe:** mit genau diesen drei Punkten enden:
   - Pfad der Spec
   - kopierbarer Befehl `/dv-forge:spec-review docs/forge/<…>/spec.md`
   - Hinweis, den Review in einer frischen Session zu starten

   Kein Commit, kein automatischer Start.

## Abbruch-Regel

„Reicht jetzt“ ist noch kein Abbruch.
1. **Einmal zurückfragen:** die offenen Zweige nennen und genau einmal eine verdichtete Abschlussrunde anbieten.
2. **Zweite, informierte Ablehnung:** Erst das ist ein Abbruch. Weiter mit Bestätigen und Schreiben, im Abbruch-Format aus `references/spec-format.md`.

## Red Flags — zurück zur Frontier

- „Ich brainstorme oder plane gleich weiter“ — die Sperre gilt bis zur bestätigten Spec.
- „Diese Antwort weiß ich auch so“ — ohne Beleg-Tag ist sie `ungeklärt`.
- „Der Mensch hat genug gesagt“ — erst die zweite, informierte Ablehnung ist ein Abbruch.
- „Fragen geht schneller als suchen“ — Fakten sucht Claude selbst.
- „Erst mal nur die wichtigste Frage“ — jede Runde enthält die komplette Frontier.

## Common Mistakes

| Fehler | Stattdessen |
|---|---|
| Klasse, Dateipfad oder Architektur in der Spec | gehört in Plan und Umsetzung |
| Empfehlung nur mit Tag, ohne Grund | Grund ausschreiben; bei `ungeklärt` als Vermutung kennzeichnen |
| Offener Punkt als W-Eintrag verbucht | in den Abbruch-Abschnitt, Tag `ungeklärt` |
| Link oder Ticket-Nummer in der Spec | Inhalt zusammenfassen, Tag `Anhang` |
