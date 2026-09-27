---
name: merge-conflict-resolution
description: Use when the user directly asks to resolve a git merge or rebase that is stopped on conflicts — via /dv-forge:merge-conflict-resolution or phrases like „löse den Merge-Konflikt“, „löse die Konflikte“. Not when a conflict shows up while another dv-forge skill, agent or review loop is running; that run handles or reports it itself.
---

# Merge-Konflikte auflösen

Ein laufender Merge oder Rebase steht auf Konflikten. Ziel: jede Konfliktstelle nach der Absicht beider Seiten auflösen, die Projekt-Checks grün bekommen und die Operation vollständig abschließen.

## Wann nicht

Nur auf direkten Auftrag des Users. Taucht ein Konflikt innerhalb eines anderen dv-forge-Skills, -Agents oder Review-Loops auf, greift dieser Skill nicht ein; dort gelten die Regeln des laufenden Ablaufs.

## Ablauf

1. **Lage klären.** Merge oder Rebase? Welche Branches und Commits treffen aufeinander, welche Dateien sind betroffen? Dazu `git status`, die Git-Historie beider Seiten und die Konfliktdateien ansehen.
2. **Absicht beider Seiten verstehen.** Für jede Konfliktstelle zurückverfolgen, warum sie auf jeder Seite geändert wurde: Commit-Messages, zugehörige PRs, ursprüngliche Issues oder Tickets lesen. Erst die Gründe, dann der Diff. Sind PRs oder Tickets nicht erreichbar, tragen Commit-Messages und die Diffs beider Seiten die Absicht.
3. **Jede Konfliktstelle auflösen.** Beide Absichten erhalten, wo sie sich vertragen. Wo nicht, gewinnt die Seite, die zum erklärten Ziel des Merges passt; der Trade-off wird ausdrücklich benannt. Kein Verhalten hinzuerfinden, das auf keiner der beiden Seiten existiert. Immer auflösen — niemals `--abort`. Das gilt auch unter Zeitdruck und wenn der Mensch „nimm einfach eine Seite“ sagt: Vertragen sich beide Absichten, bleiben beide erhalten.
4. **Projekt-Checks laufen lassen.** Die vorhandenen automatischen Prüfungen des Projekts ermitteln und ausführen, typischerweise Typecheck, dann Tests, dann Formatierung. Fehlt eine dieser Prüfungen im Projekt, entfällt sie; du nennst, welche liefen. Was der Merge zerbrochen hat, reparieren.
5. **Abschließen.** Alles stagen und committen. Beim Rebase fortsetzen, bis jeder Commit übertragen ist.

## Red Flags

- „`--ours`/`--theirs` reicht, Hauptsache die Marker sind weg“ — erst die Absicht beider Seiten lesen.
- „Der Mensch hat gesagt, nimm einfach main“ — Eile ist kein Grund, eine vereinbare Absicht zu verwerfen.
- „Die Tests sind grün“ — auch die Tests beider Seiten gehören in die Auflösung, sonst beweist Grün nichts.
- „Ich baue eine Mischlösung, die keiner der Branches hatte“ — kein neues Verhalten.
- „Das wird zu kompliziert, ich breche ab“ — kein `--abort`.
- „Kompiliert, also committe ich“ — erst die Projekt-Checks.
- „Der erste Rebase-Commit ist durch, fertig“ — erst wenn alle Commits übertragen sind.
