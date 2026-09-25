# dv-forge Spec-Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three spec-creation skills to the `dv-forge` plugin — `spec-whiteboarding` (moved from the global skill, review-compatible), `domain-modeling` (own rewrite) and `spec-whiteboarding-with-docs` (manual combination) — prove them with pressure tests, and retire the global `spec-whiteboarding`.

**Architecture:** Pure skill content: three `SKILL.md` files plus six reference files under `plugins/forge/skills/`. Structural `node:test` tests pin frontmatter, word limits, required anchors and forbidden content. Behaviour is proven by Controller-run pressure tests (baseline without skill vs. run with skill) in scratchpad sandboxes, never in the repo. A small edit carries the already-approved W-entry rule into the pending spec-review plan so its reviewer agents honour it.

**Tech Stack:** Claude Code plugin skills (Markdown), Node.js 24 (CommonJS, no dependencies), `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md`

## Global Constraints

- **Leitplanke (spec §2):** Do not open, read, grep or use as template any file from mattpocock-skills (plugin cache, repo, web). Do not invoke any `mattpocock-skills:*` skill. All skill and reference texts come only from the spec and from this plan.
- Nothing is taken from `dv-relay`: do not open `plugins/relay/` as a template.
- Plugin `dv-forge`, folder `plugins/forge/`. New skills live under `plugins/forge/skills/<name>/`.
- Skill bodies: German prose, English technical terms. Frontmatter `description` in English, starting with "Use when…".
- Skill frontmatter: only `name` + `description`. Exception: `spec-whiteboarding-with-docs` additionally has `disable-model-invocation: true`.
- `SKILL.md` body under 500 words; `spec-whiteboarding-with-docs` body under 200 words. Details go in `references/`.
- No `@`-links in skill bodies. No dependency on global skills (`writing-workitem`, `ado-cli`, …). Skills may only name `dv-forge:*` skills and `dv-working-capturing:glossary`.
- No `THIRD-PARTY-NOTICES.md` anywhere in the plugin.
- Test command (all): `node --test "plugins/forge/tests/*.test.js"`. A bare directory argument does not work on Node 24. Single file: `node --test plugins/forge/tests/<file>.test.js`.
- Other plans may add test files to `plugins/forge/tests/` in parallel. "All tests pass" means 0 failures, not a fixed count.
- Commits: stage only the paths named in the task (`git add <paths>`). Never `git add -A` or `git add .` — the working tree has unrelated uncommitted deletions under `docs/`. Conventional Commits, scope `forge`, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tasks marked **Controller** dispatch agents themselves and must run in the main session, not in an implementer subagent. Tasks marked **human** need an explicit answer from the human.
- Placeholders in Controller tasks: `<REPO>` = `C:/Develop/Dv.Ai.Development`; `<SCRATCH>` = the session scratchpad directory named in the system prompt. Pressure-test sandboxes live only under `<SCRATCH>`.

## File Structure

```
plugins/forge/
├── skills/
│   ├── spec-whiteboarding/
│   │   ├── SKILL.md                     Grundhaltung, Ablauf, Abbruch-Regel, Red Flags
│   │   └── references/
│   │       ├── spec-format.md           Pflicht-Abschnitte, AC-IDs, W-Einträge, Abbruch-Format
│   │       ├── grill-rounds.md          Rundenformat ❓/➡️, Frontier-Regeln
│   │       └── ac-rules.md              Gegeben/Wenn/Dann, prüfbar, Negativ-/Randfall
│   ├── domain-modeling/
│   │   ├── SKILL.md                     Begriffe prüfen, schärfen, Szenarien, sofort schreiben
│   │   └── references/
│   │       ├── glossary-target.md       working-capturing-Glossar oder CONTEXT.md
│   │       ├── context-format.md        CONTEXT.md / CONTEXT-MAP.md
│   │       └── adr-format.md            drei Kriterien, Ablage, Format
│   └── spec-whiteboarding-with-docs/
│       └── SKILL.md                     Verbund + vier Vorrangregeln
└── tests/
    ├── lib/markdown.js                  shared helper: read text, parse frontmatter, count words
    ├── spec-whiteboarding.test.js
    ├── domain-modeling.test.js
    └── spec-whiteboarding-with-docs.test.js

docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md   Task 5: W-entry rule for reviewers + rework
docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md   Tasks 6–8: pressure-test results under §10
~/.claude/skills/spec-whiteboarding/                        Task 9: deleted after confirmation (outside repo)
```

---

### Task 1: Test helper + `spec-whiteboarding` references

**Files:**
- Create: `plugins/forge/tests/lib/markdown.js`
- Create: `plugins/forge/tests/spec-whiteboarding.test.js`
- Create: `plugins/forge/skills/spec-whiteboarding/references/spec-format.md`
- Create: `plugins/forge/skills/spec-whiteboarding/references/grill-rounds.md`
- Create: `plugins/forge/skills/spec-whiteboarding/references/ac-rules.md`

**Interfaces:**
- Produces: `require('./lib/markdown')` → `readText(file): string` (CRLF normalised to LF), `readMarkdown(file): { fields: Record<string,string>, body: string }` (fields in frontmatter order; `{}` if no frontmatter), `wordCount(text): number`, `listMarkdown(dir): string[]` (absolute paths of all `.md` files below `dir`, recursive).
- Produces: the three reference files that Task 2's `SKILL.md` links as `references/spec-format.md`, `references/grill-rounds.md`, `references/ac-rules.md`. The line formats `❓ **Q1** - **<Titel>**: …`, `➡️ <Empfehlung> · <Beleg-Tag> — <Grund>` and `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` are fixed.

- [ ] **Step 1: Write the helper**

`plugins/forge/tests/lib/markdown.js`:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

function listMarkdown(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(dir, entry));
}

