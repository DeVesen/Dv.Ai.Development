# Review-Followup und Plan-Anker — Design

**Stand:** 2026-09-28 · **Plugin:** dv-forge (`plugins/forge`), Version 0.15.0 → 0.16.0
**Quelle:** `docs/wishes/all-wishes.md`, Abschnitt 1 (Punkte 3 und 4) und Abschnitt 14 (Zeilen „3 · Scout-Vorschläge umsetzen“, „4 · Anker einmal prüfen“); Belege in `docs/wishes/2026-09-28-*.md` (PR1, PR2, SW, IUR, IRA).

## Ziel

- **A:** Gewählte Scout-Vorschläge laufen per Prozess (Nacharbeiter bzw. Umsetzer + eine schmale Nach-Review-Runde) statt per Hand durch den Hauptagenten.
- **B:** Datei- und Anker-Existenz eines Plans wird einmal deterministisch geprüft; Plan-Reviewer lesen das Ergebnis statt selbst zu suchen.

## Entscheidungen

- **W · Folge-Skill** · Aussage — ein neuer Skill `dv-forge:review-followup` für spec-review, plan-review und implementation-review; ersetzt keine Reviewer, läuft nach dem Review.
- **W · Umsetzer** · Aussage — spec-rework / plan-rework im Modus „nur diese Vorschläge“, bei der Implementierung `implementation-implementer`.
- **W · Nach-Review** · Aussage — genau eine Runde, nur die betroffenen Reviewer aus den Gruppen-Überschriften `### <Stufe> <Stelle> (<Reviewer>)`; bei der Implementierung `implementation-re-reviewer` auf das Fix-Diff.
- **W · Anker-Kommando** · Aussage — `node plan-tasks.js anchors <plan> <repo> <out>` schreibt `<out>/anchors.md`; Ausschnitte nur bei angegebenem Zeilenbereich; Task-Übersicht mit Plan-Zeilenbereichen.
- **W · Nicht dabei** · Aussage — keine semantische Symbol-Existenz aus `Consumes`, kein Profil-Auszug im Spec-Review.
- **W · Auswahl-Syntax** · Aussage — `b` (bevorzugter Vorschlag je Gruppe), `<n>` (Vorschlag n für alle), `<g>:<n|b>,…` (je Gruppe, Gruppen nummeriert in der Reihenfolge von `scout.md`); nicht genannte Gruppen bleiben offen.
- **W · Eintragstyp F** · Aussage — der Folge-Modus schreibt `- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>` (Spec: `human-question` statt `spec-rückfrage`, siehe A6).
- **W · Verkettung** · Aussage — meldet das Nach-Review bei Spec/Plan noch 🔴/🟡, läuft der Scout einmal und die Sicherung wird überschrieben; ein weiterer Followup-Aufruf ist möglich.
- **W · Implementierung ohne Scout** · Aussage — bei der Implementierung läuft nach dem Re-Review kein Scout; offene Punkte stehen im Bericht, nächster Schritt ist das volle Implementierungs-Review.
- **W · Anker-Suche** · Aussage — erst wörtlich; sonst letztes Glied nach `.`, `::` oder `#` als ganzes Wort.
- **W · Frühere Tasks** · Aussage — Anker nicht gefunden, aber ein früherer Task ändert dieselbe Datei: ⚠ statt ❌.
- **W · Review-Art bei plan.md** · Aussage — liegen Sicherungen aus Plan- und Implementierungs-Review vor, gewinnt die jüngste (`savedAt`).
- **W · Ansatz** · Aussage — `prepare.js review-followup` ruft den Original-Preparer mit `--only`; der Skill liest die Reviewer-Eingaben aus dem Original-Skill per `Read`; Mechanik in `scripts/followup.js`.

---

## Teil B: Plan-Anker

### B1 · Kommando `anchors`

`node scripts/plan-tasks.js anchors <plan> <repo> <out>` schreibt `<out>/anchors.md` und gibt den Pfad (POSIX) auf stdout aus. Nummerierungsfehler oder unlesbarer Plan: Exit 1 mit der Meldung von `PlanError`, wie bei `list`. Falsche Argumentzahl: Exit 2 mit `USAGE`.

