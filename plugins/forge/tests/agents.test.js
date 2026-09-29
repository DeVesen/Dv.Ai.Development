'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AGENTS = path.join(__dirname, '..', 'agents');
const REVIEWERS = ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'];
const FORMAT_KEYS = ['"reviewer"', '"summary"', '"findings"', '"location"', '"quote"', '"category"', '"consequence"', '"rationale"'];
const SPEC_CATEGORIES = ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar', 'detail', 'formulierung'];
const PLAN_CATEGORIES = [...SPEC_CATEGORIES, 'ac-fehlt-im-plan', 'umsetzer-steckt-fest'];

function categorySection(body) {
  const text = body.replace(/\r\n/g, '\n');
  const start = text.indexOf('## Kategorie\n');
  return start === -1 ? '' : text.slice(start, text.indexOf('\n## ', start + 1));
}

function readAgent(name) {
  const text = fs.readFileSync(path.join(AGENTS, `${name}.md`), 'utf8');
  const [, frontmatter, body] = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  const fields = Object.fromEntries(frontmatter.split(/\r?\n/).map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body };
}

for (const reviewer of REVIEWERS) {
  const name = `spec-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, 'Read, Write');
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_EmbedsFindingFormatWithOwnReviewerName`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.match(body, /keinen Code/);
    assert.ok(body.includes('## W-Einträge'), 'W-Einträge fehlt');
    assert.ok(body.includes('Offen, bewusst nicht weiterverfolgt (Abbruch)'), 'Abbruch-Abschnitt-Regel fehlt');
    assert.ok(body.includes('kein Finding und keine Lücke'), 'Abbruch-Abschnitt-Regel fehlt');
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
  });
}

