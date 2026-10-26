# Session-Kette: Spec-Review im Whiteboarding und Meldung per Nachricht — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-10-26-session-kette-whiteboarding-review/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die Whiteboarding-Etappe prüft ihre Spec selbst mit dem Spec-Review-Orchestrator, jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session, und im Whiteboarding-Teil committet nur die Leit-Session.
**Architektur:** Die Session-Kette bleibt ein Node-CLI (`session-chain.js`) mit reinen Bibliotheken unter `scripts/lib/`, Skill-Texten und dem gemeinsamen Etappen-Text `base-sub-agent.md`. Neu sind der Befehl `review-stand` (Stand des Reviews im Whiteboarding), der Commit-Anlass `whiteboarding`, die Pflichtoption `--leit` für Briefe und eine Prüfung der Nachricht im Hook der Etappen-Session. Der Spec-Review-Orchestrator bekommt die Option `--whiteboarding` (kein Commit, Bericht ohne „Wie es weitergeht“).
**Tech-Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`), Git, Markdown-Skills des Plugins dv-forge
**Spec:** docs/forge/2026-10-26-session-kette-whiteboarding-review/spec.md
**Basis:** 432a4b5

## Global Constraints
- Tests laufen mit `node --test <datei>` im Ordner `<R>`; es gibt keine Projekt-`CLAUDE.md` mit anderen Vorgaben.
- In einer Session-Kette committen Whiteboarding und eingebettetes Spec-Review nichts. Ohne Session-Kette committet das Whiteboarding Spec und Glossar wie heute selbst.
- Das Spec-Review nach dem Grill committet die Spec weiterhin selbst.
- Das eingebettete Spec-Review gibt es nur in der Whiteboarding-Etappe einer Session-Kette; keine andere Etappe bekommt es.
- Das eingebettete Review läuft auf dem Modell der Whiteboarding-Etappe, Sonnet.
- Der Spec-Review-Orchestrator läuft im Whiteboarding vollständig, mit bis zu zwei Followup-Runden. Änderungen der Followup-Runden lösen kein weiteres eingebettetes Review aus.
- Der Mensch sieht den vollen Review-Bericht ohne den Abschnitt „Wie es weitergeht“ (nächste Schritte und Befehle).
- Die Abschlussfrage lautet „Spec abschließen“ oder „Weiter an der Spec arbeiten“. Sie kommt, sobald das Review mindestens einen Punkt meldet, gleich welcher Farbe, auch bei ⛔ und ❓.
- Ein Review mit ✅ und ohne jeden Punkt schließt die Etappe ohne Frage ab.
- Jede bestätigte Spec-Änderung nach dem ersten Review führt zu einem erneuten Review und danach zur Abschlussfrage; die Zahl der Schleifen ist nicht begrenzt.
- Beim Abschluss stehen die offenen Punkte aller Farben aus dem letzten Review im Zustand der Kette (`offen`) und im Brief des Grills.
- Der Brief jeder Etappe nennt die Leit-Session als Ziel der Nachricht.
- Die Etappen-Session startet keine Session und schickt außer der einen Nachricht zum `final` keine Nachricht.
- Kommt dasselbe `final` per Turn-Ende und per Nachricht an, verarbeitet die Leit-Session es genau einmal.
- Nach dem `final` des Whiteboardings committet die Leit-Session die Spec und die gemeldeten Glossar- und ADR-Dateien, auf Pfade beschränkt, nach der Commit-Konvention des Projekts, bevor sie den Grill startet.
- Die Leit-Session gibt bei `in-progress` genau die Zeile `<etappe>: läuft` aus und startet nichts.
- Bei `final` schickt jede Etappen-Session genau eine Nachricht an die Leit-Session; bei `in-progress` und `needs-user` keine.
- Die Nachricht enthält die Statuszeile und, wo die Etappe ihn kennt, den Pfad der Spec; sonst nur die Statuszeile. Übergabe-Hinweise, nächste Etappen oder Befehle enthält sie nicht.
- Scheitert die Nachricht, steht nach der Statuszeile genau die Zeile `Leit-Session nicht benachrichtigt: [Leit-Session](#<Kennung>)`; das Turn-Ende bleibt `final`.
- Die offenen Punkte im Brief des Grills stehen im Abschnitt `## Offene Punkte aus früheren Etappen` mit dem Satz „Prüf sie im Grill mit; sie gelten nicht als beantwortet.“ und je Punkt der Zeile `- <Icon> <Titel> · <Herkunft>`.
- Einzeln aufgerufen verhalten sich `spec-whiteboarding` und `spec-whiteboarding-with-docs` wie heute.
- Planungs-Skills: keine eingetragen.

---

### Task 1: Offene Punkte aus dem Whiteboarding und Stand des eingebetteten Reviews

**ACs:** AC-02, AC-03, AC-04, AC-06, AC-10

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-chain-points.js:13-45` · `openPoints`
- Modify: `plugins/forge/scripts/lib/session-chain-ablage.js:3-42` · `REVIEW_FILE`
- Create: `plugins/forge/scripts/lib/session-chain-review.js`
- Modify: `plugins/forge/scripts/session-chain.js:197` · `COMMANDS`
- Test: `plugins/forge/tests/session-chain-points.test.js` · `openPoints_RedAndGreen_KeepsOnlyYellowAndGreenYellowFirst`
- Create: `plugins/forge/tests/session-chain-review.test.js`
- Test: `plugins/forge/tests/session-chain-cli.test.js` · `store_FromWorktreeWithFresh_StoresInTheSharedAblage`

**Interfaces:**
- Consumes: —
- Produces: `reviewStand(spec: string) → { ergebnis: string|null, punkte: number, frage: boolean, abschluss: string }` in `scripts/lib/session-chain-review.js` (wirft `SessionChainError('Kein Spec-Review in der Ablage: …')`, wenn Review-Daten oder Abschlussbericht fehlen oder der Abschlussbericht älter ist als die Spec); `ABSCHLUSS_FILE = 'abschluss.md'` in `scripts/lib/session-chain-ablage.js`; CLI `node session-chain.js review-stand --spec <S>` mit den Zeilen `ERGEBNIS=…`, `PUNKTE=<n>`, `FRAGE=ja|nein`, `ABSCHLUSS=<pfad>`; `openPoints(parts, 'whiteboarding')` liefert zusätzlich 🔴; `pointLine({ farbe: 'red', … })` liefert `- 🔴 …`; `mergePoints(existing, 'spec-review', points)` ersetzt auch die Punkte mit Herkunft `whiteboarding`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/session-chain-points.test.js` nach dem Test `openPoints_RedAndGreen_KeepsOnlyYellowAndGreenYellowFirst` einfügen:
  ```js
  test('openPoints_WhiteboardingWithRedYellowAndGreen_KeepsAllRedFirst', () => {
    // Arrange
    const review = { open: [yellow('y', 'Gelb'), { key: 'r', color: 'red', title: 'Rot' }], green: [{ key: 'g', color: 'green', title: 'Grün' }] };

    // Act
    const points = openPoints([review], 'whiteboarding');

    // Assert
    assert.deepEqual(points.map((point) => point.farbe), ['red', 'yellow', 'green']);
  });

  test('mergePoints_SpecReviewAfterWhiteboarding_ReplacesWhiteboardingPoints', () => {
    // Arrange
    const existing = [{ farbe: 'red', titel: 'Lücke', key: 'l', herkunft: 'whiteboarding' }, { farbe: 'yellow', titel: 'Plan', key: 'p', herkunft: 'planning' }];

    // Act
    const merged = mergePoints(existing, 'spec-review', [{ farbe: 'yellow', titel: 'Neu', key: 'n', herkunft: 'spec-review' }]);

    // Assert
    assert.deepEqual(merged.map((point) => point.titel), ['Plan', 'Neu']);
  });

  test('pointLine_RedPoint_NamesRedIcon', () => {
    // Act
    const line = pointLine({ farbe: 'red', titel: 'Lücke', herkunft: 'whiteboarding' });

    // Assert
    assert.equal(line, '- 🔴 Lücke · whiteboarding');
  });
  ```
  Neue Datei `plugins/forge/tests/session-chain-review.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { makeRepo } = require('./lib/git-repo');
  const { storeFiles } = require('../scripts/lib/session-chain-ablage');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { reviewStand } = require('../scripts/lib/session-chain-review');

  const EMPTY_PART = { open: [], green: [], changes: [] };

  function scratch(name, text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-rs-')), name);
    fs.writeFileSync(file, text);
    return file;
  }

  function specIn(repo) {
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Spec\n');
    return spec;
  }

  // Repo mit Spec in docs/forge/x und dem Review im Whiteboarding in der Ablage; `parts`: Bericht-Daten je Dateiname.
  function reviewed(result, parts) {
    const repo = makeRepo();
    const spec = specIn(repo);
    const files = [scratch('abschluss.md', `# Abschlussbericht\n**Ergebnis:** ${result}\n`), ...Object.entries(parts).map(([name, value]) => scratch(name, JSON.stringify(value)))];
    storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files, fresh: true });
    return spec;
  }

  test('reviewStand_ReadyWithoutAnyPoint_AsksNoQuestion', () => {
    // Arrange
    const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': EMPTY_PART });

    // Act
    const stand = reviewStand(spec);

    // Assert
    assert.deepEqual([stand.ergebnis, stand.punkte, stand.frage], ['✅ Bereit zum Planen', 0, false]);
    assert.match(stand.abschluss, /\/ablage\/whiteboarding\/abschluss\.md$/);
  });

  test('reviewStand_ReadyWithOneGreen_AsksTheQuestion', () => {
    // Arrange
    const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': { ...EMPTY_PART, green: [{ key: 'g', color: 'green', title: 'Grün' }] } });

    // Act
    const stand = reviewStand(spec);

    // Assert
    assert.deepEqual([stand.punkte, stand.frage], [1, true]);
  });

  test('reviewStand_BlockedWithOneRed_AsksTheQuestion', () => {
    // Arrange
    const spec = reviewed('⛔ Blockiert', { 'bericht-review.json': { ...EMPTY_PART, open: [{ key: 'r', color: 'red', title: 'Rot' }] } });

    // Act
    const stand = reviewStand(spec);

    // Assert
    assert.deepEqual([stand.ergebnis, stand.punkte, stand.frage], ['⛔ Blockiert', 1, true]);
  });

  test('reviewStand_FollowupChangedTheOnlyYellow_AsksNoQuestion', () => {
    // Arrange
    const spec = reviewed('✅ Bereit zum Planen', {
      'bericht-review.json': { ...EMPTY_PART, open: [{ key: 'a', color: 'yellow', title: 'Gelb' }] },
      'bericht-followup-1.json': { ...EMPTY_PART, changes: [{ key: 'a', ok: true }] },
    });

    // Act
    const stand = reviewStand(spec);

    // Assert
    assert.deepEqual([stand.punkte, stand.frage], [0, false]);
  });

  test('reviewStand_NoReviewInAblage_Throws', () => {
    // Arrange
    const spec = specIn(makeRepo());

    // Act & Assert
    assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError && error.message.startsWith('Kein Spec-Review in der Ablage: '));
  });

  // Scheitert das `store --neu` eines späteren Reviews still, liegt der Abschlussbericht des vorigen Reviews noch in der Ablage;
  // die Spec wurde danach geändert, ist also jünger.
  test('reviewStand_AbschlussOlderThanSpec_ThrowsAsNoReview', () => {
    // Arrange
    const spec = reviewed('✅ Bereit zum Planen', { 'bericht-review.json': EMPTY_PART });
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(spec, later, later);

    // Act & Assert
    assert.throws(() => reviewStand(spec), (error) => error instanceof SessionChainError
      && error.message.startsWith('Kein Spec-Review in der Ablage: ') && error.message.endsWith('(Abschlussbericht älter als die Spec)'));
  });
  ```
  In `plugins/forge/tests/session-chain-cli.test.js` nach dem Test `store_FromWorktreeWithFresh_StoresInTheSharedAblage` einfügen:
  ```js
  test('reviewStand_Cli_PrintsResultPointsQuestionAndAbschluss', () => {
    // Arrange
    const repo = makeRepo();
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Spec\n');
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
    const review = path.join(path.dirname(abschluss), 'bericht-review.json');
    fs.writeFileSync(review, JSON.stringify({ open: [{ key: 'y', color: 'yellow', title: 'Gelb' }], green: [], changes: [] }));
    chain(repo, 'store', '--etappe', 'whiteboarding', '--spec', spec, '--neu', '--datei', abschluss, '--datei', review);

    // Act
    const result = chain(repo, 'review-stand', '--spec', spec);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    for (const line of ['ERGEBNIS=✅ Bereit zum Planen', 'PUNKTE=1', 'FRAGE=ja']) assert.match(result.stdout, new RegExp(`^${line}$`, 'm'));
    assert.match(result.stdout, /^ABSCHLUSS=.+\/ablage\/whiteboarding\/abschluss\.md$/m);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-points.test.js plugins/forge/tests/session-chain-review.test.js plugins/forge/tests/session-chain-cli.test.js` im Ordner `<R>` — erwartet: FAIL `openPoints_WhiteboardingWithRedYellowAndGreen_KeepsAllRedFirst`, `mergePoints_SpecReviewAfterWhiteboarding_ReplacesWhiteboardingPoints`, `pointLine_RedPoint_NamesRedIcon`, alle Tests in `session-chain-review.test.js` (Modul fehlt), `reviewStand_Cli_PrintsResultPointsQuestionAndAbschluss`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/session-chain-points.js` den Block von `const ICON` bis zum Ende von `openPoints` ersetzen durch:
  ```js
  const ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
  const RANK = { red: -1, yellow: 0, green: 1 };
  // 🔴 führt die Kette nur aus dem Review im Whiteboarding: Danach entscheidet der Mensch selbst, ob er trotz 🔴 abschließt.
  const RED_FROM = ['whiteboarding'];

  // Eine fehlende Datei fällt still weg (readPart liefert null); kaputte Bericht-Daten werfen, damit kein offener Punkt unbemerkt verschwindet.
  function readChecked(file) {
    try {
      return readPart(file);
    } catch (error) {
      throw new SessionChainError(`Bericht-Daten nicht lesbar: ${toPosix(file)}`, { cause: error });
    }
  }

  // Teile in Reihenfolge: Review, dann Followups nach Nummer.
  function readParts(ablage) {
    const names = [REVIEW_FILE, ...followupNumbers(ablage).map((number) => `bericht-followup-${number}.json`)];
    return names.map((name) => readChecked(path.join(ablage, name))).filter(Boolean);
  }

  // `parts`: Bericht-Daten in Reihenfolge; `herkunft`: Etappe der Punkte.
  function openPoints(parts, herkunft) {
    const colors = RED_FROM.includes(herkunft) ? ['red', 'yellow', 'green'] : ['yellow', 'green'];
    return mergeOpenKeepUnchanged(parts).filter((entry) => colors.includes(entry?.color))
      .map((entry, index) => ({ farbe: entry.color, titel: entry.title, key: keyOf(entry, index, 'punkt'), herkunft }))
      .sort((a, b) => RANK[a.farbe] - RANK[b.farbe]);
  }
  ```
  Im selben Modul `SUPERSEDES` und seinen Kommentar ersetzen durch:
  ```js
  // Plan-Review und Spec-Review sind neue Prüfungen desselben Dokuments: Sie lösen die Punkte des Plan-Entwurfs (planning)
  // bzw. des Reviews im Whiteboarding ab.
  const SUPERSEDES = { 'plan-review': ['planning'], 'spec-review': ['whiteboarding'] };
  ```
  Kopfkommentar des Moduls, erste Zeile, ersetzen durch:
  ```js
  // Offene 🟡 und 🟢 einer Etappe (aus dem Whiteboarding auch 🔴) aus ihren Bericht-Daten (bericht-review.json, dann bericht-followup-<n>.json) und ihre
  ```
  In `plugins/forge/scripts/lib/session-chain-ablage.js`:
  - im Kopfkommentar die Zeile `// Orchestratoren und Reviews (`bericht-review`, `bericht-followup-<n>`) und die Berichtsdatei der Etappe.` ersetzen durch:
    ```js
    // Orchestratoren und Reviews (`abschluss.md`, `bericht-review`, `bericht-followup-<n>`) und die Berichtsdatei der Etappe.
    ```
  - nach der Zeile `const REVIEW_FILE = 'bericht-review.json';` einfügen:
    ```js
    // Abschlussbericht eines Orchestrators, etwa des Spec-Reviews im Whiteboarding.
    const ABSCHLUSS_FILE = 'abschluss.md';
    ```
  - `module.exports = { REVIEW_FILE, FOLLOWUP_FILE, ablageDir, storeFiles, followupNumbers, nextFollowupName };` ersetzen durch:
    ```js
    module.exports = { REVIEW_FILE, ABSCHLUSS_FILE, FOLLOWUP_FILE, ablageDir, storeFiles, followupNumbers, nextFollowupName };
    ```
  Neue Datei `plugins/forge/scripts/lib/session-chain-review.js`:
  ```js
  'use strict';

  // Stand des Spec-Reviews im Whiteboarding einer Session-Kette: Ergebnis-Zeile, Zahl der offenen Punkte aller Farben und ob die
  // Abschlussfrage kommt. Gelesen wird die Ablage `whiteboarding`, in die der Spec-Review-Orchestrator mit `--ablage whiteboarding` schreibt.

  const fs = require('node:fs');
  const path = require('node:path');
  const { toPosix } = require('./posix');
  const { SessionChainError, slugOfArtifact } = require('./session-chain-store');
  const { REVIEW_FILE, ABSCHLUSS_FILE, ablageDir } = require('./session-chain-ablage');
  const { readParts } = require('./session-chain-points');
  const { mergeOpenKeepUnchanged } = require('./orchestrator-report');
  const { resultOf } = require('./session-chain-decide');

  // Der Orchestrator schreibt den Abschlussbericht nach seinen Followup-Runden, also nach der letzten Spec-Änderung des Laufs.
  // Ist er älter als die Spec, ist er der Stand eines früheren Reviews: Das `store --neu` des neuen Reviews ist gescheitert.
  function staleReason(abschluss, spec) {
    return fs.statSync(abschluss).mtimeMs < fs.statSync(spec).mtimeMs ? ' (Abschlussbericht älter als die Spec)' : null;
  }

  // `spec`: Pfad der Spec. `frage` ist false nur bei ✅ ohne jeden offenen Punkt.
  function reviewStand(spec) {
    const ablage = ablageDir(path.dirname(path.resolve(spec)), slugOfArtifact({ spec }), 'whiteboarding');
    const abschluss = path.join(ablage, ABSCHLUSS_FILE);
    if (!fs.existsSync(path.join(ablage, REVIEW_FILE)) || !fs.existsSync(abschluss)) throw new SessionChainError(`Kein Spec-Review in der Ablage: ${toPosix(ablage)}`);
    const stale = staleReason(abschluss, spec);
    if (stale) throw new SessionChainError(`Kein Spec-Review in der Ablage: ${toPosix(ablage)}${stale}`);
    const ergebnis = resultOf(fs.readFileSync(abschluss, 'utf8'));
    const punkte = mergeOpenKeepUnchanged(readParts(ablage)).length;
    return { ergebnis, punkte, frage: !(ergebnis?.startsWith('✅') && punkte === 0), abschluss: toPosix(abschluss) };
  }

  module.exports = { reviewStand };
  ```
  In `plugins/forge/scripts/session-chain.js`:
  - nach der Zeile `const { setState, copySpecAtStart, holdAt, processFinal, closing, recordCommit } = require('./lib/session-chain-steps');` einfügen:
    ```js
    const { reviewStand } = require('./lib/session-chain-review');
    ```
  - in `USAGE` nach der Zeile mit `node session-chain.js store --etappe` einfügen:
    ```js
      '       node session-chain.js review-stand --spec <S>',
    ```
  - vor `function set(values) {` einfügen:
    ```js
    // Stand des Reviews im Whiteboarding: daraus entscheidet die Etappe, ob die Abschlussfrage kommt.
    function stand(values) {
      const result = reviewStand(required(values, 'spec'));
      return [`ERGEBNIS=${result.ergebnis ?? 'keine'}`, `PUNKTE=${result.punkte}`, `FRAGE=${result.frage ? 'ja' : 'nein'}`, `ABSCHLUSS=${result.abschluss}`].join('\n');
    }

    ```
  - `const COMMANDS = { set, brief, turn, final, halt, answer, commit, schluss, store, 'etappe-report': report };` ersetzen durch:
    ```js
    const COMMANDS = { set, brief, turn, final, halt, answer, commit, schluss, store, 'etappe-report': report, 'review-stand': stand };
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-points.test.js plugins/forge/tests/session-chain-review.test.js plugins/forge/tests/session-chain-cli.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-points.js plugins/forge/scripts/lib/session-chain-ablage.js plugins/forge/scripts/lib/session-chain-review.js plugins/forge/scripts/session-chain.js plugins/forge/tests/session-chain-points.test.js plugins/forge/tests/session-chain-review.test.js plugins/forge/tests/session-chain-cli.test.js` · `git commit -m "feat(forge): review state of the whiteboarding review"`

### Task 2: Spec-Review-Orchestrator im Whiteboarding ohne Commit und ohne „Wie es weitergeht“

**ACs:** AC-02, AC-08

**Dateien:**
- Modify: `plugins/forge/scripts/lib/orchestrator-report-text.js:108-115` · `renderOrchestratorReport`
- Modify: `plugins/forge/scripts/orchestrator-report.js:19-79` · `parse`, `run`
- Modify: `plugins/forge/skills/spec-review-orchestrator/SKILL.md` · `argument-hint`, `` `$ARGUMENTS`: ``, `5. Commit, auch bei`, `6. Abschlussbericht, letzte Handlung:`
- Test: `plugins/forge/tests/orchestrator-report.test.js` · `orchestratorReport_ReadySpec_CommitResultAndPlanOrchestratorStep`
- Test: `plugins/forge/tests/spec-review-orchestrator.test.js` · `specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem`, `specReviewOrchestrator_Body_StaysUnder650WordsWithPairedQuotes`

**Interfaces:**
- Consumes: —
- Produces: `orchestrator-report.js` nimmt `--ohne-weiter ja`; der Bericht hat dann nur `# Abschlussbericht`, `# Was sich … geändert hat`, `# Was ist noch offen`. `spec-review-orchestrator` nimmt `--whiteboarding`: kein Commit, `Commit` = „kein Commit (Whiteboarding)“, Bericht mit `--ohne-weiter ja`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/orchestrator-report.test.js` nach dem Test `orchestratorReport_ReadySpec_CommitResultAndPlanOrchestratorStep` einfügen:
  ```js
  test('orchestratorReport_SpecWithOhneWeiter_ThreeHeadingsWithoutNextSteps', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ review: 'spec-review', resultLine: '**Ergebnis:** ✅ Bereit zum Planen' }));

    // Act
    const result = run(['--art', 'spec', '--review', review, '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'kein Commit (Whiteboarding)', '--ohne-weiter', 'ja']);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const text = result.stdout.split('=== BERICHT ===\n')[1];
    assert.deepEqual(anchorsOf(text), ['# Abschlussbericht', '# Was sich in der Spec geändert hat', '# Was ist noch offen']);
    assert.doesNotMatch(text, /plan-orchestrator|Spec committen/);
  });

  test('orchestratorReport_OhneWeiterWithOtherValue_ExitsWithTwo', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = writePart(dir, 'review.json', part({ review: 'spec-review' }));

    // Act
    const result = run(['--art', 'spec', '--review', review, '--out', path.join(dir, 'a.md'), '--spec', SPEC, '--commit', 'x', '--ohne-weiter', 'nein']);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--ohne-weiter erlaubt: ja/);
  });
  ```
  In `plugins/forge/tests/spec-review-orchestrator.test.js`:
  - im Test `specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem` die Zeile `assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--ablage <etappe>]');` ersetzen durch:
    ```js
      assert.equal(fields['argument-hint'], '<spec.md> [workitem-nr] [--ablage <etappe>] [--whiteboarding]');
    ```
  - den Test `specReviewOrchestrator_Body_StaysUnder650WordsWithPairedQuotes` ersetzen durch:
    ```js
    test('specReviewOrchestrator_Body_StaysUnder700WordsWithPairedQuotes', () => {
      // Act
      const { body } = readMarkdown(SKILL);

      // Assert
      assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`);
      assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
    });
    ```
  - am Dateiende einfügen:
    ```js
    test('specReviewOrchestrator_Body_WhiteboardingSkipsCommitAndNextSteps', () => {
      // Act
      const { body } = readMarkdown(SKILL);

      // Assert
      assert.ok(body.includes('`--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette.'));
      assert.ok(body.includes('Mit `--whiteboarding` kein Commit: `Commit` = „kein Commit (Whiteboarding)“, weiter mit 6.'));
      assert.ok(body.includes('`--ohne-weiter ja` nur mit `--whiteboarding`'));
    });
    ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/orchestrator-report.test.js plugins/forge/tests/spec-review-orchestrator.test.js` im Ordner `<R>` — erwartet: FAIL `orchestratorReport_SpecWithOhneWeiter_ThreeHeadingsWithoutNextSteps`, `orchestratorReport_OhneWeiterWithOtherValue_ExitsWithTwo`, `specReviewOrchestrator_Frontmatter_ModelInvocableWithSpecAndOptionalWorkitem`, `specReviewOrchestrator_Body_WhiteboardingSkipsCommitAndNextSteps`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/orchestrator-report-text.js` die Funktion `renderOrchestratorReport` ersetzen durch:
  ```js
  // `facts.ohneWeiter`: ohne Abschnitt „Wie es weitergeht“ (Spec-Review im Whiteboarding einer Session-Kette; die Etappe fragt selbst).
  function renderOrchestratorReport(report, facts) {
    return [
      ['# Abschlussbericht', ...closingLines(report, facts)],
      [`# Was sich ${CHANGED_IN[report.art]} geändert hat`, ...changedLines(report)],
      ['# Was ist noch offen', ...openSection(report)],
      ...(facts.ohneWeiter ? [] : [['# Wie es weitergeht', ...nextLines(report, facts)]]),
    ].map((block) => block.join('\n')).join('\n\n');
  }
  ```
  In `plugins/forge/scripts/orchestrator-report.js`:
  - `const OPTIONAL = ['--followup', '--wi', '--fakten'];` ersetzen durch:
    ```js
    const OPTIONAL = ['--followup', '--wi', '--fakten', '--ohne-weiter'];
    ```
  - in `USAGE` die erste Zeile ersetzen durch:
    ```js
      'Aufruf: node orchestrator-report.js --art spec --review <json> [--followup <json>]... --out <md> --spec <S> --commit <text> [--wi <nr>] [--fakten <datei>] [--ohne-weiter ja]',
    ```
  - in `parse` nach der Zeile `if (values['--pruefung'] && !CHECKS.includes(values['--pruefung'])) throw new UsageError(`--pruefung erlaubt: ${CHECKS.join(', ')}`);` einfügen:
    ```js
      if (values['--ohne-weiter'] !== undefined && values['--ohne-weiter'] !== 'ja') throw new UsageError('--ohne-weiter erlaubt: ja');
    ```
  - in `run` im Objekt `facts` die Zeile `worktree: values['--worktree'], branch: values['--branch'], check: values['--pruefung'], lines: factLines(values['--fakten']),` ersetzen durch:
    ```js
        worktree: values['--worktree'], branch: values['--branch'], check: values['--pruefung'], lines: factLines(values['--fakten']), ohneWeiter: values['--ohne-weiter'] === 'ja',
    ```
  In `plugins/forge/skills/spec-review-orchestrator/SKILL.md`:
  - `argument-hint: <spec.md> [workitem-nr] [--ablage <etappe>]` ersetzen durch:
    ```markdown
    argument-hint: <spec.md> [workitem-nr] [--ablage <etappe>] [--whiteboarding]
    ```
  - in der Zeile, die mit `` `$ARGUMENTS`: `` beginnt, `` `--ablage <E>` optional, zählt nicht als `<WI>`. `` ersetzen durch:
    ```markdown
    `--ablage <E>` optional, zählt nicht als `<WI>`. `--whiteboarding` optional, zählt nicht als `<WI>`: Prüfung im Whiteboarding einer Session-Kette.
    ```
  - `` 5. Commit, auch bei `⛔` oder `❓`. `node "<PLUGIN>/scripts/spec-commit.js" preflight `` ersetzen durch:
    ```markdown
    5. Commit, auch bei `⛔` oder `❓`. Mit `--whiteboarding` kein Commit: `Commit` = „kein Commit (Whiteboarding)“, weiter mit 6. Sonst `node "<PLUGIN>/scripts/spec-commit.js" preflight 
    ```
  - in Schritt 6.4 `` `--fakten "<FK>"` nur wenn geschrieben. `` ersetzen durch:
    ```markdown
    `--fakten "<FK>"` nur wenn geschrieben, `--ohne-weiter ja` nur mit `--whiteboarding`.
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/orchestrator-report.test.js plugins/forge/tests/spec-review-orchestrator.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/orchestrator-report-text.js plugins/forge/scripts/orchestrator-report.js plugins/forge/skills/spec-review-orchestrator/SKILL.md plugins/forge/tests/orchestrator-report.test.js plugins/forge/tests/spec-review-orchestrator.test.js` · `git commit -m "feat(forge): spec review without commit inside whiteboarding"`

### Task 3: Whiteboarding ohne eigenen Commit, Commit durch die Leit-Session

**ACs:** AC-08, AC-09, AC-10

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-chain-check.js:148-151` · `EXTRA`
- Modify: `plugins/forge/scripts/lib/session-chain-commit.js:1-41` · `commitFor`
- Modify: `plugins/forge/scripts/session-chain.js:77-145` · `brief`, `commit`
- Test: `plugins/forge/tests/session-chain-steps.test.js` · `processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill`
- Test: `plugins/forge/tests/session-chain-commit.test.js` · `commitFor_AnyCommit_ContainsOnlyMarkdownFiles`
- Test: `plugins/forge/tests/session-chain-scenario.test.js` · `runWhiteboarding`, `chain_GoldenPathFromEntryToEnd_EventsAndStateFollowTheSteps`, `chain_DeviationForeignFileInCommit_HoldsUntilAnswerWeiter`

