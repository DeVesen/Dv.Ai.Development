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
  assert.ok(body.includes('- **R<n> · <Stelle>** — geändert | nicht geändert | frage an den menschen — <Begründung oder Frage>'));
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

test('spec-review-scout_Body_EvidenceLinePerProposalAndSpecOnlyWhenFree', () => {
  const { body } = readAgent('spec-review-scout');
  for (const part of [
    '- `Profil-Index:` optional, nur mit `Repo:`',
    'Beantwortet der Code ein Finding, nennt der Vorschlag die Code-Datei als Beleg; beantwortet es ein Glossar-Eintrag, nennt er diesen Eintrag als Beleg.',
    'Ohne `Repo:` stützt du dich nur auf die Spec, und kein Beleg nennt etwas außerhalb der Spec.',
    '`Beleg: <Datei> · <Begriff>`',
    '`Beleg: Spec · <Stelle>`',
    '`Beleg: keiner`',
    '   Beleg: <Beleg>',
  ]) {
    assert.ok(body.includes(part), part);
  }
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
  assert.ok(body.includes('- **R<n> · <Stelle>** — geändert | nicht geändert — <Begründung>'));
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
  assert.ok(body.includes('1. Du bearbeitest jede Gruppe aus `Findings:`, sonst keine.'));
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
    assert.ok(readAgent(name).body.includes('- `Findings:` Datei mit den Gruppen, zu denen du Vorschläge machst'), name);
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
  assert.match(body, /In `node_modules` liest du nur für Auftrag 6/);
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

test('spec-rework_Body_ClarificationAndNewBehaviourWithEvidenceWrittenWithoutQuestion', () => {
  const { body } = readAgent('spec-rework');
  for (const part of [
    'weil eine andere Aussage oder ein W-Eintrag eine der beiden Seiten stützt',
    'Eine Klarstellung schreibst du selbst, ohne Frage an den Menschen.',
    'Ist der bevorzugte Scout-Vorschlag eine Klarstellung, setzt du ihn um.',
    'ist neues Verhalten, auch wenn sie nur eine Aussage streicht.',
    'Hat die Stelle keine solche Zeile, mehr als eine oder gar keine Scout-Vorschläge, gilt keiner als bevorzugt.',
    'steht im Kopf der Spec `Art: frei`, zählt nur ein Beleg aus der Spec.',
    '`Beleg: keiner` ist kein Beleg.',
    'Ein Beleg zählt nur in einer dieser Formen: `<Datei>`, `<Datei> · <Begriff>` oder `Spec · <Stelle>`.',
    'Einen Beleg `Spec · <Stelle>` schlägst du in der Spec nach; sagt die Stelle nicht, was der Vorschlag festlegt, ist er kein Beleg.',
    '`- **R<n> · <Stelle>** — geändert — Neues Verhalten, Beleg: <Beleg> — <Begründung>`',
    '`"evidence": "<Beleg>"`',
    'Nur neues Verhalten ohne Beleg entscheidet der Mensch',
    'Ein Beleg aus dem Bestand geht nie vor einen W-Eintrag.',
    'widerspricht der bevorzugte Scout-Vorschlag einem W-Eintrag, mit oder ohne Beleg',
    '- `evidence`: nur bei `changed` mit neuem Verhalten nach Regel 3',
    'Mit `Repo:` liest du darunter zusätzlich nur die Dateien, die ein Scout-Beleg nennt.',
    '- `Repo:` optional, nur bei `art=verankert`',
    'Ohne `Repo:` zählt ebenfalls nur ein Beleg aus der Spec.',
    'Einen Beleg `<Datei>` oder `<Datei> · <Begriff>` schlägst du unter `Repo:` nach; fehlt die Datei, steht der Begriff nicht in ihr oder sagt sie nicht, was der Vorschlag festlegt, ist er kein Beleg.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('du bist nicht an sie gebunden'), 'alte Scout-Regel');
  assert.ok(!body.includes('entscheidet das nur der Mensch: Du änderst die Spec an dieser Stelle nicht'), 'alte Regel 3');
});

test('spec-rework_Body_EvidenceLineNeverCopiedIntoSpecInRulesAndFollowupMode', () => {
  const { body } = readAgent('spec-rework');
  const sentence = 'Eine eingerückte Zeile `Beleg: …` unter einem Scout-Vorschlag ist ein Beleg, kein Vorschlagstext; du übernimmst sie nie in die Spec.';
  const rules = body.slice(body.indexOf('## Regeln'), body.indexOf('## Fragen bündeln'));
  const followup = body.slice(body.indexOf('## Folge-Modus'), body.indexOf('## Ausgabe'));
  assert.ok(rules.includes(sentence), 'Regeln');
  assert.ok(followup.includes(sentence), 'Folge-Modus');
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

test('plan-review-buildability_Body_NoFilesAnchorsOrNumbering', () => {
  const { body } = readAgent('plan-review-buildability');
  assert.ok(body.includes('Dateien, Anker und Nummerierung prüfst du nicht; das tun Skripte.'));
  for (const old of ['**Dateien und Anker:**', '**Nummerierung:**', 'ist jede ❌-Zeile aus der Anker-Datei ein Finding an ihrem Task']) {
    assert.ok(!body.includes(old), old);
  }
});

test('plan-review-buildability_Body_CoreIsStuckRestIsDetail', () => {
  const { body } = readAgent('plan-review-buildability');
  for (const part of [
    'Ein Platzhalter statt Code ist `umsetzer-steckt-fest`.',
    'Ein Schritt, der Code verlangt, enthält einen vollständigen Code-Block. Fehlt er: `umsetzer-steckt-fest`.',
    'Ein verbotener Weg ist `umsetzer-steckt-fest`.',
    'falscher oder fehlender Parametername ist `umsetzer-steckt-fest`',
    'Ein Gate, das nicht verdrahtet ist, ist `umsetzer-steckt-fest`, auch wenn der Weg erlaubt wäre.',
    'Schritte, die deutlich mehr als eine Aktion sind: `detail`.',
    'Fremd-Code ist, was der Plan von einer Bibliothek übernimmt oder voraussetzt, die das Projekt nicht selbst schreibt',
    'passt etwas nicht zur installierten Version: `detail`.',
  ]) {
    assert.ok(body.includes(part), part);
  }
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

test('spec-review-clarity_Body_TwoReadingsHowInsteadOfWhatNoEdgeCaseSearch', () => {
  const { fields, body } = readAgent('spec-review-clarity');
  for (const part of [
    '# Spec-Review: Klarheit',
    'Ein AC mit zwei verschiedenen Lesarten ist `detail`. In `rationale` stehen beide Lesarten.',
    'Namen von Klassen, Dateien, Tabellen oder Frameworks, Dateipfade und technische Schritte',
    'Solche Details sind `detail`.',
    'meldest du als `detail`.',
    'Rand- und Fehlerfälle — nach ihnen suchst du nicht.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('Klarheit und Lücken'), 'alter Titel');
  assert.ok(!body.includes('leere oder ungültige Eingaben, Grenzwerte'), 'alte Randfall-Suche');
  assert.ok(!body.includes('außer sie widersprechen einer Anforderung'), 'alte WIE-Ausnahme');
  assert.doesNotMatch(fields.description, /edge and error cases/);
});
test('spec-review-profiles_Body_ActualStateIsContradictionGlossaryTermIsDetail', () => {
  const { body } = readAgent('spec-review-profiles');
  for (const part of [
    'die im Glossar anders heißen oder dort unter „Nicht verwenden“ stehen, sind `detail`. `rationale` nennt den Glossar-Begriff.',
    'die einem Modul- oder Feature-Profil widersprechen, sind `widerspruch`. `rationale` nennt die Profil-Datei und zitiert die Profil-Aussage.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('außer er macht eine Anforderung mehrdeutig'), 'alte Begriffs-Ausnahme');
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
    assert.ok(body.includes('"category": "widerspruch"'), `${name}: Beispiel-Kategorie`);
    assert.doesNotMatch(body, /[🔴🟡🟢]/u, `${name}: Farbe im Text`);
    assert.ok(!body.includes('"severity"'));
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
  });
}

test('reworkAgents_Body_OnlyRedStellenThreeOutcomesAndBundledQuestions', () => {
  for (const [name, question] of [['spec-rework', 'human-question'], ['plan-rework', 'spec-question']]) {
    const { body } = readAgent(name);
    for (const part of ['- `Findings:` Datei mit den 🔴-Stellen nach `=== REWORK ===`', 'Hinweise und 🟢-Findings bekommst du nicht', '"reason"', `\`${question}\``]) {
      assert.ok(body.includes(part), `${name}: ${part}`);
    }
    assert.ok(!body.includes('Du bearbeitest jede 🔴- und jede 🟡-Gruppe'), `${name}: alte Regel`);
  }
  const { body } = readAgent('spec-rework');
  for (const part of ['"questions"', '"places"', '"options"', '"title"', '"why"', '"reviewers"', '"change"', '"recommendation"', 'Jede Stelle mit Frage steht in genau einer gebündelten Frage', 'je Regel']) {
    assert.ok(body.includes(part), `spec-rework: ${part}`);
  }
});

test('spec-rework_Body_AnswerModeWritesWEntriesAfterREntries', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['## Antworten eintragen', '- `Antworten des Menschen:`', '"results"', '"status": "answered"', '"status": "open"', 'ans Ende des Abschnitts Entscheidungen',
    '- **W · <Stelle>** · Aussage — Antwort auf „R<n> · <Stelle>“: <Antwort>', '„später“', '## Offene Fragen']) {
    assert.ok(body.includes(part), part);
  }
});

test('spec-rework_Body_AnswerEntryNamesIdOfQuestionsREntryNotOwnId', () => {
  const { body } = readAgent('spec-rework');
  const answerSection = body.slice(body.indexOf('## Antworten eintragen'), body.indexOf('## Folge-Modus'));
  assert.ok(answerSection.includes('Dort ist `R<n>` die Kennung aus dem R-Eintrag der Frage, wie er in der Spec oder unter `## Offene Fragen` steht, nicht deine Kennung aus `Eintrag:`.'));
});

test('plan-review-advisory_Body_FindingsAtMostYellow', () => {
  for (const name of ['architecture', 'risks']) {
    const { body } = readAgent(`plan-review-${name}`);
    assert.ok(body.includes('## Beratend'), name);
    assert.ok(body.includes('Du bist beratend. Ein Skript stuft jedes deiner Findings höchstens auf 🟡, gleich welche Kategorie es trägt; deine Findings blocken nie.'), name);
  }
});

test('plan-review-coverage_Body_CategoryPerCheckAndDefinitions', () => {
  const { body } = readAgent('plan-review-coverage');
  for (const part of [
    'Ob jede AC-ID der Spec unter `**ACs:**` eines Tasks steht, prüft ein Skript; das meldest du nicht.',
    '1. **Teilweise umgesetzt:**',
    'Ein Test ist ein automatisierter Testfall, den der Plan anlegt, ändert oder als vorhanden nennt, samt dem Befehl, der ihn ausführt.',
    'Ein Befehl oder Tool-Aufruf mit erwarteter Ausgabe ohne solchen Testfall ist Verifikation, aber kein Test.',
    'Belegt kein Test das AC, auch wenn ein Befehl es prüft: Finding an `AC-<Zahl>`, immer Kategorie `ac-fehlt-im-plan`.',
    'Jeder Aufzählungspunkt im Abschnitt `## Soll-Vorgaben` der Spec ist eine Soll-Vorgabe.',
    'Fehlt sie dort oder weicht sie ab: je Soll-Vorgabe ein eigenes Finding an `Global Constraints`, immer Kategorie `ac-fehlt-im-plan`.',
    'Fehlt der Abschnitt `## Global Constraints`, fehlt jede Soll-Vorgabe.',
    'Hat die Spec keine Soll-Vorgaben, entsteht daraus kein Finding.',
    'Fehlt sie: Finding an `Task <n>`, immer Kategorie `detail`.',
    'Ein AC ohne Test und ein Task ohne Verifikation meldest du getrennt, jedes mit seinem eigenen Finding.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('1. Jede AC-ID der Spec steht unter `**ACs:**` in mindestens einem Task.'), 'alte Handprüfung der AC-Abdeckung');
});

test('plan-review-feasibility_Body_CategoryPerCheckAndNoRedAnchorLines', () => {
  const { body } = readAgent('plan-review-feasibility');
  for (const part of [
    'Sonst: Finding an `Task <n>` des Tasks, der es braucht, Kategorie `umsetzer-steckt-fest`.',
    'Sonst: Finding an einem der beiden Tasks, Kategorie `umsetzer-steckt-fest`.',
    'Finding an einem Task, der die Voraussetzung nutzt, Kategorie `umsetzer-steckt-fest`.',
    'Ein späterer Task hebt auf, was ein früherer gebaut hat. Finding an dem späteren Task, Kategorie `widerspruch`.',
    'Führt keiner von ihnen den Anker ein: Finding an `Task <n>` der ⚠-Zeile, Kategorie `umsetzer-steckt-fest`.',
    '❌-Zeilen meldet ein Skript; du meldest sie nie, damit derselbe Anker nicht doppelt gemeldet wird.',
  ]) {
    assert.ok(body.includes(part), part);
  }
});

test('plan-rework_Body_SpecQuestionOnlyForContradictionOrImpossible', () => {
  const { body } = readAgent('plan-rework');
  for (const part of [
    '**spec-rückfrage** — nur wenn sich die Spec widerspricht, etwa zwei ACs, die sich ausschließen, oder wenn sie Unmögliches verlangt.',
    'Unmöglich ist eine Anforderung, wenn keine Festlegung im Plan sie erfüllen kann, ohne eine andere Aussage der Spec zu verletzen oder eine nicht herstellbare Voraussetzung zu brauchen.',
    'Der Plan bleibt an dieser Stelle unverändert.',
    'Lässt die Spec eine Festlegung offen, triffst du sie selbst im Plan: Ausgang **geändert**, die Festlegung steht im R-Eintrag. Dafür gibt es keine Spec-Rückfrage.',
  ]) {
    assert.ok(body.includes(part), part);
  }
  assert.ok(!body.includes('lässt eine Festlegung offen, die der Plan nicht selbst treffen darf'), 'alte Rückfrage bei offener Festlegung');
});

test('specAndPlanReviewers_Body_LocationNamesFirstPlaceAndFieldsAreNeverEmpty', () => {
  const specLocation = '- `location`: `AC-<Zahl>`, der fett gesetzte Name eines Schritts oder einer Soll-Vorgabe ohne Doppelpunkt oder die exakte Abschnittsüberschrift ohne `#` und ohne Nummerierung davor; betrifft ein Finding mehrere Stellen, steht die erste zuerst.';
  const planLocation = '- `location`: `Task <n>`, `AC-<Zahl>`, `Global Constraints` oder die exakte Abschnittsüberschrift ohne `#`; betrifft ein Finding mehrere Stellen, steht die erste zuerst. Details auf Schritt-Ebene gehören in `quote`.';
  const reviewers = [
    ...['completeness', 'consistency', 'feasibility', 'clarity', 'profiles'].map((name) => [`spec-review-${name}`, specLocation]),
    ...['coverage', 'feasibility', 'architecture', 'risks', 'buildability'].map((name) => [`plan-review-${name}`, planLocation]),
  ];
  for (const [name, location] of reviewers) {
    const { body } = readAgent(name);
    assert.ok(body.includes(location), `${name}: location`);
    assert.ok(body.includes('- Alle Felder sind Strings und Pflicht, keines leer.'), `${name}: keines leer`);
  }
});

test('spec-rework_Body_BundlesQuestionsAndEntersAnswers', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['- `Eintrag:`', 'Hinweise und 🟢-Findings bekommst du nicht.', '## Fragen bündeln', 'Jede Stelle mit Frage steht in genau einer gebündelten Frage.',
    'das Label der empfohlenen Option', '## Antworten eintragen', '„später“ gilt je Frage', 'Antwort auf „R<n> · <Stelle>“', '"questions"', '"status": "answered"']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
});

test('plan-rework_Body_OnlyRedPlacesAndSpecQuestionWithReason', () => {
  const { body } = readAgent('plan-rework');
  assert.ok(body.includes('- `Eintrag:`'));
  assert.ok(body.includes('Hinweise und 🟢-Findings bekommst du nicht.'));
  assert.ok(body.includes('`reason` ist Pflicht bei `unchanged` und `spec-question`'));
});

test('plan-rework_Body_SpecQuestionWrittenAsQuestionToTheHuman', () => {
  const { body } = readAgent('plan-rework');
  assert.ok(body.includes('Bei einer spec-rückfrage lautet er wie jede Frage an den Menschen `- **R<n> · <Stelle>** — frage an den menschen — <Rückfrage>`.'));
  assert.ok(body.includes('Bei `spec-rückfrage` schreibst du zusätzlich den R-Eintrag aus Regel 7.'));
});

test('spec-rework_Body_QuestionsAndChangesInPlainLanguageWithoutShorthand', () => {
  const { body } = readAgent('spec-rework');
  for (const part of ['höchstens 400 Zeichen', '`AC-<Zahl>`', '`Task <Zahl>`', '`R<Zahl>`', '`F · `', '`W · `', '`consequence` ist die Folge dieser Option',
    '`places` (alle betroffenen Stellen wörtlich, nur intern zur Abdeckungsprüfung)', '`change`: Pflicht bei `changed`']) {
    assert.ok(body.includes(part), `${part} fehlt`);
  }
  assert.equal(body.includes('"cases"'), false);
  assert.equal(body.includes('"rule"'), false);
});
