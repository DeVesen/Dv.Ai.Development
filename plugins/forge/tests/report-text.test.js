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
