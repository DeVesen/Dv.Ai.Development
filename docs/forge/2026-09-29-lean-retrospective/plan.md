# Prozess-Retrospektive schlank und genauer — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-09-29-lean-retrospective/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die Prozess-Retrospektive zählt korrekt, misst bisher unsichtbare Kosten und kommt mit 2 bis 3 statt 8 bis 12 Modell-Anfragen aus, weil alles Deterministische in Skripten läuft.
**Architektur:** `session-facts.js` misst mehr (neue Bibliothek `lib/session-metrics.js`, gemeinsame Protokoll-Helfer in `lib/transcript.js`) und schreibt einen Snapshot; `retro-report.js` prüft den Entwurf des Modells mit `lib/report-lint.js` und setzt daraus den Bericht zusammen. Der Skill spielt Fakten und Berichtsformat per `!`-Befehl schon beim Aufruf ein, zum Nachlesen dient `session-timeline.js`, und `wishes-aggregate.js` sortiert alle Berichte nach Ziel vor.
**Tech-Stack:** Node.js 22 (nur Standardbibliothek), `node:test`, Claude-Code-Skill (Markdown mit Frontmatter)
**Spec:** docs/forge/2026-09-29-lean-retrospective/spec.md
**Basis:** 3ce509e

## Global Constraints
- Nur die Node-Standardbibliothek (`node:fs`, `node:os`, `node:path`, `node:child_process`); das Plugin hat kein `package.json` und bekommt keine Abhängigkeit.
- Tests mit `node:test` und `node:assert/strict`, ausgeführt von der Checkout-Wurzel: `node --test plugins/forge/tests/<name>.test.js`; Gesamtlauf `node --test "plugins/forge/tests/*.test.js"` (Anführungszeichen, damit Node selbst den Stern auflöst, auch unter PowerShell).
- Meldungen, Ausgaben und Kommentare in den Skripten auf Deutsch wie im übrigen Plugin; Bezeichner auf Englisch.
- Pfade in Skripten und Tests über `path.join`/`path.resolve`; erwartete Pfade in Tests nie als fester String mit `/`, außer das Skript gibt sie selbst als POSIX-Pfad aus.
- Skill-Konventionen der Projekt-`CLAUDE.md`: `description` beginnt mit „Use when…“, SKILL.md-Body unter 500 Wörtern, kein `@`-Link im Body.
- unit-integration-testing: Testnamen nach dem Schema des Plugins `<Einheit>_<Situation>_<Ergebnis>` in flachen `test(...)`-Aufrufen.
- unit-integration-testing: Aufbau jedes neuen Tests mit `// Arrange`, `// Act`, `// Assert`; Act ist genau eine Zeile.
- unit-integration-testing: Ein Test prüft ein Verhalten; mehrere Asserts nur, wenn sie zusammen dieses eine Verhalten prüfen.
- unit-integration-testing: Tests sind unabhängig; jede Fixture liegt in einem eigenen `fs.mkdtempSync`-Ordner.
- unit-integration-testing: Getestet wird über die öffentliche Oberfläche, also exportierte Funktionen oder den CLI-Aufruf.
- Code wird wörtlich wie im Plan übernommen; jede Ersetzung trifft genau eine Stelle. Findet sich ein Block nicht genau einmal, ist das ein Plan-Fehler: stoppen und melden, nicht raten.
- Commits nach Conventional Commits wie im Repo (`feat(forge): …`, `fix(forge): …`); die Einstellung `Commit-Konvention` ist leer. Jeder Task committet genau seine Dateien.

---

### Task 1: Gemeinsame Protokoll-Helfer und echte Zählung menschlicher Eingaben

**ACs:** AC-01

**Dateien:**
- Create: `plugins/forge/scripts/lib/transcript.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `function analyze`
- Test: `plugins/forge/tests/transcript.test.js`
- Test: `plugins/forge/tests/session-facts.test.js` · `analyze_CountsTurnsTokensToolsErrorsRepeatsSkillsCompactions`

**Interfaces:**
- Consumes: – (erster Task)
- Produces: `plugins/forge/scripts/lib/transcript.js` exportiert: `NOTICE: RegExp`, `SLASH_COMMAND: RegExp`, `COMMAND_ARGS: RegExp`, `readEntries(file: string): object[]`, `textOf(content: string|object[]): string`, `tokensOf(usage?: object): { input: number, cached: number, output: number }`, `clock(time: number|null): string` (UTC `HH:MM` oder `--:--`), `oneLine(text: string, max: number): string`, `callLabel(part: object): string`, `isHumanTurn(entry: object): boolean`, `requestsOf(entries: object[]): { index: number, time: number|null, input: number, cacheWrite: number, cacheRead: number, output: number, context: number }[]`
- Produces: `session-facts.js` exportiert unverändert `readEntries` (jetzt aus `lib/transcript.js` weitergereicht).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/transcript.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const transcript = require('../scripts/lib/transcript.js');

function user(content, extra = {}) {
  return { type: 'user', message: { role: 'user', content }, ...extra };
}

test('isHumanTurn_PlainText_IsHuman', () => {
  // Arrange
  const entry = user('Prüf mal den Skill');

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, true);
});

test('isHumanTurn_SkillTextInjectedAsMeta_IsNotHuman', () => {
  // Arrange
  const entry = user([{ type: 'text', text: 'Base directory for this skill: /x' }], { isMeta: true, sourceToolUseID: 't1' });

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, false);
});

test('isHumanTurn_CompactSummary_IsNotHuman', () => {
  // Arrange
  const entry = user('This session is being continued from a previous conversation', { isCompactSummary: true });

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, false);
});

test('isHumanTurn_TaskNotification_IsNotHuman', () => {
  // Arrange
  const entry = user('<task-notification>fertig</task-notification>');

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, false);
});

test('isHumanTurn_SlashCommand_IsHuman', () => {
  // Arrange
  const entry = user('<command-message>x</command-message>\n<command-name>/dv-forge:init</command-name>');

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, true);
});

test('isHumanTurn_OriginHumanWithNoticeLikeText_IsHuman', () => {
  // Arrange
  const entry = user('<system-reminder> habe ich selbst eingefügt', { origin: { kind: 'human' } });

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, true);
});

test('isHumanTurn_ToolResult_IsNotHuman', () => {
  // Arrange
  const entry = user([{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }]);

  // Act
  const result = transcript.isHumanTurn(entry);

  // Assert
  assert.equal(result, false);
});

test('requestsOf_SameRequestIdTwice_CountsOneRequestWithContext', () => {
  // Arrange
  const usage = { input_tokens: 2, cache_creation_input_tokens: 100, cache_read_input_tokens: 900, output_tokens: 50 };
  const entries = [
    { type: 'assistant', requestId: 'r1', timestamp: '2026-09-27T10:00:00Z', message: { usage, content: [] } },
    { type: 'assistant', requestId: 'r1', timestamp: '2026-09-27T10:00:01Z', message: { usage, content: [] } },
  ];

  // Act
  const requests = transcript.requestsOf(entries);

  // Assert
  assert.deepEqual(requests, [{
    index: 0, time: Date.parse('2026-09-27T10:00:00Z'), input: 2, cacheWrite: 100, cacheRead: 900, output: 50, context: 1002,
  }]);
});

test('oneLine_LongTextWithBreaks_CollapsesAndCuts', () => {
  // Arrange
  const text = 'eins\nzwei   drei vier';

  // Act
  const result = transcript.oneLine(text, 10);

  // Assert
  assert.equal(result, 'eins zwei…');
});

test('clock_TimestampOrNone_ReturnsUtcTimeOrDashes', () => {
  // Arrange
  const times = [Date.parse('2026-09-27T10:05:59Z'), null];

  // Act
  const result = times.map(transcript.clock);

  // Assert
  assert.deepEqual(result, ['10:05', '--:--']);
});
```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('analyze_SkillTextInjectedAsMeta_NotCountedAsHumanInput', () => {
  // Arrange
  const entries = [
    { type: 'user', message: { role: 'user', content: 'Prüf den Skill' } },
    { type: 'user', isMeta: true, sourceToolUseID: 't1', message: { role: 'user', content: [{ type: 'text', text: 'Base directory for this skill: /x' }] } },
  ];

  // Act
  const result = facts.analyze(entries);

  // Assert
  assert.equal(result.turns, 1);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/transcript.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `analyze_SkillTextInjectedAsMeta_NotCountedAsHumanInput`, FAIL `plugins/forge/tests/transcript.test.js` (Modul `../scripts/lib/transcript.js` fehlt)

- [ ] **Schritt 3: Minimal implementieren**

Neue Datei `plugins/forge/scripts/lib/transcript.js`:

```js
'use strict';

// Gemeinsame Bausteine zum Lesen eines Claude-Code-Session-Protokolls (JSONL).

const fs = require('node:fs');

const NOTICE = /^\s*<(?:task-notification|agent-message|system-reminder|command-|local-command)/;
const SLASH_COMMAND = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
const COMMAND_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;

function readEntries(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim() !== '').flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('\n');
}

function tokensOf(usage = {}) {
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  return { input, cached: usage.cache_read_input_tokens ?? 0, output: usage.output_tokens ?? 0 };
}

// Uhrzeit (UTC) eines Zeitstempels in Millisekunden, "--:--" ohne Zeitstempel.
function clock(time) {
  return time === null ? '--:--' : new Date(time).toISOString().slice(11, 16);
}

function oneLine(text, max) {
  const line = String(text).replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

// Kurzform eines Aufrufs: Tool plus wichtigstes Argument.
function callLabel(part) {
  const input = part.input ?? {};
  const detail = input.command ?? input.file_path ?? input.pattern ?? input.path ?? input.skill ?? input.description ?? '';
  return `${part.name}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
}

// Eine Eingabe des Menschen: kein Tool-Ergebnis, kein eingeblendeter Skill-Text (isMeta), keine Zusammenfassung.
// Ein Slash-Befehl zählt, auch wenn er mit <command-message> beginnt.
function isHumanTurn(entry) {
  if (entry.type !== 'user' || entry.isMeta || entry.isCompactSummary) return false;
  const content = entry.message?.content;
  if (Array.isArray(content) && content.some((part) => part.type === 'tool_result')) return false;
  if (entry.origin?.kind === 'human') return true;
  const text = textOf(content);
  return SLASH_COMMAND.test(text) || !NOTICE.test(text);
}

// Eine Zeile je API-Anfrage (gleiche requestId = eine Anfrage), in der Reihenfolge des Protokolls.
function requestsOf(entries) {
  const seen = new Set();
  const requests = [];
  entries.forEach((entry, index) => {
    if (entry.type !== 'assistant' || !entry.message) return;
    const id = entry.requestId ?? entry.uuid ?? `index-${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    const usage = entry.message.usage ?? {};
    const input = usage.input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    requests.push({
      index, time: entry.timestamp ? Date.parse(entry.timestamp) : null,
      input, cacheWrite, cacheRead, output: usage.output_tokens ?? 0, context: input + cacheWrite + cacheRead,
    });
  });
  return requests;
}

module.exports = {
  NOTICE, SLASH_COMMAND, COMMAND_ARGS, readEntries, textOf, tokensOf, clock, oneLine, callLabel, isHumanTurn, requestsOf,
};
```

In `plugins/forge/scripts/session-facts.js` (Anker `const mcpUsage = require`) diesen Block

```js
const mcpUsage = require('./mcp-usage.js');
```

ersetzen durch:

```js
const mcpUsage = require('./mcp-usage.js');
const { SLASH_COMMAND, readEntries, textOf, tokensOf, callLabel, isHumanTurn } = require('./lib/transcript.js');
```

In `plugins/forge/scripts/session-facts.js` (Anker `const NOTICE`) diesen Block samt der folgenden Leerzeile löschen:

```js
const NOTICE = /^\s*<(?:task-notification|agent-message|system-reminder|command-|local-command)/;
const SLASH_COMMAND = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
```

In `plugins/forge/scripts/session-facts.js` (Anker `function readEntries`) diesen Block samt der folgenden Leerzeile löschen:

```js
function readEntries(file) {
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim() !== '').flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('\n');
}

function tokensOf(usage = {}) {
  const input = (usage.input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  return { input, cached: usage.cache_read_input_tokens ?? 0, output: usage.output_tokens ?? 0 };
}

```

In `plugins/forge/scripts/session-facts.js` (Anker `function callLabel`) diesen Block samt der folgenden Leerzeile löschen:

```js
// Kurzform eines Aufrufs für die Sparpotenzial-Liste: Tool plus wichtigstes Argument.
function callLabel(part) {
  const input = part.input ?? {};
  const detail = input.command ?? input.file_path ?? input.pattern ?? input.path ?? input.skill ?? input.description ?? '';
  return `${part.name}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
}

```

In `plugins/forge/scripts/session-facts.js` (Anker `function isHumanTurn`) diesen Block samt der folgenden Leerzeile löschen:

```js
// Ein Slash-Befehl ist eine Eingabe des Menschen, auch wenn er mit <command-message> beginnt.
function isHumanTurn(content) {
  if (Array.isArray(content) && content.some((part) => part.type === 'tool_result')) return false;
  const text = textOf(content);
  return SLASH_COMMAND.test(text) || !NOTICE.test(text);
}

```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
      if (isHumanTurn(content)) facts.turns += 1;
```

ersetzen durch:

```js
      if (isHumanTurn(entry)) facts.turns += 1;
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/transcript.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/transcript.test.js plugins/forge/tests/session-facts.test.js plugins/forge/scripts/lib/transcript.js plugins/forge/scripts/session-facts.js` · `git commit -m "fix(forge): count only real human inputs in session facts"`

### Task 2: Kontext je Anfrage in den Session-Fakten

**ACs:** AC-02

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `function analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `function factLines`
- Test: `plugins/forge/tests/session-facts.test.js` · `function session()`

**Interfaces:**
- Consumes: Task 1: `tokensOf(usage)` aus `lib/transcript.js`
- Produces: `analyze(entries)` liefert zusätzlich `maxContext: number`; `factLines` gibt die Zeile `- Kontext je Anfrage: Ø <n>k, größte <n>k` aus.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_File_PrintsAverageAndLargestContextPerRequest', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /- Kontext je Anfrage: Ø 6k, größte 6k\n/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_File_PrintsAverageAndLargestContextPerRequest`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
    turns: 0, requests: 0, input: 0, cached: 0, output: 0, models: new Set(), tools: new Map(), errors: new Map(),
```

ersetzen durch:

```js
    turns: 0, requests: 0, input: 0, cached: 0, output: 0, maxContext: 0, models: new Set(), tools: new Map(), errors: new Map(),
```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
        facts.output += tokens.output;
      }
```

ersetzen durch:

```js
        facts.output += tokens.output;
        facts.maxContext = Math.max(facts.maxContext, tokens.input + tokens.cached);
      }
```

In `plugins/forge/scripts/session-facts.js` (Anker `function factLines`) diesen Block

```js
function factLines(facts, agents) {
```

ersetzen durch:

```js
function contextLine(facts) {
  if (facts.requests === 0) return '-';
  return `Ø ${thousands((facts.input + facts.cached) / facts.requests)}, größte ${thousands(facts.maxContext)}`;
}

function factLines(facts, agents) {
```

In `plugins/forge/scripts/session-facts.js` (Anker `function factLines`) diesen Block

```js
    `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
```

ersetzen durch:

```js
    `- Kontext je Anfrage: ${contextLine(facts)}`,
    `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-facts.test.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): show average and largest context per request in session facts"`

### Task 3: Schalter `--no-fail` und Vorrang von `--file` vor `--session`

**ACs:** AC-03, AC-04

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `function parseArgs`
- Modify: `plugins/forge/scripts/session-facts.js` · `function main`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_BadArgsOrMissingFile_ExitCodes`

**Interfaces:**
- Consumes: –
- Produces: `parseArgs` kennt Schalter ohne Wert über `SWITCHES` (`--no-fail` → `options.noFail = true`); mit `--file` wird `options.session` verworfen.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_FileAndSession_FileWins', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--session', 'gibt-es-nicht', '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /# Session-Fakten: s1/);
});

test('cli_NoFailAndMissingFile_ReportsOnStdoutWithExitZero', () => {
  // Arrange
  const args = [SCRIPT, '--file', '/gibt/es/nicht.jsonl', '--no-fail'];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^Fakten nicht verfügbar: Session-Datei nicht gefunden: .*nicht\.jsonl\n$/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_FileAndSession_FileWins`, FAIL `cli_NoFailAndMissingFile_ReportsOnStdoutWithExitZero`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/session-facts.js` (Anker `const USAGE`) diesen Block

```js
  + ' [--since-command <name> [--occurrence <n>]] [--skeleton <bericht.md>]\n';
```

ersetzen durch:

```js
  + ' [--since-command <name> [--occurrence <n>]] [--skeleton <bericht.md>] [--no-fail]\n';
```

In `plugins/forge/scripts/session-facts.js` (Anker `const FLAGS`) diesen Block

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--skeleton': 'skeleton',
};
```

ersetzen durch:

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--skeleton': 'skeleton',
};
const SWITCHES = { '--no-fail': 'noFail' };
```

In `plugins/forge/scripts/session-facts.js` (Anker `function parseArgs`) diesen Block

```js
function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = FLAGS[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
  }
  if (options.file && options.session) return null;
```

ersetzen durch:

```js
function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (SWITCHES[args[index]]) {
      options[SWITCHES[args[index]]] = true;
      continue;
    }
    const key = FLAGS[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
    index += 1;
  }
  // Der Skill gibt immer --session mit; ein --file aus den Argumenten des Menschen hat Vorrang.
  if (options.file) delete options.session;
```

In `plugins/forge/scripts/session-facts.js` (Anker `function main`) diesen Block

```js
    if (!(error instanceof FactsError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
```

ersetzen durch:

```js
    if (!(error instanceof FactsError)) throw error;
    // Im Skill läuft das Skript vor dem Laden; ein Exit-Code ungleich 0 bräche den ganzen Skill-Aufruf ab.
    if (options.noFail) {
      process.stdout.write(`Fakten nicht verfügbar: ${error.message}\n`);
      return;
    }
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-facts.test.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): let --file win over --session and add --no-fail to session facts"`

### Task 4: Schnitt vor dem letzten Aufruf eines Befehls (`--until-command`)

**ACs:** AC-05

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `function sliceByCommand`
- Modify: `plugins/forge/scripts/session-facts.js` · `function render`
- Modify: `plugins/forge/scripts/session-facts.js` · `function run`
- Test: `plugins/forge/tests/session-facts.test.js` · `function commandSession()`

**Interfaces:**
- Consumes: vorhanden: `invokes(entry, name)`, `firstTime(entries, from)`, `sliceByCommand(entries, name, occurrence)` in `session-facts.js`
- Produces: `cutBeforeLast(entries, name): { entries, keepSubagent(agentEntries): boolean, cut: number|null, label: string|null }`
- Produces: `selectEntries(all, options): { entries, keep(agentEntries): boolean, cut: number|null, labels: string[] }` — Task 7 und 10 nutzen `cut` und `labels`.
- Produces: `render(sessionFile, facts, agents, labels = [])` — vierter Parameter ist jetzt ein Array.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_UntilCommand_StopsBeforeLastInvocationAndKeepsEarlierSubagents', () => {
  // Arrange
  const file = commandSession();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file, '--until-command', 'prozess-retrospektive'], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /- Schnitt: vor dem letzten Aufruf von prozess-retrospektive\n[\s\S]*- Tokens Subagents: 0k in 2 Agents\n- Tool-Aufrufe: Bash 1, Write 1\n/);
});

test('cli_UntilCommandWithoutInvocation_KeepsWholeSession', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file, '--until-command', 'prozess-retrospektive'], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /- Tool-Aufrufe: Bash 2, Skill 1\n/);
});

