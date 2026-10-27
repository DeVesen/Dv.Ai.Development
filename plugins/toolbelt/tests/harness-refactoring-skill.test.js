'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readMarkdown, readText } = require('./lib/markdown');
const { isMostlyGerman } = require('./lib/german');
const { FINDINGS_HEADINGS } = require('../scripts/lib/harness-check-findings');
const { PLAN_HEADINGS, TASK_HEADINGS, START_HEADINGS, SUMMARY_HEADINGS, STATUS_LINE, BACKUP_SENTENCE } = require('../scripts/lib/harness-check-plan');

const SKILL_DIR = path.join(__dirname, '..', 'skills', 'harness-refactoring');
const SCRIPT = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/harness.js"';
const REFERENCES = ['paket-format.md', 'pruefkatalog.md', 'subagent-auftraege.md'];
// Typografische Anführungszeichen per Code Point, damit eine Umwandlung in gerade Zeichen den Test rot macht.
const OPEN = '\u201E';
const CLOSE = '\u201C';
const CLAUSES = [
  '**Kurz-Klausel.** Der Mensch liest lange Texte schwer. Jede Nachricht kurz und auf den Punkt: Ergebnis zuerst, dann höchstens fünf Punkte. Alles Weitere steht in den Paketdateien, im Chat nur der Pfad.',
  `**85-%-Klausel.** Lässt sich eine offene Frage aus Auftrag, Rückmeldung und Code mit über 85 % Gewissheit selbst beantworten, entscheidet der Skill, hält die Entscheidung mit Grund im Befundbericht unter ${OPEN}Entscheidungen${CLOSE} fest und fragt nicht. Gefragt wird nur, wenn zwei Lesarten zu verschiedenen Tasks führen; dann genau eine Frage mit Vorschlag.`,
  `**Redensart.** Hart und konstruktiv-kritisch, aber fair: jeder Befund nennt Stelle, Konsequenz und Vorschlag, nie nur ${OPEN}das ist schlecht${CLOSE}. Kein Lob ohne Inhalt, keine Höflichkeitsfloskeln.`,
  '**Mehrwert-Klausel.** Was keinen Mehrwert hat, wird nicht gemacht: kein Task für Kosmetik, keine Umbenennung ohne Befund, kein Nachfragen zu Dingen, die das Paket ohnehin festlegt. Ein Befund ohne Konsequenz ist 🟢 und bekommt keinen Task.',
];

function skill() {
  return readMarkdown(path.join(SKILL_DIR, 'SKILL.md'));
}

function reference(name) {
  return readText(path.join(SKILL_DIR, 'references', name));
}

test('harnessRefactoring_Frontmatter_NameDescriptionAndAllowedTools', () => {
  const { fields } = skill();

  assert.deepEqual(Object.keys(fields), ['name', 'description', 'allowed-tools']);
  assert.equal(fields.name, 'harness-refactoring');
  assert.match(fields.description, /^Use when /);
  for (const shell of ['Bash', 'PowerShell']) assert.ok(fields['allowed-tools'].includes(`${shell}(${SCRIPT} *)`), shell);
});

test('harnessRefactoring_Description_NameAndAllTriggerWords', () => {
  const { description } = skill().fields;

  for (const trigger of ['harness-refactoring', 'Harness prüfen', 'Plugin prüfen', 'Skill prüfen', 'Retro einarbeiten', 'harness audit']) {
    assert.ok(description.includes(trigger), trigger);
  }
});

test('harnessRefactoring_AllowedTools_WritesOnlyIntoPackageArea', () => {
  const rules = skill().fields['allowed-tools'].match(/\b(?:Edit|Write|MultiEdit|NotebookEdit)\([^)]*\)/g);

  assert.deepEqual(rules, ['Edit(.harness/**)']);
});

test('harnessRefactoring_Body_IsGerman', () => {
  assert.ok(isMostlyGerman(skill().body));
});

test('harnessRefactoring_Body_FourClausesVerbatim', () => {
  const { body } = skill();

  for (const clause of CLAUSES) assert.ok(body.includes(`- ${clause}`), clause.slice(0, 30));
});

test('harnessRefactoring_Body_AtMostOneTargetQuestionAndOneReadingQuestion', () => {
  assert.ok(skill().body.includes('Je Lauf stellst du höchstens eine Frage zur Zielerkennung und höchstens eine Frage zu Lesarten.'));
});

