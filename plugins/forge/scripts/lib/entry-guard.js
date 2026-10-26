'use strict';

// Sperre für den Startbefehl: Ein Mensch betritt dv-forge nur über /dv-forge:session-orchestrator. Tippt er den Befehl eines Unter-Skills,
// weist der Hook auf getippte Befehle (UserPromptSubmit) ihn ab, außer er hängt `--debug` an. Der Hook schreibt und ändert nichts.
// Aufrufe über das Skill-Werkzeug (Etappen-Sessions, Orchestratoren) laufen über PreToolUse und kommen hier nie vorbei; ein Brief einer
// Etappen-Session beginnt zwar mit einem Slash-Befehl, ist aber kein getippter Befehl und passiert.
// Probe-Lauf: Ein getippter Plugin-Befehl kommt unverändert an, mit Präfix als `/dv-forge:<name> <args>`, ohne als `/<name> <args>`.
// Die Liste der Unter-Skills steht nur hier; `init`, `commit-message`, `domain-modeling`, `merge-conflict-resolution` und der Startbefehl fehlen mit Absicht.

const { briefOf } = require('./stage-guard');

const START_COMMAND = '/dv-forge:session-orchestrator';
const DEBUG_SWITCH = '--debug';
const SUB_SKILLS = [
  'spec-whiteboarding', 'spec-whiteboarding-with-docs', 'spec-grilling', 'spec-review', 'spec-review-orchestrator',
  'plan-writing', 'plan-review', 'plan-orchestrator', 'implementation', 'implementation-review', 'implementation-orchestrator',
  'review-followup', 'start-work', 'finish-work',
];
const COMMAND = /^\/(?:dv-forge:)?([a-z][a-z-]*)$/;

// Name des Unter-Skills, den der Prompt als Befehl aufruft; sonst null.
function subSkillOf(prompt) {
  const [first = ''] = String(prompt ?? '').trim().split(/\s+/);
  const name = COMMAND.exec(first)?.[1];
  return SUB_SKILLS.includes(name) ? name : null;
}

// Begründung der Abweisung oder null, wenn der Prompt passieren darf.
function blockedEntry(prompt) {
  const name = subSkillOf(prompt);
  if (!name || briefOf(prompt)) return null;
  if (String(prompt).trim().split(/\s+/).includes(DEBUG_SWITCH)) return null;
  return `dv-forge: /dv-forge:${name} ist ein interner Unter-Skill. Starte dv-forge mit ${START_COMMAND}. Zum Debuggen hängst du ${DEBUG_SWITCH} an.`;
}

module.exports = { START_COMMAND, DEBUG_SWITCH, SUB_SKILLS, subSkillOf, blockedEntry };