test('cli_UntilAndSinceCommand_SliceInsideTheCut', () => {
  // Arrange
  const args = [SCRIPT, '--file', commandSession(), '--until-command', 'prozess-retrospektive', '--since-command', 'prozess-retrospektive'];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /Ausschnitt: Aufruf 1 von 1 von prozess-retrospektive[\s\S]*- Tool-Aufrufe: Write 1\n/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_UntilCommand_StopsBeforeLastInvocationAndKeepsEarlierSubagents`, FAIL `cli_UntilCommandWithoutInvocation_KeepsWholeSession`, FAIL `cli_UntilAndSinceCommand_SliceInsideTheCut`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/session-facts.js` (Anker `const USAGE`) diesen Block

```js
  + ' [--since-command <name> [--occurrence <n>]] [--skeleton <bericht.md>] [--no-fail]\n';
```

ersetzen durch:

```js
  + ' [--until-command <name>] [--since-command <name> [--occurrence <n>]] [--skeleton <bericht.md>] [--no-fail]\n';
```

In `plugins/forge/scripts/session-facts.js` (Anker `const FLAGS`) diesen Block

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--skeleton': 'skeleton',
};
```

ersetzen durch:

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--skeleton': 'skeleton', '--until-command': 'untilCommand',
};
```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
function analyze(entries) {
```

ersetzen durch:

```js
// Schnitt vor dem letzten Aufruf eines Befehls oder Skills, damit die Retrospektive sich nicht selbst mitzählt.
// Gibt es keinen Aufruf, bleibt die Session ganz.
function cutBeforeLast(entries, name) {
  const starts = entries.flatMap((entry, index) => (invokes(entry, name) ? [index] : []));
  if (starts.length === 0) return { entries, keepSubagent: () => true, cut: null, label: null };
  const last = starts[starts.length - 1];
  const cut = firstTime(entries, last);
  const keepSubagent = (agentEntries) => {
    const start = firstTime(agentEntries, 0);
    return cut === null || start === null || start < cut;
  };
  return { entries: entries.slice(0, last), keepSubagent, cut, label: `Schnitt: vor dem letzten Aufruf von ${name}` };
}

// Erst der Schnitt, dann der Ausschnitt innerhalb des Schnitts.
function selectEntries(all, options) {
  const until = options.untilCommand ? cutBeforeLast(all, options.untilCommand)
    : { entries: all, keepSubagent: () => true, cut: null, label: null };
  const slice = options.sinceCommand ? sliceByCommand(until.entries, options.sinceCommand, options.occurrence ?? -1) : null;
  const keepSlice = slice?.keepSubagent ?? (() => true);
  return {
    entries: slice?.entries ?? until.entries,
    keep: (agentEntries) => until.keepSubagent(agentEntries) && keepSlice(agentEntries),
    cut: until.cut,
    labels: [until.label, slice?.label].filter(Boolean),
  };
}

function analyze(entries) {
```

In `plugins/forge/scripts/session-facts.js` (Anker `function render`) diesen Block

```js
function render(sessionFile, facts, agents, label = null) {
  const errorLines = errorLinesOf(facts);
  return [
    `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
    '',
    ...(label ? [`- ${label}`] : []),
```

ersetzen durch:

```js
function render(sessionFile, facts, agents, labels = []) {
  const errorLines = errorLinesOf(facts);
  return [
    `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
    '',
    ...labels.map((label) => `- ${label}`),
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  const all = readEntries(file);
  const slice = options.sinceCommand ? sliceByCommand(all, options.sinceCommand, options.occurrence ?? -1) : null;
  const entries = slice?.entries ?? all;
  const keep = slice?.keepSubagent ?? (() => true);
```

ersetzen durch:

```js
  const { entries, keep, labels } = selectEntries(readEntries(file), options);
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  let output = `${render(file, facts, agents, slice?.label)}\n${savings(allFacts)}\n${mcp}`;
```

ersetzen durch:

```js
  let output = `${render(file, facts, agents, labels)}\n${savings(allFacts)}\n${mcp}`;
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-facts.test.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): cut session facts before the last call of a command"`

### Task 5: Erwartete MCP-Server aus den Projekt-Einstellungen

**ACs:** AC-06

**Dateien:**
- Modify: `plugins/forge/scripts/forge-config.js` · `const DEFAULTS`
- Modify: `plugins/forge/skills/init/SKILL.md` · `## Schlüssel`
- Modify: `plugins/forge/scripts/session-facts.js` · `function run`
- Test: `plugins/forge/tests/session-facts.test.js` · `const facts = require('../scripts/session-facts.js');`
- Test: `plugins/forge/tests/work-skills.test.js` · `init_Body_ListsEveryConfigKey`

**Interfaces:**
- Consumes: vorhanden: `readConfig(cwd): { root: string, config: object }` und `ConfigError` aus `forge-config.js`
- Produces: Einstellung `Erwartete-MCPs` (Default leer) in `forge-config.js`.
- Produces: `projectSettings(cwd): { root: string, expect: string[] }` in `session-facts.js` — Task 10 nutzt `root`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `plugins/forge/tests/session-facts.test.js` (Anker `const facts = require('../scripts/session-facts.js');`) diesen Block

```js
const facts = require('../scripts/session-facts.js');
```

ersetzen durch:

```js
const facts = require('../scripts/session-facts.js');
const { commitFile, makeRepo } = require('./lib/git-repo');
```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_ProjectConfigExpectsMcp_MarksItAsExpectedButUnused', () => {
  // Arrange
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- Erwartete-MCPs: context7, dev-mcp\n', 'config');

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--cwd', repo], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /\| context7 \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/work-skills.test.js plugins/forge/tests/forge-config.test.js` — erwartet: FAIL `cli_ProjectConfigExpectsMcp_MarksItAsExpectedButUnused`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/forge-config.js` (Anker `const DEFAULTS`) diesen Block

```js
  'Commit-Konvention': '',
};
```

ersetzen durch:

```js
  'Commit-Konvention': '',
  'Erwartete-MCPs': '',
};
```

In `plugins/forge/skills/init/SKILL.md` (Anker `## Schlüssel`) diesen Block

```markdown
| `Commit-Konvention` | Regel oder Skill, z. B. `commit-message` | leer |
```

ersetzen durch:

```markdown
| `Commit-Konvention` | Regel oder Skill, z. B. `commit-message` | leer |
| `Erwartete-MCPs` | MCP-Server, die jede Session nutzen soll, mit Komma getrennt | leer |
```

In `plugins/forge/skills/init/SKILL.md` (Anker `## Häufige Fehler`) diesen Block samt der folgenden Leerzeile löschen:

```markdown
| Stolperfallen ungefragt umschreiben | Je Datei fragen, dann nur die freigegebenen Zeilen ändern. |
```

In `plugins/forge/scripts/session-facts.js` (Anker `const mcpUsage = require`) diesen Block

```js
const mcpUsage = require('./mcp-usage.js');
```

ersetzen durch:

```js
const mcpUsage = require('./mcp-usage.js');
const { ConfigError, readConfig } = require('./forge-config.js');
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
function run(options) {
```

ersetzen durch:

```js
// Projektwurzel und erwartete MCP-Server aus den Projekt-Einstellungen; außerhalb eines Git-Repos gilt der Ordner selbst.
function projectSettings(cwd) {
  try {
    const { root, config } = readConfig(cwd);
    return { root, expect: config['Erwartete-MCPs'].split(',').map((name) => name.trim()).filter(Boolean) };
  } catch (error) {
    if (error instanceof ConfigError) return { root: cwd, expect: [] };
    throw error;
  }
}

function run(options) {
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  const mcp = mcpUsage.render(session, { expect: options.expect, transcript: file });
```

ersetzen durch:

```js
  const project = projectSettings(session.cwd ?? process.cwd());
  const expect = [...(options.expect ?? []), ...project.expect];
  const mcp = mcpUsage.render(session, { expect, transcript: file });
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/work-skills.test.js plugins/forge/tests/forge-config.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-facts.test.js plugins/forge/scripts/forge-config.js plugins/forge/skills/init/SKILL.md plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): read expected MCP servers from the dv-forge settings"`

### Task 6: Ersatz-Kandidaten für erwartete, ungenutzte MCP-Server

**ACs:** AC-07

**Dateien:**
- Modify: `plugins/forge/scripts/mcp-usage.js` · `function render`
- Test: `plugins/forge/tests/mcp-usage.test.js` · `function fixture()`

**Interfaces:**
- Consumes: vorhanden: `summarize(calls)` liefert `native` (Map Tool → `{ calls }`) und `fallbacks` (Array) in `mcp-usage.js`
- Produces: `replacementLine(native, fallbacks): string` in `mcp-usage.js` (nicht exportiert)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/mcp-usage.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('render_ExpectedMcpUnused_ListsNativeCallsItCouldHaveTaken', () => {
  // Arrange
  const { transcript } = fixture();

  // Act
  const output = render(loadSession(transcript), { transcript, expect: ['context7'] });

  // Assert
  assert.match(output, /\nErsatz-Kandidaten für erwartete, ungenutzte MCPs: Read 1 · Grep 1 · Glob 0 · Shell-Fallbacks 1\n/);
});

test('render_AllExpectedMcpsUsed_NoReplacementLine', () => {
  // Arrange
  const transcript = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-mcp-used-')), `${SESSION}.jsonl`);
  writeJsonl(transcript, [toolUse('t1', 'mcp__dev-mcp__find_file', { name: 'A.cs' }), toolResult('t1')]);

  // Act
  const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp'] });

  // Assert
  assert.doesNotMatch(output, /Ersatz-Kandidaten/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/mcp-usage.test.js` — erwartet: FAIL `render_ExpectedMcpUnused_ListsNativeCallsItCouldHaveTaken`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/mcp-usage.js` (Anker `function render`) diesen Block

```js
function render({ calls, available, cwd, subagentCount }, { expect = [], transcript }) {
```

ersetzen durch:

```js
// Beleg für die Relevanz-Zeilen: native Such- und Leseaufrufe, die ein erwartetes MCP hätte übernehmen können.
function replacementLine(native, fallbacks) {
  const count = (name) => native.get(name)?.calls ?? 0;
  return `Ersatz-Kandidaten für erwartete, ungenutzte MCPs: Read ${count('Read')} · Grep ${count('Grep')} · Glob ${count('Glob')} · Shell-Fallbacks ${fallbacks.length}`;
}

function render({ calls, available, cwd, subagentCount }, { expect = [], transcript }) {
```

In `plugins/forge/scripts/mcp-usage.js` (Anker `function render`) diesen Block

```js
  if (availableUnused.length > 0) lines.push('', `Verfügbar, aber ungenutzt: ${availableUnused.sort().join(', ')}`);
```

ersetzen durch:

```js
  if (expectedUnused.length > 0) lines.push('', replacementLine(native, fallbacks));
  if (availableUnused.length > 0) lines.push('', `Verfügbar, aber ungenutzt: ${availableUnused.sort().join(', ')}`);
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/mcp-usage.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/mcp-usage.test.js plugins/forge/scripts/mcp-usage.js` · `git commit -m "feat(forge): list native calls an expected but unused MCP could have taken"`

### Task 7: Eingaben des Menschen, aktive Zeit und Harness-Hinweise

**ACs:** AC-08, AC-09

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-metrics.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `function analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `function factLines`
- Modify: `plugins/forge/scripts/session-facts.js` · `function render`
- Modify: `plugins/forge/scripts/session-facts.js` · `function run`
- Create: `plugins/forge/tests/session-metrics.test.js`
- Test: `plugins/forge/tests/session-metrics.test.js`
- Test: `plugins/forge/tests/session-facts.test.js` · `function session()`

**Interfaces:**
- Consumes: Task 1: `SLASH_COMMAND`, `COMMAND_ARGS`, `textOf`, `clock`, `oneLine`, `isHumanTurn` aus `lib/transcript.js`
- Consumes: Task 4: `selectEntries(all, options)` und `render(sessionFile, facts, agents, labels)`
- Produces: `lib/session-metrics.js` exportiert: `humanInputs(entries, numberOf?): { nr: number, time: number|null, kind: "Eingabe"|"Unterbrechung"|"Ablehnung", text: string }[]`, `timing(entries): { active: number, waiting: number, longestSilence: number } | null`, `harnessHints(entries): Map<string, number>`, `inputLine(input): string`, `timingLine(result): string`, `hintsLine(counts): string`
- Produces: `analyze(entries)` liefert zusätzlich `timing` und `harness`; `render(sessionFile, facts, agents, labels = [], inputs = [])`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/session-metrics.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const metrics = require('../scripts/lib/session-metrics.js');

function human(text, time) {
  return { type: 'user', timestamp: time, message: { role: 'user', content: text } };
}

function said(text, time) {
  return { type: 'assistant', timestamp: time, message: { content: [{ type: 'text', text }] } };
}

function toolResult(id, content, time) {
  return { type: 'user', timestamp: time, message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } };
}

test('humanInputs_SlashCommandWithArgs_ShowsCommandAndArgs', () => {
  // Arrange
  const entries = [human('<command-message>x</command-message>\n<command-name>/dv-forge:plan-review</command-name>\n<command-args>docs/plan.md</command-args>', '2026-09-27T10:00:00Z')];

  // Act
  const inputs = metrics.humanInputs(entries);

  // Assert
  assert.deepEqual(inputs, [{ nr: 1, time: Date.parse('2026-09-27T10:00:00Z'), kind: 'Eingabe', text: '/dv-forge:plan-review docs/plan.md' }]);
});

test('humanInputs_Interrupt_MarkedAsInterruption', () => {
  // Arrange
  const entries = [human('[Request interrupted by user]', '2026-09-27T10:00:00Z')];

  // Act
  const inputs = metrics.humanInputs(entries);

  // Assert
  assert.equal(inputs[0].kind, 'Unterbrechung');
});

test('humanInputs_RejectedToolUse_ListedAsRejectionWithEntryNumber', () => {
  // Arrange
  const entries = [
    human('Mach X', '2026-09-27T10:00:00Z'),
    toolResult('t1', "The user doesn't want to proceed with this tool use.", '2026-09-27T10:01:00Z'),
  ];

  // Act
  const inputs = metrics.humanInputs(entries);

  // Assert
  assert.deepEqual(inputs.map(({ nr, kind }) => [nr, kind]), [[1, 'Eingabe'], [2, 'Ablehnung']]);
});

test('timing_HumanWaitsBetweenTurns_SplitsActiveWaitingAndLongestSilence', () => {
  // Arrange
  const entries = [
    human('Mach X', '2026-09-27T10:00:00Z'),
    said('Ich lese', '2026-09-27T10:04:00Z'),
    toolResult('t1', 'ok', '2026-09-27T10:05:00Z'),
    said('Fertig', '2026-09-27T10:06:00Z'),
    human('Danke, noch Y', '2026-09-27T10:20:00Z'),
    said('Erledigt', '2026-09-27T10:21:00Z'),
  ];

  // Act
  const result = metrics.timing(entries);

  // Assert
  assert.deepEqual(result, { active: 7, waiting: 14, longestSilence: 4 });
});

test('timing_NoTimestamps_ReturnsNull', () => {
  // Arrange
  const entries = [{ type: 'user', message: { content: 'Mach X' } }];

  // Act
  const result = metrics.timing(entries);

  // Assert
  assert.equal(result, null);
});

test('harnessHints_KnownAttachmentTypes_CountedByLabel', () => {
  // Arrange
  const entries = [
    { type: 'attachment', attachment: { type: 'silent_turn_reminder' } },
    { type: 'attachment', attachment: { type: 'silent_turn_reminder' } },
    { type: 'attachment', attachment: { type: 'environment' } },
    { type: 'attachment', attachment: { type: 'skill_listing' } },
  ];

  // Act
  const counts = metrics.harnessHints(entries);

  // Assert
  assert.deepEqual([...counts], [['Stille-Hinweis', 2], ['Umgebungshinweis', 1]]);
});
```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_File_ListsHumanInputsWithEntryNumbers', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /## Eingaben des Menschen \(gekürzt\)\n- #1 10:00 Eingabe „Mach X“\n- #7 10:10 Eingabe „Danke“\n/);
});

test('cli_File_PrintsActiveAndWaitingTimeAndHarnessHints', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /- Zeit: 1 min aktiv, 9 min Warten auf den Menschen · längste Strecke ohne Text an den Menschen: 0 min\n[\s\S]*- Harness-Hinweise: keine\n/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_File_ListsHumanInputsWithEntryNumbers`, FAIL `cli_File_PrintsActiveAndWaitingTimeAndHarnessHints`, FAIL `plugins/forge/tests/session-metrics.test.js` (Modul `../scripts/lib/session-metrics.js` fehlt)

- [ ] **Schritt 3: Minimal implementieren**

Neue Datei `plugins/forge/scripts/lib/session-metrics.js`:

```js
'use strict';

// Messwerte aus einem Session-Protokoll, die über reine Zählungen hinausgehen.
// Alle Funktionen arbeiten auf den Einträgen einer Session (Hauptsession oder ein Subagent).

const { SLASH_COMMAND, COMMAND_ARGS, textOf, clock, oneLine, isHumanTurn } = require('./transcript.js');

const INTERRUPT = /^\s*\[Request interrupted by user/;
const REJECTION = /user doesn't want to proceed|tool use was rejected/i;
const HARNESS_HINTS = { silent_turn_reminder: 'Stille-Hinweis', environment: 'Umgebungshinweis', task_reminder: 'Aufgaben-Erinnerung' };

function timeOf(entry) {
  return entry.timestamp ? Date.parse(entry.timestamp) : null;
}

function minutes(ms) {
  return Math.round(ms / 60000);
}

// Anzeigetext einer Eingabe: Slash-Befehle als "/name args", sonst der Text.
function inputText(text) {
  const command = text.match(SLASH_COMMAND);
  if (!command) return text;
  const args = text.match(COMMAND_ARGS)?.[1].trim();
  return `/${command[1]}${args ? ` ${args}` : ''}`;
}

// Jede Eingabe, Unterbrechung und Ablehnung des Menschen mit Eintragsnummer (1-basiert im Protokoll).
function humanInputs(entries, numberOf = (entry) => entries.indexOf(entry) + 1) {
  const inputs = [];
  for (const entry of entries) {
    if (isHumanTurn(entry)) {
      const text = textOf(entry.message?.content);
      const kind = INTERRUPT.test(text) ? 'Unterbrechung' : 'Eingabe';
      inputs.push({ nr: numberOf(entry), time: timeOf(entry), kind, text: kind === 'Eingabe' ? oneLine(inputText(text), 120) : '' });
      continue;
    }
    const content = entry.type === 'user' ? entry.message?.content : null;
    for (const part of Array.isArray(content) ? content : []) {
      const text = part.type === 'tool_result' ? textOf(part.content) : '';
      if (REJECTION.test(text)) inputs.push({ nr: numberOf(entry), time: timeOf(entry), kind: 'Ablehnung', text: oneLine(text, 120) });
    }
  }
  return inputs;
}

function isAgentActivity(entry) {
  const content = entry.message?.content;
  return entry.type === 'assistant'
    || (entry.type === 'user' && Array.isArray(content) && content.some((part) => part.type === 'tool_result'));
}

function hasVisibleText(entry) {
  const content = entry.message?.content;
  return entry.type === 'assistant' && Array.isArray(content)
    && content.some((part) => part.type === 'text' && String(part.text ?? '').trim() !== '');
}

// Aktive Zeit, Wartezeit auf den Menschen und die längste Strecke ohne Text an den Menschen, in Minuten.
// Warten = von der letzten Arbeit des Agents bis zur nächsten Eingabe des Menschen.
function timing(entries) {
  const timed = entries.filter((entry) => timeOf(entry) !== null);
  if (timed.length === 0) return null;
  let waiting = 0;
  let longest = 0;
  let anchor = null;
  let lastOther = null;
  let seenHuman = false;
  for (const entry of timed) {
    const time = timeOf(entry);
    if (isHumanTurn(entry)) {
      if (seenHuman && lastOther !== null) waiting += Math.max(0, time - lastOther);
      seenHuman = true;
      anchor = time;
      continue;
    }
    if (isAgentActivity(entry)) lastOther = time;
    if (!hasVisibleText(entry)) continue;
    if (anchor !== null) longest = Math.max(longest, time - anchor);
    anchor = time;
  }
  const total = timeOf(timed[timed.length - 1]) - timeOf(timed[0]);
  return { active: minutes(total - waiting), waiting: minutes(waiting), longestSilence: minutes(longest) };
}

// Hinweise, die der Harness einblendet, nach Art gezählt.
function harnessHints(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const label = HARNESS_HINTS[entry.attachment?.type];
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function inputLine({ nr, time, kind, text }) {
  return `- #${nr} ${clock(time)} ${kind}${text ? ` „${text}“` : ''}`;
}

function timingLine(result) {
  if (!result) return '-';
  return `${result.active} min aktiv, ${result.waiting} min Warten auf den Menschen · längste Strecke ohne Text an den Menschen: ${result.longestSilence} min`;
}

function hintsLine(counts) {
  return counts.size === 0 ? 'keine' : [...counts].map(([label, count]) => `${label} ${count}`).join(', ');
}

module.exports = { humanInputs, timing, harnessHints, inputLine, timingLine, hintsLine };
```

In `plugins/forge/scripts/session-facts.js` (Anker `const { SLASH_COMMAND`) diesen Block

```js
const { SLASH_COMMAND, readEntries, textOf, tokensOf, callLabel, isHumanTurn } = require('./lib/transcript.js');
```

ersetzen durch:

```js
const { SLASH_COMMAND, readEntries, textOf, tokensOf, callLabel, isHumanTurn } = require('./lib/transcript.js');
const metrics = require('./lib/session-metrics.js');
```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
  return facts;
}

function minutes(first, last) {
```

ersetzen durch:

```js
  facts.timing = metrics.timing(entries);
  facts.harness = metrics.harnessHints(entries);
  return facts;
}

function minutes(first, last) {
```

In `plugins/forge/scripts/session-facts.js` (Anker `function factLines`) diesen Block

```js
    `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
```

ersetzen durch:

```js
    `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
    `- Zeit: ${metrics.timingLine(facts.timing)}`,
```

In `plugins/forge/scripts/session-facts.js` (Anker `function factLines`) diesen Block

```js
    `- Tool-Fehler: ${errorLinesOf(facts).length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
  ];
```

ersetzen durch:

```js
    `- Tool-Fehler: ${errorLinesOf(facts).length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
    `- Harness-Hinweise: ${metrics.hintsLine(facts.harness)}`,
  ];
```

In `plugins/forge/scripts/session-facts.js` (Anker `function render`) diesen Block

```js
function render(sessionFile, facts, agents, labels = []) {
```

ersetzen durch:

```js
function render(sessionFile, facts, agents, labels = [], inputs = []) {
```

In `plugins/forge/scripts/session-facts.js` (Anker `function render`) diesen Block

```js
    '## Tool-Fehler der Hauptsession',
    ...(errorLines.length > 0 ? errorLines : ['- keine']),
    '',
  ].join('\n');
```

ersetzen durch:

```js
    '## Tool-Fehler der Hauptsession',
    ...(errorLines.length > 0 ? errorLines : ['- keine']),
    '',
    '## Eingaben des Menschen (gekürzt)',
    ...(inputs.length > 0 ? inputs.map(metrics.inputLine) : ['- keine']),
    '',
  ].join('\n');
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  const { entries, keep, labels } = selectEntries(readEntries(file), options);
```

ersetzen durch:

```js
  const all = readEntries(file);
  const numbers = new Map(all.map((entry, index) => [entry, index + 1]));
  const { entries, keep, labels } = selectEntries(all, options);
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  let output = `${render(file, facts, agents, labels)}\n${savings(allFacts)}\n${mcp}`;
```

ersetzen durch:

```js
  const inputs = metrics.humanInputs(entries, (entry) => numbers.get(entry));
  let output = `${render(file, facts, agents, labels, inputs)}\n${savings(allFacts)}\n${mcp}`;
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js plugins/forge/scripts/lib/session-metrics.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): list human inputs and split active from waiting time in session facts"`

### Task 8: Grundlast, Cache-Neuaufbau und Kontextlast

**ACs:** AC-10, AC-11

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-metrics.js` · `function inputLine`
- Modify: `plugins/forge/scripts/session-facts.js` · `function analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `function savingsLists`
- Modify: `plugins/forge/scripts/session-facts.js` · `function factLines`
- Test: `plugins/forge/tests/session-metrics.test.js` · `harnessHints_KnownAttachmentTypes_CountedByLabel`
- Test: `plugins/forge/tests/session-facts.test.js` · `function session()`

**Interfaces:**
- Consumes: Task 1: `callLabel`, `requestsOf` aus `lib/transcript.js`
- Consumes: Task 7: `lib/session-metrics.js`
- Produces: `baseline(entries): { context: number, attachments: [string, number][] } | null`, `cacheRebuilds(entries): { time: number|null, written: number, pause: number|null }[]`, `contextLoad(entries): { size: number, after: number, load: number, label: string }[]` (größte zuerst), `baselineLine(result): string`, `rebuildLine(rebuilds): string` in `lib/session-metrics.js`
- Produces: `analyze(entries)` liefert zusätzlich `baseline`, `rebuilds`, `loads` — Task 9 nutzt `loads` und `rebuilds`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/session-metrics.test.js` anfügen, mit einer Leerzeile Abstand:

```js
function request(id, time, usage, content = []) {
  return { type: 'assistant', requestId: id, timestamp: time, message: { usage, content } };
}

test('baseline_AttachmentsBeforeFirstRequest_ListedLargestFirst', () => {
  // Arrange
  const entries = [
    { type: 'attachment', attachment: { type: 'mcp_instructions_delta', text: 'x'.repeat(4000) } },
    { type: 'attachment', attachment: { type: 'skill_listing', text: 'x'.repeat(24000) } },
    human('Mach X', '2026-09-27T10:00:00Z'),
    request('r1', '2026-09-27T10:00:05Z', { input_tokens: 2, cache_creation_input_tokens: 25000, cache_read_input_tokens: 40000 }),
    { type: 'attachment', attachment: { type: 'task_reminder', text: 'x'.repeat(90000) } },
  ];

  // Act
  const result = metrics.baseline(entries);

  // Assert
  assert.deepEqual(result, { context: 65002, attachments: [['skill_listing', 6009], ['mcp_instructions_delta', 1011]] });
});

test('cacheRebuilds_CacheReadDropsAfterPause_ReportsRebuildWithPause', () => {
  // Arrange
  const entries = [
    request('r1', '2026-09-27T10:00:00Z', { cache_creation_input_tokens: 1000, cache_read_input_tokens: 200000 }),
    request('r2', '2026-09-27T11:12:00Z', { cache_creation_input_tokens: 201000, cache_read_input_tokens: 0 }),
  ];

  // Act
  const result = metrics.cacheRebuilds(entries);

  // Assert
  assert.deepEqual(result, [{ time: Date.parse('2026-09-27T11:12:00Z'), written: 201000, pause: 72 }]);
});

test('cacheRebuilds_SteadyCache_ReportsNone', () => {
  // Arrange
  const entries = [
    request('r1', '2026-09-27T10:00:00Z', { cache_creation_input_tokens: 30000, cache_read_input_tokens: 0 }),
    request('r2', '2026-09-27T10:01:00Z', { cache_creation_input_tokens: 25000, cache_read_input_tokens: 30000 }),
  ];

  // Act
  const result = metrics.cacheRebuilds(entries);

  // Assert
  assert.deepEqual(result, []);
});

test('contextLoad_EarlyLargeResult_WeightedByLaterRequests', () => {
  // Arrange
  const entries = [
    request('r1', null, {}, [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: 'src/big.ts' } }]),
    toolResult('t1', 'x'.repeat(20000)),
    request('r2', null, {}),
    request('r3', null, {}),
    request('r4', null, {}, [{ type: 'tool_use', id: 't2', name: 'Read', input: { file_path: 'src/late.ts' } }]),
    toolResult('t2', 'x'.repeat(40000)),
  ];

  // Act
  const result = metrics.contextLoad(entries);

  // Assert
  assert.deepEqual(result.map(({ load, label }) => [load, label]), [[15000, 'Read src/big.ts'], [0, 'Read src/late.ts']]);
});

test('contextLoad_SkillTextInjectedAsMeta_LabelledWithItsSkillCall', () => {
  // Arrange
  const entries = [
    request('r1', null, {}, [{ type: 'tool_use', id: 's1', name: 'Skill', input: { skill: 'dv-forge:init' } }]),
    { type: 'user', isMeta: true, sourceToolUseID: 's1', message: { content: [{ type: 'text', text: 'x'.repeat(8000) }] } },
    request('r2', null, {}),
  ];

  // Act
  const result = metrics.contextLoad(entries);

  // Assert
  assert.deepEqual(result.map(({ load, label }) => [load, label]), [[2000, 'Text zu Skill dv-forge:init']]);
});
```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_File_PrintsBaselineAndCacheRebuilds', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /- Grundlast: 6k Tokens in der ersten Anfrage · keine Anhänge davor\n- Cache-Neuaufbau: keiner\n/);
});

test('savings_EarlyLargeResult_ListedByContextLoad', () => {
  // Arrange
  const use = (id, name, input) => ({ type: 'assistant', requestId: id, message: { content: [{ type: 'tool_use', id, name, input }] } });
  const result = (id, chars) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'x'.repeat(chars) }] } });
  const entries = [
    use('a', 'Read', { file_path: 'src/big.ts' }), result('a', 40000),
    ...[1, 2, 3, 4, 5].flatMap((n) => [use(`t${n}`, 'Bash', { command: `echo ${n}` }), result(`t${n}`, 10)]),
  ];

  // Act
  const text = facts.savings([facts.analyze(entries)]);

  // Assert
  assert.match(text, /Größte Kontextlast \(Größe × folgende Anfragen\):\n- 50k · 10k × 5 · Read src\/big\.ts\n/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_File_PrintsBaselineAndCacheRebuilds`, FAIL `savings_EarlyLargeResult_ListedByContextLoad`, FAIL `baseline_AttachmentsBeforeFirstRequest_ListedLargestFirst`, FAIL `cacheRebuilds_CacheReadDropsAfterPause_ReportsRebuildWithPause`, FAIL `cacheRebuilds_SteadyCache_ReportsNone`, FAIL `contextLoad_EarlyLargeResult_WeightedByLaterRequests`, FAIL `contextLoad_SkillTextInjectedAsMeta_LabelledWithItsSkillCall`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `require('./transcript.js')`) diesen Block

```js
const { SLASH_COMMAND, COMMAND_ARGS, textOf, clock, oneLine, isHumanTurn } = require('./transcript.js');
```

ersetzen durch:

```js
const { SLASH_COMMAND, COMMAND_ARGS, textOf, clock, oneLine, callLabel, isHumanTurn, requestsOf } = require('./transcript.js');
```

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `const HARNESS_HINTS`) diesen Block

```js
const HARNESS_HINTS = { silent_turn_reminder: 'Stille-Hinweis', environment: 'Umgebungshinweis', task_reminder: 'Aufgaben-Erinnerung' };
```

ersetzen durch:

```js
const HARNESS_HINTS = { silent_turn_reminder: 'Stille-Hinweis', environment: 'Umgebungshinweis', task_reminder: 'Aufgaben-Erinnerung' };
const CHARS_PER_TOKEN = 4;
const REBUILD_MIN_WRITE = 20000;
const TOP_ATTACHMENTS = 3;
```

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `function inputLine`) diesen Block

```js
function inputLine({ nr, time, kind, text }) {
```

ersetzen durch:

```js
function tokens(chars) {
  return Math.round(chars / CHARS_PER_TOKEN);
}

function thousands(value) {
  return `${Math.round(value / 1000)}k`;
}

// Kontext der ersten Anfrage und die größten Anhänge, die der Harness davor eingeblendet hat.
function baseline(entries) {
  const [first] = requestsOf(entries);
  if (!first) return null;
  const sizes = new Map();
  for (const entry of entries.slice(0, first.index)) {
    if (!entry.attachment?.type) continue;
    sizes.set(entry.attachment.type, (sizes.get(entry.attachment.type) ?? 0) + tokens(JSON.stringify(entry.attachment).length));
  }
  const attachments = [...sizes].sort((a, b) => b[1] - a[1]).slice(0, TOP_ATTACHMENTS);
  return { context: first.context, attachments };
}

// Anfragen, deren Cache-Lesen einbricht, während viel neu geschrieben wird: Pause über die Cache-Laufzeit oder Modellwechsel.
function cacheRebuilds(entries) {
  const requests = requestsOf(entries);
  return requests.slice(1).flatMap((current, index) => {
    const previous = requests[index];
    const rebuilt = current.cacheWrite >= REBUILD_MIN_WRITE && current.cacheRead < previous.context / 2;
    if (!rebuilt) return [];
    const pause = current.time !== null && previous.time !== null ? minutes(current.time - previous.time) : null;
    return [{ time: current.time, written: current.cacheWrite, pause }];
  });
}

// Kontextlast: Größe eines Tool-Ergebnisses oder eingeblendeten Skill-Texts mal Zahl der Anfragen, die es danach mitlesen.
function contextLoad(entries) {
  const calls = new Map();
  for (const entry of entries) {
    const content = entry.type === 'assistant' ? entry.message?.content : null;
    for (const part of Array.isArray(content) ? content : []) {
      if (part.type === 'tool_use') calls.set(part.id, callLabel(part));
    }
  }
  const requestIndexes = requestsOf(entries).map((request) => request.index);
  const after = (index) => requestIndexes.filter((requestIndex) => requestIndex > index).length;
  const loads = [];
  entries.forEach((entry, index) => {
    if (entry.type !== 'user') return;
    const content = entry.message?.content;
    if (entry.isMeta && entry.sourceToolUseID) {
      const size = tokens(textOf(content).length);
      loads.push({ size, after: after(index), load: size * after(index), label: `Text zu ${calls.get(entry.sourceToolUseID) ?? 'unbekannt'}` });
      return;
    }
    for (const part of Array.isArray(content) ? content : []) {
      if (part.type !== 'tool_result') continue;
      const size = tokens(textOf(part.content).length);
      loads.push({ size, after: after(index), load: size * after(index), label: calls.get(part.tool_use_id) ?? 'unbekannt' });
    }
  });
  return loads.sort((a, b) => b.load - a.load);
}

function baselineLine(result) {
  if (!result) return '-';
  const attachments = result.attachments.length === 0 ? 'keine Anhänge davor'
    : `größte Anhänge davor: ${result.attachments.map(([type, size]) => `${type} ≈${thousands(size)}`).join(', ')}`;
  return `${thousands(result.context)} Tokens in der ersten Anfrage · ${attachments}`;
}

function rebuildLine(rebuilds) {
  if (rebuilds.length === 0) return 'keiner';
  const written = rebuilds.reduce((sum, rebuild) => sum + rebuild.written, 0);
  const each = rebuilds.map((rebuild) => `${clock(rebuild.time)} nach ${rebuild.pause ?? '?'} min Pause`).join(', ');
  return `${rebuilds.length}× · zusammen ${thousands(written)} geschrieben · ${each}`;
}

function inputLine({ nr, time, kind, text }) {
```

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `module.exports`) diesen Block

```js
module.exports = { humanInputs, timing, harnessHints, inputLine, timingLine, hintsLine };
```

ersetzen durch:

```js
module.exports = {
  humanInputs, timing, harnessHints, baseline, cacheRebuilds, contextLoad,
  inputLine, timingLine, hintsLine, baselineLine, rebuildLine,
};
```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
  facts.harness = metrics.harnessHints(entries);
  return facts;
```

ersetzen durch:

```js
  facts.harness = metrics.harnessHints(entries);
  facts.baseline = metrics.baseline(entries);
  facts.rebuilds = metrics.cacheRebuilds(entries);
  facts.loads = metrics.contextLoad(entries);
  return facts;
```

In `plugins/forge/scripts/session-facts.js` (Anker `function factLines`) diesen Block

```js
    `- Kontext je Anfrage: ${contextLine(facts)}`,
```

ersetzen durch:

```js
    `- Kontext je Anfrage: ${contextLine(facts)}`,
    `- Grundlast: ${metrics.baselineLine(facts.baseline)}`,
    `- Cache-Neuaufbau: ${metrics.rebuildLine(facts.rebuilds)}`,
```

In `plugins/forge/scripts/session-facts.js` (Anker `const MIN_COMMAND_REPEATS`) diesen Block

```js
const MIN_COMMAND_REPEATS = 3;
```

ersetzen durch:

```js
const MIN_COMMAND_REPEATS = 3;
const MIN_CONTEXT_LOAD = 1000;
```

In `plugins/forge/scripts/session-facts.js` (Anker `function savingsLists`) diesen Block

```js
  const commands = [...all.reduce((map, facts) => merge(map, facts.commands), new Map())].filter(([, count]) => count >= MIN_COMMAND_REPEATS).sort((a, b) => b[1] - a[1]);
  return [
    'Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):',
    ...(results.length > 0 ? results.map((r) => `- ${thousands(r.chars / 4)} Tokens · ${r.call}`) : ['- keine']),
    '',
```

ersetzen durch:

```js
  const commands = [...all.reduce((map, facts) => merge(map, facts.commands), new Map())].filter(([, count]) => count >= MIN_COMMAND_REPEATS).sort((a, b) => b[1] - a[1]);
  const loads = all.flatMap((facts) => facts.loads).filter((entry) => entry.load >= MIN_CONTEXT_LOAD)
    .sort((a, b) => b.load - a.load).slice(0, TOP_RESULTS);
  return [
    'Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):',
    ...(results.length > 0 ? results.map((r) => `- ${thousands(r.chars / 4)} Tokens · ${r.call}`) : ['- keine']),
    '',
    'Größte Kontextlast (Größe × folgende Anfragen):',
    ...(loads.length > 0 ? loads.map((l) => `- ${thousands(l.load)} · ${thousands(l.size)} × ${l.after} · ${l.label}`) : ['- keine']),
    '',
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js plugins/forge/scripts/lib/session-metrics.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): show baseline, cache rebuilds and context load in session facts"`

### Task 9: Lange Läufe, Läufe ohne Änderung und Hinweise zu den Signalen

**ACs:** AC-12, AC-13

**Dateien:**
- Modify: `plugins/forge/scripts/lib/session-metrics.js` · `function baselineLine`
- Modify: `plugins/forge/scripts/session-facts.js` · `function analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `function savingsLists`
- Modify: `plugins/forge/scripts/session-facts.js` · `function run`
- Test: `plugins/forge/tests/session-metrics.test.js` · `contextLoad_SkillTextInjectedAsMeta_LabelledWithItsSkillCall`
- Test: `plugins/forge/tests/session-facts.test.js` · `function session()`

**Interfaces:**
- Consumes: Task 8: `facts.loads`, `facts.rebuilds`; Task 7: `lib/session-metrics.js`
- Consumes: vorhanden: `subagentRows` liefert je Agent `facts`, `fresh`, `tools`
- Produces: `toolDurations(entries): { seconds: number, label: string }[]`, `rerunsWithoutChange(entries): Map<string, number>`, `hintLines(fired: string[]): string[]`, `durationText(seconds: number): string` in `lib/session-metrics.js`
- Produces: `firedSignals(facts, agents, mcpText): string[]` und `hintsSection(fired): string` in `session-facts.js`; die Ausgabe endet mit `## Hinweise zu den Signalen`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Ans Ende von `plugins/forge/tests/session-metrics.test.js` anfügen, mit einer Leerzeile Abstand:

```js
function run(id, name, input, time) {
  return { type: 'assistant', requestId: id, timestamp: time, message: { content: [{ type: 'tool_use', id, name, input }] } };
}

test('toolDurations_ResultTwoMinutesLater_ReportsSecondsAndLabel', () => {
  // Arrange
  const entries = [
    run('t1', 'Bash', { command: 'dotnet test' }, '2026-09-27T10:00:00Z'),
    toolResult('t1', 'Passed!', '2026-09-27T10:02:00Z'),
  ];

  // Act
  const result = metrics.toolDurations(entries);

  // Assert
  assert.deepEqual(result, [{ seconds: 120, label: 'Bash dotnet test' }]);
});

test('rerunsWithoutChange_SameTestTwiceWithoutEdit_CountsOneRerun', () => {
  // Arrange
  const entries = [
    run('t1', 'Bash', { command: 'dotnet test --filter X' }),
    run('t2', 'Read', { file_path: 'a.cs' }),
    run('t3', 'Bash', { command: 'dotnet  test --filter X' }),
  ];

  // Act
  const result = metrics.rerunsWithoutChange(entries);

  // Assert
  assert.deepEqual([...result], [['dotnet test --filter X', 1]]);
});

test('rerunsWithoutChange_EditBetweenRuns_CountsNothing', () => {
  // Arrange
  const entries = [
    run('t1', 'Bash', { command: 'npm run build' }),
    run('t2', 'mcp__dev-mcp__patch_file', { path: 'a.ts' }),
    run('t3', 'Bash', { command: 'npm run build' }),
  ];

  // Act
  const result = metrics.rerunsWithoutChange(entries);

  // Assert
  assert.equal(result.size, 0);
});

test('hintLines_TwoFiredSignals_OneLineEachInGivenOrder', () => {
  // Arrange
  const fired = ['wiederholt', 'fehler'];

  // Act
  const lines = metrics.hintLines(fired);

  // Assert
  assert.deepEqual(lines, [
    '- gleicher Aufruf direkt wiederholt → unklares Ergebnis oder fehlende Prüfung',
    '- Tool-Fehler oder blockierter Aufruf → Hook zu streng, Regel fehlt im Skill oder falsches Werkzeug; prüfe den Umweg danach',
  ]);
});

test('rerunsWithoutChange_LongCommandsWithSamePrefix_NotMerged', () => {
  // Arrange
  const prefix = `cd /${'a'.repeat(120)} && `;
  const entries = [
    run('t1', 'Bash', { command: `${prefix}node --test tests/a.test.js` }),
    run('t2', 'Bash', { command: `${prefix}node --test tests/b.test.js` }),
  ];

  // Act
  const result = metrics.rerunsWithoutChange(entries);

  // Assert
  assert.equal(result.size, 0);
});

test('rerunsWithoutChange_LeadingCdInDisplay_Dropped', () => {
  // Arrange
  const entries = [
    run('t1', 'Bash', { command: 'cd src && dotnet build' }),
    run('t2', 'Bash', { command: 'cd src && dotnet build' }),
  ];

  // Act
  const result = metrics.rerunsWithoutChange(entries);

  // Assert
  assert.deepEqual([...result], [['dotnet build', 1]]);
});
```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
test('cli_File_FiredSignalsGetHintsWithPossibleCauses', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.match(result.stdout, /## Hinweise zu den Signalen\n- Tool-Fehler oder blockierter Aufruf → [^\n]+\n- gleicher Aufruf direkt wiederholt → [^\n]+\n- Zusammenfassung des Kontexts → [^\n]+\n/);
});

test('savings_SlowTestRunTwiceWithoutEdit_ListsDurationAndRerun', () => {
  // Arrange
  const use = (id, command, time) => ({ type: 'assistant', requestId: id, timestamp: time, message: { content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } });
  const done = (id, time) => ({ type: 'user', timestamp: time, message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } });
  const entries = [
    use('a', 'dotnet test', '2026-09-27T10:00:00Z'), done('a', '2026-09-27T10:06:00Z'),
    use('b', 'dotnet test', '2026-09-27T10:07:00Z'), done('b', '2026-09-27T10:07:30Z'),
  ];

  // Act
  const text = facts.savings([facts.analyze(entries)]);

  // Assert
  assert.match(text, /Längste Tool-Läufe \(ab 60 s\):\n- 6 min · Bash dotnet test\n\nGleicher Build-, Test- oder Lint-Lauf ohne Dateiänderung dazwischen:\n- 1× erneut · dotnet test\n/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_File_FiredSignalsGetHintsWithPossibleCauses`, FAIL `savings_SlowTestRunTwiceWithoutEdit_ListsDurationAndRerun`, FAIL `toolDurations_ResultTwoMinutesLater_ReportsSecondsAndLabel`, FAIL `rerunsWithoutChange_SameTestTwiceWithoutEdit_CountsOneRerun`, FAIL `rerunsWithoutChange_EditBetweenRuns_CountsNothing`, FAIL `hintLines_TwoFiredSignals_OneLineEachInGivenOrder`, FAIL `rerunsWithoutChange_LongCommandsWithSamePrefix_NotMerged`, FAIL `rerunsWithoutChange_LeadingCdInDisplay_Dropped`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `const TOP_ATTACHMENTS`) diesen Block

```js
const TOP_ATTACHMENTS = 3;
```

ersetzen durch:

```js
const TOP_ATTACHMENTS = 3;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const MCP_EDIT = /^mcp__.+__.*(?:patch|replace|write|move|rename)/i;
const RUN_COMMAND = /\b(?:test|build|lint)\b/;
const LEADING_CD = /^(?:cd\s+\S+\s*&&\s*)+/;
const SIGNAL_HINTS = {
  fehler: 'Tool-Fehler oder blockierter Aufruf → Hook zu streng, Regel fehlt im Skill oder falsches Werkzeug; prüfe den Umweg danach',
  wiederholt: 'gleicher Aufruf direkt wiederholt → unklares Ergebnis oder fehlende Prüfung',
  zusammenfassung: 'Zusammenfassung des Kontexts → zu viel Text im Hauptkontext statt in Dateien',
  kontextlast: 'große Kontextlast → gefiltertes Skript, gezieltes Lese-Tool, Ausgabe in Datei statt Kontext',
  mehrfachGelesen: 'dieselbe Datei mehrfach gelesen → Zusammenfassung in Datei, Lese-Tool für Ausschnitte, Übergabe an Subagent als Datei',
  shellBefehl: 'wiederkehrender Shell-Befehl → eigenes Skript oder Hook zum festen Zeitpunkt',
  ohneAenderung: 'Lauf ohne neue Information → gezielter Lauf auf das Geänderte oder Ergebnis des letzten Laufs weiterverwenden',
  langerLauf: 'langer Tool-Lauf → Filter oder Einzeltest statt ganzer Suite; Hintergrund-Aufgabe, wenn der Mensch wartet',
  cacheNeuaufbau: 'Cache-Neuaufbau → Pause über der Cache-Laufzeit oder Modellwechsel; ein Neuaufbau kostet so viel wie viele normale Anfragen',
  subagent: 'Subagent mit vielen neuen Tokens für wenige Aufrufe → zu breiter Auftrag, falsches Modell oder fehlende Vorauswahl',
  mcpUngenutzt: 'MCP erwartet, aber ungenutzt → verzichtbar oder übersehen; im Bericht je MCP entscheiden',
  shellFallback: 'Shell-Fallback → vorgesehener Weg umgangen: Hook fehlt, Skill-Regel zu weich oder Werkzeug nicht erreichbar',
};
```

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `function baselineLine`) diesen Block

```js
function baselineLine(result) {
```

ersetzen durch:

```js
// Laufzeit je Tool-Aufruf vom Aufruf bis zum Ergebnis, längste zuerst.
function toolDurations(entries) {
  const started = new Map();
  const durations = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    for (const part of Array.isArray(content) ? content : []) {
      if (entry.type === 'assistant' && part.type === 'tool_use' && timeOf(entry) !== null) {
        started.set(part.id, { time: timeOf(entry), label: callLabel(part) });
      }
      if (entry.type === 'user' && part.type === 'tool_result' && started.has(part.tool_use_id) && timeOf(entry) !== null) {
        const { time, label } = started.get(part.tool_use_id);
        durations.push({ seconds: Math.round((timeOf(entry) - time) / 1000), label });
      }
    }
  }
  return durations.sort((a, b) => b.seconds - a.seconds);
}

// Gleicher Build-, Test- oder Lint-Befehl erneut, ohne dass dazwischen eine Datei geändert wurde.
// Verglichen wird der volle Befehl; die Anzeige lässt ein führendes "cd <ordner> &&" weg.
function rerunsWithoutChange(entries) {
  const seen = new Set();
  const reruns = new Map();
  for (const entry of entries) {
    const content = entry.type === 'assistant' ? entry.message?.content : null;
    for (const part of Array.isArray(content) ? content : []) {
      if (part.type !== 'tool_use') continue;
      if (EDIT_TOOLS.has(part.name) || MCP_EDIT.test(part.name)) {
        seen.clear();
        continue;
      }
      const command = ['Bash', 'PowerShell'].includes(part.name) ? String(part.input?.command ?? '') : '';
      if (!RUN_COMMAND.test(command)) continue;
      const key = command.replace(/\s+/g, ' ').trim();
      if (seen.has(key)) {
        const label = oneLine(key.replace(LEADING_CD, ''), 100);
        reruns.set(label, (reruns.get(label) ?? 0) + 1);
      }
      seen.add(key);
    }
  }
  return reruns;
}

function hintLines(fired) {
  return fired.filter((key) => SIGNAL_HINTS[key]).map((key) => `- ${SIGNAL_HINTS[key]}`);
}

function durationText(seconds) {
  return seconds < 120 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

function baselineLine(result) {
```

In `plugins/forge/scripts/lib/session-metrics.js` (Anker `module.exports`) diesen Block

```js
  humanInputs, timing, harnessHints, baseline, cacheRebuilds, contextLoad,
  inputLine, timingLine, hintsLine, baselineLine, rebuildLine,
```

ersetzen durch:

```js
  humanInputs, timing, harnessHints, baseline, cacheRebuilds, contextLoad, toolDurations, rerunsWithoutChange,
  hintLines, durationText, inputLine, timingLine, hintsLine, baselineLine, rebuildLine,
```

In `plugins/forge/scripts/session-facts.js` (Anker `function analyze`) diesen Block

```js
  facts.loads = metrics.contextLoad(entries);
  return facts;
```

ersetzen durch:

```js
  facts.loads = metrics.contextLoad(entries);
  facts.durations = metrics.toolDurations(entries);
  facts.reruns = metrics.rerunsWithoutChange(entries);
  return facts;
```

In `plugins/forge/scripts/session-facts.js` (Anker `const MIN_CONTEXT_LOAD`) diesen Block

```js
const MIN_CONTEXT_LOAD = 1000;
```

ersetzen durch:

```js
const MIN_CONTEXT_LOAD = 1000;
const LARGE_CONTEXT_LOAD = 100000;
const MIN_SLOW_SECONDS = 60;
const SUBAGENT_FRESH_TOKENS = 100000;
const SUBAGENT_FEW_TOOLS = 5;
```

In `plugins/forge/scripts/session-facts.js` (Anker `function savingsLists`) diesen Block

```js
  const loads = all.flatMap((facts) => facts.loads).filter((entry) => entry.load >= MIN_CONTEXT_LOAD)
    .sort((a, b) => b.load - a.load).slice(0, TOP_RESULTS);
```

ersetzen durch:

```js
  const loads = all.flatMap((facts) => facts.loads).filter((entry) => entry.load >= MIN_CONTEXT_LOAD)
    .sort((a, b) => b.load - a.load).slice(0, TOP_RESULTS);
  const slow = all.flatMap((facts) => facts.durations).filter((d) => d.seconds >= MIN_SLOW_SECONDS)
    .sort((a, b) => b.seconds - a.seconds).slice(0, TOP_RESULTS);
  const reruns = [...all.reduce((map, facts) => merge(map, facts.reruns), new Map())].sort((a, b) => b[1] - a[1]).slice(0, TOP_RESULTS);
```

In `plugins/forge/scripts/session-facts.js` (Anker `function savingsLists`) diesen Block

```js
    `Wiederkehrende Shell-Befehle (ab ${MIN_COMMAND_REPEATS}×):`,
    ...(commands.length > 0 ? commands.slice(0, 10).map(([head, count]) => `- ${count}× ${head}`) : ['- keine']),
    '',
  ].join('\n');
```

ersetzen durch:

```js
    `Wiederkehrende Shell-Befehle (ab ${MIN_COMMAND_REPEATS}×):`,
    ...(commands.length > 0 ? commands.slice(0, 10).map(([head, count]) => `- ${count}× ${head}`) : ['- keine']),
    '',
    `Längste Tool-Läufe (ab ${MIN_SLOW_SECONDS} s):`,
    ...(slow.length > 0 ? slow.map((d) => `- ${metrics.durationText(d.seconds)} · ${d.label}`) : ['- keine']),
    '',
    'Gleicher Build-, Test- oder Lint-Lauf ohne Dateiänderung dazwischen:',
    ...(reruns.length > 0 ? reruns.map(([command, count]) => `- ${count}× erneut · ${command}`) : ['- keine']),
    '',
  ].join('\n');
```

In `plugins/forge/scripts/session-facts.js` (Anker `function projectSettings`) diesen Block

```js
// Projektwurzel und erwartete MCP-Server aus den Projekt-Einstellungen; außerhalb eines Git-Repos gilt der Ordner selbst.
```

ersetzen durch:

```js
// Welche gemessenen Signale angeschlagen haben; die Lösungshinweise dazu stehen in lib/session-metrics.js.
function firedSignals(facts, agents, mcpText) {
  const all = [facts, ...agents.map((agent) => agent.facts)];
  const some = (test) => all.some(test);
  const checks = [
    ['fehler', errorLinesOf(facts).length > 0],
    ['wiederholt', facts.repeats > 0],
    ['zusammenfassung', facts.compactions > 0],
    ['kontextlast', some((f) => f.loads.some((l) => l.load >= LARGE_CONTEXT_LOAD))],
    ['mehrfachGelesen', some((f) => [...f.reads.values()].some((count) => count > 1))],
    ['shellBefehl', some((f) => [...f.commands.values()].some((count) => count >= MIN_COMMAND_REPEATS))],
    ['ohneAenderung', some((f) => f.reruns.size > 0)],
    ['langerLauf', some((f) => f.durations.some((d) => d.seconds >= MIN_SLOW_SECONDS))],
    ['cacheNeuaufbau', some((f) => f.rebuilds.length > 0)],
    ['subagent', agents.some((agent) => agent.fresh >= SUBAGENT_FRESH_TOKENS && agent.tools <= SUBAGENT_FEW_TOOLS)],
    ['mcpUngenutzt', /\*\*erwartet, ungenutzt\*\*/.test(mcpText)],
    ['shellFallback', /Shell-Fallback-Kandidaten \([1-9]\d*\)/.test(mcpText)],
  ];
  return checks.filter(([, fired]) => fired).map(([key]) => key);
}

function hintsSection(fired) {
  const lines = metrics.hintLines(fired);
  return ['## Hinweise zu den Signalen', ...(lines.length > 0 ? lines : ['- keine Messwert-Signale']), ''].join('\n');
}

// Projektwurzel und erwartete MCP-Server aus den Projekt-Einstellungen; außerhalb eines Git-Repos gilt der Ordner selbst.
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  let output = `${render(file, facts, agents, labels, inputs)}\n${savings(allFacts)}\n${mcp}`;
```

ersetzen durch:

```js
  let output = `${render(file, facts, agents, labels, inputs)}\n${savings(allFacts)}\n${mcp}\n${hintsSection(firedSignals(facts, agents, mcp))}`;
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-metrics.test.js plugins/forge/tests/session-facts.test.js plugins/forge/scripts/lib/session-metrics.js plugins/forge/scripts/session-facts.js` · `git commit -m "feat(forge): flag slow and repeated runs and hint at causes of fired signals"`

### Task 10: Snapshot statt Berichtsgerüst

**ACs:** AC-14

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `function skeleton`
- Modify: `plugins/forge/scripts/session-facts.js` · `function run`
- Modify: `plugins/forge/scripts/mcp-usage.js` · `function configuredServers`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest`

**Interfaces:**
- Consumes: Task 1: `COMMAND_ARGS`, `textOf` aus `lib/transcript.js`
- Consumes: Task 4: `selectEntries(...).cut` und `.labels`
- Consumes: Task 5: `projectSettings(cwd).root`
- Produces: Schalter `--snapshot`: schreibt `<os.tmpdir()>/dv-forge-retro/<session>.json` mit den Feldern `version, session, transcript, created, cut, root, draft, models, skills, branch, specs, expected, result, facts, mcp` und hängt `## Bericht` mit `- Snapshot: <pfad>` und `- Entwurf nach: <pfad>` an die Ausgabe — Task 12 liest genau diese Felder.
- Produces: `expectedServers(cwd, expect = []): string[]` exportiert aus `mcp-usage.js`.
- Produces: `--skeleton` gibt es nicht mehr.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `plugins/forge/tests/session-facts.test.js` (Anker `cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest`) diesen Block samt der folgenden Leerzeile löschen:

```js
test('cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest', () => {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-')), 'docs', 'wishes', 'bericht.md');
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--expect', 'dev-mcp', '--skeleton', target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`Gerüst geschrieben: ${target.replace(/\\/g, '\\\\')}`));
  const text = fs.readFileSync(target, 'utf8');
  assert.match(text, /^# Erfahrungsbericht <Art der Arbeit, allgemein>/);
  assert.match(text, /Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents\./);
  assert.match(text, /## Zahlen\n- Dauer: 10 min · Modelle: claude-x\n/);
  assert.match(text, /Mehrfach gelesene Dateien:\n- keine/);
  assert.match(text, /## MCP-Nutzung\n\nQuelle: /);
  assert.match(text, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  assert.doesNotMatch(text, /MCP-Nutzung \(gemessen\)|## Sparpotenzial \(Hauptsession|\| Auftrag \| Typ \|/);
  assert.doesNotMatch(text, /session-facts\.js/);
  for (const heading of ['## Positiv', '## Reibung', '## Sparpotenzial', '## Neue Ideen', '## Kleinigkeiten', '**Relevanz:**']) {
    assert.ok(text.includes(heading), `${heading} fehlt`);
  }
});

test('cli_Skeleton_ExistingTarget_RefusesAndKeepsFile', () => {
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-')), 'bericht.md');
  fs.writeFileSync(target, 'alt');
  const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--skeleton', target], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /existiert/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'alt');
});

```

Ans Ende von `plugins/forge/tests/session-facts.test.js` anfügen, mit einer Leerzeile Abstand:

```js
function tempEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-snap-'));
  return { dir, env: { ...process.env, TMPDIR: dir, TEMP: dir, TMP: dir } };
}

test('cli_Snapshot_WritesFactsMcpAndCutAndNamesDraftAndSnapshot', () => {
  // Arrange
  const { dir, env } = tempEnv();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cwd-'));
  const args = [SCRIPT, '--file', commandSession(), '--cwd', cwd, '--until-command', 'prozess-retrospektive', '--snapshot'];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', env });

  // Assert
  const snapshotFile = path.join(dir, 'dv-forge-retro', 's2.json');
  const snapshot = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
  assert.ok(result.stdout.includes(`## Bericht\n- Snapshot: ${snapshotFile}\n- Entwurf nach: ${snapshot.draft}\n`));
  assert.equal(snapshot.draft, path.join(cwd, 'docs', 'wishes', '.entwurf-s2.md'));
  assert.equal(snapshot.cut, '2026-09-27T11:10:00.000Z');
  assert.match(snapshot.facts, /^- Schnitt: vor dem letzten Aufruf von prozess-retrospektive\n- Dauer: /);
  assert.match(snapshot.mcp, /^Quelle: /);
  assert.match(snapshot.result, /^Dauer 65 min, Eingaben des Menschen 3, Tokens neu 0k Hauptsession und 0k Subagents$/);
});

test('cli_Snapshot_RecordsBranchSpecsAndExpectedMcps', () => {
  // Arrange
  const { dir, env } = tempEnv();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-ctx-')), 's3.jsonl');
  fs.writeFileSync(file, [
    line({ type: 'user', gitBranch: 'feature/307326-export', timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: '<command-message>x</command-message>\n<command-name>/dv-forge:plan-writing</command-name>\n<command-args>docs/forge/x/spec.md</command-args>' } }),
    line({ type: 'assistant', gitBranch: 'HEAD', requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { model: 'claude-x', content: [] } }),
  ].join('\n'));

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cwd-'));

  // Act
  spawnSync(process.execPath, [SCRIPT, '--file', file, '--cwd', cwd, '--expect', 'dev-mcp', '--snapshot'], { encoding: 'utf8', env });

  // Assert
  const snapshot = JSON.parse(fs.readFileSync(path.join(dir, 'dv-forge-retro', 's3.json'), 'utf8'));
  assert.deepEqual([snapshot.branch, snapshot.specs, snapshot.expected, snapshot.models], [
    'feature/307326-export', ['docs/forge/x/spec.md'], ['dev-mcp'], ['claude-x'],
  ]);
});

test('cli_WithoutSnapshot_WritesNoReportSection', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.doesNotMatch(result.stdout, /## Bericht/);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/mcp-usage.test.js` — erwartet: FAIL `cli_Snapshot_WritesFactsMcpAndCutAndNamesDraftAndSnapshot`, FAIL `cli_Snapshot_RecordsBranchSpecsAndExpectedMcps`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/session-facts.js` (Anker `const USAGE`) diesen Block

```js
  + ' [--until-command <name>] [--since-command <name> [--occurrence <n>]] [--skeleton <bericht.md>] [--no-fail]\n';
```

ersetzen durch:

```js
  + ' [--until-command <name>] [--since-command <name> [--occurrence <n>]] [--snapshot] [--no-fail]\n';
```

In `plugins/forge/scripts/session-facts.js` (Anker `const REPORT_FORMAT`) diesen Block

```js
const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');
const FACTS_SLOT = '<ZAHLEN: schreibt session-facts.js --skeleton>';
const MCP_SLOT = '<MCP-NUTZUNG: schreibt session-facts.js --skeleton>';
const RESULT_SLOT = 'Dauer <min>, Eingaben des Menschen <n>, Tokens neu <k> Hauptsession und <k> Subagents';
```

ersetzen durch:

```js
const SNAPSHOT_DIR = 'dv-forge-retro';
const REPORT_DIR = path.join('docs', 'wishes');
```

In `plugins/forge/scripts/session-facts.js` (Anker `const { SLASH_COMMAND`) diesen Block

```js
const { SLASH_COMMAND, readEntries, textOf, tokensOf, callLabel, isHumanTurn } = require('./lib/transcript.js');
```

ersetzen durch:

```js
const { SLASH_COMMAND, COMMAND_ARGS, readEntries, textOf, tokensOf, callLabel, isHumanTurn } = require('./lib/transcript.js');
```

In `plugins/forge/scripts/session-facts.js` (Anker `const FLAGS`) diesen Block

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--skeleton': 'skeleton', '--until-command': 'untilCommand',
};
const SWITCHES = { '--no-fail': 'noFail' };
```

ersetzen durch:

```js
  '--since-command': 'sinceCommand', '--occurrence': 'occurrence', '--until-command': 'untilCommand',
};
const SWITCHES = { '--no-fail': 'noFail', '--snapshot': 'snapshot' };
```

In `plugins/forge/scripts/session-facts.js` (Anker `function skeleton` und `function writeSkeleton`) diesen Block

````js
// Berichtsgerüst aus references/report-format.md: Zahlen und MCP-Nutzung deterministisch, der Rest bleibt Platzhalter.
function skeleton({ facts, agents, mcp, lists }) {
  const format = fs.readFileSync(REPORT_FORMAT, 'utf8');
  const template = format.match(/```markdown\n([\s\S]*?)\n```/)?.[1];
  if (!template || ![FACTS_SLOT, MCP_SLOT, RESULT_SLOT].every((slot) => template.includes(slot))) {
    throw new FactsError(`Vorlage in ${REPORT_FORMAT} passt nicht zu --skeleton`);
  }
  const agentInput = agents.reduce((sum, agent) => sum + agent.facts.input, 0);
  const result = `Dauer ${minutes(facts.first, facts.last)} min, Eingaben des Menschen ${facts.turns}, Tokens neu ${thousands(facts.input)} Hauptsession und ${thousands(agentInput)} Subagents`;
  const mcpBody = mcp.replace(/^## MCP-Nutzung \(gemessen\)\n/, '').trimEnd();
  return `${template
    .replace(RESULT_SLOT, () => result)
    .replace(FACTS_SLOT, () => [...factLines(facts, agents), '', lists.trimEnd()].join('\n'))
    .replace(MCP_SLOT, () => mcpBody)}\n`;
}

function writeSkeleton(target, text) {
  const file = path.resolve(target);
  if (fs.existsSync(file)) throw new FactsError(`Bericht existiert schon, nichts geschrieben: ${file}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

````

ersetzen durch:

```js
// Letzter echter Branch der Session; "HEAD" steht für einen losgelösten Stand.
function lastBranch(entries) {
  const branches = entries.map((entry) => entry.gitBranch).filter((branch) => branch && branch !== 'HEAD');
  return branches[branches.length - 1] ?? null;
}

// Spec-Pfade aus den Argumenten von Slash-Befehlen und Skill-Aufrufen, etwa für die Workitem-Nummer.
function specPaths(entries) {
  const args = entries.flatMap((entry) => {
    const content = entry.message?.content;
    if (entry.type === 'user') return [textOf(content).match(COMMAND_ARGS)?.[1] ?? ''];
    if (entry.type !== 'assistant' || !Array.isArray(content)) return [];
    return content.filter((part) => part.type === 'tool_use' && part.name === 'Skill').map((part) => String(part.input?.args ?? ''));
  });
  return [...new Set(args.flatMap((text) => text.split(/\s+/)).filter((word) => /spec\.md$/.test(word)))];
}

// Alles, was retro-report.js für den Bericht braucht; die Zahlen sind damit dieselben wie in dieser Ausgabe.
function snapshotOf({ file, entries, facts, agents, labels, cut, mcp, expected, root, lists }) {
  const name = path.basename(file, '.jsonl');
  const agentInput = agents.reduce((sum, agent) => sum + agent.facts.input, 0);
  return {
    version: 1,
    session: name,
    transcript: file,
    created: new Date().toISOString(),
    cut: cut === null ? null : new Date(cut).toISOString(),
    root,
    draft: path.join(root, REPORT_DIR, `.entwurf-${name.slice(0, 8)}.md`),
    models: [...facts.models],
    skills: [...facts.skills.keys()],
    branch: lastBranch(entries),
    specs: specPaths(entries),
    expected,
    result: `Dauer ${minutes(facts.first, facts.last)} min, Eingaben des Menschen ${facts.turns}, Tokens neu ${thousands(facts.input)} Hauptsession und ${thousands(agentInput)} Subagents`,
    facts: [...labels.map((label) => `- ${label}`), ...factLines(facts, agents), '', lists.trimEnd()].join('\n'),
    mcp: mcp.replace(/^## MCP-Nutzung \(gemessen\)\n/, '').trim(),
  };
}

function writeSnapshot(snapshot) {
  const file = path.join(os.tmpdir(), SNAPSHOT_DIR, `${snapshot.session}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
  return file;
}

```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  const { entries, keep, labels } = selectEntries(all, options);
```

ersetzen durch:

```js
  const { entries, keep, labels, cut } = selectEntries(all, options);
```

In `plugins/forge/scripts/session-facts.js` (Anker `function run`) diesen Block

```js
  let output = `${render(file, facts, agents, labels, inputs)}\n${savings(allFacts)}\n${mcp}\n${hintsSection(firedSignals(facts, agents, mcp))}`;
  if (options.skeleton) {
    const written = writeSkeleton(options.skeleton, skeleton({ facts, agents, mcp, lists: savingsLists(allFacts) }));
    output += `\nGerüst geschrieben: ${written}\n`;
  }
```

ersetzen durch:

```js
  let output = `${render(file, facts, agents, labels, inputs)}\n${savings(allFacts)}\n${mcp}\n${hintsSection(firedSignals(facts, agents, mcp))}`;
  if (options.snapshot) {
    const expected = mcpUsage.expectedServers(session.cwd, expect);
    const snapshot = snapshotOf({ file, entries, facts, agents, labels, cut, mcp, expected, root: project.root, lists: savingsLists(allFacts) });
    output += `\n## Bericht\n- Snapshot: ${writeSnapshot(snapshot)}\n- Entwurf nach: ${snapshot.draft}\n`;
  }
```

In `plugins/forge/scripts/mcp-usage.js` (Anker `function configuredServers`) diesen Block

```js
function configuredServers(cwd) {
  const config = cwd ? readJson(path.join(cwd, '.mcp.json')) : null;
  return Object.keys(config?.mcpServers ?? {});
}
```

ersetzen durch:

```js
function configuredServers(cwd) {
  const config = cwd ? readJson(path.join(cwd, '.mcp.json')) : null;
  return Object.keys(config?.mcpServers ?? {});
}

// Erwartet sind die mitgegebenen Server und die aus der .mcp.json des Projekts.
function expectedServers(cwd, expect = []) {
  return [...new Set([...expect, ...configuredServers(cwd)])];
}
```

In `plugins/forge/scripts/mcp-usage.js` (Anker `function render`) diesen Block

```js
  const expected = [...new Set([...expect, ...configuredServers(cwd)])];
```

ersetzen durch:

```js
  const expected = expectedServers(cwd, expect);
```

In `plugins/forge/scripts/mcp-usage.js` (Anker `module.exports`) diesen Block

```js
module.exports = { parseArgs, findTranscript, loadSession, summarize, render, sameServer };
```

ersetzen durch:

```js
module.exports = { parseArgs, findTranscript, loadSession, summarize, render, sameServer, expectedServers };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/mcp-usage.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-facts.test.js plugins/forge/scripts/session-facts.js plugins/forge/scripts/mcp-usage.js` · `git commit -m "feat(forge): replace the report skeleton with a snapshot for retro-report"`

### Task 11: Prüfung des Berichtsentwurfs (`lib/report-lint.js`)

**ACs:** AC-15

**Dateien:**
- Create: `plugins/forge/scripts/lib/report-lint.js`
- Test: `plugins/forge/tests/report-lint.test.js`

**Interfaces:**
- Consumes: Task 1: `textOf` aus `lib/transcript.js`
- Produces: `lib/report-lint.js` exportiert: `parseDraft(text): { title, lauf, ergebnis, relevanz: string[]|null, sections: Map<string, string[]>, reibung: Finding[], sparpotenzial: Finding[] }` mit `Finding = { number: number, title: string, fields: Map<string, string>, lines: string[] }`, `relevanzOf(text): string[]|null`, `zielOf(value): { art, name } | { art, neu } | { offen: true } | null`, `corpusOf(entries): string`, `lintDraft(text, { expected?: string[], projectNames?: string[], corpus?: string|null }): string[]`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/report-lint.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const lint = require('../scripts/lib/report-lint.js');

const VALID = [
  '# Erfahrungsbericht Planung mit Review',
  '',
  '**Lauf:** Plan geschrieben und geprüft.',
  '**Ergebnis:** Plan mit 5 Tasks.',
  '',
  '**Relevanz:**',
  '- dev-mcp: verzichtbar in dieser Session',
  '',
  '## Positiv',
  '',
  '1. **Fakten in einem Aufruf.** 1 Aufruf, 3k Tokens.',
  '',
  '## Reibung',
  '',
  '1. **Fachbegriff falsch auf den Code abgebildet.**',
  '   *Situation:* Der Agent änderte den falschen Bildschirm.',
  '   *Kosten:* 1 Rückfrage, 38k Tokens.',
  '   *Ursache:* Keine Zuordnung von Fachbegriff zu Code.',
  '   *Besser gewesen:* Vor der ersten Änderung fragen.',
  '   *Vorschlag:* Ein Glossar Fachbegriff → Code.',
  '   *Ziel:* Skill · neu: glossar',
  '   *Im Projekt:* Zitat: „Schichtbuch ist die ShiftLogComponent“',
  '',
  '## Sparpotenzial',
  '',
  '1. **Testsuite ohne Änderung zweimal.**',
  '   *Situation:* Die Suite lief zweimal ohne Änderung dazwischen.',
  '   *Ersparnis:* 6 min je Session.',
  '   *Besser gewesen:* Ergebnis des ersten Laufs weiterverwenden.',
  '   *Vorschlag:* Hook, der den zweiten Lauf meldet.',
  '   *Ziel:* Hook · `guard-orchestrator.js` (blockiert Testaufrufe außerhalb des Skripts)',
  '   *Im Projekt:* –',
  '',
  '## Kleinigkeiten',
  '',
  '- keine',
  '',
].join('\n');

const CONTEXT = {
  expected: ['dev-mcp'],
  projectNames: ['ShiftLogComponent'],
  corpus: 'Nein, Schichtbuch ist die ShiftLogComponent, nicht die Übersicht.',
};

test('lintDraft_ValidDraft_NoViolations', () => {
  // Arrange
  const draft = VALID;

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, []);
});

test('lintDraft_MissingSection_Reported', () => {
  // Arrange
  const draft = VALID.replace('## Kleinigkeiten\n\n- keine\n', '');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Fehlt: ## Kleinigkeiten']);
});

test('lintDraft_FindingWithoutCause_Reported', () => {
  // Arrange
  const draft = VALID.replace('   *Ursache:* Keine Zuordnung von Fachbegriff zu Code.\n', '');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Reibung 1: *Ursache:* fehlt']);
});

test('lintDraft_TargetInFreeText_Reported', () => {
  // Arrange
  const draft = VALID.replace('*Ziel:* Skill · neu: glossar', '*Ziel:* ein neues Glossar');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Reibung 1: *Ziel:* hat nicht die Form „<Art> · `<Name>`“, „<Art> · neu: <Arbeitsname>“ oder „Ziel offen“']);
});

test('lintDraft_CostWithoutNumberOrImpression_Reported', () => {
  // Arrange
  const draft = VALID.replace('*Kosten:* 1 Rückfrage, 38k Tokens.', '*Kosten:* spürbar Zeit.');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Reibung 1: *Kosten:* ohne Zahl braucht „ · Eindruck“ am Ende']);
});

test('lintDraft_CostWithoutNumberButImpression_Accepted', () => {
  // Arrange
  const draft = VALID.replace('*Kosten:* 1 Rückfrage, 38k Tokens.', '*Kosten:* spürbar Zeit · Eindruck');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, []);
});

test('lintDraft_ExpectedMcpWithoutRelevanceLine_Reported', () => {
  // Arrange
  const context = { ...CONTEXT, expected: ['dev-mcp', 'context7'] };

  // Act
  const violations = lint.lintDraft(VALID, context);

  // Assert
  assert.deepEqual(violations, ['Relevanz fehlt für: context7']);
});

test('lintDraft_ProjectNameOutsideProjectLine_Reported', () => {
  // Arrange
  const draft = VALID.replace('änderte den falschen Bildschirm', 'änderte die ShiftLogComponent');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Reibung 1: Projektname „ShiftLogComponent“ außerhalb von *Im Projekt:*']);
});

test('lintDraft_QuoteMissingFromTranscript_Reported', () => {
  // Arrange
  const context = { ...CONTEXT, corpus: 'etwas ganz anderes' };

  // Act
  const violations = lint.lintDraft(VALID, context);

  // Assert
  assert.deepEqual(violations, ['Reibung 1: Zitat nicht im Protokoll gefunden: „Schichtbuch ist die ShiftLogComponent“']);
});

test('lintDraft_TemplatePlaceholderLeft_Reported', () => {
  // Arrange
  const draft = VALID.replace('**Fakten in einem Aufruf.**', '**<Kurzbefund>.**');

  // Act
  const violations = lint.lintDraft(draft, CONTEXT);

  // Assert
  assert.deepEqual(violations, ['Platzhalter aus der Vorlage übrig: <Kurzbefund…>']);
});

test('zielOf_NewTarget_ReturnsKindAndWorkingName', () => {
  // Arrange
  const value = 'Skript · neu: wait-results';

  // Act
  const ziel = lint.zielOf(value);

  // Assert
  assert.deepEqual(ziel, { art: 'Skript', neu: 'wait-results' });
});

test('zielOf_ExistingTargetWithRemark_ReturnsName', () => {
  // Arrange
  const value = 'Skill · `dv-forge:init` (richtet dv-forge ein)';

  // Act
  const ziel = lint.zielOf(value);

  // Assert
  assert.deepEqual(ziel, { art: 'Skill', name: 'dv-forge:init' });
});

test('corpusOf_TextToolResultsAndStrings_JoinedWithCollapsedSpace', () => {
  // Arrange
  const entries = [
    { type: 'user', message: { content: 'Nein,\n  so nicht' } },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Verstanden' }, { type: 'tool_use', id: 't1', name: 'Bash', input: {} }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', content: 'exit 1' }] } },
  ];

  // Act
  const corpus = lint.corpusOf(entries);

  // Assert
  assert.equal(corpus, 'Nein, so nicht Verstanden exit 1');
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/report-lint.test.js` — erwartet: FAIL `plugins/forge/tests/report-lint.test.js` (Modul `../scripts/lib/report-lint.js` fehlt)

- [ ] **Schritt 3: Minimal implementieren**

Neue Datei `plugins/forge/scripts/lib/report-lint.js`:

```js
'use strict';

// Liest den Entwurf eines Erfahrungsberichts und prüft die Regeln, die sich ohne Urteil prüfen lassen.

const { textOf } = require('./transcript.js');

const ITEM = /^(\d+)\.\s+\*\*(.+?)\*\*/;
const FIELD = /^\s*\*(Situation|Kosten|Ersparnis|Ursache|Besser gewesen|Vorschlag|Ziel|Im Projekt):\*\s*(.*)$/;
const ZIEL = /^(Plugin|Skill|Agent|CLAUDE\.md|Hook|Skript|MCP) · (?:`([^`]+)`|neu: (.+?))(?:\s+\(.*\))?$/;
const QUOTE = /„([^“]+)“/g;
const MIN_QUOTE_CHARS = 12;
const REQUIRED_FIELDS = {
  Reibung: ['Situation', 'Kosten', 'Ursache', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
  Sparpotenzial: ['Situation', 'Ersparnis', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
};
const REQUIRED_SECTIONS = ['Positiv', 'Reibung', 'Sparpotenzial', 'Kleinigkeiten'];
const TEMPLATE_PLACEHOLDERS = ['<Art der Arbeit', '<was gemacht wurde', '<was herauskam', '<Kurzbefund', '<was gut lief', '<Einzeiler', '<Arbeitsname', '<MCP>'];

function sectionsOf(text) {
  const sections = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading) {
      current = heading[1];
      sections.set(current, []);
    } else if (current) {
      sections.get(current).push(line);
    }
  }
  return sections;
}

function findingsOf(lines) {
  const findings = [];
  for (const line of lines) {
    const item = line.match(ITEM);
    if (item) {
      findings.push({ number: Number(item[1]), title: item[2].replace(/\.$/, ''), fields: new Map(), lines: [line] });
      continue;
    }
    const current = findings[findings.length - 1];
    if (!current) continue;
    current.lines.push(line);
    const field = line.match(FIELD);
    if (field) current.fields.set(field[1], field[2].trim());
  }
  return findings;
}

// Listenzeilen direkt unter **Relevanz:**; null, wenn die Zeile fehlt.
function relevanzOf(head) {
  const lines = head.split('\n');
  const start = lines.findIndex((line) => line.startsWith('**Relevanz:**'));
  if (start === -1) return null;
  const items = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('- ')) items.push(line);
    else if (line.trim() !== '' || items.length > 0) break;
  }
  return items;
}