test('harnessRefactoring_Body_NeverChangesTheTargetNorCommitsNorPushes', () => {
  const { body } = skill();

  assert.ok(body.includes('Den Harness änderst du nie selbst: kein Edit am Ziel, kein Commit, kein Push.'));
  assert.ok(body.includes('schreiben darfst du nur in den Paketordner'));
});

test('harnessRefactoring_Body_StartAbortsWithOneSentenceWithoutPackageOrQuestion', () => {
  const { body } = skill();

  assert.ok(body.includes(`${SCRIPT} start\` mit \`--ziel '<pfad-oder-name>'\``));
  assert.ok(body.includes("`--rueckmeldung '<datei>'`"));
  assert.ok(body.includes('gibst du die eine Zeile der Fehlermeldung wieder und hörst auf: kein Paket, keine Rückfrage'));
});

test('harnessRefactoring_Body_FeedbackSplitIntoIdsAssignedOrUnassigned', () => {
  assert.ok(skill().body.includes(`Jede Anmerkung bekommt eine Kennung \`R-01\`, \`R-02\` … und landet später entweder an einer Stelle \`datei:zeile\` im Ziel oder unter ${OPEN}Nicht zuordenbar${CLOSE} mit Grund.`));
});

test('harnessRefactoring_Body_TargetRecognitionOneHitNoQuestionElseListAndOneQuestion', () => {
  const { body } = skill();

  assert.ok(body.includes(`${SCRIPT} ziele --rueckmeldung '<datei>'`));
  assert.ok(body.includes(`${SCRIPT} ziele --alle`));
  assert.ok(body.includes('Bei `TREFFER=1` prüfst du dieses Ziel ohne Rückfrage.'));
  assert.ok(body.includes('Bei mehreren oder keinem Treffer zeigst du die Trefferliste und fragst genau einmal'));
  assert.ok(body.includes('der Mensch darf mehrere Ziele wählen, sie landen in einem Paket'));
});

test('harnessRefactoring_Body_ScopeCheckOnlyAllowedInTasksOutOfScopeToMarketplace', () => {
  const { body } = skill();

  assert.ok(body.includes(`${SCRIPT} scope '<pfad>'`));
  assert.ok(body.includes('Nur `erlaubt` darf in einen Task; `verboten` und `unbekannt` blockieren.'));
  assert.ok(body.includes('mit dem Hinweis, dass die Änderung ins Marketplace-Repo gehört'));
});

test('harnessRefactoring_Body_FindingsHaveIdRatingFileLineAndUnprovableSection', () => {
  const { body } = skill();

  assert.ok(body.includes('Jeder Befund bekommt eine Kennung `B-01` …, eine Einstufung 🔴, 🟡 oder 🟢 nach Konsequenz, `datei:zeile`, die Konsequenz und einen Vorschlag; nur 🔴 blockt.'));
  assert.ok(body.includes(`steht unter ${OPEN}Nicht belegbar${CLOSE} statt als Befund`));
});

test('harnessRefactoring_Body_PackageFolderFromScriptWrittenUnderFullPath', () => {
  const { body } = skill();

  assert.ok(body.includes(`${SCRIPT} paket '<zielname>'`));
  assert.ok(body.includes('ausgeschrieben, nie über eine Kurzform desselben Pfads'));
});

test('harnessRefactoring_Body_NoReworkOnlyReportAndProtocolAndBranchStepBeforeLine', () => {
  const { body } = skill();

  assert.ok(body.includes('schreibst du nur `BEFUNDE.md` und `PRUEFPROTOKOLL.md`'));
  assert.ok(body.includes('Zusatzpunkte, die der Mensch im Gespräch nennt, werden eigene Tasks.'));
  assert.ok(body.includes('steht der Handgriff `git switch -c <branch>` vor der Linie'));
});

test('harnessRefactoring_Body_AtMostFourSonnetCheckersForOldBlocksAndDryRun', () => {
  const { body } = skill();

  assert.ok(body.includes('höchstens vier, Modell `sonnet`, nur lesend'));
  assert.ok(body.includes('Mindestens einer prüft je Task, ob der Alt-Block wörtlich im Ziel steht'));
  assert.ok(body.includes('mindestens einer spielt den Zielablauf nach dem Umbau trocken durch'));
  assert.ok(body.includes('Subagents entscheiden nichts'));
});

