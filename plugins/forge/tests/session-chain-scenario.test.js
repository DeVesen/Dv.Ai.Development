'use strict';

// Szenario-Tests der Session-Kette nur über die CLI session-chain.js in einem Git-Fixture-Repo. Die Etappen-Sessions werden
// simuliert: Spec und Plan schreiben und committen, Bericht per etappe-report, dann final.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { git, commitFile, makeRepo, addWorktree } = require('./lib/git-repo');
const { VALID_SPEC } = require('./lib/spec-fixtures');
const { ETAPPEN, readState, readEvents } = require('../scripts/lib/session-chain-store');
const { storeFiles } = require('../scripts/lib/session-chain-ablage');
const { ETAPPEN_BRIEFS } = require('../scripts/lib/session-chain-brief');
const { EXPECTED } = require('../scripts/lib/session-chain-check');
const { NEXT } = require('../scripts/lib/session-chain-decide');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-chain.js');
const PLAN_TEXT = '# Plan\n\n### Task 1: Eins\n';
const SPEC_READY = '✅ Bereit zum Planen';
const PLAN_READY = '✅ Bereit zur Umsetzung';

// `brief` braucht die Kennung der Leit-Session; die Szenarien geben immer dieselbe mit.
function chain(cwd, ...args) {
  const full = args[0] === 'brief' ? [...args, '--leit', 'local_leit-1'] : args;
  return spawnSync(process.execPath, [SCRIPT, ...full], { cwd, encoding: 'utf8' });
}

function scratch(name, text) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-scn-')), name);
  fs.writeFileSync(file, text);
  return file;
}

function succeeded(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  return result.stdout;
}

function field(output, name) {
  return new RegExp(`^${name}=(.*)$`, 'm').exec(output)?.[1];
}

// Repo mit Spec und Plan im Ordner docs/forge/x (Slug x); noch nichts committet.
function newChain() {
  const repo = makeRepo();
  return { repo, spec: path.join(repo, 'docs/forge/x/spec.md'), plan: path.join(repo, 'docs/forge/x/plan.md'), session: 0 };
}

function nextSession(env, etappe) {
  env.session += 1;
  return `local_${etappe}_${env.session}`;
}

function reportFile(result) {
  return scratch('abschluss.md', result ? `# Abschlussbericht\n**Ergebnis:** ${result}\n` : '# Abschlussbericht\nFertig.\n');
}

// Berichtsdatei der Etappe über etappe-report; `target` ist `--slug x` oder `--spec <spec>`. Rückgabe: Pfad von bericht.md.
function writeReport(env, etappe, { result, target = ['--slug', 'x'], extra = [] }) {
  const bericht = result === undefined ? [] : ['--inhalt', reportFile(result)];
  return /^BERICHT=(.+)$/m.exec(succeeded(chain(env.repo, 'etappe-report', '--etappe', etappe, ...target, ...bericht, ...extra)))[1];
}

function runFinal(env, etappe, bericht, commit, extra = []) {
  const result = chain(env.repo, 'final', '--etappe', etappe, '--session', nextSession(env, etappe), '--etappenbericht', bericht, '--commit', commit, ...extra);
  return { result, out: result.stdout, weiter: field(result.stdout, 'WEITER'), halt: field(result.stdout, 'HALTEPUNKT') };
}

// Eine Etappe von `brief` bis `final`. `effect` simuliert die Arbeit der Etappen-Session und liefert { commit, ... };
// `reportExtra(effect)` liefert die Optionen von etappe-report.
function runEtappe(env, etappe, { briefArgs = [], effect = () => ({}), result, reportExtra = () => [] }) {
  succeeded(chain(env.repo, 'brief', '--etappe', etappe, '--slug', 'x', ...briefArgs));
  assert.equal(readState(env.repo, 'x').gestartet.etappe, etappe, `${etappe}: gestartet nach brief`);
  const done = effect();
  const bericht = writeReport(env, etappe, { result, extra: reportExtra(done) });
  const final = runFinal(env, etappe, bericht, done.commit ?? 'none');
  succeeded(final.result);
  assert.equal(readState(env.repo, 'x').gestartet, null, `${etappe}: gestartet nach final`);
  return { ...final, bericht, ...done };
}

