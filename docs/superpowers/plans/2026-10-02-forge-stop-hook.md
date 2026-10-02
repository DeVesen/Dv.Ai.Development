# dv-forge TP-A: Stop-Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein `Stop`-Hook garantiert, dass der Pflichttext beim Anhalten und beim Abschluss eines Reviews im Chat steht (höchstens zwei Nachforderungen), und der Ablauf schreibt den Vorrang-Satz vor.

**Architecture:** Neue Lib `must-show.js` leitet Anker aus einer Textdatei ab und entscheidet am Zugende; neue Lib `turn-text.js` bildet aus Transcript und `last_assistant_message` den Zugtext. `guard-orchestrator.js` bekommt `show`, `pause --show` und `turn-end` und lässt `release` einen vorgemerkten Pflichttext im Marker stehen. `report` schreibt zusätzlich `bericht.md`. Ablauf-Markdown ruft die neuen Befehle auf.

**Tech Stack:** Node.js (CommonJS, `node:test`, `node:assert/strict`), keine Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-02-forge-stop-hook-design.md`

**Arbeitsverzeichnis:** Alle Pfade relativ zum Repo-Root `C:\Develop\Dv.Ai.Development`. Tests laufen im Plugin-Ordner: `cd plugins/forge && node --test tests/<datei>`.

## Global Constraints

- Code, Kommentare, Doku, Dateinamen und Commit-Messages: wie im Plugin üblich (Kommentare und Markdown deutsch, Commit-Messages englisch im Conventional-Commits-Stil, Scope `forge`).
- Testnamen: `<Einheit>_<Situation>_<Erwartung>`, Aufbau Arrange/Act/Assert, `node:test`.
- Der Hook blockiert höchstens zweimal je Pflichttext (`attempts` 0, 1 → Block; ab 2 frei) und scheitert offen: Fehler → stderr `dv-forge guard: <meldung>`, Exit 0, kein Block.
- Anker = getrimmte Zeilen, die mit `## `/`### ` beginnen, oder mit `Frage <Ziffer>` bzw. `**Frage <Ziffer>`. Mindestlänge des Zugtexts: 60 % der gemerkten nichtleeren Zeilen.
- Der Vorrang-Satz lautet wörtlich: `Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.`
- `SubagentStop`/`SessionEnd`-Einträge, Review-Logik (`review-flow.js`) und die Schutzlogik des Guards bleiben unverändert. Der Orchestrator liest weiterhin keine geschützten Dateien.
- Nicht committen: Version-Bump (`plugin.json`, `plugins/README.md`); den macht der Mensch beim Zusammenführen der drei Teile.

## Review Focus

- Windows-Zeilenenden (CRLF) in der Datei und im Zugtext dürfen keinen falschen Block auslösen (Task 1, Task 3).
- Ein neuer Prompt des Menschen löscht einen übrig gebliebenen Pflichttext (Task 3).
- Fehlendes oder kaputtes Transcript blockiert nie (Task 3).
- Der `show`-Aufruf des Orchestrators wird vom Schutz nicht geblockt, auch bei Spec-Review mit geschützter Spec (Task 3).
- Text steht vor späteren Tool-Calls des Zugs, nicht in der letzten Nachricht (Task 2, Task 3).

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `plugins/forge/scripts/lib/must-show.js` (neu) | Anker ableiten, Pflichttext-Objekt bilden, am Zugende entscheiden |
| `plugins/forge/scripts/lib/turn-text.js` (neu) | Assistenten-Text des Zugs aus Transcript plus letzter Nachricht |
| `plugins/forge/scripts/guard-orchestrator.js` | Marker-Funktionen `show`, `pauseWithShow`, `onTurnEnd`, `release` mit Pflichttext, CLI-Events `show`, `turn-end` |
| `plugins/forge/hooks/hooks.json` | `Stop`-Eintrag |
| `plugins/forge/scripts/lib/flow-report.js` | `report` schreibt `abschluss/bericht.md` |
| `plugins/forge/shared/review-flow/flow.md`, `shared/review-loop/loop.md`, `skills/review-followup/SKILL.md`, `skills/review-followup/references/flow.md` | Vorrang-Satz, `show`-Schritte |

---

### Task 1: Anker und Entscheidung (`must-show.js`)

**Files:**
- Create: `plugins/forge/scripts/lib/must-show.js`
- Create: `plugins/forge/tests/must-show.test.js`

**Interfaces:**
- Consumes: nichts.
- Produces:
  - `anchorsOf(text: string): string[]`
  - `mustShowOf(text: string, file: string): { file, anchors: string[], lines: number, text: string, attempts: 0 }`
  - `decideTurnEnd(mustShow, shown: string): { reason: string | null, mustShow: object | null }`. `reason` ist der Block-Grund, `mustShow` der neue Stand (`null` = löschen).

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/must-show.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { anchorsOf, mustShowOf, decideTurnEnd } = require('../scripts/lib/must-show');

const TEXT = ['## Spec-Review: docs/x/spec.md', '', '**Status:** sauber', '', '### Runde 1', '| a | b |', '', '### Offene Fragen', '- x'].join('\n');
const ANCHORS = ['## Spec-Review: docs/x/spec.md', '### Runde 1', '### Offene Fragen'];

