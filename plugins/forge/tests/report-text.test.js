'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { renderReportText } = require('../scripts/lib/report-text');

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

test('renderReportText_ReadyWithOneHint_ShowsAgreedLayout', () => {
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
    '',
    '### Wie es weitergeht',
    '1. Den Hinweis einarbeiten lassen (optional):',
    '   `/dv-forge:review-followup docs/specs/x.md alle`',
    '2. Spec committen.',
    '3. In einer frischen Session den Plan schreiben:',
    '   `/dv-forge:plan-writing docs/specs/x.md`',
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
    '',
    '### Wie es weitergeht',
    '1. Spec committen.',
    '2. In einer frischen Session den Plan schreiben:',
    '   `/dv-forge:plan-writing docs/specs/x.md`',
  ].join('\n'));
});

test('renderReportText_PlanReviewReadyWithTwoHints_UsesPlanWording', () => {
  // Act
  const text = renderReportText(base({ review: 'plan-review', title: 'Plan-Review', artifact: 'docs/p/plan.md', open: [HINT, { ...HINT, title: 'Zweiter Hinweis' }] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ✅ Bereit zur Umsetzung · 2 kleine Hinweise offen/);
  assert.match(text, /### Noch offen · kein Hindernis für die Umsetzung/);
  assert.match(text, /1\. Die 2 Hinweise einarbeiten lassen \(optional\):\n   `\/dv-forge:review-followup docs\/p\/plan\.md alle`\n2\. Spec und Plan committen \(ich frage dich danach\)\.\n3\. In einer frischen Session umsetzen:\n   `\/dv-forge:implementation docs\/p\/plan\.md`/);
  assert.equal(text.includes('Was sich'), false);
});

test('renderReportText_Blocked_ShowsHindrancesAndRerunStep', () => {
  // Arrange
  const hindrance = { color: 'red', title: 'Token-Format', angles: 'Widerspruchsfreiheit', description: 'Das Format ist nicht belegt.', recommendation: null, hasProposal: true };

  // Act
  const text = renderReportText(base({ status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [hindrance, { ...hindrance, title: 'Zweites' }] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 2 Hindernisse offen/);
  assert.match(text, /### Noch offen · Hindernis\n- 🔴 \*\*Token-Format\*\* · aus: Widerspruchsfreiheit\n  Das Format ist nicht belegt\.\n- 🔴 \*\*Zweites\*\*/);
  assert.equal(text.includes('Vorschlag (empfohlen)'), false);
  assert.match(text, /1\. Die 2 Hindernisse einarbeiten lassen \(oder das Dokument selbst anpassen\):\n   `\/dv-forge:review-followup docs\/specs\/x\.md alle`\n2\. Danach erneut prüfen:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
});

test('renderReportText_QuestionsOpen_SpecAndPlanSteps', () => {
  // Act
  const spec = renderReportText(base({ status: 'Fragen offen', questions: ['**Leere Eingabe** (betrifft: Eingabe)', '**Zweite Frage** (betrifft: Ablauf)'] }));
  const plan = renderReportText(base({ review: 'plan-review', status: 'Fragen offen', artifact: 'docs/p/plan.md', spec: 'docs/p/spec.md', questions: ['Die Spec legt X nicht fest.'] }));

  // Assert
  assert.match(spec, /\*\*Ergebnis:\*\* ❓ 2 Fragen offen/);
  assert.match(spec, /### Offene Fragen\n- \*\*Leere Eingabe\*\* \(betrifft: Eingabe\)\n- \*\*Zweite Frage\*\*/);
  assert.match(spec, /1\. Die Fragen beantworten, indem du die Prüfung erneut startest:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
  assert.match(plan, /\*\*Ergebnis:\*\* ❓ 1 Frage offen/);
  assert.match(plan, /### Offene Fragen\n- Die Spec legt X nicht fest\./);
  assert.match(plan, /1\. Die Spec anpassen\.\n2\. Die Spec prüfen:\n   `\/dv-forge:spec-review docs\/p\/spec\.md`\n3\. Danach den Plan erneut prüfen:\n   `\/dv-forge:plan-review docs\/p\/plan\.md`/);
});

test('renderReportText_PlanQuestionsWithoutSpecPath_SkipsTheSpecStep', () => {
  // Act
  const text = renderReportText(base({ review: 'plan-review', status: 'Fragen offen', artifact: 'docs/p/plan.md', questions: ['Frage?'] }));

  // Assert
  assert.match(text, /1\. Die Spec anpassen\.\n2\. Danach den Plan erneut prüfen:/);
  assert.equal(text.includes('null'), false);
});

test('renderReportText_Incomplete_NamesFailedAndOffersRerun', () => {
  // Act
  const text = renderReportText(base({ status: 'unvollständig, ausgefallen: nachprüfer', failedLabels: ['Nachprüfung', 'Klarheit'] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⚠️ Unvollständig · Nachprüfung, Klarheit ausgefallen/);
  assert.match(text, /1\. Den Lauf in einer frischen Session erneut starten:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`/);
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
  assert.ok(text.split('\n\n').length >= 4);
});

const RED_WITHOUT_PROPOSAL = { color: 'red', title: 'Neuer Widerspruch', angles: 'Nachprüfung', description: 'Die Grenze widerspricht dem Ablauf.', recommendation: null, hasProposal: false };

test('renderReportText_BlockedWithoutAnyProposal_NamesSelfEditInsteadOfFollowup', () => {
  // Act
  const spec = renderReportText(base({ status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [RED_WITHOUT_PROPOSAL, { ...RED_WITHOUT_PROPOSAL, title: 'Zweites' }] }));
  const plan = renderReportText(base({ review: 'plan-review', artifact: 'docs/p/plan.md', status: 'nicht bereit, 1 × 🔴 offen', openRed: 1, open: [RED_WITHOUT_PROPOSAL] }));

  // Assert
  assert.equal(spec.includes('review-followup'), false);
  assert.match(spec, /### Wie es weitergeht\n1\. Die 2 Hindernisse haben keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`$/);
  assert.equal(plan.includes('review-followup'), false);
  assert.match(plan, /### Wie es weitergeht\n1\. Das Hindernis hat keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:\n   `\/dv-forge:plan-review docs\/p\/plan\.md`$/);
});

test('renderReportText_BlockedWithSomeProposals_NamesFollowupOnlyForThoseWithProposal', () => {
  // Arrange
  const withProposal = { ...RED_WITHOUT_PROPOSAL, title: 'Grenzwert', hasProposal: true };

  // Act
  const one = renderReportText(base({ status: 'nicht bereit, 2 × 🔴 offen', openRed: 2, open: [withProposal, RED_WITHOUT_PROPOSAL] }));
  const many = renderReportText(base({ status: 'nicht bereit, 4 × 🔴 offen', openRed: 4, open: [withProposal, withProposal, RED_WITHOUT_PROPOSAL, RED_WITHOUT_PROPOSAL] }));

  // Assert
  assert.match(one, /### Wie es weitergeht\n1\. Das Hindernis mit Lösungsvorschlag einarbeiten lassen:\n   `\/dv-forge:review-followup docs\/specs\/x\.md alle`\n2\. Das übrige Hindernis hat keinen Lösungsvorschlag\. Das Dokument selbst anpassen, dann erneut prüfen:\n   `\/dv-forge:spec-review docs\/specs\/x\.md`$/);
  assert.match(many, /1\. Die 2 Hindernisse mit Lösungsvorschlag einarbeiten lassen:\n[^\n]*alle`\n2\. Die 2 übrigen Hindernisse haben keinen Lösungsvorschlag\./);
});

test('renderReportText_HintsWithoutProposal_NamesOptionalSelfEditInsteadOfFollowup', () => {
  // Arrange
  const bare = { ...HINT, recommendation: null, hasProposal: false };

  // Act
  const none = renderReportText(base({ open: [bare, bare] }));
  const mixed = renderReportText(base({ open: [HINT, bare] }));

  // Assert
  assert.equal(none.includes('review-followup'), false);
  assert.match(none, /### Wie es weitergeht\n1\. Die 2 Hinweise haben keinen Lösungsvorschlag\. Bei Bedarf das Dokument selbst anpassen \(optional\)\.\n2\. Spec committen\./);
  assert.match(mixed, /### Wie es weitergeht\n1\. Den Hinweis mit Lösungsvorschlag einarbeiten lassen \(optional\):\n   `\/dv-forge:review-followup docs\/specs\/x\.md alle`\n2\. Der übrige Hinweis hat keinen Lösungsvorschlag\. Bei Bedarf das Dokument selbst anpassen \(optional\)\.\n3\. Spec committen\./);
});

test('renderReportText_CleanStatusWithOpenHindrance_ReportsNotReady', () => {
  // Arrange: Followup, dessen Status nur die gewählten Gruppen zählt; eine nicht gewählte 🔴 bleibt offen.
  const unchosen = { ...RED_WITHOUT_PROPOSAL, title: 'Grenzwert', hasProposal: true };

  // Act
  const text = renderReportText(base({ followup: true, title: 'Review-Followup (spec-review)', chosenCount: 1, status: 'sauber nach Nachprüfung', openRed: 1, open: [unchosen] }));

  // Assert
  assert.match(text, /\*\*Ergebnis:\*\* ⛔ Noch nicht bereit · 1 Hindernis offen/);
  assert.match(text, /### Wie es weitergeht\n1\. Das Hindernis einarbeiten lassen \(oder das Dokument selbst anpassen\):\n   `\/dv-forge:review-followup docs\/specs\/x\.md alle`\n2\. Danach erneut prüfen:/);
  assert.equal(text.includes('plan-writing'), false);
});