`FILE_LINE` wird erweitert, damit es neben Art und Pfad den optionalen Zeilenbereich `:<von>-<bis>` und den Anker nach `·` (in Backticks) liefert. Bestehende Aufrufer (`describeTask`) sehen weiter `kind` und `path`.

### B2 · Aufbau von `anchors.md`

```markdown
# Anker-Prüfung: <plan relativ zum Repo>
Repo: <repo> · Plan-Zeilen: <anzahl>

## Tasks
- Task 1: <Titel> — Zeilen <start>-<ende>

## Dateien
### Task 1
- ✅ Modify `src/a.ts` · `Klasse.methode` — Zeile 42 (Glied methode)
- ❌ Modify `src/b.ts` · `foo` — Anker nicht gefunden

## Ausschnitte
### `src/a.ts:40-45` (Task 1)
  40 | <inhalt>
```

Zeilennummern sind 1-basiert. Task-Zeilenbereiche kommen aus `scanPlan` (Überschrift bis Zeile vor dem nächsten Task oder `##`-Abschnitt). Gibt es keine Zeile mit Bereich, lautet der Abschnitt `## Ausschnitte` nur `Keine.`

### B3 · Prüfregeln je Zeile

| Art | Lage | Markierung |
|---|---|---|
| Modify | Pfad verlässt das Repo (`..`, absolut) | ❌ außerhalb des Repos (nicht gelesen) |
| Modify | kein Anker nach `·` | ❌ Anker fehlt |
| Modify | Datei fehlt, früherer Task hat sie per `Create` angelegt | ✅ angelegt in Task n (Anker nicht geprüft) |
| Modify | Datei fehlt sonst | ❌ Datei fehlt |
| Modify | Anker wörtlich gefunden | ✅ Zeile(n) … |
| Modify | Anker über letztes Glied gefunden | ✅ Zeile(n) … (Glied `<glied>`) |
| Modify | nicht gefunden, früherer Task ändert oder legt dieselbe Datei an | ⚠ Anker nicht im Bestand, Datei aus Task n |
| Modify | nicht gefunden sonst | ❌ Anker nicht gefunden |
| Create | Datei existiert nicht | ✅ existiert noch nicht |
| Create | Datei existiert | ❌ existiert schon |
| Test | mit Anker | wie Modify |
| Test | ohne Anker, Datei existiert nicht | ✅ existiert noch nicht |
| Test | ohne Anker, Datei existiert | ❌ bestehende Testdatei ohne Anker |

- Trefferzeilen: höchstens 5, aufsteigend; mehr als 5 → `Zeilen a, b, c, d, e (+k)`.
- Letztes Glied: Teil nach dem letzten `.`, `::` oder `#`, gesucht als ganzes Wort (`\b` bzw. Grenze Nicht-Wortzeichen); nur wenn der Anker einen dieser Trenner enthält.
- „Früherer Task“ heißt kleinere Task-Nummer; Zeilen desselben Tasks zählen nicht.
- Ausschnitt nur bei `datei:von-bis` in der Zeile; `bis` wird auf die Dateilänge gekappt; `von` > Dateilänge → Zeile im Abschnitt `Bereich <von>-<bis> außerhalb der Datei (<n> Zeilen)`. Bei fehlender Datei kein Ausschnitt.
- Dateien werden als UTF-8 gelesen, CRLF wie LF behandelt.

### B4 · `prepare.js plan-review`

Ruft nach `createWorkspace` die Anker-Prüfung (als Funktion aus `plan-tasks.js`) mit `P`, `R`, `W` auf und liefert `A=<W>/anchors.md`. Wirft sie, liefert `prepare.js` kein `A`, sondern `WARN=Anker-Prüfung fehlgeschlagen: <meldung>`, und scheitert nicht.

### B5 · Plan-Review-Skill und Reviewer

