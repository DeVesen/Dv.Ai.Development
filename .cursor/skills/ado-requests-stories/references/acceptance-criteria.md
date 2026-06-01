## Parameter

| Parameter | Beschreibung |
|-----------|-------------|
| `{frontend-path}` | Pfad zum Frontend-Projekt innerhalb von `{code-root}` |
| `{backend-path}` | Pfad zum Backend-Projekt innerhalb von `{code-root}` |

# Akzeptanzkriterien in Task-Markdown



Jede `tasks/task-*.md` führt **`## Akzeptanzkriterien`** mit vier Unterabschnitten. **Nicht** in ADO `System.Description` / Acceptance Criteria schreiben — nur lokal.



## Pflicht bei jeder Aktualisierung



Gilt für **`prüfe`** (Story-/Task-Sync), **`Task … verfeinern`**, explizites Task-Refresh und sinnvolle Bearbeitung der Task-MD durch den Agenten (z. B. nach Umsetzungs-Fortschritt, wenn der Nutzer das implizit erwartet).



**Ausnahme — effektives `TASK-CLOSED`:** Bei `prüfe` den Block `## Akzeptanzkriterien` **nicht** ersetzen und Test-Status **nicht** aus dem Repo ableiten; bestehenden Inhalt beibehalten ([task-overview.md](task-overview.md)). Block-Sync bei `prüfe` gilt nur für **discussion-offene** Tasks.



1. Abschnitt **`## Akzeptanzkriterien`** vorhanden (fehlend → anlegen).

2. **`### Lesbar`** — kurze, für Menschen scanbare Kriterien **ohne** `AC-P`/`AC-I`-IDs (Pflicht nach [task-verfeinern.md](task-verfeinern.md); bei `prüfe` durch **[Task-SubAgent](task-pruefe-subagent.md)** aus `## Anforderung` und `## Story-Bezug` ableiten).

3. **`### Planung`** — testbare ACs für Scope, Architektur, Schnittstellen, Risiken (Vor **Umsetzung** / für [planning-workflow](../../planning-workflow/SKILL.md)).

4. **`### Umsetzung`** — testbare ACs für lieferbares Verhalten (für [implementation-workflow](../../implementation-workflow/SKILL.md)).

5. **`### Testabsicherung`** — **jede** AC-ID aus Planung **und** Umsetzung hat eine Zeile mit konkretem Test (Pfad, Suite, `--include`, oder Backend-Testklasse); Status pflegen.



**Block-Sync bei `prüfe`:** Den **gesamten** `## Akzeptanzkriterien`-Block schreibt der **[Task-SubAgent](task-pruefe-subagent.md)** (idempotent), abgeleitet aus `## Anforderung` und `## Story-Bezug`. Die **Story-Phase** schreibt **keine** ACs. Discussion-closed: Block **unverändert** ([task-overview.md](task-overview.md)).



**Block-Sync bei `Task … verfeinern`:** Gesamten `## Akzeptanzkriterien`-Block aus freigegebener Anforderung schreiben — **nur Phase 5 nach Nutzer-Freigabe** — siehe [task-verfeinern.md](task-verfeinern.md).



## ID- und Formulierungsregeln



| Regel | Detail |

|-------|--------|

| IDs Planung | `AC-P1`, `AC-P2`, … |

| IDs Umsetzung | `AC-I1`, `AC-I2`, … |

| Formulierung | messbar / testbar (Given-When-Then oder klares „sichtbar/ API liefert …“) |

| Mindestumfang | je **≥1** Bullet unter Planung und Umsetzung, sobald `## Anforderung` substanziell ist |

| Duplikate | gleiche Aussage nicht doppelt; Umsetzung verfeinert Planung; `### Lesbar` fasst zusammen, ersetzt keine IDs |



## Testabsicherung (Tabelle)



Mindestspalten:



```markdown

### Testabsicherung



| AC | Test / Spezifikation | Status |

|----|----------------------|--------|

| AC-P1 | `{frontend-path}/.../foo.spec.ts` — … | offen |

| AC-I1 | `{backend-path}/.../FooTests.cs` — … | grün |

```



| Status | Bedeutung |

|--------|-----------|

| `offen` | Test noch nicht implementiert oder nicht gelaufen |

| `grün` | Test existiert und zuletzt erfolgreich (laut Umsetzung/Verifikation) |

| `n/a` | nur mit Kurzbegründung in derselben Zeile |



**Pflicht:** Jede Zeile in `### Planung` und `### Umsetzung` erscheint **mindestens einmal** in der Tabelle. Kein Task gilt als **umsetzungsfertig abgeschlossen**, solange eine AC `offen` ist oder Testabsicherung fehlt.



## Task schließen (`markiere … als fertig`)



Vor `TASK-CLOSED`:



1. `### Testabsicherung` prüfen: alle ACs `grün` (oder dokumentierte `n/a`).

2. Sonst: **nicht** still schließen — Nutzer informieren (fehlende Tests / offene ACs); nur nach expliziter Nutzer-Freigabe „trotzdem schließen“ schließen und Lücken im Abschlussbericht nennen.



## Zusammenspiel Planning / Implementation



| Workflow | Nutzung der Task-AC |

|----------|---------------------|

| `Task … verfeinern` | [task-verfeinern.md](task-verfeinern.md): interaktiver 5-Phasen-Ablauf; `### Lesbar` + `AC-P*` / `AC-I*` / Testabsicherung in der MD **nach Nutzer-Freigabe**; **kein** Vorgehen/Planpaket in die Datei |

| `plane Task …` | [planning-workflow](../../planning-workflow/SKILL.md): Planpaket **im Chat** referenziert `AC-P*`; nach Freigabe ggf. `### Planung` in der MD nachziehen |

| Implementierung | Slices/DoD an `### Umsetzung`; Abschluss nur mit grüner **Testabsicherung** (siehe [implementation-workflow](../../implementation-workflow/SKILL.md) Verifikation) |

| `prüfe` | [task-pruefe-subagent.md](task-pruefe-subagent.md) schreibt AC-Block für **offene** Tasks; discussion-geschlossene: unverändert (kein Task-SubAgent) |



## Erledigte Tasks



In `task-done`-Dateien: gleicher Abschnitt **`## Akzeptanzkriterien`** (ersetzt älteres `## Akzeptanz (abgeleitet)`). Alle relevanten ACs und Tests **`grün`**; optional Kurzverweis unter `## Umsetzung`.



## Platzhalter (neue Task-Datei)



```markdown

## Akzeptanzkriterien



### Lesbar



- _(nach `verfeinern` oder aus Anforderung ableiten)_



### Planung



- [ ] **AC-P1:** _(aus Anforderung ableiten — testbar formulieren)_



### Umsetzung



- [ ] **AC-I1:** _(lieferbares Verhalten — testbar formulieren)_



### Testabsicherung



| AC | Test / Spezifikation | Status |

|----|----------------------|--------|

| AC-P1 | _(noch zu benennen)_ | offen |

| AC-I1 | _(noch zu benennen)_ | offen |

```


