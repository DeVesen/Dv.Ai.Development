'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBrief, BASE_FILE } = require('../scripts/lib/session-chain-brief');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { goCall } = require('../scripts/lib/session-chain-text');
const { readText } = require('./lib/markdown');

const VALUES = { slug: 'x', basis: 'dev', spec: 'C:/r/docs/forge/x/spec.md', plan: 'C:/r/docs/forge/x/plan.md' };
const MODELS = {
  whiteboarding: 'sonnet', grill: 'opus', 'spec-review': 'sonnet', 'spec-nacharbeit': 'opus', planning: 'opus',
  'plan-review': 'sonnet', 'plan-nacharbeit': 'opus', umsetzung: 'opus', abschluss: 'sonnet',
};

function brief(etappe, values = VALUES, extra = {}) {
  return buildBrief({ etappe, values: { ...values, quelle: 'C:/a/bericht.md', worktree: values.worktree ?? 'C:/wt/x' }, ...extra });
}

test('buildBrief_EveryEtappe_UsesTheModelOfTheSpec', () => {
  // Act
  const models = Object.fromEntries(Object.keys(MODELS).map((etappe) => [etappe, brief(etappe).modell]));

  // Assert
  assert.deepEqual(models, MODELS);
});

test('buildBrief_SkillEtappen_StartWithTheSlashCommandOfTheirSkill', () => {
  // Act
  const first = (etappe) => brief(etappe).brief.split('\n')[0];

  // Assert
  assert.equal(first('whiteboarding'), '/dv-forge:spec-whiteboarding-with-docs');
  assert.equal(first('grill'), '/dv-forge:spec-grilling C:/r/docs/forge/x/spec.md');
  assert.equal(first('spec-review'), '/dv-forge:spec-review-orchestrator C:/r/docs/forge/x/spec.md');
  assert.equal(first('planning'), '/dv-forge:plan-orchestrator C:/r/docs/forge/x/spec.md');
  assert.equal(first('plan-review'), '/dv-forge:plan-review C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md');
  assert.equal(first('abschluss'), '/dv-forge:finish-work');
});

test('buildBrief_Nacharbeit_StartsWithTaskLineAndNamesTheReviewReport', () => {
  // Act
  const [spec, plan] = ['spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => brief(etappe).brief);

  // Assert
  assert.equal(spec.split('\n')[0], 'Spec-Nacharbeit C:/r/docs/forge/x/spec.md');
  assert.equal(plan.split('\n')[0], 'Plan-Nacharbeit C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md');
  assert.ok(spec.includes('Lies den Bericht der letzten Review-Etappe: C:/a/bericht.md.'));
  assert.ok(spec.includes('-- "C:/r/docs/forge/x/spec.md"'));
  assert.ok(plan.includes('Du committest nicht; den Plan committet die Leit-Session nach dem GO.'));
});

test('buildBrief_Umsetzung_FirstLineIsTheCallOfTheGoHaltepunkt', () => {
  // Arrange
  const values = { ...VALUES, wi: '311021' };

  // Act
  const first = brief('umsetzung', values).brief.split('\n')[0];

  // Assert
  assert.equal(first, goCall(values));
});

test('buildBrief_WithWorkitem_NamesTheWorkitem', () => {
  // Act
  const text = brief('spec-review', { ...VALUES, wi: '311021' }).brief;

  // Assert
  assert.ok(text.startsWith('/dv-forge:spec-review-orchestrator C:/r/docs/forge/x/spec.md 311021'));
  assert.ok(text.includes('- Workitem: 311021'));
});

test('buildBrief_WithoutWorkitem_NamesNoWorkitemAnywhere', () => {
  // Act
  const texts = ['spec-review', 'planning', 'umsetzung', 'plan-review'].map((etappe) => brief(etappe).brief);

  // Assert
  for (const text of texts) assert.doesNotMatch(text, /Workitem/);
});

test('buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks', () => {
  // Act
  const text = brief('planning').brief;

  // Assert
  for (const part of [
    '- Slug: x', '- Basis-Branch: dev', '- Spec: C:/r/docs/forge/x/spec.md', '- Plan: C:/r/docs/forge/x/plan.md',
    'nur deine eigenen Dateien, auf Pfade beschränkt', 'Nie alle Änderungen stagen', 'fremde Dateien nicht anfassen', 'Commit-Konvention des Projekts', 'Push nur in der Abschluss-Etappe',
    '`[planning] STATUS=<in-progress|needs-user|final> · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad|none>`',
    'Starte keine weitere Session und sende keine Nachricht an die Leit-Session',
    'stellst sie am Ende deiner Antwort',
    'Aufräumpflicht: Vor deinem letzten Turn-Ende beendest du alle Hintergrundprozesse',
    'Die Statuszeile ersetzt die Übergabe-Hinweise deines Skills',
    'scripts/session-chain.js" etappe-report --etappe planning --slug x',
  ]) assert.ok(text.includes(part), part);
});

test('buildBrief_AnyEtappe_PutsTheStatusLineBeforeTheReportOfTheSkill', () => {
  // Act
  const text = brief('spec-review').brief;

  // Assert
  assert.ok(text.includes('Die Statuszeile steht als einzige Zeile vor dem Bericht deines Skills. Regeln deines Skills wie `nichts davor oder danach` gelten ab der zweiten Zeile.'));
});

test('buildBrief_MissingSpec_ThrowsNamingTheValue', () => {
  // Act & Assert
  assert.throws(() => buildBrief({ etappe: 'grill', values: { slug: 'x', basis: 'dev' } }),
    (error) => error instanceof SessionChainError && error.message === 'Etappe grill: spec fehlt');
});

test('buildBrief_NacharbeitWithoutQuelle_ThrowsNamingTheValue', () => {
  // Act & Assert
  assert.throws(() => buildBrief({ etappe: 'plan-nacharbeit', values: VALUES }),
    (error) => error instanceof SessionChainError && error.message === 'Etappe plan-nacharbeit: quelle fehlt');
});

test('buildBrief_AnyEtappe_CarriesTheConversationStyleOfTheBaseFile', () => {
  // Act
  const text = brief('grill').brief;

  // Assert
  assert.ok(text.includes('## Gesprächsstil'));
  assert.ok(text.includes('wie im Gespräch an der Kaffeemaschine'));
  assert.ok(readText(BASE_FILE).includes('## Gesprächsstil'));
  assert.doesNotMatch(text, /i-have-adhd/);
  assert.doesNotMatch(text, /\{\{[A-Z]+\}\}/);
});

test('buildBrief_FinishWithoutState_NamesOnlyTheWorktree', () => {
  // Act
  const text = buildBrief({ etappe: 'abschluss', values: { slug: 'wt-x', worktree: 'C:/wt/x' } }).brief;

  // Assert
  const values = text.slice(text.indexOf('## Werte'), text.indexOf('## Auftrag'));
  assert.equal(values.trim(), '## Werte\n- Slug: wt-x\n- Worktree: C:/wt/x');
  assert.ok(text.includes('Ohne sein Ja pushst du nicht.'));
});

test('buildBrief_EarlierDecisions_AreListedInTheBrief', () => {
  // Act
  const text = brief('planning', VALUES, { decisions: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] }).brief;

  // Assert
  assert.ok(text.includes('## Entscheidungen aus früheren Etappen\n- spec-nacharbeit: 500 statt 404, keine Backend-Änderung'));
});

