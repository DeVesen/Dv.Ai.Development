# Build-, Test- und Lint-Werkzeuge als Skills in dv-dotnet und dv-angular — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die Build-, Test- und Lint-Werkzeuge für .NET und Angular ziehen aus dv-forge in die Plugins dv-dotnet und dv-angular um und werden dort über einen Skill `toolchain`, Start-Befehle auf dem PATH, einen Init-Skill und einen optionalen Hook auffindbar.
**Architektur:** Jedes Stack-Plugin bekommt Start-Befehle in `bin/` (Claude Code setzt das `bin/` aktivierter Plugins auf den PATH des Bash-Tools), die die umgezogenen Skripte unter `scripts/toolchain/` starten, einen knappen Skill `toolchain` und einen Init-Skill, dessen Skript `scripts/init.js` Hinweisblock, MCP-Einträge und Hook-Schalter deterministisch schreibt. Ein PreToolUse-Hook aus `hooks/hooks.json` lehnt nur ab, wenn das Projekt den Schalter `.claude/dv-<stack>.json` gesetzt hat. dv-forge löst die alte Schreibweise `dv-forge: <stack>-<kommando>` nicht mehr auf und meldet sie in `setup-check` als veraltet.
**Tech-Stack:** Node.js 24 (CommonJS, `node:test`, kein package.json), Markdown-Skills, JSON-Hooks, Git Bash als Bash-Tool unter Windows.
**Spec:** docs/forge/2026-09-30-stack-toolchain-skills/spec.md
**Basis:** 8a680d6

## Global Constraints
- Umfang sind genau die Stacks .NET und Angular, je mit Build, Test und Lint; weitere Stacks sind nicht Teil der Umsetzung. (Spec)
- Der Skill heißt in beiden Plugins `toolchain` (`dv-dotnet:toolchain`, `dv-angular:toolchain`); die Befehle heißen `dv-dotnet-build`, `dv-dotnet-test`, `dv-dotnet-lint`, `dv-angular-build`, `dv-angular-test`, `dv-angular-lint`. (Spec)
- Die Befehle sind ohne Pfadangabe zum Plugin aufrufbar und gelten im Bash-Tool; es gibt kein PowerShell-Gegenstück. (Spec)
- Die Werkzeuge ziehen unverändert um: Verhalten und Ausgabe bleiben gleich, die zugehörigen Tests ziehen mit. (Spec)
- Der Skill ist knapp: Er sagt, wann er aufzurufen ist, nennt den Befehl und Bash als Ort und lädt bei „baue …“, „teste …“, „kompiliere …“, „lint …“, „führe die Tests aus“, „Build prüfen“ und „laufen die Tests durch“. (Spec)
- Ohne genannten Pfad gilt die einzige Solution bzw. der einzige Angular-Workspace des Repos; gibt es mehrere, fragt der Skill nach und startet nichts. Ein Angular-Projekt ist ein Angular-Workspace, also ein Ordner mit der Workspace-Konfiguration von Angular samt aller Anwendungen und Bibliotheken darin; diese zählen nicht einzeln. (Spec)
- Als erster Schritt der Umsetzung wird geprüft, ob die Start-Befehle unter Windows laufen; scheitert die Prüfung, hält die Umsetzung an und fragt den Anwender. (Spec, Task 1)
- Der Init-Skill schreibt einen kurzen Hinweisblock in die CLAUDE.md, der den Skill nennt, ohne Befehle und ohne Pfade; erneutes Ausführen ersetzt den Block, statt einen zweiten anzuhängen; fehlt die CLAUDE.md, legt der Init sie mit dem Block an. (Spec)
- Der Init fragt Hook und jeden der MCPs Microsoft Learn und Context7 einzeln, der Standard ist Nein; die MCP-Frage weist darauf hin: Ist der MCP schon als Plugin installiert, Nein wählen; installierte Plugins werden nicht erkannt. (Spec)
- Der Init ändert nichts an bestehenden Regeln der CLAUDE.md, etwa „Build und Test über dev-mcp“. (Spec)
- Zieldatei der MCPs ist die projektweite `.mcp.json` im Wurzelordner: ein vorhandener Eintrag bleibt unverändert, andere Einträge bleiben unberührt, eine fehlende Datei wird angelegt; ist die Datei kein gültiges JSON, entstehen für die mit Ja gewählten MCPs weder Eintrag noch Satz, der Init meldet es und führt den übrigen Init fort. Je MCP steht höchstens ein Satz in der CLAUDE.md, gleich welches Plugin zuerst läuft. (Spec)
- Der Hook erfasst die Build/Test-Werkzeuge von dev-mcp, `dotnet build|test` sowie `ng build|test|lint`, `npx ng build|test|lint`, `npm test` und `npm run build|test|lint`, jeweils im Bash-Tool; er lehnt den Aufruf ab und nennt den Skill. Im PowerShell-Tool lehnt er diese Aufrufe nicht ab. Andere Unterbefehle von `ng` und `npx ng`, etwa `generate`, lehnt er nicht ab. (Spec)
- forge: `dv-forge: <stack>-<kommando>` wird für alle sechs Werkzeuge nicht mehr aufgelöst; `setup-check` meldet jede dieser Zeilen als veraltet und nennt den Befehl `dv-<stack>-<kommando>` als Ersatz; die Schlüssel `Build`, `Test` und `Lint` bleiben, ihr Wert ist ein beliebiger Befehl. (Spec)
- Nicht Teil der Umsetzung: Build/Test-Tools aus dev-mcp entfernen, weitere .NET- und Angular-Skills umziehen, die CLAUDE.md dieses Repos kürzen, ein PowerShell-Gegenstück, weitere Stacks. (Spec)
- Dateien mit dem Write- oder Edit-Tool schreiben, nie per Shell-Heredoc: Doppelte Backslashes in Regex-Literalen gehen dort verloren. Typografische Anführungszeichen („ “) in Skill- und Meldungstexten unverändert übernehmen. (Erfahrung aus der Planprobe)
- Verifikation dieses Plans sind Node-Tests: `node --test <dateien>` im Repo-Wurzelordner; die PATH-Prüfungen laufen im Bash-Tool (Git Bash). Unter Windows überspringen sechs Tests der .NET-Skripte sich selbst („falsches dotnet nur unter POSIX“), das ist erwartet. Ohne Git Bash überspringt sich zusätzlich je Plugin der Test `starters_OnPathInGitBash_AreFoundAndStarted` („keine Git Bash“); dann gilt der Halt aus Schritt 5 in Task 1 bzw. Task 7. (Projekt)
- superpowers:writing-skills: Frontmatter eines Skills hat `name` und `description`; `description` beginnt mit „Use when“, steht in der dritten Person, nennt nur Auslöser und nie den Ablauf und bleibt unter 500 Zeichen; der Body bleibt unter 500 Wörtern (häufig geladene Skills unter 200); kein `@`-Link auf andere Dateien; nur ein Flussdiagramm, wenn eine Entscheidung nicht offensichtlich ist.
- software-design-principles: keine Verschachtelung (Guard Clause mit früher Rückgabe, Verzweigung delegiert an eine benannte Funktion); kleine Funktionen mit einer Aufgabe; Namen ohne mentales Mapping, höchstens vier Parameter, kein Bool-Flag, das Verhalten umschaltet; Fehler nie verschlucken (der Hook fängt Fehler bewusst, meldet sie auf stderr und blockiert nie); kein toter Code; DRY gilt für Wissen, die Kopie von `project-setup.js` (Bausteine und Init-Ablauf) in beiden Plugins ist durch die Plugin-Isolation begründet; `init.js` hält je Plugin nur den Stack.

---

### Task 1: .NET-Start-Befehle und Windows-Prüfung

**ACs:** AC-10

**Dateien:**
- Modify: `.gitignore:7-8` · `[Bb]in/`
- Create: `.gitattributes`
- Create: `plugins/dotnet/bin/lib/run-toolchain.js`
- Create: `plugins/dotnet/bin/dv-dotnet-build`
- Create: `plugins/dotnet/bin/dv-dotnet-test`
- Create: `plugins/dotnet/bin/dv-dotnet-lint`
- Test: `plugins/dotnet/tests/run-toolchain.test.js`

**Interfaces:**
- Produces: `run(starterFile: string, args?: string[]): number`, `scriptFor(starterFile: string): string` und `failureMessage(starterFile: string, result: { error?: Error, signal?: string | null, status?: number | null }): string | null` aus `plugins/dotnet/bin/lib/run-toolchain.js`; `run` startet `scripts/toolchain/<name ohne "dv-">.js` des Plugins mit `process.execPath`, reicht `args` (Default `process.argv.slice(2)`) und gibt den Exit-Code zurück, bei fehlendem Skript 1 mit `<befehl>: Skript nicht gefunden: <pfad>` auf stderr, bei Startfehler oder Signal 1 mit der Zeile von `failureMessage` auf stderr (`<befehl>: Start fehlgeschlagen: <grund>` bzw. `<befehl>: beendet durch Signal <signal>`).
- Produces: die Start-Befehle `dv-dotnet-build`, `dv-dotnet-test`, `dv-dotnet-lint` (Node-Shebang, ohne Endung) in `plugins/dotnet/bin/`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/dotnet/tests/run-toolchain.test.js` neu anlegen (Write-Tool):

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scriptFor, failureMessage } = require('../bin/lib/run-toolchain');

const BIN = path.join(__dirname, '..', 'bin');
const STARTERS = ['dv-dotnet-build', 'dv-dotnet-test', 'dv-dotnet-lint'];
const FAKE_SCRIPT = 'process.stdout.write(JSON.stringify({ args: process.argv.slice(2) }));\nprocess.exit(3);\n';
const BASH = findBash();

// Git Bash unter Windows über den Ort von git, nie das WSL-bash.exe aus System32; unter POSIX bash vom PATH. Ohne Bash null.
function findBash() {
  if (process.platform !== 'win32') return spawnSync('bash', ['-c', 'true']).status === 0 ? 'bash' : null;
  const gitExecPath = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
  if (gitExecPath.status !== 0) return null;
  const bash = path.resolve(gitExecPath.stdout.trim(), '..', '..', '..', 'bin', 'bash.exe');
  return fs.existsSync(bash) ? bash : null;
}

// Kopie des Plugins mit dem echten bin/ und, auf Wunsch, Ersatz-Skripten unter scripts/toolchain/.
function pluginCopy(withScripts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-plugin-'));
  fs.cpSync(BIN, path.join(root, 'bin'), { recursive: true });
  if (!withScripts) return root;
  const scripts = path.join(root, 'scripts', 'toolchain');
  fs.mkdirSync(scripts, { recursive: true });
  for (const starter of STARTERS) fs.writeFileSync(path.join(scripts, `${starter.replace(/^dv-/, '')}.js`), FAKE_SCRIPT);
  return root;
}

function start(root, starter, args) {
  return spawnSync(process.execPath, [path.join(root, 'bin', starter), ...args], { encoding: 'utf8' });
}

for (const starter of STARTERS) {
  test(`${starter}_WithArguments_PassesThemAndExitCodeOfItsScript`, () => {
    const result = start(pluginCopy(true), starter, ['--path', 'src/App.sln', '--', '--filter', 'OrderTests']);
    assert.equal(result.status, 3);
    assert.deepEqual(JSON.parse(result.stdout), { args: ['--path', 'src/App.sln', '--', '--filter', 'OrderTests'] });
  });
}

test('starter_ScriptMissing_ReportsPathAndExitsOne', () => {
  const result = start(pluginCopy(false), 'dv-dotnet-test', []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-dotnet-test: Skript nicht gefunden: .*dotnet-test\.js\n$/);
});

test('scriptFor_StarterFile_MapsToToolchainScriptOfSameName', () => {
  const script = scriptFor(path.join('x', 'bin', 'dv-dotnet-lint'));
  assert.equal(path.basename(script), 'dotnet-lint.js');
  assert.equal(path.basename(path.dirname(script)), 'toolchain');
});

// Künstliche Ergebnisse von spawnSync statt eines echten Kindprozesses: auf Windows und POSIX gleich stabil.
test('failureMessage_StartErrorSignalOrExitCode_NamesCauseOrIsNull', () => {
  const starter = path.join('x', 'bin', 'dv-dotnet-test');
  assert.equal(failureMessage(starter, { error: new Error('spawn EACCES') }), 'dv-dotnet-test: Start fehlgeschlagen: spawn EACCES');
  assert.equal(failureMessage(starter, { signal: 'SIGTERM', status: null }), 'dv-dotnet-test: beendet durch Signal SIGTERM');
  assert.equal(failureMessage(starter, { status: 3 }), null);
});

// AC-10: Git Bash findet die Start-Befehle ohne Endung über den PATH und startet sie über den Node-Shebang.
test('starters_OnPathInGitBash_AreFoundAndStarted', { skip: BASH ? false : 'keine Git Bash' }, () => {
  const bin = path.join(pluginCopy(true), 'bin');
  for (const starter of STARTERS) fs.chmodSync(path.join(bin, starter), 0o755);
  const script = 'd=$(cygpath -u "$1" 2>/dev/null || printf %s "$1"); PATH="$d:$PATH"; shift; for s in "$@"; do "$s" x; echo "exit=$?"; done';
  const result = spawnSync(BASH, ['-c', script, '_', bin, ...STARTERS], { encoding: 'utf8' });
  assert.equal(result.stdout, '{"args":["x"]}exit=3\n'.repeat(STARTERS.length), result.stderr);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/run-toolchain.test.js` — erwartet: FAIL, `Cannot find module '../bin/lib/run-toolchain'`
- [ ] **Schritt 3: Minimal implementieren**
  In `.gitignore` die Zeile `[Bb]in/` ersetzen, damit die `bin/`-Ordner der Plugins nicht ignoriert werden (Edit-Tool, exakt):

Alt:

````
[Bb]in/
````

Neu:

````
[Bb]in/
!plugins/*/bin/
````

  Datei `.gitattributes` neu anlegen, damit die Start-Befehle überall mit LF ausgecheckt werden (ein Shebang mit CRLF läuft nicht):

````
plugins/*/bin/** text eol=lf
````

  Datei `plugins/dotnet/bin/lib/run-toolchain.js` neu anlegen:

````js
'use strict';

// Startet das Toolchain-Skript, das zum Namen des Start-Befehls passt: dv-dotnet-test → scripts/toolchain/dotnet-test.js.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOLCHAIN_DIR = path.join(__dirname, '..', '..', 'scripts', 'toolchain');

function scriptFor(starterFile) {
  return path.join(TOOLCHAIN_DIR, `${path.basename(starterFile).replace(/^dv-/, '')}.js`);
}

// Meldung, wenn das Skript nicht starten konnte oder durch ein Signal endete; sonst null.
function failureMessage(starterFile, result) {
  const command = path.basename(starterFile);
  if (result.error) return `${command}: Start fehlgeschlagen: ${result.error.message}`;
  if (result.signal) return `${command}: beendet durch Signal ${result.signal}`;
  return null;
}

// Gibt den Exit-Code des Skripts zurück; fehlt das Skript, startet es nicht oder endet es durch ein Signal, 1 mit Meldung auf stderr.
function run(starterFile, args = process.argv.slice(2)) {
  const script = scriptFor(starterFile);
  if (!fs.existsSync(script)) {
    process.stderr.write(`${path.basename(starterFile)}: Skript nicht gefunden: ${script}\n`);
    return 1;
  }
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  const failure = failureMessage(starterFile, result);
  if (failure === null) return result.status;
  process.stderr.write(`${failure}\n`);
  return 1;
}

module.exports = { run, scriptFor, failureMessage };
````

  Die drei Start-Befehle `plugins/dotnet/bin/dv-dotnet-build`, `plugins/dotnet/bin/dv-dotnet-test` und `plugins/dotnet/bin/dv-dotnet-lint` anlegen, alle drei mit genau diesem Inhalt:

````js
#!/usr/bin/env node
'use strict';

process.exit(require('./lib/run-toolchain.js').run(__filename));
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/run-toolchain.test.js` — erwartet: PASS, 7 Tests, 0 skipped; meldet `starters_OnPathInGitBash_AreFoundAndStarted` „keine Git Bash“ oder schlägt er fehl, gilt der Halt aus Schritt 5.
- [ ] **Schritt 5: Windows-Prüfung der Start-Befehle (AC-10)**
  Befehl im Bash-Tool, im Repo-Wurzelordner: `PATH="$(pwd)/plugins/dotnet/bin:$PATH" dv-dotnet-test --path x; echo "exit=$?"` — erwartet: die Zeile `dv-dotnet-test: Skript nicht gefunden: <R>\plugins\dotnet\scripts\toolchain\dotnet-test.js` und danach `exit=1`. Sie beweist, dass Git Bash die Datei ohne Endung über den PATH findet und über den Node-Shebang startet; das Skript selbst zieht erst Task 2 um.
  **Halt:** Erscheint stattdessen `command not found`, `bad interpreter`, eine leere Ausgabe oder ein anderer Exit-Code, hält die Umsetzung an: nichts committen, den Anwender fragen und erst nach seiner Antwort weitermachen.
- [ ] **Schritt 6: Commit**
  `git add .gitignore .gitattributes plugins/dotnet` · `git add --chmod=+x plugins/dotnet/bin/dv-dotnet-build plugins/dotnet/bin/dv-dotnet-test plugins/dotnet/bin/dv-dotnet-lint`
  Prüfen: `git ls-files -s plugins/dotnet/bin` — erwartet: `100755` bei den drei Start-Befehlen, `100644` bei `lib/run-toolchain.js`; `git check-ignore --no-index -v plugins/dotnet/bin/dv-dotnet-test` — erwartet: keine Ausgabe, Exit 1.
  `git commit -m "feat(dotnet): add dv-dotnet start commands"`

### Task 2: .NET-Skripte und ihre Tests umziehen

**ACs:** AC-06, AC-07, AC-08, AC-32

**Dateien:**
- Create: `plugins/dotnet/scripts/toolchain/dotnet-build.js`
- Create: `plugins/dotnet/scripts/toolchain/dotnet-test.js`
- Create: `plugins/dotnet/scripts/toolchain/dotnet-lint.js`
- Modify: `plugins/forge/scripts/toolchain/dotnet-build.js` · `dotnet-build`
- Modify: `plugins/forge/scripts/toolchain/dotnet-test.js` · `dotnet-test`
- Modify: `plugins/forge/scripts/toolchain/dotnet-lint.js` · `dotnet-lint`
- Create: `plugins/dotnet/tests/lib/fake-toolchain.js`
- Test: `plugins/forge/tests/toolchain-dotnet-build.test.js` · `dotnet-build.js`
- Test: `plugins/forge/tests/toolchain-dotnet-test.test.js` · `dotnet-test.js`
- Test: `plugins/forge/tests/toolchain-dotnet-lint.test.js` · `dotnet-lint.js`

**Interfaces:**
- Consumes: `scriptFor(starterFile)` aus Task 1; die Start-Befehle finden die Skripte nach diesem Task.
- Produces: `plugins/dotnet/scripts/toolchain/dotnet-build.js`, `dotnet-test.js`, `dotnet-lint.js` unverändert (Aufruf `node <skript> [--path <sln|csproj|ordner>] [--log <datei>] [--timeout <sekunden>] [-- <weitere Argumente>]`, `dotnet-build` und `dotnet-lint` zusätzlich `[--show errors|warnings|all]`); ihre Tests unter `plugins/dotnet/tests/toolchain-dotnet-{build,test,lint}.test.js`.
- Produces: `fakeDotnet(output: string, exitCode?: number): { dir, env, args }` und `tempDir(prefix: string): string` aus `plugins/dotnet/tests/lib/fake-toolchain.js`.

- [ ] **Schritt 1: Absicherungstests nennen**
  Bestehende Tests sichern das Verhalten: `plugins/forge/tests/toolchain-dotnet-test.test.js` (darin `parse_FailedTest_NameWithErrorMessageAndSummary` für AC-06: Status, Zusammenfassung, Fehler, kein Volllog), `toolchain-dotnet-build.test.js` und `toolchain-dotnet-lint.test.js`. Sie ziehen unverändert mit. Nur ihr Ersatz-`dotnet` (`tests/lib/fake-toolchain.js`) bekommt im Plugin eine eigene Kopie.
- [ ] **Schritt 2: Verschieben und Ersatz-Helfer anlegen**
  Befehl im Repo-Wurzelordner (Bash-Tool): `mkdir -p plugins/dotnet/scripts/toolchain plugins/dotnet/tests/lib`, danach je `n` in `build`, `test`, `lint`: `git mv plugins/forge/scripts/toolchain/dotnet-$n.js plugins/dotnet/scripts/toolchain/dotnet-$n.js` und `git mv plugins/forge/tests/toolchain-dotnet-$n.test.js plugins/dotnet/tests/toolchain-dotnet-$n.test.js`.
  Datei `plugins/dotnet/tests/lib/fake-toolchain.js` neu anlegen (Teilmenge der bisherigen Helfer, wörtlich übernommen):

````js
'use strict';

// Ersatz für dotnet: gibt eine vorgegebene Ausgabe aus und merkt sich die Argumente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FAKE = [
  "const fs = require('node:fs');",
  "fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(process.argv.slice(2)));",
  "process.stdout.write(fs.readFileSync(process.env.FAKE_OUTPUT, 'utf8'));",
  "setTimeout(() => process.exit(Number(process.env.FAKE_EXIT ?? 0)), Number(process.env.FAKE_SLEEP_MS ?? 0));",
].join('\n');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fakeEnv(dir, output, exitCode) {
  const outputFile = path.join(dir, 'fake-output.txt');
  fs.writeFileSync(outputFile, output);
  return { FAKE_OUTPUT: outputFile, FAKE_EXIT: String(exitCode), FAKE_ARGS: path.join(dir, 'fake-args.json') };
}

// Legt eine ausführbare Datei "dotnet" in einen eigenen PATH-Ordner (nur POSIX).
function fakeDotnet(output, exitCode = 0) {
  const dir = tempDir('dv-forge-dotnet-');
  const script = path.join(dir, 'dotnet');
  fs.writeFileSync(script, `#!${process.execPath}\n${FAKE}\n`);
  fs.chmodSync(script, 0o755);
  const env = { ...process.env, ...fakeEnv(dir, output, exitCode), PATH: `${dir}${path.delimiter}${process.env.PATH}` };
  return { dir, env, args: () => JSON.parse(fs.readFileSync(env.FAKE_ARGS, 'utf8')) };
}

module.exports = { tempDir, fakeDotnet };
````

- [ ] **Schritt 3: Absicherungstests laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/toolchain-dotnet-build.test.js plugins/dotnet/tests/toolchain-dotnet-lint.test.js plugins/dotnet/tests/toolchain-dotnet-test.test.js plugins/dotnet/tests/run-toolchain.test.js` — erwartet: PASS, 0 fail (unter Windows 6 übersprungene Tests); rot ist ein Befund, kein Grund, Skripte zu ändern.
- [ ] **Schritt 4: Unverändertheit der Skripte prüfen (AC-07)**
  Befehl: `git add plugins/dotnet && git diff --cached -M --summary` — erwartet: sechs Zeilen `rename plugins/{forge => dotnet}/…/dotnet-…(100%)` für die drei Skripte und die drei Tests. Eine Zeile unter 100 % bei Skript oder Test ist ein Befund.
- [ ] **Schritt 5: Start-Befehl gegen das echte Skript (AC-08, AC-32)**
  Befehl im Bash-Tool, im Repo-Wurzelordner: `PATH="$(pwd)/plugins/dotnet/bin:$PATH" dv-dotnet-test --path plugins/dotnet` — erwartet: die erste Ausgabezeile beginnt mit `dotnet-test: FEHLGESCHLAGEN` (der Ordner hat kein Projekt; ohne installiertes .NET SDK lautet die Fehlerzeile „dotnet nicht gefunden“, die Statuszeile bleibt gleich), darunter `Zusammenfassung:` und `Fehler (`, am Ende `Log: <datei>`; kein Volllog in der Ausgabe.
- [ ] **Schritt 6: Commit**
  `git add plugins/dotnet plugins/forge` · `git commit -m "feat(dotnet): move dotnet toolchain scripts and tests from dv-forge"`

### Task 3: .NET-Skill toolchain

**ACs:** AC-01, AC-04, AC-05, AC-09, AC-28

**Dateien:**
- Create: `plugins/dotnet/skills/toolchain/SKILL.md`
- Create: `plugins/dotnet/tests/lib/markdown.js`
- Test: `plugins/dotnet/tests/skill-toolchain.test.js`

**Interfaces:**
- Produces: Skill `dv-dotnet:toolchain` (`name: toolchain`).
- Produces: `readMarkdown(file: string): { fields: Record<string, string>, body: string }`, `wordCount(text: string): number` und `readText(file: string): string` aus `plugins/dotnet/tests/lib/markdown.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/dotnet/tests/lib/markdown.js` neu anlegen:

````js
'use strict';

const fs = require('node:fs');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readMarkdown(file) {
  const text = readText(file);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) return { fields: {}, body: text };
  const fields = Object.fromEntries(match[1].split('\n').map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body: match[2] };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

module.exports = { readText, readMarkdown, wordCount };
````

  Datei `plugins/dotnet/tests/skill-toolchain.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'toolchain', 'SKILL.md'));
const TRIGGERS = ['baue', 'teste', 'kompiliere', 'lint', 'führe die Tests aus', 'Build prüfen', 'laufen die Tests durch'];
const COMMANDS = ['dv-dotnet-build', 'dv-dotnet-test', 'dv-dotnet-lint'];

test('frontmatter_Fields_AreOnlyNameAndDescription', () => {
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'toolchain');
});

test('description_Text_StartsWithUseWhenAndStaysShort', () => {
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
});

test('description_Triggers_NamesEveryPhraseOfTheSpec', () => {
  for (const phrase of TRIGGERS) assert.ok(fields.description.includes(phrase), `${phrase} fehlt`);
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('description_Tools_NamesTheToolsItReplaces', () => {
  for (const tool of ['build_dotnet_solution', 'test_dotnet_solution', 'dotnet build']) assert.ok(fields.description.includes(tool), `${tool} fehlt`);
});

test('body_Length_StaysUnder200Words', () => {
  assert.ok(wordCount(body) < 200, `${wordCount(body)} Wörter`);
});

test('body_Commands_NamesBashAndAllThreeCommands', () => {
  assert.match(body, /\*\*Bash-Tool\*\*/);
  for (const command of COMMANDS) assert.ok(body.includes(`\`${command} --path <Solution>\``), `${command} fehlt`);
});

