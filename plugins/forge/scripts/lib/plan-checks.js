'use strict';

const fs = require('node:fs');
const { normalizeLocation } = require('../aggregate-findings');
const { numberingError, scanPlan, splitLines } = require('../plan-tasks');
const { anchorMarks } = require('../plan-anchors');
const { parsePlaces, collapse } = require('./places');
const { lintFormat, lintConsumes, readPlan, ANY_TASK_HEADING, toFinding } = require('./plan-lint');

// Skript-Prüfungen des Plan-Reviews. Sie urteilen ohne KI über den Plan-Text und über Spec und Repo aus { doc, spec, repo }.
const AC_LINE = /^\s*\*\*ACs:\*\*(.*)$/;
const AC_ID = /AC-\d+/gi;
const AC_KEY = /^AC-\d+$/i;
const PLAN_KEY = 'Plan';

function finding(location, quote, category, consequence, rationale) {
  return { location, quote, category, consequence, rationale };
}

// Eine Skript-Prüfung, die nicht laufen kann, ist selbst ein Befund am Plan.
function failure(check, message) {
  return finding(PLAN_KEY, `Quelle: Skript-Prüfung ${check}`, 'umsetzer-steckt-fest',
    `Die Skript-Prüfung ${check} konnte nicht laufen; ihr Ergebnis fehlt.`, message);
}

function numberingFindings(text) {
  const { tasks } = readPlan(text);
  if (tasks.length === 0) {
    return [finding(PLAN_KEY, 'Quelle: Plan ohne Task-Überschrift', 'umsetzer-steckt-fest',
      'Der Plan hat keinen Task; der Umsetzer hat nichts umzusetzen.', 'Skript-Prüfung Nummerierung: kein Task gefunden')];
  }
  const wrong = tasks.findIndex((task, index) => !/^\d+$/.test(task.token) || Number(task.token) !== index + 1);
  if (wrong === -1) return [];
  const task = tasks[wrong];
  return [finding(`Task ${task.token}`, task.heading, 'umsetzer-steckt-fest',
    `An Position ${wrong + 1} steht Task ${task.token}; die Umsetzung zerlegt den Plan nach lückenlosen Task-Nummern ab 1.`, 'Skript-Prüfung Nummerierung')];
}

// Nur die Zeile **ACs:** eines Tasks zählt, nicht eine Nennung im übrigen Text.
function plannedAcs(text) {
  const { lines, fenced, tasks } = readPlan(text);
  const planned = new Set();
  for (const task of tasks) {
    for (let index = task.start; index < task.end; index += 1) {
      const match = fenced[index] ? null : AC_LINE.exec(lines[index]);
      for (const id of match ? match[1].match(AC_ID) ?? [] : []) planned.add(normalizeLocation(id));
    }
  }
  return planned;
}

function specAcs(specText) {
  return [...parsePlaces(specText).values()].filter((place) => AC_KEY.test(place.label));
}

function readSpec(context) {
  if (!context?.spec) return { error: 'Der Arbeitsbereich nennt keine Spec (kontext.json fehlt oder ist unvollständig).' };
  try {
    return { text: fs.readFileSync(context.spec, 'utf8').replace(/\r\n/g, '\n') };
  } catch (error) {
    return { error: `Spec nicht lesbar: ${context.spec} (${error.code ?? error.message})` };
  }
}

// Richtung Spec nach Plan: Eine AC-ID im Plan ohne Gegenstück in der Spec ist kein Befund.
function coverageFindings(text, context) {
  const spec = readSpec(context);
  if (spec.error) return [failure('AC-Abdeckung', spec.error)];
  const planned = plannedAcs(text);
  return specAcs(spec.text).filter((place) => !planned.has(place.key)).map((place) => finding(place.label,
    `Quelle: Spec · ${collapse(place.text.split('\n')[0])}`, 'ac-fehlt-im-plan',
    `${place.label} steht in keinem Task unter **ACs:**; kein Task setzt es um.`, 'Skript-Prüfung AC-Abdeckung'));
}

// Jede ❌-Zeile der bestehenden Anker-Prüfung ist ein Befund an ihrem Task; ⚠-Zeilen prüft feasibility.
function anchorFindings(text, context) {
  if (numberingError(scanPlan(splitLines(text)).tasks)) return [];
  if (!context?.repo) return [failure('Anker', 'Der Arbeitsbereich nennt kein Repo (kontext.json fehlt oder ist unvollständig).')];
  let marks;
  try {
    marks = anchorMarks(context.doc, context.repo);
  } catch (error) {
    return [failure('Anker', `Anker-Prüfung abgebrochen: ${error.message}`)];
  }
  return marks.filter((mark) => mark.mark === '❌').map((mark) => finding(`Task ${mark.task}`, `Quelle: Anker-Prüfung · ${mark.line}`,
    'umsetzer-steckt-fest', 'Die Anker-Prüfung markiert diese Dateizeile mit ❌; der Umsetzer findet Datei oder Anker nicht.', 'Skript-Prüfung Anker'));
}

const PLAN_CHECKS = [
  { name: 'nummerierung', run: (text) => numberingFindings(text) },
  { name: 'ac-abdeckung', run: coverageFindings },
  { name: 'anker', run: anchorFindings },
  { name: 'plan-format', run: (text) => lintFormat(text).map(toFinding) },
  { name: 'schnittstellen', run: (text) => lintConsumes(text).map(toFinding) },
];

module.exports = { PLAN_CHECKS };
