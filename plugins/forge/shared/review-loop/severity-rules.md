# Schweregrad

**Reviewer stufen nach Konsequenz ein:**
- `red` 🔴 — Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten. Blockt.
- `yellow` 🟡 — Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- `green` 🟢 — Anmerkung, Formulierung.

**`scripts/aggregate-findings.js` fasst zusammen, der Orchestrator nie selbst:**
1. `location` normalisieren über die Tabelle der Stellen-Typen in `aggregate-findings.js`: `AC-7` = `AC-07`, `Task 3` = `Task 03`; alles andere per Rückfall-Regel (trim, Leerzeichen, Kleinschreibung).
2. Nach normalisierter `location` gruppieren; die Gruppe behält alle Einzel-Findings.
3. Stufe der Gruppe = höchste Stufe ihrer Einzel-Findings.
4. Nennen ≥ 2 verschiedene Reviewer eine 🟡-Gruppe, wird sie 🔴 („hochgestuft“).
5. Sortierung 🔴 → 🟡 → 🟢.

**Sauber** heißt: `STATUS clean=true`, also kein 🔴 und kein ausgefallener Reviewer.

**Bekannte Grobheit:** Verschiedene Probleme an derselben Stelle werden zusammengelegt. Das ist gewollt, weil der Orchestrator nicht inhaltlich urteilt.
