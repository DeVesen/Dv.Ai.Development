<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/spec-review.yaml (examples) -->

# Beispiele: Spec-Review

## Bericht mit Verdict

Quelle: abgeleitet aus forge/shared/review-loop/finding-format.md (Felder) und forge/scripts/lib/rules.js (Kategorie → Farbe)

```
Verdict: NEEDS_CHANGES
Geprüft: 7 ACs, 3 Abschnitte, 2 Findings

- 🔴 red · widerspruch · AC-05 — „dann ist Exportieren deaktiviert“ ↔ „Exportieren bleibt immer aktiv“ — Konsequenz: Der Plan muss raten, welches Verhalten gilt. — Begründung: Beide Aussagen schließen sich aus.
- 🟡 yellow · detail · AC-02 — „dann lädt die Liste schnell“ — Konsequenz: Kein Maß für „schnell“. — Begründung: Ergebnis ohne Maß.
```