function parseDraft(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const head = normalized.split(/^## /m)[0];
  const sections = sectionsOf(normalized);
  return {
    title: normalized.match(/^# (.+?)\s*$/m)?.[1] ?? null,
    lauf: head.match(/^\*\*Lauf:\*\*\s*(.+?)\s*$/m)?.[1] ?? null,
    ergebnis: head.match(/^\*\*Ergebnis:\*\*\s*(.+?)\s*$/m)?.[1] ?? null,
    relevanz: relevanzOf(head),
    sections,
    reibung: findingsOf(sections.get('Reibung') ?? []),
    sparpotenzial: findingsOf(sections.get('Sparpotenzial') ?? []),
  };
}

// Ziel-Zeile: "<Art> · `<Name>`" (optional mit Halbsatz in Klammern), "<Art> · neu: <Arbeitsname>" oder "Ziel offen".
function zielOf(value) {
  if (value === 'Ziel offen') return { offen: true };
  const match = String(value ?? '').match(ZIEL);
  if (!match) return null;
  return match[2] ? { art: match[1], name: match[2] } : { art: match[1], neu: match[3] };
}

function normalize(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// Durchsuchbarer Text einer Session: Eingaben, Antworten und Tool-Ergebnisse.
function corpusOf(entries) {
  const parts = [];
  for (const entry of entries) {
    const content = entry.message?.content;
    if (typeof content === 'string') parts.push(content);
    for (const part of Array.isArray(content) ? content : []) {
      if (part.type === 'text') parts.push(part.text ?? '');
      if (part.type === 'tool_result') parts.push(textOf(part.content));
    }
  }
  return normalize(parts.join('\n'));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findingViolations(section, finding, { projectNames, corpus }) {
  const label = `${section} ${finding.number}`;
  const violations = REQUIRED_FIELDS[section].filter((name) => !finding.fields.has(name)).map((name) => `${label}: *${name}:* fehlt`);
  if (finding.fields.has('Ziel') && !zielOf(finding.fields.get('Ziel'))) {
    violations.push(`${label}: *Ziel:* hat nicht die Form „<Art> · \`<Name>\`“, „<Art> · neu: <Arbeitsname>“ oder „Ziel offen“`);
  }
  for (const name of ['Kosten', 'Ersparnis']) {
    const value = finding.fields.get(name);
    if (value !== undefined && !/\d/.test(value) && !/·\s*Eindruck\s*$/.test(value)) {
      violations.push(`${label}: *${name}:* ohne Zahl braucht „ · Eindruck“ am Ende`);
    }
  }
  const outside = finding.lines.filter((line) => !/^\s*\*Im Projekt:\*/.test(line)).join('\n');
  for (const name of projectNames) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`).test(outside)) violations.push(`${label}: Projektname „${name}“ außerhalb von *Im Projekt:*`);
  }
  if (corpus !== null) {
    for (const [, quote] of String(finding.fields.get('Im Projekt') ?? '').matchAll(QUOTE)) {
      if (quote.length >= MIN_QUOTE_CHARS && !corpus.includes(normalize(quote))) {
        violations.push(`${label}: Zitat nicht im Protokoll gefunden: „${quote}“`);
      }
    }
  }
  return violations;
}

// Verstöße als lesbare Zeilen; leer heißt: Entwurf erfüllt die prüfbaren Regeln.
function lintDraft(text, { expected = [], projectNames = [], corpus = null } = {}) {
  const draft = parseDraft(text);
  const violations = [];
  if (!draft.title?.startsWith('Erfahrungsbericht ')) violations.push('Fehlt: Titel „# Erfahrungsbericht <Art der Arbeit>“');
  if (draft.lauf === null) violations.push('Fehlt: **Lauf:**');
  if (draft.ergebnis === null) violations.push('Fehlt: **Ergebnis:**');
  if (draft.relevanz === null) violations.push('Fehlt: **Relevanz:**');
  for (const name of REQUIRED_SECTIONS) if (!draft.sections.has(name)) violations.push(`Fehlt: ## ${name}`);
  for (const placeholder of TEMPLATE_PLACEHOLDERS) {
    if (text.includes(placeholder)) violations.push(`Platzhalter aus der Vorlage übrig: ${placeholder}…>`);
  }
  for (const server of expected) {
    if (!(draft.relevanz ?? []).some((line) => line.toLowerCase().includes(server.toLowerCase()))) violations.push(`Relevanz fehlt für: ${server}`);
  }
  for (const finding of draft.reibung) violations.push(...findingViolations('Reibung', finding, { projectNames, corpus }));
  for (const finding of draft.sparpotenzial) violations.push(...findingViolations('Sparpotenzial', finding, { projectNames, corpus }));
  const ideas = (draft.sections.get('Neue Ideen') ?? []).join('\n');
  for (const name of projectNames) {
    if (new RegExp(`\\b${escapeRegExp(name)}\\b`).test(ideas)) violations.push(`Neue Ideen: Projektname „${name}“; Projektnamen gehören unter *Im Projekt:*`);
  }
  return violations;
}

module.exports = { parseDraft, relevanzOf, zielOf, corpusOf, lintDraft };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/report-lint.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/report-lint.test.js plugins/forge/scripts/lib/report-lint.js` · `git commit -m "feat(forge): check retrospective drafts against the report rules"`

### Task 12: Bericht aus Snapshot und Entwurf (`retro-report.js`)

**ACs:** AC-15, AC-16, AC-17, AC-18, AC-19

**Dateien:**
- Create: `plugins/forge/scripts/retro-report.js`
- Test: `plugins/forge/tests/retro-report.test.js`

**Interfaces:**
- Consumes: Task 1: `readEntries` aus `lib/transcript.js`
- Consumes: Task 10: Snapshot-Felder `transcript, created, cut, root, draft, models, skills, branch, specs, expected, result, facts, mcp`
- Consumes: Task 11: `parseDraft`, `zielOf`, `corpusOf`, `lintDraft` aus `lib/report-lint.js`
- Consumes: vorhanden: `analyze(entries)` aus `session-facts.js`, `workitemOf(specPath): string` aus `forge-config.js`
- Produces: CLI `node retro-report.js --format | --snapshot <snapshot.json> --topic <thema> [--date <JJJJ-MM-TT>]`; Exit 0 = geschrieben, 1 = Verstöße oder fehlende Datei, 2 = Aufruf falsch.
- Produces: Exporte `composeReport(snapshot, draft, date): string`, `generatedIdeas(draft): string[]`, `workitemFromBranch(branch): string|null`, `projectNames(root): string[]`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/retro-report.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { commitFile, makeRepo } = require('./lib/git-repo');
const { workitemFromBranch } = require('../scripts/retro-report.js');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-report.js');
const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');

const DRAFT = [
  '# Erfahrungsbericht Planung mit Review',
  '',
  '**Lauf:** Plan geschrieben und geprüft',
  '**Ergebnis:** Plan mit 5 Tasks.',
  '',
  '**Relevanz:**',
  '- dev-mcp: verzichtbar in dieser Session',
  '',
  '## Positiv',
  '',
  '1. **Fakten in einem Aufruf.** 1 Aufruf, 3k Tokens.',
  '',
  '## Reibung',
  '',
  '1. **Fachbegriff falsch auf den Code abgebildet.**',
  '   *Situation:* Der Agent änderte den falschen Bildschirm.',
  '   *Kosten:* 1 Rückfrage, 38k Tokens.',
  '   *Ursache:* Keine Zuordnung von Fachbegriff zu Code.',
  '   *Besser gewesen:* Vor der ersten Änderung fragen.',
  '   *Vorschlag:* Ein Glossar Fachbegriff → Code.',
  '   *Ziel:* Skill · neu: glossar',
  '   *Im Projekt:* Zitat: „Schichtbuch ist die ShiftLogComponent“',
  '',
  '## Sparpotenzial',
  '',
  '1. **Testsuite ohne Änderung zweimal.**',
  '   *Situation:* Die Suite lief zweimal ohne Änderung dazwischen.',
  '   *Ersparnis:* 6 min je Session.',
  '   *Besser gewesen:* Ergebnis des ersten Laufs weiterverwenden.',
  '   *Vorschlag:* Hook, der den zweiten Lauf meldet.',
  '   *Ziel:* Hook · `guard-orchestrator.js`',
  '   *Im Projekt:* –',
  '',
  '## Kleinigkeiten',
  '',
  '- keine',
  '',
].join('\n');

function jsonl(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join('\n');
}

// Projektordner mit Protokoll, Snapshot und Entwurf, wie session-facts.js --snapshot sie hinterlässt.
function fixture({ root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-root-')), draft = DRAFT, specs = [], branch = 'feature/307326-export' } = {}) {
  const usage = { input_tokens: 10, cache_creation_input_tokens: 990, cache_read_input_tokens: 5000, output_tokens: 200 };
  const transcript = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-log-')), 's1.jsonl');
  fs.writeFileSync(transcript, jsonl([
    { type: 'user', timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: 'Nein, Schichtbuch ist die ShiftLogComponent, nicht die Übersicht.' } },
    { type: 'assistant', requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { model: 'claude-x', usage, content: [] } },
    { type: 'user', timestamp: '2026-09-27T10:05:00Z', message: { role: 'user', content: '<command-name>/dv-forge:prozess-retrospektive</command-name>' } },
    { type: 'assistant', requestId: 'r2', timestamp: '2026-09-27T10:06:00Z', message: { model: 'claude-x', usage, content: [] } },
    { type: 'assistant', requestId: 'r3', timestamp: '2026-09-27T10:07:00Z', message: { model: 'claude-x', usage, content: [] } },
  ]));
  const draftFile = path.join(root, 'docs', 'wishes', '.entwurf-s1.md');
  fs.mkdirSync(path.dirname(draftFile), { recursive: true });
  fs.writeFileSync(draftFile, draft);
  const snapshot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-snap-')), 's1.json');
  fs.writeFileSync(snapshot, JSON.stringify({
    version: 1, session: 's1', transcript, created: '2026-09-27T10:05:30.000Z', cut: '2026-09-27T10:05:00.000Z', root, draft: draftFile,
    models: ['claude-x'], skills: ['dv-forge:plan-writing'], branch, specs, expected: ['dev-mcp'],
    result: 'Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 0k Subagents',
    facts: '- Dauer: 10 min · Modelle: claude-x',
    mcp: 'Quelle: `s1.jsonl` · Hauptagent + 0 SubAgent(s) · 1 Tool-Aufrufe, davon 0 MCP',
  }));
  return { root, snapshot, draftFile };
}

function report(snapshot, ...extra) {
  return spawnSync(process.execPath, [SCRIPT, '--snapshot', snapshot, '--topic', 'planung', '--date', '2026-09-28', ...extra], { encoding: 'utf8' });
}

test('cli_ValidDraft_WritesReportWithFactsHeaderAndGeneratedIdea', () => {
  // Arrange
  const { root, snapshot } = fixture();

  // Act
  report(snapshot);

  // Assert
  const text = fs.readFileSync(path.join(root, 'docs', 'wishes', '2026-09-28-planung.md'), 'utf8');
  assert.equal(text, [
    '# Erfahrungsbericht Planung mit Review',
    '',
    '**Lauf:** Plan geschrieben und geprüft. Modell claude-x, Skills dv-forge:plan-writing, 2026-09-28.',
    '**Ergebnis:** Plan mit 5 Tasks. Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 0k Subagents.',
    '',
    '## Zahlen',
    '- Dauer: 10 min · Modelle: claude-x',
    '',
    '## MCP-Nutzung',
    '',
    'Quelle: `s1.jsonl` · Hauptagent + 0 SubAgent(s) · 1 Tool-Aufrufe, davon 0 MCP',
    '',
    '**Relevanz:**',
    '- dev-mcp: verzichtbar in dieser Session',
    '',
    '## Positiv',
    '',
    '1. **Fakten in einem Aufruf.** 1 Aufruf, 3k Tokens.',
    '',
    '## Reibung',
    '',
    ...DRAFT.split('\n').slice(14, 22),
    '',
    '## Sparpotenzial',
    '',
    ...DRAFT.split('\n').slice(25, 32),
    '',
    '## Neue Ideen',
    '',
    '- **glossar** (`neu:` Skill): aus Reibung 1: Fachbegriff falsch auf den Code abgebildet',
    '',
    '## Kleinigkeiten',
    '',
    '- keine',
    '',
  ].join('\n'));
});

test('cli_ValidDraft_DeletesDraft', () => {
  // Arrange
  const { snapshot, draftFile } = fixture();

  // Act
  report(snapshot);

  // Assert
  assert.equal(fs.existsSync(draftFile), false);
});

test('cli_ValidDraft_PrintsSummaryWithTopFindingsSelfCostWorkitemAndCommit', () => {
  // Arrange
  const { snapshot } = fixture();

  // Act
  const result = report(snapshot);

  // Assert
  assert.equal(result.stdout, [
    'Bericht geschrieben: docs/wishes/2026-09-28-planung.md',
    'Prüfung: 0 Verstöße',
    'Befunde: 1 Reibung, 1 Sparpotenzial, 1 neue Ideen',
    'Teuerste Reibungspunkte:',
    '1. Fachbegriff falsch auf den Code abgebildet',
    'Größte Einsparungen:',
    '1. Testsuite ohne Änderung zweimal',
    'Retro selbst: 2 Anfragen, 10k aus dem Cache, 2k neu, 0k Ausgabe',
    'Workitem-Kandidat: #307326 (aus Branch feature/307326-export)',
    'Commit: git add "docs/wishes/2026-09-28-planung.md"',
    '',
  ].join('\n'));
});

test('cli_ReportForDateAndTopicExists_AppendsSuffix', () => {
  // Arrange
  const { root, snapshot } = fixture();
  fs.writeFileSync(path.join(root, 'docs', 'wishes', '2026-09-28-planung.md'), 'alt');

  // Act
  const result = report(snapshot);

  // Assert
  assert.match(result.stdout, /^Bericht geschrieben: docs\/wishes\/2026-09-28-planung-2\.md\n/);
});

test('cli_DraftWithViolations_ListsThemWritesNothingAndExitsWithOne', () => {
  // Arrange
  const { root, snapshot } = fixture({ draft: DRAFT.replace('   *Ursache:* Keine Zuordnung von Fachbegriff zu Code.\n', '') });

  // Act
  const result = report(snapshot);

  // Assert
  assert.deepEqual([result.status, result.stdout, fs.existsSync(path.join(root, 'docs', 'wishes', '2026-09-28-planung.md'))],
    [1, 'Prüfung: 1 Verstöße, nichts geschrieben:\n- Reibung 1: *Ursache:* fehlt\n', false]);
});

test('cli_ProjectFileNameInSituation_ReportedAsViolation', () => {
  // Arrange
  const root = makeRepo();
  commitFile(root, 'src/ShiftLogComponent.ts', 'export class ShiftLogComponent {}\n', 'component');
  const { snapshot } = fixture({ root, draft: DRAFT.replace('änderte den falschen Bildschirm', 'änderte die ShiftLogComponent') });

  // Act
  const result = report(snapshot);

  // Assert
  assert.match(result.stdout, /- Reibung 1: Projektname „ShiftLogComponent“ außerhalb von \*Im Projekt:\*\n/);
});

test('cli_SpecWithWorkitemLine_WinsOverBranch', () => {
  // Arrange
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-root-'));
  fs.mkdirSync(path.join(root, 'docs', 'forge', 'x'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'forge', 'x', 'spec.md'), '# Spec\n\nWorkitem: AB#99\n');
  const { snapshot } = fixture({ root, specs: ['docs/forge/x/spec.md'] });

  // Act
  const result = report(snapshot);

  // Assert
  assert.match(result.stdout, /\nWorkitem-Kandidat: AB#99 \(aus Spec docs\/forge\/x\/spec\.md\)\n/);
});

test('cli_MissingDraft_NamesDraftPathAndExitsWithOne', () => {
  // Arrange
  const { snapshot, draftFile } = fixture();
  fs.rmSync(draftFile);

  // Act
  const result = report(snapshot);

  // Assert
  assert.deepEqual([result.status, result.stderr], [1, `Entwurf nicht gefunden: ${draftFile} (erst den Entwurf schreiben)\n`]);
});

test('cli_Format_PrintsReportFormatReference', () => {
  // Arrange
  const expected = fs.readFileSync(REPORT_FORMAT, 'utf8');

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--format'], { encoding: 'utf8' });

  // Assert
  assert.equal(result.stdout, expected);
});

test('cli_TopicWithCapitalsOrSpaces_ExitsWithTwo', () => {
  // Arrange
  const { snapshot } = fixture();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--snapshot', snapshot, '--topic', 'Meine Retro'], { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 2);
});

test('workitemFromBranch_NumberOrKeyOrNothing_ReturnsCandidate', () => {
  // Arrange
  const branches = ['feature/307326-export', 'feature/JIRA-456-login', 'main', null];

  // Act
  const candidates = branches.map(workitemFromBranch);

  // Assert
  assert.deepEqual(candidates, ['#307326', 'JIRA-456', null, null]);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js` — erwartet: FAIL `plugins/forge/tests/retro-report.test.js` (Modul `../scripts/retro-report.js` fehlt)

- [ ] **Schritt 3: Minimal implementieren**

Neue Datei `plugins/forge/scripts/retro-report.js`:

```js
#!/usr/bin/env node
'use strict';

// Setzt den Erfahrungsbericht aus Snapshot (Zahlen von session-facts.js) und Entwurf (Text des Modells) zusammen,
// prüft den Entwurf und gibt die Kurzfassung für den Chat aus.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readEntries } = require('./lib/transcript.js');
const { parseDraft, zielOf, corpusOf, lintDraft } = require('./lib/report-lint.js');
const { analyze } = require('./session-facts.js');
const { workitemOf } = require('./forge-config.js');

const USAGE = 'Aufruf: node retro-report.js --format | --snapshot <snapshot.json> --topic <thema> [--date <JJJJ-MM-TT>]\n';
const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');
const REPORT_DIR = path.join('docs', 'wishes');
const TOPIC = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_NAME = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+$/;
const MIN_PROJECT_NAME = 6;
const TOP_FINDINGS = 3;

class ReportError extends Error {}

function parseArgs(args) {
  if (args.length === 1 && args[0] === '--format') return { format: true };
  const options = {};
  const flags = { '--snapshot': 'snapshot', '--topic': 'topic', '--date': 'date' };
  for (let index = 0; index < args.length; index += 2) {
    const key = flags[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
  }
  if (!options.snapshot || !TOPIC.test(options.topic ?? '') || (options.date && !DATE.test(options.date))) return null;
  return options;
}

function today() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function readJson(file, what) {
  if (!fs.existsSync(file)) throw new ReportError(`${what} nicht gefunden: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Einträge bis vor den Schnitt (die Session) und ab dem Schnitt (die Retrospektive selbst).
function splitAtCut(snapshot) {
  if (!fs.existsSync(snapshot.transcript)) return { before: null, after: [] };
  const entries = readEntries(snapshot.transcript);
  const cut = Date.parse(snapshot.cut ?? snapshot.created);
  const timeOf = (entry) => (entry.timestamp ? Date.parse(entry.timestamp) : null);
  return {
    before: entries.filter((entry) => timeOf(entry) === null || timeOf(entry) < cut),
    after: entries.filter((entry) => timeOf(entry) !== null && timeOf(entry) >= cut),
  };
}

// Dateinamen des Projekts in PascalCase, etwa ShiftLogComponent; sie gehören nur unter *Im Projekt:*.
function projectNames(root) {
  const result = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) return [];
  const stems = result.stdout.split('\n').map((file) => path.posix.basename(file.trim()).split('.')[0]);
  return [...new Set(stems.filter((stem) => stem.length >= MIN_PROJECT_NAME && PROJECT_NAME.test(stem)))];
}

function withPeriod(text) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function trimBlank(lines) {
  const result = [...lines];
  while (result.length > 0 && result[0].trim() === '') result.shift();
  while (result.length > 0 && result[result.length - 1].trim() === '') result.pop();
  return result;
}

// Jedes `neu:`-Ziel eines Befunds steht zusätzlich unter „Neue Ideen“.
function generatedIdeas(draft) {
  return [['Reibung', draft.reibung], ['Sparpotenzial', draft.sparpotenzial]].flatMap(([section, findings]) => findings.flatMap((finding) => {
    const ziel = zielOf(finding.fields.get('Ziel'));
    return ziel?.neu ? [`- **${ziel.neu}** (\`neu:\` ${ziel.art}): aus ${section} ${finding.number}: ${finding.title}`] : [];
  }));
}

function ideasOf(draft) {
  const own = (draft.sections.get('Neue Ideen') ?? []).filter((line) => line.startsWith('- ') && line.trim() !== '- keine');
  return [...generatedIdeas(draft), ...own];
}

function composeReport(snapshot, draft, date) {
  const block = (name) => trimBlank(draft.sections.get(name) ?? []);
  const ideas = ideasOf(draft);
  return [
    `# ${draft.title}`,
    '',
    `**Lauf:** ${withPeriod(draft.lauf)} Modell ${snapshot.models.join(', ') || '?'}, Skills ${snapshot.skills.join(', ') || '-'}, ${date}.`,
    `**Ergebnis:** ${withPeriod(draft.ergebnis)} ${snapshot.result}.`,
    '',
    '## Zahlen',
    snapshot.facts,
    '',
    '## MCP-Nutzung',
    '',
    snapshot.mcp,
    '',
    '**Relevanz:**',
    ...draft.relevanz,
    '',
    '## Positiv', '', ...block('Positiv'), '',
    '## Reibung', '', ...block('Reibung'), '',
    '## Sparpotenzial', '', ...block('Sparpotenzial'), '',
    '## Neue Ideen', '', ...(ideas.length > 0 ? ideas : ['- keine']), '',
    '## Kleinigkeiten', '', ...block('Kleinigkeiten'), '',
  ].join('\n');
}

function freeTarget(root, date, topic) {
  const base = path.join(root, REPORT_DIR, `${date}-${topic}`);
  let file = `${base}.md`;
  for (let suffix = 2; fs.existsSync(file); suffix += 1) file = `${base}-${suffix}.md`;
  return file;
}

function workitemFromBranch(branch) {
  if (!branch) return null;
  const key = branch.match(/\b([A-Z][A-Z0-9]+-\d+)\b/);
  if (key) return key[1];
  const number = branch.match(/(?:^|[/_#-])(\d{3,})(?=$|[/_-])/);
  return number ? `#${number[1]}` : null;
}

// Workitem zuerst aus der Spec der Session, sonst aus dem Branch.
function workitemCandidate(snapshot) {
  for (const spec of [...snapshot.specs].reverse()) {
    const workitem = workitemOf(path.resolve(snapshot.root, spec));
    if (workitem) return `${workitem} (aus Spec ${spec})`;
  }
  const fromBranch = workitemFromBranch(snapshot.branch);
  return fromBranch ? `${fromBranch} (aus Branch ${snapshot.branch})` : 'keiner';
}

function thousands(value) {
  return `${Math.round(value / 1000)}k`;
}

function selfCostLine(after) {
  if (after.length === 0) return 'Retro selbst: unbekannt';
  const facts = analyze(after);
  return `Retro selbst: ${facts.requests} Anfragen, ${thousands(facts.cached)} aus dem Cache, ${thousands(facts.input)} neu, ${thousands(facts.output)} Ausgabe`;
}

function summary({ file, root, draft, ideas, after, snapshot }) {
  const titles = (findings) => findings.slice(0, TOP_FINDINGS).map((finding, index) => `${index + 1}. ${finding.title}`);
  const relative = path.relative(root, file).split(path.sep).join('/');
  return [
    `Bericht geschrieben: ${relative}`,
    'Prüfung: 0 Verstöße',
    `Befunde: ${draft.reibung.length} Reibung, ${draft.sparpotenzial.length} Sparpotenzial, ${ideas.length} neue Ideen`,
    'Teuerste Reibungspunkte:',
    ...(draft.reibung.length > 0 ? titles(draft.reibung) : ['- keine']),
    'Größte Einsparungen:',
    ...(draft.sparpotenzial.length > 0 ? titles(draft.sparpotenzial) : ['- keine']),
    selfCostLine(after),
    `Workitem-Kandidat: ${workitemCandidate(snapshot)}`,
    `Commit: git add "${relative}"`,
    '',
  ].join('\n');
}

function report(options) {
  const snapshot = readJson(path.resolve(options.snapshot), 'Snapshot');
  if (!fs.existsSync(snapshot.draft)) throw new ReportError(`Entwurf nicht gefunden: ${snapshot.draft} (erst den Entwurf schreiben)`);
  const text = fs.readFileSync(snapshot.draft, 'utf8');
  const { before, after } = splitAtCut(snapshot);
  const violations = lintDraft(text, {
    expected: snapshot.expected, projectNames: projectNames(snapshot.root), corpus: before ? corpusOf(before) : null,
  });
  if (violations.length > 0) {
    return { status: 1, output: [`Prüfung: ${violations.length} Verstöße, nichts geschrieben:`, ...violations.map((v) => `- ${v}`), ''].join('\n') };
  }
  const draft = parseDraft(text);
  const date = options.date ?? today();
  const file = freeTarget(snapshot.root, date, options.topic);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, composeReport(snapshot, draft, date));
  fs.rmSync(snapshot.draft);
  return { status: 0, output: summary({ file, root: snapshot.root, draft, ideas: ideasOf(draft), after, snapshot }) };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  if (options.format) {
    process.stdout.write(fs.readFileSync(REPORT_FORMAT, 'utf8'));
    return;
  }
  try {
    const { status, output } = report(options);
    process.stdout.write(output);
    process.exitCode = status;
  } catch (error) {
    if (!(error instanceof ReportError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { composeReport, generatedIdeas, workitemFromBranch, projectNames };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/retro-report.test.js plugins/forge/scripts/retro-report.js` · `git commit -m "feat(forge): assemble the retrospective report from snapshot and draft"`

### Task 13: Zeitleiste zum gezielten Nachlesen (`session-timeline.js`)

**ACs:** AC-20

**Dateien:**
- Create: `plugins/forge/scripts/session-timeline.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `module.exports`
- Test: `plugins/forge/tests/session-timeline.test.js`

**Interfaces:**
- Consumes: Task 1: `readEntries`, `textOf`, `clock`, `oneLine`, `callLabel`, `isHumanTurn` aus `lib/transcript.js`
- Consumes: vorhanden: `resolveSession(options)`, `FactsError` in `session-facts.js`
- Produces: CLI `node session-timeline.js (--session <id> | --file <session.jsonl>) [--cwd <projektordner>] [--around <nr> [--context <n>]]`; `session-facts.js` exportiert zusätzlich `FactsError` und `resolveSession`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/session-timeline.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-timeline.js');

function session() {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-')), 's1.jsonl');
  const bash = { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } };
  fs.writeFileSync(file, [
    { type: 'user', timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: 'Mach X' } },
    { type: 'assistant', requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { content: [{ type: 'text', text: 'Ich schaue nach.' }, bash] } },
    { type: 'user', timestamp: '2026-09-27T10:01:05Z', message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'Permission denied by hook' }] } },
    { type: 'attachment', attachment: { type: 'silent_turn_reminder' } },
    { type: 'user', message: { role: 'user', content: '<task-notification>fertig</task-notification>' } },
    { type: 'system', subtype: 'compact_boundary' },
    { type: 'user', timestamp: '2026-09-27T10:10:00Z', message: { role: 'user', content: 'Danke' } },
  ].map((entry) => JSON.stringify(entry)).join('\n'));
  return file;
}

test('cli_Timeline_OneLinePerRelevantEventWithEntryNumbers', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

  // Assert
  assert.equal(result.stdout, [
    '#1 10:00 Mensch „Mach X“',
    '#2 10:01 Text „Ich schaue nach.“',
    '#2 10:01 Tool Bash ls',
    '#3 10:01 Fehler Permission denied by hook',
    '#6 --:-- Zusammenfassung',
    '#7 10:10 Mensch „Danke“',
    '',
  ].join('\n'));
});

test('cli_Around_ShowsNeighboursWithInputsAndResults', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file, '--around', '3', '--context', '1'], { encoding: 'utf8' });

  // Assert
  assert.equal(result.stdout, [
    '#2 10:01 assistant',
    '  Text: Ich schaue nach.',
    '  Tool Bash: {"command":"ls"}',
    '#3 10:01 user',
    '  Ergebnis (Fehler): Permission denied by hook',
    '#4 --:-- attachment silent_turn_reminder',
    '',
  ].join('\n'));
});