- `skills/plan-review/SKILL.md`: `prepare.js` liefert zusätzlich `A` und `WARN`; jede `WARN`-Zeile kommt in die Hinweise. Alle fünf Reviewer bekommen die Zeile `Anker: <A>`, wenn es `A` gibt.
- Alle fünf `agents/plan-review-*.md` (ohne Scout): Eingabe `Anker:` und die Leseregel „Plan einmal ganz lesen, danach nur Abschnitte per Zeilenbereich laut Task-Übersicht in `<Anker>`.“ Ohne `Anker:` gilt der bisherige Ablauf.
- `plan-review-buildability` Auftrag 3: „Jede ❌-Zeile aus `<Anker>` ist ein Finding an ihrem Task; ⚠- und ✅-Zeilen meldest du nicht; Dateien und Anker suchst du nicht selbst.“ Ohne `Anker:` die bisherige Prüfung.
- `plan-review-feasibility`: „Existenz von Dateien und Ankern prüfst du nicht (steht in `<Anker>`).“ Neuer Auftrag: jede ⚠-Zeile gegen den Code des genannten früheren Tasks prüfen; fehlt der Anker auch dort → Finding. Auftrag 1 (`Consumes`) bleibt unverändert.
- `plan-rework` und `plan-review-scout` bleiben unverändert.

---

## Teil A: Review-Followup

### A1 · Scouts schreiben ihr Ergebnis in eine Datei

- `agents/spec-review-scout.md`, `plan-review-scout.md`, `implementation-review-scout.md`: Eingabe `Ergebnis: <pfad>`; der bisherige Abschnitt `## Scout-Vorschläge` wird mit `Write` dorthin geschrieben; Antwort danach nur `Ergebnis geschrieben: <pfad>`. `tools` um `Write` ergänzt. Das Verbot, andere Dateien zu ändern, bleibt.
- `scripts/guard-orchestrator.js`: `REVIEW_AGENT` schließt die Scouts ein (Ausnahme `(?!scout$)` entfällt); sie schreiben dann nur in `.forge/`.
- `scripts/result-check.js`: endet der erwartete Pfad auf `.md`, ist die Prüfung „Datei existiert und enthält eine Zeile `## Scout-Vorschläge`“; sonst Meldung `fehlt` bzw. `enthält keinen Abschnitt ## Scout-Vorschläge`. JSON-Ergebnisse unverändert.

### A2 · `scripts/followup.js`

Sicherungsort: `<repo>/.forge/followup/<rolle>/<slug>/` mit `aggregate.md`, `scout.md`, `meta.json` (`{ "rolle": "...", "savedAt": "<ISO>" }`). Rollen: `spec-review`, `plan-review`, `review`.

- `save <rolle> <slug> <D>`:
  - `<D>/scout.md` vorhanden und mit `## Scout-Vorschläge`: `aggregate.md` und `scout.md` kopieren, `meta.json` schreiben, stdout = Scout-Abschnitt mit nummerierten Gruppen-Überschriften `### <g> · <Stufe> <Stelle>` (Datei selbst unverändert). Exit 0.
  - sonst: bestehende Sicherung dieser Rolle und dieses Slugs löschen, stdout `KEIN SCOUT`, Exit 0.
  - `<D>/aggregate.md` fehlt bei vorhandenem `scout.md`: Exit 1 mit Meldung.
- `drop <rolle> <slug>`: Sicherung löschen, Exit 0 (auch wenn keine da ist).
- Als Modul: `latest(repo, slug, rollen)` (jüngste Sicherung nach `savedAt`, sonst `null`), `groups(sicherung)` (Scout-Gruppen in Reihenfolge, je Gruppe Stufe, Stelle, Vorschläge 1..k, bevorzugte Nummer, zugeordnete Aggregat-Gruppe mit Reviewern und Einzel-Findings).
- Zuordnung Scout-Gruppe → Aggregat-Gruppe über Stufe + Stelle exakt; Reviewer aus der Klammer der Aggregat-Überschrift ohne `· hochgestuft`. Keine passende Aggregat-Gruppe → Fehler mit der Stelle.
- Falscher Aufruf: Exit 2 mit `USAGE`. `followup.js` kommt in `ALLOWED_SCRIPTS` des Guards.

### A3 · `shared/review-loop/loop.md` und `report-format.md`

Abschluss neu:
1. Nennt der Skill einen Scout und zeigt die letzte `STATUS`-Zeile `red` > 0 oder `yellow` > 0: Scout einmal mit den Eingaben aus dem Skill, `Findings: <D>/aggregate.md` und `Ergebnis: <D>/scout.md`.
2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<D>"` — immer, auch ohne Scout (räumt dann die alte Sicherung).
3. Lief der Scout und liefert `save` `KEIN SCOUT`: Scout einmal neu, dann `save` erneut; wieder `KEIN SCOUT` → `Scout ausgefallen`.
4. Bericht; Scout-Abschnitt = Ausgabe von `save`.
5. Die zwei Befehle aus „Jedes Ende“.

