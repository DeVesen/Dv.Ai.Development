'use strict';

// Wie oft ein Hook für denselben Anlass (etwa einen Sub-Agent) blocken darf: höchstens zweimal.
// `stop_hook_active` ohne gemerkten Block (Zähler verloren) blockt nie. Alles best effort: Ein Schreibfehler erlaubt das Ende.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MAX_BLOCKS = 2;

function budgetFile(key, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `blocks-${String(key).replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
}

function readCount(file) {
  try {
    return Number(JSON.parse(fs.readFileSync(file, 'utf8')).n) || 0;
  } catch {
    return 0;
  }
}

// true: Der Hook darf jetzt blocken (und der Block ist verbucht).
function mayBlock(key, stopHookActive, tmpRoot) {
  const file = budgetFile(key, tmpRoot);
  const count = readCount(file);
  if ((stopHookActive && count === 0) || count >= MAX_BLOCKS) {
    fs.rmSync(file, { force: true });
    return false;
  }
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ n: count + 1 }));
  } catch {
    return false;
  }
  return true;
}

function release(key, tmpRoot) {
  fs.rmSync(budgetFile(key, tmpRoot), { force: true });
}

module.exports = { mayBlock, release, budgetFile };
