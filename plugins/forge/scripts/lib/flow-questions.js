'use strict';

const { normalizeLocation } = require('../aggregate-findings');

// Ausgang der Nacharbeit je 🔴-Stelle und Fragen an den Menschen, gebündelt je Regel.
const QUESTION_STATUS = { 'spec-review': 'human-question', 'plan-review': 'spec-question' };
const ANSWER_STATUS = ['answered', 'partial', 'open'];

function isText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function statusesOf(kind) {
  return ['changed', 'unchanged', QUESTION_STATUS[kind]];
}

function resultProblem(result, kind) {
  if (result === null || typeof result !== 'object') return 'Eintrag in results ist kein Objekt';
  if (!isText(result.location)) return 'Eintrag in results ohne location';
  if (!statusesOf(kind).includes(result.status)) return `${result.location}: unbekannter status ${String(result.status)}`;
  if (result.status === 'unchanged' && !isText(result.rationale)) return `${result.location}: “nicht geändert” ohne rationale`;
  return null;
}

// Jede erwartete Stelle hat genau einen Ausgang, und es gibt keinen Ausgang für andere Stellen.
function coverageProblems(results, expectedKeys) {
  const counts = new Map();
  for (const result of results) {
    const canon = normalizeLocation(result.location);
    counts.set(canon, (counts.get(canon) ?? 0) + 1);
  }
  const expected = new Map(expectedKeys.map((key) => [normalizeLocation(key), key]));
  const problems = [];
  for (const [canon, key] of expected) {
    if (!counts.has(canon)) problems.push(`${key}: kein Ausgang`);
    else if (counts.get(canon) > 1) problems.push(`${key}: mehr als ein Ausgang`);
  }
  for (const result of results) {
    if (!expected.has(normalizeLocation(result.location))) problems.push(`${result.location}: Ausgang für eine Stelle, die nicht zur Nacharbeit gehört`);
  }
  return [...new Set(problems)];
}

function questionProblem(question, index) {
  const name = `Frage ${index + 1}`;
  if (question === null || typeof question !== 'object') return `${name} ist kein Objekt`;
  for (const field of ['rule', 'question', 'recommendation', 'reason']) if (!isText(question[field])) return `${name} ohne ${field}`;
  for (const field of ['locations', 'cases']) {
    if (!Array.isArray(question[field]) || question[field].length === 0 || !question[field].every(isText)) return `${name} ohne ${field}`;
  }
  return null;
}

// Grund, warum das Ergebnis der Nacharbeit ungültig ist; expectedKeys sind die 🔴-Stellen.
function reworkProblems(rework, kind, expectedKeys) {
  if (rework === null || typeof rework !== 'object' || !Array.isArray(rework.results)) return ['results fehlt'];
  const invalid = rework.results.map((result) => resultProblem(result, kind)).filter(Boolean);
  if (invalid.length > 0) return invalid;
  const questions = rework.questions ?? [];
  if (!Array.isArray(questions)) return ['questions ist keine Liste'];
  const badQuestions = questions.map(questionProblem).filter(Boolean);
  return [...badQuestions, ...coverageProblems(rework.results, expectedKeys)];
}

function questionKeys(rework, kind, earlierOpen) {
  const asked = rework.results.filter((result) => result.status === QUESTION_STATUS[kind]).map((result) => result.location.trim());
  return [...asked, ...earlierOpen.map((question) => question.key)];
}

// Jede Stelle mit Frage steht in genau einer gebündelten Frage; gebündelt wird nur, was eine Frage hat.
function bundleProblems(rework, kind, earlierOpen) {
  const wanted = new Map(questionKeys(rework, kind, earlierOpen).map((key) => [normalizeLocation(key), key]));
  const seen = new Map();
  for (const question of rework.questions ?? []) {
    for (const location of question.locations) {
      const canon = normalizeLocation(location);
      seen.set(canon, [...(seen.get(canon) ?? []), location]);
    }
  }
  const problems = [];
  for (const [canon, key] of wanted) {
    if (!seen.has(canon)) problems.push(`${key}: fehlt in den gebündelten Fragen`);
    else if (seen.get(canon).length > 1) problems.push(`${key}: steht in mehr als einer gebündelten Frage`);
  }
  for (const [canon, locations] of seen) if (!wanted.has(canon)) problems.push(`${locations[0]}: hat keine Frage`);
  return problems;
}

function numbered(questions) {
  return questions.map((question, index) => ({ number: `F${index + 1}`, ...question }));
}

function formatQuestions(questions) {
  const blocks = questions.map((question) => [
    `**${question.number} · ${question.rule}** — ${question.question}`,
    `- Stellen: ${question.locations.join(', ')}`,
    `- Unterfälle: ${question.cases.join(' · ')}`,
    `- Empfohlen: ${question.recommendation} — ${question.reason}`,
  ].join('\n'));
  return ['### Fragen an den Menschen', '', blocks.join('\n\n'), '',
    'Antwort im Chat je Frage, z. B. `F1: a`. `F2: später` lässt F2 offen.', ''].join('\n');
}

function answersProblems(result, questions) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.answers)) return ['answers fehlt'];
  const problems = [];
  for (const answer of result.answers) {
    if (!questions.some((question) => question.number === answer?.question)) problems.push(`Antwort zu unbekannter Frage ${String(answer?.question)}`);
    else if (!ANSWER_STATUS.includes(answer.status)) problems.push(`${answer.question}: unbekannter status ${String(answer.status)}`);
  }
  for (const question of questions) {
    const count = result.answers.filter((answer) => answer?.question === question.number).length;
    if (count !== 1) problems.push(`${question.number}: ${count === 0 ? 'kein' : 'mehr als ein'} Eintrag`);
  }
  return problems;
}

module.exports = {
  QUESTION_STATUS, reworkProblems, coverageProblems, resultProblem, bundleProblems, numbered, formatQuestions, answersProblems,
};
