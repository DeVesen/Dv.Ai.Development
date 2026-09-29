# Prozess-Retrospektive: schlank und genauer — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-09-29-lean-retrospective/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die Prozess-Retrospektive rechnet, prüft, benennt und setzt zusammen nur noch in Skripten, zählt richtig, misst neue Kosten und braucht dadurch 2 bis 3 Modell-Anfragen.
**Architektur:** `session-facts.js` bleibt das Fakten-Skript und nutzt neue Bibliotheken unter `plugins/forge/scripts/lib/` (`transcript.js` liest das Protokoll, `retro-range.js` schneidet den Bereich, `retro-requests.js` fasst Modell-Anfragen und ihren Kontext, `retro-measures.js` misst, `retro-signals.js` deutet, `retro-files.js` legt Snapshot und Entwurf ab, `retro-format.js` schreibt Token-Zahlen). Drei neue Skripte übernehmen den Rest: `retro-report.js` (Format, Prüfung, Bericht, Kurzfassung, mit `lib/retro-draft.js`, `lib/retro-corpus.js`, `lib/retro-compose.js`, `lib/retro-secrets.js`, `lib/retro-summary.js`), `retro-timeline.js` (Zeitleiste) und `retro-sort.js` (Vorsortierung). Der Skill lädt Fakten und Format per `` !`…` `` schon beim Aufruf und lädt sich nie selbst.
**Tech-Stack:** Node.js 24 (nur `node:`-Module), `node:test`, Markdown-Skills von Claude Code.
**Spec:** docs/forge/2026-09-29-lean-retrospective/spec.md
**Basis:** c2338aa

## Global Constraints
- Der Skill lädt sich nie von selbst; seine Beschreibung belastet keine Session (`disable-model-invocation: true`).
- Die Berichte behalten den Aufbau der bisherigen Berichte: Kopf, Zahlen, MCP-Nutzung, Relevanz, Positiv, Reibung, Sparpotenzial, Neue Ideen, Kleinigkeiten.
- Zahlen im Bericht stammen aus den Skripten; das Modell schreibt keine Zahlen ab.
- Die feste Schwelle „ab rund 200k Kontext eine frische Session“ entfällt.
- Nicht Teil der Umsetzung: die Retrospektive der eigenen Session in einen Subagent verlegen und für die Retrospektive auf ein kleineres Modell wechseln.
- Projekt-`CLAUDE.md`, Skill-Konvention: Frontmatter-`description` beginnt mit „Use when…“, SKILL.md-Body unter 500 Wörtern, kein `@`-Link im Skill-Body.
- Repo-Konvention: nur Node-Bordmittel (`node:`-Module), keine neuen Abhängigkeiten; Tests laufen mit `node --test <datei>` im Checkout-Wurzelordner (die Projekt-`CLAUDE.md` schreibt dv-forge-Skripte nur für Angular- und .NET-Tests vor).
- Typografische Anführungszeichen „ (U+201E) und “ (U+201C) sowie `…` (U+2026) und `Ø` stehen in Code und Tests genau so; nach dem Schreiben per Code Point prüfen, nicht durch ASCII ersetzen.
- unit-integration-testing: Testnamen `<Einheit>_<Situation>_<Ergebnis>`.
- unit-integration-testing: ein Test prüft ein Verhalten; mehrere Asserts nur, wenn sie zusammen dieses eine Verhalten belegen.
- unit-integration-testing: Tests sind unabhängig, jeder legt eigene temporäre Dateien und Ordner an, kein geteilter Zustand.
- unit-integration-testing: Verhalten über die öffentliche Schnittstelle testen (exportierte Funktionen, CLI), keine internen Hilfsfunktionen.
- software-design-principles: IOSP — Funktionen orchestrieren (nur delegieren) oder rechnen (nur Logik), nicht beides.
- software-design-principles: keine Verschachtelung über zwei Ebenen; Guard Clauses und Early Return statt tiefer `if`/`else`.
- software-design-principles: kleine Funktionen mit einer Aufgabe; Schwellen und Größen als benannte Konstanten, keine Magic Numbers.
- software-design-principles: Fehler nie verschlucken; ein `catch` nur mit ausdrücklichem, kommentiertem Rückfallwert.

---

### Task 1: Protokoll-Bibliothek und Eingaben des Menschen

**ACs:** AC-01, AC-08

**Dateien:**
- Create: `plugins/forge/scripts/lib/transcript.js`
- Create: `plugins/forge/tests/lib/retro-session.js`
- Modify: `plugins/forge/scripts/session-facts.js:4-20` · `const mcpUsage = require('./mcp-usage.js');`
- Modify: `plugins/forge/scripts/session-facts.js:57-104` · `readEntries`, `textOf`, `tokensOf`, `callLabel`, `isHumanTurn`
- Modify: `plugins/forge/scripts/session-facts.js:141-199` · `analyze`
- Modify: `plugins/forge/scripts/session-facts.js:279-296` · `render`
- Modify: `plugins/forge/scripts/mcp-usage.js:7-9` · `const path = require('node:path');`
- Modify: `plugins/forge/scripts/mcp-usage.js:48-56` · `readJsonl`
- Modify: `plugins/forge/scripts/mcp-usage.js:136-153` · `loadSession`
- Test: `plugins/forge/tests/transcript.test.js`