test('body_PowerShell_IsNeverAnInvocation', () => {
  assert.doesNotMatch(body, /```(?:powershell|pwsh)/i);
  assert.match(body, /nicht im PowerShell-Tool/);
});

test('body_SolutionRule_TakesTheOnlyOneOrAsksAndStartsNothing', () => {
  assert.match(body, /genau eine Solution, nimm sie/);
  assert.match(body, /mehrere, frag, welche gemeint ist, und starte nichts/);
});

test('body_References_HaveNoAtLinks', () => {
  assert.doesNotMatch(body, /(^|\s)@[\w./-]+/);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/skill-toolchain.test.js` — erwartet: FAIL, `ENOENT … skills\toolchain\SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/dotnet/skills/toolchain/SKILL.md` neu anlegen:

````markdown
---
name: toolchain
description: Use when the user asks to build, compile, test or lint .NET code ("baue", "teste", "kompiliere", "lint", "führe die Tests aus", "Build prüfen", "laufen die Tests durch") and before any dev-mcp build_dotnet_solution, test_dotnet_solution or raw dotnet build/test call.
---

# .NET: bauen, testen, linten

Die Befehle laufen im **Bash-Tool**, nicht im PowerShell-Tool. Sie liefern Status, Zusammenfassung und Fehler; das Volllog liegt in einer Datei, der Verweis steht in der Ausgabe. Lade das Log nie in den Kontext.

| Aufgabe | Befehl |
|---|---|
| Bauen | `dv-dotnet-build --path <Solution>` |
| Testen | `dv-dotnet-test --path <Solution>` |
| Linten | `dv-dotnet-lint --path <Solution>` |

`<Solution>` ist eine .sln/.slnx, ein csproj oder ein Ordner. Argumente nach `--` gehen an dotnet weiter, z. B. `dv-dotnet-test --path <Solution> -- --filter <Name>`. Ohne gültige Argumente zeigt der Befehl seine Syntax.

**Ohne genannten Pfad:** Gibt es im Repo genau eine Solution, nimm sie. Gibt es mehrere, frag, welche gemeint ist, und starte nichts.

Nicht `build_dotnet_solution` oder `test_dotnet_solution` von dev-mcp und nicht `dotnet build|test` in der Shell.
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/skill-toolchain.test.js` — erwartet: PASS, 10 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/dotnet` · `git commit -m "feat(dotnet): add toolchain skill"`

### Task 4: .NET-Init-Bausteine

**ACs:** AC-12, AC-24, AC-26

**Dateien:**
- Create: `plugins/dotnet/scripts/lib/project-setup.js`
- Test: `plugins/dotnet/tests/project-setup.test.js`

**Interfaces:**
- Produces: aus `plugins/dotnet/scripts/lib/project-setup.js` (`stack` = `{ plugin: string, skill: string }`) `MCP_SERVERS: { context7, 'microsoft-learn' }` (je `{ entry, sentence }`), `withStackBlock(text: string, stack): string`, `withMcpSentence(text: string, server: string): string`, `withMcpServer(jsonText: string | null, server: string): { status: 'angelegt' | 'ergaenzt' | 'vorhanden' | 'ungueltig', text: string }`, `applyClaudeMd(root: string, edit: (text: string) => string): boolean`, `applyMcpServer(root: string, server: string): string` (Status wie oben), `hookMarkerFile(stack): string` (`.claude/<stack.plugin>.json`), `writeHookMarker(root: string, stack): string`, `hookEnabled(startDir: string, stack): boolean`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/dotnet/tests/project-setup.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const setup = require('../scripts/lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };
const count = (text, part) => text.split(part).length - 1;
const tempProject = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-project-'));

test('withStackBlock_EmptyText_CreatesBlockNamingSkillWithoutCommandOrPath', () => {
  const text = setup.withStackBlock('', STACK);
  assert.ok(text.includes('`dv-dotnet:toolchain`'));
  assert.doesNotMatch(text, /dv-dotnet-(build|test|lint)|--path|[\\/]/);
  assert.ok(text.endsWith('\n'));
});

test('withStackBlock_ExistingText_AppendsAfterBlankLineAndKeepsEveryLine', () => {
  const old = '# Projekt\n\n- Build und Test über dev-mcp\n';
  const text = setup.withStackBlock(old, STACK);
  assert.ok(text.startsWith(`${old}\n<!-- dv-dotnet:start -->`));
});

test('withStackBlock_CalledTwice_KeepsExactlyOneBlock', () => {
  const once = setup.withStackBlock('# Projekt\n', STACK);
  const twice = setup.withStackBlock(once, STACK);
  assert.equal(twice, once);
  assert.equal(count(twice, '<!-- dv-dotnet:start -->'), 1);
});

test('withStackBlock_StaleBlock_ReplacesContentBetweenMarkers', () => {
  const stale = '# P\n<!-- dv-dotnet:start -->\nalt\n<!-- dv-dotnet:end -->\nRest\n';
  const text = setup.withStackBlock(stale, STACK);
  assert.ok(!text.includes('alt'));
  assert.ok(text.includes('`dv-dotnet:toolchain`'));
  assert.ok(text.endsWith('<!-- dv-dotnet:end -->\nRest\n'));
});

test('withStackBlock_CrlfText_UsesCrlfThroughout', () => {
  const text = setup.withStackBlock('# P\r\n', STACK);
  assert.ok(text.includes('\r\n'));
  assert.ok(!/(?<!\r)\n/.test(text));
});

test('withMcpSentence_NewServer_CreatesBlockWithOneSentence', () => {
  const text = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.ok(text.includes('`context7`'));
});

test('withMcpSentence_SecondServer_AddsSentenceToTheSameBlock', () => {
  const text = setup.withMcpSentence(setup.withMcpSentence('# P\n', 'context7'), 'microsoft-learn');
  assert.equal(count(text, '<!-- dv-mcp:start -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('withMcpSentence_SentenceAlreadyThere_LeavesTextUnchanged', () => {
  const once = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(setup.withMcpSentence(once, 'context7'), once);
});

test('withMcpServer_NoFile_CreatesConfigWithHttpEntry', () => {
  const { status, text } = setup.withMcpServer(null, 'context7');
  assert.equal(status, 'angelegt');
  assert.deepEqual(JSON.parse(text), { mcpServers: { context7: { type: 'http', url: 'https://mcp.context7.com/mcp' } } });
});

test('withMcpServer_MicrosoftLearn_UsesOfficialEndpoint', () => {
  const { text } = setup.withMcpServer(null, 'microsoft-learn');
  assert.equal(JSON.parse(text).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
});

test('withMcpServer_EntryExists_KeepsFileUntouched', () => {
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  const result = setup.withMcpServer(json, 'context7');
  assert.deepEqual(result, { status: 'vorhanden', text: json });
});

test('withMcpServer_OtherEntries_StayUnchangedWhenServerIsAdded', () => {
  const foo = { command: 'x', args: ['--y'] };
  const { status, text } = setup.withMcpServer(JSON.stringify({ other: 1, mcpServers: { foo } }), 'context7');
  assert.equal(status, 'ergaenzt');
  const config = JSON.parse(text);
  assert.deepEqual(config.mcpServers.foo, foo);
  assert.equal(config.other, 1);
  assert.ok(config.mcpServers.context7);
});

test('withMcpServer_InvalidJson_ReportsInvalidAndKeepsText', () => {
  assert.deepEqual(setup.withMcpServer('{ kaputt', 'context7'), { status: 'ungueltig', text: '{ kaputt' });
  assert.equal(setup.withMcpServer('[]', 'context7').status, 'ungueltig');
  assert.equal(setup.withMcpServer('{"mcpServers": []}', 'context7').status, 'ungueltig');
});

test('applyClaudeMd_MissingFile_CreatesItAndReportsChange', () => {
  const root = tempProject();
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), true);
  assert.ok(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').includes('dv-dotnet:toolchain'));
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), false);
});

test('applyMcpServer_InvalidFile_LeavesBytesUnchanged', () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  assert.equal(setup.applyMcpServer(root, 'context7'), 'ungueltig');
  assert.equal(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8'), '{ kaputt');
});

test('applyMcpServer_NoFile_WritesConfigToProjectRoot', () => {
  const root = tempProject();
  assert.equal(setup.applyMcpServer(root, 'microsoft-learn'), 'angelegt');
  assert.ok(JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')).mcpServers['microsoft-learn']);
});

test('hookEnabled_MarkerWritten_IsFoundFromSubfolder', () => {
  const root = tempProject();
  const sub = path.join(root, 'src', 'Api');
  fs.mkdirSync(sub, { recursive: true });
  setup.writeHookMarker(root, STACK);
  assert.equal(setup.hookEnabled(sub, STACK), true);
});

test('hookEnabled_NoMarkerOrFalseOrBroken_IsFalse', () => {
  const root = tempProject();
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.mkdirSync(path.join(root, '.claude'));
  fs.writeFileSync(path.join(root, '.claude', 'dv-dotnet.json'), '{"hook": false}');
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.writeFileSync(path.join(root, '.claude', 'dv-dotnet.json'), '{ kaputt');
  assert.equal(setup.hookEnabled(root, STACK), false);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/project-setup.test.js` — erwartet: FAIL, `Cannot find module '../scripts/lib/project-setup'`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/dotnet/scripts/lib/project-setup.js` neu anlegen. Die Datei ist in dv-dotnet und dv-angular inhaltsgleich (Task 10):

````js
'use strict';

// Bausteine der Init-Skills: Hinweisblock und MCP-Sätze in der CLAUDE.md, MCP-Einträge in der .mcp.json, Schalter für den Hook.
// Die Textfunktionen sind rein; nur die Funktionen ab applyClaudeMd berühren Dateien.
// Diese Datei ist in dv-dotnet und dv-angular inhaltsgleich, weil Plugins keine Dateien teilen.

const fs = require('node:fs');
const path = require('node:path');

const MCP_START = '<!-- dv-mcp:start -->';
const MCP_END = '<!-- dv-mcp:end -->';

const MCP_SERVERS = {
  context7: {
    entry: { type: 'http', url: 'https://mcp.context7.com/mcp' },
    sentence: 'Bei Fragen zu Bibliotheken und Frameworks den MCP `context7` nutzen.',
  },
  'microsoft-learn': {
    entry: { type: 'http', url: 'https://learn.microsoft.com/api/mcp' },
    sentence: 'Bei Fragen zur Microsoft- und .NET-Dokumentation den MCP `microsoft-learn` nutzen.',
  },
};

function eolOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appended(text, block) {
  const eol = eolOf(text);
  if (text === '') return `${block}${eol}`;
  const gap = text.endsWith(eol) ? eol : `${eol}${eol}`;
  return `${text}${gap}${block}${eol}`;
}

function withBlock(text, start, end, block) {
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  return pattern.test(text) ? text.replace(pattern, () => block) : appended(text, block);
}

// Hinweisblock eines Stack-Plugins; ohne Befehle und ohne Pfade, nur der Skill-Name.
function withStackBlock(text, stack) {
  const start = `<!-- ${stack.plugin}:start -->`;
  const end = `<!-- ${stack.plugin}:end -->`;
  const block = [
    start,
    `## ${stack.plugin}`,
    '',
    `- Bauen, Testen, Linten: Skill \`${stack.skill}\` aufrufen, bevor gebaut, getestet oder gelintet wird.`,
    end,
  ].join(eolOf(text));
  return withBlock(text, start, end, block);
}

// Ein Satz je MCP, erkennbar an seiner Markierung; der zweite Init-Lauf, gleich welches Plugin, fügt nichts hinzu.
function withMcpSentence(text, server) {
  const marker = `<!-- dv-mcp:${server} -->`;
  if (text.includes(marker)) return text;
  const eol = eolOf(text);
  const line = `- ${MCP_SERVERS[server].sentence} ${marker}`;
  if (text.includes(MCP_END)) return text.replace(MCP_END, () => `${line}${eol}${MCP_END}`);
  return appended(text, [MCP_START, '## MCP-Server', '', line, MCP_END].join(eol));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObject(text) {
  try {
    const value = JSON.parse(text);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// jsonText ist der Inhalt der .mcp.json oder null, wenn es sie nicht gibt.
function withMcpServer(jsonText, server) {
  const entry = MCP_SERVERS[server].entry;
  if (jsonText === null) return { status: 'angelegt', text: toJson({ mcpServers: { [server]: entry } }) };
  const config = parseObject(jsonText);
  const servers = config?.mcpServers ?? {};
  if (config === null || !isPlainObject(servers)) return { status: 'ungueltig', text: jsonText };
  if (Object.hasOwn(servers, server)) return { status: 'vorhanden', text: jsonText };
  return { status: 'ergaenzt', text: toJson({ ...config, mcpServers: { ...servers, [server]: entry } }) };
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// Wendet edit auf die CLAUDE.md im Wurzelordner an und legt sie an, falls sie fehlt. Gibt zurück, ob sich etwas änderte.
function applyClaudeMd(root, edit) {
  const file = path.join(root, 'CLAUDE.md');
  const before = readIfExists(file) ?? '';
  const after = edit(before);
  if (after === before) return false;
  fs.writeFileSync(file, after);
  return true;
}

// Trägt den MCP in die .mcp.json ein. Gibt den Status zurück: angelegt, ergaenzt, vorhanden oder ungueltig.
function applyMcpServer(root, server) {
  const file = path.join(root, '.mcp.json');
  const { status, text } = withMcpServer(readIfExists(file), server);
  if (status === 'angelegt' || status === 'ergaenzt') fs.writeFileSync(file, text);
  return status;
}

function hookMarkerFile(stack) {
  return path.join('.claude', `${stack.plugin}.json`);
}

function writeHookMarker(root, stack) {
  const file = path.join(root, hookMarkerFile(stack));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toJson({ hook: true }));
  return file;
}

function readHookMarker(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).hook === true;
  } catch {
    return null;
  }
}

// Die erste lesbare Schalter-Datei ab startDir aufwärts entscheidet; ohne Datei ist der Hook aus.
function hookEnabled(startDir, stack) {
  for (let dir = path.resolve(startDir); ; dir = path.dirname(dir)) {
    const marker = readHookMarker(path.join(dir, hookMarkerFile(stack)));
    if (marker !== null) return marker;
    if (path.dirname(dir) === dir) return false;
  }
}

module.exports = { MCP_SERVERS, withStackBlock, withMcpSentence, withMcpServer, applyClaudeMd, applyMcpServer, hookMarkerFile, writeHookMarker, hookEnabled };
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/project-setup.test.js` — erwartet: PASS, 18 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/dotnet` · `git commit -m "feat(dotnet): add project setup building blocks for init"`

### Task 5: .NET-Init-Skript und Init-Skill

**ACs:** AC-11, AC-13, AC-14, AC-21, AC-22, AC-23, AC-25, AC-27, AC-37

**Dateien:**
- Modify: `plugins/dotnet/scripts/lib/project-setup.js` · `module.exports`
- Create: `plugins/dotnet/scripts/init.js`
- Create: `plugins/dotnet/skills/init/SKILL.md`
- Test: `plugins/dotnet/tests/init.test.js`
- Test: `plugins/dotnet/tests/skill-init.test.js`

**Interfaces:**
- Consumes: `withStackBlock`, `withMcpSentence`, `applyClaudeMd`, `applyMcpServer`, `writeHookMarker`, `hookMarkerFile`, `MCP_SERVERS` aus Task 4.
- Produces: der Init-Ablauf in `plugins/dotnet/scripts/lib/project-setup.js`: `parseArgs(argv: string[]): { cwd: string, hook: 'ja' | 'nein', mcp: string[] }` (wirft bei unbekanntem Schalter, fehlendem Wert, `--hook` außer `ja|nein` und unbekanntem MCP einen Fehler mit dem Text `Aufruf: …`), `initProject(args: { cwd: string, hook: string, mcp: string[] }, stack): string[]` (Meldungszeilen) und `runInit(stack, argv: string[]): void` (gibt die Meldung auf stdout aus, bei falschen Argumenten die Syntax auf stderr und Exit 2).
- Produces: `parseArgs(argv)` und `initProject(args): string[]` aus `plugins/dotnet/scripts/init.js`, dort mit `STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' }` gebunden; Aufruf `node init.js [--cwd <ordner>] [--hook ja|nein] [--mcp <context7,microsoft-learn>]`, Exit 2 bei falschen Argumenten. `init.js` enthält nur `STACK`, den Aufruf von `runInit` und die Exporte.
- Produces: Skill `dv-dotnet:init` (`name: init`, manuell).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/dotnet/tests/init.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { initProject, parseArgs } = require('../scripts/init');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'init.js');
const count = (text, part) => text.split(part).length - 1;
const project = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-init-'));
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const args = (root, overrides = {}) => ({ cwd: root, hook: 'nein', mcp: [], ...overrides });

test('parseArgs_NoArguments_DefaultsToNoHookAndNoMcp', () => {
  const parsed = parseArgs([]);
  assert.equal(parsed.hook, 'nein');
  assert.deepEqual(parsed.mcp, []);
});

test('parseArgs_AllFlags_AreRead', () => {
  assert.deepEqual(parseArgs(['--cwd', 'x', '--hook', 'ja', '--mcp', 'context7,microsoft-learn']),
    { cwd: 'x', hook: 'ja', mcp: ['context7', 'microsoft-learn'] });
});

test('parseArgs_UnknownFlagHookValueOrMcp_Throws', () => {
  assert.throws(() => parseArgs(['--foo', 'x']), /Aufruf:/);
  assert.throws(() => parseArgs(['--hook', 'vielleicht']), /Aufruf:/);
  assert.throws(() => parseArgs(['--mcp', 'unbekannt']), /Unbekannter MCP: unbekannt/);
  assert.throws(() => parseArgs(['--hook']), /Aufruf:/);
});

test('initProject_NoClaudeMd_CreatesItWithHintBlockAndNothingElse', () => {
  const root = project();
  initProject(args(root));
  const text = read(root, 'CLAUDE.md');
  assert.ok(text.includes('`dv-dotnet:toolchain`'));
  assert.doesNotMatch(text, /dv-dotnet-(build|test|lint)|--path/);
  assert.ok(!fs.existsSync(path.join(root, '.mcp.json')));
  assert.ok(!fs.existsSync(path.join(root, '.claude', 'dv-dotnet.json')));
  assert.ok(!text.includes('dv-mcp'));
});

test('initProject_RunTwice_KeepsExactlyOneBlock', () => {
  const root = project();
  initProject(args(root));
  initProject(args(root));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-dotnet:start -->'), 1);
});

test('initProject_OldDevMcpRule_StaysUnchanged', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n- Build und Test über dev-mcp\n');
  initProject(args(root));
  assert.ok(read(root, 'CLAUDE.md').startsWith('# P\n\n- Build und Test über dev-mcp\n'));
});

test('initProject_HookYes_WritesTheSwitchFile', () => {
  const root = project();
  const lines = initProject(args(root, { hook: 'ja' }));
  assert.deepEqual(JSON.parse(read(root, '.claude/dv-dotnet.json')), { hook: true });
  assert.ok(lines.some((line) => line.startsWith('Hook: eingerichtet')));
});

test('initProject_Context7Yes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers.context7.url, 'https://mcp.context7.com/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_MicrosoftLearnYes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['microsoft-learn'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('initProject_ExistingEntries_StayUnchangedAndSentenceIsStillWritten', () => {
  const root = project();
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  fs.writeFileSync(path.join(root, '.mcp.json'), json);
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), json);
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_SentenceWrittenByTheOtherPlugin_IsNotWrittenAgain', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n<!-- dv-mcp:start -->\n## MCP-Server\n\n- Anderer Wortlaut. <!-- dv-mcp:context7 -->\n<!-- dv-mcp:end -->\n');
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_InvalidMcpJson_KeepsFileWarnsAndStillWritesBlockAndHook', () => {
  const root = project();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  const lines = initProject(args(root, { hook: 'ja', mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), '{ kaputt');
  assert.ok(lines.some((line) => /WARNUNG MCP context7: \.mcp\.json ist kein gültiges JSON/.test(line)));
  assert.ok(!read(root, 'CLAUDE.md').includes('dv-mcp:context7'));
  assert.ok(read(root, 'CLAUDE.md').includes('`dv-dotnet:toolchain`'));
  assert.ok(fs.existsSync(path.join(root, '.claude', 'dv-dotnet.json')));
});

test('cli_DefaultAnswers_PrintsReportAndExitsZero', () => {
  const root = project();
  const result = spawnSync(process.execPath, [SCRIPT, '--cwd', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CLAUDE\.md: Hinweisblock dv-dotnet geschrieben/);
  assert.match(result.stdout, /Hook: nicht eingerichtet/);
});

test('cli_BadArguments_ExitsTwoWithUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--hook', 'vielleicht'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf:/);
});
````

  Datei `plugins/dotnet/tests/skill-init.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'));
const count = (text, part) => text.split(part).length - 1;

test('frontmatter_Fields_ManualOnlyUseWhen', () => {
  assert.equal(fields.name, 'init');
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
  assert.equal(fields['disable-model-invocation'], 'true');
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('body_Length_StaysUnder500WordsAndUsesPluginRoot', () => {
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
});

test('body_Questions_AskHookAndBothMcpsSeparatelyWithDefaultNo', () => {
  for (const question of ['Hook einrichten?', 'Microsoft Learn einrichten?', 'Context7 einrichten?']) {
    assert.ok(body.includes(question), `${question} fehlt`);
  }
  assert.equal(count(body, '(Standard: Nein)'), 3);
});

test('body_McpQuestions_WarnAboutAlreadyInstalledPlugin', () => {
  assert.equal(count(body, 'Ist der MCP schon als Plugin installiert, wähle Nein.'), 2);
});

test('body_Script_IsCalledThroughNodeWithPluginRoot', () => {
  assert.ok(body.includes('node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>'));
});

test('body_ExistingRules_AreLeftToTheHuman', () => {
  assert.match(body, /Build und Test über dev-mcp/);
  assert.match(body, /von Hand/);
});
````

- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/init.test.js plugins/dotnet/tests/skill-init.test.js` — erwartet: FAIL, `Cannot find module '../scripts/init'` und `ENOENT … skills\init\SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/dotnet/scripts/lib/project-setup.js` den Init-Ablauf ergänzen, damit `init.js` in beiden Plugins nur den Stack hält und der Ablauf mit der ohnehin doppelten, per `cmp` geprüften Datei wandert (Edit-Tool, exakt, drei Stellen):

Alt:

````js
// Die Textfunktionen sind rein; nur die Funktionen ab applyClaudeMd berühren Dateien.
````

Neu:

````js
// Die Textfunktionen sind rein; nur die Funktionen ab applyClaudeMd berühren Dateien.
// Ab parseArgs folgt der Ablauf des Init; init.js jedes Plugins ruft ihn mit seinem Stack auf.
````

Alt:

````js
const fs = require('node:fs');
const path = require('node:path');

const MCP_START = '<!-- dv-mcp:start -->';
````

Neu:

````js
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MCP_START = '<!-- dv-mcp:start -->';
````

Alt:

````js
module.exports = { MCP_SERVERS, withStackBlock, withMcpSentence, withMcpServer, applyClaudeMd, applyMcpServer, hookMarkerFile, writeHookMarker, hookEnabled };
````

Neu:

````js
const USAGE = 'Aufruf: node init.js [--cwd <ordner>] [--hook ja|nein] [--mcp <context7,microsoft-learn>]\n';
const MCP_ENTRY_TEXT = { angelegt: 'angelegt', ergaenzt: 'ergänzt', vorhanden: 'Eintrag vorhanden' };

class UsageError extends Error {}

const FLAGS = {
  '--cwd': (args, value) => { args.cwd = value; },
  '--hook': (args, value) => { args.hook = value; },
  '--mcp': (args, value) => { args.mcp = value === '' ? [] : value.split(','); },
};

function parseArgs(argv) {
  const args = { cwd: process.cwd(), hook: 'nein', mcp: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const set = FLAGS[argv[index]];
    if (!set || argv[index + 1] === undefined) throw new UsageError(USAGE);
    set(args, argv[index + 1]);
  }
  if (!['ja', 'nein'].includes(args.hook)) throw new UsageError(USAGE);
  const unknown = args.mcp.find((server) => !Object.hasOwn(MCP_SERVERS, server));
  if (unknown) throw new UsageError(`Unbekannter MCP: ${unknown}\n${USAGE}`);
  return args;
}

function projectRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : path.resolve(cwd);
}

function toPosix(file) {
  return file.split(path.sep).join('/');
}

function blockLines(root, stack) {
  const changed = applyClaudeMd(root, (text) => withStackBlock(text, stack));
  return [`CLAUDE.md: Hinweisblock ${stack.plugin} ${changed ? 'geschrieben' : 'unverändert'}`];
}

function hookLines(root, hook, stack) {
  const marker = toPosix(hookMarkerFile(stack));
  if (hook !== 'ja') return [`Hook: nicht eingerichtet. Ein vorhandener Schalter bleibt; zum Ausschalten ${marker} löschen.`];
  writeHookMarker(root, stack);
  return [`Hook: eingerichtet (${marker}). Die Datei committen, damit auch Worktrees den Hook haben.`];
}

function mcpLines(root, server) {
  const status = applyMcpServer(root, server);
  if (status === 'ungueltig') return [`WARNUNG MCP ${server}: .mcp.json ist kein gültiges JSON; weder Eintrag noch Satz angelegt.`];
  const changed = applyClaudeMd(root, (text) => withMcpSentence(text, server));
  return [`MCP ${server}: .mcp.json ${MCP_ENTRY_TEXT[status]}`, `CLAUDE.md: Satz zu ${server} ${changed ? 'geschrieben' : 'schon vorhanden'}`];
}

// Führt die Antworten des Init-Skills für einen Stack aus und gibt die Meldungszeilen zurück.
function initProject(args, stack) {
  const root = projectRoot(args.cwd);
  return [
    `Projekt: ${toPosix(root)}`,
    ...blockLines(root, stack),
    ...hookLines(root, args.hook, stack),
    ...args.mcp.flatMap((server) => mcpLines(root, server)),
    'Bestehende Regeln wie „Build und Test über dev-mcp“ ändert der Init nicht; die entfernst du von Hand.',
  ];
}

// Ablauf von init.js: Argumente lesen, ausführen, Meldung ausgeben; bei falschen Argumenten Syntax und Exit 2.
function runInit(stack, argv) {
  try {
    process.stdout.write(`${initProject(parseArgs(argv), stack).join('\n')}\n`);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(error.message);
    process.exit(2);
  }
}

module.exports = {
  MCP_SERVERS, withStackBlock, withMcpSentence, withMcpServer, applyClaudeMd, applyMcpServer, hookMarkerFile, writeHookMarker, hookEnabled,
  parseArgs, initProject, runInit,
};
````

  Datei `plugins/dotnet/scripts/init.js` neu anlegen:

````js
#!/usr/bin/env node
'use strict';

// Init für dv-dotnet: Hinweisblock in der CLAUDE.md, auf Wunsch Hook-Schalter und MCP-Server.
// Die Fragen stellt der Skill init; den Ablauf hält lib/project-setup.js, hier steht nur der Stack.

const setup = require('./lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };

function initProject(args) {
  return setup.initProject(args, STACK);
}

if (require.main === module) setup.runInit(STACK, process.argv.slice(2));

module.exports = { parseArgs: setup.parseArgs, initProject };
````

  Datei `plugins/dotnet/skills/init/SKILL.md` neu anlegen:

````markdown
---
name: init
description: Use when dv-dotnet is set up in a project for the first time, or when the project CLAUDE.md should point agents to the .NET toolchain skill, to the hook that rejects other build and test tools, or to the Context7 and Microsoft Learn MCP servers.
disable-model-invocation: true
---

# dv-dotnet einrichten

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du stellst drei Fragen, jede mit Standard **Nein**, und ein Skript führt die Antworten aus. Bestehende Regeln der CLAUDE.md änderst du nie.

## Ablauf
1. Frage nacheinander, eine pro Nachricht:
   - „Hook einrichten? Er lehnt `dotnet build|test` im Bash-Tool und die Build/Test-Tools von dev-mcp ab und nennt den Skill `dv-dotnet:toolchain`. (Standard: Nein)“
   - „Microsoft Learn einrichten? Trägt den MCP `microsoft-learn` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
   - „Context7 einrichten? Trägt den MCP `context7` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
2. `node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>`. `<liste>` enthält die mit Ja beantworteten MCPs (`microsoft-learn`, `context7`), ohne Ja ist sie `""`.
3. Gib die Ausgabe des Skripts wieder. Sage danach: Regeln wie „Build und Test über dev-mcp“ entfernt der Mensch von Hand; nach neuen MCP-Einträgen Claude Code neu starten.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Hook oder MCP ohne Antwort einrichten | Standard ist Nein. |
| CLAUDE.md oder `.mcp.json` selbst bearbeiten | Nur das Skript ändert sie. |
````

- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/init.test.js plugins/dotnet/tests/skill-init.test.js plugins/dotnet/tests/project-setup.test.js` — erwartet: PASS, 39 Tests (14, 7 und 18)
- [ ] **Schritt 5: Commit**
  `git add plugins/dotnet` · `git commit -m "feat(dotnet): add init skill and init script"`

### Task 6: .NET-Hook und Plugin-Version

**ACs:** AC-15, AC-16, AC-18, AC-34, AC-38

**Dateien:**
- Create: `plugins/dotnet/scripts/toolchain-guard.js`
- Create: `plugins/dotnet/hooks/hooks.json`
- Modify: `plugins/dotnet/.claude-plugin/plugin.json:3` · `"version": "1.1.2"`
- Test: `plugins/dotnet/tests/toolchain-guard.test.js`

**Interfaces:**
- Consumes: `hookEnabled(startDir, stack)`, `writeHookMarker(root, stack)` aus Task 4; `initProject(args)` aus Task 5.
- Produces: `decide(input: { tool_name: string, tool_input?: { command?: string }, cwd?: string }): string | null` (Begründung der Ablehnung oder `null`) und `blockedAction(input): string | null` aus `plugins/dotnet/scripts/toolchain-guard.js`; als Skript liest es den Hook-Aufruf als JSON von stdin und schreibt bei Ablehnung `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}` auf stdout, bei Fehlern eine Zeile `dv-dotnet guard: <fehler>` auf stderr und immer Exit 0.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/dotnet/tests/toolchain-guard.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/toolchain-guard');
const { initProject } = require('../scripts/init');
const setup = require('../scripts/lib/project-setup');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain-guard.js');
const HOOKS = path.join(__dirname, '..', 'hooks', 'hooks.json');
const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };

// Projekt mit eingerichtetem Hook; der Schalter liegt wie nach dem Init im Wurzelordner.
function hookedProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  setup.writeHookMarker(root, STACK);
  return root;
}

const bash = (root, command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: root });

test('decide_DevMcpBuildAndTestTools_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__build_dotnet_solution', 'mcp__plugin_x_dev-mcp__test_dotnet_solution']) {
    const reason = guard.decide({ tool_name: tool, tool_input: {}, cwd: root });
    assert.match(reason, /`dv-dotnet:toolchain`/);
    assert.ok(reason.includes(tool));
  }
});

test('decide_OtherDevMcpTools_AreAllowed', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__read_lines', 'mcp__dev-mcp__run_inspectcode', 'mcp__dev-mcp__build_angular_project']) {
    assert.equal(guard.decide({ tool_name: tool, tool_input: {}, cwd: root }), null);
  }
});

test('decide_DotnetBuildOrTestInBash_IsRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const command of ['dotnet test', 'dotnet build -c Release', 'cd src && dotnet test --no-build', 'dotnet.exe build', '/usr/bin/dotnet test']) {
    assert.match(guard.decide(bash(root, command)), /`dv-dotnet:toolchain`/, command);
  }
});

test('decide_OtherShellCommands_AreAllowed', () => {
  const root = hookedProject();
  for (const command of ['dotnet run', 'dotnet restore', 'dotnet ef migrations add X', 'dv-dotnet-test --path x.sln', 'git commit -m "dotnet test fix"', 'echo dotnet test']) {
    assert.equal(guard.decide(bash(root, command)), null, command);
  }
});

test('decide_PowerShellTool_IsNeverRejected', () => {
  const root = hookedProject();
  assert.equal(guard.decide({ tool_name: 'PowerShell', tool_input: { command: 'dotnet test' }, cwd: root }), null);
});

test('decide_ProjectWithoutSwitch_AllowsEverything', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  assert.equal(guard.decide(bash(root, 'dotnet build')), null);
  assert.equal(guard.decide({ tool_name: 'mcp__dev-mcp__build_dotnet_solution', tool_input: {}, cwd: root }), null);
});

test('decide_CwdInSubfolder_FindsTheSwitchAbove', () => {
  const root = hookedProject();
  const sub = path.join(root, 'src', 'Api');
  fs.mkdirSync(sub, { recursive: true });
  assert.match(guard.decide(bash(sub, 'dotnet test')), /dv-dotnet:toolchain/);
});

test('initThenDecide_HookYes_RejectsAfterwardsAndHookNoDoesNot', () => {
  const yes = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  initProject({ cwd: yes, hook: 'ja', mcp: [] });
  assert.match(guard.decide(bash(yes, 'dotnet test')), /`dv-dotnet:toolchain`/);
  const no = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-dotnet-guard-'));
  initProject({ cwd: no, hook: 'nein', mcp: [] });
  assert.equal(guard.decide(bash(no, 'dotnet test')), null);
});

test('cli_RejectedCall_PrintsDenyDecisionAsJson', () => {
  const root = hookedProject();
  const result = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'dotnet test')), encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /dv-dotnet:toolchain/);
});

test('cli_AllowedCallOrBrokenInput_PrintsNothingAndExitsZero', () => {
  const root = hookedProject();
  const allowed = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'git status')), encoding: 'utf8' });
  assert.deepEqual([allowed.status, allowed.stdout], [0, '']);
  const broken = spawnSync(process.execPath, [SCRIPT], { input: '{ kaputt', encoding: 'utf8' });
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, '');
  assert.match(broken.stderr, /^dv-dotnet guard: /);
});

test('hooksJson_Matcher_CoversBashAndTheTwoMcpToolsButNotPowerShell', () => {
  const [entry] = JSON.parse(fs.readFileSync(HOOKS, 'utf8')).hooks.PreToolUse;
  const matcher = new RegExp(entry.matcher);
  for (const tool of ['Bash', 'mcp__dev-mcp__build_dotnet_solution', 'mcp__dev-mcp__test_dotnet_solution']) assert.ok(matcher.test(tool), tool);
  for (const tool of ['PowerShell', 'Read', 'mcp__dev-mcp__read_lines']) assert.ok(!matcher.test(tool), tool);
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js"');
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/toolchain-guard.test.js` — erwartet: FAIL, `Cannot find module '../scripts/toolchain-guard'`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/dotnet/scripts/toolchain-guard.js` neu anlegen:

````js
#!/usr/bin/env node
'use strict';

// PreToolUse-Hook von dv-dotnet: lehnt Build und Test über dev-mcp und über dotnet im Bash-Tool ab und nennt den Skill.
// Er greift nur, wenn das Projekt ihn über den Init eingerichtet hat (.claude/dv-dotnet.json).

const fs = require('node:fs');
const { hookEnabled } = require('./lib/project-setup');

const STACK = { plugin: 'dv-dotnet', skill: 'dv-dotnet:toolchain' };
const MCP_TOOL = /^mcp__.+__(?:build_dotnet_solution|test_dotnet_solution)$/;
const DOTNET_CALL = /(?:^|[;&|(\n]|\$\()\s*(?:\S*[\\/])?dotnet(?:\.exe)?\s+(?:build|test)\b/;
const MAX_COMMAND_LENGTH = 120;

// Beschreibt den abzulehnenden Aufruf oder gibt null zurück, wenn der Aufruf nicht zu Build und Test gehört.
function blockedAction(input) {
  if (MCP_TOOL.test(String(input.tool_name))) return input.tool_name;
  if (input.tool_name !== 'Bash') return null;
  const command = String(input.tool_input?.command ?? '').trim();
  return DOTNET_CALL.test(command) ? `Bash ${command.slice(0, MAX_COMMAND_LENGTH)}` : null;
}

function reasonFor(action) {
  return `${STACK.plugin}: Build, Test und Lint laufen über den Skill \`${STACK.skill}\` (Skill-Tool laden) und dessen Befehle im Bash-Tool. Abgelehnt: ${action}.`;
}

// Die Begründung der Ablehnung oder null, wenn der Aufruf erlaubt ist.
function decide(input) {
  const action = blockedAction(input);
  if (!action || !hookEnabled(input.cwd ?? process.cwd(), STACK)) return null;
  return reasonFor(action);
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

if (require.main === module) {
  try {
    writeDeny(decide(readStdinJson()));
  } catch (error) {
    // Ein Fehler im Hook darf die Arbeit nie blockieren.
    process.stderr.write(`${STACK.plugin} guard: ${error.message}\n`);
  }
}

module.exports = { decide, blockedAction };
````

  Datei `plugins/dotnet/hooks/hooks.json` neu anlegen:

````json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|mcp__.*__(build_dotnet_solution|test_dotnet_solution)",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js\""
          }
        ]
      }
    ]
  }
}
````

  In `plugins/dotnet/.claude-plugin/plugin.json` die Version anheben (Edit-Tool, exakt):

