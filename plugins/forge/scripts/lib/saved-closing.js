'use strict';

// Format der gesicherten offenen Gruppen, das followup.js save/loadGroups liest. Blatt-Modul ohne followup.js,
// damit followup.js keep und closing.js denselben Schreiber nutzen, ohne sich gegenseitig zu laden.

const path = require('node:path');
const { REWORK_MARK } = require('../aggregate-findings');
const { writeText } = require('./flow-files');

const SCOUT_HEADING = '## Scout-Vorschläge';

// Einziger Schreiber dieses Formats: aggregate.md mit den Gruppen-Blöcken (Text) und, falls vorhanden,
// scout.md mit den Scout-Blöcken (Zeilenlisten). Andere Dateien im Ordner bleiben unberührt.
function writeSavedClosing(dir, aggregateBlocks, scouted) {
  writeText(path.join(dir, 'aggregate.md'), [REWORK_MARK, ...aggregateBlocks].join('\n\n'));
  if (scouted.length > 0) {
    writeText(path.join(dir, 'scout.md'), [SCOUT_HEADING, '', scouted.map((block) => block.join('\n').trimEnd()).join('\n\n')].join('\n'));
  }
}

module.exports = { writeSavedClosing };
