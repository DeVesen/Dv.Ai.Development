# Operation: Status-Marker lesen & setzen

## Konzept

Wenn ein Work Item eine **Auflistung** enthält, kennzeichnet der User erledigte
oder aktiv bearbeitete Punkte direkt im ADO-Beschreibungstext:

| Marker | Hintergrund | Bedeutung |
|--------|-------------|-----------|
| `(sr-done)` | grün `#90EE90` | Punkt abgeschlossen |
| `(sr-active)` | gelb `#FFFF00` | Punkt wird gerade bearbeitet |
| *(kein Marker)* | — | Noch nicht begonnen |

ADO speichert die Beschreibung als HTML — die Marker erscheinen als `<span>`:
```html
1. Login-Button hinzufügen <span style="background-color:#90EE90">(sr-done)</span>
2. Logout-Button entfernen <span style="background-color:#FFFF00">(sr-active)</span>
3. Header-Farbe ändern
```

---

## Kontext ermitteln

Bevor Status gelesen oder gesetzt wird:
- Work-Item-ID aus dem laufenden Gesprächskontext nehmen (zuletzt genanntes WI / docs/ado/<id>.md)
- Falls unklar: *„Für welches Work Item? (#ID)"* fragen
- Task-Nummer: aus "Task 1", "Task 2" ableiten, oder aus `docs/ado/<id>.md`-Nummerierung, oder durch Textmatch

---

## Status lesen

### Trigger-Phrasen (Beispiele)
- „bist du schon umgesetzt?"
- „wie ist dein Status?"
- „Status von Task 2"
- „Status aller Tasks"
- „was ist schon erledigt?"

### Ablauf

1. `wit_get_work_items_batch_by_ids` — Felder: `System.Description`
2. `(sr-done)` und `(sr-active)` im HTML suchen (per Regex `\(sr-done\)` / `\(sr-active\)`)
3. Liste aller Punkte (nummeriert: `^\d+\.`, Bullets: `^[•\-\*]`) durchgehen, Marker je Punkt erfassen

### Ausgabe-Format

**Einzelner Task:**
> Task 2 — „Logout-Button entfernen": **aktiv** `(sr-active)`

**Alle Tasks:**
```
#1234 — Titel des Work Items

  Task 1: Login-Button hinzufügen       ✅ erledigt
  Task 2: Logout-Button entfernen       🔄 aktiv
  Task 3: Header-Farbe ändern           ⬜ noch offen
```

---

## Marker setzen

### Trigger-Phrasen

| Aktion | Beispiele |
|--------|----------|
| Task auf `(sr-active)` setzen | „ich fange Task 2 an", „ich arbeite jetzt an Task 3", „Task 1 nehme ich mir vor" |
| Task auf `(sr-done)` setzen | „Task 2 ist fertig", „Task 1 habe ich abgeschlossen", „erledigt" |
| Marker entfernen | „Task 3 zurücksetzen", „noch nicht begonnen" |

### Ablauf

1. **Description-HTML laden** via `wit_get_work_items_batch_by_ids` (Feld `System.Description`)
2. **Ziel-Zeile finden**: Die Zeile/den Block, der dem genannten Task entspricht
   - Nummeriert: `^\s*<li>1\.` / Patterns: `1\.\s+` je nach ADO-HTML-Struktur
   - Fallback: Textmatch auf Schlagwörter des Task-Titels aus `docs/ado/<id>.md`
3. **Marker bereinigen**: Aus der Ziel-Zeile alle vorhandenen `(sr-done)`/`(sr-active)`-Spans entfernen
4. **Neuen Marker einfügen** am Ende der Ziel-Zeile, vor dem `</li>` oder `</p>`:

```html
<!-- sr-done -->
<span style="background-color:#90EE90">(sr-done)</span>

<!-- sr-active -->
<span style="background-color:#FFFF00">(sr-active)</span>
```

5. **Sonderregel `(sr-active)`**: Wenn eine andere Zeile bereits `(sr-active)` trägt →
   dort den Span ebenfalls entfernen (nur ein Task kann gleichzeitig aktiv sein).

6. **Zurückschreiben** via `wit_work_item_write` (update):
```json
{
  "id": <id>,
  "updates": { "System.Description": "<aktualisiertes HTML>" }
}
```
*Kein `format`-Parameter nötig — wir schreiben rohes HTML.*

7. **Bestätigen:**
   - „Task 2 als `(sr-active)` markiert — Work Item #1234 wurde aktualisiert."

---

## Fehlerbehandlung

| Problem | Reaktion |
|---------|---------|
| Task-Nummer im WI nicht gefunden | User fragen: „Welcher Punkt genau?" + Liste der erkannten Punkte zeigen |
| Description ist leer | „Keine Beschreibung im Work Item — Marker kann nicht gesetzt werden." |
| WI ist kein Auflistungs-Typ | Hinweis: „Dieses Work Item beschreibt einen Einzel-Task, keine Auflistung." |
| Marker bereits identisch | „Task 2 ist bereits als `(sr-done)` markiert — keine Änderung nötig." |