function appendToSpec(env, line, message) {
  return commitFile(env.repo, 'docs/forge/x/spec.md', `${fs.readFileSync(env.spec, 'utf8')}${line}\n`, message);
}

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

function runGrill(env) {
  return runEtappe(env, 'grill', { effect: () => ({ commit: appendToSpec(env, '', 'docs: grill spec x') }) });
}

function runSpecReview(env, extra = {}) {
  return runEtappe(env, 'spec-review', { effect: () => ({ commit: appendToSpec(env, '', 'docs: review spec x') }), result: SPEC_READY, ...extra });
}

function reachSpecHalt(env) {
  runWhiteboarding(env);
  runGrill(env);
  return runSpecReview(env);
}

function runPlanning(env, extra = {}) {
  return runEtappe(env, 'planning', {
    effect: () => {
      fs.mkdirSync(path.dirname(env.plan), { recursive: true });
      fs.writeFileSync(env.plan, PLAN_TEXT);
      return {};
    },
    result: PLAN_READY,
    ...extra,
    reportExtra: () => ['--plan', env.plan, ...(extra.reportExtra?.() ?? [])],
  });
}

function reachGoHalt(env) {
  reachSpecHalt(env);
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'planning'));
  return runPlanning(env);
}

function checkFile(ergebnis) {
  return scratch('pruefung.json', JSON.stringify({ ergebnis }));
}

// Umsetzung in einem Worktree auf feature/x mit einem Commit; `check` ist das Prüfergebnis im Bericht.
function runImplementation(env, check) {
  return runEtappe(env, 'umsetzung', {
    effect: () => {
      const worktree = addWorktree(env.repo, 'feature/x');
      return { worktree, commit: commitFile(worktree, 'src/a.js', 'a\n', 'feat: a') };
    },
    result: '✅ Umgesetzt',
    reportExtra: ({ worktree }) => ['--worktree', worktree, '--branch', 'feature/x', '--pruefung-datei', checkFile(check)],
  });
}

