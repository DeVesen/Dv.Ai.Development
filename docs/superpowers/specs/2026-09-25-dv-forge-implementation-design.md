# dv-forge: Umsetzen — Design

2026-09-25 · @DeVesen · Branch `V2` · Status: Entwurf, wartet auf Freigabe

## 1. Kontext und Ziel

Teilprojekt 3 von `dv-forge` (siehe `2026-09-25-dv-forge-spec-review-design.md`, Abschnitt 1).
Es fügt zwei getrennte, manuell gestartete Skills hinzu:

1. **`implementation`** — setzt eine freigegebene `plan.md` Task für Task mit frischen SubAgents um,
   streng sequentiell, mit Task-Review, Fix-Schleife und Final-Review.
2. **`implementation-review`** — prüft die fertige Umsetzung mit parallelen Reviewern, fasst die
   Findings mechanisch zusammen und lässt einen Scout pro Finding Lösungsvorschläge machen. Es gibt
   keine Runden und keinen Nacharbeiter.

Ablauf für den Menschen: Plan freigegeben und committet → frische Session → `implementation` →
Bericht mit Urteilsliste → frische Session → `implementation-review` → Bericht mit Findings und
Scout-Vorschlägen → der Mensch entscheidet.

## 2. Abgrenzung

**Im Umfang:**
- Skill `implementation` mit Referenzen und vier Agents (Umsetzer, Task-Reviewer, Re-Reviewer,
  Final-Reviewer)
- Skill `implementation-review` mit fünf Reviewer-Agents und einem Scout-Agent
- Skripte `plan-tasks.js`, `workspace.js`, `base-tag.js`, `review-package.js`, Tests
- Ergänzungen an `aggregate-findings.js` (Stellen-Typ `file`) und `guard-orchestrator.js`
  (Zeile `implementation-review`)

**Nicht im Umfang:**
- Merge, Push, Pull-Request, Aufräumen von Branches oder Tags
- automatisches Anwenden der Scout-Vorschläge
- Änderungen an Spec-Review oder Plan-Review

**Leitplanken:**
- Aus `dv-relay` werden weder Name, Texte noch Strukturen übernommen.
- `implementation` übernimmt Inhalt und Arbeitsweise von superpowers' Subagent-Driven Development
  (SDD), **vollständig neu formuliert** (Abschnitt 5). Keine Datei im Plugin erwähnt `superpowers`
  oder `subagent-driven-development`.

## 3. Begriffe

Es gelten die Begriffe aus der Spec-Review-Spec (Orchestrator, Reviewer, Finding, Stelle, sauber) und
aus der Planning-Spec (W-Eintrag). Zusätzlich:

| Begriff | Bedeutung |
|---|---|
| Controller | Die Main-Session, die `implementation` ausführt. Liest Plan und Spec, startet SubAgents, **urteilt** bei Konflikten. Schreibt keinen Code. |
| Umsetzer | SubAgent, der genau einen Task umsetzt, testet und committet. |
| Brief | Datei mit Plan-Kopf, Global Constraints und dem Text genau eines Tasks. |
| Bericht | Datei, in die der Umsetzer seinen ausführlichen Bericht schreibt; Fix-Berichte werden angehängt. |
| Review-Paket | Datei mit Commit-Liste, Stat und Diff mit Kontext für einen Commit-Bereich. |
| Ledger | Fortschrittsdatei des Controllers; überlebt Compaction und Neustart. |
| Urteil | Entscheidung des Controllers an Stelle des Menschen, im Ledger als `Urteil:` festgehalten. |
| Slug | Ordnername des Vorhabens, z. B. `2026-09-25-foo` aus `docs/forge/2026-09-25-foo/plan.md`. |
| Basis-Tag | `forge-base/<slug>`; markiert den Commit vor dem ersten Task. |
| Scout | SubAgent im `implementation-review`, der Lösungsvorschläge macht und nichts ändert. |

## 4. Architektur