`report-format.md`: Die Scout-Zeile verweist auf die Ausgabe von `followup.js save` statt auf die Antwort des Scouts.

### A4 · „Nächster Schritt“ der drei Review-Skills

Auswahl-Hinweis, überall gleich: `Auswahl: b = bevorzugte Vorschläge, 1 = Vorschlag 1 überall, 1:2,3:1 = je Gruppe.`

- `spec-review` „sonst“: `Spec nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <S> <auswahl> oder Spec selbst anpassen und /dv-forge:spec-review <S> erneut.` + Auswahl-Hinweis.
- `spec-review` „sauber“ mit `yellow` > 0: vorangestellter Satz `Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.` + Auswahl-Hinweis; danach der bisherige Text.
- `plan-review` „sonst“: `Plan nicht bereit. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>, oder Plan selbst anpassen und /dv-forge:plan-review <P> erneut; betreffen die Änderungen nur einzelne Reviewer, mit --only <reviewer,...>.` + Auswahl-Hinweis.
- `plan-review` „sauber“ mit `yellow` > 0: wie bei der Spec, mit `<P>`, vor der Commit-Prüfung.
- `implementation-review` `sauber`, `yellow` > 0: `Keine roten Findings. Gelbe Findings und Scout-Vorschläge lesen, gewählte mit /dv-forge:review-followup <P> <auswahl> umsetzen, dann abschließen mit:` + Code-Block `/dv-forge:finish-work` + Auswahl-Hinweis.
- `implementation-review` `geprüft, k × 🔴 offen`: `k rote Findings offen. Findings und Scout-Vorschläge lesen, dann /dv-forge:review-followup <P> <auswahl>.` + Auswahl-Hinweis.

### A5 · `prepare.js review-followup <artefakt> <auswahl>`

1. Artefakt muss existieren (`PrepareError`). Slug: bei `spec.md`-Namen wie `prepareSpecReview`, sonst `slugOf`.
2. Rollen: Enthält das Artefakt mindestens eine Überschrift `### Task <n>:` (`scanPlan`), ist es ein Plan → Kandidaten `plan-review` und `review`, jüngste nach `savedAt` gewinnt; sonst ist es eine Spec → Kandidat `spec-review`. (Spec und Plan im selben Ordner haben denselben Slug; die Inhaltsregel trennt sie.) Keine Sicherung → Exit 1 `Keine Scout-Vorschläge gesichert für <slug>. Zuerst das Review laufen lassen.`
3. Auswahl parsen: `b` | `<n>` | `<g>:<n|b>(,<g>:<n|b>)*`, n und g ganze Zahlen ≥ 1. Syntaxfehler → Exit 2. Gruppe oder Vorschlagsnummer existiert nicht → Exit 1 `Gruppe <g> hat <k> Vorschläge` bzw. `Gruppe <g> gibt es nicht (1-<m>)`.
4. Betroffene Reviewer = Vereinigung der Reviewer der gewählten Gruppen; Original-Preparer (`spec-review` / `plan-review` / `implementation-review`) mit `--only <liste>` aufrufen.
5. Schreibt `<W>/auswahl.md`: je gewählter Gruppe `### <g> · <Stufe> <Stelle> (<Reviewer>)`, die Einzel-Findings aus dem Aggregat, `Gewählt: Vorschlag <n>` und dessen Text.
6. Ausgabe: alle Zeilen des Original-Preparers plus `art=<spec-review|plan-review|implementation-review>`, `F=<W>/auswahl.md`, `gruppen=<g,…>`; bei `implementation-review` zusätzlich `FIX_BASE=<git rev-parse HEAD>`.

### A6 · Nacharbeiter im Folge-Modus

