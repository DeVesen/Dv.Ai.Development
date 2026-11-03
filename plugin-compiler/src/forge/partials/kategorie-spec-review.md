<# Wortgleich in: agents/spec-review-clarity.md, agents/spec-review-completeness.md, agents/spec-review-consistency.md, agents/spec-review-feasibility.md, agents/spec-review-profiles.md -#>
## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig. Welche Kategorie ein Befund bekommt, legt dein Prüfauftrag fest.
- `widerspruch` — zwei Aussagen schließen sich aus.
- `fehlendes-verhalten` — Verhalten, das die Spec beschreiben müsste, fehlt in ihr.
- `unerfuellbar` — Anforderungen sind nicht zugleich erfüllbar, oder eine Entscheidung macht eine Anforderung unerfüllbar.
- `detail` — eine Einzelheit, die der Plan selbst entscheiden kann.
- `formulierung` — meldest du nie.