module.exports = { readText, readMarkdown, wordCount, listMarkdown };
```

- [ ] **Step 2: Write the failing tests**

`plugins/forge/tests/spec-whiteboarding.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readText } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'spec-whiteboarding');

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('specFormat_Template_HasFiveSectionsInOrder', () => {
  const text = reference('spec-format.md');
  const headings = ['## Was, wie, wo, warum', '## Theoretisches Verhalten nach Umsetzung', '## Soll-Vorgaben', '## Akzeptanzkriterien', '## Entscheidungen'];
  const positions = headings.map((heading) => text.indexOf(`\n${heading}\n`));
  headings.forEach((heading, index) => assert.ok(positions[index] >= 0, `${heading} fehlt`));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('specFormat_Template_UsesStatusAcIdsAndWEntries', () => {
  const text = reference('spec-format.md');
  assert.ok(text.includes('Status: bestätigt am <YYYY-MM-DD>'));
  assert.ok(text.includes('- **AC-01** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.'));
  assert.ok(text.includes('- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>'));
});

test('specFormat_Abort_DefinesStatusLineAndOpenSection', () => {
  const text = reference('spec-format.md');
  assert.ok(text.includes('Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen'));
  assert.ok(text.includes('## Offen, bewusst nicht weiterverfolgt (Abbruch)'));
  assert.ok(text.includes('- **<Kurztitel>** · ungeklärt — <was offen ist>'));
});

test('specFormat_Rules_SelfContainedWithoutLegacySection', () => {
  const text = reference('spec-format.md');
  assert.match(text, /keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente/);
  assert.match(text, /lückenlos ab `AC-01`/);
  assert.match(text, /WAS statt WIE/);
  assert.ok(!text.includes('Bereits geklärte Fragen'));
});

test('grillRounds_Format_QuestionAndRecommendationLines', () => {
  const text = reference('grill-rounds.md');
  assert.ok(text.includes('❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>'));
  assert.ok(text.includes('➡️ <Empfehlung> · <Beleg-Tag> — <Grund>'));
});

test('grillRounds_Rules_FullFrontierAndDependentQuestionsLater', () => {
  const text = reference('grill-rounds.md');
  assert.match(text, /kompletten? Frontier/);
  assert.match(text, /spätere Runde/);
  assert.match(text, /SubAgent/);
  assert.match(text, /Vermutung/);
});

test('acRules_Rules_GivenWhenThenAndForbiddenPhrases', () => {
  const text = reference('ac-rules.md');
  assert.ok(text.includes('Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.'));
  for (const phrase of ['funktioniert korrekt', 'ist möglich', 'sollte', 'idealerweise']) {
    assert.ok(text.includes(`„${phrase}“`), `${phrase} fehlt`);
  }
  assert.match(text, /Negativ- oder Randfall/);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test plugins/forge/tests/spec-whiteboarding.test.js`
Expected: FAIL, 7 tests, each with `ENOENT` for a reference file.

- [ ] **Step 4: Write `spec-format.md`**

`plugins/forge/skills/spec-whiteboarding/references/spec-format.md`:

````markdown
# Spec-Format

Die Spec liegt als `docs/forge/YYYY-MM-DD-<slug>/spec.md` vor. Sie hat genau diese Abschnitte in dieser Reihenfolge:

```markdown
# <Titel>

Status: bestätigt am <YYYY-MM-DD>

## Was, wie, wo, warum
<fachlich, kein Code>

## Theoretisches Verhalten nach Umsetzung
<was Anwender/System danach tut>

## Soll-Vorgaben
<Randbedingungen>

## Akzeptanzkriterien
- **AC-01** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.

## Entscheidungen
- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>
```

## Regeln

1. **AC-IDs:** zweistellig, lückenlos ab `AC-01`, in der Reihenfolge des Auftretens. Jedes AC folgt `ac-rules.md`.
2. **W-Einträge:** Jede Entscheidung des Menschen aus den Runden steht als W-Eintrag unter `## Entscheidungen`. Der Beleg-Tag nennt die Herkunft der Antwort, meist `Aussage`.
3. **In sich abgeschlossen:** keine Links, keine Verweise auf Dateien, Tickets oder andere Dokumente. Inhalte aus Anhängen stehen zusammengefasst in der Spec; der Tag `Anhang` nennt nur die Herkunft.
4. **WAS statt WIE:** keine Klassen, Dateipfade, Architektur oder Technik-Schritte.
5. **Beleg-Tags:** Jede inhaltliche Zeile trägt einen Beleg-Tag: `Aussage` · `Git` · `Historie` · `Anhang` · `ungeklärt`.
6. **Keine offene Frage:** Geschrieben wird erst, wenn die Frontier leer ist. Einzige Ausnahme ist der echte Abbruch, unten.
7. **Letzter Pflicht-Abschnitt:** `## Entscheidungen`. Der Spec-Review hängt dort später eigene Einträge an; W-Einträge bleiben dabei unverändert.

## Nur nach echtem Abbruch

Die Status-Zeile lautet `Status: Abbruch am <YYYY-MM-DD>, <k> Punkte offen`. Am Ende der Spec, nach `## Entscheidungen`, folgt zusätzlich:

```markdown
## Offen, bewusst nicht weiterverfolgt (Abbruch)
- **<Kurztitel>** · ungeklärt — <was offen ist>
```

Die Abbruch-Entscheidung selbst steht als W-Eintrag mit Tag `Aussage`, denn sie ist zitierbar. Kein offener Punkt wird als W-Eintrag verbucht.
````

- [ ] **Step 5: Write `grill-rounds.md`**

`plugins/forge/skills/spec-whiteboarding/references/grill-rounds.md`:

````markdown
# Grill-Runden

Eine Runde ist eine Nachricht mit der kompletten Frontier. Danach antwortet der Mensch frei in Text. Kein Auswahl-Dialog wie `AskUserQuestion`.

## Format je Frage

```
❓ **Q1** - **<Titel>**: <Frage, ggf. mit Optionen>

➡️ <Empfehlung> · <Beleg-Tag> — <Grund>
```

- Die Nummern laufen über alle Runden fort: Runde 2 beginnt nach der letzten Nummer aus Runde 1.
- Optionen, falls sinnvoll, stehen knapp in der Frage.
- Genau eine Empfehlung pro Frage. Der Grund ist ausgeschrieben, nicht nur der Tag.
- Bei `ungeklärt` ist der Grund eine ausgewiesene Vermutung, etwa „Vermutung: gängigster Fall“ oder „Vermutung: kleinster Scope“.

## Frontier-Regeln

1. Jede Runde enthält die komplette Frontier: alle offenen Entscheidungen, deren Voraussetzungen geklärt sind — auf einmal, nicht nur die wichtigste.
2. Hängt die Antwort einer Frage von einer anderen offenen Frage derselben Runde ab, gehört sie in eine spätere Runde.
3. Fakten sind keine Fragen. Was Code, Git, Historie oder Anhang beantworten, sucht Claude selbst.
4. Die Faktensuche darf über einen SubAgent laufen. Solange sie läuft, warten nur die davon abhängigen Fragen; der Rest der Frontier wird trotzdem gestellt.
5. Nach jeder Antwort: Antworten verbuchen, Frontier neu berechnen, nächste Runde. Die Runden enden erst, wenn die Frontier leer ist — einschließlich aller Zweige der Akzeptanzkriterien.

## Beispiel

```
❓ **Q4** - **Leere Liste**: Was zeigt die Übersicht ohne Einträge? a) Hinweistext b) leere Tabelle c) Sprung zum Anlegen

➡️ a) Hinweistext · ungeklärt — Vermutung: gängigster Fall; der Anwender sieht sofort, dass nichts fehlt.

❓ **Q5** - **Export-Format**: CSV, Excel oder beides?

➡️ CSV · Aussage — „wir brauchen das nur für den Import ins Altsystem“; das Altsystem liest CSV.
```
````

- [ ] **Step 6: Write `ac-rules.md`**

`plugins/forge/skills/spec-whiteboarding/references/ac-rules.md`:

````markdown
# Regeln für Akzeptanzkriterien

## Form

`- **AC-<NN>** Gegeben <Vorbedingung>, wenn <Aktion>, dann <beobachtbares Ergebnis>.`

- **Gegeben:** der Zustand vor der Aktion, konkret genug, um ihn herzustellen.
- **Wenn:** genau eine Aktion eines Anwenders oder des Systems.
- **Dann:** ein Ergebnis, das jemand ohne Blick in den Code sehen oder messen kann.

## Prüfbar

- Ein AC ist prüfbar, wenn zwei Personen unabhängig voneinander zum selben Urteil „erfüllt“ oder „nicht erfüllt“ kommen.
- Zahlen, Grenzen und Texte stehen im AC, wenn das Ergebnis von ihnen abhängt.
- Verboten: „funktioniert korrekt“, „ist möglich“, „sollte“, „idealerweise“. Ebenso Maßwörter ohne Maß wie „schnell“ oder „benutzerfreundlich“.

## Abdeckung

- Jedes beschriebene Verhalten hat mindestens ein AC.
- Mindestens ein Negativ- oder Randfall, wenn fachlich relevant: ungültige Eingabe, fehlende Berechtigung, leere Menge, Grenzwert.
- Ein AC beschreibt, WAS geschieht, nicht WIE: keine Klassen, Endpunkte, Tabellen oder Dateipfade.

## Beispiele

| Schwach | Prüfbar |
|---|---|
| Der Export funktioniert korrekt. | **AC-03** Gegeben eine Liste mit 3 Einträgen, wenn der Anwender „Exportieren“ wählt, dann erhält er eine CSV-Datei mit einer Kopfzeile und 3 Datenzeilen. |
| Leere Listen sollten sinnvoll behandelt werden. | **AC-04** Gegeben eine Liste ohne Einträge, wenn der Anwender die Liste öffnet, dann ist „Exportieren“ deaktiviert und ein Hinweis nennt den Grund. |
````

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test plugins/forge/tests/spec-whiteboarding.test.js`
Expected: PASS, 7 tests, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add plugins/forge/tests/lib/markdown.js plugins/forge/tests/spec-whiteboarding.test.js plugins/forge/skills/spec-whiteboarding/references
git commit -m "feat(forge): add spec-whiteboarding references for format, rounds and ACs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Skill `spec-whiteboarding`

**Files:**
- Create: `plugins/forge/skills/spec-whiteboarding/SKILL.md`
- Modify: `plugins/forge/tests/spec-whiteboarding.test.js` (append)

**Interfaces:**
- Consumes: `readMarkdown`, `wordCount` from `tests/lib/markdown.js`; the three reference files from Task 1.
- Produces: the skill `dv-forge:spec-whiteboarding` (model-invocable). Its output contract: file `docs/forge/YYYY-MM-DD-<slug>/spec.md`, then a handover with path, the command `/dv-forge:spec-review docs/forge/<…>/spec.md` and a fresh-session hint. Task 4 loads it by that name.

- [ ] **Step 1: Write the failing tests**

Change the require line at the top of `plugins/forge/tests/spec-whiteboarding.test.js` to:

```js
const fs = require('node:fs');
const { readText, readMarkdown, wordCount } = require('./lib/markdown');
```

Append to the same file:

```js
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['spec-format.md', 'grill-rounds.md', 'ac-rules.md'];

test('skill_Frontmatter_OnlyNameAndDescription', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'spec-whiteboarding');
  assert.match(fields.description, /^Use when/);
});

test('skill_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('skill_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('skill_Body_WritesOnlyTheForgeSpecFile', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('docs/forge/YYYY-MM-DD-<slug>/spec.md'));
  assert.match(body, /Nie überschreiben/);
  for (const banned of [/\bADO\b/, /Nur Chat/, /AskUserQuestion/, /writing-workitem/, /(^|\s)@\S+\.md/m]) {
    assert.doesNotMatch(body, banned);
  }
});

test('skill_Body_ConfirmsContentTitleAndSlug', () => {
  assert.match(readMarkdown(SKILL).body, /Inhalt, Titel und Slug/);
});

test('skill_Body_HandsOverWithoutCommit', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('/dv-forge:spec-review docs/forge/<…>/spec.md'));
  assert.match(body, /frischen Session/);
  assert.match(body, /Kein Commit, kein automatischer Start/);
});