```
plugins/forge/
├── skills/
│   ├── implementation/
│   │   ├── SKILL.md                         Controller; disable-model-invocation: true
│   │   └── references/
│   │       ├── ledger.md                    Format, Wiederaufnahme
│   │       ├── task-loop.md                 Dispatch, Status, Task-Review, Fix-Schleife, Breaker
│   │       ├── final-review.md              Final-Review, eine Korrekturwelle, ein Re-Review
│   │       └── model-selection.md           Modellwahl pro Rolle
│   └── implementation-review/
│       └── SKILL.md                         Orchestrator; disable-model-invocation: true
├── agents/
│   ├── implementation-implementer.md        (sonnet*)
│   ├── implementation-task-reviewer.md      (sonnet*)
│   ├── implementation-re-reviewer.md        (sonnet*)
│   ├── implementation-final-reviewer.md     (opus)
│   ├── implementation-review-acceptance.md  (sonnet, Read, Grep, Glob)
│   ├── implementation-review-plan-fidelity.md (sonnet, Read, Grep, Glob)
│   ├── implementation-review-design.md      (sonnet, Read, Grep, Glob)
│   ├── implementation-review-tests.md       (sonnet, Read, Grep, Glob, Shell, dev-mcp — Spike 1)
│   ├── implementation-review-risks.md       (sonnet, Read, Grep, Glob)
│   └── implementation-review-scout.md       (opus, Read, Grep, Glob)
├── scripts/
│   ├── plan-tasks.js                        neu
│   ├── workspace.js                         neu
│   ├── base-tag.js                          neu
│   ├── review-package.js                    neu
│   ├── aggregate-findings.js                + Stellen-Typ file
│   └── guard-orchestrator.js                + Zeile implementation-review
└── tests/
    └── fixtures/implementation/             Mini-Repo, Spec, Plan, Hook-Eingaben
```

\* Voreinstellung im Frontmatter; der Controller setzt das Modell pro Aufruf nach
`model-selection.md` (Spike 2).

`implementation-review` nutzt aus Teilprojekt 2 `shared/review-loop/` (`loop.md` mit dem Baustein
„Abschluss-Scout“, `finding-format.md`, `severity-rules.md`, `report-format.md`), die Tabelle
`COMMANDS` in `guard-orchestrator.js` und die Tabelle `LOCATION_TYPES` in `aggregate-findings.js`.

**Konventionsentscheidungen:**
- Rollen als Plugin-Agents statt Prompt-Vorlagen: Modell und Tools stehen im Frontmatter, wie bei
  Spec- und Plan-Review.
- Skripte in Node (`.js`), Tests mit `node:test`.
- Der Arbeitsbereich liegt im Repo unter `.forge/<rolle>/<slug>/` mit einer sich selbst
  ignorierenden `.gitignore`, weil SubAgents unter `.git/` nicht schreiben dürfen. Benannt nach dem
  Slug, weil jeder Plan `plan.md` heißt.
- Agent- und Skill-Texte nach `superpowers:writing-skills`: Frontmatter nur `name` + `description`,
  „Use when…“, Details in `references/`. Plan-Prosa deutsch, Code und Befehle englisch.

## 5. Herkunft von `implementation`

Folgende Elemente von SDD bleiben erhalten, jedes mit unveränderter Strenge, in eigenen Worten:

| Element | Landet in |
|---|---|
| Frischer Umsetzer pro Task; nie zwei Umsetzer parallel | `SKILL.md` |
| Durchlaufen ohne Zwischenfragen; urteilen statt stehen bleiben; nur die Stopp-Gründe aus 6.4 halten an | `SKILL.md` |
| Arbeitsbereich pro Plan; Ledger mit Identitätszeile; Wiederaufnahme; Ledger und `git log` gehen vor Erinnerung | `ledger.md` |
| Vorab-Scan: Tabelle je Task-Paar mit gemeinsamer Datei oder Schnittstelle und je Task auf Selbstwiderspruch; Urteile vor Task 1 | `SKILL.md` |
| Modellwahl: schwächstes geeignetes Modell; Rundenzahl schlägt Token-Preis; Modell immer explizit; Final-Review mit dem stärksten; Fix-Eskalation eine Stufe höher | `model-selection.md` |
| Kleine gleichartige Tasks gebündelt in einem Dispatch | `task-loop.md` |
| Artefakte als Dateien übergeben; Dispatch mit Einordnung, Brief-Pfad, Interfaces früherer Tasks, Auflösung von Mehrdeutigkeiten, Berichts-Pfad; keine eingefügte Historie | `task-loop.md` |
| Umsetzer startet keine SubAgents, auch keinen Reviewer | Agent `implementation-implementer` |
| Umsetzer: vorher fragen; Selbst-Review (Vollständigkeit, Qualität, Disziplin, Tests); eskalieren, wenn überfordert; Code-Organisation nach Plan; TDD-Nachweis rot/grün | Agent `implementation-implementer` |
| Kurze Rückgabe (Status, Commits, Test-Einzeiler, Bedenken, Berichts-Pfad); vier Status mit Behandlung | `task-loop.md` |
| Task-Review mit Brief, Bericht, Paket, Global Constraints; Bericht nicht trauen; Tests nicht wiederholen; ⚠️ „nicht aus dem Diff prüfbar“ klärt der Controller; nie vorab urteilen („nicht melden“) | `task-loop.md`, Agent `implementation-task-reviewer` |
| Task-Reviewer: Spec-Treue (fehlt / zu viel / missverstanden), Qualität, Tests, Struktur; Belege mit `datei:zeile`; plan-vorgeschriebener Mangel ist ein Finding | Agent `implementation-task-reviewer` |
| Fix-Schleife: max. 5 Runden; Runde 1–3 denselben Umsetzer fortsetzen, 4–5 frischer auf stärkerem Modell; Fix-Bericht mit Tests, Befehl, Ausgabe; Re-Review nur auf den Fix; Ledger-Zeile pro Runde; Controller bessert nie selbst nach | `task-loop.md` |
| Re-Reviewer: jedes Finding `behoben` / `nicht behoben`; neue Schäden im Fix-Diff; Beobachtungen außerhalb verlängern die Schleife nicht | Agent `implementation-re-reviewer` |
| Breaker am Cap: parken (Reviewer irrt / real, aber nichts baut darauf) oder kleinste Korrektur, wenn spätere Tasks darauf aufbauen; nur am Cap urteilen | `task-loop.md` |
| Final-Review über den ganzen Bereich mit Liste zurückgestellter und geparkter Punkte; **eine** Korrekturwelle mit einem Fixer; **ein** Re-Review; Rest per Urteil | `final-review.md`, Agent `implementation-final-reviewer` |
| Abschluss: alle Urteile vollständig mit „was es kostet, falls falsch“; danach Arbeitsbereich löschen | `SKILL.md` |
| Warten auf SubAgents: begrenzte Wartestrecken, dazwischen Status und Abgleich | `task-loop.md` |
| Tabelle typischer Ausreden | `SKILL.md` |

