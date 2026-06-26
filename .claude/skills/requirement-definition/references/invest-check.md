# INVEST-Check

Inline in der Story-Phase angewandt. Eine Story muss nicht perfekt jedes Kriterium erfuellen —
aber jede Verletzung ist eine bewusste Entscheidung (Klaerung, Splitting oder dokumentierte Annahme).

| Buchstabe | Kriterium | Prueffrage | Bei Verletzung |
|-----------|-----------|------------|----------------|
| **I** | **Independent** | Laesst sich die Story unabhaengig von anderen bauen/ausliefern? | Abhaengigkeit benennen oder Reihenfolge fixieren |
| **N** | **Negotiable** | Beschreibt sie das *Was*, nicht jedes *Wie*-Detail? Bleibt Verhandlungsraum? | Ueber-Spezifikation loesen; Details in „Offene Punkte" |
| **V** | **Valuable** | Liefert sie erkennbaren Nutzen fuer einen Nutzer/Stakeholder? | Kein reiner Technik-Slice → mit Workflow/CRUD vertikal schneiden |
| **E** | **Estimable** | Ist sie genug verstanden, um schaetzbar zu sein? | Spike abspalten (siehe [splitting-patterns.md](splitting-patterns.md)) |
| **S** | **Small** | In *einem* Sprint von *einem* Team baubar? | Splitting-Pattern anwenden |
| **T** | **Testable** | Gibt es eindeutige, gruen/rot pruefbare Akzeptanzkriterien? | AC nach [pruefkatalog](../../acceptance-design/references/pruefkatalog.md) schaerfen |

## Verhalten

- **Verletzung dokumentieren statt verstecken:** Wird eine Verletzung bewusst akzeptiert (z. B. eine
  bekannte Abhaengigkeit), in der Story unter „Annahmen/Offene Punkte" festhalten — **nicht**
  erzwungen splitten.
- **T ist hart:** Eine nicht-testbare Story ist nicht `final`-faehig. Hier verweist der Skill auf den
  AC-Kanon, statt eigene Regeln zu erfinden.
- **N stuetzt die DoR:** `final` ist „ready", nicht „eingefroren" — Negotiable bleibt auch nach `final`
  gewahrt.
