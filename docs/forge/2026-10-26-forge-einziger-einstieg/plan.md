# dv-forge: session-orchestrator als einziger Startbefehl — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** dv-forge wird nur noch über `/dv-forge:session-orchestrator` betreten; die Etappen geben nur ihr Ergebnis aus, die Ablage ist der eine Datenkanal, und Regeln und Followup-Maximum stehen je an genau einer Stelle.
**Architektur:** Review- und Followup-Skripte schreiben Bericht und Bericht-Daten (Format 2) direkt in die Ablage der Etappe, die `prepare.js` im Arbeitsbereich festlegt, und geben genau die Review-Statuszeile aus. Die drei Orchestrator-Skills holen sich die Dateinamen mit `orchestrator-state.js ablage` und lesen die Regeln aus `shared/orchestrator-rules.md`. Ein Hook in `guard-orchestrator.js prompt` weist getippte Befehle der 14 Unter-Skills ohne `--debug` ab, und ein Prüftest sichert die Einmaligkeit von Regeln und Followup-Maximum mechanisch ab.
**Tech-Stack:** Node.js (CommonJS, keine Abhängigkeiten), `node:test`, Markdown-Skills, Claude-Code-Hooks
**Spec:** docs/forge/2026-10-26-forge-einziger-einstieg/spec.md
**Basis:** 2e321cc

## Global Constraints
- Vorbedingung: Das Verzeichnis `plugins/forge` hat keine uncommitteten Änderungen; `CONTEXT.md` und die Spec-Ordner unter `docs/forge/` sind ausgenommen. Alle Pfade des Plans liegen unter `plugins/forge/` (Plugin-Wurzel), Tests unter `plugins/forge/tests/`.
- Startbefehl: dv-forge wird nur noch über `/dv-forge:session-orchestrator` betreten, auch mit fertiger Spec oder fertigem Plan mitten in der Session-Kette. `init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe und bleiben von Hand aufrufbar.
- Unter-Skills sind `spec-whiteboarding-with-docs`, `spec-grilling`, `spec-review`, `spec-review-orchestrator`, `plan-writing`, `plan-review`, `plan-orchestrator`, `implementation`, `implementation-review`, `implementation-orchestrator`, `review-followup`, `start-work`, `finish-work` und `spec-whiteboarding`; alle Agents darunter sind Etappen-intern. Die Liste der Unter-Skills steht nur in der Hook-Konfiguration (`scripts/lib/entry-guard.js`).
- Review-Skills (Spec, Plan, Umsetzung, Followup) laufen in genau einer Betriebsart: Der Bericht liegt in der Ablage der Etappe, der Skill gibt genau eine Review-Statuszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>` aus; die Etappen-Statuszeile `[etappe] STATUS=…` steht daneben und zählt nicht mit.
- Die Parameter `--bericht` und `--ablage` entfallen; die Ablage ist immer eingeschaltet. Ein Skript, das eines davon früher annahm, bricht mit `unbekannter Parameter: <name>` und Exit 2 ab.
- Etappen geben nur ihr Ergebnis aus: kein Befehl `/dv-forge:…`, kein Hinweis auf eine frische Session, keine Commit-Frage, keine Empfehlung für einen nächsten Schritt. Blockade-Meldungen und Rückfragen der Leit-Session bleiben. Etappen committen ihre eigenen Pfade ohne Rückfrage; die Leit-Session committet Glossar, Whiteboarding und GO wie bisher.
- Der Chat-Bericht der Leit-Session bleibt bis Teil C unverändert, nur der Abschnitt `Wie es weitergeht` entfällt. Das Schreiben des Ketten-Eintrags bleibt unverändert bis Teil C. Die Pflichttext-Prüfung wird nur so weit angepasst, wie der Wegfall der Doppel-Betriebsart und des Abschnitts es erzwingen.
- Ein Unter-Skill, den ein Mensch ohne `--debug` tippt, wird von einem Hook auf getippte Befehle abgewiesen; die Meldung nennt `/dv-forge:session-orchestrator`, nichts wird geschrieben oder geändert. Mit `--debug` läuft der Unter-Skill ohne Garantie für den Normalweg, mit Slug aus dem Pfad von Spec oder Plan und Etappe aus dem Namen des Skills. Aufrufe durch eine Etappen-Session über das Skill-Werkzeug laufen ohne `--debug`. Unter-Skills sind in Beschreibung und README als intern gekennzeichnet und bleiben im Menü sichtbar.
- Die Regeln (Git-Verbote, `unverändert ausgeben`, Rote Flaggen) und das Maximum der Followup-Runden (zwei) stehen je an genau einer Stelle, der gemeinsamen Regeldatei `shared/orchestrator-rules.md`; Orchestrator-Skills, README und Brief verweisen darauf oder lesen den Wert. Ein Prüftest sichert AC-04, AC-11 und AC-12 mechanisch ab, baut seine Suchmuster aus Teilstrings und findet sich nicht selbst.
- Alle Tests und Evals des Plugins, die den entfallenen Parameter übergeben oder ein Altformat erzeugen, bauen Namen und Marker aus Teilstrings zusammen (`tests/lib/former-names.js`); im Klartext steht beides nirgends im Plugin.
- Altdateien im Format der Doppel-Betriebsart werden nicht mehr gelesen; es gibt keinen Migrationspfad. Eine Ablage im alten Format zählt als fehlende Voraussetzung: Die Etappe endet mit `STATUS=needs-user`, und die einzige weitere Zeile nach der Etappen-Statuszeile nennt die Ursache in einem Satz.
- Tests und Evals werden mit angepasst und sind danach grün.
- Testkonventionen des Plugins: Tests laufen mit `node --test`, Testnamen lauten `<Unit>_<Situation>_<Erwartung>`, jeder Test trennt `// Arrange`, `// Act`, `// Assert`; Code, Kommentare, Dateinamen und Commit-Messages sind im Plugin nach bestehendem Muster deutsch beziehungsweise englisch (Testnamen und Commit-Messages englisch, Kommentare und Skill-Texte deutsch).
- Typografische Anführungszeichen (U+201C, U+201D) stehen in keinem Code-Block dieses Plans; wo ein Test ein deutsches Anführungszeichen braucht, schreibt er `„` und `“` als Escape. Die Arbeitskopie hat CRLF-Zeilenenden (`core.autocrlf=true`); neue Dateien dürfen LF haben.

---

### Task 1: Baseline-Rot beheben (Spec über Verzeichnis-Link)

**ACs:** AC-15

**Dateien:**
- Modify: `plugins/forge/scripts/lib/spec-commit.js:30-45` · `function preflight`
- Test: `plugins/forge/tests/spec-commit.test.js` · `preflight_SpecWasDirtyAtStart_ReportsVorbestand`

**Interfaces:**
- Consumes: `repoWithPlan` aus plugins/forge/tests/lib/git-repo.js (bestehend), `realPath` aus plugins/forge/scripts/lib/posix.js (bestehend)
- Produces: keine neue Schnittstelle; `preflight` meldet `SPEC-VORBESTAND=ja` auch dann, wenn die Spec über einen Verzeichnis-Link oder einen kurzen Windows-Pfad (8.3) erreicht wird

Hintergrund: Vor Task 1 ist `preflight_SpecWasDirtyAtStart_ReportsVorbestand` auf diesem Rechner rot, weil `os.tmpdir()` ein 8.3-Pfad ist (`C:\Users\S6939~1.REI\…`), `git rev-parse --show-toplevel` aber den langen Pfad liefert; `path.relative` zwischen beiden ergibt Unsinn. AC-15 verlangt eine grüne Suite, also gehört die Korrektur in diesen Plan.

- [ ] **Schritt 1: Vorbedingung prüfen und den Link-Test schreiben**
  Vorbedingung des Plans: `git status --porcelain -- plugins/forge` muss leer sein (nur `CONTEXT.md` und Spec-Ordner unter `docs/forge/` dürfen offen sein). Danach in `plugins/forge/tests/spec-commit.test.js` direkt nach dem Test `preflight_SpecWasDirtyAtStart_ReportsVorbestand` einfügen:
  ```js
  test('preflight_SpecReachedThroughDirectoryLink_ReportsVorbestand', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    fs.appendFileSync(spec, 'Vorbestand\n');
    const state = tmp();
    spawnSync(process.execPath, [STATE_SCRIPT, 'start', '--state', state, '--spec', spec], { cwd: repo, encoding: 'utf8' });
    const link = path.join(tmp(), 'link');
    fs.symlinkSync(repo, link, 'junction');

    // Act
    const result = run(repo, 'preflight', '--spec', path.join(link, 'docs/forge/x/spec.md'), '--state', state);

    // Assert
    assert.match(result.stdout, /^ORT=ok\nSPEC-VORBESTAND=ja\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/spec-commit.test.js"` — erwartet: FAIL `preflight_SpecReachedThroughDirectoryLink_ReportsVorbestand` (und weiter FAIL `preflight_SpecWasDirtyAtStart_ReportsVorbestand`, solange der Rechner einen 8.3-TMP hat)
- [ ] **Schritt 3: `preflight` gleicht beide Pfade an**
  In `plugins/forge/scripts/lib/spec-commit.js` den Import `const { toPosix } = require('./posix');` ersetzen durch `const { toPosix, realPath } = require('./posix');` (`realPath` steht in `plugins/forge/scripts/lib/posix.js` und löst 8.3-Pfade und Links auf) und in `preflight` die Zeile `relativeSpec` ersetzen:
  ```js
  const relativeSpec = toPosix(path.relative(realPath(top), realPath(spec)));
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/spec-commit.test.js"` — erwartet: PASS, 14 Tests grün (13 bestehende, darunter `preflight_SpecWasDirtyAtStart_ReportsVorbestand`, und der neue)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/spec-commit.js plugins/forge/tests/spec-commit.test.js` · `git commit -m "fix(forge): spec-commit preflight matches paths reached through links"`

---

### Task 2: Gemeinsame Regeldatei mit dem Followup-Maximum

**ACs:** AC-11, AC-12

**Dateien:**
- Create: `plugins/forge/shared/orchestrator-rules.md`
- Create: `plugins/forge/scripts/lib/orchestrator-rules.js`
- Create: `plugins/forge/tests/orchestrator-rules.test.js`
- Modify: `plugins/forge/scripts/orchestrator-state.js:16-30` · `MAX_FOLLOWUPS`
- Modify: `plugins/forge/scripts/orchestrator-report.js:20-45` · `MAX_FOLLOWUPS`
- Test: `plugins/forge/tests/orchestrator-state.test.js` · `next_TwoFollowupsDone_WeiterEvenIfOffered`
- Test: `plugins/forge/tests/orchestrator-report.test.js` · `höchstens 2 Mal`

**Interfaces:**
- Consumes: `FlowError` aus plugins/forge/scripts/lib/flow-error.js (bestehend)
- Produces: `maxFollowups(file = RULES_FILE): number`, `RulesError` (Unterklasse von FlowError), `RULES_FILE: string` aus plugins/forge/scripts/lib/orchestrator-rules.js; die Datei plugins/forge/shared/orchestrator-rules.md mit den Abschnitten `## Followup-Runden`, `## Git-Verbote`, `## Commits`, `## Ausgabe`, `## Rote Flaggen`

Die Regeldatei ist die eine Stelle für das Maximum der Followup-Runden, die Git-Verbote, die Ausgaberegel und die Roten Flaggen der drei Orchestrator-Skills. Task 8 stellt die Skills, Task 10 den Brief und Task 12 die README auf Verweise um; der Prüftest aus Task 12 sichert die Einmaligkeit.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Neue Datei `plugins/forge/tests/orchestrator-rules.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { maxFollowups, RulesError, RULES_FILE } = require('../scripts/lib/orchestrator-rules');

  function rulesFile(text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-rules-')), 'orchestrator-rules.md');
    fs.writeFileSync(file, text);
    return file;
  }

  test('maxFollowups_ShippedRulesFile_ReturnsTwo', () => {
    // Act
    const max = maxFollowups();

    // Assert
    assert.equal(max, 2);
  });

  test('maxFollowups_OtherNumberInTheLine_IsParsedFromTheFile', () => {
    // Arrange
    const file = rulesFile(`# Regeln\n\n## Followup-Runden\n- ${['Maximum Followup', '-Runden: '].join('')}3\n`);

    // Act
    const max = maxFollowups(file);

    // Assert
    assert.equal(max, 3);
  });

  test('maxFollowups_FileWithoutMaximumLine_ThrowsRulesError', () => {
    // Arrange
    const file = rulesFile('# Regeln\n');

    // Act
    const read = () => maxFollowups(file);

    // Assert
    assert.throws(read, (error) => error instanceof RulesError && /Maximum Followup-Runden/.test(error.message));
  });

  test('rulesFile_Sections_NameFollowupGitCommitsOutputAndRedFlags', () => {
    // Arrange
    const text = fs.readFileSync(RULES_FILE, 'utf8').replace(/\r\n/g, '\n');

    // Assert
    for (const heading of ['## Followup-Runden', '## Git-Verbote', '## Commits', '## Ausgabe', '## Rote Flaggen']) {
      assert.ok(text.includes(`${heading}\n`), `${heading} fehlt`);
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-rules.test.js"` — erwartet: FAIL, Modul `orchestrator-rules` nicht gefunden (`Cannot find module`)
- [ ] **Schritt 3: Regeldatei und Lader anlegen, die zwei Skripte umstellen**
  Neue Datei `plugins/forge/shared/orchestrator-rules.md`:
  ````markdown
  # Regeln der Orchestratoren

  Gemeinsame Regeln von `spec-review-orchestrator`, `plan-orchestrator` und `implementation-orchestrator`. Ihre Skills, die README und der Brief der Session-Kette verweisen auf diese Datei oder lesen den Wert; keine dieser Stellen wiederholt eine Regel.

  ## Followup-Runden
  - Maximum Followup-Runden: 2
  - Eine Runde startet nur, wenn die Review-Statuszeile `FOLLOWUP ja` meldet.

  ## Git-Verbote
  - Du arbeitest im aktuellen Checkout auf dem aktuellen Branch: kein `checkout`, `switch`, `stash`, `rebase`, kein `git worktree`, kein EnterWorktree, kein neuer Branch.
  - Kein Merge, kein Push, kein Force, kein `--no-verify`, kein `git add -A`, `git add .` und `git commit -a`.
  - Eine Anweisung der Projekt-`CLAUDE.md` (Worktree, nie auf master) hebt das nicht auf.

  ## Commits
  - `spec-review-orchestrator` committet nur die Spec und nur über `spec-commit.js`.
  - `plan-orchestrator` und `implementation-orchestrator` committen nie.

  ## Ausgabe
  - Den Abschlussbericht gibst du genau einmal als letzte Ausgabe unverändert aus: der Text nach `=== BERICHT ===`, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.
  - Review und Followup zeigen keinen Bericht; sie geben nur ihre Review-Statuszeile aus.
  - Wünsche des Menschen gegen diese Regeln führst du nicht aus; sie stehen als Zeile `Abweichungen:` im Bericht.

  ## Rote Flaggen
  | Gedanke | Richtig | Gilt für |
  |---|---|---|
  | "Die Projekt-CLAUDE.md verbietet master." | Aktueller Branch; der Spec-Commit gehört zum Lauf. | spec-review-orchestrator |
  | "Scope ist Pflicht, ich frage nach der Nummer." | Ohne Workitem-Nr. kein Scope und keine Frage. | spec-review-orchestrator |
  | "Den Bericht stelle ich selbst zusammen." | Nur `orchestrator-report.js`, unverändert. | alle drei |
  | "Noch eine Followup-Runde." | Das Maximum aus dem Abschnitt Followup-Runden gilt. | alle drei |
  | "Plan bereit, ich committe." | Nie; der Plan bleibt uncommittet. | plan-orchestrator |
  | "Die Spec-Änderung ist harmlos." | Stopp, Diff zeigen, fragen. | plan-orchestrator, implementation-orchestrator |
  | "Alles grün, `finish-work` gleich mit." | Nie; `finish-work` gehört zur Abschluss-Etappe. | implementation-orchestrator |
  | "Für den PR pushen." | Nie. | implementation-orchestrator |
  ````
  Neue Datei `plugins/forge/scripts/lib/orchestrator-rules.js`:
  ```js
  'use strict';

  // Liest den Wert aus shared/orchestrator-rules.md, der einen Stelle für das Maximum der Followup-Runden.
  // Skripte, Skills, Brief und README nennen die Zahl nicht selbst.

  const fs = require('node:fs');
  const path = require('node:path');
  const { FlowError } = require('./flow-error');

  const RULES_FILE = path.join(__dirname, '..', '..', 'shared', 'orchestrator-rules.md');
  const MAX_FOLLOWUPS_LINE = /^- Maximum Followup-Runden: (\d+)[ \t]*$/m;

  class RulesError extends FlowError {}

  function maxFollowups(file = RULES_FILE) {
    const match = MAX_FOLLOWUPS_LINE.exec(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'));
    if (!match) throw new RulesError(`Regeldatei ohne Zeile "Maximum Followup-Runden": ${file}`);
    return Number(match[1]);
  }

  module.exports = { RULES_FILE, RulesError, maxFollowups };
  ```
  In `plugins/forge/scripts/orchestrator-state.js` die Zeile `const MAX_FOLLOWUPS = 2;` entfernen, nach `const { spawnSync } = require('node:child_process');` ergänzen:
  ```js
  const { maxFollowups, RulesError } = require('./lib/orchestrator-rules');
  ```
  und `next` sowie das Fehlerende von `main` ersetzen:
  ```js
  function next(values) {
    const followups = values.followup ?? [];
    const max = maxFollowups();
    if (followups.length > max) throw new StateError(`--followup höchstens ${max} Mal`);
    const last = followups.at(-1) ?? values.review;
    const report = readReport(last);
    if (!report) return ['NEXT=ende', 'GRUND=kein-bericht', `BERICHT=${last}`].join('\n');
    const result = String(report.resultLine ?? '').replace(RESULT_PREFIX, '');
    const status = String(report.status ?? '');
    const lines = [`ERGEBNIS=${result || '-'}`, `BEREIT=${result.startsWith('✅') ? 'ja' : 'nein'}`, `RUNDEN=${followups.length}`];
    if (result.startsWith('⚠️') || status.startsWith('unvollständig')) return ['NEXT=ende', 'GRUND=unvollstaendig', ...lines].join('\n');
    if (report.offersFollowup && followups.length < max) return [`NEXT=followup`, `RUNDE=${followups.length + 1}`, ...lines].join('\n');
    return ['NEXT=weiter', ...lines].join('\n');
  }
  ```
  ```js
    } catch (error) {
      if (!(error instanceof StateError) && !(error instanceof RulesError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  ```
  In `plugins/forge/scripts/orchestrator-report.js` die Zeile `const MAX_FOLLOWUPS = 2;` entfernen, `const { FlowError } = require('./lib/flow-error');` um den Import ergänzen und in `parse` die zwei Verwendungen ersetzen:
  ```js
  const { maxFollowups } = require('./lib/orchestrator-rules');
  ```
  ```js
    const max = maxFollowups();
    if ((followups?.length ?? 0) > max) throw new UsageError(`--followup höchstens ${max} Mal`);
  ```
  (`RulesError` ist ein `FlowError`; `main` meldet ihn bereits mit Exit 1.)
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-rules.test.js" "<R>/plugins/forge/tests/orchestrator-state.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS (die bestehenden Tests `next_TwoFollowupsDone_WeiterEvenIfOffered` und die Prüfung `--followup höchstens 2 Mal` laufen unverändert grün)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/orchestrator-rules.md plugins/forge/scripts/lib/orchestrator-rules.js plugins/forge/scripts/orchestrator-state.js plugins/forge/scripts/orchestrator-report.js plugins/forge/tests/orchestrator-rules.test.js` · `git commit -m "feat(forge): shared orchestrator rules hold the followup maximum"`

---
### Task 3: Spec- und Plan-Review-Bericht ohne Weiter-Abschnitt und ohne Ketten-Empfehlung

**ACs:** AC-01, AC-02, AC-19

**Dateien:**
- Modify: `plugins/forge/scripts/lib/report-text.js:160-208` · `function closingSteps`
- Modify: `plugins/forge/scripts/lib/report-data.js:182-202` · `function chainOf`
- Modify: `plugins/forge/scripts/lib/flow-report.js:57-62` · `const { steps: _steps, ...summary } = summaryOf(input);`
- Test: `plugins/forge/tests/report-text.test.js` · `renderReportText_ReadyWithOneHint_ShowsAgreedLayout`
- Test: `plugins/forge/tests/review-flow-report.test.js` · `report_TwoNotDone_NichtBereitWithTwoHindrances`
- Test: `plugins/forge/tests/chain-reports.test.js` · `specReviewReport_SpecEntryWithWorkitem_NamesPlanOrchestratorWithWorkitem`

**Interfaces:**
- Consumes: `proposedCount(open, color)`, `kindOf(input, hints)`, `resultLine`, `flowLine` aus plugins/forge/scripts/lib/report-text.js (bestehend)
- Produces: `summaryOf(input): { kind, resultLine, flowLine, offersFollowup }` (ohne `steps`); `offersFollowup(kind, open): boolean` aus report-text.js; `buildInput(options, data, status, open)` aus report-data.js liefert kein Feld `chain` mehr; `renderReportText(input)` endet mit dem Abschnitt `### Hinweise zum Ablauf` bzw. dem letzten nicht leeren Abschnitt davor

Der Review-Bericht nennt keinen nächsten Schritt mehr (weder `### Wie es weitergeht` noch einen Befehl, noch den Orchestrator-Schritt aus dem Ketten-Eintrag). Der Steuerfluss bleibt: `offersFollowup` bestimmt wie bisher aus den offenen Gruppen mit Scout-Vorschlag, ob ein Followup etwas erreicht (`FOLLOWUP ja|nein`). Die Hilfsfunktionen `stepLines`, `blockedSteps`, `hintSteps`, `questionSteps`, `withoutProposalSentence`, `DOCUMENT_TEXTS`, `worktreeLine`, `finishStepFor`, `pushLine`, `withWorkitem` bleiben in `report-text.js` stehen, weil `implementation-report-text.js` (Task 4) und `orchestrator-report-text.js` (Task 8) sie noch nutzen; Task 8 löscht sie samt ihrem Test.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  `plugins/forge/tests/report-text.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { renderReportText, summaryOf, withoutProposalSentence } = require('../scripts/lib/report-text');

  function base(overrides = {}) {
    return {
      review: 'spec-review', followup: false, title: 'Spec-Review', topic: 'Zugriff mit dem Access-Token', artifact: 'docs/specs/x.md', spec: null,
      status: 'sauber nach Nachprüfung', openRed: 0, reviewerCount: 5, reworked: true, verified: true, chosenCount: 0, failedLabels: [],
      changes: [], decisions: [], questions: [], open: [], notes: [], ...overrides,
    };
  }

  const CHANGE = {
    ok: true, title: 'Anmeldestatus und Browser-Tests', angles: 'Vollständigkeit, Klarheit', description: 'Es fehlte, woran die App erkennt, dass jemand angemeldet ist.',
    change: 'Beides ist jetzt als prüfbare Vorgabe ergänzt.', evidence: null, choice: null,
  };
  const HINT = {
    color: 'yellow', title: 'Antwort bei fremdem Token', angles: 'Klarheit', description: 'Offen ist, ob 401 oder 403 kommt.', recommendation: 'immer 401, weil das Frontend nur danach erneuert.', hasProposal: true,
  };
  const RED_WITHOUT_PROPOSAL = { color: 'red', title: 'Neuer Widerspruch', angles: 'Nachprüfung', description: 'Die Grenze widerspricht dem Ablauf.', recommendation: null, hasProposal: false };
  const RED_WITH_PROPOSAL = { ...RED_WITHOUT_PROPOSAL, title: 'Grenzwert', hasProposal: true };
  const HINT_WITHOUT_PROPOSAL = { ...HINT, recommendation: null, hasProposal: false };

  test('renderReportText_ReadyWithOneHint_ShowsAgreedLayoutWithoutNextSteps', () => {
    // Act
    const text = renderReportText(base({
      changes: [CHANGE], decisions: [{ title: 'Token-Format', decision: 'sofort umsetzen, Risiko akzeptiert' }], open: [HINT],
      notes: ['Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.'],
    }));

    // Assert
    assert.equal(text, [
      '## Spec-Review · Ergebnis · Zugriff mit dem Access-Token',
      '**Ergebnis:** ✅ Bereit zum Planen · 1 kleiner Hinweis offen',
      'Ablauf: Prüfung aus fünf Blickwinkeln, eine Überarbeitung, eine Nachprüfung.',
      '',
      '### Was sich in der Spec geändert hat',
      '- ✅ **Anmeldestatus und Browser-Tests** · gefunden aus: Vollständigkeit, Klarheit',
      '  Es fehlte, woran die App erkennt, dass jemand angemeldet ist.',
      '  Änderung: Beides ist jetzt als prüfbare Vorgabe ergänzt.',
      '  Nachprüfung: bestätigt.',
      '',
      '### Deine Entscheidungen',
      '- **Token-Format:** sofort umsetzen, Risiko akzeptiert',
      '',
      '### Noch offen · kein Hindernis für den Plan',
      '- 🟡 **Antwort bei fremdem Token** · aus: Klarheit',
      '  Offen ist, ob 401 oder 403 kommt.',
      '  Vorschlag (empfohlen): immer 401, weil das Frontend nur danach erneuert.',
      '',
      '### Hinweise zum Ablauf',
      '- Der Prüfer für Fachbegriffe wurde nicht gestartet, weil keine Profile vorliegen. Diese Prüfung fehlt.',
    ].join('\n'));
  });

  test('renderReportText_ReadyWithoutAnything_OmitsEmptySectionsAndTopic', () => {
    // Act
    const text = renderReportText(base({ topic: null, reworked: false, verified: false, reviewerCount: 1 }));

    // Assert
    assert.equal(text, [
      '## Spec-Review · Ergebnis',
      '**Ergebnis:** ✅ Bereit zum Planen',
      'Ablauf: Prüfung aus einem Blickwinkel, keine Überarbeitung, keine Nachprüfung.',
    ].join('\n'));
  });

  test('renderReportText_PlanReviewReadyWithTwoHints_UsesPlanWording', () => {
    // Act
    const text = renderReportText(base({ review: 'plan-review', title: 'Plan-Review', artifact: 'docs/p/plan.md', open: [HINT, { ...HINT, title: 'Zweiter Hinweis' }] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 2 kleine Hinweise offen/);
    assert.match(text, /### Noch offen · kein Hindernis für die Umsetzung/);
    assert.equal(text.includes('Was sich'), false);
  });

  test('renderReportText_Blocked_ShowsHindrancesWithoutRecommendationForUnscoutedOnes', () => {
    // Arrange
    const hindrance = { color: 'red', title: 'Token-Format', angles: 'Widerspruchsfreiheit', description: 'Das Format ist nicht belegt.', recommendation: null, hasProposal: true };

    // Act
    const text = renderReportText(base({ status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [hindrance, { ...hindrance, title: 'Zweites' }] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
    assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Token-Format\*\* · aus: Widerspruchsfreiheit\n  Das Format ist nicht belegt\.\n- 🔴 \*\*Zweites\*\*/);
    assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  });

  test('renderReportText_QuestionsOpen_ListsTheQuestionsForSpecAndPlan', () => {
    // Act
    const spec = renderReportText(base({ status: 'Fragen offen', questions: ['**Leere Eingabe** (betrifft: Eingabe)', '**Zweite Frage** (betrifft: Ablauf)'] }));
    const plan = renderReportText(base({ review: 'plan-review', status: 'Fragen offen', artifact: 'docs/p/plan.md', spec: 'docs/p/spec.md', questions: ['Die Spec legt X nicht fest.'] }));

    // Assert
    assert.match(spec, /\*\*Ergebnis:\*\* ❓ 2 Fragen offen/);
    assert.match(spec, /### Offene Fragen\n- \*\*Leere Eingabe\*\* \(betrifft: Eingabe\)\n- \*\*Zweite Frage\*\*/);
    assert.match(plan, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
    assert.match(plan, /### Offene Fragen\n- Die Spec legt X nicht fest\./);
  });

  test('renderReportText_Incomplete_NamesWhatFailed', () => {
    // Act
    const text = renderReportText(base({ status: 'unvollständig, ausgefallen: nachprüfer', failedLabels: ['Nachprüfung', 'Klarheit'] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Nachprüfung, Klarheit ausgefallen/);
  });

  test('renderReportText_ChangeVariants_ShowEvidenceChoiceAndVerdict', () => {
    // Act
    const text = renderReportText(base({
      changes: [{ ...CHANGE, ok: false, evidence: 'src/export.js', choice: 2 }, { ...CHANGE, title: 'Ohne Urteil', ok: null, change: null }],
    }));

    // Assert
    assert.match(text, /- ⚠️ \*\*Anmeldestatus und Browser-Tests\*\*[^\n]*\n  Es fehlte[^\n]*\n  Änderung: Beides[^\n]*\n  Beleg: src\/export\.js\n  Gewählt: Vorschlag 2\n  Nachprüfung: nicht erledigt\./);
    assert.match(text, /- ⚠️ \*\*Ohne Urteil\*\*[^\n]*\n  Es fehlte[^\n]*\n  Nachprüfung: nicht erfolgt\./);
  });

  test('renderReportText_Followup_ShowsFollowupFlowLineAndNoDecisions', () => {
    // Act
    const text = renderReportText(base({ followup: true, title: 'Review-Followup (spec-review)', chosenCount: 1, changes: [CHANGE], decisions: [{ title: 'X', decision: 'y' }] }));
    const several = renderReportText(base({ followup: true, chosenCount: 3, verified: false }));

    // Assert
    assert.match(text, /^## Review-Followup \(spec-review\) · Ergebnis · Zugriff mit dem Access-Token\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen\nAblauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
    assert.equal(text.includes('Deine Entscheidungen'), false);
    assert.match(several, /Ablauf: 3 gewählte Vorschläge umgesetzt, keine Nachprüfung\./);
  });

  test('renderReportText_Blocks_AreSeparatedByOneBlankLine', () => {
    // Act
    const text = renderReportText(base({ changes: [CHANGE], notes: ['Hinweis.'] }));

    // Assert
    assert.equal(/\n\n\n/.test(text), false);
    assert.ok(text.split('\n\n').length >= 3);
  });

  test('renderReportText_CleanStatusWithOpenHindrance_ReportsNotReady', () => {
    // Arrange: Followup, dessen Status nur die gewählten Gruppen zählt; eine nicht gewählte 🔴 bleibt offen.
    const text = renderReportText(base({ followup: true, title: 'Review-Followup (spec-review)', chosenCount: 1, status: 'sauber nach Nachprüfung', openRed: 1, open: [RED_WITH_PROPOSAL] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.equal(text.includes('plan-writing'), false);
  });

  const KINDS = {
    ready: {},
    hints: { open: [HINT, HINT_WITHOUT_PROPOSAL] },
    blocked: { status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [RED_WITH_PROPOSAL, RED_WITHOUT_PROPOSAL] },
    questions: { status: 'Fragen offen', questions: ['Frage?'] },
    incomplete: { status: 'unvollständig, ausgefallen: nachprüfer', failedLabels: ['Nachprüfung'] },
  };

  for (const review of ['spec-review', 'plan-review']) {
    for (const [kind, overrides] of Object.entries(KINDS)) {
      test(`renderReportText_${review}_${kind}_NamesNoNextStepNoCommandAndNoCommitHint`, () => {
        // Act
        const text = renderReportText(base({ review, artifact: 'docs/p/x.md', spec: 'docs/p/spec.md', ...overrides }));

        // Assert
        assert.equal(/Wie es weitergeht/.test(text), false);
        assert.equal(/\/dv-forge:/.test(text), false);
        assert.equal(/frischen? Session|committen/.test(text), false);
      });
    }
  }

  const OFFER_CASES = [
    ['ready', {}, false],
    ['hints with proposal', { open: [HINT] }, true],
    ['hints without proposal', { open: [HINT_WITHOUT_PROPOSAL, HINT_WITHOUT_PROPOSAL] }, false],
    ['blocked, all without proposal', { status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [RED_WITHOUT_PROPOSAL, RED_WITHOUT_PROPOSAL] }, false],
    ['blocked, one with proposal', { status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [RED_WITH_PROPOSAL, RED_WITHOUT_PROPOSAL] }, true],
    ['blocked, only the hint has a proposal', { status: 'nicht bereit, 1 × 🔴 offen', openRed: 1, open: [RED_WITHOUT_PROPOSAL, HINT] }, false],
    ['questions', { status: 'Fragen offen', questions: ['Frage?'], open: [HINT] }, false],
    ['incomplete', { status: 'unvollständig, ausgefallen: x', failedLabels: ['x'], open: [HINT] }, false],
  ];

  for (const [name, overrides, expected] of OFFER_CASES) {
    test(`summaryOf_${name.replace(/\W+/g, '_')}_OffersFollowup${expected}`, () => {
      // Act
      const summary = summaryOf(base(overrides));

      // Assert
      assert.equal(summary.offersFollowup, expected);
      assert.equal(Object.hasOwn(summary, 'steps'), false);
    });
  }

  test('withoutProposalSentence_CountAndOthers_ChoosesSingularPluralAndRestWording', () => {
    // Act
    const sentences = [
      withoutProposalSentence({ count: 1, others: false, kind: 'hindrance' }),
      withoutProposalSentence({ count: 2, others: false, kind: 'hindrance' }),
      withoutProposalSentence({ count: 1, others: true, kind: 'hindrance' }),
      withoutProposalSentence({ count: 3, others: true, kind: 'hindrance' }),
      withoutProposalSentence({ count: 1, others: false, kind: 'hint' }),
      withoutProposalSentence({ count: 2, others: false, kind: 'hint' }),
      withoutProposalSentence({ count: 1, others: true, kind: 'hint' }),
      withoutProposalSentence({ count: 2, others: true, kind: 'hint' }),
    ];

    // Assert
    assert.deepEqual(sentences, [
      'Das Hindernis hat keinen Lösungsvorschlag.',
      'Die 2 Hindernisse haben keinen Lösungsvorschlag.',
      'Das übrige Hindernis hat keinen Lösungsvorschlag.',
      'Die 3 übrigen Hindernisse haben keinen Lösungsvorschlag.',
      'Der Hinweis hat keinen Lösungsvorschlag.',
      'Die 2 Hinweise haben keinen Lösungsvorschlag.',
      'Der übrige Hinweis hat keinen Lösungsvorschlag.',
      'Die 2 übrigen Hinweise haben keinen Lösungsvorschlag.',
    ]);
  });
  ```
  In `plugins/forge/tests/review-flow-report.test.js` diese Änderungen vornehmen (alle Textstellen stehen genau so in der Datei):
  1. Im Test `report_TwoNotDone_NichtBereitWithTwoHindrances` die Zeile `  assert.match(output, /1\. Die 2 Hindernisse haben keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:/);` entfernen.
  2. Im Test `report_FollowupChosenNotDone_ShowsWarningAndKeepsGroupAsHindranceWithItsSeverityHeading` die Zeile, die mit `  assert.match(output, /1\. Die 2 Hindernisse einarbeiten lassen \(oder das Dokument selbst anpassen\):` beginnt, entfernen.
  3. Im Test `report_FollowupDoneButUnchosenHindranceSaved_NotReadyAndCountMatchesList` die Zeile, die mit `  assert.match(output, /### Wie es weitergeht\n1\. Das Hindernis einarbeiten lassen` beginnt, entfernen.
  4. Im Test `report_PlanFollowupDoneButUnchosenHindranceSaved_NotReadyAndNoCommitStep` die letzte Zeile `  assert.match(result.stdout, /`\/dv-forge:plan-review docs\/x\/plan\.md`/);` entfernen.
  5. Die Konstante `SELF_EDIT_ONE` und die drei Tests `report_OnlyNewRedOfVerificationWithoutScout_NamesSelfEditAndNoFollowup`, `report_NewRedOfVerificationBesideScoutedHindrance_NamesFollowupOnlyForTheScoutedOne` und `report_ScoutFailedWithOpenHindrance_NamesSelfEditAndNoFollowup` ersetzen (die Konstante und die ersten zwei Tests stehen zusammenhängend nach `newRedOfVerificationRun`, der dritte Test steht danach) durch:
  ```js
  test('report_OnlyNewRedOfVerificationWithoutScout_ListsHindranceAndOffersNoFollowup', () => {
    // Arrange
    const env = setup();
    newRedOfVerificationRun(env, 'erledigt');

    // Act
    const output = report(env);

    // Assert
    assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
    assert.match(output, /### Noch offen · Hindernis\n- 🔴 \*\*Deckel\*\* · aus: Nachprüfung/);
    assert.doesNotMatch(output, /review-followup|Wie es weitergeht/);
    assert.equal(embeddedData(env).offersFollowup, false);
  });

  test('report_NewRedOfVerificationBesideScoutedHindrance_OffersFollowupForTheScoutedOne', () => {
    // Arrange
    const env = setup();
    newRedOfVerificationRun(env, 'nicht erledigt');
    fs.writeFileSync(checkedFile(env, 'runde-1', 'scout.md'), AC04_SCOUT);

    // Act
    const output = report(env);

    // Assert
    assert.match(output, /^ENDE nicht bereit, 2 × 🔴 offen\n/);
    assert.doesNotMatch(output, /review-followup|Wie es weitergeht/);
    const scout = fs.readFileSync(checkedFile(env, 'abschluss', 'scout.md'), 'utf8');
    assert.match(scout, /### 🔴 AC-04/);
    assert.doesNotMatch(scout, /Deckel/);
    assert.equal(embeddedData(env).offersFollowup, true);
  });
  ```
  und direkt hinter dem Test `report_ScoutFailedWithOpenHindrance_NamesSelfEditAndNoFollowup`, der dafür ersetzt wird:
  ```js
  test('report_ScoutFailedWithOpenHindrance_ListsHindranceAndOffersNoFollowup', () => {
    // Arrange
    const env = setup();
    runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'nicht erledigt')], findings: [] });
    ['NACHFORDERN', 'NEUSTART', 'AUSGEFALLEN'].forEach(() => nextAttempt(env.workspace, 'scout'));

    // Act
    const output = report(env);

    // Assert
    assert.match(output, /^ENDE nicht bereit, 1 × 🔴 offen\n/);
    assert.match(output, /- Der Scout ist ausgefallen\./);
    assert.doesNotMatch(output, /review-followup|Wie es weitergeht/);
    assert.equal(fs.existsSync(checkedFile(env, 'abschluss', 'scout.md')), false);
    assert.equal(embeddedData(env).offersFollowup, false);
  });
  ```
  (`embeddedData`, `AC04_SCOUT`, `checkedFile`, `runWithVerification` und `newRedOfVerificationRun` stehen schon in der Datei; `embeddedData` ist eine Funktionsdeklaration weiter unten und deshalb schon aufrufbar. `AC04_SCOUT` ist eine `const` weiter unten: Die zwei Tests, die sie nutzen, laufen erst nach der Moduldefinition und sehen sie deshalb.)
  In `plugins/forge/tests/chain-reports.test.js` die Tests `specReviewReport_SpecEntryWithWorkitem_NamesPlanOrchestratorWithWorkitem`, `specReviewReport_SpecEntryWithoutWorkitem_CommandHasNoNumber`, `specReviewReport_NoEntry_NamesPlanWritingAsBefore`, `planReviewReport_EntryOfStageSpec_EqualsReportWithoutEntry` und `planReviewReport_SpecEntryThenPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem` entfernen (jeweils vom `test(`-Aufruf bis zur schließenden `});`) und an ihrer Stelle einfügen:
  ```js
  test('specReviewReport_SpecEntryWithWorkitem_NamesNoOrchestratorStepAndEqualsReportWithoutEntry', () => {
    // Arrange
    const run = specRun();
    const baseline = report(run);
    writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

    // Act
    const text = report(run);

    // Assert
    assert.equal(text, baseline);
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zum Planen/);
    assert.doesNotMatch(text, /plan-orchestrator|plan-writing|Wie es weitergeht|\/dv-forge:/);
  });

  test('planReviewReport_SpecEntryThenPlanEntry_NamesNoOrchestratorStepAndEqualsReportWithoutEntry', () => {
    // Arrange
    const run = planRun();
    const baseline = planReport(run);
    writeEntry({ stage: 'spec', spec: run.spec, wi: '1' });
    writeEntry({ stage: 'plan', plan: run.plan, spec: run.spec, wi: '2' });

    // Act
    const text = planReport(run);

    // Assert
    assert.equal(text, baseline);
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung/);
    assert.doesNotMatch(text, /implementation-orchestrator|dv-forge:implementation|Wie es weitergeht|committen/);
  });
  ```
  Die Tests `specReviewReport_EntryOfStagePlan_EqualsReportWithoutEntry`, `specReviewReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry`, `specReviewReport_EmbeddedRunWithEntry_PrintsSameLinesAndWritesNoEntryIntoJson` und `planReviewReport_PlanEntryWhoseSpecWasDeleted_EqualsReportWithoutEntry` bleiben unverändert; im letzten entfällt die Zeile `  assert.equal(text.includes('implementation-orchestrator'), false);` nicht, sie bleibt gültig.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js"` — erwartet: FAIL, unter anderem `summaryOf_hints_with_proposal_OffersFollowuptrue` (`steps` ist noch vorhanden), `renderReportText_spec-review_ready_NamesNoNextStepNoCommandAndNoCommitHint` und `specReviewReport_SpecEntryWithWorkitem_NamesNoOrchestratorStepAndEqualsReportWithoutEntry`
- [ ] **Schritt 3: Bericht ohne Weiter-Abschnitt und ohne Ketten-Eintrag**
  In `plugins/forge/scripts/lib/report-text.js` die Funktionen `closingSteps` samt Kommentar, `followupCommand` und `steps` löschen, zwischen `section` und `summaryOf` die Funktion `offersFollowup` einfügen, `summaryOf` und `renderReportText` ersetzen:
  ```js
  // Ob ein Followup (`review-followup <A> alle`) etwas erreicht: nur offene Hindernisse bzw. Hinweise mit gesichertem Scout-Vorschlag.
  // Fragen, ein Ausfall und ein bereiter Stand bieten keinen Followup an.
  function offersFollowup(kind, open) {
    if (kind === 'blocked') return proposedCount(open, 'red') > 0;
    if (kind === 'hints') return proposedCount(open, 'yellow') > 0;
    return false;
  }

  // Art, Ergebnis-Zeile und Ablauf; `offersFollowup`: ein Followup erreicht offene Gruppen mit Scout-Vorschlag.
  function summaryOf(input) {
    const hints = input.open.filter((entry) => entry.color === 'yellow').length;
    const kind = kindOf(input, hints);
    return { kind, resultLine: resultLine(input, kind, hints), flowLine: flowLine(input), offersFollowup: offersFollowup(kind, input.open) };
  }

  function renderReportText(input) {
    const hindrances = input.open.filter((entry) => entry.color === 'red');
    const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
    const summary = summaryOf(input);
    const heading = `## ${input.title} · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
    return [
      [heading, summary.resultLine, summary.flowLine],
      ...section(`Was sich ${DOCUMENT_IN[input.review]} geändert hat`, input.changes.flatMap(changeLines)),
      ...section('Deine Entscheidungen', (input.followup ? [] : input.decisions).map((entry) => `- **${entry.title}:** ${entry.decision}`)),
      ...section('Offene Fragen', input.questions.map((line) => `- ${line}`)),
      ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
      ...section(`Noch offen · kein Hindernis für ${NEXT_FOR[input.review]}`, hintEntries.flatMap(openLines)),
      ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ].map((block) => block.join('\n')).join('\n\n');
  }
  ```
  Den Kommentar am Dateikopf (`// Abschlussbericht eines Spec-, Plan-Reviews …`) um den Satz ergänzen: `Der Bericht nennt keinen nächsten Schritt; die Session-Kette entscheidet über den Fortgang.` In der `module.exports`-Zeile `offersFollowup` ergänzen (alle bisherigen Namen bleiben).
  In `plugins/forge/scripts/lib/report-data.js` die Zeile `const { readEntryFor } = require('./chain');`, die Konstante `CHAIN_STAGE`, die Funktion `chainOf` samt beiden Kommentaren und in `buildInput` den Eintrag `chain: chainOf(options),` löschen (`spec: options.spec, chain: chainOf(options),` wird `spec: options.spec,`).
  In `plugins/forge/scripts/lib/flow-report.js` `reportData` ersetzen:
  ```js
  function reportData(input, status) {
    const summary = summaryOf(input);
    return { summary, data: { format: FORMAT, status, ...summary, ...input } };
  }
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/review-flow-ablage.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-text.js plugins/forge/scripts/lib/report-data.js plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/report-text.test.js plugins/forge/tests/review-flow-report.test.js plugins/forge/tests/chain-reports.test.js` · `git commit -m "feat(forge): review report names no next step and no chain recommendation"`

---
### Task 4: Implementierungs-Review-Bericht ohne Weiter-Abschnitt und ohne Ketten-Empfehlung

**ACs:** AC-01, AC-19

**Dateien:**
- Modify: `plugins/forge/scripts/lib/implementation-report-text.js:1-114` · `function nextBlock`
- Modify: `plugins/forge/scripts/lib/implementation-report.js:144-168` · `chain: options.chain ?? null`
- Modify: `plugins/forge/scripts/implementation-report.js:11-50` · `readEntryFor`
- Modify: `plugins/forge/scripts/lib/chain.js:100-119` · `function readEntryFor`
- Test: `plugins/forge/tests/implementation-report-text.test.js` · `renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayout`
- Test: `plugins/forge/tests/implementation-report.test.js` · `implementationReport_Bericht_CarriesHeadingAnchorsForShow`
- Test: `plugins/forge/tests/chain-reports.test.js` · `implementationReport_ImplementationEntry_WorktreeLineFinishStepAndPushLine`
- Test: `plugins/forge/tests/chain.test.js` · `readEntryFor_EmbeddedRun_ReturnsNullEvenWithEntry`

**Interfaces:**
- Consumes: `openLines`, `section`, `viewpointsPhrase` aus plugins/forge/scripts/lib/report-text.js (bestehend)
- Produces: `renderImplementationReport(input): string` ohne Abschnitt `### Wie es weitergeht`; `summaryOf(input): { kind, resultLine, flowLine, checked, found }` (ohne `offersFollowup`); `reportInput` liefert kein Feld `chain` mehr; `readEntryFor` entfällt aus plugins/forge/scripts/lib/chain.js

`FOLLOWUP ja|nein` des Implementierungs-Reviews bleibt wie bisher in `implementation-report.js` berechnet (`input.open.some((entry) => entry.hasProposal)`); der Text nennt weder Befehle noch Worktree noch Push-Zeile. `chain.js write|lookup|remove` und `readEntry` bleiben unverändert (der Ketten-Eintrag wird weiter geschrieben).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  `plugins/forge/tests/implementation-report-text.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { renderImplementationReport, summaryOf } = require('../scripts/lib/implementation-report-text');

  const LINES = [['Abnahmekriterien', 0, 0], ['Treue zum Plan', 0, 0], ['Aufbau', 0, 1], ['Tests', 0, 0], ['Risiken', 0, 0]]
    .map(([name, red, yellow]) => ({ name, red, yellow, failed: false }));
  const HINT = {
    color: 'yellow', title: 'Rundung der Summe', angles: 'Aufbau', description: 'Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
    recommendation: 'die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.', hasProposal: true,
  };
  const HINDRANCE = { color: 'red', title: 'Fehler wird verschluckt', angles: 'Risiken', description: 'Ein Fehler bleibt unbemerkt.', recommendation: null, hasProposal: true };

  function base(overrides = {}) {
    return {
      plan: 'docs/forge/x/plan.md', topic: 'Bestellsumme berechnen', openRed: 0, reviewerCount: 5, range: 'a1b2c3d..HEAD', fileCount: 14, testCount: 6,
      reviewerLines: LINES, failedLabels: [], open: [], notes: [], ...overrides,
    };
  }

  test('renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayoutWithoutNextSteps', () => {
    // Act
    const text = renderImplementationReport(base({
      open: [HINT], notes: ['Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.'],
    }));

    // Assert
    assert.equal(text, [
      '## Implementierungs-Review · Ergebnis · Bestellsumme berechnen',
      '**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen',
      'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung.',
      '',
      '### Was geprüft wurde',
      '- Bereich: `a1b2c3d..HEAD`',
      '- 14 geänderte Dateien, davon 6 Tests',
      '- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken',
      '',
      '### Gefunden',
      '- Abnahmekriterien: 0 Hindernisse, 0 Hinweise',
      '- Treue zum Plan: 0 Hindernisse, 0 Hinweise',
      '- Aufbau: 0 Hindernisse, 1 Hinweis',
      '- Tests: 0 Hindernisse, 0 Hinweise',
      '- Risiken: 0 Hindernisse, 0 Hinweise',
      '',
      '### Noch offen · kein Hindernis für das Abschließen',
      '- 🟡 **Rundung der Summe** · aus: Aufbau',
      '  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
      '  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
      '',
      '### Hinweise zum Ablauf',
      '- Nach dem Umsetzungsbericht (Stand f00ba12) gibt es weitere Commits: 9c8d7e6 Rundung korrigiert. Sie fehlen in den Urteilen der Umsetzung.',
    ].join('\n'));
  });

  test('renderImplementationReport_ReadyWithoutOpenItems_OmitsOpenAndNotesAndTopic', () => {
    // Act
    const text = renderImplementationReport(base({ topic: null, reviewerCount: 1, fileCount: 1, testCount: 0, reviewerLines: [LINES[0]] }));

    // Assert
    assert.match(text, /^## Implementierungs-Review · Ergebnis\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen\nAblauf: Prüfung aus einem Blickwinkel, keine Überarbeitung\./);
    assert.match(text, /- 1 geänderte Datei, davon 0 Tests/);
    assert.equal(text.includes('Noch offen'), false);
    assert.equal(text.includes('Hinweise zum Ablauf'), false);
  });

  test('renderImplementationReport_Blocked_ShowsHindrances', () => {
    // Arrange
    const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 2 } : line));

    // Act
    const text = renderImplementationReport(base({ openRed: 2, open: [HINDRANCE, { ...HINDRANCE, title: 'Zweites' }], reviewerLines: lines }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
    assert.match(text, /- Risiken: 2 Hindernisse, 0 Hinweise/);
    assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Fehler wird verschluckt\*\* · aus: Risiken\n  Ein Fehler bleibt unbemerkt\.\n- 🔴 \*\*Zweites\*\*/);
    assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  });

  test('renderImplementationReport_Incomplete_NamesFailedReviewers', () => {
    // Arrange
    const lines = [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }];

    // Act
    const text = renderImplementationReport(base({ failedLabels: ['Risiken'], reviewerLines: lines, notes: ['Der Prüfer für Risiken ist ausgefallen. Dieser Blickwinkel fehlt in der Prüfung.'] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Risiken ausgefallen/);
    assert.match(text, /- Risiken: ausgefallen/);
  });

  test('renderImplementationReport_OneHindranceAndSeveralHints_UsesSingularAndPlural', () => {
    // Act
    const one = renderImplementationReport(base({ openRed: 1, open: [{ ...HINT, color: 'red' }] }));
    const many = renderImplementationReport(base({ open: [HINT, { ...HINT, title: 'Zweiter' }] }));

    // Assert
    assert.match(one, /⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.match(many, /· 2 kleine Hinweise offen/);
  });

  test('renderImplementationReport_RedEntryButOpenRedZero_ReportsNotReady', () => {
    // Act
    const text = renderImplementationReport(base({ openRed: 0, open: [HINDRANCE] }));

    // Assert
    assert.equal(text.includes('Bereit zum Abschließen'), false);
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
  });

  test('renderImplementationReport_OpenRedAboveListedEntries_ReportsTheReportedCount', () => {
    // Act
    const text = renderImplementationReport(base({ openRed: 2, open: [HINDRANCE] }));

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  });

  test('renderImplementationReport_BlockedWithHint_ShowsFullLayout', () => {
    // Arrange
    const lines = LINES.map((line) => (line.name === 'Risiken' ? { ...line, red: 1 } : line));
    const hindrance = { ...HINDRANCE, recommendation: 'den Fehler an den Aufrufer weitergeben, weil er sonst unbemerkt bleibt.' };

    // Act
    const text = renderImplementationReport(base({ openRed: 1, open: [hindrance, HINT], reviewerLines: lines, reviewerCount: 5 }));

    // Assert
    assert.equal(text, [
      '## Implementierungs-Review · Ergebnis · Bestellsumme berechnen',
      '**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen',
      'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung.',
      '',
      '### Was geprüft wurde',
      '- Bereich: `a1b2c3d..HEAD`',
      '- 14 geänderte Dateien, davon 6 Tests',
      '- Blickwinkel: Abnahmekriterien, Treue zum Plan, Aufbau, Tests, Risiken',
      '',
      '### Gefunden',
      '- Abnahmekriterien: 0 Hindernisse, 0 Hinweise',
      '- Treue zum Plan: 0 Hindernisse, 0 Hinweise',
      '- Aufbau: 0 Hindernisse, 1 Hinweis',
      '- Tests: 0 Hindernisse, 0 Hinweise',
      '- Risiken: 1 Hindernis, 0 Hinweise',
      '',
      '### Noch offen · Hindernis',
      '- 🔴 **Fehler wird verschluckt** · aus: Risiken',
      '  Ein Fehler bleibt unbemerkt.',
      '  Vorschlag (empfohlen): den Fehler an den Aufrufer weitergeben, weil er sonst unbemerkt bleibt.',
      '',
      '### Noch offen · kein Hindernis für das Abschließen',
      '- 🟡 **Rundung der Summe** · aus: Aufbau',
      '  Die Rundung steht an zwei Stellen und kann auseinanderlaufen.',
      '  Vorschlag (empfohlen): die Rundung in einer Funktion bündeln, weil sonst jede Änderung zweimal nötig ist.',
    ].join('\n'));
  });

  const KINDS = {
    ready: {},
    hints: { open: [HINT] },
    blocked: { openRed: 1, open: [HINDRANCE] },
    incomplete: { failedLabels: ['Risiken'], reviewerLines: [...LINES.slice(0, 4), { name: 'Risiken', red: 0, yellow: 0, failed: true }] },
  };

  for (const [kind, overrides] of Object.entries(KINDS)) {
    test(`renderImplementationReport_${kind}_NamesNoNextStepNoCommandAndNoWorktree`, () => {
      // Act
      const text = renderImplementationReport(base(overrides));

      // Assert
      assert.equal(/Wie es weitergeht|Worktree bleibt|Nicht gepusht/.test(text), false);
      assert.equal(/\/dv-forge:/.test(text), false);
      assert.equal(/frischen? Session/.test(text), false);
    });
  }

  test('summaryOf_AnyInput_ReturnsKindResultFlowCheckedAndFoundOnly', () => {
    // Act
    const summary = summaryOf(base({ open: [HINT] }));

    // Assert
    assert.deepEqual(Object.keys(summary).sort(), ['checked', 'flowLine', 'found', 'kind', 'resultLine']);
    assert.equal(summary.kind, 'hints');
  });
  ```
  In `plugins/forge/tests/implementation-report.test.js` diese Änderungen vornehmen:
  1. Im Test `implementationReport_OneYellowWithValidScout_ReadyAndFilesFiltered` die Zeile `  assert.ok(result.stdout.includes(`/dv-forge:review-followup ${env.plan} alle`));` ersetzen durch `  assert.equal(result.stdout.includes('/dv-forge:'), false);`.
  2. Im Test `implementationReport_ScoutMissingOrInvalid_FallbackTextNoteAndNoScoutFile` die Zeile `    assert.match(result.stdout, /1\. Der Hinweis hat keinen Lösungsvorschlag\./);` entfernen.
  3. Im Test `implementationReport_ScoutValidForSomeGroupsOnly_AllFallbackWithoutFollowupStep` die Zeile `  assert.match(result.stdout, /1\. Das Hindernis hat keinen Lösungsvorschlag\. Selbst beheben, dann erneut prüfen:/);` entfernen und den Testnamen in `implementationReport_ScoutValidForSomeGroupsOnly_AllFallbackWithoutScoutFile` ändern.
  4. Im Test `implementationReport_Bericht_CarriesHeadingAnchorsForShow` die Zeile `  assert.ok(anchors.includes('### Wie es weitergeht'));` ersetzen durch `  assert.equal(anchors.includes('### Wie es weitergeht'), false);` und den Testnamen in `implementationReport_Bericht_CarriesHeadingAnchorsWithoutNextSection` ändern.
  5. Im Test `implementationReport_EmbeddedWithProposal_WritesJsonDataAndPrintsFourLines` die Zeile `  assert.match(read(env, 'bericht.md'), /### Wie es weitergeht/);` ersetzen durch `  assert.doesNotMatch(read(env, 'bericht.md'), /Wie es weitergeht/);`.
  In `plugins/forge/tests/chain-reports.test.js` den Test `implementationReport_ImplementationEntry_WorktreeLineFinishStepAndPushLine` ersetzen durch:
  ```js
  test('implementationReport_ImplementationEntry_EqualsReportWithoutEntryAndNamesNoNextStep', () => {
    // Arrange
    const run = specRun();
    const baseline = implementationRun(run);
    const worktree = addWorktree(run.repo, 'feature/x');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/x' });

    // Act
    const text = implementationRun(run);

    // Assert
    assert.equal(withoutStatus(text), withoutStatus(baseline));
    assert.doesNotMatch(text, /Wie es weitergeht|Worktree bleibt|Nicht gepusht|finish-work/);
  });
  ```
  In `plugins/forge/tests/chain.test.js` in der ersten `require`-Zeile `readEntryFor, ` entfernen (`const { ChainError, writeEntry, readEntry, removeByWorktree } = require('../scripts/lib/chain');`) und die Tests `readEntryFor_EmbeddedRun_ReturnsNullEvenWithEntry` und `readEntryFor_StandaloneRun_ReturnsTheEntryOfReadEntry` (jeweils vom `test(`-Aufruf bis zur schließenden `});`) entfernen.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report-text.test.js" "<R>/plugins/forge/tests/implementation-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js"` — erwartet: FAIL, unter anderem `renderImplementationReport_ReadyWithOneHint_ShowsAgreedLayoutWithoutNextSteps`, `summaryOf_AnyInput_ReturnsKindResultFlowCheckedAndFoundOnly` und `implementationReport_ImplementationEntry_EqualsReportWithoutEntryAndNamesNoNextStep`
- [ ] **Schritt 3: Bericht-Text, Report-Skript und Kette umstellen**
  `plugins/forge/scripts/lib/implementation-report-text.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  // Abschlussbericht des Implementierungs-Reviews in Klartext. Reine Funktion: Die Eingabe baut implementation-report.js.
  // `open[].hasProposal`: die Gruppe hat einen gesicherten Scout-Vorschlag; fehlt das Feld, gilt die Gruppe wie in report-text.js als ohne Vorschlag.
  // Der Bericht nennt keinen nächsten Schritt; die Session-Kette entscheidet über den Fortgang.
  // `openRed`: Zahl der offenen Hindernisse; der Bericht nimmt das Maximum aus ihr und den gelisteten 🔴-Einträgen.

  const { openLines, section, viewpointsPhrase } = require('./report-text');

  function plural(count, one, many) {
    return count === 1 ? `1 ${one}` : `${count} ${many}`;
  }

  function kindOf(input, counts) {
    if (input.failedLabels.length > 0) return 'incomplete';
    if (counts.openRed > 0) return 'blocked';
    return counts.hints > 0 ? 'hints' : 'ready';
  }

  function resultLine(input, kind, counts) {
    const hints = counts.hints;
    if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
    if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${plural(counts.openRed, 'Hindernis', 'Hindernisse')} offen`;
    const open = hints > 0 ? ` · ${hints === 1 ? '1 kleiner Hinweis' : `${hints} kleine Hinweise`} offen` : '';
    return `**Ergebnis:** ✅ Bereit zum Abschließen${open}`;
  }

  function checkedLines(input) {
    return [
      `- Bereich: \`${input.range}\``,
      `- ${plural(input.fileCount, 'geänderte Datei', 'geänderte Dateien')}, davon ${plural(input.testCount, 'Test', 'Tests')}`,
      `- Blickwinkel: ${input.reviewerLines.map((line) => line.name).join(', ')}`,
    ];
  }

  function foundLine(line) {
    if (line.failed) return `- ${line.name}: ausgefallen`;
    return `- ${line.name}: ${plural(line.red, 'Hindernis', 'Hindernisse')}, ${plural(line.yellow, 'Hinweis', 'Hinweise')}`;
  }

  function countsOf(input) {
    const hindrances = input.open.filter((entry) => entry.color === 'red');
    return { openRed: Math.max(input.openRed, hindrances.length), listedRed: hindrances.length, hints: input.open.filter((entry) => entry.color === 'yellow').length };
  }

  // Art, Ergebnis-Zeile, Ablauf, Prüfumfang und Befund für den Bericht und die Bericht-Daten.
  function summaryOf(input) {
    const counts = countsOf(input);
    const kind = kindOf(input, counts);
    return {
      kind, resultLine: resultLine(input, kind, counts), flowLine: `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, keine Überarbeitung.`,
      checked: checkedLines(input), found: input.reviewerLines.map(foundLine),
    };
  }

  function renderImplementationReport(input) {
    const hindrances = input.open.filter((entry) => entry.color === 'red');
    const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
    const summary = summaryOf(input);
    const heading = `## Implementierungs-Review · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
    return [
      [heading, summary.resultLine, summary.flowLine],
      ['### Was geprüft wurde', ...summary.checked],
      ...section('Gefunden', summary.found),
      ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
      ...section('Noch offen · kein Hindernis für das Abschließen', hintEntries.flatMap(openLines)),
      ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ].map((block) => block.join('\n')).join('\n\n');
  }

  module.exports = { renderImplementationReport, summaryOf };
  ```
  In `plugins/forge/scripts/lib/implementation-report.js` in `reportInput` die Zeile `plan: options.planArg, chain: options.chain ?? null, topic: topicOf(readText(options.plan)), openRed: open.filter((group) => group.severity === 'red').length,` ersetzen durch `plan: options.planArg, topic: topicOf(readText(options.plan)), openRed: open.filter((group) => group.severity === 'red').length,` und in `embeddedOutput` die Zeile `const { offersFollowup: _steps, ...summary } = summaryOf(input);` ersetzen durch `const summary = summaryOf(input);`.
  In `plugins/forge/scripts/implementation-report.js` die Zeile `const { readEntryFor } = require('./lib/chain');` löschen und in `run` den Eintrag `chain: readEntryFor({ embedded: Boolean(values.bericht), stage: 'implementation', artifact: values.plan }),` löschen (der Aufruf von `buildReport` endet danach mit `reportFile: values.bericht ? path.resolve(values.bericht) : undefined,`).
  In `plugins/forge/scripts/lib/chain.js` die Funktion `readEntryFor` samt Kommentar löschen und aus `module.exports` entfernen: `module.exports = { ChainError, STAGES, storeDir, writeEntry, readEntry, removeByWorktree };`.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report-text.test.js" "<R>/plugins/forge/tests/implementation-report.test.js" "<R>/plugins/forge/tests/implementation-followup-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/chain.test.js" "<R>/plugins/forge/tests/chain-cli.test.js" "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/implementation-report-text.js plugins/forge/scripts/lib/implementation-report.js plugins/forge/scripts/implementation-report.js plugins/forge/scripts/lib/chain.js plugins/forge/tests/implementation-report-text.test.js plugins/forge/tests/implementation-report.test.js plugins/forge/tests/chain-reports.test.js plugins/forge/tests/chain.test.js` · `git commit -m "feat(forge): implementation review report names no next step and no chain recommendation"`

---
### Task 5: Bausteine für den einen Datenkanal (Format 2, Etappe, Statuszeile, Ablage-Schreiber)

**ACs:** AC-03, AC-07, AC-18

**Dateien:**
- Create: `plugins/forge/scripts/lib/report-format.js`
- Create: `plugins/forge/scripts/lib/etappe-of.js`
- Create: `plugins/forge/scripts/lib/review-status.js`
- Modify: `plugins/forge/scripts/lib/session-chain-ablage.js:12-44` · `const REVIEW_FILE = 'bericht-review.json';`
- Create: `plugins/forge/tests/report-format.test.js`
- Create: `plugins/forge/tests/etappe-of.test.js`
- Create: `plugins/forge/tests/review-status.test.js`
- Test: `plugins/forge/tests/session-chain-ablage.test.js` · `nextFollowupName_TwoRoundsStored_ReturnsThirdName`

**Interfaces:**
- Consumes: `FlowError` aus plugins/forge/scripts/lib/flow-error.js; `readState(dir, slug)`, `SessionChainError` aus plugins/forge/scripts/lib/session-chain-store.js; `toPosix` aus plugins/forge/scripts/lib/posix.js; `writeJson`, `writeText` aus plugins/forge/scripts/lib/flow-files.js; `nextFollowupName(target)` aus plugins/forge/scripts/lib/session-chain-ablage.js (alle bestehend)
- Produces: `REPORT_FORMAT: 2`, `ReportFormatError` (Unterklasse von FlowError), `assertCurrentFormat(data, file): data` aus report-format.js; `ETAPPE_OF_SKILL: { [skill]: etappe }`, `etappeFor({ skill, dir, slug, whiteboarding }): string` aus etappe-of.js; `reviewStatusLine({ resultLine, followup, report }): string`, `parseReviewStatusLine(line): { ergebnis, followup, bericht } | null` aus review-status.js; `storeReviewReport({ target, followup, data, text }): { json, md }` und `REVIEW_NAME: 'bericht-review'` aus session-chain-ablage.js

Diese Task legt nur Bausteine mit Unit-Tests an; kein Skript benutzt sie schon. Festlegungen: Bericht-Daten im Format 2 tragen `format: 2`; jede Datei ohne `format: 2` ist das Altformat der Doppel-Betriebsart und wird nicht gelesen (E-Eintrag „Altformat“). Die Etappe eines Reviews bestimmt `etappeFor` in dieser Reihenfolge: ausdrücklich `whiteboarding`, sonst die laufende Etappe der Kette (`gestartet.etappe` im Zustand zum Slug; die Leit-Session setzt sie mit `session-chain.js brief`), sonst die Etappe, die zum Skill-Namen passt (Debug-Aufruf ohne Brief).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Neue Datei `plugins/forge/tests/report-format.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { REPORT_FORMAT, ReportFormatError, assertCurrentFormat } = require('../scripts/lib/report-format');

  test('assertCurrentFormat_CurrentFormat_ReturnsTheData', () => {
    // Arrange
    const data = { format: REPORT_FORMAT, status: 'sauber nach Runde 1' };

    // Act
    const result = assertCurrentFormat(data, 'bericht-review.json');

    // Assert
    assert.equal(result, data);
    assert.equal(REPORT_FORMAT, 2);
  });

  test('assertCurrentFormat_FormerFormatOrNoFormat_ThrowsNamingTheOldFormatAndTheFile', () => {
    for (const data of [{ format: 1 }, {}, null]) {
      // Act
      const read = () => assertCurrentFormat(data, '/x/bericht-review.json');

      // Assert
      assert.throws(read, (error) => error instanceof ReportFormatError && /^Ablage im alten Format: \/x\/bericht-review\.json$/.test(error.message));
    }
  });
  ```
  Neue Datei `plugins/forge/tests/etappe-of.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { makeRepo } = require('./lib/git-repo');
  const { SessionChainError, writeState } = require('../scripts/lib/session-chain-store');
  const { ETAPPE_OF_SKILL, etappeFor } = require('../scripts/lib/etappe-of');

  test('etappeFor_WhiteboardingSwitch_ReturnsWhiteboardingEvenWithARunningEtappe', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

    // Act
    const etappe = etappeFor({ skill: 'spec-review', dir: repo, slug: 'x', whiteboarding: true });

    // Assert
    assert.equal(etappe, 'whiteboarding');
  });

  test('etappeFor_ChainStateWithRunningEtappe_ReturnsThatEtappe', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

    // Act
    const etappe = etappeFor({ skill: 'plan-review', dir: repo, slug: 'x' });

    // Assert
    assert.equal(etappe, 'planning');
  });

  test('etappeFor_NoStateForTheSlug_UsesTheEtappeOfTheSkillName', () => {
    // Arrange
    const repo = makeRepo();
    const expected = {
      'spec-review': 'spec-review', 'spec-review-orchestrator': 'spec-review', 'plan-review': 'plan-review', 'plan-orchestrator': 'planning',
      'implementation-review': 'umsetzung', 'implementation-orchestrator': 'umsetzung',
    };

    // Act
    const actual = Object.fromEntries(Object.keys(expected).map((skill) => [skill, etappeFor({ skill, dir: repo, slug: 'x' })]));

    // Assert
    assert.deepEqual(actual, expected);
    assert.deepEqual(ETAPPE_OF_SKILL, expected);
  });

  test('etappeFor_StateWithoutRunningEtappe_UsesTheEtappeOfTheSkillName', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { slug: 'x', gestartet: null });

    // Act
    const etappe = etappeFor({ skill: 'plan-review', dir: repo, slug: 'x' });

    // Assert
    assert.equal(etappe, 'plan-review');
  });

  test('etappeFor_SkillWithoutAblage_ThrowsSessionChainError', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const resolve = () => etappeFor({ skill: 'spec-grilling', dir: repo, slug: 'x' });

    // Assert
    assert.throws(resolve, (error) => error instanceof SessionChainError && /Kein Skill mit Ablage: spec-grilling/.test(error.message));
  });

  test('etappeFor_DirOutsideAGitRepo_ThrowsSessionChainError', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-norepo-'));

    // Act
    const resolve = () => etappeFor({ skill: 'spec-review', dir, slug: 'x' });

    // Assert
    assert.throws(resolve, SessionChainError);
  });
  ```
  Neue Datei `plugins/forge/tests/review-status.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { reviewStatusLine, parseReviewStatusLine } = require('../scripts/lib/review-status');

  test('reviewStatusLine_ResultLineWithPrefix_DropsThePrefixAndNamesFollowupAndFile', () => {
    // Act
    const line = reviewStatusLine({ resultLine: '**Ergebnis:** ✅ Bereit zum Planen', followup: false, report: 'C:\\repo\\ablage\\bericht-review.md' });

    // Assert
    assert.equal(line, 'Review abgeschlossen: ✅ Bereit zum Planen · FOLLOWUP nein · Bericht: C:/repo/ablage/bericht-review.md');
  });

  test('reviewStatusLine_FollowupOffered_SaysJa', () => {
    // Act
    const line = reviewStatusLine({ resultLine: '⛔ Noch nicht bereit · 1 Hindernis offen', followup: true, report: '/r/bericht-review.md' });

    // Assert
    assert.equal(line, 'Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: /r/bericht-review.md');
  });

  test('parseReviewStatusLine_ValidLine_ReturnsResultFollowupAndFile', () => {
    // Act
    const parsed = parseReviewStatusLine('Review abgeschlossen: ✅ Bereit zum Planen · 2 kleine Hinweise offen · FOLLOWUP ja · Bericht: /r/a/bericht-followup-1.md');

    // Assert
    assert.deepEqual(parsed, { ergebnis: '✅ Bereit zum Planen · 2 kleine Hinweise offen', followup: true, bericht: '/r/a/bericht-followup-1.md' });
  });

  test('parseReviewStatusLine_OtherLine_ReturnsNull', () => {
    assert.equal(parseReviewStatusLine('[plan-review] STATUS=final · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none'), null);
    assert.equal(parseReviewStatusLine(''), null);
  });
  ```
  In `plugins/forge/tests/session-chain-ablage.test.js` den Import ersetzen durch `const { ablageDir, storeFiles, followupNumbers, nextFollowupName, storeReviewReport } = require('../scripts/lib/session-chain-ablage');` und am Dateiende anfügen:
  ```js
  test('storeReviewReport_Review_StartsTheAblageAnewAndWritesJsonAndText', () => {
    // Arrange
    const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), 'ablage');
    storeReviewReport({ target, followup: false, data: { format: 2, status: 'alt' }, text: 'alt' });
    storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'Runde' });

    // Act
    const stored = storeReviewReport({ target, followup: false, data: { format: 2, status: 'neu' }, text: '# Bericht' });

    // Assert
    assert.deepEqual(fs.readdirSync(target).sort(), ['bericht-review.json', 'bericht-review.md']);
    assert.equal(stored.json, path.join(target, 'bericht-review.json').replace(/\\/g, '/'));
    assert.equal(stored.md, path.join(target, 'bericht-review.md').replace(/\\/g, '/'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'bericht-review.json'), 'utf8')).status, 'neu');
    assert.equal(fs.readFileSync(path.join(target, 'bericht-review.md'), 'utf8'), '# Bericht\n');
  });

  test('storeReviewReport_Followups_AreNumberedBesideTheReview', () => {
    // Arrange
    const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), 'ablage');
    storeReviewReport({ target, followup: false, data: { format: 2 }, text: 'a' });

    // Act
    const first = storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'b' });
    const second = storeReviewReport({ target, followup: true, data: { format: 2 }, text: 'c' });

    // Assert
    assert.deepEqual(fs.readdirSync(target).filter((name) => name.endsWith('.json')).sort(), ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
    assert.ok(first.md.endsWith('/bericht-followup-1.md'));
    assert.ok(second.md.endsWith('/bericht-followup-2.md'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-format.test.js" "<R>/plugins/forge/tests/etappe-of.test.js" "<R>/plugins/forge/tests/review-status.test.js" "<R>/plugins/forge/tests/session-chain-ablage.test.js"` — erwartet: FAIL, `Cannot find module` für `report-format`, `etappe-of` und `review-status`; `storeReviewReport is not a function`
- [ ] **Schritt 3: Bausteine anlegen**
  Neue Datei `plugins/forge/scripts/lib/report-format.js`:
  ```js
  'use strict';

  // Format der Bericht-Daten, die ein Review direkt in der Ablage der Session-Kette ablegt (`bericht-review.json`,
  // `bericht-followup-<n>.json`). Dateien ohne dieses Format stammen aus der früheren Doppel-Betriebsart: Sie werden nicht
  // gelesen und nicht migriert; wer sie lesen müsste, meldet `Ablage im alten Format`.

  const { FlowError } = require('./flow-error');

  const REPORT_FORMAT = 2;

  class ReportFormatError extends FlowError {}

  function assertCurrentFormat(data, file) {
    if (data?.format !== REPORT_FORMAT) throw new ReportFormatError(`Ablage im alten Format: ${file}`);
    return data;
  }

  module.exports = { REPORT_FORMAT, ReportFormatError, assertCurrentFormat };
  ```
  Neue Datei `plugins/forge/scripts/lib/etappe-of.js`:
  ```js
  'use strict';

  // Etappe der Session-Kette, in deren Ablage ein Review oder Orchestrator seinen Bericht legt. Reihenfolge: ausdrücklich
  // `whiteboarding` (das Whiteboarding hat noch keinen Zustand), sonst die laufende Etappe der Kette (`gestartet.etappe`, die der
  // Brief der Leit-Session setzt), sonst die Etappe, die zum Namen des Skills passt (Debug-Aufruf ohne Brief).

  const { SessionChainError, readState } = require('./session-chain-store');

  const ETAPPE_OF_SKILL = {
    'spec-review': 'spec-review',
    'spec-review-orchestrator': 'spec-review',
    'plan-review': 'plan-review',
    'plan-orchestrator': 'planning',
    'implementation-review': 'umsetzung',
    'implementation-orchestrator': 'umsetzung',
  };

  // `dir`: Ordner im Repo der Kette; `slug`: Slug aus dem Pfad von Spec oder Plan.
  function etappeFor({ skill, dir, slug, whiteboarding = false }) {
    if (!Object.hasOwn(ETAPPE_OF_SKILL, skill)) throw new SessionChainError(`Kein Skill mit Ablage: ${skill}`);
    if (whiteboarding) return 'whiteboarding';
    return readState(dir, slug)?.gestartet?.etappe ?? ETAPPE_OF_SKILL[skill];
  }

  module.exports = { ETAPPE_OF_SKILL, etappeFor };
  ```
  Neue Datei `plugins/forge/scripts/lib/review-status.js`:
  ```js
  'use strict';

  // Die eine Statuszeile, mit der ein Review-Skill endet: Ergebnis, ob ein Followup folgt, Datei des Berichts in der Ablage.
  // Die Etappen-Statuszeile `[etappe] STATUS=…` steht daneben und zählt nicht mit.

  const { toPosix } = require('./posix');

  const PREFIX = 'Review abgeschlossen: ';
  const RESULT_PREFIX = '**Ergebnis:** ';
  const STATUS_LINE = /^Review abgeschlossen: (.+) · FOLLOWUP (ja|nein) · Bericht: (.+?)\s*$/;

  // `resultLine`: Ergebnis-Zeile des Berichts (mit oder ohne `**Ergebnis:** `); `report`: Pfad der Berichtsdatei (.md) in der Ablage.
  function reviewStatusLine({ resultLine, followup, report }) {
    const result = resultLine.startsWith(RESULT_PREFIX) ? resultLine.slice(RESULT_PREFIX.length) : resultLine;
    return `${PREFIX}${result} · FOLLOWUP ${followup ? 'ja' : 'nein'} · Bericht: ${toPosix(report)}`;
  }

  function parseReviewStatusLine(line) {
    const match = STATUS_LINE.exec(String(line ?? ''));
    return match ? { ergebnis: match[1], followup: match[2] === 'ja', bericht: match[3] } : null;
  }

  module.exports = { reviewStatusLine, parseReviewStatusLine };
  ```
  In `plugins/forge/scripts/lib/session-chain-ablage.js` nach den Importen `const { toPosix } = require('./posix');` ergänzen `const { writeJson, writeText } = require('./flow-files');`, die Konstante `REVIEW_FILE` ersetzen, vor `module.exports` die Funktion einfügen und `module.exports` erweitern:
  ```js
  const REVIEW_NAME = 'bericht-review';
  const REVIEW_FILE = `${REVIEW_NAME}.json`;
  ```
  ```js
  // Legt Bericht (.md) und Bericht-Daten (.json) eines Reviews in `target` ab: Ein Review beginnt die Ablage seiner Etappe neu und
  // schreibt `bericht-review`, ein Followup legt `bericht-followup-<n>` daneben. Rückgabe: die Pfade beider Dateien.
  function storeReviewReport({ target, followup, data, text }) {
    if (!followup) fs.rmSync(target, { recursive: true, force: true });
    const name = followup ? nextFollowupName(target) : REVIEW_NAME;
    const json = path.join(target, `${name}.json`);
    const md = path.join(target, `${name}.md`);
    writeJson(json, data);
    writeText(md, text);
    return { json: toPosix(json), md: toPosix(md) };
  }
  ```
  ```js
  module.exports = { REVIEW_NAME, REVIEW_FILE, ABSCHLUSS_FILE, FOLLOWUP_FILE, ablageDir, storeFiles, storeReviewReport, followupNumbers, nextFollowupName };
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-format.test.js" "<R>/plugins/forge/tests/etappe-of.test.js" "<R>/plugins/forge/tests/review-status.test.js" "<R>/plugins/forge/tests/session-chain-ablage.test.js" "<R>/plugins/forge/tests/session-chain-store.test.js" "<R>/plugins/forge/tests/session-chain-points.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-format.js plugins/forge/scripts/lib/etappe-of.js plugins/forge/scripts/lib/review-status.js plugins/forge/scripts/lib/session-chain-ablage.js plugins/forge/tests/report-format.test.js plugins/forge/tests/etappe-of.test.js plugins/forge/tests/review-status.test.js plugins/forge/tests/session-chain-ablage.test.js` · `git commit -m "feat(forge): building blocks for the single ablage channel"`

---
### Task 6: Spec- und Plan-Review schreiben nur noch in die Ablage

**ACs:** AC-02, AC-03, AC-05, AC-07, AC-18

**Dateien:**
- Modify: `plugins/forge/scripts/prepare.js:20-75` · `const FLAGS = {`
- Modify: `plugins/forge/scripts/review-flow.js:25-110` · `const VALUE_OPTIONS`
- Modify: `plugins/forge/scripts/lib/flow-report.js:1-115` · `function flowStatus`
- Modify: `plugins/forge/scripts/lib/orchestrator-report.js:18-27` · `function readPart`
- Modify: `plugins/forge/scripts/lib/session-chain-points.js:18-26` · `function readChecked`
- Modify: `plugins/forge/scripts/lib/session-chain-store.js:20-30` · `function storageError`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:21` · `const VALUE_FLAGS`
- Modify: `plugins/forge/tests/lib/review-flow-fixture.js:42-56` · `function writeJsonFile`
- Test: `plugins/forge/tests/review-flow-report.test.js` · `report_AnyRun_WritesReportTextToClosingFile`
- Test: `plugins/forge/tests/review-flow-ablage.test.js` · `report_PlanReviewWithAblage_StoresReportAndDataAndNamesFollowupOffer`
- Test: `plugins/forge/tests/chain-reports.test.js` · `function planReport(run)`
- Test: `plugins/forge/tests/prepare-ablage.test.js` · `planReview_WithAblage_PrintsTheEtappeAsLastLine`
- Test: `plugins/forge/tests/prepare.test.js` · `parseArgs_EmbeddedReportFlag_AcceptedForSpecPlanAndFollowup`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `parseSkillCall_PlanReviewWithAblage_DoesNotTakeTheEtappeAsSpec`
- Test: `plugins/forge/tests/session-chain-store.test.js` · `storageError_MissingOrKnownEtappe_ReturnsNull`
- Test: `plugins/forge/tests/session-chain-points.test.js` · `readParts_ReviewAndTwoFollowups_ReturnsThemInRoundOrder`
- Test: `plugins/forge/tests/session-chain-review.test.js` · `const EMPTY_PART`
- Test: `plugins/forge/tests/session-chain-steps.test.js` · `scratch('bericht-review.json'`
- Test: `plugins/forge/tests/session-chain-scenario.test.js` · `bericht-review.json`
- Test: `plugins/forge/tests/session-chain-cli.test.js` · `bericht-review.json`
- Test: `plugins/forge/tests/orchestrator-report.test.js` · `function embeddedReview(file)`

**Interfaces:**
- Consumes: `etappeFor`, `ablageDir`, `storeReviewReport`, `reviewStatusLine`, `parseReviewStatusLine`, `REPORT_FORMAT`, `assertCurrentFormat`, `ReportFormatError` aus Task 5; `readContext`, `writeContext` aus plugins/forge/scripts/workspace.js (bestehend)
- Produces: prepare.js schreibt `etappe`, `ablage` (Ordner, mit `/`) und `artifact` in <W>/kontext.json und gibt keine Zeile `ablage=` mehr aus; `parseArgs(skill, args): { positional, flags, switches }` mit dem Schalter `--debug` (alle Skills) und `--whiteboarding` (`spec-review`, `review-followup`); `review-flow.js report` gibt genau zwei Zeilen aus, `ENDE <status>` und `STATUSZEILE Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <datei.md>`, und schreibt Bericht (`.md`) und Bericht-Daten (`.json`, `format: 2`) in die Ablage aus kontext.json; review-flow.js und prepare.js brechen bei einem unbekannten Parameter mit `unbekannter Parameter: <name>` ab (Exit 2); `readParts` und `readPart` lesen nur `format: 2` und melden sonst `Ablage im alten Format: <datei>`; `withAblage(env, etappe, ablage): env` in plugins/forge/tests/lib/review-flow-fixture.js

Diese Task schaltet den Spec- und Plan-Review auf den einen Datenkanal um. Der Zustand, ob ein Followup folgt, steht nur noch in der Review-Statuszeile (`FOLLOWUP ja|nein`). Die Skill-Texte (`flow.md`, die drei Review-Skills, `review-followup`) stellt Task 7 gemeinsam mit dem Implementierungs-Review um; bis dahin nennen sie `--bericht` und `--ablage` noch, ihre Tests lesen nur Text und bleiben grün. Die Commit-Prüfung des Plan-Reviews (`COMMIT-PRUEFUNG`) und `followup.js next` entfallen in Task 7 mit den Texten, die sie nennen; `flow-report.js` druckt `COMMIT-PRUEFUNG` ab dieser Task nicht mehr.

- [ ] **Schritt 1: Tests schreiben und anpassen**
  In `plugins/forge/tests/lib/review-flow-fixture.js` vor `function writeJsonFile(file, value) {` einfügen und `withAblage` in `module.exports` ergänzen (`SCRIPT, SPEC, finding, tempDir, setup, withAblage, writeJsonFile, …`):
  ```js
  // Legt Etappe und Ablage im Arbeitsbereich fest, wie es prepare.js tut; `report` schreibt dorthin. `ablage` ersetzt den Ordner.
  function withAblage(env, etappe = 'spec-review', ablage = path.join(tempDir('dv-forge-ablage-'), 'ablage', etappe)) {
    const file = path.join(env.workspace, 'kontext.json');
    const context = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    fs.writeFileSync(file, `${JSON.stringify({ ...context, etappe, ablage: ablage.replace(/\\/g, '/') }, null, 2)}\n`);
    return { ...env, ablage };
  }
  ```
  `plugins/forge/tests/review-flow-ablage.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { commitFile, makeRepo } = require('./lib/git-repo');
  const { SPEC, tempDir, writeReviewer, withAblage, flow } = require('./lib/review-flow-fixture');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');
  const { parseReviewStatusLine } = require('../scripts/lib/review-status');

  // Repo mit committeter Spec und Plan im Ordner docs/forge/x (Slug `x`) und einem sauberen Plan-Review ohne Findings.
  function planRun() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/x/spec.md', SPEC, 'add spec');
    commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    const plan = path.join(repo, 'docs/forge/x/plan.md');
    const workspace = tempDir('dv-forge-ablage-');
    writeReviewer({ workspace }, 'coverage', []);
    flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', plan, '--spec', spec, '--expect', 'coverage');
    const env = withAblage({ workspace }, 'plan-review', ablageDir(repo, 'x', 'plan-review'));
    return { repo, spec, plan, workspace, ablage: env.ablage };
  }

  function planReport(run, extra = []) {
    return flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--titel', 'Plan-Review', '--artefakt', run.plan, ...extra);
  }

  test('report_PlanReviewRun_StoresReportAndDataAndPrintsOnlyEndeAndTheStatusLine', () => {
    // Arrange
    const run = planRun();

    // Act
    const result = planReport(run);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(fs.readdirSync(run.ablage).sort(), ['bericht-review.json', 'bericht-review.md']);
    const [ende, statusLine, ...rest] = result.stdout.trim().split('\n');
    assert.equal(ende, 'ENDE sauber nach Runde 1');
    assert.deepEqual(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')), {
      ergebnis: '✅ Bereit zur Umsetzung', followup: false, bericht: path.join(run.ablage, 'bericht-review.md').replace(/\\/g, '/'),
    });
    assert.deepEqual(rest, []);
    assert.doesNotMatch(result.stdout, /=== BERICHT ===|COMMIT-PRUEFUNG|\/dv-forge:/);
    const data = JSON.parse(fs.readFileSync(path.join(run.ablage, 'bericht-review.json'), 'utf8'));
    assert.equal(data.format, 2);
    assert.equal(data.status, 'sauber nach Runde 1');
    assert.equal(data.offersFollowup, false);
  });

  test('report_PlanReviewWithOpenRed_PrintsNoCommitCheckEither', () => {
    // Arrange
    const run = planRun();
    writeReviewer({ workspace: run.workspace }, 'coverage', [{ location: 'AC-01', quote: 'Gegeben A, wenn B, dann C.', category: 'ac-fehlt-im-plan', consequence: 'Folge', rationale: 'Grund' }]);
    flow('rate', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--expect', 'coverage');

    // Act
    const result = planReport(run);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^ENDE [^\n]+\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP nein · Bericht: /);
    assert.doesNotMatch(result.stdout, /COMMIT-PRUEFUNG/);
  });

  test('report_FollowupRuns_StoreNumberedRoundsBesideTheReview', () => {
    // Arrange
    const run = planRun();
    planReport(run);
    planReport(run, ['--quelle', 'nacharbeit']);

    // Act
    const result = planReport(run, ['--quelle', 'nacharbeit']);

    // Assert
    const names = fs.readdirSync(run.ablage).filter((name) => name.endsWith('.json')).sort();
    assert.deepEqual(names, ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
    assert.match(result.stdout, /Bericht: .+\/bericht-followup-2\.md$/m);
  });

  test('report_NewReview_StartsTheAblageOfItsEtappeAnew', () => {
    // Arrange
    const run = planRun();
    planReport(run);
    planReport(run, ['--quelle', 'nacharbeit']);

    // Act
    planReport(run);

    // Assert
    assert.deepEqual(fs.readdirSync(run.ablage).sort(), ['bericht-review.json', 'bericht-review.md']);
  });

  test('report_WorkspaceWithoutAblage_ExitsWithOneAndNamesPrepare', () => {
    // Arrange
    const run = planRun();
    fs.rmSync(path.join(run.workspace, 'kontext.json'));

    // Act
    const result = planReport(run);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge review-flow: Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest/);
    assert.equal(fs.existsSync(run.ablage), false);
  });

  for (const parts of [['--', 'ber', 'icht'], ['--', 'abl', 'age']]) {
    const parameter = parts.join('');
    test(`report_FormerParameter${parts[1]}${parts[2]}_ExitsWithTwoAndSaysUnknownParameter`, () => {
      // Arrange
      const run = planRun();

      // Act
      const result = planReport(run, [parameter, 'x']);

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}$`, 'm'));
      assert.equal(fs.existsSync(run.ablage), false);
    });
  }
  ```
  `plugins/forge/tests/prepare-ablage.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');
  const { writeState } = require('../scripts/lib/session-chain-store');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'prepare.js');
  const PLAN = '# Demo — Umsetzungsplan\n\n**Ziel:** Demo.\n\n---\n\n### Task 1: Eins\n\nText.\n';

  function run(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  function planRepo() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/demo/plan.md', PLAN, 'plan');
    commitFile(repo, 'docs/forge/demo/spec.md', '# Spec\n', 'spec');
    return repo;
  }

  // kontext.json des Arbeitsbereichs, den die Ausgabe von prepare.js nennt.
  function contextOf(result) {
    assert.equal(result.status, 0, result.stderr);
    const workspace = result.stdout.match(/^W=(.*)$/m)[1].trim();
    return JSON.parse(fs.readFileSync(path.join(workspace, 'kontext.json'), 'utf8'));
  }

  test('planReview_WithoutChainState_RecordsTheEtappeOfTheSkillAndItsAblage', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

    // Assert
    const context = contextOf(result);
    assert.equal(context.etappe, 'plan-review');
    assert.equal(context.ablage, ablageDir(repo, 'demo', 'plan-review').replace(/\\/g, '/'));
    assert.ok(samePath(context.artifact, path.join(repo, 'docs/forge/demo/plan.md')));
    assert.deepEqual(Object.keys(context).sort(), ['ablage', 'artifact', 'etappe', 'repo', 'spec']);
    assert.doesNotMatch(result.stdout, /^ablage=|^etappe=/m);
  });

  test('planReview_ChainStateWithRunningEtappe_RecordsThatEtappe', () => {
    // Arrange
    const repo = planRepo();
    writeState(repo, 'demo', { slug: 'demo', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

    // Assert
    const context = contextOf(result);
    assert.equal(context.etappe, 'planning');
    assert.equal(context.ablage, ablageDir(repo, 'demo', 'planning').replace(/\\/g, '/'));
  });

  test('specReview_WhiteboardingSwitch_RecordsTheWhiteboardingEtappe', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--whiteboarding');

    // Assert
    assert.equal(contextOf(result).etappe, 'whiteboarding');
  });

  test('specReview_WithoutSwitchAndWithoutState_RecordsTheEtappeFromTheSkillName', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md');

    // Assert
    assert.equal(contextOf(result).etappe, 'spec-review');
  });

  test('implementationReview_Run_RecordsUmsetzungAndThePlanAsArtifact', () => {
    // Arrange
    const repo = planRepo();
    git(repo, 'tag', 'forge-base/demo', 'HEAD~1');

    // Act
    const result = run(repo, 'implementation-review', 'docs/forge/demo/plan.md');

    // Assert
    const context = contextOf(result);
    assert.equal(context.etappe, 'umsetzung');
    assert.ok(samePath(context.artifact, path.join(repo, 'docs/forge/demo/plan.md')));
  });

  test('prepare_DebugSwitch_IsAcceptedByEveryStage', () => {
    // Arrange
    const repo = planRepo();
    git(repo, 'tag', 'forge-base/demo', 'HEAD~1');
    const calls = [
      ['spec-review', 'docs/forge/demo/spec.md'], ['plan-review', 'docs/forge/demo/plan.md'],
      ['implementation', 'docs/forge/demo/plan.md'], ['implementation-review', 'docs/forge/demo/plan.md'],
    ];

    // Act
    const results = calls.map((call) => run(repo, ...call, '--debug'));

    // Assert
    results.forEach((result, index) => assert.equal(result.status, 0, `${calls[index][0]}: ${result.stderr}`));
  });

  test('reviewFollowup_DebugAndWhiteboardingSwitch_AreAcceptedAndFailOnlyForTheMissingSave', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'review-followup', 'docs/forge/demo/spec.md', 'alle', '--whiteboarding', '--debug');

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Keine Scout-Vorschläge gesichert für demo/);
  });

  for (const parts of [['--', 'ber', 'icht'], ['--', 'abl', 'age']]) {
    const parameter = parts.join('');
    for (const call of [['spec-review', 'docs/forge/demo/spec.md'], ['plan-review', 'docs/forge/demo/plan.md'], ['review-followup', 'docs/forge/demo/plan.md', 'alle']]) {
      test(`${call[0].replace(/\W+/g, '_')}_FormerParameter${parts[1]}${parts[2]}_AbortsWithUnknownParameter`, () => {
        // Arrange
        const repo = planRepo();

        // Act
        const result = run(repo, ...call, parameter, 'x');

        // Assert
        assert.equal(result.status, 2);
        assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}$`, 'm'));
      });
    }
  }

  test('planReview_WhiteboardingSwitch_IsRejectedAsUnknownParameter', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--whiteboarding');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^unbekannter Parameter: --whiteboarding$/m);
  });
  ```
  In `plugins/forge/tests/review-flow-report.test.js` diese Änderungen vornehmen:
  1. Die `require`-Zeile `const { SPEC, finding, setup, writeJsonFile, …} = require('./lib/review-flow-fixture');` ersetzen durch:
  ```js
  const { parseReviewStatusLine } = require('../scripts/lib/review-status');
  const { SPEC, finding, setup: baseSetup, withAblage, writeJsonFile, writeReviewer, flow, editDoc, addEntries, runUntilRework } = require('./lib/review-flow-fixture');

  // Arbeitsbereich mit Spec-Datei und der Ablage, in die report schreibt.
  function setup(spec) {
    return withAblage(baseSetup(spec));
  }
  ```
  2. Die Funktion `report` ersetzen durch:
  ```js
  // Der Bericht liegt in der Ablage, die Statuszeile nennt die Datei. Rückgabe: die ENDE-Zeile, dann === BERICHT === und der Bericht.
  function shown(result) {
    assert.equal(result.status, 0, result.stderr);
    const statusLine = result.stdout.split('\n').find((line) => line.startsWith('STATUSZEILE '));
    const status = parseReviewStatusLine(statusLine?.slice('STATUSZEILE '.length));
    assert.ok(status, result.stdout);
    return `${result.stdout.split('\n')[0]}\n=== BERICHT ===\n${fs.readFileSync(status.bericht, 'utf8')}`;
  }

  function report(env, review = 'spec-review') {
    return shown(runReport(env, review));
  }
  ```
  3. Den Test `report_AnyRun_WritesReportTextToClosingFile` ersetzen durch:
  ```js
  test('report_AnyRun_WritesTextAndDataToTheAblageAndNamesTheTextInTheStatusLine', () => {
    // Arrange
    const env = setup();
    writeReviewer(env, 'clarity', []);
    flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

    // Act
    const result = runReport(env);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const lines = result.stdout.trim().split('\n');
    assert.equal(lines.length, 2);
    assert.equal(lines[0], 'ENDE sauber nach Runde 1');
    const status = parseReviewStatusLine(lines[1].replace(/^STATUSZEILE /, ''));
    assert.deepEqual(status, { ergebnis: '✅ Bereit zum Planen', followup: false, bericht: path.join(env.ablage, 'bericht-review.md').replace(/\\/g, '/') });
    assert.match(fs.readFileSync(status.bericht, 'utf8'), /^## Spec-Review · Ergebnis · Demo-Spec\n/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(env.ablage, 'bericht-review.json'), 'utf8')).format, 2);
    assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'bericht.md')), false);
  });
  ```
  4. Im Test `report_TwoHintsWithoutRework_ReadyWithTwoHintsAndClosingKeepsBothGroups` die letzte `assert.equal`-Zeile entfernen, die `checkedFile(env, 'abschluss', 'bericht.md')` liest.
  5. Im Test `report_ReworkResultNoJson_ReportsWithoutChangeSection` die zwei Zeilen `assert.match(result.stdout, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);` und `assert.doesNotMatch(result.stdout, /### Was sich/);` ersetzen durch `const output = shown(result);`, `assert.match(output, /^ENDE unvollständig, ausgefallen: nacharbeit\n/);` und `assert.doesNotMatch(output, /### Was sich/);`.
  6. In `followupRun` die `return`-Zeile ersetzen durch `return shown(flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', 'docs/x/spec.md', ...source));`.
  7. Im Test `report_PlanFollowupDoneButUnchosenHindranceSaved_NotReadyAndNoCommitStep` die vier `assert.match`/`assert.doesNotMatch`-Zeilen nach `assert.equal(result.status, 0, result.stderr);` auf eine Variable `const output = shown(result);` umstellen (`result.stdout` wird zu `output`).
  8. Im Test `report_ReworkWithBrokenEntries_ListsOnlyValidChangedEntries` dasselbe: `const output = shown(result);`, danach in den vier Assertions `result.stdout` durch `output` ersetzen.
  9. Im Test `report_OldWorkspaceWithoutHinweiseAndReviewers_ReportsWithoutCrash` `assert.match(result.stdout, /^ENDE sauber nach Runde 1\n=== BERICHT ===` ersetzen durch `assert.match(shown(result), /^ENDE sauber nach Runde 1\n=== BERICHT ===` (Rest der Zeile unverändert).
  10. Im Test `report_PrepareFollowupWithOneGroupChosen_ChosenShownAsChangeAndUnchosenStaysOpen` die Zeile `const output = result.stdout;` ersetzen durch `const output = shown(result);`.
  11. Den Test `report_GreenFindingInRoundOne_EmbeddedDataListsGreenEntryButReportTextStaysClean` in `report_GreenFindingInRoundOne_StoredDataListsGreenEntryButReportTextStaysClean` umbenennen und seinen Arrange-, Act- und die ersten Assert-Zeilen bis vor `assert.deepEqual(data.green.map(` ersetzen durch:
  ```js
    // Arrange
    const env = setup();
    writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', quote: 'Gegeben A, wenn B, dann C.', consequence: 'Das Wort „dann“ steht zweimal' })]);
    flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

    // Act
    const data = storedData(env);
    const text = report(env);

    // Assert
  ```
  12. Die Funktion `embeddedData` ersetzen durch `storedData` und überall in der Datei `embeddedData(` durch `storedData(` sowie `_EmbeddedData` in Testnamen durch `_StoredData`:
  ```js
  // Bericht-Daten, die der Review in der Ablage ablegt.
  function storedData(env, review = 'spec-review') {
    const result = flow('report', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review', '--artefakt', 'docs/x/doc.md');
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(fs.readFileSync(path.join(env.ablage, 'bericht-review.json'), 'utf8'));
  }
  ```
  In `plugins/forge/tests/chain-reports.test.js` diese Änderungen vornehmen: Die `require`-Zeile `const { SPEC, tempDir, writeReviewer, flow } = require('./lib/review-flow-fixture');` ersetzen durch `const { SPEC, tempDir, writeReviewer, withAblage, flow } = require('./lib/review-flow-fixture');` und danach ergänzen:
  ```js
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');
  const { parseReviewStatusLine } = require('../scripts/lib/review-status');
  ```
  Die Funktionen `specRun` (nur die Zeile `return { repo, spec, plan, workspace };` bekommt davor `withAblage({ workspace }, 'spec-review', ablageDir(repo, 'x', 'spec-review'));`), `report`, `planRun` (vor `return { ...run, workspace };` die Zeile `withAblage({ workspace }, 'plan-review', ablageDir(run.repo, 'x', 'plan-review'));`) und `planReport` ersetzen durch:
  ```js
  // Der Bericht liegt in der Ablage; die Statuszeile des Reviews nennt die Datei.
  function storedReport(result) {
    assert.equal(result.status, 0, result.stderr);
    const statusLine = result.stdout.split('\n').find((line) => line.startsWith('STATUSZEILE '));
    return { text: fs.readFileSync(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')).bericht, 'utf8'), stdout: result.stdout };
  }

  function runSpecReport(run) {
    return flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec);
  }

  function report(run) {
    return storedReport(runSpecReport(run)).text;
  }

  function planReport(run) {
    return storedReport(flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--titel', 'Plan-Review', '--artefakt', run.plan)).text;
  }
  ```
  Den Test `specReviewReport_EmbeddedRunWithEntry_PrintsSameLinesAndWritesNoEntryIntoJson` ersetzen durch:
  ```js
  test('specReviewReport_RunWithEntry_PrintsSameLinesAndStoresNoEntryInTheData', () => {
    // Arrange
    const run = specRun();
    const without = storedReport(runSpecReport(run)).stdout;
    writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

    // Act
    const withEntry = storedReport(runSpecReport(run)).stdout;

    // Assert
    assert.equal(withEntry, without);
    const data = JSON.parse(fs.readFileSync(path.join(ablageDir(run.repo, 'x', 'spec-review'), 'bericht-review.json'), 'utf8'));
    assert.equal(Object.hasOwn(data, 'chain'), false);
    assert.equal(JSON.stringify(data).includes('plan-orchestrator'), false);
  });
  ```
  In `plugins/forge/tests/prepare.test.js` die Meldung im Test `specAndPlanReview_RoundsArgument_AbortWithUnknownArgument` `/^Unbekanntes oder unvollständiges Argument: --rounds$/m` ersetzen durch `/^unbekannter Parameter: --rounds$/m`, im Test `planReview_OnlyWithoutValue_AbortsWithIncompleteArgument` `/^Unbekanntes oder unvollständiges Argument: --only$/m` durch `/^Parameter ohne Wert: --only$/m` und den Test `parseArgs_EmbeddedReportFlag_AcceptedForSpecPlanAndFollowup` ersetzen durch:
  ```js
  test('parseArgs_DebugAndWhiteboardingSwitches_AreCollectedApartFromTheValueFlags', () => {
    // Arrange
    const { parseArgs } = require('../scripts/prepare');

    // Act
    const call = parseArgs('spec-review', ['s.md', '--only', 'clarity', '--whiteboarding', '--debug']);

    // Assert
    assert.deepEqual(call.positional, ['s.md']);
    assert.deepEqual(call.flags, { '--only': ['clarity'] });
    assert.deepEqual([...call.switches].sort(), ['--debug', '--whiteboarding']);
  });
  ```
  In `plugins/forge/tests/guard-orchestrator.test.js`: in `decidePreTool_ImplementationFollowupReportWithReReviewerAnswerNamingSpec_Allows` `followup --workspace "/w" --bericht "/s/f.json" <<'ANTWORT'` ersetzen durch `followup --workspace "/w" <<'ANTWORT'`; den Test `parseSkillCall_PlanReviewWithAblage_DoesNotTakeTheEtappeAsSpec` ersetzen durch
  ```js
  test('parseSkillCall_PlanReviewWithDebugSwitch_DoesNotTakeTheSwitchAsSpec', () => {
    // Act
    const call = guard.parseSkillCall('/dv-forge:plan-review docs/plan.md --debug', os.tmpdir());

    // Assert
    assert.equal(call.files[0], 'docs/plan.md');
    assert.notEqual(call.files[1], '--debug');
  });
  ```
  und `skillCall(env, 'dv-forge:spec-review', 'docs/spec.md --bericht /tmp/b.json');` durch `skillCall(env, 'dv-forge:spec-review', 'docs/spec.md');`, den Test `onSkillCall_ReleaseAfterEmbeddedReview_UnblocksOrchestrator` in `onSkillCall_ReleaseAfterReview_UnblocksOrchestrator` umbenennen und darin `'docs/spec.md alle --bericht /tmp/b.json'` durch `'docs/spec.md alle'` ersetzen.
  In `plugins/forge/tests/session-chain-store.test.js` in der Importliste `storageError, ` entfernen und die zwei Tests `storageError_MissingOrKnownEtappe_ReturnsNull` und `storageError_UnknownEtappe_ReturnsTheAblageMessage` entfernen.
  Fixtures im Format 2 (Zeilen, die `bericht-review.json` bzw. `bericht-followup-<n>.json` für `readParts` oder `mergeReports` schreiben): In `session-chain-points.test.js`, `session-chain-scenario.test.js`, `session-chain-steps.test.js` und `session-chain-cli.test.js` jedes `JSON.stringify({ open` durch `JSON.stringify({ format: 2, open` ersetzen (8 Stellen), in `session-chain-points.test.js` jedes `JSON.stringify({ n: ` durch `JSON.stringify({ format: 2, n: ` (3 Stellen), in `session-chain-review.test.js` `const EMPTY_PART = { open: [], green: [], changes: [] };` durch `const EMPTY_PART = { format: 2, open: [], green: [], changes: [] };` und in `orchestrator-report.test.js` in `part()` `format: 1, review: 'plan-review'` durch `format: 2, review: 'plan-review'`.
  In `plugins/forge/tests/session-chain-points.test.js` vor `test('readParts_MissingFiles_ReturnsEmptyList'` einfügen:
  ```js
  test('readParts_ReviewDataInTheFormerFormat_ThrowsSessionChainErrorNamingTheOldFormat', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-of-'));
    const file = path.join(dir, 'bericht-review.json');
    fs.writeFileSync(file, JSON.stringify({ format: 1, open: [] }));

    // Act & Assert
    assert.throws(() => readParts(dir), (error) => error instanceof SessionChainError && error.message === `Ablage im alten Format: ${file}`);
  });
  ```
  In `plugins/forge/tests/session-chain-review.test.js` vor `test('reviewStand_SpecMissing_ThrowsSessionChainError'` einfügen:
  ```js
  test('reviewStand_AblageInTheFormerFormat_ThrowsNamingTheOldFormat', () => {
    // Arrange
    const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': { ...EMPTY_PART, format: 1 } });

    // Act & Assert
    assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError && /^Ablage im alten Format: .+bericht-review\.json$/.test(error.message));
  });
  ```
  In `plugins/forge/tests/orchestrator-report.test.js`: die Zeile `const { finding, setup, tempDir, writeJsonFile, flow, runUntilRework } = require('./lib/review-flow-fixture');` um `withAblage` ergänzen (`setup, withAblage, tempDir`), im Kommentar über `part()` `` `review-flow.js report --bericht` `` durch `review-flow.js report in der Ablage (Format 2)` ersetzen, `embeddedReview(file)` und `embeddedFollowup(file)` und den End-zu-Ende-Test ersetzen durch:
  ```js
  function storedReview(ablage) {
    const env = withAblage(setup(), 'spec-review', ablage);
    runUntilRework(env, [finding({ location: 'AC-04', quote: 'AC-04', category: 'widerspruch' })]);
    writeJsonFile(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT_AC04);
    writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Erster Versuch.' }], questions: [] });
    flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
    writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('nicht erledigt'));
    flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
    return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', SPEC);
  }

  function storedFollowup(ablage) {
    const env = withAblage(setup(), 'spec-review', ablage);
    const source = ['--quelle', 'nacharbeit'];
    flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
    writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'aggregate.md'), SAVED_AC04);
    writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'scout.md'), SCOUT_AC04);
    writeJsonFile(path.join(env.workspace, 'followup.json'), { gewaehlt: [{ nummer: 1, stufe: '🔴', stelle: 'AC-04', vorschlag: 1 }], offen: [] });
    writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), SAVED_AC04);
    writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Grenzwert festgelegt.' }] });
    flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('erledigt'));
    flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', SPEC, ...source);
  }

  test('orchestratorReport_EndToEndRoundOneNotDoneThenFollowupDone_OneConfirmedEntryAndNothingOpen', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const ablage = path.join(dir, 'ablage');
    const reviewFile = path.join(ablage, 'bericht-review.json');
    const followupFile = path.join(ablage, 'bericht-followup-1.json');
    const review = storedReview(ablage);
    const followup = storedFollowup(ablage);

    // Act
    const result = run(['--art', 'spec', '--review', reviewFile, '--followup', followupFile, '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'a1b2c3d']);

    // Assert
    assert.match(review.stdout, /^ENDE nicht bereit, 1 × 🔴 offen\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: .+\/bericht-review\.md\n$/);
    assert.match(followup.stdout, /^ENDE sauber nach Nachprüfung\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Planen · FOLLOWUP nein · Bericht: .+\/bericht-followup-1\.md\n$/);
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1];
    const changed = sectionOf(text, '# Was sich in der Spec geändert hat');
    assert.equal(changed.match(/Grenzwert festlegen/g).length, 1);
    assert.match(changed, /^- ✅ \*\*Grenzwert festlegen\*\*[\s\S]*Änderung: Grenzwert festgelegt\.\n {2}Gewählt: Vorschlag 1\n {2}Nachprüfung: bestätigt\./);
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
    assert.match(text, /^# Abschlussbericht\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen\n/);
  });
  ```
  und vor `function green(key, overrides = {}) {` einfügen:
  ```js
  test('orchestratorReport_ReviewDataInTheFormerFormat_ExitsWithOneAndNamesTheOldFormat', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ format: 1 }));

    // Act
    const result = run(['--art', 'plan', '--review', review, '--out', path.join(dir, 'a.md'), '--plan', PLAN, '--spec', SPEC, '--stand', 'x']);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge orchestrator-report: Ablage im alten Format: .+review\.json/);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/prepare-ablage.test.js" "<R>/plugins/forge/tests/review-flow-ablage.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/session-chain-points.test.js" "<R>/plugins/forge/tests/session-chain-review.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: FAIL, unter anderem `planReview_WithoutChainState_RecordsTheEtappeOfTheSkillAndItsAblage`, `report_PlanReviewRun_StoresReportAndDataAndPrintsOnlyEndeAndTheStatusLine`, `readParts_ReviewDataInTheFormerFormat_ThrowsSessionChainErrorNamingTheOldFormat` und `orchestratorReport_ReviewDataInTheFormerFormat_ExitsWithOneAndNamesTheOldFormat`
- [ ] **Schritt 3: Skripte umstellen**
  In `plugins/forge/scripts/prepare.js` diese Änderungen vornehmen. Die Importzeilen:
  ```js
  const { createWorkspace, readContext, writeContext } = require('./workspace');
  ```
  und (ersetzt `const { storageError } = require('./lib/session-chain-store');`)
  ```js
  const { SessionChainError } = require('./lib/session-chain-store');
  const { etappeFor } = require('./lib/etappe-of');
  const { ablageDir } = require('./lib/session-chain-ablage');
  ```
  `USAGE` und `FLAGS` ersetzen, `SWITCHES` danach einfügen:
  ```js
  const USAGE = [
    'Aufruf: node prepare.js spec-review <spec> [quelle] [--only <reviewer,...>] [--whiteboarding] [--debug]',
    '       node prepare.js plan-review <plan> [spec] [--only <reviewer,...>] [--debug]',
    '       node prepare.js implementation <plan> [spec] [--debug]',
    '       node prepare.js implementation-review <plan> [spec] [--spec <pfad>] [--context <pfad>]... [--base <ref>] [--only <reviewer,...>] [--debug]',
    '       node prepare.js review-followup <spec|plan> <auswahl> [--spec <pfad>] [--base <ref>] [--whiteboarding] [--debug]   (auswahl: alle | b | <n> | <g>:<n|b>,...)',
    '',
  ].join('\n');
  ```
  ```js
  const FLAGS = {
    'spec-review': ['--only'],
    'plan-review': ['--only'],
    implementation: [],
    'implementation-review': ['--spec', '--context', '--base', '--only'],
    'review-followup': ['--spec', '--base'],
  };

  // Schalter ohne Wert: `--debug` (Unter-Skill von Hand mit Debug-Schalter) und `--whiteboarding` (Review im Whiteboarding einer Session-Kette).
  const SWITCHES = {
    'spec-review': ['--debug', '--whiteboarding'],
    'plan-review': ['--debug'],
    implementation: ['--debug'],
    'implementation-review': ['--debug'],
    'review-followup': ['--debug', '--whiteboarding'],
  };
  ```
  `parseArgs` ersetzen:
  ```js
  function parseArgs(skill, args) {
    const positional = [];
    const flags = {};
    const switches = new Set();
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];
      if (!arg.startsWith('--')) {
        positional.push(arg.replace(/^@/, ''));
        continue;
      }
      if (SWITCHES[skill].includes(arg)) {
        switches.add(arg);
        continue;
      }
      if (!FLAGS[skill].includes(arg)) throw new UsageError(`unbekannter Parameter: ${arg}`);
      if (index + 1 >= args.length) throw new UsageError(`Parameter ohne Wert: ${arg}`);
      index += 1;
      (flags[arg] ??= []).push(args[index].replace(/^@/, ''));
    }
    if (positional.length === 0 || positional.length > MAX_POSITIONAL[skill]) throw new UsageError(`Falsche Zahl an Pfad-Argumenten: erwartet 1 bis ${MAX_POSITIONAL[skill]} Pfade, übergeben ${positional.length}: ${positional.join(' ')}. Freitext gehört nicht in die Argumente.`);
    return { positional, flags, switches };
  }
  ```
  `storageOf` und `prepare` ersetzen und in `main` `SessionChainError` in die Liste der gemeldeten Fehler aufnehmen:
  ```js
  // Reviews und Followups schreiben ihren Bericht in die Ablage der Etappe. prepare.js legt Etappe und Ablage im Arbeitsbereich fest
  // (kontext.json), damit kein Skript einen Parameter dafür braucht.
  function recordAblage(review, values, artifact, switches) {
    const dir = path.dirname(path.resolve(artifact));
    const etappe = etappeFor({ skill: review, dir, slug: values.slug, whiteboarding: switches.has('--whiteboarding') });
    writeContext(values.W, {
      ...readContext(values.W), etappe, ablage: toPosix(ablageDir(dir, values.slug, etappe)), artifact: toPosix(path.resolve(artifact)),
    });
  }

  function prepare(skill, args) {
    if (!Object.hasOwn(PREPARERS, skill)) throw new UsageError(`Unbekannter Skill: ${skill}`);
    const call = parseArgs(skill, args);
    const values = PREPARERS[skill](call);
    if (skill !== 'implementation') recordAblage(skill === 'review-followup' ? values.original : skill, values, call.positional[0], call.switches);
    return render(values);
  }
  ```
  ```js
      if (![PrepareError, TagError, PackageError, ConfigError, FollowupError, SessionChainError].some((type) => error instanceof type)) throw error;
  ```
  In `plugins/forge/scripts/review-flow.js` die Importzeile `const { storageError } = require('./lib/session-chain-store');` entfernen, in `USAGE` die `report`-Zeile auf `… --artefakt <pfad> [--quelle runde-1|nacharbeit]',` kürzen, `VALUE_OPTIONS` ohne `'--bericht', '--ablage'` schreiben, `parseOptions` und `COMMANDS.report` ersetzen und `checkedStorage` löschen:
  ```js
  function parseOptions(args) {
    const values = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!VALUE_OPTIONS.includes(args[index])) throw new UsageError(`unbekannter Parameter: ${args[index]}`);
      if (index + 1 >= args.length) throw new UsageError(`Parameter ohne Wert: ${args[index]}`);
      values[args[index].slice(2)] = args[index + 1];
    }
    return values;
  }
  ```
  ```js
    report: (values) => report({ ...flowOptions(values), title: required(values, 'titel'), artifact: required(values, 'artefakt') }),
  ```
  `plugins/forge/scripts/lib/flow-report.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const fs = require('node:fs');
  const path = require('node:path');
  const { openQuestions } = require('./questions');
  const { failedInstances } = require('./attempts');
  const { openGroupsOf, writeClosing } = require('./closing');
  const { buildInput } = require('./report-data');
  const { renderReportText, summaryOf } = require('./report-text');
  const { ROUND_ONE, ROUND_TWO, FOLLOWUP, FlowError, readText, readJson } = require('./flow-files');
  const { storeReviewReport } = require('./session-chain-ablage');
  const { reviewStatusLine } = require('./review-status');
  const { REPORT_FORMAT } = require('./report-format');
  const { readContext } = require('../workspace');
  const { appendMetric, flowReviewRecord } = require('./metrics');

  // Rangfolge: unvollständig → Fragen offen → nicht bereit → sauber.
  function flowStatus({ failed, openQuestions: questions, openRed, reworked }) {
    if (failed.length > 0) return `unvollständig, ausgefallen: ${failed.join(', ')}`;
    if (questions > 0) return 'Fragen offen';
    if (openRed > 0) return `nicht bereit, ${openRed} × 🔴 offen`;
    return reworked ? 'sauber nach Nachprüfung' : 'sauber nach Runde 1';
  }

  function questionsAtEnd(options) {
    if (options.review === 'plan-review') return readJson(path.join(options.workspace, options.source, 'fragen.json'), []);
    return openQuestions(readText(options.doc));
  }

  function redGroupCount(one) {
    return (one?.groups ?? []).filter((group) => group.color === 'red').length;
  }

  // Offene 🔴: aus der Nachprüfung; ohne Nacharbeit die 🔴-Gruppen aus Runde 1. Eine Nacharbeit ohne Nachprüfung
  // und ohne Ausfall ist ein fehlender Schritt und darf den Status nicht ins Positive kippen.
  function openRedOf(one, two, reworked, failed) {
    if (two) return two.openRed;
    if (reworked && failed.length === 0) throw new FlowError('Nachprüfung fehlt: runde-2/einstufung.json');
    return redGroupCount(one);
  }

  function collect(options) {
    const failed = failedInstances(options.workspace).filter((name) => !name.startsWith('scout'));
    const one = readJson(path.join(options.workspace, ROUND_ONE, 'einstufung.json'), null);
    const two = readJson(path.join(options.workspace, ROUND_TWO, 'einstufung.json'), null);
    const reworked = fs.existsSync(path.join(options.workspace, options.source, 'rework.json'));
    return {
      one, two, reworked, failed,
      openRed: openRedOf(one, two, reworked, failed),
      checked: fs.existsSync(path.join(options.workspace, ROUND_TWO, 'pruefliste.json')),
      questions: questionsAtEnd(options),
    };
  }

  // Bericht und Bericht-Daten gehen in die Ablage der Etappe, die prepare.js im Arbeitsbereich festgelegt hat: Ein Review beginnt die
  // Ablage seiner Etappe neu (`bericht-review`), ein Followup legt die nächste Runde daneben (`bericht-followup-<n>`).
  function storeReport(options, data, text) {
    const { ablage } = readContext(options.workspace);
    if (typeof ablage !== 'string' || ablage === '') throw new FlowError('Ablage fehlt im Arbeitsbereich: prepare.js legt sie in kontext.json fest');
    return storeReviewReport({ target: path.resolve(ablage), followup: options.source === FOLLOWUP, data, text });
  }

  // Ausgabe: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`; der Bericht liegt in der Ablage, nicht im Chat.
  function report(options) {
    const data = collect(options);
    const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
    const open = openGroupsOf(options, data);
    const input = buildInput(options, data, status, open);
    const text = renderReportText(input);
    const summary = summaryOf(input);
    writeClosing(options, open);
    appendMetric(path.dirname(path.resolve(options.doc)), 'reviews', flowReviewRecord(options, data, status));
    const stored = storeReport(options, { format: REPORT_FORMAT, status, ...summary, ...input }, text);
    const line = reviewStatusLine({ resultLine: summary.resultLine, followup: summary.offersFollowup, report: stored.md });
    return [`ENDE ${status}`, `STATUSZEILE ${line}`].join('\n');
  }

  module.exports = { flowStatus, report };
  ```
  In `plugins/forge/scripts/lib/orchestrator-report.js` nach `const { FlowError } = require('./flow-error');` ergänzen `const { assertCurrentFormat } = require('./report-format');` und `readPart` ersetzen:
  ```js
  function readPart(file) {
    if (!file || !fs.existsSync(file)) return null;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
    }
    return assertCurrentFormat(data, file);
  }
  ```
  In `plugins/forge/scripts/lib/session-chain-points.js` nach `const { SessionChainError } = require('./session-chain-store');` den Import `const { ReportFormatError } = require('./report-format');` einfügen und `readChecked` ersetzen:
  ```js
  function readChecked(file) {
    try {
      return readPart(file);
    } catch (error) {
      if (error instanceof ReportFormatError) throw new SessionChainError(error.message, { cause: error });
      throw new SessionChainError(`Bericht-Daten nicht lesbar: ${toPosix(file)}`, { cause: error });
    }
  }
  ```
  In `plugins/forge/scripts/lib/session-chain-store.js` die Funktion `storageError` samt Kommentar entfernen und aus `module.exports` streichen. In `plugins/forge/scripts/guard-orchestrator.js` `const VALUE_FLAGS = new Set(['--rounds', '--spec', '--context', '--base']);` schreiben.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/*.test.js"` — erwartet: PASS, alle Tests grün (Gesamtlauf der Plugin-Tests dauert etwa drei Minuten)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts plugins/forge/tests` · `git commit -m "feat(forge): spec and plan review write only into the ablage"`

---
### Task 7: Implementierungs-Review, Followup und Review-Skill-Texte schreiben nur noch in die Ablage

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-10, AC-19

**Dateien:**
- Modify: `plugins/forge/scripts/implementation-report.js:26-70` · `function parse(mode, args)`
- Modify: `plugins/forge/scripts/lib/implementation-report.js:159-186` · `function embeddedOutput`
- Modify: `plugins/forge/scripts/lib/implementation-followup-report.js:147-190` · `function buildFollowupReport`
- Modify: `plugins/forge/scripts/lib/flow-report.js:20-60` · `function flowStatus`
- Modify: `plugins/forge/scripts/followup.js:255-294` · `function mainNext`
- Modify: `plugins/forge/scripts/lib/followup-next.js:57-71` · `function nextStepOf`
- Create: `plugins/forge/scripts/lib/report-ablage.js`
- Modify: `plugins/forge/shared/review-flow/flow.md:68-78` · `## Ende`
- Modify: `plugins/forge/shared/review-loop/loop.md:46-53` · `## Abschluss`
- Modify: `plugins/forge/shared/review-loop/report-format.md:1-38` · `# Abschlussbericht (nur im Chat)`
- Modify: `plugins/forge/skills/spec-review/SKILL.md:18-19` · `## Eingebetteter Lauf`
- Modify: `plugins/forge/skills/plan-review/SKILL.md:17-21` · `## Eingebetteter Lauf`
- Modify: `plugins/forge/skills/implementation-review/SKILL.md:19-20` · `## Eingebetteter Lauf`
- Modify: `plugins/forge/skills/review-followup/SKILL.md:15-24` · `## Ablauf`
- Modify: `plugins/forge/skills/review-followup/references/flow.md:39-47` · `## Eingebetteter Lauf`
- Create: `plugins/forge/tests/report-ablage.test.js`
- Create: `plugins/forge/tests/lib/former-names.js`
- Test: `plugins/forge/tests/implementation-report.test.js:65-70` · `function report(env)`
- Test: `plugins/forge/tests/implementation-followup-report.test.js:66-80` · `implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen`
- Test: `plugins/forge/tests/chain-reports.test.js:182-190` · `function implementationRun(run, extra = [])`
- Test: `plugins/forge/tests/closing-report-docs.test.js:22-30` · `flow_End_PrintsReportTextOnlyAndDropsOrchestratorAppendices`
- Test: `plugins/forge/tests/implementation-report-docs.test.js:18-28` · `loop_Closing_RunsScoutCheckReportSaveShowInOrder`
- Test: `plugins/forge/tests/review-ablage-docs.test.js:14-20` · `flow_End_AblageAppendsOptionAndKeepsEverythingElse`
- Test: `plugins/forge/tests/review-followup-skill.test.js:93-102` · `reviewFollowupFlow_NextStep_ChainEntryIsLookedUpByTheScriptItself`
- Test: `plugins/forge/tests/plan-review-skill.test.js:86-110` · `planReviewSkill_Report_KeepsCommitQuestionForCleanPlan`
- Test: `plugins/forge/tests/skill.test.js:71-78` · `skill_Report_DelegatedToScript`
- Test: `plugins/forge/tests/implementation-review-skill.test.js:11-17` · `implementationReviewSkill_Frontmatter_ModelInvocableWithArgumentHint`
- Test: `plugins/forge/tests/review-loop.test.js:26-35` · `loop_Closing_ScoutWritesFileAndSaveRunsBeforeCleanup`
- Test: `plugins/forge/tests/review-flow-doc.test.js:121-139` · `flow_End_ShowsReportFileBeforeCleanupAndKeepsPriority`
- Test: `plugins/forge/tests/spec-review-orchestrator.test.js:50-62` · `specReviewOrchestrator_Body_TellsPauseFromEndByHeadingAndClosingLine`
- Test: `plugins/forge/tests/plan-orchestrator.test.js:44-56` · `planOrchestrator_Body_BranchesOnTheLinesTheEmbeddedReviewPrints`
- Test: `plugins/forge/tests/implementation-orchestrator.test.js:75-85` · `implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnAReadyResult`
- Test: `plugins/forge/tests/followup-next.test.js:1-150` · `nextStepOf`

**Interfaces:**
- Consumes: `storeReviewReport` aus plugins/forge/scripts/lib/session-chain-ablage.js, `reviewStatusLine` aus plugins/forge/scripts/lib/review-status.js, `REPORT_FORMAT` aus plugins/forge/scripts/lib/report-format.js (alle Task 5); `readContext` aus plugins/forge/scripts/workspace.js (bestehend); <W>/kontext.json mit `etappe`, `ablage` und `artifact`, das prepare.js seit Task 6 schreibt
- Produces: `ablageOf(workspace): string` in plugins/forge/scripts/lib/report-ablage.js (absoluter Ordner aus kontext.json; ohne Eintrag wirft es FlowError mit `Ablage fehlt im Arbeitsbereich: prepare.js legt sie in kontext.json fest`); implementation-report.js gibt genau `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>` aus und legt bericht-review.md und bericht-review.json (`format: 2`) in die Ablage; `implementation-report.js followup --workspace <W> [--ohne blockiert|keine-aenderung] [--hinweis <zeile>]` gibt `ENDE <status>`, `STATUSZEILE <Review-Statuszeile>` und `BEHALTEN <x>` aus und legt bericht-followup-<n>.md und bericht-followup-<n>.json in die Ablage; beide Aufrufe brechen bei jedem anderen Parameter mit `unbekannter Parameter: <name>` und Exit 2 ab; followup.js kennt nur noch `save`, `drop` und `keep`; followup-next.js und report-format.md entfallen

Diese Task schaltet den Implementierungs-Review und das Review-Followup auf den einen Datenkanal um und passt gleichzeitig alle Texte an, die die Review-Skills beschreiben: `shared/review-flow/flow.md`, `shared/review-loop/loop.md`, die drei Review-Skills und `review-followup`. Die Ausgabe der Reviews im Chat ist danach genau die Review-Statuszeile; der Bericht, der Abschnitt `Nächster Schritt` mit `followup.js next` und die Commit-Frage des Plan-Reviews entfallen. Die Texte der drei Orchestrator-Skills nennen `--bericht` und `--ablage` noch; sie stellt Task 8 um. Ihre Tests lesen nur Text; drei von ihnen prüften einen Satz aus `flow.md`, den es nicht mehr gibt, und verlieren in dieser Task genau diese Zeile.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben und anpassen**
  Neue Datei `plugins/forge/tests/lib/former-names.js`:
  ```js
  'use strict';

  // Namen der entfallenen Doppel-Betriebsart, wie Tests und Evals sie suchen oder übergeben. Sie stehen nur zerlegt im Plugin:
  // Der Prüftest verlangt, dass keine Datei des Plugins sie im Klartext nennt.

  const FORMER_REPORT_OPTION = ['--', 'ber', 'icht'].join('');
  const FORMER_ABLAGE_OPTION = ['--', 'abl', 'age'].join('');
  const FORMER_EMBEDDED_SECTION = ['Einge', 'bettet', 'er Lauf'].join('');

  module.exports = { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION };
  ```
  Neue Datei `plugins/forge/tests/report-ablage.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { FlowError } = require('../scripts/lib/flow-error');
  const { ablageOf } = require('../scripts/lib/report-ablage');

  function workspaceWith(context) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ra-'));
    if (context !== undefined) fs.writeFileSync(path.join(dir, 'kontext.json'), JSON.stringify(context));
    return dir;
  }

  test('ablageOf_ContextWithAblage_ReturnsTheResolvedFolder', () => {
    // Arrange
    const dir = workspaceWith({ etappe: 'plan-review', ablage: 'ablage/plan-review' });

    // Act
    const ablage = ablageOf(dir);

    // Assert
    assert.equal(ablage, path.resolve('ablage/plan-review'));
  });

  test('ablageOf_WorkspaceWithoutContextOrWithEmptyAblage_ThrowsFlowErrorNamingPrepare', () => {
    for (const dir of [workspaceWith(), workspaceWith({ etappe: 'plan-review' }), workspaceWith({ ablage: '' })]) {
      // Act
      const read = () => ablageOf(dir);

      // Assert
      assert.throws(read, (error) => error instanceof FlowError && /^Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest$/.test(error.message));
    }
  });
  ```
  `plugins/forge/tests/implementation-followup-report.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { parseAnswer } = require('../scripts/lib/implementation-followup-report');
  const { parseReviewStatusLine } = require('../scripts/lib/review-status');
  const { tempDir, writeJsonFile } = require('./lib/review-flow-fixture');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
  const AGGREGATE = [
    '=== REWORK ===',
    '### 🔴 src/a.js:3 (risks)',
    '- [risks · fehlerfall] Zitat: \u201Ex\u201C · Konsequenz: Absturz bei leerer Liste · Begründung: b',
    '',
    '### 🟡 src/b.js:9 (design)',
    '- [design · lesbarkeit] Zitat: \u201Ey\u201C · Konsequenz: Schwer lesbar · Begründung: b',
    '',
  ].join('\n');
  const SCOUT = [
    '## Scout-Vorschläge', '',
    '### 🔴 src/a.js:3', 'Titel: Leere Liste abfangen', 'Beschreibung: Eine leere Liste bringt die Summe zum Absturz.', 'Empfehlung: Früh zurückkehren, weil es am einfachsten ist.', '1. Früh zurückkehren.', '**Bevorzugt: 1** — klar.', '',
    '### 🟡 src/b.js:9', 'Titel: Schleife benennen', 'Beschreibung: Die Schleife ist schwer zu lesen.', 'Empfehlung: Funktion extrahieren, weil der Name erklärt.', '1. Extrahieren.', '**Bevorzugt: 1** — lesbar.', '',
  ].join('\n');
  const CLEAN = ['### Findings', '- **Leere Liste** — behoben — src/a.js:4', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Außerhalb', '- keine', '', '### Urteil', '**Fix-Runde:** alle behoben, keine neuen 🔴'].join('\n');
  const OPEN = ['### Findings', '- **Leere Liste** — nicht behoben — src/a.js:4', '', '### Neue Schäden im Fix-Diff', '- 🟡 `src/a.js:7` — Magische Zahl', '', '### Außerhalb', '- Logging fehlt in src/c.js', '', '### Urteil', '**Fix-Runde:** offen: Leere Liste'].join('\n');

  // Arbeitsbereich wie prepare.js ihn für ein Followup anlegt, samt Ablage in kontext.json.
  function workspace(chosen) {
    const dir = tempDir('dv-forge-impl-followup-');
    writeJsonFile(path.join(dir, 'sicherung-vorher', 'aggregate.md'), AGGREGATE);
    writeJsonFile(path.join(dir, 'sicherung-vorher', 'scout.md'), SCOUT);
    const all = [{ nummer: 1, stufe: '🔴', stelle: 'src/a.js:3' }, { nummer: 2, stufe: '🟡', stelle: 'src/b.js:9' }];
    writeJsonFile(path.join(dir, 'followup.json'), {
      gewaehlt: all.filter((group) => chosen.includes(group.nummer)).map((group) => ({ ...group, vorschlag: 1 })),
      offen: all.filter((group) => !chosen.includes(group.nummer)),
    });
    writeJsonFile(path.join(dir, 'kontext.json'), { etappe: 'umsetzung', ablage: path.join(dir, 'ablage').replace(/\\/g, '/'), artifact: 'plans/p.md' });
    return dir;
  }

  // Lauf des Followup-Berichts; Rückgabe: Ergebnis des Skripts, die geparste Statuszeile, die Bericht-Daten und der Bericht (.md) aus der Ablage.
  function run(dir, answer, extra = []) {
    const result = spawnSync(process.execPath, [SCRIPT, 'followup', '--workspace', dir, ...extra], { encoding: 'utf8', input: answer });
    if (result.status !== 0) return { result, status: null, data: null, report: null };
    const status = parseReviewStatusLine(result.stdout.split('\n')[1].replace(/^STATUSZEILE /, ''));
    return { result, status, data: JSON.parse(fs.readFileSync(status.bericht.replace(/\.md$/, '.json'), 'utf8')), report: fs.readFileSync(status.bericht, 'utf8') };
  }

  test('parseAnswer_CleanVerdict_CleanWithoutDamages', () => {
    // Act
    const answer = parseAnswer(CLEAN);

    // Assert
    assert.equal(answer.clean, true);
    assert.deepEqual(answer.damages, []);
    assert.deepEqual(answer.outside, []);
  });

  test('parseAnswer_MissingVerdictLine_NotClean', () => {
    // Act
    const answer = parseAnswer('### Findings\n- **x** — behoben — a.js:1');

    // Assert
    assert.equal(answer.verdict, null);
    assert.equal(answer.clean, false);
  });

  test('implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, status, data } = run(dir, CLEAN);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `ENDE sauber nach Nach-Review\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · FOLLOWUP nein · Bericht: ${status.bericht}\nBEHALTEN keine\n`);
    assert.ok(status.bericht.endsWith('/ablage/bericht-followup-1.md'), status.bericht);
    assert.equal(data.format, 2);
    assert.deepEqual(data.changes.map((change) => [change.title, change.ok, change.choice]), [['Leere Liste abfangen', true, 1], ['Schleife benennen', true, 1]]);
    assert.equal(data.changes[0].key, 'src/a.js:3');
    assert.deepEqual(data.open, []);
    assert.equal(data.flowLine, 'Ablauf: 2 gewählte Vorschläge umgesetzt, ein Nach-Review.');
  });

  test('implementationFollowup_NotClean_ChosenStayOpenAsHindranceWithNewDamageAndVerdictNote', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, data } = run(dir, OPEN);

    // Assert
    assert.match(result.stdout, /^ENDE offen nach Nach-Review\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: /);
    assert.equal(data.changes[0].ok, false);
    assert.deepEqual(data.open.map((entry) => [entry.color, entry.title]), [['yellow', 'Schleife benennen'], ['red', 'Leere Liste abfangen'], ['yellow', 'src/a.js:7']]);
    assert.equal(data.open[2].description, 'Magische Zahl');
    assert.deepEqual(data.notes, ['Nach-Review: offen: Leere Liste', 'Außerhalb des Fix-Diffs: Logging fehlt in src/c.js']);
  });

  test('implementationFollowup_UnchosenGroupLeft_CleanStatusNamesOpenGroups', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, data } = run(dir, CLEAN);

    // Assert
    assert.match(result.stdout, /^ENDE sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen · FOLLOWUP ja · Bericht: /);
    assert.deepEqual(data.open.map((entry) => entry.title), ['Schleife benennen']);
  });

  test('implementationFollowup_WithoutReReview_BlockedAndChangeNotVerified', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, data } = run(dir, '', ['--ohne', 'blockiert']);

    // Assert
    assert.match(result.stdout, /^ENDE blockiert\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP nein · Bericht: /);
    assert.equal(data.changes[0].ok, null);
    assert.deepEqual(data.notes, ['Kein Nach-Review: blockiert.']);
    assert.equal(data.flowLine, 'Ablauf: 1 gewählter Vorschlag umgesetzt, kein Nach-Review.');
  });

  test('implementationFollowup_UnknownWithoutValue_ExitsWithOne', () => {
    // Act
    const { result } = run(workspace([1]), '', ['--ohne', 'vielleicht']);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--ohne erlaubt: blockiert, keine-aenderung/);
  });

  const GROUP_LINES = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — nicht behoben — src/b.js:9', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Urteil', '**Fix-Runde:** offen: src/b.js:9'].join('\n');
  const ALL_FIXED_NEW_RED = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — behoben — src/b.js:10', '', '### Neue Schäden im Fix-Diff', '- 🔴 `src/c.js:2` — Neuer Absturz bei null', '', '### Urteil', '**Fix-Runde:** offen: neues 🔴 in src/c.js'].join('\n');

  test('parseAnswer_GroupVerdictLines_JudgedByPlaceKeyAndGreenDamagesSeparate', () => {
    // Arrange
    const text = GROUP_LINES.replace('- keine', '- 🟢 `src/d.js:1` — Name holpert\n- 🟡 `src/e.js:2` — Magische Zahl');

    // Act
    const answer = parseAnswer(text);

    // Assert
    assert.equal(answer.judged.get('src/a.js:3'), 'behoben');
    assert.equal(answer.judged.get('src/b.js:9'), 'nicht behoben');
    assert.deepEqual(answer.damages.map((match) => match[1]), ['🟡']);
    assert.deepEqual(answer.greens.map((match) => match[1]), ['🟢']);
  });

  test('implementationFollowup_OneChosenGroupNotConfirmed_KeepsOnlyItsProposalAndOffersFollowup', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, data } = run(dir, GROUP_LINES);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, / · FOLLOWUP ja · Bericht: [^\n]+\nBEHALTEN 2\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
    assert.deepEqual(data.open.map((entry) => [entry.color, entry.title, entry.hasProposal]), [['yellow', 'Schleife benennen', true]]);
    assert.equal(data.offersFollowup, true);
    assert.match(result.stdout, /^ENDE offen nach Nach-Review\n/);
  });

  test('implementationFollowup_YellowGroupNotConfirmedByOwnVerdict_ResultReadyWithOneHintAndFollowupJa', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, data } = run(dir, GROUP_LINES);

    // Assert
    assert.match(result.stdout, /\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen · FOLLOWUP ja · Bericht: /);
    assert.equal(data.kind, 'hints');
    assert.equal(data.openRed, 0);
  });

  test('implementationFollowup_RedGroupNotConfirmedByOwnVerdict_StaysHindrance', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const answer = GROUP_LINES.replace('- **src/a.js:3** — behoben', '- **src/a.js:3** — nicht behoben').replace('- **src/b.js:9** — nicht behoben', '- **src/b.js:9** — behoben');

    // Act
    const { result, data } = run(dir, answer);

    // Assert
    assert.match(result.stdout, /\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: /);
    assert.deepEqual(data.open.map((entry) => entry.color), ['red']);
  });

  test('implementationFollowup_YellowGroupWithoutOwnVerdictAndNotCleanAnswer_CountsAsHindrance', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const answer = ['### Findings', '- keine', '', '### Neue Schäden im Fix-Diff', '- keine', '', '### Urteil', '**Fix-Runde:** offen: beide'].join('\n');

    // Act
    const { result, data } = run(dir, answer);

    // Assert
    assert.match(result.stdout, /\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 2 Hindernisse offen · FOLLOWUP /);
    assert.deepEqual(data.open.map((entry) => [entry.color, entry.title]), [['red', 'Leere Liste abfangen'], ['red', 'Schleife benennen']]);
  });

  test('parseAnswer_TitleWithReviewerBracket_JudgesTheGroup', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const text = GROUP_LINES.replace('- **src/a.js:3** —', '- **src/a.js:3 (risks)** —').replace('- **src/b.js:9** —', '- **src/b.js:9 (design)** —');

    // Act
    const { result, data } = run(dir, text);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, / · FOLLOWUP ja · Bericht: [^\n]+\nBEHALTEN 2\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
  });

  test('implementationFollowup_AllChosenConfirmedButNewRedWithoutProposal_FollowupNeinNothingKeptDamageOpen', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, data } = run(dir, ALL_FIXED_NEW_RED);

    // Assert
    assert.match(result.stdout, / · FOLLOWUP nein · Bericht: [^\n]+\nBEHALTEN keine\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [true, true]);
    assert.deepEqual(data.open.map((entry) => [entry.color, entry.title, entry.hasProposal]), [['red', 'src/c.js:2', false]]);
    assert.equal(data.offersFollowup, false);
  });

  test('implementationFollowup_UnchosenGroupLeftAndChosenConfirmed_KeepsUnchosenAndOffersFollowup', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result } = run(dir, CLEAN);

    // Assert
    assert.match(result.stdout, / · FOLLOWUP ja · Bericht: [^\n]+\nBEHALTEN 2\n$/);
  });

  test('implementationFollowup_WithoutReReview_FollowupNeinAndSaveUnchanged', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, data } = run(dir, '', ['--ohne', 'keine-aenderung']);

    // Assert
    assert.match(result.stdout, / · FOLLOWUP nein · Bericht: [^\n]+\nBEHALTEN unveraendert\n$/);
    assert.equal(data.offersFollowup, false);
  });

  test('implementationFollowup_GreenDamageInFixDiff_ListedAsGreenAndNotOpen', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const answer = CLEAN.replace('### Neue Schäden im Fix-Diff\n- keine', '### Neue Schäden im Fix-Diff\n- 🟢 `src/d.js:1` — Name holpert');

    // Act
    const { data } = run(dir, answer);

    // Assert
    assert.deepEqual(data.green.map((entry) => [entry.color, entry.title, entry.description, entry.hasProposal]), [['green', 'src/d.js:1', 'Name holpert', false]]);
    assert.deepEqual(data.open, []);
  });

  test('implementationFollowup_GroupLinesConfirmedButNoVerdictLine_ChosenStayOpenAsHindranceAndFollowupJa', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const answer = ['### Findings', '- **src/a.js:3** — behoben — src/a.js:4', '- **src/b.js:9** — behoben — src/b.js:10', '', '### Neue Schäden im Fix-Diff', '- keine'].join('\n');

    // Act
    const { result, data } = run(dir, answer);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^ENDE offen nach Nach-Review\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 2 Hindernisse offen · FOLLOWUP ja · Bericht: [^\n]+\nBEHALTEN 1,2\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [false, false]);
    assert.deepEqual(data.open.map((entry) => entry.color), ['red', 'red']);
    assert.equal(data.kind, 'blocked');
    assert.deepEqual(data.notes, ['Nach-Review: kein Urteil geliefert']);
  });

  test('implementationFollowup_WithReReview_StoresTheReportTextWithAnswerAndChosenPoints', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, report } = run(dir, CLEAN);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(report.startsWith('## Review-Followup (implementation-review): plans/p.md\n\n**Status:** sauber nach Nach-Review\n**Reviews:** 1 · **Nacharbeiten:** 1\n\n### Letztes Review\n### Findings\n'), report);
    assert.ok(report.includes(`${CLEAN}\n\n### Umgesetzt\n- 1 · 🔴 src/a.js:3 · Vorschlag 1\n- 2 · 🟡 src/b.js:9 · Vorschlag 1\n`), report);
    assert.equal(report.includes('Hinweise des Orchestrators'), false);
    assert.doesNotMatch(result.stdout, /=== BERICHT ===/);
  });

  test('implementationFollowup_WithoutReReviewAndHint_ReportsZeroReviewsAndNotesTheReasonInTextAndData', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, report, data } = run(dir, '', ['--ohne', 'blockiert', '--hinweis', 'Implementer: needs-context, Schema fehlt']);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(report.includes('**Status:** blockiert\n**Reviews:** 0 · **Nacharbeiten:** 1'), report);
    assert.ok(report.includes('### Letztes Review\nKein Nach-Review: blockiert.'), report);
    assert.ok(report.includes('### Hinweise des Orchestrators\n- Kein Nach-Review: blockiert.\n- Implementer: needs-context, Schema fehlt\n\n### Umgesetzt\n- 1 · 🔴 src/a.js:3 · Vorschlag 1'), report);
    assert.deepEqual(data.notes, ['Kein Nach-Review: blockiert.', 'Implementer: needs-context, Schema fehlt']);
  });

  test('implementationFollowup_Open_KeepsAnswerUnchangedAndStatusOffen', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, report } = run(dir, OPEN);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(report.includes(`### Letztes Review\n${OPEN}\n\n### Umgesetzt`));
    assert.ok(result.stdout.startsWith('ENDE offen nach Nach-Review\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit'), result.stdout);
  });

  test('implementationFollowup_SecondRun_StoresRoundTwoBesideTheFirst', () => {
    // Arrange
    const dir = workspace([1, 2]);
    run(dir, CLEAN);

    // Act
    const { status } = run(dir, CLEAN);

    // Assert
    assert.deepEqual(fs.readdirSync(path.join(dir, 'ablage')).sort(), ['bericht-followup-1.json', 'bericht-followup-1.md', 'bericht-followup-2.json', 'bericht-followup-2.md']);
    assert.ok(status.bericht.endsWith('/bericht-followup-2.md'), status.bericht);
  });

  test('implementationFollowup_WorkspaceWithoutAblage_ExitsOneAndNamesPrepare', () => {
    // Arrange
    const dir = workspace([1]);
    fs.rmSync(path.join(dir, 'kontext.json'));

    // Act
    const { result } = run(dir, CLEAN);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge implementation-report: Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest/);
  });

  for (const parts of [['--', 'ber', 'icht'], ['--', 'art', 'efakt'], ['--', 'abl', 'age']]) {
    const parameter = parts.join('');
    test(`implementationFollowup_FormerParameter${parts[1]}${parts[2]}_ExitsWithTwoAndSaysUnknownParameter`, () => {
      // Arrange
      const dir = workspace([1]);

      // Act
      const { result } = run(dir, CLEAN, [parameter, 'x']);

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}\\n`));
      assert.equal(fs.existsSync(path.join(dir, 'ablage')), false);
    });
  }
  ```
  In `plugins/forge/tests/implementation-report.test.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const { isTestFile } = require('../scripts/lib/implementation-report');` die Zeile `const { parseReviewStatusLine } = require('../scripts/lib/review-status');` einfügen.
  2. In `setup` die Zeile `  return { workspace, dir, plan, packageFile };` ersetzen durch:
  ```js
    const ablage = path.join(workspace, 'ablage');
    fs.writeFileSync(path.join(workspace, 'kontext.json'), JSON.stringify({ etappe: 'umsetzung', ablage, artifact: plan }));
    return { workspace, dir, plan, packageFile, ablage };
  ```
  3. Die Funktion `report(env)` (vom Aufruf bis zur schließenden `}`) ersetzen durch:
  ```js
  function runReport(env, extra = []) {
    return spawnSync(process.execPath, [SCRIPT, '--dir', env.dir, '--workspace', env.workspace, '--plan', env.plan, '--bereich', 'a1b2c3d', '--paket', env.packageFile, ...extra], { encoding: 'utf8' });
  }

  // Der Bericht liegt in der Ablage, die Statuszeile nennt die Datei. stdout des Ergebnisses: die ENDE-Zeile, dann === BERICHT === und der Bericht.
  function report(env) {
    const result = runReport(env);
    if (result.status !== 0) return result;
    const status = parseReviewStatusLine(result.stdout.split('\n').find((line) => line.startsWith('STATUSZEILE '))?.slice('STATUSZEILE '.length));
    assert.ok(status, result.stdout);
    return { ...result, stdout: `${result.stdout.split('\n')[0]}\n=== BERICHT ===\n${fs.readFileSync(status.bericht, 'utf8')}`, statusLine: status };
  }
  ```
  4. Im Test `implementationReport_OneYellowWithValidScout_ReadyAndFilesFiltered` die Zeile, die mit `  assert.equal(read(env, 'bericht.md'),` beginnt, ersetzen durch `  assert.equal(fs.existsSync(path.join(env.workspace, 'abschluss', 'bericht.md')), false);`.
  5. Im Test `implementationReport_Bericht_CarriesHeadingAnchorsWithoutNextSection` die Zeile `  const anchors = anchorsOf(read(env, 'bericht.md'));` ersetzen durch `  const anchors = anchorsOf(fs.readFileSync(path.join(env.ablage, 'bericht-review.md'), 'utf8'));`.
  6. Vor dem Test `isTestFile_PathPatterns_CountTestFilesOnly` einfügen:
  ```js
  test('implementationReport_WorkspaceWithoutAblage_ExitsOneAndNamesPrepare', () => {
    // Arrange
    const env = setup();
    fs.rmSync(path.join(env.workspace, 'kontext.json'));

    // Act
    const result = runReport(env);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge implementation-report: Ablage fehlt im Arbeitsbereich: prepare\.js legt sie in kontext\.json fest/);
  });

  for (const parts of [['--', 'ber', 'icht'], ['--', 'abl', 'age']]) {
    const parameter = parts.join('');
    test(`implementationReport_FormerParameter${parts[1]}${parts[2]}_ExitsWithTwoAndSaysUnknownParameter`, () => {
      // Arrange
      const env = setup();

      // Act
      const result = runReport(env, [parameter, 'x']);

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${parameter}\\n`));
      assert.equal(fs.existsSync(env.ablage), false);
    });
  }

  ```
  7. Ab der Zeile `function embeddedReport(env, file) {` bis zum Dateiende ersetzen durch:
  ```js
  test('implementationReport_RunWithProposal_StoresJsonDataAndPrintsOnlyEndeAndTheStatusLine', () => {
    // Arrange
    const env = setup({ groups: [YELLOW], scout: SCOUT_YELLOW });
    const file = path.join(env.ablage, 'bericht-review.json');

    // Act
    const result = runReport(env);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `ENDE sauber nach Review 1\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen · FOLLOWUP ja · Bericht: ${path.join(env.ablage, 'bericht-review.md').replace(/\\/g, '/')}\n`);
    assert.deepEqual(fs.readdirSync(env.ablage).sort(), ['bericht-review.json', 'bericht-review.md']);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(data.format, 2);
    assert.equal(data.review, 'implementation-review');
    assert.equal(data.kind, 'hints');
    assert.equal(data.resultLine, '**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen');
    assert.equal(data.offersFollowup, true);
    assert.deepEqual(data.changes, []);
    assert.equal(data.open.length, 1);
    assert.equal(data.open[0].color, 'yellow');
    assert.equal(typeof data.open[0].key, 'string');
    assert.ok(data.checked.some((line) => line.startsWith('- Bereich: ')));
    assert.doesNotMatch(fs.readFileSync(path.join(env.ablage, 'bericht-review.md'), 'utf8'), /Wie es weitergeht/);
    assert.match(read(env, 'scout.md'), /^## Scout-Vorschläge/);
  });

  test('implementationReport_RunWithoutScout_StatusLineSaysFollowupNein', () => {
    // Arrange
    const env = setup({ groups: [RED] });

    // Act
    const result = runReport(env);

    // Assert
    assert.match(result.stdout, /^ENDE geprüft, 1 × 🔴 offen\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP nein · Bericht: /);
  });

  test('implementationReport_RunWithGreenGroup_DataListsGreenEntryAndOpenStaysEmpty', () => {
    // Arrange
    const env = setup({ groups: [GREEN] });
    const file = path.join(env.ablage, 'bericht-review.json');

    // Act
    const result = runReport(env);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(data.green.map((entry) => [entry.key, entry.color, entry.title, entry.angles, entry.hasProposal]), [['src/ok.js', 'green', 'src/ok.js', 'Tests', false]]);
    assert.match(data.green[0].description, /^Name holpert/);
    assert.deepEqual(data.open, []);
    assert.equal(data.kind, 'ready');
  });
  ```
  In `plugins/forge/tests/chain-reports.test.js` diese Änderungen vornehmen:
  1. Die beiden Zeilen `// Implementation-Review ohne Findings zum Plan im Repo; Rückgabe der Berichtsausgabe.` und `function implementationRun(run, extra = []) {` ersetzen durch:
  ```js
  // Implementation-Review ohne Findings zum Plan im Repo; Rückgabe: stdout des Berichts-Skripts.
  function runImplementation(run) {
  ```
  2. In dieser Funktion die Zeile, die mit `  const result = spawnSync(process.execPath, [IMPLEMENTATION_REPORT,` beginnt, ersetzen durch:
  ```js
    fs.writeFileSync(path.join(workspace, 'kontext.json'), JSON.stringify({ etappe: 'umsetzung', ablage: ablageDir(run.repo, 'x', 'umsetzung') }));
    const result = spawnSync(process.execPath, [IMPLEMENTATION_REPORT, '--dir', dir, '--workspace', workspace, '--plan', run.plan, '--bereich', 'a1b2c3d', '--paket', packageFile], { encoding: 'utf8' });
  ```
  3. Die Funktion `withoutStatus(text)` samt der Kommentarzeile `// Ohne die Zeile `ENDE …`, die zwischen zwei Läufen abweichen darf.` ersetzen durch:
  ```js
  // Der Bericht liegt in der Ablage; die Statuszeile nennt die Datei.
  function implementationRun(run) {
    const statusLine = runImplementation(run).split('\n').find((line) => line.startsWith('STATUSZEILE '));
    return fs.readFileSync(parseReviewStatusLine(statusLine.replace(/^STATUSZEILE /, '')).bericht, 'utf8');
  }
  ```
  4. In den drei Tests `implementationReport_ImplementationEntry_EqualsReportWithoutEntryAndNamesNoNextStep`, `implementationReport_NoEntryOrWorktreeRemoved_EqualsReportWithoutEntry` und `implementationReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry` jeweils die Zeile `  assert.equal(withoutStatus(text), withoutStatus(baseline));` ersetzen durch `  assert.equal(text, baseline);`.
  5. Den Test `implementationReport_EmbeddedRunWithEntry_PrintsFourLinesWithoutNextSection` (vom `test(`-Aufruf bis zur schließenden `});`) ersetzen durch:
  ```js
  test('implementationReport_RunWithEntry_PrintsOnlyEndeAndTheStatusLine', () => {
    // Arrange
    const run = specRun();
    const worktree = addWorktree(run.repo, 'feature/z');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/z' });

    // Act
    const stdout = runImplementation(run);

    // Assert
    const file = path.join(ablageDir(run.repo, 'x', 'umsetzung'), 'bericht-review.md').replace(/\\/g, '/');
    assert.equal(stdout, `ENDE sauber nach Review 1\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Abschließen · FOLLOWUP nein · Bericht: ${file}\n`);
  });
  ```
  `plugins/forge/tests/closing-report-docs.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readText, readMarkdown, wordCount } = require('./lib/markdown');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION } = require('./lib/former-names');

  const PLUGIN = path.join(__dirname, '..');
  const FLOW = path.join(PLUGIN, 'shared', 'review-flow', 'flow.md');
  const SPEC_SKILL = path.join(PLUGIN, 'skills', 'spec-review', 'SKILL.md');
  const PLAN_SKILL = path.join(PLUGIN, 'skills', 'plan-review', 'SKILL.md');
  const IMPLEMENTATION_SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
  const FOLLOWUP_SKILL = path.join(PLUGIN, 'skills', 'review-followup', 'SKILL.md');
  const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');

  function section(text, title) {
    const start = text.indexOf(`## ${title}\n`);
    assert.ok(start > -1, `Abschnitt ${title} fehlt`);
    const end = text.indexOf('\n## ', start + 1);
    return text.slice(start, end === -1 ? undefined : end);
  }

  test('flow_End_ReportWritesToTheAblageAndTheChatShowsOnlyTheStatusLine', () => {
    // Arrange
    const text = readText(FLOW);

    // Act
    const end = section(text, 'Ende');
    const chat = end.split('\n').find((line) => line.startsWith('4. Im Chat steht als letzte Handlung'));

    // Assert
    assert.ok(end.includes('Die Ausgabe hat zwei Zeilen: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`.'));
    assert.ok(end.includes('du übergibst dafür nichts'));
    assert.ok(chat, 'Schritt 4 fehlt');
    assert.ok(chat.includes('genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert'));
    assert.ok(chat.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
    for (const gone of ['=== BERICHT ===', FORMER_ABLAGE_OPTION, FORMER_REPORT_OPTION, 'guard-orchestrator.js" show', 'COMMIT-PRUEFUNG', FORMER_EMBEDDED_SECTION, 'Nächster Schritt']) assert.equal(text.includes(gone), false, gone);
    assert.ok(text.includes('| Bericht | Titel und Artefakt |'));
  });

  test('reviewSkills_Ablage_NamedWithoutParametersForSpecPlanAndImplementation', () => {
    for (const file of [SPEC_SKILL, PLAN_SKILL, IMPLEMENTATION_SKILL]) {
      // Act
      const { fields, body } = readMarkdown(file);

      // Assert
      assert.ok(section(body, 'Ablage').includes('Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.'), file);
      assert.ok(fields['argument-hint'].includes('[--debug]'), file);
      for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION]) assert.equal(fields['argument-hint'].includes(gone), false, `${gone} im Hint von ${file}`);
      for (const gone of [FORMER_EMBEDDED_SECTION, FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'Auswahl-Hinweis', 'Hinweise des Orchestrators']) assert.equal(body.includes(gone), false, `${gone} in ${file}`);
      assert.ok(wordCount(body) < 500, file);
    }
  });

  test('specReviewSkill_Report_ComesFromReportAndPassesTheWhiteboardingSwitchOnlyThroughPrepare', () => {
    // Act
    const { fields, body } = readMarkdown(SPEC_SKILL);

    // Assert
    assert.ok(section(body, 'Bericht').includes('den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile'));
    assert.ok(fields['argument-hint'].includes('[--whiteboarding]'));
    assert.ok(section(body, 'Ablage').includes('`--whiteboarding` und `--debug` reicht `prepare.js` selbst durch.'));
  });

  test('planReviewSkill_Report_AsksNoCommitQuestionAndKeepsTheSpecQuestionInTheReport', () => {
    // Act
    const { body } = readMarkdown(PLAN_SKILL);
    const report = section(body, 'Bericht');

    // Assert
    assert.ok(report.includes('Du fragst nicht nach einem Commit.'));
    assert.ok(report.includes('Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen.'));
    for (const gone of ['Soll ich Spec und Plan jetzt committen?', 'git status --porcelain', 'COMMIT-PRUEFUNG', 'Commit-Konvention']) assert.equal(body.includes(gone), false, gone);
  });

  test('reviewFollowupSkill_HintAcceptsAlleAndTheBodyStaysShort', () => {
    // Act
    const { fields, body } = readMarkdown(FOLLOWUP_SKILL);

    // Assert
    assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl>');
    assert.ok(wordCount(body) < 500);
  });

  test('reviewFollowupFlow_SpecAndPlan_ReportFromScriptAndSaveAlways', () => {
    // Arrange
    const text = readText(FOLLOWUP_FLOW);

    // Act
    const verification = text.slice(text.indexOf('## Nachprüfung'), text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')));

    // Assert
    assert.ok(verification.includes('6. Sicherung: `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`; die Ausgabe zeigst du nicht.'));
    assert.ok(verification.includes('Die Ausgabe hat zwei Zeilen: `ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat.'));
    assert.equal(verification.includes('entfällt `save`'), false);
  });

  test('reviewFollowupSkill_Body_NamesAlleAndLeavesHintsToTheReport', () => {
    // Act
    const { body } = readMarkdown(FOLLOWUP_SKILL);

    // Assert
    assert.ok(body.includes('Auswahl: `alle`'), 'alle fehlt');
    assert.ok(body.includes('`<n>` und `<g>:<n|b>,…` zählen die Gruppen in der Reihenfolge der gesicherten Abschlussdaten; der Bericht zeigt diese Nummern nicht, darum ist `alle` der Normalfall.'));
    assert.ok(body.includes('der Bericht enthält die Hinweise'));
    assert.ok(body.includes('Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.'));
    for (const gone of ['Commit-Prüfung', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'guard-orchestrator.js" show']) assert.equal(body.includes(gone), false, gone);
  });
  ```
  `plugins/forge/tests/implementation-report-docs.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readText, readMarkdown, wordCount } = require('./lib/markdown');

  const PLUGIN = path.join(__dirname, '..');
  const LOOP = path.join(PLUGIN, 'shared', 'review-loop', 'loop.md');
  const SKILL = path.join(PLUGIN, 'skills', 'implementation-review', 'SKILL.md');
  const FOLLOWUP_FLOW = path.join(PLUGIN, 'skills', 'review-followup', 'references', 'flow.md');
  const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.';

  function closing(text) {
    return text.slice(text.indexOf('## Abschluss'));
  }

  test('loop_Closing_RunsScoutCheckReportSaveCleanupAndStatusLineInOrder', () => {
    // Arrange
    const text = closing(readText(LOOP));
    const parts = ['scout-check --review implementation-review --dir "<D>"', 'implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"',
      'followup.js" save <rolle> <slug> "<W>/abschluss"', 'Die zwei Befehle aus Abschnitt Jedes Ende', 'Im Chat steht als letzte Handlung genau die Review-Statuszeile'];

    // Act
    const positions = parts.map((part) => text.indexOf(part));

    // Assert
    assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.ok(text.includes(PRIO));
    assert.ok(text.includes('die Ausgabe zeigst du nicht'));
    assert.ok(text.includes('Deine letzte Antwort hatte kein gültiges Ergebnis: <grund>'));
    for (const gone of ['guard-orchestrator.js" show', '=== BERICHT ===']) assert.equal(text.includes(gone), false, gone);
  });

  test('loop_Closing_ScoutCheckOnlyAfterScoutAndFailedReportDropsSaveBeforeEnd', () => {
    // Arrange
    const text = closing(readText(LOOP));

    // Act
    const failure = text.split('\n').find((line) => line.startsWith('2. **Bericht:**'));

    // Assert
    assert.ok(text.includes('Lief der Scout: danach `node "<PLUGIN>/scripts/review-flow.js" scout-check --review implementation-review --dir "<D>"`'));
    assert.equal(text.includes('Du bewertest die Vorschläge nicht. Danach'), false, 'scout-check ohne Bedingung');
    assert.ok(failure.includes('`ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat'), failure);
    assert.ok(failure.includes('Exit ungleich 0: die Meldung unverändert ausgeben'), failure);
    assert.ok(failure.includes('`node "<PLUGIN>/scripts/followup.js" drop <rolle> <slug>`'), failure);
    assert.ok(failure.includes('weiter mit Abschnitt Jedes Ende'), failure);
  });

  test('loop_BuildingBlocks_ReportRowNamesTitleAndArtifactOnly', () => {
    assert.ok(readText(LOOP).includes('| Bericht | Titel und Artefakt |'));
  });

  test('implementationReviewSkill_Report_ComesFromScriptWithoutSelectionHint', () => {
    const { body } = readMarkdown(SKILL);
    const report = body.slice(body.indexOf('## Bericht'));
    for (const part of ['den Rest liefert `implementation-report.js`', '`<P>`, `<B>` und `<K>`', '`geprüft, k × 🔴 offen`']) assert.ok(report.includes(part), part);
    for (const gone of ['Auswahl-Hinweis', 'Auswahl: b =', 'Hinweise des Orchestrators', 'Nächster Schritt:']) assert.equal(body.includes(gone), false, gone);
    assert.ok(wordCount(body) < 500);
  });

  test('reviewFollowupFlow_Implementation_KeepsOnlyOpenGroupsAndOffersAlle', () => {
    // Arrange
    const text = readText(FOLLOWUP_FLOW);

    // Act
    const implementation = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('## Ende'));

    // Assert
    assert.ok(implementation.includes('followup.js" keep review <slug> <nummern>'));
    assert.ok(implementation.includes('`alle behoben, keine neuen 🔴`'));
    assert.equal(text.includes('mit den bisherigen Nummern'), false);
  });
  ```
  `plugins/forge/tests/review-followup-skill.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { readMarkdown, readText, wordCount } = require('./lib/markdown');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION } = require('./lib/former-names');

  const DIR = path.join(__dirname, '..', 'skills', 'review-followup');
  const SKILL = path.join(DIR, 'SKILL.md');
  const FLOW = path.join(DIR, 'references', 'flow.md');

  test('reviewFollowupSkill_Frontmatter_ModelInvocableWithArgumentHint', () => {
    const { fields } = readMarkdown(SKILL);
    assert.equal(fields.name, 'review-followup');
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], undefined);
    assert.equal(fields['argument-hint'], '<spec.md|plan.md> <alle|auswahl>');
  });

  test('reviewFollowupSkill_Body_StaysUnder500Words', () => {
    assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
  });

  test('reviewFollowupSkill_Body_OrchestratesPrepareUmsetzenNachReviewEnde', () => {
    const { body } = readMarkdown(SKILL);
    for (const part of ['${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS', 'references/flow.md',
      '${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md', '`original`', '`offen`', 'dv-forge:implementation-implementer', 'dv-forge:implementation-re-reviewer',
      'Nachprüfung, genau eine', 'kein Reviewer läuft', 'shared/review-flow/flow.md', 'scripts/workspace.js" remove <rolle> <slug>', 'scripts/guard-orchestrator.js" release', 'run_in_background: false']) {
      assert.ok(body.includes(part), `${part} fehlt`);
    }
  });

  test('reviewFollowupFlow_Reference_SpecAndPlanWithoutReviewerRound', () => {
    const text = readText(FLOW);
    assert.doesNotMatch(text, /--expect <aktiv>|--round 1|plan-tasks.js" anchors/);
  });

  test('reviewFollowupFlow_Reference_FailedReworkOrVerifierStillReportsWithoutSaveOrDrop', () => {
    const text = readText(FLOW);
    assert.ok(text.includes('Meldet `attempt` für `nacharbeit` oder `nachprüfer` `AUSGEFALLEN`, geht es statt mit dem Abschnitt Ende von `flow.md` mit Schritt 5 von \u201ENachprüfung · Spec und Plan\u201C (`report`) weiter, danach mit dessen Schritt 6 ohne `save` und ohne `drop`.'));
  });

  test('reviewFollowupFlow_Reference_BranchesForSpecPlanAndImplementation', () => {
    assert.ok(fs.existsSync(FLOW));
    const text = readText(FLOW);
    for (const part of ['Vorschläge: <F>', 'Eintrag: R<n>', 'Ergebnis: <W>/nacharbeit/rework.json', '--quelle nacharbeit', 'review-flow.js" snapshot --dir "<W>" --doc "<DOC>"',
      'review-flow.js" rework-check <FLAGS>', 'review-flow.js" checklist <FLAGS>', 'review-flow.js" verify <FLAGS>', 'review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)"',
      'review-flow.js" script-checks <FLAGS> --runde runde-2',
      'Prüfliste: <W>/runde-2/pruefliste.md', 'Kein Reviewer läuft.', 'followup.js" save <rolle> <slug> "<W>/abschluss"',
      'plan-tasks.js" header "<P>" "<W>"', 'review-package.js" <FIX_BASE> HEAD "<W>"', 'followup.js" drop review <slug>', 'Kein Scout', 'nicht gewählt',
      'bleibt die alte Sicherung', '--hinweis', 'keine Änderung', 'blockiert']) {
      assert.ok(text.includes(part), `${part} fehlt`);
    }
  });

  test('reviewFollowupFlow_ImplementationStatus_NamesNoGroupNumbersOfTheOldSave', () => {
    // keep nummeriert die verbliebenen Gruppen ab 1 neu; alte Nummern im Status wären danach falsch.
    const text = readText(FLOW);
    assert.ok(text.includes('dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen`'));
    assert.equal(text.includes('Gruppen <offen>'), false);
  });

  test('reviewFollowupSkill_Body_EndsWithTheStatusLineAfterCleanupAndPassesNoReportParameter', () => {
    // Arrange
    const { body } = readMarkdown(SKILL);

    // Act
    const release = body.indexOf('scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}');

    // Assert
    assert.ok(release > -1, 'release fehlt');
    assert.ok(body.indexOf('Im Chat steht als letzte Handlung die Review-Statuszeile') > release, 'die Statuszeile steht nach dem Aufräumen');
    assert.ok(body.includes('die Formatregeln stehen in `flow.md`, Abschnitt Ende'));
    for (const gone of ['guard-orchestrator.js" show', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'Commit-Prüfung']) assert.equal(body.includes(gone), false, `${gone} entfällt`);
    assert.ok(wordCount(body) < 500);
  });

  test('reviewFollowupFlow_End_KeepsPriorityAndShowsOnlyTheStatusLine', () => {
    const text = readText(FLOW);
    const ending = text.slice(text.indexOf('## Ende'));
    assert.ok(ending.includes('genau die Review-Statuszeile'));
    assert.ok(ending.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.'));
    for (const gone of [`## ${FORMER_EMBEDDED_SECTION}`, '## Nächster Schritt', '=== BERICHT ===', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'followup.js" next']) assert.equal(text.includes(gone), false, `${gone} entfällt`);
  });

  test('reviewFollowupSkill_Body_TakesNoNextStepTextsFromImplementationReview', () => {
    const { body } = readMarkdown(SKILL);
    assert.equal(body.includes('die Texte für `Nächster Schritt`'), false);
    assert.ok(body.includes('Bei `implementation-review` entfällt der Schritt: Implementer und Re-Reviewer bekommen ihre Eingaben aus `flow.md`, und es läuft kein Scout.'));
    assert.equal(body.includes('des Abschnitts Abschluss-Scout'), false, 'das Followup der Implementierung startet keinen Scout');
  });

  test('reviewFollowupFlow_ImplementationSave_FollowsTheBehaltenLineOfTheReportScript', () => {
    const text = readText(FLOW);
    const script = readText(path.join(__dirname, '..', 'scripts', 'lib', 'implementation-followup-report.js'));
    const step = text.slice(text.indexOf('3. Bericht und Sicherung:'), text.indexOf('4. Status:'));
    for (const part of ['implementation-report.js" followup --workspace "<W>" <<\'ANTWORT\'', '`STATUSZEILE <Review-Statuszeile>`', '`BEHALTEN <x>`', '`keine` → ', 'followup.js" drop review <slug>',
      'followup.js" keep review <slug> <nummern>', '`unveraendert` → nichts, es bleibt die alte Sicherung']) {
      assert.ok(step.includes(part), `${part} fehlt`);
    }
    for (const word of ['BEHALTEN unveraendert', "kept.join(',') : 'keine'"]) assert.ok(script.includes(word), `${word} fehlt im Skript`);
  });

  test('reviewFollowupFlow_ImplementationWithoutReReview_ContinuesAtReportDataStepWithOhneValue', () => {
    // Arrange
    const text = readText(FLOW);
    const implementing = text.slice(text.indexOf('### Implementierung'), text.indexOf('## Nachprüfung'));
    const checking = text.slice(text.indexOf('### Implementierung', text.indexOf('## Nachprüfung')), text.indexOf('2. `dv-forge:implementation-re-reviewer`'));

    // Act
    const blocked = implementing.split('\n').find((line) => line.startsWith('3. Status `blocked`'));
    const unchanged = checking.split('\n').find((line) => line.startsWith('1. Paket'));

    // Assert
    assert.ok(blocked?.includes('weiter mit Schritt 3 von \u201ENachprüfung · Implementierung\u201C (`--ohne blockiert`)'));
    assert.ok(unchanged?.includes('weiter mit Schritt 3 dieses Abschnitts (`--ohne keine-aenderung`)'));
    assert.equal(text.includes('weiter mit dem Bericht'), false);
  });
  ```
  In `plugins/forge/tests/plan-review-skill.test.js` die Zeile, die mit `  assert.equal(fields['argument-hint'],` beginnt, ersetzen durch `  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>] [--debug]');` und die beiden Tests `planReviewSkill_Report_KeepsCommitQuestionForCleanPlan` und `planReviewSkill_Report_CommitOutcomesStayInSkill` (vom ersten `test(`-Aufruf bis zur schließenden `});` des zweiten) ersetzen durch:
  ```js
  test('planReviewSkill_Report_AsksNoCommitQuestion', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Du fragst nicht nach einem Commit.'));
    for (const gone of ['Soll ich Spec und Plan jetzt committen?', 'forge-config.js" get Commit-Konvention', 'git status --porcelain', 'COMMIT-PRUEFUNG']) {
      assert.equal(body.includes(gone), false, `${gone} entfällt`);
    }
  });
  ```
  In `plugins/forge/tests/skill.test.js` die Zeile, die mit `  assert.equal(fields['argument-hint'],` beginnt, ersetzen durch `  assert.equal(fields['argument-hint'], '<spec.md> [quelle.md] [--only <reviewer,...>] [--whiteboarding] [--debug]');` und im Test `skill_Report_DelegatedToScript` die Zeile, die mit `  assert.ok(body.includes('Titel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report`` beginnt, ersetzen durch:
  ```js
    assert.ok(body.includes('Titel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile (`flow.md`, Abschnitt Ende).'));
  ```
  In `plugins/forge/tests/implementation-review-skill.test.js` die Zeile, die mit `  assert.equal(fields['argument-hint'],` beginnt, ersetzen durch `  assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--context <pfad>]... [--base <ref>] [--only <reviewer,...>] [--debug]');`.
  In `plugins/forge/tests/review-loop.test.js` im Test `loop_Closing_ScoutWritesFileAndSaveRunsBeforeCleanup` die Zeile, die mit `  assert.ok(closing.indexOf('followup.js" save')` beginnt, ersetzen durch:
  ```js
    assert.ok(closing.indexOf('followup.js" save') < closing.indexOf('Die zwei Befehle aus Abschnitt Jedes Ende'));
  ```
  In `plugins/forge/tests/review-flow-doc.test.js` nach der Zeile, die mit `const PRIO = ` beginnt, die Zeile `const PRIO_CHAT = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.';` einfügen und die Tests `flow_End_ShowsReportFileBeforeCleanupAndKeepsPriority` und `loop_Closing_KeepsPriorityForTheReport` (vom ersten `test(`-Aufruf bis zur schließenden `});` des zweiten) ersetzen durch:
  ```js
  test('flow_End_ReportsThenSavesThenCleansUpAndEndsOnTheStatusLineWithPriority', () => {
    // Act
    const end = section(readText(FLOW), 'Ende');

    // Assert
    const order = ['review-flow.js" report', 'followup.js" save <rolle> <slug> "<W>/abschluss"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>', 'Im Chat steht als letzte Handlung genau die Review-Statuszeile'];
    const positions = order.map((part) => end.indexOf(part));
    assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.ok(end.includes(PRIO_CHAT));
  });

  test('loop_Closing_KeepsPriorityForTheStatusLine', () => {
    // Act
    const closing = section(readText(LOOP), 'Abschluss');

    // Assert
    assert.ok(closing.includes(PRIO_CHAT));
  });
  ```
  Die drei Orchestrator-Tests prüften je einen Satz aus `flow.md`, den es nicht mehr gibt; Task 8 schreibt die Orchestrator-Skills und ihre Tests neu. Bis dahin entfallen nur diese Zeilen:
  1. In `plugins/forge/tests/spec-review-orchestrator.test.js` im Test `specReviewOrchestrator_Body_TellsPauseFromEndByHeadingAndClosingLine` die Zeile `  const flow = readText(path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md'));` und die Zeile, die mit `  assert.ok(flow.includes(` beginnt, entfernen.
  2. In `plugins/forge/tests/plan-orchestrator.test.js` im Test `planOrchestrator_Body_BranchesOnTheLinesTheEmbeddedReviewPrints` die Zeile `  const flow = readText(FLOW);` und die Zeile, die mit `  assert.ok(flow.includes(` beginnt, entfernen; danach die nicht mehr benutzte Zeile `const FLOW = path.join(__dirname, '..', 'shared', 'review-flow', 'flow.md');` am Dateianfang entfernen.
  3. In `plugins/forge/tests/implementation-orchestrator.test.js` im Test `implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnAReadyResult` die Zeile `  const flow = readText(FOLLOWUP_FLOW);` und die Zeile, die mit `  assert.ok(flow.includes(` beginnt, entfernen; danach die nicht mehr benutzte Zeile `const FOLLOWUP_FLOW = path.join(SKILLS, 'review-followup', 'references', 'flow.md');` am Dateianfang entfernen.
  Die Datei `tests/lib/former-names.js` nennt die Namen der entfallenen Doppel-Betriebsart nur zerlegt; so findet der Prüftest aus Task 12 keinen Klartext im Plugin, und die Tests dieser Task suchen trotzdem nach ihnen.
  Die Tests `plugins/forge/tests/review-ablage-docs.test.js` und `plugins/forge/tests/followup-next.test.js` prüfen Texte und ein Skript, die es nach der Task nicht mehr gibt: beide Dateien werden in Schritt 3 gelöscht.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-ablage.test.js" "<R>/plugins/forge/tests/implementation-report.test.js" "<R>/plugins/forge/tests/implementation-followup-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/closing-report-docs.test.js" "<R>/plugins/forge/tests/implementation-report-docs.test.js" "<R>/plugins/forge/tests/review-followup-skill.test.js" "<R>/plugins/forge/tests/plan-review-skill.test.js" "<R>/plugins/forge/tests/skill.test.js" "<R>/plugins/forge/tests/implementation-review-skill.test.js" "<R>/plugins/forge/tests/review-loop.test.js" "<R>/plugins/forge/tests/review-flow-doc.test.js"` — erwartet: FAIL, unter anderem `Cannot find module '../scripts/lib/report-ablage'`, `implementationReport_RunWithProposal_StoresJsonDataAndPrintsOnlyEndeAndTheStatusLine`, `implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen`, `reviewSkills_Ablage_NamedWithoutParametersForSpecPlanAndImplementation`, `flow_End_ReportsThenSavesThenCleansUpAndEndsOnTheStatusLineWithPriority` und `planReviewSkill_Report_AsksNoCommitQuestion`
- [ ] **Schritt 3: Skripte und Texte umstellen**
  Neue Datei `plugins/forge/scripts/lib/report-ablage.js`:
  ```js
  'use strict';

  // Ablage-Ordner, den prepare.js für den Lauf im Arbeitsbereich festgelegt hat (kontext.json): Reviews und Followups
  // bekommen Etappe und Ablage nie aus einem Parameter.

  const path = require('node:path');
  const { FlowError } = require('./flow-error');
  const { readContext } = require('../workspace');

  function ablageOf(workspace) {
    const { ablage } = readContext(workspace);
    if (typeof ablage !== 'string' || ablage === '') throw new FlowError('Ablage fehlt im Arbeitsbereich: prepare.js legt sie in kontext.json fest');
    return path.resolve(ablage);
  }

  module.exports = { ablageOf };
  ```
  `plugins/forge/scripts/implementation-report.js` komplett durch diesen Inhalt ersetzen:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Abschlussbericht des Implementierungs-Reviews: Bericht (.md) und Bericht-Daten (.json) gehen in die Ablage der Etappe, die
  // prepare.js im Arbeitsbereich festgelegt hat; stdout `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`; schreibt <W>/abschluss/.
  // `followup`: Bericht eines Implementierungs-Followups; die Antwort des Re-Reviewers kommt über stdin. Dazu die Zeile `BEHALTEN <x>`.

  const fs = require('node:fs');
  const path = require('node:path');
  const { buildReport } = require('./lib/implementation-report');
  const { buildFollowupReport } = require('./lib/implementation-followup-report');
  const { FlowError } = require('./lib/flow-error');

  const MODES = {
    report: { required: ['--dir', '--workspace', '--plan', '--bereich', '--paket'], optional: [] },
    followup: { required: ['--workspace'], optional: ['--ohne', '--hinweis'] },
  };
  const USAGE = [
    'Aufruf: node implementation-report.js --dir <runden-ordner> --workspace <W> --plan <plan.md> --bereich <basis> --paket <datei>',
    '       node implementation-report.js followup --workspace <W> [--ohne blockiert|keine-aenderung] [--hinweis <zeile>]   (Antwort des Re-Reviewers über stdin)',
    '',
  ].join('\n');

  class UsageError extends Error {}

  // Gibt die Werte oder null zurück (falscher Aufruf, nur die Aufrufzeile); ein unbekannter Parameter wirft mit eigener Meldung.
  function parse(mode, args) {
    const { required, optional } = MODES[mode];
    const known = [...required, ...optional];
    const values = {};
    for (let index = 0; index < args.length; index += 2) {
      const name = args[index];
      if (String(name).startsWith('--') && !known.includes(name)) throw new UsageError(`unbekannter Parameter: ${name}`);
      if (!known.includes(name) || index + 1 >= args.length) return null;
      values[name.slice(2)] = args[index + 1];
    }
    return required.every((option) => values[option.slice(2)]) ? values : null;
  }

  function run(mode, values) {
    if (mode === 'followup') {
      return buildFollowupReport({
        workspace: path.resolve(values.workspace), note: values.hinweis, without: values.ohne, answer: values.ohne ? '' : fs.readFileSync(0, 'utf8'),
      });
    }
    return buildReport({
      dir: path.resolve(values.dir), workspace: path.resolve(values.workspace), plan: path.resolve(values.plan),
      planArg: values.plan, range: values.bereich, packageFile: path.resolve(values.paket),
    });
  }

  function main() {
    const args = process.argv.slice(2);
    const mode = args[0] === 'followup' ? 'followup' : 'report';
    let values;
    try {
      values = parse(mode, mode === 'followup' ? args.slice(1) : args);
    } catch (error) {
      if (!(error instanceof UsageError)) throw error;
      process.stderr.write(`${error.message}\n${USAGE}`);
      process.exit(2);
    }
    if (!values) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    try {
      process.stdout.write(`${run(mode, values)}\n`);
    } catch (error) {
      if (!(error instanceof FlowError)) throw error;
      process.stderr.write(`dv-forge implementation-report: ${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();
  ```
  In `plugins/forge/scripts/lib/implementation-report.js` diese Änderungen vornehmen:
  1. Die Zeile `const { FlowError, readText, readLines, readJson, writeText, writeJson } = require('./flow-files');` ersetzen durch `const { FlowError, readText, readLines, readJson } = require('./flow-files');` und nach der Zeile `const { appendMetric, implementationReviewRecord } = require('./metrics');` einfügen:
  ```js
  const { storeReviewReport } = require('./session-chain-ablage');
  const { reviewStatusLine } = require('./review-status');
  const { REPORT_FORMAT } = require('./report-format');
  const { ablageOf } = require('./report-ablage');
  ```
  2. Die Zeilen `const FORMAT = 1;` und `const RESULT_PREFIX = '**Ergebnis:** ';` entfernen.
  3. Die Funktion `writeClosing` (vom Aufruf bis zur schließenden `}`) ersetzen durch:
  ```js
  function writeClosing(options, open, scout) {
    const scouted = open.map((group) => scoutedOf(group, scout)).filter(Boolean).map(({ block }) => block);
    writeClosingFiles(options.workspace, open.map(aggregateBlock), scouted);
  }
  ```
  4. Die beiden Kommentarzeilen vor `function embeddedOutput` (sie beginnen mit `// Eingebetteter Lauf:` und `// stdout nennt nur`), die Zeile `// `FOLLOWUP ja`: …` darunter und die Funktion `embeddedOutput` (bis zur schließenden `}`) ersetzen durch:
  ```js
  // Bericht (.md) und Bericht-Daten (.json) gehen in die Ablage der Etappe aus dem Arbeitsbereich; rückgegeben wird die Review-Statuszeile.
  // `FOLLOWUP ja`: mindestens eine offene Gruppe hat einen gesicherten Vorschlag, den `review-followup <P> alle` erreicht.
  function storeReport(options, input, status, text) {
    const summary = summaryOf(input);
    const followup = input.open.some((entry) => entry.hasProposal);
    const stored = storeReviewReport({
      target: ablageOf(options.workspace), followup: false, text,
      data: {
        format: REPORT_FORMAT, review: REVIEW, title: 'Implementierungs-Review', followup: false, status, ...summary, offersFollowup: followup,
        plan: input.plan, topic: input.topic, openRed: input.openRed, failedLabels: input.failedLabels,
        changes: [], decisions: [], questions: [], open: input.open, green: input.green, notes: input.notes,
      },
    });
    return reviewStatusLine({ resultLine: summary.resultLine, followup, report: stored.md });
  }
  ```
  5. Die zwei Kommentarzeilen vor `function buildReport` (sie beginnen mit `// `options`: dir (Rundenordner)` und `// optional reportFile`) ersetzen durch:
  ```js
  // `options`: dir (Rundenordner), workspace (W), plan (lesbare Plan-Datei), planArg (Pfad für die Befehle), range (Basis), packageFile.
  // Ausgabe: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`.
  ```
  In `buildReport` die Zeile `  writeClosing(options, open, scout, text);` ersetzen durch `  writeClosing(options, open, scout);` und die beiden Zeilen `  if (options.reportFile) return embeddedOutput(options, input, status);` und `  return [`ENDE ${status}`, '=== BERICHT ===', text].join('\n');` ersetzen durch:
  ```js
    return [`ENDE ${status}`, `STATUSZEILE ${storeReport(options, input, status, text)}`].join('\n');
  ```
  In `plugins/forge/scripts/lib/implementation-followup-report.js` diese Änderungen vornehmen:
  1. Die Kommentarzeile, die mit `// Berichtsdaten eines Implementierungs-Followups im eingebetteten Lauf` beginnt, ersetzen durch `// Bericht und Bericht-Daten eines Implementierungs-Followups für die Ablage (Format 2, wie review-flow.js report sie ablegt).`
  2. Die Zeile `const { FlowError, readJson, readLines, writeJson, writeText } = require('./flow-files');` ersetzen durch:
  ```js
  const { FlowError, readJson, readLines } = require('./flow-files');
  const { storeReviewReport } = require('./session-chain-ablage');
  const { reviewStatusLine } = require('./review-status');
  const { REPORT_FORMAT } = require('./report-format');
  const { ablageOf } = require('./report-ablage');
  const { readContext } = require('../workspace');
  ```
  3. Die Zeilen `const FORMAT = 1;` und `const RESULT_PREFIX = '**Ergebnis:** ';` entfernen.
  4. Die beiden Kommentarzeilen vor `function reportText` ersetzen durch:
  ```js
  // Bericht (.md) in der Ablage: kein Scout, kein Zusatz-Status; `### Umgesetzt` listet die gewählten Punkte.
  // `### Letztes Review` ist die Antwort des Re-Reviewers unverändert.
  ```
  5. Die vier Kommentarzeilen vor `function buildFollowupReport` (sie beginnen mit `// `options`: workspace (W)`, `// entweder reportFile`, `// optional note` und `// `FOLLOWUP ja`:`) ersetzen durch:
  ```js
  // `options`: workspace (W), answer (Antwort des Re-Reviewers) oder without (`blockiert` | `keine-aenderung`); optional note (eine Zeile
  // für die Hinweise). Bericht und Bericht-Daten gehen als nächste Followup-Runde in die Ablage aus dem Arbeitsbereich.
  // Ausgabe: `ENDE <status>`, `STATUSZEILE <Review-Statuszeile>`, `BEHALTEN <x>`.
  // `FOLLOWUP ja`: die Sicherung behält Vorschläge (`BEHALTEN <nummern>`); `review-followup <P> alle` setzt nur diese um.
  ```
  6. In `buildFollowupReport` alles von der Zeile `  const embedded = Boolean(options.reportFile);` bis einschließlich der letzten `return [...]`-Zeile vor der schließenden `}` der Funktion ersetzen durch:
  ```js
    const note = options.note ? [options.note] : [];
    const textNotes = [...(reviewed.done ? [] : [`Kein Nach-Review: ${reviewed.status}.`]), ...note];
    const stored = storeReviewReport({
      target: ablageOf(options.workspace), followup: true,
      text: reportText({ artifact: readContext(options.workspace).artifact ?? '', status, reviewed, answer: options.answer, notes: textNotes, chosen }),
      data: {
        format: REPORT_FORMAT, review: REVIEW, title: TITLE, followup: true, status, kind, resultLine: line,
        flowLine: `Ablauf: ${count} umgesetzt, ${reviewed.done ? 'ein Nach-Review' : 'kein Nach-Review'}.`, offersFollowup,
        openRed, failedLabels: [], chosenCount: chosen.length, changes, decisions: [], questions: [], open, green: answer.greens.map(damageEntry), notes: [...notesOf(reviewed, answer), ...note],
      },
    });
    const statusLine = reviewStatusLine({ resultLine: line, followup: offersFollowup, report: stored.md });
    return [`ENDE ${status}`, `STATUSZEILE ${statusLine}`, keptLine(kept)].join('\n');
  ```
  In `plugins/forge/scripts/lib/flow-report.js` die Zeile `const { readContext } = require('../workspace');` ersetzen durch `const { ablageOf } = require('./report-ablage');` und in `storeReport` die drei Zeilen ab `  const { ablage } = readContext(options.workspace);` bis `  return storeReviewReport({ … });` ersetzen durch:
  ```js
    return storeReviewReport({ target: ablageOf(options.workspace), followup: options.source === FOLLOWUP, data, text });
  ```
  In `plugins/forge/scripts/followup.js` diese Änderungen vornehmen:
  1. Die Zeile `const { nextStepOf, NextStepError } = require('./lib/followup-next');` entfernen.
  2. Die zwei Zeilen `const USAGE = …` (sie endet auf `<nummern>\n'` und wird in der Folgezeile mit `  + '       node followup.js next` fortgesetzt) und die Zeile `const NEXT_OPTIONS = […];` ersetzen durch:
  ```js
  const USAGE = 'Aufruf: node followup.js save <spec-review|plan-review|review> <slug> <dir> | drop <spec-review|plan-review|review> <slug> | keep <spec-review|plan-review|review> <slug> <nummern>\n';
  ```
  3. Die Funktionen `parseNextOptions`, `nextStep` (samt Kommentarzeile `// Ketten-Eintrag der Implementierung zum Plan; …` davor) und `mainNext` entfernen (vom Aufruf `function parseNextOptions(args) {` bis vor `function main() {`).
  4. In `main` die Zeile `  if (action === 'next') return mainNext(args);` entfernen.
  Dateien löschen: `git rm plugins/forge/scripts/lib/followup-next.js plugins/forge/shared/review-loop/report-format.md plugins/forge/tests/followup-next.test.js plugins/forge/tests/review-ablage-docs.test.js`.
  In `plugins/forge/shared/review-flow/flow.md` diese Änderungen vornehmen:
  1. In der Zeile, die mit `- Endet ein Aufruf von `review-flow.js` mit Exit 1` beginnt, den Teil ab `und führst von` bis zum Zeilenende ersetzen durch `und sonst nichts; der Abschnitt Ende entfällt.`
  2. Den Abschnitt `## Ende` (von der Überschrift bis zum Dateiende) ersetzen durch:
  ```markdown
  ## Ende
  Jedes Ende, auch nach einem Ausfall:
  1. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "<Titel>" --artefakt "<Artefakt>"`. Die Ausgabe hat zwei Zeilen: `ENDE <status>` und `STATUSZEILE <Review-Statuszeile>`. Bericht und Bericht-Daten liegen danach in der Ablage der Etappe; `prepare.js` hat sie im Arbeitsbereich festgelegt, du übergibst dafür nichts.
  2. `node "<PLUGIN>/scripts/followup.js" save <rolle> <slug> "<W>/abschluss"`.
  3. Nur wenn `report` ohne Exit 1 lief: `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
  4. Im Chat steht als letzte Handlung genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert, nichts davor oder danach: kein Bericht, kein Hinweis, keine Frage. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.
  ```
  In `plugins/forge/shared/review-loop/loop.md` im Abschnitt `## Abschluss` die Zeile, die mit `2. **Bericht:**` beginnt, ersetzen durch:
  ```markdown
  2. **Bericht:** `node "<PLUGIN>/scripts/implementation-report.js" --dir "<D>" --workspace "<W>" --plan "<P>" --bereich "<B>" --paket "<K>"`. Die Ausgabe hat zwei Zeilen: `ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat; Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` im Arbeitsbereich festgelegt hat. Exit ungleich 0: die Meldung unverändert ausgeben und sonst nichts, `node "<PLUGIN>/scripts/followup.js" drop <rolle> <slug>` (die Sicherung eines früheren Laufs gilt nicht mehr), weiter mit Abschnitt Jedes Ende.
  ```
  und alles ab der Zeile, die mit `4. ` und `guard-orchestrator.js" show` beginnt, bis zum Dateiende (die Schritte 4 bis 6) ersetzen durch:
  ```markdown
  4. Die zwei Befehle aus Abschnitt Jedes Ende.
  5. Im Chat steht als letzte Handlung genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert, nichts davor oder danach: kein Bericht, kein Hinweis, keine Frage. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.
  ```
  In `plugins/forge/skills/spec-review/SKILL.md` die Zeile, die mit `argument-hint:` beginnt, ersetzen durch:
  ```markdown
  argument-hint: <spec.md> [quelle.md] [--only <reviewer,...>] [--whiteboarding] [--debug]
  ```
  den Abschnitt `## Eingebetteter Lauf` (bis vor `## Reviewer`) ersetzen durch:
  ```markdown
  ## Ablage
  Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts. `--whiteboarding` und `--debug` reicht `prepare.js` selbst durch.
  ```
  und die Zeile, die mit `Titel `Spec-Review`` beginnt, ersetzen durch:
  ```markdown
  Titel `Spec-Review`, Artefakt `<S>`; den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile (`flow.md`, Abschnitt Ende).
  ```
  In `plugins/forge/skills/plan-review/SKILL.md` die Zeile, die mit `argument-hint:` beginnt, ersetzen durch:
  ```markdown
  argument-hint: <plan.md> [spec.md] [--only <reviewer,...>] [--debug]
  ```
  die beiden Abschnitte `## Eingebetteter Lauf` und `## Ablage` (bis vor `## Reviewer`) durch den einen Abschnitt ersetzen:
  ```markdown
  ## Ablage
  Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts. `--debug` reicht `prepare.js` selbst durch.
  ```
  und den Abschnitt `## Bericht` (von der Überschrift bis zum Dateiende, samt Commit-Prüfung) ersetzen durch:
  ```markdown
  ## Bericht
  Titel `Plan-Review`, Artefakt `<P>`; den Rest liefert `report`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile. Eine Spec-Rückfrage hält den Lauf nicht an; sie steht im Bericht unter den offenen Fragen. Du fragst nicht nach einem Commit.
  ```
  In `plugins/forge/skills/implementation-review/SKILL.md` die Zeile, die mit `argument-hint:` beginnt, ersetzen durch:
  ```markdown
  argument-hint: <plan.md> [spec.md] [--context <pfad>]... [--base <ref>] [--only <reviewer,...>] [--debug]
  ```
  den Abschnitt `## Eingebetteter Lauf` (bis vor `## Reviewer`) ersetzen durch:
  ```markdown
  ## Ablage
  Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts. `--debug` reicht `prepare.js` selbst durch.
  ```
  und die Zeile, die mit `Titel `Implementierungs-Review`` beginnt, ersetzen durch:
  ```markdown
  Titel `Implementierungs-Review`, Artefakt `<P>`; den Rest liefert `implementation-report.js`: Bericht und Bericht-Daten in der Ablage, im Chat nur die Review-Statuszeile. `<P>`, `<B>` und `<K>` sind die Werte aus `prepare.js`. Status: `sauber nach Review 1`, `geprüft, k × 🔴 offen` oder `unvollständig nach Review 1, ausgefallen: <liste>`.
  ```
  `plugins/forge/skills/review-followup/SKILL.md` komplett durch diesen Inhalt ersetzen:
  ```markdown
  ---
  name: review-followup
  description: Use when chosen scout proposals from a finished dv-forge spec-review, plan-review or implementation-review should be applied by the rework agent or the implementer and then verified once, without a fresh search by the reviewers.
  argument-hint: <spec.md|plan.md> <alle|auswahl>
  ---

  # Review-Followup (Orchestrator)

  Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · `<SESSION>` = `${CLAUDE_SESSION_ID}`

  Du orchestrierst wie in `${CLAUDE_PLUGIN_ROOT}/shared/review-flow/flow.md`, Abschnitt Rolle: Du liest weder Artefakt, Spec noch Code, bewertest nichts und änderst nichts selbst; ein Hook blockt das. Plugin-Dateien liest du mit `Read`, jedes Skript startest du als einzelnen `node`-Aufruf ohne Verkettung. Die Einzelheiten jedes Schritts stehen in `${CLAUDE_PLUGIN_ROOT}/skills/review-followup/references/flow.md`; lies die Datei vor Schritt 1.

  Auswahl: `alle` wählt den bevorzugten Vorschlag jeder offenen Gruppe; als Expertenformen gibt es `b`, `<n>` und `<g>:<n|b>,…`. `<n>` und `<g>:<n|b>,…` zählen die Gruppen in der Reihenfolge der gesicherten Abschlussdaten; der Bericht zeigt diese Nummern nicht, darum ist `alle` der Normalfall. Optional `--spec <pfad>` und `--base <ref>` wie beim Original-Review. Bericht und Bericht-Daten liegen in der Ablage der Etappe, die `prepare.js` festlegt; du übergibst dafür nichts.

  ## Ablauf
  1. **Eingaben:** `node "${CLAUDE_PLUGIN_ROOT}/scripts/prepare.js" review-followup $ARGUMENTS`. Exit ungleich 0: die Meldung wörtlich ausgeben, Ende. Sonst Zeilen `<Name>=<Wert>` wie beim Original-Review, dazu `original` (die Art des Original-Reviews), `F`, `gruppen`, `offen` (nicht gewählte Gruppen), je Gruppe `WAHL` und bei `original=implementation-review` `FIX_BASE`. Bei Spec und Plan musst du die `WARN`-Zeilen nicht weitergeben (der Bericht enthält die Hinweise); bei `implementation-review` kommt jede `WARN`-Zeile in die Hinweise.
  2. **Original lesen:** `Read` auf `${CLAUDE_PLUGIN_ROOT}/skills/<original>/SKILL.md`. Von dort nimmst du die Eingabezeilen der Abschnitte Nacharbeiter, Nachprüfer und Scout und die Skript-Prüfungen. Bei `implementation-review` entfällt der Schritt: Implementer und Re-Reviewer bekommen ihre Eingaben aus `flow.md`, und es läuft kein Scout.
  3. **Umsetzen:** bei `spec-review` und `plan-review` der Nacharbeiter des Original-Skills im Folge-Modus, bei `implementation-review` `dv-forge:implementation-implementer`, wie in `flow.md`.
  4. **Nachprüfung, genau eine:** bei `spec-review` und `plan-review` der Nachprüfer des Original-Skills; kein Reviewer läuft. Bei `implementation-review` `dv-forge:implementation-re-reviewer` auf das Fix-Diff. Beides wie in `flow.md`.
  5. **Bericht** mit Titel `Review-Followup (<original>)`, Artefakt das erste Argument und Status laut `flow.md`. Du committest nichts; die Formatregeln stehen in `flow.md`, Abschnitt Ende.
  6. **Ende**, auch nach einem Fehler: `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`. Im Chat steht als letzte Handlung die Review-Statuszeile aus Schritt 5.

  Alle Agents laufen mit `run_in_background: false`.
  ```
  In `plugins/forge/skills/review-followup/references/flow.md` diese Änderungen vornehmen:
  1. Im Abschnitt `## Nachprüfung`, Unterabschnitt `### Spec und Plan`, die Zeile, die mit `5. `node "<PLUGIN>/scripts/review-flow.js" report` beginnt, ersetzen durch:
  ```markdown
  5. `node "<PLUGIN>/scripts/review-flow.js" report <FLAGS> --titel "Review-Followup (<original>)" --artefakt "<artefakt>"`. Die Ausgabe hat zwei Zeilen: `ENDE <status>` ist der Status, `STATUSZEILE <Review-Statuszeile>` die Zeile für den Chat. Bericht und Bericht-Daten liegen in der Ablage der Etappe; `prepare.js` hat sie im Arbeitsbereich festgelegt.
  ```
  2. Im Unterabschnitt `### Implementierung` des Abschnitts `## Nachprüfung` die Zeile, die mit `3. Bericht und Sicherung:` beginnt, ersetzen durch:
  ```markdown
  3. Bericht und Sicherung: `node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" <<'ANTWORT'`, darunter die Antwort des Re-Reviewers unverändert, dann eine Zeile `ANTWORT`. Die Ausgabe hat die Zeilen `ENDE <status>`, `STATUSZEILE <Review-Statuszeile>` und `BEHALTEN <x>`. Ohne Nach-Review statt der Antwort `--ohne blockiert` bzw. `--ohne keine-aenderung`, ohne Heredoc; bei `blockiert` dazu `--hinweis "<Rückgabe des Implementers in einer Zeile>"`. Die Zeile `BEHALTEN <x>` der Ausgabe entscheidet über die Sicherung: `keine` → `node "<PLUGIN>/scripts/followup.js" drop review <slug>`; Nummern → `node "<PLUGIN>/scripts/followup.js" keep review <slug> <nummern>`, die Sicherung behält dann nur nicht gewählte und nicht bestätigte Gruppen; `unveraendert` → nichts, es bleibt die alte Sicherung. Kein Scout.
  ```
  3. Die Abschnitte `## Bericht`, `## Eingebetteter Lauf` und `## Nächster Schritt` (von `## Bericht` bis zum Dateiende) ersetzen durch:
  ```markdown
  ## Ende
  Im Chat steht als letzte Handlung genau die Review-Statuszeile, der Text nach `STATUSZEILE ` unverändert, nichts davor oder danach: kein Bericht, kein Hinweis, keine Frage. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diese Zeile.
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-ablage.test.js" "<R>/plugins/forge/tests/implementation-report.test.js" "<R>/plugins/forge/tests/implementation-followup-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/closing-report-docs.test.js" "<R>/plugins/forge/tests/implementation-report-docs.test.js" "<R>/plugins/forge/tests/review-followup-skill.test.js" "<R>/plugins/forge/tests/plan-review-skill.test.js" "<R>/plugins/forge/tests/skill.test.js" "<R>/plugins/forge/tests/implementation-review-skill.test.js" "<R>/plugins/forge/tests/review-loop.test.js" "<R>/plugins/forge/tests/review-flow-doc.test.js" "<R>/plugins/forge/tests/spec-review-orchestrator.test.js" "<R>/plugins/forge/tests/plan-orchestrator.test.js" "<R>/plugins/forge/tests/implementation-orchestrator.test.js" "<R>/plugins/forge/tests/script-calls.test.js" "<R>/plugins/forge/tests/followup.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-ablage.js plugins/forge/scripts/implementation-report.js plugins/forge/scripts/lib/implementation-report.js plugins/forge/scripts/lib/implementation-followup-report.js plugins/forge/scripts/lib/flow-report.js plugins/forge/scripts/followup.js plugins/forge/shared/review-flow/flow.md plugins/forge/shared/review-loop/loop.md plugins/forge/skills/spec-review/SKILL.md plugins/forge/skills/plan-review/SKILL.md plugins/forge/skills/implementation-review/SKILL.md plugins/forge/skills/review-followup/SKILL.md plugins/forge/skills/review-followup/references/flow.md plugins/forge/tests/report-ablage.test.js plugins/forge/tests/lib/former-names.js plugins/forge/tests/implementation-report.test.js plugins/forge/tests/implementation-followup-report.test.js plugins/forge/tests/chain-reports.test.js plugins/forge/tests/closing-report-docs.test.js plugins/forge/tests/implementation-report-docs.test.js plugins/forge/tests/review-followup-skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/skill.test.js plugins/forge/tests/implementation-review-skill.test.js plugins/forge/tests/review-loop.test.js plugins/forge/tests/review-flow-doc.test.js plugins/forge/tests/spec-review-orchestrator.test.js plugins/forge/tests/plan-orchestrator.test.js plugins/forge/tests/implementation-orchestrator.test.js` · `git commit -m "feat(forge): implementation review and followup report only into the ablage"`

---
### Task 8: Orchestratoren lesen und schreiben in der Ablage und geben keinen nächsten Schritt aus

**ACs:** AC-01, AC-04, AC-11, AC-12, AC-13, AC-14

**Dateien:**
- Modify: `plugins/forge/scripts/orchestrator-state.js:131-191` · `function next(values)`
- Modify: `plugins/forge/scripts/orchestrator-report.js:14-100` · `const REQUIRED = {`
- Modify: `plugins/forge/scripts/lib/orchestrator-report-text.js:97-121` · `function renderOrchestratorReport`
- Modify: `plugins/forge/scripts/lib/orchestrator-report.js:87-116` · `function mergeReports`
- Modify: `plugins/forge/scripts/lib/report-text.js:83-213` · `function worktreeLine`
- Modify: `plugins/forge/scripts/lib/etappe-of.js` · `function etappeFor`
- Modify: `plugins/forge/scripts/lib/session-chain-ablage.js:39-45` · `function nextFollowupName`
- Modify: `plugins/forge/scripts/lib/session-chain-points.js:28-56` · `function readParts`
- Modify: `plugins/forge/scripts/lib/session-chain-review.js:17-35` · `function staleReason`
- Modify: `plugins/forge/scripts/session-chain.js:169-236` · `function store(values)`
- Modify: `plugins/forge/scripts/prepare.js:465-491` · `function prepare(skill, args)`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:453-538` · `const REPORT_HEADINGS`
- Modify: `plugins/forge/shared/session-chain/ablage.md:1-10` · `# Ablage der Orchestratoren`
- Modify: `plugins/forge/skills/spec-review-orchestrator/SKILL.md:12-47` · `## Regeln`
- Modify: `plugins/forge/skills/plan-orchestrator/SKILL.md:12-44` · `## Regeln`
- Modify: `plugins/forge/skills/implementation-orchestrator/SKILL.md:12-48` · `## Regeln`
- Test: `plugins/forge/tests/orchestrator-state.test.js:71-111` · `next_FollowupOfferedUnderCap_Followup`
- Test: `plugins/forge/tests/orchestrator-report.test.js:62-549` · `orchestratorReport_ReadyPlanWithoutFollowup_FourHeadingsAndImplementationOrchestratorStep`
- Test: `plugins/forge/tests/orchestrator-ablage.test.js:52-68` · `specAndPlanOrchestrator_Arguments_AblageIsNoWorkitem`
- Test: `plugins/forge/tests/spec-review-orchestrator.test.js:22-180` · `specReviewOrchestrator_Body_ChainsEmbeddedReviewThenOneFollowup`
- Test: `plugins/forge/tests/plan-orchestrator.test.js:23-177` · `planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithEmbeddedReports`
- Test: `plugins/forge/tests/implementation-orchestrator.test.js:35-189` · `implementationOrchestrator_Body_ChainsTheFourSkillsInOrder`
- Test: `plugins/forge/tests/guard-turn-report.test.js:61-136` · `onTurnEnd_AbortReportWithOneHeadingOfTheFour_Allows`
- Test: `plugins/forge/tests/guard-orchestrator.test.js:579-590` · `decidePreTool_DirectoryEntrySessionChainStoreNamingRepo_Allows`
- Test: `plugins/forge/tests/report-text.test.js:293-318` · `withoutProposalSentence_CountAndOthers_ChoosesSingularPluralAndRestWording`
- Test: `plugins/forge/tests/session-chain-cli.test.js:164-200` · `store_FromWorktreeWithFresh_StoresInTheSharedAblage`
- Test: `plugins/forge/tests/session-chain-scenario.test.js:459-474` · `succeeded(chain(env.repo, 'store'`
- Test: `plugins/forge/tests/session-chain-review.test.js:95-113` · `reviewStand_AbschlussOlderThanSpec_ThrowsAsNoReview`
- Test: `plugins/forge/tests/session-chain-steps.test.js:27-40` · `Spec-Review-Etappe mit Abschlussbericht und Bericht-Daten in der Ablage`
- Test: `plugins/forge/tests/prepare.test.js:392-400` · `reviewFollowup_PerGroupSelection_WritesOnlyChosenGroup`
- Test: `plugins/forge/tests/prepare-ablage.test.js` · `planReview_ChainStateWithRunningEtappe_RecordsThatEtappe`

**Interfaces:**
- Consumes: `maxFollowups`, `RulesError` aus plugins/forge/scripts/lib/orchestrator-rules.js und plugins/forge/shared/orchestrator-rules.md (Task 2); `etappeFor` aus plugins/forge/scripts/lib/etappe-of.js und `storeReviewReport`, `REVIEW_FILE`, `ABSCHLUSS_FILE`, `followupNumbers` aus plugins/forge/scripts/lib/session-chain-ablage.js (Task 5); `assertCurrentFormat` aus plugins/forge/scripts/lib/report-format.js (Task 5); `FORMER_REPORT_OPTION`, `FORMER_ABLAGE_OPTION` aus plugins/forge/tests/lib/former-names.js (Task 7)
- Produces: `ablageFor({ skill, artifact, whiteboarding }): string` in plugins/forge/scripts/lib/etappe-of.js (Ablage-Ordner, in den das Review `skill` seinen Bericht legt); `followupName(number): string` in plugins/forge/scripts/lib/session-chain-ablage.js; `node orchestrator-state.js ablage --art spec|plan|implementation (--spec <S> | --plan <P>) [--whiteboarding]` gibt `BERICHT-REVIEW=<datei>`, je Followup-Runde bis zum Maximum der Regeldatei `BERICHT-FOLLOWUP-<n>=<datei>` und `ABSCHLUSS=<datei>` aus (Exit 1 bei einem Artefakt außerhalb eines Git-Repos); `node orchestrator-report.js` kennt nur `--art`, `--review`, `--followup`, `--out`, `--fakten` und `--abbruch`, jeder andere Parameter endet mit `unbekannter Parameter: <name>` und Exit 2, der Bericht hat die drei Abschnitte `# Abschlussbericht`, `# Was sich … geändert hat` und `# Was ist noch offen`; prepare.js leert bei `spec-review`, `plan-review` und `implementation-review` die Ablage der Etappe, bevor das Review läuft (ein Followup lässt sie stehen); session-chain.js kennt den Befehl `store` und den Schalter `--neu` nicht mehr; report-text.js exportiert nur noch die Funktionen, die der Orchestrator-Bericht und der Implementierungs-Bericht brauchen; shared/session-chain/ablage.md entfällt

Die drei Orchestrator-Skills sind Etappen-Skills: Ihr Review und ihre Followups legen Bericht und Bericht-Daten selbst in die Ablage der Etappe (Task 6 und 7); der Orchestrator holt sich die Dateinamen von `orchestrator-state.js ablage` und liest und schreibt dort. Die Regeln (Git-Verbote, Commits, Ausgabe, Followup-Maximum, Rote Flaggen) stehen in `shared/orchestrator-rules.md` (Task 2); die Skills verweisen darauf. Der Abschlussbericht hat keinen Abschnitt `# Wie es weitergeht` mehr; was er an Fakten nannte (Commit der Spec, Branch, Prüfergebnis), steht als Faktenzeile in der Datei `<FK>`, die der Orchestrator schreibt. Die Pflichttext-Prüfung kennt die Überschrift des entfallenen Abschnitts nicht mehr; ob ein Bericht vollständig angezeigt wurde, entscheidet sie weiter an den Überschriften der Datei, die `show` vormerkt. Ein neues Review beginnt die Ablage seiner Etappe schon in `prepare.js` neu: Scheitert es, liest der Orchestrator keine Dateien eines früheren Laufs.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben und anpassen**
  `plugins/forge/tests/orchestrator-state.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { repoWithPlan, git, addWorktree } = require('./lib/git-repo');
  const { writeState } = require('../scripts/lib/session-chain-store');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');
  const { maxFollowups } = require('../scripts/lib/orchestrator-rules');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-state.js');

  function run(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  function tmp() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ostate-'));
  }

  function report(file, data) {
    fs.writeFileSync(file, JSON.stringify(data));
    return file;
  }

  test('start_RecordsLocationAndPreexistingFiles', () => {
    const { repo, spec } = repoWithPlan();
    fs.writeFileSync(path.join(repo, 'offen.txt'), 'x');
    const result = run(repo, 'start', '--state', tmp(), '--spec', spec);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^TOPLEVEL=.+\nBRANCH=main\nHEAD=[0-9a-f]+\nWORKTREE=nein\nSPEC-IM-CHECKOUT=ja\nVORBESTAND=1\nVORBESTAND-DATEI=offen.txt\n$/);
  });

  test('start_DetachedHeadOrMissingSpec_ExitOne', () => {
    const { repo, spec } = repoWithPlan();
    assert.equal(run(repo, 'start', '--state', tmp(), '--spec', path.join(repo, 'fehlt.md')).status, 1);
    git(repo, 'checkout', '--quiet', '--detach');
    const detached = run(repo, 'start', '--state', tmp(), '--spec', spec);
    assert.equal(detached.status, 1);
    assert.match(detached.stderr, /detached HEAD/);
  });

  test('check_ChangedSpec_ExitOneWithDiff', () => {
    const { repo, spec, plan } = repoWithPlan();
    const state = tmp();
    run(repo, 'start', '--state', state, '--spec', spec);
    run(repo, 'add', '--state', state, '--plan', plan);
    assert.equal(run(repo, 'check', '--state', state).stdout, 'HASH-SPEC=ok\nHASH-PLAN=ok\n');
    fs.appendFileSync(spec, 'neue Zeile\n');
    const changed = run(repo, 'check', '--state', state);
    assert.equal(changed.status, 1);
    assert.match(changed.stdout, /^HASH-SPEC=abweichung\nHASH-PLAN=ok\n=== DIFF ===\n[\s\S]*\+neue Zeile/);
  });

  test('check_Ort_OtherBranchIsDeviation', () => {
    const { repo, spec } = repoWithPlan();
    const state = tmp();
    run(repo, 'start', '--state', state, '--spec', spec);
    git(repo, 'switch', '--quiet', '-c', 'anders');
    const result = run(repo, 'check', '--state', state, '--ort');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /ORT=abweichung .+ anders/);
  });

  test('start_InWorktree_ReportsWorktree', () => {
    const { repo, spec } = repoWithPlan();
    const tree = addWorktree(repo, 'feature/x');
    assert.match(run(tree, 'start', '--state', tmp(), '--spec', spec).stdout, /WORKTREE=ja\nSPEC-IM-CHECKOUT=nein/);
  });

  test('next_FollowupOfferedUnderCap_Followup', () => {
    const dir = tmp();
    const review = report(path.join(dir, 'br.json'), { status: 'nicht bereit', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true });
    assert.equal(run(dir, 'next', '--review', review).stdout, 'NEXT=followup\nRUNDE=1\nERGEBNIS=⛔ Nicht bereit\nBEREIT=nein\nRUNDEN=0\n');
  });

  test('next_MaximumFollowupsDone_WeiterEvenIfOffered', () => {
    const dir = tmp();
    const offered = { status: 'x', resultLine: '**Ergebnis:** ⛔ Nicht bereit', offersFollowup: true };
    const files = Array.from({ length: maxFollowups() + 1 }, (_, index) => report(path.join(dir, `bericht-${index}.json`), offered));
    const result = run(dir, 'next', '--review', files[0], ...files.slice(1).flatMap((file) => ['--followup', file]));
    assert.match(result.stdout, /^NEXT=weiter\n/);
    assert.match(result.stdout, new RegExp(`RUNDEN=${maxFollowups()}`));
  });

  test('next_IncompleteOrMissingReport_Ende', () => {
    const dir = tmp();
    const incomplete = report(path.join(dir, 'br.json'), { status: 'unvollständig, ausgefallen: x', resultLine: '**Ergebnis:** ⚠️ Unvollständig', offersFollowup: true });
    assert.match(run(dir, 'next', '--review', incomplete).stdout, /^NEXT=ende\nGRUND=unvollstaendig/);
    assert.match(run(dir, 'next', '--review', path.join(dir, 'fehlt.json')).stdout, /^NEXT=ende\nGRUND=kein-bericht/);
  });

  test('next_Ready_WeiterBereitJa', () => {
    const dir = tmp();
    const ready = report(path.join(dir, 'br.json'), { status: 'sauber', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', offersFollowup: false });
    assert.equal(run(dir, 'next', '--review', ready).stdout, 'NEXT=weiter\nERGEBNIS=✅ Bereit zum Abschließen\nBEREIT=ja\nRUNDEN=0\n');
  });

  test('cli_BadCall_ExitTwo', () => {
    assert.equal(run(tmp(), 'start', '--state', 'x').status, 2);
    assert.equal(run(tmp(), 'bogus').status, 2);
    assert.equal(run(tmp(), 'ablage').status, 2);
  });

  test('start_ModifiedTrackedFileAsFirstStatusLine_KeepsItsFullPath', () => {
    const { repo, spec } = repoWithPlan();
    fs.appendFileSync(spec, 'Vorbestand\n');
    const result = run(repo, 'start', '--state', tmp(), '--spec', spec);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^VORBESTAND-DATEI=docs\/forge\/x\/spec\.md$/m);
  });

  // Erwartete Ausgabe von `ablage` für die Etappe `etappe` des Slugs `x`: Daten des Reviews, je eine Zeile je mögliche Followup-Runde
  // (Maximum aus der Regeldatei), Abschlussbericht. Die Pfade stehen ab dem Ordner `session-chain/`: Der Temp-Ordner, in dem der
  // Ordner der Kette liegt, kann kurz oder lang geschrieben sein.
  function ablageLines(etappe) {
    const folder = `x/ablage/${etappe}`;
    const rounds = Array.from({ length: maxFollowups() }, (_, index) => `BERICHT-FOLLOWUP-${index + 1}=${folder}/bericht-followup-${index + 1}.json`);
    return [`BERICHT-REVIEW=${folder}/bericht-review.json`, ...rounds, `ABSCHLUSS=${folder}/abschluss.md`, ''].join('\n');
  }

  function fromChains(text) {
    return text.replace(/^([A-Z0-9-]+)=.*?\/dv-forge\/session-chain\//gm, '$1=');
  }

  test('ablage_SpecWithoutChainState_NamesTheFilesOfTheSpecReviewEtappe', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act
    const result = run(repo, 'ablage', '--art', 'spec', '--spec', spec);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fromChains(result.stdout), ablageLines('spec-review'));
    assert.ok(result.stdout.startsWith(`BERICHT-REVIEW=${ablageDir(repo, 'x', 'spec-review').replace(/\\/g, '/')}/`), result.stdout);
  });

  test('ablage_SpecWithWhiteboardingSwitch_NamesTheFilesOfTheWhiteboardingEtappe', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act
    const result = run(repo, 'ablage', '--art', 'spec', '--spec', spec, '--whiteboarding');

    // Assert
    assert.equal(fromChains(result.stdout), ablageLines('whiteboarding'));
  });

  test('ablage_PlanWithRunningEtappeOfTheChain_NamesTheFilesOfThatEtappe', () => {
    // Arrange
    const { repo, plan } = repoWithPlan();
    writeState(repo, 'x', { slug: 'x', gestartet: { etappe: 'planning', zeit: '2026-10-26T10:00:00.000Z' } });

    // Act
    const result = run(repo, 'ablage', '--art', 'plan', '--plan', plan);

    // Assert
    assert.equal(fromChains(result.stdout), ablageLines('planning'));
  });

  test('ablage_ImplementationFromWorktree_NamesTheFilesInTheSharedAblage', () => {
    // Arrange
    const { repo } = repoWithPlan();
    const tree = addWorktree(repo, 'feature/x');

    // Act
    const result = run(tree, 'ablage', '--art', 'implementation', '--plan', path.join(tree, 'docs/forge/x/plan.md'));

    // Assert
    assert.equal(fromChains(result.stdout), ablageLines('umsetzung'));
  });

  test('ablage_ArtWithoutItsArtifactOrUnknownArt_ExitsWithOne', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act
    const noPlan = run(repo, 'ablage', '--art', 'plan', '--spec', spec);
    const unknown = run(repo, 'ablage', '--art', 'review', '--spec', spec);

    // Assert
    assert.equal(noPlan.status, 1);
    assert.match(noPlan.stderr, /--art plan braucht --plan/);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /--art erlaubt: spec, plan, implementation/);
  });

  test('ablage_ArtifactOutsideAGitRepo_ExitsWithOne', () => {
    // Arrange
    const dir = tmp();
    const spec = path.join(dir, 'spec.md');
    fs.writeFileSync(spec, '# Spec\n');

    // Act
    const result = run(dir, 'ablage', '--art', 'spec', '--spec', spec);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Kein Git-Repo/);
  });
  ```
  `plugins/forge/tests/orchestrator-report.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { anchorsOf } = require('../scripts/lib/must-show');
  const { finding, setup, withAblage, tempDir, writeJsonFile, flow, runUntilRework } = require('./lib/review-flow-fixture');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'orchestrator-report.js');
  const HEADINGS = ['# Abschlussbericht', '# Was sich im Plan geändert hat', '# Was ist noch offen'];
  const SPEC = '/repo/docs/forge/x/spec.md';
  const NO_NEXT_STEP = /Wie es weitergeht|\/dv-forge:|committen|frischen? Session|Worktree bleibt|Nicht gepusht/;

  function entry(color, key, overrides = {}) {
    return { key, color, title: `Titel ${key}`, description: `Beschreibung ${key}.`, recommendation: null, angles: 'Machbarkeit', hasProposal: true, ...overrides };
  }

  function change(key, ok, overrides = {}) {
    return { key, ok, title: `Änderung ${key}`, angles: 'Machbarkeit', description: `Beschreibung ${key}.`, change: `Geändert ${key}.`, evidence: null, choice: null, ...overrides };
  }

  // Berichtsdaten im Format 2, wie review-flow.js report sie in der Ablage ablegt; `open`, `changes` usw. überschreiben den sauberen Stand.
  function part(overrides = {}) {
    return {
      format: 2, review: 'plan-review', followup: false, status: 'sauber nach Runde 1', kind: 'ready', resultLine: '**Ergebnis:** ✅ Bereit zur Umsetzung',
      flowLine: 'Ablauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung, keine Nachprüfung.', offersFollowup: false,
      openRed: 0, failedLabels: [], changes: [], decisions: [], questions: [], open: [], notes: [], ...overrides,
    };
  }

  function writePart(dir, name, value) {
    const file = path.join(dir, name);
    writeJsonFile(file, value);
    return file;
  }

  function run(args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  }

  // Plan-Lauf mit Review-Daten und optional Followup-Daten; liefert den Berichtstext.
  function planReport(review, followup, extra = []) {
    const dir = tempDir('dv-forge-orch-');
    const args = ['--art', 'plan', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'abschluss.md'), ...extra];
    if (followup) args.push('--followup', writePart(dir, 'followup.json', followup));
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1].trimEnd();
    assert.equal(fs.readFileSync(path.join(dir, 'abschluss.md'), 'utf8').trimEnd(), text);
    return text;
  }

  function sectionOf(text, heading) {
    const start = text.indexOf(`${heading}\n`);
    assert.ok(start > -1, `${heading} fehlt`);
    const end = text.indexOf('\n# ', start + 1);
    return text.slice(start + heading.length + 1, end === -1 ? undefined : end);
  }

  test('orchestratorReport_ReadyPlanWithoutFollowup_ThreeHeadingsAndNoNextStep', () => {
    // Act
    const text = planReport(part());

    // Assert
    assert.deepEqual(text.split('\n').filter((line) => line.startsWith('# ')), HEADINGS);
    assert.match(sectionOf(text, '# Abschlussbericht'), /^\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung\nAblauf: Prüfung aus fünf Blickwinkeln/);
    assert.equal(sectionOf(text, '# Was sich im Plan geändert hat').trim(), 'Keine Änderung.');
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });

  test('orchestratorReport_BlockedPlan_ResultLineNamesTheHindranceAndNoStep', () => {
    // Arrange
    const review = part({ status: 'nicht bereit, 1 × 🔴 offen', kind: 'blocked', openRed: 1, open: [entry('red', 'task 2')] });

    // Act
    const text = planReport(review);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });

  test('orchestratorReport_OpenRedAndYellow_ListsHindranceBeforeHintAndBlocks', () => {
    // Arrange
    const review = part({ kind: 'blocked', openRed: 1, open: [entry('yellow', 'task 1'), entry('red', 'task 3', { recommendation: 'Fehlerfall testen, weil er sonst unbemerkt bleibt.' })] });

    // Act
    const open = sectionOf(planReport(review), '# Was ist noch offen');

    // Assert
    assert.match(open, /^- 🔴 \*\*Titel task 3\*\* · aus: Machbarkeit\n {2}Beschreibung task 3\.\n {2}Vorschlag \(empfohlen\): Fehlerfall testen/);
    assert.ok(open.indexOf('🔴') < open.indexOf('🟡'));
  });

  test('orchestratorReport_OnlyHintsOpen_ReadyWithHintsAndNoStep', () => {
    // Arrange
    const review = part({ kind: 'hints', open: [entry('yellow', 'task 1'), entry('yellow', 'kopf', { hasProposal: false })] });

    // Act
    const text = planReport(review);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 2 kleine Hinweise offen/);
    assert.doesNotMatch(text, NO_NEXT_STEP);
    assert.doesNotMatch(text, /Lösungsvorschlag\./);
  });

  test('orchestratorReport_SamePlaceInRoundOneAndFollowup_ShowsOneEntryWithFollowupEndState', () => {
    // Arrange
    const review = part({
      status: 'nicht bereit, 1 × 🔴 offen', kind: 'blocked', openRed: 1,
      changes: [change('task 2', false), change('task 4', true)], open: [entry('red', 'task 2')],
    });
    const followup = part({ followup: true, status: 'sauber nach Nachprüfung', flowLine: 'Ablauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung.', changes: [change('task 2', true, { choice: 1, change: 'Fehlerpfad ergänzt.' })] });

    // Act
    const text = planReport(review, followup);

    // Assert
    const changed = sectionOf(text, '# Was sich im Plan geändert hat');
    assert.equal(changed.match(/Änderung task 2/g).length, 1);
    assert.match(changed, /^- ✅ \*\*Änderung task 2\*\*[\s\S]*Änderung: Fehlerpfad ergänzt\.\n {2}Gewählt: Vorschlag 1\n {2}Nachprüfung: bestätigt\./);
    assert.ok(changed.indexOf('task 2') < changed.indexOf('task 4'), 'der Followup ersetzt den Eintrag an seinem Platz');
    assert.doesNotMatch(changed, /⚠️/);
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung\nAblauf: Prüfung aus fünf Blickwinkeln, keine Überarbeitung, keine Nachprüfung\.\nFollowup: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
  });

  test('orchestratorReport_ReviewHindranceWithoutProposal_StaysOpenAfterFollowup', () => {
    // Arrange
    const review = part({ kind: 'blocked', openRed: 2, open: [entry('red', 'task 2'), entry('red', 'kopf', { hasProposal: false })] });
    const followup = part({ followup: true, changes: [change('task 2', true)] });

    // Act
    const text = planReport(review, followup);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.match(sectionOf(text, '# Was ist noch offen'), /^- 🔴 \*\*Titel kopf\*\*/);
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });

  test('orchestratorReport_QuestionsAndDecisions_GoToOpenAndChangedSections', () => {
    // Arrange
    const review = part({ status: 'Fragen offen', kind: 'questions', questions: ['Soll der Export CSV liefern?'], decisions: [{ title: 'Rundung', decision: 'kaufmännisch' }] });

    // Act
    const text = planReport(review);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
    assert.match(sectionOf(text, '# Was ist noch offen'), /^- ❓ Soll der Export CSV liefern\?/);
    assert.match(sectionOf(text, '# Was sich im Plan geändert hat'), /\*\*Deine Entscheidungen:\*\*\n- \*\*Rundung:\*\* kaufmännisch/);
  });

  test('orchestratorReport_NotesAndFacts_StandInClosingSectionWithoutPaths', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const facts = path.join(dir, 'fakten.md');
    fs.writeFileSync(facts, 'Abweichungen: Commit-Wunsch abgelehnt.\n');
    const review = part({ notes: ['Der Scout hat beim ersten Mal kein gültiges Ergebnis geliefert und wurde erneut angefragt.'] });

    // Act
    const closing = sectionOf(planReport(review, null, ['--fakten', facts]), '# Abschlussbericht');

    // Assert
    assert.match(closing, /\*\*Hinweise zum Ablauf:\*\*\n- Der Scout hat beim ersten Mal/);
    assert.match(closing, /Abweichungen: Commit-Wunsch abgelehnt\.\n$/);
    assert.doesNotMatch(closing, /\/repo\//);
  });

  test('orchestratorReport_ReviewFileMissing_IncompleteWithoutStep', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');

    // Act
    const result = run(['--art', 'spec', '--review', path.join(dir, 'fehlt.json'), '--out', path.join(dir, 'a.md')]);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Review ohne Bericht/);
    assert.doesNotMatch(result.stdout, NO_NEXT_STEP);
  });

  test('orchestratorReport_ReadySpecWithCommitFact_NamesTheCommitAndNoPlanStep', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ review: 'spec-review', resultLine: '**Ergebnis:** ✅ Bereit zum Planen' }));
    const facts = path.join(dir, 'fakten.md');
    fs.writeFileSync(facts, 'Commit: a1b2c3d\n');

    // Act
    const result = run(['--art', 'spec', '--review', review, '--out', path.join(dir, 'a.md'), '--fakten', facts]);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1];
    assert.deepEqual(anchorsOf(text), ['# Abschlussbericht', '# Was sich in der Spec geändert hat', '# Was ist noch offen']);
    assert.match(sectionOf(text, '# Abschlussbericht'), /\nCommit: a1b2c3d\n/);
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });

  function implementationArgs(dir, review, extra = []) {
    return ['--art', 'implementation', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'a.md'), ...extra];
  }

  test('orchestratorReport_ReadyImplementation_FactsInClosingSectionAndNoWorktreeFinishOrPushLine', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const facts = path.join(dir, 'fakten.md');
    fs.writeFileSync(facts, 'Feature-Branch: feature/x\nModus: Worktree\n');
    const review = part({ review: 'implementation-review', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', checked: ['- Bereich: `a1b2c3d..HEAD`'], found: ['- Akzeptanz: 0 Hindernisse, 0 Hinweise'] });

    // Act
    const result = run(implementationArgs(dir, review, ['--fakten', facts]));

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1];
    assert.match(text, /^# Abschlussbericht\n\*\*Ergebnis:\*\* ✅ Bereit zum Abschließen\n[\s\S]*\*\*Geprüft:\*\*\n- Bereich: `a1b2c3d\.\.HEAD`\n\*\*Gefunden:\*\*\n- Akzeptanz[\s\S]*Feature-Branch: feature\/x\nModus: Worktree\n/);
    assert.match(text, /# Was sich im Code geändert hat\nKeine Änderung\./);
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });

  test('orchestratorReport_BlockedImplementationWithoutProposal_ListsTheHindranceAndNoStep', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = part({ review: 'implementation-review', kind: 'blocked', openRed: 1, open: [entry('red', 'src/a.js:3', { hasProposal: false })] });

    // Act
    const result = run(implementationArgs(dir, review));

    // Assert
    assert.match(result.stdout, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.match(result.stdout, /# Was ist noch offen\n- 🔴 \*\*Titel src\/a\.js:3\*\*/);
    assert.doesNotMatch(result.stdout, NO_NEXT_STEP);
  });

  test('orchestratorReport_Report_AnchorsAreTheThreeHeadingsForTheStopHook', () => {
    // Act
    const text = planReport(part());

    // Assert
    assert.deepEqual(anchorsOf(text), HEADINGS);
  });

  test('orchestratorReport_MissingRequiredOption_ExitsWithTwoAndUsage', () => {
    // Act
    const result = run(['--art', 'plan', '--review', 'x.json']);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /fehlt: --out/);
  });

  // Parameter, die der Bericht nicht mehr kennt: Er nennt weder Pfade noch Befehle, und die Ablage liest er nicht von selbst.
  for (const option of ['--plan', '--spec', '--stand', '--commit', '--worktree', '--branch', '--pruefung', '--wi', '--ohne-weiter', FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION]) {
    test(`orchestratorReport_FormerOption${option.replace(/\W/g, '_')}_ExitsWithTwoAndSaysUnknownParameter`, () => {
      // Arrange
      const dir = tempDir('dv-forge-orch-');
      const review = writePart(dir, 'review.json', part());

      // Act
      const result = run(['--art', 'plan', '--review', review, '--out', path.join(dir, 'a.md'), option, 'x']);

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${option}\n`));
      assert.equal(fs.existsSync(path.join(dir, 'a.md')), false);
    });
  }

  // Ende zu Ende über review-flow.js: Runde 1 ändert AC-04, die Nachprüfung sagt `nicht erledigt`; der Followup erledigt es.
  const SCOUT_AC04 = [
    '## Scout-Vorschläge', '',
    '### 🔴 AC-04', 'Titel: Grenzwert festlegen', 'Beschreibung: Der Grenzwert ist nicht bestimmt.', 'Empfehlung: Den Wert festlegen, weil Tests ihn brauchen.', '1. D festlegen.', '**Bevorzugt: 1** — klar.', '',
  ].join('\n');
  const SAVED_AC04 = '=== REWORK ===\n### 🔴 AC-04 (consistency)\n- [consistency · widerspruch] Zitat: \u201Ex\u201C · Konsequenz: Folge · Begründung: Grund\n';
  const VERDICT = (verdict) => ({ verdicts: [{ location: 'AC-04', verdict, rationale: verdict }], findings: [] });

  function storedReview(ablage) {
    const env = withAblage(setup(), 'spec-review', ablage);
    runUntilRework(env, [finding({ location: 'AC-04', quote: 'AC-04', category: 'widerspruch' })]);
    writeJsonFile(path.join(env.workspace, 'runde-1', 'scout.md'), SCOUT_AC04);
    writeJsonFile(path.join(env.workspace, 'runde-1', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Erster Versuch.' }], questions: [] });
    flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
    writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('nicht erledigt'));
    flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc);
    return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', SPEC);
  }

  function storedFollowup(ablage) {
    const env = withAblage(setup(), 'spec-review', ablage);
    const source = ['--quelle', 'nacharbeit'];
    flow('snapshot', '--dir', env.workspace, '--doc', env.doc);
    writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'aggregate.md'), SAVED_AC04);
    writeJsonFile(path.join(env.workspace, 'sicherung-vorher', 'scout.md'), SCOUT_AC04);
    writeJsonFile(path.join(env.workspace, 'followup.json'), { gewaehlt: [{ nummer: 1, stufe: '🔴', stelle: 'AC-04', vorschlag: 1 }], offen: [] });
    writeJsonFile(path.join(env.workspace, 'nacharbeit', 'aggregate.md'), SAVED_AC04);
    writeJsonFile(path.join(env.workspace, 'nacharbeit', 'rework.json'), { results: [{ location: 'AC-04', status: 'changed', change: 'Grenzwert festgelegt.' }] });
    flow('rework-check', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    flow('checklist', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    writeJsonFile(path.join(env.workspace, 'runde-2', 'nachpruefung.json'), VERDICT('erledigt'));
    flow('verify', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, ...source);
    return flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review-Followup (spec-review)', '--artefakt', SPEC, ...source);
  }

  test('orchestratorReport_EndToEndRoundOneNotDoneThenFollowupDone_OneConfirmedEntryAndNothingOpen', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const ablage = path.join(dir, 'ablage');
    const reviewFile = path.join(ablage, 'bericht-review.json');
    const followupFile = path.join(ablage, 'bericht-followup-1.json');
    const review = storedReview(ablage);
    const followup = storedFollowup(ablage);

    // Act
    const result = run(['--art', 'spec', '--review', reviewFile, '--followup', followupFile, '--out', path.join(ablage, 'abschluss.md')]);

    // Assert
    assert.match(review.stdout, /^ENDE nicht bereit, 1 × 🔴 offen\nSTATUSZEILE Review abgeschlossen: ⛔ Noch nicht bereit · 1 Hindernis offen · FOLLOWUP ja · Bericht: .+\/bericht-review\.md\n$/);
    assert.match(followup.stdout, /^ENDE sauber nach Nachprüfung\nSTATUSZEILE Review abgeschlossen: ✅ Bereit zum Planen · FOLLOWUP nein · Bericht: .+\/bericht-followup-1\.md\n$/);
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1];
    const changed = sectionOf(text, '# Was sich in der Spec geändert hat');
    assert.equal(changed.match(/Grenzwert festlegen/g).length, 1);
    assert.match(changed, /^- ✅ \*\*Grenzwert festlegen\*\*[\s\S]*Änderung: Grenzwert festgelegt\.\n {2}Gewählt: Vorschlag 1\n {2}Nachprüfung: bestätigt\./);
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
    assert.match(text, /^# Abschlussbericht\n\*\*Ergebnis:\*\* ✅ Bereit zum Planen\n/);
    assert.ok(fs.existsSync(path.join(ablage, 'abschluss.md')), 'der Abschlussbericht liegt in der Ablage');
  });

  // Plan-Lauf mit Review-Daten und Followup-Runden.
  function planReportRounds(review, followups, extra = []) {
    const dir = tempDir('dv-forge-orch-');
    const args = ['--art', 'plan', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'abschluss.md'), ...extra];
    followups.forEach((followup, index) => args.push('--followup', writePart(dir, `followup-${index + 1}.json`, followup)));
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.split('=== BERICHT ===\n')[1].trimEnd();
  }

  test('orchestratorReport_TwoFollowupRounds_FlowLinesNumberedAndRoundTwoReplacesEntryOfSamePlace', () => {
    // Arrange
    const review = part({ status: 'nicht bereit, 2 × 🔴 offen', kind: 'blocked', openRed: 2, changes: [change('task 1', false)], open: [entry('red', 'task 2'), entry('red', 'task 3')] });
    const roundOne = part({ followup: true, flowLine: 'Ablauf: 2 gewählte Vorschläge umgesetzt, eine Nachprüfung.', kind: 'blocked', openRed: 1, changes: [change('task 2', true), change('task 3', false)], open: [entry('red', 'task 3')] });
    const roundTwo = part({ followup: true, flowLine: 'Ablauf: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung.', changes: [change('task 3', true, { change: 'Fehlerpfad ergänzt.' })] });

    // Act
    const text = planReportRounds(review, [roundOne, roundTwo]);

    // Assert
    assert.match(sectionOf(text, '# Abschlussbericht'), /\nFollowup 1: 2 gewählte Vorschläge umgesetzt, eine Nachprüfung\.\nFollowup 2: 1 gewählter Vorschlag umgesetzt, eine Nachprüfung\./);
    const changed = sectionOf(text, '# Was sich im Plan geändert hat');
    assert.equal(changed.match(/Änderung task 3/g).length, 1);
    assert.match(changed, /Änderung task 3\*\*[\s\S]*Änderung: Fehlerpfad ergänzt\.\n {2}Nachprüfung: bestätigt\./);
    assert.ok(changed.indexOf('task 1') < changed.indexOf('task 2') && changed.indexOf('task 2') < changed.indexOf('task 3'));
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), 'Nichts weiter offen.');
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung/);
  });

  test('orchestratorReport_TwoRounds_OpenWithoutProposalFromReviewAndRoundOneStaysOpen', () => {
    // Arrange
    const review = part({ kind: 'blocked', openRed: 2, open: [entry('red', 'task 2'), entry('red', 'kopf', { hasProposal: false })] });
    const roundOne = part({ followup: true, kind: 'hints', open: [entry('yellow', 'neu', { hasProposal: false }), entry('yellow', 'task 5')] });
    const roundTwo = part({ followup: true, kind: 'hints', open: [entry('yellow', 'task 5')] });

    // Act
    const text = planReportRounds(review, [roundOne, roundTwo]);

    // Assert
    const open = sectionOf(text, '# Was ist noch offen');
    assert.deepEqual(open.match(/\*\*Titel [^*]+\*\*/g), ['**Titel kopf**', '**Titel neu**', '**Titel task 5**']);
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
  });

  test('orchestratorReport_SecondFollowupFileMissing_NoteAndStateOfRoundOne', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ kind: 'blocked', openRed: 1, open: [entry('red', 'task 2')] }));
    const roundOne = writePart(dir, 'f1.json', part({ followup: true, kind: 'hints', open: [entry('yellow', 'task 5')] }));

    // Act
    const result = run(['--art', 'plan', '--review', review, '--followup', roundOne, '--followup', path.join(dir, 'fehlt.json'), '--out', path.join(dir, 'a.md')]);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\*\*Hinweise zum Ablauf:\*\*\n- Der Followup hat keinen Bericht geliefert; es gilt der Stand vor dieser Runde\./);
    assert.match(result.stdout, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen/);
  });

  test('orchestratorReport_MoreFollowupOptionsThanTheMaximum_ExitsWithTwoAndNamesLimit', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const file = writePart(dir, 'r.json', part());
    const { maxFollowups } = require('../scripts/lib/orchestrator-rules');
    const followups = Array.from({ length: maxFollowups() + 1 }, () => ['--followup', file]).flat();

    // Act
    const result = run(['--art', 'plan', '--review', file, ...followups, '--out', path.join(dir, 'a.md')]);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, new RegExp(`--followup höchstens ${maxFollowups()} Mal`));
  });

  test('orchestratorReport_ReviewDataInTheFormerFormat_ExitsWithOneAndNamesTheOldFormat', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ format: 1 }));

    // Act
    const result = run(['--art', 'plan', '--review', review, '--out', path.join(dir, 'a.md')]);

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge orchestrator-report: Ablage im alten Format: .+review\.json/);
  });

  function green(key, overrides = {}) {
    return { key, color: 'green', title: key, description: `Folge ${key}.`, recommendation: null, angles: 'Klarheit', hasProposal: false, ...overrides };
  }

  test('orchestratorReport_GreenFindings_ListedAfterRedYellowAndQuestionsWithoutChangingTheResult', () => {
    // Arrange
    const base = { kind: 'blocked', openRed: 1, open: [entry('yellow', 'task 1'), entry('red', 'task 3')], questions: ['Soll der Export CSV liefern?'] };
    const withGreen = part({ ...base, green: [green('abschnitt a', { angles: 'Machbarkeit' }), green('abschnitt b')] });

    // Act
    const text = planReport(withGreen);
    const without = planReport(part(base));

    // Assert
    const open = sectionOf(text, '# Was ist noch offen').trimEnd();
    assert.ok(open.indexOf('🔴') < open.indexOf('🟡') && open.indexOf('🟡') < open.indexOf('❓') && open.indexOf('❓') < open.indexOf('🟢'));
    assert.match(open, /- 🟢 \*\*abschnitt a\*\* · aus: Machbarkeit\n {2}Folge abschnitt a\.\n- 🟢 \*\*abschnitt b\*\* · aus: Klarheit\n {2}Folge abschnitt b\.$/);
    assert.equal(sectionOf(text, '# Abschlussbericht'), sectionOf(without, '# Abschlussbericht'));
  });

  test('orchestratorReport_OnlyGreenFindings_ListedInsteadOfNothingOpenAndResultStaysReady', () => {
    // Act
    const text = planReport(part({ green: [green('abschnitt a')] }));

    // Assert
    assert.equal(sectionOf(text, '# Was ist noch offen').trim(), '- 🟢 **abschnitt a** · aus: Klarheit\n  Folge abschnitt a.');
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung\n/);
  });

  test('orchestratorReport_PlaceGreenInReviewAndYellowInFollowup_ListedOnlyAsYellow', () => {
    // Arrange
    const review = part({ green: [green('task 4'), green('task 9')] });
    const followup = part({ followup: true, kind: 'hints', open: [entry('yellow', 'task 4')] });

    // Act
    const open = sectionOf(planReportRounds(review, [followup]), '# Was ist noch offen');

    // Assert
    assert.equal(open.match(/\*\*Titel task 4\*\*/g).length, 1);
    assert.equal(open.includes('**task 4**'), false);
    assert.equal(open.match(/🟢/g).length, 1);
  });

  test('orchestratorReport_SameGreenInReviewAndBothRounds_ListedOnce', () => {
    // Arrange
    const review = part({ green: [green('task 4')] });
    const roundOne = part({ followup: true, green: [green('task 4'), green('task 6')] });
    const roundTwo = part({ followup: true, green: [green('task 6')] });

    // Act
    const open = sectionOf(planReportRounds(review, [roundOne, roundTwo]), '# Was ist noch offen');

    // Assert
    assert.deepEqual(open.match(/\*\*task \d\*\*/g), ['**task 4**', '**task 6**']);
  });

  test('orchestratorReport_ImplementationWithGreenFindings_GreenInOpenSectionAndNothingAfterIt', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = part({ review: 'implementation-review', kind: 'ready', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', green: [green('src/ok.js', { angles: 'Tests' })] });

    // Act
    const result = run(implementationArgs(dir, review));

    // Assert
    assert.match(result.stdout, /# Was ist noch offen\n- 🟢 \*\*src\/ok\.js\*\* · aus: Tests\n {2}Folge src\/ok\.js\.\n$/);
  });

  test('orchestratorReport_AbortBeforeReview_ThreeSectionsWithoutReviewDataAndNoStep', () => {
    // Arrange
    const out = path.join(tempDir('dv-forge-abort-'), 'abschluss.md');

    // Act
    const result = run(['--art', 'implementation', '--abbruch', 'Plan fehlt: docs/x/plan.md', '--out', out]);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const text = fs.readFileSync(out, 'utf8');
    assert.deepEqual(anchorsOf(text), ['# Abschlussbericht', '# Was sich im Code geändert hat', '# Was ist noch offen']);
    assert.ok(text.includes('**Ergebnis:** ⚠️ Abgebrochen vor dem Review: Plan fehlt: docs/x/plan.md'));
    assert.doesNotMatch(text, NO_NEXT_STEP);
  });
  ```
  `plugins/forge/tests/spec-review-orchestrator.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText, wordCount } = require('./lib/markdown');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

  const SKILL = path.join(__dirname, '..', 'skills', 'spec-review-orchestrator', 'SKILL.md');
  const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

  test('specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecWorkitemWhiteboardingAndDebug', () => {
    // Act
    const { fields } = readMarkdown(SKILL);

    // Assert
    assert.equal(fields.name, 'spec-review-orchestrator');
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], undefined);
    assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--whiteboarding] [--debug]');
  });

  test('specReviewOrchestrator_Body_ChainsReviewThenFollowupWithoutReportParameters', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const steps = ['`dv-forge:spec-review` mit `<S>`, mit `--whiteboarding` dazu `--whiteboarding`, sonst kein Argument.', '`dv-forge:review-followup` mit `<S> alle`, mit `--whiteboarding` dazu `--whiteboarding`.'];
    const positions = steps.map((step) => body.indexOf(step));
    for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
    assert.ok(positions[0] < positions[1]);
    for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
  });

  test('specReviewOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommand', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art spec --spec "<S>"`, mit `--whiteboarding` dazu `--whiteboarding`. Exit 1 → stopp.'));
    assert.ok(body.includes('`<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
    assert.ok(body.indexOf('ablage --art spec') < body.indexOf('`dv-forge:spec-review` mit'), 'die Dateien stehen vor dem Review fest');
  });

  test('specReviewOrchestrator_Body_BranchesOnTheLinesTheReviewWrites', () => {
    // Arrange
    const script = readText(REPORT_TEXT);

    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    for (const marker of ['⛔', '❓']) {
      assert.ok(body.includes(marker), `${marker} fehlt im Skill`);
      assert.ok(script.includes(marker), `${marker} fehlt in report-text.js`);
    }
    assert.ok(script.includes('⚠️ Unvollständig'));
    assert.ok(readText(path.join(__dirname, '..', 'scripts', 'orchestrator-state.js')).includes("result.startsWith('⚠️')"), 'next endet bei ⚠️');
    assert.ok(body.includes('`NEXT=followup`, auch für Hinweise, `⛔` und `❓` → 5, sonst 6.'));
  });

  test('specReviewOrchestrator_Body_TellsPauseFromEndByHeadingAndClosingLine', () => {
    // Arrange
    const haltText = readText(path.join(__dirname, '..', 'scripts', 'lib', 'halt-text.js'));

    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`### Frage …` = Pause (Regel 2). Danach `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`'));
    assert.ok(haltText.includes('### Frage ${number} von ${total}'));
  });

  test('specReviewOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
    assert.ok(body.includes('Stopp bei Exit 1, `SPEC-IM-CHECKOUT=nein` oder `WORKTREE=ja`.'));
    for (const gone of ['EnterWorktree', '## Rote Flaggen', 'Wünsche des Menschen', 'Dritte Followup-Runde']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei`);
  });

  test('specReviewOrchestrator_Body_CommitsOnlyTheSpecWithoutNumberWhenWorkitemMissing', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`node "<PLUGIN>/scripts/spec-commit.js" preflight --spec "<S>" --state "<ST>"`; Exit 1 (anderer Ort) → stopp'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/spec-commit.js" commit --spec "<S>" --slug "<slug>"`, dazu `--wi <WI>` nur wenn gegeben.'));
    assert.ok(body.includes('Exit 1 → Meldung, Spec bleibt gestaged (nennen), 7.'));
    assert.ok(body.includes('`COMMIT=frei`: das Projekt setzt eine Konvention (`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`)'));
    assert.ok(body.includes('`git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`'));
    assert.ok(body.includes('Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach'));
    assert.ok(body.includes('Commit, auch bei `⛔` oder `❓`.'));
    assert.ok(body.includes('eine Zeile, ein `-m`, kein Body'));
    for (const gone of ['git check-ignore', 'docs: review spec <slug>', 'git status --porcelain -- "<S>"']) assert.equal(body.includes(gone), false, `${gone} steht jetzt im Skript`);
  });

  test('specReviewOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Spec-Review <WI> <slug>`, ohne `<WI>` `Spec-Review <slug>`'));
  });

  test('specReviewOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('spec-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 7 aus, genau einmal.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
    assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
    for (const gone of ['dein Block statt seines', 'unverändert ausgeben', '--ohne-weiter']) assert.equal(body.includes(gone), false, gone);
  });

  test('specReviewOrchestrator_Body_PassesTheCommitAsFactLineAndDeviationsToTheReportScript', () => {
    // Arrange
    const hint = readMarkdown(path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md')).fields['argument-hint'];

    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.equal(hint, '<spec.md> [workitem-nr] [--debug]');
    assert.ok(body.includes('`Commit` = Hash aus `COMMIT=`, `nichts zu committen`, `ignoriert` oder Grund dagegen.'));
    assert.ok(body.includes('`<FK>` schreiben: eine Zeile `Commit: <Commit>`, bei Abweichungen dazu eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.'));
    for (const gone of ['--commit', '--wi <WI>` nur wenn gegeben, `--fakten']) assert.equal(body.includes(gone), false, `${gone} kennt der Bericht nicht mehr`);
  });

  test('specReviewOrchestrator_Body_StaysUnder700Words', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
  });

  test('specReviewOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndCommitsOnlyAfterTheLastOne', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<S> alle`'));
    assert.ok(body.includes('`NEXT=ende` → kein Commit, 7; `NEXT=followup` → nächste Runde; sonst 6.'));
    assert.ok(body.indexOf('Maximum der Regeldatei') < body.indexOf('6. Commit, auch bei `⛔` oder `❓`.'));
    for (const gone of ['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
  });

  test('specReviewOrchestrator_Body_WritesChainEntryOfStageSpecBeforeTheReportAlsoAfterAStop', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`');
    const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen; der Bericht folgt trotzdem.');
    const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec');
    assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
    assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
    assert.ok(body.includes('Steht `<S>` fest (Datei existiert):'));
    assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
    assert.ok(body.includes('7. Abschlussbericht, letzte Handlung:'));
    assert.ok(body.includes('Stopp = Schritt 7 mit dem Grund; nach dem Bericht nichts weiter.'));
  });

  test('specReviewOrchestrator_Body_WhiteboardingSkipsCommitAndPassesTheSwitchOnToTheReviewCalls', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette.'));
    assert.ok(body.includes('Mit `--whiteboarding` kein Commit: `Commit` = `kein Commit (Whiteboarding)`, weiter mit 7.'));
    assert.equal((body.match(/mit `--whiteboarding` dazu `--whiteboarding`/g) || []).length, 3, 'ablage, spec-review und review-followup bekommen den Schalter');
  });
  ```
  `plugins/forge/tests/plan-orchestrator.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText, wordCount } = require('./lib/markdown');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

  const SKILL = path.join(__dirname, '..', 'skills', 'plan-orchestrator', 'SKILL.md');
  const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'report-text.js');

  test('planOrchestrator_Frontmatter_ModelInvocableWithSpecOptionalWorkitemAndDebug', () => {
    // Act
    const { fields } = readMarkdown(SKILL);

    // Assert
    assert.equal(fields.name, 'plan-orchestrator');
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], undefined);
    assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--debug]');
  });

  test('planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithoutReportParameters', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const steps = ['`dv-forge:plan-writing` mit `<S>`', '`dv-forge:plan-review` mit `<P> <S>`.', '`dv-forge:review-followup` mit `<P> alle`.'];
    const positions = steps.map((step) => body.indexOf(step));
    for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
  });

  test('planOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommandOnceThePlanStands', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art plan --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
    assert.ok(body.includes('bis Schritt 2 auch `<BR>` = `bericht-review.json` und `<AB>` = `abschluss.md`'));
    assert.ok(body.indexOf('ablage --art plan') < body.indexOf('`dv-forge:plan-review` mit'), 'die Dateien stehen vor dem Review fest');
  });

  test('planOrchestrator_Body_ChecksSpecByHashAfterEverySkill', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('orchestrator-state.js" start --state "<ST>" --spec "<S>"'));
    assert.ok(body.includes('orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen.'));
    assert.equal(body.match(/Spec-Prüfung\./g).length, 3);
  });

  test('planOrchestrator_Body_BranchesOnTheLinesTheReviewWrites', () => {
    // Arrange
    const script = readText(REPORT_TEXT);

    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.'));
    assert.ok(script.includes('⚠️ Unvollständig'));
  });

  test('planOrchestrator_Body_ReadsTheRulesFileForCommitsAndGitBansInsteadOfRepeatingThem', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
    for (const forbidden of ['git add', 'git commit', 'forge-config.js', 'Commit-ID', 'Spec-Änderungsbedarf', 'Nie committen', 'Kein Branch, kein Worktree', '## Rote Flaggen', 'Wünsche des Menschen']) {
      assert.ok(!body.includes(forbidden), `${forbidden} steht in der Regeldatei`);
    }
  });

  test('planOrchestrator_Body_EmitsExactlyOneClosingReportFromTheScript', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('plan-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 5 aus, genau einmal.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief, `--fakten "<FK>"` nur wenn geschrieben.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
    assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
    for (const gone of ['dein Block statt seines', 'Pfade:', '### Wie es weitergeht', 'unverändert ausgeben']) assert.ok(!body.includes(gone), `${gone} darf nicht im Skill stehen`);
  });

  test('planOrchestrator_Body_PassesOnlyDeviationsToTheReportScript', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.'));
    for (const gone of ['`Stand`', '--stand', '--wi <WI>` nur wenn gegeben, `--fakten', '/dv-forge:implementation <P>']) assert.ok(!body.includes(gone), `${gone} kennt der Bericht nicht mehr`);
  });

  test('planOrchestrator_Body_SuggestsArgumentsTheImplementationSkillsAccept', () => {
    // Arrange
    const hint = (name) => readMarkdown(path.join(__dirname, '..', 'skills', name, 'SKILL.md')).fields['argument-hint'];

    // Act & Assert
    assert.match(hint('implementation'), /^<plan\.md>/);
    assert.match(hint('implementation-orchestrator'), /^<plan\.md> <spec\.md> \[workitem-nr\]/);
  });

  test('planOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung.'));
    assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Planning <WI> <slug>`, ohne `<WI>` `Planning <slug>`'));
  });

  test('planOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine.'));
  });

  test('planOrchestrator_Body_StaysUnder550Words', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(wordCount(body) < 550, `${wordCount(body)} Wörter`);
  });

  test('planOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndStopsOnAbortOrWarning', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle`.'));
    assert.ok(body.includes('mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5.'));
    for (const gone of ['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json', 'Dritte Followup-Runde']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
  });

  test('planOrchestrator_Body_FollowupRoundsNeverCommit', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const rounds = body.slice(body.indexOf('Followup-Runden bis zum Maximum'), body.indexOf('5. Abschlussbericht'));
    assert.ok(rounds.length > 0, 'Abschnitt der Followup-Runden fehlt');
    assert.equal(/ommit/.test(rounds), false, 'die Followup-Runden nennen keinen Commit');
  });

  test('planOrchestrator_Body_WritesChainEntryBeforeTheReportOnlyWhenThePlanStands', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`');
    const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.');
    const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art plan');
    assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
    assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
    assert.ok(body.includes('Steht `<P>` fest (Datei existiert):'));
    assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
  });
  ```
  `plugins/forge/tests/implementation-orchestrator.test.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText, wordCount } = require('./lib/markdown');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

  const SKILLS = path.join(__dirname, '..', 'skills');
  const SKILL = path.join(SKILLS, 'implementation-orchestrator', 'SKILL.md');
  const REPORT_TEXT = path.join(__dirname, '..', 'scripts', 'lib', 'implementation-report-text.js');
  const CHAINED = ['start-work', 'implementation', 'implementation-review', 'review-followup'];

  test('implementationOrchestrator_Frontmatter_ModelInvocableWithPlanSpecWorkitemBaseAndDebug', () => {
    // Act
    const { fields } = readMarkdown(SKILL);

    // Assert
    assert.equal(fields.name, 'implementation-orchestrator');
    assert.match(fields.description, /^Use when/);
    assert.equal(fields['disable-model-invocation'], undefined);
    assert.equal(fields['argument-hint'], '<plan.md> <spec.md> [workitem-nr] [--base <branch>] [--debug]');
  });

  test('implementationOrchestrator_ChainedSkills_AreModelInvocable', () => {
    for (const skill of CHAINED) {
      // Act
      const { fields } = readMarkdown(path.join(SKILLS, skill, 'SKILL.md'));

      // Assert
      assert.equal(fields['disable-model-invocation'], undefined, `${skill} ist für das Modell gesperrt`);
    }
  });

  test('implementationOrchestrator_Body_ChainsTheFourSkillsInOrderWithoutReportParameters', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const steps = [
      '`dv-forge:start-work` mit `<P0> <S0>`',
      '`dv-forge:implementation` mit `<P> <S>`',
      '`dv-forge:implementation-review` mit `<P> <S>`.',
      '`dv-forge:review-followup` mit `<P> alle --spec <S>`.',
    ];
    const positions = steps.map((step) => body.indexOf(step));
    for (const [index, step] of steps.entries()) assert.ok(positions[index] !== -1, `${step} fehlt`);
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    for (const gone of [FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, 'store --etappe', 'ablage.md']) assert.equal(body.includes(gone), false, gone);
  });

  test('implementationOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommandAfterStartWork', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art implementation --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.'));
    assert.ok(body.includes('bis Schritt 2 auch `<AB>` = `abschluss.md`'));
    assert.ok(body.indexOf('ablage --art implementation') < body.indexOf('`dv-forge:implementation-review` mit'), 'die Dateien stehen vor dem Review fest');
  });

  test('implementationOrchestrator_Body_ChecksPlanAndSpecByHashAfterEveryWritingSkill', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('orchestrator-state.js" start --state "<ST>" --spec "<S>" --plan "<P>"'));
    assert.ok(body.includes('orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen.'));
    assert.ok(body.includes('Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.'));
    assert.equal(body.match(/Hash-Prüfung\./g).length, 3);
  });

  test('implementationOrchestrator_Body_BranchesOnTheResultsTheReportScriptWrites', () => {
    // Arrange
    const script = readText(REPORT_TEXT);

    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    for (const marker of ['✅ Bereit zum Abschließen', '⚠️ Unvollständig']) assert.ok(script.includes(marker), `${marker} fehlt in implementation-report-text.js`);
    assert.ok(body.includes('- `NEXT=followup` → 5.'));
    assert.ok(body.includes('- `NEXT=weiter` und `BEREIT=ja` → 6.'));
  });

  test('implementationOrchestrator_Body_ContinuesAfterFollowupOnlyOnAReadyResult', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende.'));
  });

  test('implementationOrchestrator_Body_KeepsTheWorktreeAndLeavesFinishWorkToTheHuman', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Der Worktree bleibt, `finish-work` ruft nur der Mensch.'));
    assert.ok(!body.includes('`dv-forge:finish-work` mit'));
    assert.ok(body.includes('`Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`)'));
    for (const gone of ['--worktree "<R>" --branch <branch> --pruefung', '--pruefung gruen', 'Kein `git switch`', 'Push, force von dir']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder entfällt`);
  });

  test('implementationOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.'));
    for (const gone of ['## Rote Flaggen', 'Wünsche des Menschen', 'Dritte Followup-Runde', 'finish-work` gleich mit']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei`);
  });

  test('implementationOrchestrator_Body_PassesSkillQuestionsToTheHuman', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Nie selbst antworten, auch nach `frag nicht`.'));
    assert.ok(body.includes('Während ein Skill läuft, gelten seine Anweisungen.'));
  });

  test('implementationOrchestrator_Body_TitlesSessionWithActivityWorkitemAndSlug', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung.'));
    assert.ok(body.includes('`select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Implementation <WI> <slug>`, ohne `<WI>` `Implementation <slug>`'));
  });

  test('implementationOrchestrator_Body_TreatsEmptyOrPlaceholderWorkitemAsNone', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine'));
  });

  test('implementationOrchestrator_Body_StaysUnder700Words', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
  });

  test('implementationOrchestrator_Body_RunsReviewAndEmitsOneClosingReportFromTheScript', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('implementation-review und review-followup zeigen nur ihre Review-Statuszeile.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.'));
    assert.ok(body.includes('`node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`'));
    assert.ok(body.includes('genau einmal als letzte Ausgabe'));
    assert.ok(body.includes('Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.'));
    for (const gone of ['Teile aus `<BR>` unverändert', '`### Wie es weitergeht` schreibst du selbst', 'unverändert ausgeben']) assert.ok(!body.includes(gone), gone);
  });

  test('implementationOrchestrator_Body_ReportsDeviationsAndVerdictsInFactLines', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Abweichungen, `Urteil:`-Zeilen → Bericht.'));
    assert.ok(body.includes('bei Abweichungen `Abweichungen: …`'));
  });

  test('implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTheRulesFileMaximum', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const followup = body.indexOf('- `NEXT=followup` → 5.');
    const ready = body.indexOf('- `NEXT=weiter` und `BEREIT=ja` → 6.');
    assert.ok(followup > -1 && followup < ready, 'Reihenfolge followup, weiter');
    assert.ok(body.includes('Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S>`. Hash-Prüfung.'));
    assert.ok(body.indexOf('Maximum der Regeldatei') < body.indexOf('6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>"'), 'Build, Test und Lint erst nach den Runden');
    for (const gone of ['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json']) assert.equal(body.includes(gone), false, `${gone} steht in der Regeldatei oder in der Ablage`);
  });

  test('implementationOrchestrator_Body_WritesChainEntryWithWorktreeAndBranchBeforeTheReportWhenStartWorkRan', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`');
    const failure = body.indexOf('Fehler: Meldung in `Abweichungen: …` von `<FK>`; der Bericht folgt trotzdem.');
    const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation');
    assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
    assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
    assert.ok(body.includes('Lief Schritt 2 (`<R>` und Branch stehen fest):'));
    assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen.'));
  });

  test('implementationOrchestrator_Body_AbortBeforeReviewStillGetsReport', () => {
    const { body } = readMarkdown(SKILL);
    assert.ok(body.includes('Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>" --fakten "<FK>"`.'));
  });
  ```
  In `plugins/forge/tests/guard-turn-report.test.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const guard = require('../scripts/guard-orchestrator.js');` die Zeile `const { renderOrchestratorReport } = require('../scripts/lib/orchestrator-report-text');` einfügen.
  2. Die Konstante `FULL` ersetzen durch:
  ```js
  const FULL = '# Abschlussbericht\n**Ergebnis:** ok\n\n# Was sich im Plan geändert hat\nnichts\n\n# Was ist noch offen\n- nichts';
  ```
  3. Den Test `onTurnEnd_AbortReportWithOneHeadingOfTheFour_Allows` ersetzen: Testname `onTurnEnd_AbortReportWithOneHeadingOfTheThree_Allows`, die Liste der Überschriften in der `for`-Schleife `['# Abschlussbericht', '# Was sich im Spec geändert hat', '# Was ist noch offen']` (ohne den vierten Eintrag).
  4. Vor dem Test `onTurnEnd_StopHookActive_DoesNotBlock` einfügen:
  ```js
  // Bericht eines Orchestrators, wie orchestrator-report.js ihn schreibt: drei Abschnitte, keiner für einen nächsten Schritt.
  const CLOSING_REPORT = renderOrchestratorReport({
    art: 'spec', resultLine: '**Ergebnis:** ✅ Bereit zum Planen', flowLines: [], checked: [], found: [], notes: [], changes: [], decisions: [], open: [], questions: [], green: [],
  }, { lines: [] });

  test('onTurnEnd_ClosingReportWithoutNextStepsSectionShownInFull_PassesTheMustShowCheck', () => {
    // Arrange
    const e = env();
    const file = path.join(e.cwd, 'abschluss.md');
    fs.writeFileSync(file, `${CLOSING_REPORT}\n`);
    guard.show(SESSION, file, e.tmpRoot);

    // Act
    const reason = turnEnd(e, [human('los'), said(CLOSING_REPORT)]);

    // Assert
    assert.equal(reason, null);
    assert.deepEqual(CLOSING_REPORT.split('\n').filter((line) => line.startsWith('# ')), ['# Abschlussbericht', '# Was sich in der Spec geändert hat', '# Was ist noch offen']);
  });

  test('onTurnEnd_ShortenedClosingReportMissingASection_IsBlockedAndNamesTheMissingHeading', () => {
    // Arrange
    const e = env();
    const file = path.join(e.cwd, 'abschluss.md');
    fs.writeFileSync(file, `${CLOSING_REPORT}\n`);
    guard.show(SESSION, file, e.tmpRoot);
    const shortened = CLOSING_REPORT.slice(0, CLOSING_REPORT.indexOf('# Was ist noch offen')).trimEnd();

    // Act
    const reason = turnEnd(e, [human('los'), said(shortened)]);

    // Assert
    assert.match(reason, /# Was ist noch offen/);
  });

  ```
  In `plugins/forge/tests/guard-orchestrator.test.js` den Testnamen `decidePreTool_DirectoryEntrySessionChainStoreNamingRepo_Allows` durch `decidePreTool_DirectoryEntrySessionChainReviewStandNamingRepo_Allows` ersetzen und in diesem Test die Zeile, die mit `  const command = `node "/plugins/forge/scripts/session-chain.js" store` beginnt, ersetzen durch:
  ```js
    const command = `node "/plugins/forge/scripts/session-chain.js" review-stand --spec "${env.repo}/docs/x/spec.md"`;
  ```
  In `plugins/forge/tests/report-text.test.js` in der Zeile `const { renderReportText, summaryOf, withoutProposalSentence } = require('../scripts/lib/report-text');` `, withoutProposalSentence` entfernen und den Test `withoutProposalSentence_CountAndOthers_ChoosesSingularPluralAndRestWording` (vom `test(`-Aufruf bis zur schließenden `});`, das letzte Stück der Datei) entfernen.
  In `plugins/forge/tests/session-chain-cli.test.js` diese Änderungen vornehmen:
  1. Die Zeile `const { ablageDir } = require('../scripts/lib/session-chain-ablage');` ersetzen durch `const { ablageDir, storeFiles } = require('../scripts/lib/session-chain-ablage');`.
  2. Den Test `store_FromWorktreeWithFresh_StoresInTheSharedAblage` (vom `test(`-Aufruf bis zur schließenden `});`) entfernen; die Ablage aus dem Worktree deckt `storeFiles_FromWorktree_FilesAreReadableFromTheMainCheckout` in `session-chain-ablage.test.js` ab.
  3. Im Test `reviewStand_Cli_PrintsResultPointsQuestionAndAbschluss` die Zeile, die mit `  chain(repo, 'store',` beginnt, ersetzen durch:
  ```js
    storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });
  ```
  In `plugins/forge/tests/session-chain-scenario.test.js` nach der Zeile `const { ETAPPEN, readState, readEvents } = require('../scripts/lib/session-chain-store');` die Zeile `const { storeFiles } = require('../scripts/lib/session-chain-ablage');` einfügen und die Zeile, die mit `  succeeded(chain(env.repo, 'store',` beginnt, ersetzen durch:
  ```js
    storeFiles({ dir: env.repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });
  ```
  In `plugins/forge/tests/session-chain-review.test.js` die Kommentarzeile, die mit `// Scheitert das ` und `store --neu` beginnt, ersetzen durch `// Scheitert ein späteres Review, liegt der Abschlussbericht des vorigen Reviews noch in der Ablage;`. In `plugins/forge/tests/session-chain-steps.test.js` im Kommentar `// Spec-Review-Etappe mit Abschlussbericht und Bericht-Daten in der Ablage, …` das Ende `, wie ein Orchestrator mit` und den Schalter `--ablage` samt ` sie ablegt.` ersetzen durch `, wie ein Orchestrator sie ablegt.`.
  In `plugins/forge/tests/prepare.test.js` nach der Zeile `const { git, commitFile, makeRepo, samePath } = require('./lib/git-repo');` die Zeile `const { ablageDir } = require('../scripts/lib/session-chain-ablage');` einfügen und vor dem Test `reviewFollowup_PerGroupSelection_WritesOnlyChosenGroup` einfügen:
  ```js
  test('reviewFollowup_AblageHoldsTheReportOfTheReview_KeepsIt', () => {
    const repo = planRepo();
    saveFollowup(repo, 'plan-review', '2026-09-28T10:00:00.000Z');
    const target = ablageDir(repo, 'demo', 'plan-review');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'bericht-review.json'), '{}');
    const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'b');
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(target, 'bericht-review.json')));
  });

  ```
  Am Ende von `plugins/forge/tests/prepare-ablage.test.js` einfügen:
  ```js

  test('planReview_AblageHoldsFilesOfAnEarlierRun_StartsTheAblageOver', () => {
    // Arrange
    const repo = planRepo();
    const target = ablageDir(repo, 'demo', 'plan-review');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'bericht-review.json'), '{}');
    fs.writeFileSync(path.join(target, 'abschluss.md'), '# alt\n');

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(target), false);
  });
  ```
  Der Test `plugins/forge/tests/orchestrator-ablage.test.js` prüfte `--ablage <E>` in den Skills und die Datei `ablage.md`; beide entfallen: Der Test wird in Schritt 3 gelöscht.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-state.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js" "<R>/plugins/forge/tests/spec-review-orchestrator.test.js" "<R>/plugins/forge/tests/plan-orchestrator.test.js" "<R>/plugins/forge/tests/implementation-orchestrator.test.js" "<R>/plugins/forge/tests/guard-turn-report.test.js" "<R>/plugins/forge/tests/prepare-ablage.test.js" "<R>/plugins/forge/tests/prepare.test.js"` — erwartet: FAIL, unter anderem `ablage_SpecWithoutChainState_NamesTheFilesOfTheSpecReviewEtappe`, `orchestratorReport_ReadyPlanWithoutFollowup_ThreeHeadingsAndNoNextStep`, `specReviewOrchestrator_Body_TakesTheFilesOfTheRunFromTheAblageCommand`, `onTurnEnd_ClosingReportWithoutNextStepsSectionShownInFull_PassesTheMustShowCheck` und `planReview_AblageHoldsFilesOfAnEarlierRun_StartsTheAblageOver`
- [ ] **Schritt 3: Skripte, Regeln und Skills umstellen**
  `plugins/forge/scripts/lib/etappe-of.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  // Etappe der Session-Kette, in deren Ablage ein Review oder Orchestrator seinen Bericht legt. Reihenfolge: ausdrücklich
  // `whiteboarding` (das Whiteboarding hat noch keinen Zustand), sonst die laufende Etappe der Kette (`gestartet.etappe`, die der
  // Brief der Leit-Session setzt), sonst die Etappe, die zum Namen des Skills passt (Debug-Aufruf ohne Brief).

  const path = require('node:path');
  const { SessionChainError, readState, slugOfArtifact } = require('./session-chain-store');
  const { ablageDir } = require('./session-chain-ablage');

  const ETAPPE_OF_SKILL = {
    'spec-review': 'spec-review',
    'spec-review-orchestrator': 'spec-review',
    'plan-review': 'plan-review',
    'plan-orchestrator': 'planning',
    'implementation-review': 'umsetzung',
    'implementation-orchestrator': 'umsetzung',
  };

  // `dir`: Ordner im Repo der Kette; `slug`: Slug aus dem Pfad von Spec oder Plan.
  function etappeFor({ skill, dir, slug, whiteboarding = false }) {
    if (!Object.hasOwn(ETAPPE_OF_SKILL, skill)) throw new SessionChainError(`Kein Skill mit Ablage: ${skill}`);
    if (whiteboarding) return 'whiteboarding';
    return readState(dir, slug)?.gestartet?.etappe ?? ETAPPE_OF_SKILL[skill];
  }

  // Ablage-Ordner, in den das Review `skill` seinen Bericht legt und aus dem sein Orchestrator ihn liest. `artifact`: die Spec
  // (bei `spec-review`) oder der Plan; Slug und Etappe wie bei prepare.js.
  function ablageFor({ skill, artifact, whiteboarding = false }) {
    const dir = path.dirname(path.resolve(artifact));
    const slug = slugOfArtifact(skill.startsWith('spec-') ? { spec: artifact } : { plan: artifact });
    return ablageDir(dir, slug, etappeFor({ skill, dir, slug, whiteboarding }));
  }

  module.exports = { ETAPPE_OF_SKILL, etappeFor, ablageFor };
  ```
  In `plugins/forge/scripts/lib/session-chain-ablage.js` die Funktion `nextFollowupName` samt Kommentarzeile ersetzen durch:
  ```js
  // Name der Bericht-Daten der Followup-Runde `number` (ohne Endung: `.json` Daten, `.md` Bericht).
  function followupName(number) {
    return `bericht-followup-${number}`;
  }

  // Nächster freier Name `bericht-followup-<n>` in der Ablage einer Etappe.
  function nextFollowupName(target) {
    const used = followupNumbers(target);
    return followupName(used.length === 0 ? 1 : used[used.length - 1] + 1);
  }
  ```
  und in `module.exports` hinter `followupNumbers, ` den Eintrag `followupName, ` einfügen. In `plugins/forge/scripts/lib/session-chain-points.js` die Require-Zeile `const { REVIEW_FILE, followupNumbers } = require('./session-chain-ablage');` ersetzen durch `const { REVIEW_FILE, followupNumbers, followupName } = require('./session-chain-ablage');` und in `readParts` den Ausdruck ``` `bericht-followup-${number}.json` ``` ersetzen durch ``` `${followupName(number)}.json` ```.
  `plugins/forge/scripts/orchestrator-state.js` komplett durch diesen Inhalt ersetzen:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Zustand und Verzweigung der drei Stufen-Orchestratoren als Skript statt als Prosa.
  //   start --state <ordner> --spec <S> [--plan <P>]  Start-Zustand (Toplevel, Branch, HEAD, Worktree, Vorbestand) und Kopien mit Hash
  //   add   --state <ordner> (--spec <S> | --plan <P>) Artefakt nachtragen oder ersetzen (Plan nach plan-writing, Pfade nach start-work)
  //   check --state <ordner> [--ort]                   Hashes prüfen; Exit 1 mit Diff bei Abweichung. --ort: Toplevel und Branch wie beim Start
  //   next  --review <json> [--followup <json>]...     nächster Schritt aus den Bericht-Daten von Review und Followups
  //   ablage --art spec|plan|implementation (--spec <S> | --plan <P>) [--whiteboarding]  Dateien des Laufs in der Ablage der Etappe
  // Ausgabe: Zeilen `<NAME>=<Wert>`; bei einer Abweichung danach `=== DIFF ===`. Exit 2 bei falschem Aufruf.

  const crypto = require('node:crypto');
  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { maxFollowups, RulesError } = require('./lib/orchestrator-rules');
  const { REVIEW_OF_ART } = require('./lib/orchestrator-report');
  const { ablageFor } = require('./lib/etappe-of');
  const { REVIEW_FILE, ABSCHLUSS_FILE, followupName } = require('./lib/session-chain-ablage');
  const { SessionChainError } = require('./lib/session-chain-store');
  const { toPosix } = require('./lib/posix');

  const STATE_FILE = 'orchestrator-state.json';
  const USAGE = [
    'Aufruf: node orchestrator-state.js start --state <ordner> --spec <S> [--plan <P>]',
    '       node orchestrator-state.js add --state <ordner> (--spec <S> | --plan <P>)',
    '       node orchestrator-state.js check --state <ordner> [--ort]',
    '       node orchestrator-state.js next --review <json> [--followup <json>]...',
    '       node orchestrator-state.js ablage --art spec|plan|implementation (--spec <S> | --plan <P>) [--whiteboarding]',
    '',
  ].join('\n');

  class StateError extends Error {}

  function git(cwd, args) {
    const result = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });
    return { ok: result.status === 0, out: (result.stdout ?? '').trim(), raw: result.stdout ?? '', err: (result.stderr ?? '').trim() };
  }

  function hashOf(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }

  function readStateFile(dir) {
    const file = path.join(dir, STATE_FILE);
    if (!fs.existsSync(file)) throw new StateError(`Kein Zustand in ${dir}; erst start`);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function writeStateFile(dir, state) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, STATE_FILE), `${JSON.stringify(state, null, 2)}\n`);
  }

  function location(cwd) {
    const dirs = git(cwd, ['rev-parse', '--path-format=absolute', '--git-dir', '--git-common-dir']).out.split('\n');
    return {
      toplevel: git(cwd, ['rev-parse', '--show-toplevel']).out,
      branch: git(cwd, ['branch', '--show-current']).out,
      head: git(cwd, ['rev-parse', '--short', 'HEAD']).out,
      worktree: dirs.length === 2 && dirs[0] !== dirs[1],
    };
  }

  // Kopie und Hash eines Artefakts; die Kopie dient dem Diff bei einer Abweichung.
  function snapshot(dir, key, file) {
    const absolute = path.resolve(file);
    if (!fs.existsSync(absolute)) throw new StateError(`${key === 'spec' ? 'Spec' : 'Plan'} fehlt: ${file}`);
    const copy = path.join(dir, `${key}-kopie${path.extname(absolute) || '.md'}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(absolute, copy);
    return { pfad: absolute, hash: hashOf(absolute), kopie: copy };
  }

  function start(values) {
    const dir = path.resolve(values.state);
    const here = location(process.cwd());
    if (!here.branch) throw new StateError('Kein Branch ausgecheckt (detached HEAD)');
    const artifacts = { spec: snapshot(dir, 'spec', values.spec) };
    if (values.plan) artifacts.plan = snapshot(dir, 'plan', values.plan);
    const specTop = git(path.dirname(artifacts.spec.pfad), ['rev-parse', '--show-toplevel']).out;
    // Roh, nicht getrimmt: Die erste Zeile ` M datei` verlöre sonst ihr führendes Leerzeichen und `slice(3)` einen Buchstaben des Pfads.
    const before = git(process.cwd(), ['status', '--porcelain']).raw.split('\n').filter(Boolean);
    writeStateFile(dir, { start: here, artefakte: artifacts, vorbestand: before });
    return [
      `TOPLEVEL=${here.toplevel}`, `BRANCH=${here.branch}`, `HEAD=${here.head}`, `WORKTREE=${here.worktree ? 'ja' : 'nein'}`,
      `SPEC-IM-CHECKOUT=${specTop === here.toplevel ? 'ja' : 'nein'}`, `VORBESTAND=${before.length}`,
      ...before.map((line) => `VORBESTAND-DATEI=${line.slice(3)}`),
    ].join('\n');
  }

  function add(values) {
    const dir = path.resolve(values.state);
    const state = readStateFile(dir);
    const key = values.spec ? 'spec' : 'plan';
    if (!values.spec && !values.plan) throw new StateError('add braucht --spec oder --plan');
    state.artefakte[key] = snapshot(dir, key, values[key]);
    writeStateFile(dir, state);
    return `${key.toUpperCase()}=${state.artefakte[key].pfad}`;
  }

  // Toplevel und Branch jetzt gegen den Start; `same` ist falsch bei einem anderen Checkout oder Branch.
  function placeOf(state, cwd) {
    const here = location(cwd);
    return { here, same: here.toplevel === state.start.toplevel && here.branch === state.start.branch };
  }

  function check(values) {
    const state = readStateFile(path.resolve(values.state));
    const lines = [];
    const diffs = [];
    for (const [key, artifact] of Object.entries(state.artefakte)) {
      const same = fs.existsSync(artifact.pfad) && hashOf(artifact.pfad) === artifact.hash;
      lines.push(`HASH-${key.toUpperCase()}=${same ? 'ok' : 'abweichung'}`);
      if (!same) diffs.push(git(process.cwd(), ['diff', '--no-index', '--', artifact.kopie, artifact.pfad]).out || `${artifact.pfad} fehlt`);
    }
    if (values.ort === true) {
      const place = placeOf(state, process.cwd());
      lines.push(`ORT=${place.same ? 'ok' : `abweichung ${place.here.toplevel} ${place.here.branch || '(kein Branch)'}`}`);
      if (!place.same) diffs.push(`Start: ${state.start.toplevel} ${state.start.branch}`);
    }
    const output = diffs.length > 0 ? [...lines, '=== DIFF ===', ...diffs].join('\n') : lines.join('\n');
    return { output, failed: diffs.length > 0 };
  }

  function readReport(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  const RESULT_PREFIX = /^\*\*Ergebnis:\*\*\s*/;

  // Nächster Schritt aus dem letzten Lauf von Review oder Followup: `followup` (mit Rundennummer), `weiter` oder `ende` mit Grund.
  // `BEREIT=ja`, wenn die Ergebnis-Zeile mit ✅ beginnt; der Orchestrator entscheidet daraus nur noch, was `weiter` heißt.
  function next(values) {
    const followups = values.followup ?? [];
    const max = maxFollowups();
    if (followups.length > max) throw new StateError(`--followup höchstens ${max} Mal`);
    const last = followups.at(-1) ?? values.review;
    const report = readReport(last);
    if (!report) return ['NEXT=ende', 'GRUND=kein-bericht', `BERICHT=${last}`].join('\n');
    const result = String(report.resultLine ?? '').replace(RESULT_PREFIX, '');
    const status = String(report.status ?? '');
    const lines = [`ERGEBNIS=${result || '-'}`, `BEREIT=${result.startsWith('✅') ? 'ja' : 'nein'}`, `RUNDEN=${followups.length}`];
    if (result.startsWith('⚠️') || status.startsWith('unvollständig')) return ['NEXT=ende', 'GRUND=unvollstaendig', ...lines].join('\n');
    if (report.offersFollowup && followups.length < max) return [`NEXT=followup`, `RUNDE=${followups.length + 1}`, ...lines].join('\n');
    return ['NEXT=weiter', ...lines].join('\n');
  }

  // Dateien des Laufs in der Ablage der Etappe, in der das Review des Orchestrators seinen Bericht ablegt: Bericht-Daten des Reviews und
  // je Followup-Runde (bis zum Maximum aus der Regeldatei) und der Abschlussbericht des Orchestrators. Die Namen kennt nur die Ablage.
  function ablage(values) {
    if (!Object.hasOwn(REVIEW_OF_ART, values.art)) throw new StateError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}`);
    const flag = values.art === 'spec' ? 'spec' : 'plan';
    if (!values[flag]) throw new StateError(`--art ${values.art} braucht --${flag}`);
    const dir = ablageFor({ skill: REVIEW_OF_ART[values.art], artifact: values[flag], whiteboarding: values.whiteboarding === true });
    const rounds = Array.from({ length: maxFollowups() }, (_, index) => `BERICHT-FOLLOWUP-${index + 1}=${toPosix(path.join(dir, `${followupName(index + 1)}.json`))}`);
    return [`BERICHT-REVIEW=${toPosix(path.join(dir, REVIEW_FILE))}`, ...rounds, `ABSCHLUSS=${toPosix(path.join(dir, ABSCHLUSS_FILE))}`].join('\n');
  }

  const OPTIONS = { '--state': 'state', '--spec': 'spec', '--plan': 'plan', '--review': 'review', '--art': 'art' };

  function parse(args) {
    const values = { followup: [] };
    for (let index = 0; index < args.length; index += 1) {
      const name = args[index];
      if (name === '--ort') { values.ort = true; continue; }
      if (name === '--whiteboarding') { values.whiteboarding = true; continue; }
      if (name === '--followup' && args[index + 1] !== undefined) { values.followup.push(args[index += 1]); continue; }
      if (!OPTIONS[name] || args[index + 1] === undefined) return null;
      values[OPTIONS[name]] = args[index += 1];
    }
    return values;
  }

  const COMMANDS = {
    start: { needs: ['state', 'spec'], run: start },
    add: { needs: ['state'], run: add },
    check: { needs: ['state'], run: (values) => check(values) },
    next: { needs: ['review'], run: next },
    ablage: { needs: ['art'], run: ablage },
  };

  function main() {
    const [command, ...rest] = process.argv.slice(2);
    const values = parse(rest);
    const entry = COMMANDS[command];
    if (!entry || !values || !entry.needs.every((key) => values[key])) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    try {
      const result = entry.run(values);
      if (typeof result === 'string') process.stdout.write(`${result}\n`);
      else {
        process.stdout.write(`${result.output}\n`);
        process.exit(result.failed ? 1 : 0);
      }
    } catch (error) {
      if (!(error instanceof StateError) && !(error instanceof RulesError) && !(error instanceof SessionChainError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { next, check, start, add, placeOf, readStateFile, location, StateError };
  ```
  `plugins/forge/scripts/orchestrator-report.js` komplett durch diesen Inhalt ersetzen:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Der eine Abschlussbericht eines Orchestrators aus den Bericht-Daten seines Reviews und Followups in der Ablage.
  // Schreibt den Bericht nach `--out`; stdout `BERICHT <datei>`, `=== BERICHT ===`, Klartext.

  const fs = require('node:fs');
  const path = require('node:path');
  const { mergeReports, REVIEW_OF_ART } = require('./lib/orchestrator-report');
  const { renderOrchestratorReport, renderAbortReport } = require('./lib/orchestrator-report-text');
  const { FlowError } = require('./lib/flow-error');
  const { maxFollowups } = require('./lib/orchestrator-rules');
  const { writeText } = require('./lib/flow-files');

  const REQUIRED = ['--review', '--out'];
  const OPTIONAL = ['--followup', '--fakten'];
  // Ein Lauf, der vor dem Review endet, hat keine Review-Daten: nur Grund und Bericht-Datei sind Pflicht.
  const ABORT_REQUIRED = ['--out', '--abbruch'];
  const ABORT_OPTIONAL = ['--fakten'];
  const USAGE = [
    'Aufruf: node orchestrator-report.js --art spec|plan|implementation --review <json> [--followup <json>]... --out <md> [--fakten <datei>]',
    '       node orchestrator-report.js --art spec|plan|implementation --abbruch <grund> --out <md> [--fakten <datei>]',
    '',
  ].join('\n');

  class UsageError extends Error {}

  function parse(args) {
    const values = {};
    let followups = null;
    for (let index = 0; index < args.length; index += 2) {
      if (!args[index]?.startsWith('--') || index + 1 >= args.length) throw new UsageError(`Unvollständiges Argument: ${args[index]}`);
      if (args[index] === '--followup') (followups ??= []).push(args[index + 1]);
      else values[args[index]] = args[index + 1];
    }
    if (followups) values['--followup'] = followups;
    const max = maxFollowups();
    if ((followups?.length ?? 0) > max) throw new UsageError(`--followup höchstens ${max} Mal`);
    if (!Object.hasOwn(REVIEW_OF_ART, values['--art'])) throw new UsageError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}`);
    const aborted = Object.hasOwn(values, '--abbruch');
    const required = aborted ? ABORT_REQUIRED : REQUIRED;
    const optional = aborted ? ABORT_OPTIONAL : OPTIONAL;
    const unknown = Object.keys(values).filter((name) => name !== '--art' && !required.includes(name) && !optional.includes(name));
    if (unknown.length > 0) throw new UsageError(`unbekannter Parameter: ${unknown.join(', ')}`);
    const missing = required.filter((name) => !values[name]);
    if (missing.length > 0) throw new UsageError(`fehlt: ${missing.join(', ')}`);
    return values;
  }

  // Faktenzeilen des Orchestrators (Branch, Commits, Prüfergebnis, Abweichungen) stehen unverändert im Abschlussbericht.
  function factLines(file) {
    if (!file) return [];
    if (!fs.existsSync(file)) throw new FlowError(`Faktendatei fehlt: ${file}`);
    return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').map((line) => line.trimEnd()).filter((line) => line !== '');
  }

  function run(values) {
    const facts = { lines: factLines(values['--fakten']) };
    const out = path.resolve(values['--out']);
    const text = values['--abbruch']
      ? renderAbortReport(values['--art'], values['--abbruch'], facts)
      : renderOrchestratorReport(mergeReports({ art: values['--art'], reviewFile: path.resolve(values['--review']), followupFiles: (values['--followup'] ?? []).map((file) => path.resolve(file)) }), facts);
    writeText(out, text);
    return [`BERICHT ${out}`, '=== BERICHT ===', text].join('\n');
  }

  function main() {
    try {
      process.stdout.write(`${run(parse(process.argv.slice(2)))}\n`);
    } catch (error) {
      if (error instanceof UsageError) {
        process.stderr.write(`${error.message}\n${USAGE}`);
        process.exit(2);
      }
      if (!(error instanceof FlowError)) throw error;
      process.stderr.write(`dv-forge orchestrator-report: ${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { run, parse, UsageError };
  ```
  `plugins/forge/scripts/lib/orchestrator-report-text.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  // Der eine Abschlussbericht eines Orchestrators in drei Abschnitten. Reine Funktion: Die Eingabe baut orchestrator-report.js
  // (Endstand) zusammen mit den Faktenzeilen des Orchestrators (`facts.lines`). Der Bericht nennt keinen nächsten Schritt;
  // die Session-Kette entscheidet über den Fortgang.

  const { changeLines, openLines } = require('./report-text');

  const CHANGED_IN = { spec: 'in der Spec', plan: 'im Plan', implementation: 'im Code' };
  const NOTHING_CHANGED = 'Keine Änderung.';
  const NOTHING_OPEN = 'Nichts weiter offen.';

  function labelled(label, lines) {
    return lines.length > 0 ? [`**${label}:**`, ...lines] : [];
  }

  function closingLines(report, facts) {
    return [
      report.resultLine,
      ...report.flowLines,
      ...labelled('Geprüft', report.checked),
      ...labelled('Gefunden', report.found),
      ...labelled('Hinweise zum Ablauf', report.notes.map((note) => `- ${note}`)),
      ...facts.lines,
    ];
  }

  function changedLines(report) {
    const lines = [
      ...report.changes.flatMap(changeLines),
      ...labelled('Deine Entscheidungen', report.decisions.map((entry) => `- **${entry.title}:** ${entry.decision}`)),
    ];
    return lines.length > 0 ? lines : [NOTHING_CHANGED];
  }

  // 🔴, 🟡 und ❓ zuerst, dann alle 🟢 (je Stelle einmal). Ein 🟢 ändert das Ergebnis nicht.
  function openSection(report) {
    const lines = [
      ...report.open.filter((entry) => entry.color === 'red').flatMap(openLines),
      ...report.open.filter((entry) => entry.color === 'yellow').flatMap(openLines),
      ...report.questions.map((line) => `- ❓ ${line}`),
      ...(report.green ?? []).flatMap(openLines),
    ];
    return lines.length > 0 ? lines : [NOTHING_OPEN];
  }

  function renderOrchestratorReport(report, facts) {
    return [
      ['# Abschlussbericht', ...closingLines(report, facts)],
      [`# Was sich ${CHANGED_IN[report.art]} geändert hat`, ...changedLines(report)],
      ['# Was ist noch offen', ...openSection(report)],
    ].map((block) => block.join('\n')).join('\n\n');
  }

  // Bericht eines Laufs, der vor dem Review endete (`--abbruch`): dieselben drei Abschnitte, ohne Review-Daten.
  function renderAbortReport(art, reason, facts) {
    return [
      ['# Abschlussbericht', `**Ergebnis:** ⚠️ Abgebrochen vor dem Review: ${reason}`, ...facts.lines],
      [`# Was sich ${CHANGED_IN[art]} geändert hat`, NOTHING_CHANGED],
      ['# Was ist noch offen', `- ${reason}`],
    ].map((block) => block.join('\n')).join('\n\n');
  }

  module.exports = { renderOrchestratorReport, renderAbortReport, NOTHING_OPEN, NOTHING_CHANGED };
  ```
  `plugins/forge/scripts/lib/report-text.js` komplett durch diesen Inhalt ersetzen:
  ```js
  'use strict';

  // Abschlussbericht eines Spec-, Plan-Reviews oder Followups in Klartext. Reine Funktion: Die Eingabe baut report-data.js.
  // `openRed`: Zahl der offenen Hindernisse; ist sie größer 0, gilt der Bericht auch bei Status `sauber …` als nicht bereit
  // (Followup: der Status zählt nur die gewählten Gruppen). `open[].hasProposal`: die Gruppe hat einen gesicherten
  // Scout-Vorschlag; nur solche Gruppen erreicht `/dv-forge:review-followup <A> alle`.
  // Der Bericht nennt keinen nächsten Schritt; die Session-Kette entscheidet über den Fortgang.

  const READY = { 'spec-review': 'Bereit zum Planen', 'plan-review': 'Bereit zur Umsetzung', 'implementation-review': 'Bereit zum Abschließen' };
  const DOCUMENT_IN = { 'spec-review': 'in der Spec', 'plan-review': 'im Plan' };
  const NEXT_FOR = { 'spec-review': 'den Plan', 'plan-review': 'die Umsetzung' };
  const VIEWPOINTS = ['', 'einem', 'zwei', 'drei', 'vier', 'fünf', 'sechs'];
  const ICON = { red: '🔴', yellow: '🟡', green: '🟢' };

  function kindOf(input, hints) {
    if (input.status.startsWith('unvollständig')) return 'incomplete';
    if (input.status === 'Fragen offen') return 'questions';
    if (input.status.startsWith('nicht bereit') || input.openRed > 0) return 'blocked';
    return hints > 0 ? 'hints' : 'ready';
  }

  function resultLine(input, kind, hints) {
    const count = (number, one, many) => (number === 1 ? one : many);
    if (kind === 'incomplete') return `**Ergebnis:** ⚠️ Unvollständig · ${input.failedLabels.join(', ')} ausgefallen`;
    if (kind === 'questions') return `**Ergebnis:** ❓ ${count(input.questions.length, '1 Frage', `${input.questions.length} Fragen`)} offen`;
    if (kind === 'blocked') return `**Ergebnis:** ⛔ Noch nicht bereit · ${count(input.openRed, '1 Hindernis', `${input.openRed} Hindernisse`)} offen`;
    const open = hints > 0 ? ` · ${count(hints, '1 kleiner Hinweis', `${hints} kleine Hinweise`)} offen` : '';
    return `**Ergebnis:** ✅ ${READY[input.review]}${open}`;
  }

  function viewpointsPhrase(count) {
    return count === 1 ? 'einem Blickwinkel' : `${VIEWPOINTS[count] ?? count} Blickwinkeln`;
  }

  function flowLine(input) {
    const rework = input.reworked ? 'eine Überarbeitung' : 'keine Überarbeitung';
    const verify = input.verified ? 'eine Nachprüfung' : 'keine Nachprüfung';
    if (input.followup) {
      const chosen = input.chosenCount === 1 ? '1 gewählter Vorschlag' : `${input.chosenCount} gewählte Vorschläge`;
      return `Ablauf: ${chosen} umgesetzt, ${verify}.`;
    }
    return `Ablauf: Prüfung aus ${viewpointsPhrase(input.reviewerCount)}, ${rework}, ${verify}.`;
  }

  function changeLines(change) {
    const mark = change.ok === true ? '✅' : '⚠️';
    const verdict = { true: 'bestätigt.', false: 'nicht erledigt.', null: 'nicht erfolgt.' }[String(change.ok)];
    return [
      `- ${mark} **${change.title}** · gefunden aus: ${change.angles}`,
      `  ${change.description}`,
      ...(change.change ? [`  Änderung: ${change.change}`] : []),
      ...(change.evidence ? [`  Beleg: ${change.evidence}`] : []),
      ...(change.choice ? [`  Gewählt: Vorschlag ${change.choice}`] : []),
      `  Nachprüfung: ${verdict}`,
    ];
  }

  function openLines(entry) {
    return [
      `- ${ICON[entry.color]} **${entry.title}** · aus: ${entry.angles}`,
      `  ${entry.description}`,
      ...(entry.recommendation ? [`  Vorschlag (empfohlen): ${entry.recommendation}`] : []),
    ];
  }

  function section(title, lines) {
    return lines.length > 0 ? [[`### ${title}`, ...lines]] : [];
  }

  // Zahl der offenen Gruppen einer Farbe, die einen Scout-Vorschlag haben; fehlt `hasProposal`, gilt: kein Vorschlag.
  function proposedCount(open, color) {
    return open.filter((entry) => entry.color === color && entry.hasProposal).length;
  }

  // Ob ein Followup (`review-followup <A> alle`) etwas erreicht: nur offene Hindernisse bzw. Hinweise mit gesichertem Scout-Vorschlag.
  // Fragen, ein Ausfall und ein bereiter Stand bieten keinen Followup an.
  function offersFollowup(kind, open) {
    if (kind === 'blocked') return proposedCount(open, 'red') > 0;
    if (kind === 'hints') return proposedCount(open, 'yellow') > 0;
    return false;
  }

  // Art, Ergebnis-Zeile und Ablauf; `offersFollowup`: ein Followup erreicht offene Gruppen mit Scout-Vorschlag.
  function summaryOf(input) {
    const hints = input.open.filter((entry) => entry.color === 'yellow').length;
    const kind = kindOf(input, hints);
    return { kind, resultLine: resultLine(input, kind, hints), flowLine: flowLine(input), offersFollowup: offersFollowup(kind, input.open) };
  }

  function renderReportText(input) {
    const hindrances = input.open.filter((entry) => entry.color === 'red');
    const hintEntries = input.open.filter((entry) => entry.color === 'yellow');
    const summary = summaryOf(input);
    const heading = `## ${input.title} · Ergebnis${input.topic ? ` · ${input.topic}` : ''}`;
    return [
      [heading, summary.resultLine, summary.flowLine],
      ...section(`Was sich ${DOCUMENT_IN[input.review]} geändert hat`, input.changes.flatMap(changeLines)),
      ...section('Deine Entscheidungen', (input.followup ? [] : input.decisions).map((entry) => `- **${entry.title}:** ${entry.decision}`)),
      ...section('Offene Fragen', input.questions.map((line) => `- ${line}`)),
      ...section('Noch offen · Hindernis', hindrances.flatMap(openLines)),
      ...section(`Noch offen · kein Hindernis für ${NEXT_FOR[input.review]}`, hintEntries.flatMap(openLines)),
      ...section('Hinweise zum Ablauf', input.notes.map((note) => `- ${note}`)),
    ].map((block) => block.join('\n')).join('\n\n');
  }

  module.exports = { renderReportText, summaryOf, offersFollowup, resultLine, changeLines, openLines, section, viewpointsPhrase };
  ```
  In `plugins/forge/scripts/lib/orchestrator-report.js` die Kommentarzeile, die mit `// Führt die Berichtsdaten eines eingebetteten Reviews` beginnt, ersetzen durch `// Führt die Bericht-Daten eines Reviews und seiner Followup-Runden (JSON aus der Ablage) zum Endstand zusammen.` und die Kommentarzeile vor `function mergeReports`, die mit `// `art`: spec | plan | implementation; `reviewFile`;` beginnt, ersetzen durch `// `art`: spec | plan | implementation; `reviewFile`; `followupFiles` (optional): Bericht-Daten der Followup-Runden aus der Ablage.`
  In `plugins/forge/scripts/guard-orchestrator.js` die Zeile `const REPORT_HEADINGS = ['# Abschlussbericht', '# Was sich', '# Was ist noch offen', '# Wie es weitergeht'];` ersetzen durch `const REPORT_HEADINGS = ['# Abschlussbericht', '# Was sich', '# Was ist noch offen'];`.
  In `plugins/forge/scripts/prepare.js` die Funktion `recordAblage` (samt der zwei Kommentarzeilen davor, vom Kommentar bis zur schließenden `}`) ersetzen durch:
  ```js
  // `fresh`: ein neues Review (kein Followup) beginnt die Ablage seiner Etappe neu; Reste eines früheren Laufs erreichen so weder den
  // Orchestrator noch die Leit-Session, falls das Review scheitert.
  function recordAblage(review, values, artifact, switches, fresh) {
    const dir = path.dirname(path.resolve(artifact));
    const etappe = etappeFor({ skill: review, dir, slug: values.slug, whiteboarding: switches.has('--whiteboarding') });
    const ablage = ablageDir(dir, values.slug, etappe);
    if (fresh) fs.rmSync(ablage, { recursive: true, force: true });
    writeContext(values.W, { ...readContext(values.W), etappe, ablage: toPosix(ablage), artifact: toPosix(path.resolve(artifact)) });
  }
  ```
  und in `prepare` die Zeile, die mit `  if (skill !== 'implementation') recordAblage(` beginnt, ersetzen durch:
  ```js
    if (skill !== 'implementation') recordAblage(skill === 'review-followup' ? values.original : skill, values, call.positional[0], call.switches, skill !== 'review-followup');
  ```
  In `plugins/forge/scripts/lib/session-chain-review.js` die Kommentarzeile, die mit `// Abschlussfrage kommt. Gelesen wird die Ablage` beginnt, ersetzen durch `// Abschlussfrage kommt. Gelesen wird die Ablage `whiteboarding`, in die der Spec-Review-Orchestrator mit `--whiteboarding` schreibt.` (mit Backticks um `whiteboarding` und `--whiteboarding`) und die Kommentarzeile, die mit `// Ist er älter als die Spec, ist er der Stand eines früheren Reviews:` beginnt, ersetzen durch `// Ist er älter als die Spec, ist er der Stand eines früheren Reviews: Das neue Review ist gescheitert.`
  In `plugins/forge/scripts/session-chain.js` diese Änderungen vornehmen:
  1. In der Require-Zeile von `session-chain-store` `slugOfArtifact, ` entfernen (`const { SessionChainError, readState, writeState, appendEvent } = require('./lib/session-chain-store');`) und die Zeile `const { storeFiles } = require('./lib/session-chain-ablage');` entfernen.
  2. Aus `USAGE` die Zeile, die mit `  '       node session-chain.js store ` beginnt, entfernen.
  3. `const FLAG_OPTIONS = ['--neu', '--stopp', '--erneut'];` ersetzen durch `const FLAG_OPTIONS = ['--stopp', '--erneut'];`.
  4. Die Funktion `store` (vom Aufruf `function store(values) {` bis vor den Kommentar `// Prüfergebnis aus der Datei von verify-run.js`) entfernen.
  5. In `COMMANDS` den Eintrag `store, ` entfernen: `const COMMANDS = { set, brief, turn, final, halt, answer, commit, schluss, 'etappe-report': report, 'review-stand': stand };`.
  Dateien löschen: `git rm plugins/forge/shared/session-chain/ablage.md plugins/forge/tests/orchestrator-ablage.test.js`.
  `plugins/forge/skills/spec-review-orchestrator/SKILL.md` komplett durch diesen Inhalt ersetzen:
  ```markdown
  ---
  name: spec-review-orchestrator
  description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch.
  argument-hint: <spec.md> [workitem-nr] [--whiteboarding] [--debug]
  ---

  # Spec-Review-Orchestrator

  `$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette. `--debug` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
  Nur Skills und Skripte aufrufen. Den Inhalt der Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

  ## Regeln
  Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
  1. Ein Zug. `Letzte Handlung` gilt nicht. spec-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 7 aus, genau einmal.
  2. Skill fragt: unverändert an den Menschen, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen. Nie selbst antworten.
  3. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach.
  4. Stopp = Schritt 7 mit dem Grund; nach dem Bericht nichts weiter.

  ## Ablauf
  0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
  1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad. Stopp bei Exit 1, `SPEC-IM-CHECKOUT=nein` oder `WORKTREE=ja`. Vorbestand = Zeilen `VORBESTAND-DATEI`. `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren. `<FK>` = `fakten.md` im Scratchpad, absolut.
  2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Spec-Review <WI> <slug>`, ohne `<WI>` `Spec-Review <slug>`. Fehler egal.
  3. Ablage des Laufs: `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art spec --spec "<S>"`, mit `--whiteboarding` dazu `--whiteboarding`. Exit 1 → stopp. `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
  4. `dv-forge:spec-review` mit `<S>`, mit `--whiteboarding` dazu `--whiteboarding`, sonst kein Argument. `### Frage …` = Pause (Regel 2). Danach `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
     - `NEXT=ende` → kein Commit, 7.
     - `NEXT=followup`, auch für Hinweise, `⛔` und `❓` → 5, sonst 6.
  5. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<S> alle`, mit `--whiteboarding` dazu `--whiteboarding`. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=ende` → kein Commit, 7; `NEXT=followup` → nächste Runde; sonst 6.
  6. Commit, auch bei `⛔` oder `❓`. Mit `--whiteboarding` kein Commit: `Commit` = `kein Commit (Whiteboarding)`, weiter mit 7. Sonst `node "<PLUGIN>/scripts/spec-commit.js" preflight --spec "<S>" --state "<ST>"`; Exit 1 (anderer Ort) → stopp, `SPEC-VORBESTAND=ja` → `Abweichungen:`. Dann `node "<PLUGIN>/scripts/spec-commit.js" commit --spec "<S>" --slug "<slug>"`, dazu `--wi <WI>` nur wenn gegeben. Ausgabe `COMMIT=<hash>`, `nichts` oder `ignoriert`. Exit 1 → Meldung, Spec bleibt gestaged (nennen), 7.
     - `COMMIT=frei`: das Projekt setzt eine Konvention (`node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`). Betreff danach, eine Zeile, ein `-m`, kein Body; `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`.
  7. Abschlussbericht, letzte Handlung:
     1. `Commit` = Hash aus `COMMIT=`, `nichts zu committen`, `ignoriert` oder Grund dagegen.
     2. `<FK>` schreiben: eine Zeile `Commit: <Commit>`, bei Abweichungen dazu eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.
     3. Steht `<S>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen; der Bericht folgt trotzdem.
     4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.
     5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     6. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
     7. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
  ```
  `plugins/forge/skills/plan-orchestrator/SKILL.md` komplett durch diesen Inhalt ersetzen:
  ```markdown
  ---
  name: plan-orchestrator
  description: Use when an approved dv-forge spec.md should become a reviewed plan in one unattended run.
  argument-hint: <spec.md> [workitem-nr] [--debug]
  ---

  # Plan-Orchestrator

  `$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `--debug` optional, zählt nicht als `<WI>`. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
  Nur Skills und Skripte aufrufen. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

  ## Regeln
  Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
  1. Ein Zug. `Frische Session` und `letzte Handlung` gelten nicht. plan-review und review-followup zeigen nur ihre Review-Statuszeile; den Abschlussbericht gibt nur Schritt 5 aus, genau einmal.
  2. Skill fragt: Antwort abwarten, Skill fertig laufen lassen. Sonst Halt nur bei Blocker.
  3. Spec-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben.

  ## Ablauf
  0. Skill `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Planning <WI> <slug>`, ohne `<WI>` `Planning <slug>`; Fehler egal.
  1. START-STATE: `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>"` mit `<ST>` = Ordner `zustand` im Scratchpad; Exit 1 (Spec fehlt, detached HEAD) → stopp. Im Scratchpad, absolut: `<FK>` = `fakten.md`; bis Schritt 2 auch `<BR>` = `bericht-review.json` und `<AB>` = `abschluss.md`.
  2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus der Ausgabe, absolut; mehrere → fragen. Spec-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art plan --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
  3. `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`: `NEXT=followup` → 4, sonst 5.
  4. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle`. Spec-Prüfung. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde, sonst 5.
  5. Abschlussbericht, letzte Handlung:
     1. `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>" --ort`. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: `ORT=abweichung`, abgelehnte Wünsche.
     2. Steht `<P>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
     3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief, `--fakten "<FK>"` nur wenn geschrieben.
     4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     5. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
     6. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
  ```
  `plugins/forge/skills/implementation-orchestrator/SKILL.md` komplett durch diesen Inhalt ersetzen:
  ```markdown
  ---
  name: implementation-orchestrator
  description: Use when a reviewed dv-forge plan.md and its spec.md should be implemented and reviewed in one unattended run.
  argument-hint: <plan.md> <spec.md> [workitem-nr] [--base <branch>] [--debug]
  ---

  # Implementierungs-Orchestrator

  `$ARGUMENTS`: `<P0>` Plan, `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` oder `--` beginnend = keine, `--base <B>` optional, `--debug` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
  Skills nacheinander aufrufen. Dazwischen weder Plan, Spec, Code noch Diffs lesen oder ändern, nicht committen, nichts bewerten. Während ein Skill läuft, gelten seine Anweisungen.

  ## Regeln
  Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es; hier steht nur, was zusätzlich für diesen Orchestrator gilt.
  1. Ein Zug; `frische Session` und `letzte Handlung` gelten nicht. implementation-review und review-followup zeigen nur ihre Review-Statuszeile.
  2. Skill fragt: unverändert an den Menschen, Skill weiterlaufen lassen. Nie selbst antworten, auch nach `frag nicht`. Sonst Halt nur bei Blocker.
  3. Skill-Argumente nur wie im Ablauf.
  4. Ort wählt start-work. Der Worktree bleibt, `finish-work` ruft nur der Mensch.
  5. Hash-Prüfung: `node "<PLUGIN>/scripts/orchestrator-state.js" check --state "<ST>"`. Exit 1 → stopp, den Teil nach `=== DIFF ===` zeigen, fragen. Nicht zurückschreiben, nicht committen, nicht als harmlos einstufen.
  6. Zustand (Pfade, Modus, Branch, `<B>`, Vorbestand) in `state.md` im Scratchpad; `<ST>` = Ordner `zustand` dort. Dort auch, absolut: `<FK>` = `fakten.md`; bis Schritt 2 auch `<AB>` = `abschluss.md`.
  7. Abweichungen, `Urteil:`-Zeilen → Bericht. Blocker = Stopp aus Regel 5, fehlender Skill, Frage nur für den Menschen.

  ## Ablauf
  0. Titel: `<slug>` = Elternordner bei `plan.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel `Implementation <WI> <slug>`, ohne `<WI>` `Implementation <slug>`; Fehler egal. `dv-forge:`-Skill aus 2–5 fehlt → stopp.
  1. `<P0>`/`<S0>` fehlt oder `git branch --show-current` leer → stopp. `<B>` = `--base`, sonst aktueller Branch; ≠ aktueller Branch → stopp, fragen. Vorbestand = `git status --porcelain` außer `<P0>`, `<S0>`; nennen.
  2. `dv-forge:start-work` mit `<P0> <S0>`. `P`, `S`, `R`, Modus, Branch aus den Zeilen `<Name>=<Wert>`; fehlt `P`/`S`: Eingabepfad in `<R>`. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" start --state "<ST>" --spec "<S>" --plan "<P>"` und `node "<PLUGIN>/scripts/orchestrator-state.js" ablage --art implementation --plan "<P>"`, Exit 1 → stopp: `<BR>` = `BERICHT-REVIEW`, `<BFn>` = `BERICHT-FOLLOWUP-<n>`, `<AB>` = `ABSCHLUSS`.
  3. `dv-forge:implementation` mit `<P> <S>`; `fortgesetzt` ist erwartet. Hash-Prüfung.
  4. `dv-forge:implementation-review` mit `<P> <S>`. Hash-Prüfung. Dann `node "<PLUGIN>/scripts/orchestrator-state.js" next --review "<BR>"`:
     - `NEXT=followup` → 5.
     - `NEXT=weiter` und `BEREIT=ja` → 6.
     - Sonst Ende.
  5. Followup-Runden bis zum Maximum der Regeldatei. Runde `RUNDE`: `dv-forge:review-followup` mit `<P> alle --spec <S>`. Hash-Prüfung. Dann `next` erneut, mit `--followup "<BFn>"` je gelaufener Runde: `NEXT=followup` → nächste Runde; `NEXT=weiter` und `BEREIT=ja` → 6; sonst Ende.
  6. `node "<PLUGIN>/scripts/verify-run.js" --repo "<R>" --out "<PR>"` mit `<PR>` = `pruefung.json` im Scratchpad. `PRUEFUNG ergebnis=`: `docker` → in `<FK>` `Prüfung: Tests nur ohne Docker rot`; `rot` → Ende. `offen` außer Vorbestand > 0 → in `<FK>` als Abweichung.
  7. Abschlussbericht, auch bei jedem früheren Ende, genau einmal als letzte Ausgabe:
     1. `<FK>` schreiben, je Angabe eine Zeile: `Feature-Branch: <branch>` (belegt per `git branch --list`, `git worktree list`), Modus, `git log --oneline <B>..<branch>`, Prüfergebnis aus `<PR>`, Urteile, Vorbestand, bei Abweichungen `Abweichungen: …`.
     2. Lief Schritt 2 (`<R>` und Branch stehen fest): `node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Fehler: Meldung in `Abweichungen: …` von `<FK>`; der Bericht folgt trotzdem.
     3. Lief Schritt 4 nicht: `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --abbruch "<Grund>" --out "<AB>" --fakten "<FK>"`. Sonst `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --fakten "<FK>"`, dazu `--followup "<BFn>"` je nur wenn die Runde lief.
     4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     5. Den Bericht ausgeben, wie die Regeldatei im Abschnitt Ausgabe es verlangt.
     6. Danach, ohne Text: `node "<PLUGIN>/scripts/guard-orchestrator.js" run-end ${CLAUDE_SESSION_ID}`.
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-state.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js" "<R>/plugins/forge/tests/spec-review-orchestrator.test.js" "<R>/plugins/forge/tests/plan-orchestrator.test.js" "<R>/plugins/forge/tests/implementation-orchestrator.test.js" "<R>/plugins/forge/tests/guard-turn-report.test.js" "<R>/plugins/forge/tests/guard-orchestrator.test.js" "<R>/plugins/forge/tests/prepare-ablage.test.js" "<R>/plugins/forge/tests/prepare.test.js" "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/session-chain-cli.test.js" "<R>/plugins/forge/tests/session-chain-scenario.test.js" "<R>/plugins/forge/tests/session-chain-review.test.js" "<R>/plugins/forge/tests/session-chain-steps.test.js" "<R>/plugins/forge/tests/session-chain-ablage.test.js" "<R>/plugins/forge/tests/session-chain-points.test.js" "<R>/plugins/forge/tests/script-calls.test.js" "<R>/plugins/forge/tests/orchestrator-rules.test.js" "<R>/plugins/forge/tests/spec-commit.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/etappe-of.js plugins/forge/scripts/lib/session-chain-ablage.js plugins/forge/scripts/lib/session-chain-points.js plugins/forge/scripts/lib/session-chain-review.js plugins/forge/scripts/orchestrator-state.js plugins/forge/scripts/orchestrator-report.js plugins/forge/scripts/lib/orchestrator-report-text.js plugins/forge/scripts/lib/orchestrator-report.js plugins/forge/scripts/lib/report-text.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/scripts/prepare.js plugins/forge/scripts/session-chain.js plugins/forge/skills/spec-review-orchestrator/SKILL.md plugins/forge/skills/plan-orchestrator/SKILL.md plugins/forge/skills/implementation-orchestrator/SKILL.md plugins/forge/tests/orchestrator-state.test.js plugins/forge/tests/orchestrator-report.test.js plugins/forge/tests/spec-review-orchestrator.test.js plugins/forge/tests/plan-orchestrator.test.js plugins/forge/tests/implementation-orchestrator.test.js plugins/forge/tests/guard-turn-report.test.js plugins/forge/tests/guard-orchestrator.test.js plugins/forge/tests/report-text.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-chain-review.test.js plugins/forge/tests/session-chain-steps.test.js plugins/forge/tests/prepare.test.js plugins/forge/tests/prepare-ablage.test.js` · `git commit -m "feat(forge): orchestrators read and write the ablage and name no next step"`

---
### Task 9: Whiteboarding, Plan-Writing, Start-Work und Umsetzung geben nur ihr Ergebnis aus

**ACs:** AC-01, AC-10

**Dateien:**
- Modify: `plugins/forge/skills/plan-writing/SKILL.md:25-29` · `**Übergabe:**`
- Modify: `plugins/forge/skills/spec-whiteboarding/SKILL.md:26-33` · `6. **Übergabe:**`
- Modify: `plugins/forge/skills/spec-whiteboarding/references/split.md:10` · `4. **Übergabe ergänzen:**`
- Modify: `plugins/forge/skills/start-work/SKILL.md:15-34` · `Beginnt sie mit `Nicht committet:``
- Modify: `plugins/forge/skills/implementation/SKILL.md:41` · `4. Im Chat nur:`
- Test: `plugins/forge/tests/plan-writing.test.js:119-128` · `skill_Body_WritesPlanNextToSpecAndHandsOverToPlanReview`
- Test: `plugins/forge/tests/spec-whiteboarding.test.js:112-118` · `skill_Body_HandsOverWithoutCommit`
- Test: `plugins/forge/tests/work-skills.test.js:58-63` · `startWork_Body_DelegatesDecisionToScript`
- Test: `plugins/forge/tests/implementation-skill.test.js:85-96` · `skill_Body_BranchRuleAndHandover`

**Interfaces:**
- Consumes: —
- Produces: Die Ausgabe von `plan-writing` ist der Plan-Pfad, die von `spec-whiteboarding` Pfad und Branch der Spec, die von `start-work` Ort, Branch und Aktion, die von `implementation` Ergebnis, Zahl der Urteile, offene Punkte, Pfad der Datei und bei einem Worktree dessen Pfad und Branch; keine dieser Ausgaben nennt einen Befehl `/dv-forge:…`, einen Hinweis auf eine frische Session, eine Commit-Frage oder einen nächsten Schritt; `start-work` committet nicht und bietet keinen Commit an

Die Etappen geben nur ihr Ergebnis aus; was danach folgt, entscheidet die Leit-Session. `start-work` hat bisher bei `Nicht committet:` einen Commit angeboten: Jetzt nennt es die Dateien und startet nicht; die Leit-Session committet Spec und Plan beim GO vor der Umsetzung. `finish-work` und `spec-grilling` enden schon mit ihrem Ergebnis und bleiben unverändert. Die Aufrufe `/dv-forge:…` in `spec-whiteboarding/SKILL.md` und `references/split.md` waren Hinweise für den Menschen und entfallen; der Beschreibungssatz am Anfang nennt den Spec-Review jetzt ohne Befehl.

- [ ] **Schritt 1: Fehlschlagende Tests anpassen**
  In `plugins/forge/tests/plan-writing.test.js` den Test `skill_Body_WritesPlanNextToSpecAndHandsOverToPlanReview` umbenennen in `skill_Body_WritesPlanNextToSpecAndNamesOnlyThePlanPath` und in ihm diese vier Zeilen
  ```js
    assert.ok(body.includes('/dv-forge:plan-review <pfad/plan.md>'));
    assert.match(body, /frischen Session/);
    assert.match(body, /Spec und Plan committen/);
    assert.ok(body.includes('Du committest nichts selbst.'));
  ```
  ersetzen durch:
  ```js
    assert.ok(body.includes('**Ergebnis:** nur den Plan-Pfad nennen. Kein Befehl, kein Hinweis auf einen nächsten Schritt, keine Commit-Frage. Du committest nichts selbst.'));
    assert.doesNotMatch(body, /\/dv-forge:|frischen Session|Spec und Plan committen/);
  ```
  In `plugins/forge/tests/spec-whiteboarding.test.js` den Test `skill_Body_HandsOverWithoutCommit` (vom `test(`-Aufruf bis zur schließenden `});`) ersetzen durch:
  ```js
  test('skill_Body_EndsWithPathAndBranchOnly', () => {
    const { body } = readMarkdown(SKILL);
    assert.ok(body.includes('6. **Ergebnis:** mit genau einer Angabe enden: Pfad der Spec relativ zum Repo und aktueller Branch. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start.'));
    assert.doesNotMatch(body, /\/dv-forge:|frischen Session|Folgeaufträge außerhalb der Spec/);
  });
  ```
  im selben File den Test `specWhiteboarding_Body_HandsOverToAFreshSpecReviewWithoutReviewingItself` umbenennen in `specWhiteboarding_Body_ReviewsNothingItself` und in ihm die Zeile, die mit `  assert.ok(body.includes('kopierbarer Befehl` beginnt, entfernen, und im Test `split_Reference_DetachedSpecsAndResume` die Zeile `  assert.ok(text.includes('/dv-forge:spec-whiteboarding <pfad>'));` ersetzen durch:
  ```js
    assert.ok(text.includes('4. **Ergebnis ergänzen:** je abgetrenntem Teil den Pfad.'));
    assert.doesNotMatch(text, /\/dv-forge:/);
  ```
  In `plugins/forge/tests/work-skills.test.js` im Test `startWork_Body_DelegatesDecisionToScript` die Zeile `  assert.ok(body.includes('/dv-forge:implementation <P>'));` ersetzen durch:
  ```js
    assert.ok(body.includes('4. Ausgabe: nur das Ergebnis aus Schritt 3 (Ort, Branch, Aktion). Kein Befehl, kein Hinweis auf einen nächsten Schritt.'));
    assert.doesNotMatch(body, /\/dv-forge:|Session in <R> starten|Commit anbieten|erst nach Ja/);
  ```
  In `plugins/forge/tests/implementation-skill.test.js` im Test `skill_Body_BranchRuleAndHandover` die Zeile `  assert.ok(body.includes('/dv-forge:implementation-review <P>'));` ersetzen durch:
  ```js
    assert.ok(body.includes('Kein Befehl, kein Hinweis auf einen nächsten Schritt.'));
    assert.doesNotMatch(body, /\/dv-forge:|frische Session/);
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/plan-writing.test.js" "<R>/plugins/forge/tests/spec-whiteboarding.test.js" "<R>/plugins/forge/tests/work-skills.test.js" "<R>/plugins/forge/tests/implementation-skill.test.js"` — erwartet: FAIL, `skill_Body_WritesPlanNextToSpecAndNamesOnlyThePlanPath`, `skill_Body_EndsWithPathAndBranchOnly`, `split_Reference_DetachedSpecsAndResume`, `startWork_Body_DelegatesDecisionToScript` und `skill_Body_BranchRuleAndHandover`
- [ ] **Schritt 3: Skill-Texte anpassen**
  In `plugins/forge/skills/plan-writing/SKILL.md` den Schritt 9 (die Zeile `9. **Übergabe:** …`, der Code-Block darunter und die Zeile `   Du committest nichts selbst.`) ersetzen durch:
  ```markdown
  9. **Ergebnis:** nur den Plan-Pfad nennen. Kein Befehl, kein Hinweis auf einen nächsten Schritt, keine Commit-Frage. Du committest nichts selbst.
  ```
  In `plugins/forge/skills/spec-whiteboarding/SKILL.md` diese Änderungen vornehmen:
  1. In der Einleitung die Wortfolge `für `/dv-forge:spec-review`. ` ersetzen durch `für den Spec-Review. ` (Backticks und der Befehl entfallen).
  2. Die Grundhaltung `6. **Format hat Vorrang.** Rundenformat, Spec-Format und Übergabe gelten vor Stil-Regeln anderer Plugins oder Hooks.` ersetzen durch `6. **Format hat Vorrang.** Rundenformat, Spec-Format und Ergebnis gelten vor Stil-Regeln anderer Plugins oder Hooks.`
  3. Den Schritt `6. **Übergabe:** mit genau diesen vier Punkten enden:` samt den vier Aufzählungspunkten und der Zeile `   Kein Commit, kein automatischer Start.` ersetzen durch:
  ```markdown
  6. **Ergebnis:** mit genau einer Angabe enden: Pfad der Spec relativ zum Repo und aktueller Branch. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start.
  ```
  In `plugins/forge/skills/spec-whiteboarding/references/split.md` den Punkt `4. **Übergabe ergänzen:** …` ersetzen durch:
  ```markdown
  4. **Ergebnis ergänzen:** je abgetrenntem Teil den Pfad.
  ```
  In `plugins/forge/skills/start-work/SKILL.md` diese Änderungen vornehmen:
  1. In Schritt 2 den Satz ab `Exit ungleich 0: Meldung wörtlich ausgeben. Beginnt sie mit` bis zum Ende des Schritts ersetzen durch:
  ```markdown
  Exit ungleich 0: Meldung wörtlich ausgeben, Ende. Beginnt sie mit `Nicht committet:`, nennt sie die Dateien; du committest nichts und startest nicht.
  ```
  2. Schritt 4 (`4. Übergabe als Code-Block: …`) ersetzen durch:
  ```markdown
  4. Ausgabe: nur das Ergebnis aus Schritt 3 (Ort, Branch, Aktion). Kein Befehl, kein Hinweis auf einen nächsten Schritt.
  ```
  3. In der Tabelle `Häufige Fehler` die Zeile `| Nicht committete Spec oder Plan still mitnehmen | Commit anbieten, erst nach Ja. Sonst fehlen sie im Worktree. |` ersetzen durch:
  ```markdown
  | Nicht committete Spec oder Plan still mitnehmen | Die Meldung von `work.js` nennen und nicht starten. Sonst fehlen sie im Worktree. |
  ```
  und die Zeile `| Nach dem Start schon Code schreiben | Umsetzen ist `/dv-forge:implementation`. |` ersetzen durch:
  ```markdown
  | Nach dem Start schon Code schreiben | Umsetzen ist Aufgabe der Umsetzungs-Etappe. |
  ```
  In `plugins/forge/skills/implementation/SKILL.md` im Abschnitt `## Abschluss` den Punkt `4. Im Chat nur: …` ersetzen durch:
  ```markdown
  4. Im Chat nur: Ergebnis, Zahl der Urteile, offene Punkte, Pfad der Datei, bei `modus=worktree` Worktree und Branch. Kein Befehl, kein Hinweis auf einen nächsten Schritt.
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/plan-writing.test.js" "<R>/plugins/forge/tests/spec-whiteboarding.test.js" "<R>/plugins/forge/tests/work-skills.test.js" "<R>/plugins/forge/tests/implementation-skill.test.js" "<R>/plugins/forge/tests/spec-grilling.test.js" "<R>/plugins/forge/tests/spec-whiteboarding-with-docs.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/plan-writing/SKILL.md plugins/forge/skills/spec-whiteboarding/SKILL.md plugins/forge/skills/spec-whiteboarding/references/split.md plugins/forge/skills/start-work/SKILL.md plugins/forge/skills/implementation/SKILL.md plugins/forge/tests/plan-writing.test.js plugins/forge/tests/spec-whiteboarding.test.js plugins/forge/tests/work-skills.test.js plugins/forge/tests/implementation-skill.test.js` · `git commit -m "feat(forge): stage skills print only their result"`

---
### Task 10: Brief und Leit-Session ohne Ablage-Parameter, Übergabe und eigene Git-Regeln

**ACs:** AC-01, AC-04, AC-05, AC-09, AC-10, AC-11, AC-12, AC-18

**Dateien:**
- Modify: `plugins/forge/scripts/session-chain.js:45-60` · `function parseOptions`
- Modify: `plugins/forge/scripts/lib/session-chain-brief.js:40-130` · `const ETAPPEN_BRIEFS`
- Modify: `plugins/forge/shared/session-chain/base-sub-agent.md:1-22` · `## Ketten-Regeln`
- Modify: `plugins/forge/skills/session-orchestrator/SKILL.md:12-36` · `## Regeln`
- Modify: `plugins/forge/skills/session-orchestrator/references/ablauf.md:15-30` · `## Final prüfen`
- Test: `plugins/forge/tests/session-chain-brief.test.js:166-330` · `buildBrief_PlanReview_RunsFollowupWhileOfferedAtMostTwiceWithoutRewrite`
- Test: `plugins/forge/tests/session-chain-cli.test.js:178-420` · `reviewStand_Cli_PrintsResultPointsQuestionAndAbschluss`
- Test: `plugins/forge/tests/session-chain-scenario.test.js:61-70` · `function writeReport(env, etappe`
- Test: `plugins/forge/tests/session-orchestrator-skill.test.js:81-90` · `sessionOrchestrator_Body_NeverActsForAStageSession`

**Interfaces:**
- Consumes: `maxFollowups` aus plugins/forge/scripts/lib/orchestrator-rules.js und plugins/forge/shared/orchestrator-rules.md (Task 2); `FORMER_REPORT_OPTION`, `FORMER_ABLAGE_OPTION` aus plugins/forge/tests/lib/former-names.js (Task 7)
- Produces: `session-chain.js etappe-report` nimmt die Datei mit dem vollen Bericht des Skills als `--inhalt <datei>`, `session-chain.js final` die Berichtsdatei der Etappe als `--etappenbericht <datei>`; jeder andere Parameter endet mit `unbekannter Parameter: <name>` und Exit 2, ein Parameter ohne Wert mit `Wert fehlt: <name>` und Exit 2; kein Brief nennt `--ablage` oder die Bericht-Parameter der früheren Doppel-Betriebsart; der Brief der Etappe `plan-review` nennt das Followup-Maximum aus der Regeldatei, der Basis-Prompt base-sub-agent.md verweist für die Git-Verbote auf die Regeldatei und enthält die Regel 10 (fehlende Voraussetzung: `STATUS=needs-user` und die Ursache in einem Satz)

Etappen-Sessions rufen ihren Skill ohne `--ablage` auf: Der Skill legt Bericht und Bericht-Daten selbst in die Ablage der Etappe (Task 6 bis 8). Der Brief nennt deshalb nur noch, welche Datei der Etappenbericht als Inhalt bekommt. Die Git-Verbote und das Followup-Maximum stehen nur in `shared/orchestrator-rules.md` (Task 2); der Brief verweist auf die Regeldatei, der Brief der Etappe `plan-review` liest das Maximum mit `maxFollowups()`, die Leit-Session verweist ebenfalls. Der Satz zur Commit-Frage entfällt: Die Leit-Session committet Spec und Plan beim GO, die Etappen committen ihre Pfade ohne Rückfrage. Eine fehlende Voraussetzung, auch eine Ablage im alten Format (`Ablage im alten Format: <datei>`, Task 6), beendet die Etappe mit `STATUS=needs-user` und einer Ursache in einem Satz.

- [ ] **Schritt 1: Fehlschlagende Tests anpassen und schreiben**
  In `plugins/forge/tests/session-chain-brief.test.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const { readText } = require('./lib/markdown');` einfügen:
  ```js
  const { maxFollowups } = require('../scripts/lib/orchestrator-rules');
  const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');
  ```
  2. Im Test `buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks` in der Liste die Zeile, die mit `    'nur deine eigenen Dateien, auf Pfade beschränkt', 'Nie alle Änderungen stagen',` beginnt, ersetzen durch:
  ```js
      'nur deine eigenen Dateien, auf Pfade beschränkt', 'Fremde Dateien fasst du nicht an.', 'Die Git-Verbote stehen in `',
      'shared/orchestrator-rules.md`, Abschnitt Git-Verbote; Push ist nach dem Ja des Menschen in der Abschluss-Etappe erlaubt.', 'Commit-Konvention des Projekts',
  ```
  und die Zeile `    'Die Statuszeile ersetzt die Übergabe-Hinweise deines Skills',` ersetzen durch `    'Statuszeile und Ergebnis deines Skills sind deine ganze Ausgabe',`.
  3. Den Test `buildBrief_GrillAndNacharbeiten_AskForTheFullReportViaBericht` umbenennen in `buildBrief_GrillAndNacharbeiten_AskForTheFullReportViaInhalt` und in ihm die beiden Zeilen mit `--bericht` ersetzen durch:
  ```js
      assert.ok(auftrag.includes('`--inhalt "<datei>"`'), auftrag);
      assert.equal(auftrag.includes(FORMER_REPORT_OPTION), false, auftrag);
  ```
  4. Den Test `buildBrief_PlanReview_RunsFollowupWhileOfferedAtMostTwiceWithoutRewrite` (vom `test(`-Aufruf bis zur schließenden `});`) ersetzen durch:
  ```js
  test('buildBrief_PlanReview_RunsFollowupWhileOfferedUpToTheRulesFileMaximumWithoutRewriteOrCommit', () => {
    // Act
    const text = brief('plan-review').brief;
    const auftrag = text.slice(text.indexOf('## Auftrag'), text.indexOf('## Ketten-Regeln'));

    // Assert
    assert.ok(auftrag.includes(`solange die letzte Review-Statuszeile \`FOLLOWUP ja\` meldet, höchstens ${maxFollowups()} Runden`));
    assert.ok(auftrag.includes('Den Plan schreibst du nicht neu. Du committest nichts; Spec und Plan committet die Leit-Session nach dem GO.'));
    assert.equal(auftrag.includes(FORMER_ABLAGE_OPTION), false);
    assert.equal(auftrag.includes('Commit-Frage'), false);
  });
  ```
  5. Den Test `buildBrief_PlanReview_NamesTheMarkdownReportOfTheLastAblageLine` (vom `test(`-Aufruf bis zur schließenden `});`) ersetzen durch:
  ```js
  test('buildBrief_PlanReview_NamesTheMarkdownReportOfTheLastReviewStatusLine', () => {
    // Act
    const text = brief('plan-review').brief;

    // Assert
    assert.ok(text.includes('`--inhalt` ist die `.md`-Datei, die die letzte Review-Statuszeile nach `Bericht:` nennt.'));
  });
  ```
  6. Im Test `buildBrief_Whiteboarding_ReportsWithTheAbschlussOfTheReview` die Zeichenfolge `und `--bericht "<ABSCHLUSS aus review-stand>"`, dazu` ersetzen durch `und `--inhalt "<ABSCHLUSS aus review-stand>"`, dazu`. Im Test `buildBrief_Whiteboarding_RunsTheSpecReviewInTheSameSessionWithoutCommit` die Zeile, die mit `    'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session.` beginnt, ersetzen durch `    'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session.',` und in der Zeile darunter `mit `"<deine Spec>" --ablage whiteboarding --whiteboarding` auf.` ersetzen durch `mit `"<deine Spec>" --whiteboarding` auf.`
  7. Am Ende der Datei einfügen:
  ```js

  test('buildBrief_EveryEtappe_NamesNeitherFormerOptionNorHandoverAndAsksForNeedsUserOnAMissingPrecondition', () => {
    for (const etappe of Object.keys(MODELS)) {
      // Act
      const text = brief(etappe).brief;

      // Assert
      assert.equal(text.includes(FORMER_REPORT_OPTION), false, etappe);
      assert.equal(text.includes(FORMER_ABLAGE_OPTION), false, etappe);
      assert.equal(text.includes('git add -A'), false, `${etappe}: Die Git-Verbote stehen in der Regeldatei`);
      assert.ok(text.includes('7. Statuszeile und Ergebnis deines Skills sind deine ganze Ausgabe: kein Übergabe-Hinweis, keine Commit-Frage, keine Empfehlung für einen nächsten Schritt.'), etappe);
      assert.ok(text.includes('Nach der Statuszeile steht als einzige weitere Zeile die Ursache in einem Satz.'), etappe);
      assert.ok(text.includes('gemeldet als `Ablage im alten Format: <datei>`'), etappe);
    }
  });
  ```
  In `plugins/forge/tests/session-chain-cli.test.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const { ablageDir, storeFiles } = require('../scripts/lib/session-chain-ablage');` die Zeile `const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');` einfügen.
  2. Im Test, der `etappe-report` mit dem Abschlussbericht aufruft (Hilfsfunktion `specReviewReport`), in dem Aufruf `'etappe-report', '--etappe', 'spec-review', '--slug', 'x', '--bericht', abschluss` den Parameter `'--bericht'` durch `'--inhalt'` ersetzen, und in allen Aufrufen `chain(repo, 'final', … '--session', 'local_s', '--bericht', bericht, …)` den Parameter `'--bericht'` durch `'--etappenbericht'`.
  3. Am Ende der Datei einfügen:
  ```js

  for (const [name, option] of [['FormerReportOption', FORMER_REPORT_OPTION], ['FormerAblageOption', FORMER_ABLAGE_OPTION], ['AnyOtherOption', '--gibtesnicht']]) {
    test(`cli_${name}_ExitsWithTwoAndSaysUnknownParameter`, () => {
      // Arrange
      const repo = makeRepo();

      // Act
      const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', option, 'x', '--commit', 'none');

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^unbekannter Parameter: ${option}\\n`));
    });
  }

  test('cli_OptionWithoutValue_ExitsWithTwoAndNamesTheOption', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'review-stand', '--spec');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^Wert fehlt: --spec\n/);
  });
  ```
  In `plugins/forge/tests/session-chain-scenario.test.js` in `writeReport` `['--bericht', reportFile(result)]` durch `['--inhalt', reportFile(result)]` ersetzen, in `runFinal` den Parameter `'--bericht', bericht,` durch `'--etappenbericht', bericht,` und im Aufruf `chain(env.repo, 'etappe-report', '--etappe', 'whiteboarding', '--spec', env.spec, '--bericht', field(stand, 'ABSCHLUSS'))` den Parameter `'--bericht'` durch `'--inhalt'`.
  In `plugins/forge/tests/session-orchestrator-skill.test.js` im Test `sessionOrchestrator_Body_NeverActsForAStageSession` die Zeile, die mit `  assert.ok(body.includes('Kein `git add -A`, kein Push,` beginnt, ersetzen durch:
  ```js
    assert.ok(body.includes('5. Git-Verbote: `<PLUGIN>/shared/orchestrator-rules.md`, Abschnitt Git-Verbote.'));
    assert.equal(body.includes('git add -A'), false);
  ```
  und im Test, der die Aufrufzeile von `final` prüft (die Liste, die mit ``'`<SC> final --etappe <e> --session <id> --bericht "<BERICHT>" --commit <COMMIT>`'`` beginnt), diesen Eintrag ersetzen durch `` '`<SC> final --etappe <e> --session <id> --etappenbericht "<BERICHT>" --commit <COMMIT>`' ``.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/session-chain-brief.test.js" "<R>/plugins/forge/tests/session-chain-cli.test.js" "<R>/plugins/forge/tests/session-orchestrator-skill.test.js"` — erwartet: FAIL, unter anderem `buildBrief_PlanReview_RunsFollowupWhileOfferedUpToTheRulesFileMaximumWithoutRewriteOrCommit`, `buildBrief_EveryEtappe_NamesNeitherFormerOptionNorHandoverAndAsksForNeedsUserOnAMissingPrecondition`, `cli_FormerReportOption_ExitsWithTwoAndSaysUnknownParameter` und `sessionOrchestrator_Body_NeverActsForAStageSession`
- [ ] **Schritt 3: Parameter, Brief und Skills umstellen**
  In `plugins/forge/scripts/session-chain.js` diese Änderungen vornehmen:
  1. In `USAGE` die Zeile `final` und die Zeile `etappe-report`: `--bericht <datei>` bei `final` ersetzen durch `--etappenbericht <datei>` und `[--bericht <datei>]` bei `etappe-report` durch `[--inhalt <datei>]`.
  2. In `VALUE_OPTIONS` den Eintrag `'--bericht'` durch `'--etappenbericht', '--inhalt'` ersetzen.
  3. In `parseOptions` die Zeile `    if (!VALUE_OPTIONS.includes(name) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${name}`);` ersetzen durch:
  ```js
      if (!VALUE_OPTIONS.includes(name)) throw new UsageError(`unbekannter Parameter: ${name}`);
      if (index + 1 >= args.length) throw new UsageError(`Wert fehlt: ${name}`);
  ```
  4. In `final` `bericht: required(values, 'bericht')` ersetzen durch `bericht: required(values, 'etappenbericht')` und in `report` `bericht: values.bericht` durch `bericht: values.inhalt`.
  In `plugins/forge/scripts/lib/session-chain-brief.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const { pointLine } = require('./session-chain-points');` die Zeile `const { maxFollowups } = require('./orchestrator-rules');` einfügen.
  2. Die Funktion `ablage` (samt der folgenden Leerzeile) entfernen und in `REWORK_REPORT` `--bericht "<datei>"` durch `--inhalt "<datei>"` ersetzen.
  3. In der Etappe `whiteboarding`: die Auftragszeile `'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session. Die Übergabe deines Skills (Review-Befehl, frische Session) gibst du nicht aus.',` ersetzen durch `'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session.',`, in der folgenden Zeile `mit `"<deine Spec>" --ablage whiteboarding --whiteboarding` auf.` durch `mit `"<deine Spec>" --whiteboarding` auf.` und in der Zeile `Abschließen: …` `--bericht "<ABSCHLUSS aus review-stand>"` durch `--inhalt "<ABSCHLUSS aus review-stand>"`.
  4. In der Etappe `grill` `--bericht "<datei>"` durch `--inhalt "<datei>"`.
  5. Die Zeile `auftrag:` der Etappe `spec-review` ersetzen durch:
  ```js
      auftrag: () => ['Der Skill committet die Spec selbst. `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.'],
  ```
  und die Zeile `auftrag:` der Etappe `planning` ersetzen durch:
  ```js
      auftrag: () => ['Der Skill committet nicht. Berichtsdatei mit `--plan "<plan.md>"`; `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.'],
  ```
  6. In der Etappe `plan-review` die vier Zeilen im Auftrag (`ablage('plan-review'),` bis ``'`--bericht` ist die `.md`-Datei zur letzten `ABLAGE`-Zeile …',``) ersetzen durch:
  ```js
        `Danach \`dv-forge:review-followup\` mit \`${v.plan} alle\`, solange die letzte Review-Statuszeile \`FOLLOWUP ja\` meldet, höchstens ${maxFollowups()} Runden.`,
        'Den Plan schreibst du nicht neu. Du committest nichts; Spec und Plan committet die Leit-Session nach dem GO.',
        '`--inhalt` ist die `.md`-Datei, die die letzte Review-Statuszeile nach `Bericht:` nennt.',
  ```
  7. In der Etappe `umsetzung` die Zeile `      ablage('umsetzung'),` entfernen und am Ende der Zeile, die mit `      'Berichtsdatei mit `--worktree "<R>"`` beginnt, `` `--bericht` ist sein Abschlussbericht.` `` ersetzen durch `` `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.` ``.
  In `plugins/forge/shared/session-chain/base-sub-agent.md` diese Änderungen vornehmen:
  1. In Regel 3 den Satzteil `Nie alle Änderungen stagen (`git add -A`, `git add .`, `git commit -a`), fremde Dateien nicht anfassen.` ersetzen durch `Fremde Dateien fasst du nicht an. Die Git-Verbote stehen in `{{PLUGIN}}/shared/orchestrator-rules.md`, Abschnitt Git-Verbote; Push ist nach dem Ja des Menschen in der Abschluss-Etappe erlaubt.` und den letzten Satz der Regel `Push nur in der Abschluss-Etappe.` entfernen.
  2. In Regel 6 `--bericht "<datei>"` durch `--inhalt "<datei>"` ersetzen.
  3. Regel 7 ersetzen durch:
  ```markdown
  7. Statuszeile und Ergebnis deines Skills sind deine ganze Ausgabe: kein Übergabe-Hinweis, keine Commit-Frage, keine Empfehlung für einen nächsten Schritt.
  ```
  4. Hinter Regel 9 (vor der Überschrift `## Gesprächsstil`) einfügen:
  ```markdown
  10. Fehlende Voraussetzung: Fehlt dir etwas, ohne das dein Skill nicht laufen kann (eine Datei, ein Bericht, eine Ablage im alten Format, gemeldet als `Ablage im alten Format: <datei>`), endest du mit `STATUS=needs-user`. Nach der Statuszeile steht als einzige weitere Zeile die Ursache in einem Satz.
  ```
  In `plugins/forge/skills/session-orchestrator/SKILL.md` die Regel `5. Kein `git add -A`, kein Push, kein Branch-Wechsel, kein Worktree.` ersetzen durch `5. Git-Verbote: `<PLUGIN>/shared/orchestrator-rules.md`, Abschnitt Git-Verbote.` und in `plugins/forge/skills/session-orchestrator/references/ablauf.md` im Abschnitt `## Final prüfen` den Parameter `--bericht "<BERICHT>"` durch `--etappenbericht "<BERICHT>"` ersetzen.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/session-chain-brief.test.js" "<R>/plugins/forge/tests/session-chain-cli.test.js" "<R>/plugins/forge/tests/session-chain-scenario.test.js" "<R>/plugins/forge/tests/session-orchestrator-skill.test.js" "<R>/plugins/forge/tests/session-chain-steps.test.js" "<R>/plugins/forge/tests/script-calls.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/session-chain.js plugins/forge/scripts/lib/session-chain-brief.js plugins/forge/shared/session-chain/base-sub-agent.md plugins/forge/skills/session-orchestrator/SKILL.md plugins/forge/skills/session-orchestrator/references/ablauf.md plugins/forge/tests/session-chain-brief.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-orchestrator-skill.test.js` · `git commit -m "feat(forge): brief and lead session name no ablage parameter and refer to the rules file"`

---
### Task 11: Hook weist getippte Befehle der Unter-Skills ab

**ACs:** AC-06, AC-07, AC-08, AC-16, AC-17

**Dateien:**
- Create: `plugins/forge/scripts/lib/entry-guard.js`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:228-248` · `function main()`
- Modify: `plugins/forge/skills/spec-whiteboarding/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/spec-whiteboarding-with-docs/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/spec-grilling/SKILL.md:1-12` · `description:`
- Modify: `plugins/forge/skills/spec-review/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/spec-review-orchestrator/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/plan-writing/SKILL.md:1-12` · `description:`
- Modify: `plugins/forge/skills/plan-review/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/plan-orchestrator/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/implementation/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/implementation-review/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/implementation-orchestrator/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/review-followup/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/start-work/SKILL.md:1-5` · `description:`
- Modify: `plugins/forge/skills/finish-work/SKILL.md:1-5` · `description:`
- Create: `plugins/forge/tests/entry-guard.test.js`
- Test: `plugins/forge/tests/guard-run.test.js:248-262` · `cli_PromptThenPretoolThenRunEnd_DeniesThenAllows`

**Interfaces:**
- Consumes: `briefOf` aus plugins/forge/scripts/lib/stage-guard.js (bestehend); `writeBlock` und `main` in plugins/forge/scripts/guard-orchestrator.js (bestehend)
- Produces: `blockedEntry(prompt): string | null`, `subSkillOf(prompt): string | null`, `SUB_SKILLS`, `START_COMMAND`, `DEBUG_SWITCH` in plugins/forge/scripts/lib/entry-guard.js; `node guard-orchestrator.js prompt` gibt für den getippten Befehl eines Unter-Skills ohne `--debug` `{"decision":"block","reason":"dv-forge: /dv-forge:<name> ist ein interner Unter-Skill. Starte dv-forge mit /dv-forge:session-orchestrator. Zum Debuggen hängst du --debug an."}` aus und legt keine Datei an; jede der 14 Unter-Skill-Beschreibungen endet auf ` Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.`

**Probe-Ergebnis (Vorgabe der Spec, am 2026-10-26 mit `claude -p` und einem Probe-Plugin `dv-forge` gemessen):** Ein getippter Plugin-Befehl erreicht den Hook `UserPromptSubmit` unverändert als `prompt`, mit Präfix als `/dv-forge:spec-review y`, ohne als `/spec-review y`; ein Aufruf durch das Modell über das Skill-Werkzeug erzeugt kein `UserPromptSubmit`, sondern `PreToolUse` mit `tool_name` `Skill` und `tool_input` `{"skill":"dv-forge:spec-review","args":"z"}`; die Antwort `{"decision":"block","reason":"…"}` auf `UserPromptSubmit` weist den Prompt ab. Daraus folgt: Das Muster akzeptiert beide Schreibweisen, die Sperre sitzt nur auf `UserPromptSubmit`, und Aufrufe durch Etappen-Sessions über das Skill-Werkzeug passieren sie nie (AC-17). Der Brief einer Etappen-Session beginnt mit einem Slash-Befehl, ist aber kein getippter Befehl; `blockedEntry` erkennt ihn an der Briefzeile (`briefOf`) und lässt ihn durch.

Die Sperre läuft im bestehenden Hook `guard-orchestrator.js prompt`, vor allem anderen, was dieser Hook tut: So legt ein abgewiesener Befehl weder einen Marker noch einen Lauf an (AC-06, `nichts wird geschrieben`). Die Liste der 14 Unter-Skills steht nur in `entry-guard.js`; der Test leitet sie aus dem Ordner `skills/` ab (alle außer `session-orchestrator`, `init`, `commit-message`, `domain-modeling`, `merge-conflict-resolution`) und prüft, dass genau diese 14 Beschreibungen den Zusatz tragen (AC-08, die README folgt in Task 12). Die Skripte der Unter-Skills nehmen `--debug` an: `prepare.js` seit Task 6; `plan-writing` und `spec-grilling` lesen `$ARGUMENTS` selbst und nennen `--debug` jetzt ausdrücklich als Nicht-Argument.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Neue Datei `plugins/forge/tests/entry-guard.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { SUB_SKILLS, START_COMMAND, blockedEntry } = require('../scripts/lib/entry-guard');
  const { buildBrief } = require('../scripts/lib/session-chain-brief');
  const { readMarkdown } = require('./lib/markdown');

  const ROOT = path.join(__dirname, '..');
  const GUARD = path.join(ROOT, 'scripts', 'guard-orchestrator.js');
  const TOOLS = ['init', 'commit-message', 'domain-modeling', 'merge-conflict-resolution'];

  function skillNames() {
    return fs.readdirSync(path.join(ROOT, 'skills'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  }

  test('subSkills_List_IsEverySkillExceptStartCommandAndTools', () => {
    // Arrange
    const expected = skillNames().filter((name) => name !== 'session-orchestrator' && !TOOLS.includes(name));

    // Assert
    assert.deepEqual([...SUB_SKILLS].sort(), expected);
    assert.equal(SUB_SKILLS.length, 14);
  });

  for (const name of SUB_SKILLS) {
    test(`blockedEntry_${name.replace(/\W/g, '_')}TypedWithoutDebug_NamesTheStartCommand`, () => {
      // Act
      const prefixed = blockedEntry(`/dv-forge:${name} docs/forge/x/spec.md`);
      const bare = blockedEntry(`/${name}`);

      // Assert
      for (const reason of [prefixed, bare]) {
        assert.match(reason, /^dv-forge: /);
        assert.ok(reason.includes(START_COMMAND), reason);
        assert.ok(reason.includes(`/dv-forge:${name}`), reason);
      }
    });

    test(`blockedEntry_${name.replace(/\W/g, '_')}TypedWithDebug_Passes`, () => {
      assert.equal(blockedEntry(`/dv-forge:${name} docs/forge/x/spec.md --debug`), null);
      assert.equal(blockedEntry(`/${name} --debug x`), null);
    });

    test(`skillDescription_${name.replace(/\W/g, '_')}_IsMarkedInternalWithTheStartCommand`, () => {
      // Act
      const { fields } = readMarkdown(path.join(ROOT, 'skills', name, 'SKILL.md'));

      // Assert
      assert.match(fields.description, /intern/);
      assert.ok(fields.description.includes(START_COMMAND), fields.description);
      assert.ok(fields.description.endsWith(' Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.'), 'der Zusatz enthält kein Doppelpunkt mit Leerzeichen');
    });
  }

  test('blockedEntry_ToolsStartCommandAndOtherText_Pass', () => {
    for (const prompt of [...TOOLS.flatMap((name) => [`/dv-forge:${name}`, `/${name} x`]), START_COMMAND, `${START_COMMAND} grill docs/x/spec.md`, '/dv-forge:unbekannt', '/clear', 'Hallo', '', undefined]) {
      assert.equal(blockedEntry(prompt), null, String(prompt));
    }
  });

  test('skillDescription_ToolsAndStartCommand_AreNotMarkedInternal', () => {
    for (const name of [...TOOLS, 'session-orchestrator']) {
      assert.doesNotMatch(readMarkdown(path.join(ROOT, 'skills', name, 'SKILL.md')).fields.description, /Gilt als intern/, name);
    }
  });

  test('blockedEntry_BriefOfAnEtappenSession_Passes', () => {
    // Arrange
    const { brief } = buildBrief({ etappe: 'spec-review', values: { slug: 'x', spec: 'C:/r/docs/forge/x/spec.md' } });

    // Assert
    assert.ok(brief.startsWith('/dv-forge:spec-review-orchestrator'));
    assert.equal(blockedEntry(brief), null);
  });

  function hook(args, input, tmp) {
    return spawnSync(process.execPath, [GUARD, ...args], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, TMPDIR: tmp, TMP: tmp, TEMP: tmp } });
  }

  test('guardPromptCli_SubSkillWithoutDebug_PrintsBlockJsonAndWritesNothing', () => {
    // Arrange
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

    // Act
    const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:plan-review docs/forge/x/plan.md' }, tmp);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.decision, 'block');
    assert.ok(output.reason.includes(START_COMMAND));
    assert.deepEqual(fs.readdirSync(tmp), [], 'weder Marker noch Lauf werden angelegt');
  });

  test('guardPromptCli_OrchestratorWithoutDebug_StartsNoRunMarker', () => {
    // Arrange
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

    // Act
    const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:plan-orchestrator docs/forge/x/spec.md' }, tmp);

    // Assert
    assert.equal(JSON.parse(result.stdout).decision, 'block');
    assert.deepEqual(fs.readdirSync(tmp), []);
  });

  test('guardPromptCli_SubSkillWithDebug_PrintsNothing', () => {
    // Arrange
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

    // Act
    const result = hook(['prompt'], { session_id: 's1', cwd: tmp, prompt: '/dv-forge:finish-work --debug' }, tmp);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });

  test('guardPretoolCli_SkillCallWithoutDebugByAnEtappenSession_IsNotDenied', () => {
    // Arrange
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-entry-'));

    // Act
    const result = hook(['pretool'], { session_id: 's1', cwd: tmp, tool_name: 'Skill', tool_input: { skill: 'dv-forge:spec-review', args: 'docs/forge/x/spec.md' } }, tmp);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  });

  test('hooksJson_UserPromptSubmit_RunsTheGuardPromptCommandThatBlocksTypedSubSkills', () => {
    const { hooks } = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8'));
    const commands = hooks.UserPromptSubmit.flatMap((entry) => entry.hooks.map((item) => item.command));
    assert.ok(commands.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" prompt'));
  });
  ```
  In `plugins/forge/tests/guard-run.test.js` tippen die beiden CLI-Tests `cli_PromptThenPretoolThenRunEnd_DeniesThenAllows` und `cli_SessionEnd_RemovesRunMarker` den Befehl eines Unter-Skills; in beiden die Zeichenfolge `prompt: '/dv-forge:plan-orchestrator s.md' }));` ersetzen durch `prompt: '/dv-forge:plan-orchestrator s.md --debug' }));`, sonst wiese der Hook den Befehl ab.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/entry-guard.test.js"` — erwartet: FAIL mit `Cannot find module '../scripts/lib/entry-guard'`
- [ ] **Schritt 3: Hook, Beschreibungen und Argumente umstellen**
  Neue Datei `plugins/forge/scripts/lib/entry-guard.js`:
  ```js
  'use strict';

  // Sperre für den Startbefehl: Ein Mensch betritt dv-forge nur über /dv-forge:session-orchestrator. Tippt er den Befehl eines Unter-Skills,
  // weist der Hook auf getippte Befehle (UserPromptSubmit) ihn ab, außer er hängt `--debug` an. Der Hook schreibt und ändert nichts.
  // Aufrufe über das Skill-Werkzeug (Etappen-Sessions, Orchestratoren) laufen über PreToolUse und kommen hier nie vorbei; ein Brief einer
  // Etappen-Session beginnt zwar mit einem Slash-Befehl, ist aber kein getippter Befehl und passiert.
  // Probe-Lauf: Ein getippter Plugin-Befehl kommt unverändert an, mit Präfix als `/dv-forge:<name> <args>`, ohne als `/<name> <args>`.
  // Die Liste der Unter-Skills steht nur hier; `init`, `commit-message`, `domain-modeling`, `merge-conflict-resolution` und der Startbefehl fehlen mit Absicht.

  const { briefOf } = require('./stage-guard');

  const START_COMMAND = '/dv-forge:session-orchestrator';
  const DEBUG_SWITCH = '--debug';
  const SUB_SKILLS = [
    'spec-whiteboarding', 'spec-whiteboarding-with-docs', 'spec-grilling', 'spec-review', 'spec-review-orchestrator',
    'plan-writing', 'plan-review', 'plan-orchestrator', 'implementation', 'implementation-review', 'implementation-orchestrator',
    'review-followup', 'start-work', 'finish-work',
  ];
  const COMMAND = /^\/(?:dv-forge:)?([a-z][a-z-]*)$/;

  // Name des Unter-Skills, den der Prompt als Befehl aufruft; sonst null.
  function subSkillOf(prompt) {
    const [first = ''] = String(prompt ?? '').trim().split(/\s+/);
    const name = COMMAND.exec(first)?.[1];
    return SUB_SKILLS.includes(name) ? name : null;
  }

  // Begründung der Abweisung oder null, wenn der Prompt passieren darf.
  function blockedEntry(prompt) {
    const name = subSkillOf(prompt);
    if (!name || briefOf(prompt)) return null;
    if (String(prompt).trim().split(/\s+/).includes(DEBUG_SWITCH)) return null;
    return `dv-forge: /dv-forge:${name} ist ein interner Unter-Skill. Starte dv-forge mit ${START_COMMAND}. Zum Debuggen hängst du ${DEBUG_SWITCH} an.`;
  }

  module.exports = { START_COMMAND, DEBUG_SWITCH, SUB_SKILLS, subSkillOf, blockedEntry };
  ```
  In `plugins/forge/scripts/guard-orchestrator.js` nach der Zeile `const PLUGIN_ROOT = path.resolve(__dirname, '..');` die Zeile `const { blockedEntry } = require('./lib/entry-guard');` einfügen und in `main` die Zeile `  if (event === 'prompt') return onPrompt(input);` ersetzen durch:
  ```js
    if (event === 'prompt') {
      const blocked = blockedEntry(input.prompt);
      return blocked ? writeBlock(blocked) : onPrompt(input);
    }
  ```
  In den Dateien `skills/<name>/SKILL.md` der 14 Unter-Skills (`spec-whiteboarding`, `spec-whiteboarding-with-docs`, `spec-grilling`, `spec-review`, `spec-review-orchestrator`, `plan-writing`, `plan-review`, `plan-orchestrator`, `implementation`, `implementation-review`, `implementation-orchestrator`, `review-followup`, `start-work`, `finish-work`) an das Ende der einen Zeile `description: …` im Kopf anhängen: ` Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.` (mit führendem Leerzeichen, ohne Doppelpunkt und Leerzeichen, weil ein strenger YAML-Parser ihn im unquotierten Wert ablehnt).
  In `plugins/forge/skills/plan-writing/SKILL.md` die Zeile ``Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` `` ersetzen durch ``Argumente: `$ARGUMENTS` (`--debug` ist kein Argument) · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` `` (ohne das Leerzeichen vor dem schließenden Backtick) und in `plugins/forge/skills/spec-grilling/SKILL.md` die Zeichenfolge ``$ARGUMENTS`: `<S>` Spec. `<PLUGIN>` `` ersetzen durch ``$ARGUMENTS`: `<S>` Spec, `--debug` ist kein Argument. `<PLUGIN>` ``.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/entry-guard.test.js" "<R>/plugins/forge/tests/guard-orchestrator.test.js" "<R>/plugins/forge/tests/guard-run.test.js" "<R>/plugins/forge/tests/guard-turn-report.test.js" "<R>/plugins/forge/tests/hooks.test.js" "<R>/plugins/forge/tests/stage-guard.test.js" "<R>/plugins/forge/tests/plan-writing.test.js" "<R>/plugins/forge/tests/spec-grilling.test.js" "<R>/plugins/forge/tests/spec-whiteboarding.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/entry-guard.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/entry-guard.test.js plugins/forge/tests/guard-run.test.js plugins/forge/skills/spec-whiteboarding/SKILL.md plugins/forge/skills/spec-whiteboarding-with-docs/SKILL.md plugins/forge/skills/spec-grilling/SKILL.md plugins/forge/skills/spec-review/SKILL.md plugins/forge/skills/spec-review-orchestrator/SKILL.md plugins/forge/skills/plan-writing/SKILL.md plugins/forge/skills/plan-review/SKILL.md plugins/forge/skills/plan-orchestrator/SKILL.md plugins/forge/skills/implementation/SKILL.md plugins/forge/skills/implementation-review/SKILL.md plugins/forge/skills/implementation-orchestrator/SKILL.md plugins/forge/skills/review-followup/SKILL.md plugins/forge/skills/start-work/SKILL.md plugins/forge/skills/finish-work/SKILL.md` · `git commit -m "feat(forge): hook rejects typed sub-skill commands without debug switch"`

---
### Task 12: README und Prüftest sichern Einmaligkeit und Startbefehl ab

**ACs:** AC-04, AC-08, AC-11, AC-12, AC-15

**Dateien:**
- Modify: `plugins/forge/README.md:5-70` · `## Ablauf`
- Modify: `plugins/forge/tests/lib/former-names.js` · `FORMER_EMBEDDED_SECTION`
- Modify: `plugins/forge/tests/spec-review-orchestrator.test.js` · `specReviewOrchestrator_Body_ChainsReviewThenFollowupWithoutReportParameters`
- Modify: `plugins/forge/tests/plan-orchestrator.test.js` · `planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithoutReportParameters`
- Modify: `plugins/forge/tests/implementation-orchestrator.test.js` · `implementationOrchestrator_Body_ChainsTheFourSkillsInOrderWithoutReportParameters`
- Test: `plugins/forge/tests/session-chain-readme.test.js:30-40` · `readme_Ablage_NamesOptionPlaceAndUnchangedDefault`
- Create: `plugins/forge/tests/plugin-single-source.test.js`

**Interfaces:**
- Consumes: `SUB_SKILLS`, `START_COMMAND` aus plugins/forge/scripts/lib/entry-guard.js (Task 11); shared/orchestrator-rules.md und `maxFollowups` (Task 2); `FORMER_REPORT_OPTION`, `FORMER_ABLAGE_OPTION`, `FORMER_EMBEDDED_SECTION` aus plugins/forge/tests/lib/former-names.js (Task 7)
- Produces: `FORMER_ROUND_WORDINGS: string[]` in plugins/forge/tests/lib/former-names.js (Wortlaute, mit denen früher das Followup-Maximum im Text stand, nur zerlegt im Quelltext); plugins/forge/tests/plugin-single-source.test.js prüft über alle Textdateien des Plugins, dass weder `--bericht` noch `eingebettet` vorkommt (AC-04), dass jede Regel der Regeldatei (Zeilen unter `Git-Verbote` und `Ausgabe`, Gedanken der Tabelle `Rote Flaggen`) nur in shared/orchestrator-rules.md steht (AC-11) und dass der Wert des Followup-Maximums nur dort gesetzt ist und keine Datei einen der früheren Wortlaute enthält (AC-12); README.md nennt den Startbefehl, `--debug`, die Werkzeuge ohne Etappe, in der Tabelle je Skill die Spalte `Aufruf` (`intern`, `Startbefehl` oder `von Hand`), die drei Abschnitte des Abschlussberichts und die Ablage als einen Datenkanal

Dies ist die letzte Task: Sie bringt die README in Einklang mit allen Tasks davor und sichert die Zusagen von Teil A mechanisch ab. Der Prüftest baut alle Suchmuster aus Teilstrings und liest die Regeln selbst aus der Regeldatei; er findet sich nicht selbst, und die früheren Namen stehen auch in keinem anderen Test im Klartext (Task 7 und 8 bauen sie mit `former-names.js`; diese Task ergänzt die Wortlaute des Followup-Maximums dort). Bleibt ein früherer Name irgendwo stehen, nennt die Fehlermeldung die Datei. Die Spalte `Aufruf` der README kennzeichnet die 14 Unter-Skills als `intern` und verweist im Absatz `Startbefehl` auf `/dv-forge:session-orchestrator`; die Beschreibungen tragen denselben Hinweis seit Task 11. Der Schluss-Schritt dieser Task läuft die ganze Test-Suite, weil AC-15 `alle Tests grün` verlangt.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben und anpassen**
  Neue Datei `plugins/forge/tests/plugin-single-source.test.js`:
  ```js
  'use strict';

  // Sichert mechanisch ab, was Teil A der Vereinfachung zusagt: Die Namen der früheren Doppel-Betriebsart stehen nirgends im Plugin
  // (AC-04), die Regeln der Orchestratoren stehen in genau einer Datei (AC-11) und das Maximum der Followup-Runden an genau einer
  // Stelle (AC-12). Die Suchmuster entstehen aus Teilstrings: Der Test findet sich nicht selbst, und die Namen stehen im Klartext
  // auch in keinem anderen Test.

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { FORMER_ROUND_WORDINGS } = require('./lib/former-names');

  const ROOT = path.join(__dirname, '..');
  const RULES = path.join(ROOT, 'shared', 'orchestrator-rules.md');
  const SKIPPED_DIRS = new Set(['node_modules', '.git']);
  const TEXT_FILE = /\.(?:js|md|json|ya?ml|txt)$/i;

  function pluginFiles(dir = ROOT) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return SKIPPED_DIRS.has(entry.name) ? [] : pluginFiles(full);
      return TEXT_FILE.test(entry.name) ? [full] : [];
    });
  }

  const FILES = pluginFiles().map((file) => ({ file, rel: path.relative(ROOT, file).replace(/\\/g, '/'), text: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') }));
  const RULES_REL = path.relative(ROOT, RULES).replace(/\\/g, '/');

  function filesWith(needle, { ignoreCase = false } = {}) {
    const wanted = ignoreCase ? needle.toLowerCase() : needle;
    return FILES.filter(({ text }) => (ignoreCase ? text.toLowerCase() : text).includes(wanted)).map(({ rel }) => rel);
  }

  test('plugin_Files_AreFound', () => {
    assert.ok(FILES.length > 100, `nur ${FILES.length} Dateien`);
    assert.ok(FILES.some(({ rel }) => rel === RULES_REL));
  });

  test('plugin_NoFile_NamesTheFormerReportOptionOrTheEmbeddedRun', () => {
    // Arrange
    const patterns = [['--', 'ber', 'icht'].join(''), ['einge', 'bettet'].join('')];

    // Act
    const hits = patterns.map((pattern) => [pattern, filesWith(pattern, { ignoreCase: true })]);

    // Assert
    for (const [pattern, files] of hits) assert.deepEqual(files, [], `${pattern} steht in ${files.join(', ')}`);
  });

  // Regeln der Orchestratoren aus der Regeldatei: je Zeile unter Git-Verbote und Ausgabe der Text, je Zeile der Tabelle Rote Flaggen der Gedanke.
  function ruleTexts() {
    const lines = fs.readFileSync(RULES, 'utf8').replace(/\r\n/g, '\n').split('\n');
    const rules = [];
    let section = null;
    for (const line of lines) {
      if (line.startsWith('## ')) section = line.slice(3).trim();
      else if (['Git-Verbote', 'Ausgabe'].includes(section) && line.startsWith('- ')) rules.push(line.slice(2).trim());
      else if (section === 'Rote Flaggen' && line.startsWith('| ') && !line.startsWith('| Gedanke') && !line.startsWith('|---')) rules.push(line.split('|')[1].trim());
    }
    return rules;
  }

  test('rulesFile_Rules_AreFoundForGitBansOutputAndRedFlags', () => {
    const rules = ruleTexts();
    assert.ok(rules.length >= 12, `nur ${rules.length} Regeln`);
  });

  test('plugin_EveryRuleOfTheRulesFile_StandsInExactlyThatFile', () => {
    for (const rule of ruleTexts()) {
      // Act
      const files = filesWith(rule);

      // Assert
      assert.deepEqual(files, [RULES_REL], `${rule} steht in ${files.join(', ')}`);
    }
  });

  test('orchestratorSkillsAndBrief_Rules_PointToTheRulesFile', () => {
    for (const file of ['skills/spec-review-orchestrator/SKILL.md', 'skills/plan-orchestrator/SKILL.md', 'skills/implementation-orchestrator/SKILL.md']) {
      const text = FILES.find(({ rel }) => rel === file).text;
      assert.ok(text.includes('Lies `<PLUGIN>/shared/orchestrator-rules.md` und befolge es'), file);
    }
    assert.ok(FILES.find(({ rel }) => rel === 'shared/session-chain/base-sub-agent.md').text.includes('{{PLUGIN}}/shared/orchestrator-rules.md'));
    assert.ok(FILES.find(({ rel }) => rel === 'README.md').text.includes('`shared/orchestrator-rules.md`'));
  });

  test('plugin_MaximumOfFollowupRounds_IsSetInExactlyOnePlace', () => {
    // Arrange
    const setting = new RegExp(['Maximum Followup', '-Runden: [0-9]'].join(''), 'g');
    const wordings = FORMER_ROUND_WORDINGS;

    // Act
    const settingFiles = FILES.filter(({ text }) => new RegExp(setting.source).test(text)).map(({ rel }) => rel);
    const wordingHits = wordings.map((wording) => [wording, filesWith(wording, { ignoreCase: true })]);

    // Assert
    assert.deepEqual(settingFiles, [RULES_REL]);
    assert.equal((FILES.find(({ rel }) => rel === RULES_REL).text.match(setting) ?? []).length, 1, 'die Regeldatei setzt den Wert genau einmal');
    for (const [wording, files] of wordingHits) assert.deepEqual(files, [], `${wording} steht in ${files.join(', ')}`);
  });
  ```
  In `plugins/forge/tests/session-chain-readme.test.js` diese Änderungen vornehmen:
  1. Nach der Zeile `const { readText } = require('./lib/markdown');` die Zeile `const { SUB_SKILLS, START_COMMAND } = require('../scripts/lib/entry-guard');` einfügen.
  2. Den Test `readme_Ablage_NamesOptionPlaceAndUnchangedDefault` (vom `test(`-Aufruf bis zur schließenden `});`) ersetzen durch:
  ```js
  test('readme_Ablage_NamesTheOneDataChannelAndItsPlace', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes('Die Ablage ist der eine Datenkanal zwischen Etappe und Leit-Session und immer eingeschaltet'));
    assert.ok(text.includes('`<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/`'));
  });
  ```
  3. Am Ende der Datei einfügen:
  ```js

  test('readme_StartCommand_NamesTheOnlyEntryTheDebugSwitchAndTheTools', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes(`**Startbefehl:** dv-forge betritt man nur über \`${START_COMMAND}\``));
    assert.ok(text.includes('Zum Debuggen hängt man `--debug` an'));
    assert.ok(text.includes('`init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe und bleiben von Hand aufrufbar.'));
  });

  test('readme_SkillTable_MarksEverySubSkillAsInternAndTheOthersNot', () => {
    // Arrange
    const rows = readText(README).split('\n').filter((line) => line.startsWith('| `'));
    const rowOf = (name) => rows.find((line) => line.split('|')[1].split(',').map((cell) => cell.trim()).includes(`\`${name}\``));

    // Assert
    for (const name of SUB_SKILLS) assert.ok(rowOf(name)?.endsWith('| intern |'), `${name}: ${rowOf(name)}`);
    assert.ok(rowOf('session-orchestrator').endsWith('| Startbefehl |'));
    for (const name of ['init', 'commit-message', 'domain-modeling', 'merge-conflict-resolution']) assert.ok(rowOf(name).endsWith('| von Hand |'), name);
  });

  test('readme_Orchestrators_EndWithThreeSectionsAndReviewsPrintOnlyTheStatusLine', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes('Alle drei Orchestratoren enden mit genau einem Abschlussbericht in drei Abschnitten'));
    assert.ok(text.includes('Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>'));
    assert.equal(text.includes('Wie es weitergeht'), false);
  });
  ```
  In `plugins/forge/tests/lib/former-names.js` die Zeile `module.exports = { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION };` ersetzen durch:
  ```js
  // Wortlaute, mit denen früher das Maximum der Followup-Runden im Text stand; es steht nur noch in der Regeldatei.
  const FORMER_ROUND_WORDINGS = [
    ['höchstens ', 'zwei Followup'], ['bis zu ', 'zwei Followup'], ['Nie eine ', 'dritte'],
    ['Dritte Followup', '-Runde'], ['zwei', 'mal nacharbeiten'], ['zwei Followup', '-Runden'],
  ].map((parts) => parts.join(''));

  module.exports = { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION, FORMER_ROUND_WORDINGS };
  ```
  In den drei Orchestrator-Tests `plugins/forge/tests/spec-review-orchestrator.test.js`, `plugins/forge/tests/plan-orchestrator.test.js` und `plugins/forge/tests/implementation-orchestrator.test.js` jeweils die Zeile `const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');` ersetzen durch `const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_ROUND_WORDINGS } = require('./lib/former-names');` und die Schleife `for (const gone of [...])`, die `'höchstens zwei'` und `'Nie eine dritte'` im Klartext nennt, so ändern:
  1. In `spec-review-orchestrator.test.js` (Test `specReviewOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndCommitsOnlyAfterTheLastOne`) die Liste `['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json']` ersetzen durch `[...FORMER_ROUND_WORDINGS, 'bericht-followup-1.json', 'bericht-followup-2.json']`; im Test `specReviewOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags` aus der Liste `['EnterWorktree', '## Rote Flaggen', 'Wünsche des Menschen', 'Dritte Followup-Runde']` den Eintrag `'Dritte Followup-Runde'` entfernen.
  2. In `plan-orchestrator.test.js` (Test `planOrchestrator_Body_RunsFollowupRoundsUpToTheRulesFileMaximumAndStopsOnAbortOrWarning`) die Liste `['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json', 'Dritte Followup-Runde']` ersetzen durch `[...FORMER_ROUND_WORDINGS, 'bericht-followup-1.json', 'bericht-followup-2.json']`.
  3. In `implementation-orchestrator.test.js` (Test `implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTheRulesFileMaximum`) die Liste `['höchstens zwei', 'Nie eine dritte', 'bericht-followup-1.json', 'bericht-followup-2.json']` ersetzen durch `[...FORMER_ROUND_WORDINGS, 'bericht-followup-1.json', 'bericht-followup-2.json']`; im Test `implementationOrchestrator_Body_ReadsTheRulesFileInsteadOfRepeatingGitBansAndRedFlags` aus der Liste `['## Rote Flaggen', 'Wünsche des Menschen', 'Dritte Followup-Runde', 'finish-work` gleich mit']` den Eintrag `'Dritte Followup-Runde'` entfernen.
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/plugin-single-source.test.js" "<R>/plugins/forge/tests/session-chain-readme.test.js"` — erwartet: FAIL, unter anderem `plugin_NoFile_NamesTheFormerReportOptionOrTheEmbeddedRun` (die README nennt die Parameter noch), `readme_StartCommand_NamesTheOnlyEntryTheDebugSwitchAndTheTools` und `readme_SkillTable_MarksEverySubSkillAsInternAndTheOthersNot`
- [ ] **Schritt 3: README umstellen**
  `plugins/forge/README.md` komplett durch diesen Inhalt ersetzen:
  ````markdown
  # dv-forge

  Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

  **Startbefehl:** dv-forge betritt man nur über `/dv-forge:session-orchestrator`, auch mit fertiger Spec oder fertigem Plan mitten in der Kette; die Leit-Session führt durch die Etappen. Alle anderen Skills der Tabelle unten, die als `intern` stehen, sind Unter-Skills der Session-Kette: Ein Hook weist ihren getippten Befehl ab und nennt den Startbefehl. Zum Debuggen hängt man `--debug` an; der Unter-Skill läuft dann ohne Garantie für den Normalweg, mit Slug aus dem Pfad von Spec oder Plan und Etappe aus dem Namen des Skills. Etappen-Sessions rufen ihre Skills über das Skill-Werkzeug ohne `--debug` auf. Die Unter-Skills bleiben im Menü sichtbar, weil das Verbergen auch das Tippen mit `--debug` verhinderte. `init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe und bleiben von Hand aufrufbar.

  Die Regeln der Orchestratoren (Git-Verbote, Ausgabe, Rote Flaggen) und das Maximum der Followup-Runden stehen in `shared/orchestrator-rules.md`, an keiner anderen Stelle; Skills, Brief und diese README verweisen darauf.

  ## Ablauf

  1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie. `spec-review-orchestrator` verkettet `spec-review` mit den Followup-Runden (`review-followup`) und committet die Spec einmal im aktuellen Branch.
  2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn. `plan-orchestrator` verkettet beides samt den Followup-Runden in einem Lauf; er committet nicht.
  3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab. `implementation-orchestrator` verkettet `start-work`, `implementation` und `implementation-review` samt den Followup-Runden in einem Lauf und endet mit einem Abschlussbericht; der Worktree bleibt, `finish-work` ruft nur der Mensch, nichts wird gepusht.
  4. **Session-Kette:** `session-orchestrator` führt Whiteboarding, Grill (`spec-grilling`), Spec-Review, Planning, Plan-Review, Umsetzung und Abschluss je in einer eigenen Etappen-Session. Die Leit-Session startet die Etappen, prüft jedes `final` gegen git, hält am Spec- und am GO-Haltepunkt und führt den Zustand je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`: Ketten-Regeln und Gesprächsstil. Das Whiteboarding prüft seine Spec in derselben Etappen-Session mit dem Spec-Review-Orchestrator; jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session.

  **Spec-Format:** `scripts/spec-lint.js <spec.md>` prüft das Spec-Format ohne KI (Abschnitte, Kopf, lückenlose AC-IDs, Gegeben/wenn/dann, Beleg-Tags, W-Einträge, Abbruch). Whiteboarding und Grill rufen es nach dem Schreiben auf, der Spec-Review nutzt es als Skript-Prüfung (Formfehler 🔴, Kopf und Warnungen 🟡), und die Session-Kette hält bei Formfehlern nach Whiteboarding, Grill und Spec-Nacharbeit.

  **Prüfläufe:** `scripts/verify-run.js --repo <R>` führt `Build`, `Test` und `Lint` aus den Projekt-Einstellungen aus und schreibt Exit-Codes, Ausgabe-Ende und HEAD als JSON (`ergebnis` gruen, rot, docker oder keine). `finish-work`, der Implementierungs-Orchestrator, der Abschluss der Umsetzung (Zeile `Gesamtlauf:`) und der Implementierungs-Review nutzen es statt eigener Läufe. `scripts/implementation-checks.js` gleicht dort zusätzlich die Dateien des Plans mit dem Diff ab (geplant, aber nicht geändert: 🔴; ungeplant geändert: 🟡) und liefert das Ergebnis als Reviewer `skript`.

  **Messdaten:** Jeder Spec-, Plan- und Implementierungs-Review hängt eine Zeile an `<git-common-dir>/dv-forge/metrics/reviews.jsonl` (Farben je Runde, verworfene Findings, Nacharbeit, Fragen, Ausfälle, Nachforderungen, Belege je Reviewer). Jeder Sub-Agent (nicht nur dv-forge) hängt beim Ende eine Zeile an `<git-common-dir>/dv-forge/metrics/agents.jsonl` (`agent_type`, `agent_id`, `tokens` mit `input`, `cached`, `output`, `dauerMs` vom ersten bis letzten Zeitstempel des Transkripts, `toolAufrufe`). Die Session-Kette schreibt je Slug `events.jsonl` neben `zustand.json` (Start, final mit Dauer und offenen Punkten, Haltepunkt, Antwort, Commit, Schluss). dv-forge liefert nur die Rohdaten; die Auswertung gehört nach `toolbelt`.

  **Golden-Sets:** `evals/` hält je Review einen Fall mit eingebauten Mängeln und den Befunden, die gefunden werden sollen. `scripts/eval-review.js` misst Läufe daraus (Recall, Precision, Belegquote, Stabilität über mehrere Läufe), siehe `evals/README.md`.

  **Nacharbeit-Werkzeuge:** `implementation-report.js followup` legt den Bericht eines Implementierungs-Followups in die Ablage und gibt `ENDE`, `STATUSZEILE` und `BEHALTEN` aus. Die Prüfung nach Grill und Spec-Nacharbeit vergleicht die Spec mit der Kopie `spec-vor-<etappe>.md` vom Etappenstart, `spec-commit.js` committet die Spec des Spec-Reviews, und `review-flow.js report` legt Bericht und Bericht-Daten in die Ablage und gibt `ENDE` und `STATUSZEILE` aus. Die fünf Implementierungs-Reviewer vergeben nur Kategorien (`scripts/lib/implementation-categories.js`), die Farbe setzt der Code; `implementation-verdict.js` liest das Urteil aus ihrem Bericht. `verify-run.js --basis` hält den Basis-Lauf vor Task 1 fest, `ledger.js check|next|tdd` prüft das Ledger, nennt den nächsten Schritt und weist auf Tests nach dem Produktivcode hin. `spec-lint.js --runde` prüft die Form einer Grill-Runde, die Skript-Prüfung `spec-terms` meldet verworfene Synonyme des Glossars, `spec-path.js` bestimmt den Zielpfad der Spec beim Whiteboarding, und `implementation-checks.js` liefert zusätzlich mechanische Code-Hinweise (verschluckte Fehler, Secret-Muster, sehr große Zuwächse) als 🟡.

  Alle drei Orchestratoren enden mit genau einem Abschlussbericht in drei Abschnitten (`# Abschlussbericht`, `# Was sich … geändert hat`, `# Was ist noch offen`); er nennt keinen nächsten Schritt, die Leit-Session entscheidet über den Fortgang. Review und Followup zeigen keinen Bericht, sondern geben als einzige Ausgabe ihre Review-Statuszeile aus: `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>`. `orchestrator-report.js` setzt den Endstand aus den Bericht-Daten in der Ablage zusammen; `orchestrator-state.js ablage` nennt die Dateien des Laufs.

  Eine Followup-Runde startet, sobald das Review einen Followup anbietet (`FOLLOWUP ja`), unabhängig von ✅, ⛔ oder ❓; nur ⚠️ und ein Abbruch stoppen. Das Maximum der Runden je Lauf steht in `shared/orchestrator-rules.md`. 🟢 arbeitet keine Runde ein; sie stehen nur im Abschlussbericht unter `Was ist noch offen`.

  Jeder Orchestrator vermerkt am Ende einen **Ketten-Eintrag** je Slug (Stufe, Spec, Plan, Workitem, Worktree, Branch) mit `scripts/chain.js`, abgelegt unter `<git-common-dir>/dv-forge/chain/`, gemeinsam für den Haupt-Checkout und alle Worktrees; `finish-work` entfernt den Eintrag. Berichte nennen ihn nicht als Empfehlung.

  Die Ablage ist der eine Datenkanal zwischen Etappe und Leit-Session und immer eingeschaltet: Review und Followup legen Bericht und Bericht-Daten unter `<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/` ab, die Orchestratoren ihren Abschlussbericht, gemeinsam für den Haupt-Checkout und alle Worktrees. Slug und Etappe legt `prepare.js` fest; ein neues Review beginnt die Ablage seiner Etappe neu. Bericht-Daten im Format der früheren Doppel-Betriebsart liest keine Etappe und migriert niemand: Sie zählen als fehlende Voraussetzung.

  ## Skills

  | Skill | Wofür | Aufruf |
  |---|---|---|
  | `init` | dv-forge in einem Projekt einrichten, insbesondere den dv-forge-Abschnitt der Projekt-`CLAUDE.md` | von Hand |
  | `spec-whiteboarding`, `spec-whiteboarding-with-docs` | Aus Anfrage oder Idee eine Spec erarbeiten | intern |
  | `spec-review`, `plan-review`, `implementation-review` | Review durch parallele Reviewer, ein Rework, eine Verifikation | intern |
  | `review-followup` | Gewählte Scout-Vorschläge aus einem Review umsetzen | intern |
  | `spec-review-orchestrator` | Spec prüfen, nacharbeiten und committen in einem Lauf; kein Worktree, kein Branch-Wechsel | intern |
  | `plan-writing` | Spec in Plan überführen | intern |
  | `plan-orchestrator` | Plan schreiben, prüfen und nacharbeiten in einem Lauf; kein Commit, die Spec bleibt unverändert | intern |
  | `start-work`, `implementation`, `finish-work` | Arbeit vorbereiten, umsetzen, abschließen | intern |
  | `implementation-orchestrator` | Umsetzen, prüfen und nacharbeiten in einem Lauf; Worktree bleibt, `finish-work` ruft nur der Mensch, Plan und Spec bleiben unverändert, kein Push | intern |
  | `spec-grilling` | Geschriebene Spec auf Grenzfälle, Widersprüche und Lücken prüfen; W-Einträge gelten als beantwortet | intern |
  | `session-orchestrator` | Session-Kette führen: jede Etappe in eigener Session, Haltepunkte, Prüfung gegen git, Schlussbericht | Startbefehl |
  | `domain-modeling` | Unscharfe oder widersprüchliche Fachbegriffe klären, ADRs anstoßen | von Hand |
  | `merge-conflict-resolution` | Gestoppten Merge oder Rebase auflösen | von Hand |
  | `commit-message` | Commit-Message im Conventional-Commits-Stil schreiben (Text ausgeben, nicht committen); `init` trägt ihn als `Commit-Konvention` ein | von Hand |

  Das Modell darf alle Skills außer `init` selbst aufrufen, auch aus Sub-Agenten, damit ein Orchestrator Review-, Plan- und Umsetzungsabläufe verketten kann. `init` trägt `disable-model-invocation: true`, weil es einen Dialog mit dem Nutzer führt. Der Startbefehl und die Werkzeuge ohne Etappe sind die einzigen Skills, die der Nutzer ohne `--debug` selbst tippt.

  ## Agents

  Unter [`agents/`](agents) liegen die Spezialisten der Review-Loops, gruppiert nach Stufe:

  - `spec-review-*`, `spec-rework`
  - `plan-review-*`, `plan-rework`
  - `implementation-*` (Implementer, Task-Reviewer, Re-Reviewer, Final-Reviewer) und `implementation-review-*`

  Jede Stufe hat einen `*-scout`, der für offene Findings konkrete Lösungsvorschläge macht.

  ## Einrichten

  ```text
  /plugin install dv-forge@dv-ai-development
  ```

  Danach im Projekt `/dv-forge:init` ausführen.
  ````
- [ ] **Schritt 4: Tests grün laufen lassen, danach die ganze Suite**
  Befehl: `node --test "<R>/plugins/forge/tests/plugin-single-source.test.js" "<R>/plugins/forge/tests/session-chain-readme.test.js" "<R>/plugins/forge/tests/spec-review-orchestrator.test.js" "<R>/plugins/forge/tests/plan-orchestrator.test.js" "<R>/plugins/forge/tests/implementation-orchestrator.test.js" "<R>/plugins/forge/tests/agent-metrics.test.js" "<R>/plugins/forge/tests/retro-moved.test.js"` — erwartet: PASS
  Befehl: `node --test "<R>/plugins/forge/tests/*.test.js"` — erwartet: PASS (alle Tests grün, `fail 0`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/README.md plugins/forge/tests/plugin-single-source.test.js plugins/forge/tests/session-chain-readme.test.js plugins/forge/tests/lib/former-names.js plugins/forge/tests/spec-review-orchestrator.test.js plugins/forge/tests/plan-orchestrator.test.js plugins/forge/tests/implementation-orchestrator.test.js` · `git commit -m "docs(forge): readme names the start command and a test guards the single sources"`

---
## Entscheidungen
- **W · Commit in plan-review** · Aussage — `plan-review` committet nichts und stellt keine Commit-Frage; Spec und Plan committet die Leit-Session beim GO.
- **E · Etappe eines Reviews** · Planer — `prepare.js` legt die Etappe fest: ausdrücklich `whiteboarding` bei `--whiteboarding`, sonst die laufende Etappe der Kette (`gestartet.etappe`), sonst die Etappe, die zum Namen des Skills passt (`etappe-of.js`). So braucht kein Skript einen Parameter für Etappe oder Ablage, und `--debug` ohne Kette ergibt Slug aus dem Pfad und Etappe aus dem Skill-Namen (AC-07).
- **E · Format 2** · Planer — Bericht-Daten der Ablage tragen `format: 2`; jede Datei ohne diesen Wert gilt als Altformat und wird mit `Ablage im alten Format: <datei>` abgelehnt, nicht gelesen und nicht migriert (AC-18). Die Etappe meldet das über Regel 10 des Basis-Prompts als `STATUS=needs-user`.
- **E · Umbenennung der Bericht-Parameter von session-chain.js** · Planer — AC-04 verlangt, dass `--bericht` im ganzen Plugin nicht vorkommt, also trägt `session-chain.js etappe-report` den Inhalt jetzt als `--inhalt <datei>` und `session-chain.js final` die Berichtsdatei der Etappe als `--etappenbericht <datei>`. Jeder andere Parameter endet mit `unbekannter Parameter: <name>` (AC-05).
- **E · Dateien des Reviews im Arbeitsbereich** · Planer — `prepare.js` schreibt `etappe`, `ablage` und `artifact` in `<W>/kontext.json` und gibt keine Zeile `ablage=` mehr aus; Review- und Followup-Skripte lesen den Ablage-Ordner mit `ablageOf(workspace)`. Ein neues Review (nicht das Followup) leert die Ablage seiner Etappe schon in `prepare.js`, damit ein gescheitertes Review keine Dateien eines früheren Laufs hinterlässt.
- **E · Review-Statuszeile nennt die .md-Datei** · Planer — `Bericht: <ablage-datei>` ist die Markdown-Datei des Berichts; die Bericht-Daten liegen daneben mit gleichem Namen und der Endung `.json`.
- **E · Baseline-Fix als Task 1** · Planer — Die Baseline war rot, weil `spec-commit.js preflight` eine Spec über einen Verzeichnis-Link mit 8.3-Pfad nicht erkannte; die Vorbedingung `plugins/forge` sauber und alle Tests grün braucht den Fix vor allen anderen Tasks.
- **E · AC-13 und der Chat-Bericht der Leit-Session** · Planer — Der Chat-Bericht der Leit-Session besteht aus dem Abschlussbericht der Orchestratoren; der Abschnitt `Wie es weitergeht` entfällt dort in `orchestrator-report-text.js`, sonst bleiben dieselben Abschnitte. Die Pflichttext-Prüfung (`REPORT_HEADINGS`) kennt die Überschrift nicht mehr; ein vollständiger Bericht passiert, ein gekürzter wird zurückgewiesen (AC-14, Test in `guard-turn-report.test.js`).
- **E · Orchestrator-Bericht ohne Fakten-Parameter** · Planer — `orchestrator-report.js` kennt nur `--art`, `--review`, `--followup`, `--out`, `--fakten` und `--abbruch`; `--commit`, `--stand`, `--worktree`, `--branch`, `--pruefung`, `--wi`, `--ohne-weiter`, `--spec` und `--plan` dienten nur dem Abschnitt `Wie es weitergeht`. Der Commit der Spec, der Feature-Branch und das Prüfergebnis stehen als Faktenzeilen in der Datei `<FK>`, die der Orchestrator schreibt.
- **E · Dateinamen des Orchestrators** · Planer — `orchestrator-state.js ablage` nennt `BERICHT-REVIEW`, `BERICHT-FOLLOWUP-<n>` (n bis zum Maximum der Regeldatei) und `ABSCHLUSS` aus der Ablage der Etappe; der Orchestrator leitet keinen Dateinamen selbst ab. Der Befehl `session-chain.js store` entfällt, weil Review und Orchestrator selbst in die Ablage schreiben.
- **E · Regeldatei** · Planer — `shared/orchestrator-rules.md` führt Followup-Maximum, Git-Verbote, Commits, Ausgabe und Rote Flaggen der drei Orchestratoren; `maxFollowups()` liest den Wert, alle anderen Stellen verweisen. Der Prüftest liest die Regeln aus der Datei und verlangt, dass sie in keiner zweiten Datei stehen.
- **E · Hook** · Planer — Die Probe (`claude -p` mit Probe-Plugin) zeigt: Ein getippter Plugin-Befehl erreicht `UserPromptSubmit` unverändert, mit Präfix als `/dv-forge:<name> <args>`, ohne als `/<name> <args>`; ein Aufruf durch das Modell erzeugt `PreToolUse` mit `tool_name` `Skill`. Das Muster akzeptiert deshalb beide Schreibweisen, die Sperre sitzt im bestehenden Hook `guard-orchestrator.js prompt` vor allem, was dieser Hook schreibt, und der Brief einer Etappen-Session (erkannt an der Briefzeile) passiert.
- **E · Scope von AC-05** · Planer — Gemeint sind die Skripte, die `--bericht` oder `--ablage` früher annahmen: `prepare.js`, `review-flow.js`, `implementation-report.js` (beide Modi) und `session-chain.js`; ihre Tests übergeben die Namen aus Teilstrings. `orchestrator-report.js` meldet jeden unbekannten Parameter ebenfalls als `unbekannter Parameter`.
- **E · Werkzeuge ohne Etappe** · Planer — `init` bietet weiter einen Commit an, weil es ein Werkzeug ohne Etappe ist und kein Unter-Skill; `start-work` committet dagegen nicht mehr und bietet nichts an, `finish-work` und `spec-grilling` blieben unverändert, weil sie schon nur ihr Ergebnis ausgeben.
- **E · Beschreibung der Unter-Skills** · Planer — Der Zusatz ` Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.` enthält keinen Doppelpunkt mit Leerzeichen, weil ein strenger YAML-Parser ihn im unquotierten Wert ablehnt.
- **E · Parser der Argumente der Unter-Skills** · Planer — `plan-writing` und `spec-grilling` lesen `$ARGUMENTS` selbst und nennen `--debug` ausdrücklich als Nicht-Argument; alle anderen Unter-Skills reichen die Argumente an `prepare.js` weiter, das `--debug` annimmt.
- **E · Prototyp-Validierung** · Planer — Der Plan wurde Task für Task gegen eine Kopie von `plugins/forge` auf dem Stand der Basis umgesetzt; nach jeder Task lief die ganze Suite grün (2073 Tests am Ende), die Aussagen über Zeilen und Anker des Plans wurden gegen den jeweiligen Stand mechanisch geprüft.