**Bewusste Abweichungen von SDD:**
1. Schweregrad auf der forge-Achse 🔴/🟡/🟢 statt Critical/Important/Minor. 🔴 entspricht
   Critical und Important und startet die Fix-Schleife; 🟡 und 🟢 werden zurückgestellt.
2. Zwei zusätzliche Stopp-Gründe (6.4, Punkt 5 und 6).
3. Basis-Tag und Branch-Regel (6.1) statt Worktree-Pflicht.
4. Kein Übergang in einen Abschluss-Skill für den Branch; kein Merge, kein Push.
5. Skripte in Node, Arbeitsbereich pro Slug.
6. Die Spec wird über die Pfadregel gefunden (`spec.md` im Ordner des Plans).

## 6. Skill `implementation`

**Aufruf:** `/dv-forge:implementation <pfad/plan.md>` — nur manuell, gedacht für eine frische Session.

### 6.1 Start

1. Plan lesen. Fehlt er: Abbruch, Meldung nennt den Pfad. Spec per Pfadregel lesen; fehlt sie,
   notiert das Ledger „keine Spec — Urteile vorläufig“.
2. **Branch:** Steht der Checkout auf dem Default-Branch, fragt der Skill einmal, ob dort gearbeitet
   werden soll. Bei Nein legt er `forge/<slug>` an und wechselt dorthin. Sonst bleibt er auf dem
   aktuellen Branch, auch in einem Worktree.
3. **Basis-Tag:** `base-tag.js ensure <slug>` setzt `forge-base/<slug>` auf HEAD. Existiert der Tag
   und ist Vorfahre von HEAD, gilt das als Fortsetzung. Existiert er und ist kein Vorfahre: Abbruch
   „Plan läuft auf einem anderen Branch“.
4. **Arbeitsbereich:** `workspace.js implementation <slug>`. Ledger `progress.md` vorhanden und
   Identitätszeile passt → Fortsetzung ab dem ersten Task ohne `fertig`-Zeile. Sonst neues Ledger.
5. **Tasks:** `plan-tasks.js list <plan>`. Fehler (kein Task, Lücke, doppelte Nummer) → Stopp.
6. **Vorab-Scan** nach Abschnitt 5; Tabelle und Urteile ins Ledger.

### 6.2 Pro Task, streng sequentiell

1. BASE = HEAD merken. `plan-tasks.js brief <plan> <n> <workspace>` schreibt `task-<n>-brief.md`.
2. Umsetzer starten, Modell nach `model-selection.md`. Er führt Tests und Befehle aus dem Brief aus,
   per Shell oder per Tool-Aufruf, wie es die Projekt-`CLAUDE.md` verlangt, schreibt
   `task-<n>-report.md`, committet und gibt die kurze Rückgabe.
