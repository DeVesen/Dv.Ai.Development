'use strict';

const { PlanError, describePlan, markFences, splitLines, taskSections } = require('../plan-tasks');
const { scanPlanLines } = require('./plan-scan');

// Formprüfung eines Plans nach skills/plan-writing/references/plan-format.md und task-rules.md, ohne KI.
// Fehler (🔴) verletzen feste Regeln, die der Umsetzer braucht; Warnungen (🟡) sind Heuristiken über Schritte und Verifikation.
// Weiter als TASK_HEADING in plan-tasks.js: Jede Überschrift ### Task <x>: zählt, auch mit einer Nummer wie 3a.
const ANY_TASK_HEADING = /^###\s+Task\s+([^\s:]+)\s*:/;
const SECTION = /^##\s+(.+?)\s*$/;
const HEAD_KEYS = ['Ziel', 'Architektur', 'Tech-Stack', 'Spec', 'Basis'];
// TBD und TODO nur in Großschreibung als eigenes Wort (nicht Todo-App, todo-Liste, todos); Bindestrich-Zusammensetzungen wie TODO-Liste zählen nicht.
const PLACEHOLDERS = [/(?<![\w-])TBD(?![\w-])/, /(?<![\w-])TODO(?![\w-])/, /später umsetzen/i, /Details ergänzen/i, /passende Fehlerbehandlung ergänzen/i,
  /Validierung hinzufügen/i, /Randfälle behandeln/i, /\b(?:wie|analog zu) Task \d+[a-z]?\b/i];
const CODE_PLACEHOLDER = /(?:\/\/|#|\/\*|<!--|--)\s*(?:TODO|FIXME)\b/;
const INLINE_CODE = /`[^`]*`/g;
const FILE_LINE = /^\s*-\s*(Create|Modify|Test):\s*`?([^`\s]+)/;
const ABSOLUTE = /^(?:[/\\~]|[A-Za-z]:[\\/])/;
const STEP = /^- \[[ xX]\] \*\*Schritt (\d+)\b/;
const COMMAND = /\bBefehl:/;
const EXPECTED = /\berwartet\s*:/i;
const TEST_PATH = /test|spec/i;
const CONSUMES_OPEN = /^OFFEN Task (\d+) Consumes (.+?): (.+)$/;
const LATER_PRODUCER = /erst in Task \d+/;
const DECISIONS = 'Entscheidungen';

function issue(rule, severity, location, quote, message) {
  return { rule, severity, location, quote, message };
}

// Dieselbe Zerlegung wie die Umsetzung, nur mit der weiteren Überschrift.
function readPlan(text) {
  const lines = splitLines(text);
  const fenced = markFences(lines);
  const tasks = taskSections(lines, ANY_TASK_HEADING, fenced).map((task) => ({ ...task, heading: lines[task.start] }));
  return { lines, fenced, tasks };
}

function taskAt(plan, index) {
  return plan.tasks.find((task) => index >= task.start && index < task.end) ?? null;
}

// Stelle einer Zeile: der Task, sonst der Abschnitt davor, vor dem ersten Abschnitt der Kopf.
function locationAt(plan, index) {
  const task = taskAt(plan, index);
  if (task) return `Task ${task.token}`;
  for (let at = index; at >= 0; at -= 1) {
    const section = plan.fenced[at] ? null : SECTION.exec(plan.lines[at]);
    if (section) return section[1];
  }
  return 'Kopf';
}

function sectionNames(plan) {
  return plan.lines.map((line, index) => (plan.fenced[index] ? null : SECTION.exec(line)?.[1] ?? null)).filter(Boolean);
}

function placeholderIssue(plan, index, text, rule) {
  return issue(rule, 'fehler', locationAt(plan, index), plan.lines[index].trim(),
    `Platzhalter statt Inhalt: „${text}“; der Umsetzer müsste raten.`);
}

// Im Fließtext die feste Phrasenliste (ohne Code-Spans und ohne den Abschnitt Entscheidungen, der Findings zitiert), im Code-Block nur TODO-Kommentare.
function placeholderIssues(plan) {
  const found = [];
  let inDecisions = false;
  plan.lines.forEach((line, index) => {
    if (plan.fenced[index]) {
      const match = CODE_PLACEHOLDER.exec(line);
      if (match && !inDecisions) found.push(placeholderIssue(plan, index, match[0], 'platzhalter-code'));
      return;
    }
    const section = SECTION.exec(line);
    if (section) inDecisions = section[1] === DECISIONS;
    if (inDecisions) return;
    const prose = line.replace(INLINE_CODE, '');
    const hit = PLACEHOLDERS.map((pattern) => pattern.exec(prose)).find(Boolean);
    if (hit) found.push(placeholderIssue(plan, index, hit[0], 'platzhalter'));
  });
  return found;
}

function headIssues(plan) {
  const end = plan.lines.findIndex((line, index) => !plan.fenced[index] && (SECTION.test(line) || ANY_TASK_HEADING.test(line)));
  const head = plan.lines.slice(0, end < 0 ? undefined : end);
  const missing = HEAD_KEYS.filter((key) => !head.some((line) => new RegExp(`^\\*\\*${key}:\\*\\*\\s*\\S`).test(line)));
  return missing.map((key) => issue('kopf-zeile', 'fehler', 'Kopf', `**${key}:**`, `Die Pflichtzeile **${key}:** fehlt im Plan-Kopf.`));
}

function sectionIssues(plan) {
  const names = sectionNames(plan);
  const found = [];
  if (!names.includes('Global Constraints')) {
    found.push(issue('abschnitt-fehlt', 'fehler', 'Global Constraints', '## Global Constraints', 'Der Abschnitt ## Global Constraints fehlt; die Tasks erben ihn.'));
  }
  if (!names.includes(DECISIONS)) {
    found.push(issue('abschnitt-fehlt', 'fehler', DECISIONS, '## Entscheidungen', 'Der Abschnitt ## Entscheidungen fehlt.'));
  } else if (names[names.length - 1] !== DECISIONS) {
    found.push(issue('abschnitt-reihenfolge', 'fehler', DECISIONS, `## ${names[names.length - 1]}`, 'Der Abschnitt ## Entscheidungen muss der letzte ##-Abschnitt sein.'));
  }
  return found;
}