**Interfaces:**
- Consumes: —
- Produces: `lib/transcript.js`: `class RetroError extends Error`; `SLASH_COMMAND: RegExp`; `readEntries(file: string): object[]` (jeder Eintrag mit `entryNo: number`, Zeilennummer ab 1); `textOf(content): string`; `tokensOf(usage): { input, cached, output }`; `shorten(text: string, max: number): string`; `clock(timestamp: string|null): string` (`HH:MM` lokal, sonst `--:--`); `callLabel(part: object): string`; `isToolResultEntry(entry): boolean`; `isCompactEntry(entry): boolean` (system-Eintrag mit `compact` in `subtype` oder `content`, die einzige Stelle dieser Regel); `humanEvents(entries): { entryNo: number, time: string|null, kind: 'Eingabe'|'Unterbrechung'|'Ablehnung', text: string }[]`. Intern (nicht exportiert) `isPlainUserText(entry)` (Text-Eintrag des Nutzers ohne `isMeta`, Tool-Ergebnis, Unterbrechung und Harness-Hinweis), das `isHumanInput` und in Task 16 `isSummary` gemeinsam nutzen. · `tests/lib/retro-session.js`: `stamp(at)`, `human(text, at)`, `slash(name, args, at)`, `skillText(text, at)`, `summary(text, at)` (mit `isCompactSummary`), `plainSummary(text, at)` (echte Form ohne `origin` und ohne Marker), `interrupt(at)`, `usage(fresh, created, read, output = 100)`, `request(id, at, parts = [], tokens = usage(10, 0, 0))`, `say(text)`, `call(id, name, input)`, `result(id, at, content, isError = false)`, `rejection(id, at)`, `hint(type, at, extra = {})`, `writeSession(entries, id = 's1'): string`. · `session-facts.js`: `analyze(entries)` liefert zusätzlich `humans` (Ergebnis von `humanEvents`); `turns` zählt nur `kind === 'Eingabe'`; `compactions` zählt über `isCompactEntry`. Die Ausgabe hat den Abschnitt `## Eingaben des Menschen` mit Zeilen `- #<entryNo> <HH:MM> <kind>: <text>`. · `mcp-usage.js`: `readJsonl` entfällt, `loadSession` liest Haupt- und Subagent-Protokolle mit `readEntries`; es gibt damit genau einen JSONL-Leser. · `tests/lib/retro-session.js` ist der Baukasten für alle neuen Test-Dateien; die bestehenden Helfer `session()` und `commandSession()` in `session-facts.test.js` bleiben, weil ihre festen Einträge die erwarteten Zahlen der bestehenden Tests tragen (Tokens, Aufrufe, Eintragsnummern), die die Tasks 2, 3, 8 und 11 weiter prüfen.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Zuerst den Fixture-Baukasten `plugins/forge/tests/lib/retro-session.js`:
  ```js
  'use strict';

  // Baut Protokolle, wie Claude Code sie schreibt. `at` ist eine Uhrzeit in UTC am 2026-09-27, 'HH:MM' oder 'HH:MM:SS'.

  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  function stamp(at) {
    return `2026-09-27T${at.length === 5 ? `${at}:00` : at}Z`;
  }

  function human(text, at) {
    return { type: 'user', origin: { kind: 'human' }, timestamp: stamp(at), message: { role: 'user', content: text } };
  }

  function slash(name, args, at) {
    const content = `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>\n<command-args>${args}</command-args>`;
    return { type: 'user', origin: { kind: 'human' }, timestamp: stamp(at), message: { role: 'user', content } };
  }

  function skillText(text, at) {
    return { type: 'user', isMeta: true, timestamp: stamp(at), message: { role: 'user', content: [{ type: 'text', text }] } };
  }

  // Zusammenfassung mit Marker, wie ältere Protokolle sie schreiben könnten.
  function summary(text, at) {
    return { type: 'user', isCompactSummary: true, timestamp: stamp(at), message: { role: 'user', content: text } };
  }

  // So steht eine Zusammenfassung in echten Protokollen: ein Text-Eintrag des Nutzers ohne `origin` und ohne `isCompactSummary`.
  function plainSummary(text, at) {
    return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: text } };
  }

  function interrupt(at) {
    return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: [{ type: 'text', text: '[Request interrupted by user]' }] } };
  }

  function usage(fresh, created, read, output = 100) {
    return { input_tokens: fresh, cache_creation_input_tokens: created, cache_read_input_tokens: read, output_tokens: output };
  }

  function request(id, at, parts = [], tokens = usage(10, 0, 0)) {
    return { type: 'assistant', requestId: id, timestamp: stamp(at), message: { model: 'claude-x', usage: tokens, content: parts } };
  }

  function say(text) {
    return { type: 'text', text };
  }

  function call(id, name, input) {
    return { type: 'tool_use', id, name, input };
  }

  function result(id, at, content, isError = false) {
    return { type: 'user', timestamp: stamp(at), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content, is_error: isError }] } };
  }

  function rejection(id, at) {
    return result(id, at, "The user doesn't want to proceed with this tool use. The tool use was rejected (eg. if it was a file edit, the new_string was NOT written to the file).", true);
  }

  function hint(type, at, extra = {}) {
    return { type: 'attachment', timestamp: stamp(at), attachment: { type, ...extra } };
  }

  function writeSession(entries, id = 's1') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-session-'));
    const file = path.join(dir, `${id}.jsonl`);
    fs.writeFileSync(file, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    return file;
  }

  module.exports = { stamp, human, slash, skillText, summary, plainSummary, interrupt, usage, request, say, call, result, rejection, hint, writeSession };
  ```
  Dann `plugins/forge/tests/transcript.test.js`:
  ```js
  'use strict';

  process.env.TZ = 'UTC';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { readEntries, humanEvents } = require('../scripts/lib/transcript');
  const { human, slash, skillText, summary, plainSummary, interrupt, request, call, rejection, writeSession } = require('./lib/retro-session');

  const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

  function sessionWithSkillAndSummary() {
    return writeSession([
      human('Mach X', '10:00'),
      slash('dv-forge:plan-writing', 'docs/forge/x/spec.md', '10:01'),
      skillText('Base directory for this skill: /plugins/forge/skills/plan-writing', '10:01'),
      request('r1', '10:02', [call('t1', 'Write', { file_path: 'a.md' })]),
      rejection('t1', '10:03'),
      interrupt('10:04'),
      summary('This session is being continued from a previous conversation that ran out of context.', '10:30'),
      human('Danke', '10:40'),
    ]);
  }

  // Die `human`-Einträge tragen `origin`, damit gilt das Protokoll als markiert; die Zusammenfassung hat weder `origin` noch Marker.
  function sessionWithUnmarkedSummary() {
    return writeSession([
      human('Mach X', '10:00'),
      plainSummary('This session is being continued from a previous conversation that ran out of context.', '10:30'),
      human('Danke', '10:40'),
    ]);
  }

  function facts(file) {
    return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
  }

  test('humanEvents_UnmarkedSummaryInMarkedSession_IsNoInput', () => {
    const entries = readEntries(sessionWithUnmarkedSummary());

    const events = humanEvents(entries);

    assert.deepEqual(events.map((event) => event.text), ['Mach X', 'Danke']);
  });

  test('cli_UnmarkedSummary_NotCountedAsHumanInput', () => {
    const result = facts(sessionWithUnmarkedSummary());

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- Eingaben des Menschen: 2 · /);
  });

  test('humanEvents_SkillTextAndSummary_AreNoInput', () => {
    const entries = readEntries(sessionWithSkillAndSummary());

    const inputs = humanEvents(entries).filter((event) => event.kind === 'Eingabe');

    assert.deepEqual(inputs.map((event) => event.text), ['Mach X', '/dv-forge:plan-writing docs/forge/x/spec.md', 'Danke']);
  });

  test('humanEvents_InterruptAndRejection_ListedWithEntryNumber', () => {
    const entries = readEntries(sessionWithSkillAndSummary());

    const events = humanEvents(entries);

    assert.deepEqual(events.map((event) => [event.entryNo, event.kind]), [[1, 'Eingabe'], [2, 'Eingabe'], [5, 'Ablehnung'], [6, 'Unterbrechung'], [8, 'Eingabe']]);
  });

  test('humanEvents_LongText_ShortenedToOneLine', () => {
    const entries = readEntries(writeSession([human(`Zeile eins\n${'x'.repeat(200)}`, '10:00')]));

    const [event] = humanEvents(entries);

    assert.equal(event.text.length, 100);
    assert.ok(event.text.startsWith('Zeile eins x'));
    assert.ok(event.text.endsWith('…'));
  });

  test('cli_SkillTextAndSummary_NotCountedAsHumanInput', () => {
    const result = facts(sessionWithSkillAndSummary());

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- Eingaben des Menschen: 3 · /);
  });

  test('cli_HumanEvents_ListedWithEntryTimeAndText', () => {
    const result = facts(sessionWithSkillAndSummary());

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /## Eingaben des Menschen\n- #1 10:00 Eingabe: Mach X\n- #2 10:01 Eingabe: \/dv-forge:plan-writing docs\/forge\/x\/spec\.md\n- #5 10:03 Ablehnung: Tool-Aufruf abgelehnt\n- #6 10:04 Unterbrechung: \[Request interrupted by user\]\n- #8 10:40 Eingabe: Danke\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/transcript.test.js` — erwartet: FAIL `humanEvents_SkillTextAndSummary_AreNoInput` (Modul `../scripts/lib/transcript` fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/transcript.js` neu:
  ```js
  'use strict';

  // Liest ein Claude-Code-Protokoll (JSONL) und erkennt, was der Mensch getan hat.

  const fs = require('node:fs');

  const NOTICE = /^\s*<(?:task-notification|agent-message|system-reminder|command-|local-command)/;
  const SLASH_COMMAND = /<command-name>\s*\/?([^<\s]+)\s*<\/command-name>/;
  const SLASH_ARGS = /<command-args>([\s\S]*?)<\/command-args>/;
  const INTERRUPT = /^\[Request interrupted by user/;
  const REJECTION = /The user doesn't want to proceed with this tool use/;
  const COMPACT = /compact/i;
  const HUMAN_TEXT_MAX = 100;

  class RetroError extends Error {}

  // Jeder Eintrag trägt als `entryNo` seine Zeilennummer im Protokoll (ab 1); kaputte Zeilen fallen weg.
  function readEntries(file) {
    return fs.readFileSync(file, 'utf8').split('\n').flatMap((text, index) => {
      if (text.trim() === '') return [];
      try {
        return [{ ...JSON.parse(text), entryNo: index + 1 }];
      } catch {
        // Eine unvollständig geschriebene Zeile ist kein Eintrag.
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

  function shorten(text, max) {
    const line = String(text).replace(/\s+/g, ' ').trim();
    return line.length > max ? `${line.slice(0, max - 1)}…` : line;
  }

  function clock(timestamp) {
    return timestamp ? new Date(timestamp).toTimeString().slice(0, 5) : '--:--';
  }

  // Kurzform eines Aufrufs: Tool plus wichtigstes Argument.
  function callLabel(part) {
    const input = part.input ?? {};
    const detail = input.command ?? input.file_path ?? input.pattern ?? input.path ?? input.skill ?? input.description ?? '';
    return `${part.name}${detail ? ` ${String(detail).replace(/\s+/g, ' ').slice(0, 80)}` : ''}`;
  }

  function isToolResultEntry(entry) {
    const content = entry.message?.content;
    return Array.isArray(content) && content.some((part) => part.type === 'tool_result');
  }

  // Die eine Regel für Zusammenfassungen als system-Eintrag; Zählung (`analyze`) und Zeitleiste (`isSummary`) nutzen sie beide.
  function isCompactEntry(entry) {
    return entry.type === 'system' && COMPACT.test(`${entry.subtype ?? ''} ${entry.content ?? ''}`);
  }

  // Text-Eintrag des Nutzers ohne Skill-Text, Tool-Ergebnis, Unterbrechung und Harness-Hinweis; Grundlage für Eingaben und Zusammenfassungen.
  function isPlainUserText(entry) {
    if (entry.type !== 'user' || !entry.message || entry.isMeta || isToolResultEntry(entry)) return false;
    const text = textOf(entry.message.content);
    return !INTERRUPT.test(text) && !NOTICE.test(text);
  }

  // Ein Slash-Befehl beginnt mit `<command-message>` und sähe sonst wie ein Harness-Hinweis aus.
  function isSlashCommand(entry) {
    return entry.type === 'user' && !entry.isMeta && SLASH_COMMAND.test(textOf(entry.message?.content));
  }

  // Protokolle mit `origin` markieren Eingaben des Menschen selbst; in älteren erkennt man sie am Text.
  function isHumanInput(entry, marked) {
    if (entry.isCompactSummary) return false;
    const typed = isPlainUserText(entry) || isSlashCommand(entry);
    return marked ? typed && entry.origin?.kind === 'human' : typed;
  }

  function slashText(text) {
    const args = text.match(SLASH_ARGS)?.[1]?.trim() ?? '';
    return `/${text.match(SLASH_COMMAND)[1]}${args ? ` ${args}` : ''}`;
  }

  function rejectionsOf(entry) {
    return entry.message.content.filter((part) => part.type === 'tool_result' && REJECTION.test(textOf(part.content)));
  }

  function eventsOf(entry, marked) {
    const at = { entryNo: entry.entryNo, time: entry.timestamp ?? null };
    if (isToolResultEntry(entry)) return rejectionsOf(entry).map(() => ({ ...at, kind: 'Ablehnung', text: 'Tool-Aufruf abgelehnt' }));
    const text = textOf(entry.message.content);
    if (INTERRUPT.test(text)) return [{ ...at, kind: 'Unterbrechung', text: shorten(text, HUMAN_TEXT_MAX) }];
    if (!isHumanInput(entry, marked)) return [];
    return [{ ...at, kind: 'Eingabe', text: shorten(SLASH_COMMAND.test(text) ? slashText(text) : text, HUMAN_TEXT_MAX) }];
  }

  // Jede Eingabe, Unterbrechung und Ablehnung des Menschen in Protokoll-Reihenfolge.
  function humanEvents(entries) {
    const marked = entries.some((entry) => entry.origin);
    return entries.filter((entry) => entry.type === 'user' && entry.message).flatMap((entry) => eventsOf(entry, marked));
  }

  module.exports = { RetroError, SLASH_COMMAND, readEntries, textOf, tokensOf, shorten, clock, callLabel, isToolResultEntry, isCompactEntry, humanEvents };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Die Zeile `const mcpUsage = require('./mcp-usage.js');` wird zu:
  ```js
  const mcpUsage = require('./mcp-usage.js');
  const { RetroError: FactsError, SLASH_COMMAND, readEntries, textOf, tokensOf, clock, callLabel, isCompactEntry, humanEvents } = require('./lib/transcript');
  ```
  (b) Die Zeilen `const NOTICE = …;`, `const SLASH_COMMAND = …;` und `class FactsError extends Error {}` entfallen ersatzlos, ebenso die Funktionen `readEntries`, `textOf`, `tokensOf`, `callLabel` (samt Kommentar „Kurzform eines Aufrufs …“) und `isHumanTurn` (samt Kommentar „Ein Slash-Befehl ist …“). `shortError` und `commandHead` bleiben.
  (c) In `analyze` wird die Zeile, die mit `if (entry.type === 'system' && /compact/i.test(` beginnt und `facts.compactions += 1;` zählt (heute Zeile 156), zu
  ```js
    if (isCompactEntry(entry)) facts.compactions += 1;
  ```
  und die Zeile `if (isHumanTurn(content)) facts.turns += 1;` entfällt; vor `return facts;` stehen neu:
  ```js
    facts.humans = humanEvents(entries);
    facts.turns = facts.humans.filter((event) => event.kind === 'Eingabe').length;
    return facts;
  ```
  (d) `render` wird ersetzt, dazu kommt `humanLines` direkt davor:
  ```js
  function humanLines(humans) {
    if (humans.length === 0) return ['- keine'];
    return humans.map((event) => `- #${event.entryNo} ${clock(event.time)} ${event.kind}: ${event.text}`);
  }

  function render(sessionFile, facts, agents, label = null) {
    const errorLines = errorLinesOf(facts);
    return [
      `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
      '',
      ...(label ? [`- ${label}`] : []),
      ...factLines(facts, agents),
      '',
      '## Subagents (nach Tokens)',
      '| Auftrag | Typ | Modell | Tokens gesamt | davon neu | Tools | Fehler | min |',
      '|---|---|---|---|---|---|---|---|',
      ...agents.map((agent) => `| ${agent.description} | ${agent.type} | ${agent.model} | ${thousands(agent.tokens)} | ${thousands(agent.fresh)} | ${agent.tools} | ${agent.errors} | ${agent.duration} |`),
      '',
      '## Eingaben des Menschen',
      ...humanLines(facts.humans),
      '',
      '## Tool-Fehler der Hauptsession',
      ...(errorLines.length > 0 ? errorLines : ['- keine']),
      '',
    ].join('\n');
  }
  ```
  In `plugins/forge/scripts/mcp-usage.js`:
  (a) Nach `const path = require('node:path');` einfügen:
  ```js
  const { readEntries } = require('./lib/transcript');
  ```
  (b) Die Funktion `readJsonl` entfällt ersatzlos.
  (c) In `loadSession` werden `const all = readJsonl(transcript);` zu `const all = readEntries(transcript);` und `const agentEntries = readJsonl(file);` zu `const agentEntries = readEntries(file);`.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/transcript.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/mcp-usage.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/transcript.js plugins/forge/scripts/session-facts.js plugins/forge/scripts/mcp-usage.js plugins/forge/tests/lib/retro-session.js plugins/forge/tests/transcript.test.js` · `git commit -m "feat(forge): session-facts counts only real human input and lists it"`

---

### Task 2: Ausschnitt mit Start und Schnitt, Protokolldatei vor Session

**ACs:** AC-03, AC-05, AC-24

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-range.js`
- Modify: `plugins/forge/scripts/session-facts.js:9-10` · `const USAGE`
- Modify: `plugins/forge/scripts/session-facts.js` · `const mcpUsage = require('./mcp-usage.js');` (Importzeilen)
- Modify: `plugins/forge/scripts/session-facts.js:106-139` · `invokes`, `firstTime`, `sliceByCommand`
- Modify: `plugins/forge/scripts/session-facts.js` · `render`
- Modify: `plugins/forge/scripts/session-facts.js:298-317` · `FLAGS`, `parseArgs`
- Modify: `plugins/forge/scripts/session-facts.js:343-362` · `run`
- Modify: `plugins/forge/scripts/session-facts.js:383` · `module.exports`
- Test: `plugins/forge/tests/retro-range.test.js`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_SinceCommand_CountsOnlyFromLastInvocation`, `cli_SinceCommandWithOccurrence_EndsBeforeNextInvocationAndKeepsSubagentsInWindow`, `cli_SinceCommand_UnknownCommandOrOccurrence_ExitsWithOne`

**Interfaces:**
- Consumes: aus Task 1 `RetroError`, `SLASH_COMMAND`, `textOf`, `clock`, `readEntries`, `isToolResultEntry`, `isCompactEntry`; Fixtures `human`, `slash`, `request`, `say`, `call`, `result`, `hint`, `writeSession`.
- Produces: `lib/retro-range.js`: `RETRO = 'prozess-retrospektive'`; `invokes(entry, name: string): boolean`; `indexesOf(entries, name: string): number[]` (Indizes im Array); `rangeOf(entries, { sinceCommand?: string, beforeRetro?: boolean }): { entries: object[], keepSubagent: (agentEntries) => boolean, labels: string[], cutTime: string|null }`; wirft `RetroError` mit `Unbekannter Befehl: <name> kommt in der Session nicht vor` oder `Leerer Bereich: kein Aufruf von <name> vor dem Schnitt` bzw. `… in der Session`; folgt dem letzten Aufruf der Retrospektive schon ein Aufruf von `retro-report.js … --session`, dessen Tool-Ergebnis kein Fehler ist und eine Zeile `Bericht: …` enthält, gilt sie als abgeschlossen (ein gescheiterter Lauf, etwa mit Verstößen und Exit 1, schließt sie nicht ab, der Schnitt bleibt): kein Schnitt, `cutTime` ist `null` und `labels` nennt `Schnitt: keiner, der letzte Aufruf von prozess-retrospektive (Eintrag <n> · <HH:MM>) hat seinen Bericht schon erzeugt`. Folgt dem geschnittenen Aufruf schon eine Modell-Anfrage, die nicht nur die Fakten neu holt (`session-facts.js`, Schritt 1 des Skills), und wurde kein Bericht erzeugt, hängt `labels` die Zeile `Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von prozess-retrospektive (Eintrag <n>); Arbeit danach fehlt` an; das Verhalten des Schnitts bleibt. · `session-facts.js`: Schalter `--before-retro`; `--occurrence` entfällt; `--file` zusammen mit `--session` ist erlaubt, ausgewertet wird `--file`. Exporte zusätzlich `parseArgs(args): object|null` und `resolveSession(options): { file: string, warning: string|null }`; `sliceByCommand` entfällt. `render(sessionFile, facts, agents, labels = [])`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-range.test.js` neu:
  ```js
  'use strict';

  process.env.TZ = 'UTC';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { readEntries } = require('../scripts/lib/transcript');
  const { rangeOf } = require('../scripts/lib/retro-range');
  const { human, slash, request, say, call, result, hint, stamp, writeSession } = require('./lib/retro-session');

  // Der Aufruf der Retrospektive in Eintrag 7 ist der laufende: Ihm folgt noch keine Modell-Anfrage.
  function session({ withRetro = true } = {}) {
    return readEntries(writeSession([
      hint('skill_listing', '10:00', { content: '- dv-forge:domain-modeling: Use when terms are fuzzy' }),
      human('Plane X', '10:00'),
      slash('dv-forge:plan-review', 'plan.md', '10:10'),
      request('r1', '10:11', [call('t1', 'Read', { file_path: 'plan.md' })]),
      slash('dv-forge:plan-review', 'plan.md', '10:20'),
      request('r2', '10:21', [call('t2', 'Grep', { pattern: 'x' })]),
      ...(withRetro ? [slash('dv-forge:prozess-retrospektive', '', '10:30')] : []),
      slash('dv-forge:spec-review', 'spec.md', '10:40'),
    ]));
  }

  function agentAt(at) {
    return [{ type: 'assistant', timestamp: stamp(at), message: { content: [] } }];
  }

  test('rangeOf_BeforeRetro_EndsBeforeLastRetroCallAndNamesCut', () => {
    const range = rangeOf(session(), { beforeRetro: true });

    assert.deepEqual(range.entries.map((entry) => entry.entryNo), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(range.labels, ['Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 7 · 10:30)']);
    assert.equal(range.cutTime, '2026-09-27T10:30:00Z');
  });

  test('rangeOf_BeforeRetroWithoutRetroCall_KeepsWholeSession', () => {
    const entries = session({ withRetro: false });

    const range = rangeOf(entries, { beforeRetro: true });

    assert.equal(range.entries.length, entries.length);
    assert.deepEqual(range.labels, []);
    assert.equal(range.cutTime, null);
  });

  test('rangeOf_LastRetroAlreadyWroteReport_KeepsWholeSessionAndNamesIt', () => {
    const entries = readEntries(writeSession([
      human('Plane X', '10:00'),
      slash('dv-forge:prozess-retrospektive', '', '10:30'),
      request('r1', '10:35', [call('t1', 'Bash', { command: 'node "/p/scripts/retro-report.js" --session s1 --topic planung' })]),
      result('t1', '10:36', 'Bericht: docs/wishes/2026-09-27-planung.md\nPrüfung: 0 Verstöße'),
      human('Weiter', '10:40'),
    ]));

    const range = rangeOf(entries, { beforeRetro: true });

    assert.equal(range.entries.length, entries.length);
    assert.deepEqual(range.labels, ['Schnitt: keiner, der letzte Aufruf von prozess-retrospektive (Eintrag 2 · 10:30) hat seinen Bericht schon erzeugt']);
    assert.equal(range.cutTime, null);
  });

  test('rangeOf_LastRetroReportFailed_StillCutsBeforeIt', () => {
    const entries = readEntries(writeSession([
      human('Plane X', '10:00'),
      slash('dv-forge:prozess-retrospektive', '', '10:30'),
      request('r1', '10:35', [call('t1', 'Bash', { command: 'node "/p/scripts/retro-report.js" --session s1 --topic planung' })]),
      result('t1', '10:36', 'Exit code 1\n- Reibung 1: *Kosten:* fehlt', true),
      human('Weiter', '10:40'),
    ]));

    const range = rangeOf(entries, { beforeRetro: true });

    assert.deepEqual(range.entries.map((entry) => entry.entryNo), [1]);
    assert.deepEqual(range.labels, [
      'Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 2 · 10:30)',
      'Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von prozess-retrospektive (Eintrag 2); Arbeit danach fehlt',
    ]);
  });

  test('rangeOf_OnlyFactsRerunAfterRetroCall_CutsWithoutWarning', () => {
    const entries = readEntries(writeSession([
      human('Plane X', '10:00'),
      slash('dv-forge:prozess-retrospektive', '--since-command plan-review', '10:30'),
      request('r1', '10:31', [say('Ich hole die Fakten neu')]),
      request('r1', '10:31', [call('t1', 'Bash', { command: 'node "/p/scripts/session-facts.js" --session s1 --before-retro --snapshot' })]),
    ]));

    const range = rangeOf(entries, { beforeRetro: true });

    assert.deepEqual(range.labels, ['Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 2 · 10:30)']);
  });

  test('rangeOf_SinceCommandTwiceWithCut_StartsAtLastCallBeforeCut', () => {
    const range = rangeOf(session(), { sinceCommand: 'plan-review', beforeRetro: true });

    assert.deepEqual(range.entries.map((entry) => entry.entryNo), [5, 6]);
    assert.deepEqual(range.labels, [
      'Start: letzter Aufruf von plan-review (Eintrag 5 · 10:20)',
      'Schnitt: vor dem letzten Aufruf von prozess-retrospektive (Eintrag 7 · 10:30)',
    ]);
  });

  test('rangeOf_SinceCommandWithoutCut_StartsAtLastCallAndRunsToEnd', () => {
    const range = rangeOf(session(), { sinceCommand: 'plan-review' });

    assert.deepEqual(range.entries.map((entry) => entry.entryNo), [5, 6, 7, 8]);
  });

  test('rangeOf_StartOnlyAfterCut_ReportsEmptyRange', () => {
    assert.throws(() => rangeOf(session(), { sinceCommand: 'spec-review', beforeRetro: true }), /Leerer Bereich: kein Aufruf von spec-review vor dem Schnitt/);
  });

  test('rangeOf_ListedButNeverCalled_ReportsEmptyRange', () => {
    assert.throws(() => rangeOf(session(), { sinceCommand: 'domain-modeling' }), /Leerer Bereich: kein Aufruf von domain-modeling in der Session/);
  });

  test('rangeOf_UnknownCommand_Reported', () => {
    assert.throws(() => rangeOf(session(), { sinceCommand: 'gibt-es-nicht' }), /Unbekannter Befehl: gibt-es-nicht kommt in der Session nicht vor/);
  });

  test('rangeOf_Subagents_KeptOnlyWhenStartedInsideRange', () => {
    const range = rangeOf(session(), { sinceCommand: 'plan-review', beforeRetro: true });

    const kept = ['10:15', '10:25', '10:35'].map((at) => range.keepSubagent(agentAt(at)));

    assert.deepEqual(kept, [false, true, false]);
  });

  test('rangeOf_NoBounds_KeepsEverySubagent', () => {
    const range = rangeOf(session(), {});

    assert.equal(range.keepSubagent([{ type: 'assistant', message: { content: [] } }]), true);
  });
  ```
  In `plugins/forge/tests/session-facts.test.js` werden die drei Tests `cli_SinceCommand_CountsOnlyFromLastInvocation`, `cli_SinceCommandWithOccurrence_EndsBeforeNextInvocationAndKeepsSubagentsInWindow` und `cli_SinceCommand_UnknownCommandOrOccurrence_ExitsWithOne` ersetzt durch:
  ```js
  test('cli_SinceCommand_CountsOnlyFromLastInvocation', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'prozess-retrospektive'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- Start: letzter Aufruf von prozess-retrospektive \(Eintrag 6 · 11:10\)/);
    assert.match(result.stdout, /- Tool-Aufrufe: Skill 1, Read 1\n/);
    assert.match(result.stdout, /Tokens Subagents: 0k in 0 Agents/);
  });

  test('cli_BeforeRetro_CutsBeforeLastRetroCallAndKeepsEarlierSubagents', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--before-retro'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- Schnitt: vor dem letzten Aufruf von prozess-retrospektive \(Eintrag 6 · 11:10\)/);
    assert.match(result.stdout, /- Tool-Aufrufe: Bash 1, Write 1\n/);
    assert.match(result.stdout, /Tokens Subagents: 0k in 2 Agents/);
  });

  test('cli_BeforeRetroWithoutRetroCall_KeepsWholeSession', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', session(), '--before-retro'], { encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /Schnitt:/);
    assert.match(result.stdout, /- Eingaben des Menschen: 2 · /);
  });

  test('cli_SinceCommandAndBeforeRetro_CountsOnlyBetweenBothBounds', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'prozess-retrospektive', '--before-retro'], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /- Start: letzter Aufruf von prozess-retrospektive \(Eintrag 3 · 11:00\)\n- Schnitt: /);
    assert.match(result.stdout, /- Tool-Aufrufe: Write 1\n/);
    assert.match(result.stdout, /Tokens Subagents: 0k in 1 Agents/);
  });

  test('cli_SinceCommandUnknown_ExitsWithOneAndNamesCommand', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', commandSession(), '--since-command', 'gibt-es-nicht'], { encoding: 'utf8' });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unbekannter Befehl: gibt-es-nicht/);
  });

  test('cli_FileAndSession_EvaluatesFile', () => {
    const project = projectWith([['eigene', 0]]);

    const result = runIn(project, ['--file', session(), '--session', 'eigene']);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /# Session-Fakten: s1/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-range.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `rangeOf_BeforeRetro_EndsBeforeLastRetroCallAndNamesCut` und FAIL `cli_FileAndSession_EvaluatesFile`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-range.js` neu:
  ```js
  'use strict';

  // Grenzen des ausgewerteten Bereichs: Start ab dem letzten Aufruf eines Befehls, Schnitt vor dem letzten Aufruf der Retrospektive.

  const { RetroError, SLASH_COMMAND, textOf, clock, isToolResultEntry } = require('./transcript');

  const RETRO = 'prozess-retrospektive';

  function sameCommand(value, wanted) {
    const called = String(value ?? '').replace(/^\//, '');
    const target = wanted.replace(/^\//, '');
    return called === target || called.endsWith(`:${target}`);
  }

  // Aufruf per Slash-Befehl des Menschen oder per Skill-Tool des Modells.
  function invokes(entry, name) {
    const content = entry.message?.content;
    if (entry.type === 'user') return sameCommand(textOf(content).match(SLASH_COMMAND)?.[1], name);
    if (entry.type !== 'assistant' || !Array.isArray(content)) return false;
    return content.some((part) => part.type === 'tool_use' && part.name === 'Skill' && sameCommand(part.input?.skill, name));
  }

  function indexesOf(entries, name) {
    return entries.flatMap((entry, index) => (invokes(entry, name) ? [index] : []));
  }

  // Eine Zeile der Skill-Liste lautet `- <plugin>:<skill>: <Beschreibung>`; der Name reicht bis zum Doppelpunkt vor dem Leerzeichen.
  const LISTED_SKILL = /^- (\S+?):\s/gm;

  function listedSkills(entries) {
    return entries.filter((entry) => entry.attachment?.type === 'skill_listing')
      .flatMap((entry) => [...String(entry.attachment.content ?? '').matchAll(LISTED_SKILL)].map((match) => match[1]));
  }

  function firstTime(entries, from) {
    for (let index = from; index < entries.length; index += 1) {
      if (entries[index].timestamp) return entries[index].timestamp;
    }
    return null;
  }

  function mark(entries, index) {
    return `Eintrag ${entries[index].entryNo} · ${clock(firstTime(entries, index))}`;
  }

  // Ein Befehl, der weder aufgerufen wurde noch in der Skill-Liste steht, gilt als unbekannt.
  function startOf(entries, name, end, cut) {
    const calls = indexesOf(entries, name);
    if (calls.length === 0 && !listedSkills(entries).some((skill) => sameCommand(skill, name))) {
      throw new RetroError(`Unbekannter Befehl: ${name} kommt in der Session nicht vor`);
    }
    const before = calls.filter((index) => index < end);
    if (before.length === 0) throw new RetroError(`Leerer Bereich: kein Aufruf von ${name} ${cut ? 'vor dem Schnitt' : 'in der Session'}`);
    return before[before.length - 1];
  }

  function subagentFilter(entries, start, cutTime, bounded) {
    if (!bounded) return () => true;
    const from = Date.parse(firstTime(entries, start) ?? '') || -Infinity;
    const to = cutTime ? Date.parse(cutTime) : Infinity;
    return (agentEntries) => {
      const begin = Date.parse(firstTime(agentEntries, 0) ?? '');
      return !Number.isNaN(begin) && begin >= from && begin < to;
    };
  }

  const REPORT_RUN = /retro-report\.js\S*\s(?:.*\s)?--session\b/;
  const REPORT_WRITTEN = /^Bericht: /m;

  function reportCallIds(entry) {
    const content = entry.message?.content;
    if (entry.type !== 'assistant' || !Array.isArray(content)) return [];
    return content.filter((part) => part.type === 'tool_use' && REPORT_RUN.test(String(part.input?.command ?? ''))).map((part) => part.id);
  }

  // Erst das Ergebnis belegt den Bericht: kein Fehler und eine Zeile `Bericht: …`; ein Lauf mit Verstößen endet mit Exit 1.
  function reportWritten(entry, ids) {
    if (!isToolResultEntry(entry)) return false;
    return entry.message.content.some((part) => part.type === 'tool_result' && ids.has(part.tool_use_id)
      && !part.is_error && REPORT_WRITTEN.test(textOf(part.content)));
  }

  // Hat eine Retrospektive ihren Bericht schon erzeugt, ist sie abgeschlossen: Der Aufruf der laufenden steht dann
  // noch nicht im Protokoll, und ein Schnitt dort nähme nur die Arbeit bis zur früheren Retrospektive.
  // Ungemessen ist, ob Claude Code den Slash-Befehl der laufenden Retrospektive schon vor ihren `!`-Befehlen ins Protokoll
  // schreibt. Steht er noch nicht dort und brach die frühere vor ihrem Bericht ab, schneidet `rangeOf` vor der früheren;
  // `workAfter` macht diesen Fall mit einer Warnung sichtbar, statt ihn still zu verlieren.
  function finished(entries, index) {
    const later = entries.slice(index + 1);
    const ids = new Set(later.flatMap(reportCallIds));
    return ids.size > 0 && later.some((entry) => reportWritten(entry, ids));
  }

  const FACTS_RUN = /session-facts\.js/;

  function isFactsRun(entry) {
    const content = entry.message?.content;
    return Array.isArray(content) && content.some((part) => part.type === 'tool_use' && FACTS_RUN.test(String(part.input?.command ?? '')));
  }

  // Modell-Anfragen nach dem Aufruf; die Anfrage, die nur die Fakten neu holt (Schritt 1 des Skills), zählt nicht.
  // Der laufenden Retrospektive folgt beim Lauf ihrer `!`-Befehle noch keine Anfrage.
  function workAfter(entries, index) {
    const later = entries.slice(index + 1).filter((entry) => entry.type === 'assistant');
    const reruns = new Set(later.filter(isFactsRun).map((entry) => entry.requestId));
    return later.some((entry) => !reruns.has(entry.requestId));
  }

  function rangeOf(entries, { sinceCommand, beforeRetro } = {}) {
    const retroCalls = beforeRetro ? indexesOf(entries, RETRO) : [];
    const last = retroCalls.length > 0 ? retroCalls[retroCalls.length - 1] : null;
    const done = last !== null && finished(entries, last);
    const cut = last !== null && !done;
    const aborted = cut && workAfter(entries, last);
    const end = cut ? last : entries.length;
    const start = sinceCommand ? startOf(entries, sinceCommand, end, cut) : 0;
    const cutTime = cut ? firstTime(entries, end) : null;
    const labels = [
      ...(sinceCommand ? [`Start: letzter Aufruf von ${sinceCommand} (${mark(entries, start)})`] : []),
      ...(cut ? [`Schnitt: vor dem letzten Aufruf von ${RETRO} (${mark(entries, end)})`] : []),
      ...(done ? [`Schnitt: keiner, der letzte Aufruf von ${RETRO} (${mark(entries, last)}) hat seinen Bericht schon erzeugt`] : []),
      ...(aborted ? [`Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von ${RETRO} (Eintrag ${entries[last].entryNo}); Arbeit danach fehlt`] : []),
    ];
    const keepSubagent = subagentFilter(entries, start, cutTime, Boolean(sinceCommand) || cut);
    return { entries: entries.slice(start, end), keepSubagent, labels, cutTime };
  }

  module.exports = { RETRO, invokes, indexesOf, rangeOf };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) `USAGE` wird zu:
  ```js
  const USAGE = 'Aufruf: node session-facts.js [--file <session.jsonl>] [--session <id>] [--cwd <projektordner>] [--expect <mcp-server,...>]'
    + ' [--since-command <name>] [--before-retro] [--skeleton <bericht.md>]\n';
  ```
  (b) Die Importzeilen werden zu:
  ```js
  const mcpUsage = require('./mcp-usage.js');
  const { RetroError: FactsError, readEntries, textOf, tokensOf, clock, callLabel, isCompactEntry, humanEvents } = require('./lib/transcript');
  const { rangeOf } = require('./lib/retro-range');
  ```
  (c) Die Funktionen `invokes`, `firstTime` und `sliceByCommand` (samt Kommentar „Ausschnitt vom n-ten Aufruf …“) entfallen.
  (d) `render` bekommt statt `label = null` den Parameter `labels = []`; die Zeile `...(label ? [`- ${label}`] : []),` wird zu:
  ```js
      ...labels.map((label) => `- ${label}`),
  ```
  (e) `FLAGS` und `parseArgs` werden ersetzt durch:
  ```js
  const FLAGS = {
    '--file': 'file', '--session': 'session', '--cwd': 'cwd', '--expect': 'expect',
    '--since-command': 'sinceCommand', '--skeleton': 'skeleton',
  };
  const SWITCHES = { '--before-retro': 'beforeRetro' };

  // `--file` und `--session` dürfen zusammen stehen: ausgewertet wird die Datei, die Session benennt Snapshot und Entwurf.
  function parseArgs(args) {
    const options = {};
    for (let index = 0; index < args.length; index += 1) {
      const flag = args[index];
      if (SWITCHES[flag]) {
        options[SWITCHES[flag]] = true;
        continue;
      }
      const key = FLAGS[flag];
      if (!key || args[index + 1] === undefined) return null;
      options[key] = args[index + 1];
      index += 1;
    }
    if (options.expect) options.expect = options.expect.split(',').map((name) => name.trim()).filter(Boolean);
    return options;
  }
  ```
  (f) `run` wird ersetzt durch:
  ```js
  function run(options) {
    const { file, warning } = resolveSession(options);
    if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
    const range = rangeOf(readEntries(file), options);
    const session = mcpUsage.loadSession(file, { entries: range.entries, keepSubagent: range.keepSubagent });
    if (options.cwd) session.cwd = options.cwd;
    const facts = analyze(range.entries);
    const agents = subagentRows(file, range.keepSubagent);
    const mcp = mcpUsage.render(session, { expect: options.expect, transcript: file });
    const allFacts = [facts, ...agents.map((agent) => agent.facts)];
    let output = `${render(file, facts, agents, range.labels)}\n${savings(allFacts)}\n${mcp}`;
    if (options.skeleton) {
      const written = writeSkeleton(options.skeleton, skeleton({ facts, agents, mcp, lists: savingsLists(allFacts) }));
      output += `\nGerüst geschrieben: ${written}\n`;
    }
    return { output, warning };
  }
  ```
  (g) `module.exports` wird zu:
  ```js
  module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, run, parseArgs, resolveSession };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-range.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/transcript.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-range.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-range.test.js plugins/forge/tests/session-facts.test.js` · `git commit -m "feat(forge): session-facts cuts before the retrospective and starts at the last command"`

---

### Task 3: Fehlerverzeihender Modus

**ACs:** AC-04

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `const USAGE`
- Modify: `plugins/forge/scripts/session-facts.js` · `const SWITCHES`
- Modify: `plugins/forge/scripts/session-facts.js:364-379` · `main`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_UnknownSession_ExitsWithOne`

**Interfaces:**
- Consumes: aus Task 2 `SWITCHES`, `parseArgs`, `run`.
- Produces: Schalter `--lenient`; jeder Fehler im Lauf ergibt auf stdout `Fakten nicht verfügbar: <Grund>` und Exit-Code 0.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/session-facts.test.js` direkt nach `cli_UnknownSession_ExitsWithOne` einfügen:
  ```js
  test('cli_LenientAndUnknownSession_ReportsReasonAndExitsWithZero', () => {
    const result = runIn(projectWith([['eigene', 0]]), ['--session', 'gibt-es-nicht', '--lenient']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /^Fakten nicht verfügbar: Session gibt-es-nicht nicht gefunden/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_LenientAndUnknownSession_ReportsReasonAndExitsWithZero`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/session-facts.js`:
  (a) `USAGE` wird zu:
  ```js
  const USAGE = 'Aufruf: node session-facts.js [--file <session.jsonl>] [--session <id>] [--cwd <projektordner>] [--expect <mcp-server,...>]'
    + ' [--since-command <name>] [--before-retro] [--lenient] [--skeleton <bericht.md>]\n';
  ```
  (b) `SWITCHES` wird zu:
  ```js
  const SWITCHES = { '--before-retro': 'beforeRetro', '--lenient': 'lenient' };
  ```
  (c) `main` wird ersetzt durch:
  ```js
  // Im fehlerverzeihenden Modus endet jeder Fehler mit einer Meldung auf stdout und Exit-Code 0, damit der
  // Skill, der die Fakten beim Laden einbettet, trotzdem lädt.
  function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    try {
      const { output, warning } = run(options);
      if (warning) process.stderr.write(`${warning}\n`);
      process.stdout.write(output);
    } catch (error) {
      if (options.lenient) {
        process.stdout.write(`Fakten nicht verfügbar: ${error.message}\n`);
        return;
      }
      if (!(error instanceof FactsError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/session-facts.js plugins/forge/tests/session-facts.test.js` · `git commit -m "feat(forge): session-facts lenient mode reports missing facts without failing"`

---

### Task 4: Aktive Zeit, Warten und Harness-Hinweise

**ACs:** AC-09

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-measures.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { rangeOf } = require('./lib/retro-range');`
- Modify: `plugins/forge/scripts/session-facts.js` · `analyze`
- Modify: `plugins/forge/scripts/session-facts.js:264-277` · `factLines`
- Test: `plugins/forge/tests/retro-measures.test.js`

**Interfaces:**
- Consumes: aus Task 1 `humanEvents`, `textOf`, `isToolResultEntry`; Fixtures.
- Produces: `lib/retro-measures.js`: `timeProfile(entries): { active: number, waiting: number, silence: number, silenceFrom: number|null }` (Minuten, `silenceFrom` = Eintragsnummer); `harnessHints(entries): [kind: string, count: number][]` (absteigend nach Zahl, dann alphabetisch). `analyze` liefert zusätzlich `time` und `hints`; `factLines` hat die Zeilen `- Zeit: …` und `- Harness-Hinweise: …`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-measures.test.js` neu:
  ```js
  'use strict';

  process.env.TZ = 'UTC';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { readEntries } = require('../scripts/lib/transcript');
  const measures = require('../scripts/lib/retro-measures');
  const { human, request, say, call, result, hint, stamp, writeSession } = require('./lib/retro-session');

  const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

  function facts(file) {
    return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
  }

  function timedSession() {
    return writeSession([
      human('Los', '10:00'),
      hint('total_tokens_reminder', '10:00'),
      request('r1', '10:01', [say('Ich schaue nach')]),
      request('r2', '10:05', [call('t1', 'Bash', { command: 'npm test' })]),
      result('t1', '10:06', 'ok'),
      hint('total_tokens_reminder', '10:06'),
      request('r3', '10:13', [say('Fertig')]),
      { type: 'user', timestamp: stamp('10:13'), message: { role: 'user', content: '<system-reminder>Plan-Modus</system-reminder>' } },
      hint('hook_additional_context', '10:29'),
      human('Weiter', '10:30'),
      request('r4', '10:31', [say('Ok')]),
    ]);
  }

  test('timeProfile_WaitBeforeInput_SplitsActiveAndWaitingMinutes', () => {
    const profile = measures.timeProfile(readEntries(timedSession()));

    assert.deepEqual(profile, { active: 14, waiting: 17, silence: 12, silenceFrom: 3 });
  });

  test('harnessHints_AttachmentsAndNotices_CountedByKind', () => {
    const hints = measures.harnessHints(readEntries(timedSession()));

    assert.deepEqual(hints, [['total_tokens_reminder', 2], ['hook_additional_context', 1], ['system-reminder', 1]]);
  });

  test('cli_TimedSession_NamesActiveWaitingSilenceAndHints', () => {
    const output = facts(timedSession());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /- Zeit: aktiv 14 min · Warten auf den Menschen 17 min · längste Strecke ohne Text an den Menschen 12 min \(ab Eintrag 3\)\n/);
    assert.match(output.stdout, /- Harness-Hinweise: total_tokens_reminder 2, hook_additional_context 1, system-reminder 1\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js` — erwartet: FAIL `timeProfile_WaitBeforeInput_SplitsActiveAndWaitingMinutes`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-measures.js` neu:
  ```js
  'use strict';

  // Messwerte über die Einträge der Hauptsession: Zeit, Harness-Hinweise, Kontext und Tool-Läufe.

  const { humanEvents, textOf, isToolResultEntry } = require('./transcript');

  const MINUTE_MS = 60000;
  const NOTICE_TAG = /^\s*<([a-z-]+)>/;

  function timeOf(entry) {
    return entry.timestamp ? Date.parse(entry.timestamp) : null;
  }

  function minutes(ms) {
    return Math.round(ms / MINUTE_MS);
  }

  function hasText(entry) {
    const content = entry.message?.content;
    return Array.isArray(content) && content.some((part) => part.type === 'text' && part.text.trim() !== '');
  }

  function isWork(entry) {
    return entry.type === 'assistant' || isToolResultEntry(entry);
  }

  // Warten = Zeit vom letzten Arbeitsschritt (Anfrage oder Tool-Ergebnis) bis zur nächsten Eingabe des Menschen; aktiv = Rest.
  // Die Stille läuft von einer Eingabe oder einem Text an den Menschen bis zum nächsten Text; eine Eingabe beginnt sie neu.
  function timeProfile(entries) {
    const inputs = new Set(humanEvents(entries).filter((event) => event.kind === 'Eingabe').map((event) => event.entryNo));
    const timed = entries.filter((entry) => timeOf(entry) !== null);
    let waiting = 0;
    let lastWork = null;
    let since = null;
    let silence = { ms: 0, from: null };
    for (const entry of timed) {
      const time = timeOf(entry);
      if (inputs.has(entry.entryNo)) {
        waiting += lastWork === null ? 0 : Math.max(0, time - lastWork);
        since = { time, entryNo: entry.entryNo };
      }
      if (entry.type === 'assistant' && hasText(entry) && since) {
        if (time - since.time > silence.ms) silence = { ms: time - since.time, from: since.entryNo };
        since = { time, entryNo: entry.entryNo };
      }
      if (isWork(entry)) lastWork = time;
    }
    const total = timed.length > 1 ? timeOf(timed[timed.length - 1]) - timeOf(timed[0]) : 0;
    return { active: minutes(total - waiting), waiting: minutes(waiting), silence: minutes(silence.ms), silenceFrom: silence.from };
  }

  function noticeTag(entry, human) {
    if (entry.type !== 'user' || !entry.message || human.has(entry.entryNo) || entry.isMeta || isToolResultEntry(entry)) return null;
    return textOf(entry.message.content).match(NOTICE_TAG)?.[1] ?? null;
  }

  // Eingeblendete Hinweise des Harness nach Art: Anhänge und Hinweis-Nachrichten, die nicht vom Menschen stammen.
  function harnessHints(entries) {
    const human = new Set(humanEvents(entries).map((event) => event.entryNo));
    const counts = new Map();
    for (const entry of entries) {
      const kind = entry.type === 'attachment' ? entry.attachment?.type : noticeTag(entry, human);
      if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }

  module.exports = { timeOf, minutes, timeProfile, harnessHints };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Nach `const { rangeOf } = require('./lib/retro-range');` einfügen:
  ```js
  const { timeProfile, harnessHints } = require('./lib/retro-measures');
  ```
  (b) In `analyze` stehen vor `return facts;` jetzt:
  ```js
    facts.humans = humanEvents(entries);
    facts.turns = facts.humans.filter((event) => event.kind === 'Eingabe').length;
    facts.time = timeProfile(entries);
    facts.hints = harnessHints(entries);
    return facts;
  ```
  (c) `factLines` wird ersetzt durch:
  ```js
  function timeLine(time) {
    const from = time.silenceFrom ? ` (ab Eintrag ${time.silenceFrom})` : '';
    return `- Zeit: aktiv ${time.active} min · Warten auf den Menschen ${time.waiting} min · längste Strecke ohne Text an den Menschen ${time.silence} min${from}`;
  }

  function factLines(facts, agents) {
    const tools = [...facts.tools.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', ') || '-';
    const skills = [...facts.skills.entries()].map(([name, count]) => `${name} ${count}`).join(', ') || '-';
    const agentTokens = agents.reduce((sum, agent) => sum + agent.tokens, 0);
    return [
      `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
      `- Eingaben des Menschen: ${facts.turns} · API-Anfragen: ${facts.requests} · Zusammenfassungen: ${facts.compactions}`,
      `- Tokens Hauptsession: ${thousands(facts.input)} neu gelesen, ${thousands(facts.cached)} aus dem Cache, ${thousands(facts.output)} Ausgabe`,
      `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
      `- Tool-Aufrufe: ${tools}`,
      `- Skills: ${skills}`,
      `- Tool-Fehler: ${errorLinesOf(facts).length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
      timeLine(facts.time),
      `- Harness-Hinweise: ${facts.hints.map(([kind, count]) => `${kind} ${count}`).join(', ') || 'keine'}`,
    ];
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-measures.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-measures.test.js` · `git commit -m "feat(forge): session-facts measures active and waiting time and harness hints"`

---

### Task 5: Kontext je Anfrage, Grundlast und Cache-Neuaufbau

**ACs:** AC-02, AC-10

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-requests.js`
- Modify: `plugins/forge/scripts/lib/retro-measures.js` · `const { humanEvents, textOf, isToolResultEntry }`, `module.exports`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { RetroError: FactsError` (neue Importzeile danach)
- Modify: `plugins/forge/scripts/session-facts.js` · `const { timeProfile, harnessHints }`
- Modify: `plugins/forge/scripts/session-facts.js` · `analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `factLines`
- Test: `plugins/forge/tests/retro-measures.test.js` · `cli_TimedSession_NamesActiveWaitingSilenceAndHints`

**Interfaces:**
- Consumes: aus Task 1 `tokensOf`; aus Task 4 `minutes`, `timeOf`.
- Produces: `lib/retro-requests.js` (Modell-Anfragen und ihr Kontext, eine Verantwortung; `tokensOf` bleibt in `lib/transcript.js`, weil `analyze` es schon nutzt): `contextOf(usage): number` (neu + Cache-Schreiben + Cache-Lesen); `requestsOf(entries): { entryNo: number, time: string|null, usage: object }[]` (eine je `requestId`). · `lib/retro-measures.js`: `requestContext(requests): { average: number, largest: number }|null`; `firstRequest(entries, requests): { context: number, attachments: { name: string, tokens: number }[] }|null`; `cacheRebuilds(requests): { time: string|null, pause: number, created: number }[]`. · `analyze` liefert zusätzlich `context`, `baseline`, `rebuilds`; `factLines` hat die Zeilen `- Kontext je Anfrage: …`, `- Grundlast erste Anfrage: …`, `- Cache-Neuaufbauten: …`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/retro-measures.test.js` die Importzeile der Fixtures ersetzen und am Dateiende anhängen:
  ```js
  const { human, request, say, call, result, hint, stamp, skillText, usage, writeSession } = require('./lib/retro-session');
  const { requestsOf } = require('../scripts/lib/retro-requests');
  ```
  ```js
  function contextSession() {
    return writeSession([
      hint('prompt_snapshot', '10:00', { systemPrompt: ['x'.repeat(8000)] }),
      hint('skill_listing', '10:00', { content: 'y'.repeat(4000) }),
      skillText('z'.repeat(400), '10:00'),
      hint('date', '10:00', { date: '2026-09-27' }),
      human('Los', '10:00'),
      request('r1', '10:00', [say('a')], usage(5, 30000, 0)),
      request('r2', '10:02', [say('b')], usage(5, 1000, 30000)),
      request('r3', '10:40', [say('c')], usage(5, 31000, 0)),
      request('r4', '10:41', [say('d')], usage(5, 500, 31000)),
    ]);
  }

  test('requestContext_FourRequests_AverageAndLargest', () => {
    const context = measures.requestContext(requestsOf(readEntries(contextSession())));

    assert.deepEqual(context, { average: 30880, largest: 31505 });
  });

  test('firstRequest_AttachmentsBefore_ThreeLargestNamed', () => {
    const entries = readEntries(contextSession());

    const baseline = measures.firstRequest(entries, requestsOf(entries));

    assert.equal(baseline.context, 30005);
    assert.deepEqual(baseline.attachments.map((attachment) => attachment.name), ['prompt_snapshot', 'skill_listing', 'Skill-Text']);
  });

  test('cacheRebuilds_BigWriteAfterPauseWithLittleCacheRead_Listed', () => {
    const rebuilds = measures.cacheRebuilds(requestsOf(readEntries(contextSession())));

    assert.deepEqual(rebuilds, [{ time: stamp('10:40'), pause: 38, created: 31000 }]);
  });

  test('cacheRebuilds_BigWriteButCacheReadHalfOrMore_NotListed', () => {
    const entries = readEntries(writeSession([
      request('r1', '10:00', [], usage(5, 30000, 0)),
      request('r2', '10:30', [], usage(5, 25000, 16000)),
      request('r3', '10:31', [], usage(5, 10000, 0)),
    ]));

    assert.deepEqual(measures.cacheRebuilds(requestsOf(entries)), []);
  });

  test('cli_ContextSession_NamesContextBaselineAndRebuild', () => {
    const output = facts(contextSession());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /- Kontext je Anfrage: Ø 31k, größte 32k\n/);
    assert.match(output.stdout, /- Grundlast erste Anfrage: 30k Kontext · größte Anhänge davor: prompt_snapshot 2k, skill_listing 1k, Skill-Text 0k\n/);
    assert.match(output.stdout, /- Cache-Neuaufbauten: 10:40 nach 38 min Pause \(31k neu\)\n/);
  });

  test('cli_NoRebuild_SaysNone', () => {
    const output = facts(timedSession());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /- Cache-Neuaufbauten: keiner\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js` — erwartet: FAIL `requestContext_FourRequests_AverageAndLargest`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-requests.js` neu:
  ```js
  'use strict';

  // Modell-Anfragen eines Protokolls und die Größe ihres Kontexts.

  const { tokensOf } = require('./transcript');

  function contextOf(usage = {}) {
    const { input, cached } = tokensOf(usage);
    return input + cached;
  }

  // Eine Modell-Anfrage je requestId; ihre Teile stehen als mehrere assistant-Einträge im Protokoll.
  function requestsOf(entries) {
    const seen = new Set();
    return entries.flatMap((entry) => {
      if (entry.type !== 'assistant' || !entry.message) return [];
      const id = entry.requestId ?? entry.uuid ?? `eintrag-${entry.entryNo}`;
      if (seen.has(id)) return [];
      seen.add(id);
      return [{ entryNo: entry.entryNo, time: entry.timestamp ?? null, usage: entry.message.usage ?? {} }];
    });
  }

  module.exports = { contextOf, requestsOf };
  ```
  In `plugins/forge/scripts/lib/retro-measures.js`: nach der Importzeile `const { humanEvents, textOf, isToolResultEntry } = require('./transcript');` einfügen, vor `module.exports` einfügen und `module.exports` ersetzen:
  ```js
  const { contextOf } = require('./retro-requests');
  ```
  ```js
  const REBUILD_MIN_CREATED = 20000;
  const CHARS_PER_TOKEN = 4;
  const TOP_ATTACHMENTS = 3;

  function requestContext(requests) {
    if (requests.length === 0) return null;
    const sizes = requests.map((request) => contextOf(request.usage));
    return { average: sizes.reduce((sum, size) => sum + size, 0) / sizes.length, largest: Math.max(...sizes) };
  }

  function attachmentOf(entry) {
    const body = entry.attachment ?? entry.message?.content ?? '';
    return { name: entry.attachment?.type ?? 'Skill-Text', tokens: Math.round(JSON.stringify(body).length / CHARS_PER_TOKEN) };
  }

  // Kontext der ersten Anfrage und die größten Anhänge davor: Harness-Anhänge und eingeblendete Skill-Texte.
  function firstRequest(entries, requests) {
    if (requests.length === 0) return null;
    const [first] = requests;
    const attachments = entries.filter((entry) => entry.entryNo < first.entryNo && (entry.type === 'attachment' || entry.isMeta))
      .map(attachmentOf).sort((a, b) => b.tokens - a.tokens).slice(0, TOP_ATTACHMENTS);
    return { context: contextOf(first.usage), attachments };
  }

  function pauseBetween(previous, request) {
    return request.time && previous.time ? minutes(Date.parse(request.time) - Date.parse(previous.time)) : 0;
  }

  // Neuaufbau: mindestens 20k Tokens neu in den Cache geschrieben und weniger als die Hälfte des vorigen Kontexts aus dem Cache gelesen.
  function cacheRebuilds(requests) {
    return requests.slice(1).flatMap((request, index) => {
      const previous = requests[index];
      const created = request.usage.cache_creation_input_tokens ?? 0;
      const read = request.usage.cache_read_input_tokens ?? 0;
      if (created < REBUILD_MIN_CREATED || read >= contextOf(previous.usage) / 2) return [];
      return [{ time: request.time, pause: pauseBetween(previous, request), created }];
    });
  }
  ```
  ```js
  module.exports = { timeOf, minutes, timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Nach der Importzeile aus `./lib/transcript` kommt die erste Zeile dazu, die Importzeile aus `./lib/retro-measures` wird zur zweiten:
  ```js
  const { requestsOf } = require('./lib/retro-requests');
  ```
  ```js
  const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds } = require('./lib/retro-measures');
  ```
  (b) In `analyze` stehen vor `return facts;` jetzt:
  ```js
    facts.humans = humanEvents(entries);
    facts.turns = facts.humans.filter((event) => event.kind === 'Eingabe').length;
    facts.time = timeProfile(entries);
    facts.hints = harnessHints(entries);
    const requests = requestsOf(entries);
    facts.context = requestContext(requests);
    facts.baseline = firstRequest(entries, requests);
    facts.rebuilds = cacheRebuilds(requests);
    return facts;
  ```
  (c) Vor `factLines` einfügen und `factLines` ersetzen:
  ```js
  function contextLine(context) {
    return `- Kontext je Anfrage: ${context ? `Ø ${thousands(context.average)}, größte ${thousands(context.largest)}` : 'keine Anfrage'}`;
  }

  function baselineLine(baseline) {
    if (!baseline) return '- Grundlast erste Anfrage: keine Anfrage';
    const attachments = baseline.attachments.map((attachment) => `${attachment.name} ${thousands(attachment.tokens)}`).join(', ') || 'keine';
    return `- Grundlast erste Anfrage: ${thousands(baseline.context)} Kontext · größte Anhänge davor: ${attachments}`;
  }

  function rebuildLine(rebuilds) {
    const listed = rebuilds.map((rebuild) => `${clock(rebuild.time)} nach ${rebuild.pause} min Pause (${thousands(rebuild.created)} neu)`);
    return `- Cache-Neuaufbauten: ${listed.join(', ') || 'keiner'}`;
  }

  function factLines(facts, agents) {
    const tools = [...facts.tools.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} ${count}`).join(', ') || '-';
    const skills = [...facts.skills.entries()].map(([name, count]) => `${name} ${count}`).join(', ') || '-';
    const agentTokens = agents.reduce((sum, agent) => sum + agent.tokens, 0);
    return [
      `- Dauer: ${minutes(facts.first, facts.last)} min · Modelle: ${[...facts.models].join(', ') || '?'}`,
      `- Eingaben des Menschen: ${facts.turns} · API-Anfragen: ${facts.requests} · Zusammenfassungen: ${facts.compactions}`,
      `- Tokens Hauptsession: ${thousands(facts.input)} neu gelesen, ${thousands(facts.cached)} aus dem Cache, ${thousands(facts.output)} Ausgabe`,
      `- Tokens Subagents: ${thousands(agentTokens)} in ${agents.length} Agents`,
      `- Tool-Aufrufe: ${tools}`,
      `- Skills: ${skills}`,
      `- Tool-Fehler: ${errorLinesOf(facts).length}, davon blockiert oder verweigert: ${facts.denials} · direkt wiederholte gleiche Aufrufe: ${facts.repeats}`,
      timeLine(facts.time),
      `- Harness-Hinweise: ${facts.hints.map(([kind, count]) => `${kind} ${count}`).join(', ') || 'keine'}`,
      contextLine(facts.context),
      baselineLine(facts.baseline),
      rebuildLine(facts.rebuilds),
    ];
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/transcript.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-requests.js plugins/forge/scripts/lib/retro-measures.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-measures.test.js` · `git commit -m "feat(forge): session-facts shows context per request, baseline and cache rebuilds"`

---

### Task 6: Größte Kontextlasten

**ACs:** AC-11

**Dateien:**
- Modify: `plugins/forge/scripts/lib/retro-measures.js` · `const { humanEvents, textOf, isToolResultEntry }`, `module.exports`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds }`
- Modify: `plugins/forge/scripts/session-facts.js` · `analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `render`
- Test: `plugins/forge/tests/retro-measures.test.js` · `cli_NoRebuild_SaysNone`

**Interfaces:**
- Consumes: aus Task 1 `callLabel`, `SLASH_COMMAND`, `textOf`; aus Task 5 `requestsOf` (`lib/retro-requests.js`).
- Produces: `lib/retro-measures.js`: `contextLoads(entries, requests): { entryNo: number, tokens: number, label: string, following: number, load: number }[]` (höchstens 5, ab 1000 Tokens, absteigend nach `load`). `session-facts.js`: `measureLines(facts): string[]` (jeder Block endet mit `''`), in `render` nach `factLines`; `analyze` liefert zusätzlich `loads`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/retro-measures.test.js` am Dateiende anhängen:
  ```js
  function loadSession() {
    return writeSession([
      human('Los', '10:00'),
      request('r1', '10:01', [call('t1', 'Read', { file_path: 'src/big.ts' })]),
      result('t1', '10:02', 'x'.repeat(8000)),
      request('r2', '10:03', [call('t2', 'Skill', { skill: 'dv-forge:plan-writing' })]),
      result('t2', '10:03', 'Launching skill'),
      skillText('y'.repeat(6000), '10:03'),
      request('r3', '10:04', [call('t3', 'Bash', { command: 'ls' })]),
      result('t3', '10:04', 'z'.repeat(400)),
      request('r4', '10:05', []),
    ]);
  }

  test('contextLoads_ResultsAndSkillText_SizeTimesFollowingRequests', () => {
    const entries = readEntries(loadSession());

    const loads = measures.contextLoads(entries, requestsOf(entries));

    assert.deepEqual(loads.map((load) => [load.label, load.tokens, load.following, load.load]), [
      ['Read src/big.ts', 2000, 3, 6000],
      ['Skill-Text nach Skill dv-forge:plan-writing', 1500, 2, 3000],
    ]);
  });

  test('contextLoads_MoreThanFive_OnlyFiveLargest', () => {
    const calls = [1, 2, 3, 4, 5, 6].flatMap((n) => [request(`r${n}`, '10:00', [call(`t${n}`, 'Read', { file_path: `f${n}.ts` })]), result(`t${n}`, '10:00', 'x'.repeat(4000 * n * n))]);
    const entries = readEntries(writeSession([...calls, request('r9', '10:01', [])]));

    const loads = measures.contextLoads(entries, requestsOf(entries));

    assert.equal(loads.length, 5);
    assert.ok(!loads.some((load) => load.label === 'Read f1.ts'));
  });

  test('cli_LoadSession_ListsContextLoadsWithTrigger', () => {
    const output = facts(loadSession());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /Größte Kontextlasten \(Größe × folgende Anfragen, ab 1k Tokens\):\n- 2k × 3 Anfragen = 6k · Read src\/big\.ts \(Eintrag 3\)\n- 2k × 2 Anfragen = 3k · Skill-Text nach Skill dv-forge:plan-writing \(Eintrag 6\)\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js` — erwartet: FAIL `contextLoads_ResultsAndSkillText_SizeTimesFollowingRequests`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/retro-measures.js`: Importzeile ersetzen, vor `module.exports` einfügen und `module.exports` ersetzen:
  ```js
  const { humanEvents, textOf, isToolResultEntry, callLabel, SLASH_COMMAND } = require('./transcript');
  ```
  ```js
  const LOAD_MIN_TOKENS = 1000;
  const TOP_LOADS = 5;

  function toolUses(entry) {
    const content = entry.message?.content;
    return entry.type === 'assistant' && Array.isArray(content) ? content.filter((part) => part.type === 'tool_use') : [];
  }

  function tokensOfText(text) {
    return Math.round(text.length / CHARS_PER_TOKEN);
  }

  // Jedes Tool-Ergebnis und jeder eingeblendete Skill-Text mit seiner Größe; der Skill-Text nennt den Aufruf, der ihn auslöste.
  function loadItems(entries) {
    const calls = new Map();
    const items = [];
    let trigger = 'unbekannt';
    for (const entry of entries) {
      for (const part of toolUses(entry)) {
        calls.set(part.id, callLabel(part));
        if (part.name === 'Skill') trigger = callLabel(part);
      }
      if (entry.type !== 'user' || !entry.message) continue;
      const content = entry.message.content;
      const command = entry.isMeta ? null : textOf(content).match(SLASH_COMMAND)?.[1];
      if (command) trigger = `/${command}`;
      if (entry.isMeta) items.push({ entryNo: entry.entryNo, tokens: tokensOfText(textOf(content)), label: `Skill-Text nach ${trigger}` });
      const results = Array.isArray(content) ? content.filter((part) => part.type === 'tool_result') : [];
      items.push(...results.map((part) => ({ entryNo: entry.entryNo, tokens: tokensOfText(textOf(part.content)), label: calls.get(part.tool_use_id) ?? 'unbekannt' })));
    }
    return items;
  }

  // Kontextlast = Größe mal Zahl der Anfragen, die das Stück danach mitlesen.
  function contextLoads(entries, requests) {
    return loadItems(entries).filter((item) => item.tokens >= LOAD_MIN_TOKENS)
      .map((item) => ({ ...item, following: requests.filter((request) => request.entryNo > item.entryNo).length }))
      .map((item) => ({ ...item, load: item.tokens * item.following }))
      .sort((a, b) => b.load - a.load)
      .slice(0, TOP_LOADS);
  }
  ```
  ```js
  module.exports = { timeOf, minutes, timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Die Importzeile aus `./lib/retro-measures` wird zu:
  ```js
  const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads } = require('./lib/retro-measures');
  ```
  (b) In `analyze` steht vor `return facts;` zusätzlich:
  ```js
    facts.loads = contextLoads(entries, requests);
  ```
  (c) Vor `render` einfügen und `render` ersetzen:
  ```js
  function listOrNone(lines) {
    return lines.length > 0 ? lines : ['- keine'];
  }

  function measureLines(facts) {
    return [
      'Größte Kontextlasten (Größe × folgende Anfragen, ab 1k Tokens):',
      ...listOrNone(facts.loads.map((load) => `- ${thousands(load.tokens)} × ${load.following} Anfragen = ${thousands(load.load)} · ${load.label} (Eintrag ${load.entryNo})`)),
      '',
    ];
  }

  function render(sessionFile, facts, agents, labels = []) {
    const errorLines = errorLinesOf(facts);
    return [
      `# Session-Fakten: ${path.basename(sessionFile, '.jsonl')}`,
      '',
      ...labels.map((label) => `- ${label}`),
      ...factLines(facts, agents),
      '',
      ...measureLines(facts),
      '## Subagents (nach Tokens)',
      '| Auftrag | Typ | Modell | Tokens gesamt | davon neu | Tools | Fehler | min |',
      '|---|---|---|---|---|---|---|---|',
      ...agents.map((agent) => `| ${agent.description} | ${agent.type} | ${agent.model} | ${thousands(agent.tokens)} | ${thousands(agent.fresh)} | ${agent.tools} | ${agent.errors} | ${agent.duration} |`),
      '',
      '## Eingaben des Menschen',
      ...humanLines(facts.humans),
      '',
      '## Tool-Fehler der Hauptsession',
      ...(errorLines.length > 0 ? errorLines : ['- keine']),
      '',
    ].join('\n');
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/transcript.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-measures.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-measures.test.js` · `git commit -m "feat(forge): session-facts lists the largest context loads"`

---

### Task 7: Lange Tool-Läufe und Läufe ohne Änderung dazwischen

**ACs:** AC-12

**Dateien:**
- Modify: `plugins/forge/scripts/lib/retro-measures.js` · `module.exports`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { RetroError: FactsError`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads }`
- Modify: `plugins/forge/scripts/session-facts.js` · `analyze`
- Modify: `plugins/forge/scripts/session-facts.js` · `measureLines`
- Test: `plugins/forge/tests/retro-measures.test.js` · `cli_LoadSession_ListsContextLoadsWithTrigger`

**Interfaces:**
- Consumes: aus Task 6 `toolUses`, `measureLines`, `listOrNone`; aus Task 4 `timeOf`; aus Task 1 `callLabel`, `isToolResultEntry`, `shorten`.
- Produces: `lib/retro-measures.js`: `longRuns(entries): { seconds: number, label: string, entryNo: number }[]` (ab 60 s, höchstens 10); `idleReruns(entries): { command: string, count: number }[]`. `analyze` liefert zusätzlich `longRuns` und `idleReruns`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/retro-measures.test.js` am Dateiende anhängen:
  ```js
  function runSession() {
    const long = 'a'.repeat(90);
    return writeSession([
      human('Los', '10:00'),
      request('r1', '10:01', [call('t1', 'Bash', { command: 'npm test' })]),
      result('t1', '10:03', 'ok'),
      request('r2', '10:04', [call('t2', 'Bash', { command: 'npm test' })]),
      result('t2', '10:04:30', 'ok'),
      request('r3', '10:05', [call('t3', 'Edit', { file_path: 'a.ts' })]),
      result('t3', '10:05', 'ok'),
      request('r4', '10:06', [call('t4', 'Bash', { command: 'npm test' })]),
      result('t4', '10:06:10', 'ok'),
      request('r5', '10:07', [call('t5', 'Bash', { command: 'cat src/x.test.js' })]),
      result('t5', '10:07', 'x'),
      request('r6', '10:07:10', [call('t6', 'Bash', { command: 'cat src/x.test.js' })]),
      result('t6', '10:07:10', 'x'),
      request('r7', '10:08', [call('t7', 'Bash', { command: `node --test ${long}/one.test.js` })]),
      result('t7', '10:08', 'ok'),
      request('r8', '10:09', [call('t8', 'Bash', { command: `node --test ${long}/two.test.js` })]),
      result('t8', '10:09', 'ok'),
    ]);
  }

  test('longRuns_CallToResultAtLeastSixtySeconds_Listed', () => {
    const runs = measures.longRuns(readEntries(runSession()));

    assert.deepEqual(runs, [{ seconds: 120, label: 'Bash npm test', entryNo: 2 }]);
  });

  test('idleReruns_SameBuildTestLintWithoutChange_CountedOnce', () => {
    const reruns = measures.idleReruns(readEntries(runSession()));

    assert.deepEqual(reruns, [{ command: 'npm test', count: 1 }]);
  });

  test('idleReruns_EditedFileNoticeBetween_NotCounted', () => {
    const entries = readEntries(writeSession([
      request('r1', '10:00', [call('t1', 'Bash', { command: 'dotnet build App.sln' })]),
      hint('edited_text_file', '10:01', { filename: 'a.cs' }),
      request('r2', '10:02', [call('t2', 'Bash', { command: 'dotnet build App.sln' })]),
    ]));

    assert.deepEqual(measures.idleReruns(entries), []);
  });

  test('cli_RunSession_ListsLongRunsAndIdleReruns', () => {
    const output = facts(runSession());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /Lange Tool-Läufe \(ab 60 s\):\n- 120 s · Bash npm test \(Eintrag 2\)\n/);
    assert.match(output.stdout, /Build-, Test- und Lint-Läufe ohne Änderung dazwischen:\n- 1× erneut: npm test\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js` — erwartet: FAIL `longRuns_CallToResultAtLeastSixtySeconds_Listed`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/retro-measures.js` vor `module.exports` einfügen und `module.exports` ersetzen:
  ```js
  const LONG_RUN_MS = 60000;
  const MAX_LONG_RUNS = 10;
  const CHANGE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
  const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
  const RUN_WORD = /^(?:build|test|lint|vitest|jest|eslint|tsc|--test)(?::[\w-]+)?$/i;
  const TOOLCHAIN_SCRIPT = /(?:^|[\\/])(?:angular|dotnet)-(?:build|test|lint)(?:\.js)?$/i;
  const MCP_RUN = /^mcp__.+__.*(?:build|test|lint)/i;

  function resultsOf(entry) {
    return isToolResultEntry(entry) ? entry.message.content.filter((part) => part.type === 'tool_result') : [];
  }

  // Start jedes Aufrufs nach seiner Kennung.
  function startsOf(entries) {
    return new Map(entries.flatMap((entry) => toolUses(entry)
      .map((part) => [part.id, { time: timeOf(entry), label: callLabel(part), entryNo: entry.entryNo }])));
  }

  function runOf(start, end) {
    const ms = start && start.time !== null && end !== null ? end - start.time : 0;
    return ms >= LONG_RUN_MS ? [{ seconds: Math.round(ms / 1000), label: start.label, entryNo: start.entryNo }] : [];
  }

  // Dauer eines Laufs = Zeit vom Aufruf bis zu seinem Ergebnis.
  function longRuns(entries) {
    const started = startsOf(entries);
    return entries.flatMap((entry) => resultsOf(entry).flatMap((part) => runOf(started.get(part.tool_use_id), timeOf(entry))))
      .sort((a, b) => b.seconds - a.seconds).slice(0, MAX_LONG_RUNS);
  }

  function isBuildTestLint(command) {
    return command.split(/[\s;&|]+/).map((word) => word.replace(/^["']|["']$/g, ''))
      .some((word) => RUN_WORD.test(word) || TOOLCHAIN_SCRIPT.test(word));
  }

  // Schlüssel eines Build-, Test- oder Lint-Laufs: der ganze Befehl, bei MCP-Tools Name und Eingabe; sonst null.
  function runKey(part) {
    if (SHELL_TOOLS.has(part.name)) {
      const command = String(part.input?.command ?? '').replace(/\s+/g, ' ').trim();
      return isBuildTestLint(command) ? command : null;
    }
    return MCP_RUN.test(part.name) ? `${part.name} ${JSON.stringify(part.input ?? {})}` : null;
  }

  // Schritte eines Eintrags in Protokoll-Reihenfolge: der Hinweis auf eine geänderte Datei, dann jeder Aufruf.
  function stepsOf(entry) {
    const notice = entry.attachment?.type === 'edited_text_file' ? [{ change: true, key: null }] : [];
    return [...notice, ...toolUses(entry).map((part) => ({ change: CHANGE_TOOLS.has(part.name), key: runKey(part) }))];
  }

  // Eine Änderung macht alle Läufe wieder nötig; ein Lauf, der seit der letzten Änderung schon lief, zählt als erneut.
  function countRerun(state, step) {
    if (step.change) state.clean.clear();
    if (!step.key) return state;
    if (state.clean.has(step.key)) state.reruns.set(step.key, (state.reruns.get(step.key) ?? 0) + 1);
    state.clean.add(step.key);
    return state;
  }

  // Build-, Test- und Lint-Läufe, die genauso erneut liefen, ohne dass dazwischen eine Datei geändert wurde.
  function idleReruns(entries) {
    const { reruns } = entries.flatMap(stepsOf).reduce(countRerun, { clean: new Set(), reruns: new Map() });
    return [...reruns.entries()].map(([command, count]) => ({ command, count })).sort((a, b) => b.count - a.count);
  }
  ```
  ```js
  module.exports = { timeOf, minutes, timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads, longRuns, idleReruns };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Die Importzeilen werden zu:
  ```js
  const { RetroError: FactsError, readEntries, textOf, tokensOf, clock, callLabel, isCompactEntry, humanEvents, shorten } = require('./lib/transcript');
  ```
  ```js
  const { timeProfile, harnessHints, requestContext, firstRequest, cacheRebuilds, contextLoads, longRuns, idleReruns } = require('./lib/retro-measures');
  ```
  (b) In `analyze` stehen vor `return facts;` zusätzlich:
  ```js
    facts.longRuns = longRuns(entries);
    facts.idleReruns = idleReruns(entries);
  ```
  (c) `measureLines` wird ersetzt durch:
  ```js
  function measureLines(facts) {
    return [
      'Größte Kontextlasten (Größe × folgende Anfragen, ab 1k Tokens):',
      ...listOrNone(facts.loads.map((load) => `- ${thousands(load.tokens)} × ${load.following} Anfragen = ${thousands(load.load)} · ${load.label} (Eintrag ${load.entryNo})`)),
      '',
      'Lange Tool-Läufe (ab 60 s):',
      ...listOrNone(facts.longRuns.map((run) => `- ${run.seconds} s · ${run.label} (Eintrag ${run.entryNo})`)),
      '',
      'Build-, Test- und Lint-Läufe ohne Änderung dazwischen:',
      ...listOrNone(facts.idleReruns.map((rerun) => `- ${rerun.count}× erneut: ${shorten(rerun.command, 100)}`)),
      '',
    ];
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-measures.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-measures.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-measures.test.js` · `git commit -m "feat(forge): session-facts lists long tool runs and reruns without change"`

---

### Task 8: Erwartete MCP-Server aus den Projekt-Einstellungen

**ACs:** AC-06

**Dateien:**
- Modify: `plugins/forge/scripts/forge-config.js:15-30` · `DEFAULTS`
- Modify: `plugins/forge/scripts/mcp-usage.js:197-233` · `render`
- Modify: `plugins/forge/scripts/mcp-usage.js:251` · `module.exports`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { timeProfile, harnessHints, requestContext`
- Modify: `plugins/forge/scripts/session-facts.js` · `run`
- Modify: `plugins/forge/scripts/session-facts.js` · `module.exports = { projectDir, analyze`
- Modify: `plugins/forge/skills/init/SKILL.md:20-45` · `## Schlüssel`, `## Format`
- Modify: `plugins/forge/skills/init/SKILL.md:47-53` · `## Häufige Fehler`
- Test: `plugins/forge/tests/forge-config.test.js` · `readConfig_NoClaudeMd_AllDefaults`, `cli_ShowAndGet_MarkDefaults`
- Test: `plugins/forge/tests/mcp-usage.test.js` · `render_ExpectedAndConfiguredButUnused_AreMarked`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_Expect_AppendsMeasuredMcpUsage`

**Interfaces:**
- Consumes: `readConfig(cwd)` aus `forge-config.js` (bestehend, wirft `ConfigError` ohne Git-Repo).
- Produces: `forge-config.js`: Schlüssel `MCP-Erwartet` mit Default `''`. · `mcp-usage.js`: `measure(session, { expect = [] } = {}): { servers: Map, native: Map, fallbacks: object[], used: string[], expectedUnused: string[], availableUnused: string[] }`; in `.mcp.json` konfigurierte Server gelten nur noch als verfügbar, nicht als erwartet. · `session-facts.js`: `configuredExpect(cwd: string): string[]`; `projectOf(options, session, warn?): string` (exportiert; Projekt des Protokolls: `--cwd`; ohne `--file` der aktuelle Ordner, weil die eigene Session über ihn gesucht wird, auch nach Worktree-Wechsel; bei `--file` das `cwd` der Protokolleinträge, fehlt der Ordner, der aktuelle Ordner mit Warnung, die `--cwd <projektordner>` nennt, statt Exit 1); `run` nutzt als erwartete Server `--expect` plus `MCP-Erwartet` des Projekts aus `projectOf`. · `init/SKILL.md`: die Zeilen „Alle Fragen in einer Nachricht“ und „Stolperfallen ungefragt umschreiben“ der Tabelle `## Häufige Fehler` entfallen (beide Regeln stehen schon im Ablauf, Schritt 3 und Schritt 1), damit der Body unter 500 Wörtern bleibt.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/forge-config.test.js`: in `readConfig_NoClaudeMd_AllDefaults` vor `assert.deepEqual(configured, []);` die Zeile einfügen, in `cli_ShowAndGet_MarkDefaults` nach der `Lint=`-Zeile die zweite, und am Dateiende den Test anhängen:
  ```js
    assert.equal(values['MCP-Erwartet'], '');
  ```
  ```js
    assert.match(shown.stdout, /^MCP-Erwartet=  \(Default\)$/m);
  ```
  ```js
  test('initSkill_McpExpected_NamesPlaceKeyAndExampleWithTwoServers', () => {
    const text = fs.readFileSync(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'), 'utf8');

    assert.match(text, /\| `MCP-Erwartet` \|/);
    assert.ok(text.includes('- MCP-Erwartet: dev-mcp, codebase-analyzer'));
    assert.ok(text.includes('Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`'));
  });
  ```
  In `plugins/forge/tests/mcp-usage.test.js` wird `render_ExpectedAndConfiguredButUnused_AreMarked` ersetzt durch:
  ```js
  test('render_ExpectedButUnused_MarkedAndConfiguredOnlyAvailable', () => {
    const { transcript } = fixture();

    const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp', 'codebase-analyzer', 'context7'] });

    assert.match(output, /\| context7 \| \*\*erwartet, ungenutzt\*\*/);
    assert.doesNotMatch(output, /\| build-log-filter \| \*\*erwartet/);
    assert.doesNotMatch(output, /\| codebase-analyzer \| \*\*erwartet/);
    assert.match(output, /Verfügbar, aber ungenutzt: Microsoft_Learn, build-log-filter/);
  });

  test('render_NoExpectedList_NoExpectedUnusedRow', () => {
    const { transcript } = fixture();

    const output = render(loadSession(transcript), { transcript });

    assert.doesNotMatch(output, /erwartet, ungenutzt/);
  });
  ```
  In `plugins/forge/tests/session-facts.test.js` direkt nach `cli_Expect_AppendsMeasuredMcpUsage` einfügen (die Importe `makeRepo`, `commitFile` kommen oben dazu):
  ```js
  const { makeRepo, commitFile } = require('./lib/git-repo');
  ```
  ```js
  test('cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag', () => {
    const repo = makeRepo();
    commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet: dev-mcp, codebase-analyzer\n', 'config');

    const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: repo });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
    assert.match(result.stdout, /\| codebase-analyzer \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  });

  test('cli_ProjectWithoutExpectedList_NoExpectedUnusedRow', () => {
    const repo = makeRepo();
    commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet:\n', 'config');

    const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: repo });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /erwartet, ungenutzt/);
  });

  test('cli_ForeignProtocol_ExpectationFromProtocolProject', () => {
    const repo = makeRepo();
    commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n\n- MCP-Erwartet: dev-mcp\n', 'config');
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-')), 's3.jsonl');
    fs.writeFileSync(file, `${[
      line({ type: 'user', cwd: repo, timestamp: '2026-09-27T10:00:00Z', message: { role: 'user', content: 'Los' } }),
      line({ type: 'assistant', cwd: repo, requestId: 'r1', timestamp: '2026-09-27T10:01:00Z', message: { model: 'claude-x', usage: { input_tokens: 10, output_tokens: 1 }, content: [] } }),
    ].join('\n')}\n`);

    const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8', cwd: os.tmpdir() });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /\| dev-mcp \| \*\*erwartet, ungenutzt\*\* \| 0 \|/);
  });

  test('projectOf_OwnSession_UsesProcessCwd', () => {
    const first = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-erststart-'));

    assert.equal(facts.projectOf({ session: 'eigene' }, { cwd: first }), path.resolve(process.cwd()));
  });

  test('projectOf_ForeignFileMissingCwd_FallsBackWithWarning', () => {
    const missing = path.join(os.tmpdir(), 'retro-gibt-es-nicht-8f3a');
    const warnings = [];

    const project = facts.projectOf({ file: 'x.jsonl' }, { cwd: missing }, (text) => warnings.push(text));

    assert.equal(project, path.resolve(process.cwd()));
    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].includes(missing));
    assert.ok(warnings[0].includes('--cwd <projektordner>'));
  });
  ```
  Steht oben in `session-facts.test.js` noch kein Import des Moduls, kommt diese Zeile zu den Importen:
  ```js
  const facts = require('../scripts/session-facts');
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/forge-config.test.js plugins/forge/tests/mcp-usage.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `readConfig_NoClaudeMd_AllDefaults`, FAIL `render_ExpectedButUnused_MarkedAndConfiguredOnlyAvailable`, FAIL `cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag`, FAIL `cli_ForeignProtocol_ExpectationFromProtocolProject`, FAIL `projectOf_OwnSession_UsesProcessCwd` und FAIL `projectOf_ForeignFileMissingCwd_FallsBackWithWarning` (`facts.projectOf is not a function`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/forge-config.js` wird in `DEFAULTS` nach `'Commit-Konvention': '',` die Zeile ergänzt:
  ```js
    'MCP-Erwartet': '',
  ```
  In `plugins/forge/scripts/mcp-usage.js`: vor `render` einfügen, `render` ersetzen, `module.exports` ersetzen:
  ```js
  // Kennzahlen der MCP-Nutzung. Erwartet sind nur die übergebenen Server; konfigurierte und angebotene gelten als verfügbar.
  function measure({ calls, available, cwd }, { expect = [] } = {}) {
    const summary = summarize(calls);
    const used = [...summary.servers.keys()];
    const isUsed = (name) => used.some((server) => sameServer(server, name));
    const expected = [...new Set(expect)];
    const offered = [...new Set([...available, ...configuredServers(cwd)])];
    const expectedUnused = expected.filter((name) => !isUsed(name));
    const availableUnused = offered.filter((name) => !isUsed(name) && !expected.some((wanted) => sameServer(name, wanted)));
    return { ...summary, used, expectedUnused, availableUnused };
  }

  function render(session, { expect = [], transcript }) {
    const { servers, native, fallbacks, used, expectedUnused, availableUnused } = measure(session, { expect });
    const mcpTotal = used.reduce((sum, name) => sum + servers.get(name).calls, 0);

    const lines = [
      '## MCP-Nutzung (gemessen)',
      '',
      `Quelle: \`${transcript}\` · Hauptagent + ${session.subagentCount} SubAgent(s) · ${session.calls.length} Tool-Aufrufe, davon ${mcpTotal} MCP`,
      '',
      '| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |',
      '|---|---|---|---|---|---|---|',
    ];
    for (const name of used.sort((a, b) => servers.get(b).calls - servers.get(a).calls)) {
      const row = servers.get(name);
      lines.push(`| ${name} | genutzt | ${row.calls} | ${dash(row.errors)} | ${dash(row.repeats)} | ${listCounts(row.tools)} | ${listCounts(row.agents)} |`);
    }
    for (const name of expectedUnused) lines.push(`| ${name} | **erwartet, ungenutzt** | 0 | – | – | – | – |`);
    if (used.length === 0 && expectedUnused.length === 0) lines.push('| – | keine MCP-Calls | 0 | – | – | – | – |');
    if (availableUnused.length > 0) lines.push('', `Verfügbar, aber ungenutzt: ${availableUnused.sort().join(', ')}`);

    lines.push('', '### Native Tools', '', '| Tool | Aufrufe | Fehler | Wiederholt | Agents |', '|---|---|---|---|---|');
    if (native.size === 0) lines.push('| – | 0 | – | – | – |');
    for (const [name, row] of [...native.entries()].sort((a, b) => b[1].calls - a[1].calls)) {
      lines.push(`| ${name} | ${row.calls} | ${dash(row.errors)} | ${dash(row.repeats)} | ${listCounts(row.agents)} |`);
    }

    lines.push('', `### Shell-Fallback-Kandidaten (${fallbacks.length})`, '');
    if (fallbacks.length === 0) lines.push('Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.');
    for (const { agent, command } of fallbacks.slice(0, MAX_FALLBACK_LINES)) lines.push(`- ${agent}: \`${oneLine(command)}\``);
    if (fallbacks.length > MAX_FALLBACK_LINES) lines.push(`- … und ${fallbacks.length - MAX_FALLBACK_LINES} weitere`);
    return `${lines.join('\n')}\n`;
  }
  ```
  ```js
  module.exports = { parseArgs, findTranscript, loadSession, summarize, measure, render, sameServer };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Nach der Importzeile aus `./lib/retro-measures` einfügen:
  ```js
  const { readConfig } = require('./forge-config.js');
  ```
  (b) Vor `run` einfügen und `run` ersetzen:
  ```js
  // Erwartete MCP-Server aus `MCP-Erwartet` der Projekt-Einstellungen.
  function configuredExpect(cwd) {
    try {
      return readConfig(cwd).config['MCP-Erwartet'].split(',').map((name) => name.trim()).filter(Boolean);
    } catch {
      // Ohne Git-Repo gibt es keine Projekt-Einstellungen und damit keine Erwartung.
      return [];
    }
  }

  // Projekt des ausgewerteten Protokolls. `--cwd` gilt immer. Ohne `--file` ist es die eigene Session, gesucht über den
  // aktuellen Ordner; der ist damit das Projekt, auch nach einem Wechsel in einen Worktree. Nur bei `--file` gilt das
  // `cwd` der Protokolleinträge, damit Erwartung, Branch und Projekt-Dateien aus dem Projekt des fremden Protokolls
  // kommen; fehlt dieser Ordner, gilt der aktuelle Ordner mit Warnung.
  function projectOf(options, session, warn = (text) => process.stderr.write(`Warnung: ${text}\n`)) {
    if (options.cwd) return path.resolve(options.cwd);
    if (!options.file || !session.cwd) return path.resolve(process.cwd());
    if (fs.existsSync(session.cwd)) return path.resolve(session.cwd);
    warn(`Projektordner des Protokolls fehlt: ${session.cwd}; ausgewertet wird im aktuellen Ordner, sonst mit --cwd <projektordner> angeben`);
    return path.resolve(process.cwd());
  }

  function run(options) {
    const { file, warning } = resolveSession(options);
    if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
    const range = rangeOf(readEntries(file), options);
    const session = mcpUsage.loadSession(file, { entries: range.entries, keepSubagent: range.keepSubagent });
    const cwd = projectOf(options, session);
    if (options.cwd) session.cwd = options.cwd;
    const expect = [...new Set([...(options.expect ?? []), ...configuredExpect(cwd)])];
    const facts = analyze(range.entries);
    const agents = subagentRows(file, range.keepSubagent);
    const mcp = mcpUsage.render(session, { expect, transcript: file });
    const allFacts = [facts, ...agents.map((agent) => agent.facts)];
    let output = `${render(file, facts, agents, range.labels)}\n${savings(allFacts)}\n${mcp}`;
    if (options.skeleton) {
      const written = writeSkeleton(options.skeleton, skeleton({ facts, agents, mcp, lists: savingsLists(allFacts) }));
      output += `\nGerüst geschrieben: ${written}\n`;
    }
    return { output, warning };
  }
  ```
  (c) `module.exports` wird zu:
  ```js
  module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, run, parseArgs, resolveSession, projectOf };
  ```
  In `plugins/forge/skills/init/SKILL.md`: in der Tabelle unter `## Schlüssel` nach der Zeile `| \`Commit-Konvention\` | … |` die Zeile ergänzen, und im Block unter `## Format` nach `- Planungs-Skills: unit-integration-testing, software-design-principles` die Beispielzeile:
  ```markdown
  | `MCP-Erwartet` | MCP-Server je Session, mit Komma getrennt; ungenutzte meldet die Retrospektive als „erwartet, ungenutzt“ | leer |
  ```
  ```markdown
  - MCP-Erwartet: dev-mcp, codebase-analyzer
  ```
  Damit der Body unter 500 Wörtern bleibt (heute 497, die zwei neuen Zeilen bringen 23), entfallen in der Tabelle unter `## Häufige Fehler` diese zwei Zeilen (zusammen 27 Wörter); beide Regeln stehen schon im Ablauf, Schritt 3 („eine Frage pro Nachricht“) und Schritt 1 („Erst nach der Antwort änderst du, nur die genannten Zeilen“). Kein Test prüft ihren Text:
  ```markdown
  | Alle Fragen in einer Nachricht | Eine Frage pro Nachricht. |
  | Stolperfallen ungefragt umschreiben | Je Datei fragen, dann nur die freigegebenen Zeilen ändern. |
  ```
  Die Tabelle behält die Kopfzeilen und die Zeilen „Eigene Schlüssel oder Überschriften erfinden“ und „Einstellungen in eine andere Datei schreiben“. Der Satz mit „den Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`“ in der Einleitung bleibt unverändert.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node -e "const { readMarkdown, wordCount } = require('./plugins/forge/tests/lib/markdown'); console.log(wordCount(readMarkdown('plugins/forge/skills/init/SKILL.md').body))"` — erwartet: eine Zahl unter 500 (rund 493)
  Befehl: `node --test plugins/forge/tests/forge-config.test.js plugins/forge/tests/mcp-usage.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/work-skills.test.js` — erwartet: PASS (`init_Body_ListsEveryConfigKey` verlangt `MCP-Erwartet` in der Einrichtungs-Anleitung, `init_Body_StaysUnder500WordsAndUsesPluginRoot` die Wortgrenze)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/forge-config.js plugins/forge/scripts/mcp-usage.js plugins/forge/scripts/session-facts.js plugins/forge/skills/init/SKILL.md plugins/forge/tests/forge-config.test.js plugins/forge/tests/mcp-usage.test.js plugins/forge/tests/session-facts.test.js` · `git commit -m "feat(forge): expected MCP servers come from the project settings"`

---

### Task 9: Ersatz-Kandidaten für ungenutzte erwartete MCP

**ACs:** AC-07

**Dateien:**
- Modify: `plugins/forge/scripts/mcp-usage.js:11-18` · `const MCP_TOOL`
- Modify: `plugins/forge/scripts/mcp-usage.js:168-191` · `summarize`
- Modify: `plugins/forge/scripts/mcp-usage.js` · `render`
- Test: `plugins/forge/tests/mcp-usage.test.js` · `render_NoExpectedList_NoExpectedUnusedRow`

**Interfaces:**
- Consumes: aus Task 8 `measure`, `render`.
- Produces: `summarize(calls)` liefert zusätzlich `reads: { Read: number, Grep: number, Glob: number, shell: number }`; `measure` reicht es durch. `render` hat bei mindestens einem erwarteten, ungenutzten Server die Zeile `Ersatz-Kandidaten für ungenutzte erwartete MCP: Read <n>, Grep <n>, Glob <n>, Shell-Fallbacks <n> (Shell-Aufrufe, die Dateien lesen oder durchsuchen)`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/mcp-usage.test.js` am Dateiende anhängen:
  ```js
  function readSession(calls) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-reads-'));
    const transcript = path.join(root, `${SESSION}.jsonl`);
    writeJsonl(transcript, calls.map(([id, name, input]) => toolUse(id, name, input)));
    return transcript;
  }

  test('render_ExpectedUnused_NamesReadGrepGlobAndShellFallbacks', () => {
    const transcript = readSession([
      ['a', 'Read', { file_path: 'x' }], ['b', 'Grep', { pattern: 'y' }], ['c', 'Grep', { pattern: 'z' }], ['d', 'Glob', { pattern: '*.md' }],
      ['e', 'Bash', { command: 'cd src && cat a.txt' }], ['f', 'PowerShell', { command: 'Get-Content b.txt' }],
      ['g', 'Bash', { command: 'git status' }], ['h', 'Bash', { command: 'git log | head -5' }],
    ]);

    const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp'] });

    assert.match(output, /Ersatz-Kandidaten für ungenutzte erwartete MCP: Read 1, Grep 2, Glob 1, Shell-Fallbacks 2 \(Shell-Aufrufe, die Dateien lesen oder durchsuchen\)/);
  });

  test('render_AllExpectedUsed_NoReplacementLine', () => {
    const { transcript } = fixture();

    const output = render(loadSession(transcript), { transcript, expect: ['dev-mcp'] });

    assert.doesNotMatch(output, /Ersatz-Kandidaten/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/mcp-usage.test.js` — erwartet: FAIL `render_ExpectedUnused_NamesReadGrepGlobAndShellFallbacks`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/mcp-usage.js`:
  (a) Nach `const SHELL_FALLBACK = …;` einfügen:
  ```js
  const READ_TOOLS = new Set(['Read', 'Grep', 'Glob']);
  const READ_COMMANDS = new Set(['cat', 'head', 'tail', 'less', 'more', 'grep', 'egrep', 'rg', 'find', 'ls', 'sed', 'awk', 'wc',
    'get-content', 'gc', 'select-string', 'sls', 'get-childitem', 'gci', 'dir', 'type', 'findstr']);
  const SHELL_KEYWORD = /^(?:do|then|else)\s+/;
  ```
  (b) `summarize` wird ersetzt, davor `isReadFallback` und `countRead`:
  ```js
  // Shell-Aufruf, der wie Read, Grep oder Glob Dateien liest oder durchsucht: ein Glied der Befehlskette beginnt mit einem Lese-Befehl.
  function isReadFallback(command) {
    return command.split(/&&|\|\||;|\n/).map((segment) => segment.trim().replace(SHELL_KEYWORD, ''))
      .some((segment) => READ_COMMANDS.has((segment.split(/\s+/)[0] ?? '').toLowerCase()));
  }

  function countRead(reads, call) {
    if (READ_TOOLS.has(call.name)) reads[call.name] += 1;
    if (SHELL_TOOLS.has(call.name) && isReadFallback(String(call.input.command ?? ''))) reads.shell += 1;
  }

  function summarize(calls) {
    const servers = new Map();
    const native = new Map();
    const fallbacks = [];
    const reads = { Read: 0, Grep: 0, Glob: 0, shell: 0 };
    const seen = new Set();
    for (const call of calls) {
      countRead(reads, call);
      const mcp = call.name.match(MCP_TOOL);
      const key = mcp ? mcp[1] : call.name;
      const target = mcp ? servers : NATIVE_TOOLS.has(call.name) ? native : null;
      if (!target) continue;
      if (!target.has(key)) target.set(key, { calls: 0, errors: 0, repeats: 0, tools: new Map(), agents: new Map() });
      const row = target.get(key);
      const signature = `${call.agent}\u0000${call.name}\u0000${JSON.stringify(call.input)}`;
      row.calls += 1;
      row.errors += call.error ? 1 : 0;
      row.repeats += seen.has(signature) ? 1 : 0;
      seen.add(signature);
      if (mcp) increment(row.tools, mcp[2]);
      increment(row.agents, call.agent);
      const command = String(call.input.command ?? '');
      if (SHELL_TOOLS.has(call.name) && SHELL_FALLBACK.test(command)) fallbacks.push({ agent: call.agent, command });
    }
    return { servers, native, fallbacks, reads };
  }
  ```
  (c) In `render` wird die erste Zeile zu
  ```js
    const { servers, native, fallbacks, reads, used, expectedUnused, availableUnused } = measure(session, { expect });
  ```
  und direkt nach der Zeile `if (used.length === 0 && expectedUnused.length === 0) lines.push('| – | keine MCP-Calls | 0 | – | – | – | – |');` kommt:
  ```js
    if (expectedUnused.length > 0) {
      lines.push('', `Ersatz-Kandidaten für ungenutzte erwartete MCP: Read ${reads.Read}, Grep ${reads.Grep}, Glob ${reads.Glob}, Shell-Fallbacks ${reads.shell} (Shell-Aufrufe, die Dateien lesen oder durchsuchen)`);
    }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/mcp-usage.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/mcp-usage.js plugins/forge/tests/mcp-usage.test.js` · `git commit -m "feat(forge): mcp-usage names read and shell fallbacks for unused expected servers"`

---

### Task 10: Hinweise zu den Messwert-Signalen

**ACs:** AC-13

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-signals.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { readConfig } = require('./forge-config.js');`
- Modify: `plugins/forge/scripts/session-facts.js:243-258` · `savingsLists`
- Modify: `plugins/forge/scripts/session-facts.js` · `run`
- Test: `plugins/forge/tests/retro-signals.test.js`

**Interfaces:**
- Consumes: aus Task 1 `facts.humans`; Task 5 `facts.baseline`, `facts.rebuilds`; Task 6 `facts.loads`; Task 7 `facts.longRuns`, `facts.idleReruns`; Task 4 `facts.time`; Task 8 `mcpUsage.measure` (`expectedUnused`, `fallbacks`).
- Produces: `lib/retro-signals.js`: `SIGNALS: { name: string, fires: (measured) => boolean, hint: string }[]`; `signalHints(measured): string[]` (je angeschlagenem Signal `- <name>: <hint>`, sonst `['- keine Messwert-Signale']`). `measured` hat die Zahlenfelder `errors, denials, rejections, interruptions, repeats, compactions, expectedUnused, toolchainShell, baselineTokens, cacheRebuilds, contextLoads, longRuns, idleReruns, repeatedReads, recurringCommands, silenceMinutes`. · `session-facts.js`: `savingsData(all): { results, reads, commands }`; `measuredOf(facts, allFacts, mcp): object`; Ausgabe endet mit `## Hinweise zu den Signalen`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-signals.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { signalHints } = require('../scripts/lib/retro-signals');
  const { human, request, say, call, result, writeSession } = require('./lib/retro-session');

  const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');
  const ZERO = {
    errors: 0, denials: 0, rejections: 0, interruptions: 0, repeats: 0, compactions: 0, expectedUnused: 0, toolchainShell: 0,
    baselineTokens: 0, cacheRebuilds: 0, contextLoads: 0, longRuns: 0, idleReruns: 0, repeatedReads: 0, recurringCommands: 0, silenceMinutes: 0,
  };

  function facts(file) {
    return spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8', cwd: fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cwd-')) });
  }

  test('signalHints_NoSignal_SaysNone', () => {
    assert.deepEqual(signalHints(ZERO), ['- keine Messwert-Signale']);
  });

  test('signalHints_TwoSignals_OneLineEach', () => {
    const lines = signalHints({ ...ZERO, errors: 2, cacheRebuilds: 1 });

    assert.equal(lines.length, 2);
    assert.match(lines[0], /^- Tool-Fehler: /);
    assert.match(lines[1], /^- Cache-Neuaufbau: /);
  });

  test('signalHints_EveryMeasuredField_FiresExactlyOneSignal', () => {
    for (const key of Object.keys(ZERO)) {
      assert.equal(signalHints({ ...ZERO, [key]: 1000000 }).length, 1, key);
    }
  });

  test('signalHints_Thresholds_BaselineFortyThousandAndSilenceTenMinutes', () => {
    const fired = [39999, 40000].map((tokens) => signalHints({ ...ZERO, baselineTokens: tokens })[0]);
    const silent = [9, 10].map((minutes) => signalHints({ ...ZERO, silenceMinutes: minutes })[0]);

    assert.deepEqual(fired.map((line) => line.startsWith('- Hohe Grundlast')), [false, true]);
    assert.deepEqual(silent.map((line) => line.startsWith('- Lange Stille')), [false, true]);
  });

  test('cli_SessionWithError_HintsSectionNamesToolErrors', () => {
    const file = writeSession([
      human('Los', '10:00'),
      request('r1', '10:01', [call('t1', 'Bash', { command: 'ls' })]),
      result('t1', '10:01', 'kaputt', true),
    ]);

    const output = facts(file);

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /## Hinweise zu den Signalen\n- Tool-Fehler: /);
  });

  test('cli_QuietSession_HintsSectionSaysNone', () => {
    const output = facts(writeSession([human('Los', '10:00'), request('r1', '10:01', [say('Hallo')])]));

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /## Hinweise zu den Signalen\n- keine Messwert-Signale\n/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-signals.test.js` — erwartet: FAIL `signalHints_NoSignal_SaysNone`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-signals.js` neu:
  ```js
  'use strict';

  // Messwert-Signale: je Signal eine Prüfung der gemessenen Zahlen und ein Hinweis auf mögliche Ursache oder Lösung.

  const BASELINE_HIGH_TOKENS = 40000;
  const SILENCE_LONG_MINUTES = 10;

  const SIGNALS = [
    { name: 'Tool-Fehler', fires: (m) => m.errors > 0, hint: 'Meldung prüfen; ein Exit-Code ungleich 0 bei grünem Lauf ist kein Befund, sonst Regel im Skill oder Werkzeug nachschärfen.' },
    { name: 'Blockierte Aufrufe', fires: (m) => m.denials > 0, hint: 'Hook oder Berechtigung zu streng, oder der Skill nennt den erlaubten Weg nicht.' },
    { name: 'Abgelehnte Aufrufe', fires: (m) => m.rejections > 0, hint: 'Der Mensch wollte einen anderen Weg; vorher fragen oder den Weg im Skill festlegen.' },
    { name: 'Unterbrechungen', fires: (m) => m.interruptions > 0, hint: 'Der Mensch griff ein; Zwischenstände früher zeigen.' },
    { name: 'Wiederholte Aufrufe', fires: (m) => m.repeats > 0, hint: 'Gleicher Aufruf direkt erneut: Ergebnis war unklar; Ausgabe des Werkzeugs eindeutiger machen.' },
    { name: 'Zusammenfassungen', fires: (m) => m.compactions > 0, hint: 'Zu viel Text im Kontext; große Ergebnisse in Dateien statt in den Verlauf.' },
    { name: 'Erwartete MCP ungenutzt', fires: (m) => m.expectedUnused > 0, hint: 'Im Bericht je Server entscheiden: verzichtbar oder übersehen; die Ersatz-Kandidaten zeigen, womit stattdessen gelesen wurde.' },
    { name: 'Build-Werkzeuge über die Shell', fires: (m) => m.toolchainShell > 0, hint: 'Vorgesehenen Weg prüfen: Skript, Hook oder Skill-Regel.' },
    { name: 'Hohe Grundlast', fires: (m) => m.baselineTokens >= BASELINE_HIGH_TOKENS, hint: 'Große Anhänge der ersten Anfrage (Skill-Liste, Anweisungen, Hook-Texte) kürzen oder abschalten.' },
    { name: 'Cache-Neuaufbau', fires: (m) => m.cacheRebuilds > 0, hint: 'Nach der Pause wurde der ganze Kontext neu geschrieben; vor langen Pausen abschließen oder frisch starten.' },
    { name: 'Große Kontextlasten', fires: (m) => m.contextLoads > 0, hint: 'Ergebnis filtern oder in eine Datei schreiben; jede folgende Anfrage liest es mit.' },
    { name: 'Lange Tool-Läufe', fires: (m) => m.longRuns > 0, hint: 'Gezielter laufen lassen oder im Hintergrund, während anderes weitergeht.' },
    { name: 'Läufe ohne Änderung', fires: (m) => m.idleReruns > 0, hint: 'Gleicher Build-, Test- oder Lint-Lauf ohne Änderung dazwischen: Ergebnis des letzten Laufs weiterverwenden.' },
    { name: 'Mehrfach gelesene Dateien', fires: (m) => m.repeatedReads > 0, hint: 'Ausschnitt lesen oder das Gebrauchte einmal in eine Datei schreiben.' },
    { name: 'Wiederkehrende Shell-Befehle', fires: (m) => m.recurringCommands > 0, hint: 'Kandidat für ein Skript oder einen Hook.' },
    { name: 'Lange Stille', fires: (m) => m.silenceMinutes >= SILENCE_LONG_MINUTES, hint: 'Lange Strecke ohne Text an den Menschen; Zwischenstände geben, damit er früher eingreifen kann.' },
  ];

  function signalHints(measured) {
    const lines = SIGNALS.filter((signal) => signal.fires(measured)).map((signal) => `- ${signal.name}: ${signal.hint}`);
    return lines.length > 0 ? lines : ['- keine Messwert-Signale'];
  }

  module.exports = { SIGNALS, signalHints };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Nach `const { readConfig } = require('./forge-config.js');` einfügen:
  ```js
  const { signalHints } = require('./lib/retro-signals');
  ```
  (b) `savingsLists` wird ersetzt durch:
  ```js
  function savingsData(all) {
    return {
      results: all.flatMap((facts) => facts.results).sort((a, b) => b.chars - a.chars).slice(0, TOP_RESULTS),
      reads: [...all.reduce((map, facts) => merge(map, facts.reads), new Map())].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]),
      commands: [...all.reduce((map, facts) => merge(map, facts.commands), new Map())].filter(([, count]) => count >= MIN_COMMAND_REPEATS).sort((a, b) => b[1] - a[1]),
    };
  }

  function savingsLists(all) {
    const { results, reads, commands } = savingsData(all);
    return [
      'Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):',
      ...(results.length > 0 ? results.map((r) => `- ${thousands(r.chars / 4)} Tokens · ${r.call}`) : ['- keine']),
      '',
      'Mehrfach gelesene Dateien:',
      ...(reads.length > 0 ? reads.slice(0, 10).map(([file, count]) => `- ${count}× ${file}`) : ['- keine']),
      '',
      `Wiederkehrende Shell-Befehle (ab ${MIN_COMMAND_REPEATS}×):`,
      ...(commands.length > 0 ? commands.slice(0, 10).map(([head, count]) => `- ${count}× ${head}`) : ['- keine']),
      '',
    ].join('\n');
  }

  function kindCount(humans, kind) {
    return humans.filter((event) => event.kind === kind).length;
  }

  function measuredOf(facts, allFacts, mcp) {
    const { reads, commands } = savingsData(allFacts);
    return {
      errors: errorLinesOf(facts).length, denials: facts.denials, rejections: kindCount(facts.humans, 'Ablehnung'),
      interruptions: kindCount(facts.humans, 'Unterbrechung'), repeats: facts.repeats, compactions: facts.compactions,
      expectedUnused: mcp.expectedUnused.length, toolchainShell: mcp.fallbacks.length, baselineTokens: facts.baseline?.context ?? 0,
      cacheRebuilds: facts.rebuilds.length, contextLoads: facts.loads.length, longRuns: facts.longRuns.length,
      idleReruns: facts.idleReruns.length, repeatedReads: reads.length, recurringCommands: commands.length, silenceMinutes: facts.time.silence,
    };
  }
  ```
  (c) In `run` wird die Zeile `let output = …;` ersetzt durch:
  ```js
    const measured = measuredOf(facts, allFacts, mcpUsage.measure(session, { expect }));
    let output = `${render(file, facts, agents, range.labels)}\n${savings(allFacts)}\n${mcp}\n## Hinweise zu den Signalen\n${signalHints(measured).join('\n')}\n`;
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-signals.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/retro-measures.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-signals.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-signals.test.js` · `git commit -m "feat(forge): session-facts explains every measured signal that fires"`

---

### Task 11: Snapshot je Session statt Berichtsgerüst

**ACs:** AC-14

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-files.js`
- Create: `plugins/forge/scripts/lib/retro-snapshot.js`
- Modify: `plugins/forge/scripts/session-facts.js:4-18` · `const USAGE`, `const REPORT_FORMAT`, `const FACTS_SLOT`, `const MCP_SLOT`, `const RESULT_SLOT`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { signalHints } = require('./lib/retro-signals');`
- Modify: `plugins/forge/scripts/session-facts.js` · `FLAGS`, `SWITCHES`
- Modify: `plugins/forge/scripts/session-facts.js:319-341` · `skeleton`, `writeSkeleton`
- Modify: `plugins/forge/scripts/session-facts.js` · `run`
- Modify: `plugins/forge/scripts/session-facts.js` · `module.exports`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest`, `cli_Skeleton_ExistingTarget_RefusesAndKeepsFile`
- Test: `plugins/forge/tests/retro-snapshot.test.js`

**Interfaces:**
- Consumes: aus Task 2 `sessionById`, `projectDir`, `rangeOf` (`cutTime`, `labels`); Task 1 `readEntries` (`entryNo`); Task 4–7 `factLines`, `measureLines`; Task 10 `savingsLists`; Task 1 `facts.humans`.
- Produces: `lib/retro-files.js`: `retroDir(): string` (`<home>/.dv-forge/retro`); `snapshotPath(session: string): string` (`<id>.snapshot.json`); `draftPath(session: string): string` (`<id>.entwurf.md`); `writeSnapshot(snapshot: object): string`; `readSnapshot(session: string): object` — wirft `RetroError` `Snapshot fehlt: <pfad>. …`, `Snapshot unlesbar: <pfad>: <grund>` oder, ohne ganzzahliges `transcriptEntries`, `Snapshot unlesbar: <pfad>: transcriptEntries fehlt`. · Snapshot-Felder: `session, transcript, ownTranscript, transcriptEntries: number` (höchste `entryNo` des ganzen Hauptprotokolls beim Lauf von `--snapshot`, also vor der ersten Modell-Anfrage der Retrospektive; Task 14 prüft Zitate nur gegen Einträge bis dahin), `cwd, cut, labels: string[]` (die Labels des Bereichs aus `rangeOf`, samt Warnung), `branch, specs: string[], expected: string[], model, skills: string[], headline, numbers, mcp, projectFiles: string[]`. · `lib/retro-snapshot.js` (Angaben zur Session und Zusammenbau des Snapshots, eine Verantwortung): `specPaths(entries, humans): string[]`; `projectFiles(entries, cwd: string): string[]`; `branchOf(entries, cwd: string): string|null`; `skillsOf(facts): string[]`; `buildSnapshot({ id, transcript, ownTranscript, transcriptEntries, cwd, range, facts, headline, numbers, mcp, expect }): object` (ruft `branchOf`, `specPaths`, `skillsOf`, `projectFiles` auf und setzt das Objekt zusammen; eigene I/O hat es nicht, Git liest nur `branchOf`, Dateien prüft nur `projectFiles`). · `session-facts.js`: Schalter `--snapshot`; Ausgabe `Snapshot: <pfad>` und `Entwurf: <pfad>`; ein vorhandener Entwurf derselben Session wird dabei gelöscht; `--skeleton` entfällt; `headlineOf(facts, agents): string` und `numbersOf(facts, agents, allFacts): string` stehen neben `factLines`/`measureLines`, weil sie deren Formatierung (`thousands`, `minutes`) nutzen; `ownTranscriptOf(options, file): string|null` steht bis Task 16 hier; `saveSnapshot(snapshot): string` schreibt, löscht den alten Entwurf und liefert die Ausgabezeilen; `run` orchestriert nur: Bereich, Fakten, Ausgabe, `buildSnapshot`, `saveSnapshot`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/session-facts.test.js` werden `cli_Skeleton_WritesReportWithFactsAndMcpVerbatimAndPlaceholdersForTheRest` und `cli_Skeleton_ExistingTarget_RefusesAndKeepsFile` ersetzt durch die folgenden Tests:
  ```js
  function snapshotHome() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
  }

  function withHome(home, args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, TZ: 'UTC' } });
  }

  function readSnapshotOf(home, id) {
    return JSON.parse(fs.readFileSync(path.join(home, '.dv-forge', 'retro', `${id}.snapshot.json`), 'utf8'));
  }

  test('cli_Snapshot_WritesSnapshotOutsideProjectAndNamesDraft', () => {
    const home = snapshotHome();
    const file = session();

    const result = withHome(home, ['--file', file, '--snapshot']);

    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`Snapshot: ${path.join(home, '.dv-forge', 'retro', 's1.snapshot.json')}`));
    assert.ok(result.stdout.includes(`Entwurf: ${path.join(home, '.dv-forge', 'retro', 's1.entwurf.md')}`));
  });

  test('cli_Snapshot_HoldsNumbersMcpAndSessionFacts', () => {
    const home = snapshotHome();
    const file = session();
    withHome(home, ['--file', file, '--snapshot']);

    const snapshot = readSnapshotOf(home, 's1');

    assert.equal(snapshot.transcript, file);
    assert.equal(snapshot.model, 'claude-x');
    assert.deepEqual(snapshot.skills, ['dv-forge:init']);
    assert.equal(snapshot.cut, null);
    assert.match(snapshot.numbers, /^- Dauer: 10 min · Modelle: claude-x\n/);
    assert.match(snapshot.mcp, /^Quelle: /);
    assert.equal(snapshot.headline, 'Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents');
    for (const key of ['branch', 'specs', 'expected', 'projectFiles', 'ownTranscript', 'cwd', 'transcriptEntries', 'labels']) assert.ok(key in snapshot, `${key} fehlt`);
  });

  test('cli_Snapshot_RecordsLastEntryOfProtocolForQuoteCheck', () => {
    const home = snapshotHome();
    const file = session();

    withHome(home, ['--file', file, '--snapshot']);

    assert.equal(readSnapshotOf(home, 's1').transcriptEntries, facts.readEntries(file).at(-1).entryNo);
  });

  test('cli_SnapshotWithCut_RecordsCutTime', () => {
    const home = snapshotHome();

    withHome(home, ['--file', commandSession(), '--before-retro', '--snapshot']);

    assert.equal(readSnapshotOf(home, 's2').cut, '2026-09-27T11:10:00Z');
  });

  test('cli_SnapshotOfTwoSessions_BothKept', () => {
    const home = snapshotHome();

    withHome(home, ['--file', session(), '--snapshot']);
    withHome(home, ['--file', commandSession(), '--snapshot']);

    assert.deepEqual(fs.readdirSync(path.join(home, '.dv-forge', 'retro')).sort(), ['s1.snapshot.json', 's2.snapshot.json']);
  });

  test('cli_SnapshotWithFileAndSession_NamedAfterOwnSession', () => {
    const project = projectWith([['eigene', 0]]);
    const other = session();

    const result = spawnSync(process.execPath, [SCRIPT, '--cwd', project.cwd, '--file', other, '--session', 'eigene', '--snapshot'], { encoding: 'utf8', env: { ...process.env, HOME: project.home, USERPROFILE: project.home } });

    assert.equal(result.status, 0, result.stderr);
    const snapshot = readSnapshotOf(project.home, 'eigene');
    assert.equal(snapshot.transcript, other);
    assert.equal(snapshot.ownTranscript, path.join(facts.projectDir(project.cwd, project.home), 'eigene.jsonl'));
  });

  test('cli_Snapshot_RemovesStaleDraftOfSameSession', () => {
    const home = snapshotHome();
    const stale = path.join(home, '.dv-forge', 'retro', 's1.entwurf.md');
    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, '# alter Entwurf\n');

    const result = withHome(home, ['--file', session(), '--snapshot']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(stale), false);
  });

  test('cli_WithoutSnapshot_NoSkeletonFlagAnymore', () => {
    assert.equal(spawnSync(process.execPath, [SCRIPT, '--file', session(), '--skeleton', 'x.md'], { encoding: 'utf8' }).status, 2);
  });
  ```
  `plugins/forge/tests/retro-snapshot.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { readEntries, humanEvents } = require('../scripts/lib/transcript');
  const { specPaths, projectFiles, buildSnapshot } = require('../scripts/lib/retro-snapshot');
  const { human, slash, request, call, writeSession } = require('./lib/retro-session');

  test('specPaths_ToolPathsAndHumanArguments_NewestFirst', () => {
    const entries = readEntries(writeSession([
      slash('dv-forge:plan-writing', 'docs/forge/a/spec.md', '10:00'),
      request('r1', '10:01', [call('a', 'Read', { file_path: 'docs/specs/b.md' })]),
      request('r2', '10:02', [call('b', 'Read', { file_path: 'src/x.ts' })]),
    ]));

    assert.deepEqual(specPaths(entries, humanEvents(entries)), ['docs/specs/b.md', 'docs/forge/a/spec.md']);
  });

  test('projectFiles_TouchedFiles_OnlyProjectNamesOutsidePluginsAndClaude', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
    fs.mkdirSync(path.join(root, 'plugins', 'p', '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'plugins', 'p', '.claude-plugin', 'plugin.json'), '{}');
    const entries = readEntries(writeSession([
      request('r1', '10:00', [call('a', 'Edit', { file_path: path.join(root, 'src', 'Shift.ts') })]),
      request('r2', '10:01', [call('b', 'Read', { file_path: path.join(root, 'plugins', 'p', 'scripts', 'tool.js') })]),
      request('r3', '10:02', [call('c', 'Read', { file_path: path.join(root, '.claude', 'skills', 'x', 'SKILL.md') })]),
      request('r4', '10:03', [call('d', 'Read', { file_path: path.join(root, 'CLAUDE.md') })]),
      request('r5', '10:04', [call('e', 'Read', { file_path: path.join(os.tmpdir(), 'fremd.md') })]),
      request('r6', '10:05', [call('f', 'Grep', { pattern: 'x', path: path.join(root, 'src') })]),
      human('fertig', '10:06'),
    ]));

    assert.deepEqual(projectFiles(entries, root), ['Shift.ts']);
  });

  test('buildSnapshot_FactsAndSessionData_AssembledIntoFields', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
    const entries = readEntries(writeSession([
      { ...request('r1', '10:00', [call('a', 'Read', { file_path: 'docs/specs/b.md' })]), gitBranch: 'feature/x' },
    ]));
    const facts = { models: new Set(['claude-x']), humans: [], skills: new Map([['dv-forge:init', 1]]) };
    const range = { entries, cutTime: null, labels: ['Schnitt: keiner'] };

    const snapshot = buildSnapshot({
      id: 's1', transcript: 't.jsonl', ownTranscript: null, transcriptEntries: 1, cwd, range, facts,
      headline: 'Kopf', numbers: '- Dauer: 1 min', mcp: '## MCP-Nutzung (gemessen)\nQuelle: `t.jsonl`\n', expect: ['dev-mcp'],
    });

    assert.deepEqual(snapshot, {
      session: 's1', transcript: 't.jsonl', ownTranscript: null, transcriptEntries: 1, cwd, cut: null, labels: ['Schnitt: keiner'],
      branch: 'feature/x', specs: ['docs/specs/b.md'], expected: ['dev-mcp'], model: 'claude-x', skills: ['dv-forge:init'],
      headline: 'Kopf', numbers: '- Dauer: 1 min', mcp: 'Quelle: `t.jsonl`', projectFiles: ['b.md'],
    });
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/retro-snapshot.test.js` — erwartet: FAIL `cli_Snapshot_WritesSnapshotOutsideProjectAndNamesDraft` und FAIL `specPaths_ToolPathsAndHumanArguments_NewestFirst` (Modul `../scripts/lib/retro-snapshot` fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-files.js` neu:
  ```js
  'use strict';

  // Ablage von Snapshot und Entwurf je Session außerhalb des Projekts; die Session-Kennung steht im Dateinamen.

  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { RetroError } = require('./transcript');

  function retroDir() {
    return path.join(os.homedir(), '.dv-forge', 'retro');
  }

  function safeId(session) {
    return String(session).replace(/[^\w.-]/g, '_');
  }

  function snapshotPath(session) {
    return path.join(retroDir(), `${safeId(session)}.snapshot.json`);
  }

  function draftPath(session) {
    return path.join(retroDir(), `${safeId(session)}.entwurf.md`);
  }

  function writeSnapshot(snapshot) {
    const file = snapshotPath(snapshot.session);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`);
    return file;
  }

  function parsedSnapshot(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      throw new RetroError(`Snapshot unlesbar: ${file}: ${error.message}`);
    }
  }

  // `transcriptEntries` begrenzt den Korpus der Zitat-Prüfung auf das Protokoll vor der Retrospektive; ohne das Feld
  // prüfte sie gegen nichts oder gegen den eigenen Entwurf.
  function readSnapshot(session) {
    const file = snapshotPath(session);
    if (!fs.existsSync(file)) throw new RetroError(`Snapshot fehlt: ${file}. Zuerst session-facts.js --session ${session} --snapshot aufrufen.`);
    const snapshot = parsedSnapshot(file);
    if (!Number.isInteger(snapshot.transcriptEntries)) throw new RetroError(`Snapshot unlesbar: ${file}: transcriptEntries fehlt`);
    return snapshot;
  }

  module.exports = { retroDir, snapshotPath, draftPath, writeSnapshot, readSnapshot };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  `plugins/forge/scripts/lib/retro-snapshot.js` neu:
  ```js
  'use strict';

  // Angaben zur Session für den Snapshot (Spec-Pfade, angefasste Projekt-Dateien, Branch, Skills) und sein Zusammenbau.

  const fs = require('node:fs');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');

  const SPEC_FILE = /(?:^|[\\/])spec[^\\/]*\.md$|[\\/]specs[\\/][^\\/]+\.md$/i;
  const GENERIC_FILES = new Set(['CLAUDE.md', 'README.md', 'AGENTS.md', 'package.json', 'spec.md', 'plan.md']);
  const PATH_INPUTS = ['file_path', 'notebook_path', 'path'];

  function namedPaths(entries) {
    return entries.filter((entry) => entry.type === 'assistant' && Array.isArray(entry.message?.content))
      .flatMap((entry) => entry.message.content.filter((part) => part.type === 'tool_use')
        .flatMap((part) => PATH_INPUTS.map((key) => part.input?.[key]).filter(Boolean).map((value) => ({ entryNo: entry.entryNo, value: String(value) }))));
  }

  // Spec-Pfade der Session aus Tool-Aufrufen und Eingaben des Menschen, zuletzt genannte zuerst.
  function specPaths(entries, humans) {
    const words = humans.flatMap((event) => event.text.split(/\s+/).map((value) => ({ entryNo: event.entryNo, value })));
    const named = [...namedPaths(entries), ...words].filter(({ value }) => SPEC_FILE.test(value)).sort((a, b) => b.entryNo - a.entryNo);
    return [...new Set(named.map(({ value }) => value))];
  }

  function comparable(file) {
    return process.platform === 'win32' ? file.toLowerCase() : file;
  }

  function insidePlugin(file, root) {
    for (let dir = path.dirname(file); comparable(dir).startsWith(comparable(root)) && dir !== path.dirname(dir); dir = path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, '.claude-plugin', 'plugin.json'))) return true;
    }
    return false;
  }

  function isProjectFile(file, root) {
    const inside = comparable(file).startsWith(comparable(`${root}${path.sep}`));
    return inside && !file.includes(`${path.sep}.claude${path.sep}`) && !insidePlugin(file, root);
  }

  // Dateinamen des Projekts, die die Session anfasste; Plugin-Dateien, `.claude` und allgemeine Namen zählen nicht.
  function projectFiles(entries, cwd) {
    const root = path.resolve(cwd);
    const files = namedPaths(entries).map(({ value }) => path.resolve(root, value)).filter((file) => isProjectFile(file, root));
    return [...new Set(files.map((file) => path.basename(file)))].filter((name) => !GENERIC_FILES.has(name) && /\.\w+$/.test(name));
  }

  function branchOf(entries, cwd) {
    const named = entries.map((entry) => entry.gitBranch).filter(Boolean).pop();
    if (named) return named;
    const result = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8' });
    return result.status === 0 ? result.stdout.trim() : null;
  }

  function skillsOf(facts) {
    const commands = facts.humans.map((event) => event.text.match(/^\/(\S+)/)?.[1]).filter(Boolean);
    return [...new Set([...facts.skills.keys(), ...commands])];
  }

  const MCP_HEADING = /^## MCP-Nutzung \(gemessen\)\n/;

  // Nur Zusammenbau: Zeilen und Zahlen kommen fertig aus session-facts.js, die Angaben zur Session aus den Funktionen oben.
  function buildSnapshot({ id, transcript, ownTranscript, transcriptEntries, cwd, range, facts, headline, numbers, mcp, expect }) {
    return {
      session: id,
      transcript,
      ownTranscript,
      transcriptEntries,
      cwd,
      cut: range.cutTime,
      labels: range.labels,
      branch: branchOf(range.entries, cwd),
      specs: specPaths(range.entries, facts.humans),
      expected: expect,
      model: [...facts.models].join(', '),
      skills: skillsOf(facts),
      headline,
      numbers,
      mcp: mcp.replace(MCP_HEADING, '').trim(),
      projectFiles: projectFiles(range.entries, cwd),
    };
  }

  module.exports = { specPaths, projectFiles, branchOf, skillsOf, buildSnapshot };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) `USAGE` wird zu der folgenden Zeile; die Konstanten `REPORT_FORMAT`, `FACTS_SLOT`, `MCP_SLOT` und `RESULT_SLOT` entfallen:
  ```js
  const USAGE = 'Aufruf: node session-facts.js [--file <session.jsonl>] [--session <id>] [--cwd <projektordner>] [--expect <mcp-server,...>]'
    + ' [--since-command <name>] [--before-retro] [--snapshot] [--lenient]\n';
  ```
  (b) Nach `const { signalHints } = require('./lib/retro-signals');` einfügen:
  ```js
  const { writeSnapshot, draftPath } = require('./lib/retro-files');
  const { buildSnapshot } = require('./lib/retro-snapshot');
  ```
  (c) `FLAGS` und `SWITCHES` werden zu:
  ```js
  const FLAGS = { '--file': 'file', '--session': 'session', '--cwd': 'cwd', '--expect': 'expect', '--since-command': 'sinceCommand' };
  const SWITCHES = { '--before-retro': 'beforeRetro', '--lenient': 'lenient', '--snapshot': 'snapshot' };
  ```
  (d) `skeleton` (samt Kommentar „Berichtsgerüst aus …“) und `writeSkeleton` werden ersetzt durch `ownTranscriptOf`, `headlineOf`, `numbersOf` und `saveSnapshot`:
  ```js
  // Protokoll der eigenen Session: bei `--file` plus `--session` gehört der Snapshot zur eigenen Session.
  function ownTranscriptOf(options, file) {
    if (!options.session || !options.file) return file;
    try {
      return sessionById(projectDir(options.cwd ?? process.cwd()), options.session);
    } catch {
      // Ohne eigenes Protokoll lassen sich später nur die Kosten der Retrospektive nicht messen.
      return null;
    }
  }

  function headlineOf(facts, agents) {
    const agentInput = agents.reduce((sum, agent) => sum + agent.facts.input, 0);
    return `Dauer ${minutes(facts.first, facts.last)} min, Eingaben des Menschen ${facts.turns}, Tokens neu ${thousands(facts.input)} Hauptsession und ${thousands(agentInput)} Subagents`;
  }

  function numbersOf(facts, agents, allFacts) {
    return [...factLines(facts, agents), '', ...measureLines(facts), savingsLists(allFacts).trimEnd()].join('\n');
  }

  // Ein Entwurf eines abgebrochenen früheren Laufs gehört nicht zum neuen Snapshot; so legt das `Write` des Skills die Datei immer neu an.
  function saveSnapshot(snapshot) {
    const written = writeSnapshot(snapshot);
    fs.rmSync(draftPath(snapshot.session), { force: true });
    return `\nSnapshot: ${written}\nEntwurf: ${draftPath(snapshot.session)}\n`;
  }
  ```
  (e) `run` wird ersetzt durch:
  ```js
  // `transcriptEntries` ist der Stand des Hauptprotokolls jetzt, vor der ersten Modell-Anfrage der Retrospektive:
  // Ihr späteres `Write` des Entwurfs gehört damit nie zum Korpus der Zitat-Prüfung.
  function run(options) {
    const { file, warning } = resolveSession(options);
    if (!fs.existsSync(file)) throw new FactsError(`Session-Datei nicht gefunden: ${file}`);
    const entries = readEntries(file);
    const range = rangeOf(entries, options);
    const session = mcpUsage.loadSession(file, { entries: range.entries, keepSubagent: range.keepSubagent });
    const cwd = projectOf(options, session);
    if (options.cwd) session.cwd = options.cwd;
    const expect = [...new Set([...(options.expect ?? []), ...configuredExpect(cwd)])];
    const facts = analyze(range.entries);
    const agents = subagentRows(file, range.keepSubagent);
    const mcp = mcpUsage.render(session, { expect, transcript: file });
    const allFacts = [facts, ...agents.map((agent) => agent.facts)];
    const measured = measuredOf(facts, allFacts, mcpUsage.measure(session, { expect }));
    const output = `${render(file, facts, agents, range.labels)}\n${savings(allFacts)}\n${mcp}\n## Hinweise zu den Signalen\n${signalHints(measured).join('\n')}\n`;
    if (!options.snapshot) return { output, warning };
    const snapshot = buildSnapshot({
      id: options.session ?? path.basename(file, '.jsonl'), transcript: file, ownTranscript: ownTranscriptOf(options, file),
      transcriptEntries: entries.at(-1)?.entryNo ?? 0, cwd, range, facts,
      headline: headlineOf(facts, agents), numbers: numbersOf(facts, agents, allFacts), mcp, expect,
    });
    return { output: `${output}${saveSnapshot(snapshot)}`, warning };
  }
  ```
  (f) `module.exports` wird zu:
  ```js
  module.exports = { projectDir, analyze, readEntries, render, savings, subagentRows, run, parseArgs, resolveSession, projectOf };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js plugins/forge/tests/retro-snapshot.test.js plugins/forge/tests/retro-signals.test.js plugins/forge/tests/retro-measures.test.js plugins/forge/tests/transcript.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-files.js plugins/forge/scripts/lib/retro-snapshot.js plugins/forge/scripts/session-facts.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/retro-snapshot.test.js` · `git commit -m "feat(forge): session-facts writes a snapshot per session instead of a report skeleton"`

---

### Task 12: Entwurf lesen und prüfen

**ACs:** AC-15

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-draft.js`
- Create: `plugins/forge/scripts/lib/retro-corpus.js`
- Create: `plugins/forge/scripts/lib/regexp.js`
- Create: `plugins/forge/tests/lib/retro-draft-fixture.js`
- Test: `plugins/forge/tests/retro-draft.test.js`
- Test: `plugins/forge/tests/retro-corpus.test.js`
- Test: `plugins/forge/tests/regexp.test.js`