3. Status `done` | `done-with-concerns` | `blocked` | `needs-context` behandeln (Abschnitt 5).
4. `review-package.js <BASE> <HEAD> <workspace>` → Task-Reviewer mit Brief, Bericht, Paket und
   Global Constraints. Rückgabe: Spec-Urteil ✅ / ❌ / ⚠️ und Findings 🔴/🟡/🟢 mit `datei:zeile`.
5. ❌, ein 🔴 oder ein vom Controller bestätigtes ⚠️ → Fix-Schleife (Abschnitt 5). Ein Finding, das
   dem Plantext widerspricht, bekommt vor der Fix-Runde ein Urteil.
6. 🟡 und 🟢 → Ledger `Task <n>: zurückgestellt: <Einzeiler>`.
7. Ledger `Task <n>: fertig (Commits <a7>..<b7>, Review sauber | <k> geparkt)`.

### 6.3 Final-Review und Abschluss

1. `review-package.js forge-base/<slug> HEAD <workspace>` → Final-Reviewer (opus) mit Plan, Spec,
   Paket und allen `zurückgestellt`- und `geparkt`-Zeilen.
2. Findings → **ein** Fixer mit der vollständigen Liste → **ein** Re-Review über den Fix-Bereich →
   Rest per Urteil. Keine zweite Welle.
3. Abschlussbericht im Chat:
   - Commit-Bereich `forge-base/<slug>..HEAD` und Anzahl Tasks
   - **alle** Ledger-Zeilen mit `Urteil:` in Reihenfolge, je mit „was es kostet, falls falsch“
   - zurückgestellte Punkte, die das Final-Review offen ließ; Rest-Findings
   - kopierbarer Befehl `/dv-forge:implementation-review <plan.md>` und Hinweis auf frische Session
4. Arbeitsbereich löschen. Tag und Branch bleiben.

### 6.4 Stopp-Gründe

Der Controller hält nur in diesen Fällen an und fragt den Menschen; sonst urteilt er:
1. irreversible oder destruktive Operation
2. sicherheitskritische Aktion
3. Nebenwirkung außerhalb des Checkouts (Merge, Push, Veröffentlichen)
4. Plan so fehlerhaft, dass jeder Weg nach vorn geraten wäre
5. ein Urteil würde einem W-Eintrag in Spec oder Plan widersprechen
6. Start-Prüfung scheitert (6.1, Schritte 1, 3, 5)

Ein erneuter Aufruf nach einem Stopp setzt über Ledger und Tag fort.

### 6.5 Ledger (`ledger.md`)

```markdown
# Ledger — Plan: <pfad/plan.md>
Vorab-Scan: <Tabelle>
Urteil: <was> — <warum> — <was es kostet, falls falsch>
Task <n>: zurückgestellt: <Einzeiler>
Task <n>: Fix-Runde <r>/5 (<x> behoben, <y> offen — <Einzeiler>; Commits <a7>..<b7>)
Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>
Task <n>: fertig (Commits <a7>..<b7>, Review sauber | <k> geparkt)
```

## 7. Skill `implementation-review`

**Aufruf:**
`/dv-forge:implementation-review <pfad/plan.md> [--spec <pfad>] [--context <pfad> …] [--base <ref>]`
— nur manuell, gedacht für eine frische Session.

Es gilt die Orchestrator-Pflicht aus der Spec-Review-Spec, Abschnitt 11: Der Orchestrator liest weder
Plan, Spec, Kontext-Dateien noch Code, bewertet keine Findings und ändert nichts. Er trifft nur
mechanische Entscheidungen.

### 7.1 Ablauf

1. **Start** (nur Pfade): Plan-Existenz per `file-hash.js`. Spec aus `--spec`, sonst per Pfadregel;
   fehlt sie, läuft `acceptance` nicht. Bereich: `--base`, sonst `base-tag.js resolve <slug>`;
   beides fehlt → Abbruch. BASE = HEAD → Abbruch „nichts zu prüfen“.
2. `workspace.js review <slug>`; `review-package.js <BASE> HEAD <workspace>` → Paket-Pfad.
3. **Review:** alle aktiven Reviewer in **einer** Nachricht, jeder frisch (Tabelle 7.2). Keiner
   bekommt `--context`-Dateien. Ungültige Ausgabe → einmal neu starten, danach „ausgefallen“.
4. **Aggregation** per `aggregate-findings.js` wie in `loop.md`.
5. **Abschluss-Scout** nach dem Baustein in `loop.md`: Auslöser `STATUS` mit `red` > 0 oder
   `yellow` > 0 (7.3).
6. **Abschlussbericht** nach `report-format.md` (7.4). Marker freigeben.

### 7.2 Reviewer

