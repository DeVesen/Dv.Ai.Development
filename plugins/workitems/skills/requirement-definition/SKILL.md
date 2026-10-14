---
name: requirement-definition
description: >
  Klaert im Dialog ein Requirement als Ganzes (Ziel, Scope, Akzeptanzkriterien auf Nutzerebene)
  und empfiehlt, wie es in kompakte Steps geschnitten werden kann. Arbeitet nur im Chat und
  legt nichts ab. Nutze diesen Skill, sobald jemand eine Anforderung erfassen, strukturieren,
  schneiden oder schaerfen will — auch ohne das Wort "Anforderung". Die Definition of Ready
  wird dabei automatisch mitbeachtet.
when_to_use: >
  Trigger (DE): "ich brauche ein Feature fuer …", "ich hab einen Kundenwunsch / eine Anforderung",
  "schneide das in Steps", "wie teile ich das auf", "definier/schaerf die Akzeptanzkriterien",
  "Anforderung erfassen". Trigger (EN): "refine this", "write acceptance criteria",
  "split this requirement", "break this down into steps". Auch wenn ein bestehender Stand-Block
  (Requirement + Steps) zum Weiterfuehren eingefuegt wird. Abgrenzung: NICHT fuer Ablage oder
  Format (Markdown, Azure DevOps, Jira → eigene Skills), NICHT fuer die Detailspezifikation eines
  Steps, NICHT fuer Planung oder Umsetzung, NICHT fuer das Bereitschaftsurteil (→ definition-of-ready;
  der Skill beachtet sie beim Arbeiten schon von selbst).
---

# Requirement Definition

Macht aus einem Wunsch ein **kompaktes Requirement** und eine **Empfehlung, wie man es in Steps
schneidet**. Requirement und Steps bleiben klein, damit ein Agent spaeter nur seinen Step plus das
knappe Requirement liest und den Faden behaelt.

Laeuft **interaktiv im Hauptthread, ohne Sub-Agents**. Der Dialog ist das Produkt.

## Was dieser Skill nicht tut

- **Nichts ablegen.** Keine Dateien, keine IDs, kein Status. Ablage und Zielformat gehoeren anderen Skills.
- **Keine Ebenen** (Epic, Feature, Story, Task). Es gibt nur ein Requirement und seine Steps.
- **Keine Detailspezifikation** eines Steps. Wer sich einen Step vornimmt, spezifiziert ihn danach separat.

## Sprache

Antworten und Inhalt auf Deutsch. Skill-Dateien sind ASCII-Deutsch.

## Grenzen

Alle Zahlen stehen in [`limits.json`](limits.json) und werden **von dort gelesen**, nie aus dem
Gedaechtnis genannt. Sie sind **Leitplanken**: Wird eine ueberschritten, schlaegt der Skill Splitten vor
oder haelt eine begruendete Ausnahme unter „Annahmen/Offene Punkte" fest. Kein Hard-Fail.

## Definition of Ready im Blick

Die Definition of Ready (Skill `definition-of-ready` im selben Plugin) gilt **automatisch** mit, der
Nutzer muss sie nicht nennen:

- **Beim Klaeren:** Zu Beginn den Katalog `${CLAUDE_PLUGIN_ROOT}/skills/definition-of-ready/references/definition-of-ready.md`
  lesen. Gefragt wird nach dem, was der **Inhalt** eines Requirements beantworten muss: Use Case
  (Ziel, Nutzer, Nutzen), Scope und Nicht-Ziele, Abhaengigkeiten, Risiken, offene Fragen,
  Akzeptanzkriterien. **Nicht** gefragt wird nach Quelle/PRD, Freigabe, Design, Compliance, Wikilinks
  und Test-Nachweis. Das ist Prozess- und Artefaktebene und bleibt bei der DoR-Pruefung.
- **Beim Pruefen:** Schritt 6 fuehrt den Lint der DoR aus.
- **Nie „Ready":** Der Skill sagt weder „ready" noch „bereit". Das Bereitschaftsurteil gibt nur
  `definition-of-ready`, „Ready" vergibt der Mensch. Ist das Requirement stabil (keine blockierende
  Frage offen, Pruefskript ohne `FEHLER`), bietet der Skill einmal an: *„Soll ich jetzt die volle
  DoR-Pruefung starten?"* Bei Ja ruft er `definition-of-ready` mit dem Stand-Block als Artefakt auf.

## Ablauf