**Interfaces:**
- Consumes: `openPoints` (Task 1)
- Produces: `commitFor('whiteboarding', dir, state, message) → { commit: { hash, dateien } | null, nichtCommittet: string[] }` (Spec plus gemeldete Markdown-Dateien des Whiteboardings); `checkWhiteboardingCommitted(state, dir) → void`, wirft `SessionChainError('Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`')`; CLI `commit --anlass whiteboarding`; Prüfzeile `Whiteboarding ohne eigenen Commit` im `final` des Whiteboardings

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/session-chain-steps.test.js`:
  - nach der Zeile `const { git, commitFile, makeRepo, addWorktree, repoWithPlan, repoWithRemoteBranch } = require('./lib/git-repo');` einfügen:
    ```js
    const { VALID_SPEC } = require('./lib/spec-fixtures');
    ```
  - vor dem Test `processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill` einfügen:
    ```js
    // Repo mit Spec in docs/forge/x (Slug x), noch ohne Commit: so liegt sie nach dem Whiteboarding einer Session-Kette.
    function uncommittedSpec() {
      const repo = makeRepo();
      const spec = path.join(repo, 'docs/forge/x/spec.md');
      fs.mkdirSync(path.dirname(spec), { recursive: true });
      fs.writeFileSync(spec, VALID_SPEC);
      return { repo, spec };
    }

    ```
  - den Test `processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill` ersetzen durch:
    ```js
    test('processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill', () => {
      // Arrange
      const { repo, spec } = uncommittedSpec();
      fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
      const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec, dateien: [path.join(repo, 'CONTEXT.md')] }, repo);

      // Act
      const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit: 'none', basis: 'main' }, repo);

      // Assert
      assert.equal(result.weiter, 'grill');
      assert.ok(result.geprueft.includes('Whiteboarding ohne eigenen Commit'), result.geprueft.join('\n'));
      const state = readState(repo, 'x');
      assert.equal(state.basis, 'main');
      assert.equal(state.spec, spec.replace(/\\/g, '/'));
      assert.equal(state.dateien[0].etappe, 'whiteboarding');
    });

    test('processFinal_WhiteboardingWithOwnCommit_HoldsAsDeviation', () => {
      // Arrange
      const { repo, spec } = repoWithPlan();
      const commit = git(repo, 'rev-parse', '--short', 'HEAD');
      const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec }, repo);

      // Act
      const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit, basis: 'main' }, repo);

      // Assert
      assert.equal(result.haltepunkt, 'abweichung');
      assert.ok(result.text.includes(`Whiteboarding meldet Commit ${commit}; in der Session-Kette committet nur die Leit-Session`), result.text);
      assert.ok(result.text.includes('docs/forge/x/spec.md ist schon committet; in der Session-Kette committet nur die Leit-Session'), result.text);
    });

    // AC-10: Das Review im Whiteboarding legt Abschlussbericht und Bericht-Daten in die Ablage `whiteboarding`; die Berichtsdatei der
    // Etappe liegt im selben Ordner, also liest `processFinal` die offenen Punkte von dort in den Zustand.
    test('processFinal_WhiteboardingWithTwoYellowAndOneGreen_KeepsAllThreeInState', () => {
      // Arrange
      const { repo, spec } = uncommittedSpec();
      const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
      const review = scratch('bericht-review.json', JSON.stringify({ open: [yellow('a', 'A'), yellow('b', 'B')], green: [{ key: 'c', color: 'green', title: 'C' }], changes: [] }));
      storeFiles({ dir: repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });
      const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec, bericht: abschluss }, repo);

      // Act
      processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit: 'none', basis: 'main' }, repo);

      // Assert
      const offen = readState(repo, 'x').offen.map((point) => `${point.farbe} ${point.titel} ${point.herkunft}`);
      assert.deepEqual(offen, ['yellow A whiteboarding', 'yellow B whiteboarding', 'green C whiteboarding']);
    });
    ```
  In `plugins/forge/tests/session-chain-commit.test.js`:
  - `const { commitFor } = require('../scripts/lib/session-chain-commit');` ersetzen durch:
    ```js
    const { commitFor, checkWhiteboardingCommitted } = require('../scripts/lib/session-chain-commit');
    ```
  - am Dateiende einfügen:
    ```js
    // Repo mit Spec in docs/forge/x, noch ohne Commit.
    function repoWithNewSpec() {
      const repo = makeRepo();
      const spec = path.join(repo, 'docs/forge/x/spec.md');
      fs.mkdirSync(path.dirname(spec), { recursive: true });
      fs.writeFileSync(spec, '# Spec\n');
      return { repo, spec };
    }

    test('commitFor_Whiteboarding_CommitsSpecAndItsGlossaryInOneCommit', () => {
      // Arrange
      const { repo, spec } = repoWithNewSpec();
      for (const name of ['CONTEXT.md', 'grill.md', 'fremd.md']) fs.writeFileSync(path.join(repo, name), 'x\n');
      const state = { spec, dateien: [{ etappe: 'whiteboarding', pfad: path.join(repo, 'CONTEXT.md') }, { etappe: 'grill', pfad: path.join(repo, 'grill.md') }] };

      // Act
      const result = commitFor('whiteboarding', repo, state, 'docs: spec x');

      // Assert
      assert.deepEqual(result.commit.dateien, ['docs/forge/x/spec.md', 'CONTEXT.md']);
      assert.deepEqual(committedFiles(repo).sort(), ['CONTEXT.md', 'docs/forge/x/spec.md']);
      assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '2');
    });

    test('commitFor_UnknownAnlass_ThrowsNamingAllowedAnlaesse', () => {
      // Act & Assert
      assert.throws(() => commitFor('x', makeRepo(), {}, 'm'),
        (error) => error instanceof SessionChainError && error.message === 'Anlass unbekannt: x (erlaubt: whiteboarding, spec, go)');
    });

    test('checkWhiteboardingCommitted_SpecUncommittedAfterWhiteboarding_ThrowsUntilCommitted', () => {
      // Arrange
      const { repo, spec } = repoWithNewSpec();
      const state = { spec, etappen: [{ etappe: 'whiteboarding' }] };

      // Act & Assert
      assert.throws(() => checkWhiteboardingCommitted(state, repo),
        (error) => error instanceof SessionChainError && error.message === 'Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`');
      commitFor('whiteboarding', repo, state, 'docs: spec x');
      assert.doesNotThrow(() => checkWhiteboardingCommitted(state, repo));
    });

    test('checkWhiteboardingCommitted_LastEtappeNotWhiteboarding_DoesNotThrow', () => {
      // Arrange
      const { repo, spec } = repoWithNewSpec();

      // Act & Assert
      assert.doesNotThrow(() => checkWhiteboardingCommitted({ spec, etappen: [{ etappe: 'spec-review' }] }, repo));
      assert.doesNotThrow(() => checkWhiteboardingCommitted({ spec }, repo));
    });
    ```
  In `plugins/forge/tests/session-chain-scenario.test.js`:
  - die Funktion `runWhiteboarding` samt Kommentar darüber ersetzen durch:
    ```js
    // Einstieg ohne Codewort bis zum final des Whiteboardings und dem Whiteboarding-Commit der Leit-Session; das Whiteboarding committet nicht.
    function runWhiteboarding(env) {
      const entry = succeeded(chain(env.repo, 'entry'));
      assert.equal(field(entry, 'etappe'), 'whiteboarding');
      assert.equal(field(entry, 'frage-basis'), 'ja');
      const brief = succeeded(chain(env.repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen: Export nach CSV\n')));
      assert.equal(field(brief, 'MODELL'), 'sonnet');
      fs.mkdirSync(path.dirname(env.spec), { recursive: true });
      fs.writeFileSync(env.spec, VALID_SPEC);
      const bericht = writeReport(env, 'whiteboarding', { target: ['--spec', env.spec] });
      const final = runFinal(env, 'whiteboarding', bericht, 'none', ['--basis', 'main']);
      succeeded(chain(env.repo, 'commit', '--anlass', 'whiteboarding', '--slug', 'x', '--message', 'docs: spec x'));
      return final;
    }
    ```
  - im Test `chain_GoldenPathFromEntryToEnd_EventsAndStateFollowTheSteps` die Zeile `assert.deepEqual(eventKinds(env), ['final:whiteboarding', 'start:grill', 'final:grill', 'start:spec-review', 'final:spec-review', 'antwort', 'start:planning', 'final:planning',` ersetzen durch:
    ```js
      assert.deepEqual(eventKinds(env), ['final:whiteboarding', 'commit', 'start:grill', 'final:grill', 'start:spec-review', 'final:spec-review', 'antwort', 'start:planning', 'final:planning',
    ```
  - den Test `chain_DeviationForeignFileInCommit_HoldsUntilAnswerWeiter` ersetzen durch:
    ```js
    test('chain_DeviationForeignFileInCommit_HoldsUntilAnswerWeiter', () => {
      // Arrange
      const env = newChain();
      runWhiteboarding(env);
      const grill = runEtappe(env, 'grill', {
        effect: () => {
          fs.mkdirSync(path.join(env.repo, 'src'), { recursive: true });
          fs.writeFileSync(path.join(env.repo, 'src/fremd.js'), 'fremd\n');
          git(env.repo, 'add', 'src/fremd.js');
          return { commit: appendToSpec(env, '', 'docs: grill spec x') };
        },
      });

      // Act
      const refused = chain(env.repo, 'brief', '--etappe', 'spec-review', '--slug', 'x');
      const answer = succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'weiter'));
      const started = chain(env.repo, 'brief', '--etappe', 'spec-review', '--slug', 'x');

      // Assert
      assert.equal(grill.halt, 'abweichung');
      assert.ok(grill.out.includes('src/fremd.js außerhalb der erwarteten Dateien'), grill.out);
      assert.equal(refused.status, 1);
      assert.match(refused.stderr, /^Haltepunkt abweichung offen/);
      assert.equal(answer.trim(), 'FREIGABE=abweichung weiter');
      assert.equal(started.status, 0, started.stderr);
    });

    test('chain_GrillBeforeWhiteboardingCommit_RefusedUntilTheLeitSessionCommits', () => {
      // Arrange
      const env = newChain();
      succeeded(chain(env.repo, 'entry'));
      succeeded(chain(env.repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen: Export\n')));
      fs.mkdirSync(path.dirname(env.spec), { recursive: true });
      fs.writeFileSync(env.spec, VALID_SPEC);
      fs.writeFileSync(path.join(env.repo, 'CONTEXT.md'), '# Glossar\n');
      const bericht = writeReport(env, 'whiteboarding', { target: ['--spec', env.spec], extra: ['--datei', path.join(env.repo, 'CONTEXT.md')] });
      const final = runFinal(env, 'whiteboarding', bericht, 'none', ['--basis', 'main']);
      const commitsBefore = git(env.repo, 'rev-list', '--count', 'HEAD');

      // Act
      const refused = chain(env.repo, 'brief', '--etappe', 'grill', '--slug', 'x');
      const commit = succeeded(chain(env.repo, 'commit', '--anlass', 'whiteboarding', '--slug', 'x', '--message', 'docs: spec x'));
      const started = chain(env.repo, 'brief', '--etappe', 'grill', '--slug', 'x');

      // Assert
      assert.equal(final.weiter, 'grill');
      assert.equal(commitsBefore, '1');
      assert.equal(refused.status, 1);
      assert.equal(refused.stderr.trim(), 'Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`');
      assert.match(commit, /^COMMIT=\S+ docs\/forge\/x\/spec\.md CONTEXT\.md$/m);
      assert.equal(git(env.repo, 'rev-list', '--count', 'HEAD'), '2');
      assert.equal(started.status, 0, started.stderr);
    });
    ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-steps.test.js plugins/forge/tests/session-chain-commit.test.js plugins/forge/tests/session-chain-scenario.test.js` im Ordner `<R>` — erwartet: FAIL `processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill`, `processFinal_WhiteboardingWithOwnCommit_HoldsAsDeviation`, `commitFor_Whiteboarding_CommitsSpecAndItsGlossaryInOneCommit`, `commitFor_UnknownAnlass_ThrowsNamingAllowedAnlaesse`, `checkWhiteboardingCommitted_SpecUncommittedAfterWhiteboarding_ThrowsUntilCommitted`, `chain_GoldenPathFromEntryToEnd_EventsAndStateFollowTheSteps`, `chain_GrillBeforeWhiteboardingCommit_RefusedUntilTheLeitSessionCommits`; `processFinal_WhiteboardingWithTwoYellowAndOneGreen_KeepsAllThreeInState` darf schon grün sein (die Punkte liest `applyFinal` mit dem `openPoints` aus Task 1), er sichert den Weg der Punkte in den Zustand ab
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/session-chain-check.js` vor `const EXTRA = {` einfügen:
  ```js
  // Whiteboarding in der Session-Kette committet nichts: kein gemeldeter Commit, die Spec ohne Commit und gemeldete Glossar- und
  // ADR-Dateien mit noch uncommitteter Änderung. Den Commit macht danach die Leit-Session (`commit --anlass whiteboarding`).
  function noCommitChecks(repo, values) {
    const result = emptyResult();
    const reason = 'in der Session-Kette committet nur die Leit-Session';
    if (values.commit && values.commit !== 'none') result.abweichungen.push(`Whiteboarding meldet Commit ${values.commit}; ${reason}`);
    if (values.spec && git(repo, ['log', '--format=%h', '-1', '--', values.spec]).out !== '') result.abweichungen.push(`${relative(repo, values.spec)} ist schon committet; ${reason}`);
    for (const file of (values.dateien ?? []).filter((entry) => fs.existsSync(entry))) {
      if (!isDirty(repo, file)) result.abweichungen.push(`${relative(repo, file)} hat keine uncommittete Änderung; ${reason}`);
    }
    if (result.abweichungen.length === 0) result.geprueft.push('Whiteboarding ohne eigenen Commit');
    return result;
  }

  ```
  Im selben Modul in `EXTRA` den Eintrag `whiteboarding: specFormatChecks,` ersetzen durch:
  ```js
    whiteboarding: [specFormatChecks, noCommitChecks],
  ```
  `plugins/forge/scripts/lib/session-chain-commit.js` vollständig ersetzen durch:
  ```js
  'use strict';

  // Commits der Leit-Session, auf Pfade beschränkt: nach dem `final` des Whiteboardings die Spec und die vom Whiteboarding gemeldeten
  // Glossar- und ADR-Dateien, am Spec-Haltepunkt die von Whiteboarding und Grill gemeldeten Glossar- und ADR-Dateien, nach dem GO das
  // noch Uncommittete von Spec und Plan. Die Leit-Session committet nur Markdown-Dateien; eine andere gemeldete Datei bleibt liegen
  // und wird genannt. Vor dem GO-Commit muss der Basis-Branch ausgecheckt sein.

  const { SessionChainError } = require('./session-chain-store');
  const { gitOrThrow: git, toplevel, isDirty, relative } = require('./session-chain-git');

  const MARKDOWN = /\.md$/i;
  const GLOSSARY_ETAPPEN = ['whiteboarding', 'grill'];

  // Commit genau dieser Dateien; nur solche mit Änderungen. Rückgabe: { hash, dateien } oder null ohne Änderung.
  function commitPaths(repo, files, message) {
    const dirty = files.filter((file) => isDirty(repo, file));
    if (dirty.length === 0) return null;
    git(repo, ['add', '--', ...dirty]);
    git(repo, ['commit', '--quiet', '-m', message, '--', ...dirty]);
    return { hash: git(repo, ['rev-parse', '--short', 'HEAD']), dateien: dirty.map((file) => relative(repo, file)) };
  }

  // Gemeldete Dateien der Etappen `etappen` (Zustand `dateien`), getrennt in Markdown und Rest.
  function reportedFiles(state, etappen) {
    const reported = [...new Set((state.dateien ?? []).filter((entry) => etappen.includes(entry.etappe)).map((entry) => entry.pfad))];
    return { md: reported.filter((file) => MARKDOWN.test(file)), andere: reported.filter((file) => !MARKDOWN.test(file)) };
  }

  // `anlass`: whiteboarding | spec | go; `dir`: Ordner im Haupt-Checkout. Rückgabe: { commit, nichtCommittet }.
  function commitFor(anlass, dir, state, message) {
    const repo = toplevel(dir);
    if (anlass === 'whiteboarding') {
      const { md, andere } = reportedFiles(state, ['whiteboarding']);
      return { commit: commitPaths(repo, [state.spec, ...md].filter(Boolean), message), nichtCommittet: andere };
    }
    if (anlass === 'spec') {
      const { md, andere } = reportedFiles(state, GLOSSARY_ETAPPEN);
      return { commit: commitPaths(repo, md, message), nichtCommittet: andere };
    }
    if (anlass !== 'go') throw new SessionChainError(`Anlass unbekannt: ${anlass} (erlaubt: whiteboarding, spec, go)`);
    const branch = git(repo, ['branch', '--show-current']);
    if (branch !== state.basis) throw new SessionChainError(`Aktueller Branch ${branch || '(keiner)'} ist nicht der Basis-Branch ${state.basis}; die Umsetzung startet nicht.`);
    return { commit: commitPaths(repo, [state.spec, state.plan].filter(Boolean), message), nichtCommittet: [] };
  }

  // Nach dem `final` des Whiteboardings startet der Grill erst, wenn die Leit-Session die Spec committet hat.
  function checkWhiteboardingCommitted(state, dir) {
    if (state.etappen?.at(-1)?.etappe !== 'whiteboarding' || !state.spec) return;
    if (isDirty(toplevel(dir), state.spec)) throw new SessionChainError('Spec aus dem Whiteboarding ist uncommittet: erst `commit --anlass whiteboarding`');
  }

  module.exports = { commitFor, checkWhiteboardingCommitted };
  ```
  In `plugins/forge/scripts/session-chain.js`:
  - `const { commitFor } = require('./lib/session-chain-commit');` ersetzen durch:
    ```js
    const { commitFor, checkWhiteboardingCommitted } = require('./lib/session-chain-commit');
    ```
  - in `USAGE` die Zeile `'       node session-chain.js commit --anlass spec|go --slug <slug> --message <betreff>',` ersetzen durch:
    ```js
      '       node session-chain.js commit --anlass whiteboarding|spec|go --slug <slug> --message <betreff>',
    ```
  - in `brief` nach der Zeile `const state = values.slug ? readState(process.cwd(), values.slug) : null;` einfügen:
    ```js
      if (state && values.etappe === 'grill') checkWhiteboardingCommitted(state, process.cwd());
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-steps.test.js plugins/forge/tests/session-chain-commit.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-chain-check.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-check.js plugins/forge/scripts/lib/session-chain-commit.js plugins/forge/scripts/session-chain.js plugins/forge/tests/session-chain-steps.test.js plugins/forge/tests/session-chain-commit.test.js plugins/forge/tests/session-chain-scenario.test.js` · `git commit -m "feat(forge): leit session commits the whiteboarding spec"`

### Task 4: Brief mit Leit-Session, Meldung per Nachricht und Review im Whiteboarding

**ACs:** AC-01, AC-05, AC-06, AC-07, AC-10, AC-12, AC-13, AC-14, AC-19, AC-20, AC-21, AC-22

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-chain-brief.js:11-156` · `ETAPPEN_BRIEFS`, `VALUE_LINES`, `buildBrief`, `SONNET_MODEL_ID`
- Modify: `plugins/forge/shared/session-chain/base-sub-agent.md` · `## Ketten-Regeln`
- Modify: `plugins/forge/scripts/session-chain.js:12-92` · `SONNET_MODEL_ID`, `VALUE_OPTIONS`, `brief`
- Test: `plugins/forge/tests/session-chain-brief.test.js` · `buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks`, `buildBrief_Whiteboarding_StaysWithoutBerichtOfASkill`
- Test: `plugins/forge/tests/session-chain-cli.test.js` · `chain`
- Test: `plugins/forge/tests/session-chain-scenario.test.js` · `chain`
- Test: `plugins/forge/tests/session-chain-gate.test.js` · `cli_AnswerThenBrief_StartsChosenEtappeOnce`, `cli_EventsJsonl_RecordsHaltAnswerCommitAndStart`
- Test: `plugins/forge/tests/stage-start-guard.test.js` · `brief_Cli_StoresHashOfBriefTextAndModelInStartedState`

**Interfaces:**
- Consumes: `reviewStand` (Task 1), `pointLine` (Task 1), `checkWhiteboardingCommitted` (Task 3)
- Produces: `buildBrief({ etappe, values, decisions, kontext, points })`, `values.leit` ergibt die Zeile `- Leit-Session: <id>` unter `## Werte`; CLI `brief … --leit <local_…>` (Pflicht, Format `^local_[A-Za-z0-9_.-]+$`); Exporte `LEIT_LABEL = 'Leit-Session'`, `LEIT_ID_PATTERN = 'local_[A-Za-z0-9_.-]+'` und `LEIT_ID` aus `scripts/lib/session-chain-brief.js`; Ketten-Regel 9 in `base-sub-agent.md`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/session-chain-brief.test.js`:
  - im Test `buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks` die Zeile `'Starte keine weitere Session und sende keine Nachricht an die Leit-Session',` ersetzen durch:
    ```js
        '4. Starte keine weitere Session. Eine Nachricht schickst du nur nach Regel 9; sonst meldest du dich über dein Turn-Ende.',
    ```
  - den Test `buildBrief_Whiteboarding_StaysWithoutBerichtOfASkill` ersetzen durch:
    ```js
    test('buildBrief_Whiteboarding_ReportsWithTheAbschlussOfTheReview', () => {
      // Act
      const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

      // Assert
      assert.ok(text.includes('Abschließen: Berichtsdatei mit `--spec "<deine Spec>"` und `--bericht "<ABSCHLUSS aus review-stand>"`, dazu `--datei` je geänderter Glossar- oder ADR-Datei.'));
    });
    ```
  - am Dateiende einfügen:
    ```js
    test('buildBrief_WithLeit_NamesTheLeitSessionUnderValues', () => {
      // Act
      const text = brief('grill', { ...VALUES, leit: 'local_leit-1' }).brief;

      // Assert
      const values = text.slice(text.indexOf('## Werte'), text.indexOf('## Auftrag'));
      assert.ok(values.includes('- Leit-Session: local_leit-1'), values);
    });

    test('buildBrief_AnyEtappe_SendsOneMessageOnlyOnFinalWithoutHandover', () => {
      // Act
      const text = brief('planning').brief;

      // Assert
      for (const part of [
        '9. Meldung bei `final`: Vor jedem Turn-Ende mit `STATUS=final` schickst du in diesem Turn genau eine Nachricht per `SendMessage` (vorher per `ToolSearch` mit `select:SendMessage` laden) an die Leit-Session aus „Werte“; `to` ist ihre Kennung.',
        'Inhalt: die Statuszeile als erste Zeile, als zweite `Spec: <pfad>`, wenn du den Pfad der Spec kennst; sonst nichts, kein Übergabe-Hinweis, keine nächste Etappe, kein Befehl.',
        'Ein wiederholtes `final` verarbeitet die Leit-Session nur einmal.',
        'Bei `in-progress` und `needs-user` schickst du keine Nachricht.',
        'Scheitert sie, steht nach der Statuszeile die Zeile `Leit-Session nicht benachrichtigt: [Leit-Session](#<Kennung>)`; dein Turn-Ende bleibt `final`.',
      ]) assert.ok(text.includes(part), part);
    });

    test('buildBrief_Whiteboarding_RunsTheSpecReviewInTheSameSessionWithoutCommit', () => {
      // Act
      const result = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' });

      // Assert
      assert.equal(result.modell, 'sonnet');
      for (const part of [
        'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session. Die Übergabe deines Skills (Review-Befehl, frische Session) gibst du nicht aus.',
        'Nach der Bestätigung und dem Schreiben der Spec rufst du ohne Rückfrage in dieser Session über das Skill-Werkzeug `dv-forge:spec-review-orchestrator` mit `"<deine Spec>" --ablage whiteboarding --whiteboarding` auf.',
        'review-stand --spec "<deine Spec>"`. `FRAGE=nein`: Etappe abschließen. `FRAGE=ja`: am Ende deiner Antwort die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“, Status `needs-user`.',
        '„Weiter an der Spec arbeiten“: jede Änderung als Vorher/Nachher, erst nach Bestätigung schreiben, danach erneut das Review und `review-stand`. Änderungen der Followup-Runden lösen kein weiteres Review aus.',
      ]) assert.ok(result.brief.includes(part), part);
    });

    // AC-06: Nach den Followup-Runden folgt nur `review-stand` (Frage oder Abschluss), kein zweiter Review-Lauf.
    test('buildBrief_Whiteboarding_FollowupChangesTriggerNoSecondReview', () => {
      // Act
      const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

      // Assert
      assert.ok(text.includes('Änderungen der Followup-Runden lösen kein weiteres Review aus.'));
      assert.ok(text.includes('review-stand --spec "<deine Spec>"`. `FRAGE=nein`: Etappe abschließen.'));
    });

    test('buildBrief_Whiteboarding_ReviewStandFailureRetriesOnceThenNeedsUser', () => {
      // Act
      const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

      // Assert
      assert.ok(text.includes('Scheitert `review-stand` mit „Kein Spec-Review in der Ablage“: Review erneut aufrufen; scheitert es wieder, Status `needs-user` mit der Fehlermeldung, nicht abschließen.'));
    });

    test('buildBrief_GrillWithOpenPoints_ListsThemInTheirOwnSection', () => {
      // Arrange
      const points = [{ farbe: 'yellow', titel: 'A', herkunft: 'whiteboarding' }, { farbe: 'yellow', titel: 'B', herkunft: 'whiteboarding' }, { farbe: 'green', titel: 'C', herkunft: 'whiteboarding' }];

      // Act
      const text = brief('grill', VALUES, { points }).brief;

      // Assert
      assert.ok(text.includes('## Offene Punkte aus früheren Etappen\nPrüf sie im Grill mit; sie gelten nicht als beantwortet.\n- 🟡 A · whiteboarding\n- 🟡 B · whiteboarding\n- 🟢 C · whiteboarding'));
    });

    test('buildBrief_PlanningWithOpenPoints_HasNoPointSection', () => {
      // Act
      const text = brief('planning', VALUES, { points: [{ farbe: 'yellow', titel: 'A', herkunft: 'spec-review' }] }).brief;

      // Assert
      assert.ok(!text.includes('## Offene Punkte aus früheren Etappen'));
    });
    ```
  In `plugins/forge/tests/session-chain-cli.test.js`:
  - die Funktion `chain` ersetzen durch:
    ```js
    const LEIT = 'local_leit-1';

    // `brief` braucht die Kennung der Leit-Session; die Tests geben immer dieselbe mit.
    function chain(cwd, ...args) {
      const full = args[0] === 'brief' ? [...args, '--leit', LEIT] : args;
      return spawnSync(process.execPath, [SCRIPT, ...full], { cwd, encoding: 'utf8' });
    }
    ```
  - am Dateiende einfügen:
    ```js
    test('brief_WithoutLeit_ExitsWithUsage', () => {
      // Arrange
      const repo = makeRepo();

      // Act
      const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n')], { cwd: repo, encoding: 'utf8' });

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, /^--leit fehlt/);
    });

    test('brief_LeitWithoutLocalPrefix_ExitsWithUsage', () => {
      // Arrange
      const repo = makeRepo();

      // Act
      const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'), '--leit', 'leit; rm'], { cwd: repo, encoding: 'utf8' });

      // Assert
      assert.equal(result.status, 2);
      assert.match(result.stderr, /^--leit erwartet die Kennung der Leit-Session \(local_…\), nicht leit; rm/);
    });

    test('brief_LeitWithUnderscoreAndDot_IsAccepted', () => {
      // Arrange
      const repo = makeRepo();

      // Act
      const result = spawnSync(process.execPath, [SCRIPT, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'), '--leit', 'local_a_b.c-1'], { cwd: repo, encoding: 'utf8' });

      // Assert
      assert.equal(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes('- Leit-Session: local_a_b.c-1'));
    });

    test('brief_WithLeit_NamesItInTheBrief', () => {
      // Arrange
      const repo = makeRepo();

      // Act
      const result = chain(repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen\n'));

      // Assert
      assert.equal(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes(`- Leit-Session: ${LEIT}`));
    });

    test('brief_GrillWithOpenPointsInState_ListsThemInTheBrief', () => {
      // Arrange
      const { repo, spec } = repoWithPlan();
      writeState(repo, 'x', { basis: 'main', spec: spec.replace(/\\/g, '/'), naechste: 'grill', offen: [{ farbe: 'red', titel: 'Lücke', key: 'l', herkunft: 'whiteboarding' }] });

      // Act
      const result = chain(repo, 'brief', '--etappe', 'grill', '--slug', 'x');

      // Assert
      assert.equal(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes('## Offene Punkte aus früheren Etappen\nPrüf sie im Grill mit; sie gelten nicht als beantwortet.\n- 🔴 Lücke · whiteboarding'));
    });
    ```
  In `plugins/forge/tests/session-chain-scenario.test.js`:
  - die Funktion `chain` ersetzen durch:
    ```js
    // `brief` braucht die Kennung der Leit-Session; die Szenarien geben immer dieselbe mit.
    function chain(cwd, ...args) {
      const full = args[0] === 'brief' ? [...args, '--leit', 'local_leit-1'] : args;
      return spawnSync(process.execPath, [SCRIPT, ...full], { cwd, encoding: 'utf8' });
    }
    ```
  - am Dateiende einfügen:
    ```js
    // AC-10: Review im Whiteboarding mit zwei 🟡 und einem 🟢, Abschluss mit dem ABSCHLUSS aus review-stand, Commit der Leit-Session, Grill-Brief.
    test('chain_WhiteboardingClosedWithThreeOpenPoints_StateAndGrillBriefListThem', () => {
      // Arrange
      const env = newChain();
      succeeded(chain(env.repo, 'entry'));
      succeeded(chain(env.repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', scratch('kontext.md', 'Anliegen: Export\n')));
      fs.mkdirSync(path.dirname(env.spec), { recursive: true });
      fs.writeFileSync(env.spec, VALID_SPEC);
      const abschluss = reportFile(SPEC_READY);
      const review = path.join(path.dirname(abschluss), 'bericht-review.json');
      fs.writeFileSync(review, JSON.stringify({ open: [{ key: 'a', color: 'yellow', title: 'A' }, { key: 'b', color: 'yellow', title: 'B' }], green: [{ key: 'c', color: 'green', title: 'C' }], changes: [] }));
      succeeded(chain(env.repo, 'store', '--etappe', 'whiteboarding', '--spec', env.spec, '--neu', '--datei', abschluss, '--datei', review));
      const stand = succeeded(chain(env.repo, 'review-stand', '--spec', env.spec));
      const bericht = /^BERICHT=(.+)$/m.exec(succeeded(chain(env.repo, 'etappe-report', '--etappe', 'whiteboarding', '--spec', env.spec, '--bericht', field(stand, 'ABSCHLUSS'))))[1];
      succeeded(runFinal(env, 'whiteboarding', bericht, 'none', ['--basis', 'main']).result);
      succeeded(chain(env.repo, 'commit', '--anlass', 'whiteboarding', '--slug', 'x', '--message', 'docs: spec x'));

      // Act
      const grill = succeeded(chain(env.repo, 'brief', '--etappe', 'grill', '--slug', 'x'));

      // Assert
      assert.equal(field(stand, 'FRAGE'), 'ja');
      const offen = readState(env.repo, 'x').offen.map((point) => `${point.farbe} ${point.titel} ${point.herkunft}`);
      assert.deepEqual(offen, ['yellow A whiteboarding', 'yellow B whiteboarding', 'green C whiteboarding']);
      assert.ok(grill.includes('## Offene Punkte aus früheren Etappen\nPrüf sie im Grill mit; sie gelten nicht als beantwortet.\n- 🟡 A · whiteboarding\n- 🟡 B · whiteboarding\n- 🟢 C · whiteboarding'), grill);
    });
    ```
  In `plugins/forge/tests/session-chain-gate.test.js` in den Tests `cli_AnswerThenBrief_StartsChosenEtappeOnce` und `cli_EventsJsonl_RecordsHaltAnswerCommitAndStart` jeweils die Zeile `const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: 'utf8' });` ersetzen durch:
  ```js
    const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args, ...(args[0] === 'brief' ? ['--leit', 'local_leit-1'] : [])], { cwd: repo, encoding: 'utf8' });
  ```
  In `plugins/forge/tests/stage-start-guard.test.js` im Test `brief_Cli_StoresHashOfBriefTextAndModelInStartedState` die Zeile `const run = (...args) => spawnSync(process.execPath, [CHAIN, ...args], { cwd: repo, encoding: 'utf8' });` ersetzen durch:
  ```js
    const run = (...args) => spawnSync(process.execPath, [CHAIN, ...args, ...(args[0] === 'brief' ? ['--leit', 'local_leit-1'] : [])], { cwd: repo, encoding: 'utf8' });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-brief.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-chain-gate.test.js plugins/forge/tests/stage-start-guard.test.js` im Ordner `<R>` — erwartet: FAIL `buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks`, `buildBrief_Whiteboarding_ReportsWithTheAbschlussOfTheReview`, `buildBrief_WithLeit_NamesTheLeitSessionUnderValues`, `buildBrief_AnyEtappe_SendsOneMessageOnlyOnFinalWithoutHandover`, `buildBrief_Whiteboarding_RunsTheSpecReviewInTheSameSessionWithoutCommit`, `buildBrief_Whiteboarding_FollowupChangesTriggerNoSecondReview`, `buildBrief_Whiteboarding_ReviewStandFailureRetriesOnceThenNeedsUser`, `buildBrief_GrillWithOpenPoints_ListsThemInTheirOwnSection`, `brief_WithoutLeit_ExitsWithUsage`, `brief_LeitWithoutLocalPrefix_ExitsWithUsage`, `brief_LeitWithUnderscoreAndDot_IsAccepted`, `brief_WithLeit_NamesItInTheBrief`, `brief_GrillWithOpenPointsInState_ListsThemInTheBrief`, `chain_WhiteboardingClosedWithThreeOpenPoints_StateAndGrillBriefListThem`, sowie die `brief`-Aufrufe in Szenario-, Gate- und Start-Guard-Tests (Option `--leit` unbekannt)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/shared/session-chain/base-sub-agent.md`:
  - die Zeile `4. Starte keine weitere Session und sende keine Nachricht an die Leit-Session oder eine andere Session. Du meldest dich nur über dein Turn-Ende.` ersetzen durch:
    ```markdown
    4. Starte keine weitere Session. Eine Nachricht schickst du nur nach Regel 9; sonst meldest du dich über dein Turn-Ende.
    ```
  - nach der Zeile `8. Aufräumpflicht: Vor deinem letzten Turn-Ende beendest du alle Hintergrundprozesse, die du oder deine Agents gestartet haben.` einfügen:
    ```markdown
    9. Meldung bei `final`: Vor jedem Turn-Ende mit `STATUS=final` schickst du in diesem Turn genau eine Nachricht per `SendMessage` (vorher per `ToolSearch` mit `select:SendMessage` laden) an die Leit-Session aus „Werte“; `to` ist ihre Kennung. Inhalt: die Statuszeile als erste Zeile, als zweite `Spec: <pfad>`, wenn du den Pfad der Spec kennst; sonst nichts, kein Übergabe-Hinweis, keine nächste Etappe, kein Befehl. Ein wiederholtes `final` verarbeitet die Leit-Session nur einmal. Bei `in-progress` und `needs-user` schickst du keine Nachricht. Scheitert sie, steht nach der Statuszeile die Zeile `Leit-Session nicht benachrichtigt: [Leit-Session](#<Kennung>)`; dein Turn-Ende bleibt `final`.
    ```
  In `plugins/forge/scripts/lib/session-chain-brief.js`:
  - `const { goCall } = require('./session-chain-text');` ersetzen durch:
    ```js
    const { goCall } = require('./session-chain-text');
    const { pointLine } = require('./session-chain-points');
    ```
  - nach der Zeile `const BASE_FILE = path.join(PLUGIN_ROOT, 'shared', 'session-chain', 'base-sub-agent.md');` einfügen:
    ```js
    const CHAIN_SCRIPT = `${toPosix(PLUGIN_ROOT)}/scripts/session-chain.js`;

    // Kennung der Leit-Session, an die die Etappen-Session ihr `final` schickt, und ihre Zeile `- Leit-Session: <id>` unter `## Werte`.
    // Das eine Format für Brief (erzeugt), CLI `brief --leit` (prüft) und Hook der Etappen-Session (liest). Zeichensatz ohne
    // Shell-Zeichen; Unterstrich und Punkt sind erlaubt, weil das Format der Kennung aus `get_session` nicht festgelegt ist.
    const LEIT_LABEL = 'Leit-Session';
    const LEIT_ID_PATTERN = 'local_[A-Za-z0-9_.-]+';
    const LEIT_ID = new RegExp(`^${LEIT_ID_PATTERN}$`);
    ```
  - `module.exports = { buildBrief, ETAPPEN_BRIEFS, BASE_FILE, SONNET_MODEL_ID };` ersetzen durch:
    ```js
    module.exports = { buildBrief, ETAPPEN_BRIEFS, BASE_FILE, SONNET_MODEL_ID, LEIT_LABEL, LEIT_ID_PATTERN, LEIT_ID };
    ```
  - den Eintrag `whiteboarding: { … },` in `ETAPPEN_BRIEFS` ersetzen durch:
    ```js
      whiteboarding: {
        modell: 'sonnet', titel: 'Whiteboarding', pflicht: [],
        command: () => '/dv-forge:spec-whiteboarding-with-docs',
        auftrag: () => [
          'Eingabe des Whiteboardings ist der Abschnitt „Kontext“ unten.',
          'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session. Die Übergabe deines Skills (Review-Befehl, frische Session) gibst du nicht aus.',
          'Nach der Bestätigung und dem Schreiben der Spec rufst du ohne Rückfrage in dieser Session über das Skill-Werkzeug `dv-forge:spec-review-orchestrator` mit `"<deine Spec>" --ablage whiteboarding --whiteboarding` auf.',
          `Nach jedem Review-Lauf: \`node "${CHAIN_SCRIPT}" review-stand --spec "<deine Spec>"\`. \`FRAGE=nein\`: Etappe abschließen. \`FRAGE=ja\`: am Ende deiner Antwort die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“, Status \`needs-user\`.`,
          'Scheitert `review-stand` mit „Kein Spec-Review in der Ablage“: Review erneut aufrufen; scheitert es wieder, Status `needs-user` mit der Fehlermeldung, nicht abschließen.',
          '„Weiter an der Spec arbeiten“: jede Änderung als Vorher/Nachher, erst nach Bestätigung schreiben, danach erneut das Review und `review-stand`. Änderungen der Followup-Runden lösen kein weiteres Review aus.',
          'Abschließen: Berichtsdatei mit `--spec "<deine Spec>"` und `--bericht "<ABSCHLUSS aus review-stand>"`, dazu `--datei` je geänderter Glossar- oder ADR-Datei.',
        ],
      },
    ```
  - `const VALUE_LINES = [['slug', 'Slug'], ['wi', 'Workitem'], ['basis', 'Basis-Branch'], ['spec', 'Spec'], ['plan', 'Plan'], ['worktree', 'Worktree']];` ersetzen durch:
    ```js
    const VALUE_LINES = [['slug', 'Slug'], ['wi', 'Workitem'], ['basis', 'Basis-Branch'], ['spec', 'Spec'], ['plan', 'Plan'], ['worktree', 'Worktree'], ['leit', LEIT_LABEL]];
    ```
  - den Kommentar über `buildBrief` und die Funktion selbst bis einschließlich der Zeile `const sections = [` sowie den Abschnitt bis `baseRules(etappe, values),` so ersetzen:
    ```js
    // `values`: Werte der Kette (mit `leit`, der Kennung der Leit-Session); `decisions`: Entscheidungen früherer Etappen ({ etappe, text });
    // `kontext`: Text, nur Whiteboarding; `points`: offene Punkte der Kette, nur im Grill als eigener Abschnitt.
    function buildBrief({ etappe, values, decisions = [], kontext = null, points = [] }) {
      const etappenBrief = ETAPPEN_BRIEFS[checkedEtappe(etappe)];
      checkedValues(etappe, etappenBrief, values);
      const sections = [
        etappenBrief.command(values),
        `Etappe \`${etappe}\` einer Session-Kette, geführt von einer Leit-Session.`,
        ['## Werte', ...valueLines(values)].join('\n'),
        ['## Auftrag', ...etappenBrief.auftrag(values).map((line) => `- ${line}`)].join('\n'),
        ...(decisions.length > 0 ? [['## Entscheidungen aus früheren Etappen', ...decisions.map((entry) => `- ${entry.etappe}: ${entry.text}`)].join('\n')] : []),
        ...(etappe === 'grill' && points.length > 0 ? [['## Offene Punkte aus früheren Etappen', 'Prüf sie im Grill mit; sie gelten nicht als beantwortet.', ...points.map(pointLine)].join('\n')] : []),
        ...(etappe === 'whiteboarding' ? [['## Kontext', String(kontext ?? '').trim()].join('\n')] : []),
        baseRules(etappe, values),
      ];
    ```
    Die Zeilen ab `const background = …` bis zum Ende der Funktion bleiben unverändert.
  In `plugins/forge/scripts/session-chain.js`:
  - in `USAGE` die Zeile `'       node session-chain.js brief --etappe <etappe> [--slug <slug>] [--kontext <datei>] [--quelle <datei>] [--basis <branch>] [--wi <nr>] [--erneut]',` ersetzen durch:
    ```js
      '       node session-chain.js brief --etappe <etappe> --leit <local_…> [--slug <slug>] [--kontext <datei>] [--quelle <datei>] [--basis <branch>] [--wi <nr>] [--erneut]',
    ```
  - in `VALUE_OPTIONS` `'--slug', '--basis',` ersetzen durch:
    ```js
    '--slug', '--leit', '--basis',
    ```
  - `const { buildBrief, SONNET_MODEL_ID } = require('./lib/session-chain-brief');` ersetzen durch:
    ```js
    const { buildBrief, SONNET_MODEL_ID, LEIT_ID } = require('./lib/session-chain-brief');
    ```
  - die Funktion `brief` bis einschließlich `kontext: values.kontext ? readInput(values.kontext, 'Kontext') : null,` und der folgenden Zeile `});` ersetzen durch:
    ```js
    function brief(values) {
      const leit = required(values, 'leit');
      if (!LEIT_ID.test(leit)) throw new UsageError(`--leit erwartet die Kennung der Leit-Session (local_…), nicht ${leit}`);
      const state = values.slug ? readState(process.cwd(), values.slug) : null;
      if (state && values.etappe === 'grill') checkWhiteboardingCommitted(state, process.cwd());
      const chain = { ...(state ?? {}), ...(values.slug ? { slug: values.slug } : {}), ...(values.basis ? { basis: values.basis } : {}), ...(values.wi ? { wi: values.wi } : {}) };
      const result = buildBrief({
        etappe: required(values, 'etappe'),
        values: { slug: chain.slug, wi: chain.wi, basis: chain.basis, spec: chain.spec, plan: chain.plan, worktree: chain.worktree, branch: chain.branch, quelle: values.quelle, leit },
        decisions: state?.entscheidungen ?? [],
        points: state?.offen ?? [],
        kontext: values.kontext ? readInput(values.kontext, 'Kontext') : null,
      });
    ```
    Die Zeilen ab `// Erst nach dem gebauten Brief:` bleiben unverändert.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-brief.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-chain-gate.test.js plugins/forge/tests/stage-start-guard.test.js plugins/forge/tests/stage-guard.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-brief.js plugins/forge/shared/session-chain/base-sub-agent.md plugins/forge/scripts/session-chain.js plugins/forge/tests/session-chain-brief.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-scenario.test.js plugins/forge/tests/session-chain-gate.test.js plugins/forge/tests/stage-start-guard.test.js` · `git commit -m "feat(forge): stages report final to the leit session"`

### Task 5: Hook der Etappen-Session prüft die Nachricht bei final

**ACs:** AC-07, AC-14

**Dateien:**
- Modify: `plugins/forge/scripts/lib/stage-guard.js:1-162` · `briefOf`, `briefFromTranscript`, `onTurnEnd`
- Test: `plugins/forge/tests/stage-guard.test.js` · `onTurnEnd_FinalWithReportAndNoCommit_Allows`

**Interfaces:**
- Consumes: Zeile `- Leit-Session: <id>` unter `## Werte` im Brief, `LEIT_LABEL` und `LEIT_ID_PATTERN` aus `scripts/lib/session-chain-brief.js` (Task 4)
- Produces: Marker der Etappen-Session mit `leit: string|null`; Block-Grund am Turn-Ende bei `final` ohne erfolgreiches `SendMessage` an die Leit-Session im laufenden Turn (ein `tool_result` mit `is_error: true` zählt nicht) und ohne die Zeile `Leit-Session nicht benachrichtigt`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/stage-guard.test.js` nach dem Test `onTurnEnd_FinalWithReportAndNoCommit_Allows` einfügen:
  ```js
  const LEIT = 'local_leit-1';
  // Form wie im Protokoll einer echten Etappen-Session (Whiteboarding 313073): Werkzeug `SendMessage`, Ziel in `input.to`.
  const sent = (to) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'toolu_1', name: 'SendMessage', input: { to, summary: 'final melden', message: '[planning] STATUS=final' } }] } });
  const toolResult = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] } };
  // Form eines Fehlerergebnisses wie in echten Protokollen: `is_error: true` am `tool_result` mit derselben `tool_use_id`.
  const failedResult = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Session nicht erreichbar', is_error: true }] } };

  function startedWithLeit(etappe = 'planning') {
    const tmpRoot = tmp();
    const text = buildBrief({ etappe, values: { slug: 'x', spec: '/r/docs/forge/x/spec.md', wi: '12', leit: LEIT } }).brief;
    stage.onPrompt({ session_id: SESSION, prompt: text }, tmpRoot);
    return tmpRoot;
  }

  function transcript(entries) {
    const file = path.join(tmp(), 'transcript.jsonl');
    fs.writeFileSync(file, entries.map((entry) => JSON.stringify(entry)).join('\n'));
    return file;
  }

  test('onPrompt_BriefWithLeit_StoresLeitInMarker', () => {
    assert.equal(stage.readMarker(SESSION, startedWithLeit()).leit, LEIT);
  });

  test('onTurnEnd_FinalWithoutMessageToLeit_BlocksNamingTheLeit', () => {
    const { bericht } = writtenReport();
    const reason = turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief')]) });
    assert.match(reason, /SendMessage an local_leit-1/);
  });

  test('onTurnEnd_FinalAfterMessageToLeit_Allows', () => {
    const { bericht } = writtenReport();
    assert.equal(turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief'), sent(LEIT)]) }), null);
  });

  test('onTurnEnd_FinalWithMessageBeforeToolResultOfSameTurn_Allows', () => {
    const { bericht } = writtenReport();
    assert.equal(turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief'), sent(LEIT), toolResult]) }), null);
  });

  test('onTurnEnd_FinalAfterFailedMessageToLeit_Blocks', () => {
    const { bericht } = writtenReport();
    const reason = turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief'), sent(LEIT), failedResult]) });
    assert.match(reason, /SendMessage an local_leit-1/);
  });

  test('onTurnEnd_FinalAfterFailedMessageWithNotNotifiedLine_Allows', () => {
    const { bericht } = writtenReport();
    const last = `${line({ status: 'final', bericht })}\nLeit-Session nicht benachrichtigt: [Leit-Session](#${LEIT})`;
    assert.equal(turnEnd(startedWithLeit(), last, { transcript_path: transcript([human('Brief'), sent(LEIT), failedResult]) }), null);
  });

  test('onTurnEnd_FinalWithMessageOnlyInEarlierTurn_Blocks', () => {
    const { bericht } = writtenReport();
    const reason = turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief'), sent(LEIT), human('Showstopper geklärt')]) });
    assert.match(reason, /SendMessage an local_leit-1/);
  });

  test('onTurnEnd_FinalWithMessageToOtherSession_Blocks', () => {
    const { bericht } = writtenReport();
    assert.notEqual(turnEnd(startedWithLeit(), line({ status: 'final', bericht }), { transcript_path: transcript([human('Brief'), sent('local_other')]) }), null);
  });

  test('onTurnEnd_FinalWithNotNotifiedLine_Allows', () => {
    const { bericht } = writtenReport();
    const last = `${line({ status: 'final', bericht })}\nLeit-Session nicht benachrichtigt: [Leit-Session](#${LEIT})`;
    assert.equal(turnEnd(startedWithLeit(), last, { transcript_path: transcript([human('Brief')]) }), null);
  });

  test('onTurnEnd_NeedsUserWithoutMessage_Allows', () => {
    assert.equal(turnEnd(startedWithLeit(), line({ status: 'needs-user' }), { transcript_path: transcript([human('Brief')]) }), null);
  });

  test('onTurnEnd_FinalWithLeitButWithoutTranscript_FailsOpen', () => {
    const { bericht } = writtenReport();
    assert.equal(turnEnd(startedWithLeit(), line({ status: 'final', bericht })), null);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/stage-guard.test.js` im Ordner `<R>` — erwartet: FAIL `onPrompt_BriefWithLeit_StoresLeitInMarker`, `onTurnEnd_FinalWithoutMessageToLeit_BlocksNamingTheLeit`, `onTurnEnd_FinalAfterFailedMessageToLeit_Blocks`, `onTurnEnd_FinalWithMessageOnlyInEarlierTurn_Blocks`, `onTurnEnd_FinalWithMessageToOtherSession_Blocks`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/stage-guard.js`:
  - im Kopfkommentar die Zeile `// Am Turn-Ende prüft der Hook die Statuszeile; bei `final` zusätzlich Berichtsdatei und Commit.` ersetzen durch:
    ```js
    // Am Turn-Ende prüft der Hook die Statuszeile; bei `final` zusätzlich Berichtsdatei, Commit und die Nachricht an die Leit-Session.
    ```
  - `const { BASE_FILE } = require('./session-chain-brief');` ersetzen durch:
    ```js
    const { BASE_FILE, LEIT_LABEL, LEIT_ID_PATTERN } = require('./session-chain-brief');
    ```
  - nach der Zeile `const COMMIT_HASH = /^[0-9a-f]{4,40}$/;` einfügen:
    ```js
    // Zeile und Kennung im Format aus session-chain-brief.js, das auch `brief --leit` prüft.
    const LEIT_LINE = new RegExp(`^- ${LEIT_LABEL}: (${LEIT_ID_PATTERN})[ \\t]*$`, 'm');
    const NOT_NOTIFIED = 'Leit-Session nicht benachrichtigt';
    ```
  - in `briefOf` die Zeile `return { etappe, slug: slug && /^[a-z0-9][a-z0-9._-]*$/i.test(slug) ? slug : null };` ersetzen durch:
    ```js
      return { etappe, slug: slug && /^[a-z0-9][a-z0-9._-]*$/i.test(slug) ? slug : null, leit: LEIT_LINE.exec(text)?.[1] ?? null };
    ```
  - vor dem Kommentar `// Fällt der Marker weg (etwa bei einer fortgesetzten Session), liefert die erste Nutzer-Nachricht im Protokoll denselben Brief.` einfügen:
    ```js
    // Nutzer-Eintrag, der kein Werkzeug-Ergebnis ist: Beginn eines Turns (Brief, Mensch, Nachricht einer Session, Benachrichtigung).
    function isTurnStart(entry) {
      return entry.type === 'user' && !entry.isMeta && !isToolResultEntry(entry);
    }

    ```
  - in `briefFromTranscript` die Zeile `const first = readEntries(file).find((entry) => entry.type === 'user' && !entry.isMeta && !isToolResultEntry(entry));` ersetzen durch:
    ```js
      const first = readEntries(file).find(isTurnStart);
    ```
  - vor dem Kommentar `// Block-Grund oder `null`. Blockt höchstens zweimal in Folge;` einfügen:
    ```js
    // Kennungen der Werkzeug-Aufrufe, deren Ergebnis ein Fehler ist (`is_error: true` am `tool_result`).
    function failedToolIds(entries) {
      return new Set(entries.filter(isToolResultEntry).flatMap((entry) => entry.message.content)
        .filter((part) => part?.type === 'tool_result' && part.is_error === true).map((part) => part.tool_use_id));
    }

    // Ob die Etappen-Session im laufenden Turn per SendMessage an `leit` geschrieben hat; ohne lesbares Protokoll `true` (fail-open).
    // Nur der laufende Turn zählt: Eine Nachricht zu einem früheren `final` deckt ein neues nicht ab. Ein Aufruf mit Fehlerergebnis
    // zählt nicht; fehlt das Ergebnis noch, zählt er.
    function messagedLeit(file, leit) {
      if (!file || !fs.existsSync(file)) return true;
      const entries = readEntries(file);
      const turn = entries.slice(entries.findLastIndex(isTurnStart) + 1);
      const failed = failedToolIds(turn);
      return turn.some((entry) => entry.type === 'assistant' && Array.isArray(entry.message?.content)
        && entry.message.content.some((part) => part?.type === 'tool_use' && part.name === 'SendMessage' && part.input?.to === leit && !failed.has(part.id)));
    }

    // `final` mit Leit-Session im Brief: eine Nachricht an sie oder die Zeile, dass sie gescheitert ist.
    function messageProblem(status, marker, input, text) {
      if (status?.status !== 'final' || !marker.leit) return null;
      if (text.includes(NOT_NOTIFIED) || messagedLeit(input.transcript_path, marker.leit)) return null;
      return `Vor dem final schickst du eine Nachricht an die Leit-Session: SendMessage an ${marker.leit}, die Statuszeile als erste Zeile. `
        + `Scheitert sie, schreib nach der Statuszeile „${NOT_NOTIFIED}: [Leit-Session](#${marker.leit})“.`;
    }

    ```
  - in `onTurnEnd` die Zeilen
    ```js
      const status = parseStatusLine(lastAssistantText(input));
      const problem = statusProblem(marker.etappe, status) ?? finalProblem(status, marker, input.cwd);
    ```
    ersetzen durch:
    ```js
      const text = lastAssistantText(input);
      const status = parseStatusLine(text);
      const problem = statusProblem(marker.etappe, status) ?? finalProblem(status, marker, input.cwd) ?? messageProblem(status, marker, input, text);
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/stage-guard.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/stage-guard.js plugins/forge/tests/stage-guard.test.js` · `git commit -m "feat(forge): stage hook checks the final message"`

### Task 6: Zeile bei in-progress

**ACs:** AC-16

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-chain-turn.js:26-33` · `turnAction`
- Modify: `plugins/forge/scripts/lib/session-chain-text.js:59-61` · `noStatusHint`
- Modify: `plugins/forge/scripts/session-chain.js:95-102` · `turn`
- Test: `plugins/forge/tests/session-chain-turn.test.js` · `turnAction_InProgress_StaysSilentAndResetsCount`
- Test: `plugins/forge/tests/session-chain-cli.test.js` · `turn_FinalStatusLineWithShellCharactersInText_PrintsActionAndFields`

**Interfaces:**
- Consumes: —
- Produces: `turnAction(count, parsed)` liefert bei `in-progress` `{ aktion: 'laeuft', ohneStatus: 0 }`; `runningLine(etappe) → '<etappe>: läuft'` in `session-chain-text.js`; CLI `turn` gibt bei `AKTION=laeuft` den Block `=== AUSGABE ===` mit dieser Zeile aus

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/session-chain-turn.test.js` den Test `turnAction_InProgress_StaysSilentAndResetsCount` ersetzen durch:
  ```js
  test('turnAction_InProgress_RunningLineAndResetsCount', () => {
    // Act
    const result = turnAction(2, parseStatusLine('[grill] STATUS=in-progress · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none'));

    // Assert
    assert.deepEqual(result, { aktion: 'laeuft', ohneStatus: 0 });
  });
  ```
  In `plugins/forge/tests/session-chain-cli.test.js` nach dem Test `turn_FinalStatusLineWithShellCharactersInText_PrintsActionAndFields` einfügen:
  ```js
  test('turn_InProgress_PrintsExactlyTheRunningLine', () => {
    // Arrange
    const repo = makeRepo();
    const turnEnd = scratch('turn.md', '[grill] STATUS=in-progress · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none\nLäuft.\n');

    // Act
    const result = chain(repo, 'turn', '--session', 'local_t', '--etappe', 'grill', '--turn-datei', turnEnd);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^AKTION=laeuft$/m);
    assert.equal(result.stdout.split('=== AUSGABE ===\n')[1], 'grill: läuft\n');
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-turn.test.js plugins/forge/tests/session-chain-cli.test.js` im Ordner `<R>` — erwartet: FAIL `turnAction_InProgress_RunningLineAndResetsCount`, `turn_InProgress_PrintsExactlyTheRunningLine`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/session-chain-turn.js`:
  - im Kopfkommentar die Zeile `// Turn-Ende einer Etappen-Session: Statuszeile lesen und entscheiden, ob die Leit-Session schweigt oder handelt.` ersetzen durch:
    ```js
    // Turn-Ende einer Etappen-Session: Statuszeile lesen und entscheiden, ob die Leit-Session schweigt, die Zeile `<etappe>: läuft` ausgibt oder handelt.
    ```
  - in `turnAction` die Zeile `const aktion = { 'in-progress': 'schweigen', 'needs-user': 'needs-user', final: 'final' }[parsed.status];` ersetzen durch:
    ```js
      const aktion = { 'in-progress': 'laeuft', 'needs-user': 'needs-user', final: 'final' }[parsed.status];
    ```
  In `plugins/forge/scripts/lib/session-chain-text.js`:
  - vor `function noStatusHint({ etappe, session }) {` einfügen:
    ```js
    // Einzige Ausgabe der Leit-Session bei `in-progress`: Die App verlangt nach jedem Turn sichtbaren Text.
    function runningLine(etappe) {
      return `${etappe}: läuft`;
    }

    ```
  - `module.exports = { goCall, specHalt, goHalt, noStatusHint, showstopperText, deviationText, adoptedText, finalReport };` ersetzen durch:
    ```js
    module.exports = { goCall, specHalt, goHalt, runningLine, noStatusHint, showstopperText, deviationText, adoptedText, finalReport };
    ```
  In `plugins/forge/scripts/session-chain.js`:
  - `const { goCall, adoptedText, noStatusHint } = require('./lib/session-chain-text');` ersetzen durch:
    ```js
    const { goCall, adoptedText, noStatusHint, runningLine } = require('./lib/session-chain-text');
    ```
  - in `turn` die Zeile `return withBlock(lines, 'AUSGABE', aktion === 'hinweis' ? noStatusHint({ etappe: required(values, 'etappe'), session }) : '').join('\n');` ersetzen durch:
    ```js
      const block = { hinweis: () => noStatusHint({ etappe: required(values, 'etappe'), session }), laeuft: () => runningLine(required(values, 'etappe')) }[aktion];
      return withBlock(lines, 'AUSGABE', block ? block() : '').join('\n');
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-turn.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-text.test.js` im Ordner `<R>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-turn.js plugins/forge/scripts/lib/session-chain-text.js plugins/forge/scripts/session-chain.js plugins/forge/tests/session-chain-turn.test.js plugins/forge/tests/session-chain-cli.test.js` · `git commit -m "feat(forge): running line on in-progress"`

### Task 7: Leit-Session: eigene Kennung, Nachricht als Turn-Ende, Whiteboarding-Commit

**ACs:** AC-09, AC-11, AC-15, AC-16, AC-21

**Dateien:**
- Modify: `plugins/forge/skills/session-orchestrator/SKILL.md` · `## Regeln`, `## Einstieg`, `## Turn-Ende einer Etappen-Session`, `## Rote Flaggen`
- Modify: `plugins/forge/skills/session-orchestrator/references/ablauf.md` · `## Statuszeile`, `## Final prüfen`, `## Glossar-Commit`
- Modify: `plugins/forge/README.md:10` · `4. **Session-Kette:**`
- Test: `plugins/forge/tests/session-orchestrator-skill.test.js` · `sessionOrchestrator_Body_WhiteboardingGetsContextSummaryOrOneQuestion`
- Test: `plugins/forge/tests/session-chain-readme.test.js` · `readme_Ablauf_NamesSessionChainStateAndBaseFile`

**Interfaces:**
- Consumes: `checkWhiteboardingCommitted` (Task 3), `runningLine` (Task 6)
- Produces: Skill-Texte der Leit-Session

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/session-orchestrator-skill.test.js`:
  - im Test `sessionOrchestrator_Body_WhiteboardingGetsContextSummaryOrOneQuestion` die Zeile `assert.ok(body.includes('`<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B>`'));` ersetzen durch:
    ```js
      assert.ok(body.includes('`<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B> --leit <L>`'));
    ```
  - am Dateiende einfügen:
    ```js
    test('sessionOrchestrator_Body_PassesItsOwnIdToEveryBriefAndPrintsRunningLine', () => {
      // Act
      const { body } = readMarkdown(SKILL);

      // Assert
      assert.ok(body.includes('`<SC> brief --etappe <e> --slug <slug> --leit <L>`'));
      assert.ok(body.includes('Deine Kennung `<L>` ist `sessionId` aus `mcp__ccd_session_mgmt__get_session` mit `session_id` `self` (Werkzeug vorher per `ToolSearch` laden).'));
      assert.ok(body.includes('Vor dem ersten Turn-Ende oder der ersten Nachricht einer Etappen-Session liest du `references/ablauf.md`'));
      assert.ok(body.includes('| „Zwischenstand, kurz kommentieren.“ | `in-progress`: nur die Zeile `<e>: läuft`. |'));
    });

    test('sessionOrchestratorFlow_MessageOfStage_CountsAsTurnEndAndWhiteboardingCommitsFirst', () => {
      // Act
      const text = readText(FLOW);

      // Assert
      for (const part of [
        'Eine Nachricht einer Etappen-Session (`<cross-session-message from="<id>">`) behandelst du wie ihr Turn-Ende: `<id>` aus `from`, ihre erste Zeile ist die Statuszeile. Kommt dasselbe `final` per Turn-Ende und per Nachricht, meldet das zweite `WEITER=doppelt`.',
        '- `laeuft`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.',
        '| `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. Nach dem `final` von `whiteboarding` erst „Whiteboarding-Commit“. |',
        '## Whiteboarding-Commit\n`<SC> commit --anlass whiteboarding --slug <slug> --message "<betreff>"`: Spec und gemeldete Glossar- und ADR-Dateien des Whiteboardings.',
      ]) assert.ok(text.includes(part), part);
    });
    ```
  In `plugins/forge/tests/session-chain-readme.test.js` im Test `readme_Ablauf_NamesSessionChainStateAndBaseFile` nach der Zeile `assert.ok(text.includes('`shared/session-chain/base-sub-agent.md`'));` einfügen:
  ```js
    assert.ok(text.includes('Das Whiteboarding prüft seine Spec in derselben Etappen-Session mit dem Spec-Review-Orchestrator; jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session.'));
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/tests/session-chain-readme.test.js` im Ordner `<R>` — erwartet: FAIL `sessionOrchestrator_Body_WhiteboardingGetsContextSummaryOrOneQuestion`, `sessionOrchestrator_Body_PassesItsOwnIdToEveryBriefAndPrintsRunningLine`, `sessionOrchestratorFlow_MessageOfStage_CountsAsTurnEndAndWhiteboardingCommitsFirst`, `readme_Ablauf_NamesSessionChainStateAndBaseFile`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/session-orchestrator/SKILL.md`:
  - in Regel 3 `` `<SC> brief --etappe <e> --slug <slug>`, dann `` ersetzen durch:
    ```markdown
    `<SC> brief --etappe <e> --slug <slug> --leit <L>`, dann
    ```
  - `` 1. `<SC> entry $ARGUMENTS`. `=== ZUSTAND ===` ausgeben, wenn vorhanden. `` ersetzen durch:
    ```markdown
    1. `<SC> entry $ARGUMENTS`. `=== ZUSTAND ===` ausgeben, wenn vorhanden. Deine Kennung `<L>` ist `sessionId` aus `mcp__ccd_session_mgmt__get_session` mit `session_id` `self` (Werkzeug vorher per `ToolSearch` laden).
    ```
  - `` `<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B>` `` ersetzen durch:
    ```markdown
    `<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B> --leit <L>`
    ```
  - `` Vor dem ersten Turn-Ende liest du `references/ablauf.md` `` ersetzen durch:
    ```markdown
    Vor dem ersten Turn-Ende oder der ersten Nachricht einer Etappen-Session liest du `references/ablauf.md`
    ```
  - die Zeile `` | „Zwischenstand, kurz kommentieren.“ | `in-progress`: schweigen. | `` ersetzen durch:
    ```markdown
    | „Zwischenstand, kurz kommentieren.“ | `in-progress`: nur die Zeile `<e>: läuft`. |
    ```
  In `plugins/forge/skills/session-orchestrator/references/ablauf.md`:
  - nach der Zeile `## Statuszeile` einfügen:
    ```markdown
    Eine Nachricht einer Etappen-Session (`<cross-session-message from="<id>">`) behandelst du wie ihr Turn-Ende: `<id>` aus `from`, ihre erste Zeile ist die Statuszeile. Kommt dasselbe `final` per Turn-Ende und per Nachricht, meldet das zweite `WEITER=doppelt`.

    ```
  - nach der Zeile `` - `schweigen`: keine Ausgabe, nichts starten. `` einfügen:
    ```markdown
    - `laeuft`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.
    ```
  - die Tabellenzeile `` | `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. | `` ersetzen durch:
    ```markdown
    | `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. Nach dem `final` von `whiteboarding` erst „Whiteboarding-Commit“. |
    ```
  - vor der Zeile `## Antwort am Haltepunkt` einfügen:
    ```markdown
    ## Whiteboarding-Commit
    `<SC> commit --anlass whiteboarding --slug <slug> --message "<betreff>"`: Spec und gemeldete Glossar- und ADR-Dateien des Whiteboardings. Betreff wie beim Glossar-Commit. Exit ungleich 0: Meldung wörtlich ausgeben, nichts starten. Zeilen `NICHT-COMMITTET=…` nennst du in einer Zeile.

    ```
  In `plugins/forge/README.md` in der Zeile, die mit `4. **Session-Kette:**` beginnt, am Zeilenende nach `Ketten-Regeln und Gesprächsstil.` anfügen:
  ```markdown
   Das Whiteboarding prüft seine Spec in derselben Etappen-Session mit dem Spec-Review-Orchestrator; jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session.
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/tests/session-chain-readme.test.js` im Ordner `<R>` — erwartet: PASS (auch `sessionOrchestrator_Body_StaysUnder500WordsWithPairedQuotes`)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/session-orchestrator/SKILL.md plugins/forge/skills/session-orchestrator/references/ablauf.md plugins/forge/README.md plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/tests/session-chain-readme.test.js` · `git commit -m "docs(forge): leit session handles stage messages"`

### Task 8: Absicherung des unveränderten Verhaltens

**ACs:** AC-15, AC-17, AC-18

**Dateien:**
- Test: `plugins/forge/tests/spec-whiteboarding-with-docs.test.js` · `withDocs_Body_LoadsBothSkillsViaSkillTool`
- Test: `plugins/forge/tests/spec-whiteboarding.test.js` · `specFormat_Template_HasFiveSectionsInOrder`
- Test: `plugins/forge/tests/session-chain-brief.test.js` · `buildBrief_SkillEtappen_StartWithTheSlashCommandOfTheirSkill`
- Test: `plugins/forge/tests/session-chain-cli.test.js` · `final_SameFinalTwice_PrintsDoppeltWithoutBlock`
- Test: `plugins/forge/tests/session-chain-steps.test.js` · `processFinal_SpecReviewReadyWithThreeHints_HoldsAtSpecHaltepunktRecommendingPlanning`

**Interfaces:**
- Consumes: —
- Produces: —

- [ ] **Schritt 1: Absicherungstests schreiben oder bestehende nennen**
  In `plugins/forge/tests/spec-whiteboarding-with-docs.test.js` nach dem Test `withDocs_Body_LoadsBothSkillsViaSkillTool` einfügen:
  ```js
  test('withDocs_Body_RunsNoSpecReviewOfItsOwn', () => {
    const { body } = readMarkdown(SKILL);
    for (const part of ['spec-review-orchestrator', 'review-stand', 'Spec abschließen']) assert.ok(!body.includes(part), part);
  });
  ```
  In `plugins/forge/tests/spec-whiteboarding.test.js` am Dateiende einfügen:
  ```js
  test('specWhiteboarding_Body_HandsOverToAFreshSpecReviewWithoutReviewingItself', () => {
    const { body } = readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));
    assert.ok(body.includes('kopierbarer Befehl `/dv-forge:spec-review <pfad>`'));
    for (const part of ['spec-review-orchestrator', 'review-stand', 'Spec abschließen']) assert.ok(!body.includes(part), part);
  });
  ```
  In `plugins/forge/tests/session-chain-brief.test.js` nach dem Test `buildBrief_SkillEtappen_StartWithTheSlashCommandOfTheirSkill` einfügen:
  ```js
  test('buildBrief_SpecReviewAfterGrill_StillCommitsTheSpecItselfWithoutWhiteboardingOption', () => {
    // Act
    const text = brief('spec-review').brief;

    // Assert
    assert.ok(text.includes('Der Skill committet die Spec selbst.'));
    assert.ok(!text.includes('--whiteboarding'));
  });
  ```
  Bestehende Absicherungstests ohne Änderung: `final_SameFinalTwice_PrintsDoppeltWithoutBlock` in `session-chain-cli.test.js` (AC-15) und `processFinal_SpecReviewReadyWithThreeHints_HoldsAtSpecHaltepunktRecommendingPlanning` in `session-chain-steps.test.js` (AC-18).
- [ ] **Schritt 2: Absicherungstests laufen lassen**
  Befehl: `node --test plugins/forge/tests/spec-whiteboarding-with-docs.test.js plugins/forge/tests/spec-whiteboarding.test.js plugins/forge/tests/session-chain-brief.test.js plugins/forge/tests/session-chain-cli.test.js plugins/forge/tests/session-chain-steps.test.js` im Ordner `<R>` — erwartet: PASS `withDocs_Body_RunsNoSpecReviewOfItsOwn`, `specWhiteboarding_Body_HandsOverToAFreshSpecReviewWithoutReviewingItself`, `buildBrief_SpecReviewAfterGrill_StillCommitsTheSpecItselfWithoutWhiteboardingOption`, `final_SameFinalTwice_PrintsDoppeltWithoutBlock`, `processFinal_SpecReviewReadyWithThreeHints_HoldsAtSpecHaltepunktRecommendingPlanning`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Commit**
  Danach die ganze Testsuite: `node --test plugins/forge/tests/` im Ordner `<R>` — erwartet: PASS.
  `git add plugins/forge/tests/spec-whiteboarding-with-docs.test.js plugins/forge/tests/spec-whiteboarding.test.js plugins/forge/tests/session-chain-brief.test.js` · `git commit -m "test(forge): guard unchanged whiteboarding and spec review"`

## Entscheidungen
- **W · Zeile bei gescheiterter Nachricht** · Aussage — Nach der Statuszeile steht genau `Leit-Session nicht benachrichtigt: [Leit-Session](#<Kennung>)`.
- **W · Offene Punkte im Grill-Brief** · Aussage — Abschnitt `## Offene Punkte aus früheren Etappen` mit „Prüf sie im Grill mit; sie gelten nicht als beantwortet.“ und je Punkt `- <Icon> <Titel> · <Herkunft>`, wie am Spec-Haltepunkt, jetzt auch mit 🔴.
- **E · Kennung der Leit-Session als Pflichtoption** · Planer — `brief` verlangt `--leit <local_…>`; ohne sie entsteht kein Brief. So nennt jeder Brief die Leit-Session (AC-21), ohne Zustand für das Whiteboarding, das noch keinen Slug hat. Die Leit-Session holt ihre Kennung mit `mcp__ccd_session_mgmt__get_session` (`self`); im Lauf zu 313073 kam die Nachricht der Etappe mit `from="local_…"` an, also erreicht `SendMessage` die Leit-Session über diese Kennung.
- **E · Hook prüft die Nachricht** · Planer — Der Stop-Hook der Etappen-Session blockt ein `final` ohne `SendMessage` an die Leit-Session im laufenden Turn und ohne die Zeile zur gescheiterten Nachricht. Gezählt wird nur ab dem letzten Nutzer-Eintrag, der kein Werkzeug-Ergebnis ist; so deckt die Nachricht zu einem früheren `final` (etwa vor einem geklärten Showstopper) ein neues nicht ab. Deshalb schickt die Etappe bei jedem Turn-Ende mit `final` eine Nachricht; ein wiederholtes `final` verarbeitet die Leit-Session über `WEITER=doppelt` nur einmal. Das Protokollformat (`name: "SendMessage"`, `input.to`) ist im Protokoll der Whiteboarding-Session zu 313073 belegt. Der Text-Regel allein hat die Etappe bei 313073 nicht gefolgt (Übergabe-Hinweise trotz Regel 7). Ohne lesbares Protokoll gibt der Hook frei.
- **E · Stand des Reviews als Skript** · Planer — `review-stand` liest die Ablage `whiteboarding` und entscheidet `FRAGE=ja|nein` (nein nur bei ✅ ohne jeden Punkt), statt die Etappe Farben zählen zu lassen. Gezählt wird wie bei den offenen Punkten der Kette (`mergeOpenKeepUnchanged`): Ein gewählter, aber unveränderter Punkt bleibt offen und führt zur Frage.
- **E · Bericht ohne „Wie es weitergeht“ im Skript** · Planer — Der Stop-Hook verlangt alle Überschriften des gezeigten Berichts. Deshalb lässt `orchestrator-report.js --ohne-weiter ja` den Abschnitt weg, statt dass die Etappe ihn aus der Ausgabe streicht.
- **E · Option `--whiteboarding` des Spec-Review-Orchestrators** · Planer — Eine Option bündelt „kein Commit“ und „ohne Wie es weitergeht“, weil beide nur im Whiteboarding einer Session-Kette gelten. Die Wortgrenze des Skills steigt von 650 auf 700.
- **E · Prüfung „kein eigener Commit“** · Planer — Statt des Stands bei Etappenstart (das Whiteboarding hat vor dem `final` keinen Zustand) prüft die Leit-Session: gemeldeter Commit `none`, Spec ohne Commit-Historie, gemeldete Glossar- und ADR-Dateien noch uncommittet.
- **E · Grill erst nach dem Whiteboarding-Commit** · Planer — `brief --etappe grill` verweigert den Start, solange nach dem `final` des Whiteboardings die Spec uncommittet ist. So kann die Leit-Session den Commit nicht überspringen.
- **E · 🔴 nur aus dem Whiteboarding** · Planer — Offene 🔴 führt die Kette nur mit Herkunft `whiteboarding`, weil nur dort der Mensch trotz 🔴 abschließen darf; bei den anderen Etappen bleibt es bei 🟡 und 🟢. Das Spec-Review nach dem Grill löst die Punkte des Whiteboardings ab wie das Plan-Review die des Planning.
- **E · Punkte-Abschnitt nur im Grill-Brief** · Planer — Die Spec verlangt die offenen Punkte nur im Brief des Grills; andere Briefe bleiben unverändert.
- **R1 · AC-10** — geändert — `applyFinal` in `session-chain-steps.js` liest die Bericht-Daten schon heute aus dem Ordner der Berichtsdatei; die Berichtsdatei des Whiteboardings liegt in der Ablage `whiteboarding`, in der auch das Review liegt. Deshalb kein Code-Eingriff, sondern Tests: Task 3 bekommt `processFinal_WhiteboardingWithTwoYellowAndOneGreen_KeepsAllThreeInState` (Zustand `offen` mit drei Punkten, Herkunft `whiteboarding`) und AC-10 unter seinen ACs; Task 4 bekommt den Szenario-Test `chain_WhiteboardingClosedWithThreeOpenPoints_StateAndGrillBriefListThem` (Review in der Ablage, `review-stand`, Abschluss mit `ABSCHLUSS`, `final`, Whiteboarding-Commit, Grill-Brief mit den drei Zeilen). Das ganze AC ist damit gedeckt: Abschlussfrage (`FRAGE=ja`), Zustand und Grill-Brief.
- **R1 · AC-06** — geändert — Task 4 führt AC-06 unter seinen ACs und bekommt den eigenen Test `buildBrief_Whiteboarding_FollowupChangesTriggerNoSecondReview` (kein weiteres Review nach Followup-Änderungen, danach nur `review-stand`). Der Teil „Abschlussfrage oder Abschluss nach AC-04“ bleibt über `reviewStand_FollowupChangedTheOnlyYellow_AsksNoQuestion` in Task 1 gedeckt.
- **R1 · Global Constraints** — geändert — Alle zitierten Soll-Vorgaben stehen jetzt in Global Constraints: Review nur im Whiteboarding einer Session-Kette, Modell Sonnet, vollständiger Orchestrator mit bis zu zwei Followup-Runden ohne weiteres Review, Bericht ohne „Wie es weitergeht“, Auslöser der Abschlussfrage, ✅ ohne Punkt ohne Frage, unbegrenzte Schleife, Punkte aller Farben in Zustand und Grill-Brief, Leit-Session im Brief jeder Etappe, keine weitere Session und Nachricht, `final` genau einmal verarbeitet, Commit der Leit-Session nach dem Whiteboarding.
- **R1 · Task 4** — geändert — Der Whiteboarding-Auftrag nennt jetzt den Fehlerpfad von `review-stand` („Kein Spec-Review in der Ablage“: Review erneut aufrufen, beim zweiten Scheitern `needs-user` mit der Meldung, nicht abschließen), mit Brief-Test. Festlegung zur Kennung: Da Spec und Repo das Format der Kennung aus `get_session` nicht festlegen, erlauben `LEIT_ID` (Task 4) und `LEIT_LINE` (Task 5) jetzt `^local_[A-Za-z0-9_.-]+$`, weiterhin ohne Shell-Zeichen; neuer CLI-Test `brief_LeitWithUnderscoreAndDot_IsAccepted`.
- **R2 · Task 1** — geändert — `ABSCHLUSS_FILE` steht jetzt neben `REVIEW_FILE` in `session-chain-ablage.js` (neue Modify-Zeile, Export, Kopfkommentar), `session-chain-review.js` importiert ihn von dort. Festlegung zur veralteten Ablage: `reviewStand` wirft „Kein Spec-Review in der Ablage: <ablage> (Abschlussbericht älter als die Spec)“, wenn die Änderungszeit von `abschluss.md` vor der der Spec liegt; der Orchestrator schreibt den Abschluss nach den Followup-Runden, ein älterer Abschluss heißt, dass das `store --neu` des neuen Reviews gescheitert ist. Die Etappe folgt dem bestehenden Fehlerpfad (Review erneut, dann `needs-user`). Neuer Test `reviewStand_AbschlussOlderThanSpec_ThrowsAsNoReview`.
- **R2 · Task 5** — geändert — (a) `isTurnStart` steht vor `briefFromTranscript`, das ihn statt der Inline-Bedingung nutzt. (b) Label und Kennungsmuster stehen einmal in `session-chain-brief.js` (`LEIT_LABEL`, `LEIT_ID_PATTERN`, `LEIT_ID`, eingeführt in Task 4); `VALUE_LINES`, `session-chain.js` (`LEIT_ID` per Import statt eigener Regex) und `LEIT_LINE` in `stage-guard.js` nutzen sie. (c) `messagedLeit` zählt einen `SendMessage`-Aufruf nicht, wenn im laufenden Turn ein `tool_result` mit derselben `tool_use_id` und `is_error: true` steht; fehlt das Ergebnis, zählt er weiter. Das Feld `is_error` am `tool_result` ist in echten Protokollen unter `~/.claude/projects` belegt. Neue Tests `onTurnEnd_FinalAfterFailedMessageToLeit_Blocks` und `onTurnEnd_FinalAfterFailedMessageWithNotNotifiedLine_Allows` (AC-14).
