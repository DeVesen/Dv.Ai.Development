'use strict';

// Brief einer Etappen-Session: erste Zeile Slash-Befehl des Skills (bei den Nacharbeiten die Auftragszeile), dann Werte,
// Auftrag, Entscheidungen früherer Etappen, beim Whiteboarding der Kontext, zuletzt der Inhalt von base-sub-agent.md.
// Werte ohne Inhalt (etwa kein Workitem) fehlen im Brief ganz.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { SessionChainError, checkedEtappe } = require('./session-chain-store');
const { goCall } = require('./session-chain-text');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
const BASE_FILE = path.join(PLUGIN_ROOT, 'shared', 'session-chain', 'base-sub-agent.md');

function withWi(command, wi) {
  return wi ? `${command} ${wi}` : command;
}

function ablage(etappe) {
  return `Ruf den Skill mit den Argumenten der ersten Zeile und zusätzlich \`--ablage ${etappe}\` auf.`;
}

// Zeile der beiden Nacharbeiten: Kein Skill liefert ihren Bericht, also schreibt ihn die Etappe selbst.
const REWORK_REPORT = 'Schreib einen kurzen Bericht (geänderte Stellen als Vorher/Nachher, neue W-Einträge) in eine Datei und übergib sie mit `--bericht "<datei>"`.';

// Je Etappe: Modell, Titel, Pflichtwerte, erste Zeile und Auftrag. `v`: slug, wi, basis, spec, plan, worktree, branch, quelle.
// Fehlt ein Pflichtwert, entsteht kein Brief (sonst stünde `undefined` im Befehl der ersten Zeile).
const ETAPPEN_BRIEFS = {
  whiteboarding: {
    modell: 'sonnet', titel: 'Whiteboarding', pflicht: [],
    command: () => '/dv-forge:spec-whiteboarding-with-docs',
    auftrag: () => [
      'Eingabe des Whiteboardings ist der Abschnitt „Kontext“ unten.',
      'Berichtsdatei ohne `--bericht`, mit `--spec "<deine Spec>"`.',
    ],
  },
  grill: {
    modell: 'opus', titel: 'Grill', pflicht: ['spec'],
    command: (v) => `/dv-forge:spec-grilling ${v.spec}`,
    auftrag: () => [
      'Schreib den Abschlussbericht von spec-grilling (Liste der geänderten Stellen, neue W-Einträge) in eine Datei und übergib sie mit `--bericht "<datei>"`.',
      'Jede geänderte Glossar- oder ADR-Datei mit `--datei`.',
    ],
  },
  'spec-review': {
    modell: 'sonnet', titel: 'Spec-Review', pflicht: ['spec'],
    command: (v) => withWi(`/dv-forge:spec-review-orchestrator ${v.spec}`, v.wi),
    auftrag: () => [ablage('spec-review'), 'Der Skill committet die Spec selbst. `--bericht` ist sein Abschlussbericht.'],
  },
  'spec-nacharbeit': {
    modell: 'opus', titel: 'Spec-Nacharbeit', pflicht: ['spec', 'quelle'],
    command: (v) => `Spec-Nacharbeit ${v.spec}`,
    auftrag: (v) => [
      `Kein Skill. Lies den Bericht der letzten Review-Etappe: ${v.quelle}.`,
      'Kläre mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag, eine Frage nach der anderen.',
      'Jede Änderung der Spec legst du als Vorher/Nachher vor und schreibst sie erst nach Bestätigung. Neue Entscheidungen werden W-Einträge unter `## Entscheidungen`.',
      `Danach committest du nur die Spec: \`git commit -m "<betreff>" -- "${v.spec}"\`.`,
      REWORK_REPORT,
    ],
  },
  planning: {
    modell: 'opus', titel: 'Planning', pflicht: ['spec'],
    command: (v) => withWi(`/dv-forge:plan-orchestrator ${v.spec}`, v.wi),
    auftrag: () => [ablage('planning'), 'Der Skill committet nicht. Berichtsdatei mit `--plan "<plan.md>"`; `--bericht` ist sein Abschlussbericht.'],
  },
  'plan-review': {
    modell: 'sonnet', titel: 'Plan-Review', pflicht: ['plan', 'spec'],
    command: (v) => `/dv-forge:plan-review ${v.plan} ${v.spec}`,
    auftrag: (v) => [
      ablage('plan-review'),
      `Danach \`dv-forge:review-followup\` mit \`${v.plan} alle --ablage plan-review\`, solange die letzte Ausgabe \`FOLLOWUP ja\` meldet, höchstens zwei Runden.`,
      'Den Plan schreibst du nicht neu. Die Commit-Frage der Skills bleibt; der Mensch beantwortet sie hier.',
      '`--bericht` ist die `.md`-Datei zur letzten `ABLAGE`-Zeile (gleicher Name, `.md` statt `.json`).',
    ],
  },
  'plan-nacharbeit': {
    modell: 'opus', titel: 'Plan-Nacharbeit', pflicht: ['plan', 'spec', 'quelle'],
    command: (v) => `Plan-Nacharbeit ${v.plan} ${v.spec}`,
    auftrag: (v) => [
      `Kein Skill. Lies den Bericht der letzten Review-Etappe: ${v.quelle}.`,
      'Kläre mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag, eine Frage nach der anderen.',
      'Jede Änderung des Plans legst du als Vorher/Nachher vor und schreibst sie erst nach Bestätigung. Neue Entscheidungen werden W-Einträge unter `## Entscheidungen`.',
      'Du committest nicht; den Plan committet die Leit-Session nach dem GO.',
      REWORK_REPORT,
    ],
  },
  umsetzung: {
    modell: 'opus', titel: 'Umsetzung', pflicht: ['plan', 'spec', 'basis'],
    command: (v) => goCall(v),
    auftrag: () => [
      ablage('umsetzung'),
      'Einen Showstopper klärst du mit dem Menschen hier.',
      'Geh vor der Berichtsdatei die Akzeptanz-Findings des Reviews aller Farben (🔴, 🟡, 🟢) durch und melde jedes Akzeptanzkriterium ohne beweisenden Test mit `--ac-ohne-test <AC-nn>`, auch wenn das Review es nur als 🟡 führt. Integrationspunkte ohne Test sind davon ausgenommen.',
      'Berichtsdatei mit `--worktree "<R>"`, `--branch <branch>`, `--pruefung <gruen|rot|keine>`, `--luecke "<befehl>"` je nicht lauffähigem Build-, Test- oder Lint-Befehl und `--ac-ohne-test <AC-nn>` je Akzeptanzkriterium ohne beweisenden Test; `--bericht` ist sein Abschlussbericht.',
    ],
  },
  abschluss: {
    modell: 'sonnet', titel: 'Abschluss', pflicht: ['worktree'],
    command: () => '/dv-forge:finish-work',
    auftrag: (v) => [
      `Arbeite in ${v.worktree}. Merk dir vorher den Branch: \`git -C "${v.worktree}" branch --show-current\`.`,
      'Nach erfolgreichem finish-work fragst du den Menschen, ob du pushen sollst. Ohne sein Ja pushst du nicht.',
      'Nach dem Ja: `git push -u origin <branch>` im Haupt-Checkout. Berichtsdatei mit `--branch <branch>`.',
    ],
  },
};

