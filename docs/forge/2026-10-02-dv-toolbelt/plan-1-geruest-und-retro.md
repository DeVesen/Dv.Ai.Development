# dv-toolbelt, Plan 1: Gerüst und Retro-Umzug — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-10-02-dv-toolbelt/plan-1-geruest-und-retro.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Das Plugin `dv-toolbelt` entsteht im Marketplace-Repo, und der Skill `prozess-retrospektive` zieht mit allen Skripten, Referenzen und Tests von `dv-forge` dorthin um, entkoppelt von `forge-config`.
**Architektur:** Erst wird die Retro an Ort und Stelle in `dv-forge` entkoppelt (Tasks 2–5, jeder Task bleibt grün), dann zieht sie wörtlich um (Task 6), dann sichern zwei Wächter-Tests Autonomie und Testabdeckung (Task 7), zuletzt räumt Task 8 `dv-forge` auf. Skripte liegen wie in `dv-forge` unter `plugins/toolbelt/scripts` und `scripts/lib`, Tests unter `plugins/toolbelt/tests`. Der Plan 2 (`claude-md-audit`) und der Plan 3 (`writing-skills`) bauen auf diesem Gerüst auf.
**Tech-Stack:** Node.js (`node:test`, `node:assert`), Markdown-Skills, Git.
**Spec:** docs/forge/2026-10-02-dv-toolbelt/spec.md
**Basis:** a3df0ea

## Global Constraints
- Die Skill-Texte sind deutsch. Die Trigger-Wörter in den Beschreibungen sind deutsch und englisch.
- Alle Skripte des Plugins laufen mit Node.js und brauchen keine weitere Laufzeit.
- Jedes Skript des Plugins hat Tests.
- `claude-md-audit` enthält keine Annahme über einen Memory-Pfad, über Git-Ignore der CLAUDE.md oder über einen Plugin-Abschnitt in der CLAUDE.md. Ob und wie gesichert wird, entscheidet der Mensch.
- Der Validator ist ein Node-Skript, das einen Skill-Ordner prüft und sein Ergebnis über Exit-Code und Meldung zeigt.
- Kein Skill, Skript oder Hook des Plugins setzt voraus, dass ein anderes Plugin oder ein anderer Skill installiert ist. In allen Dateien von `plugins/toolbelt` außer `plugins/toolbelt/README.md` kommen die Namen `superpowers`, `skill-creator`, `grill-me`, `dv-forge` und `forge-config` nicht vor.
- Das Plugin startet mit der Version 0.1.0.
- Für die Retrospektive gibt es in v1 keine Migration alter Berichte aus dem bisherigen Datenordner.
- `dv-forge` erhält weder einen Hinweis auf den Umzug noch einen Versionssprung: `plugins/forge/.claude-plugin/plugin.json` bleibt unverändert.
- Der Benchmark mit Viewer aus `skill-creator` ist nicht Teil von v1 und wird nicht gebaut.
- Tests laufen mit `node --test`, aus `<R>` (Checkout-Wurzel). Testnamen folgen dem Bestand `Methode_Situation_Erwartung`, Testkörper dem Muster Arrange, Act, Assert.
- Shell ist Git Bash (`sed`, `cp`, `mkdir`, `git mv` stehen zur Verfügung). Commit-Messages sind englisch im Stil der Historie: `<typ>(<scope>): <beschreibung>`, Scope `toolbelt` oder `forge`.
- Bestehende Dateien in `plugins/forge` haben Windows-Zeilenenden (CRLF). Mehrzeilige Ersetzungen passt du an die vorhandenen Zeilenenden an und änderst die Zeilenenden einer Datei nicht.

## Dateistruktur

Neu in `plugins/toolbelt` (alles aus dem Umzug, außer wo „neu“ steht):
- `.claude-plugin/plugin.json` — neu: Name, Version, Beschreibung.
- `README.md` — neu: Überblick über das Plugin.
- `tests/plugin.test.js` — neu: Marketplace-Eintrag und Version.
- `tests/plugin-autonomy.test.js` — neu: Wächter für die Namen anderer Plugins.
- `tests/scripts-have-tests.test.js` — neu: Wächter für Skript-Tests.
- `tests/retro-standalone.test.js` — neu: Fakten ohne Projekt-Einstellungen.
- `skills/prozess-retrospektive/` — Skill und `references/report-format.md`.
- `scripts/session-facts.js`, `retro-report.js`, `retro-timeline.js`, `retro-sort.js`, `mcp-usage.js` — Retro-Skripte.
- `scripts/lib/` — `retro-*.js`, `session-files.js`, `regexp.js`, dazu eine Kopie von `transcript.js`.
- `tests/` — die Tests dazu und `tests/lib/` mit Hilfen (`retro-session.js`, `markdown.js`, `git-repo.js` als Kopien, `retro-draft-fixture.js` umgezogen).

Geändert in `plugins/forge`: die Retro-Dateien verschwinden (Umzug), `README.md`, `skills/init/SKILL.md`, `scripts/forge-config.js` und zwei Tests verlieren die Retro-Zeilen, `tests/transcript.test.js` verliert die drei CLI-Tests. Außerdem ändern `.claude-plugin/marketplace.json`, `README.md` und `plugins/README.md` im Repo-Root.

---

### Task 1: Plugin-Gerüst und Marketplace-Eintrag

**ACs:** AC-01, AC-02

**Dateien:**
- Create: `plugins/toolbelt/.claude-plugin/plugin.json`
- Create: `plugins/toolbelt/README.md`
- Modify: `.claude-plugin/marketplace.json` · `"name": "dv-kickoff"`
- Modify: `README.md` · `Projektstart (`dv-kickoff`)`
- Modify: `plugins/README.md` · `| [`dv-kickoff`](kickoff/README.md)`
- Test: `plugins/toolbelt/tests/plugin.test.js`