test('skill_Body_AbortNeedsSecondInformedRefusal', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /genau einmal eine verdichtete Abschlussrunde/);
  assert.match(body, /Zweite, informierte Ablehnung/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test plugins/forge/tests/spec-whiteboarding.test.js`
Expected: FAIL — the 7 new `skill_*` tests fail with `ENOENT` for `SKILL.md`; the 7 reference tests still pass.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/spec-whiteboarding/SKILL.md`:

````markdown
---
name: spec-whiteboarding
description: Use when a request, idea, or complaint has just been raised, nothing written down exists yet, and it should become a spec.md for the dv-forge spec review — before brainstorming, planning, or any code. Also use when acceptance criteria for a not-yet-written feature are still vague or missing. Triggers: "lass uns das durchdenken", "Whiteboard", "Spec whiteboarding", "was will ich eigentlich", "erstmal aufschreiben was ich will". Not for the technical design doc, not for the implementation plan, not for a status report on finished work.
---

# Spec Whiteboarding

Whiteboard-Sitzung: Mensch und Claude grillen ein Vorhaben, bis kein offener Punkt übrig ist. Ergebnis ist eine in sich abgeschlossene, funktionale Spec — WAS, nicht WIE —, die `/dv-forge:spec-review` ohne Anpassung prüfen kann.

## Grundhaltung — ab Aufruf, bis die Spec geschrieben und bestätigt ist

1. **Whiteboard.** Kein Code zeigen. Knapp sagen, wonach in Code, Git oder Historie gesucht wurde und was dabei herauskam. Abläufe und Vergleiche als Skizze über `visualize` (Boxen mit höchstens fünf Wörtern, höchstens zwei Farben), Text drumherum knapp.
2. **Belegpflicht.** Jede Aussage, Empfehlung und Antwort-Option trägt einen Beleg-Tag:

   | Tag | Nur wenn |
   |---|---|
   | `Aussage` | im Chat wörtlich zitierbar |
   | `Git` | aus Diff, Log oder Blame belegbar |
   | `Historie` | aus working-capturing oder Memory belegbar |
   | `Anhang` | aus Workitem, Bild oder Datei belegbar |
   | `ungeklärt` | nichts davon trifft zu |

   `ungeklärt` heißt fragen, nie raten. Im Zweifel die schwächere Stufe.
3. **Sperre.** Kein brainstorming, kein Plan, kein Code, bis die Spec geschrieben und bestätigt ist.
4. **Fakten selbst suchen.** Was Code, Git, Historie oder Anhang beantworten, wird nie beim Menschen erfragt. Fakten sind Claudes Job, Entscheidungen die des Menschen.

## Ablauf

1. **Design-Tree:** offene Punkte sammeln — Was/Wie/Wo/Warum, Verhalten danach, Soll-Vorgaben, Akzeptanzkriterien nach `references/ac-rules.md`.
2. **Runden:** je Runde die komplette Frontier im Format aus `references/grill-rounds.md`. Antworten verbuchen, Frontier neu berechnen, bis sie leer ist.
3. **Bestätigen:** Inhalt, Titel und Slug vorlegen. Erst nach ausdrücklicher Bestätigung aller drei schreiben.
4. **Zielordner prüfen:** Existiert `docs/forge/YYYY-MM-DD-<slug>/` bereits, nachfragen und einen abweichenden Slug vorschlagen. Nie überschreiben.
5. **Schreiben:** ausschließlich als Datei `docs/forge/YYYY-MM-DD-<slug>/spec.md`, Format nach `references/spec-format.md`. Eine andere Ausgabeform gibt es nicht.
6. **Übergabe:** mit genau diesen drei Punkten enden:
   - Pfad der Spec
   - kopierbarer Befehl `/dv-forge:spec-review docs/forge/<…>/spec.md`
   - Hinweis, den Review in einer frischen Session zu starten

   Kein Commit, kein automatischer Start.

## Abbruch-Regel

„Reicht jetzt“ ist noch kein Abbruch.
1. **Einmal zurückfragen:** die offenen Zweige nennen und genau einmal eine verdichtete Abschlussrunde anbieten.
2. **Zweite, informierte Ablehnung:** Erst das ist ein Abbruch. Weiter mit Bestätigen und Schreiben, im Abbruch-Format aus `references/spec-format.md`.

## Red Flags — zurück zur Frontier

- „Ich brainstorme oder plane gleich weiter“ — die Sperre gilt bis zur bestätigten Spec.
- „Diese Antwort weiß ich auch so“ — ohne Beleg-Tag ist sie `ungeklärt`.
- „Der Mensch hat genug gesagt“ — erst die zweite, informierte Ablehnung ist ein Abbruch.
- „Fragen geht schneller als suchen“ — Fakten sucht Claude selbst.
- „Erst mal nur die wichtigste Frage“ — jede Runde enthält die komplette Frontier.

## Common Mistakes

| Fehler | Stattdessen |
|---|---|
| Klasse, Dateipfad oder Architektur in der Spec | gehört in Plan und Umsetzung |
| Empfehlung nur mit Tag, ohne Grund | Grund ausschreiben; bei `ungeklärt` als Vermutung kennzeichnen |
| Offener Punkt als W-Eintrag verbucht | in den Abbruch-Abschnitt, Tag `ungeklärt` |
| Link oder Ticket-Nummer in der Spec | Inhalt zusammenfassen, Tag `Anhang` |
````

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test plugins/forge/tests/spec-whiteboarding.test.js`
Expected: PASS, 14 tests, 0 failures. If `skill_Body_StaysUnder500Words` fails, shorten the Common Mistakes table first; do not move rules out of `## Ablauf` or `## Abbruch-Regel`.

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/spec-whiteboarding/SKILL.md plugins/forge/tests/spec-whiteboarding.test.js
git commit -m "feat(forge): add review-compatible spec-whiteboarding skill

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Skill `domain-modeling`

**Files:**
- Create: `plugins/forge/skills/domain-modeling/SKILL.md`
- Create: `plugins/forge/skills/domain-modeling/references/glossary-target.md`
- Create: `plugins/forge/skills/domain-modeling/references/context-format.md`
- Create: `plugins/forge/skills/domain-modeling/references/adr-format.md`
- Create: `plugins/forge/tests/domain-modeling.test.js`

**Interfaces:**
- Consumes: `readText`, `readMarkdown`, `wordCount`, `listMarkdown` from `tests/lib/markdown.js` (Task 1).
- Produces: the skill `dv-forge:domain-modeling` (model-invocable). Task 4 loads it by that name. Glossary target: `dv-working-capturing:glossary` if listed in the session, else `CONTEXT.md` (repo root, or per `CONTEXT-MAP.md`). ADR path `docs/adr/NNNN-<slug>.md`.

> Leitplanke: this skill is a rewrite **from spec §7 only**. Do not look at any other domain-modeling skill, not even to compare.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/domain-modeling.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readText, readMarkdown, wordCount, listMarkdown } = require('./lib/markdown');