test('cli_AroundBeyondLastEntry_ExitsWithOne', () => {
  // Arrange
  const file = session();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--file', file, '--around', '99'], { encoding: 'utf8' });

  // Assert
  assert.deepEqual([result.status, result.stderr], [1, 'Eintrag 99 gibt es nicht, das Protokoll hat 7\n']);
});

test('cli_MissingFile_ExitsWithOne', () => {
  // Arrange
  const args = [SCRIPT, '--file', path.join(os.tmpdir(), 'gibt-es-nicht.jsonl')];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 1);
});

test('cli_ContextWithoutAround_ExitsWithTwo', () => {
  // Arrange
  const args = [SCRIPT, '--file', session(), '--context', '2'];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 2);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-timeline.test.js` — erwartet: FAIL `cli_Timeline_OneLinePerRelevantEventWithEntryNumbers`, FAIL `cli_Around_ShowsNeighboursWithInputsAndResults`, FAIL `cli_AroundBeyondLastEntry_ExitsWithOne`, FAIL `cli_ContextWithoutAround_ExitsWithTwo`

- [ ] **Schritt 3: Minimal implementieren**

In `plugins/forge/scripts/session-facts.js` (Anker `module.exports`) diesen Block

```js
module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, sliceByCommand, run };
```

ersetzen durch:

```js
module.exports = { FactsError, projectDir, resolveSession, analyze, readEntries, render, savings, subagentRows, sliceByCommand, run };
```

Neue Datei `plugins/forge/scripts/session-timeline.js`:

```js
#!/usr/bin/env node
'use strict';

