# Operation: Status-Marker lesen & setzen

## Konzept

Wenn ein Work Item eine **Auflistung** enthält, kennzeichnet der User erledigte
oder aktiv bearbeitete Punkte direkt im ADO-Beschreibungstext mit Emojis:

| Marker | Bedeutung |
|--------|-----------|
| ✅ | Punkt abgeschlossen |
| 🔄 | Punkt wird gerade bearbeitet |
| *(kein Marker)* | Noch nicht begonnen |

Die Marker stehen direkt im Text — kein HTML, keine Spans:
```
1. Login-Button hinzufügen ✅
2. Logout-Button entfernen 🔄
3. Header-Farbe ändern
```

---

## Kontext ermitteln

Bevor Status gelesen oder gesetzt wird:
- Work-Item-ID aus dem laufenden Gesprächskontext nehmen (zuletzt genanntes WI / `docs/ado/<id>.md`)
- Falls unklar: *„Für welches Work Item? (#ID)"* fragen
- Task-Nummer: aus „Task 1", „Task 2" ableiten, oder aus `docs/ado/<id>.md`-Nummerierung, oder durch Textmatch

---

## Status lesen

### Trigger-Phrasen (Beispiele)
- „bist du schon umgesetzt?"
- „wie ist dein Status?"
- „Status von Task 2"
- „Status aller Tasks"
- „was ist schon erledigt?"

### Ablauf

1. `wit_get_work_items_batch_by_ids` — Feld: `System.Description`
2. ✅ und 🔄 im Text suchen (direkt als Unicode-Zeichen oder HTML-Entity `&#x2705;` / `&#x1F504;`)
3. Liste aller Punkte (nummeriert `^\d+\.` oder Bullets `^[•\-\*]`) durchgehen, Marker je Punkt erfassen

### Ausgabe-Format

**Einzelner Task:**
> Task 2 — „Logout-Button entfernen": 🔄 in Bearbeitung

**Alle Tasks:**
```
#1234 — Titel des Work Items

  Task 1: Login-Button hinzufügen       ✅ erledigt
  Task 2: Logout-Button entfernen       🔄 in Bearbeitung
  Task 3: Header-Farbe ändern           ⬜ noch offen
```

---

## Marker setzen

### Trigger-Phrasen

| Aktion | Beispiele |
|--------|----------|
| 🔄 setzen | „ich fange Task 2 an", „ich arbeite jetzt an Task 3", „Task 1 nehme ich mir vor" |
| ✅ setzen | „Task 2 ist fertig", „Task 1 habe ich abgeschlossen", „erledigt" |
| Marker entfernen | „Task 3 zurücksetzen", „noch nicht begonnen" |

### Ablauf

1. **Description-HTML laden** via `wit_get_work_items_batch_by_ids` (Feld `System.Description`)
2. **Ziel-Zeile finden**: Die Zeile/den Block mit dem genannten Task
   - Nummeriert: passende `<li>`-Zeile oder `^\d+\.`-Pattern
   - Fallback: Textmatch auf Schlagwörter des Task-Titels aus `docs/ado/<id>.md`
3. **Marker bereinigen**: Bestehende ✅ und 🔄 aus der Ziel-Zeile entfernen (als Unicode und als HTML-Entity)
4. **Neuen Marker einfügen** am Ende des sichtbaren Textes der Ziel-Zeile, vor `</li>` oder `</p>`:
   - ✅ → ` ✅`
   - 🔄 → ` 🔄`
5. **Sonderregel 🔄**: Wenn eine andere Zeile bereits 🔄 trägt → dort den Marker ebenfalls entfernen (nur ein Task kann gleichzeitig aktiv sein).
6. **Zurückschreiben** via `wit_work_item_write` (update):
```json
{
  "id": <id>,
  "updates": { "System.Description": "<aktualisiertes HTML>" }
}
```
7. **Bestätigen:** „Task 2 als 🔄 markiert — Work Item #1234 wurde aktualisiert."

---

## Fehlerbehandlung

| Problem | Reaktion |
|---------|---------|
| Task-Nummer im WI nicht gefunden | User fragen: „Welcher Punkt genau?" + Liste der erkannten Punkte zeigen |
| Description ist leer | „Keine Beschreibung im Work Item — Marker kann nicht gesetzt werden." |
| WI ist kein Auflistungs-Typ | Hinweis: „Dieses Work Item beschreibt einen Einzel-Task, keine Auflistung." |
| Marker bereits identisch | „Task 2 ist bereits als ✅ markiert — keine Änderung nötig." |
