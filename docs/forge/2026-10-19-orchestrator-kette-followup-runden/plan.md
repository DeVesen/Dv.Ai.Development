# Orchestrator-Kette und Followup-Runden — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Jeder Orchestrator von dv-forge vermerkt am Ende einen Ketten-Eintrag je Slug, den spätere Einzel-Berichte derselben Stufe nutzen, und startet bis zu zwei Followup-Runden bei „FOLLOWUP ja“.
**Architektur:** Eine neue Bibliothek `scripts/lib/chain.js` mit CLI `scripts/chain.js` speichert Einträge je Slug unter `<git-common-dir>/dv-forge/chain/`; die Berichts-Bibliotheken für Spec, Plan und Implementierung lesen den Eintrag ihrer Stufe, die Orchestrator-Skills schreiben ihn vor dem Abschlussbericht, `finish-work` entfernt ihn. Die Berichtsdaten tragen zusätzlich 🟢; `orchestrator-report.js` führt Review und bis zu zwei Followup-Runden zusammen und bietet im Abschlussbericht keinen Followup mehr an. Der Implementation-Followup urteilt je Gruppe, behält Vorschläge nicht bestätigter Gruppen und meldet dann `FOLLOWUP ja`.
**Tech-Stack:** Node.js (CommonJS, `node:test`), Markdown-Skills im Plugin `plugins/forge`.
**Spec:** docs/forge/2026-10-19-orchestrator-kette-followup-runden/spec.md
**Basis:** cffa8d4

## Global Constraints
- Ketten-Einträge liegen an einem Ort je Repository, gemeinsam für Haupt-Checkout und alle Worktrees.
- Je Slug gibt es höchstens einen Ketten-Eintrag; der zuletzt geschriebene gewinnt. Der Slug wird so gebildet wie bei den Reviews für das Artefakt der Stufe.
- Ein Orchestrator schreibt den Eintrag in seinem Abschluss-Schritt, vor dem Abschlussbericht, auch nach einem Stopp, sofern das Artefakt seiner Stufe feststeht: Spec beim Spec-Review-Orchestrator, Plan beim Plan-Orchestrator, Worktree und Branch beim Implementation-Orchestrator.
- Ein Bericht nutzt nur einen Eintrag derselben Stufe: Spec-Review und sein Followup nur `spec`, Plan-Review und sein Followup nur `plan`, Implementation-Review und sein Followup nur `implementation`.
- Ein Eintrag, dessen Spec-, Plan- oder (bei `implementation`) Worktree-Pfad nicht existiert, wird ignoriert.
- Mit Eintrag ändern Einzel-Berichte von Spec und Plan nur den Befehl des Schritts zur nächsten Stufe; Commit-Zeile und Beschriftung bleiben. Einzel-Berichte der Implementierung übernehmen die Zeilen des Orchestrator-Berichts: Worktree-Zeile, Abschluss-Schritt mit Pfad, Push-Zeile.
- Ohne Workitem im Eintrag steht der Orchestrator-Befehl ohne Nummer, wie im Orchestrator-Bericht.
- Eingebettete Läufe (`--bericht`) werden durch einen Eintrag nicht verändert.
- Eine Followup-Runde startet bei „FOLLOWUP ja“ und jedem Ergebnis außer ⚠️; höchstens zwei Followup-Runden je Orchestrator-Lauf.
- Eine Änderung an Spec oder Plan während einer Runde wird nach der Runde erkannt; sie und ein Abbruch oder ⚠️ stoppen den Orchestrator nach jeder Runde.
- Commit-Verhalten unverändert: Der Spec-Review-Orchestrator committet einmal nach der letzten Runde, der Plan-Orchestrator nie, die Implementierung über den Implementer.
- Der Implementation-Orchestrator lässt Build, Test und Lint genau einmal laufen, nach der letzten Followup-Runde.
- Der Implementation-Followup behält die Vorschläge gewählter Gruppen, die das Nach-Review nicht als behoben bestätigt, und bietet dann einen Followup an. Neue Schäden aus dem Nach-Review haben keinen Vorschlag.
- 🟢 werden nie eingearbeitet. Sie erscheinen nur im Orchestrator-Abschlussbericht, ohne Einfluss auf Ergebnis-Zeile und nächste Schritte.
- „Ketten-Eintrag“ und „Followup-Runde“ sind kanonische Begriffe (Glossar `CONTEXT.md`); „Kette“ allein und „zweiter Followup“ stehen in keinem neuen Text.
- Ohne Ketten-Eintrag ist jeder Bericht eines Einzel-Skills Byte für Byte gleich dem Bericht vor dieser Änderung.
- Stil im Plugin `plugins/forge`: CommonJS mit `'use strict'`, `node:test` und `node:assert/strict`, Testnamen `<Einheit>_<Situation>_<Erwartung>` mit den Kommentaren `// Arrange`, `// Act`, `// Assert`, deutsche Meldungen und Kommentare, typografische Anführungszeichen „…“ in Skill-Texten immer gepaart.
- Verifikation: `node --test "<R>/plugins/forge/tests/<datei>.test.js"` für eine Testdatei, `node --test "<R>/plugins/forge/tests/*.test.js"` für den Gesamtlauf. Das Projekt kennt keine `Build`-, `Test`- oder `Lint`-Konfiguration und keine Projekt-`CLAUDE.md`.
- Planungs-Skills: keine (Entscheidung des Menschen, siehe `## Entscheidungen`).

---

### Task 1: Ketten-Speicher (Bibliothek)

**ACs:** AC-10, AC-13, AC-14, AC-15, AC-16, AC-17

Die Dateien `plugins/forge/scripts/lib/chain.js` und `plugins/forge/tests/chain.test.js` liegen schon als nicht committeter Stand im Arbeitsverzeichnis, ebenso die Ausfuhr von `SLUG` in `followup.js`. Dieser Task ersetzt beide Dateien vollständig durch den Inhalt unten (fehlt eine, wird sie mit diesem Inhalt angelegt); der vorhandene Stand prüft bei der Stufe `implementation` nur den Worktree und hat in `chain.test.js` einen kaputten regulären Ausdruck.

**Dateien:**
- Modify: `plugins/forge/scripts/lib/chain.js` · `const EXISTING`
- Modify: `plugins/forge/tests/chain.test.js` · `readEntry_PlanOrSpecPathMissing_ReturnsNull`
- Modify: `plugins/forge/scripts/followup.js:235-237` · `module.exports`
- Modify: `plugins/forge/scripts/lib/posix.js` · `function toPosix`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:89-92` · `function normalize`
- Modify: `plugins/forge/tests/lib/git-repo.js` · `module.exports`
- Create: `plugins/forge/tests/posix.test.js`

**Interfaces:**
- Bestehender Code: `slugOf(planPath)` in plan-tasks.js; `slugFor(artifactPath, roles)` in followup.js (bei `roles[0] === 'spec-review'` Elternordner von `spec.md`, sonst Dateiname ohne Endung); `SLUG` in followup.js (Slug-Regel der Reviews, im Stand `cffa8d4` nicht exportiert); `toPosix(value)` in lib/posix.js; `normalize(value)` in guard-orchestrator.js (nicht exportiert, Vorbild für `normalizePath`); `git`, `commitFile`, `makeRepo` in tests/lib/git-repo.js.
- Produces: `normalizePath(value): string` in lib/posix.js (absoluter Pfad mit `/`, auf Windows kleingeschrieben; ohne Symlink-Auflösung), genutzt von `sameDir` in lib/chain.js und als `normalize` in guard-orchestrator.js (`canonicalPath` im Guard bleibt); Test-Helfer `addWorktree(repo, branch): string` (neuer Worktree im temporären Ordner auf neuem Branch) und `repoWithPlan(): { repo, spec, plan }` (Repo mit committeter Spec und Plan im Ordner `docs/forge/x`, Slug `x`) in tests/lib/git-repo.js, genutzt von chain.test.js, chain-cli.test.js (Task 2) und chain-reports.test.js (Task 4); `SLUG` zusätzlich im `module.exports` von followup.js; `class ChainError extends Error`; `STAGES: ['spec', 'plan', 'implementation']`; `writeEntry({ stage, spec, plan, wi, worktree, branch }): { stage, slug, spec, plan, wi, worktree, branch }` (Pfade absolut mit `/`, nicht gesetzte Felder `undefined`; wirft `ChainError`, wenn ein Wert oder Pfad der Stufe fehlt oder der Slug nicht der Regel `SLUG` folgt; der Speicher bleibt dann unverändert); `readEntry({ stage, artifact }): entry | null` (`artifact` ist die Spec bei `spec`, sonst der Plan; `null` bei fehlendem Eintrag, anderer Stufe, fehlendem Pfad der Stufe (`spec`: Spec; `plan`: Plan und Spec; `implementation`: Plan, Spec und Worktree), Slug außerhalb der Regel `SLUG` oder Pfad außerhalb eines Git-Repos; wirft nur bei unbekannter Stufe); `removeByWorktree(dir, worktree): number` (Zahl der entfernten Einträge der Stufe `implementation`).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/lib/git-repo.js` die Zeile `module.exports = { git, commitFile, makeRepo, samePath };` durch diesen Block ersetzen (gemeinsame Git-Fixtures für chain.test.js, chain-cli.test.js und chain-reports.test.js):
  ```js
  // Neuer Worktree im temporären Ordner auf dem neuen Branch `branch`; Rückgabe: Ordner des Worktrees.
  function addWorktree(repo, branch) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-wt-'));
    git(repo, 'worktree', 'add', '--quiet', dir, '-b', branch);
    return dir;
  }

  // Repo mit committeter Spec und Plan im Ordner docs/forge/x; Slug `x`.
  function repoWithPlan() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'add spec');
    commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
    return { repo, spec: path.join(repo, 'docs/forge/x/spec.md'), plan: path.join(repo, 'docs/forge/x/plan.md') };
  }

  module.exports = { git, commitFile, makeRepo, samePath, addWorktree, repoWithPlan };
  ```
  Datei `plugins/forge/tests/posix.test.js` anlegen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { normalizePath } = require('../scripts/lib/posix');

  test('normalizePath_RelativePathWithBackslashes_AbsoluteWithSlashesLowercaseOnWindows', () => {
    // Act
    const result = normalizePath('docs\\Forge\\x');

    // Assert
    const expected = path.resolve('docs', 'Forge', 'x').replace(/\\/g, '/');
    assert.equal(result, process.platform === 'win32' ? expected.toLowerCase() : expected);
  });

  test('normalizePath_SamePathInBothSpellings_ReturnsSameKey', () => {
    // Arrange
    const dir = path.join(path.resolve('.'), 'A', 'b');

    // Act & Assert
    assert.equal(normalizePath(dir), normalizePath(dir.split(path.sep).join('/')));
  });
  ```
  Inhalt von `plugins/forge/tests/chain.test.js` vollständig durch diesen Block ersetzen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { toPosix } = require('../scripts/lib/posix');
  const { ChainError, writeEntry, readEntry, removeByWorktree } = require('../scripts/lib/chain');

  test('writeEntry_PlanStage_ReadEntryReturnsPlanSpecAndWorkitem', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();

    // Act
    writeEntry({ stage: 'plan', plan, spec, wi: '311404' });

    // Assert
    const entry = readEntry({ stage: 'plan', artifact: plan });
    assert.equal(entry.slug, 'x');
    assert.equal(entry.plan, toPosix(path.resolve(plan)));
    assert.equal(entry.spec, toPosix(path.resolve(spec)));
    assert.equal(entry.wi, '311404');
  });

  test('writeEntry_WithoutWorkitem_EntryCarriesNoWorkitem', () => {
    // Arrange
    const { spec } = repoWithPlan();

    // Act
    writeEntry({ stage: 'spec', spec });

    // Assert
    assert.equal(readEntry({ stage: 'spec', artifact: spec }).wi, undefined);
  });

  test('readEntry_EntryOfAnotherStage_ReturnsNull', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();
    writeEntry({ stage: 'plan', plan, spec });

    // Act & Assert
    assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  });

  test('writeEntry_SecondWriteForSameSlug_LastWriteWins', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();
    writeEntry({ stage: 'spec', spec, wi: '1' });

    // Act
    writeEntry({ stage: 'plan', plan, spec, wi: '2' });

    // Assert
    assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
    assert.equal(readEntry({ stage: 'plan', artifact: plan }).wi, '2');
  });

  test('readEntry_PlanOrSpecPathMissing_ReturnsNull', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();
    writeEntry({ stage: 'plan', plan, spec });
    fs.rmSync(spec);

    // Act & Assert
    assert.equal(readEntry({ stage: 'plan', artifact: plan }), null);
  });

  test('writeEntry_PlanFileMissing_ThrowsAndKeepsExistingEntry', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    writeEntry({ stage: 'plan', plan, spec, wi: '7' });

    // Act & Assert
    assert.throws(() => writeEntry({ stage: 'plan', plan: path.join(repo, 'docs/forge/x/fehlt.md'), spec, wi: '8' }), ChainError);
    assert.equal(readEntry({ stage: 'plan', artifact: plan }).wi, '7');
  });

  test('writeEntry_ImplementationWithoutBranch_ThrowsNamingMissingValue', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();

    // Act & Assert
    assert.throws(() => writeEntry({ stage: 'implementation', plan, spec, worktree: path.dirname(plan) }), /fehlt: branch/);
  });

  test('readEntry_EntryFromMainCheckout_VisibleInWorktreeAndViceVersa', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/x');
    const inWorktree = (file) => path.join(worktree, path.relative(repo, file));
    writeEntry({ stage: 'plan', plan, spec, wi: '5' });

    // Act
    const fromWorktree = readEntry({ stage: 'plan', artifact: inWorktree(plan) });
    writeEntry({ stage: 'implementation', plan: inWorktree(plan), spec: inWorktree(spec), worktree, branch: 'feature/x' });
    const fromMain = readEntry({ stage: 'implementation', artifact: plan });

    // Assert
    assert.equal(fromWorktree.wi, '5');
    assert.equal(fromMain.worktree, toPosix(path.resolve(worktree)));
    assert.equal(fromMain.branch, 'feature/x');
  });

  test('readEntry_WorktreeOfImplementationEntryRemoved_ReturnsNull', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/y');
    writeEntry({ stage: 'implementation', plan, spec, worktree, branch: 'feature/y' });
    git(repo, 'worktree', 'remove', '--force', worktree);

    // Act & Assert
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  });

  test('readEntry_ImplementationEntryWhoseSpecWasDeleted_ReturnsNull', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/s');
    writeEntry({ stage: 'implementation', plan, spec, worktree, branch: 'feature/s' });
    fs.rmSync(spec);

    // Act & Assert
    assert.equal(fs.existsSync(worktree), true);
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  });

  test('readEntry_ImplementationEntryWhosePlanWasDeleted_ReturnsNull', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/p');
    const planInWorktree = path.join(worktree, path.relative(repo, plan));
    writeEntry({ stage: 'implementation', plan: planInWorktree, spec, worktree, branch: 'feature/p' });
    fs.rmSync(planInWorktree);

    // Act & Assert
    assert.equal(fs.existsSync(worktree), true);
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
  });

  test('removeByWorktree_MatchingEntry_RemovesOnlyThatEntry', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    commitFile(repo, 'docs/forge/y/spec.md', '# Spec\n', 'add spec y');
    commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n', 'add plan y');
    const wtX = addWorktree(repo, 'feature/x');
    const wtY = addWorktree(repo, 'feature/y');
    const planY = path.join(repo, 'docs/forge/y/plan.md');
    writeEntry({ stage: 'implementation', plan, spec, worktree: wtX, branch: 'feature/x' });
    writeEntry({ stage: 'implementation', plan: planY, spec: path.join(repo, 'docs/forge/y/spec.md'), worktree: wtY, branch: 'feature/y' });

    // Act
    const removed = removeByWorktree(repo, wtX);

    // Assert
    assert.equal(removed, 1);
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
    assert.equal(readEntry({ stage: 'implementation', artifact: planY }).branch, 'feature/y');
  });

  test('removeByWorktree_NoMatchingEntry_ReturnsZero', () => {
    // Arrange
    const { repo } = repoWithPlan();

    // Act & Assert
    assert.equal(removeByWorktree(repo, path.join(repo, 'gibt-es-nicht')), 0);
  });

  test('readEntry_ArtifactWithSlugOutsideRule_ReturnsNullWhileWriteEntryThrows', () => {
    // Arrange
    const repo = makeRepo();
    const dir = path.join(repo, 'docs', 'Änderung Export');
    fs.mkdirSync(dir, { recursive: true });
    const spec = path.join(dir, 'spec.md');
    const plan = path.join(dir, 'plan.md');
    fs.writeFileSync(spec, '# Spec\n');
    fs.writeFileSync(plan, '# Plan\n\n### Task 1: Eins\n');

    // Act & Assert
    assert.equal(readEntry({ stage: 'spec', artifact: spec }), null);
    assert.equal(readEntry({ stage: 'plan', artifact: plan }), null);
    assert.equal(readEntry({ stage: 'implementation', artifact: plan }), null);
    assert.throws(() => writeEntry({ stage: 'plan', plan, spec }), /Slug ungültig: Änderung Export/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/chain.test.js" "<R>/plugins/forge/tests/posix.test.js"` — erwartet: FAIL `readEntry_ImplementationEntryWhoseSpecWasDeleted_ReturnsNull`, FAIL `readEntry_ImplementationEntryWhosePlanWasDeleted_ReturnsNull` (der vorhandene Stand von `lib/chain.js` prüft bei `implementation` nur den Worktree) und FAIL `normalizePath_RelativePathWithBackslashes_AbsoluteWithSlashesLowercaseOnWindows` (`normalizePath is not a function`). Liegt `lib/chain.js` nicht im Arbeitsverzeichnis, schlägt `chain.test.js` schon beim Laden fehl (`Cannot find module '../scripts/lib/chain'`).
