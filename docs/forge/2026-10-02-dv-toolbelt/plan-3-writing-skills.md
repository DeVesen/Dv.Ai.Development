# dv-toolbelt, Plan 3: writing-skills — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-10-02-dv-toolbelt/plan-3-writing-skills.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Der Skill `writing-skills` führt durch Erstellen, Testen und Validieren von Skills, bringt einen Validator für den Skill-Kopf und ein Referenzdokument zum Auslöse-Test mit, und die README nennt alle drei Skills samt Inspirationsquellen.
**Architektur:** Der Validator liegt als testbare Bausteine in `plugins/toolbelt/scripts/lib/validate-skill.js`, das Skript `scripts/validate-skill.js` ist ein dünner Aufruf. Der Skill besteht aus `SKILL.md` und drei Referenzdateien unter `references/`, alle in eigenen Worten und eigener Gliederung geschrieben. Ein Schluss-Test prüft alle drei Skills des Plugins gemeinsam. Der Plan setzt Plan 1 und Plan 2 voraus (Gerüst, Wächter-Tests, `tests/lib/markdown.js`, `tests/lib/german.js`).
**Tech-Stack:** Node.js (`node:test`, `node:assert`), Markdown-Skill.
**Spec:** docs/forge/2026-10-02-dv-toolbelt/spec.md
**Basis:** a3df0ea

## Global Constraints
- Die Skill-Texte sind deutsch. Die Trigger-Wörter in den Beschreibungen sind deutsch und englisch.
- Alle Skripte des Plugins laufen mit Node.js und brauchen keine weitere Laufzeit.
- Jedes Skript des Plugins hat Tests.
- Kein Skill, Skript oder Hook des Plugins setzt voraus, dass ein anderes Plugin oder ein anderer Skill installiert ist. In allen Dateien von `plugins/toolbelt` außer `plugins/toolbelt/README.md` kommen die Namen `superpowers`, `skill-creator`, `grill-me`, `dv-forge` und `forge-config` nicht vor.
- `writing-skills` ist mit eigenen Worten und eigener Gliederung geschrieben; der Test-zuerst-Gedanke steht im Skill selbst. Es gibt keine Kopie des Best-Practices-Dokuments, keine Graphviz-Regeln, kein Render-Skript und kein CLAUDE.md-Testbeispiel.
- Der Validator ist ein Node-Skript, das einen Skill-Ordner prüft und sein Ergebnis über Exit-Code und Meldung zeigt. Fehler: Name (nur Kleinbuchstaben, Ziffern und Bindestriche, höchstens 64 Zeichen), Länge der Beschreibung (höchstens 1024 Zeichen), Pflichtfelder, mehrere `SKILL.md`. Warnung: unbekannte Schlüssel und `<` `>` in der Beschreibung.
- Die Beschreibung eines Skills nennt nur den Auslöser; das gilt vor jeder „pushy“-Empfehlung.
- Das Referenzdokument zum Auslöse-Test beschreibt das Konzept; ein Skript dafür gehört nicht zu v1. Der Benchmark mit Viewer ist nicht Teil von v1.
- Die README nennt `superpowers:writing-skills` und `skill-creator` als Inspiration, ein Satz je Quelle.
- Tests laufen mit `node --test`, aus `<R>` (Checkout-Wurzel). Testnamen folgen dem Bestand `Methode_Situation_Erwartung`, Testkörper dem Muster Arrange, Act, Assert.
- Shell ist Git Bash. Commit-Messages sind englisch im Stil der Historie: `<typ>(<scope>): <beschreibung>`, Scope `toolbelt`.
- `claude-md-audit` enthält keine Annahme über einen Memory-Pfad, über Git-Ignore der CLAUDE.md oder über einen Plugin-Abschnitt in der CLAUDE.md. Ob und wie gesichert wird, entscheidet der Mensch.
- Für die Retrospektive gibt es in v1 keine Migration alter Berichte aus dem bisherigen Datenordner.
- `dv-forge` erhält weder einen Hinweis auf den Umzug noch einen Versionssprung.
- Das Plugin startet mit der Version 0.1.0.

## Abdeckung über die drei Pläne

Nach „W · Aufteilung“ verteilen sich die ACs der Spec auf drei Pläne. Die AC-Abdeckung gilt für die Vereinigung der drei Pläne; Plan 3 setzt nur die ACs um, die hier bei Plan 3 stehen.

| AC | Plan | Tasks dort |
|---|---|---|
| AC-01 | Plan 1 (`plan-1-geruest-und-retro.md`) | Task 1 |
| AC-02 | Plan 1 | Task 1 |
| AC-03 | Plan 3 | Task 4 |
| AC-04 | Plan 1, Plan 3 | Plan 1: Task 2, Task 3, Task 7; Plan 3: Task 4 |
| AC-05 | Plan 1, Plan 3 | Plan 1: Task 7; Plan 3: Task 4 |
| AC-06 | Plan 3 | Task 4 |
| AC-07 | Plan 2 (`plan-2-claude-md-audit.md`) | Task 4 |
| AC-08 | Plan 2 | Task 4 |
| AC-09 | Plan 2 | Task 4 |
| AC-10 | Plan 2 | Task 1 |
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
| AC-27 bis AC-33 | Plan 3 | Task 1 |
| AC-34 | Plan 1 | Task 7 |
| AC-35 | Plan 1 | Task 2, Task 5 |
| AC-36 | Plan 1 | Task 3, Task 5 |
| AC-37 | Plan 1 | Task 4, Task 5, Task 7 |
| AC-38 | Plan 1 | Task 8 |
| AC-39 | Plan 1 | Task 6, Task 8 |
| AC-40 | Plan 1, Plan 2, Plan 3 | Plan 1: Task 7; Plan 2: Task 1; Plan 3: Task 1 |
| AC-41 | Plan 1, Plan 2, Plan 3 | Plan 1: Task 5; Plan 2: Task 4; Plan 3: Task 3, Task 4 |

## Dateistruktur

In `plugins/toolbelt`:
- `scripts/lib/validate-skill.js` — Bausteine: Kopf lesen, Skill-Ordner prüfen, Bericht bauen.
- `scripts/validate-skill.js` — Aufruf: `node validate-skill.js <skill-ordner>`.
- `tests/validate-skill.test.js` — Tests für Bausteine und Skript.
- `skills/writing-skills/references/trigger-eval.md`, `testing-with-subagents.md`, `persuasion-principles.md` — die drei Referenzdateien.
- `tests/writing-skills-references.test.js` — Tests für die Referenzdateien.
- `skills/writing-skills/SKILL.md` — der Skill.
- `tests/writing-skills-skill.test.js` — Tests für den Skill-Text.
- `README.md` — komplett neu mit allen drei Skills und der Herkunft.
- `tests/toolbelt-skills.test.js` — Schluss-Test über alle drei Skills und die README.

---

### Task 1: Validator für den Skill-Kopf

**ACs:** AC-27, AC-28, AC-29, AC-30, AC-31, AC-32, AC-33, AC-40

**Dateien:**
- Create: `plugins/toolbelt/scripts/lib/validate-skill.js`
- Create: `plugins/toolbelt/scripts/validate-skill.js`
- Test: `plugins/toolbelt/tests/validate-skill.test.js`

