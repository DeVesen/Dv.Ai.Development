# Golden-Sets der Reviews

Je Datei ein Fall: das Fixture mit eingebauten Mängeln und die Befunde, die ein Review finden soll.

| Datei | Review | Fixture |
|---|---|---|
| `spec-review-flawed.json` | `spec-review` | `tests/fixtures/flawed-spec.md` |
| `plan-review-flawed.json` | `plan-review` | `tests/fixtures/plan-review/plan.md` mit `spec.md` daneben |
| `implementation-review-flawed.json` | `implementation-review` | Repo aus `node tests/fixtures/implementation/build-repo.js <ziel> --flawed` |

## Format
- `erwartet[]`: `id`, `stellen` (eine davon muss gemeldet sein), optional `kategorien`, `minFarbe` (`yellow` oder `red`), `pflicht`. Nur Pflicht-Befunde zählen für den Recall.
- `erlaubt[]`: weitere Stellen, die kein Fehlalarm sind. Alles andere zählt gegen die Precision.

## Messen
1. Das Fixture in ein Wegwerf-Repo kopieren und den Review dort laufen lassen, gern drei Mal für die Stabilität.
2. Jeder Lauf hängt eine Zeile an `<git-common-dir>/dv-forge/metrics/reviews.jsonl` des Wegwerf-Repos.
3. `node scripts/eval-review.js --golden evals/<fall>.json --lauf <…>/reviews.jsonl --letzte 3`

Die Werte vergleichen zwei Stände von Prompts oder Skripten. Bei drei Fällen ist keine Zahl eine Abnahmegrenze: Das Golden-Set misst Regression, nicht Wahrheit.