Alt:

````json
"version": "1.1.2"
````

Neu:

````json
"version": "1.2.0"
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/dotnet/tests/toolchain-guard.test.js` — erwartet: PASS, 11 Tests; danach alle Tests des Plugins: `node --test plugins/dotnet/tests/*.test.js` — erwartet: PASS, 0 fail
- [ ] **Schritt 5: Commit**
  `git add plugins/dotnet` · `git commit -m "feat(dotnet): add toolchain hook and bump version"`

### Task 7: Angular-Start-Befehle und Windows-Prüfung

**ACs:** AC-10

**Dateien:**
- Create: `plugins/angular/bin/lib/run-toolchain.js`
- Create: `plugins/angular/bin/dv-angular-build`
- Create: `plugins/angular/bin/dv-angular-test`
- Create: `plugins/angular/bin/dv-angular-lint`
- Test: `plugins/angular/tests/run-toolchain.test.js`

**Interfaces:**
- Produces: `run(starterFile: string, args?: string[]): number`, `scriptFor(starterFile: string): string` und `failureMessage(starterFile: string, result: { error?: Error, signal?: string | null, status?: number | null }): string | null` aus `plugins/angular/bin/lib/run-toolchain.js` (Verhalten wie in Task 1 samt Meldung bei Startfehler oder Signal, Skripte unter `plugins/angular/scripts/toolchain/`), und die Start-Befehle `dv-angular-build`, `dv-angular-test`, `dv-angular-lint`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/angular/tests/run-toolchain.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { scriptFor, failureMessage } = require('../bin/lib/run-toolchain');

const BIN = path.join(__dirname, '..', 'bin');
const STARTERS = ['dv-angular-build', 'dv-angular-test', 'dv-angular-lint'];
const FAKE_SCRIPT = 'process.stdout.write(JSON.stringify({ args: process.argv.slice(2) }));\nprocess.exit(3);\n';
const BASH = findBash();

// Git Bash unter Windows über den Ort von git, nie das WSL-bash.exe aus System32; unter POSIX bash vom PATH. Ohne Bash null.
function findBash() {
  if (process.platform !== 'win32') return spawnSync('bash', ['-c', 'true']).status === 0 ? 'bash' : null;
  const gitExecPath = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
  if (gitExecPath.status !== 0) return null;
  const bash = path.resolve(gitExecPath.stdout.trim(), '..', '..', '..', 'bin', 'bash.exe');
  return fs.existsSync(bash) ? bash : null;
}

// Kopie des Plugins mit dem echten bin/ und, auf Wunsch, Ersatz-Skripten unter scripts/toolchain/.
function pluginCopy(withScripts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-plugin-'));
  fs.cpSync(BIN, path.join(root, 'bin'), { recursive: true });
  if (!withScripts) return root;
  const scripts = path.join(root, 'scripts', 'toolchain');
  fs.mkdirSync(scripts, { recursive: true });
  for (const starter of STARTERS) fs.writeFileSync(path.join(scripts, `${starter.replace(/^dv-/, '')}.js`), FAKE_SCRIPT);
  return root;
}

function start(root, starter, args) {
  return spawnSync(process.execPath, [path.join(root, 'bin', starter), ...args], { encoding: 'utf8' });
}

for (const starter of STARTERS) {
  test(`${starter}_WithArguments_PassesThemAndExitCodeOfItsScript`, () => {
    const result = start(pluginCopy(true), starter, ['--root', 'web', '--', '--include', 'src/app/x.spec.ts']);
    assert.equal(result.status, 3);
    assert.deepEqual(JSON.parse(result.stdout), { args: ['--root', 'web', '--', '--include', 'src/app/x.spec.ts'] });
  });
}

test('starter_ScriptMissing_ReportsPathAndExitsOne', () => {
  const result = start(pluginCopy(false), 'dv-angular-test', []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^dv-angular-test: Skript nicht gefunden: .*angular-test\.js\n$/);
});

test('scriptFor_StarterFile_MapsToToolchainScriptOfSameName', () => {
  const script = scriptFor(path.join('x', 'bin', 'dv-angular-lint'));
  assert.equal(path.basename(script), 'angular-lint.js');
  assert.equal(path.basename(path.dirname(script)), 'toolchain');
});

// Künstliche Ergebnisse von spawnSync statt eines echten Kindprozesses: auf Windows und POSIX gleich stabil.
test('failureMessage_StartErrorSignalOrExitCode_NamesCauseOrIsNull', () => {
  const starter = path.join('x', 'bin', 'dv-angular-test');
  assert.equal(failureMessage(starter, { error: new Error('spawn EACCES') }), 'dv-angular-test: Start fehlgeschlagen: spawn EACCES');
  assert.equal(failureMessage(starter, { signal: 'SIGTERM', status: null }), 'dv-angular-test: beendet durch Signal SIGTERM');
  assert.equal(failureMessage(starter, { status: 3 }), null);
});

// AC-10: Git Bash findet die Start-Befehle ohne Endung über den PATH und startet sie über den Node-Shebang.
test('starters_OnPathInGitBash_AreFoundAndStarted', { skip: BASH ? false : 'keine Git Bash' }, () => {
  const bin = path.join(pluginCopy(true), 'bin');
  for (const starter of STARTERS) fs.chmodSync(path.join(bin, starter), 0o755);
  const script = 'd=$(cygpath -u "$1" 2>/dev/null || printf %s "$1"); PATH="$d:$PATH"; shift; for s in "$@"; do "$s" x; echo "exit=$?"; done';
  const result = spawnSync(BASH, ['-c', script, '_', bin, ...STARTERS], { encoding: 'utf8' });
  assert.equal(result.stdout, '{"args":["x"]}exit=3\n'.repeat(STARTERS.length), result.stderr);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/angular/tests/run-toolchain.test.js` — erwartet: FAIL, `Cannot find module '../bin/lib/run-toolchain'`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/angular/bin/lib/run-toolchain.js` neu anlegen:

````js
'use strict';

// Startet das Toolchain-Skript, das zum Namen des Start-Befehls passt: dv-angular-test → scripts/toolchain/angular-test.js.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TOOLCHAIN_DIR = path.join(__dirname, '..', '..', 'scripts', 'toolchain');

function scriptFor(starterFile) {
  return path.join(TOOLCHAIN_DIR, `${path.basename(starterFile).replace(/^dv-/, '')}.js`);
}

// Meldung, wenn das Skript nicht starten konnte oder durch ein Signal endete; sonst null.
function failureMessage(starterFile, result) {
  const command = path.basename(starterFile);
  if (result.error) return `${command}: Start fehlgeschlagen: ${result.error.message}`;
  if (result.signal) return `${command}: beendet durch Signal ${result.signal}`;
  return null;
}

// Gibt den Exit-Code des Skripts zurück; fehlt das Skript, startet es nicht oder endet es durch ein Signal, 1 mit Meldung auf stderr.
function run(starterFile, args = process.argv.slice(2)) {
  const script = scriptFor(starterFile);
  if (!fs.existsSync(script)) {
    process.stderr.write(`${path.basename(starterFile)}: Skript nicht gefunden: ${script}\n`);
    return 1;
  }
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  const failure = failureMessage(starterFile, result);
  if (failure === null) return result.status;
  process.stderr.write(`${failure}\n`);
  return 1;
}

module.exports = { run, scriptFor, failureMessage };
````

  Die drei Start-Befehle `plugins/angular/bin/dv-angular-build`, `plugins/angular/bin/dv-angular-test` und `plugins/angular/bin/dv-angular-lint` anlegen, alle drei mit genau diesem Inhalt:

````js
#!/usr/bin/env node
'use strict';

process.exit(require('./lib/run-toolchain.js').run(__filename));
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/angular/tests/run-toolchain.test.js` — erwartet: PASS, 7 Tests, 0 skipped; meldet `starters_OnPathInGitBash_AreFoundAndStarted` „keine Git Bash“ oder schlägt er fehl, gilt der Halt aus Schritt 5.
- [ ] **Schritt 5: Windows-Prüfung der Start-Befehle (AC-10)**
  Befehl im Bash-Tool, im Repo-Wurzelordner: `PATH="$(pwd)/plugins/angular/bin:$PATH" dv-angular-test --root x; echo "exit=$?"` — erwartet: die Zeile `dv-angular-test: Skript nicht gefunden: <R>\plugins\angular\scripts\toolchain\angular-test.js` und danach `exit=1`.
  **Halt:** Erscheint stattdessen `command not found`, `bad interpreter`, eine leere Ausgabe oder ein anderer Exit-Code, hält die Umsetzung an: nichts committen, den Anwender fragen und erst nach seiner Antwort weitermachen.
- [ ] **Schritt 6: Commit**
  `git add plugins/angular` · `git add --chmod=+x plugins/angular/bin/dv-angular-build plugins/angular/bin/dv-angular-test plugins/angular/bin/dv-angular-lint`
  Prüfen: `git ls-files -s plugins/angular/bin` — erwartet: `100755` bei den drei Start-Befehlen.
  `git commit -m "feat(angular): add dv-angular start commands"`

### Task 8: Angular-Skripte und ihre Tests umziehen

**ACs:** AC-07, AC-33

**Dateien:**
- Create: `plugins/angular/scripts/toolchain/angular-build.js`
- Create: `plugins/angular/scripts/toolchain/angular-test.js`
- Create: `plugins/angular/scripts/toolchain/angular-lint.js`
- Modify: `plugins/forge/scripts/toolchain/angular-build.js` · `angular-build`
- Modify: `plugins/forge/scripts/toolchain/angular-test.js` · `angular-test`
- Modify: `plugins/forge/scripts/toolchain/angular-lint.js` · `angular-lint`
- Create: `plugins/angular/tests/lib/fake-toolchain.js`
- Modify: `plugins/forge/tests/lib/fake-toolchain.js` · `fakeDotnet`
- Test: `plugins/forge/tests/toolchain-angular-build.test.js` · `angular-build.js`
- Test: `plugins/forge/tests/toolchain-angular-test.test.js` · `angular-test.js`
- Test: `plugins/forge/tests/toolchain-angular-lint.test.js` · `angular-lint.js`

**Interfaces:**
- Consumes: `scriptFor(starterFile)` aus Task 7.
- Produces: `plugins/angular/scripts/toolchain/angular-build.js`, `angular-test.js`, `angular-lint.js` unverändert (Aufruf `node <skript> [--root <angular-projektordner>] [--log <datei>] [--timeout <sekunden>] [-- <weitere Argumente>]`, `angular-build` und `angular-lint` zusätzlich `[--show errors|warnings|all]`); ihre Tests unter `plugins/angular/tests/toolchain-angular-{build,test,lint}.test.js`.
- Produces: `fakeAngular(angularJson: object, output: string, exitCode?: number, options?: { withBuilderPackages?: boolean }): { dir, env, args }` und `tempDir(prefix: string): string` aus `plugins/angular/tests/lib/fake-toolchain.js`. Die Datei `plugins/forge/tests/lib/fake-toolchain.js` entfällt, weil danach kein forge-Test sie mehr nutzt.

- [ ] **Schritt 1: Absicherungstests nennen**
  Bestehende Tests sichern das Verhalten: `plugins/forge/tests/toolchain-angular-test.test.js`, `toolchain-angular-build.test.js` und `toolchain-angular-lint.test.js`. Sie ziehen unverändert mit; der Ersatz-Helfer bekommt im Plugin eine eigene Kopie.
- [ ] **Schritt 2: Verschieben und Ersatz-Helfer anlegen**
  Befehl im Repo-Wurzelordner (Bash-Tool): `mkdir -p plugins/angular/scripts/toolchain plugins/angular/tests/lib`, danach je `n` in `build`, `test`, `lint`: `git mv plugins/forge/scripts/toolchain/angular-$n.js plugins/angular/scripts/toolchain/angular-$n.js` und `git mv plugins/forge/tests/toolchain-angular-$n.test.js plugins/angular/tests/toolchain-angular-$n.test.js`; danach `git rm plugins/forge/tests/lib/fake-toolchain.js`.
  Datei `plugins/angular/tests/lib/fake-toolchain.js` neu anlegen (Teilmenge der bisherigen Helfer, wörtlich übernommen):

````js
'use strict';

// Ersatz für die Angular CLI: gibt eine vorgegebene Ausgabe aus und merkt sich die Argumente.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const FAKE = [
  "const fs = require('node:fs');",
  "fs.writeFileSync(process.env.FAKE_ARGS, JSON.stringify(process.argv.slice(2)));",
  "process.stdout.write(fs.readFileSync(process.env.FAKE_OUTPUT, 'utf8'));",
  "setTimeout(() => process.exit(Number(process.env.FAKE_EXIT ?? 0)), Number(process.env.FAKE_SLEEP_MS ?? 0));",
].join('\n');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function fakeEnv(dir, output, exitCode) {
  const outputFile = path.join(dir, 'fake-output.txt');
  fs.writeFileSync(outputFile, output);
  return { FAKE_OUTPUT: outputFile, FAKE_EXIT: String(exitCode), FAKE_ARGS: path.join(dir, 'fake-args.json') };
}

// Legt ein Angular-Projekt mit angular.json und einer falschen CLI unter node_modules an.
function fakeAngular(angularJson, output, exitCode = 0, { withBuilderPackages = true } = {}) {
  const dir = tempDir('dv-forge-ng-');
  fs.writeFileSync(path.join(dir, 'angular.json'), JSON.stringify(angularJson));
  const bin = path.join(dir, 'node_modules', '@angular', 'cli', 'bin');
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, 'ng.js'), `${FAKE}\n`);
  const builders = Object.values(angularJson.projects ?? {}).flatMap((project) => Object.values(project.architect ?? project.targets ?? {}))
    .map((target) => String(target.builder ?? '').split(':')[0]).filter(Boolean);
  for (const name of withBuilderPackages ? builders : []) {
    fs.mkdirSync(path.join(dir, 'node_modules', name), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', name, 'package.json'), JSON.stringify({ name }));
  }
  const env = { ...process.env, ...fakeEnv(dir, output, exitCode) };
  return { dir, env, args: () => JSON.parse(fs.readFileSync(env.FAKE_ARGS, 'utf8')) };
}

module.exports = { tempDir, fakeAngular };
````

- [ ] **Schritt 3: Absicherungstests laufen lassen**
  Befehl: `node --test plugins/angular/tests/*.test.js` — erwartet: PASS, 0 fail; rot ist ein Befund, kein Grund, Skripte zu ändern.
- [ ] **Schritt 4: Unverändertheit der Skripte prüfen (AC-07)**
  Befehl: `git add plugins/angular plugins/forge && git diff --cached -M --summary` — erwartet: sechs Zeilen `rename plugins/{forge => angular}/…/angular-…(100%)` für die drei Skripte und die drei Tests; die Zeile für `tests/lib/fake-toolchain.js` darf unter 100 % liegen. Danach: `grep -rln "fake-toolchain" plugins/forge/tests` — erwartet: keine Ausgabe.
- [ ] **Schritt 5: Start-Befehl gegen das echte Skript (AC-33)**
  Befehl im Bash-Tool, im Repo-Wurzelordner: `d=$(mktemp -d); echo '{}' > "$d/angular.json"; PATH="$(pwd)/plugins/angular/bin:$PATH" dv-angular-test --root "$d"` — erwartet: die erste Zeile beginnt mit `angular-test: FEHLGESCHLAGEN`, darunter `Zusammenfassung: Nicht gestartet.` (kein Angular CLI im Ordner) und am Ende `Log:`; dasselbe mit `dv-angular-build --root "$d"` (Zeile beginnt mit `angular-build: FEHLGESCHLAGEN`).
- [ ] **Schritt 6: Commit**
  `git add plugins/angular plugins/forge` · `git commit -m "feat(angular): move angular toolchain scripts and tests from dv-forge"`

### Task 9: Angular-Skill toolchain

**ACs:** AC-02, AC-03, AC-09, AC-29, AC-30, AC-31

**Dateien:**
- Create: `plugins/angular/skills/toolchain/SKILL.md`
- Create: `plugins/angular/tests/lib/markdown.js`
- Test: `plugins/angular/tests/skill-toolchain.test.js`

**Interfaces:**
- Produces: Skill `dv-angular:toolchain` (`name: toolchain`); `readMarkdown(file: string): { fields: Record<string, string>, body: string }`, `wordCount(text: string): number` und `readText(file: string): string` aus `plugins/angular/tests/lib/markdown.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/angular/tests/lib/markdown.js` neu anlegen:

````js
'use strict';

const fs = require('node:fs');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readMarkdown(file) {
  const text = readText(file);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) return { fields: {}, body: text };
  const fields = Object.fromEntries(match[1].split('\n').map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body: match[2] };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

module.exports = { readText, readMarkdown, wordCount };
````

  Datei `plugins/angular/tests/skill-toolchain.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'toolchain', 'SKILL.md'));
const TRIGGERS = ['baue', 'teste', 'kompiliere', 'lint', 'führe die Tests aus', 'Build prüfen', 'laufen die Tests durch'];
const COMMANDS = ['dv-angular-build', 'dv-angular-test', 'dv-angular-lint'];

test('frontmatter_Fields_AreOnlyNameAndDescription', () => {
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'toolchain');
});

test('description_Text_StartsWithUseWhenAndStaysShort', () => {
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
});

test('description_Triggers_NamesEveryPhraseOfTheSpec', () => {
  for (const phrase of TRIGGERS) assert.ok(fields.description.includes(phrase), `${phrase} fehlt`);
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('description_Tools_NamesTheToolsItReplaces', () => {
  for (const tool of ['build_angular_project', 'test_angular_project', 'ng build', 'npm test']) assert.ok(fields.description.includes(tool), `${tool} fehlt`);
});

test('body_Length_StaysUnder200Words', () => {
  assert.ok(wordCount(body) < 200, `${wordCount(body)} Wörter`);
});

test('body_Commands_NamesBashAndAllThreeCommands', () => {
  assert.match(body, /\*\*Bash-Tool\*\*/);
  for (const command of COMMANDS) assert.ok(body.includes(`\`${command} --root <Workspace>\``), `${command} fehlt`);
});

