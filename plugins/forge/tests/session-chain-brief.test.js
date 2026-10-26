'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBrief, BASE_FILE } = require('../scripts/lib/session-chain-brief');
const { SessionChainError } = require('../scripts/lib/session-chain-store');
const { goCall } = require('../scripts/lib/session-chain-text');
const { readText } = require('./lib/markdown');
const { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION } = require('./lib/former-names');

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
  assert.equal(first('grill'), '/dv-forge:spec-grilling "C:/r/docs/forge/x/spec.md"');
  assert.equal(first('spec-review'), '/dv-forge:spec-review-orchestrator "C:/r/docs/forge/x/spec.md"');
  assert.equal(first('planning'), '/dv-forge:plan-orchestrator "C:/r/docs/forge/x/spec.md"');
  assert.equal(first('plan-review'), '/dv-forge:plan-review "C:/r/docs/forge/x/plan.md" "C:/r/docs/forge/x/spec.md"');
  assert.equal(first('abschluss'), '/dv-forge:finish-work');
});

test('buildBrief_SpecReviewAfterGrill_StillCommitsTheSpecItselfWithoutWhiteboardingOption', () => {
  // Act
  const text = brief('spec-review').brief;

  // Assert
  assert.ok(text.includes('Der Skill committet die Spec selbst.'));
  assert.ok(!text.includes('--whiteboarding'));
});