test('spec-rework_Frontmatter_ReadEditOpus', () => {
  const { fields } = readAgent('spec-rework');
  assert.equal(fields.name, 'spec-rework');
  assert.equal(fields.tools, 'Read, Edit, Write');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('spec-rework_Body_DefinesDecisionEntryFormat', () => {
  const { body } = readAgent('spec-rework');
  assert.ok(body.includes('- **R<r> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>'));
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.match(body, /keinen Code/);
  assert.ok(body.includes('W-Eintrag ist bindend'));
  assert.ok(body.includes('ans Ende dieses Abschnitts an, auch wenn danach weitere Abschnitte folgen'), 'Regel zu nachfolgenden Abschnitten fehlt');
  assert.ok(body.includes('Regel 3 gilt für sie nicht'), 'Regel zum Abbruch-Abschnitt fehlt');
  assert.ok(body.includes('Fehlt er, legst du ihn direkt vor `## Offen, bewusst nicht weiterverfolgt (Abbruch)` an'), 'Anlage-Ort bei Abbruch fehlt');
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('spec-review-scout_Frontmatter_ReadGrepGlobWriteSonnet', () => {
  const { fields } = readAgent('spec-review-scout');
  assert.equal(fields.name, 'spec-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob, Write');
  assert.equal(fields.model, 'sonnet');
  assert.match(fields.description, /^Use when/);
});

test('spec-review-scout_Body_DefinesProposalFormat', () => {
  const { body } = readAgent('spec-review-scout');
  assert.ok(body.includes('## Scout-Vorschläge'));
  assert.ok(body.includes('**Bevorzugt: <Nr>** — <Begründung>'));
  assert.ok(body.includes('W-Eintrag'));
  assert.match(body, /änderst keine Datei/);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

const PLAN_REVIEWERS = {
  coverage: 'Read, Write',
  feasibility: 'Read, Grep, Glob, Write',
  architecture: 'Read, Grep, Glob, Write',
  risks: 'Read, Grep, Glob, Write',
  buildability: 'Read, Grep, Glob, Write, ToolSearch',
};

for (const [reviewer, tools] of Object.entries(PLAN_REVIEWERS)) {
  const name = `plan-review-${reviewer}`;

  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_FormatCalibrationDecisionsLocations`, () => {
    const { body } = readAgent(name);
    for (const key of FORMAT_KEYS) assert.ok(body.includes(key), `${key} fehlt`);
    assert.ok(body.includes(`"reviewer": "${reviewer}"`));
    assert.ok(body.includes('## W-Einträge'), 'W-Einträge fehlt');
    assert.ok(body.includes('## Kalibrierung'), 'Kalibrierung fehlt');
    assert.ok(body.includes('`Task <n>`'), 'Stellen-Schlüssel fehlt');
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
  });
}

test('plan-review-coverage_Body_ReadsNoCodeAndMissingAcIsAlwaysRed', () => {
  const { body } = readAgent('plan-review-coverage');
  assert.match(body, /keinen Code/);
  assert.match(body, /immer Kategorie `ac-fehlt-im-plan`/);
});

test('plan-review-codeReaders_Body_TakeRepoInput', () => {
  for (const reviewer of ['feasibility', 'architecture', 'risks', 'buildability']) {
    assert.ok(readAgent(`plan-review-${reviewer}`).body.includes('`Repo:`'), `${reviewer} ohne Repo`);
  }
});
test('plan-rework_Frontmatter_ReadGrepGlobEditOpus', () => {
  const { fields } = readAgent('plan-rework');
  assert.equal(fields.name, 'plan-rework');
  assert.equal(fields.tools, 'Read, Grep, Glob, Edit, Write');
  assert.equal(fields.model, 'opus');
  assert.match(fields.description, /^Use when/);
});

test('plan-rework_Body_DecisionEntryRenumberingAndJsonResult', () => {
  const { body } = readAgent('plan-rework');
  assert.ok(body.includes('- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>'));
  assert.ok(body.includes('nicht geändert — Stelle existiert nicht'));
  assert.ok(body.includes('`Task 3 → Task 3, Task 4`'));
  assert.ok(body.includes('"results"'));
  assert.ok(body.includes('`spec-question`'));
  assert.match(body, /änderst sie nie/);
  assert.match(body, /W-Einträge/);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
});
test('plan-review-scout_Frontmatter_ReadGrepGlobWriteSonnet', () => {
  const { fields } = readAgent('plan-review-scout');
  assert.equal(fields.name, 'plan-review-scout');
  assert.equal(fields.tools, 'Read, Grep, Glob, Write');
  assert.equal(fields.model, 'sonnet');
  assert.match(fields.description, /^Use when/);
});

test('plan-review-scout_Body_FormatProposalsPreferredAndNoEdits', () => {
  const { body } = readAgent('plan-review-scout');
  assert.ok(body.includes('## Scout-Vorschläge'));
  assert.ok(body.includes('**Bevorzugt: <Nr>** — <Begründung>'));
  assert.match(body, /1 bis 3/);
  assert.match(body, /änderst keine Datei/);
  assert.match(body, /🟢-Gruppen/);
  assert.match(body, /Spec so ändern/);
  assert.ok(body.includes('`Repo:`'));
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length, 'Anführungszeichen unpaarig');
});

test('allReviewers_Body_WriteResultFileWithEmptyExample', () => {
  const names = fs.readdirSync(AGENTS).filter((file) => /-review-/.test(file) && !file.includes('scout') && !file.includes('verifier')).map((file) => file.slice(0, -3));
  assert.equal(names.length, 15);
  for (const name of names) {
    const { body } = readAgent(name);
    const short = /"reviewer": "([a-z-]+)"/.exec(body)[1];
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei'), `${name}: Eingabe Ergebnis fehlt`);
    assert.ok(body.includes('Deine letzte Aktion: Schreib dein Ergebnis mit `Write`'), `${name}: letzte Aktion fehlt`);
    assert.ok(body.includes('auch bei null Findings'), name);
    assert.ok(body.includes(`\`{"reviewer": "${short}", "summary": "<Prüfumfang>", "findings": []}\``), `${name}: Leer-Beispiel fehlt`);
    assert.ok(!body.includes('Beende deine Antwort mit genau einem JSON-Block'), `${name}: alter Ausgabeweg`);
  }
});

test('reworkAndScouts_Body_ReadFindingsFromAggregateFile', () => {
  for (const name of ['spec-rework', 'plan-rework']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei'), name);
    assert.ok(body.includes('"results"'), name);
  }
  for (const name of ['spec-review-scout', 'plan-review-scout']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('`Findings:` Datei mit den Gruppen, die das Skript für dich ausgewählt hat'), name);
    assert.ok(body.includes('1. Du bearbeitest jede Gruppe der Datei `Findings:`'), name);
    assert.ok(body.includes('nach Runde 1 oder nach der Nachprüfung'), name);
  }
  assert.ok(readAgent('implementation-review-scout').body.includes('`Findings:` Datei der letzten Aggregation'));
});

test('plan-review-buildability_Body_GatesSchemaAndForeignCode', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.match(body, /\*\*Gates verdrahtet:\*\*/);
  assert.match(body, /per `ToolSearch`/);
  assert.match(body, /Das prüft nur dieser Reviewer/);
  for (const name of ['feasibility', 'architecture', 'risks', 'coverage']) {
    assert.match(readAgent(`plan-review-${name}`).body, /prüft `buildability`/, name);
  }
});