- [ ] **Schritt 3: Minimal implementieren**
  Inhalt von `plugins/forge/scripts/lib/posix.js` vollständig durch diesen Block ersetzen:
  ```js
  'use strict';

  const path = require('node:path');

  function toPosix(value) {
    return String(value).replace(/\\/g, '/');
  }

  // Vergleichsschlüssel für Pfade: absolut, mit `/`, auf Windows kleingeschrieben; ohne Symlink-Auflösung.
  function normalizePath(value) {
    const resolved = toPosix(path.resolve(value));
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }

  module.exports = { toPosix, normalizePath };
  ```
  In `plugins/forge/scripts/guard-orchestrator.js` die Funktion `normalize` samt der Leerzeile danach entfernen:
  ```js
  function normalize(value) {
    const resolved = path.resolve(value).replace(/\\/g, '/');
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }
  ```
  und ebenda unter `const { turnText } = require('./lib/turn-text');` diese Zeile ergänzen (die Aufrufe von `normalize` in `canonicalPath` und im Arbeitsbereich-Check bleiben unverändert):
  ```js
  const { normalizePath: normalize } = require('./lib/posix');
  ```
  Inhalt von `plugins/forge/scripts/lib/chain.js` vollständig durch diesen Block ersetzen:
  ```js
  'use strict';

  // Ketten-Einträge: je Slug ein Vermerk, welcher Orchestrator zuletzt Spec, Plan oder Umsetzung erzeugt oder geprüft hat.
  // Ort: <git-common-dir>/dv-forge/chain/<slug>.json, gemeinsam für den Haupt-Checkout und alle Worktrees eines Repos.
  // Ein Eintrag gilt nur für Berichte seiner Stufe und nur, solange die Pfade seiner Stufe existieren.

  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { toPosix, normalizePath } = require('./posix');
  const { slugOf } = require('../plan-tasks');
  const { slugFor, SLUG } = require('../followup');

  const STAGES = ['spec', 'plan', 'implementation'];
  const NEEDED = { spec: ['spec'], plan: ['plan', 'spec'], implementation: ['plan', 'spec', 'worktree', 'branch'] };
  // Pfade, die existieren müssen, damit der Eintrag gilt; bei `implementation` Spec, Plan und Worktree.
  const EXISTING = { spec: ['spec'], plan: ['plan', 'spec'], implementation: ['plan', 'spec', 'worktree'] };

  class ChainError extends Error {}

  function checkedStage(stage) {
    if (!STAGES.includes(stage)) throw new ChainError(`Stufe unbekannt: ${stage} (erlaubt: ${STAGES.join(', ')})`);
    return stage;
  }

  // Slug wie bei den Reviews: Spec über slugFor, Plan über slugOf; die Regel `SLUG` teilt chain.js mit followup.js.
  function rawSlug(stage, artifact) {
    return stage === 'spec' ? slugFor(artifact, ['spec-review']) : slugOf(artifact);
  }

  // Nur der Schreibpfad wirft bei einem Slug außerhalb der Regel; der Lesepfad liefert dann null.
  function checkedSlug(stage, artifact) {
    const slug = rawSlug(stage, artifact);
    if (!SLUG.test(slug)) throw new ChainError(`Slug ungültig: ${slug}`);
    return slug;
  }

  // Ordner der Einträge; null, wenn `dir` in keinem Git-Repo liegt.
  function storeDir(dir) {
    const result = spawnSync('git', ['-C', dir, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' });
    if (result.status !== 0) return null;
    return path.join(path.resolve(dir, result.stdout.trim()), 'dv-forge', 'chain');
  }

  function sameDir(a, b) {
    return normalizePath(a) === normalizePath(b);
  }

  function parseEntry(file) {
    try {
      const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
      return STAGES.includes(entry?.stage) ? entry : null;
    } catch {
      return null;
    }
  }

  function missingPath(entry) {
    return EXISTING[entry.stage].find((key) => typeof entry[key] !== 'string' || !fs.existsSync(entry[key]));
  }

  function absolute(value) {
    return value ? toPosix(path.resolve(value)) : undefined;
  }

  // `input`: stage, spec, plan, wi, worktree, branch. Fehlt ein Wert oder Pfad der Stufe, bleibt der Speicher unverändert.
  function writeEntry(input) {
    const stage = checkedStage(input.stage);
    const absent = NEEDED[stage].filter((key) => !input[key]);
    if (absent.length > 0) throw new ChainError(`${stage}: fehlt: ${absent.join(', ')}`);
    const artifact = stage === 'spec' ? input.spec : input.plan;
    const entry = {
      stage, slug: checkedSlug(stage, artifact), spec: absolute(input.spec), plan: absolute(input.plan),
      wi: input.wi || undefined, worktree: absolute(input.worktree), branch: input.branch || undefined,
    };
    const gone = missingPath(entry);
    if (gone) throw new ChainError(`${stage}: Pfad nicht gefunden: ${gone}=${entry[gone] ?? '-'}`);
    const store = storeDir(path.dirname(path.resolve(artifact)));
    if (!store) throw new ChainError(`Kein Git-Repo: ${toPosix(path.dirname(path.resolve(artifact)))}`);
    fs.mkdirSync(store, { recursive: true });
    const file = path.join(store, `${entry.slug}.json`);
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify({ ...entry, writtenAt: new Date().toISOString() }, null, 2)}\n`);
    fs.renameSync(`${file}.tmp`, file);
    return entry;
  }

  // Der Eintrag der Stufe zum Slug des Artefakts (Spec bei `spec`, sonst Plan) oder null: kein Eintrag, andere Stufe, Pfad fehlt,
  // Slug außerhalb der Regel. Ein Einzel-Bericht darf am Lesen nie scheitern.
  function readEntry({ stage, artifact }) {
    checkedStage(stage);
    const resolved = path.resolve(artifact);
    const slug = rawSlug(stage, resolved);
    if (!SLUG.test(slug)) return null;
    const store = storeDir(path.dirname(resolved));
    if (!store) return null;
    const entry = parseEntry(path.join(store, `${slug}.json`));
    return entry && entry.stage === stage && missingPath(entry) === undefined ? entry : null;
  }

  // Entfernt die Einträge der Stufe `implementation` zu diesem Worktree; Rückgabe: Zahl der entfernten Einträge.
  function removeByWorktree(dir, worktree) {
    const store = storeDir(dir);
    if (!store || !fs.existsSync(store)) return 0;
    const hits = fs.readdirSync(store).filter((name) => name.endsWith('.json')).map((name) => path.join(store, name))
      .filter((file) => {
        const entry = parseEntry(file);
        return entry?.stage === 'implementation' && typeof entry.worktree === 'string' && sameDir(entry.worktree, worktree);
      });
    hits.forEach((file) => fs.rmSync(file, { force: true }));
    return hits.length;
  }

  module.exports = { ChainError, STAGES, writeEntry, readEntry, removeByWorktree };
  ```
  In `plugins/forge/scripts/followup.js` im `module.exports` die Zeichenfolge `  SCOUT_HEADING, GROUP_HEADING, PROPOSAL, FollowupError, ROLES,` ersetzen durch `  SCOUT_HEADING, GROUP_HEADING, PROPOSAL, FollowupError, ROLES, SLUG,` (die Konstante `SLUG` selbst bleibt unverändert). Steht `SLUG,` dort schon direkt nach `ROLES,` (nicht committeter Stand im Arbeitsverzeichnis), bleibt die Zeile so.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/chain.test.js" "<R>/plugins/forge/tests/posix.test.js" "<R>/plugins/forge/tests/followup.test.js" "<R>/plugins/forge/tests/guard-orchestrator.test.js"` — erwartet: PASS (`chain.test.js` mit 14 Tests, `posix.test.js` mit 2 Tests, `followup.test.js` und `guard-orchestrator.test.js` unverändert grün)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/chain.js plugins/forge/scripts/lib/posix.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/scripts/followup.js plugins/forge/tests/chain.test.js plugins/forge/tests/posix.test.js plugins/forge/tests/lib/git-repo.js` · `git commit -m "feat(forge): add chain entry store shared by checkout and worktrees"`

---

### Task 2: Ketten-CLI und Guard-Freigabe

**ACs:** AC-09, AC-16, AC-17, AC-34

**Dateien:**
- Create: `plugins/forge/scripts/chain.js`
- Create: `plugins/forge/tests/chain-cli.test.js`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:17-18` · `ALLOWED_SCRIPTS`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `decidePreTool_OrchestratorReportNamingSpec_Allows`

