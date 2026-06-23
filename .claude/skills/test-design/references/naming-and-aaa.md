# Namenskonvention und AAA (stack-neutral)

Gilt für **neue** und **angepasste** Tests in Backend und Frontend. Bestehende Testnamen unverändert lassen, solange die Datei nicht ohnehin bearbeitet wird.

## AAA

Jeder Test ist in drei Phasen gegliedert:

1. **Arrange** — Ausgangszustand und Testdaten vorbereiten
2. **Act** — die getestete Aktion ausführen
3. **Assert** — Ergebnis und relevante Nebenwirkungen prüfen

Kommentare `// Arrange`, `// Act`, `// Assert` setzen, wo der Stack Block-Kommentare erlaubt.

## Namensschema

```
<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>
```

| Segment | Inhalt |
|---------|--------|
| `MethodName` | Getestete Methode (ohne Klassen-/Komponentenpräfix) |
| Mittleres Segment | Zustand nach Arrange (`Given…`) **und** Eingaben des Act (`With…`) |
| Letztes Segment | Erwartetes Ergebnis — konkret, nicht generisch |

### Regeln

- Ohne Methodenparameter: mittleres Segment = nur Ausgangssituation (`GetAll_GivenNoEntries_ReturnsEmptyList`)
- Mit Parametern oder vorbereitetem Arrange: Ausgangssituation **und** Eingabe (`Calculate_GivenTwoParametersInDb_WithTaskId_ReturnsAggregatedValues`)
- **Verboten:** `WhenCalled`, `WithInput`, `ReturnsResult`, `should do something` — wenn nicht unterscheidend
- **Ein Test = ein Verhalten** — nicht mehrere unabhängige Assertions zu verschiedenen Verhaltensweisen in einem Test
- Triviale `should be created`-Tests nur, wenn sie echten Setup-Mehrwert haben; sonst weglassen

### Schlecht vs. gut

| Schlecht | Gut |
|----------|-----|
| `Add_WhenCalled_StoresEntry` | `Add_GivenEmptyLog_WithFrontendInfoMessage_StoresSingleEntry` |
| `GetAll_WhenCalled_ReturnsEmptyList` | `GetAll_GivenNoEntries_ReturnsEmptyList` |
| `Calculate_WithInput_ReturnsResult` | `Calculate_GivenTwoParametersInDb_WithTaskId_ReturnsAggregatedValues` |
| `it('should work', …)` | `it('save_GivenValidDto_WithGridState_PersistsBuffer', …)` |

### Gruppierung (optional)

- **.NET:** Klassenname `<ClassName>Tests`; Methodenname trägt das Szenario
- **Angular:** `describe('ClassName')`; optional `describe('methodName')` für mehrere Szenarien; `it(...)` trägt das vollständige Szenario

## Framework-Beispiele

| Stack | Datei |
|-------|-------|
| .NET (xUnit, `[Theory]`) | [frameworks/dotnet/naming-examples.md](../frameworks/dotnet/naming-examples.md) |
| Angular (Jasmine `it`) | [frameworks/angular/naming-examples.md](../frameworks/angular/naming-examples.md) |
