'use strict';

const path = require('node:path');
const { placeKey } = require('./places');
const { openQuestions, bundleShapeProblem, bundleProblem, renderQuestions } = require('./questions');
const { parseRework } = require('../followup');
const { ROUND_ONE, readText, readJson, readAgentJson, writeText, writeJson } = require('./flow-files');

const STATUSES = {
  'spec-review': ['changed', 'unchanged', 'human-question'],
  'plan-review': ['changed', 'unchanged', 'spec-question'],
};
const QUESTION_STATUS = { 'spec-review': 'human-question', 'plan-review': 'spec-question' };
const NEEDS_REASON = new Set(['unchanged', 'human-question', 'spec-question']);
const ANSWER_STATUSES = ['answered', 'open'];

function inputFile(workspace, source) {
  return path.join(workspace, source, source === ROUND_ONE ? 'nacharbeit-eingabe.md' : 'aggregate.md');
}

function expectedKeys(workspace, source) {
  return parseRework(readText(inputFile(workspace, source)).split('\n')).map((group) => placeKey(group.location));
}

// Beleg-Formen der Nacharbeit: <Datei>, <Datei> · <Begriff>, Spec · <Stelle>; <Datei> ohne Leerraum.
// Ob die Datei existiert, prüft die Nacharbeit unter Repo:, nicht das Skript.
function evidenceForm(evidence) {
  const [head, ...rest] = evidence.trim().split(' · ');
  if (rest.length > 1) return false;
  if (rest.length === 1 && rest[0].trim() === '') return false;
  if (head === 'Spec') return rest.length === 1;
  return /^\S+$/.test(head);
}

// evidence gilt für beide Reviews; plan-rework schreibt das Feld nie.
function evidenceProblem(entry) {
  if (entry.evidence === undefined) return null;
  if (typeof entry.evidence !== 'string' || entry.evidence.trim() === '') return `evidence ist kein Text (${entry.location})`;
  if (/^kein(e|er)?\W*$/i.test(entry.evidence.trim())) return `evidence keiner ist kein Beleg (${entry.location})`;
  if (!evidenceForm(entry.evidence)) return `evidence hat keine Beleg-Form (${entry.location})`;
  return entry.status === 'changed' ? null : `evidence nur bei changed (${entry.location})`;
}

function entryProblem(entry, review) {
  if (entry === null || typeof entry !== 'object' || typeof entry.location !== 'string' || entry.location.trim() === '') return 'Eintrag ohne location';
  if (!STATUSES[review].includes(entry.status)) return `status unbekannt: ${entry.status} (${entry.location})`;
  if (NEEDS_REASON.has(entry.status) && !(typeof entry.reason === 'string' && entry.reason.trim() !== '')) return `reason fehlt (${entry.location})`;
  return evidenceProblem(entry);
}

// Je erwarteter Stelle genau ein Ausgang.
function coverageProblem(results, keys, noun) {
  const named = results.map((entry) => placeKey(entry.location));
  const missing = keys.filter((key) => !named.includes(key));
  if (missing.length > 0) return `${noun} fehlt: ${missing.join(', ')}`;
  const doubled = keys.filter((key) => named.filter((item) => item === key).length > 1);
  return doubled.length > 0 ? `${noun} doppelt: ${doubled.join(', ')}` : null;
}

function resultsProblem(value, keys, review) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.results)) return 'results fehlt';
  return value.results.map((entry) => entryProblem(entry, review)).find(Boolean) ?? coverageProblem(value.results, keys, 'Ausgang');
}

// Fragen nach der Nacharbeit: in der Spec die offenen R-Einträge, im Plan die Spec-Rückfragen des Ergebnisses.
function questionsAfter(options, results) {
  const asked = results.filter((entry) => entry.status === QUESTION_STATUS[options.review]);
  if (options.review === 'plan-review') return asked.map((entry) => ({ place: entry.location, key: placeKey(entry.location), question: entry.reason }));
  return openQuestions(readText(options.doc));
}

function missingEntryProblem(options, results, questions) {
  if (options.review !== 'spec-review') return null;
  const open = questions.map((question) => question.key);
  const missing = results.filter((entry) => entry.status === 'human-question' && !open.includes(placeKey(entry.location)));
  return missing.length > 0 ? `R-Eintrag fehlt: ${missing.map((entry) => entry.location).join(', ')}` : null;
}

function mustBundle(options) {
  return options.review === 'spec-review' && options.source === ROUND_ONE;
}

function bundlesProblem(value) {
  if (!Array.isArray(value.questions)) return 'questions fehlt';
  return value.questions.map(bundleShapeProblem).find(Boolean) ?? null;
}

// Ergebnis der Nacharbeit prüfen; in Runde 1 eines Spec-Reviews auch die Bündelung der Fragen.
function checkRework(options) {
  const dir = path.join(options.workspace, options.source);
  const { value, problem } = readAgentJson(path.join(dir, 'rework.json'));
  const invalid = problem ?? resultsProblem(value, expectedKeys(options.workspace, options.source), options.review);
  if (invalid) return `NACHARBEIT ungültig: ${invalid}`;
  const questions = questionsAfter(options, value.results);
  const missing = missingEntryProblem(options, value.results, questions);
  if (missing) return `NACHARBEIT ungültig: ${missing}`;
  writeJson(path.join(dir, 'fragen.json'), questions);
  if (!mustBundle(options) || questions.length === 0) return `NACHARBEIT ok fragen=${questions.length} anhalten=nein`;
  const shape = bundlesProblem(value);
  if (shape) return `NACHARBEIT ungültig: ${shape}`;
  const bundling = bundleProblem(value.questions, questions.map((question) => question.key));
  if (bundling) return `BUENDELUNG fehlerhaft: ${bundling}`;
  const shown = renderQuestions(value.questions);
  writeText(path.join(dir, 'fragen.md'), shown);
  return [`NACHARBEIT ok fragen=${questions.length} anhalten=ja`, '=== FRAGEN ===', shown].join('\n');
}

function answersProblem(value, asked) {
  if (value === null || typeof value !== 'object' || !Array.isArray(value.results)) return 'results fehlt';
  const wrong = value.results.find((entry) => typeof entry?.location !== 'string' || !ANSWER_STATUSES.includes(entry.status));
  if (wrong) return `Eintrag ungültig: ${JSON.stringify(wrong)}`;
  return coverageProblem(value.results, asked.map((question) => question.key), 'Antwort');
}

function mismatchProblem(results, openKeys) {
  const wrong = results.filter((entry) => (entry.status === 'answered') === openKeys.has(placeKey(entry.location)));
  return wrong.length > 0 ? `Antwort passt nicht zum Dokument: ${wrong.map((entry) => entry.location).join(', ')}` : null;
}

// Nach der Antwort des Menschen: Das Dokument entscheidet, welche Fragen beantwortet sind.
function checkAnswers(options) {
  const dir = path.join(options.workspace, ROUND_ONE);
  const asked = readJson(path.join(dir, 'fragen.json'));
  const { value, problem } = readAgentJson(path.join(dir, 'antworten.json'));
  const openKeys = new Set(openQuestions(readText(options.doc)).map((question) => question.key));
  const invalid = problem ?? answersProblem(value, asked) ?? mismatchProblem(value.results, openKeys);
  if (invalid) return `ANTWORTEN ungültig: ${invalid}`;
  const answered = asked.filter((question) => !openKeys.has(question.key)).length;
  return `ANTWORTEN ok beantwortet=${answered} offen=${asked.length - answered}`;
}

module.exports = { checkRework, checkAnswers, evidenceProblem, evidenceForm };