test('body_PowerShell_IsNeverAnInvocation', () => {
  assert.doesNotMatch(body, /```(?:powershell|pwsh)/i);
  assert.match(body, /nicht im PowerShell-Tool/);
});

test('body_WorkspaceRule_TakesTheOnlyOneOrAsksAndStartsNothing', () => {
  assert.match(body, /genau einen Workspace, nimm ihn/);
  assert.match(body, /mehrere, frag, welcher gemeint ist, und starte nichts/);
});

test('body_References_HaveNoAtLinks', () => {
  assert.doesNotMatch(body, /(^|\s)@[\w./-]+/);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/angular/tests/skill-toolchain.test.js` — erwartet: FAIL, `ENOENT … skills\toolchain\SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/angular/skills/toolchain/SKILL.md` neu anlegen:

````markdown
---
name: toolchain
description: Use when the user asks to build, compile, test or lint an Angular app ("baue", "teste", "kompiliere", "lint", "führe die Tests aus", "Build prüfen", "laufen die Tests durch") and before any dev-mcp build_angular_project, test_angular_project or raw ng build, ng test, ng lint or npm test call.
---

# Angular: bauen, testen, linten

Die Befehle laufen im **Bash-Tool**, nicht im PowerShell-Tool. Sie liefern Status, Zusammenfassung und Fehler; das Volllog liegt in einer Datei, der Verweis steht in der Ausgabe. Lade das Log nie in den Kontext.

| Aufgabe | Befehl |
|---|---|
| Bauen | `dv-angular-build --root <Workspace>` |
| Testen | `dv-angular-test --root <Workspace>` |
| Linten | `dv-angular-lint --root <Workspace>` |

`<Workspace>` ist der Ordner mit der `angular.json`; die Anwendungen und Bibliotheken darin zählen nicht einzeln. Argumente nach `--` gehen an `ng` weiter, z. B. `dv-angular-test --root <Workspace> -- --include src/app/x.spec.ts`. Ohne gültige Argumente zeigt der Befehl seine Syntax.

**Ohne genannten Pfad:** Gibt es im Repo genau einen Workspace, nimm ihn. Gibt es mehrere, frag, welcher gemeint ist, und starte nichts.

Nicht `build_angular_project` oder `test_angular_project` von dev-mcp und nicht `ng build|test|lint` oder `npm test` in der Shell.
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/angular/tests/skill-toolchain.test.js` — erwartet: PASS, 10 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/angular` · `git commit -m "feat(angular): add toolchain skill"`

### Task 10: Angular-Init-Bausteine

**ACs:** AC-12, AC-24, AC-26

**Dateien:**
- Create: `plugins/angular/scripts/lib/project-setup.js`
- Test: `plugins/angular/tests/project-setup.test.js`

**Interfaces:**
- Consumes: `plugins/dotnet/scripts/lib/project-setup.js` im Stand nach Task 5 als Vorlage für die Kopie.
- Produces: dieselben Funktionen wie in Task 4 und Task 5 aus `plugins/angular/scripts/lib/project-setup.js` (`MCP_SERVERS`, `withStackBlock`, `withMcpSentence`, `withMcpServer`, `applyClaudeMd`, `applyMcpServer`, `hookMarkerFile`, `writeHookMarker`, `hookEnabled`, `parseArgs`, `initProject(args, stack)`, `runInit(stack, argv)`), mit `stack` = `{ plugin: 'dv-angular', skill: 'dv-angular:toolchain' }` im Test; die Datei ist inhaltsgleich mit `plugins/dotnet/scripts/lib/project-setup.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/angular/tests/project-setup.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const setup = require('../scripts/lib/project-setup');

const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };
const count = (text, part) => text.split(part).length - 1;
const tempProject = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-project-'));

test('withStackBlock_EmptyText_CreatesBlockNamingSkillWithoutCommandOrPath', () => {
  const text = setup.withStackBlock('', STACK);
  assert.ok(text.includes('`dv-angular:toolchain`'));
  assert.doesNotMatch(text, /dv-angular-(build|test|lint)|--path|[\\/]/);
  assert.ok(text.endsWith('\n'));
});

test('withStackBlock_ExistingText_AppendsAfterBlankLineAndKeepsEveryLine', () => {
  const old = '# Projekt\n\n- Build und Test über dev-mcp\n';
  const text = setup.withStackBlock(old, STACK);
  assert.ok(text.startsWith(`${old}\n<!-- dv-angular:start -->`));
});

test('withStackBlock_CalledTwice_KeepsExactlyOneBlock', () => {
  const once = setup.withStackBlock('# Projekt\n', STACK);
  const twice = setup.withStackBlock(once, STACK);
  assert.equal(twice, once);
  assert.equal(count(twice, '<!-- dv-angular:start -->'), 1);
});

test('withStackBlock_StaleBlock_ReplacesContentBetweenMarkers', () => {
  const stale = '# P\n<!-- dv-angular:start -->\nalt\n<!-- dv-angular:end -->\nRest\n';
  const text = setup.withStackBlock(stale, STACK);
  assert.ok(!text.includes('alt'));
  assert.ok(text.includes('`dv-angular:toolchain`'));
  assert.ok(text.endsWith('<!-- dv-angular:end -->\nRest\n'));
});

test('withStackBlock_CrlfText_UsesCrlfThroughout', () => {
  const text = setup.withStackBlock('# P\r\n', STACK);
  assert.ok(text.includes('\r\n'));
  assert.ok(!/(?<!\r)\n/.test(text));
});

test('withMcpSentence_NewServer_CreatesBlockWithOneSentence', () => {
  const text = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.ok(text.includes('`context7`'));
});

test('withMcpSentence_SecondServer_AddsSentenceToTheSameBlock', () => {
  const text = setup.withMcpSentence(setup.withMcpSentence('# P\n', 'context7'), 'microsoft-learn');
  assert.equal(count(text, '<!-- dv-mcp:start -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:context7 -->'), 1);
  assert.equal(count(text, '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('withMcpSentence_SentenceAlreadyThere_LeavesTextUnchanged', () => {
  const once = setup.withMcpSentence('# P\n', 'context7');
  assert.equal(setup.withMcpSentence(once, 'context7'), once);
});

test('withMcpServer_NoFile_CreatesConfigWithHttpEntry', () => {
  const { status, text } = setup.withMcpServer(null, 'context7');
  assert.equal(status, 'angelegt');
  assert.deepEqual(JSON.parse(text), { mcpServers: { context7: { type: 'http', url: 'https://mcp.context7.com/mcp' } } });
});

test('withMcpServer_MicrosoftLearn_UsesOfficialEndpoint', () => {
  const { text } = setup.withMcpServer(null, 'microsoft-learn');
  assert.equal(JSON.parse(text).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
});

test('withMcpServer_EntryExists_KeepsFileUntouched', () => {
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  const result = setup.withMcpServer(json, 'context7');
  assert.deepEqual(result, { status: 'vorhanden', text: json });
});

test('withMcpServer_OtherEntries_StayUnchangedWhenServerIsAdded', () => {
  const foo = { command: 'x', args: ['--y'] };
  const { status, text } = setup.withMcpServer(JSON.stringify({ other: 1, mcpServers: { foo } }), 'context7');
  assert.equal(status, 'ergaenzt');
  const config = JSON.parse(text);
  assert.deepEqual(config.mcpServers.foo, foo);
  assert.equal(config.other, 1);
  assert.ok(config.mcpServers.context7);
});

test('withMcpServer_InvalidJson_ReportsInvalidAndKeepsText', () => {
  assert.deepEqual(setup.withMcpServer('{ kaputt', 'context7'), { status: 'ungueltig', text: '{ kaputt' });
  assert.equal(setup.withMcpServer('[]', 'context7').status, 'ungueltig');
  assert.equal(setup.withMcpServer('{"mcpServers": []}', 'context7').status, 'ungueltig');
});

test('applyClaudeMd_MissingFile_CreatesItAndReportsChange', () => {
  const root = tempProject();
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), true);
  assert.ok(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8').includes('dv-angular:toolchain'));
  assert.equal(setup.applyClaudeMd(root, (text) => setup.withStackBlock(text, STACK)), false);
});

test('applyMcpServer_InvalidFile_LeavesBytesUnchanged', () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  assert.equal(setup.applyMcpServer(root, 'context7'), 'ungueltig');
  assert.equal(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8'), '{ kaputt');
});

test('applyMcpServer_NoFile_WritesConfigToProjectRoot', () => {
  const root = tempProject();
  assert.equal(setup.applyMcpServer(root, 'microsoft-learn'), 'angelegt');
  assert.ok(JSON.parse(fs.readFileSync(path.join(root, '.mcp.json'), 'utf8')).mcpServers['microsoft-learn']);
});

test('hookEnabled_MarkerWritten_IsFoundFromSubfolder', () => {
  const root = tempProject();
  const sub = path.join(root, 'src', 'Api');
  fs.mkdirSync(sub, { recursive: true });
  setup.writeHookMarker(root, STACK);
  assert.equal(setup.hookEnabled(sub, STACK), true);
});

test('hookEnabled_NoMarkerOrFalseOrBroken_IsFalse', () => {
  const root = tempProject();
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.mkdirSync(path.join(root, '.claude'));
  fs.writeFileSync(path.join(root, '.claude', 'dv-angular.json'), '{"hook": false}');
  assert.equal(setup.hookEnabled(root, STACK), false);
  fs.writeFileSync(path.join(root, '.claude', 'dv-angular.json'), '{ kaputt');
  assert.equal(setup.hookEnabled(root, STACK), false);
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/angular/tests/project-setup.test.js` — erwartet: FAIL, `Cannot find module '../scripts/lib/project-setup'`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/angular/scripts/lib/project-setup.js` neu anlegen, inhaltsgleich mit der .NET-Datei im Stand nach Task 5 (Bausteine aus Task 4 und Init-Ablauf aus Task 5):

````js
'use strict';

// Bausteine der Init-Skills: Hinweisblock und MCP-Sätze in der CLAUDE.md, MCP-Einträge in der .mcp.json, Schalter für den Hook.
// Die Textfunktionen sind rein; nur die Funktionen ab applyClaudeMd berühren Dateien.
// Ab parseArgs folgt der Ablauf des Init; init.js jedes Plugins ruft ihn mit seinem Stack auf.
// Diese Datei ist in dv-dotnet und dv-angular inhaltsgleich, weil Plugins keine Dateien teilen.

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MCP_START = '<!-- dv-mcp:start -->';
const MCP_END = '<!-- dv-mcp:end -->';

const MCP_SERVERS = {
  context7: {
    entry: { type: 'http', url: 'https://mcp.context7.com/mcp' },
    sentence: 'Bei Fragen zu Bibliotheken und Frameworks den MCP `context7` nutzen.',
  },
  'microsoft-learn': {
    entry: { type: 'http', url: 'https://learn.microsoft.com/api/mcp' },
    sentence: 'Bei Fragen zur Microsoft- und .NET-Dokumentation den MCP `microsoft-learn` nutzen.',
  },
};

function eolOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appended(text, block) {
  const eol = eolOf(text);
  if (text === '') return `${block}${eol}`;
  const gap = text.endsWith(eol) ? eol : `${eol}${eol}`;
  return `${text}${gap}${block}${eol}`;
}

function withBlock(text, start, end, block) {
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  return pattern.test(text) ? text.replace(pattern, () => block) : appended(text, block);
}

// Hinweisblock eines Stack-Plugins; ohne Befehle und ohne Pfade, nur der Skill-Name.
function withStackBlock(text, stack) {
  const start = `<!-- ${stack.plugin}:start -->`;
  const end = `<!-- ${stack.plugin}:end -->`;
  const block = [
    start,
    `## ${stack.plugin}`,
    '',
    `- Bauen, Testen, Linten: Skill \`${stack.skill}\` aufrufen, bevor gebaut, getestet oder gelintet wird.`,
    end,
  ].join(eolOf(text));
  return withBlock(text, start, end, block);
}

// Ein Satz je MCP, erkennbar an seiner Markierung; der zweite Init-Lauf, gleich welches Plugin, fügt nichts hinzu.
function withMcpSentence(text, server) {
  const marker = `<!-- dv-mcp:${server} -->`;
  if (text.includes(marker)) return text;
  const eol = eolOf(text);
  const line = `- ${MCP_SERVERS[server].sentence} ${marker}`;
  if (text.includes(MCP_END)) return text.replace(MCP_END, () => `${line}${eol}${MCP_END}`);
  return appended(text, [MCP_START, '## MCP-Server', '', line, MCP_END].join(eol));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObject(text) {
  try {
    const value = JSON.parse(text);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// jsonText ist der Inhalt der .mcp.json oder null, wenn es sie nicht gibt.
function withMcpServer(jsonText, server) {
  const entry = MCP_SERVERS[server].entry;
  if (jsonText === null) return { status: 'angelegt', text: toJson({ mcpServers: { [server]: entry } }) };
  const config = parseObject(jsonText);
  const servers = config?.mcpServers ?? {};
  if (config === null || !isPlainObject(servers)) return { status: 'ungueltig', text: jsonText };
  if (Object.hasOwn(servers, server)) return { status: 'vorhanden', text: jsonText };
  return { status: 'ergaenzt', text: toJson({ ...config, mcpServers: { ...servers, [server]: entry } }) };
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// Wendet edit auf die CLAUDE.md im Wurzelordner an und legt sie an, falls sie fehlt. Gibt zurück, ob sich etwas änderte.
function applyClaudeMd(root, edit) {
  const file = path.join(root, 'CLAUDE.md');
  const before = readIfExists(file) ?? '';
  const after = edit(before);
  if (after === before) return false;
  fs.writeFileSync(file, after);
  return true;
}

// Trägt den MCP in die .mcp.json ein. Gibt den Status zurück: angelegt, ergaenzt, vorhanden oder ungueltig.
function applyMcpServer(root, server) {
  const file = path.join(root, '.mcp.json');
  const { status, text } = withMcpServer(readIfExists(file), server);
  if (status === 'angelegt' || status === 'ergaenzt') fs.writeFileSync(file, text);
  return status;
}

function hookMarkerFile(stack) {
  return path.join('.claude', `${stack.plugin}.json`);
}

function writeHookMarker(root, stack) {
  const file = path.join(root, hookMarkerFile(stack));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toJson({ hook: true }));
  return file;
}

function readHookMarker(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).hook === true;
  } catch {
    return null;
  }
}

// Die erste lesbare Schalter-Datei ab startDir aufwärts entscheidet; ohne Datei ist der Hook aus.
function hookEnabled(startDir, stack) {
  for (let dir = path.resolve(startDir); ; dir = path.dirname(dir)) {
    const marker = readHookMarker(path.join(dir, hookMarkerFile(stack)));
    if (marker !== null) return marker;
    if (path.dirname(dir) === dir) return false;
  }
}

const USAGE = 'Aufruf: node init.js [--cwd <ordner>] [--hook ja|nein] [--mcp <context7,microsoft-learn>]\n';
const MCP_ENTRY_TEXT = { angelegt: 'angelegt', ergaenzt: 'ergänzt', vorhanden: 'Eintrag vorhanden' };

class UsageError extends Error {}

const FLAGS = {
  '--cwd': (args, value) => { args.cwd = value; },
  '--hook': (args, value) => { args.hook = value; },
  '--mcp': (args, value) => { args.mcp = value === '' ? [] : value.split(','); },
};

function parseArgs(argv) {
  const args = { cwd: process.cwd(), hook: 'nein', mcp: [] };
  for (let index = 0; index < argv.length; index += 2) {
    const set = FLAGS[argv[index]];
    if (!set || argv[index + 1] === undefined) throw new UsageError(USAGE);
    set(args, argv[index + 1]);
  }
  if (!['ja', 'nein'].includes(args.hook)) throw new UsageError(USAGE);
  const unknown = args.mcp.find((server) => !Object.hasOwn(MCP_SERVERS, server));
  if (unknown) throw new UsageError(`Unbekannter MCP: ${unknown}\n${USAGE}`);
  return args;
}

function projectRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  return result.status === 0 ? path.resolve(result.stdout.trim()) : path.resolve(cwd);
}

function toPosix(file) {
  return file.split(path.sep).join('/');
}

function blockLines(root, stack) {
  const changed = applyClaudeMd(root, (text) => withStackBlock(text, stack));
  return [`CLAUDE.md: Hinweisblock ${stack.plugin} ${changed ? 'geschrieben' : 'unverändert'}`];
}

function hookLines(root, hook, stack) {
  const marker = toPosix(hookMarkerFile(stack));
  if (hook !== 'ja') return [`Hook: nicht eingerichtet. Ein vorhandener Schalter bleibt; zum Ausschalten ${marker} löschen.`];
  writeHookMarker(root, stack);
  return [`Hook: eingerichtet (${marker}). Die Datei committen, damit auch Worktrees den Hook haben.`];
}

function mcpLines(root, server) {
  const status = applyMcpServer(root, server);
  if (status === 'ungueltig') return [`WARNUNG MCP ${server}: .mcp.json ist kein gültiges JSON; weder Eintrag noch Satz angelegt.`];
  const changed = applyClaudeMd(root, (text) => withMcpSentence(text, server));
  return [`MCP ${server}: .mcp.json ${MCP_ENTRY_TEXT[status]}`, `CLAUDE.md: Satz zu ${server} ${changed ? 'geschrieben' : 'schon vorhanden'}`];
}

// Führt die Antworten des Init-Skills für einen Stack aus und gibt die Meldungszeilen zurück.
function initProject(args, stack) {
  const root = projectRoot(args.cwd);
  return [
    `Projekt: ${toPosix(root)}`,
    ...blockLines(root, stack),
    ...hookLines(root, args.hook, stack),
    ...args.mcp.flatMap((server) => mcpLines(root, server)),
    'Bestehende Regeln wie „Build und Test über dev-mcp“ ändert der Init nicht; die entfernst du von Hand.',
  ];
}

// Ablauf von init.js: Argumente lesen, ausführen, Meldung ausgeben; bei falschen Argumenten Syntax und Exit 2.
function runInit(stack, argv) {
  try {
    process.stdout.write(`${initProject(parseArgs(argv), stack).join('\n')}\n`);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(error.message);
    process.exit(2);
  }
}

module.exports = {
  MCP_SERVERS, withStackBlock, withMcpSentence, withMcpServer, applyClaudeMd, applyMcpServer, hookMarkerFile, writeHookMarker, hookEnabled,
  parseArgs, initProject, runInit,
};
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/angular/tests/project-setup.test.js` — erwartet: PASS, 18 Tests; Gleichheit prüfen: `cmp plugins/dotnet/scripts/lib/project-setup.js plugins/angular/scripts/lib/project-setup.js` — erwartet: keine Ausgabe (Dateien gleich).
- [ ] **Schritt 5: Commit**
  `git add plugins/angular` · `git commit -m "feat(angular): add project setup building blocks for init"`

### Task 11: Angular-Init-Skript und Init-Skill

**ACs:** AC-14, AC-21, AC-22, AC-23, AC-25, AC-26, AC-27, AC-37

**Dateien:**
- Create: `plugins/angular/scripts/init.js`
- Create: `plugins/angular/skills/init/SKILL.md`
- Test: `plugins/angular/tests/init.test.js`
- Test: `plugins/angular/tests/skill-init.test.js`

**Interfaces:**
- Consumes: `parseArgs(argv)`, `initProject(args, stack)` und `runInit(stack, argv)` aus `plugins/angular/scripts/lib/project-setup.js` (Task 10).
- Produces: `parseArgs(argv)` und `initProject(args)` aus `plugins/angular/scripts/init.js` mit denselben Signaturen und demselben Aufruf wie in Task 5, Hinweisblock und Hook-Schalter für `dv-angular` (`dv-angular:toolchain`, `.claude/dv-angular.json`); `init.js` enthält nur `STACK`, den Aufruf von `runInit` und die Exporte und gleicht der .NET-Datei bis auf `dotnet` → `angular`. Skill `dv-angular:init` (`name: init`, manuell).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/angular/tests/init.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { initProject, parseArgs } = require('../scripts/init');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'init.js');
const count = (text, part) => text.split(part).length - 1;
const project = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-init-'));
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
const args = (root, overrides = {}) => ({ cwd: root, hook: 'nein', mcp: [], ...overrides });

test('parseArgs_NoArguments_DefaultsToNoHookAndNoMcp', () => {
  const parsed = parseArgs([]);
  assert.equal(parsed.hook, 'nein');
  assert.deepEqual(parsed.mcp, []);
});

test('parseArgs_AllFlags_AreRead', () => {
  assert.deepEqual(parseArgs(['--cwd', 'x', '--hook', 'ja', '--mcp', 'context7,microsoft-learn']),
    { cwd: 'x', hook: 'ja', mcp: ['context7', 'microsoft-learn'] });
});

test('parseArgs_UnknownFlagHookValueOrMcp_Throws', () => {
  assert.throws(() => parseArgs(['--foo', 'x']), /Aufruf:/);
  assert.throws(() => parseArgs(['--hook', 'vielleicht']), /Aufruf:/);
  assert.throws(() => parseArgs(['--mcp', 'unbekannt']), /Unbekannter MCP: unbekannt/);
  assert.throws(() => parseArgs(['--hook']), /Aufruf:/);
});

test('initProject_NoClaudeMd_CreatesItWithHintBlockAndNothingElse', () => {
  const root = project();
  initProject(args(root));
  const text = read(root, 'CLAUDE.md');
  assert.ok(text.includes('`dv-angular:toolchain`'));
  assert.doesNotMatch(text, /dv-angular-(build|test|lint)|--path/);
  assert.ok(!fs.existsSync(path.join(root, '.mcp.json')));
  assert.ok(!fs.existsSync(path.join(root, '.claude', 'dv-angular.json')));
  assert.ok(!text.includes('dv-mcp'));
});

test('initProject_RunTwice_KeepsExactlyOneBlock', () => {
  const root = project();
  initProject(args(root));
  initProject(args(root));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-angular:start -->'), 1);
});

test('initProject_OldDevMcpRule_StaysUnchanged', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n- Build und Test über dev-mcp\n');
  initProject(args(root));
  assert.ok(read(root, 'CLAUDE.md').startsWith('# P\n\n- Build und Test über dev-mcp\n'));
});

test('initProject_HookYes_WritesTheSwitchFile', () => {
  const root = project();
  const lines = initProject(args(root, { hook: 'ja' }));
  assert.deepEqual(JSON.parse(read(root, '.claude/dv-angular.json')), { hook: true });
  assert.ok(lines.some((line) => line.startsWith('Hook: eingerichtet')));
});

test('initProject_Context7Yes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers.context7.url, 'https://mcp.context7.com/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_MicrosoftLearnYes_WritesEntryAndOneSentence', () => {
  const root = project();
  initProject(args(root, { mcp: ['microsoft-learn'] }));
  assert.equal(JSON.parse(read(root, '.mcp.json')).mcpServers['microsoft-learn'].url, 'https://learn.microsoft.com/api/mcp');
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:microsoft-learn -->'), 1);
});

test('initProject_ExistingEntries_StayUnchangedAndSentenceIsStillWritten', () => {
  const root = project();
  const json = JSON.stringify({ mcpServers: { context7: { url: 'eigen' }, foo: { command: 'x' } } });
  fs.writeFileSync(path.join(root, '.mcp.json'), json);
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), json);
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_SentenceWrittenByTheOtherPlugin_IsNotWrittenAgain', () => {
  const root = project();
  fs.writeFileSync(path.join(root, 'CLAUDE.md'), '# P\n\n<!-- dv-mcp:start -->\n## MCP-Server\n\n- Anderer Wortlaut. <!-- dv-mcp:context7 -->\n<!-- dv-mcp:end -->\n');
  initProject(args(root, { mcp: ['context7'] }));
  assert.equal(count(read(root, 'CLAUDE.md'), '<!-- dv-mcp:context7 -->'), 1);
});

test('initProject_InvalidMcpJson_KeepsFileWarnsAndStillWritesBlockAndHook', () => {
  const root = project();
  fs.writeFileSync(path.join(root, '.mcp.json'), '{ kaputt');
  const lines = initProject(args(root, { hook: 'ja', mcp: ['context7'] }));
  assert.equal(read(root, '.mcp.json'), '{ kaputt');
  assert.ok(lines.some((line) => /WARNUNG MCP context7: \.mcp\.json ist kein gültiges JSON/.test(line)));
  assert.ok(!read(root, 'CLAUDE.md').includes('dv-mcp:context7'));
  assert.ok(read(root, 'CLAUDE.md').includes('`dv-angular:toolchain`'));
  assert.ok(fs.existsSync(path.join(root, '.claude', 'dv-angular.json')));
});

test('cli_DefaultAnswers_PrintsReportAndExitsZero', () => {
  const root = project();
  const result = spawnSync(process.execPath, [SCRIPT, '--cwd', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /CLAUDE\.md: Hinweisblock dv-angular geschrieben/);
  assert.match(result.stdout, /Hook: nicht eingerichtet/);
});

test('cli_BadArguments_ExitsTwoWithUsage', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--hook', 'vielleicht'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Aufruf:/);
});
````

  Datei `plugins/angular/tests/skill-init.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const { fields, body } = readMarkdown(path.join(__dirname, '..', 'skills', 'init', 'SKILL.md'));
const count = (text, part) => text.split(part).length - 1;

test('frontmatter_Fields_ManualOnlyUseWhen', () => {
  assert.equal(fields.name, 'init');
  assert.match(fields.description, /^Use when/);
  assert.ok(fields.description.length < 500, `${fields.description.length} Zeichen`);
  assert.equal(fields['disable-model-invocation'], 'true');
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('description_Text_HasNoColonSpace', () => {
  assert.doesNotMatch(fields.description, /: /);
});

test('body_Length_StaysUnder500WordsAndUsesPluginRoot', () => {
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.ok(body.includes('`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`'));
});

test('body_Questions_AskHookAndBothMcpsSeparatelyWithDefaultNo', () => {
  for (const question of ['Hook einrichten?', 'Microsoft Learn einrichten?', 'Context7 einrichten?']) {
    assert.ok(body.includes(question), `${question} fehlt`);
  }
  assert.equal(count(body, '(Standard: Nein)'), 3);
});

test('body_McpQuestions_WarnAboutAlreadyInstalledPlugin', () => {
  assert.equal(count(body, 'Ist der MCP schon als Plugin installiert, wähle Nein.'), 2);
});

test('body_Script_IsCalledThroughNodeWithPluginRoot', () => {
  assert.ok(body.includes('node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>'));
});

test('body_ExistingRules_AreLeftToTheHuman', () => {
  assert.match(body, /Build und Test über dev-mcp/);
  assert.match(body, /von Hand/);
});
````

- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/angular/tests/init.test.js plugins/angular/tests/skill-init.test.js` — erwartet: FAIL, `Cannot find module '../scripts/init'` und `ENOENT … skills\init\SKILL.md`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/angular/scripts/init.js` neu anlegen:

````js
#!/usr/bin/env node
'use strict';

// Init für dv-angular: Hinweisblock in der CLAUDE.md, auf Wunsch Hook-Schalter und MCP-Server.
// Die Fragen stellt der Skill init; den Ablauf hält lib/project-setup.js, hier steht nur der Stack.

const setup = require('./lib/project-setup');

const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };

function initProject(args) {
  return setup.initProject(args, STACK);
}

if (require.main === module) setup.runInit(STACK, process.argv.slice(2));

module.exports = { parseArgs: setup.parseArgs, initProject };
````

  Datei `plugins/angular/skills/init/SKILL.md` neu anlegen:

````markdown
---
name: init
description: Use when dv-angular is set up in a project for the first time, or when the project CLAUDE.md should point agents to the Angular toolchain skill, to the hook that rejects other build and test tools, or to the Context7 and Microsoft Learn MCP servers.
disable-model-invocation: true
---

# dv-angular einrichten

`<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du stellst drei Fragen, jede mit Standard **Nein**, und ein Skript führt die Antworten aus. Bestehende Regeln der CLAUDE.md änderst du nie.

## Ablauf
1. Frage nacheinander, eine pro Nachricht:
   - „Hook einrichten? Er lehnt `ng build|test|lint`, `npx ng build|test|lint`, `npm test` und `npm run build|test|lint` im Bash-Tool sowie die Build/Test-Tools von dev-mcp ab und nennt den Skill `dv-angular:toolchain`. (Standard: Nein)“
   - „Microsoft Learn einrichten? Trägt den MCP `microsoft-learn` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
   - „Context7 einrichten? Trägt den MCP `context7` in die `.mcp.json` ein. Ist der MCP schon als Plugin installiert, wähle Nein. (Standard: Nein)“
2. `node "<PLUGIN>/scripts/init.js" --hook <ja|nein> --mcp <liste>`. `<liste>` enthält die mit Ja beantworteten MCPs (`microsoft-learn`, `context7`), ohne Ja ist sie `""`.
3. Gib die Ausgabe des Skripts wieder. Sage danach: Regeln wie „Build und Test über dev-mcp“ entfernt der Mensch von Hand; nach neuen MCP-Einträgen Claude Code neu starten.

## Häufige Fehler
| Fehler | Richtig |
|---|---|
| Hook oder MCP ohne Antwort einrichten | Standard ist Nein. |
| CLAUDE.md oder `.mcp.json` selbst bearbeiten | Nur das Skript ändert sie. |
````

- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/angular/tests/init.test.js plugins/angular/tests/skill-init.test.js plugins/angular/tests/project-setup.test.js` — erwartet: PASS, 39 Tests (14, 7 und 18)
  Gleichheit prüfen (Bash-Tool): `cmp plugins/dotnet/scripts/lib/project-setup.js plugins/angular/scripts/lib/project-setup.js` — erwartet: keine Ausgabe; `sed 's/dotnet/angular/g' plugins/dotnet/scripts/init.js | diff - plugins/angular/scripts/init.js` — erwartet: keine Ausgabe, Exit 0.
- [ ] **Schritt 5: Commit**
  `git add plugins/angular` · `git commit -m "feat(angular): add init skill and init script"`

### Task 12: Angular-Hook und Plugin-Version

**ACs:** AC-17, AC-35, AC-36

**Dateien:**
- Create: `plugins/angular/scripts/toolchain-guard.js`
- Create: `plugins/angular/hooks/hooks.json`
- Modify: `plugins/angular/.claude-plugin/plugin.json:3` · `"version": "1.1.2"`
- Test: `plugins/angular/tests/toolchain-guard.test.js`

**Interfaces:**
- Consumes: `hookEnabled(startDir, stack)`, `writeHookMarker(root, stack)` aus Task 10; `initProject(args)` aus Task 11.
- Produces: `decide(input: { tool_name: string, tool_input?: { command?: string }, cwd?: string }): string | null` und `blockedAction(input): string | null` aus `plugins/angular/scripts/toolchain-guard.js`; als Skript dieselbe Ein- und Ausgabe wie in Task 6, mit der Fehlerzeile `dv-angular guard: <fehler>`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/angular/tests/toolchain-guard.test.js` neu anlegen:

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const guard = require('../scripts/toolchain-guard');
const { initProject } = require('../scripts/init');
const setup = require('../scripts/lib/project-setup');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'toolchain-guard.js');
const HOOKS = path.join(__dirname, '..', 'hooks', 'hooks.json');
const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };

// Projekt mit eingerichtetem Hook; der Schalter liegt wie nach dem Init im Wurzelordner.
function hookedProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  setup.writeHookMarker(root, STACK);
  return root;
}

const bash = (root, command) => ({ tool_name: 'Bash', tool_input: { command }, cwd: root });

test('decide_DevMcpBuildAndTestTools_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__build_angular_project', 'mcp__plugin_x_dev-mcp__test_angular_project']) {
    const reason = guard.decide({ tool_name: tool, tool_input: {}, cwd: root });
    assert.match(reason, /`dv-angular:toolchain`/);
    assert.ok(reason.includes(tool));
  }
});

test('decide_OtherDevMcpTools_AreAllowed', () => {
  const root = hookedProject();
  for (const tool of ['mcp__dev-mcp__read_lines', 'mcp__dev-mcp__lint_angular_project', 'mcp__dev-mcp__build_dotnet_solution']) {
    assert.equal(guard.decide({ tool_name: tool, tool_input: {}, cwd: root }), null);
  }
});

test('decide_NgNpxNgAndNpmBuildTestLintInBash_AreRejectedNamingTheSkill', () => {
  const root = hookedProject();
  const commands = ['ng build', 'ng test --watch=false', 'ng lint', 'npx ng build', 'npm test', 'npm run build', 'npm run lint',
    'cd web && npm run test -- --browsers=ChromeHeadless', 'node_modules/.bin/ng test'];
  for (const command of commands) assert.match(guard.decide(bash(root, command)), /`dv-angular:toolchain`/, command);
});

test('decide_NpxNgGenerateAndOtherShellCommands_AreAllowed', () => {
  const root = hookedProject();
  const commands = ['npx ng generate component x', 'npx ng serve', 'npx ng version', 'ng generate service y', 'ng serve', 'ng version', 'npm install', 'npm run start', 'npm run buildx',
    'dv-angular-test --root web', 'git commit -m "npm test fix"', 'echo npm test'];
  for (const command of commands) assert.equal(guard.decide(bash(root, command)), null, command);
});

test('decide_NpxNgBuildThenGenerate_RejectsOnlyTheFirst', () => {
  const root = hookedProject();
  assert.match(guard.decide(bash(root, 'npx ng build')), /`dv-angular:toolchain`/);
  assert.equal(guard.decide(bash(root, 'npx ng generate component x')), null);
});

test('decide_PowerShellTool_IsNeverRejected', () => {
  const root = hookedProject();
  assert.equal(guard.decide({ tool_name: 'PowerShell', tool_input: { command: 'npm test' }, cwd: root }), null);
});

test('decide_ProjectWithoutSwitch_AllowsEverything', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  assert.equal(guard.decide(bash(root, 'npm test')), null);
  assert.equal(guard.decide({ tool_name: 'mcp__dev-mcp__build_angular_project', tool_input: {}, cwd: root }), null);
});

test('decide_CwdInSubfolder_FindsTheSwitchAbove', () => {
  const root = hookedProject();
  const sub = path.join(root, 'web', 'src');
  fs.mkdirSync(sub, { recursive: true });
  assert.match(guard.decide(bash(sub, 'npm test')), /dv-angular:toolchain/);
});

test('initThenDecide_HookYes_RejectsAfterwardsAndHookNoDoesNot', () => {
  const yes = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  initProject({ cwd: yes, hook: 'ja', mcp: [] });
  assert.match(guard.decide(bash(yes, 'npm test')), /`dv-angular:toolchain`/);
  const no = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-angular-guard-'));
  initProject({ cwd: no, hook: 'nein', mcp: [] });
  assert.equal(guard.decide(bash(no, 'npm test')), null);
});

test('cli_RejectedCall_PrintsDenyDecisionAsJson', () => {
  const root = hookedProject();
  const result = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'npm test')), encoding: 'utf8' });
  assert.equal(result.status, 0);
  const output = JSON.parse(result.stdout).hookSpecificOutput;
  assert.equal(output.hookEventName, 'PreToolUse');
  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /dv-angular:toolchain/);
});

test('cli_AllowedCallOrBrokenInput_PrintsNothingAndExitsZero', () => {
  const root = hookedProject();
  const allowed = spawnSync(process.execPath, [SCRIPT], { input: JSON.stringify(bash(root, 'git status')), encoding: 'utf8' });
  assert.deepEqual([allowed.status, allowed.stdout], [0, '']);
  const broken = spawnSync(process.execPath, [SCRIPT], { input: '{ kaputt', encoding: 'utf8' });
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, '');
  assert.match(broken.stderr, /^dv-angular guard: /);
});

test('hooksJson_Matcher_CoversBashAndTheTwoMcpToolsButNotPowerShell', () => {
  const [entry] = JSON.parse(fs.readFileSync(HOOKS, 'utf8')).hooks.PreToolUse;
  const matcher = new RegExp(entry.matcher);
  for (const tool of ['Bash', 'mcp__dev-mcp__build_angular_project', 'mcp__dev-mcp__test_angular_project']) assert.ok(matcher.test(tool), tool);
  for (const tool of ['PowerShell', 'Read', 'mcp__dev-mcp__read_lines']) assert.ok(!matcher.test(tool), tool);
  assert.equal(entry.hooks[0].command, 'node "${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js"');
});
````

- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/angular/tests/toolchain-guard.test.js` — erwartet: FAIL, `Cannot find module '../scripts/toolchain-guard'`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/angular/scripts/toolchain-guard.js` neu anlegen:

````js
#!/usr/bin/env node
'use strict';

// PreToolUse-Hook von dv-angular: lehnt Build, Test und Lint über dev-mcp, ng und npm im Bash-Tool ab und nennt den Skill.
// Er greift nur, wenn das Projekt ihn über den Init eingerichtet hat (.claude/dv-angular.json).

const fs = require('node:fs');
const { hookEnabled } = require('./lib/project-setup');

const STACK = { plugin: 'dv-angular', skill: 'dv-angular:toolchain' };
const MCP_TOOL = /^mcp__.+__(?:build_angular_project|test_angular_project)$/;
const NG_CALL = /(?:^|[;&|(\n]|\$\()\s*(?:npx\s+)?(?:\S*[\\/])?ng(?:\.cmd)?\s+(?:build|test|lint)\b/;
const NPM_CALL = /(?:^|[;&|(\n]|\$\()\s*npm\s+(?:test\b|run\s+(?:build|test|lint)\b)/;
const MAX_COMMAND_LENGTH = 120;

// Beschreibt den abzulehnenden Aufruf oder gibt null zurück, wenn der Aufruf nicht zu Build, Test und Lint gehört.
function blockedAction(input) {
  if (MCP_TOOL.test(String(input.tool_name))) return input.tool_name;
  if (input.tool_name !== 'Bash') return null;
  const command = String(input.tool_input?.command ?? '').trim();
  return NG_CALL.test(command) || NPM_CALL.test(command) ? `Bash ${command.slice(0, MAX_COMMAND_LENGTH)}` : null;
}

function reasonFor(action) {
  return `${STACK.plugin}: Build, Test und Lint laufen über den Skill \`${STACK.skill}\` (Skill-Tool laden) und dessen Befehle im Bash-Tool. Abgelehnt: ${action}.`;
}

// Die Begründung der Ablehnung oder null, wenn der Aufruf erlaubt ist.
function decide(input) {
  const action = blockedAction(input);
  if (!action || !hookEnabled(input.cwd ?? process.cwd(), STACK)) return null;
  return reasonFor(action);
}

function readStdinJson() {
  const raw = fs.readFileSync(0, 'utf8');
  return raw.trim() === '' ? {} : JSON.parse(raw);
}

function writeDeny(reason) {
  if (!reason) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason },
  }));
}