test('anchorsOf_HeadingsAndQuestionLines_ReturnsThemTrimmed', () => {
  // Arrange
  const text = ['# Titel', '## Kopf', '#### zu tief', '  ### Eingerückt  ', '**Frage 1 — Regel**', 'Frage 2 von 2 · Titel', '- **Frage 3**', 'Fließtext'].join('\n');

  // Act
  const anchors = anchorsOf(text);

  // Assert
  assert.deepEqual(anchors, ['## Kopf', '### Eingerückt', '**Frage 1 — Regel**', 'Frage 2 von 2 · Titel']);
});

test('anchorsOf_CrlfText_ReturnsLinesWithoutCarriageReturn', () => {
  // Act
  const anchors = anchorsOf('## Kopf\r\n\r\n### Ende\r\n');

  // Assert
  assert.deepEqual(anchors, ['## Kopf', '### Ende']);
});

test('mustShowOf_Text_KeepsAnchorsLinesTextAndZeroAttempts', () => {
  // Act
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Assert
  assert.deepEqual(mustShow, { file: 'W/bericht.md', anchors: ANCHORS, lines: 6, text: TEXT, attempts: 0 });
});

test('decideTurnEnd_AllAnchorsAndEnoughLines_FreesWithoutReason', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Act
  const result = decideTurnEnd(mustShow, TEXT);

  // Assert
  assert.deepEqual(result, { reason: null, mustShow: null });
});

test('decideTurnEnd_ShownTextWrappedWithOtherWords_StillFinds', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');
  const shown = `Hier der Bericht:\r\n${TEXT.replace(/\n/g, '\r\n')}\r\nViel Erfolg`;

  // Act
  const result = decideTurnEnd(mustShow, shown);

  // Assert
  assert.equal(result.reason, null);
});

test('decideTurnEnd_AnchorMissing_BlocksNamesAnchorAndCarriesText', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');
  const shown = TEXT.replace('### Offene Fragen', 'Offene Fragen');

  // Act
  const result = decideTurnEnd(mustShow, shown);

  // Assert
  assert.match(result.reason, /^dv-forge: Gib den folgenden Text unverändert im Chat aus\. Es fehlt: ### Offene Fragen\. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks\.\n\n## Spec-Review/);
  assert.ok(result.reason.endsWith(TEXT));
  assert.equal(result.mustShow.attempts, 1);
});

