---
name: spec-whiteboarding
description: Use when a request, idea, or complaint has just been raised, nothing written down exists yet, and it should become a spec.md for the dv-forge spec review — before brainstorming, planning, or any code. Also use when acceptance criteria for a not-yet-written feature are still vague or missing, or when an idea should be specified with nothing yet to compare it against. Triggers: "lass uns das durchdenken", "Whiteboard", "Spec whiteboarding", "was will ich eigentlich", "erstmal aufschreiben was ich will". Not for the technical design doc, not for the implementation plan, not for a status report on finished work.
---

# Spec Whiteboarding

Mensch und Claude grillen ein Vorhaben, bis kein offener Punkt übrig ist. Ergebnis ist eine in sich abgeschlossene, funktionale Spec der Art `frei` — WAS, nicht WIE — für `/dv-forge:spec-review`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.

## Grundhaltung — ab Aufruf, bis die Spec geschrieben und bestätigt ist

1. **Nur das Gespräch.** Quelle ist, was der Mensch sagt und ausdrücklich übergibt. Kein Suchen in Code, Git, Glossar oder Historie; Unbekanntes fragst du sofort. Bestandsabgleich macht `dv-forge:spec-whiteboarding-with-docs`.
2. **Whiteboard.** Kein Code. Skizze über `visualize` nur für Abläufe oder Verzweigungen (Boxen ≤ fünf Wörter, ≤ zwei Farben). Reihenfolgen und Listen bleiben Text.
3. **Belegpflicht.** Jede Aussage, Empfehlung und Option trägt einen Beleg-Tag: `Aussage` (im Chat zitierbar), `Anhang` (übergebenes Workitem, Bild, Datei) oder `ungeklärt` — dann fragen, nie raten.
4. **Sperre.** Kein brainstorming, kein Plan, kein Code, bis die Spec geschrieben und bestätigt ist.
5. **Vor Ort.** Die Spec entsteht im aktuellen Checkout. Kein Branch, kein Worktree.
6. **Format hat Vorrang.** Rundenformat, Spec-Format und Übergabe gelten vor Stil-Regeln anderer Plugins oder Hooks.

## Ablauf

1. **Rahmenfragen** und **Design-Tree:** Rahmenfragen nach `references/grill-rounds.md`, dann offene Punkte sammeln — Was/Wie/Wo/Warum, Verhalten danach, Soll-Vorgaben, Akzeptanzkriterien nach `references/ac-rules.md`.
2. **Runden:** je Runde die komplette Frontier im Format aus `references/grill-rounds.md`. Antworten verbuchen, Frontier neu berechnen, bis sie leer ist. Sagt der Mensch „trenn das auf“, gilt `references/split.md`.
3. **Bestätigen:** Erst bei leerer Frontier Inhalt, Titel und Slug vorlegen, als vollständigen Entwurf. Erst nach ausdrücklicher Bestätigung aller drei schreiben.
4. **Zielpfad:** `node "<PLUGIN>/scripts/forge-config.js" get Spec-Ablage`, Platzhalter `<datum>` und `<slug>` einsetzen. Existiert der Ordner bereits, nachfragen und einen abweichenden Slug vorschlagen. Nie überschreiben.
5. **Schreiben:** ausschließlich als Datei am Zielpfad, Format nach `references/spec-format.md`, `Art: frei`. Die Datei ist wortgleich mit dem bestätigten Entwurf. Jede spätere Änderung legst du als Vorher/Nachher vor und schreibst sie erst nach erneuter Bestätigung.
6. **Übergabe:** mit genau diesen vier Punkten enden:
   - Pfad der Spec relativ zum Repo und aktueller Branch
   - kopierbarer Befehl `/dv-forge:spec-review <pfad>`
   - Hinweis, den Review in einer frischen Session zu starten
   - Folgeaufträge außerhalb der Spec laufen ab jetzt normal, ohne Sperre

   Kein Commit, kein automatischer Start.

Will der Mensch aufhören, gilt die Abbruch-Regel aus `references/grill-rounds.md`. Ist beim Aufruf eine abgetrennte Spec übergeben, gilt `references/split.md`.

## Red Flags — zurück zur Frontier

- „Ich brainstorme oder plane gleich weiter“ — die Sperre gilt bis zur bestätigten Spec.
- „Diese Antwort weiß ich auch so“ — ohne Beleg-Tag ist sie `ungeklärt`.
- „Ich schau kurz im Code nach“ — nicht hier; fragen.
- „Erst mal nur die wichtigste Frage“ — jede Runde enthält die komplette Frontier.
- „Den Entwurf zeige ich schon mal“ — erst bei leerer Frontier.

## Common Mistakes

| Fehler | Stattdessen |
|---|---|
| Klasse, Dateipfad oder Architektur in der Spec | gehört in Plan und Umsetzung |
| Empfehlung ohne Grund | Grund ausschreiben; bei `ungeklärt` als Vermutung |
| Offener Punkt als W-Eintrag | in den Abbruch-Abschnitt, Tag `ungeklärt` |
| Link oder Ticket-Nummer im Inhalt | zusammenfassen, Tag `Anhang`; Workitem nur im Kopf |