if (require.main === module) {
  try {
    writeDeny(decide(readStdinJson()));
  } catch (error) {
    // Ein Fehler im Hook darf die Arbeit nie blockieren.
    process.stderr.write(`${STACK.plugin} guard: ${error.message}\n`);
  }
}

module.exports = { decide, blockedAction };
````

  Datei `plugins/angular/hooks/hooks.json` neu anlegen:

````json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|mcp__.*__(build_angular_project|test_angular_project)",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/toolchain-guard.js\""
          }
        ]
      }
    ]
  }
}
````

  In `plugins/angular/.claude-plugin/plugin.json` die Version anheben (Edit-Tool, exakt):

Alt:

````json
"version": "1.1.2"
````

Neu:

````json
"version": "1.2.0"
````

- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/angular/tests/toolchain-guard.test.js` — erwartet: PASS, 12 Tests; danach alle Tests des Plugins: `node --test plugins/angular/tests/*.test.js` — erwartet: PASS, 0 fail
- [ ] **Schritt 5: Commit**
  `git add plugins/angular` · `git commit -m "feat(angular): add toolchain hook and bump version"`

### Task 13: forge löst die alte Schreibweise nicht mehr auf

**ACs:** AC-19

**Dateien:**
- Modify: `plugins/forge/scripts/forge-config.js:91-98` · `getValue`
- Modify: `plugins/forge/scripts/plan-tasks.js:176-199` · `buildBrief`
- Modify: `plugins/forge/scripts/lib/toolchain.js` · `resolveToolchain`
- Test: `plugins/forge/tests/forge-config.test.js` · `branchWorkitem_NoneEmptyInvalidNoBranchOrNoMatch_Null`
- Test: `plugins/forge/tests/plan-tasks.test.js` · `buildBrief_ToolchainReference_ResolvedToScriptCall`
- Test: `plugins/forge/tests/toolchain-resolve.test.js` · `resolveToolchain_Reference_BecomesNodeCall`

**Interfaces:**
- Consumes: Task 2 und Task 8 (die Skripte liegen nicht mehr in forge).
- Produces: `getValue(key: string, cwd?: string): string` aus `plugins/forge/scripts/forge-config.js` gibt den Wert von `Build`, `Test` und `Lint` wie jeden anderen Schlüssel unverändert zurück. `buildBrief(planPath: string, number: number): string` und die Datei `header-brief.md` aus `plan-tasks.js` lassen `dv-forge: <stack>-<kommando>` im Text stehen. `resolveToolchain` entfällt samt Datei `plugins/forge/scripts/lib/toolchain.js`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/plan-tasks.test.js` den Test `buildBrief_ToolchainReference_ResolvedToScriptCall` ersetzen (Edit-Tool, exakt):

Alt:

````js
test('buildBrief_ToolchainReference_ResolvedToScriptCall', () => {
  const plan = writePlan(PLAN.replace('Text eins.', 'Befehl: `dv-forge: dotnet-test --path <R>/src/App.sln` — erwartet: PASS'));
  const toolchain = path.join(__dirname, '..', 'scripts', 'toolchain', 'dotnet-test.js').replace(/\\/g, '/');
  assert.ok(planTasks.buildBrief(plan, 1).includes(`Befehl: \`node "${toolchain}" --path <R>/src/App.sln\``));
});
````

Neu:

````js
test('buildBrief_OldToolchainReference_StaysUnresolved', () => {
  const plan = writePlan(PLAN.replace('Text eins.', 'Befehl: `dv-forge: dotnet-test --path <R>/src/App.sln` — erwartet: PASS'));
  assert.ok(planTasks.buildBrief(plan, 1).includes('Befehl: `dv-forge: dotnet-test --path <R>/src/App.sln`'));
});
````

  Am Ende von `plugins/forge/tests/forge-config.test.js` anhängen (`makeRepo`, `commitFile` und `config` sind dort schon eingebunden):

````js

test('getValue_TestWithOldToolchainSpelling_ReturnsTheValueUnresolved', () => {
  const repo = makeRepo();
  commitFile(repo, 'CLAUDE.md', '## dv-forge\n\n- Test: `dv-forge: dotnet-test --path src/App.sln`\n', 'config');
  assert.equal(config.getValue('Test', repo), 'dv-forge: dotnet-test --path src/App.sln');
});
````

- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/forge-config.test.js plugins/forge/tests/plan-tasks.test.js` — erwartet: FAIL `getValue_TestWithOldToolchainSpelling_ReturnsTheValueUnresolved` und FAIL `buildBrief_OldToolchainReference_StaysUnresolved`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/forge-config.js` die Einbindung von `resolveToolchain` und die Funktion `getValue` ersetzen (Edit-Tool, exakt, beide Stellen):

Alt:

````js
const { resolveToolchain } = require('./lib/toolchain');
````

Neu:

Die Zeile entfällt ersatzlos.

Alt:

````js
const COMMAND_KEYS = new Set(['Build', 'Test', 'Lint']);

// Build, Test und Lint kommen ausführbar zurück: "dv-forge: dotnet-test" wird zum Skript-Aufruf.
function getValue(key, cwd = process.cwd()) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new ConfigError(`Unbekannter Schlüssel: ${key}`);
  const value = readConfig(cwd).config[key];
  return COMMAND_KEYS.has(key) ? resolveToolchain(value) : value;
}
````

Neu:

````js
function getValue(key, cwd = process.cwd()) {
  if (!Object.hasOwn(DEFAULTS, key)) throw new ConfigError(`Unbekannter Schlüssel: ${key}`);
  return readConfig(cwd).config[key];
}
````

  In `plugins/forge/scripts/plan-tasks.js` die Einbindung und die beiden Aufrufe von `resolveToolchain` entfernen (Edit-Tool, exakt, alle drei Stellen):

Alt:

````js
const { resolveToolchain } = require('./lib/toolchain');
````

Neu:

Die Zeile entfällt ersatzlos.

Alt:

````js
return resolveToolchain(`${[...header, '', ...body].join('\n')}\n`);
````

Neu:

````js
return `${[...header, '', ...body].join('\n')}\n`;
````

Alt:

````js
return writeFile(dir, 'header-brief.md', resolveToolchain(buildHeader(planPath)));
````

Neu:

````js
return writeFile(dir, 'header-brief.md', buildHeader(planPath));
````

  Dann die Auflösung samt Test löschen: `git rm plugins/forge/scripts/lib/toolchain.js plugins/forge/tests/toolchain-resolve.test.js`
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/forge-config.test.js plugins/forge/tests/plan-tasks.test.js plugins/forge/tests/prepare.test.js` — erwartet: PASS, 0 fail; `grep -rn "resolveToolchain\|lib/toolchain" plugins/forge --include=*.js` — erwartet: keine Ausgabe.
- [ ] **Schritt 5: Commit**
  `git add -A plugins/forge` · `git commit -m "refactor(forge): stop resolving dv-forge toolchain references"`

### Task 14: setup-check meldet nur die alte Schreibweise

**ACs:** AC-19, AC-20

**Dateien:**
- Modify: `plugins/forge/scripts/setup-check.js:1-219` · `check`
- Test: `plugins/forge/tests/setup-check.test.js` · `cli_ProjectWithOldRules_FindingsGroupedPerFile`

**Interfaces:**
- Consumes: Task 13 (keine Auflösung mehr).
- Produces: `check(cwd: string): { root, project, global }` und `render(result): string` aus `plugins/forge/scripts/setup-check.js` (ohne `platforms`, ohne Abschnitt „Vorschläge für Build, Test, Lint“, `toolchainSuggestion` entfällt); neue Regel `legacyToolchain` mit der Bezeichnung „dv-forge-Schreibweise veraltet“ und dem neuen Befehl `dv-<stack>-<kommando>` als Hinweis; die Regeln `toolchain`, `shellBan`, `buildLogFilter`, `config` und `mcpJson` entfallen, `scaffold`, `moved`, `dropped` und `denyNode` bleiben.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/setup-check.test.js` vollständig ersetzen (Write-Tool):

````js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { makeRepo } = require('./lib/git-repo');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'setup-check.js');

function write(root, file, content) {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

function run(repo, home) {
  return spawnSync(process.execPath, [SCRIPT, '--cwd', repo], { encoding: 'utf8', env: { ...process.env, CLAUDE_CONFIG_DIR: home } });
}

function setup() {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'CLAUDE.md', [
    '# Projekt',
    '| Angular-Tests | `dev-mcp`: `test_angular_project` — niemals via Shell/PowerShell |',
    '| Klasse lesen | `dev-mcp`: `read_method` |',
    '| `build-log-filter` | Docker HTTP |',
    '- Build-Ausgaben immer knapp halten.',
    '| Tests | `dv-forge: dotnet-test` — nie direkt `dotnet test` über die Shell |',
    '- Komponenten mit `scaffold_angular_component` anlegen.',
    '',
    '## dv-forge',
    '- Test: `dv-forge: angular-test --root web`',
    '',
  ].join('\n'));
  write(repo, '.claude/skills/angular/references/op-tooling.md', 'VERBOTEN: `ng build` als Shell-Kommando.\nfind_implementations nutzen.\n');
  write(repo, '.mcp.json', JSON.stringify({ mcpServers: { 'build-log-filter': {}, 'codebase-analyzer': {} } }));
  write(repo, '.claude/settings.json', JSON.stringify({ permissions: { deny: ['Bash(node:*)', 'Bash(rm -rf:*)'] } }));
  write(repo, 'src/App.sln', '');
  write(repo, 'web/angular.json', '{}');
  write(home, 'skills/dev-mcp/SKILL.md', 'Use build_dotnet_solution via dev-mcp.\nAlt: dv-forge: dotnet-lint --path x\n');
  write(home, 'plugins/cache/dv-market/dv-angular/1.0.0/skills/angular-migration/SKILL.md', 'Verify with dv-forge: angular-build --root web.\n');
  write(home, 'plugins/cache/dv-market/dv-angular/1.0.0/README.md', 'dv-forge: angular-build outside skills\n');
  write(home, 'plugins/cache/dv-market/dv-forge/0.6.0/skills/init/SKILL.md', 'dv-forge: dotnet-test\n');
  return { repo, home };
}

test('cli_OldSpellingInClaudeMd_ReportedAsOutdatedWithNewCommand', () => {
  const { repo, home } = setup();
  const result = run(repo, home);
  assert.equal(result.status, 0, result.stderr);
  const out = result.stdout;
  assert.match(out, /### CLAUDE\.md \(\d+ Stellen\)/);
  assert.match(out, /- dv-forge-Schreibweise veraltet · Z\. 6, 10 → durch den neuen Befehl ersetzen \(`dv-dotnet-test`, `dv-angular-test`\)/);
});

test('cli_EverySpellingOfTheSixTools_NamesItsReplacement', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  const tools = ['dotnet-build', 'dotnet-test', 'dotnet-lint', 'angular-build', 'angular-test', 'angular-lint'];
  write(repo, 'CLAUDE.md', tools.map((tool) => `- Befehl: dv-forge: ${tool} --path x`).join('\n'));
  const out = run(repo, home).stdout;
  for (const tool of tools) assert.ok(out.includes(`\`dv-${tool}\``), `${tool} ohne Ersatz`);
});

test('cli_OldRulesAboutMovedTools_AreNoLongerReported', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.doesNotMatch(out, /Build\/Test\/Lint über dev-mcp|Verbot von Build\/Test|build-log-filter|Vorschläge für Build/);
  assert.doesNotMatch(out, /### \.mcp\.json/);
  assert.doesNotMatch(out, /dv-forge-Einstellung zeigt auf ein MCP-Tool/);
});

test('cli_RemainingRules_StillReported', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /- Anlegen über dev-mcp · Z\. 7 → auf `ng generate`/);
  assert.match(out, /- Lese-Tool beim dev-mcp verortet · Z\. 3 → `dev-mcp` durch `codebase-analyzer` ersetzen/);
  assert.match(out, /### \.claude\/skills\/angular\/references\/op-tooling\.md \(1 Stelle\)\n- Tool, das wegfällt · Z\. 2/);
  assert.match(out, /### \.claude\/settings\.json \(1 Stelle\)\n- node über die Shell verboten → .*\(`Bash\(node:\*\)`\)/);
});

test('cli_GlobalSkills_ListedSeparatelyAsSource', () => {
  const { repo, home } = setup();
  const out = run(repo, home).stdout;
  assert.match(out, /Global: 2 Stellen in 2 Dateien/);
  assert.match(out, /## Global \(in der Quelle ändern, nicht in der installierten Kopie; Plugins danach mit `\/plugin update`\)\n\n### ~\/\.claude\/skills\/dev-mcp\/SKILL\.md \(1 Stelle\)/);
  assert.match(out, /### ~\/\.claude\/plugins\/cache\/dv-market\/dv-angular\/1\.0\.0\/skills\/angular-migration\/SKILL\.md \(1 Stelle\)/);
  assert.doesNotMatch(out, /dv-forge\/0\.6\.0|README\.md/);
});

test('cli_NewSpelling_IsNotReported', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'CLAUDE.md', '# P\n- Test: dv-dotnet-test --path src/App.sln\n');
  assert.match(run(repo, home).stdout, /Keine Stolperfallen\./);
});

test('cli_CleanProject_NoFindingsAndNoSuggestionsForMovedTools', () => {
  const repo = makeRepo();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-home-'));
  write(repo, 'src/App.sln', '');
  const out = run(repo, home).stdout;
  assert.match(out, /Projekt: 0 Stellen/);
  assert.match(out, /Keine Stolperfallen\./);
  assert.doesNotMatch(out, /Vorschläge|dv-dotnet-|dv-angular-|dv-forge: /);
});

test('cli_BadArgs_ExitTwo', () => {
  assert.equal(spawnSync(process.execPath, [SCRIPT, '--foo'], { encoding: 'utf8' }).status, 2);
});
````

- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/setup-check.test.js` — erwartet: FAIL, unter anderem `cli_OldSpellingInClaudeMd_ReportedAsOutdatedWithNewCommand`, `cli_EverySpellingOfTheSixTools_NamesItsReplacement`, `cli_OldRulesAboutMovedTools_AreNoLongerReported`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/setup-check.js` vollständig ersetzen (Write-Tool):

````js
#!/usr/bin/env node
'use strict';

// Findet Stolperfallen im Projekt-Setup, die dv-forge ausbremsen: Regeln und Einträge aus der Zeit,
// als Werkzeuge noch über dev-mcp liefen oder umgezogen sind, und die alte Schreibweise "dv-forge: <stack>-<kommando>".
// Build, Test und Lint gehören den Plugins dv-dotnet und dv-angular; dv-forge meldet von ihnen nur die alte Schreibweise.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { toPosix } = require('./lib/posix');

const USAGE = 'Aufruf: node setup-check.js [--cwd <projektordner>]\n';
const SKIPPED_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git', '.angular', '.vs', '.forge']);

const SCAFFOLD_TOOLS = /\b(scaffold_angular_component|scaffold_angular_service|scaffold_angular_directive|scaffold_spec_for|create_angular_project|create_dotnet_solution|scaffold_dotnet_project|scaffold_dto|scaffold_api_action|run_ef_migration)\b/;
const MOVED_TOOLS = /\b(read_method|read_signatures_only|read_class_summary|read_component_bundle|analyze_angular_architecture|insert_member|update_imports)\b/;
const DROPPED_TOOLS = { find_implementations: 'codebase-analyzer: find_type_hierarchy', rename_file_with_impact: 'Suche nach dem Dateinamen plus git mv' };
const LEGACY_SPELLING = /\bdv-forge:\s*((?:angular|dotnet)-(?:build|test|lint))\b/g;

class CheckError extends Error {}

function repoRoot(cwd) {
  const result = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new CheckError(`Kein Git-Repo: ${cwd}`);
  return path.resolve(result.stdout.trim());
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// CLAUDE.md, Skills und Agents unter einem Ordner (Projekt: <root>/.claude, global: ~/.claude).
function markdownFiles(claudeMd, claudeDir) {
  const files = [claudeMd];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIPPED_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(dir, entry.name));
    }
  };
  walk(path.join(claudeDir, 'skills'));
  walk(path.join(claudeDir, 'agents'));
  return files.filter((file) => fs.existsSync(file));
}

// Installierte Plugins liegen unter <home>/plugins/cache/<marketplace>/<plugin>/<version>/.
// dv-forge selbst bleibt außen vor.
function pluginFiles(home) {
  const files = [];
  const walk = (dir, inContent) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name) && !/^(dv-)?forge$/.test(entry.name)) walk(full, inContent || ['skills', 'agents', 'commands'].includes(entry.name));
      } else if (inContent && entry.name.endsWith('.md')) files.push(full);
    }
  };
  const cache = path.join(home, 'plugins', 'cache');
  if (fs.existsSync(cache)) walk(cache, false);
  return files;
}

function globalDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Je Regel: kurze Bezeichnung, warum sie stört, was du vorschlägst.
const RULES = {
  legacyToolchain: { label: 'dv-forge-Schreibweise veraltet', why: 'Die Werkzeuge liegen jetzt in dv-dotnet und dv-angular und heißen dv-<stack>-<kommando>; dv-forge löst die alte Schreibweise nicht mehr auf.', proposal: 'durch den neuen Befehl ersetzen' },
  scaffold: { label: 'Anlegen über dev-mcp', why: 'Anlegen läuft über die Shell, Konventionen stehen in den Skills angular und dotnet.', proposal: 'auf `ng generate`, `dotnet new` bzw. `dotnet ef` umstellen' },
  moved: { label: 'Lese-Tool beim dev-mcp verortet', why: 'Es liegt jetzt im codebase-analyzer.', proposal: '`dev-mcp` durch `codebase-analyzer` ersetzen' },
  dropped: { label: 'Tool, das wegfällt', why: 'find_implementations und rename_file_with_impact gibt es künftig nicht mehr.', proposal: 'find_type_hierarchy bzw. Suche plus `git mv`' },
  denyNode: { label: 'node über die Shell verboten', why: 'Damit laufen die dv-forge-Skripte nicht.', proposal: 'Regel entfernen oder auf konkrete Befehle einschränken' },
};

// Die neuen Befehle der gefundenen alten Schreibweisen: "dv-forge: dotnet-test" → "dv-dotnet-test".
function legacyHints(text) {
  return [...text.matchAll(LEGACY_SPELLING)].map((match) => `dv-${match[1]}`);
}

function markdownFindings(file, label) {
  const findings = [];
  const add = (rule, line, hint) => findings.push({ file: label, rule, line, hint });
  let inConfig = false;
  fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n').forEach((text, index) => {
    const line = index + 1;
    for (const hint of legacyHints(text)) add('legacyToolchain', line, hint);
    // Der eigene Abschnitt ## dv-forge gehört den Einstellungen, nicht der übrigen Textsuche.
    if (/^#{1,2}\s/.test(text)) inConfig = text.trim() === '## dv-forge';
    if (inConfig) return;
    if (SCAFFOLD_TOOLS.test(text)) add('scaffold', line);
    if (MOVED_TOOLS.test(text) && /dev-mcp/i.test(text)) add('moved', line);
    if (Object.keys(DROPPED_TOOLS).some((tool) => text.includes(tool))) add('dropped', line);
  });
  return findings;
}

function settingsFindings(root) {
  return ['settings.json', 'settings.local.json'].flatMap((name) => {
    const settings = readJson(path.join(root, '.claude', name));
    return (settings?.permissions?.deny ?? []).filter((rule) => /^Bash\(node\b/.test(rule))
      .map((rule) => ({ file: `.claude/${name}`, rule: 'denyNode', line: 0, hint: rule }));
  });
}

function check(cwd) {
  const root = repoRoot(cwd);
  const home = globalDir();
  const project = [
    ...markdownFiles(path.join(root, 'CLAUDE.md'), path.join(root, '.claude'))
      .flatMap((file) => markdownFindings(file, toPosix(path.relative(root, file)))),
    ...settingsFindings(root),
  ];
  const global = path.resolve(home) === path.resolve(root, '.claude') ? [] : markdownFiles(path.join(home, 'CLAUDE.md'), home)
    .concat(pluginFiles(home))
    .flatMap((file) => markdownFindings(file, `~/.claude/${toPosix(path.relative(home, file))}`));
  return { root, project, global };
}

// Je Datei eine Gruppe, je Regel eine Zeile mit allen Fundstellen: eine Entscheidung pro Datei.
function renderGroup(findings) {
  const lines = [];
  const files = [...new Set(findings.map((f) => f.file))];
  for (const file of files) {
    const own = findings.filter((f) => f.file === file);
    lines.push(`### ${file} (${own.length} ${own.length === 1 ? 'Stelle' : 'Stellen'})`);
    for (const rule of [...new Set(own.map((f) => f.rule))]) {
      const hits = own.filter((f) => f.rule === rule);
      const where = hits.some((f) => f.line > 0) ? ` · Z. ${[...new Set(hits.map((f) => f.line))].join(', ')}` : '';
      const hints = [...new Set(hits.map((f) => f.hint).filter(Boolean))];
      lines.push(`- ${RULES[rule].label}${where} → ${RULES[rule].proposal}${hints.length > 0 ? ` (${hints.map((h) => `\`${h}\``).join(', ')})` : ''}`);
    }
    lines.push('');
  }
  return lines;
}

function render({ root, project, global }) {
  const used = [...new Set([...project, ...global].map((f) => f.rule))];
  const lines = [`# Setup-Check: ${toPosix(root)}`, '', `Projekt: ${project.length} Stellen in ${new Set(project.map((f) => f.file)).size} Dateien · Global: ${global.length} Stellen in ${new Set(global.map((f) => f.file)).size} Dateien`, ''];
  if (used.length > 0) lines.push('## Warum', ...used.map((rule) => `- ${RULES[rule].label}: ${RULES[rule].why}`), '');
  lines.push('## Projekt', '', ...(project.length > 0 ? renderGroup(project) : ['Keine Stolperfallen.', '']));
  if (global.length > 0) lines.push('## Global (in der Quelle ändern, nicht in der installierten Kopie; Plugins danach mit `/plugin update`)', '', ...renderGroup(global));
  return `${lines.join('\n')}\n`;
}

function main() {
  const args = process.argv.slice(2);
  if (!(args.length === 0 || (args.length === 2 && args[0] === '--cwd'))) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(render(check(args[1] ?? process.cwd())));
  } catch (error) {
    if (!(error instanceof CheckError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { check, render };
````

- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/setup-check.test.js` — erwartet: PASS, 8 Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge` · `git commit -m "refactor(forge): setup-check reports only the old toolchain spelling"`

### Task 15: forge-Init-Skill, Plan-Format und Version

**ACs:** AC-19

**Dateien:**
- Modify: `plugins/forge/skills/init/SKILL.md:3-32` · `Stolperfallen`
- Modify: `plugins/forge/skills/plan-writing/references/plan-format.md:71` · `Befehl oder Tool-Aufruf`
- Modify: `plugins/forge/.claude-plugin/plugin.json:3` · `"version": "0.17.0"`
- Test: `plugins/forge/tests/work-skills.test.js` · `init_Body_ChecksSetupBeforeConfig`
- Test: `plugins/forge/tests/plan-writing.test.js` · `planFormat_DecisionEntries_DesignChoiceNotBindingAndNoQuestionsLine`

**Interfaces:**
- Consumes: Task 14 (`setup-check` ohne „Vorschläge“).
- Produces: Der Init-Skill von dv-forge fragt `Build`, `Test` und `Lint` ohne Vorschläge für die verschobenen Werkzeuge und akzeptiert einen beliebigen Befehl; das Plan-Format nennt `dv-<stack>-<kommando>` als Start-Befehle im Bash-Tool.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  In `plugins/forge/tests/work-skills.test.js` den Schluss des Tests `init_Body_ChecksSetupBeforeConfig` ersetzen und einen Test anhängen (Edit-Tool, exakt):

Alt:

````js
  assert.ok(body.includes('dv-forge: dotnet-test'));
});
````

Neu:

````js
  assert.doesNotMatch(body, /dv-forge: (?:angular|dotnet)-|Vorschläge/);
});

test('init_Row_BuildTestLintAcceptsAnyCommandWithoutToolSuggestions', () => {
  const { body } = skill('init');
  assert.ok(body.includes('| `Build`, `Test`, `Lint` | Befehl, z. B. `npm test`; mehrere mit ` ; ` | leer |'));
});

// Ein „: “ im unquotierten Wert lehnt ein strenger YAML-Parser ab.
test('init_Description_HasNoColonSpace', () => {
  const { fields } = skill('init');
  assert.doesNotMatch(fields.description, /: /);
});
````

  In `plugins/forge/tests/plan-writing.test.js` die Zeile mit dem Beispielbefehl ersetzen (Edit-Tool, exakt):

Alt:

````js
  assert.ok(text.includes('dv-forge: angular-test --root <R>/src/frontend -- --include src/app/<pfad>.spec.ts'));
````

Neu:

````js
  assert.ok(text.includes('dv-angular-test --root <R>/src/frontend -- --include src/app/<pfad>.spec.ts'));
  assert.doesNotMatch(text, /dv-forge: (?:angular|dotnet)-/);
````

- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/work-skills.test.js plugins/forge/tests/plan-writing.test.js` — erwartet: FAIL `init_Body_ChecksSetupBeforeConfig`, FAIL `init_Row_BuildTestLintAcceptsAnyCommandWithoutToolSuggestions`, FAIL `planFormat_DecisionEntries_DesignChoiceNotBindingAndNoQuestionsLine`; `init_Description_HasNoColonSpace` ist schon grün (die bisherige description enthält kein „: “) und sichert die neue ab
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/skills/init/SKILL.md` drei Stellen ersetzen (Edit-Tool, exakt):

Alt:

````markdown
or when project rules, skills or MCP entries may still send build, test or lint through dev-mcp or build-log-filter.
````

Neu:

````markdown
or when project rules or skills may still use tools that no longer exist or the old dv-forge `<stack>-<kommando>` spelling of build, test and lint commands.
````

Alt:

````markdown
etwa Build und Test nur über dev-mcp oder ein Shell-Verbot, das die dv-forge-Skripte trifft.
````

Neu:

````markdown
etwa Tools, die es nicht mehr gibt, oder die alte Schreibweise `dv-forge: <stack>-<kommando>`.
````

Alt:

````markdown
| `Build`, `Test`, `Lint` | Befehl oder dv-forge-Skript aus „Vorschläge“ von `setup-check.js`, z. B. `dv-forge: dotnet-test --path src/App.sln`; mehrere mit ` ; ` | leer |
````

Neu:

````markdown
| `Build`, `Test`, `Lint` | Befehl, z. B. `npm test`; mehrere mit ` ; ` | leer |
````

  In `plugins/forge/skills/plan-writing/references/plan-format.md` die Regel 10 anpassen (Edit-Tool, exakt):

Alt:

````markdown
z. B. `dv-forge: dotnet-test --path <R>/src/App.Tests -- --filter OrderTests` oder `dv-forge: angular-test --root <R>/src/frontend -- --include src/app/<pfad>.spec.ts`; Argumente nach `--` reicht das Skript an das Test-Werkzeug durch. `dv-forge: <plattform>-<kommando>` löst das Brief-Skript in den Skript-Aufruf auf.
````

Neu:

````markdown
z. B. `dv-dotnet-test --path <R>/src/App.Tests -- --filter OrderTests` oder `dv-angular-test --root <R>/src/frontend -- --include src/app/<pfad>.spec.ts`; Argumente nach `--` reicht der Befehl an das Test-Werkzeug durch. `dv-<stack>-<kommando>` sind die Start-Befehle der Plugins dv-dotnet und dv-angular; sie laufen im Bash-Tool.
````

  In `plugins/forge/.claude-plugin/plugin.json` die Version anheben (Edit-Tool, exakt):

Alt:

````json
"version": "0.17.0"
````

Neu:

````json
"version": "0.18.0"
````

- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/work-skills.test.js plugins/forge/tests/plan-writing.test.js plugins/forge/tests/skill.test.js` — erwartet: PASS, 0 fail; danach alle drei Plugins: `node --test plugins/forge/tests/*.test.js`, `node --test plugins/dotnet/tests/*.test.js`, `node --test plugins/angular/tests/*.test.js` — erwartet: je PASS, 0 fail (dotnet mit 6 übersprungenen Tests unter Windows).
- [ ] **Schritt 5: Commit**
  `git add plugins/forge` · `git commit -m "docs(forge): point init skill and plan format to the stack plugins"`

### Task 16: Verweise auf die alte Schreibweise im Repo umstellen

**ACs:** keins (Folgearbeit der Soll-Vorgabe zu forge: die alte Schreibweise wird nicht mehr aufgelöst; siehe R1 · Entscheidungen)

**Dateien:**
- Modify: `CLAUDE.md:51-52` · `MCP-First (immer aktiv)`
- Modify: `.claude/skills/dev-mcp/SKILL.md:6,18` · `Was wohin gehört`
- Modify: `.claude/skills/dev-mcp/references/routing.md:3,9-10` · `dev-mcp Routing`
- Modify: `.claude/skills/dev-mcp/references/workflows.md:16,28,45` · `dv-forge: dotnet-test --path <testprojekt>`
- Modify: `.claude/skills/dev-mcp/references/tool-catalog.md:5` · `dv-forge: <plattform>-<kommando>`
- Modify: `.claude/skills/dev-mcp/references/error-guide.md:9` · `Fehler im dv-forge-Skript`
- Modify: `.claude/skills/codebase-analyzer/SKILL.md:340-494` · `dv-forge: dotnet-test --path <Testprojekt>`
- Modify: `.claude/skills/angular/references/new-app/op-create-app.md:31-33` · `dv-forge: angular-build`
- Modify: `.claude/skills/angular/references/developer/OVERVIEW.md:6-14` · `dv-forge: angular-build`
- Modify: `.claude/skills/angular/references/developer/op-tooling.md:17-19` · `dv-forge: angular-lint --root <angular-ordner>`
- Modify: `.claude/skills/angular/references/developer/testing.md:62-63` · `dv-forge: angular-test`
- Modify: `.claude/skills/angular/references/developer/feature-first-layout.md:318,332` · `dv-forge: angular-build`
- Modify: `.claude/skills/angular/references/developer/op-new-project.md:20-21` · `dv-forge: angular-build`
- Modify: `.claude/skills/angular/references/developer/op-migration.md:29` · `dv-forge: angular-build`

**Interfaces:**
- Consumes: die Befehlsnamen `dv-dotnet-build|test|lint` (Task 1) und `dv-angular-build|test|lint` (Task 7); die Regel `legacyToolchain` von `setup-check` (Task 14) als Prüfung.
- Produces: `CLAUDE.md`, `.claude/skills` und `.claude/agents` dieses Repos enthalten keine Zeile mehr in der Schreibweise `dv-forge: <stack>-<kommando>`. Die Projekt-CLAUDE.md wird nur in der Schreibweise der zwei Tabellenzeilen geändert, nicht gekürzt. `plugins/relay/`, `docs/` und die Testfixtures unter `plugins/forge/tests` bleiben unberührt.

- [ ] **Schritt 1: Zeilen mit eigenem Wortlaut ersetzen**
  In `.claude/skills/dev-mcp/references/routing.md` drei Stellen ersetzen (Edit-Tool, exakt):

Alt:

````markdown
Lesen wenn unklar ist, ob dev-mcp, codebase-analyzer, ein dv-forge-Skript oder die Shell zuständig ist.
````

Neu:

````markdown
Lesen wenn unklar ist, ob dev-mcp, codebase-analyzer, ein Befehl von dv-dotnet bzw. dv-angular oder die Shell zuständig ist.
````

Alt:

````markdown
| Angular **bauen / testen / linten** | `dv-forge: angular-build`, `angular-test`, `angular-lint` |
````

Neu:

````markdown
| Angular **bauen / testen / linten** | `dv-angular-build`, `dv-angular-test`, `dv-angular-lint` im Bash-Tool |
````

Alt:

````markdown
| .NET **bauen / testen / linten** | `dv-forge: dotnet-build`, `dotnet-test`, `dotnet-lint` |
````

Neu:

````markdown
| .NET **bauen / testen / linten** | `dv-dotnet-build`, `dv-dotnet-test`, `dv-dotnet-lint` im Bash-Tool |
````

  In `.claude/skills/dev-mcp/SKILL.md` zwei Stellen ersetzen (Edit-Tool, exakt):

Alt:

````markdown
  files or running processes via the dev-mcp server. Not for build/test/lint (→ dv-forge scripts),
````

Neu:

````markdown
  files or running processes via the dev-mcp server. Not for build/test/lint (→ dv-dotnet-*/dv-angular-* commands),