test('decideTurnEnd_MoreThanThreeMissing_NamesOnlyThree', () => {
  // Arrange
  const text = ['## A', '## B', '## C', '## D', '## E'].join('\n');

  // Act
  const result = decideTurnEnd(mustShowOf(text, 'f.md'), 'nichts');

  // Assert
  assert.match(result.reason, /Es fehlt: ## A \| ## B \| ## C\./);
});

test('decideTurnEnd_AnchorsPresentButTooShort_BlocksWithTooShort', () => {
  // Arrange
  const mustShow = mustShowOf(TEXT, 'W/bericht.md');

  // Act
  const result = decideTurnEnd(mustShow, ANCHORS.join('\n'));

  // Assert
  assert.match(result.reason, /Der Text ist zu kurz\./);
});

test('decideTurnEnd_SecondAttemptStillMissing_BlocksAgainThenFrees', () => {
  // Arrange
  const first = decideTurnEnd(mustShowOf(TEXT, 'f.md'), 'nichts');
  const second = decideTurnEnd(first.mustShow, 'nichts');

  // Act
  const third = decideTurnEnd(second.mustShow, 'nichts');

  // Assert
  assert.equal(second.mustShow.attempts, 2);
  assert.ok(second.reason);
  assert.deepEqual(third, { reason: null, mustShow: null });
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/must-show.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/must-show'`

- [ ] **Step 3: Minimal implementieren**

`plugins/forge/scripts/lib/must-show.js`:

```js
'use strict';

// Pflichttext im Chat: Anker aus einer Textdatei ableiten und am Zugende prüfen.

const HEADING = /^#{2,3} /;
const QUESTION = /^(?:\*\*)?Frage \d/;
const MIN_SHARE = 0.6;
const MAX_NAMED = 3;
const MAX_ATTEMPTS = 2;

function squash(line) {
  return line.replace(/\s+/g, ' ').trim();
}

function filledLines(text) {
  return String(text).split('\n').map(squash).filter((line) => line !== '');
}

function anchorsOf(text) {
  return filledLines(text).filter((line) => HEADING.test(line) || QUESTION.test(line));
}

function mustShowOf(text, file) {
  return { file, anchors: anchorsOf(text), lines: filledLines(text).length, text, attempts: 0 };
}

function checkShown(mustShow, shown) {
  const flat = squash(String(shown));
  return {
    missing: mustShow.anchors.filter((anchor) => !flat.includes(anchor)),
    tooShort: filledLines(shown).length < mustShow.lines * MIN_SHARE,
  };
}

function blockReason(mustShow, check) {
  const gap = check.missing.length > 0 ? `Es fehlt: ${check.missing.slice(0, MAX_NAMED).join(' | ')}` : 'Der Text ist zu kurz';
  return `dv-forge: Gib den folgenden Text unverändert im Chat aus. ${gap}. `
    + `Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.\n\n${mustShow.text}`;
}

// `mustShow: null` im Ergebnis heißt: Pflichttext aus dem Marker löschen.
function decideTurnEnd(mustShow, shown) {
  const check = checkShown(mustShow, shown);
  const complete = check.missing.length === 0 && !check.tooShort;
  if (complete || mustShow.attempts >= MAX_ATTEMPTS) return { reason: null, mustShow: null };
  return { reason: blockReason(mustShow, check), mustShow: { ...mustShow, attempts: mustShow.attempts + 1 } };
}

module.exports = { anchorsOf, mustShowOf, decideTurnEnd };
```

Hinweis: `filledLines` zerlegt an `\n`; `squash` entfernt dabei ein anhängendes `\r`, weil `\s` es erfasst. `anchorsOf` bekommt so auch CRLF-Text richtig.

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/must-show.test.js`
Expected: PASS (9 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/must-show.js plugins/forge/tests/must-show.test.js
git commit -m "feat(forge): derive anchors and decide the turn end for must-show texts"
```

---

### Task 2: Zugtext aus dem Transcript (`turn-text.js`)

**Files:**
- Create: `plugins/forge/scripts/lib/turn-text.js`
- Create: `plugins/forge/tests/turn-text.test.js`

**Interfaces:**
- Consumes: `readEntries(file)`, `humanEvents(entries)` aus `scripts/lib/transcript.js` (vorhanden). `humanEvents` liefert Ereignisse `{ kind: 'Eingabe', entryNo, … }` für jede echte Eingabe des Menschen; Tool-Ergebnisse, Harness-Hinweise und Unterbrechungen zählen dort nicht als Eingabe.
- Produces: `turnText(transcriptFile: string, lastMessage?: string): string`. Es liefert alle `text`-Blöcke der `assistant`-Einträge nach der letzten Eingabe des Menschen, dazu `lastMessage`, verbunden mit `\n`. Wirft bei unlesbarem Transcript.

- [ ] **Step 1: Failing test schreiben**

`plugins/forge/tests/turn-text.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { turnText } = require('../scripts/lib/turn-text');

const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const toolCall = () => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } });
const toolResult = () => ({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });

function transcript(entries) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-turn-')), 't.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

test('turnText_TextBeforeToolCall_IsKept', () => {
  // Arrange
  const file = transcript([human('los'), said('FRUEH'), toolCall(), toolResult(), said('spaet')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.match(text, /FRUEH[\s\S]*spaet/);
});

test('turnText_TextBeforeLastHumanInput_IsDropped', () => {
  // Arrange
  const file = transcript([human('eins'), said('ALT'), human('zwei'), said('NEU')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.equal(text.includes('ALT'), false);
  assert.equal(text.includes('NEU'), true);
});

test('turnText_ToolResultAndHarnessNotice_AreNoBoundary', () => {
  // Arrange
  const notice = human('<task-notification>\n<task-id>x</task-id>');
  const file = transcript([human('los'), said('ERSTER'), toolResult(), notice, said('ZWEITER')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.match(text, /ERSTER[\s\S]*ZWEITER/);
});

test('turnText_LastMessage_IsAppended', () => {
  // Arrange
  const file = transcript([human('los'), said('A')]);

  // Act
  const text = turnText(file, 'LETZTE');

  // Assert
  assert.ok(text.endsWith('LETZTE'));
});

test('turnText_SidechainAssistant_IsIgnored', () => {
  // Arrange
  const file = transcript([human('los'), { ...said('FREMD'), isSidechain: true }, said('EIGEN')]);

  // Act
  const text = turnText(file, '');

  // Assert
  assert.equal(text.includes('FREMD'), false);
});

test('turnText_NoHumanInput_UsesAllAssistantText', () => {
  // Arrange
  const file = transcript([said('A'), said('B')]);

  // Act
  const text = turnText(file, undefined);

  // Assert
  assert.match(text, /A[\s\S]*B/);
});

test('turnText_MissingFile_Throws', () => {
  // Act and Assert
  assert.throws(() => turnText(path.join(os.tmpdir(), 'dv-forge-gibt-es-nicht.jsonl'), ''));
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/turn-text.test.js`
Expected: FAIL mit `Cannot find module '../scripts/lib/turn-text'`

- [ ] **Step 3: Minimal implementieren**

`plugins/forge/scripts/lib/turn-text.js`:

```js
'use strict';

// Was der Assistent im laufenden Zug geschrieben hat: alle Texte seit der letzten Eingabe des Menschen.

const { readEntries, humanEvents } = require('./transcript');

function lastInputNumber(entries) {
  const inputs = humanEvents(entries).filter((event) => event.kind === 'Eingabe');
  return inputs.length > 0 ? inputs[inputs.length - 1].entryNo : 0;
}

function textBlocks(entry) {
  const content = entry.message?.content;
  return Array.isArray(content) ? content.filter((part) => part.type === 'text').map((part) => part.text) : [];
}

// `lastMessage` ist die letzte Nachricht aus dem Hook-Input; sie steht womöglich noch nicht im Protokoll.
function turnText(transcriptFile, lastMessage) {
  const entries = readEntries(transcriptFile);
  const since = lastInputNumber(entries);
  const texts = entries
    .filter((entry) => entry.type === 'assistant' && !entry.isSidechain && entry.entryNo > since)
    .flatMap(textBlocks);
  return [...texts, lastMessage ?? ''].join('\n');
}

module.exports = { turnText };
```

- [ ] **Step 4: Test laufen lassen**

Run: `cd plugins/forge && node --test tests/turn-text.test.js`
Expected: PASS (7 Tests)

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/turn-text.js plugins/forge/tests/turn-text.test.js
git commit -m "feat(forge): read the assistant text of the running turn from the transcript"
```

---

### Task 3: Guard — `show`, `pause --show`, `release`, `turn-end`, Hook-Eintrag

**Files:**
- Modify: `plugins/forge/scripts/guard-orchestrator.js` (Funktionen `onPrompt`, `release`, `main`, Exports)
- Modify: `plugins/forge/hooks/hooks.json`
- Modify: `plugins/forge/tests/guard-orchestrator.test.js` (Zeile 133 und Anhang)
- Create: `plugins/forge/tests/hooks.test.js`

**Interfaces:**
- Consumes: `mustShowOf`, `decideTurnEnd` (Task 1); `turnText` (Task 2); im Guard vorhanden: `readMarker`, `writeMarker`, `markerPath`, `pause`.
- Produces (Exporte von `guard-orchestrator.js`):
  - `show(sessionId, file, tmpRoot?)`: merkt `mustShow` vor; wirft bei fehlender Datei, fehlendem Pfad oder ohne Anker; ändert dann den Marker nicht.
  - `pauseWithShow(sessionId, file?, tmpRoot?)`: `pause`, danach `show`, falls `file` gesetzt.
  - `onTurnEnd(input, tmpRoot?)`: liefert den Block-Grund oder `null`; aktualisiert den Marker.
  - `clearMarker(sessionId, tmpRoot?)`: löscht den Marker vollständig.
  - `release(sessionId, tmpRoot?)`: bleibt exportiert; behält jetzt einen vorgemerkten `mustShow`.
- CLI: `show <SESSION> --file <datei>`, `pause <SESSION> [--show <datei>]`, `turn-end` (Stdin-JSON), alle ohne weitere Ausgabe außer `turn-end` bei Block (`{"decision":"block","reason":…}`).

- [ ] **Step 1: Failing tests schreiben**

Zuerst in `plugins/forge/tests/guard-orchestrator.test.js` Zeile 133 ersetzen. Alt:

```js
  assert.equal(hooks.Stop, undefined, 'Stop feuert an jedem Turn-Ende und darf den Guard nicht freigeben');
```

Neu:

```js
  assert.match(hooks.Stop[0].hooks[0].command, / turn-end$/, 'Stop prüft nur den Pflichttext und gibt den Guard nie frei');
```

Dann am Dateiende anhängen:

```js
const SHOWN = ['## Bericht', '', '### Runde 1', 'a', '### Offene Fragen', 'b'].join('\n');

function shownFile(dir, text = SHOWN) {
  const file = path.join(dir, 'bericht.md');
  fs.writeFileSync(file, text);
  return file;
}

function markerOf(env) {
  return JSON.parse(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'));
}

function bareEnv() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-guard-'));
  return { tmpRoot, cwd: tmpRoot };
}

const human = (text) => ({ type: 'user', message: { content: text } });
const said = (text) => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });

function transcriptFile(env, entries) {
  const file = path.join(env.cwd, 't.jsonl');
  fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
  return file;
}

function turnEnd(env, file, last = '') {
  return guard.onTurnEnd({ session_id: SESSION, transcript_path: file, last_assistant_message: last }, env.tmpRoot);
}

test('show_FileWithAnchors_StoresMustShowBesideProtection', () => {
  const env = setup();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const marker = markerOf(env);
  assert.deepEqual(marker.mustShow.anchors, ['## Bericht', '### Runde 1', '### Offene Fragen']);
  assert.equal(marker.mustShow.attempts, 0);
  assert.equal(marker.mustShow.text, SHOWN);
  assert.ok(marker.protected);
});

test('show_CrlfFile_StoresTextWithLf', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd, SHOWN.replace(/\n/g, '\r\n')), env.tmpRoot);
  assert.equal(markerOf(env).mustShow.text, SHOWN);
});

