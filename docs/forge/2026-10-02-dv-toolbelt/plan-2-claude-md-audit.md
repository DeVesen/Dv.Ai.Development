# dv-toolbelt, Plan 2: claude-md-audit — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-10-02-dv-toolbelt/plan-2-claude-md-audit.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Der Skill `claude-md-audit` prüft, kürzt und erweitert eine CLAUDE.md gemeinsam mit dem Menschen, fragt zu Beginn nach einem Backup und sichert Backup, Diff, Zeichenzahl und geschützte Blöcke über ein Node-Skript ab.
**Architektur:** Die Logik liegt als testbare Bausteine in `plugins/toolbelt/scripts/lib/claude-md-guard.js`, das Skript `scripts/claude-md-guard.js` ist ein dünner Aufruf mit den Befehlen `size`, `backup`, `diff` und `blocks`. Der Skill selbst ist ein deutscher Text, der diese Befehle an den passenden Stellen aufruft. Der Plan setzt Plan 1 voraus (Plugin-Gerüst, `tests/lib/markdown.js`, Wächter-Tests).
**Tech-Stack:** Node.js (`node:test`, `node:assert`, `node:crypto`), Markdown-Skill.
**Spec:** docs/forge/2026-10-02-dv-toolbelt/spec.md
**Basis:** a3df0ea

## Global Constraints
- Die Skill-Texte sind deutsch. Die Trigger-Wörter in den Beschreibungen sind deutsch und englisch.
- Alle Skripte des Plugins laufen mit Node.js und brauchen keine weitere Laufzeit.
- Jedes Skript des Plugins hat Tests.
- Kein Skill, Skript oder Hook des Plugins setzt voraus, dass ein anderes Plugin oder ein anderer Skill installiert ist. In allen Dateien von `plugins/toolbelt` außer `plugins/toolbelt/README.md` kommen die Namen `superpowers`, `skill-creator`, `grill-me`, `dv-forge` und `forge-config` nicht vor.
- `claude-md-audit` enthält keine Annahme über einen Memory-Pfad, über Git-Ignore der CLAUDE.md oder über einen Plugin-Abschnitt in der CLAUDE.md. Ob und wie gesichert wird, entscheidet der Mensch.
- Die Skript-Befehle von `claude-md-audit` sind: Zeichenzahl vor und nach dem Umbau, Backup mit Diff, Hash-Vergleich der geschützten Blöcke. Ein Zeiger-Check ist in v1 nicht enthalten.
- Tests laufen mit `node --test`, aus `<R>` (Checkout-Wurzel). Testnamen folgen dem Bestand `Methode_Situation_Erwartung`, Testkörper dem Muster Arrange, Act, Assert.
- Shell ist Git Bash. Commit-Messages sind englisch im Stil der Historie: `<typ>(<scope>): <beschreibung>`, Scope `toolbelt`.
- Für die Retrospektive gibt es in v1 keine Migration alter Berichte aus dem bisherigen Datenordner.
- `dv-forge` erhält weder einen Hinweis auf den Umzug noch einen Versionssprung.
- Das Plugin startet mit der Version 0.1.0.
- Der Benchmark mit Viewer aus `skill-creator` ist nicht Teil von v1.
- Der Validator ist ein Node-Skript, das einen Skill-Ordner prüft und sein Ergebnis über Exit-Code und Meldung zeigt.

## Abdeckung über die drei Pläne

Nach „W · Aufteilung“ verteilen sich die ACs der Spec auf drei Pläne. Die AC-Abdeckung gilt für die Vereinigung der drei Pläne; Plan 2 setzt nur die ACs um, die hier bei Plan 2 stehen.

| AC | Plan | Tasks dort |
|---|---|---|
| AC-01 | Plan 1 (`plan-1-geruest-und-retro.md`) | Task 1 |
| AC-02 | Plan 1 | Task 1 |
| AC-03 | Plan 3 (`plan-3-writing-skills.md`) | Task 4 |
| AC-04 | Plan 1, Plan 3 | Plan 1: Task 2, Task 3, Task 7; Plan 3: Task 4 |
| AC-05 | Plan 1, Plan 3 | Plan 1: Task 7; Plan 3: Task 4 |
| AC-06 | Plan 3 | Task 4 |
| AC-07 | Plan 2 | Task 4 |
| AC-08 | Plan 2 | Task 4 |
| AC-09 | Plan 2 | Task 4 |
| AC-10 | Plan 2 | Task 1, Task 4 |
| AC-11 | Plan 2 | Task 1 |
| AC-12 | Plan 2 | Task 1, Task 4 |
| AC-13 | Plan 2 | Task 2, Task 4 |
| AC-14 | Plan 2 | Task 4 |
| AC-15 | Plan 2 | Task 4 |
| AC-16 | Plan 2 | Task 4 |
| AC-17 | Plan 2 | Task 3, Task 4 |
| AC-18 | Plan 2 | Task 4 |
| AC-19 | Plan 2 | Task 4 |
| AC-20 | Plan 2 | Task 4 |
| AC-21 | Plan 3 | Task 3 |
| AC-22 | Plan 3 | Task 3 |
| AC-23 | Plan 3 | Task 3 |
| AC-24 | Plan 3 | Task 2 |
| AC-25 | Plan 3 | Task 3 |
| AC-26 | Plan 3 | Task 2, Task 3 |
| AC-27 | Plan 3 | Task 1 |
| AC-28 | Plan 3 | Task 1 |
| AC-29 | Plan 3 | Task 1 |
| AC-30 | Plan 3 | Task 1 |
| AC-31 | Plan 3 | Task 1 |
| AC-32 | Plan 3 | Task 1 |
| AC-33 | Plan 3 | Task 1 |
| AC-34 | Plan 1 | Task 7 |
| AC-35 | Plan 1 | Task 2, Task 5 |
| AC-36 | Plan 1 | Task 3, Task 5 |
| AC-37 | Plan 1 | Task 4, Task 5 |
| AC-38 | Plan 1 | Task 8 |
| AC-39 | Plan 1 | Task 6, Task 8 |
| AC-40 | Plan 1, Plan 2, Plan 3 | Plan 1: Task 7; Plan 2: Task 1; Plan 3: Task 1 |
| AC-41 | Plan 1, Plan 2, Plan 3 | Plan 1: Task 5; Plan 2: Task 4; Plan 3: Task 3, Task 4 |

## Dateistruktur

In `plugins/toolbelt`:
- `scripts/lib/claude-md-guard.js` — Bausteine: Fehlerklasse, Zeichenzahl, Backup, Diff, geschützte Blöcke.
- `scripts/claude-md-guard.js` — Aufruf der Bausteine: `size`, `backup`, `diff`, `blocks hash`, `blocks verify`.
- `tests/claude-md-guard.test.js` — Tests für Bausteine und Skript.
- `skills/claude-md-audit/SKILL.md` — der Skill.
- `tests/claude-md-audit-skill.test.js` — Tests für den Skill-Text.
- `tests/lib/german.js` — Hilfe, die prüft, ob ein Text überwiegend deutsch ist (auch für Plan 3).
- `README.md` — eine Tabellenzeile mehr.

---

### Task 1: Zeichenzahl und Backup

**ACs:** AC-10, AC-11, AC-12, AC-40

**Dateien:**
- Create: `plugins/toolbelt/scripts/lib/claude-md-guard.js`
- Create: `plugins/toolbelt/scripts/claude-md-guard.js`
- Create: `plugins/toolbelt/tests/claude-md-guard.test.js`

