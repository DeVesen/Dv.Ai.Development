'use strict';

// Formprüfung einer Grill-Runde nach skills/spec-whiteboarding/references/grill-rounds.md, ohne KI.
// Geprüft wird nur die Form: `❓ **Q<n>** - **<Titel>**: <Frage>`, darunter genau eine `➡️ <Empfehlung> · <Beleg-Tag> — <Grund>`
// mit genau einem Beleg-Tag, Nummern fortlaufend. Verkürzte Wiederholungen (`Q<n> <Titel> — <Empfehlung>`) und `Q<n> entfällt, …` sind Prosa.

const TAGS = ['Aussage', 'Anhang', 'Historie', 'Git', 'ungeklärt'];
const QUESTION_START = /^❓/u;
const QUESTION = /^❓ \*\*Q(\d+)\*\* - \*\*(.+?)\*\*: \S.*$/u;
const RECOMMENDATION_START = /^➡️/u;
const RECOMMENDATION = new RegExp(`^➡️ (.+?) · (${TAGS.join('|')}) — (\\S.*)$`, 'u');
const TAG_ANYWHERE = new RegExp(` · (${TAGS.join('|')})(?=[\\s.—]|$)`, 'g');
const FENCE = /^\s*(?:```|~~~)/;

function issue(rule, severity, location, message) {
  return { rule, severity, location, message };
}

// Zeilen außerhalb von Code-Blöcken, mit Nummer.
function textLines(text) {
  let fenced = false;
  return String(text).replace(/\r\n/g, '\n').split('\n').map((line, index) => ({ text: line.trim(), number: index + 1 })).filter((line) => {
    if (FENCE.test(line.text)) fenced = !fenced;
    return !fenced && !FENCE.test(line.text);
  });
}

function numberIssues(questions) {
  const found = [];
  questions.forEach((question, index) => {
    if (index === 0) return;
    const before = questions[index - 1].n;
    if (question.n === before) found.push(issue('nummer-doppelt', 'fehler', `Q${question.n}`, `Q${question.n} steht zweimal hintereinander.`));
    else if (question.n !== before + 1) found.push(issue('nummer-luecke', 'fehler', `Q${question.n}`, `Nach Q${before} folgt Q${question.n}; die Nummern laufen fortlaufend.`));
  });
  return found;
}

function recommendationIssues(line, label) {
  const found = [];
  const match = RECOMMENDATION.exec(line.text);
  if (!match) return [issue('empfehlung-form', 'fehler', label, 'Die Empfehlung folgt nicht `➡️ <Empfehlung> · <Beleg-Tag> — <Grund>`.')];
  if ((line.text.match(TAG_ANYWHERE) ?? []).length > 1) found.push(issue('mehrere-tags', 'fehler', label, 'Genau ein Beleg-Tag je Empfehlung.'));
  if (match[2] === 'ungeklärt' && !/Vermutung/.test(match[3])) found.push(issue('vermutung-fehlt', 'warnung', label, 'Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung.'));
  return found;
}

// Ergebnis: { issues: [{ rule, severity: 'fehler'|'warnung', location, message }], metrics: { fragen, fehler, warnungen } }.
function lintRound(text) {
  const issues = [];
  const questions = [];
  let current = null;
  for (const line of textLines(text).filter((entry) => entry.text !== '')) {
    if (QUESTION_START.test(line.text)) {
      const match = QUESTION.exec(line.text);
      const n = match ? Number(match[1]) : null;
      if (!match) issues.push(issue('frage-form', 'fehler', `Zeile ${line.number}`, 'Die Frage folgt nicht `❓ **Q<n>** - **<Titel>**: <Frage>`.'));
      current = { n, label: n === null ? `Zeile ${line.number}` : `Q${n}`, recommendations: 0 };
      if (n !== null) questions.push(current);
    } else if (RECOMMENDATION_START.test(line.text)) {
      if (!current) {
        issues.push(issue('empfehlung-ohne-frage', 'fehler', `Zeile ${line.number}`, 'Eine Empfehlung steht ohne Frage davor.'));
        continue;
      }
      current.recommendations += 1;
      if (current.recommendations === 1) issues.push(...recommendationIssues(line, current.label));
      else issues.push(issue('empfehlung-doppelt', 'fehler', current.label, 'Genau eine Empfehlung pro Frage.'));
    }
  }
  issues.push(...questions.filter((question) => question.recommendations === 0).map((question) => issue('empfehlung-fehlt', 'fehler', question.label, 'Zur Frage fehlt die Empfehlung.')));
  issues.push(...numberIssues(questions));
  const count = (severity) => issues.filter((entry) => entry.severity === severity).length;
  return { issues, metrics: { fragen: questions.length, fehler: count('fehler'), warnungen: count('warnung') } };
}

function formatRound({ issues, metrics }) {
  const head = `RUNDE fehler=${metrics.fehler} warnungen=${metrics.warnungen} fragen=${metrics.fragen}`;
  return [head, ...issues.map((entry) => `${entry.severity.toUpperCase()} ${entry.rule} · ${entry.location}: ${entry.message}`)].join('\n');
}

module.exports = { lintRound, formatRound };