**Interfaces:**
- Consumes: `sameServer(used, wanted)` aus `plugins/forge/scripts/mcp-usage.js` (bestehend); Snapshot-Felder `expected`, `projectFiles`, `transcriptEntries`, `labels` aus Task 11.
- Produces: `lib/retro-draft.js` (Format-Parser und Prüfregeln, kein Protokoll-Leser): `SECTIONS: string[]`; `parseDraft(text): { lines: string[], title: string|null, head: string[], sections: Map<string, string[]> }`; `findingsOf(sectionLines: string[] = []): { title: string, fields: Map<string, string> }[]`; `relevanceLines(lines: string[]): { mcp: string, value: string }[]`; `parseTarget(text: string|undefined): { art: string, name: string, isNew: boolean, open: boolean } | null` (die einzige Grammatik der Ziel-Zeile: „<Art> · `<Name>`“, „<Art> · neu: <Arbeitsname>“, „Ziel offen“; die Alt-Form „<Art> · `neu:` …“ und freier Text ergeben `null`); `violations(text, { expected = [], projectFiles = [] }, corpus: string): string[]`; `newTargets(text): { art: string, name: string, finding: string }[]`. · `lib/retro-corpus.js` (Zitat-Korpus der Prüfung, eine Verantwortung; `lib/transcript.js` bleibt beim Lesen des Protokolls): `corpusOf(entries): string` (Rohtext aus Nachrichten, Tool-Eingaben, Tool-Ergebnissen, Harness-Anhängen und `system`-Einträgen; `stringsOf`, `plainText` und `entryText` sind nicht exportiert, `plainText` liest anders als `textOf` auch `tool_use`-Eingaben). · `lib/regexp.js`: `escapeRegExp(text: string): string` (gemeinsame Funktion, Inhalt wie `lib/document-units.js:19`; `lib/retro-draft.js` importiert sie statt einer privaten Kopie; die bestehenden Kopien in `plan-anchors.js`, `forge-config.js` und `lib/document-units.js` bleiben in diesem Plan unangetastet und werden bei Gelegenheit umgestellt). · `tests/lib/retro-draft-fixture.js`: `VALID: string` (regelkonformer Entwurf), `SNAPSHOT: object` (mit `transcriptEntries: 1` und `labels: []`), `CORPUS: string`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/lib/retro-draft-fixture.js` neu:
  ```js
  'use strict';

  // Ein regelkonformer Entwurf, ein passender Snapshot und ein Protokolltext, der das Zitat des Entwurfs enthält.

  const VALID = [
    '# Erfahrungsbericht Planung eines Skripts',
    '',
    '**Lauf:** Der Mensch ließ einen Plan schreiben.',
    '**Ergebnis:** Plan fertig.',
    '',
    '**Relevanz:**',
    '- dev-mcp: verzichtbar in dieser Session.',
    '',
    '## Positiv',
    '',
    '1. **Tests liefen sofort grün.** Beleg: 12 Tests.',
    '',
    '## Reibung',
    '',
    '1. **Suche im Protokoll blockiert.**',
    '   *Situation:* Ein Suchbefehl wurde abgelehnt.',
    '   *Kosten:* 2 Rückfragen.',
    '   *Ursache:* Regel fehlt.',
    '   *Besser gewesen:* Vorher fragen.',
    '   *Vorschlag:* Regel ergänzen.',
    '   *Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)',
    '   *Im Projekt:* Datei `Shift.ts`. Zitat: „Suche einmal freigeben“',
    '',
    '## Sparpotenzial',
    '',
    '1. **Zeitleiste statt Textsuche.**',
    '   *Situation:* Das Protokoll wurde dreimal durchsucht.',
    '   *Ersparnis:* weniger Anfragen · Eindruck',
    '   *Besser gewesen:* Zeitleiste lesen.',
    '   *Vorschlag:* Ein Skript für Ausschnitte.',
    '   *Ziel:* Skript · neu: protokoll-ausschnitt',
    '   *Im Projekt:* nichts',
    '',
    '## Neue Ideen',
    '',
    '- keine',
    '',
    '## Kleinigkeiten',
    '',
    '- keine',
    '',
  ].join('\n');

  const SNAPSHOT = {
    session: 's1', transcript: '', ownTranscript: null, transcriptEntries: 1, cwd: '', cut: null, labels: [], branch: 'feature/lean-retro', specs: [],
    expected: ['dev-mcp'], model: 'claude-x', skills: ['dv-forge:plan-writing'],
    headline: 'Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents',
    numbers: '- Dauer: 10 min · Modelle: claude-x', mcp: 'Quelle: `s1.jsonl`', projectFiles: ['Shift.ts'],
  };

  const CORPUS = 'Der Mensch schrieb: Suche einmal   freigeben, bitte.';

  module.exports = { VALID, SNAPSHOT, CORPUS };
  ```
  `plugins/forge/tests/retro-draft.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { violations, newTargets, parseTarget } = require('../scripts/lib/retro-draft');
  const { VALID, SNAPSHOT, CORPUS } = require('./lib/retro-draft-fixture');

  function check(text, snapshot = SNAPSHOT) {
    return violations(text, snapshot, CORPUS);
  }

  test('violations_ValidDraft_None', () => {
    assert.deepEqual(check(VALID), []);
  });

  test('violations_MissingSectionAndHeadField_BothReported', () => {
    const draft = VALID.replace('**Lauf:** Der Mensch ließ einen Plan schreiben.\n', '').replace('## Kleinigkeiten\n', '');

    const found = check(draft);

    assert.deepEqual(found, ['Pflichtfeld fehlt: **Lauf:**', 'Pflichtabschnitt fehlt: ## Kleinigkeiten']);
  });

  test('violations_MissingFindingField_NamesSectionNumberAndTitle', () => {
    const found = check(VALID.replace('   *Ursache:* Regel fehlt.\n', ''));

    assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: Pflichtfeld fehlt: *Ursache:*']);
  });

  test('violations_TargetInNoForm_Reported', () => {
    const found = check(VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* ein Skill für Pläne'));

    assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: Ziel-Zeile folgt keiner der Formen „<Art> · `<Name>`“, „<Art> · neu: <Arbeitsname>“, „Ziel offen“']);
  });

  test('violations_TargetOpenOrNewHook_Accepted', () => {
    const open = VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* Ziel offen');
    const hook = VALID.replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* Hook · neu: test-weg-guard');

    assert.deepEqual([check(open), check(hook)], [[], []]);
  });

  test('violations_SavingWithoutNumberOrImpression_Reported', () => {
    const found = check(VALID.replace('*Ersparnis:* weniger Anfragen · Eindruck', '*Ersparnis:* weniger Anfragen'));

    assert.deepEqual(found, ['Sparpotenzial 1 „Zeitleiste statt Textsuche“: *Ersparnis:* ohne Zahl und ohne „· Eindruck“']);
  });

  test('violations_CostWithoutNumberOrImpression_Reported', () => {
    const found = check(VALID.replace('*Kosten:* 2 Rückfragen.', '*Kosten:* viele Rückfragen.'));

    assert.deepEqual(found, ['Reibung 1 „Suche im Protokoll blockiert“: *Kosten:* ohne Zahl und ohne „· Eindruck“']);
  });

  test('violations_CostAsImpression_Accepted', () => {
    assert.deepEqual(check(VALID.replace('*Kosten:* 2 Rückfragen.', '*Kosten:* viele Rückfragen · Eindruck')), []);
  });

  test('violations_ExpectedMcpWithoutRelevance_Reported', () => {
    const found = check(VALID, { ...SNAPSHOT, expected: ['dev-mcp', 'codebase-analyzer'] });

    assert.deepEqual(found, ['Relevanz-Zeile fehlt für erwartetes MCP: codebase-analyzer']);
  });

  test('violations_ProjectFileOutsideProjectField_ReportedWithLine', () => {
    const found = check(VALID.replace('*Situation:* Ein Suchbefehl wurde abgelehnt.', '*Situation:* Ein Suchbefehl in Shift.ts wurde abgelehnt.'));

    assert.deepEqual(found, ['Projekt-Dateiname außerhalb von *Im Projekt:*: Shift.ts (Zeile 16)']);
  });

  test('violations_QuoteNotInProtocol_Reported', () => {
    const found = check(VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Das hat niemand gesagt“'));

    assert.deepEqual(found, ['Zitat steht nicht im Protokoll: „Das hat niemand gesagt“ (Zeile 22)']);
  });

  test('violations_ThreeDefects_EachReportedSeparately', () => {
    const draft = VALID.replace('   *Ursache:* Regel fehlt.\n', '').replace('*Ersparnis:* weniger Anfragen · Eindruck', '*Ersparnis:* weniger').replace('## Positiv\n', '');

    assert.equal(check(draft).length, 3);
  });

  test('newTargets_NewTarget_CollectedWithArtAndFinding', () => {
    assert.deepEqual(newTargets(VALID), [{ art: 'Skript', name: 'protokoll-ausschnitt', finding: 'Zeitleiste statt Textsuche' }]);
  });

  test('parseTarget_ThreeForms_ArtNameAndKind', () => {
    const parsed = ['Skill · `dv-forge:plan-writing` (schreibt Pläne)', 'Skript · neu: protokoll-ausschnitt (klein)', 'Ziel offen'].map(parseTarget);

    assert.deepEqual(parsed, [
      { art: 'Skill', name: 'dv-forge:plan-writing', isNew: false, open: false },
      { art: 'Skript', name: 'protokoll-ausschnitt', isNew: true, open: false },
      { art: '', name: '', isNew: false, open: true },
    ]);
  });

  test('parseTarget_LegacyNewFormOrFreeText_Null', () => {
    assert.deepEqual(['Skript · `neu:` Skript · wait-results', 'ein Skill für Pläne', undefined].map(parseTarget), [null, null, null]);
  });
  ```
  `plugins/forge/tests/retro-corpus.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { corpusOf } = require('../scripts/lib/retro-corpus');

  test('corpusOf_TextResultsAndInputs_JoinedAsPlainText', () => {
    const entries = [
      { type: 'user', message: { content: 'Hallo' } },
      { type: 'assistant', message: { content: [{ type: 'text', text: 'Antwort' }, { type: 'tool_use', name: 'Bash', input: { command: 'ls' } }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', content: [{ type: 'text', text: 'datei.txt' }] }] } },
    ];

    assert.equal(corpusOf(entries), 'Hallo\nAntwort\nls\ndatei.txt');
  });

  test('corpusOf_QuotedCommandHookTextAndSystemEntry_KeptVerbatim', () => {
    const entries = [
      { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'git commit -m "fix: x"' } }] } },
      { type: 'attachment', attachment: { type: 'hook_additional_context', content: ['Hook sagt: Tests zuerst'] } },
      { type: 'system', subtype: 'informational', content: 'Kontext wird knapp' },
    ];

    const corpus = corpusOf(entries);

    assert.deepEqual(['git commit -m "fix: x"', 'Hook sagt: Tests zuerst', 'Kontext wird knapp'].map((text) => corpus.includes(text)), [true, true, true]);
  });
  ```
  `plugins/forge/tests/regexp.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { escapeRegExp } = require('../scripts/lib/regexp');

  test('escapeRegExp_SpecialCharacters_MatchedLiterally', () => {
    const name = 'a.b*(c)[d]+?^$|{e}\\f';

    assert.equal(new RegExp(`^${escapeRegExp(name)}$`).test(name), true);
  });

  test('escapeRegExp_Dot_DoesNotMatchOtherCharacter', () => {
    assert.equal(new RegExp(`^${escapeRegExp('Shift.ts')}$`).test('Shift_ts'), false);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-draft.test.js plugins/forge/tests/retro-corpus.test.js plugins/forge/tests/regexp.test.js` — erwartet: FAIL `violations_ValidDraft_None` (Modul `../scripts/lib/retro-draft` fehlt), FAIL `corpusOf_TextResultsAndInputs_JoinedAsPlainText` (Modul `../scripts/lib/retro-corpus` fehlt) und FAIL `escapeRegExp_SpecialCharacters_MatchedLiterally` (Modul `../scripts/lib/regexp` fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/regexp.js` neu:
  ```js
  'use strict';

  // Gemeinsame Hilfe für reguläre Ausdrücke aus freiem Text.

  // Maskiert alle Sonderzeichen, damit `text` in einem RegExp wörtlich passt.
  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  module.exports = { escapeRegExp };
  ```
  `plugins/forge/scripts/lib/retro-draft.js` neu:
  ```js
  'use strict';

  // Liest den Entwurf eines Erfahrungsberichts und prüft ihn gegen das Berichtsformat.

  const { sameServer } = require('../mcp-usage');
  const { escapeRegExp } = require('./regexp');

  const SECTIONS = ['Positiv', 'Reibung', 'Sparpotenzial', 'Neue Ideen', 'Kleinigkeiten'];
  const HEAD_FIELDS = ['**Lauf:**', '**Ergebnis:**', '**Relevanz:**'];
  const FIELDS = {
    Reibung: ['Situation', 'Kosten', 'Ursache', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
    Sparpotenzial: ['Situation', 'Ersparnis', 'Besser gewesen', 'Vorschlag', 'Ziel', 'Im Projekt'],
  };
  const AMOUNT = { Reibung: 'Kosten', Sparpotenzial: 'Ersparnis' };
  const ART = '(Plugin|Skill|Agent|CLAUDE\\.md|Hook|Skript|MCP)';
  const NAMED_TARGET = new RegExp(`^${ART} · \`([^\`]+)\``);
  const NEW_TARGET = new RegExp(`^${ART} · neu: (.+?)\\s*(?:[·(]|$)`);
  const OPEN_TARGET = /^Ziel offen\b/;
  const LEGACY_NEW_NAME = 'neu:';
  const FINDING = /^\d+\.\s+\*\*(.+?)\*\*/;
  const FIELD = /^\s+\*([^*]+):\*\s?(.*)$/;
  const PROJECT_FIELD = /^\s*\*Im Projekt:\*/;
  const RELEVANCE_LINE = /^- `?([^:`]+)`?:\s*(.*)$/;
  const QUOTE = /„([^“”]+)[“”]|"([^"]+)"/g;

  function parseDraft(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const firstSection = lines.findIndex((line) => /^## /.test(line));
    const sections = new Map();
    let current = null;
    for (const line of lines) {
      const heading = line.match(/^## (.+?)\s*$/);
      if (heading) sections.set(current = heading[1], []);
      else if (current) sections.get(current).push(line);
    }
    return {
      lines,
      title: lines.find((line) => /^# /.test(line)) ?? null,
      head: lines.slice(0, firstSection === -1 ? lines.length : firstSection),
      sections,
    };
  }

  function findingsOf(sectionLines = []) {
    const findings = [];
    for (const line of sectionLines) {
      const start = line.match(FINDING);
      if (start) findings.push({ title: start[1].replace(/\.$/, ''), fields: new Map() });
      const field = line.match(FIELD);
      if (field && findings.length > 0) findings[findings.length - 1].fields.set(field[1].trim(), field[2].trim());
    }
    return findings;
  }

  // Zeilen `- <mcp>: <wert>` direkt unter **Relevanz:**; Leerzeilen davor zählen nicht.
  function relevanceLines(lines) {
    const start = lines.findIndex((line) => line.startsWith('**Relevanz:**'));
    if (start === -1) return [];
    const found = [];
    for (const line of lines.slice(start + 1)) {
      const match = line.match(RELEVANCE_LINE);
      if (match) found.push({ mcp: match[1].trim(), value: match[2].trim() });
      else if (line.trim() !== '' || found.length > 0) break;
    }
    return found;
  }

  // Die einzige Grammatik der Ziel-Zeile. Die Alt-Form „<Art> · `neu:` …“ lässt die Prüfung nicht mehr zu: null wie freier Text.
  function parseTarget(text) {
    const value = String(text ?? '').trim();
    if (OPEN_TARGET.test(value)) return { art: '', name: '', isNew: false, open: true };
    const fresh = value.match(NEW_TARGET);
    if (fresh) return { art: fresh[1], name: fresh[2].trim(), isNew: true, open: false };
    const named = value.match(NAMED_TARGET);
    if (!named || named[2] === LEGACY_NEW_NAME) return null;
    return { art: named[1], name: named[2], isNew: false, open: false };
  }

  function findingViolations(section, number, finding) {
    const where = `${section} ${number} „${finding.title}“`;
    const found = FIELDS[section].filter((field) => !finding.fields.has(field)).map((field) => `${where}: Pflichtfeld fehlt: *${field}:*`);
    const target = finding.fields.get('Ziel');
    if (target !== undefined && !parseTarget(target)) {
      found.push(`${where}: Ziel-Zeile folgt keiner der Formen „<Art> · \`<Name>\`“, „<Art> · neu: <Arbeitsname>“, „Ziel offen“`);
    }
    const amount = finding.fields.get(AMOUNT[section]);
    if (amount !== undefined && !/\d/.test(amount) && !/· Eindruck\s*$/.test(amount)) {
      found.push(`${where}: *${AMOUNT[section]}:* ohne Zahl und ohne „· Eindruck“`);
    }
    return found;
  }

  function structureViolations(draft) {
    const found = [];
    if (!draft.title || !/^# Erfahrungsbericht\b/.test(draft.title)) found.push('Pflichtfeld fehlt: Titel „# Erfahrungsbericht …“');
    found.push(...HEAD_FIELDS.filter((field) => !draft.head.some((line) => line.startsWith(field))).map((field) => `Pflichtfeld fehlt: ${field}`));
    found.push(...SECTIONS.filter((section) => !draft.sections.has(section)).map((section) => `Pflichtabschnitt fehlt: ## ${section}`));
    return found;
  }

  function relevanceViolations(draft, expected) {
    const named = relevanceLines(draft.head).map((line) => line.mcp);
    return expected.filter((name) => !named.some((line) => sameServer(line, name) || sameServer(name, line)))
      .map((name) => `Relevanz-Zeile fehlt für erwartetes MCP: ${name}`);
  }

  function projectNameViolations(lines, projectFiles) {
    return lines.flatMap((line, index) => {
      if (PROJECT_FIELD.test(line)) return [];
      return projectFiles.filter((name) => new RegExp(`(?<![\\w.-])${escapeRegExp(name)}(?![\\w-])`).test(line))
        .map((name) => `Projekt-Dateiname außerhalb von *Im Projekt:*: ${name} (Zeile ${index + 1})`);
    });
  }

  function normalized(text) {
    return String(text).replace(/\s+/g, ' ').trim();
  }

  // Zitate in „…“ oder "…" unter *Im Projekt:*; Code in Backticks ist kein Zitat.
  function quoteViolations(lines, corpus) {
    const text = normalized(corpus);
    return lines.flatMap((line, index) => {
      if (!PROJECT_FIELD.test(line)) return [];
      return [...line.replace(/`[^`]*`/g, '').matchAll(QUOTE)].map((match) => normalized(match[1] ?? match[2]))
        .filter((quote) => !text.includes(quote))
        .map((quote) => `Zitat steht nicht im Protokoll: „${quote}“ (Zeile ${index + 1})`);
    });
  }

  // Alle Verstöße einzeln; `corpus` ist der Text des Protokolls, gegen den die Zitate geprüft werden.
  function violations(text, { expected = [], projectFiles = [] }, corpus) {
    const draft = parseDraft(text);
    const findings = Object.keys(FIELDS).flatMap((section) => findingsOf(draft.sections.get(section))
      .flatMap((finding, index) => findingViolations(section, index + 1, finding)));
    return [
      ...structureViolations(draft),
      ...findings,
      ...relevanceViolations(draft, expected),
      ...projectNameViolations(draft.lines, projectFiles),
      ...quoteViolations(draft.lines, corpus),
    ];
  }

  function newTargets(text) {
    const draft = parseDraft(text);
    return Object.keys(FIELDS).flatMap((section) => findingsOf(draft.sections.get(section)).flatMap((finding) => {
      const target = parseTarget(finding.fields.get('Ziel'));
      return target?.isNew ? [{ art: target.art, name: target.name, finding: finding.title }] : [];
    }));
  }

  module.exports = { SECTIONS, parseDraft, findingsOf, relevanceLines, parseTarget, violations, newTargets };
  ```
  `plugins/forge/scripts/lib/retro-corpus.js` neu:
  ```js
  'use strict';

  // Der Text eines Protokolls, gegen den die Zitate eines Entwurfs geprüft werden.

  // Alle Texte eines Werts als Rohtext, ohne JSON-Maskierung von Anführungszeichen, Zeilenumbrüchen und Backslashes.
  function stringsOf(value) {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(stringsOf);
    if (value && typeof value === 'object') return Object.values(value).flatMap(stringsOf);
    return [];
  }

  // Wie `textOf`, liest aber auch Tool-Eingaben und verschachtelte Tool-Ergebnisse.
  function plainText(content) {
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'tool_use') return stringsOf(part.input).join('\n');
      if (part?.type === 'tool_result') return plainText(part.content);
      return part?.text ?? '';
    }).join('\n');
  }

  // Zitate dürfen aus Nachrichten, Tool-Eingaben, Harness-Anhängen (Hook-Texte, eingeblendete Anweisungen) und system-Einträgen stammen.
  function entryText(entry) {
    if (entry.attachment) return stringsOf(entry.attachment).join('\n');
    if (entry.type === 'system') return stringsOf(entry.content).join('\n');
    return plainText(entry.message?.content);
  }

  // Der ganze Text eines Protokolls, gegen den die Zitate eines Entwurfs geprüft werden.
  function corpusOf(entries) {
    return entries.map(entryText).filter(Boolean).join('\n');
  }

  module.exports = { corpusOf };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-draft.test.js plugins/forge/tests/retro-corpus.test.js plugins/forge/tests/regexp.test.js plugins/forge/tests/transcript.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-draft.js plugins/forge/scripts/lib/retro-corpus.js plugins/forge/scripts/lib/regexp.js plugins/forge/tests/lib/retro-draft-fixture.js plugins/forge/tests/retro-draft.test.js plugins/forge/tests/retro-corpus.test.js plugins/forge/tests/regexp.test.js` · `git commit -m "feat(forge): check a retrospective draft against the report format"`

---

### Task 13: Bericht aus Entwurf und Snapshot zusammensetzen

**ACs:** AC-16

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-compose.js`
- Test: `plugins/forge/tests/retro-compose.test.js`

**Interfaces:**
- Consumes: aus Task 12 `parseDraft(text)`, `newTargets(text)`, `VALID`, `SNAPSHOT`; Snapshot-Felder `model`, `skills`, `headline`, `numbers`, `mcp` aus Task 11.
- Produces: `lib/retro-compose.js`: `compose(text: string, snapshot: object, date: string): string` — Titel, `**Session:** Modell <m> · Skills <s> · <datum>`, Lauf und Ergebnis, `**Kennzahlen:** <headline>.`, `## Zahlen`, `## MCP-Nutzung`, Relevanz, dann die Abschnitte des Entwurfs; „Neue Ideen“ nennt jedes `neu:`-Ziel genau einmal.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-compose.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { compose } = require('../scripts/lib/retro-compose');
  const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');

  function section(text, name) {
    const start = text.indexOf(`## ${name}\n`);
    const end = text.indexOf('\n## ', start + 1);
    return text.slice(start, end === -1 ? text.length : end);
  }

  test('compose_Header_ModelSkillsDateAndScriptNumbersBeforeSections', () => {
    const text = compose(VALID, SNAPSHOT, '2026-09-29');

    assert.ok(text.startsWith([
      '# Erfahrungsbericht Planung eines Skripts',
      '',
      '**Session:** Modell claude-x · Skills dv-forge:plan-writing · 2026-09-29',
      '**Lauf:** Der Mensch ließ einen Plan schreiben.',
      '**Ergebnis:** Plan fertig.',
      '**Kennzahlen:** Dauer 10 min, Eingaben des Menschen 2, Tokens neu 2k Hauptsession und 1k Subagents.',
      '',
      '## Zahlen',
      '- Dauer: 10 min · Modelle: claude-x',
      '',
      '## MCP-Nutzung',
      '',
      'Quelle: `s1.jsonl`',
      '',
      '**Relevanz:**',
      '- dev-mcp: verzichtbar in dieser Session.',
      '',
      '## Positiv',
      '',
      '1. **Tests liefen sofort grün.** Beleg: 12 Tests.',
    ].join('\n')));
  });

  test('compose_NewTargetMissingInIdeas_AddedAndNoneRemoved', () => {
    const ideas = section(compose(VALID, SNAPSHOT, '2026-09-29'), 'Neue Ideen');

    assert.equal(ideas, '## Neue Ideen\n\n- **protokoll-ausschnitt** (`neu:` Skript): sichtbar geworden an „Zeitleiste statt Textsuche“\n');
  });

  test('compose_NewTargetNamedTwiceInIdeas_KeptOnce', () => {
    const idea = '- **protokoll-ausschnitt** (`neu:` Skript): schon da';
    const draft = VALID.replace('## Neue Ideen\n\n- keine\n', `## Neue Ideen\n\n${idea}\n${idea}\n`);

    const text = compose(draft, SNAPSHOT, '2026-09-29');

    assert.equal(text.split('- **protokoll-ausschnitt**').length - 1, 1);
  });

  test('compose_Sections_KeptInDraftOrderAndEndWithOneNewline', () => {
    const text = compose(VALID, SNAPSHOT, '2026-09-29');

    const headings = text.split('\n').filter((line) => line.startsWith('## '));

    assert.deepEqual(headings, ['## Zahlen', '## MCP-Nutzung', '## Positiv', '## Reibung', '## Sparpotenzial', '## Neue Ideen', '## Kleinigkeiten']);
    assert.ok(text.endsWith('- keine\n'));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-compose.test.js` — erwartet: FAIL `compose_Header_ModelSkillsDateAndScriptNumbersBeforeSections` (Modul fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-compose.js` neu:
  ```js
  'use strict';

  // Setzt aus einem geprüften Entwurf und dem Snapshot der Session den Erfahrungsbericht zusammen.

  const { parseDraft, newTargets } = require('./retro-draft');

  const IDEA = /^- \*\*(.+?)\*\*/;

  function trimBlank(lines) {
    let start = 0;
    let end = lines.length;
    while (start < end && lines[start].trim() === '') start += 1;
    while (end > start && lines[end - 1].trim() === '') end -= 1;
    return lines.slice(start, end);
  }

  function withAppended(lines, added) {
    let end = lines.length;
    while (end > 0 && lines[end - 1].trim() === '') end -= 1;
    const lead = end === 0 ? [''] : [];
    return [...lead, ...lines.slice(0, end), ...added, ...lines.slice(end)];
  }

  function withoutDuplicateIdeas(lines) {
    const seen = new Set();
    return lines.filter((line) => {
      const name = line.match(IDEA)?.[1];
      if (!name) return true;
      const first = !seen.has(name);
      seen.add(name);
      return first;
    });
  }

  // „Neue Ideen“ nennt jedes neu:-Ziel genau einmal: fehlende hängt das Skript an, doppelte fallen weg.
  function ideaLines(sectionLines, targets) {
    const kept = withoutDuplicateIdeas(sectionLines);
    const named = new Set(kept.map((line) => line.match(IDEA)?.[1]).filter(Boolean));
    const missing = [...new Map(targets.filter((target) => !named.has(target.name)).map((target) => [target.name, target])).values()];
    if (missing.length === 0) return kept;
    const added = missing.map((target) => `- **${target.name}** (\`neu:\` ${target.art}): sichtbar geworden an „${target.finding}“`);
    return withAppended(kept.filter((line) => line.trim() !== '- keine'), added);
  }

  function headerLine(snapshot, date) {
    return `**Session:** Modell ${snapshot.model || '?'} · Skills ${snapshot.skills.join(', ') || '-'} · ${date}`;
  }

  function compose(text, snapshot, date) {
    const draft = parseDraft(text);
    const titleAt = draft.head.findIndex((line) => /^# /.test(line));
    const relevanceAt = draft.head.findIndex((line) => line.startsWith('**Relevanz:**'));
    const targets = newTargets(text);
    const sections = [...draft.sections.entries()]
      .flatMap(([name, lines]) => [`## ${name}`, ...(name === 'Neue Ideen' ? ideaLines(lines, targets) : lines)]);
    return [
      draft.title,
      '',
      headerLine(snapshot, date),
      ...trimBlank(draft.head.slice(titleAt + 1, relevanceAt)),
      `**Kennzahlen:** ${snapshot.headline}.`,
      '',
      '## Zahlen',
      snapshot.numbers,
      '',
      '## MCP-Nutzung',
      '',
      snapshot.mcp,
      '',
      ...trimBlank(draft.head.slice(relevanceAt)),
      '',
      ...sections,
    ].join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
  }

  module.exports = { compose };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-compose.test.js plugins/forge/tests/retro-draft.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-compose.js plugins/forge/tests/retro-compose.test.js` · `git commit -m "feat(forge): compose the experience report from draft and snapshot"`

---

### Task 14: Skript für Berichtsformat und Bericht

**ACs:** AC-14, AC-15, AC-16, AC-18, AC-19

**Dateien:**
- Create: `plugins/forge/scripts/retro-report.js`
- Create: `plugins/forge/scripts/lib/session-files.js`
- Create: `plugins/forge/scripts/lib/retro-secrets.js`
- Modify: `plugins/forge/scripts/mcp-usage.js` · `const os = require('node:os');`, `const { readEntries } = require('./lib/transcript');`, `function configDir`, `function findTranscript`, `function subagentFiles`, `const transcript = args.transcript ?? findTranscript(args.session);`
- Modify: `plugins/forge/scripts/session-facts.js` · `function subagentRows`, `const { rangeOf } = require('./lib/retro-range');`
- Test: `plugins/forge/tests/retro-report.test.js`
- Test: `plugins/forge/tests/session-files.test.js`
- Test: `plugins/forge/tests/retro-secrets.test.js`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_File_RendersFactsAndSubagents`

**Interfaces:**
- Consumes: aus Task 11 `draftPath`, `readSnapshot`, `snapshotPath`, Snapshot-Feld `transcriptEntries`; Task 12 `violations`, `VALID`, `SNAPSHOT`, `corpusOf` in `lib/retro-corpus.js` und `escapeRegExp` in `lib/regexp.js`; Task 13 `compose`; Task 1 `RetroError`, `readEntries`, Fixtures `human`, `request`, `call`, `writeSession`; `findTranscript(sessionId, projectsDir)`, `configDir()` und `subagentFiles(transcript): string[]` aus `mcp-usage.js` (bestehend, `mcp-usage.js:37`, `:41`, `:71`; ziehen hier nach `lib/session-files.js` um).
- Produces: `retro-report.js` CLI `--format` (gibt `skills/prozess-retrospektive/references/report-format.md` unverändert aus) und `--session <id> --topic <thema> [--cwd <projektordner>]`; Exit 2 bei falschem Aufruf oder Thema, Exit 1 bei fehlendem oder unlesbarem Snapshot, fehlendem Entwurf, Verstößen, nicht schreibbarem Berichtsordner oder fehlendem Projektordner. Ohne `--cwd` ist der Projektordner das `cwd` des Snapshots (Task 8 `projectOf`); existiert er nicht, etwa weil das Protokoll von einer anderen Maschine oder aus einem gelöschten Worktree stammt, endet der Aufruf mit Exit 1, `Projektordner fehlt: <cwd>; das Protokoll stammt aus einem anderen Projekt oder einer anderen Maschine, mit --cwd <projektordner> angeben` und ohne angelegte Ordner. Exporte `parseArgs(args): object` (wirft `UsageError`), `localDate(now = new Date()): string`, `removeLeftovers(files: string[]): string[]` (löscht jede Datei, liefert je gescheitertem Löschen eine Zeile `Warnung: <pfad> nicht gelöscht (…)`, wirft nie), `build(options): { file: string, cwd: string, text: string, snapshot: object, warnings: string[] }`. Scheitert nach dem Schreiben des Berichts das Löschen von Entwurf oder Snapshot, endet der Aufruf trotzdem mit Exit 0, nennt den Bericht und schreibt die Warnungen auf stderr. Zitate werden gegen das Protokoll der Hauptsession bis Eintrag `transcriptEntries` des Snapshots und gegen die ganzen Protokolle ihrer Subagents geprüft, sodass das spätere `Write` des Entwurfs (oder ein Bash-Heredoc) nie als Beleg zählt; fehlt das Protokoll, Exit 1 mit `Protokoll fehlt: <pfad>; …` und ohne Berichtsdatei. Vor dem Schreiben prüft `build` den fertigen Berichtstext mit `secretViolations`; jeder Treffer steht als eigene Zeile `- Geheimnis im Bericht: <art> in Zeile <n>: <zeile mit *** statt des Werts>` unter `Prüfung: <n> Verstöße, keine Berichtsdatei geschrieben`, der Wert selbst erscheint nie in der Meldung, Exit 1, keine Berichtsdatei, Entwurf und Snapshot bleiben. Die Zeile `Quelle:` der MCP-Nutzung nennt im Bericht nur den Dateinamen des Protokolls, nie den absoluten Pfad mit dem Benutzerordner; Pfade unter dem Projektordner des Snapshots (`snapshot.cwd`) stehen unter Zahlen relativ zu ihm, etwa in „Größte Tool-Ergebnisse“ und „Mehrfach gelesene Dateien“. Pfade außerhalb des Projektordners (etwa unter `~/.claude`) bleiben unverändert. · `lib/retro-secrets.js` (was ein committeter Bericht nicht tragen darf, eine Verantwortung): `secretViolations(text: string): string[]` erkennt `password`, `passwort`, `passwd`, `secret`, `token`, `api_key`/`api-key`/`apikey`, auch als Endung eines Namens (`API_TOKEN`, `DB_PASSWORD`, `NPM_TOKEN`, `CLIENT_SECRET`), mit `:` oder `=` und einem Wert ab 8 Zeichen, `Bearer <wert>`, Zugangsdaten in URLs (`://user:pass@`), AWS-Schlüssel (`AKIA…`) und GitHub-Tokens (`ghp_…`, `gho_…`, `ghu_…`, `ghs_…`, `ghr_…`). Bekannte Grenze: Tokens ohne Schlüsselwort und ohne bekanntes Präfix (etwa Azure-DevOps-PATs als nackter Wert) erkennt die Prüfung nicht, ein Muster ohne Präfix träfe beliebige lange Zeichenfolgen wie Hashes und Kennungen. `withFileNameSource(mcp: string): string` kürzt den Pfad in `Quelle: \`…\`` auf den Dateinamen (Trenner `/` und `\`); `relativeToProject(text: string, cwd: string|undefined): string` entfernt `<cwd>` samt folgendem Trenner vor jedem Pfad (Trenner `/` und `\` beliebig gemischt, bei einem Laufwerksbuchstaben ohne Groß-/Kleinschreibung), ohne `cwd` oder bei leerem Ordnernamen bleibt der Text gleich. · `lib/session-files.js` (Ortung der Protokolldateien, eine Verantwortung): `findTranscript(sessionId: string, projectsDir = path.join(configDir(), 'projects')): string` (wirft `RetroError`, wenn keine Datei gefunden), `subagentFiles(transcript: string): string[]`; `configDir` bleibt intern. `mcp-usage.js` importiert beide von dort und exportiert `findTranscript` unverändert weiter, `module.exports` bleibt gleich, `mcp-usage.test.js` und `session-facts.js` (`sessionById`) brechen nicht; `main` wandelt den `RetroError` aus `findTranscript` in seinen `UsageError`, Meldung und Exit 1 bleiben. `retro-report.js` und `subagentRows` in `session-facts.js` finden die Subagent-Protokolle nur noch über `lib/session-files.js`, der Ordneraufbau `<protokoll>/subagents/*.jsonl` steht damit an einer Stelle. · `session-facts.js`: `readMeta(metaFile: string): object` (intern) liest eine `.meta.json` und gibt bei fehlender, leerer oder halb geschriebener Datei `{}` zurück; die Zeile fällt dann auf `description = basename`, `type = '?'` und das Modell aus den Fakten zurück.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-report.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { localDate, removeLeftovers } = require('../scripts/retro-report');
  const { human, request, call, writeSession } = require('./lib/retro-session');
  const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-report.js');
  const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');

  function setup({ draft = VALID, snapshot = {} } = {}) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
    const project = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
    const transcript = writeSession([human('Suche einmal freigeben', '10:00')]);
    const dir = path.join(home, '.dv-forge', 'retro');
    fs.mkdirSync(dir, { recursive: true });
    if (snapshot !== null) fs.writeFileSync(path.join(dir, 's1.snapshot.json'), JSON.stringify({ ...SNAPSHOT, transcript, ownTranscript: transcript, cwd: project, ...snapshot }));
    if (draft !== null) fs.writeFileSync(path.join(dir, 's1.entwurf.md'), draft);
    return { home, project, dir, transcript };
  }

  function report(env, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: env.home, USERPROFILE: env.home } });
  }

  function wishes(env) {
    return path.join(env.project, 'docs', 'wishes');
  }

  test('cli_Format_PrintsReportFormatUnchanged', () => {
    const result = report(setup(), '--format');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, fs.readFileSync(REPORT_FORMAT, 'utf8'));
  });

  test('cli_InvalidTopic_AbortsWithUsageAndWritesNothing', () => {
    const env = setup();
    for (const topic of ['Gross', 'mit leer', 'ümlaut', 'a/b', '', '-x', 'x-']) {
      const result = report(env, '--session', 's1', '--topic', topic);

      assert.equal(result.status, 2, topic);
      assert.match(result.stderr, /Aufruf: node retro-report\.js/);
    }
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_MissingTopic_AbortsWithUsage', () => {
    const result = report(setup(), '--session', 's1');

    assert.equal(result.status, 2);
    assert.match(result.stderr, /--topic fehlt/);
  });

  test('cli_MissingDraft_NamesItsPath', () => {
    const env = setup({ draft: null });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`Entwurf fehlt: ${path.join(env.dir, 's1.entwurf.md')}`));
  });

  test('cli_MissingSnapshot_NoReportAndExitOne', () => {
    const env = setup({ snapshot: null });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Snapshot fehlt: /);
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_UnreadableSnapshot_NoReportAndExitOne', () => {
    const env = setup();
    fs.writeFileSync(path.join(env.dir, 's1.snapshot.json'), 'kein json');

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Snapshot unlesbar: /);
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_SnapshotWithoutEntryCount_NoReportAndExitOne', () => {
    const env = setup({ snapshot: { transcriptEntries: null } });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Snapshot unlesbar: .*transcriptEntries fehlt/);
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_QuoteOnlyInDraftWriteAfterSnapshot_ReportedAsNotInProtocol', () => {
    const draft = VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Das hat niemand gesagt“');
    const env = setup({ draft });
    const write = request('r9', '10:05', [call('w1', 'Write', { file_path: path.join(env.dir, 's1.entwurf.md'), content: draft })]);
    fs.appendFileSync(env.transcript, `${JSON.stringify(write)}\n`);

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Zitat steht nicht im Protokoll: „Das hat niemand gesagt“/);
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_DraftWithViolations_ListsEachAndWritesNothing', () => {
    const draft = VALID.replace('## Kleinigkeiten\n', '').replace('*Ziel:* Skill · `dv-forge:plan-writing` (schreibt Pläne)', '*Ziel:* ein Skill');
    const env = setup({ draft });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Prüfung: 2 Verstöße, keine Berichtsdatei geschrieben\n- Pflichtabschnitt fehlt: ## Kleinigkeiten\n- Reibung 1 /);
    assert.equal(fs.existsSync(wishes(env)), false);
    assert.ok(fs.existsSync(path.join(env.dir, 's1.entwurf.md')));
  });

  test('cli_ValidDraft_WritesDatedReportAndDeletesDraft', () => {
    const env = setup();

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 0, result.stderr);
    const file = path.join(wishes(env), `${localDate()}-planung.md`);
    assert.ok(result.stdout.includes(`Bericht: ${file}`));
    assert.match(result.stdout, /Prüfung: 0 Verstöße/);
    assert.match(fs.readFileSync(file, 'utf8'), /^# Erfahrungsbericht Planung eines Skripts\n[\s\S]*## Zahlen\n- Dauer: 10 min/);
    assert.equal(fs.existsSync(path.join(env.dir, 's1.entwurf.md')), false);
  });

  test('cli_ExistingReports_AddsNextCounter', () => {
    const env = setup();
    fs.mkdirSync(wishes(env), { recursive: true });
    fs.writeFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'alt');
    fs.writeFileSync(path.join(wishes(env), `${localDate()}-planung-2.md`), 'alt');

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(wishes(env), `${localDate()}-planung-3.md`)));
  });

  test('cli_QuoteFromSubagent_AcceptedAsProtocolText', () => {
    const env = setup({ draft: VALID.replace('Zitat: „Suche einmal freigeben“', 'Zitat: „Agent fand drei Treffer“') });
    const agents = path.join(env.transcript.slice(0, -'.jsonl'.length), 'subagents');
    fs.mkdirSync(agents, { recursive: true });
    fs.writeFileSync(path.join(agents, 'a1.jsonl'), `${JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Agent fand drei Treffer' }] } })}\n`);

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 0, result.stderr);
  });

  test('cli_MissingProtocol_NamesPathAndWritesNothing', () => {
    const env = setup();
    fs.rmSync(env.transcript);

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`Protokoll fehlt: ${env.transcript}`));
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_SnapshotCwdMissing_NamesCwdFlagAndWritesNothing', () => {
    const missing = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-gone-')), 'worktree');
    const env = setup({ snapshot: { cwd: missing } });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(`Projektordner fehlt: ${missing}; das Protokoll stammt aus einem anderen Projekt oder einer anderen Maschine, mit --cwd <projektordner> angeben`));
    assert.equal(fs.existsSync(missing), false);
  });

  test('cli_TokenInCommandList_ReportedAndNothingWritten', () => {
    const numbers = '- Dauer: 10 min · Modelle: claude-x\n\n**Wiederkehrende Shell-Befehle:**\n- `curl -H "Authorization: Bearer abcdef1234567890" https://example.test` (3×)';
    const env = setup({ snapshot: { numbers } });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Prüfung: 1 Verstöße, keine Berichtsdatei geschrieben\n- Geheimnis im Bericht: Bearer-Token in Zeile \d+: .*Authorization: \*\*\*/);
    assert.equal(result.stderr.includes('abcdef1234567890'), false);
    assert.equal(fs.existsSync(wishes(env)), false);
  });

  test('cli_SourcePath_WrittenWithoutUserFolder', () => {
    const mcp = 'Quelle: `C:\\Users\\max.muster\\.claude\\projects\\p\\s1.jsonl` · Hauptagent + 0 SubAgent(s) · 2 Tool-Aufrufe, davon 0 MCP';
    const env = setup({ snapshot: { mcp } });

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 0, result.stderr);
    const text = fs.readFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'utf8');
    assert.ok(text.includes('Quelle: `s1.jsonl` · Hauptagent + 0 SubAgent(s)'));
    assert.equal(text.includes('max.muster'), false);
  });

  test('cli_ProjectPathsInNumbers_WrittenRelative', () => {
    const env = setup();
    const numbers = `- Dauer: 10 min · Modelle: claude-x\n\n**Mehrfach gelesene Dateien:**\n- 3× ${path.join(env.project, 'src', 'Shift.ts')}`;
    fs.writeFileSync(path.join(env.dir, 's1.snapshot.json'), JSON.stringify({ ...SNAPSHOT, transcript: env.transcript, ownTranscript: env.transcript, cwd: env.project, numbers }));

    const result = report(env, '--session', 's1', '--topic', 'planung');

    assert.equal(result.status, 0, result.stderr);
    const text = fs.readFileSync(path.join(wishes(env), `${localDate()}-planung.md`), 'utf8');
    assert.ok(text.includes(`- 3× ${path.join('src', 'Shift.ts')}`));
    assert.equal(text.includes(env.project), false);
  });

  test('removeLeftovers_UndeletablePath_ReturnsWarningInsteadOfThrowing', () => {
    const blocked = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-blocked-'));

    const warnings = removeLeftovers([blocked]);

    assert.equal(warnings.length, 1);
    assert.ok(warnings[0].startsWith(`Warnung: ${blocked} nicht gelöscht`));
  });
  ```
  `plugins/forge/tests/session-files.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { findTranscript, subagentFiles } = require('../scripts/lib/session-files');
  const { RetroError } = require('../scripts/lib/transcript');

  test('subagentFiles_SubagentFolder_ListsOnlyJsonl', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-files-'));
    const transcript = path.join(dir, 's1.jsonl');
    const agents = path.join(dir, 's1', 'subagents');
    fs.mkdirSync(agents, { recursive: true });
    fs.writeFileSync(path.join(agents, 'agent-a.jsonl'), '');
    fs.writeFileSync(path.join(agents, 'agent-a.meta.json'), '{}');

    assert.deepEqual(subagentFiles(transcript), [path.join(agents, 'agent-a.jsonl')]);
  });

  test('subagentFiles_NoSubagentFolder_Empty', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-files-'));

    assert.deepEqual(subagentFiles(path.join(dir, 's1.jsonl')), []);
  });

  test('findTranscript_UnknownSession_ThrowsRetroErrorWithFolder', () => {
    const projects = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-projects-'));

    assert.throws(() => findTranscript('gibt-es-nicht', projects), (error) => error instanceof RetroError
      && error.message.includes(`Transkript zur Session gibt-es-nicht nicht gefunden unter ${projects}`));
  });
  ```
  `plugins/forge/tests/retro-secrets.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { secretViolations, withFileNameSource, relativeToProject } = require('../scripts/lib/retro-secrets');

  test('secretViolations_KeyAsEndOfVariableName_ReportedAndMasked', () => {
    for (const assignment of ['API_TOKEN=abcdefgh1234', 'DB_PASSWORD=geheim-12345', 'NPM_TOKEN=npm_abcdefgh', 'CLIENT_SECRET=s3cr3t-wert-1']) {
      const found = secretViolations(`- 2× ${assignment} npm publish`);

      assert.deepEqual(found, ['Geheimnis im Bericht: Schlüssel mit Wert in Zeile 1: - 2× *** npm publish'], assignment);
    }
  });

  test('secretViolations_CountsAndShortValues_None', () => {
    assert.deepEqual(secretViolations('- Tokens: 1200000 · Token: nein\n- Tokens neu 2k Hauptsession'), []);
  });

  test('withFileNameSource_AbsolutePath_OnlyFileName', () => {
    assert.equal(withFileNameSource('Quelle: `C:\\Users\\max\\.claude\\projects\\p\\s1.jsonl` · 2 Tool-Aufrufe'), 'Quelle: `s1.jsonl` · 2 Tool-Aufrufe');
  });

  test('relativeToProject_WindowsProject_RelativeInBothSeparatorsAndOthersKept', () => {
    const text = '- 3× C:\\Users\\max\\repo\\src\\Shift.ts\n- 2 Tokens · Read c:/users/max/repo/docs/a.md\n- 1× C:\\Users\\max\\repo2\\b.md';

    const result = relativeToProject(text, 'C:\\Users\\max\\repo');

    assert.equal(result, '- 3× src\\Shift.ts\n- 2 Tokens · Read docs/a.md\n- 1× C:\\Users\\max\\repo2\\b.md');
  });

  test('relativeToProject_PosixProject_CaseSensitive', () => {
    assert.equal(relativeToProject('- 2× /home/max/repo/a.md und /home/max/Repo/b.md', '/home/max/repo/'), '- 2× a.md und /home/max/Repo/b.md');
  });

  test('relativeToProject_NoOrRootFolder_TextUnchanged', () => {
    assert.equal(relativeToProject('- 1× /a/b.md', undefined), '- 1× /a/b.md');
    assert.equal(relativeToProject('- 1× /a/b.md', '/'), '- 1× /a/b.md');
  });
  ```
  In `plugins/forge/tests/session-facts.test.js` direkt nach `cli_File_RendersFactsAndSubagents` einfügen:
  ```js
  test('cli_BrokenSubagentMeta_RowFallsBackWithoutError', () => {
    for (const content of ['', '{"description": "Rev']) {
      const file = session();
      fs.writeFileSync(path.join(path.dirname(file), 's1', 'subagents', 'agent-a.meta.json'), content);

      const result = spawnSync(process.execPath, [SCRIPT, '--file', file], { encoding: 'utf8' });

      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /\| agent-a\.jsonl \| \? \| sonnet \| /, JSON.stringify(content));
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-files.test.js plugins/forge/tests/retro-secrets.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_Format_PrintsReportFormatUnchanged` (Skript fehlt), FAIL `subagentFiles_SubagentFolder_ListsOnlyJsonl` (Modul `../scripts/lib/session-files` fehlt), FAIL `secretViolations_KeyAsEndOfVariableName_ReportedAndMasked` (Modul `../scripts/lib/retro-secrets` fehlt) und FAIL `cli_BrokenSubagentMeta_RowFallsBackWithoutError` (`SyntaxError` aus `JSON.parse`)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/retro-report.js` neu:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Gibt das Berichtsformat aus oder erzeugt aus Entwurf und Snapshot einer Session den Erfahrungsbericht unter docs/wishes/.

  const fs = require('node:fs');
  const path = require('node:path');
  const { RetroError, readEntries } = require('./lib/transcript');
  const { corpusOf } = require('./lib/retro-corpus');
  const { draftPath, readSnapshot, snapshotPath } = require('./lib/retro-files');
  const { violations } = require('./lib/retro-draft');
  const { compose } = require('./lib/retro-compose');
  const { secretViolations, withFileNameSource, relativeToProject } = require('./lib/retro-secrets');
  const { subagentFiles } = require('./lib/session-files');

  const REPORT_FORMAT = path.join(__dirname, '..', 'skills', 'prozess-retrospektive', 'references', 'report-format.md');
  const REPORT_DIR = path.join('docs', 'wishes');
  const TOPIC = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  const USAGE = 'Aufruf: node retro-report.js --format\n'
    + '       node retro-report.js --session <id> --topic <thema> [--cwd <projektordner>]\n'
    + '  <thema>: Kleinbuchstaben a-z, Ziffern und Bindestriche, ohne Bindestrich am Anfang oder Ende\n';
  const FLAGS = { '--session': 'session', '--topic': 'topic', '--cwd': 'cwd' };

  class UsageError extends Error {}

  function parseArgs(args) {
    if (args.length === 1 && args[0] === '--format') return { format: true };
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const key = FLAGS[args[index]];
      if (!key || args[index + 1] === undefined) throw new UsageError(`Unbekannte oder unvollständige Angabe: ${args[index]}`);
      options[key] = args[index + 1];
    }
    if (!options.session) throw new UsageError('--session fehlt');
    if (options.topic === undefined) throw new UsageError('--topic fehlt');
    if (!TOPIC.test(options.topic)) throw new UsageError(`Ungültiges Thema: „${options.topic}“`);
    return options;
  }

  function localDate(now = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function freeName(dir, base) {
    for (let number = 1; ; number += 1) {
      const file = path.join(dir, `${base}${number === 1 ? '' : `-${number}`}.md`);
      if (!fs.existsSync(file)) return file;
    }
  }

  function writeReport(dir, base, text) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const file = freeName(dir, base);
      fs.writeFileSync(file, text, { flag: 'wx' });
      return file;
    } catch (error) {
      throw new RetroError(`Berichtsordner nicht schreibbar: ${dir}: ${error.message}`);
    }
  }

  // Zitate dürfen aus der Hauptsession und aus den Protokollen ihrer Subagents stammen; den Ordner der Subagents
  // kennt nur `subagentFiles` in lib/session-files.js. Fehlt das Protokoll, nennt der Fehler den Pfad statt jedes Zitat abzulehnen.
  // Die Hauptsession zählt nur bis zum Stand des Snapshots: Danach schreibt die laufende Retrospektive ihren Entwurf,
  // und dessen `Write` enthielte jedes erfundene Zitat wörtlich.
  function corpus(snapshot) {
    if (!snapshot.transcript || !fs.existsSync(snapshot.transcript)) {
      throw new RetroError(`Protokoll fehlt: ${snapshot.transcript || '(kein Pfad im Snapshot)'}; ohne Protokoll lassen sich die Zitate nicht prüfen, keine Berichtsdatei geschrieben`);
    }
    const main = readEntries(snapshot.transcript).filter((entry) => entry.entryNo <= snapshot.transcriptEntries);
    const agents = subagentFiles(snapshot.transcript).map((file) => readEntries(file));
    return [main, ...agents].map(corpusOf).join('\n');
  }

  function failOnViolations(found, hint = []) {
    if (found.length === 0) return;
    throw new RetroError([`Prüfung: ${found.length} Verstöße, keine Berichtsdatei geschrieben`, ...found.map((item) => `- ${item}`), ...hint].join('\n'));
  }

  function checkedDraft(options, snapshot) {
    const draft = draftPath(options.session);
    if (!fs.existsSync(draft)) throw new RetroError(`Entwurf fehlt: ${draft}`);
    const text = fs.readFileSync(draft, 'utf8');
    failOnViolations(violations(text, snapshot, corpus(snapshot)));
    return { draft, text };
  }

  // Der fertige Bericht wird committet: Ein Geheimnis aus Befehlen, Eingaben oder Fehlertexten verhindert die Berichtsdatei.
  // Zahlen und MCP-Nutzung stammen aus dem Snapshot; steht es dort, hilft nur, es im Snapshot zu ersetzen.
  function checkedReport(text, session) {
    failOnViolations(secretViolations(text), [`Geheimnis im Entwurf entfernen; steht es unter Zahlen oder MCP-Nutzung, im Snapshot ${snapshotPath(session)} ersetzen und neu aufrufen`]);
    return text;
  }

  // Der Bericht steht schon; scheitert das Löschen (etwa eine gesperrte Datei unter Windows), bleibt er gültig und die
  // Warnung nennt, was von Hand zu löschen ist, damit ein neuer Aufruf keinen zweiten Bericht schreibt.
  function removeLeftovers(files) {
    return files.flatMap((file) => {
      try {
        fs.rmSync(file, { force: true });
        return [];
      } catch (error) {
        return [`Warnung: ${file} nicht gelöscht (${error.message}); vor einem neuen Aufruf von Hand löschen, sonst entsteht ein zweiter Bericht.`];
      }
    });
  }

  // Ohne --cwd kommt der Projektordner aus dem Protokoll. Fehlt er hier, stammt das Protokoll von woanders; ein Bericht
  // dort legte einen ganzen Ordnerbaum an beliebiger Stelle an.
  function projectRoot(options, snapshot) {
    if (options.cwd) return path.resolve(options.cwd);
    const cwd = path.resolve(snapshot.cwd || process.cwd());
    if (!fs.existsSync(cwd)) {
      throw new RetroError(`Projektordner fehlt: ${cwd}; das Protokoll stammt aus einem anderen Projekt oder einer anderen Maschine, mit --cwd <projektordner> angeben`);
    }
    return cwd;
  }

  // Schreibt den Bericht erst, wenn Snapshot und Entwurf da sind, der Entwurf keinen Verstoß hat, der Projektordner existiert
  // und der fertige Bericht kein Geheimnis enthält; danach sind beide gelöscht.
  function build(options) {
    const snapshot = readSnapshot(options.session);
    const { draft, text } = checkedDraft(options, snapshot);
    const date = localDate();
    const cwd = projectRoot(options, snapshot);
    const shown = { ...snapshot, numbers: relativeToProject(snapshot.numbers, snapshot.cwd), mcp: withFileNameSource(snapshot.mcp) };
    const report = checkedReport(compose(text, shown, date), options.session);
    const file = writeReport(path.join(cwd, REPORT_DIR), `${date}-${options.topic}`, report);
    const warnings = removeLeftovers([draft, snapshotPath(options.session)]);
    return { file, cwd, text, snapshot, warnings };
  }

  function parsedOrExit(args) {
    try {
      return parseArgs(args);
    } catch (error) {
      if (!(error instanceof UsageError)) throw error;
      process.stderr.write(`${error.message}\n${USAGE}`);
      return process.exit(2);
    }
  }

  function main() {
    const options = parsedOrExit(process.argv.slice(2));
    if (options.format) {
      process.stdout.write(fs.readFileSync(REPORT_FORMAT, 'utf8'));
      return;
    }
    try {
      const { file, warnings } = build(options);
      process.stdout.write(`Bericht: ${file}\nPrüfung: 0 Verstöße\n`);
      for (const warning of warnings) process.stderr.write(`${warning}\n`);
    } catch (error) {
      if (!(error instanceof RetroError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { parseArgs, localDate, removeLeftovers, build };
  ```
  `plugins/forge/scripts/lib/session-files.js` neu (Inhalt von `configDir`, `findTranscript` und `subagentFiles` aus `mcp-usage.js` übernommen, der Fehler als `RetroError`):
  ```js
  'use strict';

  // Findet die Protokolldateien einer Session: das Protokoll über die Session-Kennung und die Protokolle ihrer Subagents.

  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { RetroError } = require('./transcript');

  function configDir() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  }

  function findTranscript(sessionId, projectsDir = path.join(configDir(), 'projects')) {
    const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
    const hit = dirs.map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`)).find((file) => fs.existsSync(file));
    if (!hit) throw new RetroError(`Transkript zur Session ${sessionId} nicht gefunden unter ${projectsDir}`);
    return hit;
  }

  // Der Ordneraufbau `<protokoll>/subagents/*.jsonl` steht nur hier.
  function subagentFiles(transcript) {
    const dir = path.join(transcript.replace(/\.jsonl$/, ''), 'subagents');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => path.join(dir, name));
  }

  module.exports = { findTranscript, subagentFiles };
  ```
  `plugins/forge/scripts/lib/retro-secrets.js` neu:
  ```js
  'use strict';

  // Was ein committeter Bericht nicht tragen darf: Geheimnisse aus Befehlen, Eingaben und Fehlertexten
  // und lokale Pfade samt Benutzerordner, soweit sie auf das Protokoll oder den Projektordner zeigen.

  const { escapeRegExp } = require('./regexp');

  // Je Art ein Muster; ein Schlüsselwort zählt erst mit `:` oder `=` und einem Wert ab 8 Zeichen, damit Wörter wie „Tokens“ oder „Token: nein“ nicht anschlagen.
  // Das Schlüsselwort darf die Endung eines Namens sein (`API_TOKEN=…`, `DB_PASSWORD=…`), die übliche Form in Shell-Befehlen.
  // Grenze: Ein nackter Wert ohne Schlüsselwort und ohne bekanntes Präfix (etwa ein Azure-DevOps-PAT) bleibt unerkannt;
  // ein Muster ohne Präfix träfe jeden Hash und jede lange Kennung.
  const SECRETS = [
    ['Schlüssel mit Wert', /[\w-]*(?:password|passwort|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*["']?[^\s"'`,;]{8,}/gi],
    ['Bearer-Token', /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g],
    ['Zugangsdaten in URL', /:\/\/[^\s/:@`]+:[^\s/@`]+@/g],
    ['AWS-Schlüssel', /\bAKIA[0-9A-Z]{16}\b/g],
    ['GitHub-Token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ];
  const MASK = '***';
  const SOURCE = /^Quelle: `([^`]+)`/m;

  function masked(line) {
    return SECRETS.reduce((text, [, pattern]) => text.replace(pattern, MASK), line);
  }

  // Jeder Treffer einzeln, mit Zeilennummer und maskierter Zeile: Die Meldung trägt das Geheimnis nicht selbst weiter.
  // `search` beachtet `lastIndex` der globalen Muster nicht, jede Zeile wird unabhängig geprüft.
  function secretViolations(text) {
    return text.split('\n').flatMap((line, index) => SECRETS
      .filter(([, pattern]) => line.search(pattern) !== -1)
      .map(([kind]) => `Geheimnis im Bericht: ${kind} in Zeile ${index + 1}: ${masked(line).trim()}`));
  }

  // Nur die Zeile `Quelle:` der MCP-Nutzung: Sie nennt den Dateinamen des Protokolls statt seines absoluten Pfads.
  function withFileNameSource(mcp) {
    return mcp.replace(SOURCE, (_, file) => `Quelle: \`${file.split(/[\\/]/).pop()}\``);
  }

  // Pfade unter dem Projektordner der Session stehen im Bericht relativ zu ihm; Tool-Eingaben mischen `/` und `\`,
  // Windows-Pfade (mit Laufwerksbuchstaben) vergleicht es ohne Groß-/Kleinschreibung. Pfade außerhalb bleiben, wie sie sind.
  function relativeToProject(text, cwd) {
    const root = String(cwd ?? '').replace(/[\\/]+$/, '');
    if (!text || !root) return text;
    const pattern = root.split(/[\\/]/).map(escapeRegExp).join('[\\\\/]');
    return text.replace(new RegExp(`${pattern}[\\\\/]`, /^[A-Za-z]:/.test(root) ? 'gi' : 'g'), '');
  }

  module.exports = { secretViolations, withFileNameSource, relativeToProject };
  ```
  In `plugins/forge/scripts/mcp-usage.js`:
  (a) Die Zeile `const os = require('node:os');` entfällt, ebenso die Funktionen `configDir`, `findTranscript` und `subagentFiles`.
  (b) Die Zeile `const { readEntries } = require('./lib/transcript');` wird zu:
  ```js
  const { readEntries, RetroError } = require('./lib/transcript');
  const { findTranscript, subagentFiles } = require('./lib/session-files');
  ```
  (c) Direkt vor `main` einfügen:
  ```js
  // Die Ortung meldet „nicht gefunden“ als RetroError; für dieses Skript bleibt es ein Aufruffehler mit Exit 1.
  function transcriptOf(args) {
    if (args.transcript) return args.transcript;
    try {
      return findTranscript(args.session);
    } catch (error) {
      if (!(error instanceof RetroError)) throw error;
      throw new UsageError(`${error.message}\n`);
    }
  }
  ```
  (d) In `main` wird `const transcript = args.transcript ?? findTranscript(args.session);` zu `const transcript = transcriptOf(args);`.
  `module.exports` bleibt unverändert; `findTranscript` wird damit unter dem alten Namen weiter exportiert.
  In `plugins/forge/scripts/session-facts.js`:
  (a) Nach `const { rangeOf } = require('./lib/retro-range');` einfügen:
  ```js
  const { subagentFiles } = require('./lib/session-files');
  ```
  (b) `subagentRows` wird ersetzt durch (davor die neue Funktion `readMeta`):
  ```js
  // Die .meta.json eines Subagents fehlt, ist leer oder halb geschrieben, wenn die Session noch läuft oder abbrach;
  // die Zeile fällt dann auf Dateiname, `?` und das Modell aus den Fakten zurück, statt die Fakten abzubrechen.
  function readMeta(metaFile) {
    try {
      return JSON.parse(fs.readFileSync(metaFile, 'utf8')) ?? {};
    } catch {
      return {};
    }
  }

  function subagentRows(sessionFile, keep = () => true) {
    return subagentFiles(sessionFile).flatMap((file) => {
      const entries = readEntries(file);
      return keep(entries) ? [{ file, entries }] : [];
    }).map(({ file, entries }) => {
      const meta = readMeta(file.replace(/\.jsonl$/, '.meta.json'));
      const facts = analyze(entries);
      const errors = [...facts.errors.values()].reduce((sum, list) => sum + list.length, 0);
      return {
        facts,
        description: meta.description ?? path.basename(file), type: meta.agentType ?? '?', model: meta.model ?? [...facts.models].join(','),
        tokens: facts.input + facts.cached + facts.output, fresh: facts.input + facts.output, tools: [...facts.tools.values()].reduce((a, b) => a + b, 0), errors,
        duration: minutes(facts.first, facts.last),
      };
    }).sort((a, b) => b.tokens - a.tokens);
  }
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-files.test.js plugins/forge/tests/retro-secrets.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/mcp-usage.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/retro-report.js plugins/forge/scripts/lib/session-files.js plugins/forge/scripts/lib/retro-secrets.js plugins/forge/scripts/mcp-usage.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-files.test.js plugins/forge/tests/retro-secrets.test.js plugins/forge/tests/session-facts.test.js` · `git commit -m "feat(forge): retro-report prints the format and writes the checked report"`

---

### Task 15: Kurzfassung mit Kosten und Workitem-Kandidat

**ACs:** AC-17

**Dateien:**
- Create: `plugins/forge/scripts/lib/retro-summary.js`
- Create: `plugins/forge/scripts/lib/retro-format.js`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { RetroError: FactsError`, `function thousands`
- Modify: `plugins/forge/scripts/retro-report.js` · `const { compose } = require('./lib/retro-compose');`, `main`
- Modify: `plugins/forge/scripts/forge-config.js` · `function workitemOf`, `module.exports = { ConfigError, DEFAULTS, parseSection, readConfig, getValue, show, workitemOf, branchFor, branchCandidates };`
- Modify: `plugins/forge/scripts/work.js` · `function workitemConflict`, `const { ConfigError, readConfig, branchFor, branchCandidates, workitemOf } = require('./forge-config');`
- Test: `plugins/forge/tests/retro-summary.test.js`
- Test: `plugins/forge/tests/retro-report.test.js` · `cli_ValidDraft_WritesDatedReportAndDeletesDraft`
- Test: `plugins/forge/tests/forge-config.test.js` · `branchWorkitem_PatternInBranch_ReturnsMatch`
- Test: `plugins/forge/tests/work.test.js` · `workitem-konflikt` (bestehend, unverändert)

**Interfaces:**
- Consumes: aus Task 14 `build(options)` mit `{ file, cwd, text, snapshot, warnings }`; Task 12 `parseDraft`, `findingsOf`; Task 11 Snapshot-Felder `transcript`, `ownTranscript`, `transcriptEntries`; Task 5 `requestsOf` (`lib/retro-requests.js`); Task 1 `tokensOf`, `readEntries`; `readConfig`, `workitemOf` aus `forge-config.js` (bestehend); `workitemConflict(config, branch, spec)` in `work.js:77-88` (bestehend, stellt auf `branchWorkitem` um).
- Produces: `lib/retro-format.js` (Anzeigeformat von Zahlen, eine Verantwortung): `thousands(value: number): string` (`<n>k`, gerundet); `session-facts.js` nutzt diese Funktion statt einer eigenen, sodass Fakten, Snapshot und Kurzfassung Tokens gleich schreiben. `shorten` und `clock` bleiben in `lib/transcript.js`, weil `humanEvents` und die Bereichs-Labels sie beim Lesen des Protokolls brauchen; `retro-format.js` hat nur das Zahlenformat, das kein Protokoll-Leser nutzt. · `lib/retro-summary.js`: `findingSummary(text): string[]`; `retroCost(transcript: string|null, fromEntryNo: number): string` (zählt die Anfragen mit `entryNo > fromEntryNo`, also nach dem Snapshot-Stand `transcriptEntries`, ohne Suche nach dem `RETRO`-Aufruf; `null` heißt: eigenes Protokoll nicht gefunden, dann `Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)`; gemessen wird nie in einem fremden Protokoll: ist `snapshot.transcript` nicht `snapshot.ownTranscript`, meldet `summaryLines` `Kosten der Retrospektive: nicht messbar (eigenes Protokoll ist nicht das ausgewertete)`); `workitemCandidate(snapshot, cwd: string): string` (`<wert> (aus Spec <pfad>)`, `<wert> (aus Branch <branch>)` oder `keiner`; der Branch-Treffer kommt aus `branchWorkitem`); `summaryLines({ file, cwd, text, snapshot }): string[]`. · `forge-config.js`: `branchWorkitem(config: object, branch: string): string|null` (neben `workitemOf`, exportiert; `null` bei `Workitem` leer oder `keine`, ungültigem Muster, leerem Branch oder ohne Treffer, sonst der Treffer `found[0]`); die Regel „Workitem-Muster gegen Branch“ steht damit einmal, `work.js` `workitemConflict` und `lib/retro-summary.js` nutzen sie. · `retro-report.js`: scheitert die Kurzfassung nach geschriebenem Bericht, stehen auf stdout trotzdem `Bericht: <pfad>`, `Prüfung: 0 Verstöße` und `Warnung: Kurzfassung nicht verfügbar: <grund>`, Exit 0.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-summary.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { findingSummary, retroCost, workitemCandidate, summaryLines } = require('../scripts/lib/retro-summary');
  const { human, slash, request, usage, writeSession } = require('./lib/retro-session');
  const { readEntries } = require('../scripts/lib/transcript');
  const { VALID, SNAPSHOT } = require('./lib/retro-draft-fixture');
  const { makeRepo, commitFile } = require('./lib/git-repo');

  function friction(number) {
    return [`${number}. **Reibung ${number}.**`, '   *Situation:* s', '   *Kosten:* 1 min', '   *Ursache:* u', '   *Besser gewesen:* b', '   *Vorschlag:* v', '   *Ziel:* Ziel offen', '   *Im Projekt:* nichts', ''].join('\n');
  }

  test('findingSummary_ValidDraft_CountsAndShortFindingsPerSection', () => {
    assert.deepEqual(findingSummary(VALID), [
      'Befunde: 3 (Positiv 1, Reibung 1, Sparpotenzial 1)',
      'Positiv: Tests liefen sofort grün',
      'Reibung: Suche im Protokoll blockiert',
      'Sparpotenzial: Zeitleiste statt Textsuche',
    ]);
  });

  test('findingSummary_FourFindings_ShowsFirstThree', () => {
    const start = VALID.indexOf('## Reibung\n');
    const end = VALID.indexOf('## Sparpotenzial\n');
    const draft = `${VALID.slice(0, start)}## Reibung\n\n${[1, 2, 3, 4].map(friction).join('\n')}\n${VALID.slice(end)}`;

    const lines = findingSummary(draft);

    assert.equal(lines[2], 'Reibung: Reibung 1 · Reibung 2 · Reibung 3');
  });

  test('retroCost_AfterSnapshotEntry_RequestsAndTokensSplit', () => {
    const transcript = writeSession([
      request('r0', '09:00', [], usage(9000, 9000, 9000, 9000)),
      slash('dv-forge:prozess-retrospektive', '', '10:00'),
      request('r1', '10:01', [], usage(1000, 2000, 50000, 300)),
      request('r2', '10:02', [], usage(500, 0, 52000, 200)),
      request('r2', '10:02', [], usage(500, 0, 52000, 200)),
    ]);
    const fromEntryNo = readEntries(transcript)[1].entryNo;

    assert.equal(retroCost(transcript, fromEntryNo), 'Kosten der Retrospektive: 2 Anfragen · Tokens 4k neu verarbeitet, 102k aus dem Cache, 1k Ausgabe');
  });

  test('retroCost_NoRetroCallButEarlierRetro_CountsOnlyAfterSnapshot', () => {
    const transcript = writeSession([
      slash('dv-forge:prozess-retrospektive', '', '08:00'),
      request('r0', '08:01', [], usage(9000, 9000, 9000, 9000)),
      human('Weiter', '09:00'),
      request('r1', '10:01', [], usage(1000, 0, 0, 100)),
    ]);
    const fromEntryNo = readEntries(transcript)[2].entryNo;

    assert.equal(retroCost(transcript, fromEntryNo), 'Kosten der Retrospektive: 1 Anfragen · Tokens 1k neu verarbeitet, 0k aus dem Cache, 0k Ausgabe');
  });

  test('summaryLines_OwnTranscriptNotEvaluated_CostNotMeasurable', () => {
    const repo = makeRepo();
    const own = writeSession([request('r1', '10:01', [], usage(1000, 0, 0, 100))]);
    const snapshot = { ...SNAPSHOT, transcript: writeSession([human('Los', '10:00')]), ownTranscript: own, transcriptEntries: 0 };

    const lines = summaryLines({ file: path.join(repo, 'docs', 'wishes', 'x.md'), cwd: repo, text: VALID, snapshot });

    assert.ok(lines.includes('Kosten der Retrospektive: nicht messbar (eigenes Protokoll ist nicht das ausgewertete)'));
  });

  test('summaryLines_OwnTranscriptUnknown_CostNotTakenFromForeignProtocol', () => {
    const repo = makeRepo();
    const foreign = writeSession([
      slash('dv-forge:prozess-retrospektive', '', '10:00'),
      request('r1', '10:01', [], usage(1000, 0, 0, 100)),
    ]);
    const snapshot = { ...SNAPSHOT, transcript: foreign, ownTranscript: null };

    const lines = summaryLines({ file: path.join(repo, 'docs', 'wishes', 'x.md'), cwd: repo, text: VALID, snapshot });

    assert.ok(lines.includes('Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)'));
  });

  test('workitemCandidate_SpecWithWorkitem_TakesSpecFirst', () => {
    const repo = makeRepo();
    commitFile(repo, 'docs/spec.md', '# Spec\n\nWorkitem: AB#123\n', 'spec');

    const candidate = workitemCandidate({ ...SNAPSHOT, specs: ['docs/spec.md'], branch: 'feature/AB#77-x' }, repo);

    assert.equal(candidate, 'AB#123 (aus Spec docs/spec.md)');
  });

  test('workitemCandidate_NoSpecButBranchMatchesPattern_TakesBranch', () => {
    const repo = makeRepo();
    commitFile(repo, 'CLAUDE.md', '## dv-forge\n\n- Workitem: `\\d{6}`\n', 'config');

    const candidate = workitemCandidate({ ...SNAPSHOT, specs: [], branch: 'feature/307326-result' }, repo);

    assert.equal(candidate, '307326 (aus Branch feature/307326-result)');
  });

  test('workitemCandidate_NeitherSpecNorPattern_None', () => {
    const repo = makeRepo();

    assert.equal(workitemCandidate({ ...SNAPSHOT, specs: [], branch: 'feature/x' }, repo), 'keiner');
  });
  ```
  In `plugins/forge/tests/retro-report.test.js` wird `cli_ValidDraft_WritesDatedReportAndDeletesDraft` um diese Asserts vor der letzten Zeile ergänzt:
  ```js
    assert.match(result.stdout, /Befunde: 3 \(Positiv 1, Reibung 1, Sparpotenzial 1\)\n/);
    assert.match(result.stdout, /Kosten der Retrospektive: /);
    assert.match(result.stdout, /Workitem-Kandidat: keiner\n/);
    assert.ok(result.stdout.includes(`Vormerken: git add "docs/wishes/${localDate()}-planung.md"`));
  ```
  In `plugins/forge/tests/forge-config.test.js` am Dateiende anhängen:
  ```js
  test('branchWorkitem_PatternInBranch_ReturnsMatch', () => {
    assert.equal(config.branchWorkitem({ Workitem: '\\d{6}' }, 'feature/307326-result'), '307326');
  });

  test('branchWorkitem_NoneEmptyInvalidNoBranchOrNoMatch_Null', () => {
    const cases = [
      [{ Workitem: 'keine' }, 'feature/307326-x'],
      [{ Workitem: '' }, 'feature/307326-x'],
      [{ Workitem: '(' }, 'feature/307326-x'],
      [{ Workitem: '\\d{6}' }, ''],
      [{ Workitem: '\\d{6}' }, 'feature/x'],
    ];

    assert.deepEqual(cases.map(([values, branch]) => config.branchWorkitem(values, branch)), [null, null, null, null, null]);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js plugins/forge/tests/forge-config.test.js` — erwartet: FAIL `findingSummary_ValidDraft_CountsAndShortFindingsPerSection`, FAIL `cli_ValidDraft_WritesDatedReportAndDeletesDraft` und FAIL `branchWorkitem_PatternInBranch_ReturnsMatch` (`config.branchWorkitem is not a function`)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-format.js` neu (Zahlenformat, das kein Protokoll-Leser braucht; `shorten` und `clock` bleiben bei ihren Nutzern in `lib/transcript.js`):
  ```js
  'use strict';

  // Anzeigeformat von Zahlen in Fakten, Snapshot und Kurzfassung.

  const THOUSAND = 1000;

  // Tokens in Tausend, gerundet: eine Schreibweise für Fakten, Snapshot und Kurzfassung.
  function thousands(value) {
    return `${Math.round(value / THOUSAND)}k`;
  }

  module.exports = { thousands };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Direkt nach der Importzeile aus `./lib/transcript` einfügen:
  ```js
  const { thousands } = require('./lib/retro-format');
  ```
  (b) Die Funktion `thousands` entfällt ersatzlos; alle Aufrufe nutzen die importierte.
  `plugins/forge/scripts/lib/retro-summary.js` neu:
  ```js
  'use strict';

  // Kurzfassung nach dem Bericht: Befunde, Kosten der Retrospektive, Workitem-Kandidat und Befehl zum Vormerken.

  const fs = require('node:fs');
  const path = require('node:path');
  const { readEntries, tokensOf } = require('./transcript');
  const { requestsOf } = require('./retro-requests');
  const { thousands } = require('./retro-format');
  const { parseDraft, findingsOf } = require('./retro-draft');
  const { readConfig, workitemOf, branchWorkitem } = require('../forge-config');

  const FINDING_SECTIONS = ['Positiv', 'Reibung', 'Sparpotenzial'];
  const SHOWN_FINDINGS = 3;

  function findingSummary(text) {
    const draft = parseDraft(text);
    const bySection = FINDING_SECTIONS.map((section) => [section, findingsOf(draft.sections.get(section)).map((finding) => finding.title)]);
    const total = bySection.reduce((sum, [, titles]) => sum + titles.length, 0);
    return [
      `Befunde: ${total} (${bySection.map(([section, titles]) => `${section} ${titles.length}`).join(', ')})`,
      ...bySection.map(([section, titles]) => `${section}: ${titles.slice(0, SHOWN_FINDINGS).join(' · ') || 'keine'}`),
    ];
  }

  function sumTokens(requests) {
    return requests.map((request) => tokensOf(request.usage)).reduce((total, tokens) => ({
      input: total.input + tokens.input, cached: total.cached + tokens.cached, output: total.output + tokens.output,
    }), { input: 0, cached: 0, output: 0 });
  }

  // Kosten der Retrospektive: alle Anfragen nach dem Stand des Snapshots (`fromEntryNo`), gemessen vor der ersten
  // Modell-Anfrage der Retrospektive; der Slash-Befehl selbst löst keine Anfrage aus. Gezählt nur im Protokoll der
  // eigenen Session; `null` heißt, das eigene Protokoll wurde nicht gefunden, ein fremdes Protokoll ersetzt es nie.
  function retroCost(transcript, fromEntryNo) {
    if (transcript === null) return 'Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)';
    if (!transcript || !fs.existsSync(transcript)) return 'Kosten der Retrospektive: nicht messbar (Protokoll fehlt)';
    const requests = requestsOf(readEntries(transcript).filter((entry) => entry.entryNo > fromEntryNo));
    const sum = sumTokens(requests);
    return `Kosten der Retrospektive: ${requests.length} Anfragen · Tokens ${thousands(sum.input)} neu verarbeitet, ${thousands(sum.cached)} aus dem Cache, ${thousands(sum.output)} Ausgabe`;
  }

  function configOf(cwd) {
    try {
      return readConfig(cwd).config;
    } catch {
      // Ohne Projekt-Einstellungen (kein Git-Repo) gibt es keinen Kandidaten aus dem Branch.
      return {};
    }
  }

  // Zuerst die Workitem-Zeile einer Spec der Session, dann das Workitem-Muster im Branch, sonst „keiner“.
  function workitemCandidate(snapshot, cwd) {
    const fromSpec = (snapshot.specs ?? []).map((spec) => [spec, workitemOf(path.resolve(cwd, spec))]).find(([, workitem]) => workitem);
    if (fromSpec) return `${fromSpec[1]} (aus Spec ${fromSpec[0]})`;
    const found = branchWorkitem(configOf(cwd), snapshot.branch);
    return found ? `${found} (aus Branch ${snapshot.branch})` : 'keiner';
  }

  // `transcriptEntries` zählt im ausgewerteten Protokoll; nur wenn das das eigene ist, markiert es den Start der Retrospektive.
  function costOf(snapshot) {
    if (snapshot.ownTranscript !== null && snapshot.transcript !== snapshot.ownTranscript) {
      return 'Kosten der Retrospektive: nicht messbar (eigenes Protokoll ist nicht das ausgewertete)';
    }
    return retroCost(snapshot.ownTranscript, snapshot.transcriptEntries);
  }

  function summaryLines({ file, cwd, text, snapshot }) {
    return [
      `Bericht: ${file}`,
      'Prüfung: 0 Verstöße',
      ...findingSummary(text),
      costOf(snapshot),
      `Workitem-Kandidat: ${workitemCandidate(snapshot, cwd)}`,
      `Vormerken: git add "${path.relative(cwd, file).split(path.sep).join('/')}"`,
    ];
  }

  module.exports = { findingSummary, retroCost, workitemCandidate, summaryLines };
  ```
  In `plugins/forge/scripts/forge-config.js`:
  (a) Direkt nach `workitemOf` einfügen:
  ```js
  function workitemPattern(source) {
    if (!source || source === 'keine') return null;
    try {
      return new RegExp(source);
    } catch {
      // Ein ungültiges Muster in den Projekt-Einstellungen findet kein Workitem.
      return null;
    }
  }

  // Das Workitem-Muster der Projekt-Einstellungen im Branch: null bei `keine`, leerem oder ungültigem Muster,
  // leerem Branch oder ohne Treffer, sonst der Treffer. Die einzige Stelle dieser Regel.
  function branchWorkitem(config, branch) {
    const pattern = workitemPattern(config.Workitem);
    const found = pattern && branch ? pattern.exec(branch) : null;
    return found ? found[0] : null;
  }
  ```
  (b) `module.exports` wird zu:
  ```js
  module.exports = { ConfigError, DEFAULTS, parseSection, readConfig, getValue, show, workitemOf, branchWorkitem, branchFor, branchCandidates };
  ```
  In `plugins/forge/scripts/work.js`:
  (a) Die Zeile `const { ConfigError, readConfig, branchFor, branchCandidates, workitemOf } = require('./forge-config');` wird zu:
  ```js
  const { ConfigError, readConfig, branchFor, branchCandidates, workitemOf, branchWorkitem } = require('./forge-config');
  ```
  (b) `workitemConflict` wird ersetzt durch:
  ```js
  function workitemConflict(config, branch, spec) {
    const own = workitemOf(spec);
    const found = branchWorkitem(config, branch);
    return own && found && found !== own ? found : null;
  }
  ```
  In `plugins/forge/scripts/retro-report.js`: nach `const { compose } = require('./lib/retro-compose');` einfügen:
  ```js
  const { summaryLines } = require('./lib/retro-summary');
  ```
  direkt vor `main` einfügen:
  ```js
  // Der Bericht ist schon geschrieben; scheitert die Kurzfassung, bleiben Pfad und Prüfergebnis die Rückmeldung.
  function summaryOrFallback(result) {
    try {
      return summaryLines(result);
    } catch (error) {
      return [`Bericht: ${result.file}`, 'Prüfung: 0 Verstöße', `Warnung: Kurzfassung nicht verfügbar: ${error.message}`];
    }
  }
  ```
  und in `main` die Zeilen `const { file, warnings } = build(options);`, `process.stdout.write(`Bericht: ${file}\nPrüfung: 0 Verstöße\n`);` und `for (const warning of warnings) process.stderr.write(`${warning}\n`);` ersetzen durch:
  ```js
      const result = build(options);
      process.stdout.write(`${summaryOrFallback(result).join('\n')}\n`);
      for (const warning of result.warnings) process.stderr.write(`${warning}\n`);
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/retro-measures.test.js plugins/forge/tests/transcript.test.js plugins/forge/tests/forge-config.test.js plugins/forge/tests/work.test.js` — erwartet: PASS (`work.test.js` belegt, dass `workitem-konflikt` mit `branchWorkitem` gleich bleibt)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-summary.js plugins/forge/scripts/lib/retro-format.js plugins/forge/scripts/session-facts.js plugins/forge/scripts/retro-report.js plugins/forge/scripts/forge-config.js plugins/forge/scripts/work.js plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js plugins/forge/tests/forge-config.test.js` · `git commit -m "feat(forge): retro-report summarises findings, own cost and workitem candidate"`

---

### Task 16: Zeitleiste

**ACs:** AC-20

**Dateien:**
- Create: `plugins/forge/scripts/retro-timeline.js`
- Modify: `plugins/forge/scripts/lib/session-files.js` · `function findTranscript`, `function subagentFiles`, `module.exports = { findTranscript, subagentFiles };`
- Modify: `plugins/forge/scripts/lib/transcript.js` · `readEntries`, `humanEvents`, `module.exports`
- Modify: `plugins/forge/scripts/session-facts.js:4-55` · `const os = require('node:os');`, `const RECENT_MS`, `projectDir`, `newestSession`, `sessionById`, `resolveSession`
- Modify: `plugins/forge/scripts/session-facts.js` · `ownTranscriptOf`
- Modify: `plugins/forge/scripts/session-facts.js` · `const { subagentFiles } = require('./lib/session-files');`
- Test: `plugins/forge/tests/retro-timeline.test.js`

**Interfaces:**
- Consumes: aus Task 2 `resolveSession(options)` (bisher in `session-facts.js`, zieht hier nach `lib/session-files.js` um); aus Task 11 `ownTranscriptOf(options, file)` (zieht ebenfalls um); aus Task 14 `lib/session-files.js` mit `findTranscript(sessionId, projectsDir)` und `subagentFiles(transcript)`; Task 1 `readEntries`, `textOf`, `shorten`, `clock`, `callLabel`, `humanEvents`, `isCompactEntry`, `isPlainUserText`, `RetroError`; Fixtures `human`, `request`, `say`, `call`, `result`, `hint`, `summary`, `plainSummary`, `stamp`, `writeSession`.
- Produces: `lib/session-files.js` erweitert um: `projectDir(cwd: string, home = os.homedir()): string`; `sessionById(dir: string, id: string): string`; `resolveSession(options): { file: string, warning: string|null }` (unverändertes Verhalten, Fehler als `RetroError`); `ownTranscriptOf(options, file): string|null` (unverändert aus Task 11); `findTranscript` und `subagentFiles` bleiben aus Task 14, `sessionById` nutzt `findTranscript` aus derselben Datei, `lib/session-files.js` hat kein `require('../mcp-usage')`. `session-facts.js` importiert `projectDir`, `resolveSession`, `ownTranscriptOf` und `subagentFiles` von dort und exportiert `projectDir` und `resolveSession` weiter; `retro-timeline.js` hängt nur an Bibliotheken, nicht an einem anderen CLI-Skript, und die Protokoll-Ortung der neuen Skripte liegt nur in `lib/session-files.js`. Bewusst genutzte Module außerhalb von `lib/` bleiben `forge-config.js` (Konfigurationsmodul, eingebunden in `lib/retro-summary.js`) und `sameServer` aus `mcp-usage.js` (Namensvergleich der MCP-Server, eingebunden in `lib/retro-draft.js`). · `lib/transcript.js`: `lineCount(file: string): number`; `isSummary(entry, marked: boolean): boolean` (wahr bei `isCompactSummary`, bei `isCompactEntry` und, wenn das Protokoll `origin` kennt, bei `isPlainUserText` ohne `origin`); dieselben Prädikate nutzen `analyze` (Zählung) und `isHumanInput`, Zählung und Zeitleiste erkennen eine Zusammenfassung damit gleich. `retro-timeline.js` CLI `(--session <id> | --file <session.jsonl>) [--cwd <projektordner>] [--entry <n> | --from <n>]`; Zeilen `#<n> <HH:MM> <Art>: <Text>` mit Art `Mensch`, `Unterbrechung`, `Ablehnung`, `Text`, `Aufruf`, `Fehler`, `Zusammenfassung`, ab Eintrag `--from` (Standard 1) und höchstens `MAX_ROWS = 300` Zeilen je Aufruf; darüber endet die Ausgabe vor dem ersten Eintrag, der nicht mehr ganz passt, mit `… weitere <n> Zeilen bis #<letzte>; mit --from <nächste> fortsetzen oder --entry nutzen`; mit `--entry` Blöcke `## Eintrag <n> · <HH:MM> · <typ>`; Nummer außerhalb → Exit 1 `Eintrag <n> liegt außerhalb des Protokolls (1-<max>)`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-timeline.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const { human, request, say, call, result, hint, summary, plainSummary, stamp, writeSession } = require('./lib/retro-session');
  const { projectDir } = require('../scripts/lib/session-files');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-timeline.js');
  const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

  function longSession() {
    return writeSession(Array.from({ length: 310 }, (_, index) => human(`Eingabe ${index + 1}`, '10:00')));
  }

  function timelineSession() {
    return writeSession([
      human('Plane X', '10:00'),
      request('r1', '10:01', [say('Ich lese den Plan'), call('t1', 'Read', { file_path: 'plan.md' })]),
      result('t1', '10:01', 'Datei fehlt', true),
      hint('total_tokens_reminder', '10:01'),
      plainSummary('This session is being continued from a previous conversation.', '10:20'),
      human('Weiter', '10:30'),
    ]);
  }

  function timeline(...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } });
  }

  test('cli_Timeline_OneShortLinePerInputTextCallErrorAndSummary', () => {
    const output = timeline('--file', timelineSession());

    assert.equal(output.status, 0, output.stderr);
    assert.equal(output.stdout, [
      '#1 10:00 Mensch: Plane X',
      '#2 10:01 Text: Ich lese den Plan',
      '#2 10:01 Aufruf: Read plan.md',
      '#3 10:01 Fehler: Datei fehlt',
      '#5 10:20 Zusammenfassung',
      '#6 10:30 Mensch: Weiter',
      '',
    ].join('\n'));
  });

  test('cli_TimelineLongText_ShortenedToEightyCharacters', () => {
    const output = timeline('--file', writeSession([request('r1', '10:00', [say('x'.repeat(200))])]));

    assert.equal(output.stdout.trimEnd(), `#1 10:00 Text: ${'x'.repeat(79)}…`);
  });

  test('cli_Entry_ShowsEntryAndNeighboursInDetail', () => {
    const output = timeline('--file', timelineSession(), '--entry', '3');

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /## Eintrag 3 · 10:01 · user ← gesucht\nErgebnis \(Fehler\): Datei fehlt/);
    for (const number of [1, 2, 4, 5]) assert.match(output.stdout, new RegExp(`## Eintrag ${number} · `));
    assert.doesNotMatch(output.stdout, /## Eintrag 6 /);
  });

  test('cli_EntryOutsideProtocol_ReportedWithExitOne', () => {
    for (const number of ['99', '0']) {
      const output = timeline('--file', timelineSession(), '--entry', number);

      assert.equal(output.status, 1, number);
      assert.match(output.stderr, new RegExp(`Eintrag ${number} liegt außerhalb des Protokolls \\(1-6\\)`));
    }
  });

  test('cli_NoSource_ExitsWithTwo', () => {
    assert.equal(timeline().status, 2);
  });

  test('cli_SummaryWithCompactMarker_ShownAsSummary', () => {
    const output = timeline('--file', writeSession([human('Los', '10:00'), summary('This session is being continued.', '10:20')]));

    assert.equal(output.stdout, '#1 10:00 Mensch: Los\n#2 10:20 Zusammenfassung\n');
  });

  test('cli_SystemCompactEntry_CountedAndShownAsSummaryAlike', () => {
    const file = writeSession([
      human('Los', '10:00'),
      { type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted', timestamp: stamp('10:20') },
    ]);

    const counted = spawnSync(process.execPath, [FACTS, '--file', file], { encoding: 'utf8' });
    const shown = timeline('--file', file);

    assert.match(counted.stdout, /Zusammenfassungen: 1\n/);
    assert.equal(shown.stdout, '#1 10:00 Mensch: Los\n#2 10:20 Zusammenfassung\n');
  });

  test('cli_TimelineOverRowLimit_EndsWithHintToContinue', () => {
    const output = timeline('--file', longSession());
    const lines = output.stdout.trimEnd().split('\n');

    assert.equal(output.status, 0, output.stderr);
    assert.equal(lines.length, 301);
    assert.equal(lines[299], '#300 10:00 Mensch: Eingabe 300');
    assert.equal(lines[300], '… weitere 10 Zeilen bis #310; mit --from 301 fortsetzen oder --entry nutzen');
  });

  test('cli_TimelineFrom_ListsRemainingRowsWithoutHint', () => {
    const output = timeline('--file', longSession(), '--from', '301');

    assert.equal(output.status, 0, output.stderr);
    assert.equal(output.stdout, `${Array.from({ length: 10 }, (_, index) => `#${301 + index} 10:00 Mensch: Eingabe ${301 + index}`).join('\n')}\n`);
  });

  test('cli_Session_ReadsProtocolFromProjectFolder', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-home-'));
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-project-'));
    const dir = projectDir(cwd, home);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(writeSession([human('Plane X', '10:00')]), path.join(dir, 'eigene.jsonl'));

    const output = spawnSync(process.execPath, [SCRIPT, '--session', 'eigene', '--cwd', cwd], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home, TZ: 'UTC' } });

    assert.equal(output.status, 0, output.stderr);
    assert.equal(output.stdout, '#1 10:00 Mensch: Plane X\n');
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-timeline.test.js` — erwartet: FAIL `cli_Timeline_OneShortLinePerInputTextCallErrorAndSummary` (Skript fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/transcript.js` direkt nach `readEntries` die Funktion `lineCount` einfügen, direkt nach `humanEvents` die Funktion `isSummary`, und `module.exports` ersetzen:
  ```js
  function lineCount(file) {
    return fs.readFileSync(file, 'utf8').replace(/\n$/, '').split('\n').length;
  }
  ```
  ```js
  // `isCompactSummary` kam in keinem echten Protokoll vor (W · Protokoll-Marker). Kennt das Protokoll `origin`, ist eine
  // Zusammenfassung ein Text-Eintrag des Nutzers ohne `origin`; dieselben Prädikate wie Zählung und Eingaben.
  function isSummary(entry, marked) {
    if (entry.isCompactSummary || isCompactEntry(entry)) return true;
    return marked && !entry.origin && isPlainUserText(entry);
  }
  ```
  ```js
  module.exports = {
    RetroError, SLASH_COMMAND, readEntries, lineCount, textOf, tokensOf, shorten, clock, callLabel, isToolResultEntry, isCompactEntry, humanEvents, isSummary,
  };
  ```
  `plugins/forge/scripts/lib/session-files.js` wird ganz ersetzt durch (Stand aus Task 14 plus Inhalt aus `session-facts.js`, Fehler als `RetroError`):
  ```js
  'use strict';

  // Findet die Protokolldateien einer Session: als Datei, über die Session-Kennung, als neuestes im Projektordner
  // und die Protokolle ihrer Subagents.

  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { RetroError } = require('./transcript');

  const RECENT_MS = 10 * 60 * 1000;

  function configDir() {
    return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  }

  function findTranscript(sessionId, projectsDir = path.join(configDir(), 'projects')) {
    const dirs = fs.existsSync(projectsDir) ? fs.readdirSync(projectsDir) : [];
    const hit = dirs.map((dir) => path.join(projectsDir, dir, `${sessionId}.jsonl`)).find((file) => fs.existsSync(file));
    if (!hit) throw new RetroError(`Transkript zur Session ${sessionId} nicht gefunden unter ${projectsDir}`);
    return hit;
  }

  // Der Ordneraufbau `<protokoll>/subagents/*.jsonl` steht nur hier.
  function subagentFiles(transcript) {
    const dir = path.join(transcript.replace(/\.jsonl$/, ''), 'subagents');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).map((name) => path.join(dir, name));
  }

  function projectDir(cwd, home = os.homedir()) {
    return path.join(home, '.claude', 'projects', path.resolve(cwd).replace(/[^A-Za-z0-9]/g, '-'));
  }

  // Neueste Session im Projektordner. Wurden kurz davor weitere geschrieben, ist „neueste“ mehrdeutig: Warnung.
  function newestSession(dir) {
    if (!fs.existsSync(dir)) throw new RetroError(`Kein Session-Ordner: ${dir}`);
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl'))
      .map((name) => ({ file: path.join(dir, name), mtime: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length === 0) throw new RetroError(`Keine Session-Datei in ${dir}`);
    const [newest, ...others] = files;
    const rivals = others.filter(({ mtime }) => newest.mtime - mtime < RECENT_MS).map(({ file }) => path.basename(file, '.jsonl'));
    const warning = rivals.length === 0 ? null
      : `Warnung: ${rivals.length} weitere Session(s) in den letzten 10 min geschrieben (${rivals.join(', ')}); gelesen wird ${path.basename(newest.file, '.jsonl')}. Eigene Session mit --session <id> wählen.`;
    return { file: newest.file, warning };
  }

  function sessionById(dir, id) {
    const own = path.join(dir, `${id}.jsonl`);
    if (fs.existsSync(own)) return own;
    try {
      return findTranscript(id, path.dirname(dir));
    } catch {
      // Die Suche in allen Projektordnern meldet nur „nicht gefunden“; die eigene Meldung nennt den durchsuchten Ordner.
      throw new RetroError(`Session ${id} nicht gefunden unter ${path.dirname(dir)}`);
    }
  }

  function resolveSession(options) {
    if (options.file) return { file: path.resolve(options.file), warning: null };
    const dir = projectDir(options.cwd ?? process.cwd());
    if (options.session) return { file: sessionById(dir, options.session), warning: null };
    return newestSession(dir);
  }

  // Protokoll der eigenen Session: bei `--file` plus `--session` gehört der Snapshot zur eigenen Session.
  function ownTranscriptOf(options, file) {
    if (!options.session || !options.file) return file;
    try {
      return sessionById(projectDir(options.cwd ?? process.cwd()), options.session);
    } catch {
      // Ohne eigenes Protokoll lassen sich später nur die Kosten der Retrospektive nicht messen.
      return null;
    }
  }

  module.exports = { findTranscript, subagentFiles, projectDir, sessionById, resolveSession, ownTranscriptOf };
  ```
  In `plugins/forge/scripts/session-facts.js`:
  (a) Die Zeilen `const os = require('node:os');` und `const RECENT_MS = 10 * 60 * 1000;` entfallen, ebenso die Funktionen `projectDir`, `newestSession` (samt Kommentar „Neueste Session im Projektordner …“), `sessionById`, `resolveSession` und `ownTranscriptOf` (samt Kommentar „Protokoll der eigenen Session …“).
  (b) Die Zeile `const { subagentFiles } = require('./lib/session-files');` aus Task 14 wird zu:
  ```js
  const { projectDir, resolveSession, ownTranscriptOf, subagentFiles } = require('./lib/session-files');
  ```
  `module.exports` bleibt; `projectDir` und `resolveSession` werden weiter exportiert.
  `plugins/forge/scripts/retro-timeline.js` neu:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Kurze Zeitleiste eines Protokolls; mit --entry ein Eintrag und seine Nachbarn im Detail. Ersetzt die Textsuche im Rohprotokoll.

  const fs = require('node:fs');
  const { RetroError, readEntries, lineCount, textOf, shorten, clock, callLabel, humanEvents, isSummary } = require('./lib/transcript');
  const { resolveSession } = require('./lib/session-files');

  const USAGE = 'Aufruf: node retro-timeline.js (--session <id> | --file <session.jsonl>) [--cwd <projektordner>] [--entry <n> | --from <n>]\n';
  const FLAGS = { '--session': 'session', '--file': 'file', '--cwd': 'cwd', '--entry': 'entry', '--from': 'from' };
  const NUMBER_OPTIONS = ['entry', 'from'];
  const LINE_TEXT = 80;
  const DETAIL_TEXT = 1500;
  const NEIGHBOURS = 2;
  // Obergrenze je Aufruf, damit die Zeitleiste einer langen Session den Kontext der Retrospektive nicht füllt; `--from` setzt fort.
  const MAX_ROWS = 300;

  function numberOf(value) {
    return value === undefined ? undefined : Number(value);
  }

  function parseArgs(args) {
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      const key = FLAGS[args[index]];
      if (!key || args[index + 1] === undefined) return null;
      options[key] = args[index + 1];
    }
    if (!options.session && !options.file) return null;
    if (NUMBER_OPTIONS.some((key) => options[key] !== undefined && !/^\d+$/.test(options[key]))) return null;
    return { ...options, entry: numberOf(options.entry), from: numberOf(options.from) };
  }

  function partRows(entry, at, human) {
    const content = Array.isArray(entry.message?.content) ? entry.message.content : [];
    if (entry.type === 'assistant') {
      return content.flatMap((part) => {
        if (part.type === 'text' && part.text.trim()) return [`${at} Text: ${shorten(part.text, LINE_TEXT)}`];
        return part.type === 'tool_use' ? [`${at} Aufruf: ${shorten(callLabel(part), LINE_TEXT)}`] : [];
      });
    }
    if (entry.type !== 'user' || human) return [];
    return content.filter((part) => part.type === 'tool_result' && part.is_error).map((part) => `${at} Fehler: ${shorten(textOf(part.content), LINE_TEXT)}`);
  }

  function rowsOf(entry, humans, marked) {
    const at = `#${entry.entryNo} ${clock(entry.timestamp)}`;
    if (isSummary(entry, marked)) return [`${at} Zusammenfassung`];
    const own = humans.get(entry.entryNo) ?? [];
    const human = own.map((event) => `${at} ${event.kind === 'Eingabe' ? 'Mensch' : event.kind}: ${shorten(event.text, LINE_TEXT)}`);
    return [...human, ...partRows(entry, at, own.length > 0)];
  }

  // Höchstens MAX_ROWS Zeilen. Der Schnitt fällt vor den ersten Eintrag, der nicht mehr ganz passt, damit `--from` ihn ganz
  // zeigt; ein Eintrag hat nur wenige Zeilen (Eingabe, Text, Aufrufe, Fehler).
  function page(rows) {
    if (rows.length <= MAX_ROWS) return rows.map((row) => row.text);
    const next = rows[MAX_ROWS].entryNo;
    const shown = rows.filter((row) => row.entryNo < next);
    const hint = `… weitere ${rows.length - shown.length} Zeilen bis #${rows[rows.length - 1].entryNo}; mit --from ${next} fortsetzen oder --entry nutzen`;
    return [...shown.map((row) => row.text), hint];
  }

  // Je Eingabe, Text, Tool-Aufruf, Fehler und Zusammenfassung eine gekürzte Zeile, ab Eintrag `from`. Eingaben und
  // Markierung kommen aus dem ganzen Protokoll, damit ein späterer Start dieselben Zeilen zeigt.
  function timeline(entries, from = 1) {
    const humans = new Map();
    for (const event of humanEvents(entries)) humans.set(event.entryNo, [...(humans.get(event.entryNo) ?? []), event]);
    const marked = entries.some((entry) => entry.origin);
    const rows = entries.filter((entry) => entry.entryNo >= from)
      .flatMap((entry) => rowsOf(entry, humans, marked).map((text) => ({ entryNo: entry.entryNo, text })));
    return page(rows);
  }

  function partText(part) {
    if (typeof part === 'string') return part;
    if (part?.type === 'tool_use') return `Aufruf ${part.name}: ${JSON.stringify(part.input)}`;
    if (part?.type === 'tool_result') return `Ergebnis${part.is_error ? ' (Fehler)' : ''}: ${textOf(part.content)}`;
    if (part?.type === 'text') return part.text;
    return JSON.stringify(part);
  }

  function detailText(entry) {
    const content = entry.message?.content;
    const parts = Array.isArray(content) ? content : [content ?? entry.attachment ?? entry.content ?? ''];
    return parts.map(partText).join('\n').slice(0, DETAIL_TEXT);
  }

  function detail(entries, entryNo, total) {
    if (entryNo < 1 || entryNo > total) throw new RetroError(`Eintrag ${entryNo} liegt außerhalb des Protokolls (1-${total})`);
    return entries.filter((entry) => Math.abs(entry.entryNo - entryNo) <= NEIGHBOURS).map((entry) => [
      `## Eintrag ${entry.entryNo} · ${clock(entry.timestamp)} · ${entry.type}${entry.entryNo === entryNo ? ' ← gesucht' : ''}`,
      detailText(entry),
      '',
    ].join('\n'));
  }

  function linesFor(options) {
    const { file } = resolveSession(options);
    if (!fs.existsSync(file)) throw new RetroError(`Session-Datei nicht gefunden: ${file}`);
    const entries = readEntries(file);
    return options.entry === undefined ? timeline(entries, options.from ?? 1) : detail(entries, options.entry, lineCount(file));
  }

  function main() {
    const options = parseArgs(process.argv.slice(2));
    if (!options) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    try {
      process.stdout.write(`${linesFor(options).join('\n')}\n`);
    } catch (error) {
      if (!(error instanceof RetroError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { parseArgs, timeline, detail };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-timeline.test.js plugins/forge/tests/transcript.test.js plugins/forge/tests/session-facts.test.js plugins/forge/tests/session-files.test.js plugins/forge/tests/mcp-usage.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/retro-timeline.js plugins/forge/scripts/lib/session-files.js plugins/forge/scripts/lib/transcript.js plugins/forge/scripts/session-facts.js plugins/forge/tests/retro-timeline.test.js` · `git commit -m "feat(forge): retro-timeline shows a short timeline and single entries"`

---

### Task 17: Vorsortierung der Berichte

**ACs:** AC-21

**Dateien:**
- Create: `plugins/forge/scripts/retro-sort.js`
- Test: `plugins/forge/tests/retro-sort.test.js`

**Interfaces:**
- Consumes: aus Task 12 `parseDraft(text)`, `findingsOf(sectionLines)`, `relevanceLines(lines)`, `parseTarget(text)` (Grammatik der Ziel-Zeile; `retro-sort.js` ergänzt nur die Alt-Form in `legacyTarget`).
- Produces: `retro-sort.js` CLI `[--dir <berichtsordner>]` (Default `docs/wishes` im aktuellen Ordner), Exit 0 auch ohne Ordner oder Bericht. Exporte `targetKey(target: string|undefined): string`, `sort(dir: string): string`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/retro-sort.test.js` neu:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { targetKey } = require('../scripts/retro-sort');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'retro-sort.js');

  function findingLines(number, title, target) {
    return [`${number}. **${title}.**`, '   *Situation:* s', `   *Ziel:* ${target}`, '   *Im Projekt:* p', ''];
  }

  function reportText({ friction = [], savings = [], relevance = null, heading = '# Erfahrungsbericht X' }) {
    return [
      heading, '', '**Lauf:** x', '**Ergebnis:** y', '', '## Zahlen', '- Dauer: 1 min', '', '## MCP-Nutzung', '', 'Quelle: x', '',
      ...(relevance ? ['**Relevanz:**', ...relevance.map(([mcp, value]) => `- ${mcp}: ${value}`), ''] : []),
      '## Positiv', '', '1. **Gut.** z', '',
      '## Reibung', '', ...friction.flatMap(([title, target], index) => findingLines(index + 1, title, target)),
      '## Sparpotenzial', '', ...savings.flatMap(([title, target], index) => findingLines(index + 1, title, target)),
      '## Neue Ideen', '', '- keine', '', '## Kleinigkeiten', '', '- keine', '',
    ].join('\n');
  }

  function wishesDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-wishes-'));
    const write = (name, text) => fs.writeFileSync(path.join(dir, name), text);
    write('2026-09-28-a.md', reportText({
      friction: [['Loop weckt Hauptsession', 'Skill · `dv-forge:plan-review` (Orchestrator)'], ['Warten ohne Skript', 'Skript · neu: wait-results']],
      savings: [['Review zu breit', 'Skill · `dv-forge:plan-review`']],
      relevance: [['dev-mcp', 'verzichtbar in dieser Session.'], ['codebase-analyzer', 'hätte genützt, weil 29 Grep-Aufrufe.']],
    }));
    write('2026-09-28-b.md', reportText({
      friction: [['Warten dauert', 'Skript · `neu:` Skript · wait-results']],
      relevance: [['dev-mcp', 'gebraucht für die Suche.'], ['codebase-analyzer', 'unklar']],
    }));
    write('2026-09-28-c.md', reportText({ friction: [['Unklar wohin', 'Ziel offen']] }));
    write('all-wishes.md', reportText({ heading: '# Verbesserungs-Wunschliste', friction: [['Zählt nicht', 'Hook · `x`']] }));
    write('2026-09-28-wunsch.md', reportText({ heading: '# Wunsch: Neu ausrichten', friction: [['Zählt nicht', 'Hook · `x`']] }));
    return dir;
  }

  function sortOf(...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  }

  test('cli_Reports_GroupedByTargetLargestFirst', () => {
    const output = sortOf('--dir', wishesDir());

    assert.equal(output.status, 0, output.stderr);
    assert.match(output.stdout, /^# Vorsortierung: 3 Berichte, 5 Befunde\n\n## Skill · dv-forge:plan-review \(2\)\n- Loop weckt Hauptsession · Reibung · 2026-09-28-a\.md\n- Review zu breit · Sparpotenzial · 2026-09-28-a\.md\n\n## Skript · neu: wait-results \(2\)\n[\s\S]*\n## Ziel offen \(1\)\n/);
  });

  test('cli_Reports_RelevanceTableCountsPerMcp', () => {
    const output = sortOf('--dir', wishesDir());

    assert.match(output.stdout, /\| MCP \| gebraucht \| hätte genützt \| verzichtbar \| sonstig \|\n\|---\|---\|---\|---\|---\|\n\| codebase-analyzer \| 0 \| 1 \| 0 \| 1 \|\n\| dev-mcp \| 1 \| 0 \| 1 \| 0 \|\n/);
  });

  test('cli_ReportWithoutRelevance_CountedNowhereAndNamed', () => {
    const output = sortOf('--dir', wishesDir());

    assert.match(output.stdout, /Ohne Relevanz-Zeile: 2026-09-28-c\.md\n/);
  });

  test('cli_MissingDir_ReportsAndExitsWithZero', () => {
    const output = sortOf('--dir', path.join(os.tmpdir(), 'gibt-es-nicht-retro'));

    assert.equal(output.status, 0);
    assert.match(output.stdout, /^Keine Berichte: Ordner .* fehlt\.\n$/);
  });

  test('cli_DirWithoutReports_ReportsAndExitsWithZero', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-empty-'));
    fs.writeFileSync(path.join(dir, 'all-wishes.md'), '# Verbesserungs-Wunschliste\n');

    const output = sortOf('--dir', dir);

    assert.equal(output.status, 0);
    assert.match(output.stdout, /^Keine Berichte in .*\.\n$/);
  });

  test('targetKey_OldAndNewForms_SameGroup', () => {
    assert.deepEqual(
      [targetKey('Skript · neu: wait-results'), targetKey('Skript · `neu:` Skript · wait-results'), targetKey('Skill · `dv-forge:plan-review` (x)'), targetKey(undefined)],
      ['Skript · neu: wait-results', 'Skript · neu: wait-results', 'Skill · dv-forge:plan-review', 'Ziel offen'],
    );
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-sort.test.js` — erwartet: FAIL `cli_Reports_GroupedByTargetLargestFirst` (Skript fehlt)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/retro-sort.js` neu:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Sortiert die Befunde aller Erfahrungsberichte nach Ziel vor und zählt die MCP-Relevanz, als Vorlage für die Wunschliste.

  const fs = require('node:fs');
  const path = require('node:path');
  const { parseDraft, findingsOf, relevanceLines, parseTarget } = require('./lib/retro-draft');

  const USAGE = 'Aufruf: node retro-sort.js [--dir <berichtsordner>]\n';
  const REPORT_FILE = /^\d{4}-\d{2}-\d{2}-.+\.md$/;
  const REPORT_TITLE = /^# Erfahrungsbericht\b/;
  const TARGET_SECTIONS = ['Reibung', 'Sparpotenzial'];
  const VALUES = [['gebraucht', /^gebraucht/i], ['hätte genützt', /^hätte genützt/i], ['verzichtbar', /^verzichtbar/i]];
  const RAW_TARGET_MAX = 40;
  const OPEN_KEY = 'Ziel offen';
  const LEGACY_TARGET = /^([^·]+?) · `neu:` (?:[^·]+?· )?(.+?)\s*(?:\(|$)/;
  const RAW_TARGET = /^([^·]+?)\s+·\s+(.*)$/;

  // Berichte sind datierte Dateien mit dem Titel „# Erfahrungsbericht“; Wunschliste und andere Dokumente zählen nicht.
  function reportsIn(dir) {
    return fs.readdirSync(dir).filter((name) => REPORT_FILE.test(name)).sort()
      .map((name) => ({ name, text: fs.readFileSync(path.join(dir, name), 'utf8').replace(/\r\n/g, '\n') }))
      .filter(({ text }) => REPORT_TITLE.test(text.trimStart()));
  }

  // Die ältere Form „<Art> · `neu:` <Art> · <Name>“ lässt die Prüfung nicht mehr zu; alte Berichte fallen trotzdem in die Gruppe des neu:-Ziels.
  function legacyTarget(value) {
    const match = value.match(LEGACY_TARGET);
    return match ? { art: match[1].trim(), name: match[2].trim(), isNew: true, open: false } : null;
  }

  // Ziel-Zeilen außerhalb der Grammatik gruppieren nach Art und dem Anfang des Rests; ohne Art gelten sie als offen.
  function rawKey(value) {
    const match = value.match(RAW_TARGET);
    return match ? `${match[1]} · ${match[2].trim().slice(0, RAW_TARGET_MAX)}` : OPEN_KEY;
  }

  // Gruppenschlüssel „<Art> · <Name>“ oder „<Art> · neu: <Name>“; die Grammatik kommt aus `parseTarget` in lib/retro-draft.js.
  function targetKey(target) {
    const value = (target ?? '').trim();
    const parsed = parseTarget(value) ?? legacyTarget(value);
    if (!parsed) return rawKey(value);
    if (parsed.open) return OPEN_KEY;
    return parsed.isNew ? `${parsed.art} · neu: ${parsed.name}` : `${parsed.art} · ${parsed.name}`;
  }

  function classify(value) {
    return VALUES.find(([, pattern]) => pattern.test(value))?.[0] ?? 'sonstig';
  }

  // Je Befund unter Reibung und Sparpotenzial ein Gruppenschlüssel und seine Zeile.
  function findingLines(reports) {
    return reports.flatMap(({ name, text }) => {
      const draft = parseDraft(text);
      return TARGET_SECTIONS.flatMap((section) => findingsOf(draft.sections.get(section))
        .map((finding) => ({ key: targetKey(finding.fields.get('Ziel')), line: `- ${finding.title} · ${section} · ${name}` })));
    });
  }

  function relevanceRows(reports) {
    return reports.flatMap(({ text }) => relevanceLines(parseDraft(text).lines));
  }

  function withoutRelevanceOf(reports) {
    return reports.filter(({ text }) => relevanceLines(parseDraft(text).lines).length === 0).map(({ name }) => name);
  }

  function groupBy(items) {
    return items.reduce((groups, { key, line }) => groups.set(key, [...(groups.get(key) ?? []), line]), new Map());
  }

  function countRelevance(rows) {
    return rows.reduce((counts, { mcp, value }) => {
      const row = counts.get(mcp) ?? { gebraucht: 0, 'hätte genützt': 0, verzichtbar: 0, sonstig: 0 };
      row[classify(value)] += 1;
      return counts.set(mcp, row);
    }, new Map());
  }

  function collect(reports) {
    return {
      groups: groupBy(findingLines(reports)),
      relevance: countRelevance(relevanceRows(reports)),
      withoutRelevance: withoutRelevanceOf(reports),
    };
  }

  function render(reports, { groups, relevance, withoutRelevance }) {
    const findings = [...groups.values()].reduce((sum, list) => sum + list.length, 0);
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const rows = [...relevance.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mcp, row]) => `| ${mcp} | ${row.gebraucht} | ${row['hätte genützt']} | ${row.verzichtbar} | ${row.sonstig} |`);
    return [
      `# Vorsortierung: ${reports.length} Berichte, ${findings} Befunde`,
      '',
      ...sorted.flatMap(([key, list]) => [`## ${key} (${list.length})`, ...list, '']),
      '## MCP-Relevanz',
      '',
      '| MCP | gebraucht | hätte genützt | verzichtbar | sonstig |',
      '|---|---|---|---|---|',
      ...rows,
      '',
      `Ohne Relevanz-Zeile: ${withoutRelevance.join(', ') || 'keiner'}`,
      '',
    ].join('\n');
  }

  function sort(dir) {
    if (!fs.existsSync(dir)) return `Keine Berichte: Ordner ${dir} fehlt.\n`;
    const reports = reportsIn(dir);
    if (reports.length === 0) return `Keine Berichte in ${dir}.\n`;
    return render(reports, collect(reports));
  }

  function main() {
    const args = process.argv.slice(2);
    const valid = args.length === 0 || (args.length === 2 && args[0] === '--dir');
    if (!valid) {
      process.stderr.write(USAGE);
      process.exit(2);
    }
    process.stdout.write(sort(path.resolve(args[1] ?? path.join('docs', 'wishes'))));
  }

  if (require.main === module) main();

  module.exports = { targetKey, sort };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-sort.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/retro-sort.js plugins/forge/tests/retro-sort.test.js` · `git commit -m "feat(forge): retro-sort groups report findings by target and counts MCP relevance"`

---

### Task 18: Skill, Berichtsformat und Projektbeschreibung

**ACs:** AC-22, AC-23

**Dateien:**
- Modify: `plugins/forge/skills/prozess-retrospektive/SKILL.md` · `name: prozess-retrospektive` (ganze Datei)
- Modify: `plugins/forge/skills/prozess-retrospektive/references/report-format.md` · `# Erfahrungsbericht` (ganze Datei)
- Modify: `plugins/forge/skills/prozess-retrospektive/references/signals.md` · `# Signale` (Datei löschen)
- Modify: `plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md` · `# Häufige Fehler` (Datei löschen)
- Modify: `README.md:139-160` · `` #### `prozess-retrospektive` (plugin `dv-forge`) ``
- Test: `plugins/forge/tests/prozess-retrospektive.test.js` · `prozessRetrospektive_Frontmatter_OnlyNameAndDescription` (ganze Datei)

**Interfaces:**
- Consumes: Aufrufe aus Task 2, 3, 11 (`session-facts.js --session … --before-retro --snapshot --lenient`), Task 14/15 (`retro-report.js --format`, `--session … --topic …`), Task 16 (`retro-timeline.js --session … --entry <n>`), Task 17 (`retro-sort.js`); Feldnamen und Ziel-Formen aus Task 12.
- Produces: Skill mit `disable-model-invocation: true` und `allowed-tools` für die vier Skripte in Bash und PowerShell, dazu `Edit(~/.dv-forge/retro/*)` (Claude-Code-Regeln für `Edit` gelten für alle Datei-schreibenden Tools, also auch für das `Write` des Entwurfs außerhalb des Projektordners; einen alten Entwurf entfernt schon `--snapshot` aus Task 11); Fakten und Format per `` !`…` `` im Skill-Text; einzige Referenz `references/report-format.md`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  `plugins/forge/tests/prozess-retrospektive.test.js` wird vollständig ersetzt durch:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { readText, readMarkdown, wordCount } = require('./lib/markdown');

  const PLUGIN_ROOT = path.join(__dirname, '..');
  const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'prozess-retrospektive');
  const SKILL = path.join(SKILL_DIR, 'SKILL.md');
  const README = path.join(PLUGIN_ROOT, '..', '..', 'README.md');
  const SCRIPTS = ['session-facts.js', 'retro-report.js', 'retro-timeline.js', 'retro-sort.js'];
  const JUDGEMENT_SIGNALS = [
    'Rückfrage oder Korrektur durch den Menschen',
    'Skill geladen, aber nicht befolgt',
    'Ergebnis erzeugt, aber nie genutzt',
    'teures Modell oder breiter Lauf, wo ein schmaler reicht',
    'Mensch wartet auf etwas, das parallel laufen könnte',
  ];

  function reportFormat() {
    return readText(path.join(SKILL_DIR, 'references', 'report-format.md'));
  }

  test('prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts', () => {
    const { fields } = readMarkdown(SKILL);

    assert.deepEqual(Object.keys(fields), ['name', 'description', 'disable-model-invocation', 'allowed-tools']);
    assert.equal(fields['disable-model-invocation'], 'true');
    assert.match(fields.description, /^Use when the human types \/dv-forge:prozess-retrospektive/);
  });

  test('prozessRetrospektive_AllowedTools_EveryScriptInBashAndPowerShell', () => {
    const { fields } = readMarkdown(SKILL);

    for (const shell of ['Bash', 'PowerShell']) {
      for (const script of SCRIPTS) {
        assert.ok(fields['allowed-tools'].includes(`${shell}(node "\${CLAUDE_PLUGIN_ROOT}/scripts/${script}" *)`), `${shell} ${script}`);
      }
    }
  });

  test('prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking', () => {
    const { fields } = readMarkdown(SKILL);

    assert.ok(fields['allowed-tools'].split(' ').includes('Edit(~/.dv-forge/retro/*)'));
  });

  test('prozessRetrospektive_Body_InjectsFactsAndFormatBeforeTheModelReads', () => {
    const lines = readMarkdown(SKILL).body.split('\n');

    assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot --lenient`'));
    assert.ok(lines.includes('!`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`'));
  });

  test('prozessRetrospektive_Body_StaysUnder500Words', () => {
    assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
  });

  test('prozessRetrospektive_Body_TimelineInsteadOfTextSearch', () => {
    const { body } = readMarkdown(SKILL);

    assert.ok(body.includes('retro-timeline.js" --session ${CLAUDE_SESSION_ID} --entry <n>'));
    assert.match(body, /nie per Textsuche im Protokoll/);
  });

  test('prozessRetrospektive_Body_DraftPlusScriptInsteadOfSkeleton', () => {
    const { body } = readMarkdown(SKILL);

    assert.ok(body.includes('retro-report.js" --session ${CLAUDE_SESSION_ID} --topic <thema>'));
    assert.match(body, /Entwurf/);
    assert.doesNotMatch(body, /Gerüst|--skeleton/);
  });

  test('prozessRetrospektive_Body_NamesTheFiveJudgementSignals', () => {
    const { body } = readMarkdown(SKILL);

    for (const signal of JUDGEMENT_SIGNALS) assert.ok(body.includes(signal), signal);
  });

  test('prozessRetrospektive_Body_CommitRuleWithWorkitemCandidate', () => {
    const { body } = readMarkdown(SKILL);

    assert.ok(body.includes('forge-config.js" get Commit-Konvention'));
    assert.match(body, /Workitem-Kandidaten/);
    assert.match(body, /Nicht committen, erst fragen/);
  });

  test('prozessRetrospektive_Body_NoFixedContextThresholdAndOnlyFormatReference', () => {
    const { body } = readMarkdown(SKILL);

    assert.doesNotMatch(body, /\d+k/);
    assert.deepEqual([...new Set(body.match(/references\/[\w.-]+/g))], ['references/report-format.md']);
    assert.deepEqual(fs.readdirSync(path.join(SKILL_DIR, 'references')), ['report-format.md']);
  });

  test('prozessRetrospektive_Body_ArgumentsRerunFactsAndSortForWishlist', () => {
    const { body } = readMarkdown(SKILL);

    assert.match(body, /`ARGUMENTS`/);
    assert.ok(body.includes('retro-sort.js'));
  });

  test('readme_Retrospective_NamesNewCallAndNoNaturalLanguageTrigger', () => {
    const text = readText(README);
    const section = text.slice(text.indexOf('#### `prozess-retrospektive`'), text.indexOf('#### `regression-audit`'));

    assert.ok(section.includes('/dv-forge:prozess-retrospektive [--file <session.jsonl> | --since-command <command>]'));
    for (const script of SCRIPTS) assert.ok(section.includes(script), script);
    assert.doesNotMatch(section, /wie lief das|kein-retrospektive/);
  });

  test('reportFormat_Draft_NoSlotsAndThreeTargetForms', () => {
    const text = reportFormat();

    assert.doesNotMatch(text, /<ZAHLEN|<MCP-NUTZUNG|--skeleton/);
    assert.ok(text.includes('*Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen'));
    assert.match(text, /## Was das Skript prüft/);
  });

  test('reportFormat_EveryFinding_HasSituationBetterApproachTargetAndProjectLine', () => {
    const text = reportFormat();
    const template = text.slice(text.indexOf('## Reibung'), text.indexOf('## Neue Ideen'));

    for (const slot of ['*Situation:*', '*Besser gewesen:*', '*Vorschlag:*', '*Ziel:*', '*Im Projekt:*']) {
      assert.equal(template.split(slot).length - 1, 2, `${slot} nicht in Reibung und Sparpotenzial`);
    }
    assert.match(text, /Kein Befund ohne \*Besser gewesen:\*/);
  });

  test('reportFormat_Outsiders_RolesPlaceholdersAndRawDataExempt', () => {
    const text = reportFormat();

    for (const phrase of ['## Für Außenstehende schreiben', 'als ihre **Rolle**', 'beim **Namen**', 'nur unter *Im Projekt:*', 'Platzhalter in eckigen Klammern', '`dotnet build <Solution>`', 'Vor dem Speichern gehst du jeden Befund durch', '„Zahlen“ und „MCP-Nutzung“ sind davon ausgenommen', 'Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit', '`datei:zeile`']) {
      assert.ok(text.includes(phrase), phrase);
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/prozess-retrospektive.test.js` — erwartet: FAIL `prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/prozess-retrospektive/SKILL.md` wird vollständig ersetzt durch:
  ````markdown
  ---
  name: prozess-retrospektive
  description: Use when the human types /dv-forge:prozess-retrospektive to turn how a session went into an experience report with improvements for plugins, skills, hooks, scripts, MCP servers, CLAUDE.md and the way of working.
  disable-model-invocation: true
  allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) Edit(~/.dv-forge/retro/*)
  ---

  # Prozess-Retrospektive

  Du deckst Lücken der Session auf, nicht nur in dv-forge, sondern in allem, was mitlief: Plugins, Skills, Hooks, Skripte, MCP-Server, `CLAUDE.md` und die Arbeitsweise selbst. Zwei Richtungen: **Wo hakte es?** und **Was kostete mehr als nötig?** Wiederkehrende oder unnötige Läufe sind ein Befund, wiederkehrende Handarbeit ein Kandidat für etwas Neues. Jeder Befund ist so geschrieben, dass ihn jemand ohne jede Kenntnis des Projekts versteht.

  ## Fakten dieser Session

  !`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot --lenient`

  ## Berichtsformat (aus `references/report-format.md`)

  !`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`

  ## Ablauf
  1. **Fakten prüfen.** Alle Zahlen oben stammen aus dem Skript; du schreibst keine ab und schätzt keine. Steht dort „Fakten nicht verfügbar“, nennst du den Grund und hörst auf. Steht unter `ARGUMENTS` eine andere Protokolldatei (`--file <pfad>`) oder ein Ausschnitt (`--since-command <befehl>`), holst du die Fakten einmal neu: `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot <Argumente>`. Stammt die Datei aus einem anderen Projekt, hängst du `--cwd <projektordner>` an.
  2. **Nachlesen.** Stellen, auf die die Fakten zeigen, liest du über die Zeitleiste nach, nie per Textsuche im Protokoll: `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" --session ${CLAUDE_SESSION_ID} --entry <n>` zeigt Eintrag `<n>` mit seinen Nachbarn; ohne `--entry` kommt die Zeitleiste stückweise.
  3. **Urteilen.** Die Messwert-Signale deuten die „Hinweise zu den Signalen“ oben. Diese fünf Urteils-Signale beurteilst du selbst: Rückfrage oder Korrektur durch den Menschen · Skill geladen, aber nicht befolgt · Ergebnis erzeugt, aber nie genutzt · teures Modell oder breiter Lauf, wo ein schmaler reicht · Mensch wartet auf etwas, das parallel laufen könnte. Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt.
  4. **Entwurf schreiben.** Ein `Write` an den Pfad aus der Zeile `Entwurf:` oben, im Berichtsformat. „Zahlen“ und „MCP-Nutzung“ lässt du weg; die setzt das Skript ein.
  5. **Bericht erzeugen.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --session ${CLAUDE_SESSION_ID} --topic <thema>`, das Thema aus Kleinbuchstaben, Ziffern und Bindestrichen. Meldet es Verstöße, korrigierst du den Entwurf und rufst es erneut auf.
  6. **Im Chat** gibst du die Kurzfassung des Skripts wieder. Nicht committen, erst fragen. Nach dem Ja committest du nach `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Commit-Konvention` mit dem Workitem-Kandidaten aus der Kurzfassung; lautet er „keiner“ oder passt er nicht zur Session, fragst du vor dem Commit.

  ## Wunschliste
  Mehrere Berichte führst du zusammen, nachdem `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js"` die Befunde nach Ziel vorsortiert und die MCP-Relevanz gezählt hat.
  ````
  `plugins/forge/skills/prozess-retrospektive/references/report-format.md` wird vollständig ersetzt durch:
  ````markdown
  # Erfahrungsbericht

  Gleiches Format wie die bisherigen Berichte unter `docs/wishes/`, damit mehrere Berichte später zu einer Wunschliste zusammengeführt werden können.

  Du schreibst nur den **Entwurf**. `retro-report.js` prüft ihn und setzt daraus den Bericht zusammen: Modell, Skills, Datum und Kennzahlen in den Kopf, „Zahlen“ und „MCP-Nutzung“ aus dem Snapshot, danach deine Abschnitte. Diese Rohdaten tippst du nie ab.

  ## Entwurf

  ```markdown
  # Erfahrungsbericht <Art der Arbeit, allgemein>

  **Lauf:** <was gemacht wurde, welche Skills und Plugins>
  **Ergebnis:** <was herauskam>

  **Relevanz:**
  - <erwartetes MCP>: gebraucht · verzichtbar in dieser Session · hätte genützt, weil <Beleg>

  ## Positiv

  1. **<Kurzbefund>.** <was gut lief, mit Beleg>

  ## Reibung

  1. **<Kurzbefund, allgemein>.**
     *Situation:* <was passiert ist, für Außenstehende erzählt, mit Zahl oder Zitat>
     *Kosten:* <Tokens, Minuten, Runden, Rückfragen: mit Zahl oder am Ende ` · Eindruck`>
     *Ursache:* <warum>
     *Besser gewesen:* <das Vorgehen, das in genau diesem Fall schneller, billiger oder richtig gewesen wäre, als Schritte>
     *Vorschlag:* <was sich dauerhaft ändern soll, damit es nicht wieder passiert>
     *Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen
     *Im Projekt:* <Dateien, Klassen, Fachbegriffe und wörtliche Zitate dieses Projekts, in einer Zeile>

  ## Sparpotenzial

  1. **<Kurzbefund, allgemein>.**
     *Situation:* <welcher Lauf wiederkehrend oder unnötig war, für Außenstehende erzählt, mit Zahl>
     *Ersparnis:* <geschätzt je Session: Tokens, Minuten, Runden; mit Zahl oder am Ende ` · Eindruck`>
     *Besser gewesen:* <wie es in genau diesem Fall billiger gegangen wäre, als Schritte>
     *Vorschlag:* <was das künftig übernimmt>
     *Ziel:* <Art> · `<Name>` | <Art> · neu: <Arbeitsname> | Ziel offen
     *Im Projekt:* <Dateien, Klassen, Fachbegriffe und wörtliche Zitate dieses Projekts, in einer Zeile>

  ## Neue Ideen

  - **<Arbeitsname>** (`neu:` <Art>): <welche Lücke es schließt, an welchem Befund oben sie sichtbar wurde>

  ## Kleinigkeiten

  - <Einzeiler>
  ```

  `<Art>` ist Plugin, Skill, Agent, CLAUDE.md, Hook, Skript oder MCP. Der Kurzbefund ist der fett gesetzte Titel; die Kurzfassung im Chat zeigt ihn. Hat ein Abschnitt keinen Befund, steht dort ein Satz wie „Keine nennenswerten Punkte.“

  ## Was das Skript prüft

  Solange einer dieser Verstöße besteht, schreibt es keinen Bericht und nennt jeden einzeln:
  - ein Pflichtabschnitt oder Pflichtfeld fehlt: Titel, **Lauf:**, **Ergebnis:**, **Relevanz:**, die fünf Abschnitte, die Felder jedes Befunds unter Reibung und Sparpotenzial;
  - eine Ziel-Zeile folgt keiner der drei Formen;
  - *Kosten:* oder *Ersparnis:* trägt weder Zahl noch ` · Eindruck`;
  - für ein erwartetes MCP fehlt die Relevanz-Zeile;
  - ein Dateiname des Projekts steht außerhalb von *Im Projekt:*;
  - ein Zitat unter *Im Projekt:* steht nicht wörtlich im Protokoll.

  Jedes `neu:`-Ziel steht im Bericht genau einmal unter „Neue Ideen“; fehlt es dort, ergänzt es das Skript.

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
  - Eine Aussage ohne Zahl oder Zitat trägt am Ende ` · Eindruck`. Eine Zahl, die das Skript nicht liefert, schätzt du nicht.
  - Die Regel eines anderen Werkzeugs gibst du nie aus dem Gedächtnis wieder: Regeltext mit `datei:zeile` zitieren oder ` · Eindruck`. Ein Vorschlag dagegen ist eine Regeländerung, keine erlaubte Variante.
  - Ein Fehler in einem Werkzeug ist nie eine Kleinigkeit: Er tritt bei jedem Lauf wieder auf und bekommt einen Befund mit `Ziel:`.
  - Kein Befund ohne *Besser gewesen:* und ohne `Ziel:`-Zeile. `neu:` heißt: Das gibt es noch nicht, es lohnt sich, darüber nachzudenken.
  - Positiv steht nur, was sich lohnt beizubehalten. Auch teure, aber fehlerfreie Läufe sind ein Befund.
  - Maßstab für Sparpotenzial: Spart es Zeit, Tokens oder Geld, ohne dass der Ersatz teurer ist? Einen Betrag nennst du nur mit bekanntem Preis.
  - Die Relevanz-Sätze sammeln sich über mehrere Berichte; erst dann wird ein MCP gestrichen, nicht nach einer Session.
  ````
  `plugins/forge/skills/prozess-retrospektive/references/signals.md` und `plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md` werden gelöscht:
  ```bash
  git rm plugins/forge/skills/prozess-retrospektive/references/signals.md plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md
  ```
  In `README.md` wird der Abschnitt von `` #### `prozess-retrospektive` (plugin `dv-forge`) `` bis einschließlich der Zeile `> Always explicit — never auto-triggers.` ersetzt durch:
  ````markdown
  #### `prozess-retrospektive` (plugin `dv-forge`)

  `Process` `Retrospective` `MCP Quality` `Improvement` `Session Analysis`

  Part of the `dv-forge` plugin (`plugins/forge/skills/prozess-retrospektive/`), invoked only by the human as `/dv-forge:prozess-retrospektive [--file <session.jsonl> | --since-command <command>]`; the model never loads it on its own. It looks for gaps in any session, not only in dv-forge runs.

  Everything deterministic runs in scripts, the model only judges and writes. While the skill loads, `plugins/forge/scripts/session-facts.js` puts the session facts into it: human inputs with entry numbers, active and waiting time, context per request, baseline of the first request, cache rebuilds, largest context loads, long tool runs, reruns without change, harness hints, measured MCP usage and one hint per signal that fires. The retrospective itself is cut out of these numbers.

  The model reads single places through `plugins/forge/scripts/retro-timeline.js`, never by text search in the raw transcript. It writes one draft; `plugins/forge/scripts/retro-report.js` checks it, composes the report under `docs/wishes/`, picks the file name and prints the chat summary, the cost of the retrospective and a workitem candidate. `plugins/forge/scripts/retro-sort.js` groups the findings of all reports by target and counts MCP relevance before they are merged into a wish list.

  Expected MCP servers come from `MCP-Erwartet` in the `## dv-forge` section of the project `CLAUDE.md`. Every finding is written for an outsider; project files and verbatim quotes go into a separate *Im Projekt* line.

  | Command | Purpose |
  |---|---|
  | `/dv-forge:prozess-retrospektive` | Retrospective of the current session |
  | `/dv-forge:prozess-retrospektive --file <session.jsonl>` | Retrospective of another transcript |
  | `/dv-forge:prozess-retrospektive --since-command <command>` | Only the part from the last call of a command |
  ````
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS (ganze Suite von dv-forge)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/prozess-retrospektive/SKILL.md plugins/forge/skills/prozess-retrospektive/references/report-format.md plugins/forge/skills/prozess-retrospektive/references/signals.md plugins/forge/skills/prozess-retrospektive/references/common-mistakes.md README.md plugins/forge/tests/prozess-retrospektive.test.js` · `git commit -m "feat(forge): lean retrospective skill loads facts and format and runs scripts without asking"`

## Entscheidungen
- **W · Planungs-Skills** · Aussage — Für diesen Plan gelten `unit-integration-testing` und `software-design-principles`; ihre Kernregeln stehen unter Global Constraints.
- **W · Protokoll-Marker** · Aussage — Der Mensch gab eine einmalige, nur lesende Suche nach den Markern im Protokoll-Ordner dieses Projekts frei. Belegt: Unterbrechung `[Request interrupted by user]`, Ablehnung `The user doesn't want to proceed with this tool use`, Eingabe des Menschen `origin.kind: "human"`, Skill-Text `isMeta: true`. `isCompactSummary` kam in keinem echten Protokoll vor; eine Zusammenfassung wird deshalb über das fehlende `origin` erkannt, `isCompactSummary` ist nur zusätzlicher Ausschluss.
- **E · Skriptaufteilung** · Planer — `session-facts.js` bleibt das Fakten-Skript; neu sind `retro-report.js` (Format, Bericht, Kurzfassung), `retro-timeline.js` und `retro-sort.js`, dazu kleine Bibliotheken je Aufgabe. Grund: kleine Dateien mit einer Verantwortung, der bestehende Aufruf bleibt.
- **E · Eingabe des Menschen** · Planer — Mit `origin` im Protokoll zählt nur `origin.kind === 'human'`, sonst die bisherige Text-Heuristik; `isMeta`, `isCompactSummary`, Tool-Ergebnisse und Unterbrechungen zählen nie als Eingabe. Grund: `origin` ist das einzige belegte, eindeutige Merkmal.
- **E · Eintragsnummer und Uhrzeit** · Planer — Eintragsnummer ist die Zeilennummer im JSONL ab 1, Uhrzeit lokal `HH:MM`. Grund: stabil, mit jedem Editor nachschlagbar, gleich in Fakten und Zeitleiste.
- **E · Kürzung und Umfang der Zeitleiste** · Planer — Eingaben 100 Zeichen, Zeitleistenzeilen 80, Detail 1500 je Eintrag, zwei Nachbarn je Seite; die Zeitleiste zeigt die ganze Datei ohne Ausschnitt, Harness-Anhänge erscheinen nur im Detail.
- **E · Aktive Zeit, Warten, Stille** · Planer — Warten ist die Zeit vom letzten Arbeitsschritt (Anfrage oder Tool-Ergebnis) bis zur nächsten Eingabe; aktiv ist Dauer minus Warten; die Stille läuft von einer Eingabe oder einem Text an den Menschen bis zum nächsten Text und beginnt bei jeder Eingabe neu.
- **E · Harness-Hinweise und Anhänge** · Planer — Hinweise sind alle `attachment`-Einträge nach `attachment.type` plus Nachrichten, die mit einem Hinweis-Tag wie `<system-reminder>` beginnen und nicht vom Menschen stammen. Anhänge vor der ersten Anfrage sind `attachment`-Einträge und Skill-Texte, Größe JSON-Länge durch 4.
- **E · Kontextlast** · Planer — Größe eines Tool-Ergebnisses oder Skill-Texts in Zeichen durch 4; ein Skill-Text nennt als Auslöser den letzten Slash-Befehl oder Skill-Aufruf davor.
- **E · Lange Läufe, Build/Test/Lint und Änderung** · Planer — Dauer vom Tool-Aufruf bis zu seinem Ergebnis, ab 60 s, höchstens 10. Build/Test/Lint ist ein Shell-Befehl mit einem Wort `build`, `test`, `lint`, `vitest`, `jest`, `eslint`, `tsc`, `--test` (auch `test:unit`) oder einem dv-forge-Toolchain-Skript, oder ein MCP-Tool mit build/test/lint im Namen; verglichen wird der ganze Befehl. Als Änderung zählen `Edit`, `Write`, `MultiEdit`, `NotebookEdit` und der Hinweis `edited_text_file`; Dateiänderungen über die Shell erkennt die Messung nicht.
- **E · Signal-Schwellen** · Planer — Jedes Signal schlägt ab 1 an, außer „Hohe Grundlast“ ab 40k Tokens und „Lange Stille“ ab 10 Minuten.
- **E · Shell-Fallbacks** · Planer — Ein Shell-Aufruf zählt, wenn ein Glied der Kette (`&&`, `||`, `;`, Zeilenumbruch) mit `cat`, `head`, `tail`, `less`, `more`, `grep`, `egrep`, `rg`, `find`, `ls`, `sed`, `awk`, `wc`, `Get-Content`, `gc`, `Select-String`, `sls`, `Get-ChildItem`, `gci`, `dir`, `type` oder `findstr` beginnt; Befehle hinter einer Pipe zählen nicht. Die bisherige Liste „Shell-Fallback-Kandidaten“ (Build-Werkzeuge) bleibt als eigenes Signal.
- **E · .mcp.json nicht mehr erwartet** · Planer — In `.mcp.json` konfigurierte Server gelten nur noch als verfügbar. Grund: AC-06 verlangt ohne Liste keine Zeile „erwartet, ungenutzt“.
- **E · Fehlerverzeihender Modus** · Planer — `--lenient` fängt jeden Fehler, schreibt `Fakten nicht verfügbar: <Grund>` auf stdout und endet mit 0. Grund: Ein fehlschlagender eingebetteter Befehl bricht das Laden des Skills ab.
- **E · Ausschnitt** · Planer — `--occurrence` entfällt, weil AC-24 immer den letzten Aufruf vor dem Schnitt nimmt. Unbekannt ist ein Befehl, der weder in der Session aufgerufen wurde noch in der Skill-Liste des Harness steht; sonst gilt ein fehlender Aufruf als leerer Bereich.
- **E · Snapshot und Entwurf** · Planer — Beide liegen unter `<home>/.dv-forge/retro/` als `<session>.snapshot.json` und `<session>.entwurf.md`; die Kennung ist `--session`, sonst der Dateiname der Protokolldatei. Nach dem Bericht werden beide gelöscht.
- **E · Berichtsordner und Datum** · Planer — `docs/wishes` unter `--cwd` bzw. dem Projektordner des Snapshots, Datum lokal `YYYY-MM-DD`; ein fehlender Ordner wird angelegt, ein nicht schreibbarer ergibt Exit 1 ohne Berichtsdatei.
- **E · Kopf des Berichts** · Planer — Das Skript setzt `**Session:** Modell · Skills · Datum` unter den Titel und `**Kennzahlen:**` hinter **Ergebnis:**, statt Zahlen in den Satz des Modells zu mischen.
- **E · Projekt-Dateinamen und Zitate** · Planer — Projekt-Dateinamen sind Dateinamen mit Endung, die die Session per Tool-Aufruf im Projektordner anfasste, ohne Plugin-Ordner (mit `.claude-plugin/plugin.json`), ohne `.claude` und ohne allgemeine Namen wie `CLAUDE.md`, `README.md`, `spec.md`, `plan.md`. Zitate sind Texte in „…“ oder "…" in der Zeile *Im Projekt:*, ohne Code in Backticks, verglichen mit normalisiertem Leerraum gegen den ganzen Protokolltext.
- **E · Befunde und Kurzbefunde** · Planer — Befunde sind die nummerierten Einträge unter Positiv, Reibung und Sparpotenzial; die Kurzfassung nennt je Abschnitt die ersten drei Titel.
- **E · Workitem-Kandidat** · Planer — Form `<wert> (aus Spec <pfad>)` oder `<wert> (aus Branch <branch>)`, sonst `keiner`; der Branch wird nur mit dem `Workitem`-Muster der Projekt-Einstellungen durchsucht.
- **E · Vorsortierung** · Planer — Ein Bericht ist eine Datei `YYYY-MM-DD-*.md` mit dem Titel `# Erfahrungsbericht`; gruppiert werden die Befunde unter Reibung und Sparpotenzial nach Art und Name der Ziel-Zeile, die ältere Form `` `neu:` Art · Name `` fällt in dieselbe Gruppe.
- **E · Skill-Aufruf** · Planer — Fakten und Format kommen per `` !`…` `` in den Skill-Text; `allowed-tools` erlaubt die vier Skripte in Bash und PowerShell ohne Rückfrage (Claude Code prüft eingebettete Befehle gegen diese Regeln). Argumente des Menschen kommen über den von Claude Code angehängten Block `ARGUMENTS:` und führen zu genau einem Neulauf der Fakten.
- **E · Test-Aufbau** · Planer — Neue Tests folgen dem Muster der bestehenden dv-forge-Tests: flache `node:test`-Tests, Arrange, Act und Assert durch Leerzeilen getrennt, ohne Kommentarblöcke.
- **E · Versionsnummer** · Planer — Der Plan erhöht die Plugin-Version nicht; das geschieht im Repo als eigener `chore`-Commit.
- **R1 · Task 15** — geändert — `thousands` steht nur noch einmal, in `lib/transcript.js`; `session-facts.js` und `lib/retro-summary.js` importieren es, sodass Fakten, Snapshot und Kurzfassung Tokens gleich runden (Dateien, Interfaces, Code, Testlauf und Commit von Task 15 nachgezogen). `sumTokens` bleibt in `retro-summary.js`: Es summiert über `requestsOf` (Task 5), während `analyze` die Tokens in seinem einzigen Durchlauf zählt; ein Umbau von `analyze` auf `requestsOf` änderte die Zählung von Einträgen ohne `requestId` und `uuid` in bestehenden Tests. Dazu fängt `retro-report.js` einen Fehler der Kurzfassung ab und nennt trotzdem Bericht und Prüfergebnis (siehe R1 · Task 14).
- **R1 · Task 16** — geändert — Die Session-Auflösung (`projectDir`, `newestSession`, `sessionById`, `resolveSession`) zieht nach neuem `lib/session-files.js`; `session-facts.js` importiert sie von dort und exportiert `projectDir` und `resolveSession` weiter, `retro-timeline.js` hängt nicht mehr an einem CLI-Skript; neuer Test `cli_Session_ReadsProtocolFromProjectFolder`. Die Zeitleiste erkennt Zusammenfassungen nach W · Protokoll-Marker über das fehlende `origin` (neu `isSummary` in `lib/transcript.js`); die Fixture der Zeitleiste nutzt eine Zusammenfassung ohne `isCompactSummary`, ein zweiter Test deckt den Marker ab.
- **R1 · Task 18** — geändert — Der Schnitt steckt in `rangeOf` (Task 2): Folgt dem letzten Aufruf der Retrospektive schon ein Lauf von `retro-report.js … --session`, ist diese Retrospektive abgeschlossen und der Aufruf der laufenden steht noch nicht im Protokoll; dann gilt kein Schnitt, die ganze Session zählt und die Fakten nennen das (`Schnitt: keiner, …`). Neuer Test `rangeOf_LastRetroAlreadyWroteReport_KeepsWholeSessionAndNamesIt`, Interface von Task 2 ergänzt. Die Messregel entscheidet der Plan nach W · Detailtiefe (Spec); am Skill-Text in Task 18 ändert sich nichts.
- **R1 · Task 2** — geändert — `listedSkills` nutzt `LISTED_SKILL = /^- (\S+?):\s/gm`; der Name reicht bis zum Doppelpunkt vor dem Leerzeichen und behält `plugin:skill`, sodass `rangeOf_ListedButNeverCalled_ReportsEmptyRange` grün wird.
- **R1 · AC-06** — nicht geändert — Der geprüfte Satz steht schon im Bestand: `plugins/forge/skills/init/SKILL.md` Zeile 11 enthält „den Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`“, damit ist der Ort genannt und der Test grün. Das ganze AC-06 ist im Plan abgedeckt: Liste in der bestehenden Einstellungsdatei (`MCP-Erwartet` in `forge-config.js`), Meldung ohne Aufruf-Angabe (`cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag`), leere oder fehlende Liste ohne Zeile (`cli_ProjectWithoutExpectedList_NoExpectedUnusedRow`, `render_NoExpectedList_NoExpectedUnusedRow`), Name und Beispiel mit zwei Servern in der Einrichtungs-Anleitung (Task 8 Schritt 3).
- **R1 · Task 11** — geändert — Spec-Pfade, Projekt-Dateien, Branch und Skills ziehen nach neuem `lib/retro-snapshot.js` (samt `spawnSync` für Git); `session-facts.js` behält nur `ownTranscriptOf` und `snapshotOf`, das aus den Fakten-Zeilen und diesen Angaben zusammensetzt. Die Tests `specPaths_…` und `projectFiles_…` stehen in neuem `tests/retro-snapshot.test.js`; Dateien, Interfaces, Testläufe und Commit nachgezogen.
- **R1 · Task 12** — geändert — `corpusOf` nimmt Tool-Eingaben als Rohtext statt als `JSON.stringify` (Anführungszeichen, Zeilenumbrüche und Backslashes bleiben wörtlich), dazu Harness-Anhänge und `system`-Einträge; `retro-report.js` (Task 14) prüft Zitate zusätzlich gegen die Protokolle der Subagents. Neue Tests `corpusOf_QuotedCommandHookTextAndSystemEntry_KeptVerbatim` und `cli_QuoteFromSubagent_AcceptedAsProtocolText`. ASCII-Anführungszeichen bleiben Zitate, wie es E · Projekt-Dateinamen und Zitate festlegt.
- **R1 · Task 14** — geändert — Nach dem Schreiben des Berichts löscht `removeLeftovers` Entwurf und Snapshot, ohne zu werfen; scheitert das Löschen, endet der Aufruf mit Exit 0 und die Warnung auf stderr nennt die liegengebliebene Datei, damit kein zweiter Bericht entsteht. Test `removeLeftovers_UndeletablePath_ReturnsWarningInsteadOfThrowing`; der Fehlerfall der Kurzfassung ist in Task 15 (`summaryOrFallback`) abgefangen.
- **R2 · Task 14** — geändert — `mcp-usage.js` exportiert das vorhandene `subagentFiles`; `retro-report.js` (statt eigenem `protocolFiles`) und `subagentRows` in `session-facts.js` finden Subagent-Protokolle nur noch darüber, der Ordneraufbau steht an einer Stelle (Dateien, Interfaces, Schritt 3, Testlauf und Commit nachgezogen). Fehlt das Protokoll, wirft `corpus` einen `RetroError` `Protokoll fehlt: <pfad>; …` statt eines leeren Korpus, neuer Test `cli_MissingProtocol_NamesPathAndWritesNothing`. Die eigene `parseArgs`-Schleife bleibt, weil jedes Skript im Repo seine Angaben selbst liest (Hinweis des Reviewers).
- **R2 · Task 15** — geändert — `thousands` kommt nicht mehr in `lib/transcript.js`, sondern in neues `lib/retro-format.js` (Anzeigeformat); `session-facts.js` und `lib/retro-summary.js` importieren es von dort, Task 16 exportiert es nicht mehr aus `transcript.js` und nennt es nicht mehr unter Consumes. `shorten` und `clock` bleiben in `transcript.js`, weil `humanEvents` seine Texte mit `shorten` kürzt und `clock` die Eintragsmarken der Bereichs-Labels schreibt; `contextOf`, `requestsOf`, `lineCount` und `isSummary` lesen oder deuten Protokolleinträge und gehören damit zur Verantwortung der Datei.
- **R2 · Task 18** — geändert — `allowed-tools` erlaubt zusätzlich `Edit(~/.dv-forge/retro/*)`; Claude-Code-Regeln für `Edit` gelten für alle Datei-schreibenden Tools, also auch für das `Write` des Entwurfs außerhalb des Projektordners, neuer Test `prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking`. Einen Entwurf eines abgebrochenen früheren Laufs löscht `session-facts.js --snapshot` (Task 11, Test `cli_Snapshot_RemovesStaleDraftOfSameSession`), sodass das `Write` die Datei immer neu anlegt. Der Skill-Text ändert sich nicht.
- **R2 · Task 8** — geändert — Damit der Body von `init/SKILL.md` unter 500 Wörtern bleibt, ist die neue Tabellenzeile gekürzt (19 Wörter) und die Tabelle `## Häufige Fehler` verliert die Zeilen „Alle Fragen in einer Nachricht“ und „Stolperfallen ungefragt umschreiben“ (27 Wörter), deren Regeln Ablauf Schritt 3 und Schritt 1 schon nennen; kein Test prüft ihren Text. Schritt 4 zählt die Wörter vorab mit `wordCount`. Dazu kommt das Projekt für Erwartung, Branch und Projekt-Dateien aus neuem `projectOf`: `--cwd`, sonst `cwd` der Protokolleinträge, sonst der aktuelle Ordner; Task 11 nutzt es ebenfalls, `projectFiles` bekommt dieses Projekt. Neuer Test `cli_ForeignProtocol_ExpectationFromProtocolProject`.
- **R2 · Task 1** — geändert — `mcp-usage.js` verliert `readJsonl` und liest in `loadSession` mit `readEntries` aus `lib/transcript.js`, es gibt einen JSONL-Leser. Die bestehenden Helfer in `session-facts.test.js` bleiben neben `tests/lib/retro-session.js`, weil ihre festen Einträge die erwarteten Zahlen der bestehenden Tests tragen; das Nebeneinander ist in den Interfaces von Task 1 begründet.
- **R2 · Task 11** — nicht geändert — `snapshotOf` setzt nur Zeilen zusammen, die `factLines`, `measureLines`, `savingsLists` und `minutes` in `session-facts.js` schreiben, und `ownTranscriptOf` braucht `sessionById` und `projectDir`, die bis Task 16 in `session-facts.js` stehen; nach `lib/retro-snapshot.js` verschoben, müsste die Bibliothek das CLI-Skript importieren. Die rechnenden Teile (Spec-Pfade, Projekt-Dateien, Branch, Skills) liegen seit R1 · Task 11 schon in `lib/retro-snapshot.js`, die Messung in `lib/retro-measures.js`.
- **R2 · Task 12** — geändert — Neue Tests `violations_CostWithoutNumberOrImpression_Reported` und `violations_CostAsImpression_Accepted` belegen die Prüfung von *Kosten:* unter Reibung. Das ganze AC-15 ist abgedeckt: fehlender Abschnitt und Pflichtfeld, Ziel-Form, Kosten und Ersparnis, Relevanz-Zeile, Projekt-Dateiname, Zitat und einzelne Meldung je Verstoß in Task 12; keine Berichtsdatei und Fehlercode in Task 14 (`cli_DraftWithViolations_ListsEachAndWritesNothing`).
- **R3 · Task 15** — geändert — `summaryLines` misst nur noch in `snapshot.ownTranscript` ohne Rückfall auf `snapshot.transcript`; `retroCost(null)` liefert `Kosten der Retrospektive: nicht messbar (eigenes Protokoll nicht gefunden)`, wie Task 11 `null` begründet. Neuer Test `summaryLines_OwnTranscriptUnknown_CostNotTakenFromForeignProtocol`, Interface ergänzt. Die widersprüchliche Begründung „`lib/transcript.js` bleibt unverändert“ bzw. „bekommt kein Anzeigeformat dazu“ ist ersetzt: `shorten` und `clock` bleiben bei ihren Nutzern (`humanEvents`, Bereichs-Labels) in `transcript.js`, `retro-format.js` hat nur das Zahlenformat, das kein Protokoll-Leser braucht. Der Anker `cli_ValidDraft_WritesDatedReportAndDeletesDraft` entsteht in Task 14 Schritt 1 (Fehlalarm der Anker-Prüfung).
- **R3 · Task 11** — nicht geändert — Begründung wie R2 · Task 11 gilt weiter: `snapshotOf` setzt Zeilen aus `factLines`, `measureLines`, `savingsLists` und `minutes` zusammen, die in `session-facts.js` auch die Fakten-Ausgabe schreiben, und `ownTranscriptOf` braucht `sessionById`/`projectDir`, die erst Task 16 nach `lib/session-files.js` zieht; nach `lib/retro-snapshot.js` verschoben, müsste die Bibliothek das CLI-Skript importieren. `measuredOf`, `configuredExpect` und `projectOf` entstehen in Task 8 und 10, nicht in Task 11; die rechnenden Bausteine des Snapshots liegen schon in `lib/retro-snapshot.js`.
- **R3 · Task 2** — geändert — `finished` wertet eine Retrospektive erst als abgeschlossen, wenn zum Aufruf von `retro-report.js … --session` ein Tool-Ergebnis ohne `is_error` mit einer Zeile `Bericht: …` gehört (`reportCallIds`, `reportWritten`, `REPORT_WRITTEN`); ein Lauf mit Verstößen (Exit 1) lässt den Schnitt stehen. Der Test `rangeOf_LastRetroAlreadyWroteReport_KeepsWholeSessionAndNamesIt` bekommt das Ergebnis, neuer Test `rangeOf_LastRetroReportFailed_StillCutsBeforeIt`; Consumes (`isToolResultEntry`, Fixture `result`) und Produces nachgezogen.
- **F · AC-01** — geändert — Vorschlag 1: Neue Fixture `plainSummary(text, at)` in `tests/lib/retro-session.js` (Nutzer-Text ohne `origin` und ohne `isCompactSummary`, die reale Form laut W · Protokoll-Marker); neue Tests `humanEvents_UnmarkedSummaryInMarkedSession_IsNoInput` und `cli_UnmarkedSummary_NotCountedAsHumanInput` in Task 1 belegen, dass sie in einem markierten Protokoll weder als Eingabe erscheint noch in `Eingaben des Menschen: <n>` zählt. `summary()` bleibt für den Marker; `isHumanInput` bleibt unverändert, weil `marked` schon über `origin?.kind === 'human'` filtert. Das ganze AC-01 ist abgedeckt: Skill-Text und beide Formen der Zusammenfassung in Task 1, die Zeitleiste in Task 16, die jetzt dieselbe Fixture statt eines eigenen `realSummary` nutzt.
- **F · Task 12** — geändert — Vorschlag 1: `stringsOf`, `plainText`, `entryText` und `corpusOf` ziehen von `lib/retro-draft.js` nach `lib/transcript.js` (Task 12 fügt sie dort nach `humanEvents` ein und exportiert `corpusOf`, Task 16 behält den Export); `retro-draft.js` hat nur noch Format-Parser und Prüfregeln. Die beiden `corpusOf`-Tests stehen in `transcript.test.js`; Dateien, Interfaces, Testläufe und Commit von Task 12 sowie Consumes und Import in Task 14 nachgezogen. `plainText` bleibt neben `textOf` eine eigene Funktion, weil sie zusätzlich `tool_use`-Eingaben liest.
- **F · Task 14** — geändert — Vorschlag 1: Neues `projectRoot` in `build` prüft vor `writeReport`, ob ein aus dem Snapshot stammender Projektordner existiert, sonst `RetroError` `Projektordner fehlt: <cwd>; … mit --cwd <projektordner> angeben`, Exit 1 ohne Berichtsdatei und ohne angelegten Ordner. Neuer Test `cli_SnapshotCwdMissing_NamesCwdFlagAndWritesNothing`, Produces ergänzt. Mit `--cwd` gilt der Ordner wie bisher; die Absicht von `projectOf` (Task 8) bleibt.
- **F · Task 17** — geändert — Vorschlag 1: Die Grammatik der Ziel-Zeile steht nur noch in `parseTarget` (Task 12, `lib/retro-draft.js`); `findingViolations` und `newTargets` nutzen sie, `targetKey` in `retro-sort.js` ebenso und ergänzt nur die Alt-Form in `legacyTarget` und freien Text in `rawKey`. `parseTarget` lässt die Alt-Form „<Art> · `neu:` …“ nicht mehr zu (Tests `parseTarget_ThreeForms_ArtNameAndKind`, `parseTarget_LegacyNewFormOrFreeText_Null`); `targetKey_OldAndNewForms_SameGroup` bleibt gültig. `collect` delegiert an `findingLines`, `relevanceRows`, `withoutRelevanceOf`, `groupBy` und `countRelevance`; `longRuns` und `idleReruns` in Task 7 sind per `flatMap`/`reduce` (`startsOf`, `runOf`, `stepsOf`, `countRerun`) auf höchstens zwei Ebenen gebracht, `isChange` entfällt.
- **F · Task 14** — geändert — Vorschlag 1: Der Snapshot trägt `transcriptEntries`, die höchste `entryNo` des ganzen Hauptprotokolls beim Lauf von `--snapshot` (Task 11, `run` liest `entries.at(-1).entryNo` vor `rangeOf`); `corpus` in `retro-report.js` filtert das Hauptprotokoll auf `entryNo <= snapshot.transcriptEntries`, die Subagent-Protokolle bleiben ganz. Der Snapshot entsteht per `!` vor der ersten Modell-Anfrage der Retrospektive, das `Write` des Entwurfs (oder ein Bash-Heredoc) steht damit nie im Korpus, gleich ob der Slash-Befehl schon im Protokoll steht. `readSnapshot` (Task 11) lehnt einen Snapshot ohne ganzzahliges `transcriptEntries` als unlesbar ab, damit die Prüfung nie gegen einen leeren Korpus läuft. Neue Tests `cli_QuoteOnlyInDraftWriteAfterSnapshot_ReportedAsNotInProtocol` und `cli_SnapshotWithoutEntryCount_NoReportAndExitOne` in Task 14, `cli_Snapshot_RecordsLastEntryOfProtocolForQuoteCheck` in Task 11; `SNAPSHOT` der Fixture (Task 12) hat `transcriptEntries: 1`. Das ganze AC-15 bleibt abgedeckt wie in R2 · Task 12, das Zitat-Kriterium greift jetzt auch in der eigenen Session.
- **F · Task 16** — geändert — Vorschlag 1: (a) `stringsOf`, `plainText`, `entryText`, `corpusOf` stehen in neuem `lib/retro-corpus.js` (Task 12, Tests in neuem `tests/retro-corpus.test.js`, Task 14 importiert von dort); `contextOf` und `requestsOf` in neuem `lib/retro-requests.js` (Task 5; Tasks 5, 6, 15 und `retro-measures.test.js` importieren von dort); `tokensOf` bleibt in `transcript.js`, weil `analyze` es nutzt. `shorten`, `clock` und `callLabel` bleiben vorerst in `transcript.js` (die im Vorschlag genannte erste Option): `humanEvents` kürzt mit `shorten`, die Bereichs-Labels schreiben mit `clock`, `analyze` nutzt `callLabel`; ein eigenes `lib/line-format.js` für drei kleine Funktionen trennte sie nur von ihren Lesern. (b) `isCompactEntry` (einzige `compact`-Regel, exportiert) und das interne `isPlainUserText` stehen ab Task 1 in `transcript.js`; `analyze` zählt `compactions` darüber, `isHumanInput` nutzt `isPlainUserText` plus `isSlashCommand` (ein Slash-Befehl beginnt mit `<command-message>` und fiele sonst unter die Hinweise), `isSummary` (Task 16) nutzt beide. Neuer Test `cli_SystemCompactEntry_CountedAndShownAsSummaryAlike`; die Importzeilen von `session-facts.js` in Task 1, 2 und 7 tragen `isCompactEntry`. (c) `retro-timeline.js` hat `MAX_ROWS = 300` und `--from <n>`; darüber endet die Ausgabe vor dem ersten Eintrag, der nicht mehr ganz passt, mit `… weitere <n> Zeilen bis #<letzte>; mit --from <nächste> fortsetzen oder --entry nutzen`. Tests `cli_TimelineOverRowLimit_EndsWithHintToContinue` und `cli_TimelineFrom_ListsRemainingRowsWithoutHint`; der Skill-Text in Task 18 sagt „kommt die Zeitleiste stückweise“ statt „die ganze Zeitleiste“ (gleiche Wortzahl). E · Kürzung und Umfang der Zeitleiste gilt mit dieser Obergrenze; AC-20 bleibt über die Fortsetzung mit `--from` vollständig erfüllt, die Kürzungsmaße entscheidet der Plan (W · Detailtiefe).
- **F · Task 11** — geändert — Vorschlag 1: `buildSnapshot({ id, transcript, ownTranscript, transcriptEntries, cwd, range, facts, headline, numbers, mcp, expect })` in `lib/retro-snapshot.js` ruft `branchOf`, `specPaths`, `skillsOf`, `projectFiles` auf und setzt das Objekt zusammen (Überschrift der MCP-Nutzung entfernt es dort); `headlineOf` und `numbersOf` bleiben in `session-facts.js` neben `factLines`/`measureLines`, `saveSnapshot` schreibt den Snapshot und löscht den alten Entwurf, `run` orchestriert nur noch. `ownTranscriptOf` steht bis Task 16 in `session-facts.js` und zieht dort mit `sessionById` nach `lib/session-files.js`, sodass die Bibliothek kein CLI-Skript importiert (der Einwand aus R2/R3 · Task 11 entfällt damit). Der Snapshot trägt zusätzlich `transcriptEntries` (F · Task 14) und `labels` (F · Task 2). Neuer Test `buildSnapshot_FactsAndSessionData_AssembledIntoFields`; Produces, Consumes und der Feldtest nachgezogen.
- **F · Task 2** — geändert — Vorschlag 1, zum Teil: Umgesetzt ist der sichtbare Restfall. Folgt dem geschnittenen Aufruf eine Modell-Anfrage und wurde kein Bericht erzeugt, hängt `rangeOf` `Warnung: Schnitt vor einem früheren, nicht abgeschlossenen Aufruf von prozess-retrospektive (Eintrag <n>); Arbeit danach fehlt` an `labels`; die Fakten zeigen es, der Snapshot trägt `labels` (Task 11); der Schnitt selbst bleibt. Anders als im Vorschlag zählt eine Anfrage, die nur `session-facts.js` neu aufruft, nicht: Schritt 1 des Skills (Task 18) holt die Fakten bei Argumenten einmal neu, und dann folgt der laufenden Retrospektive schon eine Anfrage, eine Warnung wäre falsch (Test `rangeOf_OnlyFactsRerunAfterRetroCall_CutsWithoutWarning`). `rangeOf_LastRetroReportFailed_StillCutsBeforeIt` erwartet die Warnung; die Fixture `session()` verliert die Anfrage `r3` nach dem Aufruf der Retrospektive, damit er die laufende darstellt (`rangeOf_SinceCommandWithoutCut_StartsAtLastCallAndRunsToEnd` erwartet `[5, 6, 7, 8]`). Nicht umgesetzt ist der Schritt „Reihenfolge messen“ mit echter Fixture: Im Repo nutzt noch kein Skill `` !`…` `` (der erste entsteht in Task 18), ein echtes Protokoll mit diesem Ablauf gibt es also vor der Umsetzung nicht; eine erneute Suche in den Protokollen des Menschen deckt W · Protokoll-Marker nicht (einmalige Freigabe), und Kommentar wie Fixture hingen an einem unbekannten Ergebnis, was dem Plan-Format (vollständiger Code, erwartete Ausgabe) widerspricht. Der Kommentar an `finished` nennt die Annahme deshalb ausdrücklich als ungemessen und verweist auf die Warnung.
- **F · Task 12** — geändert — Vorschlag 1: Neue Datei `plugins/forge/scripts/lib/regexp.js` mit `escapeRegExp` (Inhalt wie `lib/document-units.js:19`) samt Test `tests/regexp.test.js`; `lib/retro-draft.js` importiert sie statt einer privaten Kopie. Dateien, Interfaces, Testläufe und Commit von Task 12 nachgezogen. Die drei bestehenden Kopien in `plan-anchors.js:26`, `forge-config.js:106` und `lib/document-units.js:19` bleiben unangetastet und werden bei Gelegenheit umgestellt.
- **F · Task 14** — geändert — Vorschlag 1: `subagentRows` liest die `.meta.json` über die neue Hilfsfunktion `readMeta(metaFile)` mit `try/catch` und Rückfall auf `{}` (auch bei `null`); fehlende, leere und halb geschriebene Dateien ergeben die Zeile mit Dateiname, `?` und dem Modell aus den Fakten. Neuer Test `cli_BrokenSubagentMeta_RowFallsBackWithoutError` in `session-facts.test.js` mit leerer und abgeschnittener `.meta.json` (keine Ausnahme, Zeile `| agent-a.jsonl | ? | sonnet |`); Dateien, Interfaces, Testläufe und Commit nachgezogen.
- **F · Task 15** — geändert — Vorschlag 1: `forge-config.js` bekommt neben `workitemOf` die exportierte Funktion `branchWorkitem(config, branch)` (intern `workitemPattern(source)`); `null` bei `Workitem` leer oder `keine`, ungültigem Muster, leerem Branch oder ohne Treffer, sonst `found[0]`. `lib/retro-summary.js` ersetzt `workitemPattern` durch `branchWorkitem(configOf(cwd), snapshot.branch)`, `configOf` fängt `readConfig` ohne Projekt-Einstellungen ab. `work.js` `workitemConflict` nutzt dieselbe Funktion (`return own && found && found !== own ? found : null;`), das Verhalten bleibt, belegt durch den bestehenden `work.test.js`. Neue Tests `branchWorkitem_PatternInBranch_ReturnsMatch` und `branchWorkitem_NoneEmptyInvalidNoBranchOrNoMatch_Null` in `forge-config.test.js`.
- **F · Task 15** — geändert — Vorschlag 1: Umgesetzt in Task 14, weil dort `build` den Bericht schreibt, auf den das `Vormerken` der Kurzfassung (Task 15) zeigt. Neues `lib/retro-secrets.js`: `secretViolations(text)` prüft den fertigen Berichtstext vor `writeReport` auf `password|passwort|passwd|secret|token|api[_-]?key` mit `:`/`=` und Wert ab 8 Zeichen, `Bearer <wert>`, `://user:pass@`, `AKIA…` und `gh[pousr]_…`; jeder Treffer steht einzeln unter `Prüfung: <n> Verstöße, keine Berichtsdatei geschrieben`, mit Zeilennummer und `***` statt des Werts, dazu der Hinweis auf Entwurf oder Snapshot; Exit 1, keine Berichtsdatei. `withFileNameSource` kürzt `Quelle: \`…\`` der MCP-Nutzung auf den Dateinamen; `mcp-usage.js` selbst gibt weiter den ganzen Pfad aus. `checkedDraft` und `checkedReport` teilen `failOnViolations`, die Meldung von `cli_DraftWithViolations_ListsEachAndWritesNothing` bleibt gleich. Neue Tests `cli_TokenInCommandList_ReportedAndNothingWritten` und `cli_SourcePath_WrittenWithoutUserFolder`; Dateien, Interfaces, Architektur-Zeile und Commit von Task 14 nachgezogen. Die Muster sind eine Prüfregel, die W · Detailtiefe (Spec) dem Plan überlässt; AC-15 und AC-16 bleiben gültig, weil die Prüfung nur zusätzlich blockt und der Aufbau des Berichts gleich bleibt.
- **F · Task 16** — geändert — Vorschlag 1, mit verschobenem Zeitpunkt: Der Umzug von `findTranscript` und `subagentFiles` (samt `configDir`) nach `lib/session-files.js` geschieht in Task 14 statt Task 16, weil Task 14 `subagentFiles` für `retro-report.js` und `subagentRows` schon braucht und vor Task 16 läuft; so entfällt die Export-Anpassung in Task 14 wie verlangt. Task 14 legt `lib/session-files.js` mit beiden Funktionen und Test `tests/session-files.test.js` an; `mcp-usage.js` importiert sie von dort, `module.exports` bleibt unverändert (auch `findTranscript` unter dem alten Namen), und `transcriptOf` wandelt den neuen `RetroError` in den `UsageError` von `main` (Meldung und Exit 1 bleiben). `retro-report.js` und `session-facts.js` nutzen `lib/session-files.js`. Task 16 erweitert die Datei (Modify statt Create), `sessionById` nutzt das lokale `findTranscript`, ein `require('../mcp-usage')` gibt es dort nicht mehr. Der Satz „hängt nur an Bibliotheken“ gilt für `retro-timeline.js` und nennt die bewusst genutzten Module außerhalb von `lib/`: `forge-config.js` (in `lib/retro-summary.js`) und zusätzlich `sameServer` aus `mcp-usage.js` (in `lib/retro-draft.js`), da der Satz sonst nicht stimmte.
- **F · Task 14** — geändert — Vorschlag 1: Das Muster „Schlüssel mit Wert“ in `lib/retro-secrets.js` beginnt mit `[\w-]*` statt `\b`, sodass `API_TOKEN=…`, `DB_PASSWORD=…`, `NPM_TOKEN=…` und `CLIENT_SECRET=…` anschlagen. Neuer Test `tests/retro-secrets.test.js` belegt das samt Maskierung, dazu „Tokens: 1200000“ und „Token: nein“ ohne Treffer. Tokens ohne Schlüsselwort und ohne bekanntes Präfix (Azure-DevOps-PATs) stehen als bekannte Grenze in Produces und im Kommentar. Nebenbefund Benutzerordner: Das Relativieren geschieht in Task 14 in neuem `relativeToProject` (in `lib/retro-secrets.js`, `build` wendet es auf `snapshot.numbers` mit `snapshot.cwd` an), nicht in `savingsLists`/`callLabel`. Grund: `callLabel` (Task 1) kennt keinen Projektordner, der Snapshot soll die Rohwerte behalten, und `escapeRegExp` aus `lib/regexp.js` gibt es erst ab Task 12. Test `cli_ProjectPathsInNumbers_WrittenRelative`. Der Kommentar an `withFileNameSource` gilt nur noch der Quelle. Dateien, Consumes, Testläufe und Commit sind nachgezogen.
- **F · Task 15** — geändert — Vorschlag 1: `retroCost(transcript, fromEntryNo)` zählt nur Anfragen mit `entryNo > snapshot.transcriptEntries` statt ab dem letzten `RETRO`-Aufruf; neues `costOf` in `summaryLines` meldet „nicht messbar (eigenes Protokoll ist nicht das ausgewertete)“, wenn `snapshot.transcript` nicht `snapshot.ownTranscript` ist. Import `indexesOf`/`RETRO` entfällt, Consumes/Produces nachgezogen. Tests `retroCost_AfterSnapshotEntry_RequestsAndTokensSplit`, `retroCost_NoRetroCallButEarlierRetro_CountsOnlyAfterSnapshot`, `summaryLines_OwnTranscriptNotEvaluated_CostNotMeasurable` ersetzen die beiden alten `retroCost`-Tests. AC-17 bleibt erfüllt.
- **F · Task 8** — geändert — Vorschlag 1: `projectOf(options, session, warn?)` nimmt `--cwd`, ohne `--file` den aktuellen Ordner (eigene Session, Worktree-sicher), bei `--file` das `cwd` des Protokolls; fehlt dieser Ordner, gilt der aktuelle Ordner mit Warnung, die `--cwd <projektordner>` nennt. `projectOf` wird exportiert (Task 8 und Task 11 `module.exports`). Tests `projectOf_OwnSession_UsesProcessCwd`, `projectOf_ForeignFileMissingCwd_FallsBackWithWarning`. Der Skill-Text in Task 18 nennt `--cwd` für Protokolle aus anderen Projekten.