// Liest ein Session-Protokoll als kurze Zeitleiste oder zeigt einzelne Einträge mit Nachbarn im Detail,
// damit niemand das JSONL per grep lesen muss (einzelne Zeilen sind dort über 100k Zeichen lang).

const fs = require('node:fs');
const { FactsError, resolveSession } = require('./session-facts.js');
const { readEntries, textOf, clock, oneLine, callLabel, isHumanTurn } = require('./lib/transcript.js');

const USAGE = 'Aufruf: node session-timeline.js (--session <id> | --file <session.jsonl>) [--cwd <projektordner>] [--around <nr> [--context <n>]]\n';
const LINE_CHARS = 100;
const DETAIL_CHARS = 600;
const DEFAULT_CONTEXT = 3;

function parseArgs(args) {
  const flags = { '--session': 'session', '--file': 'file', '--cwd': 'cwd', '--around': 'around', '--context': 'context' };
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = flags[args[index]];
    if (!key || args[index + 1] === undefined) return null;
    options[key] = args[index + 1];
  }
  if (options.file) delete options.session;
  if (!options.file && !options.session) return null;
  for (const key of ['around', 'context']) {
    if (options[key] === undefined) continue;
    if (!/^\d+$/.test(options[key])) return null;
    options[key] = Number(options[key]);
  }
  if (options.context !== undefined && options.around === undefined) return null;
  return options;
}

