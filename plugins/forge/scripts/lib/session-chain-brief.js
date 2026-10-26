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
const STATE_SCRIPT = `${toPosix(PLUGIN_ROOT)}/scripts/orchestrator-state.js`;
const RULES_FILE = `${toPosix(PLUGIN_ROOT)}/shared/orchestrator-rules.md`;

// Kennung der Leit-Session, an die die Etappen-Session ihr `final` schickt, und ihre Zeile `- Leit-Session: <id>` unter `## Werte`.
// Das eine Format für Brief (erzeugt), CLI `brief --leit` (prüft) und Hook der Etappen-Session (liest). Zeichensatz ohne
// Shell-Zeichen; Unterstrich und Punkt sind erlaubt, weil das Format der Kennung aus `get_session` nicht festgelegt ist.
const LEIT_LABEL = 'Leit-Session';
const LEIT_ID_PATTERN = 'local_[A-Za-z0-9_.-]+';
const LEIT_ID = new RegExp(`^${LEIT_ID_PATTERN}$`);

function withWi(command, wi) {
  return wi ? `${command} ${wi}` : command;
}

// Zeile der beiden Nacharbeiten: Kein Skill liefert ihren Bericht, also schreibt ihn die Etappe selbst.
const REWORK_REPORT = 'Schreib einen kurzen Bericht (geänderte Stellen als Vorher/Nachher, neue W-Einträge) in eine Datei und übergib sie mit `--inhalt "<datei>"`.';