const PLUGIN_ROOT = path.join(__dirname, '..');
const SKILL_DIR = path.join(PLUGIN_ROOT, 'skills', 'domain-modeling');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = ['glossary-target.md', 'context-format.md', 'adr-format.md'];

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('domainModeling_Frontmatter_OnlyNameAndDescription', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description']);
  assert.equal(fields.name, 'domain-modeling');
  assert.match(fields.description, /^Use when/);
});

test('domainModeling_Body_StaysUnder500Words', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 500);
});

test('domainModeling_Body_LinksAllReferencesThatExist', () => {
  const { body } = readMarkdown(SKILL);
  for (const name of REFERENCES) {
    assert.ok(body.includes(`references/${name}`), `${name} nicht verlinkt`);
    assert.ok(fs.existsSync(path.join(SKILL_DIR, 'references', name)), `${name} fehlt`);
  }
});

test('domainModeling_Body_WritesClarifiedTermsImmediately', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /Sofort schreiben/);
  assert.match(body, /nicht gesammelt/);
  assert.match(body, /Keine Implementierungsdetails, keine Spec-Inhalte/);
});

test('glossaryTarget_Rules_PrefersWorkingCapturingElseContextFile', () => {
  const text = reference('glossary-target.md');
  assert.ok(text.includes('`dv-working-capturing:glossary`'));
  assert.ok(text.indexOf('dv-working-capturing:glossary') < text.indexOf('CONTEXT.md'));
  assert.ok(text.includes('CONTEXT-MAP.md'));
  assert.match(text, /ausschließlich über diesen Skill/);
  assert.match(text, /Modul- und Feature-Profile/);
  assert.match(text, /erst anlegen, wenn der erste Begriff geklärt ist/);
});

test('contextFormat_Template_HasTitleAndThreeColumnTable', () => {
  const text = reference('context-format.md');
  assert.ok(text.includes('# Glossar — <Bereich>'));
  assert.ok(text.includes('| Begriff | Bedeutung | Nicht verwenden |'));
  assert.ok(text.includes('| **<kanonischer Begriff>** | <was er IST, höchstens zwei Sätze> | <Synonyme, kommagetrennt> |'));
  assert.match(text, /keine allgemeinen Programmierbegriffe/);
});

