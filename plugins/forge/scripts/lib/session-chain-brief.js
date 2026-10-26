'use strict';

// Brief einer Etappen-Session: erste Zeile Slash-Befehl des Skills (bei den Nacharbeiten die Auftragszeile), dann Werte,
// Auftrag, Entscheidungen früherer Etappen, im Grill die offenen Punkte früherer Etappen, beim Whiteboarding der Kontext, zuletzt der Inhalt von base-sub-agent.md.
// Werte ohne Inhalt (etwa kein Workitem) fehlen im Brief ganz.

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./posix');
const { SessionChainError, checkedEtappe } = require('./session-chain-store');
const { goCall } = require('./session-chain-text');
const { pointLine } = require('./session-chain-points');

const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
// Modell der Sonnet-Etappen; die Leit-Session übergibt es wörtlich an das Start-Tool, statt es zu raten.
const SONNET_MODEL_ID = 'claude-sonnet-5-5';
const BASE_FILE = path.join(PLUGIN_ROOT, 'shared', 'session-chain', 'base-sub-agent.md');
const CHAIN_SCRIPT = `${toPosix(PLUGIN_ROOT)}/scripts/session-chain.js`;

// Kennung der Leit-Session, an die die Etappen-Session ihr `final` schickt, und ihre Zeile `- Leit-Session: <id>` unter `## Werte`.
// Das eine Format für Brief (erzeugt), CLI `brief --leit` (prüft) und Hook der Etappen-Session (liest). Zeichensatz ohne
// Shell-Zeichen; Unterstrich und Punkt sind erlaubt, weil das Format der Kennung aus `get_session` nicht festgelegt ist.
const LEIT_LABEL = 'Leit-Session';
const LEIT_ID_PATTERN = 'local_[A-Za-z0-9_.-]+';
const LEIT_ID = new RegExp(`^${LEIT_ID_PATTERN}$`);

function withWi(command, wi) {
  return wi ? `${command} ${wi}` : command;
}

function ablage(etappe) {
  return `Ruf den Skill mit den Argumenten der ersten Zeile und zusätzlich \`--ablage ${etappe}\` auf.`;
}

// Zeile der beiden Nacharbeiten: Kein Skill liefert ihren Bericht, also schreibt ihn die Etappe selbst.
const REWORK_REPORT = 'Schreib einen kurzen Bericht (geänderte Stellen als Vorher/Nachher, neue W-Einträge) in eine Datei und übergib sie mit `--bericht "<datei>"`.';

// Je Etappe: Modell, Titel, Pflichtwerte, erste Zeile und Auftrag. `v`: slug, wi, basis, spec, plan, worktree, branch, quelle, leit.
// Fehlt ein Pflichtwert, entsteht kein Brief (sonst stünde `undefined` im Befehl der ersten Zeile).
const ETAPPEN_BRIEFS = {
  whiteboarding: {
    modell: 'sonnet', titel: 'Whiteboarding', pflicht: [],
    command: () => '/dv-forge:spec-whiteboarding-with-docs',
    auftrag: () => [
      'Eingabe des Whiteboardings ist der Abschnitt „Kontext“ unten.',
      'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session. Die Übergabe deines Skills (Review-Befehl, frische Session) gibst du nicht aus.',
      'Nach der Bestätigung und dem Schreiben der Spec rufst du ohne Rückfrage in dieser Session über das Skill-Werkzeug `dv-forge:spec-review-orchestrator` mit `"<deine Spec>" --ablage whiteboarding --whiteboarding` auf.',
      `Nach jedem Review-Lauf: \`node "${CHAIN_SCRIPT}" review-stand --spec "<deine Spec>"\`. \`FRAGE=nein\`: Etappe abschließen. \`FRAGE=ja\`: am Ende deiner Antwort die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“, Status \`needs-user\`.`,
      'Scheitert `review-stand` mit „Kein Spec-Review in der Ablage“: Review erneut aufrufen; scheitert es wieder, Status `needs-user` mit der Fehlermeldung, nicht abschließen.',
      '„Weiter an der Spec arbeiten“: jede Änderung als Vorher/Nachher, erst nach Bestätigung schreiben, danach erneut das Review und `review-stand`. Änderungen der Followup-Runden lösen kein weiteres Review aus.',
      'Abschließen: Berichtsdatei mit `--spec "<deine Spec>"` und `--bericht "<ABSCHLUSS aus review-stand>"`, dazu `--datei` je geänderter Glossar- oder ADR-Datei.',
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
      'Berichtsdatei mit `--worktree "<R>"`, `--branch <branch>`, `--pruefung-datei "<pruefung.json des Orchestrators>"` (ohne Prüflauf `--pruefung keine`), `--luecke "<befehl>"` je nicht lauffähigem Build-, Test- oder Lint-Befehl und `--ac-ohne-test <AC-nn>` je Akzeptanzkriterium ohne beweisenden Test; `--bericht` ist sein Abschlussbericht.',
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

const VALUE_LINES = [['slug', 'Slug'], ['wi', 'Workitem'], ['basis', 'Basis-Branch'], ['spec', 'Spec'], ['plan', 'Plan'], ['worktree', 'Worktree'], ['leit', LEIT_LABEL]];

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

// `values`: Werte der Kette (mit `leit`, der Kennung der Leit-Session); `decisions`: Entscheidungen früherer Etappen ({ etappe, text });
// `kontext`: Text, nur Whiteboarding; `points`: offene Punkte der Kette, nur im Grill als eigener Abschnitt.
function buildBrief({ etappe, values, decisions = [], kontext = null, points = [] }) {
  const etappenBrief = ETAPPEN_BRIEFS[checkedEtappe(etappe)];
  checkedValues(etappe, etappenBrief, values);
  const sections = [
    etappenBrief.command(values),
    `Etappe \`${etappe}\` einer Session-Kette, geführt von einer Leit-Session.`,
    ['## Werte', ...valueLines(values)].join('\n'),
    ['## Auftrag', ...etappenBrief.auftrag(values).map((line) => `- ${line}`)].join('\n'),
    ...(decisions.length > 0 ? [['## Entscheidungen aus früheren Etappen', ...decisions.map((entry) => `- ${entry.etappe}: ${entry.text}`)].join('\n')] : []),
    ...(etappe === 'grill' && points.length > 0 ? [['## Offene Punkte aus früheren Etappen', 'Prüf sie im Grill mit; sie gelten nicht als beantwortet.', ...points.map(pointLine)].join('\n')] : []),
    ...(etappe === 'whiteboarding' ? [['## Kontext', String(kontext ?? '').trim()].join('\n')] : []),
    baseRules(etappe, values),
  ];
  const background = `Etappe ${etappe} der Session-Kette ${values.slug ?? '(Slug folgt aus der Spec)'}. Die Leit-Session führt die Kette, prüft jedes Ergebnis gegen git und holt an Haltepunkten die Entscheidung des Menschen ein. Diese Session bearbeitet nur ihre Etappe und meldet sich über ihr Turn-Ende, bei final zusätzlich mit einer Nachricht an die Leit-Session.`;
  return { modell: etappenBrief.modell, titel: `${etappenBrief.titel} ${values.slug ?? ''}`.trim(), brief: sections.join('\n\n'), hintergrund: background };
}

module.exports = { buildBrief, ETAPPEN_BRIEFS, BASE_FILE, SONNET_MODEL_ID, LEIT_LABEL, LEIT_ID_PATTERN, LEIT_ID };
