'use strict';

// Sicherung am Ende eines Reviews: nur offene Gruppen gelangen in abschluss/ und damit zu followup.js save.

const fs = require('node:fs');
const path = require('node:path');
const { loadGroups } = require('../followup');
const { scoutBlocks } = require('./scout-check');
const { openFromRounds, openFromFollowup, answeredKeys } = require('./open-groups');
const { ROUND_ONE, ROUND_TWO, CLOSING, readJson, readLines, readAgentJson } = require('./flow-files');
const { writeSavedClosing } = require('./saved-closing');

const BEFORE = 'sicherung-vorher';

function isFollowup(options) {
  return fs.existsSync(path.join(options.workspace, 'followup.json'));
}

function answersOf(options) {
  const { value } = readAgentJson(path.join(options.workspace, ROUND_ONE, 'antworten.json'));
  return Array.isArray(value?.results) ? value.results : [];
}

function openGroupsOf(options, data) {
  if (!isFollowup(options)) return openFromRounds({ one: data.one, two: data.two, answered: answeredKeys(answersOf(options)) });
  const followup = readJson(path.join(options.workspace, 'followup.json'));
  const chosen = new Set(followup.gewaehlt.map((entry) => entry.nummer));
  return openFromFollowup({ saved: loadGroups(path.join(options.workspace, BEFORE)), chosen, two: data.two });
}

// Spätere Scout-Dateien überschreiben frühere Blöcke derselben Gruppe.
function scoutBlocksOf(options) {
  const blocks = new Map();
  for (const dir of [BEFORE, ROUND_ONE, ROUND_TWO]) {
    for (const [key, block] of scoutBlocks(readLines(path.join(options.workspace, dir, 'scout.md')))) blocks.set(key, block);
  }
  return blocks;
}

// <W>/abschluss/ wird geleert und über saved-closing.js neu geschrieben, denselben Schreiber wie followup.js keep.
function writeClosingFiles(workspace, aggregateBlocks, scouted) {
  const dir = path.join(workspace, CLOSING);
  fs.rmSync(dir, { recursive: true, force: true });
  writeSavedClosing(dir, aggregateBlocks, scouted);
  return dir;
}

function writeClosing(options, open) {
  const blocks = scoutBlocksOf(options);
  const scouted = open.map((group) => blocks.get(group.scoutKey)).filter(Boolean);
  writeClosingFiles(options.workspace, open.map((group) => group.block), scouted);
}

module.exports = { openGroupsOf, writeClosing, writeClosingFiles };
