'use strict';

// Etappe der Session-Kette, in deren Ablage ein Review oder Orchestrator seinen Bericht legt. Reihenfolge: ausdrücklich
// `whiteboarding` (das Whiteboarding hat noch keinen Zustand), sonst die laufende Etappe der Kette (`gestartet.etappe`, die der
// Brief der Leit-Session setzt), sonst die Etappe, die zum Namen des Skills passt (Debug-Aufruf ohne Brief).

const path = require('node:path');
const { SessionChainError, readState, slugOfArtifact } = require('./session-chain-store');
const { ablageDir } = require('./session-chain-ablage');

const ETAPPE_OF_SKILL = {
  'spec-review': 'spec-review',
  'spec-review-orchestrator': 'spec-review',
  'plan-review': 'plan-review',
  'plan-orchestrator': 'planning',
  'implementation-review': 'umsetzung',
  'implementation-orchestrator': 'umsetzung',
};

// `dir`: Ordner im Repo der Kette; `slug`: Slug aus dem Pfad von Spec oder Plan.
function etappeFor({ skill, dir, slug, whiteboarding = false }) {
  if (!Object.hasOwn(ETAPPE_OF_SKILL, skill)) throw new SessionChainError(`Kein Skill mit Ablage: ${skill}`);
  if (whiteboarding) return 'whiteboarding';
  return readState(dir, slug)?.gestartet?.etappe ?? ETAPPE_OF_SKILL[skill];
}

// Ablage-Ordner, in den das Review `skill` seinen Bericht legt und aus dem sein Orchestrator ihn liest. `artifact`: die Spec
// (bei `spec-review`) oder der Plan; Slug und Etappe wie bei prepare.js.
function ablageFor({ skill, artifact, whiteboarding = false }) {
  const dir = path.dirname(path.resolve(artifact));
  const slug = slugOfArtifact(skill.startsWith('spec-') ? { spec: artifact } : { plan: artifact });
  return ablageDir(dir, slug, etappeFor({ skill, dir, slug, whiteboarding }));
}

module.exports = { ETAPPE_OF_SKILL, etappeFor, ablageFor };