test('adrFormat_Template_HasHeaderStatusAndFourSectionsInOrder', () => {
  const text = reference('adr-format.md');
  assert.ok(text.includes('# ADR-<NNNN>: <Titel>'));
  assert.ok(text.includes('<YYYY-MM-DD> · Status: angenommen'));
  const positions = ['## Kontext', '## Entscheidung', '## Verworfene Alternativen', '## Folgen'].map((heading) => text.indexOf(`\n${heading}\n`));
  positions.forEach((position) => assert.ok(position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
});

test('adrFormat_Offer_RequiresAllThreeCriteria', () => {
  const text = reference('adr-format.md');
  for (const criterion of ['Schwer umkehrbar', 'Ohne Kontext überraschend', 'Echter Trade-off']) {
    assert.ok(text.includes(criterion), `${criterion} fehlt`);
  }
  assert.match(text, /alle drei/);
  assert.ok(text.includes('docs/adr/NNNN-<slug>.md'));
});

test('plugin_Texts_NoThirdPartyTextOrNotice', () => {
  assert.ok(!fs.existsSync(path.join(PLUGIN_ROOT, 'THIRD-PARTY-NOTICES.md')));
  for (const file of listMarkdown(path.join(PLUGIN_ROOT, 'skills'))) {
    assert.doesNotMatch(readText(file), /mattpocock/i, file);
  }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test plugins/forge/tests/domain-modeling.test.js`
Expected: FAIL — 8 tests with `ENOENT`; `plugin_Texts_NoThirdPartyTextOrNotice` passes.

- [ ] **Step 3: Write `glossary-target.md`**

`plugins/forge/skills/domain-modeling/references/glossary-target.md`:

```markdown
# Glossar-Ziel bestimmen

Einmal zu Beginn, bevor der erste Begriff geschrieben wird.

1. **working-capturing verfügbar:** Steht der Skill `dv-working-capturing:glossary` in der Skill-Liste dieser Session, ist das working-capturing-Glossar das Ziel.
   - Begriffe werden ausschließlich über diesen Skill geschrieben, per Skill-Tool. Er bestimmt Ort und Format. Keine eigene Glossar-Datei daneben.
   - Zusätzlich die vorhandenen Modul- und Feature-Profile lesen. Ihren Ort nennt die Projekt-`CLAUDE.md`.
2. **Sonst das eigene Glossar:** Ziel ist `CONTEXT.md` im Repo-Root.
   - Existiert `CONTEXT-MAP.md`, ist das Ziel das `CONTEXT.md` des Bereichs, zu dem der Begriff gehört. Den Pfad nennt die Map.
   - Format nach `context-format.md`.
   - Dateien erst anlegen, wenn der erste Begriff geklärt ist. Eine Sitzung ohne geklärten Begriff hinterlässt keine Datei.

Das gewählte Ziel einmal nennen, mit Beleg: welcher Skill in der Liste stand oder welche Datei existiert.
```

- [ ] **Step 4: Write `context-format.md`**

`plugins/forge/skills/domain-modeling/references/context-format.md`:

````markdown
# Eigenes Glossar-Format

Gilt nur, wenn `glossary-target.md` das eigene Glossar gewählt hat.

## CONTEXT.md

```markdown
# Glossar — <Bereich>

<ein Satz: wofür dieser Bereich steht>

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **<kanonischer Begriff>** | <was er IST, höchstens zwei Sätze> | <Synonyme, kommagetrennt> |
```

- Ein Konzept, ein kanonischer Begriff. Konkurrierende Wörter stehen unter „Nicht verwenden“.
- Nur projektspezifische Fachbegriffe, keine allgemeinen Programmierbegriffe.
- Die Bedeutung sagt, was der Begriff IST, nicht, wie er umgesetzt ist.

## CONTEXT-MAP.md

Nur bei mehreren Bereichen. Sie listet jeden Bereich mit dem Pfad zu seinem `CONTEXT.md` und einem Satz Beschreibung:

```markdown
# Kontext-Karte

| Bereich | Glossar | Beschreibung |
|---|---|---|
| <Bereich> | `<pfad>/CONTEXT.md` | <ein Satz> |
```
````

- [ ] **Step 5: Write `adr-format.md`**

`plugins/forge/skills/domain-modeling/references/adr-format.md`:

````markdown
# ADR-Format

## Wann anbieten

Nur wenn alle drei Kriterien zutreffen:
1. **Schwer umkehrbar** — ein späterer Rückbau kostet deutlich mehr als die Entscheidung jetzt.
2. **Ohne Kontext überraschend** — wer später nur das Ergebnis sieht, würde ohne Begründung anders entscheiden.
3. **Echter Trade-off** — es gab mindestens eine ernsthafte Alternative mit eigenen Vorteilen.

Fehlt eines, kein ADR. Ein ADR wird angeboten; geschrieben wird erst, wenn der Mensch zustimmt.

## Ablage

`docs/adr/NNNN-<slug>.md`. `NNNN` ist vierstellig und die nächste Nummer nach der höchsten vorhandenen, beim ersten ADR `0001`. `docs/adr/` wird erst beim ersten ADR angelegt.

## Format

```markdown
# ADR-<NNNN>: <Titel>

<YYYY-MM-DD> · Status: angenommen

## Kontext
## Entscheidung
## Verworfene Alternativen
## Folgen
```
````

- [ ] **Step 6: Write the skill**

`plugins/forge/skills/domain-modeling/SKILL.md`:

````markdown
---
name: domain-modeling
description: Use when domain terms in a conversation are fuzzy, overloaded, or contradict the project glossary, the code, or module and feature profiles, when a term has just been clarified and belongs in the glossary, or when a hard-to-reverse decision may deserve an ADR.
---

# Domain Modeling

Aktive Begriffsarbeit während eines Gesprächs: Begriffe herausfordern, schärfen, mit Szenarien testen und gegen Code und Profile prüfen. Jeder geklärte Begriff landet sofort im Glossar-Ziel.

## Start

Glossar-Ziel nach `references/glossary-target.md` bestimmen und seine vorhandenen Einträge lesen.

## Während der Sitzung

1. **Gegen das Glossar prüfen.** Widerspricht ein verwendeter Begriff dem Glossar, sofort benennen: verwendetes Wort, Glossar-Eintrag, Unterschied.
2. **Unscharfe Begriffe schärfen.** Einen kanonischen Begriff vorschlagen; konkurrierende Wörter kommen unter „Nicht verwenden“.
3. **Szenarien erzwingen.** Grenzfälle mit konkreten Szenarien durchspielen, etwa: „Ein Kunde kündigt am Tag der Verlängerung — ist das noch ein aktiver Vertrag?“
4. **Gegen Code und Profile prüfen.** Widerspricht eine Aussage dem Code oder einem Profil, mit Fundstelle benennen.
5. **Sofort schreiben.** Ein geklärter Begriff geht direkt ins Glossar-Ziel, nicht gesammelt am Ende. Format im eigenen Glossar: `references/context-format.md`.
6. **ADRs sparsam.** Nur anbieten, wenn alle drei Kriterien aus `references/adr-format.md` zutreffen. Geschrieben wird erst nach Zustimmung.

## Was ins Glossar gehört

Nur Begriffe: kanonischer Name, Bedeutung, zu meidende Synonyme. Keine Implementierungsdetails, keine Spec-Inhalte, keine allgemeinen Programmierbegriffe.

## Red Flags

- „Ich schreibe die Begriffe am Ende gesammelt“ — jeder geklärte Begriff sofort.
- „Das Synonym ist ja gemeint, das lasse ich durchgehen“ — Widerspruch benennen.
- „Die Entscheidung ist wichtig, also ein ADR“ — nur mit allen drei Kriterien.
- „Ich lege `CONTEXT.md` schon mal an“ — erst mit dem ersten geklärten Begriff.
- „Ich schreibe direkt in die Glossar-Datei von working-capturing“ — nur über dessen Skill.
````

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test plugins/forge/tests/domain-modeling.test.js`
Expected: PASS, 9 tests, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add plugins/forge/skills/domain-modeling plugins/forge/tests/domain-modeling.test.js
git commit -m "feat(forge): add domain-modeling skill with glossary target and ADR rules

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Skill `spec-whiteboarding-with-docs`

**Files:**
- Create: `plugins/forge/skills/spec-whiteboarding-with-docs/SKILL.md`
- Create: `plugins/forge/tests/spec-whiteboarding-with-docs.test.js`

**Interfaces:**
- Consumes: skill names `dv-forge:spec-whiteboarding` (Task 2) and `dv-forge:domain-modeling` (Task 3); `readMarkdown`, `wordCount` from `tests/lib/markdown.js`.
- Produces: `/dv-forge:spec-whiteboarding-with-docs`, manual start only.

- [ ] **Step 1: Write the failing tests**

`plugins/forge/tests/spec-whiteboarding-with-docs.test.js`:

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, wordCount } = require('./lib/markdown');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'spec-whiteboarding-with-docs');
const SKILL = path.join(SKILL_DIR, 'SKILL.md');

test('withDocs_Frontmatter_ManualOnly', () => {
  const { fields } = readMarkdown(SKILL);
  assert.deepEqual(Object.keys(fields), ['name', 'description', 'disable-model-invocation']);
  assert.equal(fields.name, 'spec-whiteboarding-with-docs');
  assert.match(fields.description, /^Use when/);
  assert.equal(fields['disable-model-invocation'], 'true');
});

test('withDocs_Body_LoadsBothSkillsViaSkillTool', () => {
  const { body } = readMarkdown(SKILL);
  assert.ok(body.includes('`dv-forge:spec-whiteboarding`'));
  assert.ok(body.includes('`dv-forge:domain-modeling`'));
  assert.match(body, /Skill-Tool/);
});

test('withDocs_Body_DefinesFourPrecedenceRules', () => {
  const { body } = readMarkdown(SKILL);
  assert.match(body, /trotz Sperre erlaubt/);
  assert.match(body, /nur für brainstorming, Plan und Code/);
  assert.match(body, /ausschließlich die kanonischen Begriffe/);
  assert.match(body, /tragen den Tag `Historie`/);
  assert.match(body, /ersetzt keine Runde/);
  assert.match(body, /Frontier aufgenommen/);
});

test('withDocs_Body_StaysThin', () => {
  assert.ok(wordCount(readMarkdown(SKILL).body) < 200);
  assert.ok(!fs.existsSync(path.join(SKILL_DIR, 'references')));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test plugins/forge/tests/spec-whiteboarding-with-docs.test.js`
Expected: FAIL, 4 tests with `ENOENT` for `SKILL.md`.

- [ ] **Step 3: Write the skill**

`plugins/forge/skills/spec-whiteboarding-with-docs/SKILL.md`:

```markdown
---
name: spec-whiteboarding-with-docs
description: Use when a request should be grilled into a dv-forge spec.md while the project glossary is actively challenged and updated alongside.
disable-model-invocation: true
---

# Spec Whiteboarding mit Domänenmodell

Verbund aus zwei Skills: Führe `dv-forge:spec-whiteboarding` aus und nutze dabei `dv-forge:domain-modeling`. Lade jetzt beide über das Skill-Tool, zuerst `dv-forge:spec-whiteboarding`, dann `dv-forge:domain-modeling`. Beide gelten vollständig. Wo sie kollidieren, gelten diese Vorrangregeln:

1. **Sperre:** Schreiben ins Glossar-Ziel und ADRs sind trotz Sperre erlaubt. Die Sperre gilt nur für brainstorming, Plan und Code.
2. **Begriffe:** Die Spec verwendet ausschließlich die kanonischen Begriffe des Glossars.
3. **Belege:** Belege aus Glossar, Profilen und ADRs tragen den Tag `Historie`.
4. **Runden:** Die Glossar-Arbeit ersetzt keine Runde. Ein Begriffskonflikt wird als Frage in die laufende Frontier aufgenommen, im Rundenformat von `dv-forge:spec-whiteboarding`.
```

- [ ] **Step 4: Run all tests**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: PASS, 0 failures (includes the 14 + 9 + 4 tests of Tasks 1–4).

- [ ] **Step 5: Commit**

```bash
git add plugins/forge/skills/spec-whiteboarding-with-docs plugins/forge/tests/spec-whiteboarding-with-docs.test.js
git commit -m "feat(forge): add manual spec-whiteboarding-with-docs combination

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Carry the W-entry rule into the spec-review plan

Spec §11 is already done in the spec-review design (§10 and decision B15, commit `c8a1292`). The spec-review **plan** predates it: its reviewer and rework agent texts do not mention W-entries yet. This task patches those texts so that the agents built later honour the rule. Run it before Tasks 7 and 8 of the spec-review plan are executed; if they already ran, stop and report instead.

**Files:**
- Modify: `docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md` (Task 7 and Task 8 sections)

**Interfaces:**
- Produces: in the spec-review plan, a section `## Entscheidungen der Spec` shared by all five reviewer agents, rule 9 in `spec-rework.md`, and test assertions for both.

- [ ] **Step 1: Confirm preconditions**

Run:
```bash
grep -n 'W-Eintrag ist nie selbst ein Finding\|B15 · W-Einträge' docs/superpowers/specs/2026-09-25-dv-forge-spec-review-design.md
ls plugins/forge/agents 2>/dev/null || echo "no agents yet"
```
Expected: two matching lines from the design; `no agents yet`. If agent files already exist, stop and report to the human that the reviewer agents need the same edit directly.

- [ ] **Step 2: Make the new section part of the shared skeleton**

In the spec-review plan, Task 7 Step 3, replace:

```
Each file follows the same skeleton. Only the frontmatter, the title, `## Eingabe`, `## Prüfauftrag`, `## Nicht deine Aufgabe` and the `reviewer` value differ. The sections `## Einstufung` and `## Ausgabe` are identical everywhere.
```

with:

```
Each file follows the same skeleton. Only the frontmatter, the title, `## Eingabe`, `## Prüfauftrag`, `## Nicht deine Aufgabe` and the `reviewer` value differ. The sections `## Entscheidungen der Spec`, `## Einstufung` and `## Ausgabe` are identical everywhere.
```

- [ ] **Step 3: Add the section to the completeness template**

In the same Task 7 Step 3, inside `spec-review-completeness.md`, replace:

```
## Nicht deine Aufgabe
Widersprüche, Machbarkeit, Rand- und Fehlerfälle, Stil, Implementierungsdetails. Das prüfen andere Reviewer.

## Einstufung
```

with:

```
## Nicht deine Aufgabe
Widersprüche, Machbarkeit, Rand- und Fehlerfälle, Stil, Implementierungsdetails. Das prüfen andere Reviewer.

## Entscheidungen der Spec
W-Einträge im Abschnitt „Entscheidungen“ (`- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>`) sind bindende Entscheidungen des Menschen. Ein W-Eintrag ist nie selbst ein Finding. Widerspricht ein Spec-Inhalt einem W-Eintrag, ist das ein Finding an der Stelle des Spec-Inhalts.

## Einstufung
```

- [ ] **Step 4: Assert the section in the reviewer tests**

In Task 7 Step 1 (`agents.test.js`), replace:

```
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.match(body, /keinen Code/);
```

with:

```
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.match(body, /keinen Code/);
    assert.ok(body.includes('## Entscheidungen der Spec'));
    assert.match(body, /Ein W-Eintrag ist nie selbst ein Finding/);
```

- [ ] **Step 5: Add rule 9 to the rework agent**

In Task 8 Step 3 (`spec-rework.md`), replace:

```
8. Existiert die Stelle nicht in der Spec, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.
```

with:

```
8. Existiert die Stelle nicht in der Spec, lautet der Eintrag `- **R<r> · <Stelle>** — nicht geändert — Stelle existiert nicht`.
9. W-Einträge (`- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>`) sind bindende Entscheidungen des Menschen. W-Einträge änderst und entfernst du nie. Widerspricht ein Spec-Inhalt einem W-Eintrag, passt du den Spec-Inhalt an.
```

In Task 8 Step 1, replace:

```
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.match(body, /keinen Code/);
```

with:

```
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.match(body, /keinen Code/);
  assert.match(body, /W-Einträge änderst und entfernst du nie/);
```

- [ ] **Step 6: Verify the edits**

Run:
```bash
grep -c 'Entscheidungen der Spec' docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md
grep -c 'W-Einträge änderst und entfernst du nie' docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md
```
Expected: `3` (skeleton sentence, template section, test) and `2` (rule, test).

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/plans/2026-09-25-dv-forge-spec-review.md
git commit -m "docs(forge): bind W entries in reviewer and rework agent plan texts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Pressure tests `spec-whiteboarding` (Controller)

Covers spec §10 tests 1 and 2 and AC-01–AC-09. Each scenario runs twice: **baseline** (no skill) and **skill** (skill files read). All agents are `general-purpose`, `run_in_background: false`, dispatched together in one message.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md` (§10, results)
- Modify (only on failure): files under `plugins/forge/skills/spec-whiteboarding/`

**Interfaces:**
- Consumes: the skill from Tasks 1–2.
- Produces: `<SCRATCH>/forge-pressure/2-skill/docs/forge/<date>-csv-export/spec.md`, the input of Task 8.

- [ ] **Step 1: Create the sandboxes**

```bash
S="<SCRATCH>/forge-pressure"
for run in 1a 1b 2 3; do for mode in baseline skill; do mkdir -p "$S/$run-$mode" && git -C "$S/$run-$mode" init -q; done; done
TODAY=$(date +%F)
for mode in baseline skill; do mkdir -p "$S/3-$mode/docs/forge/$TODAY-csv-export" && echo "ALT" > "$S/3-$mode/docs/forge/$TODAY-csv-export/spec.md"; done
```

- [ ] **Step 2: Dispatch the 8 agents**

Prompt template. `<MODE-LINE>` is empty for baseline. For skill it is:
`Lies zuerst <REPO>/plugins/forge/skills/spec-whiteboarding/SKILL.md und alle Dateien in <REPO>/plugins/forge/skills/spec-whiteboarding/references/. Handle ab jetzt exakt nach diesem Skill.`

```
Du bist Claude in einer Chat-Session mit einem Menschen. Nutze kein Skill-Tool.
<MODE-LINE>
Dein Arbeitsverzeichnis ist <SCRATCH>/forge-pressure/<RUN>-<MODE>. Lies und schreibe Dateien nur dort; relative Pfade beziehen sich darauf.

Bisheriger Verlauf:
<VERLAUF>

Antworte jetzt als Claude auf die letzte Nachricht des Menschen, genau so, wie du im Chat antworten würdest.
Danach, nach einer Zeile `=== BERICHT ===`: jede Datei, die du angelegt oder geändert hast, mit absolutem Pfad, oder `keine`.
```

`<VERLAUF>` per run. Shared opening `V0`:

```
Mensch: Unsere Aufgabenliste braucht einen CSV-Export. Lass uns das durchdenken und eine Spec draus machen.
Claude: ❓ **Q1** - **Umfang**: Welche Spalten landen im Export? a) alle sichtbaren b) alle, auch ausgeblendete

➡️ a) alle sichtbaren · ungeklärt — Vermutung: der Anwender erwartet, was er sieht.

❓ **Q2** - **Filter**: Nur die gefilterten Einträge oder alle?

➡️ nur gefilterte · ungeklärt — Vermutung: gängigster Fall.

❓ **Q3** - **Leere Liste**: Was passiert ohne Einträge? a) Schaltfläche deaktiviert b) leere Datei mit Kopfzeile

➡️ a) deaktiviert · ungeklärt — Vermutung: kleinster Scope, keine sinnlose Datei.
```

Run `1a` = `V0` +
```
Mensch: Q1 a. Ach, schreib einfach schon die Spec, den Rest kannst du dir denken.
```

Run `1b` = `V0` + the `1a` line +
```
Claude: Offen sind noch Filter, leere Liste und Trennzeichen. Ich biete eine letzte, kurze Runde an:
❓ **Q2** - **Filter**: Nur die gefilterten Einträge oder alle?
➡️ nur gefilterte · ungeklärt — Vermutung: gängigster Fall.
❓ **Q3** - **Leere Liste**: Schaltfläche deaktiviert oder leere Datei?
➡️ deaktiviert · ungeklärt — Vermutung: kleinster Scope.
❓ **Q4** - **Trennzeichen**: Semikolon oder Komma?
➡️ Semikolon · ungeklärt — Vermutung: deutsches Excel öffnet das direkt.
Mensch: Nein, keine Fragen mehr. Ich will jetzt die Spec, auch wenn Punkte offen bleiben. Titel „CSV-Export der Aufgabenliste“, Slug csv-export.
```

Runs `2` and `3` = `V0` +
```
Mensch: Q1 a, Q2 nur gefilterte, Q3 a.
Claude: ❓ **Q4** - **Trennzeichen**: Semikolon oder Komma?

➡️ Semikolon · ungeklärt — Vermutung: deutsches Excel öffnet das direkt.
Mensch: Semikolon passt.
Claude: Die Frontier ist leer. Zur Bestätigung:
Titel: CSV-Export der Aufgabenliste · Slug: csv-export
Was: Anwender exportieren die aktuell gefilterte Aufgabenliste als CSV-Datei, um sie ins Altsystem zu übernehmen.
Verhalten: „Exportieren“ erzeugt eine CSV-Datei mit einer Kopfzeile aus den sichtbaren Spalten und einer Zeile je gefiltertem Eintrag, Trennzeichen Semikolon. Bei leerer Liste ist „Exportieren“ deaktiviert, ein Hinweis nennt den Grund.
Akzeptanzkriterien: 3 sichtbare Einträge ergeben Kopfzeile plus 3 Zeilen; bei aktivem Filter nur die gefilterten Einträge; leere Liste: deaktiviert mit Hinweis.
Entscheidungen: Q1 sichtbare Spalten, Q2 nur gefilterte, Q3 deaktiviert, Q4 Semikolon.
Passt das so, inklusive Titel und Slug?
Mensch: Passt, schreib sie. Details zum Altsystem stehen übrigens in Ticket AB#4711.
```

- [ ] **Step 3: Check the skill runs**

Pass criteria — all must hold for the **skill** runs:

| Run | Pass when |
|---|---|
| 1a | BERICHT `keine`; reply names the open branches (at least filter and empty list) and offers exactly one condensed closing round in ❓/➡️ format; every ➡️ line has a tag and a written reason; no plan, no code |
| 1b | reply treats this as abort; shows the draft with `Status: Abbruch am <heute>, <k> Punkte offen` and `## Offen, bewusst nicht weiterverfolgt (Abbruch)` with Q2–Q4 as `ungeklärt`; asks to confirm before writing; BERICHT `keine` |
| 2 | see commands below; reply ends with the spec path, `/dv-forge:spec-review docs/forge/<…>/spec.md` and a fresh-session hint; no ADO or chat-only offer |
| 3 | reply asks and proposes a different slug; `ALT` unchanged; no second folder written without an answer |

Commands for run 2:
```bash
S="<SCRATCH>/forge-pressure"
SPEC=$(ls "$S"/2-skill/docs/forge/*-csv-export/spec.md)
grep '^## ' "$SPEC"
grep -o '\*\*AC-[0-9]*\*\*' "$SPEC"
grep -c '^- \*\*W · ' "$SPEC"
grep -nE 'https?://|\]\(|AB#|[A-Za-z0-9_/-]+\.(md|ts|cs|js)\b' "$SPEC" || echo "keine Verweise"
git -C "$S/2-skill" rev-list --all --count
```
Expected: exactly the five headings in spec-format order; `**AC-01**`, `**AC-02**`, … without gaps; W count ≥ 4; `keine Verweise`; `0` commits.

Commands for run 3:
```bash
cat "<SCRATCH>/forge-pressure/3-skill/docs/forge/$(date +%F)-csv-export/spec.md"
ls "<SCRATCH>/forge-pressure/3-skill/docs/forge"
```
Expected: `ALT`; only the pre-created folder.

For each baseline run, note in one line what it did differently (for example: wrote the spec at once, used another path, kept the ticket number, offered chat output).

- [ ] **Step 4: On failure, sharpen and repeat**

Sharpen the rule in `SKILL.md` or the reference that the failing criterion maps to, run `node --test plugins/forge/tests/spec-whiteboarding.test.js` (must stay green), recreate only the failing sandbox, and rerun only that skill run. At most two repeats per run; after that, record the gap as failed.

- [ ] **Step 5: Record the results in the spec**

In `docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md`, §10, after item 6, add (or extend) a block:

```markdown
**Ergebnis <YYYY-MM-DD>:**
- Test 1 (Druck): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
- Test 2 (Ergebnis): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
- Zielordner vorhanden (AC-05): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md plugins/forge/skills/spec-whiteboarding
git commit -m "test(forge): record spec-whiteboarding pressure test results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pressure tests `domain-modeling` and `with-docs` (Controller)

Covers spec §10 tests 3–5 and AC-10–AC-13. Same template and mechanics as Task 6. All agents `general-purpose`, `run_in_background: false`, dispatched together.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md` (§10, results)
- Modify (only on failure): files under `plugins/forge/skills/domain-modeling/` or `plugins/forge/skills/spec-whiteboarding-with-docs/`

**Interfaces:**
- Consumes: the skills from Tasks 1–4.

- [ ] **Step 1: Create the sandboxes**

```bash
S="<SCRATCH>/forge-pressure"
for run in 3 4a 4b 5a 5b; do for mode in baseline skill; do mkdir -p "$S/$run-$mode" && git -C "$S/$run-$mode" init -q; done; done
for run in 3 5a 5b; do for mode in baseline skill; do cat > "$S/$run-$mode/CONTEXT.md" <<'EOF'
# Glossar — Aufgaben

Aufgabenverwaltung für Teams.

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **Aufgabe** | Eine zu erledigende Arbeitseinheit mit Status und Verantwortlichem. | Ticket, Todo |
EOF
done; done
```

- [ ] **Step 2: Dispatch the 10 agents**

Same prompt template as Task 6 Step 2, with the working directory `<SCRATCH>/forge-pressure/<RUN>-<MODE>`. After `<MODE-LINE>` add the line `<SKILL-LIST-LINE>`.

`<MODE-LINE>` for skill runs:
- Runs 3, 4a, 4b: `Lies zuerst <REPO>/plugins/forge/skills/domain-modeling/SKILL.md und alle Dateien in <REPO>/plugins/forge/skills/domain-modeling/references/. Handle ab jetzt exakt nach diesem Skill.`
- Runs 5a, 5b: `Lies zuerst <REPO>/plugins/forge/skills/spec-whiteboarding-with-docs/SKILL.md. Wo er verlangt, einen Skill dv-forge:<name> über das Skill-Tool zu laden, lies stattdessen <REPO>/plugins/forge/skills/<name>/SKILL.md und alle Dateien in dessen references/. Handle ab jetzt exakt nach diesen Skills.`

`<SKILL-LIST-LINE>` (both modes):
- Run 4a: `Für diesen Test gilt: Die Skill-Liste dieser Session enthält dv-working-capturing:glossary. Rufe ihn nicht wirklich auf; nenne statt des Aufrufs unter BERICHT den exakten Skill-Aufruf (Skill-Name und Argumente), den du ausführen würdest.`
- All other runs: `Für diesen Test gilt: Die Skill-Liste dieser Session enthält dv-working-capturing:glossary nicht.`

`<VERLAUF>`:

Run 3:
```
Mensch: Wenn ein Ticket erledigt ist, soll der Verantwortliche eine Mail bekommen. Lass uns klären, was „erledigt“ genau heißt.
```

Runs 4a and 4b:
```
Mensch: Bei uns heißt ein wiederkehrender Termin „Serie“. Eine Serie hat eine Regel wie „jeden Montag“ und erzeugt daraus einzelne Termine. Das ist so geklärt, nimm das auf.
```

Run 5a:
```
Mensch: Ich will, dass man erledigte Tickets archivieren kann. Lass uns das durchdenken.
```

Run 5b:
```
Mensch: Ich will, dass man erledigte Tickets archivieren kann.
Claude: Das Glossar nennt das „Aufgabe“; „Ticket“ steht dort unter „Nicht verwenden“.

❓ **Q1** - **Begriff**: Meinst du mit „Ticket“ eine Aufgabe im Sinne des Glossars?

➡️ ja · Historie — der Glossar-Eintrag „Aufgabe“ führt „Ticket“ als zu meidendes Wort.

❓ **Q2** - **Wer archiviert**: nur der Verantwortliche oder jedes Teammitglied?

➡️ jedes Teammitglied · ungeklärt — Vermutung: kleinster Scope.
Mensch: Q1 ja. Q2 jedes Teammitglied.
Claude: ❓ **Q3** - **Sichtbarkeit**: Erscheinen archivierte Aufgaben noch in der Liste? a) nein, nur über den Filter „Archiv“ b) ja, ausgegraut

➡️ a) · ungeklärt — Vermutung: gängigster Fall.
Mensch: a.
Claude: Die Frontier ist leer. Zur Bestätigung:
Titel: Erledigte Aufgaben archivieren · Slug: aufgaben-archivieren
Jedes Teammitglied kann eine erledigte Aufgabe archivieren. Archivierte Aufgaben verschwinden aus der Liste und erscheinen nur über den Filter „Archiv“. Nicht erledigte Aufgaben lassen sich nicht archivieren.
Passt das so, inklusive Titel und Slug?
Mensch: Passt, schreib die Spec für das Ticket-Archiv.
```

- [ ] **Step 3: Check the skill runs**

| Run | Pass when |
|---|---|
| 3 | reply names the conflict „Ticket“ vs. glossary term „Aufgabe“ before or while working on „erledigt“; uses a concrete scenario for „erledigt“ |
| 4a | BERICHT names a Skill call to `dv-working-capturing:glossary` for „Serie“; no `CONTEXT.md` in the sandbox |
| 4b | `CONTEXT.md` exists in the sandbox root with `# Glossar — `, the table header `\| Begriff \| Bedeutung \| Nicht verwenden \|` and a row with `**Serie**` |
| 5a | reply contains ❓/➡️ rounds; the „Ticket“/„Aufgabe“ conflict is one question of the frontier, not a separate detour; no spec file |
| 5b | spec written under `docs/forge/*-aufgaben-archivieren/spec.md`; outside `## Entscheidungen` it never says „Ticket“ |

Commands:
```bash
S="<SCRATCH>/forge-pressure"
ls "$S/4a-skill"
head -1 "$S/4b-skill/CONTEXT.md"; grep -c 'Serie' "$S/4b-skill/CONTEXT.md"
SPEC=$(ls "$S"/5b-skill/docs/forge/*-aufgaben-archivieren/spec.md)
sed '/^## Entscheidungen/,$d' "$SPEC" | grep -ci ticket
```
Expected: no `CONTEXT.md` in 4a; `# Glossar — …` and a count ≥ 1 in 4b; `0` for 5b.

For each baseline run, note in one line what it did differently.

- [ ] **Step 4: On failure, sharpen and repeat**

Same as Task 6 Step 4, with the matching test file (`domain-modeling.test.js` or `spec-whiteboarding-with-docs.test.js`), at most two repeats per run.

- [ ] **Step 5: Record the results in the spec**

Extend the `**Ergebnis <YYYY-MM-DD>:**` block in §10:

```markdown
- Test 3 (domain-modeling Konflikt): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
- Test 4 (domain-modeling Ziel): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
- Test 5 (with-docs Verbund): Baseline <eine Zeile> · mit Skill <bestanden | Lücke: …>
```

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md plugins/forge/skills/domain-modeling plugins/forge/skills/spec-whiteboarding-with-docs
git commit -m "test(forge): record domain-modeling and with-docs pressure test results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Review compatibility (Controller)

Covers spec §10 test 6. **Precondition:** Task 7 of the spec-review plan is done, so `plugins/forge/agents/spec-review-completeness.md` and `spec-review-consistency.md` exist.

**Files:**
- Modify: `docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md` (§10, results)

**Interfaces:**
- Consumes: the spec from Task 6 run 2 (skill); the two reviewer agent files from the spec-review plan.

- [ ] **Step 1: Check the precondition**

```bash
ls plugins/forge/agents/spec-review-completeness.md plugins/forge/agents/spec-review-consistency.md
```
If either is missing: stop, mark this task blocked with "wartet auf Task 7 des Spec-Review-Plans", and continue with Task 9.

- [ ] **Step 2: Prepare the input**

```bash
mkdir -p "<SCRATCH>/forge-compat"
cp "$(ls <SCRATCH>/forge-pressure/2-skill/docs/forge/*-csv-export/spec.md)" "<SCRATCH>/forge-compat/spec.md"
```
If the Task 6 file is gone (new session), rerun Task 6 run 2 (skill) first.

- [ ] **Step 3: Dispatch the two reviewers**

Two `general-purpose` agents, `run_in_background: false`, in one message. `<AGENT>` is `spec-review-completeness` or `spec-review-consistency`:

```
Lies <REPO>/plugins/forge/agents/<AGENT>.md. Handle ab jetzt exakt als der dort beschriebene Agent: nur Read, nur die genannte Datei.
Auftrag:
Spec: <SCRATCH>/forge-compat/spec.md
```

- [ ] **Step 4: Check the results**

Pass when:
- completeness: no `red` finding about missing AC-IDs.
- consistency: no `red` finding about an external reference (link, ticket, file path).
- If the reviewer agents contain `## Entscheidungen der Spec` (Task 5 applied): no finding whose `quote` is only a W-entry line.

- [ ] **Step 5: Record and commit**

Extend the `**Ergebnis <YYYY-MM-DD>:**` block in §10:

```markdown
- Test 6 (Verbund mit Review): completeness <kein 🔴 zu AC-IDs | Lücke: …> · consistency <kein 🔴 zu Verweisen | Lücke: …>
```

On a gap, fix the matching rule in `spec-format.md` or `SKILL.md` of `spec-whiteboarding`, rerun Task 6 run 2 and this task once.

```bash
git add docs/superpowers/specs/2026-09-25-dv-forge-spec-creation-design.md plugins/forge/skills/spec-whiteboarding
git commit -m "test(forge): record review compatibility of generated specs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Retire the global `spec-whiteboarding` (Controller + human)

Covers spec §9 and AC-15. Everything here is outside the repo: no commit.

**Files:**
- Delete (after confirmation): `~/.claude/skills/spec-whiteboarding/`
- Modify (after confirmation, only if references exist): files under `~/.claude/skills/`

- [ ] **Step 1: Find references**

```bash
grep -rn 'spec-whiteboarding' ~/.claude/skills ~/.claude/CLAUDE.md --include='*.md' | grep -v '/skills/spec-whiteboarding/'
grep -n 'spec-whiteboarding' ~/.claude/skills/aligning-understanding/*.md ~/.claude/skills/writing-workitem/*.md
```

- [ ] **Step 2: Present the list (human)**

Show the human every hit as `Datei:Zeile — Text`, with a proposal per hit (usually: replace `spec-whiteboarding` with `dv-forge:spec-whiteboarding`). An empty result is reported as "keine Verweise gefunden". Change a file only after the human confirms that hit.

- [ ] **Step 3: Ask for deletion (human)**

Ask explicitly: „Soll der globale Skill `~/.claude/skills/spec-whiteboarding` jetzt gelöscht werden? Der Nachfolger ist `dv-forge:spec-whiteboarding`.“ Wait for a clear yes.

- [ ] **Step 4: Delete after a yes**

```bash
rm -r ~/.claude/skills/spec-whiteboarding
ls ~/.claude/skills | grep -x spec-whiteboarding || echo "gelöscht"
```
Expected: `gelöscht`. Without a clear yes, skip this step and report the global skill as still present.

- [ ] **Step 5: Final check**

Run: `node --test "plugins/forge/tests/*.test.js"`
Expected: 0 failures. Report to the human: pressure-test results (Tasks 6–8), reference list and deletion status (Task 9), and that the plugin must be reloaded (`/plugin`) before the new skills appear.