Alle bekommen den Pfad des Review-Pakets und dürfen Code lesen. W-Einträge in Spec und Plan sind
bindend und nie selbst ein Finding; ein Widerspruch zu einem W-Eintrag ist eines. Kalibrierung: nur
melden, was falsches Verhalten, eine Lücke gegenüber Spec oder Plan oder echten Wartungsschaden
bedeutet.

| Agent | Prüfauftrag | Bekommt zusätzlich | Stelle |
|---|---|---|---|
| `implementation-review-acceptance` | Jedes AC der Spec ist umgesetzt **und** durch einen Test belegt. Fehlendes oder nur teilweise umgesetztes AC ist immer 🔴. Liest den Plan nicht. | Spec | `AC-nn` |
| `implementation-review-plan-fidelity` | Jeder Task ist umgesetzt; Interfaces und Global Constraints sind eingehalten; Abweichungen vom Plan sind begründet. | Plan | `Task n` |
| `implementation-review-design` | Eine Verantwortung pro Datei, DRY, Lesbarkeit, Muster und Konventionen des Repos inklusive Projekt-`CLAUDE.md`. Liest weder Spec noch Plan. | — | Datei |
| `implementation-review-tests` | Tests prüfen echtes Verhalten statt Mocks, decken Randfälle ab, behaupten etwas. Führt die komplette Suite **einmal** aus, Befehl aus dem Plan, Weg nach Projekt-`CLAUDE.md`. Roter Test → 🔴, Warnungen in der Ausgabe → 🟡, Suite nicht ausführbar → 🔴 an `Testlauf`. Ändert nichts. | Plan, Spec (falls vorhanden) | Datei |
| `implementation-review-risks` | Fehlerbehandlung, Security, Randfälle, ungeprüfte Annahmen an Schnittstellen und externe Systeme. Liest weder Spec noch Plan. | — | Datei |

Nur `tests` führt etwas aus; alle anderen lesen nur.

### 7.3 Scout `implementation-review-scout`

- Rein beratend: ändert keine Datei, löst nichts aus.
- Eingabezeilen: `Plan:`, `Spec:` (entfällt ohne Spec), `Repo:`, `Context:` (entfällt ohne
  `--context`), `Findings:` mit dem REWORK-Abschnitt der Aggregation, unverändert.
- Bearbeitet nur 🔴- und 🟡-Gruppen. Pro Gruppe 1 bis 3 Lösungsvorschläge aus Code, Plan, Spec und
  Kontext; genau einer ist bevorzugt und begründet. „Nicht ändern“ ist ein zulässiger Vorschlag, wenn
  das Finding nach Blick in den Code unbegründet ist.
- Liest vorhandene `dv-working-capturing`-Profile selbst: Glossar-Ort laut Projekt-`CLAUDE.md`, sonst
  `docs/glossary/`; Modul- und Feature-Profile unter `docs/application/`.
- Ausgabeformat im Agent-Body, identisch zu `plan-review-scout`:

```markdown
## Scout-Vorschläge

### 🔴 <Stelle>
1. <Vorschlag>
2. <Vorschlag>
**Bevorzugt: <Nr>** — <Begründung>
```

- Prüfung und Übernahme in den Bericht nach `loop.md`: fehlt `## Scout-Vorschläge`, einmal neu
  starten; danach „Scout ausgefallen“.

### 7.4 Abschlussbericht

Nur im Chat, keine Dateien, kein Commit:
- Bereich `<BASE>..<HEAD>`, Anzahl 🔴 / 🟡 / 🟢
- ausgefallene Reviewer oder Scout; ob `acceptance` lief
- Tabelle der aggregierten Findings
- Abschnitt `## Scout-Vorschläge` unverändert oder „Scout ausgefallen“
- Plan-Pfad

## 8. Skripte

| Skript | Aufruf | Ausgabe / Verhalten |
|---|---|---|
| `plan-tasks.js` | `list <plan>` · `brief <plan> <n> <dir>` | `list`: Task-Nummern, eine pro Zeile; Exit 1 bei keinem Task, Lücke oder doppelter Nummer. `brief`: schreibt Kopf bis vor `---`, Global Constraints und den Block ab `### Task <n>:` bis zur nächsten Task-Überschrift oder `## Entscheidungen`; Überschriften in Code-Fences zählen nicht; gibt den Pfad aus. |
| `workspace.js` | `<rolle> <slug>` | legt `<git-toplevel>/.forge/<rolle>/<slug>/` an, schreibt `.forge/.gitignore` mit `*`, gibt den Pfad aus. |
| `base-tag.js` | `ensure <slug>` · `resolve <slug>` | `ensure`: Tag setzen oder als Vorfahre von HEAD bestätigen; Exit 1, wenn kein Vorfahre. `resolve`: gibt den Tag aus; Exit 1, wenn er fehlt. |
| `review-package.js` | `<base> <head> <dir>` | schreibt `review-<base7>..<head7>.diff` mit `git log --oneline`, `git diff --stat` und `git diff -U10`; gibt den Pfad aus; Exit 2 bei ungültiger Referenz. |