test('harnessRefactoring_Body_FablePlanReviewTwoToEightRoundsElseNotDeliverable', () => {
  const { body } = skill();

  assert.ok(body.includes('Subagent mit Modell `fable`, der lesend nur das Paket und das Ziel sieht'));
  assert.ok(body.includes('mindestens zwei Runden, dann so lange, bis kein 🔴 offen ist, höchstens acht'));
  assert.ok(body.includes(`setzt du den Status auf ${OPEN}nicht abgabefähig${CLOSE}`));
});

test('harnessRefactoring_Body_PackageCheckedUntilValid', () => {
  const { body } = skill();

  assert.ok(body.includes(`${SCRIPT} pruefe '<paketordner>'`));
  assert.ok(body.includes('Jede Zeile `FEHLER` behebst du und prüfst erneut, bis `Paket gültig` kommt.'));
});

test('harnessRefactoring_Body_HandoverOnlyPathAndFivePointsWithMarketplaceHint', () => {
  const { body } = skill();

  assert.ok(body.includes('Im Chat stehen der Paketpfad und höchstens fünf Punkte, darunter der Handgriff'));
  assert.ok(body.includes('Die Startanweisung steht in ihrer Datei, nicht im Chat.'));
  assert.ok(body.includes('beim Scope-Grund mit dem Hinweis aufs Marketplace-Repo'));
});

test('harnessRefactoring_Folder_OnlySkillAndTheThreeReferences', () => {
  assert.deepEqual(fs.readdirSync(SKILL_DIR).sort(), ['SKILL.md', 'references']);
  assert.deepEqual(fs.readdirSync(path.join(SKILL_DIR, 'references')).sort(), REFERENCES);
});

test('harnessRefactoring_Body_NamesEveryReference', () => {
  const { body } = skill();

  for (const name of REFERENCES) assert.ok(body.includes(`references/${name}`), name);
});

test('paketFormat_Headings_EveryHeadingThePackageCheckRequires', () => {
  const text = reference('paket-format.md');

  for (const heading of [...FINDINGS_HEADINGS, ...PLAN_HEADINGS, ...TASK_HEADINGS, ...START_HEADINGS, ...SUMMARY_HEADINGS]) {
    assert.ok(text.includes(`\n${heading}\n`), heading);
  }
});

test('paketFormat_Fields_EveryFieldStatusLineAndBackupSentence', () => {
  const text = reference('paket-format.md');

  for (const label of ['**Ergebnis:**', '**Prüf-Subagents:**', '**Status:**', '**Offen 🔴:**', '**Modell:**', '**Welle:**', '**Befunde:**', '**Branch:**', '**Checkpoint:**', '**Commit:**', '**Backup:**']) {
    assert.ok(text.includes(label), label);
  }
  assert.ok(text.includes(STATUS_LINE));
  assert.ok(text.includes(BACKUP_SENTENCE));
  assert.ok(text.includes('## Plan-Prüfrunde 1'));
  assert.ok(text.includes('mindestens 2, höchstens 8'));
});

test('paketFormat_Files_SixPartsAndNoReworkOnlyTwo', () => {
  const text = reference('paket-format.md');

  for (const name of ['START-PROMPT.md', 'PLAN.md', 'tasks/T-01.md', 'BEFUNDE.md', 'PRUEFPROTOKOLL.md', 'ABSCHLUSS-VORLAGE.md']) assert.ok(text.includes(`\`${name}\``), name);
  assert.ok(text.includes('Dann enthält der Ordner nur `BEFUNDE.md`, `PRUEFPROTOKOLL.md` und die `.gitignore` des Skripts.'));
});

test('pruefkatalog_Parts_FourPartsAToD', () => {
  const text = reference('pruefkatalog.md');

  for (const heading of ['## A – Ebenen', '## B – Kettenkarte', '## C – Soll-Abgleich', '## D – Querschnitt']) assert.ok(text.includes(heading), heading);
});

test('subagentAuftraege_Roles_OldBlockDryRunRecalculateAndPlanReviewer', () => {
  const text = reference('subagent-auftraege.md');

  for (const heading of ['### Alt-Block-Prüfung', '### Probelauf-Prüfung', '### Nachrechnen', '## Plan-Prüfer']) assert.ok(text.includes(heading), heading);
  assert.ok(text.includes('Höchstens vier je Lauf, Modell `sonnet`.'));
  assert.ok(text.includes('Je Runde ein frischer Subagent mit Modell `fable`, lesend, nur Paket und Ziel.'));
});

test('harnessRefactoring_AllFiles_NoTypographicQuotesInReferences', () => {
  for (const name of REFERENCES) assert.doesNotMatch(reference(name), /[\u201C\u201D\u201E]/, name);
});
