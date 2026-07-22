---
name: regression-audit
description: >
  Use when auditing recent changes for silent regressions, broken existing behaviour,
  or test drift. Triggers: @regression-audit, /regression-audit, regression prüfen,
  hat etwas gebrochen, stille regression, test drift, wöchentlicher audit,
  Änderungen prüfen, wurde etwas beschädigt.
  Opt-out: ohne regression-audit.
---

# Regression Audit

Referenzen on-demand lesen — nicht alle vorab laden.

## Generischer Ablauf

1. **Git-Log einlesen** — letzte N Tage (Default: 7; überschreibbar per Parameter).
   Commits nach Bereich / Subsystem gruppieren.
2. **Stack erkennen** — lies [`references/stack-detection.md`](references/stack-detection.md).
   Passendes Playbook laden, falls unter `references/<stack>.md` vorhanden.
   Falls kein Playbook existiert: generischen Fallback verwenden **und** explizit im Report
   vermerken, dass für diesen Stack noch kein Playbook angelegt ist.
3. **Regressions-Signal pro Bereich** — Kernfrage: *Änderung X gemacht, aber Y nicht
   mitgezogen?* Was Y konkret ist, bestimmt das Stack-Playbook.
4. **Test-Drift-Signal separat auswerten** — Testdatei geändert ohne erkennbare
   Anforderungsänderung in Commit-Message oder PR-Beschreibung?
   → separat im Report ausweisen, nie im allgemeinen Regressions-Abschnitt verstecken.
5. **Report ausgeben** — grün / gelb / rot pro Bereich.
   Unsicherheiten explizit benennen. Kein pauschales „alles ok".

## Referenzen

| Bereich | Datei |
|---------|-------|
| Stack-Erkennung & Fallback-Regeln | [references/stack-detection.md](references/stack-detection.md) |
| Angular | [references/angular.md](references/angular.md) |
| .NET | [references/dotnet.md](references/dotnet.md) |
| Harness- / Config- / Doku-Repo | [references/harness-repo.md](references/harness-repo.md) |

Neue Stack-Playbooks können als `references/<stack>.md` ergänzt werden,
ohne diese SKILL.md anzufassen.