````

Alt:

````markdown
| Build, Test, Lint | `dv-forge: angular-build|test|lint`, `dv-forge: dotnet-build|test|lint` — nie direkt `ng`/`dotnet` |
````

Neu:

````markdown
| Build, Test, Lint | `dv-angular-build|test|lint`, `dv-dotnet-build|test|lint` im Bash-Tool — nie direkt `ng`/`dotnet` |
````

  In `.claude/skills/dev-mcp/references/tool-catalog.md` (Edit-Tool, exakt):

Alt:

````markdown
Build, Test und Lint: `dv-forge: <plattform>-<kommando>`.
````

Neu:

````markdown
Build, Test und Lint: `dv-<stack>-<kommando>` im Bash-Tool (Plugins dv-dotnet und dv-angular).
````

  In `.claude/skills/dev-mcp/references/error-guide.md` (Edit-Tool, exakt):

Alt:

````markdown
| Build/Test schlägt fehl | Fehler im dv-forge-Skript |
````

Neu:

````markdown
| Build/Test schlägt fehl | Fehler im Befehl `dv-<stack>-<kommando>` |
````

- [ ] **Schritt 2: Übrige Stellen ersetzen**
  Je Datei die genannten Zeichenfolgen ersetzen (Edit-Tool, `replace_all: true`, exakt; links alt, rechts neu). Nur die Zeichenfolge ändert sich, der übrige Zeileninhalt bleibt:

| Datei | Ersetzungen |
|---|---|
| `CLAUDE.md` | `dv-forge: angular-test` → `dv-angular-test`; `dv-forge: dotnet-test` → `dv-dotnet-test` |
| `.claude/skills/dev-mcp/references/workflows.md` | `dv-forge: angular-test` → `dv-angular-test`; `dv-forge: dotnet-test` → `dv-dotnet-test`; `dv-forge: dotnet-build` → `dv-dotnet-build` |
| `.claude/skills/codebase-analyzer/SKILL.md` | `dv-forge: dotnet-test` → `dv-dotnet-test`; `dv-forge: angular-test` → `dv-angular-test` |
| `.claude/skills/angular/references/new-app/op-create-app.md` | `dv-forge: angular-build` → `dv-angular-build` |
| `.claude/skills/angular/references/developer/OVERVIEW.md` | `dv-forge: angular-build` → `dv-angular-build`; `dv-forge: angular-test` → `dv-angular-test` |
| `.claude/skills/angular/references/developer/op-tooling.md` | `dv-forge: angular-build` → `dv-angular-build`; `dv-forge: angular-test` → `dv-angular-test`; `dv-forge: angular-lint` → `dv-angular-lint` |
| `.claude/skills/angular/references/developer/testing.md` | `dv-forge: angular-test` → `dv-angular-test`; `dv-forge: angular-build` → `dv-angular-build` |
| `.claude/skills/angular/references/developer/feature-first-layout.md` | `dv-forge: angular-build` → `dv-angular-build` |
| `.claude/skills/angular/references/developer/op-new-project.md` | `dv-forge: angular-build` → `dv-angular-build` |
| `.claude/skills/angular/references/developer/op-migration.md` | `dv-forge: angular-build` → `dv-angular-build` |