const VALUE_LINES = [['slug', 'Slug'], ['wi', 'Workitem'], ['basis', 'Basis-Branch'], ['spec', 'Spec'], ['plan', 'Plan'], ['worktree', 'Worktree']];

// Ohne Slug (Whiteboarding) nennt der Brief, woher er kommt: Das Whiteboarding legt ihn mit der Spec fest.
const SLUG_FROM_SPEC = 'folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`)';

function valueLines(values) {
  return VALUE_LINES.map(([key, label]) => {
    if (key === 'slug' && !values.slug) return `- Slug: ${SLUG_FROM_SPEC}`;
    return values[key] ? `- ${label}: ${values[key]}` : null;
  }).filter(Boolean);
}

function reportCommand(etappe, values) {
  const target = values.slug ? `--slug ${values.slug}` : '--spec "<deine Spec>"';
  return `node "${toPosix(PLUGIN_ROOT)}/scripts/session-chain.js" etappe-report --etappe ${etappe} ${target}`;
}

function checkedValues(etappe, etappenBrief, values) {
  const missing = etappenBrief.pflicht.find((key) => !values[key]);
  if (missing) throw new SessionChainError(`Etappe ${etappe}: ${missing} fehlt`);
  return values;
}

function baseRules(etappe, values) {
  return fs.readFileSync(BASE_FILE, 'utf8').replace(/\r\n/g, '\n').trimEnd()
    .replaceAll('{{ETAPPE}}', etappe).replaceAll('{{PLUGIN}}', toPosix(PLUGIN_ROOT)).replaceAll('{{BERICHT}}', reportCommand(etappe, values));
}

// `values`: Werte der Kette; `decisions`: Entscheidungen früherer Etappen ({ etappe, text }); `kontext`: Text, nur Whiteboarding.
function buildBrief({ etappe, values, decisions = [], kontext = null }) {
  const etappenBrief = ETAPPEN_BRIEFS[checkedEtappe(etappe)];
  checkedValues(etappe, etappenBrief, values);
  const sections = [
    etappenBrief.command(values),
    `Etappe \`${etappe}\` einer Session-Kette, geführt von einer Leit-Session.`,
    ['## Werte', ...valueLines(values)].join('\n'),
    ['## Auftrag', ...etappenBrief.auftrag(values).map((line) => `- ${line}`)].join('\n'),
    ...(decisions.length > 0 ? [['## Entscheidungen aus früheren Etappen', ...decisions.map((entry) => `- ${entry.etappe}: ${entry.text}`)].join('\n')] : []),
    ...(etappe === 'whiteboarding' ? [['## Kontext', String(kontext ?? '').trim()].join('\n')] : []),
    baseRules(etappe, values),
  ];
  const background = `Etappe ${etappe} der Session-Kette ${values.slug ?? '(Slug folgt aus der Spec)'}. Die Leit-Session führt die Kette, prüft jedes Ergebnis gegen git und holt an Haltepunkten die Entscheidung des Menschen ein. Diese Session bearbeitet nur ihre Etappe und meldet sich nur über ihr Turn-Ende.`;
  return { modell: etappenBrief.modell, titel: `${etappenBrief.titel} ${values.slug ?? ''}`.trim(), brief: sections.join('\n\n'), hintergrund: background };
}

module.exports = { buildBrief, ETAPPEN_BRIEFS, BASE_FILE };
