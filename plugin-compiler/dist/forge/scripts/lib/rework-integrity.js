'use strict';

const { isDecisionSection } = require('./places');

// Reine Prüfungen auf dem Text vor (`vorher.md`) und nach der Nacharbeit; jede liefert den Grund oder null.
const SECTION = /^## (.+?)\s*$/;
const FENCE = /^\s*(?:```|~~~)/;
const ABORT_HEADING = '## Offen, bewusst nicht weiterverfolgt (Abbruch)';
const W_ENTRY = /^- \*\*W · (.+?)\*\*/;
const OLD_ENTRY = /^- \*\*(?:R\d+|E|F) · (.+?)\*\*/;
const ANY_ENTRY = /^- \*\*(?:W|E|F|R\d+) · /;
const AC_ITEM = /^- \*\*(AC-\d+)\*\*/;
const TASK_HEADING = /^### Task (\d+):/;
const HEAD_LINE = /^\**(Status|Art|Basis|Workitem):/;

function linesOf(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

// Zeilen mit ihrem Abschnitt und dem Merkmal, ob sie in einem Code-Block stehen; der Kopf steht vor dem ersten `## `.
function scan(text) {
  let section = null;
  let inFence = false;
  return linesOf(text).map((line) => {
    if (FENCE.test(line)) inFence = !inFence;
    const match = inFence ? null : SECTION.exec(line);
    if (match) section = match[1];
    return { line, section, inFence };
  });
}

function entryTitle(line) {
  return (W_ENTRY.exec(line) ?? OLD_ENTRY.exec(line))[1];
}

function wEntryProblem(before, after) {
  const now = new Set(after.map((item) => item.line));
  const lost = before.find((item) => W_ENTRY.test(item.line) && !now.has(item.line));
  return lost ? `W-Eintrag geändert: ${entryTitle(lost.line)}` : null;
}

// Abschnitt von seiner Überschrift bis vor die nächste Überschrift der zweiten Ebene.
function sectionText(items, heading) {
  const start = items.findIndex((item) => item.line === heading && !item.inFence);
  if (start < 0) return null;
  const next = items.findIndex((item, index) => index > start && !item.inFence && SECTION.test(item.line));
  return items.slice(start, next < 0 ? undefined : next).map((item) => item.line).join('\n');
}

function abortProblem(before, after) {
  const was = sectionText(before, ABORT_HEADING);
  return was !== null && was !== sectionText(after, ABORT_HEADING) ? 'Abbruch-Abschnitt geändert' : null;
}

function numbered(items, pattern) {
  return items.filter((item) => !item.inFence).map((item) => pattern.exec(item.line)).filter(Boolean).map((match) => match[1]);
}

// Die Folge der Nummern vorher bleibt als Anfang der Folge erhalten; neue stehen nur hinten.
function sequenceProblem(before, after, pattern, noun) {
  const was = numbered(before, pattern);
  const now = numbered(after, pattern);
  const missing = was.find((id) => !now.includes(id));
  if (missing !== undefined) return `${noun} verschwunden: ${noun === 'Task' ? `Task ${missing}` : missing}`;
  return was.every((id, index) => now[index] === id) ? null : `${noun}-Nummerierung geändert`;
}

function numberingProblem(before, after, review) {
  if (review === 'plan-review') return sequenceProblem(before, after, TASK_HEADING, 'Task');
  return sequenceProblem(before, after, AC_ITEM, 'AC');
}

function entryProblem(before, after) {
  const now = new Set(after.map((item) => item.line));
  const changed = before.find((item) => !item.inFence && OLD_ENTRY.test(item.line) && !now.has(item.line));
  if (changed) return `Eintrag geändert: ${entryTitle(changed.line)}`;
  const was = new Set(before.map((item) => item.line));
  const stray = after.find((item) => !item.inFence && ANY_ENTRY.test(item.line) && !was.has(item.line) && !isDecisionSection(item.section ?? ''));
  return stray ? `Eintrag außerhalb von Entscheidungen: ${stray.line.slice(0, 60)}` : null;
}

function headLines(items) {
  const end = items.findIndex((item) => SECTION.test(item.line) && !item.inFence);
  const head = end < 0 ? items : items.slice(0, end);
  return new Map(head.map((item) => HEAD_LINE.exec(item.line) && [HEAD_LINE.exec(item.line)[1], item.line]).filter(Boolean));
}

function headProblem(before, after) {
  const now = headLines(after);
  const changed = [...headLines(before)].find(([key, line]) => now.get(key) !== line);
  return changed ? `Kopf geändert: ${changed[0]}` : null;
}

// Erster Verstoß der Nacharbeit gegen die festen Regeln, sonst null.
function integrityProblem(beforeText, afterText, review) {
  const before = scan(beforeText);
  const after = scan(afterText);
  const checks = [
    () => wEntryProblem(before, after),
    () => (review === 'spec-review' ? abortProblem(before, after) : null),
    () => numberingProblem(before, after, review),
    () => entryProblem(before, after),
    () => headProblem(before, after),
  ];
  for (const check of checks) {
    const problem = check();
    if (problem) return problem;
  }
  return null;
}

// Die Spec bleibt im Plan-Review unverändert: Hash bei `snapshot` gegen den Hash jetzt.
function specProblem(savedHash, currentHash) {
  return savedHash === null || savedHash === currentHash ? null : 'Spec geändert';
}

// Zahl der W-Einträge außerhalb von Code-Blöcken.
function wEntryCount(text) {
  return scan(text).filter((item) => !item.inFence && W_ENTRY.test(item.line)).length;
}

module.exports = { integrityProblem, specProblem, wEntryCount };
