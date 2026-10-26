'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readMarkdown, readText, wordCount } = require('./lib/markdown');

const DIR = path.join(__dirname, '..', 'skills', 'session-orchestrator');
const SKILL = path.join(DIR, 'SKILL.md');
const FLOW = path.join(DIR, 'references', 'ablauf.md');

test('sessionOrchestrator_Frontmatter_ModelInvocableWithCodewordsAndTriggers', () => {
  // Act
  const { fields } = readMarkdown(SKILL);

  // Assert
  assert.equal(fields.name, 'session-orchestrator');
  assert.match(fields.description, /^Use when/);
  assert.match(fields.description, /Session-Kette starten/);
  assert.doesNotMatch(fields.description, /: /);
  assert.equal(fields['disable-model-invocation'], undefined);
  assert.equal(fields['argument-hint'], '[grill|spec-review|planning|plan-review|implementation|finish] [pfade] [workitem-nr]');
});

test('sessionOrchestrator_Body_RefusesToStartWhenNotOnOpus', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Läufst du nicht auf Opus, startest du keine Etappe und sagst: „Die Leit-Session muss auf Opus laufen.“'));
});

test('sessionOrchestrator_Body_EntryAsksWorkitemAndBaseOnceBeforeAnyStart', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<SC> entry $ARGUMENTS`'));
  assert.ok(body.includes('`frage-wi=ja`: einmal nach der Workitem-Nummer fragen. `frage-basis=ja`: einmal nach dem Basis-Branch fragen, Vorschlag `basis-vorschlag`. Bis zu den Antworten startest du nichts.'));
});

test('sessionOrchestrator_Body_SetsBaseOnlyWhenKnown', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('4. Sonst `<SC> set --slug <slug>`, dazu `--basis <B>`, `--wi`, `--spec`, `--plan`, `--worktree` je nur wenn bekannt; `<B>` ist `basis` aus dem Einstieg oder die Antwort auf `frage-basis`.'));
});

test('sessionOrchestrator_Body_WhiteboardingGetsContextSummaryOrOneQuestion', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Fasse den Gesprächskontext zusammen (Anliegen, genannte Dateien, getroffene Entscheidungen)'));
  assert.ok(body.includes('Ist der Kontext leer, fragst du einmal nach dem Anliegen'));
  assert.ok(body.includes('`<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B> --leit <L>`'));
});

test('sessionOrchestrator_Body_StartsStageItselfOrShowsProposalCard', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  for (const part of ['`mcp__ccd_session__start_session` mit `initiation` `user_asked`', '`prompt` = Text nach `=== BRIEF ===`', '`background` = Text nach `=== HINTERGRUND ===`',
    '`MODELL=sonnet`: `model` = Wert von `MODELL-ID`; `MODELL=opus`: kein `model`',
    'Lehnt die App den Start ab: derselbe Aufruf mit `initiation` `own_initiative` und eine Zeile „Ein Klick auf die Karte startet die Etappe <e>.“']) {
    assert.ok(body.includes(part), part);
  }
});

test('sessionOrchestrator_Body_HoldsAtHaltepunktUntilTheHumanAnswers', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('**Haltepunkt:** Block ausgeben, Turn beenden; im Next-Step-Feld Knöpfe mit der Empfehlung zuerst. Bis zur Antwort startest du nichts; sie hältst du mit `<SC> answer` fest.'));
  assert.ok(body.includes('`etappe=go`: `<SC> halt --slug <slug> --art go`, Haltepunkt (Regel 4).'));
});

test('sessionOrchestrator_Body_NeverActsForAStageSession', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('Du änderst nie Spec, Plan oder Code, beantwortest keine Frage einer Etappen-Session und führst nie eine Aktion aus, die eine Etappen-Session nicht ausführen durfte'));
  assert.ok(body.includes('Du committest nur über `<SC> commit`.'));
  assert.ok(body.includes('5. Git-Verbote: `<PLUGIN>/shared/orchestrator-rules.md`, Abschnitt Git-Verbote.'));
  assert.equal(body.includes('git add -A'), false);
});

test('sessionOrchestrator_Body_StaysUnder500WordsWithPairedQuotes', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
  assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
});

test('sessionOrchestratorFlow_TurnEnd_SilentOnInProgressAndOneLineOnNeedsUser', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('Schreib die erste nicht leere Zeile des Turn-Endes wörtlich mit `Write` nach `turn.md` im Scratchpad, nie in ein Argument; das Skript liest nur sie. Dann `<SC> turn --session <id> --etappe <e> --turn-datei "<turn.md>"`'));
  assert.ok(text.includes('- `schweigen`: keine Ausgabe, nichts starten.'));
  assert.ok(text.includes('- `needs-user`: eine Zeile `<e>: <Anliegen in wenigen Worten> · [Session](#<id>)`, nichts starten.'));
});