test('buildBrief_Whiteboarding_CarriesTheContextSummaryAndReportsBySpec', () => {
  // Act
  const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export nach CSV\nDateien: src/export.js\nEntscheidungen: nur CSV' }).brief;

  // Assert
  assert.ok(text.includes('## Kontext\nAnliegen: Export nach CSV\nDateien: src/export.js\nEntscheidungen: nur CSV'));
  assert.ok(text.includes('etappe-report --etappe whiteboarding --spec "<deine Spec>"'));
});

test('buildBrief_PlanReview_RunsFollowupWhileOfferedAtMostTwiceWithoutRewrite', () => {
  // Act
  const text = brief('plan-review').brief;

  // Assert
  assert.ok(text.includes('solange die letzte Ausgabe `FOLLOWUP ja` meldet, höchstens zwei Runden'));
  assert.ok(text.includes('Den Plan schreibst du nicht neu.'));
  assert.ok(text.includes('`--ablage plan-review`'));
});

test('buildBrief_PlanReview_NamesTheMarkdownReportOfTheLastAblageLine', () => {
  // Act
  const text = brief('plan-review').brief;

  // Assert
  assert.ok(text.includes('`--bericht` ist die `.md`-Datei zur letzten `ABLAGE`-Zeile (gleicher Name, `.md` statt `.json`).'));
});

test('buildBrief_Background_IsLongEnoughForAFreshSession', () => {
  // Act
  const { hintergrund, titel } = brief('spec-review');

  // Assert
  assert.ok(hintergrund.length >= 80);
  assert.equal(titel, 'Spec-Review x');
});

test('buildBrief_WhiteboardingWithoutSlug_NamesWhereTheSlugComesFrom', () => {
  // Act
  const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

  // Assert
  const values = text.slice(text.indexOf('## Werte'), text.indexOf('## Auftrag'));
  assert.equal(values.trim(), '## Werte\n- Slug: folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`)\n- Basis-Branch: dev');
});

test('buildBrief_GrillAndNacharbeiten_AskForTheFullReportViaBericht', () => {
  // Act
  const texts = ['grill', 'spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => brief(etappe).brief);

  // Assert
  for (const text of texts) {
    const auftrag = text.slice(text.indexOf('## Auftrag'), text.indexOf('## Ketten-Regeln'));
    assert.ok(auftrag.includes('`--bericht "<datei>"`'), auftrag);
    assert.doesNotMatch(auftrag, /ohne `--bericht`/);
  }
});

test('buildBrief_Grill_NamesSkillReportContentAndStillReportsGlossaryFilesWithDatei', () => {
  // Act
  const text = brief('grill').brief;

  // Assert
  assert.ok(text.includes('Abschlussbericht von spec-grilling'));
  assert.ok(text.includes('neue W-Einträge'));
  assert.ok(text.includes('Jede geänderte Glossar- oder ADR-Datei mit `--datei`'));
});

test('buildBrief_Whiteboarding_StaysWithoutBerichtOfASkill', () => {
  // Act
  const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

  // Assert
  assert.ok(text.includes('Berichtsdatei ohne `--bericht`, mit `--spec "<deine Spec>"`.'));
});

test('buildBrief_Umsetzung_AsksToEvaluateAcceptanceFindingsOfAllColors', () => {
  // Act
  const text = brief('umsetzung').brief;

  // Assert
  assert.ok(text.includes('Akzeptanz-Findings des Reviews aller Farben'));
  assert.ok(text.includes('auch wenn das Review es nur als 🟡 führt'));
  assert.ok(text.includes('Integrationspunkte ohne Test sind davon ausgenommen'));
});