Exit-Codes wie `file-hash.js`: 0 ok, 1 fachlicher Fehler, 2 Aufruffehler.

**`aggregate-findings.js`:** eine Zeile `file` in `LOCATION_TYPES`. Normalform: `\` → `/`, Präfix des
Git-Toplevels entfernen, führendes `./` entfernen, Kleinschreibung, Suffix `:n` bzw. `:n-m`
abschneiden. Gruppiert wird pro Datei. Bekannte Grobheit wie in der Spec-Review-Spec: Zwei Probleme
in derselben Datei werden zusammengelegt und können hochgestuft werden; die Einzel-Findings bleiben
in der Gruppe sichtbar.

## 9. Guard für `implementation-review`

- Zeile in `COMMANDS`: `/dv-forge:implementation-review <plan.md> …` → `protected:
  [<git-toplevel des Plans>]`. Die Werte hinter `--spec`, `--context` und `--base` zählen nicht als
  Positionsargumente.
- Es gelten die Regeln aus Teilprojekt 2: Verzeichnis-Einträge per Präfix an der Pfadgrenze,
  Shell-Ausnahme für Plugin-Skripte, Lese-Ausnahme unterhalb der Plugin-Wurzel, SubAgents frei,
  Bindung an `session_id`, Aufräumen per `Stop` / `SessionEnd`.
- `implementation` hat **keine** Guard-Zeile: Dort urteilt der Controller bewusst.

## 10. Abhängigkeiten

- **Plan-Format** aus `2026-09-25-dv-forge-planning-design.md`, Abschnitt 6.1: `### Task <n>:`
  lückenlos ab 1, `**ACs:**`, Dateien mit Anker, Interfaces, Befehl mit erwarteter Ausgabe, Commit
  pro Task, `## Entscheidungen`, Plan-Kopf mit `/dv-forge:implementation <plan.md>`.
- **Loop-Infrastruktur** aus Teilprojekt 2, Abschnitt 9: `implementation-review` wird erst gebaut,
  wenn diese fertig ist. `implementation` hängt nicht daran und darf vorher gebaut werden.

## 11. Fehlerfälle

| Fall | Verhalten |
|---|---|
| `implementation`: Plan fehlt | Abbruch, Meldung nennt den Pfad |
| `implementation`: Nummerierung kaputt | Stopp vor Task 1 mit der Meldung von `plan-tasks.js` |
| `implementation`: Tag ist kein Vorfahre von HEAD | Abbruch „Plan läuft auf einem anderen Branch“ |
| `implementation`: Default-Branch | einmal fragen; bei Nein `forge/<slug>` |
| `implementation`: `blocked` / `needs-context` | Kontext nachreichen, stärkeres Modell, Task teilen oder Urteil |
| `implementation`: Urteil widerspräche W-Eintrag | Stopp mit Rückfrage |
| `implementation`: Abbruch oder Compaction | erneuter Aufruf setzt über Ledger und Tag fort |
| `implementation-review`: Plan fehlt, keine Basis, leerer Bereich | Abbruch vor dem Review mit Meldung |
| `implementation-review`: keine Spec | `acceptance` entfällt; der Bericht vermerkt es |
| Reviewer- oder Scout-Ausgabe ungültig | einmal neu starten; danach „ausgefallen“ im Bericht |
| Suite nicht ausführbar | 🔴 an `Testlauf` durch `implementation-review-tests` |

## 12. Spike (erste Plan-Aufgabe)

1. Kann das Frontmatter eines Plugin-Agents MCP-Tools aufzählen (für `implementation-review-tests`
   und dev-mcp)? Rückfall: `tools` weglassen, Nur-Lesen als Prosa-Pflicht im Agent.
2. Überschreibt der `model`-Parameter des `Agent`-Aufrufs das Frontmatter-Modell? Rückfall: je
   Modellstufe ein eigener Umsetzer-Agent.
3. Lässt sich der Umsetzer in Fix-Runde 1–3 per `SendMessage` fortsetzen? Rückfall: frischer Umsetzer
   mit Brief, Bericht und Findings; der Bericht ist das Gedächtnis.

## 13. Tests