**Interfaces:**
- Consumes: keine
- Produces: Plugin-Ordner `plugins/toolbelt`, Marketplace-Name `dv-toolbelt`, Version `0.1.0`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/plugin.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');

  const PLUGIN_ROOT = path.join(__dirname, '..');
  const REPO_ROOT = path.join(PLUGIN_ROOT, '..', '..');

  function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  test('marketplace_Catalog_ListsDvToolbeltWithItsFolder', () => {
    const catalog = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));

    const entry = catalog.plugins.find((plugin) => plugin.name === 'dv-toolbelt');

    assert.ok(entry, 'Eintrag dv-toolbelt fehlt im Katalog');
    assert.equal(entry.source, './plugins/toolbelt');
  });

  test('pluginJson_Metadata_NameAndVersion', () => {
    const meta = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));

    assert.equal(meta.name, 'dv-toolbelt');
    assert.equal(meta.version, '0.1.0');
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/plugin.test.js` — erwartet: FAIL `marketplace_Catalog_ListsDvToolbeltWithItsFolder` und FAIL `pluginJson_Metadata_NameAndVersion`
- [ ] **Schritt 3: Minimal implementieren**
  Neue Datei `plugins/toolbelt/.claude-plugin/plugin.json`:
  ```json
  {
    "name": "dv-toolbelt",
    "version": "0.1.0",
    "description": "Werkzeug-Skills: CLAUDE.md prüfen, Skills schreiben und validieren, Prozess-Retrospektive"
  }
  ```
  Neue Datei `plugins/toolbelt/README.md`:
  ```markdown
  # dv-toolbelt

  Werkzeug-Skills für jedes Projekt. Sie laufen allein, ohne dass ein weiteres Plugin installiert sein muss.

  ## Skills

  | Skill | Wofür |
  |---|---|
  | `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |

  ## Voraussetzungen

  Node.js. Die Skripte der Skills brauchen keine weitere Laufzeit.

  ## Einrichten

  Installieren mit `/plugin install dv-toolbelt@dv-ai-development`.
  ```
  In `.claude-plugin/marketplace.json` ersetzt du den Block
  ```json
      {
        "name": "dv-kickoff",
        "source": "./plugins/kickoff"
      },
  ```
  durch
  ```json
      {
        "name": "dv-kickoff",
        "source": "./plugins/kickoff"
      },
      {
        "name": "dv-toolbelt",
        "source": "./plugins/toolbelt"
      },
  ```
  In `README.md` (Repo-Root) ersetzt du in der Verzeichnis-Tabelle die Zeichenfolge ``Projektstart (`dv-kickoff`) |`` durch ``Projektstart (`dv-kickoff`), Werkzeuge (`dv-toolbelt`) |`` und fügst in der Tabelle „Plugins im Überblick“ nach der Zeile
  ```markdown
  | [`dv-kickoff`](plugins/kickoff/README.md) | Projekt-Kickoff: Brief, Architekturentwurf, Orientierung für Agenten |
  ```
  diese Zeile ein:
  ```markdown
  | [`dv-toolbelt`](plugins/toolbelt/README.md) | Werkzeug-Skills: CLAUDE.md prüfen, Skills schreiben und validieren, Prozess-Retrospektive |
  ```
  In `plugins/README.md` fügst du nach der Zeile
  ```markdown
  | [`dv-kickoff`](kickoff/README.md) | 0.2.0 | Projekt-Kickoff: Brief, Architekturentwurf, Orientierung für Agenten |
  ```
  diese Zeile ein:
  ```markdown
  | [`dv-toolbelt`](toolbelt/README.md) | 0.1.0 | Werkzeug-Skills: CLAUDE.md prüfen, Skills schreiben und validieren, Prozess-Retrospektive |
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/plugin.test.js` — erwartet: PASS `marketplace_Catalog_ListsDvToolbeltWithItsFolder`, PASS `pluginJson_Metadata_NameAndVersion`
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt .claude-plugin/marketplace.json README.md plugins/README.md` · `git commit -m "feat(toolbelt): scaffold the dv-toolbelt plugin and register it in the marketplace"`

---

### Task 2: Fakten-Erhebung ohne Projekt-Einstellungen

**ACs:** AC-35, AC-04

**Dateien:**
- Modify: `plugins/forge/scripts/session-facts.js` · `configuredExpect`, `run`, `projectOf`
- Test: `plugins/forge/tests/session-facts.test.js` · `cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag`, `cli_ProjectWithoutExpectedList_NoExpectedUnusedRow`, `cli_ForeignProtocol_ExpectationFromProtocolProject`

**Interfaces:**
- Consumes: bestehend `makeRepo`, `commitFile` aus `plugins/forge/tests/lib/git-repo.js`, `session()` und `SCRIPT` aus der Testdatei.
- Produces: `session-facts.js` liest die erwarteten MCP-Server nur noch aus der Option `--expect <server,...>`; es gibt keine Abhängigkeit mehr auf `forge-config.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/session-facts.test.js` entfernst du die drei Tests `cli_ProjectListsExpectedMcp_UnusedMarkedWithoutFlag`, `cli_ProjectWithoutExpectedList_NoExpectedUnusedRow` und `cli_ForeignProtocol_ExpectationFromProtocolProject` (jeweils vom `test(`-Aufruf bis zur schließenden `});`). An ihrer Stelle fügst du ein:
  ```js
  // Der Abschnittsname entsteht aus Teilen: Der Test beweist, dass auch ein Abschnitt dieses Namens nicht gelesen wird.
  const PROJECT_SECTION = `## ${['dv', 'forge'].join('-')}`;

  test('cli_ProjectSettingsListExpectedMcp_IgnoredWithoutFlag', () => {
    const repo = makeRepo();
    commitFile(repo, 'CLAUDE.md', `# Projekt\n\n${PROJECT_SECTION}\n\n- MCP-Erwartet: dev-mcp, codebase-analyzer\n`, 'config');

    const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: repo });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /erwartet, ungenutzt/);
  });

  test('cli_NoExpectFlag_NoExpectedUnusedRow', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--file', session()], { encoding: 'utf8', cwd: os.tmpdir() });

    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /erwartet, ungenutzt/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: FAIL `cli_ProjectSettingsListExpectedMcp_IgnoredWithoutFlag`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/session-facts.js`:
  1. Entferne die Zeile
     ```js
     const { readConfig } = require('./forge-config.js');
     ```
  2. Entferne die Funktion samt Kommentar
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

     ```
  3. In `run` ersetze die Zeile
     ```js
       const expect = [...new Set([...(options.expect ?? []), ...configuredExpect(cwd)])];
     ```
     durch
     ```js
       const expect = [...new Set(options.expect ?? [])];
     ```
  4. Im Kommentar über `projectOf` ersetze `damit Erwartung, Branch und Projekt-Dateien aus dem Projekt` durch `damit Branch und Projekt-Dateien aus dem Projekt`.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-facts.test.js` — erwartet: PASS, `fail 0`, darunter PASS `cli_Expect_AppendsMeasuredMcpUsage`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/session-facts.js plugins/forge/tests/session-facts.test.js` · `git commit -m "refactor(forge): read the expected MCP servers of the retrospective only from the call"`

---

### Task 3: Kurzfassung ohne Workitem-Kandidat

**ACs:** AC-36, AC-04

**Dateien:**
- Modify: `plugins/forge/scripts/lib/retro-summary.js` · `workitemCandidate` (Voll-Ersatz der Datei, die Funktion entfällt)
- Test: `plugins/forge/tests/retro-summary.test.js` · `const { makeRepo, commitFile } = require('./lib/git-repo');`, `workitemCandidate_SpecWithWorkitem_TakesSpecFirst`, `workitemCandidate_NoSpecButBranchMatchesPattern_TakesBranch`, `workitemCandidate_NeitherSpecNorPattern_None`
- Test: `plugins/forge/tests/retro-report.test.js` · `cli_ValidDraft_WritesDatedReportAndDeletesDraft`

**Interfaces:**
- Consumes: `summaryLines({ file, cwd, text, snapshot })` und `findingSummary(text)` bleiben unverändert.
- Produces: `retro-summary.js` exportiert `{ findingSummary, retroCost, summaryLines }`; die Kurzfassung enthält keine Zeile `Workitem-Kandidat` mehr und liest kein `forge-config`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/retro-report.test.js`, Test `cli_ValidDraft_WritesDatedReportAndDeletesDraft`, ersetze die Zeile
  ```js
    assert.match(result.stdout, /Workitem-Kandidat: keiner\n/);
  ```
  durch
  ```js
    assert.doesNotMatch(result.stdout, /Workitem/);
  ```
  In `plugins/forge/tests/retro-summary.test.js` ersetzt du die Importzeile
  ```js
  const { findingSummary, retroCost, workitemCandidate, summaryLines } = require('../scripts/lib/retro-summary');
  ```
  durch
  ```js
  const { findingSummary, retroCost, summaryLines } = require('../scripts/lib/retro-summary');
  ```
  und die Importzeile
  ```js
  const { makeRepo, commitFile } = require('./lib/git-repo');
  ```
  durch
  ```js
  const { makeRepo } = require('./lib/git-repo');
  ```
  (`commitFile` nutzen nur die drei entfallenden Tests, `makeRepo` braucht der neue Test; die übrigen Importzeilen bleiben unverändert), entfernst die drei Tests `workitemCandidate_SpecWithWorkitem_TakesSpecFirst`, `workitemCandidate_NoSpecButBranchMatchesPattern_TakesBranch` und `workitemCandidate_NeitherSpecNorPattern_None` und hängst ans Dateiende an:
  ```js
  test('summaryLines_SessionWithSpecAndBranch_NamesNoWorkitemCandidate', () => {
    const repo = makeRepo();
    const own = writeSession([request('r1', '10:01', [], usage(1000, 0, 0, 100))]);
    const snapshot = { ...SNAPSHOT, transcript: own, ownTranscript: own, transcriptEntries: 0, specs: ['docs/spec.md'], branch: 'feature/AB#77-x' };

    const lines = summaryLines({ file: path.join(repo, 'docs', 'wishes', 'x.md'), cwd: repo, text: VALID, snapshot });

    assert.equal(lines.some((line) => /Workitem/.test(line)), false);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js` — erwartet: FAIL `summaryLines_SessionWithSpecAndBranch_NamesNoWorkitemCandidate` und FAIL `cli_ValidDraft_WritesDatedReportAndDeletesDraft`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/scripts/lib/retro-summary.js` bekommt diesen vollständigen Inhalt:
  ```js
  'use strict';

  // Kurzfassung nach dem Bericht: Befunde, Kosten der Retrospektive und Befehl zum Vormerken.

  const fs = require('node:fs');
  const path = require('node:path');
  const { readEntries, tokensOf } = require('./transcript');
  const { requestsOf } = require('./retro-requests');
  const { thousands } = require('./retro-format');
  const { parseDraft, findingsOf } = require('./retro-draft');

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
      `Vormerken: git add "${path.relative(cwd, file).split(path.sep).join('/')}"`,
    ];
  }

  module.exports = { findingSummary, retroCost, summaryLines };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-summary.js plugins/forge/tests/retro-summary.test.js plugins/forge/tests/retro-report.test.js` · `git commit -m "refactor(forge): drop the workitem candidate from the retrospective summary"`

---

### Task 4: Datenordner `~/.dv-toolbelt/retro`

**ACs:** AC-37

**Dateien:**
- Modify: `plugins/forge/scripts/lib/retro-files.js` · `retroDir`
- Test: `plugins/forge/tests/retro-report.test.js` · `setup`
- Test: `plugins/forge/tests/session-facts.test.js` · Aufrufe von `path.join(home, '.dv-forge', 'retro', …)`

**Interfaces:**
- Consumes: `retroDir()` bleibt die einzige Stelle, die den Ordner bestimmt.
- Produces: `retroDir()` liefert `<home>/.dv-toolbelt/retro`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Die Tests nennen den Ordner bereits an mehreren Stellen. Ändere sie auf den neuen Namen:
  ```bash
  sed -i "s/'\.dv-forge'/'.dv-toolbelt'/g" plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-facts.test.js
  ```
  Danach darf in beiden Dateien `'.dv-forge'` nicht mehr vorkommen.
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-facts.test.js` — erwartet: FAIL, unter anderem `cli_ValidDraft_WritesDatedReportAndDeletesDraft`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/retro-files.js` ersetze in `retroDir` die Zeile
  ```js
    return path.join(os.homedir(), '.dv-forge', 'retro');
  ```
  durch
  ```js
    return path.join(os.homedir(), '.dv-toolbelt', 'retro');
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-facts.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/retro-files.js plugins/forge/tests/retro-report.test.js plugins/forge/tests/session-facts.test.js` · `git commit -m "refactor(forge): keep the retrospective data in ~/.dv-toolbelt/retro"`

---

### Task 5: Skill-Text ohne Bezug zu `dv-forge`

**ACs:** AC-36, AC-35, AC-37, AC-41

**Dateien:**
- Modify: `plugins/forge/skills/prozess-retrospektive/SKILL.md` · `name: prozess-retrospektive` (Voll-Ersatz der Datei in Schritt 3)
- Test: `plugins/forge/tests/prozess-retrospektive.test.js` · `prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts`, `prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking`, `prozessRetrospektive_Body_CommitRuleWithWorkitemCandidate`, `prozessRetrospektive_Body_ArgumentsRerunFactsAndSortForWishlist`, `readme_Retrospective_NamesNewCallAndNoNaturalLanguageTrigger`

**Interfaces:**
- Consumes: Skripte `session-facts.js`, `retro-report.js`, `retro-timeline.js`, `retro-sort.js` mit ihren bestehenden Optionen, darunter `--expect <server,...>` von `session-facts.js`.
- Produces: Skill `prozess-retrospektive` mit Aufruf `/dv-toolbelt:prozess-retrospektive`, Datenordner `~/.dv-toolbelt/retro`, Commit erst nach Abfrage von Commit-Konvention und Workitem-Kennung.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/prozess-retrospektive.test.js`:
  1. Entferne die Konstante `README` und den Test `readme_Retrospective_NamesNewCallAndNoNaturalLanguageTrigger` (er ist schon vor dieser Änderung rot, weil der README-Abschnitt nicht mehr existiert).
  2. Ersetze im Test `prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts` die Zeile `assert.match(fields.description, /^Use when the human types \/dv-forge:prozess-retrospektive/);` durch
     ```js
       assert.match(fields.description, /^Use when the human types \/dv-toolbelt:prozess-retrospektive/);
       assert.match(fields.description, /Erfahrungsbericht/);
       assert.match(fields.description, /session retrospective/);
     ```
  3. Ersetze im Test `prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking` den Wert `'Edit(~/.dv-forge/retro/*)'` durch `'Edit(~/.dv-toolbelt/retro/*)'`.
  4. Ersetze den Test `prozessRetrospektive_Body_CommitRuleWithWorkitemCandidate` durch
     ```js
     test('prozessRetrospektive_Body_CommitOnlyAfterAskingConventionAndWorkitem', () => {
       const { body } = readMarkdown(SKILL);

       assert.match(body, /Nicht committen, erst fragen/);
       assert.ok(body.includes('Commit-Konvention und Workitem-Kennung'));
       assert.doesNotMatch(body, new RegExp([['forge', 'config'].join('-'), 'Workitem-Kandidaten'].join('|')));
     });
     ```
  5. Füge im Test `prozessRetrospektive_Body_ArgumentsRerunFactsAndSortForWishlist` am Ende der Funktion die Zeile ein:
     ```js
       assert.ok(body.includes('--expect <server,...>'));
     ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/prozess-retrospektive.test.js` — erwartet: FAIL `prozessRetrospektive_Frontmatter_ManualOnlyWithAllowedScripts`, FAIL `prozessRetrospektive_AllowedTools_DraftFolderWritableWithoutAsking`, FAIL `prozessRetrospektive_Body_CommitOnlyAfterAskingConventionAndWorkitem`, FAIL `prozessRetrospektive_Body_ArgumentsRerunFactsAndSortForWishlist`
- [ ] **Schritt 3: Minimal implementieren**
  `plugins/forge/skills/prozess-retrospektive/SKILL.md` bekommt diesen vollständigen Inhalt:
  ```markdown
  ---
  name: prozess-retrospektive
  description: Use when the human types /dv-toolbelt:prozess-retrospektive to turn how a session went into an experience report with improvements for plugins, skills, hooks, scripts, MCP servers, CLAUDE.md and the way of working. Auslöser sind die Wörter Prozess-Retrospektive, Erfahrungsbericht, Sitzungsrückblick, session retrospective und lessons learned.
  disable-model-invocation: true
  allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" *) PowerShell(node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js" *) Edit(~/.dv-toolbelt/retro/*)
  ---

  # Prozess-Retrospektive

  Du deckst Lücken der Session auf, in allem, was mitlief: Plugins, Skills, Hooks, Skripte, MCP-Server, `CLAUDE.md` und die Arbeitsweise selbst. Zwei Richtungen: **Wo hakte es?** und **Was kostete mehr als nötig?** Wiederkehrende oder unnötige Läufe sind ein Befund, wiederkehrende Handarbeit ein Kandidat für etwas Neues. Jeder Befund ist so geschrieben, dass ihn jemand ohne jede Kenntnis des Projekts versteht.

  ## Fakten dieser Session

  !`node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot --lenient`

  ## Berichtsformat (aus `references/report-format.md`)

  !`node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --format`

  ## Ablauf
  1. **Fakten prüfen.** Alle Zahlen oben stammen aus dem Skript; du schreibst keine ab und schätzt keine. Steht dort „Fakten nicht verfügbar“, nennst du den Grund und hörst auf. Steht unter `ARGUMENTS` eine andere Protokolldatei (`--file <pfad>`), ein Ausschnitt (`--since-command <befehl>`) oder eine Liste erwarteter MCP-Server (`--expect <server,...>`), holst du die Fakten einmal neu: `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-facts.js" --session ${CLAUDE_SESSION_ID} --before-retro --snapshot <Argumente>`. Stammt die Datei aus einem anderen Projekt, hängst du `--cwd <projektordner>` an.
  2. **Nachlesen.** Stellen, auf die die Fakten zeigen, liest du über die Zeitleiste nach, nie per Textsuche im Protokoll: `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-timeline.js" --session ${CLAUDE_SESSION_ID} --entry <n>` zeigt Eintrag `<n>` mit seinen Nachbarn; ohne `--entry` kommt die Zeitleiste stückweise.
  3. **Urteilen.** Die Messwert-Signale deuten die „Hinweise zu den Signalen“ oben. Diese fünf Urteils-Signale beurteilst du selbst: Rückfrage oder Korrektur durch den Menschen · Skill geladen, aber nicht befolgt · Ergebnis erzeugt, aber nie genutzt · teures Modell oder breiter Lauf, wo ein schmaler reicht · Mensch wartet auf etwas, das parallel laufen könnte. Ein Tool-Fehler ist erst ein Befund, wenn die Meldung einen echten Fehlschlag zeigt.
  4. **Entwurf schreiben.** Ein `Write` an den Pfad aus der Zeile `Entwurf:` oben, im Berichtsformat. „Zahlen“ und „MCP-Nutzung“ lässt du weg; die setzt das Skript ein.
  5. **Bericht erzeugen.** `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-report.js" --session ${CLAUDE_SESSION_ID} --topic <thema>`, das Thema aus Kleinbuchstaben, Ziffern und Bindestrichen. Meldet es Verstöße, korrigierst du den Entwurf und rufst es erneut auf.
  6. **Im Chat** gibst du die Kurzfassung des Skripts wieder. Nicht committen, erst fragen. Nach dem Ja fragst du den Menschen nach Commit-Konvention und Workitem-Kennung und committest erst, wenn beides geklärt ist.

  ## Wunschliste
  Mehrere Berichte führst du zusammen, nachdem `node "${CLAUDE_PLUGIN_ROOT}/scripts/retro-sort.js"` die Befunde nach Ziel vorsortiert und die MCP-Relevanz gezählt hat.
  ```
  Erwartet: Der Rumpf bleibt unter 500 Wörtern (bisher 375) und enthält genau die Verweise `references/report-format.md`.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/prozess-retrospektive.test.js` — erwartet: PASS, `fail 0`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/prozess-retrospektive/SKILL.md plugins/forge/tests/prozess-retrospektive.test.js` · `git commit -m "refactor(forge): decouple the retrospective skill text from the forge settings"`

---

### Task 6: Umzug nach `plugins/toolbelt`

**ACs:** AC-39

**Dateien:**
Umzug per `git mv` aus `plugins/forge` (Quelle: derselbe Pfad unter `plugins/forge`):
- Create: `plugins/toolbelt/skills/prozess-retrospektive/SKILL.md`
- Create: `plugins/toolbelt/skills/prozess-retrospektive/references/report-format.md`
- Create: `plugins/toolbelt/scripts/session-facts.js`
- Create: `plugins/toolbelt/scripts/retro-report.js`
- Create: `plugins/toolbelt/scripts/retro-timeline.js`
- Create: `plugins/toolbelt/scripts/retro-sort.js`
- Create: `plugins/toolbelt/scripts/mcp-usage.js`
- Create: `plugins/toolbelt/scripts/lib/retro-compose.js`
- Create: `plugins/toolbelt/scripts/lib/retro-corpus.js`
- Create: `plugins/toolbelt/scripts/lib/retro-draft.js`
- Create: `plugins/toolbelt/scripts/lib/retro-files.js`
- Create: `plugins/toolbelt/scripts/lib/retro-format.js`
- Create: `plugins/toolbelt/scripts/lib/retro-measures.js`
- Create: `plugins/toolbelt/scripts/lib/retro-range.js`
- Create: `plugins/toolbelt/scripts/lib/retro-requests.js`
- Create: `plugins/toolbelt/scripts/lib/retro-secrets.js`
- Create: `plugins/toolbelt/scripts/lib/retro-signals.js`
- Create: `plugins/toolbelt/scripts/lib/retro-snapshot.js`
- Create: `plugins/toolbelt/scripts/lib/retro-summary.js`
- Create: `plugins/toolbelt/scripts/lib/session-files.js`
- Create: `plugins/toolbelt/scripts/lib/regexp.js`
- Create: `plugins/toolbelt/tests/prozess-retrospektive.test.js`
- Create: `plugins/toolbelt/tests/retro-compose.test.js`
- Create: `plugins/toolbelt/tests/retro-corpus.test.js`
- Create: `plugins/toolbelt/tests/retro-draft.test.js`
- Create: `plugins/toolbelt/tests/retro-measures.test.js`
- Create: `plugins/toolbelt/tests/retro-range.test.js`
- Create: `plugins/toolbelt/tests/retro-report.test.js`
- Create: `plugins/toolbelt/tests/retro-secrets.test.js`
- Create: `plugins/toolbelt/tests/retro-signals.test.js`
- Create: `plugins/toolbelt/tests/retro-snapshot.test.js`
- Create: `plugins/toolbelt/tests/retro-sort.test.js`
- Create: `plugins/toolbelt/tests/retro-summary.test.js`
- Create: `plugins/toolbelt/tests/retro-timeline.test.js`
- Create: `plugins/toolbelt/tests/session-facts.test.js`
- Create: `plugins/toolbelt/tests/session-files.test.js`
- Create: `plugins/toolbelt/tests/mcp-usage.test.js`
- Create: `plugins/toolbelt/tests/regexp.test.js`
- Create: `plugins/toolbelt/tests/lib/retro-draft-fixture.js`

Kopie per `cp`, das Original bleibt in `plugins/forge`:
- Create: `plugins/toolbelt/scripts/lib/transcript.js`
- Create: `plugins/toolbelt/tests/transcript.test.js`
- Create: `plugins/toolbelt/tests/lib/retro-session.js`
- Create: `plugins/toolbelt/tests/lib/markdown.js`
- Create: `plugins/toolbelt/tests/lib/git-repo.js`

Außerdem:
- Modify: `plugins/forge/tests/transcript.test.js` · `facts`, `cli_UnmarkedSummary_NotCountedAsHumanInput`, `cli_SkillTextAndSummary_NotCountedAsHumanInput`, `cli_HumanEvents_ListedWithEntryTimeAndText`
- Test: alle umgezogenen Tests unter `plugins/toolbelt/tests`

**Interfaces:**
- Consumes: Die Tasks 2 bis 5 haben `forge-config.js` aus allen umziehenden Dateien entfernt; die Skripte verlangen nur noch Dateien, die mit umziehen oder kopiert werden.
- Produces: Plugin-Layout wie in `## Dateistruktur`; `plugins/forge` enthält `scripts/lib/transcript.js`, `tests/transcript.test.js`, `tests/lib/retro-session.js`, `tests/lib/markdown.js` und `tests/lib/git-repo.js` weiter.

- [ ] **Schritt 1: Absicherungstest benennen und forge-Test kürzen**
  Der Absicherungstest ist die umgezogene Testsuite. Vorher kopierst du die volle `transcript.test.js` in das neue Plugin (die Kopie kommt zuerst) und kürzt danach die forge-Fassung, weil ihre drei CLI-Tests `session-facts.js` aufrufen, das gleich umzieht:
  ```bash
  mkdir -p plugins/toolbelt/scripts/lib plugins/toolbelt/tests/lib plugins/toolbelt/skills
  cp plugins/forge/tests/transcript.test.js plugins/toolbelt/tests/transcript.test.js
  ```
  `plugins/forge/tests/transcript.test.js` bekommt diesen vollständigen Inhalt:
  ```js
  'use strict';

  process.env.TZ = 'UTC';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { readEntries, humanEvents } = require('../scripts/lib/transcript');
  const { human, slash, skillText, summary, plainSummary, interrupt, request, call, rejection, writeSession } = require('./lib/retro-session');

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

  test('humanEvents_UnmarkedSummaryInMarkedSession_IsNoInput', () => {
    const entries = readEntries(sessionWithUnmarkedSummary());

    const events = humanEvents(entries);

    assert.deepEqual(events.map((event) => event.text), ['Mach X', 'Danke']);
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
  ```
- [ ] **Schritt 2: Umziehen**
  Befehl (aus `<R>`, ein Bash-Aufruf):
  ```bash
  git mv plugins/forge/skills/prozess-retrospektive plugins/toolbelt/skills/prozess-retrospektive
  for f in session-facts retro-report retro-timeline retro-sort mcp-usage; do git mv plugins/forge/scripts/$f.js plugins/toolbelt/scripts/$f.js; done
  for f in retro-compose retro-corpus retro-draft retro-files retro-format retro-measures retro-range retro-requests retro-secrets retro-signals retro-snapshot retro-summary session-files regexp; do git mv plugins/forge/scripts/lib/$f.js plugins/toolbelt/scripts/lib/$f.js; done
  cp plugins/forge/scripts/lib/transcript.js plugins/toolbelt/scripts/lib/transcript.js
  for f in prozess-retrospektive retro-compose retro-corpus retro-draft retro-measures retro-range retro-report retro-secrets retro-signals retro-snapshot retro-sort retro-summary retro-timeline session-facts session-files mcp-usage regexp; do git mv plugins/forge/tests/$f.test.js plugins/toolbelt/tests/$f.test.js; done
  git mv plugins/forge/tests/lib/retro-draft-fixture.js plugins/toolbelt/tests/lib/retro-draft-fixture.js
  cp plugins/forge/tests/lib/retro-session.js plugins/forge/tests/lib/markdown.js plugins/forge/tests/lib/git-repo.js plugins/toolbelt/tests/lib/
  ```
- [ ] **Schritt 3: Absicherungstest im neuen Plugin laufen lassen**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 4: Absicherungstest für `dv-forge` laufen lassen**
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS, `fail 0`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 5: Commit**
  `git add plugins/toolbelt plugins/forge` · `git commit -m "refactor(toolbelt): move the retrospective skill, scripts and tests out of dv-forge"`

---

### Task 7: Wächter für Autonomie und Skript-Tests, Fakten ohne Einstellungen

**ACs:** AC-04, AC-05, AC-34, AC-37, AC-40

**Dateien:**
- Create: `plugins/toolbelt/tests/plugin-autonomy.test.js`
- Create: `plugins/toolbelt/tests/scripts-have-tests.test.js`
- Create: `plugins/toolbelt/tests/retro-standalone.test.js`
- Modify: `plugins/toolbelt/tests/lib/retro-draft-fixture.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/lib/git-repo.js` · `dv-forge-git-` (Kopie aus Task 6, dazu `dv-forge test`)
- Modify: `plugins/toolbelt/tests/retro-compose.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-draft.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-measures.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-range.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-report.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-snapshot.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-sort.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/retro-summary.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/session-facts.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/mcp-usage.test.js` · `dv-forge:` (Beispieldaten, aus Task 6)
- Modify: `plugins/toolbelt/tests/transcript.test.js` · `dv-forge:` (Beispieldaten, Kopie aus Task 6)

**Interfaces:**
- Consumes: `human`, `request`, `usage`, `writeSession` aus `plugins/toolbelt/tests/lib/retro-session.js`.
- Produces: Wächter-Tests, die auch die Pläne 2 und 3 grün halten müssen: Jede Datei im Plugin außer `README.md` ohne die fünf fremden Namen, zu jedem `scripts/<name>.js` eine Datei `tests/<name>.test.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/toolbelt/tests/plugin-autonomy.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');

  const PLUGIN_ROOT = path.join(__dirname, '..');
  // Die Namen entstehen aus Teilen, damit diese Datei sie nicht selbst enthält.
  const FOREIGN_NAMES = ['super' + 'powers', 'skill-' + 'creator', 'grill-' + 'me', 'dv-' + 'forge', 'forge-' + 'config'];

  function filesOf(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? filesOf(full) : [full];
    });
  }

  test('plugin_AllFilesButReadme_NameNoForeignPluginOrSkill', () => {
    const hits = filesOf(PLUGIN_ROOT)
      .filter((file) => path.relative(PLUGIN_ROOT, file) !== 'README.md')
      .flatMap((file) => {
        const text = fs.readFileSync(file, 'utf8');
        return FOREIGN_NAMES.filter((name) => text.includes(name)).map((name) => `${path.relative(PLUGIN_ROOT, file)}: ${name}`);
      });

    assert.deepEqual(hits, []);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/toolbelt/tests/plugin-autonomy.test.js` — erwartet: FAIL `plugin_AllFilesButReadme_NameNoForeignPluginOrSkill` mit Treffern der Art `tests/retro-sort.test.js: dv-forge`
- [ ] **Schritt 3: Minimal implementieren**
  Die Beispieldaten der Tests nennen `dv-forge:…` als Skill-Namen; sie werden neutral:
  ```bash
  sed -i 's/dv-forge:/acme:/g' plugins/toolbelt/tests/*.test.js plugins/toolbelt/tests/lib/retro-draft-fixture.js
  sed -i "s/dv-forge-git-/toolbelt-git-/; s/dv-forge test/toolbelt test/" plugins/toolbelt/tests/lib/git-repo.js
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`, darunter PASS `plugin_AllFilesButReadme_NameNoForeignPluginOrSkill`. Meldet der Wächter einen weiteren Treffer, ersetzt du die Stelle durch einen neutralen Namen und wiederholst den Lauf.
- [ ] **Schritt 5: Wächter für Skript-Tests und Fakten ohne Einstellungen schreiben**
  Neue Datei `plugins/toolbelt/tests/scripts-have-tests.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');

  const PLUGIN_ROOT = path.join(__dirname, '..');

  test('scripts_EveryScript_HasItsTestFile', () => {
    const scripts = fs.readdirSync(path.join(PLUGIN_ROOT, 'scripts')).filter((name) => name.endsWith('.js'));

    const missing = scripts.filter((name) => !fs.existsSync(path.join(__dirname, name.replace(/\.js$/, '.test.js'))));

    assert.deepEqual(missing, []);
  });
  ```
  Neue Datei `plugins/toolbelt/tests/retro-standalone.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { human, request, usage, writeSession } = require('./lib/retro-session');

  const FACTS = path.join(__dirname, '..', 'scripts', 'session-facts.js');

  function tempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  }

  test('sessionFacts_ProjectWithoutAnySettings_RunsAndWritesSnapshotInToolbeltFolder', () => {
    const home = tempDir('toolbelt-home-');
    const project = tempDir('toolbelt-project-');
    const transcript = writeSession([human('Los', '10:00'), request('r1', '10:01', [], usage(1000, 0, 0, 100))]);
    const env = { ...process.env, HOME: home, USERPROFILE: home };

    const result = spawnSync(process.execPath, [FACTS, '--file', transcript, '--session', 's1', '--cwd', project, '--snapshot'], { encoding: 'utf8', env, cwd: project });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.doesNotMatch(result.stdout, /forge|Kein Git-Repo/);
    assert.ok(result.stdout.includes(path.join(home, '.dv-toolbelt', 'retro', 's1.snapshot.json')));
    assert.deepEqual(fs.readdirSync(path.join(home, '.dv-toolbelt', 'retro')), ['s1.snapshot.json']);
    // AC-37: Der leere temporäre HOME-Ordner zeigt jede Schreibung in den alten Datenordner.
    assert.equal(fs.existsSync(path.join(home, '.dv-' + 'forge')), false);
  });
  ```
- [ ] **Schritt 6: Wächter laufen lassen**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`, darunter PASS `scripts_EveryScript_HasItsTestFile` und PASS `sessionFacts_ProjectWithoutAnySettings_RunsAndWritesSnapshotInToolbeltFolder`. Der Bericht-Teil von AC-34 ist durch den bestehenden Test `cli_ValidDraft_WritesDatedReportAndDeletesDraft` abgedeckt: Er erzeugt den Bericht in einem Projektordner ohne jede Einstellungsdatei.
- [ ] **Schritt 7: Commit**
  `git add plugins/toolbelt` · `git commit -m "test(toolbelt): guard against foreign plugin names and scripts without tests"`

---

### Task 8: `dv-forge` aufräumen

**ACs:** AC-38, AC-39

**Dateien:**
- Modify: `plugins/forge/README.md` · `| `prozess-retrospektive` |`
- Modify: `plugins/forge/skills/init/SKILL.md` · `| `MCP-Erwartet` |`, `- MCP-Erwartet: dev-mcp, codebase-analyzer`
- Modify: `plugins/forge/scripts/forge-config.js` · `'MCP-Erwartet': '',`
- Test: `plugins/forge/tests/forge-config.test.js` · `readConfig_NoClaudeMd_AllDefaults`, `cli_ShowAndGet_MarkDefaults`, `initSkill_McpExpected_NamesPlaceKeyAndExampleWithTwoServers`
- Test: `plugins/forge/tests/retro-moved.test.js`

**Interfaces:**
- Consumes: der Umzug aus Task 6.
- Produces: `dv-forge` ohne Retro-Dateien, ohne Retro-Zeile im README, ohne Schlüssel `MCP-Erwartet`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Neue Datei `plugins/forge/tests/retro-moved.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');

  const PLUGIN_ROOT = path.join(__dirname, '..');
  const MOVED_ENTRIES = ['skills/prozess-retrospektive', 'scripts/session-facts.js', 'scripts/retro-report.js', 'scripts/retro-timeline.js', 'scripts/retro-sort.js', 'scripts/mcp-usage.js'];
  const MOVED_LIBS = /^(retro-|session-files|regexp)/;
  const MOVED_TESTS = /^(retro-|prozess-retrospektive|session-(facts|files)|mcp-usage|regexp)/;

  test('forge_RetrospectiveFiles_AreMovedOut', () => {
    for (const entry of MOVED_ENTRIES) assert.equal(fs.existsSync(path.join(PLUGIN_ROOT, entry)), false, entry);
    assert.deepEqual(fs.readdirSync(path.join(PLUGIN_ROOT, 'scripts', 'lib')).filter((name) => MOVED_LIBS.test(name)), []);
    assert.deepEqual(fs.readdirSync(__dirname).filter((name) => MOVED_TESTS.test(name) && name !== 'retro-moved.test.js'), []);
  });

  test('forge_ReadmeInitSkillAndConfig_NameNeitherRetrospectiveNorExpectedMcp', () => {
    for (const file of ['README.md', 'skills/init/SKILL.md', 'scripts/forge-config.js']) {
      const text = fs.readFileSync(path.join(PLUGIN_ROOT, file), 'utf8');

      assert.doesNotMatch(text, /[Rr]etrospektive|MCP-Erwartet/, file);
    }
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/retro-moved.test.js` — erwartet: FAIL `forge_ReadmeInitSkillAndConfig_NameNeitherRetrospectiveNorExpectedMcp` (der erste Test ist wegen Task 6 schon grün)
- [ ] **Schritt 3: Minimal implementieren**
  1. In `plugins/forge/README.md` entferne die Zeile
     ```markdown
     | `prozess-retrospektive` | Erfahrungsbericht über den Ablauf einer Session |
     ```
  2. In `plugins/forge/skills/init/SKILL.md` entferne die Tabellenzeile
     ```markdown
     | `MCP-Erwartet` | MCP-Server je Session, mit Komma getrennt; ungenutzte meldet die Retrospektive als „erwartet, ungenutzt“ | leer |
     ```
     und die Beispielzeile
     ```markdown
     - MCP-Erwartet: dev-mcp, codebase-analyzer
     ```
  3. In `plugins/forge/scripts/forge-config.js` entferne die Zeile
     ```js
       'MCP-Erwartet': '',
     ```
  4. In `plugins/forge/tests/forge-config.test.js` entferne in `readConfig_NoClaudeMd_AllDefaults` die Zeile `assert.equal(values['MCP-Erwartet'], '');`, entferne in `cli_ShowAndGet_MarkDefaults` die Zeile `assert.match(shown.stdout, /^MCP-Erwartet=  \(Default\)$/m);` und ersetze den Test `initSkill_McpExpected_NamesPlaceKeyAndExampleWithTwoServers` durch
     ```js
     test('initSkill_Section_NamesTheProjectClaudeMd', () => {
       const text = fs.readFileSync(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'), 'utf8');

       assert.ok(text.includes('Abschnitt `## dv-forge` der Projekt-`CLAUDE.md`'));
     });
     ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS, `fail 0`, darunter PASS `forge_RetrospectiveFiles_AreMovedOut` und PASS `forge_ReadmeInitSkillAndConfig_NameNeitherRetrospectiveNorExpectedMcp`
- [ ] **Schritt 5: Gesamtlauf beider Plugins**
  Befehl: `node --test "plugins/toolbelt/tests/*.test.js"` — erwartet: PASS, `fail 0`. Der bisher schon rote Test `readme_Retrospective_NamesNewCallAndNoNaturalLanguageTrigger` aus `dv-forge` existiert nicht mehr.
- [ ] **Schritt 6: Commit**
  `git add plugins/forge` · `git commit -m "refactor(forge): remove the retrospective leftovers and the MCP-Erwartet setting"`

---

## Entscheidungen
- **W · Aufteilung** · Aussage — Drei Pläne: Gerüst und Retro-Umzug, `claude-md-audit`, `writing-skills`.
- **W · Planungs-Skills** · Aussage — Keine Planungs-Skills für diese Pläne.
- **E · Planname** · Planer — Weil die Spec drei Pläne bekommt, heißen sie `plan-1-geruest-und-retro.md`, `plan-2-claude-md-audit.md` und `plan-3-writing-skills.md` im Ordner der Spec. Plan 3 setzt Plan 1 und 2 voraus.
- **E · Reihenfolge** · Planer — Erst entkoppeln an Ort und Stelle (Tasks 2–5), dann umziehen (Task 6): Jeder Task-Commit bleibt grün, und der Umzug ist danach ein wörtliches `git mv`.
- **E · Skript-Ablage** · Planer — Wie in `dv-forge` liegen alle Skripte unter `plugins/toolbelt/scripts`, nicht in den Skill-Ordnern; die Skills rufen sie über `${CLAUDE_PLUGIN_ROOT}/scripts/…` auf.
- **E · Geteilte Dateien** · Planer — `transcript.js`, `tests/lib/retro-session.js`, `tests/lib/markdown.js` und `tests/lib/git-repo.js` werden kopiert, weil `dv-forge` sie weiter braucht (`turn-text.js`, andere Tests). Die CLI-Tests der forge-`transcript.test.js` fallen weg, weil sie `session-facts.js` aufrufen; das neue Plugin behält die volle Kopie.
- **E · Test-Beispieldaten** · Planer — Die Beispielnamen `dv-forge:…` in den umgezogenen Tests werden zu `acme:…`, damit AC-05 für alle Dateien gilt; den Abschnittsnamen im Test von Task 2 baut der Test aus Teilen, damit seine Aussage erhalten bleibt.
- **E · AC-40** · Planer — Der Wächter prüft `scripts/<name>.js` gegen `tests/<name>.test.js`; die Bibliotheken unter `scripts/lib` sind durch die Skript-Tests abgedeckt.
- **E · AC-34** · Planer — Der Teil „Bericht entsteht ohne Einstellungen“ ist durch den bestehenden CLI-Test mit einem Projektordner ohne Einstellungsdatei abgedeckt; Task 7 ergänzt den Fakten-Teil.
- **E · README-Zeilen** · Planer — Der Eintrag in `README.md` und `plugins/README.md` im Repo-Root steht nicht in der Spec; er hält die Übersichten konsistent mit dem Marketplace.
- **E · AC-Aufteilung** · Planer — Nach „W · Aufteilung“ setzt Plan 1 AC-01, AC-02, AC-04, AC-05 und AC-34 bis AC-41 um. AC-07 bis AC-20 (`claude-md-audit`) liegen in `plan-2-claude-md-audit.md`, AC-03, AC-06 und AC-21 bis AC-33 (`writing-skills`, Validator, README-Inspirationssätze) in `plan-3-writing-skills.md`; AC-04, AC-05, AC-40 und AC-41 prüfen Plan 2 und Plan 3 für ihre Skills erneut. AC-03 („genau drei Skills“) steht bewusst im letzten Task von Plan 3, weil erst dann alle drei Skills existieren. Die Global Constraints zu `claude-md-audit` und zum Validator stehen hier nur, damit alle drei Pläne dieselben Vorgaben führen; Plan 1 baut beide nicht.
- **R1 · AC-10** — geändert — Kein Task in Plan 1, weil AC-10 zu `claude-md-audit` gehört (W · Aufteilung); Plan 2 nennt es unter `**ACs:**` des Backup-Tasks. Die neue Zeile „E · AC-Aufteilung“ macht die Zuordnung in Plan 1 sichtbar.
- **R1 · AC-11** — geändert — Wie AC-10: gehört zu Plan 2 (Backup-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-12** — geändert — Gehört zu Plan 2 (Backup-Task und Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-13** — geändert — Gehört zu Plan 2 (Diff-Task und Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-14** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-15** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-16** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-17** — geändert — Gehört zu Plan 2 (Block-Hash-Task und Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-18** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-19** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-20** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-21** — geändert — Gehört zu Plan 3 (Anleitungs-Task von `writing-skills`), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-22** — geändert — Gehört zu Plan 3 (Anleitungs-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-23** — geändert — Gehört zu Plan 3 (Anleitungs-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-24** — geändert — Gehört zu Plan 3 (Task zu den Begleitdokumenten), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-25** — geändert — Gehört zu Plan 3 (Anleitungs-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-26** — geändert — Gehört zu Plan 3 (Begleitdokumente und Anleitung), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-27** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-28** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-29** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-03** — geändert — Gehört zu Plan 3 (letzter Task); „genau drei Skills“ gilt erst, wenn `claude-md-audit` und `writing-skills` existieren. Zuordnung samt diesem Grund in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-30** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-31** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-32** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-33** — geändert — Gehört zu Plan 3 (Validator-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-37** — geändert — Der Test `sessionFacts_ProjectWithoutAnySettings_RunsAndWritesSnapshotInToolbeltFolder` in Task 7 prüft jetzt zusätzlich, dass unter dem leeren temporären HOME kein Ordner `.dv-forge` entsteht; Task 7 nennt AC-37 unter `**ACs:**`. Ganzes AC geprüft: Den Datenordner bestimmt allein `retroDir()` (Task 4), der Ordner `.dv-toolbelt/retro` ist in Task 4 und Task 7 getestet, und der Autonomie-Wächter aus Task 7 verbietet den Text `dv-forge` in allen Dateien des Plugins; keine weitere Lücke.
- **R1 · AC-06** — geändert — Gehört zu Plan 3 (letzter Task, README-Inspirationssätze); Plan 1 legt die README nur mit dem Retro-Skill an. Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-07** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-08** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · AC-09** — geändert — Gehört zu Plan 2 (Skill-Task), Zuordnung in „E · AC-Aufteilung“ vermerkt.
- **R1 · Global Constraints** — geändert — Beide Soll-Vorgaben der Spec (keine Annahme von `claude-md-audit` über Memory-Pfad, Git-Ignore oder Plugin-Abschnitt; Validator als Node-Skript mit Exit-Code und Meldung) stehen jetzt wörtlich in `## Global Constraints`, gleichlautend mit Plan 2.
- **R1 · Task 3** — geändert — Die Dateizeilen nennen vorhandene Anker (`workitemCandidate`, die Importzeile `const { makeRepo, commitFile } = require('./lib/git-repo');` und die drei Testnamen); Schritt 1 nennt beide Importzeilen als Vorher/Nachher (`workitemCandidate` und `commitFile` entfallen, `makeRepo` bleibt für den neuen Test).
- **R1 · Task 5** — geändert — Die Dateizeile nennt den vorhandenen Anker `name: prozess-retrospektive`; der Voll-Ersatz in Schritt 3 bleibt.
- **R1 · Task 7** — geändert — Statt der Glob-Zeile steht je Datei mit `dv-forge:` eine eigene Modify-Zeile mit Anker `dv-forge:`, `git-repo.js` hat den Anker `dv-forge-git-`. Damit die Prüfung die erst in Task 6 entstehenden Dateien erkennt, listet Task 6 jede umgezogene und kopierte Datei als eigene `Create:`-Zeile statt als Sammelzeile; Inhalt und Befehle von Task 6 sind unverändert.
- **R2 · AC-10** — nicht geändert — Gehört nach „W · Aufteilung“ zu `claude-md-audit`; `plan-2-claude-md-audit.md` nennt AC-10 unter `**ACs:**` des Backup-Tasks (Zeile 89) und des Skill-Tasks (Zeile 739). Die Skript-Prüfung sieht nur Plan 1; die Zuordnung steht in „E · AC-Aufteilung“. Ein Scheineintrag in Plan 1 würde eine Umsetzung behaupten, die Plan 1 nicht leistet.
- **R2 · AC-11** — nicht geändert — Gehört zu Plan 2, dort unter `**ACs:**` des Backup-Tasks (Zeile 89); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-12** — nicht geändert — Gehört zu Plan 2, dort im Backup-Task (Zeile 89) und im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-13** — nicht geändert — Gehört zu Plan 2, dort im Diff-Task (Zeile 351) und im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-14** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-15** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-16** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-17** — nicht geändert — Gehört zu Plan 2, dort im Block-Hash-Task (Zeile 519) und im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-18** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-19** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-20** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-21** — nicht geändert — Gehört zu Plan 3, dort im Anleitungs-Task (Zeile 608); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-22** — nicht geändert — Gehört zu Plan 3, dort im Anleitungs-Task (Zeile 608); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-23** — nicht geändert — Gehört zu Plan 3, dort im Anleitungs-Task (Zeile 608); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-24** — nicht geändert — Gehört zu Plan 3, dort im Task zu den Begleitdokumenten (Zeile 400); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-25** — nicht geändert — Gehört zu Plan 3, dort im Anleitungs-Task (Zeile 608); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-26** — nicht geändert — Gehört zu Plan 3, dort in den Tasks zu Begleitdokumenten (Zeile 400) und Anleitung (Zeile 608); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-27** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-28** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-29** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-03** — nicht geändert — Gehört zu Plan 3, dort im letzten Task (Zeile 799). „Genau drei Skills“ kann nach Plan 1 nicht gelten, weil dann nur `prozess-retrospektive` existiert; ein Eintrag in Plan 1 wäre falsch.
- **R2 · AC-30** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-31** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-32** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-33** — nicht geändert — Gehört zu Plan 3, dort im Validator-Task (Zeile 87); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-06** — nicht geändert — Gehört zu Plan 3, dort im letzten Task (Zeile 799), der die README um `writing-skills`, `claude-md-audit` und die Inspirationssätze ergänzt; Plan 1 legt die README nur mit dem Retro-Skill an.
- **R2 · AC-07** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-08** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
- **R2 · AC-09** — nicht geändert — Gehört zu Plan 2, dort im Skill-Task (Zeile 739); Zuordnung in „E · AC-Aufteilung“.
