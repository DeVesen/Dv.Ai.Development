# Abschlussbericht (nur im Chat)

Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.

```markdown
## <Berichtstitel>: <pfad des Artefakts>

**Status:** <Status> | <Zusatz-Status des Skills>
**Reviews:** <anzahl> · **Nacharbeiten:** <anzahl>

### Letztes Review
<Abschnitt zwischen `=== REPORT ===` und `=== REWORK ===` aus `aggregate.md` der letzten Runde, unverändert>

### Hinweise des Orchestrators        ← nur wenn vorhanden
- <eigene Abweichung oder Auslegung, z. B. wie ein Argument gelesen wurde, ein nachgeforderter oder neu gestarteter Reviewer>

<Zusatz-Abschnitte des Skills>

<Scout-Abschnitt ab `## Scout-Vorschläge`, unverändert, oder „Scout ausgefallen“>        ← nur wenn der Skill einen Scout nennt und er lief

Nächster Schritt: <Text aus dem Skill für diesen Status>
```

## Status
Der Status folgt aus dem Stopp in `loop.md` und der letzten `STATUS`-Zeile:

| Stopp | Status |
|---|---|
| `clean=true` | `sauber nach Review r` |
| Reviewer ausgefallen | `unvollständig nach Review r, ausgefallen: <liste>` |
| Cap | `Cap erreicht, k × 🔴 offen` |
| kein Fortschritt | `Stillstand in Runde r, k × 🔴 offen` |

`k` = Wert `red=` aus der letzten `STATUS`-Zeile.

## Nächster Schritt
Der Skill nennt je Status einen Text. `unvollständig` hat immer denselben: `Ausgefallene Reviewer: <liste>. Den Skill in einer frischen Session erneut starten.` Nennt der Skill für einen Status nichts, gilt der Text für `Cap erreicht`.
