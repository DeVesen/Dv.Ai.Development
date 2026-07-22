# Operation: Status-Marker lesen & setzen

## Status-Ermittlungslogik

```
IF Einzel-Task:
    Status = WI-State-Feld
        Active           → 🔄 in Bearbeitung
        Resolved / Done  → ✅ erledigt
        sonst            → ⬜ noch offen

IF Auflistung:
    IF WI-State = Resolved OR Done:
        Alle Tasks → ✅ erledigt  (WI-State überschreibt Emoji-Marker)
    ELSE:
        Status je Task = Emoji-Marker in der Beschreibung (✅ / 🔄 / ⬜)
```

**Immer beide Quellen laden:** `System.State` + `System.Description`

---

## Marker-Konzept (Auflistung, WI-State ≠ Resolved/Done)

| Marker im Text | Bedeutung |
|----------------|-----------|
| ✅ | Punkt abgeschlossen |
| 🔄 | Punkt wird gerade bearbeitet |
| *(kein Marker)* | Noch nicht begonnen |

Die Marker stehen direkt im Beschreibungstext — kein HTML, keine Spans:
```
1. Login-Button hinzufügen ✅
2. Logout-Button entfernen 🔄
3. Header-Farbe ändern
```

---

## Kontext ermitteln

- Work-Item-ID aus dem laufenden Gesprächskontext (zuletzt genanntes WI / `docs/ado/<id>.md`)
- Falls unklar: *„Für welches Work Item? (#ID)"* fragen
- Task-Nummer: aus „Task 1", „Task 2" ableiten, aus `docs/ado/<id>.md`-Nummerierung, oder Textmatch

---

## Status lesen

### Trigger-Phrasen
- „bist du schon umgesetzt?"
- „wie ist dein Status?"
- „Status von Task 2"
- „Status aller Tasks"
- „was ist schon erledigt?"

### Ablauf

1. `wit_get_work_items_batch_by_ids` — Felder: **`System.State`** + `System.Description`
2. WI-Typ aus `docs/ado/<id>.md` oder Gesprächskontext bestimmen (Einzel-Task / Auflistung)
3. Status-Logik (s. oben) anwenden

### Ausgabe-Format

**Einzel-Task:**
> #1234 — „Feature XY": 🔄 in Bearbeitung *(WI-State: Active)*

**Auflistung, WI-State = Resolved:**
```
#1234 — Titel  [WI-State: Resolved → alle Tasks erledigt]

  Task 1: Login-Button hinzufügen       ✅ erledigt
  Task 2: Logout-Button entfernen       ✅ erledigt
  Task 3: Header-Farbe ändern           ✅ erledigt
```

**Auflistung, WI-State = Active:**
```
#1234 — Titel  [WI-State: Active]

  Task 1: Login-Button hinzufügen       ✅ erledigt
  Task 2: Logout-Button entfernen       🔄 in Bearbeitung
  Task 3: Header-Farbe ändern           ⬜ noch offen
```

---

## Marker setzen (nur Auflistung)

Emoji-Marker werden nur bei **Auflistungs-Work-Items** geschrieben.
Bei Einzel-Tasks ergibt sich der Status aus dem WI-State — kein Marker nötig.

### Trigger-Phrasen

| Aktion | Beispiele |
|--------|----------|
| 🔄 setzen | „ich fange Task 2 an", „ich arbeite jetzt an Task 3", „Task 1 nehme ich mir vor" |
| ✅ setzen | „Task 2 ist fertig", „Task 1 habe ich abgeschlossen", „erledigt" |
| Marker entfernen | „Task 3 zurücksetzen", „noch nicht begonnen" |

### Ablauf

1. **Description-HTML laden** via `wit_get_work_items_batch_by_ids`
2. **Ziel-Zeile finden**: passende `<li>`-Zeile oder `^\d+\.`-Pattern; Fallback: Textmatch
3. **Marker bereinigen**: ✅ und 🔄 aus der Ziel-Zeile entfernen (Unicode + HTML-Entity)
4. **Neuen Marker einfügen** am Ende des sichtbaren Textes, vor `</li>` oder `</p>`:
   - ✅ → ` ✅`
   - 🔄 → ` 🔄`
5. **Sonderregel 🔄**: Bestehende 🔄 in anderen Zeilen ebenfalls entfernen (nur ein Task aktiv)
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
| Task-Nummer nicht gefunden | User fragen + erkannte Punkte auflisten |
| Description ist leer | „Keine Beschreibung — Marker kann nicht gesetzt werden." |
| WI ist Einzel-Task | „Status ergibt sich aus WI-State — kein Emoji-Marker nötig." |
| Marker bereits identisch | „Task 2 ist bereits ✅ — keine Änderung nötig." |
| WI-State = Resolved/Done | Marker setzen sinnlos; Hinweis: „Work Item ist bereits Resolved." |