**Interfaces:**
- Consumes: `ChainError`, `STAGES`, `writeEntry`, `readEntry`, `removeByWorktree` aus lib/chain.js (Task 1); Test-Helfer `addWorktree`, `repoWithPlan` aus tests/lib/git-repo.js (Task 1).
- Produces: CLI `node chain.js write --stage <spec|plan|implementation> [--spec <S>] [--plan <P>] [--worktree <R>] [--branch <b>] [--wi <nr>]` (stdout `EINTRAG <stage> <slug>`); `node chain.js lookup --stage <stage> (--spec <S> | --plan <P>)` (stdout Zeilen `stage=`, `slug=`, `spec=`, `plan=`, `wi=`, `worktree=`, `branch=` für gesetzte Felder oder die eine Zeile `KEIN EINTRAG`); `node chain.js remove --worktree <R>` (stdout `ENTFERNT <n>`). Exit 1 mit `dv-forge chain: <Grund>` bei `ChainError`, Exit 2 mit Aufruf-Text bei falschem Aufruf. Export `run(args: string[]): string`, `UsageError`, `NO_ENTRY = 'KEIN EINTRAG'`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/chain-cli.test.js` anlegen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { git, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { toPosix } = require('../scripts/lib/posix');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'chain.js');

  function chain(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  test('chainCli_WritePlanThenLookup_PrintsEntryLines', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();

    // Act
    const written = chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '311404');
    const found = chain(repo, 'lookup', '--stage', 'plan', '--plan', plan);

    // Assert
    assert.equal(written.status, 0, written.stderr);
    assert.equal(written.stdout, 'EINTRAG plan x\n');
    assert.equal(found.stdout, ['stage=plan', 'slug=x', `spec=${toPosix(path.resolve(spec))}`, `plan=${toPosix(path.resolve(plan))}`, 'wi=311404'].join('\n') + '\n');
  });

  test('chainCli_LookupWithoutEntryOrOtherStage_PrintsNoEntry', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    chain(repo, 'write', '--stage', 'spec', '--spec', spec);

    // Act
    const other = chain(repo, 'lookup', '--stage', 'plan', '--plan', plan);

    // Assert
    assert.equal(other.stdout, 'KEIN EINTRAG\n');
  });

  test('chainCli_WritePlanWithoutPlanFile_ExitsWithOneAndKeepsEntry', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '1');

    // Act
    const result = chain(repo, 'write', '--stage', 'plan', '--plan', path.join(repo, 'docs/forge/x/fehlt.md'), '--spec', spec, '--wi', '2');

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^dv-forge chain: plan: Pfad nicht gefunden: plan=/);
    assert.match(chain(repo, 'lookup', '--stage', 'plan', '--plan', plan).stdout, /wi=1\n$/);
  });

  test('chainCli_RemoveByWorktree_RemovesImplementationEntryOnly', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/x');
    chain(repo, 'write', '--stage', 'implementation', '--plan', plan, '--spec', spec, '--worktree', worktree, '--branch', 'feature/x');

    // Act
    const removed = chain(repo, 'remove', '--worktree', worktree);

    // Assert
    assert.equal(removed.stdout, 'ENTFERNT 1\n');
    assert.equal(chain(repo, 'lookup', '--stage', 'implementation', '--plan', plan).stdout, 'KEIN EINTRAG\n');
    assert.equal(chain(repo, 'remove', '--worktree', worktree).stdout, 'ENTFERNT 0\n');
  });

  test('chainCli_LookupArtifactWithSlugOutsideRule_PrintsNoEntryWithExitZero', () => {
    // Arrange
    const repo = makeRepo();
    const plan = path.join(repo, 'docs', 'Änderung Export', 'plan.md');
    fs.mkdirSync(path.dirname(plan), { recursive: true });
    fs.writeFileSync(plan, '# Plan\n\n### Task 1: Eins\n');

    // Act
    const result = chain(repo, 'lookup', '--stage', 'implementation', '--plan', plan);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'KEIN EINTRAG\n');
  });

  test('chainCli_Write_CreatesNoCommitAndLeavesWorkingTreeClean', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const head = git(repo, 'rev-parse', 'HEAD');

    // Act
    const result = chain(repo, 'write', '--stage', 'plan', '--plan', plan, '--spec', spec, '--wi', '311404');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
    assert.equal(git(repo, 'status', '--porcelain'), '');
  });

  test('chainCli_UnknownCommandOrStage_ExitsWithTwoAndUsage', () => {
    // Act
    const command = chain(os.tmpdir(), 'zeige');
    const stage = chain(os.tmpdir(), 'lookup', '--stage', 'review', '--plan', 'p.md');

    // Assert
    assert.equal(command.status, 2);
    assert.match(command.stderr, /Unbekannter Befehl: zeige\nAufruf: node chain\.js write/);
    assert.equal(stage.status, 2);
    assert.match(stage.stderr, /--stage erlaubt: spec, plan, implementation; nicht review/);
  });
  ```
  Am Ende von `plugins/forge/tests/guard-orchestrator.test.js` (nach dem Test `decidePreTool_OrchestratorReportNamingSpec_Allows`) anhängen:
  ```js

  test('decidePreTool_ChainWriteNamingSpec_Allows', () => {
    const env = setup();
    const command = `node "/plugins/forge/scripts/chain.js" write --stage spec --spec "${env.specPath}" --wi 311404`;
    assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/chain-cli.test.js" "<R>/plugins/forge/tests/guard-orchestrator.test.js"` — erwartet: FAIL `chainCli_WritePlanThenLookup_PrintsEntryLines` und FAIL `decidePreTool_ChainWriteNamingSpec_Allows`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/chain.js` anlegen:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Ketten-Einträge schreiben, nachschlagen und entfernen. Ausgabe und Fehler in Klartext.

  const { ChainError, STAGES, writeEntry, readEntry, removeByWorktree } = require('./lib/chain');

  const USAGE = [
    'Aufruf: node chain.js write --stage spec --spec <spec> [--wi <nr>]',
    '       node chain.js write --stage plan --plan <plan> --spec <spec> [--wi <nr>]',
    '       node chain.js write --stage implementation --plan <plan> --spec <spec> --worktree <ordner> --branch <name> [--wi <nr>]',
    '       node chain.js lookup --stage <spec|plan|implementation> (--spec <spec> | --plan <plan>)',
    '       node chain.js remove --worktree <ordner>',
    '',
  ].join('\n');
  const VALUE_OPTIONS = ['--stage', '--spec', '--plan', '--wi', '--worktree', '--branch'];
  const SHOWN = ['stage', 'slug', 'spec', 'plan', 'wi', 'worktree', 'branch'];
  const NO_ENTRY = 'KEIN EINTRAG';

  class UsageError extends Error {}

  function parseOptions(args) {
    const values = {};
    for (let index = 0; index < args.length; index += 2) {
      if (!VALUE_OPTIONS.includes(args[index]) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${args[index]}`);
      values[args[index].slice(2)] = args[index + 1];
    }
    return values;
  }

  function required(values, name) {
    if (!values[name]) throw new UsageError(`--${name} fehlt`);
    return values[name];
  }

  function stageOf(values) {
    const stage = required(values, 'stage');
    if (!STAGES.includes(stage)) throw new UsageError(`--stage erlaubt: ${STAGES.join(', ')}; nicht ${stage}`);
    return stage;
  }

  function renderEntry(entry) {
    return SHOWN.filter((key) => entry[key] !== undefined).map((key) => `${key}=${entry[key]}`).join('\n');
  }

  const COMMANDS = {
    write: (values) => {
      const entry = writeEntry({ stage: stageOf(values), spec: values.spec, plan: values.plan, wi: values.wi, worktree: values.worktree, branch: values.branch });
      return `EINTRAG ${entry.stage} ${entry.slug}`;
    },
    lookup: (values) => {
      const stage = stageOf(values);
      const entry = readEntry({ stage, artifact: required(values, stage === 'spec' ? 'spec' : 'plan') });
      return entry ? renderEntry(entry) : NO_ENTRY;
    },
    remove: (values) => `ENTFERNT ${removeByWorktree(process.cwd(), required(values, 'worktree'))}`,
  };

  function run(args) {
    const [command, ...rest] = args;
    if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`Unbekannter Befehl: ${command ?? '-'}`);
    return COMMANDS[command](parseOptions(rest));
  }

  function main() {
    try {
      process.stdout.write(`${run(process.argv.slice(2))}\n`);
    } catch (error) {
      if (error instanceof UsageError) {
        process.stderr.write(`${error.message}\n${USAGE}`);
        process.exit(2);
      }
      if (!(error instanceof ChainError)) throw error;
      process.stderr.write(`dv-forge chain: ${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { run, UsageError, NO_ENTRY };
  ```
  In `plugins/forge/scripts/guard-orchestrator.js` die Konstante `ALLOWED_SCRIPTS` erweitern: in ihrer zweiten Zeile `'implementation-report.js', 'orchestrator-report.js'];` ersetzen durch `'implementation-report.js', 'orchestrator-report.js', 'chain.js'];`
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/chain-cli.test.js" "<R>/plugins/forge/tests/guard-orchestrator.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/chain.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/chain-cli.test.js plugins/forge/tests/guard-orchestrator.test.js` · `git commit -m "feat(forge): add chain.js to write, look up and remove chain entries"`

---

### Task 3: Spec- und Plan-Berichte nutzen den Ketten-Eintrag

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-05, AC-09, AC-11, AC-12, AC-13, AC-15, AC-18

**Dateien:**
- Create: `plugins/forge/tests/chain-reports.test.js`
- Modify: `plugins/forge/scripts/lib/report-text.js:65-70` · `closingSteps`
- Modify: `plugins/forge/scripts/lib/report-data.js:172-176` · `buildInput`
- Modify: `plugins/forge/scripts/lib/flow-report.js:55-57` · `embeddedOutput`
- Test: `plugins/forge/tests/report-text.test.js` · `renderReportText_ReadyWithOneHint_ShowsAgreedLayout`

**Interfaces:**
- Consumes: `readEntry({ stage, artifact })` und `writeEntry` aus lib/chain.js (Task 1).
- Produces: `specRun()` als Testhilfe in chain-reports.test.js, Rückgabe `{ repo, spec, plan, workspace }`; `planRun()` (wie `specRun()`, `workspace` ist ein sauberes Plan-Review des Plans) und `planReport(run)` als Testhilfen ebenda; `withWorkitem(command: string, workitem?: string): string` exportiert aus `report-text.js`; `closingSteps(input)` und damit `renderReportText(input)` / `summaryOf(input)` lesen `input.chain` (Ketten-Eintrag der eigenen Stufe oder `null`/fehlend); vom Eintrag nutzt der Befehl nur `chain.wi`, die Spec im Befehl des Plan-Reviews kommt aus `input.spec` (Berichtsoption `options.spec`, dieselbe wie für „Die Spec prüfen:“), ersatzweise aus `chain.spec`; `buildInput(options, data, status, open)` setzt `input.chain` (nur ohne `options.reportFile`).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Am Ende von `plugins/forge/tests/report-text.test.js` anhängen:
  ```js

  const PLAN_CHAIN = { stage: 'plan', slug: 'x', plan: '/repo/docs/forge/x/plan.md', spec: '/repo/docs/forge/x/spec.md', wi: '311404' };

  function planBase(overrides = {}) {
    return base({ review: 'plan-review', title: 'Plan-Review', artifact: '/repo/docs/forge/x/plan.md', spec: '/repo/docs/forge/x/spec.md', ...overrides });
  }

  test('renderReportText_ReadyPlanFollowupWithPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem', () => {
    // Act
    const text = renderReportText(planBase({ followup: true, chosenCount: 1, chain: PLAN_CHAIN }));

    // Assert
    assert.ok(text.endsWith([
      '### Wie es weitergeht',
      '1. Spec und Plan committen (ich frage dich danach).',
      '2. In einer frischen Session umsetzen:',
      '   `/dv-forge:implementation-orchestrator /repo/docs/forge/x/plan.md /repo/docs/forge/x/spec.md 311404`',
    ].join('\n')), text);
    assert.equal(text.includes('/dv-forge:implementation /repo'), false);
  });

  test('renderReportText_ReadyPlanWithPlanEntryWithoutWorkitem_CommandHasNoNumber', () => {
    // Act
    const text = renderReportText(planBase({ chain: { ...PLAN_CHAIN, wi: undefined } }));

    // Assert
    assert.ok(text.endsWith('   `/dv-forge:implementation-orchestrator /repo/docs/forge/x/plan.md /repo/docs/forge/x/spec.md`'), text);
  });

  test('renderReportText_PlanHintsWithPlanEntry_HintStepsStayBeforeImplementationOrchestrator', () => {
    // Arrange
    const hint = { color: 'yellow', title: 'Reihenfolge', angles: 'Machbarkeit', description: 'Task 2 vor Task 1.', recommendation: 'tauschen, weil Task 2 die Basis ist.', hasProposal: true };

    // Act
    const text = renderReportText(planBase({ open: [hint], chain: PLAN_CHAIN }));

    // Assert
    const steps = text.slice(text.indexOf('### Wie es weitergeht'));
    assert.match(steps, /^### Wie es weitergeht\n1\. Den Hinweis einarbeiten lassen \(optional\):\n {3}`\/dv-forge:review-followup \/repo\/docs\/forge\/x\/plan\.md alle`\n2\. Spec und Plan committen \(ich frage dich danach\)\.\n3\. In einer frischen Session umsetzen:\n {3}`\/dv-forge:implementation-orchestrator /);
  });

  test('renderReportText_BlockedPlanWithPlanEntry_EqualsReportWithoutEntry', () => {
    // Arrange
    const red = { color: 'red', title: 'Task 3 fehlt', angles: 'Abdeckung', description: 'AC-04 hat keinen Test.', recommendation: null, hasProposal: false };
    const blocked = { status: 'nicht bereit, 1 × 🔴 offen', openRed: 1, open: [red] };

    // Act & Assert
    assert.equal(renderReportText(planBase({ ...blocked, chain: PLAN_CHAIN })), renderReportText(planBase(blocked)));
  });

  test('renderReportText_PlanEntryWithOtherSpecThanReportOption_CommandNamesSpecOfReportOption', () => {
    // Arrange
    const chain = { ...PLAN_CHAIN, spec: '/alt/docs/forge/x/spec.md' };

    // Act
    const text = renderReportText(planBase({ chain }));

    // Assert
    assert.ok(text.endsWith('   `/dv-forge:implementation-orchestrator /repo/docs/forge/x/plan.md /repo/docs/forge/x/spec.md 311404`'), text);
    assert.equal(text.includes('/alt/docs/forge/x/spec.md'), false);
  });

  test('renderReportText_ReadySpecWithSpecEntry_OnlyCommandChanges', () => {
    // Arrange
    const chain = { stage: 'spec', slug: 'x', spec: 'docs/specs/x.md', wi: 'AB#7' };

    // Act
    const text = renderReportText(base({ chain }));

    // Assert
    assert.ok(text.endsWith('1. Spec committen.\n2. In einer frischen Session den Plan schreiben:\n   `/dv-forge:plan-orchestrator docs/specs/x.md AB#7`'), text);
  });
  ```
  Datei `plugins/forge/tests/chain-reports.test.js` anlegen:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { commitFile, makeRepo } = require('./lib/git-repo');
  const { SPEC, tempDir, writeReviewer, flow } = require('./lib/review-flow-fixture');
  const { writeEntry } = require('../scripts/lib/chain');
  const { toPosix } = require('../scripts/lib/posix');

  // Repo mit committeter Spec und Plan im Ordner docs/forge/x (Slug `x`) und einem sauberen Spec-Review ohne Findings.
  function specRun() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/x/spec.md', SPEC, 'add spec');
    commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    const plan = path.join(repo, 'docs/forge/x/plan.md');
    const workspace = tempDir();
    writeReviewer({ workspace }, 'clarity', []);
    flow('rate', '--review', 'spec-review', '--dir', workspace, '--doc', spec, '--expect', 'clarity');
    return { repo, spec, plan, workspace };
  }

  function report(run, extra = []) {
    const result = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, ...extra);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  }

  // Wie specRun, dazu ein sauberes Plan-Review ohne Findings zum Plan im selben Ordner (eigener Arbeitsbereich).
  function planRun() {
    const run = specRun();
    const workspace = tempDir('dv-forge-chain-plan-');
    writeReviewer({ workspace }, 'coverage', []);
    flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', run.plan, '--expect', 'coverage');
    return { ...run, workspace };
  }

  function planReport(run) {
    const result = flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--titel', 'Plan-Review', '--artefakt', run.plan);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  }

  test('specReviewReport_SpecEntryWithWorkitem_NamesPlanOrchestratorWithWorkitem', () => {
    // Arrange
    const run = specRun();
    writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

    // Act
    const text = report(run);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zum Planen/);
    assert.ok(text.includes(`1. Spec committen.\n2. In einer frischen Session den Plan schreiben:\n   \`/dv-forge:plan-orchestrator ${run.spec} AB#7\``), text);
    assert.equal(text.includes('plan-writing'), false);
  });

  test('specReviewReport_SpecEntryWithoutWorkitem_CommandHasNoNumber', () => {
    // Arrange
    const run = specRun();
    writeEntry({ stage: 'spec', spec: run.spec });

    // Act
    const text = report(run);

    // Assert
    assert.ok(text.includes(`\`/dv-forge:plan-orchestrator ${run.spec}\`\n`) || text.endsWith(`\`/dv-forge:plan-orchestrator ${run.spec}\``), text);
  });

  test('specReviewReport_NoEntry_NamesPlanWritingAsBefore', () => {
    // Arrange
    const run = specRun();

    // Act
    const text = report(run);

    // Assert
    assert.ok(text.includes(`\`/dv-forge:plan-writing ${run.spec}\``), text);
  });

  test('specReviewReport_EntryOfStagePlan_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = specRun();
    const baseline = report(run);
    writeEntry({ stage: 'plan', plan: run.plan, spec: run.spec, wi: '1' });

    // Act
    const text = report(run);

    // Assert
    assert.equal(text, baseline);
  });

  test('specReviewReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = specRun();
    const baseline = report(run);
    commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
    const otherSpec = path.join(run.repo, 'alt/x/spec.md');
    writeEntry({ stage: 'spec', spec: otherSpec, wi: '1' });
    fs.rmSync(otherSpec);

    // Act
    const text = report(run);

    // Assert
    assert.equal(text, baseline);
  });

  test('specReviewReport_EmbeddedRunWithEntry_PrintsSameLinesAndWritesNoEntryIntoJson', () => {
    // Arrange
    const run = specRun();
    const dir = tempDir('dv-forge-chain-embedded-');
    const without = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, '--bericht', path.join(dir, 'a.json'));
    writeEntry({ stage: 'spec', spec: run.spec, wi: 'AB#7' });

    // Act
    const file = path.join(dir, 'b.json');
    const withEntry = flow('report', '--review', 'spec-review', '--dir', run.workspace, '--doc', run.spec, '--titel', 'Spec-Review', '--artefakt', run.spec, '--bericht', file);

    // Assert
    assert.equal(withEntry.stdout.replace(file, 'X'), without.stdout.replace(path.join(dir, 'a.json'), 'X'));
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(Object.hasOwn(data, 'chain'), false);
    assert.equal(JSON.stringify(data).includes('plan-orchestrator'), false);
  });

  test('planReviewReport_EntryOfStageSpec_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = planRun();
    const baseline = planReport(run);
    writeEntry({ stage: 'spec', spec: run.spec, wi: '1' });

    // Act
    const text = planReport(run);

    // Assert
    assert.equal(text, baseline);
    assert.ok(text.includes(`\`/dv-forge:implementation ${run.plan}\``), text);
    assert.equal(text.includes('implementation-orchestrator'), false);
  });

  test('planReviewReport_SpecEntryThenPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem', () => {
    // Arrange
    const run = planRun();
    writeEntry({ stage: 'spec', spec: run.spec, wi: '1' });
    writeEntry({ stage: 'plan', plan: run.plan, spec: run.spec, wi: '2' });

    // Act
    const text = planReport(run);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung/);
    assert.ok(text.includes(`\`/dv-forge:implementation-orchestrator ${run.plan} ${toPosix(path.resolve(run.spec))} 2\``), text);
    assert.equal(text.includes(`/dv-forge:implementation ${run.plan}`), false);
  });

  test('planReviewReport_PlanEntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = planRun();
    const baseline = planReport(run);
    commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
    const otherSpec = path.join(run.repo, 'alt/x/spec.md');
    writeEntry({ stage: 'plan', plan: run.plan, spec: otherSpec, wi: '1' });
    fs.rmSync(otherSpec);

    // Act
    const text = planReport(run);

    // Assert
    assert.equal(text, baseline);
    assert.equal(text.includes('implementation-orchestrator'), false);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/chain-reports.test.js"` — erwartet: FAIL `renderReportText_ReadyPlanFollowupWithPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem`, FAIL `specReviewReport_SpecEntryWithWorkitem_NamesPlanOrchestratorWithWorkitem` und FAIL `planReviewReport_SpecEntryThenPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/report-text.js` die Funktion `closingSteps` durch diesen Block ersetzen:
  ```js
  // Befehl mit Workitem-Nummer, falls es eine gibt.
  function withWorkitem(command, workitem) {
    return workitem ? `${command} ${workitem}` : command;
  }

  // `input.chain`: Ketten-Eintrag der eigenen Stufe; mit ihm wechselt nur der Befehl zur nächsten Stufe, Commit-Zeile und Beschriftung bleiben.
  // Vom Eintrag zählt nur das Workitem; die Spec im Befehl kommt aus der Berichtsoption `input.spec`, ersatzweise aus dem Eintrag.
  function closingSteps(input) {
    const { artifact, chain } = input;
    if (input.review === 'spec-review') {
      const plan = chain ? withWorkitem(`/dv-forge:plan-orchestrator ${artifact}`, chain.wi) : `/dv-forge:plan-writing ${artifact}`;
      return ['Spec committen.', ['In einer frischen Session den Plan schreiben:', plan]];
    }
    const implement = chain ? withWorkitem(`/dv-forge:implementation-orchestrator ${artifact} ${input.spec ?? chain.spec}`, chain.wi) : `/dv-forge:implementation ${artifact}`;
    return ['Spec und Plan committen (ich frage dich danach).', ['In einer frischen Session umsetzen:', implement]];
  }
  ```
  Ebenda im `module.exports` am Ende der Liste `DOCUMENT_TEXTS,` ergänzen: vor `DOCUMENT_TEXTS,` die Zeichenfolge `withWorkitem, ` einfügen, sodass die Zeile `  withWorkitem, DOCUMENT_TEXTS,` lautet.

  In `plugins/forge/scripts/lib/report-data.js` unter `const { readAttempts } = require('./attempts');` ergänzen:
  ```js
  const { readEntry } = require('./chain');
  ```
  Ebenda direkt vor `function buildInput` diesen Block einfügen:
  ```js
  const CHAIN_STAGE = { 'spec-review': 'spec', 'plan-review': 'plan' };

  // Der Ketten-Eintrag der eigenen Stufe; ein eingebetteter Lauf (reportFile) bleibt davon unberührt.
  function chainOf(options) {
    return options.reportFile ? null : readEntry({ stage: CHAIN_STAGE[options.review], artifact: options.artifact });
  }

  ```
  Nur in der Rückgabe von `buildInput` nach `spec: options.spec,` ergänzen: ` chain: chainOf(options),`. Die Zeile lautet dann
  `    review: options.review, followup: ctx.followup !== null, title: options.title, artifact: options.artifact, spec: options.spec, chain: chainOf(options),`
  Die Funktion sonst nicht ändern.

  In `plugins/forge/scripts/lib/flow-report.js` in `embeddedOutput` die Zeile `writeJson(options.reportFile, { format: FORMAT, status, ...summary, ...input });` ersetzen durch:
  ```js
    const { chain: _chain, ...data } = input;
    writeJson(options.reportFile, { format: FORMAT, status, ...summary, ...data });
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/review-flow-report.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-text.js plugins/forge/scripts/lib/report-data.js plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/report-text.test.js plugins/forge/tests/chain-reports.test.js` · `git commit -m "feat(forge): spec and plan reports name the orchestrator step from the chain entry"`

---

### Task 4: Implementierungs-Bericht nutzt den Ketten-Eintrag

**ACs:** AC-06, AC-07, AC-09, AC-13, AC-14, AC-18

**Dateien:**
- Modify: `plugins/forge/scripts/lib/report-text.js` · `function questionSteps`
- Modify: `plugins/forge/scripts/lib/report-text.js` · `module.exports`
- Modify: `plugins/forge/scripts/lib/implementation-report-text.js:9` · `require('./report-text')`
- Modify: `plugins/forge/scripts/lib/implementation-report-text.js:48-61` · `steps`
- Modify: `plugins/forge/scripts/lib/implementation-report-text.js:93` · `renderImplementationReport`
- Modify: `plugins/forge/scripts/lib/implementation-report.js:126-129` · `reportInput`
- Modify: `plugins/forge/scripts/implementation-report.js:42-46` · `run`
- Test: `plugins/forge/tests/implementation-report-text.test.js` · `renderImplementationReport_ReadyWithoutOpenItems_OmitsOpenAndNotesAndTopic`
- Test: `plugins/forge/tests/chain-reports.test.js` · `specRun`

**Interfaces:**
- Consumes: `readEntry` und `writeEntry` aus lib/chain.js (Task 1); Test-Helfer `addWorktree` aus tests/lib/git-repo.js (Task 1); `specRun` aus chain-reports.test.js (Task 3).
- Produces: `worktreeLine(worktree: string): string` (`Worktree bleibt: <worktree>`), `finishStepFor(worktree: string): [string, string]` (`['Arbeit abschließen (nur manuell, in <worktree>):', '/dv-forge:finish-work']`) und `pushLine(branch: string): string` (``Nicht gepusht: `git push -u origin <branch>` ``), exportiert aus `report-text.js`; Einzel-Bericht der Implementierung (hier) und Orchestrator-Bericht (Task 11) bilden diese drei Zeilen nur über sie. `renderImplementationReport(input)` liest `input.chain` (`{ worktree, branch }` oder `null`/fehlend); `buildReport(options)` liest `options.chain`; der Aufruf `node implementation-report.js` ohne `--bericht` übergibt `readEntry({ stage: 'implementation', artifact: <plan> })`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Am Ende von `plugins/forge/tests/implementation-report-text.test.js` anhängen:
  ```js

  const WORKTREE_CHAIN = { stage: 'implementation', slug: 'x', worktree: '/repo-wt', branch: 'feature/x' };

  test('renderImplementationReport_ReadyWithImplementationEntry_WorktreeLineFinishStepWithPathAndPushLine', () => {
    // Act
    const text = renderImplementationReport(base({ chain: WORKTREE_CHAIN }));

    // Assert
    assert.ok(text.endsWith([
      '### Wie es weitergeht',
      'Worktree bleibt: /repo-wt',
      '1. Arbeit abschließen (nur manuell, in /repo-wt):',
      '   `/dv-forge:finish-work`',
      'Nicht gepusht: `git push -u origin feature/x`',
    ].join('\n')), text);
  });

  test('renderImplementationReport_BlockedWithImplementationEntry_BlockedStepsStayBetweenWorktreeAndPushLine', () => {
    // Arrange
    const input = base({ openRed: 1, open: [HINDRANCE] });

    // Act
    const text = renderImplementationReport({ ...input, chain: WORKTREE_CHAIN });

    // Assert
    const without = renderImplementationReport(input);
    const steps = without.slice(without.indexOf('### Wie es weitergeht\n') + '### Wie es weitergeht\n'.length);
    assert.ok(text.endsWith(`### Wie es weitergeht\nWorktree bleibt: /repo-wt\n${steps}\nNicht gepusht: \`git push -u origin feature/x\``), text);
    assert.equal(text.includes('Arbeit abschließen'), false);
  });

  test('renderImplementationReport_HintsWithImplementationEntry_FinishStepNamesWorktreeAfterHintStep', () => {
    // Act
    const text = renderImplementationReport(base({ open: [HINT], chain: WORKTREE_CHAIN }));

    // Assert
    assert.match(text, /2\. Arbeit abschließen \(nur manuell, in \/repo-wt\):\n {3}`\/dv-forge:finish-work`\nNicht gepusht: `git push -u origin feature\/x`$/);
  });

  test('renderImplementationReport_EmbeddedWithoutNextAndEntry_HasNoNextSection', () => {
    // Act
    const text = renderImplementationReport(base({ withoutNext: true, chain: WORKTREE_CHAIN }));

    // Assert
    assert.equal(text.includes('Wie es weitergeht'), false);
  });
  ```
  In `plugins/forge/tests/chain-reports.test.js` die Importzeilen
  ```js
  const path = require('node:path');
  const { commitFile, makeRepo } = require('./lib/git-repo');
  ```
  ersetzen durch
  ```js
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { git, commitFile, makeRepo, addWorktree } = require('./lib/git-repo');
  ```
  und am Ende der Datei anhängen:
  ```js

  const IMPLEMENTATION_REPORT = path.join(__dirname, '..', 'scripts', 'implementation-report.js');
  const REVIEW_PACKAGE = ['# Review-Paket: a1b2c3d..HEAD', '', '## Commits', 'abc feat: x', '', '## Dateien', ' src/a.js | 3 ++-', ' 1 file changed', '', '## Diff', 'diff --git a/x b/x'].join('\n');

  // Implementation-Review ohne Findings zum Plan im Repo; Rückgabe der Berichtsausgabe.
  function implementationRun(run, extra = []) {
    const workspace = tempDir('dv-forge-chain-impl-');
    const dir = path.join(workspace, 'runde-1');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ergebnis.json'), JSON.stringify({ reviewers: ['design'], failed: [], counts: { red: 0, yellow: 0, green: 0 }, groups: [] }));
    fs.writeFileSync(path.join(dir, 'aggregate.md'), 'STATUS clean=true red=0 yellow=0 green=0 failed=-\n=== REPORT ===\nTabelle\n=== REWORK ===\n');
    const packageFile = path.join(workspace, 'review.diff');
    fs.writeFileSync(packageFile, REVIEW_PACKAGE);
    const result = spawnSync(process.execPath, [IMPLEMENTATION_REPORT, '--dir', dir, '--workspace', workspace, '--plan', run.plan, '--bereich', 'a1b2c3d', '--paket', packageFile, ...extra], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  }

  // Ohne die Zeile `ENDE …`, die zwischen zwei Läufen abweichen darf.
  function withoutStatus(text) {
    return text.replace(/\r\n/g, '\n').split('\n').filter((line) => !line.startsWith('ENDE ')).join('\n');
  }

  test('implementationReport_ImplementationEntry_WorktreeLineFinishStepAndPushLine', () => {
    // Arrange
    const run = specRun();
    const worktree = addWorktree(run.repo, 'feature/x');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/x' });
    const shown = worktree.split(path.sep).join('/');

    // Act
    const text = implementationRun(run);

    // Assert
    assert.ok(text.includes(`### Wie es weitergeht\nWorktree bleibt: ${shown}\n1. Arbeit abschließen (nur manuell, in ${shown}):\n   \`/dv-forge:finish-work\`\nNicht gepusht: \`git push -u origin feature/x\``), text);
  });

  test('implementationReport_NoEntryOrWorktreeRemoved_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = specRun();
    const baseline = implementationRun(run);
    const worktree = addWorktree(run.repo, 'feature/y');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/y' });
    git(run.repo, 'worktree', 'remove', '--force', worktree);

    // Act
    const text = implementationRun(run);

    // Assert
    assert.equal(withoutStatus(text), withoutStatus(baseline));
    assert.equal(text.includes('Worktree bleibt'), false);
  });

  test('implementationReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry', () => {
    // Arrange
    const run = specRun();
    const baseline = implementationRun(run);
    commitFile(run.repo, 'alt/x/spec.md', '# Alt\n', 'add other spec');
    const otherSpec = path.join(run.repo, 'alt/x/spec.md');
    const worktree = addWorktree(run.repo, 'feature/s');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: otherSpec, worktree, branch: 'feature/s' });
    fs.rmSync(otherSpec);

    // Act
    const text = implementationRun(run);

    // Assert
    assert.equal(withoutStatus(text), withoutStatus(baseline));
    assert.equal(text.includes('Worktree bleibt'), false);
  });

  test('implementationReport_EmbeddedRunWithEntry_PrintsFourLinesWithoutNextSection', () => {
    // Arrange
    const run = specRun();
    const worktree = addWorktree(run.repo, 'feature/z');
    writeEntry({ stage: 'implementation', plan: run.plan, spec: run.spec, worktree, branch: 'feature/z' });
    const file = path.join(tempDir('dv-forge-chain-impl-embedded-'), 'bericht.json');

    // Act
    const text = implementationRun(run, ['--bericht', file]);

    // Assert
    assert.equal(text, `ENDE sauber nach Review 1\nERGEBNIS ✅ Bereit zum Abschließen\nFOLLOWUP nein\nBERICHT ${file}\n`);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report-text.test.js" "<R>/plugins/forge/tests/chain-reports.test.js"` — erwartet: FAIL `renderImplementationReport_ReadyWithImplementationEntry_WorktreeLineFinishStepWithPathAndPushLine` und FAIL `implementationReport_ImplementationEntry_WorktreeLineFinishStepAndPushLine`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/report-text.js` direkt vor `function questionSteps(input) {` diesen Block einfügen:
  ```js
  // Zeilen zu Worktree, Abschluss-Schritt und Push, geteilt vom Einzel-Bericht der Implementierung und vom Orchestrator-Bericht.
  function worktreeLine(worktree) {
    return `Worktree bleibt: ${worktree}`;
  }

  function finishStepFor(worktree) {
    return [`Arbeit abschließen (nur manuell, in ${worktree}):`, '/dv-forge:finish-work'];
  }

  function pushLine(branch) {
    return `Nicht gepusht: \`git push -u origin ${branch}\``;
  }

  ```
  Ebenda im `module.exports` die Zeile `  withWorkitem, DOCUMENT_TEXTS,` (Stand nach Task 3) ersetzen durch `  withWorkitem, worktreeLine, finishStepFor, pushLine, DOCUMENT_TEXTS,`.

  In `plugins/forge/scripts/lib/implementation-report-text.js` die Zeile
  `const { openLines, section, stepLines, viewpointsPhrase, proposedCount, blockedSteps, hintSteps } = require('./report-text');`
  ersetzen durch
  `const { openLines, section, stepLines, viewpointsPhrase, proposedCount, blockedSteps, hintSteps, worktreeLine, finishStepFor, pushLine } = require('./report-text');`

  Ebenda die Funktion `steps` durch diesen Block ersetzen (die Funktionen `finishStep` und `nextBlock` sind neu):
  ```js
  // Mit Ketten-Eintrag (`input.chain`: worktree, branch) nennt der Schritt den Worktree.
  function finishStep(chain) {
    return chain ? finishStepFor(chain.worktree) : FINISH;
  }

  // Die Schritte erfassen nur gelistete Hindernisse; ohne gelistete gilt die gemeldete Zahl.
  function steps(input, kind, counts) {
    const rerun = rerunCommand(input);
    const followup = `/dv-forge:review-followup ${input.plan} alle`;
    const finish = finishStep(input.chain);
    if (kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
    if (kind === 'blocked') {
      const openRed = counts.listedRed > 0 ? counts.listedRed : counts.openRed;
      return blockedSteps({ openRed, proposed: proposedCount(input.open, 'red'), followup, rerun, orSelf: 'oder selbst beheben', selfFix: 'Selbst beheben, dann erneut prüfen:' });
    }
    if (kind === 'hints') {
      return hintSteps({ hints: counts.hints, proposed: proposedCount(input.open, 'yellow'), followup, selfFix: 'Bei Bedarf selbst beheben (optional).', closing: [finish] });
    }
    return [finish];
  }

  // Mit Ketten-Eintrag stehen die Worktree-Zeile davor und die Push-Zeile danach, wie im Bericht des Orchestrators.
  function nextBlock(input, kind, counts) {
    const { chain } = input;
    return [
      '### Wie es weitergeht',
      ...(chain ? [worktreeLine(chain.worktree)] : []),
      ...stepLines(steps(input, kind, counts)),
      ...(chain ? [pushLine(chain.branch)] : []),
    ];
  }
  ```
  Ebenda in `renderImplementationReport` die Zeile
  `    ...(input.withoutNext ? [] : [['### Wie es weitergeht', ...stepLines(steps(input, kind, counts))]]),`
  ersetzen durch
  `    ...(input.withoutNext ? [] : [nextBlock(input, kind, counts)]),`

  In `plugins/forge/scripts/lib/implementation-report.js` in `reportInput` die Zeile
  `    plan: options.planArg, topic: topicOf(readText(options.plan)), openRed: open.filter((group) => group.severity === 'red').length,`
  ersetzen durch
  `    plan: options.planArg, chain: options.chain ?? null, topic: topicOf(readText(options.plan)), openRed: open.filter((group) => group.severity === 'red').length,`

  In `plugins/forge/scripts/implementation-report.js` unter `const { buildFollowupReport } = require('./lib/implementation-followup-report');` ergänzen:
  ```js
  const { readEntry } = require('./lib/chain');
  ```
  und in `run` die Zeile `    reportFile: values.bericht ? path.resolve(values.bericht) : undefined,` ersetzen durch:
  ```js
      reportFile: values.bericht ? path.resolve(values.bericht) : undefined,
      chain: values.bericht ? null : readEntry({ stage: 'implementation', artifact: values.plan }),
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report-text.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/implementation-report.test.js" "<R>/plugins/forge/tests/report-text.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-text.js plugins/forge/scripts/lib/implementation-report-text.js plugins/forge/scripts/lib/implementation-report.js plugins/forge/scripts/implementation-report.js plugins/forge/tests/implementation-report-text.test.js plugins/forge/tests/chain-reports.test.js` · `git commit -m "feat(forge): implementation review report names worktree, finish step and push line from the chain entry"`

---
### Task 5: review-followup nennt für die Implementierung Worktree, Abschluss-Schritt und Push-Zeile

**ACs:** AC-08

**Dateien:**
- Modify: `plugins/forge/skills/review-followup/references/flow.md:46-52` · `## Nächster Schritt`
- Test: `plugins/forge/tests/review-followup-skill.test.js` · `reviewFollowupFlow_NextStep_CleanImplementationNamesFinishWorkItself`

**Interfaces:**
- Consumes: CLI `node chain.js lookup --stage implementation --plan <P>` (Task 2) mit den Ausgabezeilen `worktree=<R>`, `branch=<b>` oder `KEIN EINTRAG`.
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/review-followup-skill.test.js` anhängen:
  ```js

  test('reviewFollowupFlow_NextStep_ImplementationEntryAddsWorktreeFinishStepAndPushLine', () => {
    const text = readText(FLOW);
    const script = readText(path.join(__dirname, '..', 'scripts', 'chain.js'));
    const next = text.slice(text.indexOf('## Nächster Schritt'));
    for (const part of ['chain.js" lookup --stage implementation --plan "<P>"', '`worktree=<R>`', '`branch=<b>`', 'KEIN EINTRAG', '`Worktree bleibt: <R>`',
      '`git push -u origin <b>`', '`Arbeit abschließen (nur manuell, in <R>):`', '`/dv-forge:finish-work`', 'Noch nicht umgesetzt: …']) {
      assert.ok(next.includes(part), `${part} fehlt`);
    }
    assert.ok(script.includes("'KEIN EINTRAG'") && script.includes("'worktree'") && script.includes("'branch'"));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/review-followup-skill.test.js"` — erwartet: FAIL `reviewFollowupFlow_NextStep_ImplementationEntryAddsWorktreeFinishStepAndPushLine`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/review-followup/references/flow.md` hinter der letzten Zeile des Abschnitts `## Nächster Schritt`
  `` - `unvollständig, …`: `Ausgefallen: <liste>. Den Skill in einer frischen Session erneut starten.` ``
  diese Zeile anhängen (eine Zeile, doppelte Backticks sind Absicht):
  ````markdown
  - Implementierung mit Ketten-Eintrag: `node "<PLUGIN>/scripts/chain.js" lookup --stage implementation --plan "<P>"`. Gibt die Ausgabe `worktree=<R>` und `branch=<b>` aus (nicht `KEIN EINTRAG`), steht in jedem der Fälle oben die Zeile `Worktree bleibt: <R>` vor und die Zeile ``Nicht gepusht: `git push -u origin <b>` `` nach dem Text des nächsten Schritts. Bei `sauber …`, auch mit `offen` nicht leer, lautet der Abschluss-Schritt `Arbeit abschließen (nur manuell, in <R>):` mit `/dv-forge:finish-work` im Code-Block; das Angebot `Noch nicht umgesetzt: …` bleibt daneben stehen.
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/review-followup-skill.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/review-followup/references/flow.md plugins/forge/tests/review-followup-skill.test.js` · `git commit -m "feat(forge): review-followup names worktree, finish step and push line for a chained implementation"`

---

### Task 6: finish-work entfernt den Ketten-Eintrag

**ACs:** AC-19, AC-20

**Dateien:**
- Modify: `plugins/forge/skills/finish-work/SKILL.md:20-23` · `modus=vor-ort`
- Test: `plugins/forge/tests/work-skills.test.js` · `finishWork_Body_ChecksTestsThenRemoves`

**Interfaces:**
- Consumes: CLI `node chain.js remove --worktree <R>` (Task 2).
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/work-skills.test.js` anhängen:
  ```js

  test('finishWork_Body_RemovesChainEntryOnlyAfterSuccessfulEndOfBothCases', () => {
    const { body } = skill('finish-work');
    const remove = body.indexOf('work.js" remove "<R>"');
    const chain = body.indexOf('chain.js" remove --worktree "<R>"');
    assert.ok(remove > -1 && chain > remove, 'chain.js remove muss nach work.js remove stehen');
    assert.ok(body.includes('Nur nach erfolgreichem Ende beider Fälle'));
    assert.ok(body.includes('Brach ein Schritt ab, bleibt der Eintrag.'));
    assert.equal(body.match(/Weiter mit 5\./g).length, 2);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/work-skills.test.js"` — erwartet: FAIL `finishWork_Body_RemovesChainEntryOnlyAfterSuccessfulEndOfBothCases`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/finish-work/SKILL.md` in der Tabelle in Schritt 4 drei Textstellen ändern:
  - Zeile `modus=vor-ort`: ``Branch `<branch>` bleibt ausgecheckt. Ende. |`` ersetzen durch ``Branch `<branch>` bleibt ausgecheckt. Weiter mit 5. |``
  - Zeile `modus=worktree`: ``weiter im Haupt-Checkout `<haupt>`. |`` ersetzen durch ``weiter im Haupt-Checkout `<haupt>`. Weiter mit 5. |``
  - Hinter dem Absatz `` `remove` bricht ab, wenn noch etwas offen ist … Dann Meldung wörtlich ausgeben, Ende. `` diese Zeile anhängen:
  ````markdown
  5. Nur nach erfolgreichem Ende beider Fälle den Ketten-Eintrag der Umsetzung entfernen, im Haupt-Checkout: `node "<PLUGIN>/scripts/chain.js" remove --worktree "<R>"`, bei `modus=worktree` mit dem entfernten Pfad. Die Ausgabe zeigst du nicht. Brach ein Schritt ab, bleibt der Eintrag.
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/work-skills.test.js"` — erwartet: PASS (die bestehenden Wortgrenz-Tests `finish-work_Body_StaysUnder500WordsAndUsesPluginRoot` bleiben grün: der Body hat danach 336 Wörter)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/finish-work/SKILL.md plugins/forge/tests/work-skills.test.js` · `git commit -m "feat(forge): finish-work removes the chain entry after a successful end"`

---

### Task 7: 🟢 in den Berichtsdaten von Spec- und Plan-Review

**ACs:** AC-35, AC-37

**Dateien:**
- Modify: `plugins/forge/scripts/lib/report-data.js:172-188` · `buildInput`
- Test: `plugins/forge/tests/review-flow-report.test.js` · `report_NoRedInRoundOneWithoutRework_CleanAfterRoundOne`

**Interfaces:**
- Bestehender Code: `data.one.groups` und `data.two.groups` (Einstufung-Gruppen mit `key`, `label`, `color`, `reviewers`, `items[].finding.consequence`) aus `collect` in flow-report.js; `angles(review, names)` und `fallbackDescription` in report-data.js.
- Produces: `green` als Feld der Berichtsdaten von `buildInput`: `[{ key, color: 'green', title, description, recommendation: null, angles, hasProposal: false }]`, je Stelle einmal aus Runde 1 und Nachprüfung; `embeddedOutput` schreibt es in die JSON-Berichtsdaten, `renderReportText` zeigt es nicht.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/review-flow-report.test.js` anhängen:
  ```js

  test('report_GreenFindingInRoundOne_EmbeddedDataListsGreenEntryButReportTextStaysClean', () => {
    // Arrange
    const env = setup();
    writeReviewer(env, 'clarity', [finding({ location: 'AC-01', category: 'formulierung', quote: 'Gegeben A, wenn B, dann C.', consequence: 'Das Wort „dann“ steht zweimal' })]);
    flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');
    const file = path.join(env.workspace, 'bericht.json');

    // Act
    const embedded = flow('report', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--titel', 'Spec-Review', '--artefakt', 'docs/x/spec.md', '--bericht', file);
    const text = report(env);

    // Assert
    assert.equal(embedded.status, 0, embedded.stderr);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(data.green.map((entry) => [entry.key, entry.color, entry.title, entry.hasProposal]), [['ac-1', 'green', 'AC-01', false]]);
    assert.match(data.green[0].description, /^Das Wort „dann“ steht zweimal/);
    assert.deepEqual(data.open, []);
    assert.equal(text.includes('🟢'), false);
  });

  // 🟢 an AC-07 aus der Nachprüfung (Kategorie `formulierung`); Runde 1 hat ein 🔴 an AC-04, das die Nachprüfung als erledigt bestätigt.
  const GREEN_AC07 = (consequence) => finding({ location: 'AC-07', quote: 'Gegeben G, wenn H, dann I.', category: 'formulierung', consequence });

  function embeddedData(env, review = 'spec-review') {
    const file = path.join(env.workspace, 'bericht.json');
    const result = flow('report', '--review', review, '--dir', env.workspace, '--doc', env.doc, '--titel', 'Review', '--artefakt', 'docs/x/doc.md', '--bericht', file);
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  test('report_GreenFindingOnlyInVerification_EmbeddedDataListsItOnceAndNoFollowupReceivesIt', () => {
    // Arrange
    const env = setup();
    runWithVerification(env, [RED('AC-04')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [GREEN_AC07('Satz holpert')] });

    // Act
    const data = embeddedData(env);

    // Assert
    assert.deepEqual(data.green.map((entry) => [entry.title, entry.color, entry.angles, entry.hasProposal]), [['AC-07', 'green', 'Nachprüfung', false]]);
    assert.match(data.green[0].description, /^Satz holpert/);
    assert.deepEqual(data.open, []);
    assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  });

  test('report_SameGreenPlaceInRoundOneAndVerification_EmbeddedDataListsItOnce', () => {
    // Arrange
    const env = setup();
    runWithVerification(env, [RED('AC-04'), GREEN_AC07('Satz holpert')], [{ location: 'AC-04', status: 'changed', change: CHANGE }], { verdicts: [VERDICT('AC-04', 'erledigt')], findings: [GREEN_AC07('Satz holpert weiterhin')] });

    // Act
    const data = embeddedData(env);

    // Assert
    assert.deepEqual(data.green.map((entry) => [entry.title, entry.color]), [['AC-07', 'green']]);
    assert.deepEqual(data.open, []);
    assert.equal(fs.readFileSync(checkedFile(env, 'abschluss', 'aggregate.md'), 'utf8'), '=== REWORK ===\n');
  });

  test('report_PlanGreenFindingInRoundOne_EmbeddedDataListsGreenEntryAndNothingOpen', () => {
    // Arrange
    const env = setup('# Plan\n\n### Task 1: Eins\nText.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n');
    writeReviewer(env, 'coverage', [finding({ location: 'Task 1', quote: 'Text.', category: 'formulierung', consequence: 'Satz holpert' })]);
    flow('rate', '--review', 'plan-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'coverage');

    // Act
    const data = embeddedData(env, 'plan-review');

    // Assert
    assert.deepEqual(data.green.map((entry) => [entry.color, entry.hasProposal]), [['green', false]]);
    assert.match(data.green[0].description, /^Satz holpert/);
    assert.deepEqual(data.open, []);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/review-flow-report.test.js"` — erwartet: FAIL `report_GreenFindingInRoundOne_EmbeddedDataListsGreenEntryButReportTextStaysClean`, FAIL `report_GreenFindingOnlyInVerification_EmbeddedDataListsItOnceAndNoFollowupReceivesIt`, FAIL `report_SameGreenPlaceInRoundOneAndVerification_EmbeddedDataListsItOnce` und FAIL `report_PlanGreenFindingInRoundOne_EmbeddedDataListsGreenEntryAndNothingOpen` (jeweils `data.green` fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/report-data.js` vor `const CHAIN_STAGE = …` (Task 3) diese Funktion einfügen:
  ```js
  // 🟢 aus Runde 1 und Nachprüfung, je Stelle einmal; sie erscheinen nur im Abschlussbericht eines Orchestrators, nie im Einzel-Bericht.
  function greenEntries(options, data) {
    const groups = [...(data.one?.groups ?? []), ...(data.two?.groups ?? [])].filter((group) => group.color === 'green');
    return [...new Map(groups.map((group) => [group.key, group])).values()].map((group) => ({
      key: group.key, color: 'green', title: group.label, description: fallbackDescription(group.items[0].finding.consequence), recommendation: null,
      angles: angles(options.review, group.reviewers), hasProposal: false,
    }));
  }
  ```
  Ebenda in `buildInput` die Zeile
  `    open: open.map((group) => openEntry(options, ctx, group)),`
  ersetzen durch
  `    open: open.map((group) => openEntry(options, ctx, group)), green: greenEntries(options, data),`
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/review-flow-report.test.js" "<R>/plugins/forge/tests/chain-reports.test.js" "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/report-data.js plugins/forge/tests/review-flow-report.test.js` · `git commit -m "feat(forge): carry green findings in the embedded review data"`

---

### Task 8: 🟢 in den Berichtsdaten des Implementierungs-Reviews

**ACs:** AC-35, AC-37

**Dateien:**
- Modify: `plugins/forge/scripts/lib/implementation-report.js:97-100` · `openEntry`
- Modify: `plugins/forge/scripts/lib/implementation-report.js:126-136` · `reportInput`
- Modify: `plugins/forge/scripts/lib/implementation-report.js:141-150` · `embeddedOutput`
- Test: `plugins/forge/tests/implementation-report.test.js` · `implementationReport_EmbeddedWithoutScout_FollowupNein`

**Interfaces:**
- Bestehender Code: `result.groups[].severity === 'green'` aus `ergebnis.json`; `placeKey(location)`, `fallbackDescription`, `reviewerLabel` in implementation-report.js.
- Produces: `green` als Feld von `reportInput`: `[{ key, color: 'green', title: <Stelle>, description, recommendation: null, angles, hasProposal: false }]`; die JSON-Berichtsdaten des eingebetteten Laufs enthalten `green`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Am Ende von `plugins/forge/tests/implementation-report.test.js` anhängen:
  ```js

  test('implementationReport_EmbeddedWithGreenGroup_DataListsGreenEntryAndOpenStaysEmpty', () => {
    // Arrange
    const env = setup({ groups: [GREEN] });
    const file = path.join(env.workspace, 'bericht-review.json');

    // Act
    const result = embeddedReport(env, file);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(data.green.map((entry) => [entry.key, entry.color, entry.title, entry.angles, entry.hasProposal]), [['src/ok.js', 'green', 'src/ok.js', 'Tests', false]]);
    assert.match(data.green[0].description, /^Name holpert/);
    assert.deepEqual(data.open, []);
    assert.equal(data.kind, 'ready');
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report.test.js"` — erwartet: FAIL `implementationReport_EmbeddedWithGreenGroup_DataListsGreenEntryAndOpenStaysEmpty`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/implementation-report.js` den Anfang der Funktion `openEntry` ersetzen: die zwei Zeilen
  ```js
  function openEntry(group, scout) {
    const scouted = scoutedOf(group, scout);
    const angles = group.reviewers.map((name) => reviewerLabel(REVIEW, name)).join(', ');
  ```
  durch diesen Block:
  ```js
  function anglesOf(group) {
    return group.reviewers.map((name) => reviewerLabel(REVIEW, name)).join(', ');
  }

  // 🟢 stehen nur im Abschlussbericht eines Orchestrators; sie haben nie einen Vorschlag.
  function greenEntry(group) {
    return {
      key: placeKey(group.location), color: 'green', title: group.location, description: fallbackDescription(group.items[0].consequence),
      recommendation: null, angles: anglesOf(group), hasProposal: false,
    };
  }

  function openEntry(group, scout) {
    const scouted = scoutedOf(group, scout);
    const angles = anglesOf(group);
  ```
  In `reportInput` die Zeile `    open: open.map((group) => openEntry(group, scout)),` ersetzen durch:
  ```js
      open: open.map((group) => openEntry(group, scout)), green: result.groups.filter((group) => group.severity === 'green').map(greenEntry),
  ```
  In `embeddedOutput` die Zeile `    changes: [], decisions: [], questions: [], open: input.open, notes: input.notes,` ersetzen durch:
  ```js
      changes: [], decisions: [], questions: [], open: input.open, green: input.green, notes: input.notes,
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-report.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/implementation-report.js plugins/forge/tests/implementation-report.test.js` · `git commit -m "feat(forge): carry green groups in the embedded implementation review data"`

---

### Task 9: Implementation-Followup urteilt je Gruppe und behält Vorschläge

**ACs:** AC-31, AC-32, AC-35, AC-37, AC-42

**Dateien:**
- Modify: `plugins/forge/scripts/lib/implementation-followup-report.js:25` · `COLOR`
- Modify: `plugins/forge/scripts/lib/implementation-followup-report.js:40-47` · `parseAnswer`
- Modify: `plugins/forge/scripts/lib/implementation-followup-report.js:71-75` · `statusOf`
- Modify: `plugins/forge/scripts/lib/implementation-followup-report.js:90-121` · `buildFollowupReport`
- Modify: `plugins/forge/agents/implementation-re-reviewer.md:24-31` · `Versucht`
- Modify: `plugins/forge/skills/review-followup/references/flow.md:30-44` · `### Implementierung`
- Test: `plugins/forge/tests/implementation-followup-report.test.js` · `implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen`
- Test: `plugins/forge/tests/implementation-agents.test.js` · `implementation-re-reviewer_Body_VerdictPerFindingAndScope`
- Test: `plugins/forge/tests/review-followup-skill.test.js` · `reviewFollowupFlow_ImplementationStatus_NamesNoGroupNumbersOfTheOldSave`
- Test: `plugins/forge/tests/closing-report-docs.test.js` · `reviewFollowupFlow_EmbeddedRun_PassesBerichtToReportAndImplementationScript`
- Test: `plugins/forge/tests/implementation-report-docs.test.js` · `reviewFollowupFlow_Implementation_KeepsOnlyOpenGroupsAndOffersAlle`

**Interfaces:**
- Bestehender Code: `loadGroups(saveDir)` in followup.js (Gruppen mit `number`, `severity`, `location`, `reviewers`, `findings`); `placeKey(location)` in places.js; die Dateien `followup.json` (`gewaehlt[]`, `offen[]`) und `sicherung-vorher/` aus prepare.js.
- Produces: `parseAnswer(text)` liefert zusätzlich `greens` (🟢-Zeilen aus `### Neue Schäden im Fix-Diff`) und `judged: Map<placeKey, 'behoben' | 'nicht behoben'>` (Gruppenurteile aus `### Findings`; `isConfirmed` findet eine Gruppe über ihre Stelle allein oder über die Überschrift `<Stelle> (<Gutachter>)` aus `prepare.js`); `damages` enthält nur noch 🔴 und 🟡. `node implementation-report.js followup …` druckt fünf Zeilen `ENDE`, `ERGEBNIS`, `FOLLOWUP ja|nein`, `BERICHT <datei>`, `BEHALTEN <nummern|keine|unveraendert>`; `FOLLOWUP ja` heißt: `BEHALTEN` nennt Nummern. Die JSON-Berichtsdaten tragen `green` und `offersFollowup`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/implementation-followup-report.test.js` im Test `implementationFollowup_AllChosenAndClean_ChangesConfirmedAndNothingOpen` die Zeile
  `  assert.equal(result.stdout, \`ENDE sauber nach Nach-Review\nERGEBNIS ✅ Bereit zum Abschließen\nFOLLOWUP nein\nBERICHT ${file}\n\`);`
  ersetzen durch
  ```js
    assert.equal(result.stdout, `ENDE sauber nach Nach-Review\nERGEBNIS ✅ Bereit zum Abschließen\nFOLLOWUP nein\nBERICHT ${file}\nBEHALTEN keine\n`);
  ```
  Am Ende derselben Datei anhängen:
  ```js

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
    assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
    assert.deepEqual(data.open.map((entry) => [entry.color, entry.title, entry.hasProposal]), [['red', 'Schleife benennen', true]]);
    assert.equal(data.offersFollowup, true);
    assert.match(result.stdout, /^ENDE offen nach Nach-Review\n/);
  });

  test('parseAnswer_TitleWithReviewerBracket_JudgesTheGroup', () => {
    // Arrange
    const dir = workspace([1, 2]);
    const text = GROUP_LINES.replace('- **src/a.js:3** —', '- **src/a.js:3 (risks)** —').replace('- **src/b.js:9** —', '- **src/b.js:9 (design)** —');

    // Act
    const { result, data } = run(dir, text);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
    assert.deepEqual(data.changes.map((change) => change.ok), [true, false]);
  });

  test('implementationFollowup_AllChosenConfirmedButNewRedWithoutProposal_FollowupNeinNothingKeptDamageOpen', () => {
    // Arrange
    const dir = workspace([1, 2]);

    // Act
    const { result, data } = run(dir, ALL_FIXED_NEW_RED);

    // Assert
    assert.match(result.stdout, /\nFOLLOWUP nein\nBERICHT [^\n]+\nBEHALTEN keine\n$/);
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
    assert.match(result.stdout, /\nFOLLOWUP ja\nBERICHT [^\n]+\nBEHALTEN 2\n$/);
  });

  test('implementationFollowup_WithoutReReview_FollowupNeinAndSaveUnchanged', () => {
    // Arrange
    const dir = workspace([1]);

    // Act
    const { result, data } = run(dir, '', ['--ohne', 'keine-aenderung']);

    // Assert
    assert.match(result.stdout, /\nFOLLOWUP nein\nBERICHT [^\n]+\nBEHALTEN unveraendert\n$/);
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
  ```
  In `plugins/forge/tests/implementation-agents.test.js` vor dem Test `implementation-final-reviewer_Frontmatter_OpusReadOnly` einfügen:
  ```js
  test('implementation-re-reviewer_Body_JudgesGroupsByPlaceWhenFindingsAreGrouped', () => {
    const { body } = readAgent('implementation-re-reviewer');
    for (const part of ['`### <n> · <Farbe> <Stelle> (<Gutachter>)`', 'urteilst du je Gruppe, nicht je Finding', 'mit der Stelle ohne die Klammer mit den Gutachtern als Titel', 'ohne die Klammer',
      'Eine Gruppe ist nur `behoben`, wenn jedes ihrer Findings behoben ist.', '<Finding in einer Zeile, bei Gruppen die Stelle der Gruppe>']) {
      assert.ok(body.includes(part), `${part} fehlt`);
    }
  });

  ```
  Am Ende von `plugins/forge/tests/review-followup-skill.test.js` anhängen:
  ```js

  test('reviewFollowupFlow_ImplementationSave_FollowsTheBehaltenLineOfTheReportScript', () => {
    const text = readText(FLOW);
    const script = readText(path.join(__dirname, '..', 'scripts', 'lib', 'implementation-followup-report.js'));
    const step = text.slice(text.indexOf('3. Berichtsdaten und Sicherung:'), text.indexOf('4. Status:'));
    for (const part of ['implementation-report.js" followup --workspace "<W>" --bericht "<BD>" <<\'ANTWORT\'', '`BEHALTEN <x>`', '`keine` → ', 'followup.js" drop review <slug>',
      'followup.js" keep review <slug> <nummern>', '`unveraendert` → nichts, es bleibt die alte Sicherung']) {
      assert.ok(step.includes(part), `${part} fehlt`);
    }
    for (const word of ['BEHALTEN unveraendert', "kept.join(',') : 'keine'"]) assert.ok(script.includes(word), `${word} fehlt im Skript`);
  });

  test('reviewFollowupFlow_EmbeddedImplementation_PrintsBehaltenLineBesidesTheFourLines', () => {
    const text = readText(FLOW);
    const embedded = text.slice(text.indexOf('## Eingebetteter Lauf'), text.indexOf('## Nächster Schritt'));
    assert.ok(embedded.includes('Die Ausgabe hat die vier Zeilen und dazu `BEHALTEN <x>`'));
    assert.ok(embedded.includes('`FOLLOWUP ja` heißt, die Sicherung behält Vorschläge'));
  });
  ```
  In `plugins/forge/tests/closing-report-docs.test.js` im Test `reviewFollowupFlow_EmbeddedRun_PassesBerichtToReportAndImplementationScript` den Block
  ```js
    for (const part of ['`--bericht "<BD>"`', '`node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" --bericht "<BD>" <<\'ANTWORT\'`', '`--ohne blockiert`', 'In Schritt 6 entfällt `show`.']) {
      assert.ok(embedded.includes(part), `${part} fehlt`);
    }
  });
  ```
  ersetzen durch
  ```js
    for (const part of ['`--bericht "<BD>"`', 'Schritt 3 der Nachprüfung läuft mit dem `<BD>` aus `$ARGUMENTS`', 'In Schritt 6 entfällt `show`.']) {
      assert.ok(embedded.includes(part), `${part} fehlt`);
    }
    const flow = readText(FOLLOWUP_FLOW);
    for (const part of ['`node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" --bericht "<BD>" <<\'ANTWORT\'`', '`--ohne blockiert`']) {
      assert.ok(flow.includes(part), `${part} fehlt`);
    }
  });
  ```
  In `plugins/forge/tests/implementation-report-docs.test.js` im Test `reviewFollowupFlow_Implementation_KeepsOnlyOpenGroupsAndOffersAlle` die Zeile
  `  assert.ok(implementation.includes('followup.js" keep review <slug> <offen>'));`
  ersetzen durch
  `  assert.ok(implementation.includes('followup.js" keep review <slug> <nummern>'));`
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-followup-report.test.js" "<R>/plugins/forge/tests/implementation-agents.test.js" "<R>/plugins/forge/tests/review-followup-skill.test.js" "<R>/plugins/forge/tests/closing-report-docs.test.js" "<R>/plugins/forge/tests/implementation-report-docs.test.js"` — erwartet: FAIL `implementationFollowup_OneChosenGroupNotConfirmed_KeepsOnlyItsProposalAndOffersFollowup`, FAIL `implementation-re-reviewer_Body_JudgesGroupsByPlaceWhenFindingsAreGrouped`, FAIL `reviewFollowupFlow_ImplementationSave_FollowsTheBehaltenLineOfTheReportScript`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/implementation-followup-report.js`:
  1. Die Zeile `const COLOR = { '🔴': 'red', '🟡': 'yellow' };` ersetzen durch:
  ```js
  const COLOR = { '🔴': 'red', '🟡': 'yellow', '🟢': 'green' };
  const GREEN_ICON = '🟢';
  const GROUP_VERDICT = /^- \*\*(.+?)\*\*\s+—\s+(nicht behoben|behoben)\b/u;
  ```
  2. Die Funktion `parseAnswer` (samt Kommentarzeile darüber) durch diesen Block ersetzen:
  ```js
  // Ohne Urteilszeile gilt die Nachprüfung als nicht bestanden: Der Bericht darf nicht ins Positive kippen.
  // `judged`: Gruppenurteile aus `### Findings` (`- **<Stelle>** — behoben | nicht behoben`), Schlüssel placeKey der Stelle.
  function parseAnswer(text) {
    const verdict = VERDICT.exec(String(text))?.[1] ?? null;
    const damages = sectionLines(text, 'Neue Schäden im Fix-Diff').map((line) => DAMAGE.exec(line)).filter(Boolean);
    return {
      verdict, clean: verdict !== null && CLEAN.test(verdict),
      damages: damages.filter((match) => match[1] !== GREEN_ICON), greens: damages.filter((match) => match[1] === GREEN_ICON),
      judged: new Map(sectionLines(text, 'Findings').map((line) => GROUP_VERDICT.exec(line)).filter(Boolean).map(([, place, state]) => [placeKey(place), state])),
      outside: sectionLines(text, 'Außerhalb').map((line) => line.replace(/^- /, '')),
    };
  }

  // Eine gewählte Gruppe gilt als bestätigt, wenn ihre Urteilszeile „behoben“ sagt; ohne Zeile zählt das Gesamturteil „alle behoben“.
  // Die Zeile darf die Stelle allein oder die ganze Überschrift aus prepare.js (`<Stelle> (<Gutachter>)`) als Titel tragen.
  function isConfirmed(group, answer) {
    const judged = answer.judged.get(placeKey(group.location))
      ?? answer.judged.get(placeKey(`${group.location} (${group.reviewers.join(', ')})`));
    return judged === undefined ? answer.clean : judged === 'behoben';
  }
  ```
  3. In `statusOf` die ersten beiden Zeilen
  ```js
  function statusOf(reviewed, answer, unchosen) {
    if (!reviewed.done) return reviewed.status;
    if (!answer.clean) return 'offen nach Nach-Review';
  ```
  ersetzen durch
  ```js
  function statusOf(reviewed, answer, unchosen, unconfirmed) {
    if (!reviewed.done) return reviewed.status;
    if (!answer.clean || unconfirmed.length > 0) return 'offen nach Nach-Review';
  ```
  4. Die Funktion `buildFollowupReport` samt ihrer Kommentarzeile darüber (``// `options`: workspace (W), reportFile, answer …``) durch diesen Block ersetzen:
  ```js
  // Nummern der Gruppen, deren Vorschläge die Sicherung behält: nicht gewählte und nicht bestätigte gewählte Gruppen.
  // `null`: der Re-Reviewer lief nicht, die Sicherung bleibt unverändert.
  function keptNumbers(reviewed, unchosen, unconfirmed) {
    if (!reviewed.done) return null;
    return [...unchosen, ...unconfirmed].map((group) => group.number).sort((a, b) => a - b);
  }

  function keptLine(kept) {
    if (kept === null) return 'BEHALTEN unveraendert';
    return `BEHALTEN ${kept.length > 0 ? kept.join(',') : 'keine'}`;
  }

  // `options`: workspace (W), reportFile, answer (Antwort des Re-Reviewers) oder without (`blockiert` | `keine-aenderung`).
  // `FOLLOWUP ja`: die Sicherung behält Vorschläge (`BEHALTEN <nummern>`); `/dv-forge:review-followup <P> alle` setzt nur diese um.
  function buildFollowupReport(options) {
    const reviewed = options.without ? { done: false, status: WITHOUT_REVIEW[options.without] } : { done: true };
    if (!reviewed.done && !reviewed.status) throw new FlowError(`--ohne erlaubt: ${Object.keys(WITHOUT_REVIEW).join(', ')}`);
    const followup = readJson(path.join(options.workspace, 'followup.json'));
    const saved = loadGroups(path.join(options.workspace, BEFORE));
    const texts = new Map(scoutTexts(readLines(path.join(options.workspace, BEFORE, 'scout.md'))).map((entry) => [`${entry.severity} ${entry.location}`, entry]));
    const answer = reviewed.done ? parseAnswer(options.answer) : { verdict: null, clean: false, damages: [], greens: [], judged: new Map(), outside: [] };
    const chosen = followup.gewaehlt.map((entry) => ({ entry, group: saved.find((group) => group.number === entry.nummer) })).filter(({ group }) => group);
    const chosenNumbers = new Set(chosen.map(({ group }) => group.number));
    const unchosen = saved.filter((group) => !chosenNumbers.has(group.number));
    const unconfirmed = chosen.map(({ group }) => group).filter((group) => !reviewed.done || !isConfirmed(group, answer));
    const changes = chosen.map(({ entry, group }) => ({
      key: placeKey(group.location), ok: reviewed.done ? isConfirmed(group, answer) : null, ...described(group, texts), angles: angles(group.reviewers),
      change: null, evidence: null, choice: entry.vorschlag,
    }));
    const open = [
      ...unchosen.map((group) => openOf(group, texts, group.severity === '🔴' ? 'red' : 'yellow')),
      ...unconfirmed.map((group) => openOf(group, texts, 'red')),
      ...answer.damages.map(damageEntry),
    ];
    const openRed = open.filter((entry) => entry.color === 'red').length;
    const kind = kindOf(open);
    const line = resultLine({ review: REVIEW, failedLabels: [], questions: [], openRed }, kind, open.length - openRed);
    const status = statusOf(reviewed, answer, unchosen, unconfirmed);
    const kept = keptNumbers(reviewed, unchosen, unconfirmed);
    const offersFollowup = kept !== null && kept.length > 0;
    const count = chosen.length === 1 ? '1 gewählter Vorschlag' : `${chosen.length} gewählte Vorschläge`;
    writeJson(options.reportFile, {
      format: FORMAT, review: REVIEW, title: `Review-Followup (${REVIEW})`, followup: true, status, kind, resultLine: line,
      flowLine: `Ablauf: ${count} umgesetzt, ${reviewed.done ? 'ein Nach-Review' : 'kein Nach-Review'}.`, offersFollowup,
      openRed, failedLabels: [], chosenCount: chosen.length, changes, decisions: [], questions: [], open, green: answer.greens.map(damageEntry), notes: notesOf(reviewed, answer),
    });
    return [`ENDE ${status}`, `ERGEBNIS ${line.replace(RESULT_PREFIX, '')}`, `FOLLOWUP ${offersFollowup ? 'ja' : 'nein'}`, `BERICHT ${options.reportFile}`, keptLine(kept)].join('\n');
  }
  ```
  In `plugins/forge/agents/implementation-re-reviewer.md` unter `## Regeln` hinter der Zeile `- "Versucht" ist nicht behoben. Behoben heißt: Der konkrete Mangel existiert nicht mehr.` diese Zeile einfügen:
  ```markdown
  - Stehen in `Findings:` Gruppen mit Überschrift `### <n> · <Farbe> <Stelle> (<Gutachter>)`, urteilst du je Gruppe, nicht je Finding: genau eine Zeile je Gruppe mit der Stelle ohne die Klammer mit den Gutachtern als Titel. Eine Gruppe ist nur `behoben`, wenn jedes ihrer Findings behoben ist.
  ```
  und im Ausgabeformat die Zeile `- **<Finding in einer Zeile>** — behoben | nicht behoben — <Beleg mit datei:zeile>` ersetzen durch:
  ```markdown
  - **<Finding in einer Zeile, bei Gruppen die Stelle der Gruppe>** — behoben | nicht behoben — <Beleg mit datei:zeile>
  ```
  In `plugins/forge/skills/review-followup/references/flow.md`, Abschnitt `### Implementierung` unter `## Nachprüfung`, die Schritte 3 und 4 ersetzen durch:
  ````markdown
  3. Berichtsdaten und Sicherung: `node "<PLUGIN>/scripts/implementation-report.js" followup --workspace "<W>" --bericht "<BD>" <<'ANTWORT'`, darunter die Antwort des Re-Reviewers unverändert, dann eine Zeile `ANTWORT`. `<BD>` ist der Wert nach `--bericht` aus `$ARGUMENTS`, sonst `<W>/bericht-followup.json`. Ohne Nach-Review statt der Antwort `--ohne blockiert` bzw. `--ohne keine-aenderung`, ohne Heredoc. Die Zeile `BEHALTEN <x>` der Ausgabe entscheidet über die Sicherung: `keine` → `node "<PLUGIN>/scripts/followup.js" drop review <slug>`; Nummern → `node "<PLUGIN>/scripts/followup.js" keep review <slug> <nummern>`, die Sicherung behält dann nur nicht gewählte und nicht bestätigte Gruppen; `unveraendert` → nichts, es bleibt die alte Sicherung. Kein Scout.
  4. Status: Urteil `alle behoben, keine neuen 🔴` und `offen` leer → `sauber nach Nach-Review`; dasselbe Urteil mit `offen` nicht leer → `sauber nach Nach-Review, nicht gewählte Gruppen bleiben offen`; sonst `offen nach Nach-Review`. Der Re-Reviewer urteilt je Gruppe; `offen nach Nach-Review` gilt auch, wenn eine gewählte Gruppe nicht `behoben` ist oder ein neues 🔴 gemeldet wird. Es ist die Zeile `ENDE <status>` der Ausgabe von Schritt 3.
  ````
  Ebenda im Abschnitt `## Eingebetteter Lauf` den Punkt `- Implementierung: nach Schritt 4 der Nachprüfung …` (der ganze Punkt bis `… Die Ausgabe hat dieselben vier Zeilen.`) ersetzen durch:
  ````markdown
  - Implementierung: Schritt 3 der Nachprüfung läuft mit dem `<BD>` aus `$ARGUMENTS`. Die Ausgabe hat die vier Zeilen und dazu `BEHALTEN <x>`; `FOLLOWUP ja` heißt, die Sicherung behält Vorschläge, die `review-followup <P> alle` erreicht.
  ````
  Ebenda im Abschnitt `## Nächster Schritt` vor dem Punkt ``- Implementierung offen, `keine Änderung` oder `blockiert`: …`` einfügen:
  ````markdown
  - Implementierung `offen nach Nach-Review` mit `BEHALTEN <nummern>`: `Noch nicht umgesetzt: /dv-forge:review-followup <artefakt> alle.`
  ````
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-followup-report.test.js" "<R>/plugins/forge/tests/implementation-agents.test.js" "<R>/plugins/forge/tests/review-followup-skill.test.js" "<R>/plugins/forge/tests/closing-report-docs.test.js" "<R>/plugins/forge/tests/implementation-report-docs.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/implementation-followup-report.js plugins/forge/agents/implementation-re-reviewer.md plugins/forge/skills/review-followup/references/flow.md plugins/forge/tests/implementation-followup-report.test.js plugins/forge/tests/implementation-agents.test.js plugins/forge/tests/review-followup-skill.test.js plugins/forge/tests/closing-report-docs.test.js plugins/forge/tests/implementation-report-docs.test.js` · `git commit -m "feat(forge): implementation followup judges per group and keeps proposals of unconfirmed groups"`

---
### Task 10: orchestrator-report führt Review und bis zu zwei Followup-Runden zusammen

**ACs:** AC-25, AC-36, AC-37, AC-38, AC-39

**Dateien:**
- Modify: `plugins/forge/scripts/lib/orchestrator-report.js:61-84` · `mergeReports`
- Modify: `plugins/forge/scripts/orchestrator-report.js:30-44` · `parse`
- Test: `plugins/forge/tests/orchestrator-report.test.js` · `orchestratorReport_EndToEndRoundOneNotDoneThenFollowupDone_OneConfirmedEntryAndNothingOpen`

**Interfaces:**
- Bestehender Code: JSON-Berichtsdaten aus `review-flow.js report --bericht` und `implementation-report.js [followup] --bericht` mit den Feldern `flowLine`, `changes[]`, `open[]` (`key`, `color`, `hasProposal`), `decisions[]`, `questions[]`, `failedLabels[]`, `openRed`, `notes[]`.
- Consumes: `green` als Feld der Berichtsdaten (Tasks 7, 8 und 9).
- Produces: `mergeReports({ art, reviewFile, followupFiles = [] })` (statt `followupFile`) liefert zusätzlich `green` (je Stelle einmal, Stellen aus `open` entfallen) und `followupRounds` (Zahl der gelieferten Runden); `flowLines` heißt bei einer Runde `Followup: …`, bei zwei Runden `Followup 1: …`, `Followup 2: …`. Das CLI `orchestrator-report.js` nimmt `--followup <json>` höchstens zweimal (dritte Angabe: Exit 2 mit `--followup höchstens 2 Mal`).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Am Ende von `plugins/forge/tests/orchestrator-report.test.js` anhängen:
  ```js

  // Plan-Lauf mit Review-Daten und bis zu zwei Followup-Runden.
  function planReportRounds(review, followups, extra = []) {
    const dir = tempDir('dv-forge-orch-');
    const args = ['--art', 'plan', '--review', writePart(dir, 'review.json', review), '--out', path.join(dir, 'abschluss.md'), '--plan', PLAN, '--spec', SPEC, '--stand', 'Spec uncommittet, Plan uncommittet', ...extra];
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
    const result = run(['--art', 'plan', '--review', review, '--followup', roundOne, '--followup', path.join(dir, 'fehlt.json'), '--out', path.join(dir, 'a.md'), '--plan', PLAN, '--spec', SPEC, '--stand', 'x']);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\*\*Hinweise zum Ablauf:\*\*\n- Der Followup hat keinen Bericht geliefert; es gilt der Stand vor dieser Runde\./);
    assert.match(result.stdout, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen/);
  });

  test('orchestratorReport_ThreeFollowupOptions_ExitsWithTwoAndNamesLimit', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const file = writePart(dir, 'r.json', part());

    // Act
    const result = run(['--art', 'plan', '--review', file, '--followup', file, '--followup', file, '--followup', file, '--out', path.join(dir, 'a.md'), '--plan', PLAN, '--spec', SPEC, '--stand', 'x']);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--followup höchstens 2 Mal/);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: FAIL `orchestratorReport_TwoFollowupRounds_FlowLinesNumberedAndRoundTwoReplacesEntryOfSamePlace`, FAIL `orchestratorReport_ThreeFollowupOptions_ExitsWithTwoAndNamesLimit`