// Je Etappe: Modell, Titel, Pflichtwerte, erste Zeile und Auftrag. `v`: slug, wi, basis, spec, plan, worktree, branch, quelle, leit.
// Fehlt ein Pflichtwert, entsteht kein Brief (sonst stünde `undefined` im Befehl der ersten Zeile).
const ETAPPEN_BRIEFS = {
  whiteboarding: {
    modell: 'sonnet', titel: 'Whiteboarding', pflicht: [],
    command: () => '/dv-forge:spec-whiteboarding-with-docs',
    auftrag: () => [
      'Eingabe des Whiteboardings ist der Abschnitt „Kontext“ unten.',
      'Du committest nichts, weder Spec noch Glossar oder ADRs; das macht die Leit-Session.',
      'Nach der Bestätigung und dem Schreiben der Spec rufst du ohne Rückfrage in dieser Session über das Skill-Werkzeug `dv-forge:spec-review-orchestrator` mit `"<deine Spec>" --whiteboarding` auf.',
      `Nach jedem Review-Lauf: \`node "${CHAIN_SCRIPT}" review-stand --spec "<deine Spec>"\`. \`FRAGE=nein\`: Etappe abschließen. \`FRAGE=ja\`: am Ende deiner Antwort die Frage „Spec abschließen“ oder „Weiter an der Spec arbeiten“, Status \`needs-user\`.`,
      'Scheitert `review-stand` mit „Kein Spec-Review in der Ablage“: Review erneut aufrufen; scheitert es wieder, Status `needs-user` mit der Fehlermeldung, nicht abschließen.',
      '„Weiter an der Spec arbeiten“: jede Änderung als Vorher/Nachher, erst nach Bestätigung schreiben, danach erneut das Review und `review-stand`. Änderungen der Followup-Runden lösen kein weiteres Review aus.',
      'Abschließen: Berichtsdatei mit `--spec "<deine Spec>"` und `--inhalt "<ABSCHLUSS aus review-stand>"`, dazu `--datei` je geänderter Glossar- oder ADR-Datei.',
    ],
  },
  grill: {
    modell: 'opus', titel: 'Grill', pflicht: ['spec'],
    command: (v) => `/dv-forge:spec-grilling "${v.spec}"`,
    auftrag: () => [
      'Schreib den Abschlussbericht von spec-grilling (Liste der geänderten Stellen, neue W-Einträge) in eine Datei und übergib sie mit `--inhalt "<datei>"`.',
      'Jede geänderte Glossar- oder ADR-Datei mit `--datei`.',
    ],
  },
  'spec-review': {
    modell: 'sonnet', titel: 'Spec-Review', pflicht: ['spec'],
    command: (v) => withWi(`/dv-forge:spec-review-orchestrator "${v.spec}"`, v.wi),
    auftrag: () => ['Der Skill committet die Spec selbst. `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.'],
  },
  'spec-nacharbeit': {
    modell: 'opus', titel: 'Spec-Nacharbeit', pflicht: ['spec', 'quelle'],
    command: (v) => `Spec-Nacharbeit "${v.spec}"`,
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
    command: (v) => withWi(`/dv-forge:plan-orchestrator "${v.spec}"`, v.wi),
    auftrag: () => ['Der Skill committet nicht. Berichtsdatei mit `--plan "<plan.md>"`; `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.'],
  },
  'plan-review': {
    modell: 'sonnet', titel: 'Plan-Review', pflicht: ['plan', 'spec'],
    command: (v) => `/dv-forge:plan-review "${v.plan}" "${v.spec}"`,
    auftrag: (v) => [
      `Vor dem Skill einmal \`node "${STATE_SCRIPT}" ablage --art plan --plan "${v.plan}"\`: Die Zeilen \`BERICHT-REVIEW\` (<BR>) und \`BERICHT-FOLLOWUP-<n>\` (<BFn>) sind die Bericht-Daten des Laufs.`,
      'Alles in einem Turn: Nach der Review-Statuszeile von `plan-review` arbeitest du ohne Turn-Ende weiter.',
      `Nach \`plan-review\` und nach jeder Runde: \`node "${STATE_SCRIPT}" next --review "<BR>"\`, dazu \`--followup "<BFn>"\` je gelaufener Runde. \`NEXT=followup\`: Runde \`RUNDE\` mit \`dv-forge:review-followup\` und \`"${v.plan}" alle --spec "${v.spec}"\`. Sonst keine weitere Runde; Maximum und Stillstand-Regel stehen in \`${RULES_FILE}\`.`,
      'Endet `plan-review`, `review-followup`, `ablage` oder `next` mit Exit ungleich 0 oder ohne Review-Statuszeile: keine weitere Runde, Status `needs-user` mit der Meldung.',
      'Den Plan schreibst du nicht neu. Du committest nichts; Spec und Plan committet die Leit-Session nach dem GO.',
      `Berichtsdatei mit \`--plan "${v.plan}"\`; \`--inhalt\` ist die \`.md\`-Datei, die die letzte Review-Statuszeile nach \`Bericht:\` nennt.`,
    ],
  },
  'plan-nacharbeit': {
    modell: 'opus', titel: 'Plan-Nacharbeit', pflicht: ['plan', 'spec', 'quelle'],
    command: (v) => `Plan-Nacharbeit "${v.plan}" "${v.spec}"`,
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
      'Einen Showstopper klärst du mit dem Menschen hier.',
      '`COMMIT` der Statuszeile ist der letzte Commit der Umsetzung: `git -C "<R>" rev-parse --short HEAD` nach dem Lauf; ohne Commit `none`.',
      '`<PR>` ist die Datei `pruefung.json` im Scratchpad dieser Session, die Schritt 6 des Orchestrators schreibt. Lief Schritt 6 nicht, gilt `--pruefung keine`.',
      '`--luecke "<befehl>"` je Lauf in `<PR>`, dessen Ausgabe zeigt, dass das Werkzeug fehlt (etwa `command not found`, `not recognized`, `ENOENT`); sonst keine `--luecke`.',
      '`--ac-ohne-test` ergänzt `etappe-report` selbst aus der Zeile `AC ohne beweisenden Test:` des Abschlussberichts; nenne nur zusätzlich ein Akzeptanzkriterium ohne beweisenden Test, das der Bericht nicht nennt, auch wenn das Review es nur als 🟡 führt. Integrationspunkte ohne Test sind davon ausgenommen.',
      'Berichtsdatei mit `--worktree "<R>"` und `--branch <branch>` (beide Werte aus den Zeilen `R=` und `branch=` von start-work), `--pruefung-datei "<PR>"` (ohne Prüflauf `--pruefung keine`), `--luecke` und `--ac-ohne-test` wie oben; `--inhalt` ist sein Abschlussbericht: die Datei der Zeile `BERICHT <datei>` aus der Ausgabe des Orchestrators.',
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