**Interfaces:**
- Consumes: keine
- Produces: aus `lib/validate-skill.js`: `parseFrontmatter(text: string): object | null` (Kopf zwischen den `---`-Zeilen als Schlüssel-Wert-Objekt; `null` ohne Kopf; unterstützt einzeilige Werte, Anführungszeichen, `>` und `|` samt Fortsetzungszeilen; ein BOM am Anfang wird ignoriert, ein leerer Kopf ergibt `{}`; Fortsetzungszeilen müssen wie in gültigem YAML eingerückt sein, sonst zählt eine Zeile `foo: bar` als eigener Schlüssel), `validateSkill(folder: string): { errors: string[], warnings: string[], name: string | null }`, `reportLines(result): string[]`. Aus `validate-skill.js`: `main(argv: string[]): number`. Ausgabe: je Fehler `FEHLER <text>`, je Warnung `WARNUNG <text>`, zuletzt `Skill gültig: <name>` (Exit 0) oder `Skill ungültig: <n> Fehler` (Exit 1); falscher Aufruf endet mit Exit 2.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/validate-skill.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { parseFrontmatter, validateSkill } = require('../scripts/lib/validate-skill');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'validate-skill.js');

  function skillMd({ name = 'my-skill', description = 'Use when testing', extra = '' } = {}) {
    const nameLine = name === null ? '' : `name: ${name}\n`;
    const descriptionLine = description === null ? '' : `description: ${description}\n`;
    return `---\n${nameLine}${descriptionLine}${extra}---\n\n# Titel\n`;
  }

  // Der Ordner liegt in einem eigenen Elternordner, damit sein Name genau der gewünschte ist.
  function makeSkill(folderName, { text, extraFiles = {} }) {
    const folder = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-skill-')), folderName);
    fs.mkdirSync(folder, { recursive: true });
    if (text !== undefined) fs.writeFileSync(path.join(folder, 'SKILL.md'), text);
    for (const [name, content] of Object.entries(extraFiles)) {
      const file = path.join(folder, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    return folder;
  }

  function validate(folder) {
    return spawnSync(process.execPath, [SCRIPT, folder], { encoding: 'utf8' });
  }

  test('parseFrontmatter_PlainAndQuotedValues_ReadAsStrings', () => {
    const fields = parseFrontmatter('---\nname: a\ndescription: "Use when: x"\n---\nText\n');

    assert.deepEqual(fields, { name: 'a', description: 'Use when: x' });
  });

  test('parseFrontmatter_FoldedBlock_JoinsLinesWithSpaces', () => {
    const fields = parseFrontmatter('---\nname: a\ndescription: >\n  Zeile eins\n  Zeile zwei\nallowed-tools: x\n---\n');

    assert.deepEqual(fields, { name: 'a', description: 'Zeile eins Zeile zwei', 'allowed-tools': 'x' });
  });

  test('parseFrontmatter_LiteralBlock_KeepsLineBreaks', () => {
    assert.equal(parseFrontmatter('---\ndescription: |\n  eins\n  zwei\n---\n').description, 'eins\nzwei');
  });

  test('parseFrontmatter_WindowsLineEndings_Parsed', () => {
    assert.deepEqual(parseFrontmatter('---\r\nname: a\r\n---\r\nText\r\n'), { name: 'a' });
  });

  test('parseFrontmatter_NoFrontmatter_Null', () => {
    assert.equal(parseFrontmatter('kein Kopf\n'), null);
  });

  test('parseFrontmatter_Utf8Bom_Parsed', () => {
    assert.deepEqual(parseFrontmatter('﻿---\nname: a\n---\n'), { name: 'a' });
  });

  test('parseFrontmatter_EmptyHead_EmptyObject', () => {
    assert.deepEqual(parseFrontmatter('---\n---\n'), {});
  });

  test('validateSkill_ValidHead_NoErrorsNoWarnings', () => {
    const folder = makeSkill('my-skill', { text: skillMd({ extra: 'disable-model-invocation: true\nallowed-tools: Bash(node x *)\n' }) });

    assert.deepEqual(validateSkill(folder), { errors: [], warnings: [], name: 'my-skill' });
  });

  test('cli_ValidSkill_ExitZeroAndReportsValid', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd() }));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'Skill gültig: my-skill\n');
  });

  test('cli_NameWithUppercaseAndUnderscore_ExitOneNamesNameAndRule', () => {
    const result = validate(makeSkill('My_Skill', { text: skillMd({ name: 'My_Skill' }) }));

    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes('FEHLER Name "My_Skill" erlaubt nur Kleinbuchstaben, Ziffern und Bindestriche'), result.stdout);
    assert.ok(result.stdout.includes('Skill ungültig: 1 Fehler'));
  });

  test('cli_NameOf65Characters_ExitOneNamesLength', () => {
    const result = validate(makeSkill('lang', { text: skillMd({ name: 'a'.repeat(65) }) }));

    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes('FEHLER Name ist 65 Zeichen lang, erlaubt sind höchstens 64'), result.stdout);
  });

  test('cli_DescriptionOf1025Characters_ExitOneNamesLength', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'x'.repeat(1025) }) }));

    assert.equal(result.status, 1);
    assert.ok(result.stdout.includes('FEHLER Beschreibung ist 1025 Zeichen lang, erlaubt sind höchstens 1024'), result.stdout);
  });

  test('cli_DescriptionOf1024Characters_ExitZero', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'x'.repeat(1024) }) }));

    assert.equal(result.status, 0, result.stdout);
  });

  test('cli_NoSkillMd_ExitOneNamesMissingFile', () => {
    const result = validate(makeSkill('my-skill', {}));

    assert.equal(result.status, 1);
    assert.match(result.stdout, /FEHLER SKILL\.md fehlt in /);
  });

  test('cli_NoHeadAtAll_ExitOneNamesMissingHead', () => {
    const result = validate(makeSkill('my-skill', { text: '# Nur Text\n' }));

    assert.equal(result.status, 1);
    assert.match(result.stdout, /FEHLER Kopf fehlt: SKILL\.md beginnt nicht mit einem Kopf zwischen --- Zeilen/);
  });

  test('cli_MissingNameOrDescription_ExitOneNamesTheMissingField', () => {
    const withoutName = validate(makeSkill('my-skill', { text: skillMd({ name: null }) }));
    const withoutDescription = validate(makeSkill('my-skill', { text: skillMd({ description: null }) }));

    assert.equal(withoutName.status, 1);
    assert.match(withoutName.stdout, /FEHLER Pflichtfeld name fehlt/);
    assert.equal(withoutDescription.status, 1);
    assert.match(withoutDescription.stdout, /FEHLER Pflichtfeld description fehlt/);
  });

  test('cli_SecondSkillMdInSubfolder_ExitOneNamesTheExtraFile', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd(), extraFiles: { 'unter/SKILL.md': 'x' } }));

    assert.equal(result.status, 1);
    assert.match(result.stdout, /FEHLER Zusätzliche SKILL\.md: unter[\\/]SKILL\.md/);
  });

  test('cli_SkillMdInsideNodeModules_Ignored', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd(), extraFiles: { 'node_modules/x/SKILL.md': 'x' } }));

    assert.equal(result.status, 0, result.stdout);
  });

  test('cli_UnknownKey_WarningNamesKeyAndExitZero', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd({ extra: 'foo: bar\n' }) }));

    assert.equal(result.status, 0, result.stdout);
    assert.ok(result.stdout.includes('WARNUNG Unbekannter Schlüssel im Kopf: foo'), result.stdout);
    assert.ok(result.stdout.includes('Skill gültig: my-skill'));
  });

  test('cli_AngleBracketInDescription_WarningAndExitZero', () => {
    const result = validate(makeSkill('my-skill', { text: skillMd({ description: 'Use when a < b' }) }));

    assert.equal(result.status, 0, result.stdout);
    assert.ok(result.stdout.includes('WARNUNG Beschreibung enthält < oder >'), result.stdout);
  });

  test('cli_NoArgument_UsageAndExitTwo', () => {
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /Aufruf: node validate-skill\.js <skill-ordner>/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/validate-skill.test.js` — erwartet: FAIL mit `Cannot find module '../scripts/lib/validate-skill'`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/scripts/lib/validate-skill.js`:
  ```js
  'use strict';

  // Prüft den Kopf einer SKILL.md: Fehler für Name, Beschreibung, Pflichtfelder und mehrere SKILL.md, Warnungen für Unbekanntes.

  const fs = require('node:fs');
  const path = require('node:path');

  const NAME_PATTERN = /^[a-z0-9-]+$/;
  const NAME_MAX = 64;
  const DESCRIPTION_MAX = 1024;
  // Nur eine Warnung, deshalb muss die Liste nicht vollständig sein.
  const KNOWN_KEYS = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools', 'argument-hint', 'disable-model-invocation', 'user-invocable', 'model', 'context', 'agent', 'hooks']);
  const SKIPPED_FOLDERS = new Set(['node_modules', '.git']);

  function unquote(value) {
    const quote = value[0];
    return value.length >= 2 && (quote === '"' || quote === "'") && value.at(-1) === quote ? value.slice(1, -1) : value;
  }

  // Liest den Kopf zwischen den `---`-Zeilen: einfache Schlüssel, einzeilige und mehrzeilige Werte (`>`, `|`, Fortsetzungszeilen).
  function parseFrontmatter(text) {
    const match = /^---\r?\n(?:([\s\S]*?)\r?\n)?---(?:\r?\n|$)/.exec(text.replace(/^﻿/, ''));
    if (!match) return null;
    const entries = [];
    for (const line of (match[1] ?? '').split(/\r?\n/)) {
      const key = /^([A-Za-z0-9_-]+):(?:\s+(.*))?\s*$/.exec(line);
      if (key) entries.push({ key: key[1], head: (key[2] ?? '').trim(), rest: [] });
      else if (entries.length > 0) entries.at(-1).rest.push(line.trim());
    }
    const fields = {};
    for (const { key, head, rest } of entries) {
      const block = /^[>|][+-]?$/.test(head);
      const parts = [...(block ? [] : [head]), ...rest].filter((part) => part !== '');
      fields[key] = block && head.startsWith('|') ? parts.join('\n') : unquote(parts.join(' '));
    }
    return fields;
  }

  function skillFiles(folder, current = folder) {
    return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : skillFiles(folder, full);
      return entry.name === 'SKILL.md' ? [path.relative(folder, full)] : [];
    });
  }

  function checkName(fields, errors) {
    const name = fields.name;
    if (name === undefined || name === '') {
      errors.push('Pflichtfeld name fehlt');
      return;
    }
    if (!NAME_PATTERN.test(name)) errors.push(`Name "${name}" erlaubt nur Kleinbuchstaben, Ziffern und Bindestriche`);
    if (name.length > NAME_MAX) errors.push(`Name ist ${name.length} Zeichen lang, erlaubt sind höchstens ${NAME_MAX}`);
  }

  function checkDescription(fields, errors, warnings) {
    const description = fields.description;
    if (description === undefined || description === '') {
      errors.push('Pflichtfeld description fehlt');
      return;
    }
    if (description.length > DESCRIPTION_MAX) errors.push(`Beschreibung ist ${description.length} Zeichen lang, erlaubt sind höchstens ${DESCRIPTION_MAX}`);
    if (/[<>]/.test(description)) warnings.push('Beschreibung enthält < oder >');
  }

  function validateSkill(folder) {
    const errors = [];
    const warnings = [];
    const skillFile = path.join(folder, 'SKILL.md');
    if (!fs.existsSync(skillFile)) return { errors: [`SKILL.md fehlt in ${folder}`], warnings, name: null };
    for (const extra of skillFiles(folder).filter((file) => file !== 'SKILL.md')) errors.push(`Zusätzliche SKILL.md: ${extra}`);
    const fields = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
    if (fields === null) {
      errors.push('Kopf fehlt: SKILL.md beginnt nicht mit einem Kopf zwischen --- Zeilen');
      return { errors, warnings, name: null };
    }
    checkName(fields, errors);
    checkDescription(fields, errors, warnings);
    for (const key of Object.keys(fields).filter((candidate) => !KNOWN_KEYS.has(candidate))) warnings.push(`Unbekannter Schlüssel im Kopf: ${key}`);
    return { errors, warnings, name: fields.name ?? null };
  }

  function reportLines({ errors, warnings, name }) {
    return [
      ...errors.map((text) => `FEHLER ${text}`),
      ...warnings.map((text) => `WARNUNG ${text}`),
      errors.length === 0 ? `Skill gültig: ${name}` : `Skill ungültig: ${errors.length} Fehler`,
    ];
  }

  module.exports = { parseFrontmatter, validateSkill, reportLines };
  ```
  Neue Datei `plugins/toolbelt/scripts/validate-skill.js`:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Prüft den Kopf eines Skill-Ordners; Fehler beenden den Aufruf mit Exit 1, Warnungen nicht.

  const { validateSkill, reportLines } = require('./lib/validate-skill');

  const USAGE = 'Aufruf: node validate-skill.js <skill-ordner>\n';

  function main(argv) {
    if (argv.length !== 1) {
      process.stderr.write(USAGE);
      return 2;
    }
    const result = validateSkill(argv[0]);
    process.stdout.write(`${reportLines(result).join('\n')}\n`);
    return result.errors.length === 0 ? 0 : 1;
  }

  if (require.main === module) process.exit(main(process.argv.slice(2)));

  module.exports = { main };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/validate-skill.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/scripts plugins/toolbelt/tests/validate-skill.test.js` · `git commit -m "feat(toolbelt): add the validate-skill script for the skill head"`

---

### Task 2: Referenzdateien von `writing-skills`

**ACs:** AC-24, AC-26

**Dateien:**
- Create: `plugins/toolbelt/skills/writing-skills/references/trigger-eval.md`
- Create: `plugins/toolbelt/skills/writing-skills/references/testing-with-subagents.md`
- Create: `plugins/toolbelt/skills/writing-skills/references/persuasion-principles.md`
- Test: `plugins/toolbelt/tests/writing-skills-references.test.js`

**Interfaces:**
- Consumes: `isMostlyGerman(text: string): boolean` aus `plugins/toolbelt/tests/lib/german.js`, `readText(file: string): string` aus `plugins/toolbelt/tests/lib/markdown.js`.
- Produces: die drei Dateien unter `skills/writing-skills/references/`, auf die `SKILL.md` in Task 3 verweist.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/writing-skills-references.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readText } = require('./lib/markdown');
  const { isMostlyGerman } = require('./lib/german');

  const REFERENCES = path.join(__dirname, '..', 'skills', 'writing-skills', 'references');

  function reference(name) {
    return readText(path.join(REFERENCES, name));
  }

  test('triggerEval_Concept_TwentyQueriesHalfAndHalfNearMissesTrainAndTestSet', () => {
    const text = reference('trigger-eval.md');

    assert.ok(text.includes('etwa 20 Testanfragen'));
    assert.ok(text.includes('„soll auslösen“'));
    assert.ok(text.includes('„soll nicht auslösen“'));
    assert.ok(text.includes('knappe Fehlgriffe'));
    assert.ok(text.includes('Trainingsmenge'));
    assert.ok(text.includes('Testmenge'));
    assert.ok(isMostlyGerman(text));
  });

  test('testingWithSubagents_Method_BaselineWithoutSkillPressureAndControlGroup', () => {
    const text = reference('testing-with-subagents.md');

    assert.ok(text.includes('## Ablauf'));
    assert.ok(text.includes('**Ohne Skill.**'));
    assert.ok(text.includes('| Zeit |'));
    assert.ok(text.includes('Kontrollgruppe'));
    assert.ok(text.includes('Mindestens fünf Läufe'));
    assert.ok(isMostlyGerman(text));
  });

  test('persuasionPrinciples_Guide_PrinciplesMixPerSkillTypeAndLoopholes', () => {
    const text = reference('persuasion-principles.md');

    assert.ok(text.includes('| Autorität |'));
    assert.ok(text.includes('| Selbstverpflichtung |'));
    assert.ok(text.includes('## Welche Mischung für welche Skill-Art'));
    assert.ok(text.includes('Tabelle der Ausreden'));
    assert.ok(text.includes('Liste der Warnzeichen'));
    assert.ok(isMostlyGerman(text));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/writing-skills-references.test.js` — erwartet: FAIL `triggerEval_Concept_TwentyQueriesHalfAndHalfNearMissesTrainAndTestSet` mit `ENOENT … trigger-eval.md`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/skills/writing-skills/references/trigger-eval.md`:
  ````markdown
  # Auslöse-Test für die Beschreibung

  Die Beschreibung entscheidet, ob ein Agent den Skill überhaupt lädt. Teste sie deshalb mit Anfragen, wie echte Anwender sie schreiben.

  ## Anfragen sammeln

  Schreibe etwa 20 Testanfragen, je zur Hälfte „soll auslösen“ und „soll nicht auslösen“:

  ```json
  [
    { "query": "die Anfrage im Wortlaut", "should_trigger": true },
    { "query": "eine Anfrage, bei der der Skill nicht gebraucht wird", "should_trigger": false }
  ]
  ```

  **Soll auslösen (8 bis 10).** Verschiedene Formulierungen derselben Absicht, förmlich und umgangssprachlich. Dazu Anfragen, die den Skill nicht beim Namen nennen, ihn aber klar brauchen. Seltene Anwendungsfälle gehören dazu, ebenso Fälle, in denen der Skill mit einem anderen konkurriert und gewinnen soll.

  **Soll nicht auslösen (8 bis 10).** Die wertvollsten Negativfälle sind knappe Fehlgriffe: Anfragen, die Wörter oder Begriffe des Skills teilen, aber etwas anderes brauchen. Nahe Themen und mehrdeutige Formulierungen, bei denen ein reiner Stichwortabgleich fälschlich auslösen würde. Offensichtlich Unpassendes prüft nichts, etwa „Schreibe eine Fibonacci-Funktion“ für einen PDF-Skill.

  Jede Anfrage ist konkret: Dateinamen, Spaltennamen, ein Stück Hintergrund, auch Tippfehler und Kürzel. Anfragen aus einem einzigen Schritt („lies Datei X“) lösen Skills ohnehin selten aus, weil der Agent sie allein erledigt. Nimm Aufgaben, bei denen ein Skill wirklich hilft.

  ## Aufteilen

  Teile die Anfragen in eine Trainingsmenge (etwa 60 Prozent) und eine Testmenge (etwa 40 Prozent). Mit der Trainingsmenge verbesserst du die Beschreibung, mit der Testmenge prüfst du, ob die Verbesserung auch bei ungesehenen Anfragen wirkt. Beide Mengen enthalten Auslöser und Fehlgriffe.

  ## Messen

  1. Stelle jede Anfrage in einer frischen Sitzung, in der der Skill mit seiner Beschreibung gelistet ist, und notiere, ob er geladen wird.
  2. Stelle jede Anfrage dreimal, denn einzelne Läufe schwanken. Die Auslöse-Rate ist der Anteil der Läufe, die den Skill laden.
  3. Bei „soll auslösen“ erwartest du eine hohe, bei „soll nicht auslösen“ eine niedrige Rate.

  ## Verbessern

  1. Sieh dir die Anfragen an, bei denen die Rate falsch liegt, und formuliere die Beschreibung um: fehlende Auslöser ergänzen, Wörter streichen, die zu Fehlgriffen führen.
  2. Miss Trainings- und Testmenge neu.
  3. Höchstens fünf Runden. Wähle die Fassung mit der besten Rate auf der Testmenge, nicht auf der Trainingsmenge; sonst passt die Beschreibung nur auf die geübten Anfragen.

  Auch beim Verbessern nennt die Beschreibung nur den Auslöser, nie den Ablauf.
  ````
  Neue Datei `plugins/toolbelt/skills/writing-skills/references/testing-with-subagents.md`:
  ```markdown
  # Skills mit Subagents testen

  Ein Skill wird getestet, indem frische Subagents Szenarien bearbeiten: erst ohne den Skill, dann mit ihm. Der Unterschied ist der Beleg.

  ## Ein Szenario bauen

  - Die Aufgabe klingt wie eine echte, mit konkreten Dateien, Zahlen und einem Ziel.
  - Sie verleitet zu genau dem Fehler, den der Skill verhindern soll.
  - Der Agent muss handeln, nicht nur antworten: „Was tust du?“ statt „Was wäre richtig?“.
  - Der Agent wählt unter A, B und C und begründet die Wahl; so siehst du die Ausrede.

  ## Druck erhöhen

  Ein Skill, der eine Regel durchsetzt, wird erst unter Druck geprüft. Kombiniere mindestens drei Arten:

  | Druck | Beispiel im Szenario |
  |---|---|
  | Zeit | „Das Release geht in 20 Minuten raus.“ |
  | Bereits investierte Arbeit | „Du arbeitest seit drei Stunden an dieser Lösung.“ |
  | Autorität | „Die Teamleiterin sagt, das reicht.“ |
  | Erschöpfung | „Es ist der letzte Punkt einer langen Liste.“ |

  ## Ablauf

  1. **Ohne Skill.** Ein frischer Subagent bearbeitet das Szenario ohne den Skill. Halte wörtlich fest, was er tut und mit welchen Sätzen er es rechtfertigt. Das ist deine Fehlschlag-Liste.
  2. **Skill schreiben,** der genau diese Rechtfertigungen entkräftet.
  3. **Mit Skill.** Ein frischer Subagent bearbeitet denselben Auftrag, der Skill liegt in seinem Kontext. Er sollte jetzt regelkonform handeln.
  4. **Lücken schließen.** Findet er einen neuen Weg um die Regel herum, trägst du die neue Ausrede in den Skill ein und wiederholst Schritt 3.
  5. **Fertig,** wenn mehrere Läufe unter höchstem Druck dasselbe Ergebnis zeigen.

  ## Nach Skill-Art testen

  | Art | Testen mit | Erfolg heißt |
  |---|---|---|
  | Disziplin (Regeln) | Verständnisfragen, Druck-Szenarien, mehrere Drücke zugleich | Die Regel hält auch unter höchstem Druck |
  | Technik (Anleitung) | Anwendung auf neue Fälle, Varianten, Randfälle, Lücken in der Anleitung | Die Technik gelingt bei einem neuen Fall |
  | Muster (Denkmodell) | Erkennen, wann es passt, Anwenden, Gegenbeispiele | Der Agent erkennt auch, wann es nicht passt |
  | Referenz (Nachschlagewerk) | Suchen, Anwenden des Gefundenen, übliche Fälle ohne Treffer | Der Agent findet die Stelle und nutzt sie richtig |

  ## Wortlaut vorab prüfen

  Voll ausgebaute Szenarien sind teuer. Prüfe einzelne Formulierungen vorher mit kleinen Läufen:

  1. Jeder Lauf bekommt einen frischen Kontext mit dem realistischen Umfeld des Skills.
  2. Immer eine Kontrollgruppe ohne die fragliche Anweisung. Zeigt sie den Fehler nicht, gibt es nichts zu beheben.
  3. Mindestens fünf Läufe je Variante; einzelne Läufe täuschen.
  4. Lies jeden gemeldeten Treffer von Hand: Zitate und Gegenbeispiele im Text sehen aus wie Treffer.
  5. Streuung ist ein Messwert. Landen alle Läufe bei derselben Form, wirkt der Wortlaut; fünf verschiedene Deutungen heißen, dass er nicht bindet.

  ## Nach dem Lauf

  Frage den Agenten, wie der Skill klarer hätte sein können. Seine Antwort zeigt Lücken, die du beim Lesen nicht siehst.
  ```
  Neue Datei `plugins/toolbelt/skills/writing-skills/references/persuasion-principles.md`:
  ```markdown
  # Überzeugungsprinzipien für Skills

  Ein Agent folgt einer Anleitung nicht nur, weil sie richtig ist. Wie sie formuliert ist, entscheidet mit, ob er sie unter Druck befolgt. Setze die Prinzipien gezielt und passend zur Skill-Art ein.

  ## Die Prinzipien

  | Prinzip | So wirkt es im Skill | Beispiel |
  |---|---|---|
  | Autorität | Eine klare Anweisung ohne Verhandlungsspielraum | „Erst der Test. Ohne Ausnahme.“ |
  | Selbstverpflichtung | Der Agent legt sich vorab fest | „Kündige an, welchen Skill du nutzt“; eine Checkliste mit einem Eintrag je Schritt |
  | Knappheit | Ein Zeitpunkt, vor dem etwas geschehen muss | „Vor dem ersten Edit, nicht danach.“ |
  | Soziale Bewährung | Hinweis auf das, was immer so geschieht oder schiefgeht | „Wer das überspringt, bereut es jedes Mal.“ |
  | Zugehörigkeit | Ein gemeinsames Ziel statt eines Befehls | „Wir halten die CLAUDE.md kurz.“ |

  Vermeide Schmeichelei („Du bist ein so guter Helfer“) und Gegenleistung. Sie machen Agenten gefällig statt zuverlässig.

  ## Welche Mischung für welche Skill-Art

  | Skill-Art | Nutzen | Meiden |
  |---|---|---|
  | Disziplin (Regeln durchsetzen) | Autorität, Selbstverpflichtung, soziale Bewährung, Knappheit | Zugehörigkeit allein, Schmeichelei |
  | Technik (Anleitung) | Autorität in Maßen, Selbstverpflichtung bei kritischen Schritten | zu viel Druck, der Variation verhindert |
  | Muster (Denkmodell) | Soziale Bewährung, Zugehörigkeit | Autorität, die jede Ausnahme verbietet |
  | Referenz | Nur Klarheit | alle Überzeugungsmittel |

  ## Disziplin-Skills gegen Ausreden härten

  1. **Schlupflöcher einzeln schließen.** „Lösche den Code“ reicht nicht. Nenne die Umwege: „Behalte ihn nicht als Vorlage. Passe ihn nicht an. Sieh ihn dir nicht an.“
  2. **Buchstabe gleich Geist.** Ein Satz am Anfang: „Die Regel dem Buchstaben nach zu verletzen heißt, sie dem Geist nach zu verletzen.“ Er nimmt die Ausrede „ich folge dem Sinn“ vorweg.
  3. **Tabelle der Ausreden.** Jede Ausrede aus dem Beobachtungslauf kommt mit ihrer Antwort hinein.
  4. **Liste der Warnzeichen.** Sätze, an denen der Agent selbst merkt, dass er gerade ausweicht, mit der Folge: „Alle diese Sätze heißen: von vorn beginnen.“
  5. **Die Beschreibung nennt Symptome des drohenden Verstoßes,** also die Situation unmittelbar vor dem Fehler, nicht den Ablauf des Skills.

  Das gilt nur für Disziplinfehler. Hat die Ausgabe die falsche Form oder fehlt ein Teil, hilft ein Verbot oft nicht; dann gelten die Formen aus dem Abschnitt „Passende Form je Fehlerart“ in `writing-skills`.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/writing-skills-references.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/skills/writing-skills plugins/toolbelt/tests/writing-skills-references.test.js` · `git commit -m "feat(toolbelt): add the reference documents of the writing-skills skill"`

---

### Task 3: Der Skill `writing-skills`

**ACs:** AC-21, AC-22, AC-23, AC-25, AC-26, AC-41

**Dateien:**
- Create: `plugins/toolbelt/skills/writing-skills/SKILL.md`
- Test: `plugins/toolbelt/tests/writing-skills-skill.test.js`

**Interfaces:**
- Consumes: `readMarkdown(file): { fields, body }` aus `tests/lib/markdown.js`, `isMostlyGerman(text)` aus `tests/lib/german.js`; die drei Referenzdateien aus Task 2; das Skript `validate-skill.js` aus Task 1.
- Produces: Skill `writing-skills`, der genau die drei Referenzdateien nennt und den Validator mit `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" <skill-ordner>` aufruft.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/writing-skills-skill.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { readMarkdown } = require('./lib/markdown');
  const { isMostlyGerman } = require('./lib/german');

  const SKILL_DIR = path.join(__dirname, '..', 'skills', 'writing-skills');
  const VALIDATOR = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js"';

  function skill() {
    return readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));
  }

  test('writingSkills_Frontmatter_NameDescriptionAndValidatorAllowed', () => {
    const { fields } = skill();

    assert.deepEqual(Object.keys(fields), ['name', 'description', 'allowed-tools']);
    assert.equal(fields.name, 'writing-skills');
    assert.match(fields.description, /^Use when /);
    assert.doesNotMatch(fields.description, /[<>]|: /);
    for (const shell of ['Bash', 'PowerShell']) assert.ok(fields['allowed-tools'].includes(`${shell}(${VALIDATOR} *)`), shell);
  });

  test('writingSkills_Description_GermanAndEnglishTriggerWords', () => {
    const { fields } = skill();

    assert.match(fields.description, /Skill schreiben/);
    assert.match(fields.description, /write a skill/);
  });

  test('writingSkills_Body_IsGerman', () => {
    assert.ok(isMostlyGerman(skill().body));
  });

  test('writingSkills_Body_ProcessIsObserveWriteCheckCloseGaps', () => {
    const { body } = skill();

    const positions = ['**Beobachten (rot).**', '**Schreiben (grün).**', '**Prüfen.**', '**Lücken schließen.**'].map((step) => body.indexOf(step));
    assert.ok(positions.every((position) => position > -1), JSON.stringify(positions));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  });

  test('writingSkills_Body_ExplainsTestFirstItself', () => {
    const { body } = skill();

    assert.ok(body.includes('## Erst der Test'));
    assert.ok(body.includes('Ein Skill ohne beobachteten Fehlschlag ist eine Vermutung'));
  });

  test('writingSkills_Body_DescriptionNamesOnlyTheTrigger', () => {
    const { body } = skill();

    assert.ok(body.includes('### Die Beschreibung nennt nur den Auslöser'));
    assert.ok(body.includes('Sie fasst den Ablauf nicht zusammen'));
  });

  test('writingSkills_Body_HelperScriptAndSnapshotHints', () => {
    const { body } = skill();

    assert.ok(body.includes('als Snapshot'));
    assert.ok(body.includes('dasselbe Hilfsskript neu'));
  });

  test('writingSkills_Body_CallsTheValidatorWithTheSkillFolder', () => {
    assert.ok(skill().body.includes(`${VALIDATOR} <skill-ordner>`));
  });

  test('writingSkills_Folder_OnlySkillAndTheThreeOwnReferences', () => {
    const files = fs.readdirSync(SKILL_DIR, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(SKILL_DIR, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
      .sort();

    assert.deepEqual(files, ['SKILL.md', 'references/persuasion-principles.md', 'references/testing-with-subagents.md', 'references/trigger-eval.md']);
  });

  test('writingSkills_Body_NamesExactlyTheThreeReferences', () => {
    const named = [...new Set(skill().body.match(/references\/[\w.-]+\.md/g))].sort();

    assert.deepEqual(named, ['references/persuasion-principles.md', 'references/testing-with-subagents.md', 'references/trigger-eval.md']);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/writing-skills-skill.test.js` — erwartet: FAIL `writingSkills_Frontmatter_NameDescriptionAndValidatorAllowed` mit `ENOENT … SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/skills/writing-skills/SKILL.md`:
  ```markdown
  ---
  name: writing-skills
  description: Use when a new skill is to be created, an existing skill changed, or a skill checked before it is rolled out. Auslöser sind Skill schreiben, Skill erstellen, Skill ändern, Skill testen, Skill prüfen, SKILL.md validieren sowie write a skill, edit a skill und validate a skill.
  allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" *)
  ---

  # Skills schreiben

  Ein Skill ist eine Anleitung für einen Agenten. Du schreibst ihn so, wie du Code schreibst: erst der Test, dann das Minimum, dann die Politur.

  ## Erst der Test

  Ob eine Anleitung wirkt, weißt du erst, wenn du einen Agenten ohne sie hast scheitern sehen. Der Test eines Skills ist deshalb ein Szenario, das ein Subagent bearbeitet. „Fehlschlag“ heißt: Er macht genau den Fehler, den der Skill verhindern soll. Ein Skill ohne beobachteten Fehlschlag ist eine Vermutung, und Vermutungen sind Ballast im Kontext.

  ## Wann ein Skill sich lohnt

  - Die Technik war dir nicht von selbst klar.
  - Du brauchst sie in mehreren Projekten wieder.
  - Sie gilt breit, nicht nur für ein Projekt.

  Kein Skill ist richtig für Einmal-Lösungen, für Standardwissen, das anderswo gut dokumentiert ist, und für Regeln eines einzelnen Projekts; die gehören in dessen CLAUDE.md. Was sich mechanisch prüfen lässt, gehört in ein Skript; der Skill hält nur Urteile.

  ## Ablauf

  1. **Beobachten (rot).** Lass das Szenario ohne Skill laufen und halte wörtlich fest, was der Agent tut und womit er es begründet. Wie du Szenarien baust, steht in `references/testing-with-subagents.md`.
  2. **Schreiben (grün).** Schreibe nur, was diese Fehlschläge behebt. Keine Vorsorge für Fälle, die du nicht beobachtet hast.
  3. **Prüfen.** Lass dieselben Szenarien mit dem Skill laufen. Befolgt der Agent ihn jetzt?
  4. **Lücken schließen.** Fällt dem Agenten eine neue Ausrede ein, trägst du sie ein und wiederholst Schritt 3, bis nichts Neues kommt.

  Eine kleine Ergänzung ist keine Ausnahme: Auch jede Änderung an einem bestehenden Skill läuft durch diesen Ablauf. Vor dem Ändern kopierst du den Skill-Ordner als Snapshot und lässt die Szenarien gegen Snapshot und neue Fassung laufen; der Snapshot ist dein Vergleich. Schreiben alle Testläufe dasselbe Hilfsskript neu, nimmst du es in den Skill auf und rufst es dort auf.

  ## Aufbau einer SKILL.md

  Der Kopf braucht `name` (Kleinbuchstaben, Ziffern, Bindestriche, höchstens 64 Zeichen) und `description` (höchstens 1024 Zeichen). Der Rumpf nennt den Kerngedanken, den Ablauf, eine Kurzreferenz und typische Fehler.

  ### Die Beschreibung nennt nur den Auslöser

  Sie beginnt mit „Use when“ und beschreibt Situationen und Symptome. Sie fasst den Ablauf nicht zusammen. Der Grund: Steht der Ablauf in der Beschreibung, folgt der Agent der Kurzfassung und liest den Skill nicht.

  - Schlecht: „Use when executing plans, dispatches a subagent per task with a review in between“
  - Gut: „Use when executing implementation plans with independent tasks in the current session“

  Schreibe in der dritten Person, nutze Stichwörter, die ein Agent wirklich sucht (Fehlermeldungen, Symptome, Synonyme), und nenne Auslöser auf Deutsch und Englisch. In einer einzeiligen Beschreibung bricht ein Doppelpunkt mit folgendem Leerzeichen das YAML; schreibe stattdessen „sind“ oder „sowie“.

  ## Auffindbar und schlank

  - Der Name sagt, was der Skill tut, zuerst die Tätigkeit: `writing-skills`, nicht `skill-guide`.
  - Häufig geladene Skills bleiben kurz, als Richtwert unter 500 Wörter im Rumpf, ständig geladene noch kürzer.
  - Ausführliches wandert nach `references/`; im Rumpf steht der Dateiname und wann man ihn liest. Kein Zwangsladen per `@`-Pfad.
  - Ein gutes Beispiel schlägt viele mittelmäßige. Ein Flussdiagramm gibt es nur, wenn eine Entscheidung nicht offensichtlich ist.
  - Skripte rufst du im Text über ihren Interpreter auf, zum Beispiel `node scripts/werkzeug.js`, nie über den bloßen Pfad.

  ## Passende Form je Fehlerart

  | Beobachteter Fehler | Passende Form |
  |---|---|
  | Agent umgeht eine Regel unter Druck | Verbot mit Tabelle der Ausreden und Liste der Warnzeichen, siehe `references/persuasion-principles.md` |
  | Agent folgt dem Skill, die Ausgabe hat die falsche Form | Positive Vorgabe: die Teile der Ausgabe in ihrer Reihenfolge nennen |
  | Agent lässt einen Pflichtteil weg | Pflichtfeld in der Vorlage |
  | Verhalten hängt von einer Bedingung ab | Bedingung an einem beobachtbaren Merkmal |

  Hänge keinen Einschränkungs-Nebensatz an („außer wenn es wichtig ist“); er öffnet die Verhandlung. Eine echte Ausnahme bekommt eine eigene Bedingung.

  ## Prüfen vor dem Ausrollen

  1. Kopf validieren: `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-skill.js" <skill-ordner>`. Fehler beenden den Aufruf mit Exit-Code ungleich 0 (Name, Länge, Pflichtfelder, mehrere `SKILL.md`), Warnungen nicht (unbekannte Schlüssel, `<` oder `>` in der Beschreibung).
  2. Beschreibung auf Treffsicherheit testen: `references/trigger-eval.md`.
  3. Erst dann committen.

  ## Typische Fehler

  | Fehler | Richtig |
  |---|---|
  | Skill schreiben und danach testen | Erst das Szenario ohne Skill beobachten |
  | Beschreibung erzählt den Ablauf | Nur den Auslöser nennen |
  | Mehrere Skills am Stück ohne Test | Jeden Skill einzeln bis grün |
  | Beispiele in fünf Sprachen | Ein vollständiges, echtes Beispiel |
  | Erzählung „so haben wir es einmal gelöst“ | Wiederverwendbare Technik |
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/writing-skills-skill.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt/skills/writing-skills/SKILL.md plugins/toolbelt/tests/writing-skills-skill.test.js` · `git commit -m "feat(toolbelt): add the writing-skills skill"`

---

### Task 4: README und Schluss-Test über alle drei Skills

**ACs:** AC-03, AC-06, AC-41, AC-04, AC-05

**Dateien:**
- Modify: `plugins/toolbelt/README.md` · `# dv-toolbelt`
- Test: `plugins/toolbelt/tests/toolbelt-skills.test.js`

Voraussetzung: Plan 1 Task 1 hat `plugins/toolbelt/README.md` mit der Überschrift `# dv-toolbelt` angelegt, Plan 2 Task 4 die Tabelle unter `## Skills` um `claude-md-audit` erweitert; Plan 3 ersetzt den Inhalt ab dieser Überschrift vollständig.

**Interfaces:**
- Consumes: `validateSkill(folder)` aus `plugins/toolbelt/scripts/lib/validate-skill.js`, `readMarkdown(file)` aus `tests/lib/markdown.js`, `readText(file)` aus `tests/lib/markdown.js`, `isMostlyGerman(text)` aus `tests/lib/german.js`.
- Produces: die fertige README; ein Test, der alle drei Skills gemeinsam absichert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/toolbelt-skills.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { readMarkdown, readText } = require('./lib/markdown');
  const { isMostlyGerman } = require('./lib/german');
  const { validateSkill } = require('../scripts/lib/validate-skill');

  const PLUGIN_ROOT = path.join(__dirname, '..');
  const SKILLS_DIR = path.join(PLUGIN_ROOT, 'skills');
  const SKILL_NAMES = ['claude-md-audit', 'prozess-retrospektive', 'writing-skills'];
  // Die Quellen entstehen aus Teilen, damit diese Datei sie nicht selbst enthält: Für alle Dateien außer der README gilt der Wächter-Test aus Plan 1.
  const INSPIRATION_SOURCES = ['super' + 'powers:writing-skills', 'skill-' + 'creator'];

  test('plugin_Skills_ExactlyTheThreeNamedOnes', () => {
    assert.deepEqual(fs.readdirSync(SKILLS_DIR).sort(), SKILL_NAMES);
  });

  test('plugin_EverySkill_PassesTheValidatorWithoutErrorsOrWarnings', () => {
    for (const name of SKILL_NAMES) {
      const result = validateSkill(path.join(SKILLS_DIR, name));

      assert.deepEqual(result.errors, [], name);
      assert.deepEqual(result.warnings, [], name);
      assert.equal(result.name, name);
    }
  });

  test('plugin_EverySkill_GermanTextAndGermanPlusEnglishTriggerWords', () => {
    for (const name of SKILL_NAMES) {
      const { fields, body } = readMarkdown(path.join(SKILLS_DIR, name, 'SKILL.md'));

      assert.ok(isMostlyGerman(body), `${name}: Text nicht deutsch`);
      assert.match(fields.description, /^Use when /, name);
      assert.match(fields.description, /Auslöser/, name);
    }
  });

  test('readme_Content_NamesThreeSkillsAndBothInspirationSources', () => {
    const text = readText(path.join(PLUGIN_ROOT, 'README.md'));

    for (const name of SKILL_NAMES) assert.ok(text.includes(`\`${name}\``), name);
    for (const source of INSPIRATION_SOURCES) assert.ok(text.includes(`\`writing-skills\` ist inhaltlich von \`${source}\` inspiriert.`), source);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/toolbelt-skills.test.js` — erwartet: FAIL `readme_Content_NamesThreeSkillsAndBothInspirationSources` (die ersten drei Tests sind nach den Tasks 1 bis 3 schon grün)
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/toolbelt/README.md` bekommt diesen vollständigen Inhalt:
  ```markdown
  # dv-toolbelt

  Werkzeug-Skills für jedes Projekt. Sie laufen allein, ohne dass ein weiteres Plugin installiert sein muss.

  ## Skills

  | Skill | Wofür |
  |---|---|
  | `claude-md-audit` | CLAUDE.md prüfen, kürzen und erweitern, mit Backup und Hash-Prüfung geschützter Blöcke |
  | `writing-skills` | Skills schreiben, testen und validieren, mit Validator für den Skill-Kopf |
  | `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |

  ## Voraussetzungen

  Node.js. Die Skripte der Skills brauchen keine weitere Laufzeit.

  ## Einrichten

  Installieren mit `/plugin install dv-toolbelt@dv-ai-development`.

  ## Herkunft

  `writing-skills` ist inhaltlich von `superpowers:writing-skills` inspiriert.

  `writing-skills` ist inhaltlich von `skill-creator` inspiriert.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/toolbelt-skills.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Gesamtlauf mit den Wächtern aus Plan 1**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`, darunter PASS `plugin_AllFilesButReadme_NameNoForeignPluginOrSkill` und PASS `scripts_EveryScript_HasItsTestFile`
- [ ] **Schritt 6: Commit**
  `git add plugins/toolbelt` · `git commit -m "docs(toolbelt): complete the README with all three skills and their origin"`

---

## Entscheidungen
- **W · Aufteilung** · Aussage — Drei Pläne: Gerüst und Retro-Umzug, `claude-md-audit`, `writing-skills`.
- **W · Planungs-Skills** · Aussage — Keine Planungs-Skills für diese Pläne.
- **E · Reihenfolge der Pläne** · Planer — Plan 3 läuft nach Plan 1 und Plan 2, weil der Schluss-Test genau drei Skills erwartet und die README beide Zeilen der vorigen Pläne ablöst.
- **E · Kopf-Leser** · Planer — Der Validator liest den Kopf mit einem eigenen kleinen Leser (einfache Schlüssel, Anführungszeichen, `>` und `|` mit Fortsetzungszeilen), damit das Plugin allein mit Node läuft und kein YAML-Paket braucht.
- **E · Bekannte Schlüssel** · Planer — Unbekannte Schlüssel sind nur eine Warnung; die Liste bekannter Schlüssel (`name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools`, `argument-hint`, `disable-model-invocation`, `user-invocable`, `model`, `context`, `agent`, `hooks`) muss deshalb nicht vollständig sein.
- **E · Name** · Planer — Geprüft wird das Feld `name` im Kopf, nicht der Ordnername; die Tests nennen den Ordner im Fehlerfall ebenfalls `My_Skill`, damit beide Lesarten von AC-28 abgedeckt sind.
- **E · Zusätzliche SKILL.md** · Planer — `node_modules` und `.git` werden bei der Suche nach weiteren `SKILL.md` übersprungen.
- **E · Eigene Formulierung** · Planer — Der Skill folgt in der Aussage dem Vorbild (Test zuerst, Beschreibung nur als Auslöser, Form passend zur Fehlerart, Disziplin-Skills härten, Testen nach Skill-Art), ist aber neu gegliedert und neu formuliert; Zitate und Studienverweise des Vorbilds sind nicht übernommen.
- **E · Auslöse-Test als Konzept** · Planer — `trigger-eval.md` beschreibt das Vorgehen ohne ein Skript; der Messlauf braucht ein Kommandozeilen-Werkzeug der Plattform und gehört in eine spätere Version.
- **R1 · AC-01** — geändert — Neuer Abschnitt `## Abdeckung über die drei Pläne` ordnet alle ACs der Spec einem Plan zu; AC-01 gehört nach „W · Aufteilung“ zu Plan 1, Task 1. Die Tasks von Plan 3 bleiben unverändert.
- **R1 · AC-10** — geändert — In der Abdeckungstabelle Plan 2, Task 1 zugeordnet.
- **R1 · AC-11** — geändert — In der Abdeckungstabelle Plan 2, Task 1 zugeordnet.
- **R1 · AC-12** — geändert — In der Abdeckungstabelle Plan 2, Task 1 und Task 4 zugeordnet.
- **R1 · AC-13** — geändert — In der Abdeckungstabelle Plan 2, Task 2 und Task 4 zugeordnet.
- **R1 · AC-14** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-15** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-16** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-17** — geändert — In der Abdeckungstabelle Plan 2, Task 3 (Hash-Vergleich) und Task 4 zugeordnet.
- **R1 · AC-18** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-19** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-02** — geändert — In der Abdeckungstabelle Plan 1, Task 1 zugeordnet; die Version 0.1.0 steht zusätzlich unter `## Global Constraints`.
- **R1 · AC-20** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet; die Soll-Vorgabe zu Memory-Pfad, Git-Ignore und Plugin-Abschnitt steht zusätzlich unter `## Global Constraints`.
- **R1 · AC-34** — geändert — In der Abdeckungstabelle Plan 1, Task 7 zugeordnet.
- **R1 · AC-35** — geändert — In der Abdeckungstabelle Plan 1, Task 2 und Task 5 zugeordnet.
- **R1 · AC-36** — geändert — In der Abdeckungstabelle Plan 1, Task 3 und Task 5 zugeordnet.
- **R1 · AC-37** — geändert — In der Abdeckungstabelle Plan 1, Task 4 und Task 5 zugeordnet.
- **R1 · AC-38** — geändert — In der Abdeckungstabelle Plan 1, Task 8 zugeordnet.
- **R1 · AC-39** — geändert — In der Abdeckungstabelle Plan 1, Task 6 und Task 8 zugeordnet.
- **R1 · AC-07** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-08** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · AC-09** — geändert — In der Abdeckungstabelle Plan 2, Task 4 zugeordnet.
- **R1 · Global Constraints** — geändert — Die vier fehlenden Soll-Vorgaben der Spec (keine Annahme über Memory-Pfad, Git-Ignore oder Plugin-Abschnitt in `claude-md-audit`; keine Retro-Migration in v1; kein Umzugshinweis und kein Versionssprung in `dv-forge`; Startversion 0.1.0) stehen wörtlich wie in Plan 2 unter `## Global Constraints`.
- **R1 · Task 4** — geändert — Die Dateizeile heißt `Modify: plugins/toolbelt/README.md · # dv-toolbelt`; der Anker ist die Überschrift aus Plan 1 Task 1. Ein Satz unter **Dateien:** nennt die Voraussetzung (Plan 1 legt die Datei an, Plan 2 erweitert die Tabelle) und dass Plan 3 den Inhalt vollständig ersetzt.
- **R2 · AC-01** — nicht geändert — AC-01 steht in Plan 1 Task 1 unter `**ACs:**` (`plan-1-geruest-und-retro.md`), die Abdeckungstabelle nennt das. Nach „W · Aufteilung“ gilt die AC-Abdeckung für die Vereinigung der drei Pläne; die Skript-Prüfung sieht nur Plan 3. Ein Task in Plan 3 würde die W-Entscheidung verletzen.
- **R2 · AC-10** — nicht geändert — Steht in Plan 2 Task 1 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-11** — nicht geändert — Steht in Plan 2 Task 1 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-12** — nicht geändert — Steht in Plan 2 Task 1 und Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-13** — nicht geändert — Steht in Plan 2 Task 2 und Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-14** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-15** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-16** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-17** — nicht geändert — Steht in Plan 2 Task 3 und Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-18** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-19** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-02** — nicht geändert — Steht in Plan 1 Task 1 unter `**ACs:**`; Abdeckungstabelle stimmt, Version 0.1.0 zusätzlich unter `## Global Constraints`. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-20** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-34** — nicht geändert — Steht in Plan 1 Task 7 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-35** — nicht geändert — Steht in Plan 1 Task 2 und Task 5 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-36** — nicht geändert — Steht in Plan 1 Task 3 und Task 5 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-37** — geändert — Die Abdeckungstabelle nennt jetzt Plan 1 Task 4, Task 5 und Task 7; Plan 1 Task 7 führt AC-37 ebenfalls unter `**ACs:**`, die Angabe fehlte. Kein Task in Plan 3, Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-38** — nicht geändert — Steht in Plan 1 Task 8 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-39** — nicht geändert — Steht in Plan 1 Task 6 und Task 8 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-07** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-08** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · AC-09** — nicht geändert — Steht in Plan 2 Task 4 unter `**ACs:**`; Abdeckungstabelle stimmt. Skript-Grenze wie bei R2 · AC-01.
- **R2 · Task 4** — nicht geändert — Die Datei entsteht erst in Plan 1 Task 1 (`Create: plugins/toolbelt/README.md` mit der Überschrift `# dv-toolbelt`) und wird in Plan 2 Task 4 erweitert; Plan 3 läuft danach („E · Reihenfolge der Pläne“). Die Anker-Prüfung sieht nur die Basis `a3df0ea`, auf der `plugins/toolbelt` fehlt. Ein `Create` würde den Stand aus Plan 1 und Plan 2 überschreiben; die Voraussetzung steht bereits unter **Dateien:**.