- [ ] **Schritt 3: Minimal implementieren**
  Den gesamten Inhalt von `plugins/forge/scripts/lib/orchestrator-report.js` ersetzen durch:
  ```js
  'use strict';

  // Führt die Berichtsdaten eines eingebetteten Reviews und seiner Followup-Runden (JSON aus `--bericht`) zum Endstand zusammen.
  // Schlüssel einer Änderung oder offenen Gruppe ist `key` (placeKey der Stelle): Eine spätere Runde ersetzt den Eintrag der früheren
  // an dessen Platz, neue Einträge kommen ans Ende. Offen bleibt, was die letzte Runde offen meldet, und jede offene Gruppe einer
  // früheren Runde ohne Scout-Vorschlag; die erreicht keine Runde, und ihre Daten kennen sie nicht.
  // 🟢 (`green`) aus allen Teilen stehen je Stelle einmal im Endstand, außer die Stelle ist dort offen.

  const fs = require('node:fs');
  const { resultLine } = require('./report-text');
  const { FlowError } = require('./flow-error');

  const REVIEW_OF_ART = { spec: 'spec-review', plan: 'plan-review', implementation: 'implementation-review' };
  const RANK = { red: 0, yellow: 1 };
  const MISSING_REVIEW = '**Ergebnis:** ⚠️ Unvollständig · Review ohne Bericht';
  const MISSING_FOLLOWUP = 'Der Followup hat keinen Bericht geliefert; es gilt der Stand vor dieser Runde.';

  function readPart(file) {
    if (!file || !fs.existsSync(file)) return null;
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new FlowError(`kein gültiges JSON: ${file}: ${error.message}`);
    }
  }

  function unique(list) {
    return [...new Set(list)];
  }

  // Einträge ohne Schlüssel (ältere Daten) bleiben einzeln stehen.
  function keyOf(entry, index, part) {
    return typeof entry.key === 'string' && entry.key !== '' ? entry.key : `${part}#${index}`;
  }

  function mergeByKey(parts, field, name) {
    const byKey = new Map();
    parts.forEach((part, round) => (part?.[field] ?? []).forEach((entry, index) => byKey.set(keyOf(entry, index, `${name}${round}`), entry)));
    return [...byKey.values()];
  }

  // `parts`: Review, dann die gelieferten Followup-Runden in Reihenfolge.
  function mergeOpen(parts) {
    let open = parts[0]?.open ?? [];
    for (const part of parts.slice(1)) {
      const unreachable = open.filter((entry) => !entry.hasProposal);
      open = [...unreachable, ...(part.open ?? [])];
    }
    const byKey = new Map();
    open.forEach((entry, index) => byKey.set(`${entry.color}:${keyOf(entry, index, 'open')}`, entry));
    return [...byKey.values()].filter((entry) => Object.hasOwn(RANK, entry.color)).sort((a, b) => RANK[a.color] - RANK[b.color]);
  }

  function mergeGreen(parts, open) {
    const openKeys = new Set(open.map((entry) => entry.key));
    return mergeByKey(parts, 'green', 'green').filter((entry) => !openKeys.has(entry.key));
  }

  function kindOf(state) {
    if (state.failedLabels.length > 0) return 'incomplete';
    if (state.questions.length > 0) return 'questions';
    if (state.openRed > 0) return 'blocked';
    return state.open.some((entry) => entry.color === 'yellow') ? 'hints' : 'ready';
  }

  // Eine Runde: `Followup: …`; zwei Runden: `Followup 1: …`, `Followup 2: …`.
  function flowLines(review, followups) {
    const label = (index) => (followups.length > 1 ? `Followup ${index + 1}: ` : 'Followup: ');
    return [review?.flowLine, ...followups.map((part, index) => part.flowLine?.replace(/^Ablauf: /, label(index)))].filter(Boolean);
  }

  // `art`: spec | plan | implementation; `reviewFile`; `followupFiles` (optional, höchstens zwei): Dateien aus `--bericht`.
  function mergeReports({ art, reviewFile, followupFiles = [] }) {
    const reviewName = REVIEW_OF_ART[art];
    if (!reviewName) throw new FlowError(`--art erlaubt: ${Object.keys(REVIEW_OF_ART).join(', ')}; nicht ${art}`);
    const review = readPart(reviewFile);
    const read = review ? followupFiles.map(readPart) : [];
    const followups = read.filter(Boolean);
    const parts = [review, ...followups];
    const final = parts[parts.length - 1];
    const open = mergeOpen(parts);
    const listedRed = open.filter((entry) => entry.color === 'red').length;
    const state = {
      art, review: reviewName, open, questions: final?.questions ?? [], failedLabels: final?.failedLabels ?? [],
      openRed: Math.max(final?.openRed ?? 0, listedRed),
    };
    const kind = review ? kindOf(state) : 'incomplete';
    const hints = open.filter((entry) => entry.color === 'yellow').length;
    return {
      ...state, kind, followupRan: followups.length > 0, followupRounds: followups.length,
      resultLine: review ? resultLine(state, kind, hints) : MISSING_REVIEW,
      flowLines: flowLines(review, followups),
      checked: review?.checked ?? [], found: review?.found ?? [],
      changes: mergeByKey(parts, 'changes', 'change'),
      green: mergeGreen(parts, open),
      decisions: parts.flatMap((part) => part?.decisions ?? []),
      notes: unique([...parts.flatMap((part) => part?.notes ?? []), ...(review && read.includes(null) ? [MISSING_FOLLOWUP] : [])]),
    };
  }

  module.exports = { mergeReports, REVIEW_OF_ART };
  ```
  In `plugins/forge/scripts/orchestrator-report.js`:
  1. Unter `const OPTIONAL = ['--followup', '--wi', '--fakten'];` die Zeile `const MAX_FOLLOWUPS = 2;` einfügen.
  2. In den drei Zeilen des Textes `USAGE` jeweils `[--followup <json>] --out` ersetzen durch `[--followup <json>]... --out`.
  3. Die Funktion `parse` ersetzen durch:
  ```js
  function parse(args) {
    const values = {};
    let followups = null;
    for (let index = 0; index < args.length; index += 2) {
      if (!args[index]?.startsWith('--') || index + 1 >= args.length) throw new UsageError(`Unvollständiges Argument: ${args[index]}`);
      if (args[index] === '--followup') (followups ??= []).push(args[index + 1]);
      else values[args[index]] = args[index + 1];
    }
    if (followups) values['--followup'] = followups;
    if ((followups?.length ?? 0) > MAX_FOLLOWUPS) throw new UsageError(`--followup höchstens ${MAX_FOLLOWUPS} Mal`);
    const required = REQUIRED[values['--art']];
    if (!required) throw new UsageError(`--art erlaubt: ${Object.keys(REQUIRED).join(', ')}`);
    const unknown = Object.keys(values).filter((name) => name !== '--art' && !required.includes(name) && !OPTIONAL.includes(name));
    if (unknown.length > 0) throw new UsageError(`Unbekannt für --art ${values['--art']}: ${unknown.join(', ')}`);
    const missing = required.filter((name) => !values[name]);
    if (missing.length > 0) throw new UsageError(`fehlt: ${missing.join(', ')}`);
    if (values['--pruefung'] && !CHECKS.includes(values['--pruefung'])) throw new UsageError(`--pruefung erlaubt: ${CHECKS.join(', ')}`);
    return values;
  }
  ```
  4. In `run` die Zeile `  const report = mergeReports({ art: values['--art'], reviewFile: path.resolve(values['--review']), followupFile: values['--followup'] ? path.resolve(values['--followup']) : null });` ersetzen durch:
  ```js
    const report = mergeReports({ art: values['--art'], reviewFile: path.resolve(values['--review']), followupFiles: (values['--followup'] ?? []).map((file) => path.resolve(file)) });
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: PASS (alle bisherigen Tests und die vier neuen)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/orchestrator-report.js plugins/forge/scripts/orchestrator-report.js plugins/forge/tests/orchestrator-report.test.js` · `git commit -m "feat(forge): orchestrator report merges up to two followup rounds and green findings"`

---

### Task 11: Abschlussbericht ohne Followup-Angebot, mit 🟢 unter „Was ist noch offen“

Eine Aufgabe, weil beide Änderungen denselben Renderer (`renderOrchestratorReport`) betreffen und `orchestrator-report.test.js` beide Verhalten in denselben Fixtures prüft; der Austausch der Datei ist nur als Ganzes konsistent.

**ACs:** AC-35, AC-36, AC-37, AC-38, AC-40, AC-41

**Dateien:**
- Modify: `plugins/forge/scripts/lib/orchestrator-report-text.js:1-107` · `renderOrchestratorReport`
- Modify: `plugins/forge/scripts/lib/report-text.js:12` · `ICON`
- Test: `plugins/forge/tests/orchestrator-report.test.js` · `orchestratorReport_BlockedPlan_NamesFollowupAndPlanReviewButNoImplementation`

**Interfaces:**
- Bestehender Code in report-text.js: `changeLines`, `openLines`, `stepLines`, `questionSteps`, `DOCUMENT_TEXTS`.
- Consumes: `mergeReports` mit dem Feld `green` (Task 10); `withWorkitem(command, workitem)` (Task 3); `worktreeLine(worktree)`, `finishStepFor(worktree)` und `pushLine(branch)` aus report-text.js (Task 4), damit Worktree-, Abschluss- und Push-Zeile wortgleich mit dem Einzel-Bericht der Implementierung bleiben.
- Produces: `renderOrchestratorReport(report, facts)` listet `report.green` nach 🔴, 🟡 und ❓ als `- 🟢 **<Stelle>** · aus: <Blickwinkel>` mit Konsequenz-Satz; „Wie es weitergeht“ nennt nie `/dv-forge:review-followup`: Hindernisse → ein Schritt `Das Dokument selbst anpassen, dann erneut prüfen:` bzw. bei der Implementierung `Selbst beheben, dann erneut prüfen:` mit dem Review-Befehl, Hinweise → `Bei Bedarf … (optional).` vor dem Schritt zur nächsten Stufe. `ICON.green = '🟢'` in report-text.js, damit die bestehende Zeilenfunktion für offene Einträge auch 🟢 setzt.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/orchestrator-report.test.js` die drei Tests `orchestratorReport_BlockedPlan_NamesFollowupAndPlanReviewButNoImplementation`, `orchestratorReport_OnlyHintsOpen_ReadyWithHintsAndOptionalFollowupBeforeImplementation` und `orchestratorReport_BlockedImplementation_FollowupWithSpecFlag` jeweils komplett (der gesamte `test(…)`-Block) durch die folgenden drei ersetzen; im Test `orchestratorReport_ReviewHindranceWithoutProposal_StaysOpenAfterFollowup` tauscht der Absatz danach nur die letzte Assertion:
  ```js
  test('orchestratorReport_BlockedPlan_SelfFixStepWithPlanReviewAndNoFollowup', () => {
    // Arrange
    const review = part({ status: 'nicht bereit, 1 × 🔴 offen', kind: 'blocked', openRed: 1, open: [entry('red', 'task 2')] });

    // Act
    const text = planReport(review, null);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
    assert.equal(sectionOf(text, '# Wie es weitergeht'), [
      '1. Spec und Plan committen. Stand: Spec uncommittet, Plan uncommittet.',
      '2. Das Dokument selbst anpassen, dann erneut prüfen:',
      '   `/dv-forge:plan-review /repo/docs/forge/x/plan.md`',
      '3. Implementieren erst nach ✅ Bereit zur Umsetzung.',
    ].join('\n'));
  });

  test('orchestratorReport_OnlyHintsOpen_ReadyWithHintsAndOptionalSelfStepBeforeImplementation', () => {
    // Arrange
    const review = part({ kind: 'hints', open: [entry('yellow', 'task 1')] });

    // Act
    const text = planReport(review, null);

    // Assert
    assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen/);
    assert.match(sectionOf(text, '# Wie es weitergeht'), /^1\. Spec und Plan committen\. Stand: Spec uncommittet, Plan uncommittet\.\n2\. Bei Bedarf das Dokument selbst anpassen \(optional\)\.\n3\. Implementieren \(erst nach 1/);
    assert.doesNotMatch(text, /review-followup/);
  });

  test('orchestratorReport_BlockedImplementation_SelfFixStepWithReviewCommandAndNoFollowup', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = part({ review: 'implementation-review', kind: 'blocked', openRed: 1, open: [entry('red', 'src/a.js:3')] });

    // Act
    const result = run(implementationArgs(dir, review, 'keine'));

    // Assert
    assert.match(result.stdout, /1\. Selbst beheben, dann erneut prüfen:\n {3}`\/dv-forge:implementation-review \/repo\/docs\/forge\/x\/plan\.md \/repo\/docs\/forge\/x\/spec\.md`/);
    assert.doesNotMatch(result.stdout, /review-followup/);
  });
  ```
  Im Test `orchestratorReport_ReviewHindranceWithoutProposal_StaysOpenAfterFollowup` die Assertion
  `  assert.match(sectionOf(text, '# Wie es weitergeht'), /Das Hindernis hat keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:/);`
  ersetzen durch
  ```js
    assert.match(sectionOf(text, '# Wie es weitergeht'), /2\. Das Dokument selbst anpassen, dann erneut prüfen:/);
  ```
  Am Ende der Datei anhängen:
  ```js

  function green(key, overrides = {}) {
    return { key, color: 'green', title: key, description: `Folge ${key}.`, recommendation: null, angles: 'Klarheit', hasProposal: false, ...overrides };
  }

  test('orchestratorReport_GreenFindings_ListedAfterRedYellowAndQuestionsWithoutChangingResultOrSteps', () => {
    // Arrange
    const base = { kind: 'blocked', openRed: 1, open: [entry('yellow', 'task 1'), entry('red', 'task 3')], questions: ['Soll der Export CSV liefern?'] };
    const withGreen = part({ ...base, green: [green('abschnitt a', { angles: 'Machbarkeit' }), green('abschnitt b')] });

    // Act
    const text = planReport(withGreen, null);
    const without = planReport(part(base), null);

    // Assert
    const open = sectionOf(text, '# Was ist noch offen').trimEnd();
    assert.ok(open.indexOf('🔴') < open.indexOf('🟡') && open.indexOf('🟡') < open.indexOf('❓') && open.indexOf('❓') < open.indexOf('🟢'));
    assert.match(open, /- 🟢 \*\*abschnitt a\*\* · aus: Machbarkeit\n {2}Folge abschnitt a\.\n- 🟢 \*\*abschnitt b\*\* · aus: Klarheit\n {2}Folge abschnitt b\.$/);
    assert.equal(sectionOf(text, '# Abschlussbericht'), sectionOf(without, '# Abschlussbericht'));
    assert.equal(sectionOf(text, '# Wie es weitergeht'), sectionOf(without, '# Wie es weitergeht'));
  });

  test('orchestratorReport_OnlyGreenFindings_ListedInsteadOfNothingOpenAndResultStaysReady', () => {
    // Act
    const text = planReport(part({ green: [green('abschnitt a')] }), null);

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

  test('orchestratorReport_ImplementationWithGreenFindings_GreenInOpenSectionStepsUnchanged', () => {
    // Arrange
    const dir = tempDir('dv-forge-orch-');
    const review = part({ review: 'implementation-review', kind: 'ready', resultLine: '**Ergebnis:** ✅ Bereit zum Abschließen', green: [green('src/ok.js', { angles: 'Tests' })] });

    // Act
    const result = run(implementationArgs(dir, review, 'gruen'));

    // Assert
    assert.match(result.stdout, /# Was ist noch offen\n- 🟢 \*\*src\/ok\.js\*\* · aus: Tests\n {2}Folge src\/ok\.js\.\n\n# Wie es weitergeht\nWorktree bleibt: \/repo-wt\n1\. Arbeit abschließen/);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-report.test.js"` — erwartet: FAIL `orchestratorReport_BlockedPlan_SelfFixStepWithPlanReviewAndNoFollowup`, FAIL `orchestratorReport_OnlyHintsOpen_ReadyWithHintsAndOptionalSelfStepBeforeImplementation`, FAIL `orchestratorReport_GreenFindings_ListedAfterRedYellowAndQuestionsWithoutChangingResultOrSteps`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/report-text.js` die Zeile `const ICON = { red: '🔴', yellow: '🟡' };` ersetzen durch:
  ```js
  const ICON = { red: '🔴', yellow: '🟡', green: '🟢' };
  ```
  Den gesamten Inhalt von `plugins/forge/scripts/lib/orchestrator-report-text.js` ersetzen durch:
  ```js
  'use strict';

  // Der eine Abschlussbericht eines Orchestrators in vier Abschnitten. Reine Funktion: Die Eingabe baut orchestrator-report.js
  // (Endstand) zusammen mit den Angaben des Orchestrators (`facts`: Pfade, Commit-Stand, Prüfergebnis, Faktenzeilen).
  // „Wie es weitergeht“ bietet keinen Review-Followup an: Die Followup-Runden hat der Orchestrator schon gelaufen.

  const { changeLines, openLines, stepLines, withWorkitem, worktreeLine, finishStepFor, pushLine, questionSteps, DOCUMENT_TEXTS } = require('./report-text');

  const CHANGED_IN = { spec: 'in der Spec', plan: 'im Plan', implementation: 'im Code' };
  const NOTHING_CHANGED = 'Keine Änderung.';
  const NOTHING_OPEN = 'Nichts weiter offen.';
  const IMPLEMENTATION_SELF = { selfFix: 'Selbst beheben, dann erneut prüfen:', selfFixOptional: 'Bei Bedarf selbst beheben (optional).' };

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

  // 🔴, 🟡 und ❓ zuerst, dann alle 🟢 (je Stelle einmal). Ein 🟢 ändert weder Ergebnis noch nächste Schritte.
  function openSection(report) {
    const lines = [
      ...report.open.filter((entry) => entry.color === 'red').flatMap(openLines),
      ...report.open.filter((entry) => entry.color === 'yellow').flatMap(openLines),
      ...report.questions.map((line) => `- ❓ ${line}`),
      ...(report.green ?? []).flatMap(openLines),
    ];
    return lines.length > 0 ? lines : [NOTHING_OPEN];
  }

  // Schritte aus offenen Hindernissen und Hinweisen; ohne Followup-Angebot: Hindernisse behebt der Mensch selbst, Hinweise optional.
  // `next` schließt bei ✅ ab.
  function reviewSteps(report, rerun, texts, next) {
    if (report.kind === 'incomplete') return [['Den Lauf in einer frischen Session erneut starten:', rerun]];
    if (report.kind === 'blocked') return [[texts.selfFix, rerun]];
    if (report.kind === 'hints') return [texts.selfFixOptional, ...next];
    return next;
  }

  function documentSteps(report, facts, plan) {
    const artifact = plan ? facts.plan : facts.spec;
    const rerun = `/dv-forge:${report.review} ${artifact}`;
    const next = plan
      ? [['Implementieren (erst nach 1; sonst fehlen Plan und Spec im Worktree):', withWorkitem(`/dv-forge:implementation-orchestrator ${facts.plan} ${facts.spec}`, facts.wi)]]
      : [['Plan (frische Session):', withWorkitem(`/dv-forge:plan-orchestrator ${facts.spec}`, facts.wi)]];
    const ready = plan ? '✅ Bereit zur Umsetzung' : '✅ Bereit zum Planen';
    const notYet = `${plan ? 'Implementieren' : 'Planen'} erst nach ${ready}.`;
    const rest = report.kind === 'questions'
      ? [...questionSteps({ review: report.review, artifact, spec: plan ? facts.spec : null }), notYet]
      : reviewSteps(report, rerun, DOCUMENT_TEXTS, next);
    const commit = plan ? `Spec und Plan committen. Stand: ${facts.stand ?? 'unbekannt'}.` : `Spec committen. Ergebnis: ${facts.commit ?? 'unbekannt'}.`;
    const blocked = ['blocked', 'incomplete'].includes(report.kind) ? [notYet] : [];
    return [commit, ...rest, ...blocked];
  }

  function implementationSteps(report, facts) {
    const rerun = `/dv-forge:implementation-review ${facts.plan} ${facts.spec}`;
    const finish = [finishStepFor(facts.worktree)];
    if (['ready', 'hints'].includes(report.kind) && facts.check !== 'gruen') return [['Build, Test oder Lint nicht grün: selbst beheben, dann erneut prüfen:', rerun]];
    return reviewSteps(report, rerun, IMPLEMENTATION_SELF, finish);
  }

  function nextLines(report, facts) {
    if (report.art !== 'implementation') return stepLines(documentSteps(report, facts, report.art === 'plan'));
    return [
      worktreeLine(facts.worktree),
      ...stepLines(implementationSteps(report, facts)),
      pushLine(facts.branch),
    ];
  }

  function renderOrchestratorReport(report, facts) {
    return [
      ['# Abschlussbericht', ...closingLines(report, facts)],
      [`# Was sich ${CHANGED_IN[report.art]} geändert hat`, ...changedLines(report)],
      ['# Was ist noch offen', ...openSection(report)],
      ['# Wie es weitergeht', ...nextLines(report, facts)],
    ].map((block) => block.join('\n')).join('\n\n');
  }

  module.exports = { renderOrchestratorReport, NOTHING_OPEN, NOTHING_CHANGED };
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/orchestrator-report.test.js" "<R>/plugins/forge/tests/report-text.test.js"` — erwartet: PASS
- [ ] **Schritt 5: Gesamtlauf der bisherigen Tasks**
  Befehl: `node --test "<R>/plugins/forge/tests/*.test.js"` — erwartet: PASS, 0 fehlgeschlagen