function timeOf(entry) {
  return entry.timestamp ? Date.parse(entry.timestamp) : null;
}

// Eine Zeile je Ereignis, das für die Retrospektive zählt; Anhänge und fehlerfreie Tool-Ergebnisse fallen weg.
function eventLines(entry, nr) {
  const prefix = `#${nr} ${clock(timeOf(entry))}`;
  const content = entry.message?.content;
  if (entry.type === 'system' && /compact/i.test(`${entry.subtype ?? ''} ${entry.content ?? ''}`)) return [`${prefix} Zusammenfassung`];
  if (isHumanTurn(entry)) return [`${prefix} Mensch „${oneLine(textOf(content), LINE_CHARS)}“`];
  if (!Array.isArray(content)) return [];
  if (entry.type === 'assistant') {
    return content.flatMap((part) => {
      if (part.type === 'text' && String(part.text ?? '').trim() !== '') return [`${prefix} Text „${oneLine(part.text, LINE_CHARS)}“`];
      if (part.type === 'tool_use') return [`${prefix} Tool ${callLabel(part)}`];
      return [];
    });
  }
  return content.filter((part) => part.type === 'tool_result' && part.is_error)
    .map((part) => `${prefix} Fehler ${oneLine(textOf(part.content), LINE_CHARS)}`);
}

