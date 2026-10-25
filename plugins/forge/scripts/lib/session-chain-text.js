'use strict';

// Feste Textblöcke der Leit-Session: Haltepunkte, Hinweise, übernommener Zustand und Schlussbericht der Kette.
// Reine Funktionen; die Leit-Session gibt die Blöcke unverändert aus.

const { pointLine } = require('./session-chain-points');

const NONE = 'Keine.';
const CHOICES = { spec: 'Planning · Spec-Nacharbeit · Stopp', go: 'GO · Plan-Nacharbeit · Stopp' };
// Codewort für den späteren Einstieg je Haltepunkt, an dem gestoppt wurde.
const RESUME = {
  spec: (state) => `/dv-forge:session-orchestrator planning ${state.spec}`,
  go: (state) => `/dv-forge:session-orchestrator implementation ${state.spec} ${state.plan}`,
};

function pointLines(points) {
  return points && points.length > 0 ? points.map(pointLine) : [NONE];
}

function sessionLink(session) {
  return `[Session](#${session})`;
}

function recommendationLine({ empfehlung, grund }) {
  return `**Empfehlung:** ${empfehlung}${grund ? ` — ${grund}` : ''}`;
}

// Aufruf der Umsetzung, wie ihn der GO-Haltepunkt zeigt und die Umsetzungs-Etappe startet; ohne Workitem ohne Nummer.
function goCall({ plan, spec, wi, basis }) {
  return `/dv-forge:implementation-orchestrator ${plan} ${spec}${wi ? ` ${wi}` : ''} --base ${basis}`;
}

function specHalt({ result, recommendation, points }) {
  return [
    '# Spec-Haltepunkt',
    `**Ergebnis:** ${result ?? 'keine Ergebnis-Zeile'}`,
    recommendationLine(recommendation),
    '**Offene Punkte:**',
    ...pointLines(points),
    `**Auswahl:** ${CHOICES.spec}`,
  ].join('\n');
}

// Ohne Plan-Review-Ergebnis (`result` null) fehlt die Ergebnis-Zeile.
function goHalt({ spec, plan, wi, basis, result, recommendation, points }) {
  return [
    '# GO-Haltepunkt',
    `**Spec:** ${spec}`,
    `**Plan:** ${plan}`,
    ...(result ? [`**Ergebnis:** ${result}`] : []),
    recommendationLine(recommendation),
    '**Offene Punkte:**',
    ...pointLines(points),
    `**Aufruf:** ${goCall({ plan, spec, wi, basis })}`,
    `**Auswahl:** ${CHOICES.go}`,
  ].join('\n');
}

function noStatusHint({ etappe, session }) {
  return `${etappe}: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · ${sessionLink(session)}`;
}

function showstopperText({ gruende, session }) {
  return ['# Showstopper der Umsetzung', ...gruende.map((grund) => `- ${grund}`), `Klären in der Umsetzungs-Session: ${sessionLink(session)}`].join('\n');
}

function deviationText({ etappe, abweichungen, session }) {
  return [`# Abweichung in der Etappe ${etappe}`, ...abweichungen.map((line) => `- ${line}`), `Die Kette hält. Etappen-Session: ${sessionLink(session)}`].join('\n');
}

function adoptedText(state) {
  return [
    `Zustand übernommen: ${state.slug}`,
    `**Basis-Branch:** ${state.basis ?? 'unbekannt'}`,
    ...(state.etappe ? [`**Letzte Etappe:** ${state.etappe}`] : []),
    '**Offene Punkte:**',
    ...pointLines(state.offen),
    '**Entscheidungen:**',
    ...((state.entscheidungen ?? []).length > 0 ? state.entscheidungen.map((entry) => `- ${entry.etappe}: ${entry.text}`) : [NONE]),
  ].join('\n');
}

function etappeLines(state) {
  const lines = (state.etappen ?? []).map((entry) => `- ${entry.etappe}: ${entry.ergebnis ?? 'ohne Ergebnis-Zeile'} · ${sessionLink(entry.session)}`);
  return lines.length > 0 ? lines : [NONE];
}

function checkedLines(state) {
  const lines = [
    ...(state.etappen ?? []).flatMap((entry) => (entry.geprueft ?? []).map((line) => `- ${entry.etappe}: ${line}`)),
    ...(state.commits ?? []).filter((entry) => entry.etappe === 'leit-session').map((entry) => `- leit-session: Commit ${entry.hash}: ${entry.dateien.join(', ')}`),
  ];
  return lines.length > 0 ? lines : [NONE];
}

function reportedLines(state) {
  const lines = (state.etappen ?? []).flatMap((entry) => [
    ...(entry.ergebnis ? [`- ${entry.etappe}: Ergebnis ${entry.ergebnis}`] : []),
    ...(entry.tests ? [`- ${entry.etappe}: Testzahlen ${entry.tests}`] : []),
  ]);
  return lines.length > 0 ? lines : [NONE];
}

// Haltepunkt, an dem die Kette steht: der offene oder, nach `answer stopp`, der beantwortete (die Antwort schließt den offenen).
function haltOf(state) {
  return state.halt ?? (state.freigabe?.antwort === 'stopp' ? state.freigabe.halt : null);
}

// Schlussbericht: `stopp` nennt das Codewort für den späteren Einstieg; mit Workitem den optionalen Abschluss im Workitem.
function finalReport(state, { stopp = false } = {}) {
  const resume = stopp && RESUME[haltOf(state)] ? ['## Fortsetzen', RESUME[haltOf(state)](state)] : [];
  const workitem = state.wi ? ['## Workitem', `Optional: \`finishing-workitem ${state.wi}\``] : [];
  return [
    `# Schlussbericht der Session-Kette ${state.slug}`,
    '## Etappen', ...etappeLines(state),
    '## Geprüft', ...checkedLines(state),
    '## Gemeldet', ...reportedLines(state),
    '## Offene Punkte', ...pointLines(state.offen),
    ...resume,
    ...workitem,
  ].join('\n');
}

module.exports = { goCall, specHalt, goHalt, noStatusHint, showstopperText, deviationText, adoptedText, finalReport };