// Zeilen eines Tasks ohne Code-Blöcke: [{ text, index }].
function proseLines(plan, task) {
  const rows = [];
  for (let index = task.start; index < task.end; index += 1) if (!plan.fenced[index]) rows.push({ text: plan.lines[index], index });
  return rows;
}

// Schritte eines Tasks mit allen Zeilen bis zum nächsten Schritt, Code-Blöcke eingeschlossen.
function stepsOf(plan, task) {
  const steps = [];
  for (let index = task.start; index < task.end; index += 1) {
    const match = plan.fenced[index] ? null : STEP.exec(plan.lines[index]);
    if (match) steps.push({ number: Number(match[1]), line: plan.lines[index], start: index, end: task.end });
    else if (steps.length > 0) steps[steps.length - 1].end = index + 1;
  }
  return steps;
}

function stepIssues(plan, task) {
  const location = `Task ${task.token}`;
  const steps = stepsOf(plan, task);
  if (steps.length === 0) return [issue('schritte-fehlen', 'warnung', location, task.heading, 'Der Task hat keine Schritte `- [ ] **Schritt <n>: …**`.')];
  const found = [];
  const wrong = steps.findIndex((step, index) => step.number !== index + 1);
  if (wrong >= 0) found.push(issue('schritte-luecke', 'warnung', location, steps[wrong].line, `An Position ${wrong + 1} steht Schritt ${steps[wrong].number}; Schritte zählen lückenlos ab 1.`));
  for (const step of steps) {
    const body = plan.lines.slice(step.start, step.end).filter((line, offset) => !plan.fenced[step.start + offset]).join('\n');
    if (COMMAND.test(body) && !EXPECTED.test(body)) {
      found.push(issue('erwartet-fehlt', 'warnung', location, step.line, `Schritt ${step.number} nennt einen Befehl, aber kein „erwartet:“.`));
    }
  }
  return found;
}

