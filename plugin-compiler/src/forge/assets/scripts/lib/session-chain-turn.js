'use strict';

// Turn-Ende einer Etappen-Session: Statuszeile lesen und entscheiden, ob die Leit-Session schweigt, die Zeile `<etappe>: läuft` ausgibt oder handelt.
// Ein Turn-Ende ohne Statuszeile gilt als `in-progress`; jedes dritte in Folge bekommt einen Hinweis.
// COMMIT und BERICHT landen in Befehlen der Leit-Session: COMMIT ist nur `none` oder ein Hash, BERICHT nur `none` oder ein
// Pfad ohne Shell-Zeichen. Eine Zeile mit anderen Werten gilt als keine Statuszeile.
// Den Zähler je Etappen-Session hält turns/<session>.json in der Wurzel der Session-Ketten, unabhängig vom Slug.

const path = require('node:path');
const { SessionChainError, chainsRoot, readJsonFile, writeJsonFile } = require('./session-chain-store');

const STATUS_LINE = /^\[([a-z-]+)\] STATUS=(in-progress|needs-user|final) · ROT=(\d+) · GELB=(\d+) · COMMIT=(none|[0-9a-f]{4,40}) · BERICHT=(none|[^"'`$;&|<>\r\n]+?)\s*$/;
const HINT_AFTER = 3;
const SESSION_ID = /^[A-Za-z0-9_-]+$/;

// Erste nicht leere Zeile des Turn-Endes als Statuszeile oder null.
function parseStatusLine(text) {
  const first = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).find((line) => line !== '');
  const match = STATUS_LINE.exec(first ?? '');
  if (!match) return null;
  const [, etappe, status, rot, gelb, commit, bericht] = match;
  return { etappe, status, rot: Number(rot), gelb: Number(gelb), commit, bericht };
}

// `count`: Turn-Enden ohne Statuszeile in Folge vor diesem. Rückgabe: Aktion und neuer Zähler.
function turnAction(count, parsed) {
  if (!parsed) {
    const next = count + 1;
    return { aktion: next % HINT_AFTER === 0 ? 'hinweis' : 'schweigen', ohneStatus: next };
  }
  const aktion = { 'in-progress': 'laeuft', 'needs-user': 'needs-user', final: 'final' }[parsed.status];
  return { aktion, ohneStatus: 0 };
}

function turnsFile(dir, session) {
  if (!SESSION_ID.test(String(session ?? ''))) throw new SessionChainError(`Session-Kennung ungültig: ${session}`);
  return path.join(chainsRoot(dir), 'turns', `${session}.json`);
}

// Zahl der Turn-Enden dieser Etappen-Session in Folge ohne Statuszeile.
function readTurns(dir, session) {
  return readJsonFile(turnsFile(dir, session))?.ohneStatus ?? 0;
}

function writeTurns(dir, session, ohneStatus) {
  writeJsonFile(turnsFile(dir, session), { ohneStatus });
}

module.exports = { parseStatusLine, turnAction, readTurns, writeTurns, HINT_AFTER };
