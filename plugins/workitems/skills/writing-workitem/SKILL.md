---
name: writing-workitem
description: Use when writing the Titel and Description of a User Story for ein Azure DevOps Workitem — vor dem Anlegen oder Editieren einer Story, wenn ein Entwurf WAS mit WIE vermischt (technische Schritte, Klassen-/Dateinamen), oder wenn Akzeptanzkriterien vage sind ("funktioniert korrekt", "ist möglich") statt konkret und testbar. Nicht für das Lesen/Ändern eines bestehenden Workitems (→ ado-cli), nicht für den technischen Umsetzungsplan (→ superpowers:writing-plans).
---

# Writing ADO User Stories

## Overview

Eine Story-Description sagt, **was** erreicht werden soll und **unter welcher Bedingung** der
Product Owner sie als erledigt abnimmt — nie wie sie gebaut wird. Die Akzeptanzkriterien (AK)
tragen das Gewicht der Story: lesbar für PO/Stakeholder, gleichzeitig präzise genug, dass ein
Entwickler daraus direkt einen Test ableiten kann.

**Kernprinzip:** Ein AK ist erst fertig, wenn zwei verschiedene Leser es unabhängig voneinander
verwenden können — der PO zum Abnehmen, der Entwickler zum Testen. Trägt es nur für einen von
beiden, ist es kein AK, sondern entweder Marketing-Text oder ein Implementierungsdetail.

## Stimme und Publikum

Der Schreiber ist **Entwickler mit Architektur-Überblick**, die Leser sind **PO/Stakeholder ohne
Code-Kenntnis** — und parallel ein **Entwickler, der daraus einen Test schreibt**. Beides gilt
gleichzeitig, vor allem für die Akzeptanzkriterien:

- **WAS ja, WIE nein.** Ergebnis und Bedingung sind der Inhalt. Klasse, Datei, Layer, Migration,
  Service-Name — das gehört in den Plan des Entwicklers (`superpowers:writing-plans`), nicht in
  die Story.
- **Konkret statt bewertend.** "Daten werden korrekt gespeichert" ist eine Behauptung, kein
  Kriterium — niemand kann sie abnehmen oder testen. "Die E-Mail-Adresse ist nach dem Login
  hinterlegt" kann beides.
- **Ein Fachbegriff trägt seine Erklärung im selben Satz.** Unvermeidbar nur, wenn kein
  Alltagswort dasselbe meint.
- **Der Leser schlägt nichts nach.** Kein Satz setzt Code, Ticket oder Vorwissen voraus.

## When to Use

- Titel/Description einer Story wird geschrieben oder überarbeitet, bevor sie ins Workitem geht.
- Ein Entwurf enthält eine Schritt-für-Schritt-Liste, Klassennamen oder Dateipfade.
- Akzeptanzkriterien lesen sich wie Prosa statt wie prüfbare Fälle.

**Nicht für:** den technischen Umsetzungsplan selbst (→ `superpowers:writing-plans`); das Lesen
oder Ändern eines bereits angelegten Workitems (→ `ado-cli`).

## Core Pattern

```markdown
# <Titel: Verb + Ergebnis>

## Kontext
<2-4 Sätze: Ausgangslage + Business-Nutzen. Kein "wie".>

## Akzeptanzkriterien
- Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.
- Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.
- ... (3-6 Punkte, mind. 1 Negativ-/Edge-Fall wenn fachlich relevant)
```

Kein separater Technik-Abschnitt. Wer die Story liest, braucht ihn nicht; wer sie umsetzt,
schreibt sich den Plan selbst (anderes Artefakt, anderer Skill).

### Akzeptanzkriterium — Bau-Anleitung

1. **Ein Fall pro Punkt.** "...und wenn zusätzlich..." ist ein zweiter Punkt, kein Anhängsel.
2. **Vorbedingung konkret benennen.** Nicht "ein User", sondern "ein User, der sich zum ersten
   Mal anmeldet" bzw. "ein bestehender User ohne hinterlegte E-Mail".
3. **Ergebnis beobachtbar, nicht implementiert.** Was sieht/bekommt der User oder das System von
   außen — nicht welche Tabelle/Klasse das intern erledigt.
4. **Verbotene Wörter ohne Zahl/Zustand danach:** "korrekt", "erfolgreich", "sollte",
   "im Allgemeinen", "ordnungsgemäß". Jedes davon verlangt: korrekt bezogen auf was, konkret?