function verifies(plan, task) {
  return proseLines(plan, task).some(({ text }) => {
    const file = FILE_LINE.exec(text);
    if (file) return file[1] === 'Test' || (file[1] === 'Create' && TEST_PATH.test(file[2]));
    return false;
  }) || stepsOf(plan, task).some((step) => {
    const body = plan.lines.slice(step.start, step.end).join('\n');
    return COMMAND.test(body) && EXPECTED.test(body);
  });
}

function verificationIssues(plan, task) {
  if (verifies(plan, task)) return [];
  return [issue('verifikation-fehlt', 'warnung', `Task ${task.token}`, task.heading, 'Der Task hat weder einen Befehl mit „erwartet:“ noch eine Testdatei (Test:/Create:).')];
}

function pathIssues(plan, task) {
  return proseLines(plan, task).map(({ text }) => FILE_LINE.exec(text)).filter((match) => match && ABSOLUTE.test(match[2]))
    .map((match) => issue('pfad-absolut', 'fehler', `Task ${task.token}`, match[0].trim(), `Der Pfad ${match[2]} ist absolut; Pfade sind relativ zur Checkout-Wurzel.`));
}

function taskIssues(plan) {
  return plan.tasks.flatMap((task) => [...stepIssues(plan, task), ...verificationIssues(plan, task), ...pathIssues(plan, task)]);
}

// Regeln 1 bis 5 aus plan-format.md und task-rules.md, nur auf dem Text.
function lintFormat(text) {
  const plan = readPlan(text);
  return [...placeholderIssues(plan), ...headIssues(plan), ...sectionIssues(plan), ...taskIssues(plan)];
}

// Ein Consumes ohne Produces in einem früheren Task; die Zuordnung liefert der Vorab-Scan, den Kandidaten ohne Symbol meldet er nur als offen.
// Produziert ein späterer Task das Symbol, ist die Reihenfolge falsch (🔴); fehlt jedes Produces, kann es Bestandscode im Repo sein (🟡).
function lintConsumes(text) {
  let lines;
  try {
    lines = scanPlanLines(describePlan(text));
  } catch (error) {
    if (error instanceof PlanError) return [];
    throw error;
  }
  return lines.map((line) => CONSUMES_OPEN.exec(line.text)).filter((match) => match && !match[3].startsWith('kein Symbol'))
    .map(([, task, entry, reason]) => {
      if (LATER_PRODUCER.test(reason)) {
        return issue('consumes', 'fehler', `Task ${task}`, `Consumes: ${entry}`, `Der Task braucht ${entry}, das kein früherer Task produziert (${reason}).`);
      }
      return issue('consumes-bestand', 'warnung', `Task ${task}`, `Consumes: ${entry}`, `Kein früherer Task produziert ${entry}; existiert es im Repo, ist das in Ordnung (${reason}).`);
    });
}

function lintPlan(text) {
  return [...lintFormat(text), ...lintConsumes(text)];
}

// Befund im Format der Skript-Prüfungen des Plan-Reviews; Warnungen sind 🟡 Kandidaten.
function toFinding(entry) {
  return {
    location: entry.location,
    quote: entry.quote,
    category: entry.severity === 'fehler' ? 'umsetzer-steckt-fest' : 'detail',
    consequence: entry.message,
    rationale: `Skript-Prüfung Plan-Format, Regel ${entry.rule}`,
    ...(entry.severity === 'fehler' ? {} : { color: 'yellow' }),
  };
}

function formatIssues(issues) {
  const errors = issues.filter((entry) => entry.severity === 'fehler').length;
  const head = `LINT fehler=${errors} warnungen=${issues.length - errors}`;
  return { text: [head, ...issues.map((entry) => `${entry.severity.toUpperCase()} ${entry.rule} · ${entry.location}: ${entry.message}`)].join('\n'), exit: errors > 0 ? 1 : 0 };
}

function lintReport(text) {
  return formatIssues(lintPlan(text));
}

module.exports = { lintPlan, lintFormat, lintConsumes, lintReport, toFinding, readPlan, ANY_TASK_HEADING };