- [ ] **Schritt 6: Commit**
  `git add plugins/forge/scripts/lib/orchestrator-report-text.js plugins/forge/scripts/lib/report-text.js plugins/forge/tests/orchestrator-report.test.js` · `git commit -m "feat(forge): orchestrator closing report lists green findings and offers no followup step"`

---

### Task 12: plan-orchestrator: Followup-Runden und Ketten-Eintrag

**ACs:** AC-16, AC-17, AC-21, AC-23, AC-24, AC-25, AC-26, AC-27, AC-28, AC-34

**Dateien:**
- Modify: `plugins/forge/skills/plan-orchestrator/SKILL.md:22-40` · `## Ablauf`
- Test: `plugins/forge/tests/plan-orchestrator.test.js` · `planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithEmbeddedReports`
- Test: `plugins/forge/tests/plan-orchestrator.test.js` · `planOrchestrator_Body_NeverCommitsAndKeepsCheckoutRules` (bleibt unverändert und läuft gegen den neuen Body: Regel 5 `Nie committen. …` steht, `git add` und `git commit` fehlen)

**Interfaces:**
- Consumes: CLI `node chain.js write --stage plan --plan <P> --spec <S> [--wi <nr>]` (Task 2; erzeugt keinen Commit, belegt durch `chainCli_Write_CreatesNoCommitAndLeavesWorkingTreeClean`); `orchestrator-report.js` mit zweimal `--followup` (Task 10).
- Produces: —