5. **Test-Probe:** Lässt sich der Satz 1:1 in einen Testnamen nach Projekt-Konvention
   (`<Method>_<Situation>_<ErwartetesErgebnis>` bzw. Gherkin) übersetzen? Wenn nicht, ist er noch
   zu vage.
6. **Fachliche Annahme nicht selbst treffen — aber nur bei echter Mehrdeutigkeit.** Offene Frage
   nur, wenn mehrere Interpretationen fachlich plausibel sind und sich in der Konsequenz für
   Nutzer oder Daten spürbar unterscheiden (z. B. UND/ODER bei mehreren gleichzeitig gesetzten
   Filtern; ob eine Markierung nur für den einzelnen Nutzer oder systemweit für alle gilt). Ein
   naheliegender, unstrittiger Standardfall (z. B. "Liste ist leer → Hinweistext statt Fehler")
   ist keine offene Frage, sondern gehört direkt in die AK. Bei echter Mehrdeutigkeit: nicht
   raten, sondern als eigene Zeile `Offene Frage: <Entscheidung>?` unter den Akzeptanzkriterien
   auflisten.

## Quick Reference

| Element | Zeichen-Limit | Muss enthalten | Darf nicht enthalten |
|---|---|---|---|
| Titel | ~80 Zeichen | Verb + Ergebnis | Klassen-/Servicename |
| Kontext | ~500 Zeichen (2-4 Sätze) | Ausgangslage, Business-Nutzen | Implementierungsschritte, Dateipfade, Migration |
| Akzeptanzkriterium | ~300 Zeichen je Punkt | Gegeben/Wenn/Dann, konkreter Wert/Zustand | "korrekt", "erfolgreich", "sollte", Klassen-/Methodennamen |

Obergrenzen, keine Zielwerte — ein AK, das mit 80 Zeichen vollständig und konkret ist, endet
bei 80.

## Common Mistakes

| Fehler | Stattdessen |
|---|---|
| Technischer Schritt-für-Schritt-Plan im Workitem | Gehört in den Plan des Entwicklers, nicht in die Story |
| AK ohne konkreten Wert ("Daten werden korrekt gespeichert") | Gegeben/Wenn/Dann mit prüfbarem Ergebnis |
| Kontext erklärt die Lösung statt das Problem | Nur Ausgangslage + Nutzen, kein "wie" |
| Ein AK deckt mehrere Fälle ab | Aufteilen — ein Fall pro Punkt |
| Nur der Happy Path als AK | Mindestens 1 Negativ-/Edge-Fall ergänzen, wenn fachlich relevant |
| Fachbegriff ohne Erklärung im selben Satz | Begriff + was er für den Leser bedeutet |
| Echte fachliche Mehrdeutigkeit (UND/ODER, individuell/systemweit, ...) still entschieden | Als `Offene Frage: ...` kennzeichnen, PO entscheiden lassen |
| Jeder Standardfall wird zur Offenen Frage gemacht | Nur bei spürbar unterschiedlicher Konsequenz auslagern, sonst direkt in die AK |

## Example

```markdown
# E-Mail aus Access Token im System hinterlegen

## Kontext
Der Access Token enthält bereits die E-Mail-Adresse des Users, sie wird aber aktuell nirgends
im System gespeichert. Für ein zukünftiges Feature wird sie als hinterlegtes Attribut jedes
Users benötigt.

## Akzeptanzkriterien
- Gegeben ein neuer User meldet sich zum ersten Mal an, wenn der Login erfolgreich ist, dann
  ist seine E-Mail-Adresse aus dem Access Token im System hinterlegt.
- Gegeben ein bestehender User hat noch keine E-Mail-Adresse hinterlegt, wenn er sich erneut
  anmeldet, dann wird seine E-Mail-Adresse ergänzt.
- Gegeben ein bestehender User ändert seine E-Mail-Adresse beim Identity Provider, wenn er sich
  das nächste Mal anmeldet, dann ist im System die neue E-Mail-Adresse hinterlegt.
- Gegeben der Access Token enthält keine E-Mail-Adresse, wenn der Login erfolgt, dann wird der
  User trotzdem normal angelegt bzw. aktualisiert, nur ohne E-Mail-Wert.
```

Vergleich zur ersten Fassung dieser Story: der Abschnitt "Technische Teilschritte" (11 Punkte,
Klassen-/Dateinamen wie `UserEntity`, `UserGatewayService`) ist komplett raus — der bleibt im
Plan des Entwicklers. Der Punkt "Migration ergänzt die neue Spalte (nullable)" ist jetzt AK 4:
ein von außen beobachtbares Verhalten statt eines DB-Details.
