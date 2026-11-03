<# Wortgleich in: agents/plan-review-architecture.md, agents/plan-review-buildability.md, agents/plan-review-coverage.md, agents/plan-review-feasibility.md, agents/plan-review-risks.md, agents/plan-review-verifier.md -#>
## Kategorie
Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.
- `widerspruch` — zwei Aussagen in Plan oder Spec schließen sich aus, oder der Plan widerspricht der Spec, dem Code oder einer Regel des Projekts.
- `fehlendes-verhalten` — eine Funktion, die der Plan baut, hat gar keinen Test oder eine Aktion gar kein Ergebnis.
- `unerfuellbar` — ein Schritt lässt sich nicht erfüllen oder setzt etwas voraus, das kein Task herstellt.
- `ac-fehlt-im-plan` — ein AC der Spec fehlt im Plan oder ist nur teilweise umgesetzt.
- `umsetzer-steckt-fest` — ein Umsetzer bliebe stecken, müsste raten oder dürfte einen Schritt nicht ausführen, auch bei einem Befehl, den das Projekt verbietet.
- `detail` — Randfall, Schreibweise, Sortierung und jede Einzelheit, die der Umsetzer selbst entscheiden kann.
- `formulierung` — Anmerkung, Formulierung.
