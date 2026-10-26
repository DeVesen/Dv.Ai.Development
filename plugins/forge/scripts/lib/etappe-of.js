'use strict';

// Etappe der Session-Kette, in deren Ablage ein Review oder Orchestrator seinen Bericht legt. Reihenfolge: ausdrücklich
// `whiteboarding` (das Whiteboarding hat noch keinen Zustand), sonst die laufende Etappe der Kette (`gestartet.etappe`, die der
// Brief der Leit-Session setzt), sonst die Etappe, die zum Namen des Skills passt (Debug-Aufruf ohne Brief).

const { SessionChainError, readState } = require('./session-chain-store');

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

module.exports = { ETAPPE_OF_SKILL, etappeFor };