test('show_NoMarker_CreatesMarkerWithMustShowOnly', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.deepEqual(Object.keys(markerOf(env)), ['mustShow']);
});

test('show_FileWithoutAnchors_ThrowsAndLeavesMarker', () => {
  const env = setup();
  const before = fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8');
  assert.throws(() => guard.show(SESSION, shownFile(env.cwd, 'nur Fließtext'), env.tmpRoot), /keine Anker/);
  assert.equal(fs.readFileSync(guard.markerPath(SESSION, env.tmpRoot), 'utf8'), before);
});

test('show_MissingFileOrPath_Throws', () => {
  const env = setup();
  assert.throws(() => guard.show(SESSION, path.join(env.cwd, 'gibt-es-nicht.md'), env.tmpRoot));
  assert.throws(() => guard.show(SESSION, undefined, env.tmpRoot), /--file/);
});

test('pauseWithShow_FileWithAnchors_PausesAndStoresMustShow', () => {
  const env = setup();
  guard.pauseWithShow(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(markerOf(env).paused, true);
  assert.ok(markerOf(env).mustShow);
});

test('pauseWithShow_FileWithoutAnchors_StillPauses', () => {
  const env = setup();
  assert.throws(() => guard.pauseWithShow(SESSION, shownFile(env.cwd, 'text'), env.tmpRoot));
  assert.equal(markerOf(env).paused, true);
  assert.equal(markerOf(env).mustShow, undefined);
});

test('release_WithMustShow_KeepsOnlyMustShowAndAllowsAgain', () => {
  const env = setup();
  guard.pause(SESSION, env.tmpRoot);
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  guard.release(SESSION, env.tmpRoot);
  assert.deepEqual(Object.keys(markerOf(env)), ['mustShow']);
  assert.equal(preTool(env, { tool_name: 'Read', tool_input: { file_path: env.specPath } }), null);
});

test('onPrompt_HumanPromptWithLeftoverMustShow_ClearsMarkerCompletely', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  guard.onPrompt({ session_id: SESSION, cwd: env.cwd, prompt: 'weiter' }, env.tmpRoot);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('decidePreTool_ShowCallOfOrchestrator_IsAllowedWhileSpecIsProtected', () => {
  const env = setup();
  const command = `node "${path.join(path.dirname(SCRIPT), 'guard-orchestrator.js')}" show ${SESSION} --file "${path.join(env.cwd, '.forge', 'spec-review', 'x', 'abschluss', 'bericht.md')}"`;
  assert.equal(preTool(env, { tool_name: 'Bash', tool_input: { command } }), null);
});

test('onTurnEnd_NoMarkerOrNoMustShow_ReturnsNullAndKeepsMarker', () => {
  const env = setup();
  const file = transcriptFile(env, [human('los'), said('x')]);
  assert.equal(turnEnd(env, file), null);
  assert.ok(markerOf(env).protected);
  assert.equal(turnEnd(bareEnv(), file), null);
});

test('onTurnEnd_AllAnchorsShown_FreesAndRemovesEmptyMarker', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN)]), 'fertig'), null);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('onTurnEnd_AllAnchorsShownButProtectionStays_KeepsProtection', () => {
  const env = setup();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN)])), null);
  assert.equal(markerOf(env).mustShow, undefined);
  assert.ok(markerOf(env).protected);
});