**Interfaces:**
- Consumes: keine
- Produces: aus `lib/claude-md-guard.js`: `class GuardError extends Error`, `readText(file: string): string`, `charCount(text: string): number`, `stampOf(date: Date): string`, `backupPathOf(file: string, target: string | undefined, now?: Date): string`, `makeBackup(file: string, target: string | undefined, now?: Date): string`. Aus `claude-md-guard.js`: `main(argv: string[]): number` (Exit-Code), `parse(args: string[]): { positional: string[], flags: object }`; Befehl `size <datei>` gibt `<datei>: <n> Zeichen` aus, Befehl `backup <datei> [--to <pfad>]` gibt `Backup: <pfad>` aus; Fehler (`GuardError`) enden mit Exit 1 und Meldung auf stderr, falsche Aufrufe mit Exit 2 und der Aufruf-Hilfe.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/claude-md-guard.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { charCount, stampOf, backupPathOf, makeBackup } = require('../scripts/lib/claude-md-guard');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'claude-md-guard.js');
  const NOW = new Date(2026, 9, 2, 10, 30, 5);

  function tempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-guard-'));
  }

  function fileWith(content, name = 'CLAUDE.md') {
    const file = path.join(tempDir(), name);
    fs.writeFileSync(file, content);
    return file;
  }

  function cli(...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
  }

  test('charCount_UmlautsAndEuroSign_CountsCharactersNotBytes', () => {
    assert.equal(charCount('äö€'), 3);
  });

  test('stampOf_LocalDate_DateDashTime', () => {
    assert.equal(stampOf(NOW), '20261002-103005');
  });

  test('backupPathOf_NoTarget_TempFolderWithNameAndDate', () => {
    const result = backupPathOf(path.join('x', 'CLAUDE.md'), undefined, NOW);

    assert.equal(result, path.join(os.tmpdir(), 'CLAUDE.md.20261002-103005.bak'));
  });

  test('backupPathOf_ExistingFolder_NamedFileInsideTheFolder', () => {
    const folder = tempDir();

    const result = backupPathOf(path.join('x', 'CLAUDE.md'), folder, NOW);

    assert.equal(result, path.join(folder, 'CLAUDE.md.20261002-103005.bak'));
  });

  test('backupPathOf_FilePath_UsedAsGiven', () => {
    const target = path.join(tempDir(), 'sicherung', 'meine.bak');

    assert.equal(backupPathOf(path.join('x', 'CLAUDE.md'), target, NOW), target);
  });

  test('makeBackup_Target_CopiesBytesExactlyAndCreatesFolders', () => {
    const source = fileWith(Buffer.from('Zeile eins\r\nÄnderung €\r\n', 'utf8'));
    const target = path.join(tempDir(), 'tief', 'unten', 'kopie.bak');

    const written = makeBackup(source, target, NOW);

    assert.equal(written, target);
    assert.deepEqual(fs.readFileSync(target), fs.readFileSync(source));
  });

  test('makeBackup_MissingFile_ThrowsNotFound', () => {
    assert.throws(() => makeBackup(path.join(tempDir(), 'fehlt.md'), undefined, NOW), /Datei nicht gefunden/);
  });

  test('cli_Size_PrintsCharacterCount', () => {
    const file = fileWith('äö€');

    const result = cli('size', file);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${file}: 3 Zeichen\n`);
  });

  test('cli_BackupWithoutTarget_CopiesIntoTempFolderAndPrintsPath', () => {
    const file = fileWith('inhalt\n');

    const result = cli('backup', file);

    assert.equal(result.status, 0, result.stderr);
    const match = /^Backup: (.*CLAUDE\.md\.\d{8}-\d{6}\.bak)\n$/.exec(result.stdout);
    assert.ok(match, result.stdout);
    assert.equal(path.dirname(match[1]), os.tmpdir());
    assert.equal(fs.readFileSync(match[1], 'utf8'), 'inhalt\n');
    fs.rmSync(match[1]);
  });

  test('cli_BackupWithTarget_WritesToTheGivenPath', () => {
    const file = fileWith('inhalt\n');
    const target = path.join(tempDir(), 'eigener-ordner', 'sicherung.md');

    const result = cli('backup', file, '--to', target);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `Backup: ${target}\n`);
    assert.equal(fs.readFileSync(target, 'utf8'), 'inhalt\n');
  });

  test('cli_SizeOfMissingFile_ExitOneWithMessage', () => {
    const result = cli('size', path.join(tempDir(), 'fehlt.md'));

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Datei nicht lesbar/);
  });

  test('cli_OptionWithoutValue_ExitOneWithMessage', () => {
    const result = cli('backup', fileWith('x'), '--to');

    assert.equal(result.status, 1);
    assert.match(result.stderr, /--to braucht einen Wert/);
  });

  test('cli_UnknownCommand_UsageAndExitTwo', () => {
    const result = cli('unbekannt');

    assert.equal(result.status, 2);
    assert.match(result.stderr, /Aufruf: node claude-md-guard\.js size <datei>/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/claude-md-guard'`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/scripts/lib/claude-md-guard.js`:
  ```js
  'use strict';

  // Bausteine für das Prüfen einer CLAUDE.md: Zeichenzahl, Backup, Diff und Hash-Vergleich geschützter Blöcke.

  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');

  class GuardError extends Error {}

  function readText(file) {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch (error) {
      throw new GuardError(`Datei nicht lesbar: ${file}: ${error.message}`);
    }
  }

  function charCount(text) {
    return [...text].length;
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  // Lokale Zeit als JJJJMMTT-HHMMSS, damit der Name eines Backups sortierbar bleibt.
  function stampOf(date) {
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  // Ohne Ziel liegt das Backup im temporären Ordner des Systems; ein vorhandener Ordner als Ziel bekommt denselben Namen.
  function backupPathOf(file, target, now = new Date()) {
    const name = `${path.basename(file)}.${stampOf(now)}.bak`;
    if (!target) return path.join(os.tmpdir(), name);
    const isFolder = fs.existsSync(target) && fs.statSync(target).isDirectory();
    return isFolder ? path.join(target, name) : target;
  }

  function makeBackup(file, target, now = new Date()) {
    if (!fs.existsSync(file)) throw new GuardError(`Datei nicht gefunden: ${file}`);
    const destination = backupPathOf(file, target, now);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(file, destination);
    return destination;
  }

  module.exports = { GuardError, readText, charCount, stampOf, backupPathOf, makeBackup };
  ```
  Neue Datei `plugins/toolbelt/scripts/claude-md-guard.js`:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Mechanische Hilfen für claude-md-audit: Zeichenzahl, Backup, Diff und Hash-Vergleich geschützter Blöcke.

  const { GuardError, readText, charCount, makeBackup } = require('./lib/claude-md-guard');

  const USAGE = [
    'Aufruf: node claude-md-guard.js size <datei>',
    '        node claude-md-guard.js backup <datei> [--to <pfad>]',
  ].join('\n') + '\n';

  function parse(args) {
    const positional = [];
    const flags = {};
    for (let index = 0; index < args.length; index += 1) {
      if (!args[index].startsWith('--')) {
        positional.push(args[index]);
        continue;
      }
      if (args[index + 1] === undefined) throw new GuardError(`Option ${args[index]} braucht einen Wert`);
      flags[args[index].slice(2)] = args[index + 1];
      index += 1;
    }
    return { positional, flags };
  }

  // Jeder Befehl liefert den Text für stdout; `null` heißt falscher Aufruf.
  const COMMANDS = {
    size: ([file]) => (file ? `${file}: ${charCount(readText(file))} Zeichen` : null),
    backup: ([file], flags) => (file ? `Backup: ${makeBackup(file, flags.to)}` : null),
  };

  function main(argv) {
    const [command, ...rest] = argv;
    const run = COMMANDS[command];
    if (!run) {
      process.stderr.write(USAGE);
      return 2;
    }
    try {
      const { positional, flags } = parse(rest);
      const output = run(positional, flags);
      if (output === null) {
        process.stderr.write(USAGE);
        return 2;
      }
      process.stdout.write(output.replace(/\n?$/, '\n'));
      return 0;
    } catch (error) {
      if (!(error instanceof GuardError)) throw error;
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
  }

  if (require.main === module) process.exit(main(process.argv.slice(2)));

  module.exports = { main, parse };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/scripts plugins/toolbelt/tests/claude-md-guard.test.js` · `git commit -m "feat(toolbelt): add the claude-md-guard script with character count and backup"`

---

### Task 2: Diff gegen das Backup

**ACs:** AC-13

**Dateien:**
- Modify: `plugins/toolbelt/scripts/lib/claude-md-guard.js` · `module.exports`
- Modify: `plugins/toolbelt/scripts/claude-md-guard.js` · `USAGE`, `COMMANDS`, `require`
- Modify: `plugins/toolbelt/tests/claude-md-guard.test.js` · `require`-Zeile, Dateiende

**Interfaces:**
- Consumes: `readText` aus Task 1.
- Produces: `unifiedDiff(oldText: string, newText: string, oldName: string, newName: string, context?: number): string` — leerer String ohne Unterschied, sonst ein Diff im unified-Format mit den Kopfzeilen `--- <oldName>` und `+++ <newName>`, `context` Zeilen Kontext (Standard 3), Zeilenenden werden zu `\n` vereinheitlicht. Befehl `diff <alt> <neu>` gibt den Diff aus oder `Keine Änderung`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/toolbelt/tests/claude-md-guard.test.js` ersetze die Zeile
  ```js
  const { charCount, stampOf, backupPathOf, makeBackup } = require('../scripts/lib/claude-md-guard');
  ```
  durch
  ```js
  const { charCount, stampOf, backupPathOf, makeBackup, unifiedDiff } = require('../scripts/lib/claude-md-guard');
  ```
  und hänge ans Dateiende an:
  ```js
  test('unifiedDiff_Identical_EmptyString', () => {
    assert.equal(unifiedDiff('a\nb\n', 'a\nb\n', 'alt', 'neu'), '');
  });

  test('unifiedDiff_OneLineChanged_HunkWithContext', () => {
    const diff = unifiedDiff('a\nb\nc\n', 'a\nB\nc\n', 'alt', 'neu');

    assert.equal(diff, '--- alt\n+++ neu\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n');
  });

  test('unifiedDiff_DistantChanges_TwoHunksWithThreeLinesOfContext', () => {
    const oldText = '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n';
    const newText = 'X\n2\n3\n4\n5\n6\n7\n8\n9\nY\n';

    const diff = unifiedDiff(oldText, newText, 'alt', 'neu');

    assert.equal(diff, '--- alt\n+++ neu\n@@ -1,4 +1,4 @@\n-1\n+X\n 2\n 3\n 4\n@@ -7,4 +7,4 @@\n 7\n 8\n 9\n-10\n+Y\n');
  });

  test('unifiedDiff_WindowsLineEndings_TreatedAsPlainLines', () => {
    assert.equal(unifiedDiff('a\r\nb\r\n', 'a\nb\n', 'alt', 'neu'), '');
  });

  test('cli_DiffOfTwoFiles_PrintsChangedLines', () => {
    const before = fileWith('a\nb\nc\n', 'alt.md');
    const after = fileWith('a\nB\nc\n', 'neu.md');

    const result = cli('diff', before, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `--- ${before}\n+++ ${after}\n@@ -1,3 +1,3 @@\n a\n-b\n+B\n c\n`);
  });

  test('cli_DiffOfEqualFiles_ReportsNoChange', () => {
    const before = fileWith('a\n', 'alt.md');
    const after = fileWith('a\n', 'neu.md');

    const result = cli('diff', before, after);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'Keine Änderung\n');
  });

  test('cli_DiffWithOneFile_UsageAndExitTwo', () => {
    assert.equal(cli('diff', fileWith('a')).status, 2);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: FAIL `unifiedDiff_OneLineChanged_HunkWithContext` (`unifiedDiff is not a function`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/toolbelt/scripts/lib/claude-md-guard.js` füge vor `module.exports` ein:
  ```js
  function splitLines(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines;
  }

  // Zeilenweiser Vergleich über die längste gemeinsame Teilfolge; bei Gleichstand gilt die Löschung vor der Einfügung.
  function lineDiff(before, after) {
    const table = Array.from({ length: before.length + 1 }, () => new Array(after.length + 1).fill(0));
    for (let i = before.length - 1; i >= 0; i -= 1) {
      for (let j = after.length - 1; j >= 0; j -= 1) {
        table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < before.length && j < after.length) {
      if (before[i] === after[j]) {
        ops.push({ kind: ' ', text: before[i] });
        i += 1;
        j += 1;
      } else if (table[i + 1][j] >= table[i][j + 1]) {
        ops.push({ kind: '-', text: before[i] });
        i += 1;
      } else {
        ops.push({ kind: '+', text: after[j] });
        j += 1;
      }
    }
    for (; i < before.length; i += 1) ops.push({ kind: '-', text: before[i] });
    for (; j < after.length; j += 1) ops.push({ kind: '+', text: after[j] });
    return ops;
  }

  // Bereiche der Operationen, die ein Hunk zeigt: jede Änderung mit `context` Zeilen davor und danach, überlappende Bereiche verschmolzen.
  function hunkRanges(ops, context) {
    const ranges = [];
    ops.forEach((op, index) => {
      if (op.kind === ' ') return;
      const from = Math.max(0, index - context);
      const to = Math.min(ops.length - 1, index + context);
      const last = ranges.at(-1);
      if (last && from <= last.to + 1) last.to = Math.max(last.to, to);
      else ranges.push({ from, to });
    });
    return ranges;
  }

  function hunkLines(ops, { from, to }) {
    const before = ops.slice(0, from);
    const inside = ops.slice(from, to + 1);
    const oldStart = before.filter((op) => op.kind !== '+').length + 1;
    const newStart = before.filter((op) => op.kind !== '-').length + 1;
    const oldCount = inside.filter((op) => op.kind !== '+').length;
    const newCount = inside.filter((op) => op.kind !== '-').length;
    return [`@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`, ...inside.map((op) => `${op.kind}${op.text}`)];
  }

  function unifiedDiff(oldText, newText, oldName, newName, context = 3) {
    const ops = lineDiff(splitLines(oldText), splitLines(newText));
    const ranges = hunkRanges(ops, context);
    if (ranges.length === 0) return '';
    return `${[`--- ${oldName}`, `+++ ${newName}`, ...ranges.flatMap((range) => hunkLines(ops, range))].join('\n')}\n`;
  }

  ```
  und ersetze die letzte Zeile durch
  ```js
  module.exports = { GuardError, readText, charCount, stampOf, backupPathOf, makeBackup, unifiedDiff };
  ```
  In `plugins/toolbelt/scripts/claude-md-guard.js`:
  1. Ersetze die `require`-Zeile durch
     ```js
     const { GuardError, readText, charCount, makeBackup, unifiedDiff } = require('./lib/claude-md-guard');
     ```
  2. Ersetze in `USAGE` die Zeile `'        node claude-md-guard.js backup <datei> [--to <pfad>]',` durch
     ```js
       '        node claude-md-guard.js backup <datei> [--to <pfad>]',
       '        node claude-md-guard.js diff <alt> <neu>',
     ```
  3. Füge in `COMMANDS` nach dem Eintrag `backup` hinzu:
     ```js
       diff: ([before, after]) => (before && after ? unifiedDiff(readText(before), readText(after), before, after) || 'Keine Änderung' : null),
     ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/scripts plugins/toolbelt/tests/claude-md-guard.test.js` · `git commit -m "feat(toolbelt): show a unified diff against the backup in claude-md-guard"`

---

### Task 3: Hash-Vergleich geschützter Blöcke

**ACs:** AC-17

**Dateien:**
- Modify: `plugins/toolbelt/scripts/lib/claude-md-guard.js` · `module.exports`, `require`
- Modify: `plugins/toolbelt/scripts/claude-md-guard.js` · `USAGE`, `COMMANDS`, `require`
- Modify: `plugins/toolbelt/tests/claude-md-guard.test.js` · `require`-Zeile, Dateiende

**Interfaces:**
- Consumes: `GuardError`, `readText` aus Task 1.
- Produces: `protectedBlocks(text: string, start: string, end: string): Array<{ from: number, to: number, text: string }>` (1-basierte Zeilen, Marker-Zeilen eingeschlossen; Start und Ende sind Teilzeichenfolgen einer Zeile; Start und Ende in derselben Zeile, in dieser Reihenfolge, ergeben einen Ein-Zeilen-Block; ein Block ohne Ende wirft `GuardError`), `blockHashes(text, start, end): string[]` mit Einträgen `<from>-<to>:<sha256 hex>`, `verifyBlocks(text, start, end, expected: string[]): string[]` (Probleme `Block <n> (Zeilen <a>-<b>) ist geändert`, `Block <n> (Zeilen <a>-<b>) ist neu`, `Block <n> fehlt`; leer heißt unverändert; verglichen wird nur der Inhalt, nicht die Zeilennummer). Befehle: `blocks hash <datei> --start <text> --end <text>` gibt `Blöcke: <n>` und `Hashes: <einträge, mit Komma getrennt>` aus; `blocks verify <datei> --start <text> --end <text> --hashes <einträge>` gibt `Blöcke unverändert: <n>` aus oder endet mit Exit 1 und den Problemen auf stderr.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/toolbelt/tests/claude-md-guard.test.js` ersetze die Zeile
  ```js
  const { charCount, stampOf, backupPathOf, makeBackup, unifiedDiff } = require('../scripts/lib/claude-md-guard');
  ```
  durch
  ```js
  const { GuardError, charCount, stampOf, backupPathOf, makeBackup, unifiedDiff, protectedBlocks, blockHashes, verifyBlocks } = require('../scripts/lib/claude-md-guard');
  ```
  und hänge ans Dateiende an:
  ```js
  const START = '<!-- X START';
  const END = '<!-- X END';
  const TWO_BLOCKS = 'a\n<!-- X START -->\ninhalt\n<!-- X END -->\nb\n<!-- X START -->\nzwei\n<!-- X END -->\n';

  test('protectedBlocks_TwoBlocks_LinesIncludeTheMarkers', () => {
    const blocks = protectedBlocks(TWO_BLOCKS, START, END);

    assert.deepEqual(blocks.map(({ from, to }) => [from, to]), [[2, 4], [6, 8]]);
    assert.equal(blocks[0].text, '<!-- X START -->\ninhalt\n<!-- X END -->\n');
  });

  test('protectedBlocks_StartAndEndInOneLine_SingleLineBlock', () => {
    const blocks = protectedBlocks('a\n<!-- N:start --> x <!-- N:end -->\nb\n', '<!-- N:start', 'N:end -->');

    assert.deepEqual(blocks.map(({ from, to }) => [from, to]), [[2, 2]]);
  });

  test('protectedBlocks_StartWithoutEnd_ThrowsWithLine', () => {
    assert.throws(() => protectedBlocks('a\n<!-- X START -->\nb\n', START, END), (error) => error instanceof GuardError && /Block ab Zeile 2 hat kein Ende/.test(error.message));
  });

  test('protectedBlocks_NoMarkerInText_Empty', () => {
    assert.deepEqual(protectedBlocks('nur Text\n', START, END), []);
  });

  test('blockHashes_TwoBlocks_PositionAndSha256PerBlock', () => {
    const hashes = blockHashes(TWO_BLOCKS, START, END);

    assert.equal(hashes.length, 2);
    assert.match(hashes[0], /^2-4:[0-9a-f]{64}$/);
    assert.match(hashes[1], /^6-8:[0-9a-f]{64}$/);
  });

  test('verifyBlocks_SameBlocksShiftedByAnInsertedLine_NoProblem', () => {
    const hashes = blockHashes(TWO_BLOCKS, START, END);

    assert.deepEqual(verifyBlocks(`neu\n${TWO_BLOCKS}`, START, END, hashes), []);
  });

  test('verifyBlocks_ChangedContent_ReportsTheBlock', () => {
    const hashes = blockHashes(TWO_BLOCKS, START, END);

    const problems = verifyBlocks(TWO_BLOCKS.replace('inhalt', 'anders'), START, END, hashes);

    assert.deepEqual(problems, ['Block 1 (Zeilen 2-4) ist geändert']);
  });

  test('verifyBlocks_OnlyLineEndingChanged_ReportsTheBlock', () => {
    const hashes = blockHashes(TWO_BLOCKS, START, END);

    const problems = verifyBlocks(TWO_BLOCKS.replace('zwei\n', 'zwei\r\n'), START, END, hashes);

    assert.deepEqual(problems, ['Block 2 (Zeilen 6-8) ist geändert']);
  });

  test('verifyBlocks_RemovedAndAddedBlock_ReportsMissingAndNew', () => {
    const hashes = blockHashes(TWO_BLOCKS, START, END);
    const onlyFirst = 'a\n<!-- X START -->\ninhalt\n<!-- X END -->\n';
    const three = `${TWO_BLOCKS}<!-- X START -->\ndrei\n<!-- X END -->\n`;

    assert.deepEqual(verifyBlocks(onlyFirst, START, END, hashes), ['Block 2 fehlt']);
    assert.deepEqual(verifyBlocks(three, START, END, hashes), ['Block 3 (Zeilen 9-11) ist neu']);
  });

  test('cli_BlocksHash_PrintsCountAndHashes', () => {
    const file = fileWith(TWO_BLOCKS);

    const result = cli('blocks', 'hash', file, '--start', START, '--end', END);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^Blöcke: 2\nHashes: 2-4:[0-9a-f]{64},6-8:[0-9a-f]{64}\n$/);
  });

  test('cli_BlocksVerify_UnchangedFile_ExitZero', () => {
    const file = fileWith(TWO_BLOCKS);
    const hashes = blockHashes(TWO_BLOCKS, START, END).join(',');

    const result = cli('blocks', 'verify', file, '--start', START, '--end', END, '--hashes', hashes);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'Blöcke unverändert: 2\n');
  });

  test('cli_BlocksVerify_ChangedBlock_ExitOneWithProblem', () => {
    const file = fileWith(TWO_BLOCKS.replace('inhalt', 'anders'));
    const hashes = blockHashes(TWO_BLOCKS, START, END).join(',');

    const result = cli('blocks', 'verify', file, '--start', START, '--end', END, '--hashes', hashes);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Block 1 \(Zeilen 2-4\) ist geändert/);
  });

  test('cli_BlocksWithoutEndMarker_UsageAndExitTwo', () => {
    assert.equal(cli('blocks', 'hash', fileWith(TWO_BLOCKS), '--start', START).status, 2);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: FAIL `protectedBlocks_TwoBlocks_LinesIncludeTheMarkers` (`protectedBlocks is not a function`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/toolbelt/scripts/lib/claude-md-guard.js` ergänze unter den `require`-Zeilen
  ```js
  const crypto = require('node:crypto');
  ```
  füge vor `module.exports` ein:
  ```js
  // Zeilen samt ihrer Zeilenenden, damit ein Hash auch Änderungen am Zeilenende sieht.
  function linesWithEndings(text) {
    return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  }

  function protectedBlocks(text, start, end) {
    const lines = linesWithEndings(text);
    const blocks = [];
    let open = null;
    lines.forEach((line, index) => {
      if (open === null) {
        const at = line.indexOf(start);
        if (at === -1) return;
        open = index;
        if (line.indexOf(end, at + start.length) === -1) return;
      } else if (!line.includes(end)) {
        return;
      }
      blocks.push({ from: open + 1, to: index + 1, text: lines.slice(open, index + 1).join('') });
      open = null;
    });
    if (open !== null) throw new GuardError(`Block ab Zeile ${open + 1} hat kein Ende (${end})`);
    return blocks;
  }

  function sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  function blockHashes(text, start, end) {
    return protectedBlocks(text, start, end).map((block) => `${block.from}-${block.to}:${sha256(block.text)}`);
  }

  // Verglichen wird der Inhalt je Block in der Reihenfolge des Auftretens, nicht die Zeilennummer.
  function verifyBlocks(text, start, end, expected) {
    const blocks = protectedBlocks(text, start, end);
    const before = expected.map((entry) => entry.split(':')[1]);
    const problems = [];
    blocks.forEach((block, index) => {
      const place = `Block ${index + 1} (Zeilen ${block.from}-${block.to})`;
      if (index >= before.length) problems.push(`${place} ist neu`);
      else if (sha256(block.text) !== before[index]) problems.push(`${place} ist geändert`);
    });
    for (let index = blocks.length; index < before.length; index += 1) problems.push(`Block ${index + 1} fehlt`);
    return problems;
  }

  ```
  und ersetze die letzte Zeile durch
  ```js
  module.exports = { GuardError, readText, charCount, stampOf, backupPathOf, makeBackup, unifiedDiff, protectedBlocks, blockHashes, verifyBlocks };
  ```
  In `plugins/toolbelt/scripts/claude-md-guard.js`:
  1. Ersetze die `require`-Zeile durch
     ```js
     const { GuardError, readText, charCount, makeBackup, unifiedDiff, blockHashes, verifyBlocks } = require('./lib/claude-md-guard');
     ```
  2. Ergänze `USAGE` nach der `diff`-Zeile um
     ```js
       '        node claude-md-guard.js blocks hash <datei> --start <text> --end <text>',
       '        node claude-md-guard.js blocks verify <datei> --start <text> --end <text> --hashes <einträge>',
     ```
  3. Füge die Funktion vor dem Kommentar `// Jeder Befehl liefert den Text für stdout; …` ein, der über `COMMANDS` steht:
     ```js
     function blocksCommand([action, file], flags) {
       if (!['hash', 'verify'].includes(action) || !file || !flags.start || !flags.end) return null;
       const text = readText(file);
       if (action === 'hash') {
         const hashes = blockHashes(text, flags.start, flags.end);
         return `Blöcke: ${hashes.length}\nHashes: ${hashes.join(',')}`;
       }
       if (flags.hashes === undefined) return null;
       const expected = flags.hashes.split(',').filter(Boolean);
       const problems = verifyBlocks(text, flags.start, flags.end, expected);
       if (problems.length > 0) throw new GuardError(problems.join('\n'));
       return `Blöcke unverändert: ${expected.length}`;
     }

     ```
     und füge in `COMMANDS` nach dem Eintrag `diff` hinzu:
     ```js
       blocks: blocksCommand,
     ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-guard.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/scripts plugins/toolbelt/tests/claude-md-guard.test.js` · `git commit -m "feat(toolbelt): compare protected CLAUDE.md blocks by hash in claude-md-guard"`

---

### Task 4: Der Skill `claude-md-audit`

**ACs:** AC-07, AC-08, AC-09, AC-10, AC-12, AC-13, AC-14, AC-15, AC-16, AC-17, AC-18, AC-19, AC-20, AC-41

**Dateien:**
- Create: `plugins/toolbelt/skills/claude-md-audit/SKILL.md`
- Create: `plugins/toolbelt/tests/lib/german.js`
- Modify: `plugins/toolbelt/README.md` · `| `prozess-retrospektive` |` (Tabelle unter `## Skills`; die Datei legt Plan 1, Task 1 an)
- Test: `plugins/toolbelt/tests/claude-md-audit-skill.test.js`

**Interfaces:**
- Consumes: Befehle und Ausgaben des Skripts aus den Tasks 1–3 (`size`, `backup`, `diff`, `blocks hash`, `blocks verify`); `readMarkdown(file): { fields, body }` aus `plugins/toolbelt/tests/lib/markdown.js`.
- Produces: Skill `claude-md-audit`; aus `tests/lib/german.js`: `isMostlyGerman(text: string): boolean` (für Plan 3).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/lib/german.js`:
  ```js
  'use strict';

  // Grobe Spracherkennung für Skill-Texte: zählt häufige deutsche gegen häufige englische Funktionswörter.

  const GERMAN = ['der', 'die', 'das', 'und', 'nicht', 'wenn', 'mit', 'ein', 'eine', 'für', 'von', 'zu', 'ist', 'nur', 'nach', 'vor', 'du', 'den', 'dem'];
  const ENGLISH = ['the', 'and', 'not', 'when', 'with', 'for', 'of', 'to', 'is', 'only', 'after', 'before', 'you', 'this', 'that'];

  function wordsOf(text) {
    return text.toLowerCase().match(/[a-zäöüß]+/g) ?? [];
  }

  function occurrences(text, list) {
    const known = new Set(list);
    return wordsOf(text).filter((word) => known.has(word)).length;
  }

  function isMostlyGerman(text) {
    return occurrences(text, GERMAN) > 2 * occurrences(text, ENGLISH);
  }

  module.exports = { isMostlyGerman };
  ```
  Neue Datei `plugins/toolbelt/tests/claude-md-audit-skill.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown } = require('./lib/markdown');
  const { isMostlyGerman } = require('./lib/german');

  const SKILL = path.join(__dirname, '..', 'skills', 'claude-md-audit', 'SKILL.md');
  const GUARD = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js"';
  const CRITERIA = ['Länge', 'Dokument statt Rahmenkorn', 'Doppelung', 'Widerspruch', 'Ableitbar', 'Krücke für alte Modelle', 'Mehrdeutig', 'Für Menschen geschrieben', 'Trigger fehlt'];

  function skill() {
    return readMarkdown(SKILL);
  }

  test('claudeMdAudit_Frontmatter_NameDescriptionAndGuardScriptAllowed', () => {
    const { fields } = skill();

    assert.deepEqual(Object.keys(fields), ['name', 'description', 'allowed-tools']);
    assert.equal(fields.name, 'claude-md-audit');
    assert.match(fields.description, /^Use when /);
    assert.doesNotMatch(fields.description, /[<>]|: /);
    for (const shell of ['Bash', 'PowerShell']) assert.ok(fields['allowed-tools'].includes(`${shell}(${GUARD} *)`), shell);
  });

  test('claudeMdAudit_Description_GermanAndEnglishTriggerWords', () => {
    const { fields } = skill();

    assert.match(fields.description, /CLAUDE\.md prüfen/);
    assert.match(fields.description, /audit CLAUDE\.md/);
  });

  test('claudeMdAudit_Body_IsGerman', () => {
    assert.ok(isMostlyGerman(skill().body));
  });

  test('claudeMdAudit_Body_TargetIsGivenPathOrProjectRootClaudeMd', () => {
    const { body } = skill();

    assert.ok(body.includes('Prüfziel ist der Pfad, den der Mensch nennt'));
    assert.ok(body.includes('ohne Angabe die CLAUDE.md im Wurzelordner des Projekts'));
  });

  test('claudeMdAudit_Body_AsksForBackupBeforeCheckingAnything', () => {
    const { body } = skill();

    const asked = body.indexOf('Backup anlegen? Wohin?');
    assert.ok(body.includes('Bevor du etwas prüfst oder änderst'));
    assert.ok(asked > -1);
    assert.ok(asked < body.indexOf('2. **Prüfen.**'));
  });

  test('claudeMdAudit_Body_BackupAnswers_TempFolderGivenPathOrNone', () => {
    const { body } = skill();

    assert.ok(body.includes(`${GUARD} backup '<datei>'`));
    assert.ok(body.includes('temporären Ordner des Systems'));
    assert.ok(body.includes('nennst dem Menschen den Pfad'));
    assert.ok(body.includes(`backup '<datei>' --to '<pfad>'`));
    assert.ok(body.includes('Nein: kein Backup und am Ende kein Diff'));
    assert.ok(body.includes('Ohne Backup bleiben nur die zwei Zeichenzahlen'));
  });

  test('claudeMdAudit_Body_ShowsDiffAndBothCharacterCountsAfterTheChange', () => {
    const { body } = skill();

    assert.ok(body.includes(`${GUARD} size '<datei>'`));
    assert.ok(body.includes(`${GUARD} diff '<backup>' '<datei>'`));
    assert.ok(body.includes('nennst beide Zeichenzahlen'));
  });

  test('claudeMdAudit_Body_AtMostFiveFindingsPerMessageRestOnlyAsCount', () => {
    const { body } = skill();

    assert.ok(body.includes('höchstens fünf je Nachricht, die wichtigsten zuerst'));
    assert.ok(body.includes('den Rest nur als Anzahl'));
  });

  test('claudeMdAudit_Body_FindingHasQuoteProblemAndProposal', () => {
    assert.ok(skill().body.includes('Zitat, Problem, Vorschlag (neuer Wortlaut, Ziel-Skill oder Löschen)'));
  });

  test('claudeMdAudit_Body_NothingChangedWithoutApprovalAndNeverCommitted', () => {
    const { body } = skill();

    assert.ok(body.includes('nie committen'));
    assert.ok(body.includes('Der Mensch entscheidet'));
    assert.ok(body.includes('änderst du nur freigegebene Stellen'));
  });

  test('claudeMdAudit_Body_ProtectedBlocksOnlyNamedByHumanAndCheckedByHash', () => {
    const { body } = skill();

    assert.ok(body.includes('Geschützt ist nur, was der Mensch nennt'));
    assert.ok(body.includes(`${GUARD} blocks hash '<datei>' --start '<start>' --end '<ende>'`));
    assert.ok(body.includes(`${GUARD} blocks verify '<datei>' --start '<start>' --end '<ende>' --hashes '<wert>'`));
    assert.ok(body.includes('Vorschlag an den Besitzer'));
  });

  test('claudeMdAudit_Body_FailedBlockCheck_RestoredFromBackupOrRememberedWording', () => {
    const { body } = skill();

    assert.ok(body.includes('ohne Backup merkst du dir zusätzlich den Wortlaut jedes Blocks'));
    assert.ok(body.includes('Mit Backup stellst du die Zeilen der betroffenen Blöcke aus dem Backup wieder her'));
    assert.ok(body.includes('Ohne Backup stellst du sie aus dem gemerkten Wortlaut wieder her'));
    assert.ok(body.includes('danach prüfst du erneut mit `blocks verify`'));
  });

  test('claudeMdAudit_Body_MarkersInSingleQuotesWithoutShellSpecialCharacters', () => {
    const { body } = skill();

    assert.ok(body.includes('Marker gibst du in einfachen Anführungszeichen weiter'));
    assert.ok(body.includes('bittest du den Menschen um einen Marker ohne diese Zeichen'));
  });

  test('claudeMdAudit_Body_PathsInSingleQuotesWithoutSingleQuote', () => {
    const { body } = skill();

    assert.ok(body.includes('Pfade (`<datei>`, `<pfad>`, `<backup>`) gibst du in einfachen Anführungszeichen weiter'));
    assert.ok(body.includes('Enthält ein Pfad `\'`, bittest du den Menschen um einen Pfad ohne dieses Zeichen'));
  });

  test('claudeMdAudit_Body_NamesAllNineCriteria', () => {
    const { body } = skill();

    for (const criterion of CRITERIA) assert.ok(body.includes(`**${criterion}:**`), criterion);
  });

  test('claudeMdAudit_Body_NewRuleChecksNeedDuplicateConflictAndWording', () => {
    const { body } = skill();

    assert.ok(body.includes('Nur wenn jeder Agent sie in jeder Session braucht'));
    assert.ok(body.includes('Steht sie schon, auch sinngemäß?'));
    assert.ok(body.includes('Widerspricht sie einem Eintrag?'));
    assert.ok(body.includes('den Wortlaut lässt du vom Menschen bestätigen'));
  });

  test('claudeMdAudit_Skill_NoMemoryGitIgnoreOrPluginSectionAssumption', () => {
    const { fields, body } = skill();

    assert.doesNotMatch(`${fields.description}\n${body}`, /memory|gitignore|git-ignore|Plugin-Abschnitt/i);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-audit-skill.test.js` — erwartet: FAIL, alle Tests, zuerst `claudeMdAudit_Frontmatter_NameDescriptionAndGuardScriptAllowed` mit `ENOENT … SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/skills/claude-md-audit/SKILL.md`:
  ```markdown
  ---
  name: claude-md-audit
  description: Use when a CLAUDE.md is to be reviewed, shortened, cleaned up or extended, or when a new rule is supposed to go into it. Auslöser sind CLAUDE.md prüfen, CLAUDE.md kürzen, CLAUDE.md aufräumen, CLAUDE.md erweitern, Regel in die CLAUDE.md, CLAUDE.md zu lang sowie audit CLAUDE.md und trim CLAUDE.md.
  allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" *)
  ---

  # CLAUDE.md prüfen

  Ausgabe Deutsch, knapp, als Liste. Prüfen und Umbau gemeinsam mit dem Menschen; nie still umschreiben, nie committen.

  ## Leitbild

  - Die CLAUDE.md ist ein gesetztes Rahmenkorn für Agenten und Subagenten, kein Dokument. Leser ist Claude, nicht der Mensch.
  - Wenig Zeichen sind wenig Token, bei bestem Nutzen.
  - Ausführliches gehört in einen Skill oder eine Referenzdatei; in der CLAUDE.md steht nur der Zeiger darauf.
  - Ein Eintrag ist ein kurzer Punkt im Stil einer Checkliste: Imperativ, Fragmente erlaubt.

  ## Skript-Aufrufe

  - Pfade (`<datei>`, `<pfad>`, `<backup>`) gibst du in einfachen Anführungszeichen weiter, wie unten gezeigt; so bleibt ein Pfad mit Leerzeichen in Git Bash und PowerShell ein Wort.
  - Enthält ein Pfad `'`, bittest du den Menschen um einen Pfad ohne dieses Zeichen (etwa eine Kopie der Datei an einem anderen Ort) und rufst das Skript erst danach auf.

  ## Geschützte Blöcke

  - Geschützt ist nur, was der Mensch nennt: je Block ein Start-Text und ein End-Text (Marker). Ohne Nennung rätst du keine Blöcke.
  - Die Zeilen von Start bis Ende, Marker eingeschlossen, änderst du nicht, auch nicht bei Pauschalfreigabe („alle ok“). Ein Befund darin ist ein Vorschlag an den Besitzer des Blocks, kein Edit.
  - Marker gibst du in einfachen Anführungszeichen weiter. Enthält ein Marker `'`, `"`, `$` oder einen Backtick, bittest du den Menschen um einen Marker ohne diese Zeichen und rufst das Skript erst danach auf.
  - Vor dem Umbau: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" blocks hash '<datei>' --start '<start>' --end '<ende>'`; die Zeile `Hashes:` merkst du dir (bei `Blöcke: 0` entfällt die Prüfung), ohne Backup merkst du dir zusätzlich den Wortlaut jedes Blocks.
  - Nach dem Umbau: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" blocks verify '<datei>' --start '<start>' --end '<ende>' --hashes '<wert>'`. Endet der Aufruf mit Fehler, meldest du das sofort. Mit Backup stellst du die Zeilen der betroffenen Blöcke aus dem Backup wieder her. Ohne Backup stellst du sie aus dem gemerkten Wortlaut wieder her und zeigst dem Menschen das Ergebnis; danach prüfst du erneut mit `blocks verify`.

  ## Ablauf

  1. **Ziel und Backup.** Prüfziel ist der Pfad, den der Mensch nennt; ohne Angabe die CLAUDE.md im Wurzelordner des Projekts. Bevor du etwas prüfst oder änderst, fragst du: „Backup anlegen? Wohin?“
     - Ja ohne Pfad: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" backup '<datei>'`; das Backup liegt im temporären Ordner des Systems, und du nennst dem Menschen den Pfad aus der Ausgabe `Backup: <pfad>`.
     - Ja mit Pfad: `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" backup '<datei>' --to '<pfad>'`.
     - Nein: kein Backup und am Ende kein Diff.

     Danach rufst du `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" size '<datei>'` auf und merkst dir die Zeichenzahl.
  2. **Prüfen.** Du bewertest jeden Eintrag nach den Kriterien unten. Edit-Befunde nennst du als Liste, höchstens fünf je Nachricht, die wichtigsten zuerst; den Rest nur als Anzahl („3 weitere Befunde offen“), nie als Aufzählung. Befunde in geschützten Blöcken stehen in einer eigenen Zeile „Vorschlag an den Besitzer“.
  3. **Befund melden.** Je Befund: Zitat, Problem, Vorschlag (neuer Wortlaut, Ziel-Skill oder Löschen). Der Mensch entscheidet.
  4. **Umbauen.** Nach der Freigabe änderst du nur freigegebene Stellen. Danach prüfst du die geschützten Blöcke (siehe oben), rufst `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" size '<datei>'` erneut auf und nennst beide Zeichenzahlen.
  5. **Zeigen.** Mit Backup zeigst du die Ausgabe von `node "${CLAUDE_PLUGIN_ROOT}/scripts/claude-md-guard.js" diff '<backup>' '<datei>'`. Ohne Backup bleiben nur die zwei Zeichenzahlen.

  ## Kriterien

  - **Länge:** Satz mit Nebensatz, Begründung oder Beispiel: auf die Kernaussage kürzen.
  - **Dokument statt Rahmenkorn:** mehr als drei Zeilen zu einem Thema: in einen Skill auslagern, Zeiger lassen.
  - **Doppelung:** dieselbe Aussage an zwei Orten, auch gegen Skill oder geschützten Block: auf eine Stelle bringen.
  - **Widerspruch:** Regel gegen Regel oder gegen einen geschützten Block: melden, nie raten.
  - **Ableitbar:** Claude sieht es selbst (Dateistruktur, Standardverhalten): streichen.
  - **Krücke für alte Modelle:** Streng-Formeln („nie“, „genau so“) ohne konkreten Fehlerfall: entschärfen oder streichen.
  - **Mehrdeutig:** zwei Lesarten möglich oder ein Platzhalter, den kein Werkzeug kennt: eindeutig machen.
  - **Für Menschen geschrieben:** Erklärung, Höflichkeit, Überschrift ohne Nutzen: streichen.
  - **Trigger fehlt:** Regel gilt nur in einer Situation, nennt sie aber nicht: Auslöser voranstellen.

  ## Neue Regel aufnehmen

  1. Gehört sie in die CLAUDE.md? Nur wenn jeder Agent sie in jeder Session braucht. Sonst gehört sie in einen Skill oder eine Referenzdatei.
  2. Steht sie schon, auch sinngemäß? Dann änderst du den Eintrag, du hängst nichts an.
  3. Widerspricht sie einem Eintrag? Erst klären, dann schreiben.
  4. Formuliere sie als ein kurzer Punkt unter einem vorhandenen Abschnitt; den Wortlaut lässt du vom Menschen bestätigen.

  ## Fehler

  | Fehler | Richtig |
  |---|---|
  | Befunde und Umbau in einem Zug | Erst die Liste, der Mensch entscheidet, dann der Umbau |
  | Geschützten Block „mitoptimieren“ | Nur als Vorschlag an den Besitzer melden |
  | Neuer Abschnitt für eine Einzelregel | In einen passenden Abschnitt einreihen |
  | Prosa durch Prosa ersetzen | Punkt, Imperativ, Fragment |
  | Weitere Befunde als zweite Liste anhängen | Nur die Anzahl nennen |
  ```
  In `plugins/toolbelt/README.md` ersetze die Zeile
  ```markdown
  | `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |
  ```
  durch
  ```markdown
  | `claude-md-audit` | CLAUDE.md prüfen, kürzen und erweitern, mit Backup und Hash-Prüfung geschützter Blöcke |
  | `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/claude-md-audit-skill.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Gesamtlauf mit den Wächtern aus Plan 1**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`, darunter PASS `plugin_AllFilesButReadme_NameNoForeignPluginOrSkill` und PASS `scripts_EveryScript_HasItsTestFile`
- [ ] **Schritt 6: Commit**
  `git add plugins/toolbelt` · `git commit -m "feat(toolbelt): add the claude-md-audit skill"`

---

## Entscheidungen
- **W · Aufteilung** · Aussage — Drei Pläne: Gerüst und Retro-Umzug, `claude-md-audit`, `writing-skills`.
- **W · Planungs-Skills** · Aussage — Keine Planungs-Skills für diese Pläne.
- **E · Skript-Aufbau** · Planer — Die Logik liegt in `scripts/lib/claude-md-guard.js`, das Skript `scripts/claude-md-guard.js` bündelt vier Befehle. Ein einziges Skript hält den Skill-Text kurz, und der Wächter aus Plan 1 verlangt genau eine Testdatei `tests/claude-md-guard.test.js`.
- **E · Zeichenzahl** · Planer — Gezählt werden Zeichen (Unicode-Zeichen), nicht Bytes, weil die Spec „Zeichenzahl“ sagt.
- **E · Backup-Name** · Planer — Ohne Pfad heißt das Backup `<dateiname>.<JJJJMMTT-HHMMSS>.bak` im temporären Ordner des Systems; das erfüllt „Datum und Dateiname stehen im Namen“. Ein vorhandener Ordner als Ziel bekommt denselben Namen.
- **E · Diff** · Planer — Der Diff ist ein eigenes unified-Format ohne Fremdprogramm (`git`, `diff`), damit das Plugin allein mit Node läuft; Zeilenenden werden dafür vereinheitlicht.
- **E · Block-Marker** · Planer — Der Mensch nennt je Block eine Start- und eine End-Zeichenfolge; sie passen als Teilzeichenfolge einer Zeile. Der Hash-Vergleich vergleicht Inhalt (einschließlich Zeilenenden) je Block in der Reihenfolge des Auftretens, nicht die Zeilennummer.
- **E · Hash-Übergabe** · Planer — Die Hashes laufen als Text zwischen den zwei Aufrufen im Gespräch (`Hashes:` merken, dann `--hashes "<wert>"`), damit auch bei „Nein“ zum Backup keine Datei entsteht.
- **E · Sprachhilfe** · Planer — `tests/lib/german.js` zählt deutsche gegen englische Funktionswörter; sie dient AC-41 hier und in Plan 3.
- **R1 · AC-01** — nicht geändert — Nach „W · Aufteilung“ gehört AC-01 zu Plan 1; `plan-1-geruest-und-retro.md` Task 1 nennt es unter `**ACs:**`.
- **R1 · AC-02** — nicht geändert — Gehört zu Plan 1, Task 1 nennt es unter `**ACs:**` (Version 0.1.0).
- **R1 · AC-21** — nicht geändert — Gehört zu Plan 3 (`writing-skills`), steht dort unter `**ACs:**` des Tasks zur Anleitung.
- **R1 · AC-22** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Tasks zur Anleitung.
- **R1 · AC-23** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Tasks zur Anleitung.
- **R1 · AC-24** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Tasks zum Referenzdokument Auslöse-Test.
- **R1 · AC-25** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Tasks zur Anleitung.
- **R1 · AC-26** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` der Tasks zu Begleitdateien und Anleitung.
- **R1 · AC-27** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-28** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-29** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-03** — nicht geändert — Gehört zu Plan 3, dessen Abschluss-Task es unter `**ACs:**` nennt; „genau drei Skills“ gilt erst nach Plan 3.
- **R1 · AC-30** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-31** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-32** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-33** — nicht geändert — Gehört zu Plan 3, steht dort unter `**ACs:**` des Validator-Tasks.
- **R1 · AC-34** — nicht geändert — Gehört zu Plan 1 (Retro-Umzug), Task 7 nennt es unter `**ACs:**`.
- **R1 · AC-35** — nicht geändert — Gehört zu Plan 1, Task 2 und Task 5 nennen es unter `**ACs:**`.
- **R1 · AC-36** — nicht geändert — Gehört zu Plan 1, Task 3 und Task 5 nennen es unter `**ACs:**`.
- **R1 · AC-37** — nicht geändert — Gehört zu Plan 1, Task 4 und Task 5 nennen es unter `**ACs:**`.
- **R1 · AC-38** — nicht geändert — Gehört zu Plan 1, Task 8 (`dv-forge` aufräumen) nennt es unter `**ACs:**`.
- **R1 · AC-39** — nicht geändert — Gehört zu Plan 1, Task 6 und Task 8 nennen es unter `**ACs:**`.
- **R1 · AC-04** — nicht geändert — Gehört zu Plan 1 (Tasks 2, 3, 7) und Plan 3 (Abschluss-Task); Plan 2 hält die Autonomie-Vorgabe in `## Global Constraints` ein, Task 4 Schritt 5 lässt den Wächter aus Plan 1 laufen.
- **R1 · AC-05** — nicht geändert — Gehört zu Plan 1 Task 7 (Wächter `plugin_AllFilesButReadme_NameNoForeignPluginOrSkill`) und Plan 3 Abschluss-Task; Task 4 Schritt 5 führt den Wächter auch für den neuen Skill aus.
- **R1 · AC-06** — nicht geändert — Gehört zu Plan 3 (README mit Herkunftssätzen); Plan 2 ergänzt nur eine Tabellenzeile.
- **R1 · Dateistruktur** — geändert — AC-13 und AC-17 stehen zusätzlich unter `**ACs:**` von Task 4, der Diff zeigen, beide Zeichenzahlen nennen und Befunde in Blöcken nur als Vorschlag umsetzt und testet; Task 2 und Task 3 behalten sie für die Skript-Hälfte. Beide ACs ganz geprüft: keine weitere Lücke.
- **R1 · Global Constraints** — geändert — Die fünf fehlenden Soll-Vorgaben der Spec (keine Retro-Migration, kein Umzugshinweis und Versionssprung in `dv-forge`, Version 0.1.0, kein Benchmark in v1, Validator als Node-Skript) stehen wörtlich unter `## Global Constraints`; die Namen stehen nur im Plan, nicht im Plugin.
- **R1 · Task 2** — geändert — Die Testdatei legt Task 1 an, die Zeile unter **Dateien:** heißt jetzt `Modify:` mit Anker `require`-Zeile, Dateiende.
- **R1 · Task 3** — geändert — Wie bei Task 2: Zeile der Testdatei unter **Dateien:** auf `Modify:` mit Anker `require`-Zeile, Dateiende umgestellt.
- **R1 · Task 4** — geändert — Festlegung: Marker und Hashes laufen in einfachen Anführungszeichen (`--start '<start>' --end '<ende>'`, `--hashes '<wert>'`), in Git Bash und PowerShell wörtlich; enthält ein Marker `'`, `"`, `$` oder einen Backtick, bittet der Skill um einen anderen Marker. `SKILL.md`, der Test `claudeMdAudit_Body_ProtectedBlocksOnlyNamedByHumanAndCheckedByHash` und der neue Test `claudeMdAudit_Body_MarkersInSingleQuotesWithoutShellSpecialCharacters` sind angepasst; die Schreibweise `--hashes "<wert>"` in „E · Hash-Übergabe“ gilt damit als `--hashes '<wert>'`. README-Anker auf `Tabelle unter ## Skills` geändert (die README legt Plan 1 Task 1 an).
- **R2 · AC-01** — geändert — Neuer Abschnitt `## Abdeckung über die drei Pläne` nach `## Global Constraints`, gleich aufgebaut wie in Plan 3; AC-01 steht dort bei Plan 1, Task 1. Die Tasks von Plan 2 bleiben dafür unverändert.
- **R2 · AC-02** — geändert — In der Abdeckungstabelle Plan 1, Task 1 zugeordnet.
- **R2 · AC-21** — geändert — In der Abdeckungstabelle Plan 3, Task 3 zugeordnet.
- **R2 · AC-22** — geändert — In der Abdeckungstabelle Plan 3, Task 3 zugeordnet.
- **R2 · AC-23** — geändert — In der Abdeckungstabelle Plan 3, Task 3 zugeordnet.
- **R2 · AC-24** — geändert — In der Abdeckungstabelle Plan 3, Task 2 zugeordnet.
- **R2 · AC-25** — geändert — In der Abdeckungstabelle Plan 3, Task 3 zugeordnet.
- **R2 · AC-26** — geändert — In der Abdeckungstabelle Plan 3, Task 2 und Task 3 zugeordnet.
- **R2 · AC-27** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet (eine Zeile je AC, damit die Prüfung keine Bereiche auflösen muss).
- **R2 · AC-28** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-29** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-03** — geändert — In der Abdeckungstabelle Plan 3, Task 4 zugeordnet; „genau drei Skills“ gilt erst nach Plan 3.
- **R2 · AC-30** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-31** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-32** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-33** — geändert — In der Abdeckungstabelle Plan 3, Task 1 zugeordnet.
- **R2 · AC-34** — geändert — In der Abdeckungstabelle Plan 1, Task 7 zugeordnet.
- **R2 · AC-35** — geändert — In der Abdeckungstabelle Plan 1, Task 2 und Task 5 zugeordnet.
- **R2 · AC-36** — geändert — In der Abdeckungstabelle Plan 1, Task 3 und Task 5 zugeordnet.
- **R2 · AC-37** — geändert — In der Abdeckungstabelle Plan 1, Task 4 und Task 5 zugeordnet.
- **R2 · AC-38** — geändert — In der Abdeckungstabelle Plan 1, Task 8 zugeordnet.
- **R2 · AC-39** — geändert — In der Abdeckungstabelle Plan 1, Task 6 und Task 8 zugeordnet.
- **R2 · AC-04** — geändert — In der Abdeckungstabelle Plan 1 (Task 2, Task 3, Task 7) und Plan 3 (Task 4) zugeordnet; Plan 2 hält die Vorgabe über `## Global Constraints` ein und lässt in Task 4 Schritt 5 den Wächter aus Plan 1 laufen.
- **R2 · AC-05** — geändert — In der Abdeckungstabelle Plan 1 (Task 7) und Plan 3 (Task 4) zugeordnet; der Wächterlauf in Task 4 Schritt 5 prüft auch den neuen Skill.
- **R2 · AC-06** — geändert — In der Abdeckungstabelle Plan 3, Task 4 zugeordnet; Plan 2 ergänzt nur eine Tabellenzeile der README.
- **R2 · Dateistruktur** — geändert — AC-10 steht zusätzlich unter `**ACs:**` von Task 4; `SKILL.md` Ablauf Schritt 1 weist den Skill an, dem Menschen den Pfad aus der Ausgabe `Backup: <pfad>` zu nennen, der Test `claudeMdAudit_Body_BackupAnswers_TempFolderGivenPathOrNone` prüft `nennst dem Menschen den Pfad`. Task 1 behält AC-10 für die Skript-Hälfte (temporärer Ordner, Datum und Dateiname im Namen); die Abdeckungstabelle nennt Task 1, Task 4. AC-10 ganz geprüft: keine weitere Lücke. Die Tabelle in Plan 3 nennt für AC-10 noch nur Task 1; sie liegt außerhalb dieser Nacharbeit.
- **R2 · Task 2** — geändert — Task 1 führt `plugins/toolbelt/tests/claude-md-guard.test.js` unter **Dateien:** jetzt als `Create:` statt `Test:`; die `Modify:`-Zeile in Task 2 verweist damit auf eine im Plan angelegte Datei.
- **R2 · Task 3** — geändert — Dieselbe Änderung wie bei Task 2 (Testdatei in Task 1 als `Create:`) macht die `Modify:`-Zeile in Task 3 gültig.
- **R2 · Task 4** — geändert — (1) Rückbau festgelegt: Schlägt `blocks verify` fehl, stellt der Skill mit Backup die Zeilen der betroffenen Blöcke aus dem Backup wieder her, ohne Backup aus dem Wortlaut, den er sich vor dem Umbau zusätzlich zu den Hashes merkt, zeigt das Ergebnis und prüft erneut mit `blocks verify`; „Nein“ heißt weiter kein Backup (AC-09, AC-12). Neuer Test `claudeMdAudit_Body_FailedBlockCheck_RestoredFromBackupOrRememberedWording`. (2) Pfade festgelegt: `<datei>`, `<pfad>` und `<backup>` stehen in allen Aufrufen in einfachen Anführungszeichen; enthält ein Pfad `'`, bittet der Skill um einen Pfad ohne dieses Zeichen. Neuer Abschnitt „Skript-Aufrufe“ in `SKILL.md`, neuer Test `claudeMdAudit_Body_PathsInSingleQuotesWithoutSingleQuote`, die bestehenden Test-Prüfungen auf die Form mit Anführungszeichen umgestellt; die Quoting-Regel aus „E · Hash-Übergabe“ und R1 · Task 4 gilt damit auch für Pfade. (3) README-Anker ist jetzt die eindeutige Tabellenzeile `| `prozess-retrospektive` |` mit dem Hinweis, dass Plan 1 Task 1 die Datei anlegt; im Repo fehlt `plugins/toolbelt` vor Plan 1, das ist eine Folge der Reihenfolge.