- [ ] **Schritt 1: Tests anpassen und schreiben**
  In `plugins/forge/tests/plan-orchestrator.test.js` diese Textstellen ersetzen:
  - ``'`dv-forge:review-followup` mit `<P> alle --bericht "<BF>"`'`` (Eintrag in der Liste `steps` des Tests `planOrchestrator_Body_ChainsTheThreePlanSkillsInOrderWithEmbeddedReports`) durch `` '`dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"`' ``
  - `assert.equal(body.match(/Spec-Prüfung\./g).length, 3);` durch `assert.equal(body.match(/Spec-Prüfung\./g).length, 4);`
  - die Assertion ``assert.ok(body.includes('Zeile `Review abgeschlossen: ⛔ Noch nicht bereit …` UND `FOLLOWUP ja` → 4, sonst 5.'));`` durch:
  ```js
    assert.ok(body.includes('Schlusszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · …`: `FOLLOWUP ja` und nicht `⚠️ Unvollständig` → 4, sonst 5.'));
  ```
  - die Assertion `assert.ok(script.includes('⛔ Noch nicht bereit'));` durch `assert.ok(script.includes('⚠️ Unvollständig'));`
  - die Assertion ``assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 4 lief'));`` durch:
  ```js
    assert.ok(body.includes('`--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief'));
  ```
  - `assert.ok(wordCount(body) < 450,` durch `assert.ok(wordCount(body) < 550,` und den Testnamen `planOrchestrator_Body_StaysUnder450WordsWithPairedQuotes` durch `planOrchestrator_Body_StaysUnder550WordsWithPairedQuotes`
  Am Ende der Datei anhängen:
  ```js

  test('planOrchestrator_Body_RunsUpToTwoFollowupRoundsAndStopsOnAbortOrWarning', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"`.'));
    assert.ok(body.includes('Endet sie mit `FOLLOWUP ja`, nicht mit Abbruch oder `⚠️`: Runde 2 mit `<P> alle --bericht "<BF2>"`, Spec-Prüfung. Nie eine dritte.'));
    assert.ok(body.includes('`<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`'));
    assert.ok(body.includes('| „Dritte Followup-Runde.“ | Höchstens zwei. |'));
    assert.ok(!body.includes('Zweiter Followup'));
  });

  test('planOrchestrator_Body_TwoFollowupRoundsStillNeverCommit', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const rounds = body.slice(body.indexOf('Followup-Runden, höchstens zwei.'), body.indexOf('Nie eine dritte.'));
    assert.ok(rounds.length > 0, 'Abschnitt der Followup-Runden fehlt');
    assert.equal(/ommit/.test(rounds), false, 'die Followup-Runden nennen keinen Commit');
    assert.ok(body.includes('5. Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.'));
    assert.ok(body.includes('ich committe.') && body.includes('| Nie; der Bericht nennt den Stand. |'));
    for (const forbidden of ['git add', 'git commit']) assert.ok(!body.includes(forbidden), `${forbidden} darf nicht im Skill stehen`);
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
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/plan-orchestrator.test.js"` — erwartet: FAIL `planOrchestrator_Body_RunsUpToTwoFollowupRoundsAndStopsOnAbortOrWarning`, FAIL `planOrchestrator_Body_TwoFollowupRoundsStillNeverCommit`, FAIL `planOrchestrator_Body_WritesChainEntryBeforeTheReportOnlyWhenThePlanStands`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/plan-orchestrator/SKILL.md` diese Textstellen ersetzen (jede steht genau einmal):
  1. In Schritt 1 `` `<BF>` = `bericht-followup.json` `` durch `` `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json` ``.
  2. Die Schritte 3 und 4 (die zwei Zeilen ab ``3. `dv-forge:plan-review` mit …`` bis `… genau einmal. Spec-Prüfung.`) durch:
  ````markdown
  3. `dv-forge:plan-review` mit `<P> <S> --bericht "<BR>"`. Spec-Prüfung. Schlusszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · …`: `FOLLOWUP ja` und nicht `⚠️ Unvollständig` → 4, sonst 5.
  4. Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<P> alle --bericht "<BF1>"`. Spec-Prüfung. Endet sie mit `FOLLOWUP ja`, nicht mit Abbruch oder `⚠️`: Runde 2 mit `<P> alle --bericht "<BF2>"`, Spec-Prüfung. Nie eine dritte.
  ````
  3. In Schritt 5 die Unterschritte 3 bis 5 (ab ``   3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan …`` bis `   5. Den Text nach …`) durch diese vier Unterschritte ersetzen; der Rest der letzten Zeile (` Ein Hook verlangt die Überschriften wörtlich.`) bleibt:
  ````markdown
     3. Steht `<P>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage plan --plan "<P>" --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
     4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art plan --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --stand "<Stand>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
     5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     6. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.
  ````
  4. Die Tabellenzeile `| „Zweiter Followup.“ | Genau einmal. |` durch `| „Dritte Followup-Runde.“ | Höchstens zwei. |`.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/plan-orchestrator.test.js"` — erwartet: PASS, auch `planOrchestrator_Body_NeverCommitsAndKeepsCheckoutRules` (der Body hat danach rund 506 Wörter, unter der neuen Grenze 550)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/plan-orchestrator/SKILL.md plugins/forge/tests/plan-orchestrator.test.js` · `git commit -m "feat(forge): plan-orchestrator runs up to two followup rounds and writes the chain entry"`

---

### Task 13: spec-review-orchestrator: Followup-Runden und Ketten-Eintrag

**ACs:** AC-24, AC-25, AC-26, AC-27, AC-33

**Dateien:**
- Modify: `plugins/forge/skills/spec-review-orchestrator/SKILL.md:20-43` · `## Ablauf`
- Test: `plugins/forge/tests/spec-review-orchestrator.test.js` · `specReviewOrchestrator_Body_ChainsEmbeddedReviewThenOneFollowup`

**Interfaces:**
- Consumes: CLI `node chain.js write --stage spec --spec <S> [--wi <nr>]` (Task 2); `orchestrator-report.js` mit zweimal `--followup` (Task 10).
- Produces: —

- [ ] **Schritt 1: Tests anpassen und schreiben**
  In `plugins/forge/tests/spec-review-orchestrator.test.js` diese Textstellen ersetzen:
  - in der Liste `steps` des Tests `specReviewOrchestrator_Body_ChainsEmbeddedReviewThenOneFollowup` den Eintrag `` '`dv-forge:review-followup` mit `<S> alle --bericht "<BF>"`, genau einmal' `` durch `` '`dv-forge:review-followup` mit `<S> alle --bericht "<BF1>"`' ``
  - die Assertion ``assert.ok(body.includes('`FOLLOWUP ja`, auch für Hinweise → 4, sonst 5.'));`` durch:
  ```js
    assert.ok(body.includes('`FOLLOWUP ja`, auch für Hinweise, `⛔` und `❓` → 4, sonst 5.'));
  ```
  - die Assertion ``assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 4 lief, `--wi <WI>` nur wenn gegeben'));`` durch:
  ```js
    assert.ok(body.includes('`--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben'));
  ```
  - `assert.ok(wordCount(body) < 550,` durch `assert.ok(wordCount(body) < 650,` und den Testnamen `specReviewOrchestrator_Body_StaysUnder550WordsWithPairedQuotes` durch `specReviewOrchestrator_Body_StaysUnder650WordsWithPairedQuotes`
  Am Ende der Datei anhängen:
  ```js

  test('specReviewOrchestrator_Body_RunsUpToTwoFollowupRoundsAndCommitsOnlyAfterTheLastOne', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<S> alle --bericht "<BF1>"`. Abbruch oder `⚠️` → kein Commit, 6.'));
    assert.ok(body.includes('Endet sie mit `FOLLOWUP ja`: Runde 2 mit `<S> alle --bericht "<BF2>"`, gleiche Prüfung. Nie eine dritte.'));
    assert.ok(body.indexOf('Nie eine dritte.') < body.indexOf('5. Commit, auch bei `⛔` oder `❓`.'));
    assert.ok(body.includes('`<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`'));
    assert.ok(body.includes('| „Dritte Followup-Runde.“ | Höchstens zwei. |'));
    assert.ok(!body.includes('Zweiter Followup'));
  });

  test('specReviewOrchestrator_Body_WritesChainEntryOfStageSpecBeforeTheReportAlsoAfterAStop', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`');
    const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.');
    const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art spec');
    assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
    assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
    assert.ok(body.includes('Steht `<S>` fest (Datei existiert):'));
    assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben.'));
    assert.ok(body.includes('6. Abschlussbericht, letzte Handlung:'));
    assert.ok(body.includes('Stopp = Grund nennen, fragen, Schritt 6.'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/spec-review-orchestrator.test.js"` — erwartet: FAIL `specReviewOrchestrator_Body_RunsUpToTwoFollowupRoundsAndCommitsOnlyAfterTheLastOne`, FAIL `specReviewOrchestrator_Body_WritesChainEntryOfStageSpecBeforeTheReportAlsoAfterAStop`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/spec-review-orchestrator/SKILL.md` diese Textstellen ersetzen (jede steht genau einmal):
  1. In Schritt 1 `` `<BF>` = `bericht-followup.json` `` durch `` `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json` ``.
  2. Die Zeile ``   - `FOLLOWUP ja`, auch für Hinweise → 4, sonst 5.`` und die darauffolgende Zeile 4 (``4. `dv-forge:review-followup` mit … Abbruch oder `⚠️` → kein Commit, 6.``) durch:
  ````markdown
     - `FOLLOWUP ja`, auch für Hinweise, `⛔` und `❓` → 4, sonst 5.
  4. Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<S> alle --bericht "<BF1>"`. Abbruch oder `⚠️` → kein Commit, 6. Endet sie mit `FOLLOWUP ja`: Runde 2 mit `<S> alle --bericht "<BF2>"`, gleiche Prüfung. Nie eine dritte.
  ````
  3. In Schritt 6 die Unterschritte 3 bis 5 (ab ``   3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec …`` bis `   5. Den Text nach …`) durch diese vier Unterschritte ersetzen; der Rest der letzten Zeile (` Ein Hook verlangt die Überschriften wörtlich.`) bleibt:
  ````markdown
     3. Steht `<S>` fest (Datei existiert): `node "<PLUGIN>/scripts/chain.js" write --stage spec --spec "<S>"`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
     4. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --spec "<S>" --commit "<Commit>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
     5. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     6. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.
  ````
  4. Die Tabellenzeile `| „Zweiter Followup.“ | Genau einmal. |` durch `| „Dritte Followup-Runde.“ | Höchstens zwei. |`.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/spec-review-orchestrator.test.js"` — erwartet: PASS (der Body hat danach rund 617 Wörter, unter der neuen Grenze 650)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/spec-review-orchestrator/SKILL.md plugins/forge/tests/spec-review-orchestrator.test.js` · `git commit -m "feat(forge): spec-review-orchestrator runs up to two followup rounds and writes the chain entry"`

---

### Task 14: implementation-orchestrator: Followup-Runden vor Build/Test/Lint und Ketten-Eintrag

**ACs:** AC-22, AC-24, AC-25, AC-26, AC-27, AC-29, AC-30

**Dateien:**
- Modify: `plugins/forge/skills/implementation-orchestrator/SKILL.md:18-45` · `## Regeln`
- Test: `plugins/forge/tests/implementation-orchestrator.test.js` · `implementationOrchestrator_Body_ChainsTheFourSkillsInOrder`

**Interfaces:**
- Consumes: CLI `node chain.js write --stage implementation --plan <P> --spec <S> --worktree <R> --branch <b> [--wi <nr>]` (Task 2); `orchestrator-report.js` mit zweimal `--followup` (Task 10); die Zeile `BEHALTEN` und `FOLLOWUP ja` des Implementation-Followups (Task 9) steuern, ob Runde 2 sinnvoll ist.
- Produces: —

- [ ] **Schritt 1: Tests anpassen und schreiben**
  In `plugins/forge/tests/implementation-orchestrator.test.js` diese Textstellen ersetzen:
  - in der Liste `steps` des Tests `implementationOrchestrator_Body_ChainsTheFourSkillsInOrder` den Eintrag `` '`dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF>"`, genau einmal', `` durch `` '`dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"`', ``
  - `assert.equal(body.match(/Hash-Prüfung\./g).length, 3);` durch `assert.equal(body.match(/Hash-Prüfung\./g).length, 4);`
  - `for (const marker of ['✅ Bereit zum Abschließen', '⛔ Noch nicht bereit']) {` durch `for (const marker of ['✅ Bereit zum Abschließen', '⚠️ Unvollständig']) {`
  - die Assertion ``assert.ok(body.includes('`⛔ Noch nicht bereit` UND `FOLLOWUP ja` → 5.'));`` durch:
  ```js
    assert.ok(body.includes('`FOLLOWUP ja` → 5.'));
  ```
  - die Assertion ``assert.ok(body.includes('Schlusszeile `Review abgeschlossen: ✅ …` → 6; sonst Ende.'));`` durch:
  ```js
    assert.ok(body.includes('Nach der letzten Runde: Schlusszeile `Review abgeschlossen: ✅ …` → 6; sonst Ende.'));
  ```
  - die Assertion ``assert.ok(body.includes('`--followup "<BF>"` nur wenn Schritt 5 lief'));`` durch:
  ```js
    assert.ok(body.includes('`--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief'));
  ```
  - `` assert.ok(wordCount(body) < 575,`${wordCount(body)} Wörter`); `` durch `` assert.ok(wordCount(body) < 700, `${wordCount(body)} Wörter`); `` und den Testnamen `implementationOrchestrator_Body_StaysUnder575WordsWithPairedQuotes` durch `implementationOrchestrator_Body_StaysUnder700WordsWithPairedQuotes`
  Am Ende der Datei anhängen:
  ```js

  test('implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTwo', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const warning = body.indexOf('- `⚠️ Unvollständig` → Ende.');
    const followup = body.indexOf('- `FOLLOWUP ja` → 5.');
    const ready = body.indexOf('- `✅ Bereit zum Abschließen` → 6.');
    assert.ok(warning > -1 && warning < followup && followup < ready, 'Reihenfolge ⚠️, FOLLOWUP ja, ✅');
    assert.ok(body.includes('Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"`. Hash-Prüfung.'));
    assert.ok(body.includes('Schlusszeile `⚠️` oder Abbruch → Ende. `FOLLOWUP ja` → Runde 2 mit `<BF2>`, Hash-Prüfung. Nie eine dritte.'));
    assert.ok(body.indexOf('Nie eine dritte.') < body.indexOf('6. Frischer Sub-Agent in `<R>` belegt'), 'Build, Test und Lint erst nach den Runden');
    assert.ok(body.includes('`<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json`'));
    assert.ok(body.includes('| „Dritte Followup-Runde.“ | Höchstens zwei. |'));
    assert.ok(!body.includes('Zweiter Followup') && !body.includes('zweiter Followup'));
  });

  test('implementationOrchestrator_Body_WritesChainEntryWithWorktreeAndBranchBeforeTheReportWhenStartWorkRan', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    const chain = body.indexOf('`node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`');
    const failure = body.indexOf('Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.');
    const report = body.indexOf('`node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation');
    assert.ok(chain > -1 && chain < report, 'chain.js write muss vor orchestrator-report.js stehen');
    assert.ok(failure > chain && failure < report, 'die Fehlerregel steht zwischen chain.js write und dem Bericht');
    assert.ok(body.includes('Lief Schritt 2 (`<R>` und Branch stehen fest):'));
    assert.ok(body.includes('dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen.'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-orchestrator.test.js"` — erwartet: FAIL `implementationOrchestrator_Body_StartsFollowupRoundsOnFollowupJaBeforeBuildTestLintAndCapsAtTwo`, FAIL `implementationOrchestrator_Body_WritesChainEntryWithWorktreeAndBranchBeforeTheReportWhenStartWorkRan`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/implementation-orchestrator/SKILL.md` diese Textstellen ersetzen (jede steht genau einmal):
  1. In Regel 6 `` `<BF>` = `bericht-followup.json` `` durch `` `<BF1>` = `bericht-followup-1.json`, `<BF2>` = `bericht-followup-2.json` ``.
  2. In Regel 7 ``(Push, `finish-work`, zweiter Followup, Zwischenausgabe)`` durch ``(Push, `finish-work`, dritte Followup-Runde, Zwischenausgabe)``.
  3. In Schritt 4 die Aufzählung und Schritt 5 (die Zeilen ab ``   - `✅ Bereit zum Abschließen`, auch mit Hinweisen → 6.`` bis `5. … → 6; sonst Ende.`) durch:
  ````markdown
     - `⚠️ Unvollständig` → Ende.
     - `FOLLOWUP ja` → 5.
     - `✅ Bereit zum Abschließen` → 6.
     - Sonst Ende.
  5. Followup-Runden, höchstens zwei. Runde 1: `dv-forge:review-followup` mit `<P> alle --spec <S> --bericht "<BF1>"`. Hash-Prüfung. Schlusszeile `⚠️` oder Abbruch → Ende. `FOLLOWUP ja` → Runde 2 mit `<BF2>`, Hash-Prüfung. Nie eine dritte. Nach der letzten Runde: Schlusszeile `Review abgeschlossen: ✅ …` → 6; sonst Ende.
  ````
  4. In Schritt 7 die Unterschritte 2 bis 4 (ab ``   2. `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation …`` bis `   4. Den Text nach …`) durch diese vier Unterschritte ersetzen:
  ````markdown
     2. Lief Schritt 2 (`<R>` und Branch stehen fest): `node "<PLUGIN>/scripts/chain.js" write --stage implementation --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch>`, dazu `--wi <WI>` nur wenn gegeben; Ausgabe nicht zeigen. Sonst nichts schreiben. Endet der Aufruf mit Fehler: Meldung in die Zeile `Abweichungen: …` von `<FK>` aufnehmen, `<FK>` nötigenfalls anlegen; der Bericht folgt trotzdem.
     3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art implementation --review "<BR>" --out "<AB>" --plan "<P>" --spec "<S>" --worktree "<R>" --branch <branch> --pruefung <gruen|rot|keine> --fakten "<FK>"`, dazu `--followup "<BF1>"` und `--followup "<BF2>"` je nur wenn die Runde lief, `--wi <WI>` nur wenn gegeben. `keine`: Schritt 6 lief nicht.
     4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
     5. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach.
  ````
  5. Die Tabellenzeile `| „Zweiter Followup.“ | Genau einmal. |` durch `| „Dritte Followup-Runde.“ | Höchstens zwei. |`.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/implementation-orchestrator.test.js"` — erwartet: PASS (der Body hat danach rund 648 Wörter, unter der neuen Grenze 700)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/implementation-orchestrator/SKILL.md plugins/forge/tests/implementation-orchestrator.test.js` · `git commit -m "feat(forge): implementation-orchestrator runs up to two followup rounds before checks and writes the chain entry"`

---

### Task 15: README von dv-forge

**ACs:** keine (Dokumentation der Änderung)

**Dateien:**
- Modify: `plugins/forge/README.md:7-35` · `## Ablauf`

**Interfaces:** keine.

- [ ] **Schritt 1: Bestehenden Test nennen**
  Der Gesamtlauf `node --test "<R>/plugins/forge/tests/*.test.js"` sichert, dass keine Testdatei das README liest; er läuft nach der Änderung grün.
- [ ] **Schritt 2: README ändern**
  In `plugins/forge/README.md` diese Textstellen ersetzen (jede steht genau einmal):
  1. `` `spec-review-orchestrator` verkettet `spec-review` mit höchstens einem `review-followup` und committet die Spec im aktuellen Branch. `` durch `` `spec-review-orchestrator` verkettet `spec-review` mit bis zu zwei Followup-Runden (`review-followup`) und committet die Spec einmal im aktuellen Branch. ``
  2. `` `plan-orchestrator` verkettet beides samt höchstens einem `review-followup` in einem Lauf; `` durch `` `plan-orchestrator` verkettet beides samt bis zu zwei Followup-Runden in einem Lauf; ``
  3. `` `implementation-review` samt höchstens einem `review-followup` in einem Lauf und endet `` durch `` `implementation-review` samt bis zu zwei Followup-Runden in einem Lauf und endet ``
  4. Den Satz `Alleinstehend aufgerufen zeigen Review und Followup ihre Berichte wie bisher.` durch diesen Satz plus zwei neue Absätze:
  ````markdown
  Alleinstehend aufgerufen zeigen Review und Followup ihre Berichte wie bisher.

  Eine Followup-Runde startet, sobald das Review einen Followup anbietet (`FOLLOWUP ja`), unabhängig von ✅, ⛔ oder ❓; nur ⚠️ und ein Abbruch stoppen. Es gibt höchstens zwei Runden je Lauf. 🟢 arbeitet keine Runde ein; sie stehen nur im Abschlussbericht unter „Was ist noch offen“.

  Jeder Orchestrator vermerkt am Ende einen **Ketten-Eintrag** je Slug (Stufe, Spec, Plan, Workitem, Worktree, Branch) mit `scripts/chain.js`, abgelegt unter `<git-common-dir>/dv-forge/chain/`, gemeinsam für den Haupt-Checkout und alle Worktrees. Ruft der Mensch danach für dasselbe Artefakt `spec-review`, `plan-review`, `implementation-review` oder `review-followup` auf, nennt deren Bericht den Orchestrator-Schritt der nächsten Stufe statt des Einzel-Skills; `finish-work` entfernt den Eintrag. Ohne Eintrag bleiben die Berichte wie bisher.
  ````
  5. `Spec prüfen, einmal nacharbeiten und committen in einem Lauf;` durch `Spec prüfen, bis zu zweimal nacharbeiten und committen in einem Lauf;`
  6. `Plan schreiben, prüfen und einmal nacharbeiten in einem Lauf;` durch `Plan schreiben, prüfen und bis zu zweimal nacharbeiten in einem Lauf;`
  7. `Umsetzen, prüfen und einmal nacharbeiten in einem Lauf;` durch `Umsetzen, prüfen und bis zu zweimal nacharbeiten in einem Lauf;`
- [ ] **Schritt 3: Absicherungstest laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/*.test.js"` — erwartet: PASS, 0 fehlgeschlagen
- [ ] **Schritt 4: Commit**
  `git add plugins/forge/README.md` · `git commit -m "docs(forge): describe followup rounds and the chain entry"`

---

### Task 16: Version von dv-forge anheben

**ACs:** keine (Versionspflege nach der Commit-Historie des Plugins)

**Dateien:**
- Modify: `plugins/forge/.claude-plugin/plugin.json:3` · `"version": "0.25.1"`

**Interfaces:** keine.

- [ ] **Schritt 1: Bestehenden Test nennen**
  Der Gesamtlauf `node --test "<R>/plugins/forge/tests/*.test.js"` bleibt grün; kein Test liest die Version.
- [ ] **Schritt 2: Version ändern**
  In `plugins/forge/.claude-plugin/plugin.json` die Zeile `  "version": "0.25.1",` ersetzen durch:
  ```json
    "version": "0.26.0",
  ```
- [ ] **Schritt 3: Absicherungstest laufen lassen**
  Befehl: `node --test "<R>/plugins/forge/tests/*.test.js"` — erwartet: PASS, 0 fehlgeschlagen
- [ ] **Schritt 4: Commit**
  `git add plugins/forge/.claude-plugin/plugin.json` · `git commit -m "chore(forge): bump dv-forge to 0.26.0"`

## Entscheidungen
- **W · Planungs-Skills** · Aussage — Keine: Das Repo ist ein Node-Plugin; Skills für .NET, Angular oder Craft betreffen keine Datei dieses Plans.
- **E · Speicherort der Einträge** · Planer — `<git-common-dir>/dv-forge/chain/<slug>.json`: ein Ort je Repository, den Haupt-Checkout und alle Worktrees teilen; gleiche Abfrage `git rev-parse --git-common-dir` wie in `forge-config.js` (dort mit `--path-format=absolute`). Anders als `forge-baseline.json` in `work.js`: Das liegt unter `--absolute-git-dir`, also je Worktree, und taugt hier nicht als Vorbild.
- **E · Slug-Regel** · Planer — `spec` nutzt `followup.slugFor(spec, ['spec-review'])` (Elternordner bei `spec.md`), `plan` und `implementation` nutzen `plan-tasks.slugOf(plan)`: dieselben Funktionen wie `prepare.js` für die Reviews. Die Prüfregel `SLUG` importiert `chain.js` aus `followup.js`, statt sie zu kopieren; nur `writeEntry` wirft bei einem Slug außerhalb der Regel, `readEntry` liefert dann `null`.
- **E · Schreiben über `chain.js`** · Planer — Ein eigenes Skript statt Logik in `orchestrator-report.js`: Der Eintrag entsteht auch nach einem Stopp ohne Berichtsargumente (AC-16, AC-17), und die Skills rufen nur Skripte auf; `chain.js` steht deshalb in `ALLOWED_SCRIPTS` des Guards.
- **E · Suche über den Artefakt-Pfad** · Planer — `readEntry` und `lookup` leiten Slug und Git-Ordner aus dem Pfad des Artefakts ab, nicht aus dem Arbeitsverzeichnis; so gilt AC-10 im Haupt-Checkout und in jedem Worktree.
- **E · Entfernen über den Worktree-Pfad** · Planer — `finish-work` kennt den Slug nicht; `chain.js remove --worktree <R>` entfernt Einträge der Stufe `implementation` mit diesem Worktree-Pfad (vor Ort der Repo-Wurzel, sonst der entfernte Worktree).
- **E · Wortlaut der Schritte im Orchestrator-Bericht** · Planer — AC-40 und AC-41 zitieren „selbst beheben bzw. Dokument anpassen, dann erneut prüfen“; der Plan nutzt dafür die bestehenden Texte `Das Dokument selbst anpassen, dann erneut prüfen:` und `Selbst beheben, dann erneut prüfen:` sowie `Bei Bedarf … selbst … (optional).` mit dem Review-Befehl, ohne Anzahl und ohne Hinweis auf Lösungsvorschläge.
- **E · 🟢 allein im Offen-Abschnitt** · Planer — Gibt es nur 🟢, steht dort die 🟢-Liste statt „Nichts weiter offen.“; Ergebnis-Zeile und Schritte bleiben unverändert (AC-35).
- **E · 🟢 gegen offene Stellen** · Planer — „Höhere Farbe gewinnt“ ist umgesetzt als: Ein 🟢 entfällt, sobald dieselbe Stelle im Endstand als 🔴 oder 🟡 offen steht; je Stelle bleibt höchstens ein 🟢 (AC-36, AC-37).
- **E · Gruppenurteil des Re-Reviewers** · Planer — Der Re-Reviewer schreibt bei gruppierten Findings eine Urteilszeile je Gruppe mit der Stelle als Titel; das Skript ordnet über `placeKey` zu. Ohne Zeile zur Gruppe zählt das Gesamturteil „alle behoben, keine neuen 🔴“. So unterscheidet das Skript „alle gewählten bestätigt, neues 🔴“ (AC-42) von „eine Gruppe nicht bestätigt“ (AC-31), ohne die Findings einer Gruppe aus Freitext zu erraten.
- **E · `BEHALTEN`-Zeile** · Planer — `implementation-report.js followup` druckt als fünfte Zeile `BEHALTEN <nummern|keine|unveraendert>`; `flow.md` leitet daraus `followup.js keep` bzw. `drop` ab, statt dass der Skill das Urteil selbst deutet (AC-31, AC-32).
- **E · Implementation-Followup ohne Nach-Review** · Planer — Bei `blockiert` und `keine Änderung` meldet er `FOLLOWUP nein` und lässt die Sicherung unverändert: ein Abbruch startet keine zweite Runde (AC-27).
- **E · Wortgrenzen der Orchestrator-Skills** · Planer — Die Tests begrenzen den Body auf 450, 550 und 575 Wörter; die neuen Schritte samt Bedingung und Fehlerregel für `chain.js write` brauchen rund 506, 617 und 648 Wörter (Plan-, Spec-Review-, Implementation-Orchestrator). Die Grenzen steigen auf 550, 650 und 700, die Skills bleiben kurz.
- **E · Versionssprung** · Planer — Minor-Version 0.26.0 als eigener Commit, wie in der Historie des Plugins (Feature-Commit, danach `chore(forge): bump dv-forge …`).
- **R1 · AC-12** — geändert — Task 3 legt in `chain-reports.test.js` die Testhilfen `planRun()` und `planReport(run)` an (sauberes Plan-Review über `review-flow.js report --review plan-review`) und den Test `planReviewReport_EntryOfStageSpec_EqualsReportWithoutEntry`: Mit einem Eintrag der Stufe `spec` gleicht der Plan-Review-Bericht dem ohne Eintrag und nennt `/dv-forge:implementation <P>`. Damit ist auch `CHAIN_STAGE['plan-review']` in `chainOf` belegt.
- **R1 · AC-15** — geändert — Task 3 ergänzt `planReviewReport_SpecEntryThenPlanEntry_NamesImplementationOrchestratorWithSpecAndWorkitem`: Eintrag `spec`, danach Eintrag `plan` zum selben Slug, dann ein echter Plan-Review-Bericht; erwartet `/dv-forge:implementation-orchestrator <P> <S> 2` und kein `/dv-forge:implementation <P>`. Der Test steht in der Rot-Liste von Schritt 2.
- **R1 · AC-34** — geändert — Task 12 nennt den bestehenden Test `planOrchestrator_Body_NeverCommitsAndKeepsCheckoutRules` unter „Dateien“ und ergänzt `planOrchestrator_Body_TwoFollowupRoundsStillNeverCommit` (kein Commit im Abschnitt der Followup-Runden, Regel 5 und die Rote-Flaggen-Zeile bleiben, kein `git add`/`git commit`). Task 2 belegt mit `chainCli_Write_CreatesNoCommitAndLeavesWorkingTreeClean`, dass der neue Schritt `chain.js write` weder committet noch den Arbeitsbaum ändert; Task 2 nennt dafür AC-34.
- **R1 · AC-37** — geändert — Task 7 ergänzt drei Tests in `review-flow-report.test.js`: 🟢 nur aus der Nachprüfung (`data.two`) steht genau einmal in `green`, dieselbe 🟢-Stelle aus Runde 1 und Nachprüfung steht einmal, und ein 🟢 aus dem Plan-Review steht in `green`. Die Spec-Fälle prüfen zusätzlich, dass die Followup-Sicherung (`abschluss/aggregate.md`) die 🟢 nicht enthält, also keine Followup-Runde sie einarbeitet; Nach-Review (Task 9) und Zusammenführung (Task 10) waren schon belegt.
- **R1 · Entscheidungen** — geändert — „E · Speicherort der Einträge“ verweist jetzt auf die `--git-common-dir`-Abfrage in `forge-config.js` und warnt ausdrücklich, dass `forge-baseline.json` in `work.js` unter `--absolute-git-dir` je Worktree liegt und kein Vorbild ist; die Begründung passt damit zum Code-Block von Task 1.
- **R1 · Task 1** — geändert — `readEntry` bildet den Slug ohne Wurf (`rawSlug`) und liefert bei einem Slug außerhalb der Regel `null`; nur `writeEntry` wirft über `checkedSlug`. Die Regel `SLUG` wird aus `followup.js` exportiert und in `chain.js` importiert, die Kopie entfällt (neue Modify-Zeile `followup.js` · `module.exports`). Neue Tests: `readEntry_ArtifactWithSlugOutsideRule_ReturnsNullWhileWriteEntryThrows` (Task 1, jetzt 12 Tests) und `chainCli_LookupArtifactWithSlugOutsideRule_PrintsNoEntryWithExitZero` (Task 2, nennt dafür AC-09). Die `--git-common-dir`-Abfrage in `storeDir` bleibt eigenständig.
- **R1 · Task 13** — geändert — Festlegung: In allen drei Orchestrator-Skills (Tasks 12, 13, 14) ist `chain.js write` an das feststehende Artefakt gebunden (`Steht <S> fest (Datei existiert):` bzw. `<P>`, `Lief Schritt 2`, je mit `Sonst nichts schreiben.`) und endet mit dem gleichen Satz `Endet der Aufruf mit Fehler: Meldung in die Zeile Abweichungen: … von <FK> aufnehmen, <FK> nötigenfalls anlegen; der Bericht folgt trotzdem.` Die Tests prüfen Bedingung und Satz zwischen `chain.js write` und dem Berichtsaufruf; die Wortgrenzen steigen auf 550, 650 und 700 (siehe „E · Wortgrenzen der Orchestrator-Skills“).
- **F · Task 11** — geändert — Vorschlag 1: Unter dem Aufgabenkopf steht jetzt die Begründung, warum der Task ungeteilt bleibt: beide Änderungen treffen denselben Renderer `renderOrchestratorReport`, `orchestrator-report.test.js` prüft beide Verhalten in denselben Fixtures, der Dateiaustausch ist nur als Ganzes konsistent. Sonst keine Änderung.
- **F · Task 3** — geändert — Vorschlag 1: Vom Ketten-Eintrag nutzt der Befehl des Plan-Reviews nur noch `chain.wi`; die Spec kommt aus `input.spec` (Berichtsoption `options.spec`, wie bei „Die Spec prüfen:“), ersatzweise `chain.spec` (`${input.spec ?? chain.spec}`). Neuer Test `renderReportText_PlanEntryWithOtherSpecThanReportOption_CommandNamesSpecOfReportOption` in `report-text.test.js`. Die `buildInput`-Anweisung fügt `CHAIN_STAGE` und `chainOf` vor `function buildInput` ein und ergänzt nur `chain: chainOf(options),` nach `spec: options.spec,`.
- **F · Task 4** — geändert — Vorschlag 1: `report-text.js` bekommt und exportiert `worktreeLine`, `finishStepFor` und `pushLine` (neue Modify-Zeilen, `report-text.js` im Commit, `report-text.test.js` und `orchestrator-report.test.js` im Grün-Lauf). `implementation-report-text.js` (Task 4) und `orchestrator-report-text.js` (`implementationSteps`, `nextLines` in Task 11, Consumes nachgezogen) bilden die drei Zeilen nur über diese Funktionen; die vorhandenen Tests beider Berichte bleiben unverändert und belegen den gleichen Wortlaut.
- **F · Task 9** — geändert — Vorschlag 1: Der Agent-Text nennt die Überschrift jetzt als `### <n> · <Farbe> <Stelle> (<Gutachter>)` und verlangt die Stelle ohne die Klammer mit den Gutachtern als Titel; `implementation-re-reviewer_Body_JudgesGroupsByPlaceWhenFindingsAreGrouped` prüft das samt `ohne die Klammer`. `isConfirmed` sucht zusätzlich unter `placeKey` der Überschrift `<Stelle> (<Gutachter>)` aus `prepare.js` Zeile 352; neuer Test `parseAnswer_TitleWithReviewerBracket_JudgesTheGroup`.
- **R2 · Global Constraints** — geändert — Die Vorgabe „Spec-, Plan- oder (bei `implementation`) Worktree-Pfad“ und der W-Eintrag „Ungültiger Eintrag“ verlangen bei `implementation` alle drei Pfade; Task 1 setzt `EXISTING.implementation` auf `['plan', 'spec', 'worktree']` und belegt das mit `readEntry_ImplementationEntryWhoseSpecWasDeleted_ReturnsNull` und `readEntry_ImplementationEntryWhosePlanWasDeleted_ReturnsNull` (Plan im Worktree gelöscht, Worktree besteht). AC-13 ganz geprüft: Spec-Stufe war belegt; neu sind `planReviewReport_PlanEntryWhoseSpecWasDeleted_EqualsReportWithoutEntry` (Task 3) und `implementationReport_EntryWhoseSpecWasDeleted_EqualsReportWithoutEntry` (Task 4, nennt dafür AC-13). Falsche Treffer entstehen nicht, weil der Implementation-Orchestrator Plan und Spec aus dem bestehenden Worktree übergibt.
- **R2 · Task 1** — geändert — (a) `addWorktree(repo, branch)` und `repoWithPlan()` liegen jetzt einmal in `tests/lib/git-repo.js` (Task 1); chain.test.js, chain-cli.test.js (Task 2, ersetzt das Inline-`git worktree add`) und chain-reports.test.js (Task 4) importieren sie; die lokalen `posix`-Funktionen sind durch `toPosix(path.resolve(…))` ersetzt. (b) Neue `normalizePath(value)` in `lib/posix.js` mit `posix.test.js`; `sameDir` in `lib/chain.js` und `normalize` im Guard (als Import-Alias, Aufrufe unverändert, `canonicalPath` bleibt) nutzen sie; Task 1 lässt dafür `guard-orchestrator.test.js` mitlaufen, Task 2 nennt die verschobene Zeile `ALLOWED_SCRIPTS` (17-18). (c) Festlegung: `lib/chain.js`, `chain.test.js` und die `SLUG`-Ausfuhr liegen als nicht committeter Stand im Arbeitsverzeichnis (nicht im Git-Index); Task 1 führt beide Dateien als Modify mit Anker und ersetzt ihren Inhalt vollständig (fehlt eine, wird sie angelegt), weil der vorhandene Stand bei `implementation` nur den Worktree prüft und in `chain.test.js` einen kaputten regulären Ausdruck hat; die `followup.js`-Ersetzung entfällt, wenn `SLUG,` schon dasteht. Der Rot-Lauf erwartet die zwei neuen Implementation-Tests und `normalizePath` als FAIL, `chain.test.js` hat 14 Tests.