`agents/spec-rework.md` und `agents/plan-rework.md` bekommen einen Abschnitt „Folge-Modus“:
- Erkennbar an `Vorschläge: <pfad>` statt `Findings:`; `Runde:` entfällt.
- Nur die Gruppen der Datei bearbeiten; den gewählten Vorschlag umsetzen. Abweichen nur, wenn er an Spec, Plan oder Code scheitert: dann `nicht geändert` mit Grund.
- Eintrag `- **F · <Stelle>** — geändert | nicht geändert | spec-rückfrage — Vorschlag <n>: <Begründung>`; in der Spec `neue Entscheidung` statt `spec-rückfrage`, im JSON wie bisher `human-question` bzw. `spec-question`.
- Ergebnis-JSON unverändert (`results` mit `location`, `status`).
- `skills/spec-whiteboarding/references/spec-format.md` und `skills/plan-writing/references/plan-format.md`: je eine Zeile für F-Einträge („schreibt nur der Nacharbeiter im Folge-Modus“).

`implementation-implementer` bleibt unverändert (Fix-Runde mit `Findings:` passt).

### A7 · Skill `skills/review-followup/SKILL.md`

Frontmatter: `name: review-followup`, `description: Use when …`, `disable-model-invocation: true`, `argument-hint: <spec.md|plan.md> <auswahl>`. Body < 500 Wörter (Test), Ablauf-Details in `skills/review-followup/references/flow.md`. Rolle wie `loop.md`: orchestriert nur, liest das Artefakt nicht, Skripte als einzelner `node`-Aufruf, Plugin-Dateien mit `Read`.

Ablauf:
1. `prepare.js review-followup $ARGUMENTS`; Exit ≠ 0 → Meldung wörtlich, Ende. `WARN` → Hinweise.
2. `Read` des Original-Skills `skills/<art>/SKILL.md` (Abschnitte Reviewer, Nacharbeiter, Abschluss-Scout) für die Eingabezeilen.
3. **Umsetzen**
   - Spec/Plan: Nacharbeiter des Original-Skills mit dessen Eingaben, `Vorschläge: <F>`, `Ergebnis: <W>/nacharbeit/rework.json`. Danach Zusatz-Stopps des Original-Skills mit `--dir "<W>/nacharbeit"` (Fragen / Spec-Rückfragen sammeln); `all-red-escalated=true` → kein Nach-Review, Bericht.
   - Implementierung: `implementation-implementer` mit `Brief:` = Ausgabe von `plan-tasks.js header "<P>" "<W>"`, `Bericht: <W>/followup-report.md`, `Repo: <R>`, `Findings: <F>`. Status `blocked`/`needs-context` → kein Nach-Review, Bericht mit der Rückgabe.
4. **Nach-Review (eine Runde)**
   - Spec/Plan: Schritte 1–4 aus `loop.md` mit `D = <W>/runde-1` und genau den Reviewern aus `aktiv`; danach Abschluss-Schritte 1–3 aus `loop.md` (Scout, `followup.js save`).
   - Implementierung: `review-package.js <FIX_BASE> HEAD "<W>"`; Exit 1 (Bereich leer) → Status `keine Änderung`. Sonst `implementation-re-reviewer` mit `Brief:`, `Findings: <F>`, `Bericht:`, `Paket:`. Danach `followup.js drop review <slug>`.
5. **Bericht** nach `report-format.md`: Titel `Review-Followup (<art>)`, `Reviews: 1 · Nacharbeiten: 1`; Status `sauber nach Nach-Review` | `k × 🔴 offen nach Nach-Review` | `unvollständig …` | `keine Änderung` | `blockiert`; bei der Implementierung statt `Letztes Review` das Urteil des Re-Reviewers. Zusatz-Abschnitte `### Umgesetzt` (gewählte Gruppen mit Vorschlagsnummer) und, falls vorhanden, Fragen bzw. Spec-Rückfragen wie im Original-Skill.
6. **Nächster Schritt:** sauber → Text des Original-Skills für `sauber`; offen bei Spec/Plan → erneut `/dv-forge:review-followup <artefakt> <auswahl>` (neue Nummern) oder volles Review; offen bei Implementierung → `/dv-forge:implementation-review <P>` erneut.
7. Ende: `workspace.js remove <rolle> <slug>` und `guard-orchestrator.js release <SESSION>`.

### A8 · Guard

`COMMANDS['/dv-forge:review-followup']`: löst mit derselben Regel wie A5 Schritt 2 (gemeinsame Funktion) die Rolle auf und schützt dasselbe wie das Original: `spec-review` → Spec; `plan-review` → Plan + Spec; `review` → Repo. Keine Sicherung → kein Schutz (prepare scheitert ohnehin). Reason-Text analog zu den anderen Einträgen.