- [ ] **Schritt 3: Keine alte Schreibweise mehr prüfen**
  Befehl im Bash-Tool, im Repo-Wurzelordner: `grep -rnE "dv-forge: ?(angular|dotnet)-(build|test|lint)|dv-forge: <|dv-forge-Skript|dv-forge scripts" CLAUDE.md .claude/skills .claude/agents` — erwartet: keine Ausgabe, Exit 1.
  Befehl im Bash-Tool: `node plugins/forge/scripts/setup-check.js --cwd . | sed -n '/^## Projekt/,/^## Global/p' | grep -c "dv-forge-Schreibweise veraltet"` — erwartet: `0`.
- [ ] **Schritt 4: Commit**
  `git add CLAUDE.md .claude/skills` · `git commit -m "docs: switch repo skills to the dv-<stack>-<kommando> commands"`

## Entscheidungen
- **W · Planungs-Skills** · Aussage — `superpowers:writing-skills` und `software-design-principles` gelten für diesen Plan („b aber auch /superpowers:writing-skills“).
- **E · Ein Plan** · Planer — Die Plan-Regeln verlangen jedes AC der Spec in mindestens einem Task; Teilpläne je Stack würden jeweils fehlende ACs melden. Die Tasks sind so geordnet, dass jeder Stand grün bleibt: Start-Befehle mit Windows-Prüfung zuerst, dann .NET, dann Angular, forge zuletzt.
- **E · Start-Befehle in `bin/`** · Planer — Claude Code setzt das `bin/` aktivierter Plugins auf den PATH des Bash-Tools; gemessen in der Sitzung und in einem Subagent (das `bin/` des Plugins caveman stand im PATH). Die Befehle brauchen so keinen versionierten Plugin-Pfad.
- **E · `.gitignore` und `.gitattributes`** · Planer — `.gitignore` ignoriert jeden `bin/`-Ordner (Regel `[Bb]in/`), und `core.autocrlf=true` würde die Start-Befehle mit CRLF auschecken, womit der Shebang `node\r` scheitert. Darum die Ausnahme `!plugins/*/bin/` und die Regel `plugins/*/bin/** text eol=lf`.
- **E · Ausführ-Bit** · Planer — `git add --chmod=+x` setzt `100755` für die Start-Befehle; unter Windows/Git Bash ist es nicht nötig, auf Linux und macOS schon.
- **E · Hook-Schalter als Datei** · Planer — Der Hook steht in `hooks/hooks.json` des Plugins und ist immer registriert; er greift nur, wenn `.claude/dv-<stack>.json` mit `{ "hook": true }` im Projekt liegt. Ein Eintrag in den Projekt-Einstellungen scheidet aus, weil der Plugin-Pfad die Version trägt. Die Schalter-Datei wandert durch Git, der Init weist auf das Committen hin. Der Init schaltet nie aus: Nein lässt einen vorhandenen Schalter stehen.
- **E · Hook und MCP-Tools** · Planer — „im Bash-Tool“ gilt für die Shell-Befehle; die dev-mcp-Tools `build_dotnet_solution`, `test_dotnet_solution`, `build_angular_project` und `test_angular_project` lehnt der Hook unabhängig davon ab. Die Lint-Tools von dev-mcp (`run_inspectcode`, `lint_angular_project`) bleiben erlaubt, weil die Spec nur Build/Test nennt.
- **E · Init als Skript plus Skill** · Planer — Das Skript ändert CLAUDE.md, `.mcp.json` und Schalter deterministisch und ist testbar (AC-12, AC-24, AC-25, AC-26); der Skill stellt nur die Fragen und ruft das Skript auf.
- **E · `project-setup.js` doppelt** · Planer — Plugins teilen keine Dateien, deshalb liegt die Datei inhaltsgleich in dv-dotnet und dv-angular (Task 10 prüft mit `cmp`). Die MCP-Einträge sind `type: http` mit den offiziellen Adressen `https://mcp.context7.com/mcp` (Quelle: installiertes Context7-Plugin) und `https://learn.microsoft.com/api/mcp` (Quelle: README des Skills microsoft-learn), ohne API-Schlüssel. Bei einer Ergänzung wird die `.mcp.json` mit zwei Leerzeichen neu eingerückt.
- **E · `disable-model-invocation` bei Init** · Planer — Die beiden Init-Skills tragen wie der Init von dv-forge `disable-model-invocation: true`, weil sie Projektdateien nur auf Wunsch ändern; die Kurzfassung in der CLAUDE.md nennt nur `name` und `description`.
- **E · setup-check** · Planer — Regeln, deren Vorschlag auf die verschobenen Skripte zeigte (`toolchain`, `shellBan`, `buildLogFilter`, `config`, `mcpJson`, Abschnitt „Vorschläge“), entfallen, weil die Spec sagt, `setup-check` melde nur noch die alte Schreibweise; `scaffold`, `moved`, `dropped` und `denyNode` bleiben.
- **E · Prüfung im Sitzungs-Kontext** · Planer — Ob eine Sitzung den Skill bei „baue mir das Backend“ wirklich lädt (AC-01, AC-02, AC-03, AC-28, AC-29) und ob ein Subagent den Start-Befehl über den PATH findet (AC-08), lässt sich nur in einer Sitzung mit installiertem Plugin prüfen. Der Plan prüft Beschreibung, Text und den Start-Befehl im Bash-Tool; die Abnahme in der Sitzung nach `/plugin update` steht in der Checkliste der Übergabe.
- **E · Reste außerhalb der Spec** · Planer — `plugins/relay/` und `docs/offene-aufgaben.md` nennen die alten Skript-Pfade weiter; die Spec schließt sie nicht ein, der Plan fasst sie nicht an.
- **E · AC-10, Halt** · Planer — Der Halt ist eine Vorgabe an den Umsetzer; Schritt 5 in Task 1 und Task 7 ist sein Beleg, der Test `starters_OnPathInGitBash_AreFoundAndStarted` belegt die Auffindbarkeit über den PATH. Das Anhalten und Fragen selbst lässt sich nicht automatisieren.
- **R1 · AC-25** — geändert — AC-25 steht jetzt unter **ACs:** von Task 5 und Task 11, weil erst `init.js` mit `mcpLines` alle drei Teilaussagen umsetzt und `initProject_InvalidMcpJson_KeepsFileWarnsAndStillWritesBlockAndHook` sie prüft: Datei bleibt `{ kaputt`, kein Satz `dv-mcp:context7`, Meldung nennt die ungültige Datei. Aus Task 4 und Task 10 ist AC-25 gestrichen; sie behalten AC-12, AC-24 und AC-26, `applyMcpServer_InvalidFile_LeavesBytesUnchanged` bleibt dort als Baustein-Test. Der Regex der Meldung ist an den MCP gebunden: `/WARNUNG MCP context7: \.mcp\.json ist kein gültiges JSON/`.
- **R1 · Entscheidungen** — geändert — Neuer Task 16 „Verweise auf die alte Schreibweise im Repo umstellen“ nach Task 15 (keine Umnummerierung, Task 1–15 bleiben). Er stellt `dv-forge: <stack>-<kommando>` auf `dv-<stack>-<kommando>` um in `CLAUDE.md` (nur die Schreibweise der zwei Tabellenzeilen 51–52, keine Kürzung; W · Abgrenzung und die Spec-Zeile „Nicht Teil … die Kürzung der CLAUDE.md dieses Repos“ bleiben gewahrt), in `.claude/skills/dev-mcp` (SKILL.md, routing.md, workflows.md, tool-catalog.md, error-guide.md), `.claude/skills/codebase-analyzer/SKILL.md` und sieben Angular-Referenzen; die Liste stammt aus einem Grep im Repo-Stand. Geprüft wird mit `grep` und mit `setup-check` (liest `CLAUDE.md`, `.claude/skills`, `.claude/agents`), ohne neuen Testcode. Unberührt bleiben `plugins/relay/`, `docs/` und die Testfixtures unter `plugins/forge/tests`; der E-Eintrag „Reste außerhalb der Spec“ gilt damit weiter für `plugins/relay/` und `docs/offene-aufgaben.md`. Festlegung: Task 16 setzt kein AC um und nennt das unter **ACs:**, weil die Spec die Umstellung der Repo-Verweise nicht als AC führt, sie aber aus der Soll-Vorgabe zu forge folgt.
- **R1 · Global Constraints** — geändert — Die Constraint zum Hook-Umfang steht wieder im Spec-Wortlaut („Im PowerShell-Tool lehnt er diese Aufrufe nicht ab. Andere Unterbefehle von `ng` und `npx ng`, etwa `generate`, lehnt er nicht ab.“); `decide_NpxNgGenerateAndOtherShellCommands_AreAllowed` in Task 12 prüft dazu `npx ng serve`, `npx ng version` und `ng generate service y`. AC-10: Task 1 und Task 7 bekommen je den Test `starters_OnPathInGitBash_AreFoundAndStarted`, der die Start-Befehle in Git Bash über den PATH findet und startet (Git Bash über `git --exec-path`, nie das WSL-`bash.exe`; unter POSIX `bash`; ohne Bash übersprungen); die Testzahl in Schritt 4 steigt auf 6, ein Überspringen oder Fehlschlagen löst den Halt aus Schritt 5 aus. Das Anhalten und Fragen selbst lässt sich nicht automatisieren: Es ist eine Vorgabe an den Umsetzer, Schritt 5 in Task 1 und Task 7 ist sein Beleg; der Haltetext in Task 7 ist an Task 1 angeglichen („… und erst nach seiner Antwort weitermachen“). Die Constraint zur Verifikation nennt das Überspringen ohne Git Bash.
- **R1 · Task 11** — geändert — Der Init-Ablauf (`UsageError`, `parseArgs`, `projectRoot`, `toPosix`, `blockLines`, `hookLines`, `mcpLines`, `initProject(args, stack)`, `runInit(stack, argv)`) liegt jetzt in `scripts/lib/project-setup.js`, das ohnehin in beiden Plugins inhaltsgleich ist: Task 5 ergänzt ihn per Edit in der .NET-Datei, Task 10 legt die Angular-Datei im Stand nach Task 5 an und prüft mit `cmp`. `scripts/init.js` hält in beiden Plugins nur `STACK`, den Aufruf von `runInit` und die Exporte `parseArgs` und `initProject(args)`; die Tests `init.test.js` und `toolchain-guard.test.js` bleiben unverändert. Task 11 Schritt 4 prüft zusätzlich `cmp` und `sed 's/dotnet/angular/g' … | diff -` für `init.js`. Die Constraint software-design-principles nennt die Kopie samt Init-Ablauf.
- **F · Global Constraints** — geändert — Vorschlag 1: Test `starters_OnPathInGitBash_AreFoundAndStarted` in Task 1 und Task 7, angeglichener Haltetext in Task 7 Schritt 5, Constraint zum Hook-Umfang im Spec-Wortlaut und `npx ng serve`/`npx ng version` in `decide_NpxNgGenerateAndOtherShellCommands_AreAllowed` (Task 12) standen schon aus R1 · Global Constraints im Plan. Neu ist der E-Eintrag „AC-10, Halt“: Der Halt ist eine Vorgabe an den Umsetzer, Schritt 5 in Task 1 und Task 7 ist sein Beleg, der Test belegt die Auffindbarkeit über den PATH.
- **F · Task 1** — geändert — Vorschlag 1: `plugins/dotnet/bin/lib/run-toolchain.js` (Task 1) und `plugins/angular/bin/lib/run-toolchain.js` (Task 7) bekommen die reine Funktion `failureMessage(starterFile, result)`: bei `result.error` die Zeile `<befehl>: Start fehlgeschlagen: <result.error.message>`, bei `result.signal` die Zeile `<befehl>: beendet durch Signal <signal>`, sonst `null`. `run` schreibt die Meldung samt Zeilenende auf stderr und gibt 1 zurück, sonst `result.status`; das stumme `?? 1` entfällt. Der neue Test `failureMessage_StartErrorSignalOrExitCode_NamesCauseOrIsNull` prüft mit künstlichen Ergebnisobjekten (`{ error: new Error('spawn EACCES') }`, `{ signal: 'SIGTERM', status: null }`, `{ status: 3 }`) statt eines echten Kindprozesses. Produces nennt `failureMessage`; die Testzahl in Schritt 4 von Task 1 und Task 7 steigt von 6 auf 7.
- **F · Task 15** — geändert — Vorschlag 1: Die neue `description` des forge-Init-Skills lautet „… or the old dv-forge `<stack>-<kommando>` spelling of build, test and lint commands.“, also ohne „: “. `work-skills.test.js` bekommt den Test `init_Description_HasNoColonSpace` (`assert.doesNotMatch(fields.description, /: /)`); er ist in Schritt 2 schon grün, weil die bisherige description kein „: “ enthält, und sichert die neue ab. Festlegung: Für die vier neuen Skills steht derselbe Test als `description_Text_HasNoColonSpace` in deren Testdateien (Task 3 und Task 9 `skill-toolchain.test.js`, Task 5 und Task 11 `skill-init.test.js`), weil ein forge-Test keine Dateien anderer Plugins lesen soll. Die Testzahlen steigen in Task 3 und Task 9 von 9 auf 10, in Task 5 und Task 11 von 38 (14, 6 und 18) auf 39 (14, 7 und 18).
