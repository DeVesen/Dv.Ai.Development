'use strict';

// Plan- und Spec-Fixtures der Tests zum Plan-Review an einer Stelle, damit eine Änderung am Plan-Format nur hier nachgezogen wird.
const TWO_TASKS = '# P — Umsetzungsplan\n\n**Basis:** abc\n\n## Global Constraints\n- x\n\n### Task 1: Eins\nA.\n\n### Task 2: Zwei\nB.\n\n## Entscheidungen\n- Keine Fragen an den Menschen.\n';

const PLAN_SPEC = [
  '# Demo', '', 'Status: bestätigt am 2026-09-29', 'Art: verankert', 'Basis: 3ce509e', '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-03** Gegeben C, dann D.',
  '- **AC-05** Gegeben E, dann F.',
  '', '## Entscheidungen', '- **W · Deckel** · Aussage — Zwei Runden.', '',
].join('\n');
const SOURCE = 'class Klasse {\n  methode() {\n    return 1;\n  }\n}\n';
const ALL_ACS = 'AC-01, AC-03, AC-05';

// Ein Task mit Überschrift, Zeile **ACs:**, Zusatzzeilen und der Zeile Text., die Reviewer-Findings zitieren können.
function planTask(heading, acs, extra = []) {
  return [`### Task ${heading}: T`, '', `**ACs:** ${acs}`, '', ...extra, 'Text.', ''];
}

function planText(...tasks) {
  return ['# Demo — Umsetzungsplan', '', '**Basis:** abc', '', '## Global Constraints', '- Nur Node.js.', '', '---', '',
    ...tasks.flat(), '## Entscheidungen', '- Keine Fragen an den Menschen.', ''].join('\n');
}

module.exports = { TWO_TASKS, PLAN_SPEC, SOURCE, ALL_ACS, planTask, planText };
