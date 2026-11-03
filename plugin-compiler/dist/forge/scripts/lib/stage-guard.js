'use strict';

// Hook einer Etappen-Session: Eine Etappen-Session erkennt sich am Brief (Zeile „Etappe `<e>` einer Session-Kette …“).
// Am Turn-Ende prüft der Hook die Statuszeile; bei `final` zusätzlich Berichtsdatei, Commit und die Nachricht an die Leit-Session.
// Alles ist fail-open: was nicht lesbar oder nicht prüfbar ist, blockiert nie.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseStatusLine } = require('./session-chain-turn');
const { BASE_FILE, LEIT_LABEL, LEIT_ID_PATTERN } = require('./session-chain-brief');
const { readData, REPORT_FILE } = require('./session-chain-report');
const { readEntries, textOf, isToolResultEntry } = require('./transcript');

const BRIEF_LINE = /^Etappe `([a-z-]+)` einer Session-Kette, geführt von einer Leit-Session\.[ \t]*$/m;
const SLUG_LINE = /^- Slug: (\S+)[ \t]*$/m;
const TEMPLATE_LINE = /`(\[\{\{ETAPPE\}\}\] STATUS=[^`\n]+)`/;
const MAX_BLOCKS = 2;
const COMMIT_HASH = /^[0-9a-f]{4,40}$/;
// Zeile und Kennung im Format aus session-chain-brief.js, das auch `brief --leit` prüft.
const LEIT_LINE = new RegExp(`^- ${LEIT_LABEL}: (${LEIT_ID_PATTERN})[ \\t]*$`, 'm');
const NOT_NOTIFIED = 'Leit-Session nicht benachrichtigt';

function markerPath(sessionId, tmpRoot = os.tmpdir()) {
  return path.join(tmpRoot, 'dv-forge', `${sessionId}.etappe.json`);
}

function readMarker(sessionId, tmpRoot) {
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath(sessionId, tmpRoot), 'utf8'));
    return typeof marker?.etappe === 'string' ? marker : null;
  } catch {
    return null;
  }
}

function writeMarker(sessionId, marker, tmpRoot) {
  const file = markerPath(sessionId, tmpRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(marker));
}

function clearMarker(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

// Etappe und Slug aus dem Text einer Nachricht; `null`, wenn sie kein Brief einer Etappen-Session ist.
function briefOf(text) {
  const etappe = BRIEF_LINE.exec(String(text ?? ''))?.[1];
  if (!etappe) return null;
  const slug = SLUG_LINE.exec(text)?.[1];
  return { etappe, slug: slug && /^[a-z0-9][a-z0-9._-]*$/i.test(slug) ? slug : null, leit: LEIT_LINE.exec(text)?.[1] ?? null };
}

function onPrompt(input, tmpRoot) {
  const brief = briefOf(input.prompt);
  if (brief) writeMarker(input.session_id, { ...brief, blocks: 0 }, tmpRoot);
}

// Nutzer-Eintrag, der kein Werkzeug-Ergebnis ist: Beginn eines Turns (Brief, Mensch, Nachricht einer Session, Benachrichtigung).
function isTurnStart(entry) {
  return entry.type === 'user' && !entry.isMeta && !isToolResultEntry(entry);
}

// Fällt der Marker weg (etwa bei einer fortgesetzten Session), liefert die erste Nutzer-Nachricht im Protokoll denselben Brief.
function briefFromTranscript(file) {
  if (!file || !fs.existsSync(file)) return null;
  const first = readEntries(file).find(isTurnStart);
  return first ? briefOf(textOf(first.message?.content)) : null;
}

function lastAssistantText(input) {
  if (typeof input.last_assistant_message === 'string' && input.last_assistant_message.trim() !== '') return input.last_assistant_message;
  const entries = input.transcript_path && fs.existsSync(input.transcript_path) ? readEntries(input.transcript_path) : [];
  const last = entries.filter((entry) => entry.type === 'assistant' && !entry.isSidechain).at(-1);
  return last ? textOf((last.message?.content ?? []).filter((part) => part.type === 'text')) : '';
}

// Vorlage der Statuszeile aus base-sub-agent.md, der einen Quelle.
function statusTemplate(etappe) {
  try {
    const found = TEMPLATE_LINE.exec(fs.readFileSync(BASE_FILE, 'utf8'));
    return found ? found[1].replaceAll('{{ETAPPE}}', etappe) : null;
  } catch {
    return null;
  }
}

function statusProblem(etappe, status) {
  const template = statusTemplate(etappe);
  const model = template ? ` Vorlage: ${template}` : '';
  if (!status) return `Die erste nicht leere Zeile deiner Antwort muss die Statuszeile deiner Etappe sein.${model}`;
  if (status.etappe !== etappe) return `Die Statuszeile nennt die Etappe ${status.etappe}, deine ist ${etappe}.${model}`;
  return null;
}

function gitAvailable(cwd) {
  return spawnSync('git', ['-C', cwd, 'rev-parse', '--git-dir'], { encoding: 'utf8' }).status === 0;
}

function commitExists(commit, cwd) {
  return spawnSync('git', ['-C', cwd, 'cat-file', '-e', `${commit}^{commit}`], { encoding: 'utf8' }).status === 0;
}

function reportProblem(status, marker) {
  if (status.bericht === 'none') return 'STATUS=final braucht BERICHT=<pfad> der Berichtsdatei von etappe-report.';
  if (path.basename(status.bericht) !== REPORT_FILE || !fs.existsSync(status.bericht)) {
    return `Die Berichtsdatei ${status.bericht} existiert nicht oder heißt nicht ${REPORT_FILE}. Schreib sie mit etappe-report und übernimm die Ausgabezeile BERICHT=<pfad>.`;
  }
  let data;
  try {
    ({ data } = readData(status.bericht));
  } catch {
    return `Zur Berichtsdatei ${status.bericht} fehlen die Bericht-Daten von etappe-report. Schreib sie mit etappe-report.`;
  }
  if (data.etappe !== marker.etappe) return `Die Berichtsdatei ${status.bericht} gehört zur Etappe ${data.etappe}, nicht zu ${marker.etappe}.`;
  if (marker.slug && data.slug && data.slug !== marker.slug) return `Die Berichtsdatei gehört zur Kette ${data.slug}, nicht zu ${marker.slug}.`;
  return null;
}

function commitProblem(status, cwd) {
  if (status.commit === 'none' || !COMMIT_HASH.test(status.commit) || !cwd || !gitAvailable(cwd)) return null;
  return commitExists(status.commit, cwd) ? null : `COMMIT=${status.commit} ist kein Commit in diesem Repository. Nimm den Hash aus git rev-parse HEAD oder COMMIT=none.`;
}

function finalProblem(status, marker, cwd) {
  if (status.status !== 'final') return null;
  return reportProblem(status, marker) ?? commitProblem(status, cwd);
}

// Kennungen der Werkzeug-Aufrufe, deren Ergebnis ein Fehler ist (`is_error: true` am `tool_result`).
function failedToolIds(entries) {
  return new Set(entries.filter(isToolResultEntry).flatMap((entry) => entry.message.content)
    .filter((part) => part?.type === 'tool_result' && part.is_error === true).map((part) => part.tool_use_id));
}

// Ob die Etappen-Session im laufenden Turn per SendMessage an `leit` geschrieben hat; ohne lesbares Protokoll `true` (fail-open).
// Nur der laufende Turn zählt: Eine Nachricht zu einem früheren `final` deckt ein neues nicht ab. Ein Aufruf mit Fehlerergebnis
// zählt nicht; fehlt das Ergebnis noch, zählt er.
function messagedLeit(file, leit) {
  if (!file || !fs.existsSync(file)) return true;
  const entries = readEntries(file);
  const turn = entries.slice(entries.findLastIndex(isTurnStart) + 1);
  const failed = failedToolIds(turn);
  return turn.some((entry) => entry.type === 'assistant' && Array.isArray(entry.message?.content)
    && entry.message.content.some((part) => part?.type === 'tool_use' && part.name === 'SendMessage' && part.input?.to === leit && !failed.has(part.id)));
}

// `final` mit Leit-Session im Brief: eine Nachricht an sie oder die Zeile, dass sie gescheitert ist.
function messageProblem(status, marker, input, text) {
  if (status?.status !== 'final' || !marker.leit) return null;
  if (text.includes(NOT_NOTIFIED) || messagedLeit(input.transcript_path, marker.leit)) return null;
  return `Vor dem final schickst du eine Nachricht an die Leit-Session: SendMessage an ${marker.leit}, die Statuszeile als erste Zeile. `
    + `Scheitert sie, schreib nach der Statuszeile „${NOT_NOTIFIED}: [Leit-Session](#${marker.leit})“.`;
}

// Block-Grund oder `null`. Blockt höchstens zweimal in Folge; ein Zug ohne Beanstandung setzt den Zähler zurück.
function onTurnEnd(input, tmpRoot) {
  const marker = readMarker(input.session_id, tmpRoot)
    ?? (input.stop_hook_active ? null : briefFromTranscript(input.transcript_path));
  if (!marker) return null;
  const blocks = marker.blocks ?? 0;
  if (input.stop_hook_active && blocks === 0) return null;
  const text = lastAssistantText(input);
  const status = parseStatusLine(text);
  const problem = statusProblem(marker.etappe, status) ?? finalProblem(status, marker, input.cwd) ?? messageProblem(status, marker, input, text);
  if (!problem || blocks >= MAX_BLOCKS) {
    writeMarker(input.session_id, { ...marker, blocks: 0 }, tmpRoot);
    return null;
  }
  writeMarker(input.session_id, { ...marker, blocks: blocks + 1 }, tmpRoot);
  return `dv-forge: ${problem}`;
}

module.exports = { markerPath, readMarker, clearMarker, briefOf, onPrompt, onTurnEnd, statusTemplate };
