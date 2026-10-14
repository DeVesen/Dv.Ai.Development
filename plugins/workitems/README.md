# dv-workitems

Workitems spezifizieren und anlegen: vom rohen Wunsch zu entwicklungsfertigen Stories, bis hinein in Azure DevOps.

## Skills

| Skill | Wofür |
|---|---|
| `requirement-definition` | Wunsch im Chat zu einem kompakten Requirement klaeren und eine Empfehlung geben, wie es in Steps geschnitten wird; legt nichts ab, Akzeptanzkriterien auf Nutzerebene, Grenzen in `limits.json` |
| `writing-workitem` | Titel und Description einer User Story für Azure DevOps schreiben, WAS statt WIE, testbare Akzeptanzkriterien |
| `definition-of-ready` | Requirement, Spec, Plan oder Workitem gegen die Definition of Ready prüfen, mit Urteil je Kriterium, Lückenliste und Empfehlung für den Ready-Review |
| `ado-cli` | Azure-DevOps-Workitems über die Azure CLI (`az` + `azure-devops`) lesen, anlegen und eng begrenzt ändern, jeweils nach Bestätigung |

## Einrichten

```text
/plugin install dv-workitems@dv-ai-development
```

## Prüfskript

```text
node scripts/check-requirement.js [--limits <limits.json>] [--strict] [<stand-block.md>]
```

Liest den Stand-Block aus Datei oder Stdin. `FEHLER` (kaputte Struktur, Zyklus, fehlendes Ziel) beenden mit Exit 1, `WARNUNG` (Leitplanke überschritten, Technikbegriff im Kriterium) nur mit `--strict`. Exit 2 bei falschem Aufruf oder unvollständiger `limits.json`. Tests: `node --test tests/*.test.js`.

## Grenzen

- `requirement-definition` arbeitet nur im Chat. Ablage und Zielformat (Markdown, Azure DevOps, Jira) übernehmen andere Skills.
- Die Zahlen für Requirement und Steps in `skills/requirement-definition/limits.json` sind Schätzwerte und nach Praxis anzupassen.
- Das Prüfskript `scripts/check-requirement.js` prüft nur Struktur und Zahlen. Ob ein Step wirklich ein beobachtbares Ergebnis hat, bleibt Urteil. Implementierungsdetails in Kriterien (Pfad, Backticks, Klassenname, Endpunkt) meldet der Lint von `definition-of-ready`; Wörter wie „Datenbank“ erkennt er nicht.
- `requirement-definition` beachtet die Definition of Ready automatisch (Katalog beim Klären, Lint beim Prüfen), gibt aber nie ein Bereitschaftsurteil ab. Das tut nur `definition-of-ready`.
- `pruefkatalog.md` und `splitting-patterns.md` stammen aus der Git-Historie (vor `eae8e47`) und sind nur auf Requirement/Step angepasst.
