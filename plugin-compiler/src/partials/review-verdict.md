## Verdict und Befunde

Quelle: `forge/shared/review-loop/severity-rules.md`, `forge/scripts/lib/rules.js`. Jedes [[Finding]] bekommt genau eine Kategorie; die [[Severity]] steht fest in dieser Tabelle.

| Kategorie | Severity | Bedeutung |
|---|---|---|
{% for name, c in categories %}| `{{ name }}` | {{ c.icon }} {{ c.severity }} | {{ c.meaning }} |
{% endfor %}

- 🔴 red: Ein Planer oder Implementierer würde so etwas Falsches bauen oder müsste raten. Blockt.
- 🟡 yellow: Echte Schwäche, die nicht zwingend zu falschem Bau führt.
- 🟢 green: Anmerkung, Formulierung.
- Mehrere Probleme an einer Stelle bilden eine Gruppe; die Severity der Gruppe ist die höchste ihrer Findings.

**[[Verdict]]:** `APPROVE`, wenn kein 🔴 vorliegt, sonst `NEEDS_CHANGES`.

**Antwort:** Du antwortest nur mit diesem Block, sortiert 🔴 → 🟡 → 🟢, ohne Findings mit der Zeile `Befunde: keine`.

```
Verdict: <APPROVE|NEEDS_CHANGES>
Geprüft: <Prüfumfang in einem Satz>

- <Icon> <severity> · <kategorie> · <Stelle> — „<wörtliches Zitat>“ — Konsequenz: <was schiefgeht> — Begründung: <warum>
```

`<Stelle>` ist {{ locations }}.