test('plan-review-coverage_Body_SplitsAcIntoPartsAndReportsAllGapsInOneFinding', () => {
  const { body } = readAgent('plan-review-coverage');
  assert.match(body, /zerlegst du jedes AC in seine Teilaussagen/);
  assert.match(body, /alle fehlenden Teilaussagen in einem Finding/);
});

test('plan-rework_Body_AcFindingChecksTheWholeAc', () => {
  const { body } = readAgent('plan-rework');
  assert.match(body, /Finding an `AC-<Zahl>`.*ganze AC/);
});

test('plan-review-buildability_Body_CommandsFromInputNoPluginResearch', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.ok(body.includes('- `Build:`, `Test:`, `Lint:`'));
  assert.match(body, /Quellen und Tests des Plugins liest du nicht/);
  assert.match(body, /In `node_modules` liest du nur für Auftrag 8/);
});

test('plan-review-architecture_Body_LooksForExistingCounterparts', () => {
  const { body } = readAgent('plan-review-architecture');
  assert.match(body, /\*\*Wiederverwendung:\*\*/);
  assert.match(body, /„Muster aus <Datei>“/);
});

test('spec-rework_Body_NewBehaviourBecomesQuestionNotDecision', () => {
  const { body } = readAgent('spec-rework');
  assert.doesNotMatch(body, /naheliegendste, konservativste Festlegung/);
  assert.match(body, /Klarstellung/);
  assert.match(body, /neues Verhalten/);
  assert.ok(body.includes('`human-question`'));
});

test('spec-review-profiles_Body_WritesExcerptOnceAndReadsItInLaterRounds', () => {
  const { body } = readAgent('spec-review-profiles');
  assert.ok(body.includes('- `Profil-Auszug:`'));
  assert.match(body, /Existiert der Auszug, liest du nur ihn/);
  assert.match(body, /Fehlt er, schreibst du/);
});

test('planReviewers_Body_TakeAnchorFileAndReadPlanOnce', () => {
  for (const name of ['coverage', 'feasibility', 'architecture', 'risks', 'buildability']) {
    const { body } = readAgent(`plan-review-${name}`);
    assert.ok(body.includes('- `Anker:` optional, Datei der Anker-Prüfung mit Task-Übersicht und je Dateizeile ✅, ⚠ oder ❌'), name);
    assert.ok(body.includes('Gibt es `Anker:`, liest du den Plan einmal ganz und danach nur noch Abschnitte per Zeilenbereich laut Task-Übersicht in der Anker-Datei.'), name);
  }
});

test('plan-review-buildability_Body_ReportsOnlyRedAnchorLines', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.ok(body.includes('ist jede ❌-Zeile aus der Anker-Datei ein Finding an ihrem Task'));
  assert.ok(body.includes('⚠- und ✅-Zeilen meldest du nicht'));
  assert.ok(body.includes('Ohne `Anker:`: Die Datei einer `Modify`-Zeile existiert im Repo'));
});

test('plan-review-feasibility_Body_NoExistenceCheckButWarningLines', () => {
  const { body } = readAgent('plan-review-feasibility');
  assert.ok(body.includes('Existenz von Dateien und Ankern prüfst du nicht; sie steht in der Anker-Datei.'));
  assert.ok(body.includes('**⚠-Zeilen:**'));
});

test('scouts_Body_WriteResultFileAndAnswerWithPathOnly', () => {
  for (const name of ['spec-review-scout', 'plan-review-scout', 'implementation-review-scout']) {
    const { body } = readAgent(name);
    assert.ok(body.includes('- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei (`scout.md`)'), name);
    assert.ok(body.includes('Deine letzte Aktion: Schreib mit `Write`'), name);
    assert.ok(body.includes('Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.'), name);
    assert.ok(!body.includes('Deine Antwort besteht nur aus diesem Abschnitt'), name);
    assert.ok(body.includes('`<Stelle>` und die Stufe übernimmst du exakt aus der Gruppen-Überschrift, ohne die Reviewer-Klammer.'), name);
  }
});