test('buildBrief_Nacharbeit_StartsWithTaskLineAndNamesTheReviewReport', () => {
  // Act
  const [spec, plan] = ['spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => brief(etappe).brief);

  // Assert
  assert.equal(spec.split('\n')[0], 'Spec-Nacharbeit "C:/r/docs/forge/x/spec.md"');
  assert.equal(plan.split('\n')[0], 'Plan-Nacharbeit "C:/r/docs/forge/x/plan.md" "C:/r/docs/forge/x/spec.md"');
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
  assert.ok(text.startsWith('/dv-forge:spec-review-orchestrator "C:/r/docs/forge/x/spec.md" 311021'));
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
    'nur deine eigenen Dateien, auf Pfade beschränkt', 'Fremde Dateien fasst du nicht an.', 'Die Git-Verbote stehen in `',
    'shared/orchestrator-rules.md`, Abschnitt Git-Verbote; Push ist nach dem Ja des Menschen in der Abschluss-Etappe erlaubt.', 'Commit-Konvention des Projekts',
    '`[planning] STATUS=<in-progress|needs-user|final> · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad|none>`',
    '4. Starte keine weitere Session. Eine Nachricht schickst du nur nach Regel 9; sonst meldest du dich über dein Turn-Ende.',
    'stellst sie am Ende deiner Antwort',
    'Aufräumpflicht: Vor deinem letzten Turn-Ende beendest du alle Hintergrundprozesse',
    'Statuszeile und Ergebnis deines Skills sind deine ganze Ausgabe',
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

test('buildBrief_PlanReview_IteratesViaNextInOneTurnAndReportsPlan', () => {
  // Act
  const text = brief('plan-review').brief;
  const auftrag = text.slice(text.indexOf('## Auftrag'), text.indexOf('## Ketten-Regeln'));

  // Assert
  for (const part of [
    'scripts/orchestrator-state.js" ablage --art plan --plan "C:/r/docs/forge/x/plan.md"`',
    'Alles in einem Turn: Nach der Review-Statuszeile von `plan-review` arbeitest du ohne Turn-Ende weiter.',
    'scripts/orchestrator-state.js" next --review "<BR>"`, dazu `--followup "<BFn>"` je gelaufener Runde.',
    '`NEXT=followup`: Runde `RUNDE` mit `dv-forge:review-followup` und `"C:/r/docs/forge/x/plan.md" alle --spec "C:/r/docs/forge/x/spec.md"`.',
    'shared/orchestrator-rules.md`',
    'ohne Review-Statuszeile: keine weitere Runde, Status `needs-user` mit der Meldung.',
    'Den Plan schreibst du nicht neu. Du committest nichts; Spec und Plan committet die Leit-Session nach dem GO.',
    'Berichtsdatei mit `--plan "C:/r/docs/forge/x/plan.md"`',
  ]) assert.ok(auftrag.includes(part), part);
  assert.equal(auftrag.includes('FOLLOWUP ja'), false, 'die Etappe zählt keine Runden nach der Statuszeile');
  assert.equal(auftrag.includes(FORMER_ABLAGE_OPTION), false);
  assert.equal(auftrag.includes('Commit-Frage'), false);
});

test('buildBrief_PlanReview_NamesTheMarkdownReportOfTheLastReviewStatusLine', () => {
  // Act
  const text = brief('plan-review').brief;

  // Assert
  assert.ok(text.includes('`--inhalt` ist die `.md`-Datei, die die letzte Review-Statuszeile nach `Bericht:` nennt.'));
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

test('buildBrief_GrillAndNacharbeiten_AskForTheFullReportViaInhalt', () => {
  // Act
  const texts = ['grill', 'spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => brief(etappe).brief);

  // Assert
  for (const text of texts) {
    const auftrag = text.slice(text.indexOf('## Auftrag'), text.indexOf('## Ketten-Regeln'));
    assert.ok(auftrag.includes('`--inhalt "<datei>"`'), auftrag);
    assert.equal(auftrag.includes(FORMER_REPORT_OPTION), false, auftrag);
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

test('buildBrief_Whiteboarding_ReportsWithTheAbschlussOfTheReview', () => {
  // Act
  const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

  // Assert
  assert.ok(text.includes('Abschließen: Berichtsdatei mit `--spec "<deine Spec>"` und `--inhalt "<ABSCHLUSS aus review-stand>"`, dazu `--datei` je geänderter Glossar- oder ADR-Datei.'));
});

test('buildBrief_Umsetzung_NamesSourcesForCommitPruefungLueckeAndAcOhneTest', () => {
  // Act
  const text = brief('umsetzung').brief;

  // Assert
  for (const part of [
    '`COMMIT` der Statuszeile ist der letzte Commit der Umsetzung: `git -C "<R>" rev-parse --short HEAD`',
    '`<PR>` ist die Datei `pruefung.json` im Scratchpad dieser Session',
    'Lief Schritt 6 nicht, gilt `--pruefung keine`.',
    '`--luecke "<befehl>"` je Lauf in `<PR>`, dessen Ausgabe zeigt, dass das Werkzeug fehlt',
    '`--ac-ohne-test` ergänzt `etappe-report` selbst aus der Zeile `AC ohne beweisenden Test:` des Abschlussberichts',
    'auch wenn das Review es nur als 🟡 führt',
    'Integrationspunkte ohne Test sind davon ausgenommen',
    'beide Werte aus den Zeilen `R=` und `branch=` von start-work',
  ]) assert.ok(text.includes(part), part);
});

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
    'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session.',
    'Nach der Bestätigung und dem Schreiben der Spec rufst du ohne Rückfrage in dieser Session über das Skill-Werkzeug `dv-forge:spec-review-orchestrator` mit `"<deine Spec>" --whiteboarding` auf.',
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

test('buildBrief_AnyEtappe_BackgroundAllowsTheFinalMessage', () => {
  // Act
  const text = brief('planning').hintergrund;

  // Assert
  assert.ok(text.includes('meldet sich über ihr Turn-Ende, bei final zusätzlich mit einer Nachricht an die Leit-Session.'), text);
  assert.ok(!text.includes('nur über ihr Turn-Ende'), text);
});

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

test('buildBrief_StatusLine_DefinesRotAndGelbFromTheResultLine', () => {
  const text = brief('spec-review').brief;
  assert.ok(text.includes('ROT und GELB: die Zahlen der Ergebnis-Zeile deines Berichts (`n Hindernis(se) offen` → ROT, `n kleine(r) Hinweis(e) offen` → GELB); fehlt die Angabe, `0`.'));
});
