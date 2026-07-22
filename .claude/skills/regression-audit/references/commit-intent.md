# Commit-Intent-Extraktion

Ziel: Pro erkanntem Bereich die **Absicht** der Commits verstehen — nicht nur was geändert
wurde, sondern warum, und was heute der intendierte Zustand sein soll.

---

## Grundprinzip: Intent-Evolution

Intent darf sich über die Zeit bewusst wandeln.

> Commit A: „Hintergrundfarbe grün" → damaliger Intent: grüner Hintergrund.
> Commit B: „Hintergrundfarbe zu Gelb geändert auf Kundenwunsch" → aktueller Intent: gelber Hintergrund.

**Der aktuellste Commit zu einem Bereich liefert den maßgeblichen Soll-Zustand.**
Frühere Commits desselben Bereichs beschreiben die Entwicklungshistorie, nicht den heutigen Soll-Zustand.

---

## Commit-Message-Muster und ihre Implikationen

| Präfix / Muster | Intent | Verifikations-Schwerpunkt |
|-----------------|--------|--------------------------|
| `add <Feature>` | Neue Funktion ist vorhanden und funktionsfähig | Tests decken neues Feature ab |
| `extend <Feature>` / `enhance` | Bestehende Funktion erweitert — **Altverhalten muss erhalten bleiben** | Gesamte Komponente / Service prüfen, nicht nur Neues |
| `fix <Problem>` | Fehlerzustand behoben | Fehler-Szenario tritt nicht mehr auf; kein Regression-Risiko durch Fix |
| `refactor <Bereich>` | Struktur geändert, **Verhalten unverändert** | Alle bisherigen Tests müssen noch grün sein |
| `remove <Feature>` | Feature ist nicht mehr vorhanden | Keine toten Referenzen; abhängige Stellen angepasst |
| `revert <Commit>` | Zustand vor dem revertierten Commit wiederhergestellt | Vorheriger Soll-Zustand gilt wieder |
| Unklare / fehlende Message | Intent nicht direkt erkennbar | Aus Diff ableiten (siehe unten); als gelb markieren |

---

## Intent aus Diff ableiten (bei unklarer Commit-Message)

| Diff-Muster | Abgeleiteter Intent |
|-------------|---------------------|
| Neue Datei(en), keine Löschungen | Neue Funktion; Intent: vorhanden und testbar |
| Bestehende Datei, neue Methoden / Properties | Erweiterung; Intent: neu + alt funktioniert |
| Nur Umstrukturierung ohne neue Logik | Refactoring; Intent: Verhalten identisch |
| Gelöschte Dateien | Entfernung; Intent: Feature und alle Referenzen weg |
| Gemischtes Bild ohne Kommentar | Ambig — Intent als unklar markieren |

---

## Kumulativer Intent eines Bereichs

Mehrere Commits haben denselben Bereich berührt → Intent-Kette aufbauen:

```bash
git log --oneline --since="N days ago" -- <Bereich-Pfad>
```

1. Alle Commits chronologisch auflisten
2. Jeden Commit klassifizieren (Tabelle oben)
3. Aktuellsten nicht-revertierten Intent als maßgeblich festhalten
4. Widersprüche erkennen:

| Situation | Bewertung |
|-----------|-----------|
| Späterer Commit erklärt die Abweichung (Commit-Message) | Grün — bewusste Intent-Änderung |
| Späterer Commit ändert Verhalten **ohne Erklärung** | Rot — mögliche stille Regression |
| Intent aus Folge-Commits nicht eindeutig ableitbar | Gelb — manueller Review empfohlen |

---

## Nicht-Software-Repos

Intent-Extraktion gilt auch ohne Produktivcode:

| Commit-Typ | Maßgebliche Prüffrage heute |
|------------|----------------------------|
| Skill-Datei geändert | Spiegelt der aktuelle Body noch den in der Commit-Message beschriebenen Intent? |
| Config-Wert geändert | Ist der Wert heute noch so gesetzt wie intendiert? |
| Doku-Abschnitt ergänzt | Ist der Abschnitt vollständig und aktuell vorhanden? |
| Referenz / Link geändert | Ist der Verweis heute noch gültig? |

---

## Ambiguitäts-Regel

Intent nicht sicher bestimmbar → **gelb**, nie rot und nie grün.
Im Report konkret benennen: *„Intent unklar — manueller Review empfohlen."*
Spekulation vermeiden.
