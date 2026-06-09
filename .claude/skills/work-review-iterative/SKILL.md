---
name: work-review-iterative
description: "Iterativer Qualitäts-Review-Loop: führt work-review aus, fixt alle Findings direkt, fragt den User bei Unklarheiten — und wiederholt den Zyklus, bis work-review nichts mehr meldet. Für Skill-Pakete, Dokumentation, Markdown, Code, Analysen und alle anderen Deliverables geeignet. Opt-out: kein-review, no-review, skip-review."
---

Trigger: Wenn explizit `/work-review-iterative` aufgerufen wird oder der User einen iterativen Review-Fix-Loop über ein Deliverable starten möchte.

## Ablauf

Der Loop läuft solange, bis ein vollständiger Review-Durchlauf keine beheblichen Findings mehr liefert.

### Jede Iteration:

**Schritt 1 — Review**
Führe den `work-review`-Skill vollständig aus (siehe `.claude/skills/work-review/SKILL.md`):
Vier parallele Reviewer-Sub-Agents (Pessimist, Strenger Lehrer, Normalo, Professor) begutachten das Deliverable unabhängig voneinander und liefern ihre Reports.

**Schritt 2 — Findings klassifizieren**
Alle Findings aus den vier Reports zusammenführen und kategorisieren:

- **Eindeutig fixbar** — fachliche Fehler, Lücken, Formatierungsprobleme, Widersprüche, veraltete Infos, fehlende Abschnitte, die klar aus dem Kontext ableitbar sind.
- **Klärungsbedürftig** — Findings, bei denen die richtige Lösung nicht eindeutig ist oder eine inhaltliche Entscheidung des Users erfordert.

**Schritt 3 — Klärungsbedürftige Punkte sammeln und fragen**
Alle klärungsbedürftigen Findings in einer einzigen, gebündelten Frage an den User stellen (nicht einzeln nachfragen). Format:

> **Vor dem Fix — kurze Rückfragen:**
>
> 1. [Punkt A] — [Kontext, warum unklar]
> 2. [Punkt B] — ...
>
> Antworten kurz genug, damit ich direkt weiterarbeiten kann.

Auf Antwort warten, bevor der Fix beginnt.

**Schritt 4 — Alle Findings fixen**
Eindeutig fixbare Findings sofort beheben. Klärungsbedürftige Findings nach Erhalt der User-Antworten beheben.
Alle Änderungen direkt im Deliverable vornehmen — keine halben Fixes, keine TODOs hinterlassen.

**Schritt 5 — Iterations-Zusammenfassung**
Kurz ausgeben:
- Wie viele Findings aus welchen Reviewer-Rollen
- Was wurde gefixt
- Was wurde nach User-Klärung gefixt
- Startet nächste Iteration (oder beendet den Loop)

**Schritt 6 — Abbruchbedingung prüfen**
Lieferte der soeben abgeschlossene Review-Durchlauf **keine beheblichen Findings** mehr (alle vier Reviewer melden nur noch marginale oder keine Punkte), endet der Loop.

Abschlussmeldung:
> **Review-Loop abgeschlossen** nach [N] Iteration(en). Das Deliverable hat alle vier Reviewer-Perspektiven ohne offene Findings bestanden.

---

## Referenz

Review-Rollen und deren Kriterien: [`work-review` SKILL.md](./../work-review/SKILL.md)