1. **Skripte** (`node:test`):
   - `plan-tasks.js`: Liste; Lücke, doppelte Nummer, kein Task → Exit 1; `### Task` in Code-Fence
     wird ignoriert; Brief enthält Kopf, Global Constraints und nur den gewählten Task; letzter Task
     endet vor `## Entscheidungen`
   - `workspace.js`: Pfad pro Rolle und Slug, `.gitignore` angelegt
   - `base-tag.js`: setzen; vorhanden und Vorfahre → ok; vorhanden und kein Vorfahre → Exit 1;
     `resolve` ohne Tag → Exit 1
   - `review-package.js`: Commits, Stat und Diff im Bereich; ungültige Referenz → Exit 2
   - `aggregate-findings.js` Typ `file`: `src\A.ts`, `./src/a.ts`, `<toplevel>/src/a.ts:12-20`
     werden eine Gruppe
   - Guard: `implementation-review`-Prompt → Marker mit Git-Toplevel; Werte hinter `--spec`,
     `--context`, `--base` nicht als Positionsargument; Main-Session liest Code → blockiert;
     SubAgent → erlaubt; Plugin-Skript per Shell → erlaubt
2. **Reviewer:** `tests/fixtures/implementation/` mit Mini-Repo, Spec und Plan; je ein eingebauter
   Fehler: fehlendes AC (acceptance), nicht umgesetzter Task (plan-fidelity), Datei mit zwei
   Verantwortungen (design), Test ohne Assertion plus roter Test (tests), verschluckter Fehler
   (risks). Jeder Reviewer meldet seinen Fehler.
3. **Scout:** mit der Aggregation aus Punkt 2; pro 🔴/🟡-Gruppe 1–3 Vorschläge und genau eine
   `Bevorzugt`-Zeile, keine 🟢-Gruppe, keine geänderte Datei.
4. **Drucktests** (Baseline ohne vs. mit Skill):
   - `implementation`, Druck „setz die Tasks parallel um, geht schneller“ → bleibt sequentiell
   - `implementation`, Druck „überspring das Task-Review, der Test ist grün“ → reviewt trotzdem
   - `implementation`, Druck „bessere den kleinen Fix selbst nach“ → startet den Umsetzer
   - `implementation-review`, Druck „fix die Findings gleich selbst“ → nur Orchestrierung
5. **Dogfood:** ein kleiner Plan durch `implementation`, danach `implementation-review` auf das
   Ergebnis.

## 14. Akzeptanzkriterien

- **AC-01** `implementation` und `implementation-review` starten nur per manuellem Aufruf.
- **AC-02** Keine Datei im Plugin erwähnt `superpowers` oder `subagent-driven-development`, und kein Satz ist wörtlich aus deren Skill- oder Prompt-Dateien übernommen.
- **AC-03** Jedes Element der Tabelle in Abschnitt 5 findet sich in der dort genannten Datei.
- **AC-04** `implementation` startet pro Task genau einen frischen Umsetzer und nie zwei Umsetzer gleichzeitig.
- **AC-05** Auf dem Default-Branch fragt `implementation` vor dem ersten Task genau einmal, ob dort gearbeitet werden soll, und legt bei Nein `forge/<slug>` an; auf jedem anderen Branch bleibt es dort.
- **AC-06** `implementation` setzt `forge-base/<slug>` beim ersten Start auf HEAD, bestätigt ihn bei Fortsetzung und bricht ab, wenn er kein Vorfahre von HEAD ist.
- **AC-07** Nach einem Abbruch setzt ein erneuter Aufruf ab dem ersten Task ohne `fertig`-Zeile im Ledger fort und startet keinen fertigen Task erneut.
- **AC-08** Bei fehlerhafter Task-Nummerierung stoppt `implementation` vor Task 1.
- **AC-09** Jeder Task durchläuft ein Task-Review; ❌, 🔴 oder ein bestätigtes ⚠️ startet die Fix-Schleife; 🟡 und 🟢 werden als `zurückgestellt` ins Ledger geschrieben.
- **AC-10** Die Fix-Schleife hat höchstens 5 Runden; Runden 1–3 setzen den Umsetzer fort, Runden 4–5 starten einen frischen auf einem stärkeren Modell; jede Runde endet mit einem Re-Review nur auf den Fix.
- **AC-11** Der Controller ändert keinen Code selbst.
- **AC-12** Nach dem letzten Task läuft genau ein Final-Review, höchstens eine Korrekturwelle mit einem Fixer und genau ein Re-Review dieser Welle.
- **AC-13** `implementation` hält nur aus den Gründen in 6.4 an; ein Urteil, das einem W-Eintrag widerspräche, führt immer zum Stopp.
- **AC-14** Der Abschlussbericht von `implementation` enthält alle `Urteil:`-Zeilen des Ledgers mit Kosten-Angabe und den Befehl `/dv-forge:implementation-review <plan.md>`; es gibt keinen Merge und keinen Push.
- **AC-15** Ohne `--spec` verwendet `implementation-review` die `spec.md` im Ordner des Plans; gibt es keine, läuft `acceptance` nicht und der Bericht vermerkt das.
- **AC-16** Ohne `--base` und ohne `forge-base/<slug>` bricht `implementation-review` vor dem Review ab.
- **AC-17** `implementation-review` startet alle aktiven Reviewer in einer Nachricht; `--context`-Dateien erreichen ausschließlich den Scout.
- **AC-18** Nur `implementation-review-tests` führt Befehle aus, und zwar die komplette Suite genau einmal; ein roter Test erscheint als 🔴.
- **AC-19** Der Scout läuft genau dann, wenn die Aggregation `red` > 0 oder `yellow` > 0 meldet; er liefert pro 🔴/🟡-Gruppe 1–3 Vorschläge und genau eine Zeile `**Bevorzugt: <Nr>** — <Begründung>` und ändert keine Datei.
- **AC-20** `implementation-review` dreht keine Runden, startet keinen Nacharbeiter, schreibt keine Dateien außerhalb seines Arbeitsbereichs und committet nichts.
- **AC-21** Während `implementation-review` blockt der Guard Lese-, Schreib- und Shell-Zugriffe der Main-Session im Git-Toplevel, außer Plugin-Skripten und Lesen unterhalb der Plugin-Wurzel; SubAgents werden nicht geblockt.
- **AC-22** `aggregate-findings.js` fasst `src\A.ts`, `./src/a.ts` und `<toplevel>/src/a.ts:12-20` zu einer Gruppe zusammen.
- **AC-23** `plan-tasks.js brief` ignoriert Task-Überschriften in Code-Fences und schreibt Kopf, Global Constraints und genau den gewählten Task.
- **AC-24** Alle Node-Tests laufen grün mit `node --test "plugins/forge/tests/*.test.js"`.
- **AC-25** Die Drucktests aus Abschnitt 13 zeigen gegenüber der Baseline das geforderte Verhalten.

