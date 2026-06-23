# I/O-Format — acceptance-design

## Input

Akzeptiert drei Eingabeformen — direkt als Text in der Konversation:

| Form | Beispiel |
|------|---------|
| **Prosa** | „Der Nutzer soll sich einloggen können." |
| **ADO-Story** | Story-Text (Acceptance Criteria aus dem Description-Feld) |
| **buddy-Plan-Prompt** | Anforderungsblock aus einem buddy-intake-Ergebnis |

Mehrere Kriterien in einer Eingabe werden einzeln geprüft.

## Output-Struktur

```
## Geschärfte Akzeptanzliste

`<Method>_<Situation>_<Expected>`
- Arrange: <Vorbedingung>
- Act: <Aktion>
- Assert: <Erwartetes Ergebnis>
Status: neu | erweitern | unberührt

[weitere Kriterien ...]

## Befund

> „<Originalformulierung>"
Untestbar/Schärfbar weil: <Kriterium # aus Prüfkatalog>
→ Geschärft zu: `<Method>_<Situation>_<Expected>` — oder → Rückfrage (s. u.)

[weitere Befunde ...]

## Rückfragen

1. <Offene Mehrdeutigkeit — konkrete Frage an den Nutzer>
[weitere Rückfragen ...]
```

**Wenn keine Befunde und keine Rückfragen:** Abschnitte weglassen, nur Akzeptanzliste ausgeben.

## Namenskonvention (F1)

Testnamen folgen der test-design-Konvention:

```
<MethodName>_<AusgangssituationUndEingabe>_<ErwartetesErgebnis>
```

- `MethodName`: betroffene Methode / Aktion / Endpunkt (z. B. `Login`, `GetDashboard`, `CreateOrder`)
- `AusgangssituationUndEingabe`: relevante Vorbedingung + Eingabe (z. B. `MitGültigerEmail`, `OhneAuthentifizierung`)
- `ErwartetesErgebnis`: beobachtbares Ergebnis (z. B. `RedirectZuDashboard`, `Returns401`, `ErstelltBestellung`)

## Status-Markierung

| Status | Bedeutung |
|--------|-----------|
| `neu` | Neuer Testfall, noch nicht im Bestand |
| `erweitern` | Bestehender Test wird um dieses Szenario ergänzt |
| `unberührt` | Bestandstest bleibt unverändert (nur dokumentiert, nicht neu geschrieben) |

Wenn kein Bestand bekannt ist → `neu` als Default.

## Verhalten bei Rückfragen

1. Rückfragen ausgeben.
2. **Warten** — keine Annahmen, kein Weiterarbeiten.
3. Nach Antwort des Nutzers: betroffene Kriterien schärfen und vollständige Ausgabe liefern.