---

## Akzeptanzkriterien

- **AC-01** `plan-tasks.js anchors` schreibt `anchors.md` mit Task-Übersicht (Zeilenbereiche) und je Dateizeile genau eine Markierung nach Tabelle B3.
- **AC-02** Ausschnitte erscheinen nur für Zeilen mit `datei:von-bis`, mit Zeilennummern, gekappt auf die Dateilänge.
- **AC-03** `prepare.js plan-review` liefert `A=`; scheitert die Anker-Prüfung, kommt `WARN` statt `A` und Exit 0.
- **AC-04** Plan-Review-Skill und alle fünf Plan-Reviewer enthalten `Anker:` und die Leseregel; buildability meldet nur ❌-Zeilen; feasibility prüft keine Existenz, aber ⚠-Zeilen.
- **AC-05** Alle drei Scouts haben `Write`, schreiben `Ergebnis:`-Datei und antworten nur mit dem Pfad; der Guard beschränkt ihr Schreiben auf `.forge/`.
- **AC-06** `result-check.js` akzeptiert eine `.md`-Ergebnisdatei mit `## Scout-Vorschläge` und blockt eine fehlende oder eine ohne Abschnitt.
- **AC-07** `followup.js save` sichert `aggregate.md` + `scout.md` mit `meta.json` und gibt nummerierte Gruppen aus; ohne `scout.md` löscht es die Sicherung und gibt `KEIN SCOUT` aus; `drop` löscht.
- **AC-08** `loop.md` ruft `followup.js save` im Abschluss vor `workspace.js remove` auf, und der Scout-Abschnitt im Bericht ist dessen Ausgabe.
- **AC-09** Die „Nächster Schritt“-Texte der drei Review-Skills nennen `/dv-forge:review-followup` wie in A4.
- **AC-10** `prepare.js review-followup` wählt die jüngste Sicherung, prüft die Auswahl (Exit 2 Syntax, Exit 1 unbekannte Gruppe/Nummer/keine Sicherung), liefert `aktiv` nur mit betroffenen Reviewern, `art`, `F`, `gruppen` und bei Implementierung `FIX_BASE`.
- **AC-11** `auswahl.md` enthält je gewählter Gruppe Überschrift mit Reviewern, Einzel-Findings und Text des gewählten Vorschlags (bei `b` der bevorzugte).
- **AC-12** `spec-rework` und `plan-rework` beschreiben den Folge-Modus mit F-Einträgen; spec-format und plan-format kennen F.
- **AC-13** Skill `review-followup` existiert mit Frontmatter nach Konvention, < 500 Wörtern, Verweis auf `references/flow.md`, und beschreibt Ablauf A7 inklusive Implementierungs-Zweig ohne Scout.
- **AC-14** Der Guard schützt bei `/dv-forge:review-followup` je nach jüngster Sicherung Spec, Plan + Spec oder Repo; `followup.js` ist erlaubtes Skript.
- **AC-15** Die Testsuite `node --test plugins/forge/tests/*.test.js` ist grün bis auf die vier vorher roten Tests (`cli_Header_WritesHeaderBrief`, `writePackage_Range_WritesFileNamedByShortHashes`, `remove_InWorktree_KeepsBranchWithAllCommits`, `onPrompt_PlanReviewWithSpecLineInPlanHeader_ProtectsThatSpec`).

## Global Constraints

- TDD; Testnamen `<Einheit>_<Situation>_<Erwartung>`.
- Wortgrenzen der Skills (Test); knappe Skills (plan-writing, spec-whiteboarding, init) nicht füllen, sondern in `references/` auslagern.
- Zeilenenden der bestehenden Dateien erhalten (viele CRLF).
- Keine typografischen Anführungszeichen in `agents/implementation-*.md`.
- Orchestrator-Guard: Skripte als einzelner `node`-Aufruf, Plugin-Dateien mit `Read`.
- Conventional Commits `feat(forge): …`; zum Schluss eigener `chore(forge)`-Commit mit Version 0.16.0 in `plugins/forge/.claude-plugin/plugin.json`. Commits nur nach Ja des Menschen, kein Push.
- Nach Abschluss Abschnitt 14 in `docs/wishes/all-wishes.md` für Punkte 3 und 4 auf „umgesetzt“ setzen.