1. **Requirement klaeren.** Ziel, Nutzer, Scope (drin / bewusst nicht drin), Abhaengigkeiten.
   Nur **blockierende** Unklarheiten erfragen, eine Frage pro Nachricht, jeweils mit Empfehlung.
   Nicht-blockierende kommen als *Annahme* oder *Offener Punkt* in den Stand-Block.
2. **Akzeptanzkriterien** fuer das Requirement formulieren: auf Nutzerebene, grob. Keine Technik wie
   Datenbank oder Schnittstelle. Qualitaet nach [Pruefkatalog](references/pruefkatalog.md), Format nach
   [AC-Format](references/ac-format.md).
3. **Requirement-Check.** Hat es genau einen eigenen Nutzerwert und ein Ziel, und liegt die Zahl der
   Steps unter `requirement.stepsMax`? Sonst: Vorschlag, es in **mehrere Requirements** zu teilen.
4. **In Steps schneiden.** 1–2 passende [Splitting-Pattern](references/splitting-patterns.md) vorschlagen,
   nicht alle aufzaehlen. Reihenfolge und harte Abhaengigkeiten festhalten.
5. **Step-Check** je Step nach [Step-Check](references/step-check.md). Jeder Step bekommt ein Ziel und
   knappe Akzeptanzkriterien, ebenfalls auf Nutzerebene.
6. **Stand-Block pruefen.** Zwei Pruefungen, beide mit Node:
   - Den Block per Heredoc auf Stdin an `node ${CLAUDE_PLUGIN_ROOT}/scripts/check-requirement.js`
     geben. `FEHLER` beheben, `WARNUNG` (Leitplanke ueberschritten) dem Nutzer nennen und Splitten
     oder eine Ausnahme vorschlagen.
   - Den Block in eine Datei im Scratchpad schreiben und
     `node "${CLAUDE_PLUGIN_ROOT}/skills/definition-of-ready/scripts/dor-lint.js" <datei>` ausfuehren.
     Befunde zu den Kriterien (Format, unscharfe Woerter, Platzhalter, Implementierungsdetails)
     beheben oder dem Nutzer nennen. Der Befund `stichwort-fehlt` fuer Quelle, Ansprechpartner und
     Tests ist erwartet und wird nicht gemeldet.

   Ist Node nicht verfuegbar, Schritt auslassen und das sagen.
7. **Stand-Block ausgeben** (siehe unten), wenn sich etwas geaendert hat.

## Zustand nur im Chat

Es gibt keine Datei, die den Stand haelt. Deshalb am Ende jeder Antwort mit Aenderung den **vollstaendigen
Stand-Block** ausgeben. Er ist die einzige Wahrheit und die Uebergabe an einen Ablage-Skill.
Wird ein Stand-Block eingefuegt („weiter mit …"), setzt der Skill dort fort.

```
## Requirement: <Titel>
Ziel: <ein Satz>
Nutzen: <warum, ein Satz>
Nutzer: <wer>
Scope: <was drin ist>
Nicht-Ziele: <was bewusst nicht drin ist>
Abhängigkeiten: <… oder –>
Annahmen / Risiken / Offene Punkte: <… oder –>
Akzeptanzkriterien:
AC-01 Gegeben …, wenn …, dann …
AC-02 (Negativ) Gegeben …, wenn …, dann …

### Steps
1. <Titel>
   Ziel: <ein Satz>
   Akzeptanzkriterien:
   - AC-03 Gegeben …, wenn …, dann …
   - AC-04 (Negativ) Gegeben …, wenn …, dann …
   Abhängig von: – | Step <n>
2. …
```

Die Kriterien tragen **durchgehende IDs** `AC-01 … AC-n` ueber Requirement und alle Steps. Aendert sich
der Schnitt, werden die IDs neu durchnummeriert. Die Feldnamen bleiben wie oben, auch mit Umlauten,
weil der DoR-Lint danach sucht.

## Referenzen

| Thema | Datei |
|-------|-------|
| Zahlen (Leitplanken) | [`limits.json`](limits.json) |
| Pruefskript (Struktur und Leitplanken) | `scripts/check-requirement.js` im Plugin |
| DoR-Katalog und Lint | `skills/definition-of-ready/` im Plugin |
| Step-Regel | [`references/step-check.md`](references/step-check.md) |
| Splitting-Pattern (Richard Lawrence) | [`references/splitting-patterns.md`](references/splitting-patterns.md) |
| AC-Qualitaet | [`references/pruefkatalog.md`](references/pruefkatalog.md) |
| AC-Format | [`references/ac-format.md`](references/ac-format.md) |