test('reworkAgents_Body_FollowupModeAppliesChosenProposalsWithFEntries', () => {
  for (const [name, escalation] of [['plan-rework', 'spec-rückfrage'], ['spec-rework', 'frage an den menschen']]) {
    const { body } = readAgent(name);
    assert.ok(body.includes('## Folge-Modus'), name);
    assert.ok(body.includes('- `Vorschläge:` nur im Folge-Modus'), name);
    assert.ok(body.includes(`\`- **F · <Stelle>** — geändert | nicht geändert | ${escalation} — Vorschlag <n>: <Begründung>\``), name);
    assert.ok(body.includes('`location` ist die `<Stelle>` ohne Gruppennummer und Stufe'), name);
  }
});

test('spec-rework_Body_ChosenProposalCountsAsHumanDecision', () => {
  const { body } = readAgent('spec-rework');
  assert.ok(body.includes('Der gewählte Vorschlag ist die Entscheidung des Menschen; Regel 3 greift für ihn nicht.'));
  assert.ok(!body.includes('Regel 3 gilt auch hier'));
});

test('specAndPlanReviewers_Body_NameCategoriesNeverColours', () => {
  const reviewers = [
    ...['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => [`spec-review-${name}`, SPEC_CATEGORIES]),
    ...['coverage', 'feasibility', 'architecture', 'risks', 'buildability'].map((name) => [`plan-review-${name}`, PLAN_CATEGORIES]),
  ];
  for (const [name, categories] of reviewers) {
    const { body } = readAgent(name);
    const section = categorySection(body);
    for (const category of categories) assert.ok(section.includes(`- \`${category}\` — `), `${name}: ${category} fehlt`);
    if (name.startsWith('spec-')) assert.ok(!section.includes('ac-fehlt-im-plan'), `${name}: Plan-Kategorie`);
    assert.ok(!body.includes('## Einstufung'), `${name}: alte Einstufung`);
    assert.ok(!body.includes('"severity"'), `${name}: severity`);
    assert.ok(!/`(red|yellow|green)`/.test(body), `${name}: Farbe als Wert`);
    assert.ok(body.includes('Ein Feld `severity` oder `color` macht dein Ergebnis ungültig.'), `${name}: Hinweis auf ungültige Farbe`);
  }
});

test('specReviewers_Body_GoalSpellingExampleAndNoFormulierung', () => {
  for (const reviewer of REVIEWERS) {
    const { body } = readAgent(`spec-review-${reviewer}`);
    assert.match(body, /^## Ziel\r?$/m, `${reviewer}: Ziel fehlt`);
    assert.ok(body.includes('Die Spec soll stimmig, verständlich und grob umsetzbar sein, nicht perfekt. Details entscheidet der Plan.'), `${reviewer}: Ziel`);
    assert.ok(body.includes('Eine Formulierung, einen Stil oder einen Randfall meldest du nie.'), `${reviewer}: Stil`);
    assert.ok(body.includes('(Groß- oder Kleinschreibung, ß oder ss, Umlaute) sind kein Stil, sondern `detail`'), `${reviewer}: Schreibweisen`);
    const own = reviewer === 'clarity' ? 'sondern `detail`; du meldest sie.' : 'sondern `detail`; sie meldet nur `clarity`, du meldest sie nicht.';
    assert.ok(body.includes(own), `${reviewer}: Zuständigkeit für Schreibweisen`);
    const section = categorySection(body);
    assert.ok(section.includes('- `formulierung` — meldest du nie.'), `${reviewer}: formulierung`);
    assert.ok(!/Randfall|Schreibweise/.test(section), `${reviewer}: Randfall oder Schreibweise in der Kategorie`);
    assert.ok(!section.includes('setzt etwas voraus, das die Spec nie herstellt'), `${reviewer}: alte unerfuellbar-Regel`);
  }
});

test('spec-review-completeness_Body_CategoriesPerCaseTitleHeadingAndSourceForEveryArt', () => {
  const { body } = readAgent('spec-review-completeness');
  for (const part of [
    'Fehlt es, meldest du ein Finding der Kategorie `fehlendes-verhalten` an der Abschnittsüberschrift der Funktion.',
    'etwa „dann funktioniert der Export korrekt“, meldest du an seiner AC-ID ein Finding der Kategorie `fehlendes-verhalten`.',
    'Nennt es ein Ergebnis ohne Maß, etwa „dann lädt die Liste schnell“, ist das Finding `detail`.',
    'genau ein Finding der Kategorie `fehlendes-verhalten` an der Titelüberschrift (`#`) des Dokuments und keine weiteren Findings je Funktion ohne AC.',
    '`location` ist der Text der Titelüberschrift ohne `#`, `quote` ist `Keine AC-ID in der Spec`.',
    'gleichst du sie bei jeder Art der Spec ab, auch bei `Art: frei`',
    '`quote` beginnt dann mit `Quelle: `.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('an der ersten Überschrift der Spec'), 'alte Stelle ohne AC-ID');
  assert.ok(!body.includes('„korrekt“, „möglich“, „sinnvoll“'), 'alte Liste vager Wörter');
});

test('spec-review-consistency_Body_ContradictionAndReferenceCategories', () => {
  const { body } = readAgent('spec-review-consistency');
  for (const part of [
    'Jeden Widerspruch meldest du als `widerspruch` an der Stelle der späteren Aussage. In `quote` stehen beide Zitate, getrennt durch ` ↔ `.',
    'Ein Verweis bei einer Funktion, die die Spec selbst beschreibt, ist `detail`.',
    'Ist der Verweis die einzige Beschreibung einer Funktion, ist er `fehlendes-verhalten`.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('hat `unerfuellbar`, wenn der Bau seinen Inhalt braucht'), 'alte Verweis-Regel');
});

test('spec-review-feasibility_Body_UnfulfillableAtRequirementAndPreconditionIsDetail', () => {
  const { body } = readAgent('spec-review-feasibility');
  for (const part of [
    'Anforderungen, die nicht zugleich erfüllbar sind, meldest du als `unerfuellbar`. Das Finding kommt an die spätere der beiden Stellen',
    'meldest du als `unerfuellbar` an der Anforderung, nie am Eintrag der Entscheidung.',
    'Eine Voraussetzung, die die Spec selbst nennt, aber nirgends herstellt, einfordert oder als gegeben festlegt, ist `detail`.',
  ]) {
    assert.ok(body.includes(part), part);
  }
});

for (const [name, tools, inputs, categories] of [
  ['spec-review-verifier', 'Read, Write', ['- `Spec:`'], SPEC_CATEGORIES],
  ['plan-review-verifier', 'Read, Grep, Glob, Write', ['- `Plan:`', '- `Spec:`', '- `Repo:`'], PLAN_CATEGORIES],
]) {
  test(`${name}_Frontmatter_NameToolsModelDescription`, () => {
    const { fields } = readAgent(name);
    assert.equal(fields.name, name);
    assert.equal(fields.tools, tools);
    assert.equal(fields.model, 'sonnet');
    assert.match(fields.description, /^Use when/);
  });

  test(`${name}_Body_JudgesChecklistAndChangedAreasOnly`, () => {
    const { body } = readAgent(name);
    for (const input of [...inputs, '- `Prüfliste:`', '- `Ergebnis:` absoluter Pfad deiner Ergebnisdatei']) assert.ok(body.includes(input), `${name}: ${input}`);
    for (const part of ['"verdicts"', '"verdict": "erledigt"', '`nicht erledigt`', 'Du suchst nicht neu', 'nur darauf, ob sein neuer Text',
      '`{"reviewer": "verifier", "summary": "<Prüfumfang>", "verdicts": [], "findings": []}`', 'Deine letzte Aktion: Schreib dein Ergebnis mit `Write`']) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    for (const category of categories) assert.ok(categorySection(body).includes(`- \`${category}\` — `), `${name}: ${category}`);
    assert.ok(!body.includes('"severity"'));
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
  });
}

test('reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions', () => {
  for (const [name, question] of [['spec-rework', 'human-question'], ['plan-rework', 'spec-question']]) {
    const { body } = readAgent(name);
    for (const part of ['- `Nacharbeit:` Datei mit `## 🔴-Stellen`', 'Hinweise und 🟢-Findings bearbeitest du nicht', '"questions"', '"locations"', '"cases"',
      '"recommendation"', '"reason"', `\`${question}\``, 'Jede Stelle mit Frage steht in genau einer gebündelten Frage', 'je Regel']) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    assert.ok(!body.includes('Du bearbeitest jede 🔴- und jede 🟡-Gruppe'), `${name}: alte Regel`);
  }
});

test('spec-rework_Body_AnswerModeWritesWEntriesAfterREntries', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['## Antwort-Modus', '- `Fragen:`', '- `Antworten:`', '"answers"', '`answered`', '`partial`', '`open`', 'nach allen R-Einträgen',
    '- **W · <Stelle>[, <Stelle>…]** · Aussage — <Antwort>', '„später“', '## Offene Fragen aus früheren Läufen']) {
    assert.ok(body.includes(part), part);
  }
});