function reachImplementation(env, check = 'gruen') {
  reachGoHalt(env);
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'go'));
  succeeded(chain(env.repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x'));
  return runImplementation(env, check);
}

function eventKinds(env) {
  return readEvents(env.repo, 'x').map((event) => (['start', 'final'].includes(event.typ) ? `${event.typ}:${event.etappe}` : event.typ));
}

test('chain_GoldenPathFromEntryToEnd_EventsAndStateFollowTheSteps', () => {
  // Arrange
  const env = newChain();
  const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-scn-remote-'));
  git(remote, 'init', '--quiet', '--bare');
  git(env.repo, 'remote', 'add', 'origin', remote);

  // Act
  const whiteboarding = runWhiteboarding(env);
  const afterWhiteboarding = readState(env.repo, 'x');
  const grill = runGrill(env);
  const review = runSpecReview(env);
  const specAnswer = succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'planning'));
  const planning = runPlanning(env);
  const goAnswer = succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'go'));
  const goCommit = succeeded(chain(env.repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x'));
  const implementation = runImplementation(env, 'gruen');
  git(env.repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
  git(env.repo, 'worktree', 'remove', implementation.worktree);
  const finish = runEtappe(env, 'abschluss', { reportExtra: () => ['--branch', 'feature/x'] });

  // Assert
  assert.deepEqual([whiteboarding.weiter, whiteboarding.halt], ['grill', 'keiner']);
  assert.deepEqual([afterWhiteboarding.naechste, afterWhiteboarding.basis, afterWhiteboarding.gestartet], ['grill', 'main', null]);
  assert.equal(grill.weiter, 'spec-review');
  assert.deepEqual([review.weiter, review.halt], ['halt', 'spec']);
  assert.ok(review.out.includes('=== AUSGABE ===\n# Spec-Haltepunkt'));
  assert.equal(specAnswer.trim(), 'FREIGABE=spec planning');
  assert.deepEqual([planning.weiter, planning.halt], ['halt', 'go']);
  assert.equal(goAnswer.trim(), 'FREIGABE=go go');
  assert.match(goCommit, /^COMMIT=\S+ docs\/forge\/x\/plan\.md$/m);
  assert.deepEqual([implementation.weiter, implementation.halt], ['abschluss', 'keiner']);
  assert.deepEqual([finish.weiter, finish.halt], ['ende', 'keiner']);
  assert.ok(finish.out.includes('# Schlussbericht der Session-Kette x'));
  assert.deepEqual(eventKinds(env), ['final:whiteboarding', 'commit', 'start:grill', 'final:grill', 'start:spec-review', 'final:spec-review', 'antwort', 'start:planning', 'final:planning',
    'antwort', 'commit', 'start:umsetzung', 'final:umsetzung', 'start:abschluss', 'final:abschluss']);
  const state = readState(env.repo, 'x');
  assert.deepEqual(state.etappen.map((entry) => entry.etappe), ['whiteboarding', 'grill', 'spec-review', 'planning', 'umsetzung', 'abschluss']);
  assert.deepEqual([state.naechste, state.gestartet, state.halt], [null, null, null]);
});

test('chain_EachFinal_NaechsteNamesTheEtappeThatMayStartNext', () => {
  // Arrange
  const env = newChain();
  const seen = [];

  // Act
  for (const step of [runWhiteboarding, runGrill, runSpecReview]) seen.push([step(env).weiter, readState(env.repo, 'x').naechste]);

  // Assert
  assert.deepEqual(seen, [['grill', 'grill'], ['spec-review', 'spec-review'], ['halt', null]]);
});

test('chain_SpecNacharbeitLoopAtSpecHalt_BackToSpecReview', () => {
  // Arrange
  const env = newChain();
  const review = reachSpecHalt(env);

  // Act
  const answer = succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'spec-nacharbeit'));
  const refused = chain(env.repo, 'brief', '--etappe', 'planning', '--slug', 'x');
  const rework = runEtappe(env, 'spec-nacharbeit', {
    briefArgs: ['--quelle', review.bericht],
    effect: () => ({ commit: appendToSpec(env, '', 'docs: nacharbeit spec x') }),
  });

  // Assert
  assert.equal(answer.trim(), 'FREIGABE=spec spec-nacharbeit');
  assert.equal(refused.status, 1);
  assert.equal(refused.stderr.trim(), 'Als Nächstes startet spec-nacharbeit, nicht planning');
  assert.deepEqual([rework.weiter, rework.halt], ['spec-review', 'keiner']);
  assert.equal(readState(env.repo, 'x').naechste, 'spec-review');
});

test('chain_BriefOfGrillAndSpecNacharbeit_CopiesTheSpecIntoTheChainDirAndRecordsIt', () => {
  // Arrange
  const env = newChain();
  const review = reachSpecHalt(env);
  const before = fs.readFileSync(env.spec, 'utf8');

  // Act
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'spec-nacharbeit'));
  succeeded(chain(env.repo, 'brief', '--etappe', 'spec-nacharbeit', '--slug', 'x', '--quelle', review.bericht));
  const copy = readState(env.repo, 'x').gestartet.specKopie;

  // Assert
  assert.match(copy, /\/session-chain\/x\/spec-vor-spec-nacharbeit\.md$/);
  assert.equal(fs.readFileSync(copy, 'utf8'), before);
});