function detailLines(entry, nr) {
  const content = entry.message?.content;
  const head = `#${nr} ${clock(timeOf(entry))} ${entry.type}${entry.attachment?.type ? ` ${entry.attachment.type}` : ''}`;
  if (typeof content === 'string') return [head, `  ${oneLine(content, DETAIL_CHARS)}`];
  const parts = (Array.isArray(content) ? content : []).map((part) => {
    if (part.type === 'text') return `  Text: ${oneLine(part.text ?? '', DETAIL_CHARS)}`;
    if (part.type === 'tool_use') return `  Tool ${part.name}: ${oneLine(JSON.stringify(part.input ?? {}), DETAIL_CHARS)}`;
    if (part.type === 'tool_result') return `  Ergebnis${part.is_error ? ' (Fehler)' : ''}: ${oneLine(textOf(part.content), DETAIL_CHARS)}`;
    return `  ${part.type}`;
  });
  return [head, ...parts];
}

function timeline(options) {
  const { file } = resolveSession(options);
  if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
  const entries = readEntries(file);
  if (options.around === undefined) {
    return entries.flatMap((entry, index) => eventLines(entry, index + 1)).join('\n').concat('\n');
  }
  if (options.around < 1 || options.around > entries.length) {
    throw new FactsError(`Eintrag ${options.around} gibt es nicht, das Protokoll hat ${entries.length}`);
  }
  const context = options.context ?? DEFAULT_CONTEXT;
  const from = Math.max(1, options.around - context);
  const to = Math.min(entries.length, options.around + context);
  const lines = [];
  for (let nr = from; nr <= to; nr += 1) lines.push(...detailLines(entries[nr - 1], nr));
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(timeline(options));
  } catch (error) {
    if (!(error instanceof FactsError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { timeline };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-timeline.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/session-timeline.test.js plugins/forge/scripts/session-facts.js plugins/forge/scripts/session-timeline.js` · `git commit -m "feat(forge): add session timeline to read single transcript places"`

### Task 14: Wunschliste nach Ziel vorsortieren (`wishes-aggregate.js`)

**ACs:** AC-21

**Dateien:**
- Create: `plugins/forge/scripts/wishes-aggregate.js`
- Test: `plugins/forge/tests/wishes-aggregate.test.js`

**Interfaces:**
- Consumes: Task 11: `parseDraft`, `relevanzOf` aus `lib/report-lint.js`
- Produces: CLI `node wishes-aggregate.js [--dir <ordner>]` (Default `docs/wishes`); Exporte `collect(dir)`, `render(result, dir)`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Neue Datei `plugins/forge/tests/wishes-aggregate.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'wishes-aggregate.js');

function report(title, ziel, relevanz) {
  return [
    `# Erfahrungsbericht ${title}`,
    '',
    '## MCP-Nutzung',
    '',
    '**Relevanz:**',
    ...relevanz,
    '',
    '## Reibung',
    '',
    `1. **${title} hakte.**`,
    '   *Situation:* x',
    `   *Ziel:* ${ziel}`,
    '',
    '## Sparpotenzial',
    '',
    '## Kleinigkeiten',
    '',
  ].join('\n');
}

function wishes() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-'));
  fs.writeFileSync(path.join(dir, '2026-09-27-a.md'), report('A', 'Skript · `session-facts.js` (zählt Tokens)', ['- dev-mcp: verzichtbar in dieser Session', '- context7: gebraucht']));
  fs.writeFileSync(path.join(dir, '2026-09-28-b.md'), report('B', 'Skript · `session-facts.js`', ['- dev-mcp: hätte genützt, weil 12 Grep']));
  fs.writeFileSync(path.join(dir, '2026-09-28-c.md'), report('C', 'Hook · neu: test-guard', ['- dev-mcp: verzichtbar']));
  fs.writeFileSync(path.join(dir, 'all-wishes.md'), report('Alt', 'Skript · `alt.js`', []));
  fs.writeFileSync(path.join(dir, '.entwurf-s1.md'), report('Entwurf', 'Skript · `entwurf.js`', []));
  return dir;
}

test('cli_Reports_GroupedByTargetLargestGroupFirst', () => {
  // Arrange
  const dir = wishes();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', dir], { encoding: 'utf8' });

  // Assert
  assert.ok(result.stdout.startsWith([
    '# Wunschliste nach Ziel (vorsortiert)',
    '',
    `Quelle: 3 Berichte in ${dir}`,
    '',
    '## Skript · `session-facts.js` (2 Befunde aus 2 Berichten)',
    '- Reibung · 2026-09-27-a.md · A hakte',
    '- Reibung · 2026-09-28-b.md · B hakte',
    '',
    '## Hook · neu: test-guard (1 Befunde aus 1 Berichten)',
    '- Reibung · 2026-09-28-c.md · C hakte',
    '',
  ].join('\n')));
});

test('cli_RelevanceLines_TalliedPerMcp', () => {
  // Arrange
  const dir = wishes();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', dir], { encoding: 'utf8' });

  // Assert
  assert.ok(result.stdout.endsWith([
    '## MCP-Relevanz',
    '',
    '| MCP | gebraucht | hätte genützt | verzichtbar | sonstig |',
    '|---|---|---|---|---|',
    '| context7 | 1 | 0 | 0 | 0 |',
    '| dev-mcp | 0 | 1 | 2 | 0 |',
    '',
  ].join('\n')));
});

test('cli_ConsolidatedListAndDrafts_Ignored', () => {
  // Arrange
  const dir = wishes();

  // Act
  const result = spawnSync(process.execPath, [SCRIPT, '--dir', dir], { encoding: 'utf8' });

  // Assert
  assert.doesNotMatch(result.stdout, /alt\.js|entwurf\.js/);
});

test('cli_MissingDir_ExitsWithOne', () => {
  // Arrange
  const args = [SCRIPT, '--dir', path.join(os.tmpdir(), 'gibt-es-nicht-wishes')];

  // Act
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });

  // Assert
  assert.equal(result.status, 1);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/wishes-aggregate.test.js` — erwartet: FAIL `cli_Reports_GroupedByTargetLargestGroupFirst`, FAIL `cli_RelevanceLines_TalliedPerMcp`

- [ ] **Schritt 3: Minimal implementieren**

Neue Datei `plugins/forge/scripts/wishes-aggregate.js`:

```js
#!/usr/bin/env node
'use strict';

// Sortiert die Befunde aller Erfahrungsberichte nach Ziel und zählt die MCP-Relevanz.
// Das Modell führt danach nur noch inhaltlich Gleiches zusammen, statt alle Berichte zu lesen.

const fs = require('node:fs');
const path = require('node:path');
const { parseDraft, relevanzOf } = require('./lib/report-lint.js');

const USAGE = 'Aufruf: node wishes-aggregate.js [--dir <ordner>]\n';
const REPORT_FILE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
const VERDICTS = ['gebraucht', 'hätte genützt', 'verzichtbar', 'sonstig'];

class WishesError extends Error {}

function parseArgs(args) {
  if (args.length === 0) return { dir: path.join('docs', 'wishes') };
  if (args.length === 2 && args[0] === '--dir') return { dir: args[1] };
  return null;
}

function targetKey(ziel) {
  return ziel ? ziel.replace(/\s+\(.*\)\s*$/, '').trim() : 'ohne Ziel';
}

function verdictOf(text) {
  const lower = text.toLowerCase();
  if (lower.startsWith('gebraucht')) return 'gebraucht';
  if (lower.includes('hätte genützt')) return 'hätte genützt';
  if (lower.includes('verzichtbar')) return 'verzichtbar';
  return 'sonstig';
}

function collect(dir) {
  if (!fs.existsSync(dir)) throw new WishesError(`Ordner nicht gefunden: ${dir}`);
  const files = fs.readdirSync(dir).filter((name) => REPORT_FILE.test(name)).sort();
  const groups = new Map();
  const relevance = new Map();
  for (const name of files) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n');
    const draft = parseDraft(text);
    for (const [section, findings] of [['Reibung', draft.reibung], ['Sparpotenzial', draft.sparpotenzial]]) {
      for (const finding of findings) {
        const key = targetKey(finding.fields.get('Ziel'));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ section, file: name, title: finding.title });
      }
    }
    for (const line of relevanzOf(text) ?? []) {
      const match = line.match(/^- \**`?([^:`*]+)`?\**:\s*(.*)$/);
      if (!match) continue;
      const server = match[1].trim();
      if (!relevance.has(server)) relevance.set(server, Object.fromEntries(VERDICTS.map((verdict) => [verdict, 0])));
      relevance.get(server)[verdictOf(match[2])] += 1;
    }
  }
  return { files, groups, relevance };
}

function render({ files, groups, relevance }, dir) {
  const sorted = [...groups].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const lines = ['# Wunschliste nach Ziel (vorsortiert)', '', `Quelle: ${files.length} Berichte in ${dir}`, ''];
  for (const [key, findings] of sorted) {
    const reports = new Set(findings.map((finding) => finding.file)).size;
    lines.push(`## ${key} (${findings.length} Befunde aus ${reports} Berichten)`);
    lines.push(...findings.map((finding) => `- ${finding.section} · ${finding.file} · ${finding.title}`), '');
  }
  lines.push('## MCP-Relevanz', '', `| MCP | ${VERDICTS.join(' | ')} |`, `|---|${VERDICTS.map(() => '---').join('|')}|`);
  for (const [server, counts] of [...relevance].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`| ${server} | ${VERDICTS.map((verdict) => counts[verdict]).join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(render(collect(options.dir), options.dir));
  } catch (error) {
    if (!(error instanceof WishesError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { collect, render };
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/wishes-aggregate.test.js` — erwartet: PASS

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/wishes-aggregate.test.js plugins/forge/scripts/wishes-aggregate.js` · `git commit -m "feat(forge): group wish reports by target and tally MCP relevance"`

### Task 15: Skill auf eingespielte Fakten und Skript-Bericht umstellen

**ACs:** AC-22, AC-23

**Dateien:**
- Modify: `plugins/forge/skills/prozess-retrospektive/SKILL.md` · `## Ablauf`
- Modify: `plugins/forge/skills/prozess-retrospektive/references/report-format.md` · `## Für Außenstehende schreiben`
- Modify: `plugins/forge/skills/prozess-retrospektive/references/signals.md` · `# Signale` — Datei löschen
- Modify: `plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md` · `# Häufige Fehler` — Datei löschen
- Modify: `README.md` · `Analyzes the *process* of a session`
- Test: `plugins/forge/tests/prozess-retrospektive.test.js` · `prozessRetrospektive_Frontmatter_OnlyNameAndDescription`

**Interfaces:**
- Consumes: Task 3: `--no-fail`; Task 4: `--until-command`; Task 10: `--snapshot` mit `- Snapshot:` und `- Entwurf nach:`
- Consumes: Task 9: `hintLines(fired)` aus `lib/session-metrics.js`
- Consumes: Task 12: `retro-report.js --format` und `--snapshot <pfad> --topic <thema>`; Task 13: `session-timeline.js --around <nr>`; Task 14: `wishes-aggregate.js`
- Produces: Skill `dv-forge:prozess-retrospektive` nur per Slash-Befehl; Referenzen nur noch `references/report-format.md`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Inhalt von `plugins/forge/tests/prozess-retrospektive.test.js` vollständig ersetzen durch:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');
const { hintLines } = require('../scripts/lib/session-metrics.js');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'prozess-retrospektive');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const SCRIPTS = ['session-facts.js', 'session-timeline.js', 'retro-report.js'];

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('prozessRetrospektive_Frontmatter_ManualOnlyWithArgumentHintAndPreapprovedScripts', () => {
  // Arrange
  const { fields } = readMarkdown(SKILL);

  // Act
  const allowed = fields['allowed-tools'] ?? '';

  // Assert
  assert.deepEqual([fields.name, fields['disable-model-invocation'], /^Use when/.test(fields.description), Boolean(fields['argument-hint'])],
    ['prozess-retrospektive', 'true', true, true]);
  for (const script of SCRIPTS) assert.ok(allowed.includes(`Bash(node "\${CLAUDE_PLUGIN_ROOT}/scripts/${script}" *)`), `${script} fehlt`);
});

test('prozessRetrospektive_Body_StaysUnder500WordsAndUsesPluginRoot', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const words = wordCount(body);

  // Assert
  assert.ok(words < 500, `${words} Wörter`);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
});

test('prozessRetrospektive_Body_InjectsFactsOfOwnSessionBeforeLoading', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const lines = body.split('\n');

  // Assert
  assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --until-command prozess-retrospektive --snapshot --no-fail $ARGUMENTS`'));
});

test('prozessRetrospektive_Body_InjectsReportFormat', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const lines = body.split('\n');

  // Assert
  assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`'));
});

test('prozessRetrospektive_Body_ReadsTimelineNeverGrep', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const timeline = body.includes('`node "<PLUGIN>/scripts/session-timeline.js" --session ${CLAUDE_SESSION_ID} --around <nr>`');

  // Assert
  assert.ok(timeline);
  assert.match(body, /Nie grep auf das Protokoll/);
});

test('prozessRetrospektive_Body_WritesDraftThenRunsReportScript', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const report = body.includes('`node "<PLUGIN>/scripts/retro-report.js" --snapshot "<Snapshot>" --topic <thema>`');

  // Assert
  assert.ok(report);
  assert.match(body, /per `Write` an den Pfad aus „Entwurf nach:“/);
});

test('prozessRetrospektive_Body_CommitWithConventionAndWorkitemCandidate', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const convention = body.includes('forge-config.js" get Commit-Konvention');

  // Assert
  assert.ok(convention);
  assert.match(body, /`Workitem-Kandidat`; steht dort `keiner`, fragst du vor dem Commit/);
});

test('prozessRetrospektive_Body_ListsJudgmentSignals', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);
  const signals = ['Rückfrage oder Korrektur durch den Menschen', 'Skill geladen, aber nicht befolgt', 'Ergebnis erzeugt, aber nie genutzt',
    'breiter Lauf, wo ein schmaler reicht', 'parallel laufen könnte'];

  // Act
  const missing = signals.filter((signal) => !body.includes(signal));

  // Assert
  assert.deepEqual(missing, []);
});

test('prozessRetrospektive_Body_LooksBeyondForge', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const phrases = [/nicht nur in dv-forge/, /wiederkehrende oder unnötige Läufe/, /ohne jede Kenntnis des Projekts/];

  // Assert
  for (const phrase of phrases) assert.match(body, phrase);
});

test('prozessRetrospektive_Body_NoSkeletonNoFixedContextThreshold', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const outdated = /--skeleton|200k|frische Session/.test(body);

  // Assert
  assert.equal(outdated, false);
});

test('prozessRetrospektive_Body_KeepsCommonMistakesInline', () => {
  // Arrange
  const { body } = readMarkdown(SKILL);

  // Act
  const quotesRules = body.includes('`datei:zeile`');

  // Assert
  assert.ok(quotesRules);
});

test('prozessRetrospektive_References_OnlyReportFormatRemains', () => {
  // Arrange
  const dir = path.join(SKILL_DIR, 'references');

  // Act
  const files = fs.readdirSync(dir).sort();

  // Assert
  assert.deepEqual(files, ['report-format.md']);
});

test('sessionMetrics_Hints_CoverNeedlessAndBroadRuns', () => {
  // Arrange
  const fired = ['ohneAenderung', 'langerLauf'];

  // Act
  const text = hintLines(fired).join('\n');

  // Assert
  assert.match(text, /Lauf ohne neue Information/);
  assert.match(text, /Einzeltest statt ganzer Suite/);
});

test('reportFormat_EveryFinding_HasSituationBetterApproachTargetAndProjectLine', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const template = text.slice(text.indexOf('## Reibung'), text.indexOf('## Neue Ideen'));

  // Assert
  for (const slot of ['*Situation:*', '*Besser gewesen:*', '*Vorschlag:*', '*Ziel:*', '*Im Projekt:*']) {
    assert.equal(template.split(slot).length - 1, 2, `${slot} nicht in Reibung und Sparpotenzial`);
  }
  assert.match(text, /Kein Befund ohne \*Besser gewesen:\*/);
});

test('reportFormat_TargetForms_MatchTheReportCheck', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const forms = text.includes('*Ziel:* <Art> · `<Name>` (<optional ein Halbsatz>) | <Art> · neu: <Arbeitsname> | Ziel offen');

  // Assert
  assert.ok(forms);
  assert.match(text, /genau eins von Plugin, Skill, Agent, CLAUDE\.md, Hook, Skript, MCP/);
});

test('reportFormat_NamesWhatTheScriptsAdd', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const scripts = ['retro-report.js', 'wishes-aggregate.js'].filter((name) => !text.includes(`\`${name}\``));

  // Assert
  assert.deepEqual(scripts, []);
});

test('reportFormat_Outsiders_RolesInsteadOfProjectNamesToolsByName', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const rules = [/## Für Außenstehende schreiben/, /als ihre \*\*Rolle\*\*/, /beim \*\*Namen\*\*/, /nur unter \*Im Projekt:\*/];

  // Assert
  for (const rule of rules) assert.match(text, rule);
});

test('reportFormat_QuotesAndCommands_UsePlaceholdersForProjectNames', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const command = text.includes('`dotnet build <Solution>`');

  // Assert
  assert.ok(command);
  assert.match(text, /Platzhalter in eckigen Klammern/);
  assert.match(text, /Vor dem Speichern gehst du jeden Befund durch/);
});