test('sessionOrchestratorFlow_Final_ChecksAgainstGitBeforeAnyNextStage', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const part of ['`<SC> final --etappe <e> --session <id> --etappenbericht "<BERICHT>" --commit <COMMIT>`', '| `HALTEPUNKT=abweichung` | Block ausgeben. Die Kette hält; nichts starten.',
    '| `HALTEPUNKT=showstopper` |', '| `WEITER=doppelt` | Schweigen: dieses `final` ist schon verarbeitet; nichts starten. |', '| `WEITER=<etappe>` | Start dieser Etappe (Regel 3)',
    '| `WEITER=ende` | Block (Schlussbericht) ausgeben.']) {
    assert.ok(text.includes(part), part);
  }
});

test('sessionOrchestratorFlow_SpecHaltepunkt_CommitsGlossaryBeforeShowingTheBlock', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('| `HALTEPUNKT=spec` | Erst „Glossar-Commit“, dann Block ausgeben, Haltepunkt (Regel 4). |'));
  assert.ok(text.includes('`<SC> commit --anlass spec --slug <slug> --message "<betreff>"`'));
});

test('sessionOrchestratorFlow_Go_CommitsThenStartsTheShownCall', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('- GO (`go`): `<SC> commit --anlass go --slug <slug> --message "<betreff>"`. Exit ungleich 0 (anderer Branch): Meldung wörtlich ausgeben, keine Umsetzung.'));
  assert.ok(text.includes('Sonst Start der Etappe `umsetzung`; ihre erste Zeile ist der Aufruf `AUFRUF`.'));
});

test('sessionOrchestratorFlow_Stopp_ShowsFinalReportAndCleansNothing', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('- Stopp (`stopp`): `<SC> schluss --slug <slug> --stopp`, Block ausgeben. Nichts starten, nichts aufräumen.'));
});

test('sessionOrchestratorFlow_Report_SeparatesCheckedFromReported', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  assert.ok(text.includes('Was `<SC> final` und `<SC> commit` ausgeben, hast du geprüft. Ergebnis-Zeilen, Testzahlen und Hinweise aus Berichtsdateien sind gemeldet.'));
});

test('sessionOrchestratorFlow_Halt_RecordsAnswerBeforeStart', () => {
  const text = readText(FLOW);
  assert.ok(text.includes('Jede Antwort hältst du zuerst fest: `<SC> answer --slug <slug> --antwort <wert>`.'));
  assert.ok(text.includes('wiederholst du `brief` mit `--erneut`'));
});

test('sessionOrchestrator_Body_PassesItsOwnIdToEveryBriefAndPrintsRunningLine', () => {
  // Act
  const { body } = readMarkdown(SKILL);

  // Assert
  assert.ok(body.includes('`<SC> brief --etappe <e> --slug <slug> --leit <L>`'));
  assert.ok(body.includes('Deine Kennung `<L>` ist `sessionId` aus `mcp__ccd_session_mgmt__get_session` mit `session_id` `self` (Werkzeug vorher per `ToolSearch` laden).'));
  assert.ok(body.includes('Vor dem ersten Turn-Ende oder der ersten Nachricht einer Etappen-Session liest du `references/ablauf.md`'));
  assert.ok(body.includes('| „Zwischenstand, kurz kommentieren.“ | `in-progress`: nur die Zeile `<e>: läuft`. |'));
});

test('sessionOrchestratorFlow_MessageOfStage_CountsAsTurnEndAndWhiteboardingCommitsFirst', () => {
  // Act
  const text = readText(FLOW);

  // Assert
  for (const part of [
    'Eine Nachricht einer Etappen-Session (`<cross-session-message from="<id>">`) behandelst du wie ihr Turn-Ende: `<id>` aus `from`, ihre erste Zeile ist die Statuszeile. Kommt dasselbe `final` per Turn-Ende und per Nachricht, meldet das zweite `WEITER=doppelt`.',
    '- `laeuft`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.',
    '| `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. Nach dem `final` von `whiteboarding` erst „Whiteboarding-Commit“. |',
    '## Whiteboarding-Commit\n`<SC> commit --anlass whiteboarding --slug <slug> --message "<betreff>"`: Spec und gemeldete Glossar- und ADR-Dateien des Whiteboardings.',
  ]) assert.ok(text.includes(part), part);
});