test('chain_GrillRewritesAnExistingDecision_HoldsTheChainAsDeviation', () => {
  // Arrange
  const env = newChain();
  runWhiteboarding(env);

  // Act
  const grill = runEtappe(env, 'grill', {
    effect: () => ({ commit: commitFile(env.repo, 'docs/forge/x/spec.md', fs.readFileSync(env.spec, 'utf8').replace('CSV.', 'XML.'), 'docs: grill spec x') }),
  });

  // Assert
  assert.equal(grill.halt, 'abweichung');
  assert.ok(grill.out.includes('seit grill-Start: W-Eintrag geändert: Format'), grill.out);
});

test('chain_GrillAddsDecisionWithoutReportingIt_HoldsTheChainAsDeviation', () => {
  // Arrange
  const env = newChain();
  runWhiteboarding(env);
  const added = fs.readFileSync(env.spec, 'utf8').trimEnd().concat('\n- **W · Trenner** · Aussage — Semikolon.\n');

  // Act
  const grill = runEtappe(env, 'grill', { effect: () => ({ commit: commitFile(env.repo, 'docs/forge/x/spec.md', added, 'docs: grill spec x') }) });

  // Assert
  assert.equal(grill.halt, 'abweichung');
  assert.ok(grill.out.includes('1 neue W-Einträge, aber 0 Entscheidungen gemeldet'), grill.out);
});

test('chain_GrillAddsDecisionAndReportsIt_ContinuesWithSpecReview', () => {
  // Arrange
  const env = newChain();
  runWhiteboarding(env);
  const added = fs.readFileSync(env.spec, 'utf8').trimEnd().concat('\n- **W · Trenner** · Aussage — Semikolon.\n');

  // Act
  const grill = runEtappe(env, 'grill', {
    effect: () => ({ commit: commitFile(env.repo, 'docs/forge/x/spec.md', added, 'docs: grill spec x') }),
    reportExtra: () => ['--entscheidung', 'Trenner: Semikolon'],
  });

  // Assert
  assert.equal(grill.weiter, 'spec-review');
  assert.ok(grill.out.includes('GEPRUEFT=Spec gegen grill-Start docs/forge/x/spec.md: W-Einträge, AC-Folge und Kopf unverändert'), grill.out);
});

test('chain_ShowstopperAtImplementation_BriefRefusedUntilGreenFinalOfSameEtappe', () => {
  // Arrange
  const env = newChain();
  const red = reachImplementation(env, 'rot');

  // Act
  const refused = chain(env.repo, 'brief', '--etappe', 'abschluss', '--slug', 'x');
  const answer = chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'weiter');
  const bericht = writeReport(env, 'umsetzung', { result: '✅ Umgesetzt', extra: ['--worktree', red.worktree, '--branch', 'feature/x', '--pruefung-datei', checkFile('gruen')] });
  const green = runFinal(env, 'umsetzung', bericht, red.commit);
  const started = chain(env.repo, 'brief', '--etappe', 'abschluss', '--slug', 'x');

  // Assert
  assert.deepEqual([red.weiter, red.halt], ['halt', 'showstopper']);
  assert.ok(red.out.includes('- Prüfergebnis ist nicht grün: rot'));
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /^Haltepunkt showstopper offen/);
  assert.equal(answer.status, 1);
  assert.deepEqual([green.weiter, green.halt], ['abschluss', 'keiner']);
  assert.equal(started.status, 0, started.stderr);
});

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

test('chain_StoppAtSpecHalt_FinalReportNamesResumeAndEntryAllowsStart', () => {
  // Arrange
  const env = newChain();
  reachSpecHalt(env);
  commitFile(env.repo, 'docs/forge/x/plan.md', PLAN_TEXT, 'docs: plan x');

  // Act
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'stopp'));
  const closing = succeeded(chain(env.repo, 'schluss', '--slug', 'x', '--stopp'));
  const entry = succeeded(chain(env.repo, 'entry', 'plan-review', env.spec, env.plan));
  succeeded(chain(env.repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', env.spec, '--plan', env.plan));
  const started = chain(env.repo, 'brief', '--etappe', 'plan-review', '--slug', 'x');

  // Assert
  assert.ok(closing.includes(`## Fortsetzen\n/dv-forge:session-orchestrator planning ${env.spec.replace(/\\/g, '/')}`), closing);
  assert.equal(field(entry, 'zustand'), 'vorhanden');
  assert.equal(field(entry, 'basis'), 'main');
  assert.equal(started.status, 0, started.stderr);
});