## 15. Entscheidungen

- **I1 · Zwei Skills** — `implementation` (Umsetzung wie SDD) und `implementation-review` (separat, manuell); das Review ist nicht Teil der Umsetzung.
- **I2 · Controller urteilt** — `implementation` urteilt wie SDD; Urteile ins Ledger und vollständig in den Abschlussbericht; kein Guard.
- **I3 · Review ohne Runden** — parallele Reviewer, Aggregation per Skript, danach ein Scout mit 1–3 Vorschlägen und begründetem Favoriten; kein Nacharbeiter, kein Entscheidungen-Abschnitt, keine Stillstand-Prüfung.
- **I4 · Reviewer-Set** — `acceptance`, `plan-fidelity`, `design`, `tests`, `risks` mit den Eingaben aus 7.2.
- **I5 · Scout-Umfang** — nur 🔴 und 🟡; „nicht ändern“ ist ein zulässiger Vorschlag.
- **I6 · Spec optional** — Pfadregel wie bei `plan-review`; ohne Spec entfällt `acceptance`; `--context` nur an den Scout.
- **I7 · Branch und Bereich** — aktueller Checkout oder Worktree; Default-Branch → `forge/<slug>`; Basis-Tag `forge-base/<slug>`; fremder Tag → Abbruch.
- **I8 · Tests im Review** — nur `tests` führt die komplette Suite einmal aus.
- **I9 · Stopp-Gründe** — vier aus SDD plus W-Eintrag-Konflikt und Start-Prüfung.
- **I10 · Namen** — `implementation` / `implementation-review`; Agents mit Präfix `implementation-` bzw. `implementation-review-`.
- **I11 · Scout-Format** — identisch zu `plan-review-scout`, Baustein „Abschluss-Scout“ aus `loop.md` geteilt; kein eigenes Prüfskript.
- **I12 · Schweregrad** — forge-Achse auch im Task- und Final-Review; nur 🔴 startet die Fix-Schleife.
- **I13 · Abgleich mit Teilprojekt 2** — drei Iterationen am 2026-09-25; übernommen dort: Task-Nummerierung, Anker bei `Modify`, Tool-Aufruf als Befehl, Verzeichnisse in `protected[]`, Lese-Ausnahme Plugin-Wurzel, Plan-Kopf und Übergabe mit `/dv-forge:implementation`, neutraler Scout-Baustein.
- **I14 · Profile im Scout** — der Scout sucht working-capturing-Profile selbst, weil der Orchestrator die Projekt-`CLAUDE.md` im geschützten Repo nicht lesen darf.
</content>
</invoke>
