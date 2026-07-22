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

2. **Intent extrahieren** — lies [`references/commit-intent.md`](references/commit-intent.md).
   Pro Bereich: Was war die Absicht aller Commits zusammen? Der Soll-Zustand ergibt sich aus der
   **Summe aller Commits** im Bereich — spätere Commits verfeinern einzelne Aspekte, löschen
   aber nicht die übrigen Verhaltenserwartungen früherer Commits.

3. **Stack erkennen** — lies [`references/stack-detection.md`](references/stack-detection.md).
   Passendes Playbook laden, falls unter `references/<stack>.md` vorhanden.
   Falls kein Playbook existiert: generischen Fallback nutzen **und** im Report explizit
   vermerken, dass noch kein Playbook für diesen Stack angelegt ist.

4. **Verhaltens-Verifikation pro Bereich** — Kernfrage: *Ist der zuletzt intendierte Zustand
   heute noch present?* Details im Stack-Playbook.
   - Kumulative Prüfung: alle in N Tagen berührten Bereiche **einmalig** gegen den
     aktuellen Stand prüfen — nicht isoliert pro Commit.
   - Software: Tests ausführen + Code-Review für betroffene Bereiche.
   - Nicht-Software: theoretische Analyse (Definition, Referenz, Konfiguration).

5. **TDD-Verletzungs-Signal** (separat) — Feature hinzugefügt ohne begleitenden Test,
   weder im selben noch in einem unmittelbaren Folge-Commit?
   → gesondert im Report, nie mit Test-Drift vermischen.

6. **Test-Drift-Signal** (separat) — Testdatei geändert ohne erkennbare
   Anforderungsänderung in Commit-Message oder PR-Beschreibung?
   → gesondert im Report, nie im allgemeinen Verhaltens-Abschnitt verstecken.

7. **Report ausgeben** — grün / gelb / rot pro Bereich.
   Unsicherheiten explizit benennen. Kein pauschales „alles ok".

## Referenzen

| Bereich | Datei |
|---------|-------|
| Intent-Extraktion | [references/commit-intent.md](references/commit-intent.md) |
| Stack-Erkennung & Fallback | [references/stack-detection.md](references/stack-detection.md) |
| Angular | [references/angular.md](references/angular.md) |
| .NET | [references/dotnet.md](references/dotnet.md) |
| Harness- / Config- / Doku-Repo | [references/harness-repo.md](references/harness-repo.md) |

Neue Stack-Playbooks als `references/<stack>.md` ergänzen — SKILL.md bleibt unberührt.