test('onTurnEnd_AnchorMissing_BlocksTwiceThenFrees', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const file = transcriptFile(env, [human('los'), said('Kurz: alles gut.')]);
  const first = turnEnd(env, file);
  const second = turnEnd(env, file);
  assert.match(first, /Es fehlt: ## Bericht \| ### Runde 1 \| ### Offene Fragen\./);
  assert.ok(first.endsWith(SHOWN));
  assert.equal(markerOf(env).mustShow.attempts, 2);
  assert.ok(second);
  assert.equal(turnEnd(env, file), null);
  assert.equal(fs.existsSync(guard.markerPath(SESSION, env.tmpRoot)), false);
});

test('onTurnEnd_TextBeforeLaterToolCalls_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const call = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] } };
  const result = { type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } };
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN), call, result]), 'Erledigt.'), null);
});

test('onTurnEnd_TextOnlyInLastMessage_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said('x')]), SHOWN), null);
});

test('onTurnEnd_ShownTextWithCrlf_Allows', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  assert.equal(turnEnd(env, transcriptFile(env, [human('los'), said(SHOWN.replace(/\n/g, '\r\n'))])), null);
});

test('cli_TurnEndWithMissingAnchor_PrintsBlockJson', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const input = JSON.stringify({ session_id: SESSION, transcript_path: transcriptFile(env, [human('los'), said('x')]), last_assistant_message: 'x' });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.ok(output.reason.endsWith(SHOWN));
});

test('cli_TurnEndWithMissingTranscript_FailsOpen', () => {
  const env = bareEnv();
  guard.show(SESSION, shownFile(env.cwd), env.tmpRoot);
  const input = JSON.stringify({ session_id: SESSION, transcript_path: path.join(env.cwd, 'fehlt.jsonl'), last_assistant_message: 'x' });
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const result = spawnSync(process.execPath, [SCRIPT, 'turn-end'], { input, encoding: 'utf8', env: tmpEnv });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /dv-forge guard:/);
});

test('cli_ShowAndPauseShow_StoreMustShow', () => {
  const env = setup();
  const file = shownFile(env.cwd);
  const tmpEnv = { ...process.env, TEMP: env.tmpRoot, TMP: env.tmpRoot, TMPDIR: env.tmpRoot };
  const shown = spawnSync(process.execPath, [SCRIPT, 'show', SESSION, '--file', file], { encoding: 'utf8', env: tmpEnv });
  assert.equal(shown.status, 0);
  assert.ok(markerOf(env).mustShow);
  const paused = spawnSync(process.execPath, [SCRIPT, 'pause', SESSION, '--show', file], { encoding: 'utf8', env: tmpEnv });
  assert.equal(paused.status, 0);
  assert.equal(markerOf(env).paused, true);
});
```

`plugins/forge/tests/hooks.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { hooks } = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'hooks', 'hooks.json'), 'utf8'));
const commandOf = (event) => hooks[event].flatMap((entry) => entry.hooks.map((hook) => hook.command));

