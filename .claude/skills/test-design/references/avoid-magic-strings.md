# Magic Strings in Tests vermeiden (stack-neutral)

## Was ist ein Magic String?

Ein **Magic String** ist ein String-Literal, das eine **fachliche oder technische Bedeutung** trägt, aber **nicht benannt** ist. Der Wert wirkt „magisch“, weil seine Rolle nur aus dem Kontext erkennbar ist.

In Tests besonders kritisch: derselbe Wert taucht an **mehreren Stellen** auf (Arrange, Mock-Setup, Act, Assert). Ändert sich einer, bricht der Test — oft ohne klare Fehlermeldung.

## Wann auslagern?

| Situation | Handlung |
|-----------|----------|
| String kommt **mehrfach** im Test vor | Konstante auf Testebene (`const` / `private const` / `private static readonly`) |
| Abgeleitete Werte hängen zusammen (`"pipeline"` → `"pipeline.py"` → `"ran pipeline.py"`) | Basiskonstante + abgeleitete Konstanten |
| API-Vertrag (Route, Formularfeld, JSON-Property) in **mehreren Testdateien** | Gemeinsame Konstantenklasse/-datei im **Testbereich** (nicht Produktionscode) |
| Einmalig, sofort verständlich (`"Name is required"`) | Literal bleiben kann — kein Zwang |

## Muster

1. **Szenario-Konstanten** — oben in der Testdatei/-klasse; abhängige Werte aus einer Basis ableiten
2. **API-Vertrags-Konstanten** — Route, Feldnamen, JSON-Properties benennen; bei Wiederholung projektweite Test-Konstanten

**Regel:** Wenn Mock, Request und Assert denselben fachlichen Identifikator brauchen, gibt es **genau eine** Quelle.

## Was kein Magic-String-Problem ist

- Einmalige, selbsterklärende Literale in einem Test
- Framework-/Testdaten ohne Kopplung zwischen Arrange und Assert
- Dynamische Werte im System under Test, wenn Assert über benannte abgeleitete Konstante prüft

## Checkliste vor Commit

1. Kommt derselbe String **zweimal oder öfter** in Arrange/Mock/Act/Assert vor? → Konstante
2. Hängen Werte **voneinander ab** (Name ↔ Dateiname ↔ erwartete Ausgabe)? → eine Basiskonstante + Ableitung
3. Spiegelt der String einen **API-Vertrag** in mehreren Tests? → gemeinsame Test-Konstanten prüfen
4. Konstanten **oben** in Testdatei/-klasse — nicht mitten im Testbody