test('chain_EntryImplementationWithHalt_RecordsHaltEvent', () => {
  // Arrange
  const env = newChain();
  runWhiteboarding(env);
  fs.mkdirSync(path.dirname(env.plan), { recursive: true });
  fs.writeFileSync(env.plan, PLAN_TEXT);

  // Act
  succeeded(chain(env.repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', env.spec, '--plan', env.plan));
  const halt = succeeded(chain(env.repo, 'halt', '--slug', 'x', '--art', 'go'));

  // Assert
  assert.ok(halt.startsWith('=== AUSGABE ===\n# GO-Haltepunkt'));
  assert.equal(eventKinds(env).at(-1), 'halt');
});

// Bericht-Daten eines Reviews, wie sie die Skills ablegen: ein offenes 🟡.
function yellowReview(title) {
  return scratch('bericht-review.json', JSON.stringify({ format: 2, open: [{ key: 'begriff', color: 'yellow', title }], green: [], changes: [] }));
}

test('chain_YellowFromPlanningAfterCleanPlanReview_NoLongerOpen', () => {
  // Arrange
  const env = newChain();
  reachSpecHalt(env);
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'planning'));
  const planning = runPlanning(env, { reportExtra: () => ['--anhang', yellowReview('Begriff im Plan')] });
  const afterPlanning = readState(env.repo, 'x').offen.map((point) => `${point.titel} · ${point.herkunft}`);
  succeeded(chain(env.repo, 'answer', '--slug', 'x', '--antwort', 'plan-nacharbeit'));
  runEtappe(env, 'plan-nacharbeit', { briefArgs: ['--quelle', planning.bericht] });

  // Act
  const review = runEtappe(env, 'plan-review', { result: PLAN_READY });

  // Assert
  assert.deepEqual(afterPlanning, ['Begriff im Plan · planning']);
  assert.equal(review.halt, 'go');
  assert.deepEqual(readState(env.repo, 'x').offen, []);
});

test('chain_StageTables_SameSetOfEtappenAndEveryStartTargetIsAnEtappe', () => {
  // Arrange
  const tables = { ETAPPEN_BRIEFS: Object.keys(ETAPPEN_BRIEFS), EXPECTED: Object.keys(EXPECTED), NEXT: Object.keys(NEXT) };
  const starts = Object.values(NEXT).map((entry) => entry.start).filter(Boolean);

  // Act
  const differing = Object.entries(tables).filter(([, names]) => [...names].sort().join() !== [...ETAPPEN].sort().join()).map(([name]) => name);

  // Assert
  assert.deepEqual(differing, []);
  assert.deepEqual(starts.filter((etappe) => !ETAPPEN.includes(etappe)), []);
});

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
  fs.writeFileSync(review, JSON.stringify({ format: 2, open: [{ key: 'a', color: 'yellow', title: 'A' }, { key: 'b', color: 'yellow', title: 'B' }], green: [{ key: 'c', color: 'green', title: 'C' }], changes: [] }));
  storeFiles({ dir: env.repo, slug: 'x', etappe: 'whiteboarding', files: [abschluss, review], fresh: true });
  const stand = succeeded(chain(env.repo, 'review-stand', '--spec', env.spec));
  const bericht = /^BERICHT=(.+)$/m.exec(succeeded(chain(env.repo, 'etappe-report', '--etappe', 'whiteboarding', '--spec', env.spec, '--inhalt', field(stand, 'ABSCHLUSS'))))[1];
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