test('reportFormat_ToolErrorIsNeverTrivialAndRawDataExempt', () => {
  // Arrange
  const text = reference('report-format.md');

  // Act
  const rules = [/Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit/, /„Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen/];

  // Assert
  for (const rule of rules) assert.match(text, rule);
});
```

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/prozess-retrospektive.test.js` — erwartet: FAIL `prozessRetrospektive_Frontmatter_ManualOnlyWithArgumentHintAndPreapprovedScripts`, FAIL `prozessRetrospektive_Body_StaysUnder500WordsAndUsesPluginRoot`, FAIL `prozessRetrospektive_Body_InjectsFactsOfOwnSessionBeforeLoading`, FAIL `prozessRetrospektive_Body_InjectsReportFormat`, FAIL `prozessRetrospektive_Body_ReadsTimelineNeverGrep`, FAIL `prozessRetrospektive_Body_WritesDraftThenRunsReportScript`, FAIL `prozessRetrospektive_Body_CommitWithConventionAndWorkitemCandidate`, FAIL `prozessRetrospektive_Body_ListsJudgmentSignals`, FAIL `prozessRetrospektive_Body_NoSkeletonNoFixedContextThreshold`, FAIL `prozessRetrospektive_Body_KeepsCommonMistakesInline`, FAIL `prozessRetrospektive_References_OnlyReportFormatRemains`, FAIL `reportFormat_TargetForms_MatchTheReportCheck`, FAIL `reportFormat_NamesWhatTheScriptsAdd`

- [ ] **Schritt 3: Minimal implementieren**

Inhalt von `plugins/forge/skills/prozess-retrospektive/SKILL.md` vollständig ersetzen durch:

```markdown
---
name: prozess-retrospektive
description: Use when the human asks how a session went — rounds, token use, blocked or failed tool calls, misunderstandings, interventions, repeated or needless runs, work that could have been cheaper — and wants it turned into improvements for plugins, skills, CLAUDE.md, hooks, scripts or MCP servers, existing or new. Triggers /dv-forge:prozess-retrospektive, "retrospektive", "session review", "wie lief das", "learnings".
disable-model-invocation: true
argument-hint: [--file <session.jsonl>] [--since-command <skill> [--occurrence <n>]]
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-timeline.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *)
---

# Prozess-Retrospektive

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du deckst **Lücken** der Session auf, nicht nur in dv-forge, sondern in allem, was mitlief: Plugins, Skills, Hooks, Skripte, MCP-Server, `CLAUDE.md` und die Arbeitsweise selbst. Zwei Richtungen: **Wo hakte es?** und **Was kostete mehr als nötig?**, etwa wiederkehrende oder unnötige Läufe. Neben Verbesserungen am Bestehenden suchst du Ideen für etwas, das es noch nicht gibt.

Ergebnis ist ein Erfahrungsbericht als Datei, den jemand ohne jede Kenntnis des Projekts versteht. Jede Aussage stützt sich auf eine Zahl oder ein Zitat aus der Session; alles andere kennzeichnest du als `Eindruck`.

## Fakten
Vom Skript erzeugt, bevor du diese Anweisung liest; die Retrospektive selbst ist nicht mitgezählt.

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --until-command prozess-retrospektive --snapshot --no-fail $ARGUMENTS`

## Berichtsformat

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`

## Ablauf
1. **Lücken finden:** Gemessene Signale stehen mit möglicher Ursache unter „Hinweise zu den Signalen“. Selbst prüfst du, was nur Urteil zeigt:
   - Rückfrage oder Korrektur durch den Menschen (Liste „Eingaben des Menschen“)
   - Skill geladen, aber nicht befolgt
   - Ergebnis erzeugt, aber nie genutzt
   - teures Modell oder breiter Lauf, wo ein schmaler reicht
   - Mensch wartet auf etwas, das parallel laufen könnte

   Je Stelle: was passiert ist, was es gekostet hat, welche Ursache, was in genau diesem Fall besser gewesen wäre. Bei wiederholter oder deterministischer Handarbeit fragst du, was sie künftig übernehmen könnte.
2. **Nachlesen** nur, wo die Fakten hinzeigen: `node "<PLUGIN>/scripts/session-timeline.js" --session ${CLAUDE_SESSION_ID} --around <nr>`, bei `--file` mit derselben Datei. Nie grep auf das Protokoll. Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt. Laufen noch Subagents, wartest du auf sie oder vermerkst sie als offen.
3. **Entwurf** nach dem Berichtsformat per `Write` an den Pfad aus „Entwurf nach:“. Jeder Vorschlag bekommt genau ein Ziel.
4. **Bericht:** `node "<PLUGIN>/scripts/retro-report.js" --snapshot "<Snapshot>" --topic <thema>`, Snapshot aus den Fakten, Thema in Kleinbuchstaben mit Bindestrichen. Meldet es Verstöße, korrigierst du den Entwurf und rufst es erneut auf.
5. **Im Chat:** die Kurzfassung des Skripts ohne die Zeile `Commit:`, dann die Frage, ob committet werden soll. Nach dem Ja committest du nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention` mit der Nummer aus `Workitem-Kandidat`; steht dort `keiner`, fragst du vor dem Commit nach der Workitem-Nummer.

## Häufige Fehler
- Zahl, die weder Fakten noch Protokoll hergeben → weglassen oder ` · Eindruck`.
- Regel eines anderen Werkzeugs aus dem Gedächtnis → Regeltext mit `datei:zeile` zitieren oder ` · Eindruck`; ein Vorschlag dagegen ist eine Regeländerung, keine erlaubte Variante.
- Nur Fehler suchen → auch teure, fehlerfreie Läufe sind Befunde; positiv nur, was sich lohnt beizubehalten.
```

Inhalt von `plugins/forge/skills/prozess-retrospektive/references/report-format.md` vollständig ersetzen durch:

````markdown
# Berichtsformat

Du schreibst nur den **Entwurf** in diesem Format. `retro-report.js` ergänzt Modell, Skills und Datum im Kopf, die Zahlen zu Dauer, Eingaben und Tokens, die Abschnitte „Zahlen“ und „MCP-Nutzung“ aus den Fakten und unter „Neue Ideen“ jedes `neu:`-Ziel. Es prüft den Entwurf, wählt den Dateinamen unter `docs/wishes/` und hält das Format der bisherigen Berichte, damit `wishes-aggregate.js` viele Berichte nach Ziel vorsortieren kann.

```markdown
# Erfahrungsbericht <Art der Arbeit, allgemein>

**Lauf:** <was gemacht wurde, welche Skills und Plugins>
**Ergebnis:** <was herauskam>

**Relevanz:**
- <MCP>: gebraucht | verzichtbar in dieser Session | hätte genützt, weil <Beleg>

## Positiv

1. **<Kurzbefund>.** <was gut lief, mit Beleg>

## Reibung

1. **<Kurzbefund, allgemein>.**
   *Situation:* <was passiert ist, für Außenstehende erzählt, mit Zahl oder Zitat>
   *Kosten:* <Tokens, Minuten, Runden, Rückfragen>
   *Ursache:* <warum>
   *Besser gewesen:* <das Vorgehen, das in genau diesem Fall schneller, billiger oder richtig gewesen wäre, als Schritte>
   *Vorschlag:* <was sich dauerhaft ändern soll, damit es nicht wieder passiert>
   *Ziel:* <Art> · `<Name>` (<optional ein Halbsatz>) | <Art> · neu: <Arbeitsname> | Ziel offen
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe dieses Projekts, nur für die eigene Nacharbeit>

## Sparpotenzial

1. **<Kurzbefund, allgemein>.**
   *Situation:* <welcher Lauf wiederkehrend oder unnötig war, für Außenstehende erzählt, mit Zahl>
   *Ersparnis:* <geschätzt je Session: Tokens, Minuten, Runden; Geld nur mit bekanntem Preis>
   *Besser gewesen:* <wie es in genau diesem Fall billiger gegangen wäre, als Schritte>
   *Vorschlag:* <was das künftig übernimmt>
   *Ziel:* <wie bei Reibung>
   *Im Projekt:* <Dateien, Klassen, Fachbegriffe dieses Projekts, nur für die eigene Nacharbeit>

## Neue Ideen

- **<Arbeitsname>** (`neu:` <Art>): <nur Ideen ohne eigenen Befund; `neu:`-Ziele der Befunde ergänzt das Skript>

## Kleinigkeiten

- <Einzeiler>
```

`<Art>` ist genau eins von Plugin, Skill, Agent, CLAUDE.md, Hook, Skript, MCP. `Relevanz` hat eine Zeile je erwartetem MCP aus den Fakten.

## Für Außenstehende schreiben

Ein Befund aus Kurzbefund, *Situation*, *Kosten* oder *Ersparnis*, *Ursache*, *Besser gewesen* und *Vorschlag* muss für jemanden verständlich sein, der das Projekt nie gesehen hat. Er soll ihn ohne Rückfrage weitergeben können.

- Projektdinge stehen dort als ihre **Rolle**: „eine Frontend-Komponente“, „ein Fachbegriff der Anwender, der im Code anders heißt“, „die komplette Testsuite mit rund 1.200 Tests“.
- Werkzeuge nennst du beim **Namen**, beim ersten Auftreten mit einem Halbsatz, was sie tun: „der Hook `guard-orchestrator.js`, der Testaufrufe außerhalb des vorgesehenen Skripts blockiert“. Das gilt für Skills, Agents, Hooks, Skripte und MCP-Server.
- Zitate aus der Session bekommen statt Projektbegriffen Platzhalter in eckigen Klammern: „Nein, [Fachbegriff] heißt im Code [Name A], nicht [Name B]“. Das wörtliche Zitat steht unter *Im Projekt:*.
- Befehle behalten Werkzeug und Optionen, Projektnamen werden Platzhalter: `dotnet build <Solution>`, `docker logs --tail 200 <Container>`.
- Dateien, Klassen, Container, Solutions und Fachbegriffe des Projekts stehen nur unter *Im Projekt:*. Das gilt auch für „Neue Ideen“.
- Vor dem Speichern gehst du jeden Befund durch: Steht außerhalb von *Im Projekt:* ein Name, den nur dieses Projekt kennt, ersetzt du ihn durch seine Rolle oder einen Platzhalter.
- „Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen: Sie sind Rohdaten aus dem Skript und bleiben wörtlich, auch mit Pfaden und Projektnamen.

Beispiel:

```markdown
1. **Fachbegriff falsch auf den Code abgebildet, ganze Runde verloren.**
   *Situation:* Der Mensch nannte einen Bildschirm mit dem Wort, das die Anwender dafür benutzen. Im Code heißt er anders, und ein Bildschirm mit ähnlichem Namen existiert. Der Agent änderte den falschen, ließ die komplette Testsuite laufen, dann korrigierte der Mensch: „Nein, [Fachbegriff] ist [Bildschirm A], nicht [Bildschirm B].“
   *Kosten:* 1 Rückfrage, 1 volle Testsuite (6 min, ~38k Tokens).
   *Ursache:* Keine Zuordnung von Fachbegriff zu Code, der Agent riet nach Namensähnlichkeit.
   *Besser gewesen:* Vor der ersten Änderung beide Kandidaten nennen und fragen, welcher gemeint ist; eine Rückfrage kostet Sekunden.
   *Vorschlag:* Ein Glossar Fachbegriff → Code, das der Agent vor der Suche liest.
   *Ziel:* Skill · `dv-working-capturing:glossary` (hält Fachbegriffe und ihren Ort im Code fest)
   *Im Projekt:* „Schichtbuch“ = `ShiftLogComponent`, verwechselt mit `LacOverviewComponent`. Zitat: „Nein, Schichtbuch ist die ShiftLogComponent, nicht die LAC-Übersicht.“
```

## Regeln
- Sortiert nach Kosten: teuerster Reibungspunkt zuerst, größte Einsparung zuerst.
- Ein Punkt steht entweder unter Reibung (etwas hakte) oder unter Sparpotenzial (lief, aber zu teuer), nicht in beiden.
- Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`.
- Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit: Er tritt bei jedem Lauf wieder auf und bekommt einen Befund mit `Ziel:`.
- Kein Befund ohne *Besser gewesen:* und ohne `Ziel:`-Zeile. `neu:` heißt: Das gibt es noch nicht, es lohnt sich, darüber nachzudenken.
- Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
- `retro-report.js` meldet als Verstoß: fehlende Abschnitte oder Felder, eine andere Ziel-Form, *Kosten* oder *Ersparnis* ohne Zahl und ohne ` · Eindruck`, fehlende Relevanz je erwartetem MCP, Dateinamen des Projekts außerhalb von *Im Projekt:* und Zitate unter *Im Projekt:*, die nicht im Protokoll stehen.
````

Datei löschen: `git rm plugins/forge/skills/prozess-retrospektive/references/signals.md`

Datei löschen: `git rm plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md`

In `README.md` (Anker `Analyzes the *process* of a session`) diesen Block

```markdown
Part of the `dv-forge` plugin (`plugins/forge/skills/prozess-retrospektive/`, invoked as `/dv-forge:prozess-retrospektive`), but it looks for gaps in any session, not only in dv-forge runs.

Analyzes the *process* of a session — not what was delivered, but how it ran. A script (`plugins/forge/scripts/session-facts.js`) reads the Claude Code session transcript and reports duration, human turns, token use per session and subagent, tool calls, tool errors, blocked calls, repeats and compactions. The skill turns these facts into an experience report under `docs/wishes/`, each wish with its target: plugin, skill, agent, CLAUDE.md, hook or MCP server.

MCP usage is measured, not recalled: the same run appends a section from `plugins/forge/scripts/mcp-usage.js` with calls, errors and repeats per MCP server and native tool, per agent (subagent transcripts included), plus expected-but-unused servers and shell-fallback candidates. Across several reports this shows which MCPs are irrelevant.

Besides friction the skill looks for savings in time, tokens and money: the script lists the largest tool results, files read more than once and recurring shell commands. Wishes may target existing plugins, skills, hooks and MCPs or something new (`neu:`), such as a script or MCP tool that takes over repeated manual work.
```

ersetzen durch:

```markdown
Part of the `dv-forge` plugin (`plugins/forge/skills/prozess-retrospektive/`), but it looks for gaps in any session, not only in dv-forge runs. Manual only: `/dv-forge:prozess-retrospektive [--file <session.jsonl>] [--since-command <skill> [--occurrence <n>]]`, so its description stays out of every session's context.

Analyzes the *process* of a session — not what was delivered, but how it ran. Before the model reads the skill, `plugins/forge/scripts/session-facts.js` runs as an injected command and inlines the facts: duration, active vs. waiting time, human inputs with entry numbers, token use per session and subagent, context per request, baseline of the first request, cache rebuilds, tool calls, errors, blocked calls, repeats, compactions and harness hints. The retrospective's own run is cut off, so it never measures itself.

MCP usage is measured, not recalled: `plugins/forge/scripts/mcp-usage.js` adds calls, errors and repeats per MCP server and native tool, per agent (subagent transcripts included), expected-but-unused servers (from `.mcp.json` and the `Erwartete-MCPs` setting) with the native calls they could have taken, and shell-fallback candidates. Across several reports this shows which MCPs are irrelevant.

Besides friction the skill looks for savings in time, tokens and money: the facts list the largest tool results, the largest context load (size × requests that re-read it), files read more than once, recurring shell commands, long tool runs and build, test or lint runs repeated without a file change, each fired signal with a hint on likely causes. Single places are read with `plugins/forge/scripts/session-timeline.js` instead of grepping the transcript. Wishes may target existing plugins, skills, hooks and MCPs or something new (`neu:`), such as a script or MCP tool that takes over repeated manual work.

The model writes only a draft. `plugins/forge/scripts/retro-report.js` adds header, facts and MCP sections, lists every `neu:` target under *Neue Ideen*, checks the draft (required fields, target form, impressions, project names outside *Im Projekt*, quotes present in the transcript), picks the file name under `docs/wishes/` and prints the chat summary, its own cost and a work-item candidate. `plugins/forge/scripts/wishes-aggregate.js` groups all reports by target and tallies MCP relevance.
```

In `README.md` (Anker `| "retrospektive" · "session review" · "prozess analyse" |`) diesen Block

```markdown
| "retrospektive" · "session review" · "prozess analyse" | Start session retrospective |
| "harness verbessern" · "was koennen wir verbessern" | Natural language trigger |
| "wie lief das" · "erkenntnisse" · "learnings" | Natural language trigger |
| `kein-retrospektive` · `no-retrospektive` | Opt-out |

> Always explicit — never auto-triggers.
```

ersetzen durch:

```markdown
| `/dv-forge:prozess-retrospektive` | Retrospective of the current session |
| `/dv-forge:prozess-retrospektive --file <session.jsonl>` | Retrospective of another session |
| `/dv-forge:prozess-retrospektive --since-command <skill>` | Only the part from the last call of `<skill>` |

> Manual only (`disable-model-invocation`), never auto-triggers.
```

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/prozess-retrospektive.test.js` — erwartet: PASS
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS (alle Tests, 1 übersprungen wie vorher)

- [ ] **Schritt 5: Commit**
  `git add plugins/forge/tests/prozess-retrospektive.test.js plugins/forge/skills/prozess-retrospektive/SKILL.md plugins/forge/skills/prozess-retrospektive/references/report-format.md README.md` · `git commit -m "feat(forge): run the retrospective on injected facts and script-built reports"`
  (die gelöschten Dateien `plugins/forge/skills/prozess-retrospektive/references/signals.md`, `plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md` sind durch `git rm` schon vorgemerkt)

## Entscheidungen
- **W · Umfang** · Aussage — Alle Verbesserungsvorschläge und Korrekturen aus der Prüfung des Skills, in einem Umsetzungsplan.
- **W · Planungs-Skills** · Aussage — Es gilt `unit-integration-testing`.
- **E · Neue Dateien statt eines größeren session-facts.js** · Planer — `lib/transcript.js`, `lib/session-metrics.js`, `lib/report-lint.js`, `retro-report.js`, `session-timeline.js`, `wishes-aggregate.js`; `session-facts.js` wäre sonst über 700 Zeilen, und jede Datei hat eine Aufgabe.
- **E · Testnamen** · Planer — Das bestehende Schema `<Einheit>_<Situation>_<Ergebnis>` in flachen `test(...)`-Aufrufen statt `describe`/`it`: Der Skill verlangt eine Konvention, die im Projekt durchgehalten wird, und das Plugin nutzt diese.
- **E · Frontmatter des Skills** · Planer — `disable-model-invocation`, `argument-hint` und `allowed-tools` weichen von der Kurzregel „nur name + description“ der Projekt-`CLAUDE.md` ab, wie bei den übrigen dv-forge-Ablauf-Skills; ohne sie gäbe es weder den manuellen Aufruf noch das Einspielen ohne Berechtigungsfrage.
- **E · Zeile in init entfernt** · Planer — „Stolperfallen ungefragt umschreiben“ wiederholt Schritt 1 von `init`; die Zeile fällt weg, damit der neue Schlüssel unter die 500-Wörter-Grenze passt.
- **E · Snapshot im Temp-Ordner** · Planer — `<os.tmpdir()>/dv-forge-retro/<session>.json`, damit im Projekt nichts Unversioniertes liegen bleibt; der Entwurf liegt als `docs/wishes/.entwurf-<8 Zeichen>.md` neben den Berichten und wird nach dem Bericht gelöscht.
- **E · Menschliche Eingabe** · Planer — Einträge mit `isMeta` oder `isCompactSummary` zählen nie; `origin.kind === "human"` zählt immer (so in aktuellen Protokollen); sonst gilt die bisherige Erkennung.
- **E · Schwellen** · Planer — Tool-Lauf ab 60 s, Kontextlast in der Liste ab 1k und als Hinweis ab 100k, Cache-Neuaufbau ab 20k neu geschrieben bei weniger als der Hälfte des vorigen Kontexts aus dem Cache, teurer Subagent ab 100k neuen Tokens bei höchstens 5 Tool-Aufrufen, etwa 4 Zeichen je Token.
- **E · Grundlast mit Rohtypen** · Planer — Anhänge heißen wie im Protokoll (`skill_listing`, `mcp_instructions_delta` …), statt Namen zu raten.
- **E · Projektnamen-Prüfung** · Planer — Geprüft werden Dateinamen in PascalCase ab 6 Zeichen aus `git ls-files`; Fachbegriffe ohne eigene Datei fängt die Prüfung nicht, dafür bleibt die Regel im Berichtsformat.
- **E · Zitat-Prüfung** · Planer — Nur Zitate in „…“ unter *Im Projekt:* ab 12 Zeichen, verglichen mit Eingaben, Antworten und Tool-Ergebnissen vor dem Schnitt, Leerraum zusammengezogen.
- **E · Rauchtest im echten Claude Code** · Planer — Ob `!`-Befehl, `$ARGUMENTS` und `allowed-tools` so zusammenspielen, lässt sich in `node:test` nicht prüfen. Nach dem Merge einmal `/dv-forge:prozess-retrospektive` in einer echten Session aufrufen; erwartet: die Fakten stehen im Skill-Text, und für die drei Skripte erscheint kein Berechtigungsdialog.
- **E · Kein Versionssprung** · Planer — Die Plugin-Version bleibt; sie wird wie bisher mit einem eigenen `chore(forge)`-Commit angehoben.