test('hooksJson_Stop_RunsTurnEndOfTheGuard', () => {
  assert.deepEqual(commandOf('Stop'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" turn-end']);
});

test('hooksJson_SessionEndAndSubagentStop_StayUnchanged', () => {
  assert.deepEqual(commandOf('SessionEnd'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" stop']);
  assert.deepEqual(commandOf('SubagentStop'), ['node "${CLAUDE_PLUGIN_ROOT}/scripts/result-check.js"']);
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/guard-orchestrator.test.js tests/hooks.test.js`
Expected: FAIL (`guard.show is not a function`, `hooks.Stop` undefined)

- [ ] **Step 3: Implementieren**

In `plugins/forge/scripts/guard-orchestrator.js`:

a) Nach den bestehenden `require`-Zeilen oben ergänzen:

```js
const { mustShowOf, decideTurnEnd } = require('./lib/must-show');
const { turnText } = require('./lib/turn-text');
```

b) `release` ersetzen (Zeilen `function release(sessionId, tmpRoot) { … }`) durch:

```js
function clearMarker(sessionId, tmpRoot) {
  fs.rmSync(markerPath(sessionId, tmpRoot), { force: true });
}

// Gibt den Schutz frei; ein vorgemerkter Pflichttext bleibt für den Stop-Check am Zugende.
function release(sessionId, tmpRoot) {
  const marker = readMarker(sessionId, tmpRoot);
  if (marker?.mustShow) writeMarker(sessionId, { mustShow: marker.mustShow }, tmpRoot);
  else clearMarker(sessionId, tmpRoot);
}
```

c) In `onPrompt` den letzten Aufruf `release(input.session_id, tmpRoot);` ersetzen durch `clearMarker(input.session_id, tmpRoot);`.

d) Nach `pause` einfügen:

```js
function show(sessionId, file, tmpRoot) {
  if (!file) throw new Error('show braucht --file <datei>');
  const mustShow = mustShowOf(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), file);
  if (mustShow.anchors.length === 0) throw new Error(`keine Anker in ${file}`);
  writeMarker(sessionId, { ...(readMarker(sessionId, tmpRoot) ?? {}), mustShow }, tmpRoot);
}

// Das Anhalten gilt auch dann, wenn der Pflichttext nicht vorgemerkt werden kann.
function pauseWithShow(sessionId, file, tmpRoot) {
  pause(sessionId, tmpRoot);
  if (file) show(sessionId, file, tmpRoot);
}

function storeAfterTurn(sessionId, marker, mustShow, tmpRoot) {
  const next = { ...marker };
  delete next.mustShow;
  if (mustShow) next.mustShow = mustShow;
  if (Object.keys(next).length === 0) clearMarker(sessionId, tmpRoot);
  else writeMarker(sessionId, next, tmpRoot);
}

// Block-Grund, wenn der vorgemerkte Pflichttext im Zugtext fehlt; sonst `null`.
function onTurnEnd(input, tmpRoot) {
  const marker = readMarker(input.session_id, tmpRoot);
  if (!marker?.mustShow) return null;
  const shown = turnText(input.transcript_path, input.last_assistant_message);
  const { reason, mustShow } = decideTurnEnd(marker.mustShow, shown);
  storeAfterTurn(input.session_id, marker, mustShow, tmpRoot);
  return reason;
}

function writeBlock(reason) {
  if (reason) process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

function flagValue(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}
```

e) `main` ersetzen durch:

```js
function main() {
  const [event, argument, ...rest] = process.argv.slice(2);
  if (event === 'release') return release(argument);
  if (event === 'pause') return pauseWithShow(argument, flagValue(rest, '--show'));
  if (event === 'show') return show(argument, flagValue(rest, '--file'));
  const input = readStdinJson();
  if (event === 'prompt') return onPrompt(input);
  if (event === 'pretool') return writeDeny(decidePreTool(input));
  if (event === 'turn-end') return writeBlock(onTurnEnd(input));
  if (event === 'stop') return clearMarker(input.session_id);
}
```

f) Exporte ergänzen: Zeile `module.exports = { … release, pause };` wird

```js
module.exports = {
  COMMANDS, PLUGIN_ROOT, markerPath, parseSkillCall, writeMarker, onPrompt, decidePreTool, release, clearMarker, pause, pauseWithShow, show, onTurnEnd,
};
```

`plugins/forge/hooks/hooks.json`: nach dem Eintrag `PreToolUse` (vor `SessionEnd`) einfügen:

```json
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js\" turn-end"
          }
        ]
      }
    ],
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/guard-orchestrator.test.js tests/hooks.test.js tests/must-show.test.js tests/turn-text.test.js`
Expected: PASS, keine Fehler in den bisherigen Guard-Tests (`release_ExistingMarker…`, `pause_…`, `onPrompt_…`).

Hinweis zum Test `decidePreTool_ShowCallOfOrchestrator…`: Er prüft, dass der Schutz den `show`-Aufruf zulässt. Schlägt er fehl, weil `shellTouchesFiles` den Dateinamen der Spec im Befehl findet, ist das der Fehler: Den Pfad im Test dann so wählen, dass er `spec.md` nicht enthält, und den Befund im Commit nennen.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/guard-orchestrator.js plugins/forge/hooks/hooks.json plugins/forge/tests/guard-orchestrator.test.js plugins/forge/tests/hooks.test.js
git commit -m "feat(forge): add the stop hook that demands the must-show text"
```

---

### Task 4: `report` schreibt `bericht.md`

**Files:**
- Modify: `plugins/forge/scripts/lib/flow-report.js` (Funktion `report`)
- Modify: `plugins/forge/tests/review-flow-report.test.js` (Test anhängen)

**Interfaces:**
- Consumes: `writeText`, `CLOSING` (bereits importiert in `flow-report.js`); Testhelfer `setup`, `writeReviewer`, `finding`, `flow`, `report` aus `tests/review-flow-report.test.js`.
- Produces: Datei `<W>/abschluss/bericht.md` mit genau dem Text nach `=== BERICHT ===`.

- [ ] **Step 1: Failing test schreiben** (am Ende von `tests/review-flow-report.test.js` anhängen)

```js
test('report_AnyRun_WritesReportTextToClosingFile', () => {
  // Arrange
  const env = setup();
  writeReviewer(env, 'clarity', []);
  flow('rate', '--review', 'spec-review', '--dir', env.workspace, '--doc', env.doc, '--expect', 'clarity');

  // Act
  const output = report(env);

  // Assert
  const written = fs.readFileSync(path.join(env.workspace, 'abschluss', 'bericht.md'), 'utf8');
  assert.equal(output.split('=== BERICHT ===\n')[1], written.trimEnd());
  assert.match(written, /^## Spec-Review: docs\/x\/spec\.md\n/);
});
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-flow-report.test.js`
Expected: FAIL mit `ENOENT … bericht.md`

- [ ] **Step 3: Implementieren**

In `plugins/forge/scripts/lib/flow-report.js` `report` ersetzen durch:

```js
function report(options) {
  const data = collect(options);
  const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
  const text = renderReport(data, options, status);
  writeClosing(options, data);
  writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
  return [`ENDE ${status}`, '=== BERICHT ===', text].join('\n');
}
```

(`writeClosing` löscht das Verzeichnis `abschluss`; `bericht.md` entsteht deshalb danach.)

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/review-flow-report.test.js tests/followup.test.js`
Expected: PASS (der Followup-Test liest nur `aggregate.md` und `scout.md` aus `abschluss`).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/scripts/lib/flow-report.js plugins/forge/tests/review-flow-report.test.js
git commit -m "feat(forge): write the closing report text to abschluss/bericht.md"
```

---

### Task 5: Ablauftexte — Vorrang-Satz und `show`-Schritte

**Files:**
- Modify: `plugins/forge/shared/review-flow/flow.md` (Abschnitte „Anhalten", „Ende")
- Modify: `plugins/forge/shared/review-loop/loop.md` (Abschnitt „Abschluss", Schritt 3)
- Modify: `plugins/forge/skills/review-followup/SKILL.md` (Schritte 5 und 6)
- Modify: `plugins/forge/skills/review-followup/references/flow.md` (Abschnitt „Bericht")
- Modify: `plugins/forge/tests/review-flow-doc.test.js`, `plugins/forge/tests/review-followup-skill.test.js`

**Interfaces:**
- Consumes: CLI aus Task 3 (`pause <SESSION> --show <datei>`, `show <SESSION> --file <datei>`); Datei `<W>/abschluss/bericht.md` aus Task 4; `<W>/runde-1/fragen.md` (schreibt `rework-check` bereits).
- Produces: nichts für spätere Tasks.

Der Vorrang-Satz (`PRIO`) lautet wörtlich: `Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.` Im Followup-Skill lautet er: `Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.`

- [ ] **Step 1: Failing tests schreiben**

In `tests/review-flow-doc.test.js` oben nach `FLOW` ergänzen:

```js
const LOOP = path.join(__dirname, '..', 'shared', 'review-loop', 'loop.md');
const PRIO = 'Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.';
```

und am Dateiende anhängen:

```js
test('flow_Pause_ShowsQuestionsFileAndPutsPriorityFirst', () => {
  // Act
  const pause = section(readText(FLOW), 'Anhalten');

  // Assert
  assert.ok(pause.includes('guard-orchestrator.js" pause <SESSION> --show "<W>/runde-1/fragen.md"'));
  assert.ok(pause.includes(PRIO));
});

test('flow_End_ShowsReportFileBeforeCleanupAndKeepsPriority', () => {
  // Act
  const end = section(readText(FLOW), 'Ende');

  // Assert
  const order = ['review-flow.js" report', 'guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"', 'workspace.js" remove <rolle> <slug>', 'guard-orchestrator.js" release <SESSION>'];
  const positions = order.map((part) => end.indexOf(part));
  assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(end.includes(PRIO));
});

test('loop_Closing_KeepsPriorityForTheReport', () => {
  // Act
  const closing = section(readText(LOOP), 'Abschluss');

  // Assert
  assert.ok(closing.includes(PRIO));
});
```

In `tests/review-followup-skill.test.js` anhängen:

```js
test('reviewFollowupSkill_Body_ShowsReportFileBeforeCleanupAndKeepsPriority', () => {
  const { body } = readMarkdown(SKILL);
  const show = body.indexOf('scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<W>/abschluss/bericht.md"');
  assert.ok(show > -1, 'show fehlt');
  assert.ok(show < body.indexOf('scripts/workspace.js" remove <rolle> <slug>'), 'show muss vor remove stehen');
  assert.ok(body.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.'));
  assert.ok(wordCount(body) < 500);
});

test('reviewFollowupFlow_Report_KeepsPriority', () => {
  const text = readText(FLOW);
  const report = text.slice(text.indexOf('## Bericht'), text.indexOf('## Nächster Schritt'));
  assert.ok(report.includes('Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.'));
});
```

- [ ] **Step 2: Tests laufen lassen, Fehlschlag prüfen**

Run: `cd plugins/forge && node --test tests/review-flow-doc.test.js tests/review-followup-skill.test.js`
Expected: FAIL in den vier neuen Tests (Satz und `show` fehlen)

- [ ] **Step 3: Texte ändern**

`shared/review-flow/flow.md`, Abschnitt „Anhalten": Die Schritte 1 und 2 lauten danach:

```
1. Gib den Text nach `=== FRAGEN ===` unverändert aus, darunter `Antworte im Chat; „später“ lässt eine Frage offen.` Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
2. `node "<PLUGIN>/scripts/guard-orchestrator.js" pause <SESSION> --show "<W>/runde-1/fragen.md"`. Dann endet deine Antwort.
```

`flow.md`, Abschnitt „Ende": Schritt 3 bekommt hinter `Nichts committen.` den Satz ` Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.` (er bleibt in derselben Zeile; deren letztes `; `-Segment beginnt weiter mit `zuletzt …`). Schritt 4 lautet danach:

```
4. Nur wenn `report` ohne Exit 1 lief: `node "<PLUGIN>/scripts/guard-orchestrator.js" show <SESSION> --file "<W>/abschluss/bericht.md"`. Dann `node "<PLUGIN>/scripts/workspace.js" remove <rolle> <slug>`, dann `node "<PLUGIN>/scripts/guard-orchestrator.js" release <SESSION>`.
```

`shared/review-loop/loop.md`, Abschnitt „Abschluss", Schritt 3 wird:

```
3. Bericht im Chat nach `<PLUGIN>/shared/review-loop/report-format.md`; der Scout-Abschnitt ist die Ausgabe von `save`. Nichts committen. Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Text.
```

`skills/review-followup/SKILL.md`: Schritt 5 bekommt am Ende ` Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht.` Schritt 6 lautet:

```
6. **Ende**, auch nach einem Fehler: bei `spec-review` und `plan-review`, sofern `report` ohne Exit 1 lief, zuerst `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<W>/abschluss/bericht.md"`; dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/workspace.js" remove <rolle> <slug>` mit der Rolle des Original-Reviews (`spec-review`, `plan-review` oder `review`), dann `node "${CLAUDE_PLUGIN_ROOT}/scripts/guard-orchestrator.js" release ${CLAUDE_SESSION_ID}`.
```

`skills/review-followup/references/flow.md`, Abschnitt „Bericht": als letzte Zeile des Abschnitts (vor `## Nächster Schritt`) einfügen:

```
Dieses Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks. Der Zug endet nicht ohne diesen Bericht. Bei Spec und Plan liegt der Teil aus `report` in `<W>/abschluss/bericht.md` und wird vor dem Freigeben mit `guard-orchestrator.js show` vorgemerkt; bei der Implementierung gibt es keine Berichtsdatei, dort gilt nur der Satz.
```

- [ ] **Step 4: Tests laufen lassen**

Run: `cd plugins/forge && node --test tests/review-flow-doc.test.js tests/review-followup-skill.test.js tests/review-loop.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/shared plugins/forge/skills/review-followup plugins/forge/tests/review-flow-doc.test.js plugins/forge/tests/review-followup-skill.test.js
git commit -m "docs(forge): demand the report in the chat and register it for the stop hook"
```

---

### Task 6: Gesamtlauf und Handprobe

**Files:** keine Änderung außer Nachbesserungen.

- [ ] **Step 1: Gesamte Suite**

Run: `cd plugins/forge && node --test`
Expected: alle Tests PASS. Schlägt ein bisher grüner Test fehl (z. B. `*-skill.test.js` mit Wortgrenzen), die Ursache beheben und im Commit nennen.

- [ ] **Step 2: Handprobe der CLI**

Run (Git Bash, im Repo-Root):

```bash
cd plugins/forge
d=$(mktemp -d); printf '## Bericht\n\n### Runde 1\nx\n' > "$d/bericht.md"
TMPDIR=$d TEMP=$d TMP=$d node scripts/guard-orchestrator.js show probe --file "$d/bericht.md"
printf '{"type":"user","message":{"content":"los"}}\n{"type":"assistant","message":{"content":[{"type":"text","text":"nichts"}]}}\n' > "$d/t.jsonl"
echo "{\"session_id\":\"probe\",\"transcript_path\":\"$d/t.jsonl\",\"last_assistant_message\":\"nichts\"}" | TMPDIR=$d TEMP=$d TMP=$d node scripts/guard-orchestrator.js turn-end
```

Expected: letzte Zeile gibt `{"decision":"block","reason":"dv-forge: Gib den folgenden Text unverändert im Chat aus. Es fehlt: ## Bericht | ### Runde 1. …"}` aus.

- [ ] **Step 3: Desktop-Probe nach dem Zusammenführen (Mensch)**

Plugin neu laden, ein `/dv-forge:spec-review` mit Absicht auf eine Spec laufen lassen, die Fragen erzeugt. Beobachten: Die letzte Chat-Nachricht enthält jede Zeile `Frage n …`; fehlt eine, erscheint ein Block-Hinweis des Hooks und der Text wird nachgereicht.

- [ ] **Step 4: Abschluss**

`git status` prüfen (nur Dateien dieses Plans), nichts weiter committen. Version-Bump macht der Mensch beim Zusammenführen von TP-A, TP-B und TP-C.
