<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/plan-review.yaml (examples) -->

# Beispiele: Plan-Review

## Bericht mit Verdict

Quelle: abgeleitet aus forge/shared/review-loop/finding-format.md (Felder) und forge/scripts/lib/rules.js (Kategorie → Farbe)

```
Verdict: APPROVE
Geprüft: 4 Tasks, 6 ACs, 3 Dateien im Repo gelesen, 1 Finding

- 🟡 yellow · detail · Task 2 — „Modify: `src/orders/order-service.js:12-20`“ — Konsequenz: Ohne Anker bricht die Stelle, wenn Task 1 die Datei ändert. — Begründung: Zeilen allein sind kein stabiler Anker.
```
