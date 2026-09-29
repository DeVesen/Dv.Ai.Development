'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'review-flow.js');
const { writeContext } = require('../../scripts/workspace');

const SPEC = [
  '# Demo', '', 'Status: bestätigt am 2026-09-28', 'Art: verankert', 'Basis: 3ce509e', '',
  '## Theoretisches Verhalten nach Umsetzung',
  '1. **Suche:** Alle Reviewer prüfen.',
  '',
  '## Akzeptanzkriterien',
  '- **AC-01** Gegeben A, dann B.',
  '- **AC-04** Gegeben C, dann D.',
  '- **AC-07** Gegeben E, dann F.',
  '- **AC-09** Gegeben G, dann H.',
  '- **AC-12** Gegeben I, dann J.',
  '',
  '## Entscheidungen',
  '- **W · Deckel** · Aussage — Zwei Runden.',
  '',
].join('\n');

const finding = (location, category, overrides = {}) => ({
  location, quote: 'Gegeben', category, consequence: `Konsequenz ${location}`, rationale: 'weil', ...overrides,
});

function scoutFor(groups) {
  const blocks = groups.map(([icon, key]) => `### ${icon} ${key}\n1. Vorschlag A\n2. Vorschlag B\n**Bevorzugt: 1** — sicher`);
  return `## Scout-Vorschläge\n\n${blocks.join('\n\n')}\n`;
}

function flowWorkspace(text = SPEC, name = 'spec.md') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-flow-'));
  const doc = path.join(root, name);
  const workspace = path.join(root, '.forge', 'ws');
  fs.writeFileSync(doc, text);
  fs.mkdirSync(path.join(workspace, 'runde-1'), { recursive: true });
  const file = (relative) => path.join(workspace, relative);
  return {
    root,
    doc,
    workspace,
    file,
    review: (reviewer, findings) => fs.writeFileSync(file(`runde-1/${reviewer}.json`), JSON.stringify({ reviewer, summary: 's', findings })),
    json: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), JSON.stringify(value));
    },
    text: (relative, value) => {
      fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
      fs.writeFileSync(file(relative), value);
    },
    read: (relative) => fs.readFileSync(file(relative), 'utf8'),
    readJson: (relative) => JSON.parse(fs.readFileSync(file(relative), 'utf8')),
    edit: (change) => fs.writeFileSync(doc, change(fs.readFileSync(doc, 'utf8'))),
    run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' }),
    repoFile: (relative, value) => {
      const target = path.join(root, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, value);
    },
    // Kontext wie von prepare.js: eine Spec neben dem Dokument, Repo ist der Test-Ordner.
    context: (specText) => {
      const spec = path.join(root, 'kontext-spec.md');
      fs.writeFileSync(spec, specText);
      writeContext(workspace, { spec, repo: root });
    },
  };
}

module.exports = { SPEC, finding, scoutFor, flowWorkspace };
