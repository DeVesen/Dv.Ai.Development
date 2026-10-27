'use strict';

// Prüft Befundbericht und Prüfprotokoll eines Pakets von harness-refactoring gegen das feste Paketformat.

const { linesOf, section, sectionsMatching, field, items, missingHeadings } = require('./harness-markdown');

const RESULTS = ['Umbau', 'kein Umbau nötig', 'außerhalb des Scopes'];
const FINDINGS_HEADINGS = ['## Kettenkarte', '## Befunde', '## Rückmeldungen', '## Nicht zuordenbar', '## Außerhalb des Scopes', '## Nicht belegbar', '## Entscheidungen'];
const FINDING = /^- \*\*(B-\d{2})\*\* (🔴|🟡|🟢) `[^`]+:\d+` — \S/;
const FEEDBACK = /^- \*\*(R-\d{2})\*\* \S.* → (`[^`]+:\d+`|nicht zuordenbar)$/;
const ANNOTATION = /^- (🔴|🟡|🟢) \S.* → (Korrektur: \S.*|offen)$/;
const NO_ANNOTATION = '- keine Anmerkungen';
const MAX_CHECKERS = 4;
const MIN_ROUNDS = 2;
const MAX_ROUNDS = 8;

function checkFindingLines(text, errors) {
  const green = new Set();
  for (const line of items(section(text, '## Befunde'))) {
    const match = FINDING.exec(line);
    if (!match) errors.push(`BEFUNDE.md: Befund ohne Kennung, Einstufung oder Datei:Zeile: ${line}`);
    else if (match[2] === '🟢') green.add(match[1]);
  }
  return green;
}

function checkFeedbackLines(text, errors) {
  const reasons = items(section(text, '## Nicht zuordenbar'));
  for (const line of items(section(text, '## Rückmeldungen'))) {
    const match = FEEDBACK.exec(line);
    if (!match) errors.push(`BEFUNDE.md: Rückmeldung ohne Kennung oder Zuordnung: ${line}`);
    else if (match[2] === 'nicht zuordenbar' && !reasons.some((reason) => reason.startsWith(`- **${match[1]}** `) && reason.length > `- **${match[1]}** `.length)) {
      errors.push(`BEFUNDE.md: ${match[1]} ist nicht zuordenbar, steht aber ohne Grund unter Nicht zuordenbar`);
    }
  }
}

// Ergebnis, Fehler und die Kennungen der 🟢-Befunde, die keinen Task bekommen dürfen.
function checkFindings(text) {
  const errors = missingHeadings(text, FINDINGS_HEADINGS).map((heading) => `BEFUNDE.md: Abschnitt fehlt: ${heading}`);
  const result = field(linesOf(text), 'Ergebnis');
  if (!RESULTS.includes(result)) errors.push(`BEFUNDE.md: Ergebnis fehlt oder ist keiner von: ${RESULTS.join(' | ')}`);
  if (result === 'außerhalb des Scopes' && items(section(text, '## Außerhalb des Scopes')).length === 0) {
    errors.push('BEFUNDE.md: Ergebnis außerhalb des Scopes, aber der Abschnitt Außerhalb des Scopes ist leer');
  }
  const green = checkFindingLines(text, errors);
  checkFeedbackLines(text, errors);
  return { result, errors, green };
}

function checkRound(round, number, errors) {
  const annotations = items(round.lines);
  if (annotations.length === 0) errors.push(`PRUEFPROTOKOLL.md: Plan-Prüfrunde ${number} ohne Anmerkungszeile`);
  for (const line of annotations.filter((candidate) => candidate !== NO_ANNOTATION && !ANNOTATION.test(candidate))) {
    errors.push(`PRUEFPROTOKOLL.md: Plan-Prüfrunde ${number}: Anmerkung ohne Einstufung oder Korrektur: ${line}`);
  }
  const counted = annotations.filter((line) => line.startsWith('- 🔴') && line.endsWith('→ offen')).length;
  const open = field(round.lines, 'Offen 🔴');
  if (open === null || Number(open) !== counted) errors.push(`PRUEFPROTOKOLL.md: Plan-Prüfrunde ${number}: Offen 🔴 passt nicht zu ${counted} offenen 🔴-Anmerkungen`);
  return counted;
}

// Nummer der Runde, die auf eine saubere Runde (ab MIN_ROUNDS, ohne offenes 🔴) folgt; null, wenn die saubere Runde die letzte ist.
function roundAfterClean(open) {
  const rounds = open.map((count, index) => ({ count, number: index + 1 }));
  const clean = rounds.find((round) => round.count === 0 && round.number >= MIN_ROUNDS && round.number < rounds.length);
  return clean ? clean.number + 1 : null;
}

function checkRounds(text, status) {
  const errors = [];
  const rounds = sectionsMatching(text, /^## Plan-Prüfrunde (\d+)$/);
  if (rounds.length < MIN_ROUNDS || rounds.length > MAX_ROUNDS) errors.push(`PRUEFPROTOKOLL.md: ${rounds.length} Plan-Prüfrunden, erlaubt sind ${MIN_ROUNDS} bis ${MAX_ROUNDS}`);
  const open = rounds.map((round, index) => {
    if (Number(round.match[1]) !== index + 1) errors.push(`PRUEFPROTOKOLL.md: Plan-Prüfrunde ${round.match[1]} steht an Stelle ${index + 1}`);
    return checkRound(round, index + 1, errors);
  });
  const unneeded = roundAfterClean(open);
  if (unneeded !== null) errors.push(`PRUEFPROTOKOLL.md: Plan-Prüfrunde ${unneeded} folgt auf eine Runde ohne offenes 🔴`);
  if (open.length === 0) return errors;
  const last = open.at(-1);
  const expected = last === 0 ? 'abgabefähig' : 'nicht abgabefähig';
  if (status !== expected) errors.push(`PRUEFPROTOKOLL.md: Status muss ${expected} lauten`);
  if (last > 0 && open.length < MAX_ROUNDS) errors.push(`PRUEFPROTOKOLL.md: 🔴 offen nach Plan-Prüfrunde ${open.length}, aber weniger als ${MAX_ROUNDS} Runden`);
  return errors;
}

// Ohne Umbau gibt es keinen Plan und damit weder Alt-Block-Prüfung, Probelauf noch Plan-Prüfrunden.
function checkProtocol(text, withPlan) {
  const lines = linesOf(text);
  const errors = [];
  const checkers = field(lines, 'Prüf-Subagents');
  const minimum = withPlan ? 1 : 0;
  if (checkers === null || !/^\d+$/.test(checkers) || Number(checkers) < minimum || Number(checkers) > MAX_CHECKERS) {
    errors.push(`PRUEFPROTOKOLL.md: Prüf-Subagents fehlt oder liegt nicht zwischen ${minimum} und ${MAX_CHECKERS}`);
  }
  if (!withPlan) return errors;
  for (const heading of ['## Alt-Block-Prüfung', '## Probelauf-Prüfung']) {
    if (items(section(text, heading)).length === 0) errors.push(`PRUEFPROTOKOLL.md: kein Eintrag unter ${heading}`);
  }
  return [...errors, ...checkRounds(text, field(lines, 'Status'))];
}

module.exports = { checkFindings, checkProtocol, FINDINGS_HEADINGS, MAX_CHECKERS, MIN_ROUNDS, MAX_ROUNDS };
