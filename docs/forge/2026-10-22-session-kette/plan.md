# Session-Kette über eigene Sessions — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-10-22-session-kette/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** dv-forge bekommt den Skill `session-orchestrator`, der eine Session-Kette mit Etappen in eigenen Sessions führt, dazu den Skill `spec-grilling` und eine additive Ablage-Option für die drei Orchestratoren, `plan-review` und `review-followup`.
**Architektur:** Ein neues Skript `scripts/session-chain.js` mit kleinen Bibliotheken unter `scripts/lib/session-chain-*.js` entscheidet alles Mechanische: Einstieg, Brief, Statuszeile, Prüfung gegen git, Haltepunkte, Commits der Leit-Session, Schlussbericht; Zustand und Ablage liegen je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Der Skill `session-orchestrator` ruft nur dieses Skript und `start_session` auf; jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`. Die bestehenden Skills bekommen `--ablage <etappe>` und verhalten sich ohne die Option wie bisher.
**Tech-Stack:** Node.js 24 (nur Standardbibliothek), `node:test`, Markdown-Skills des Plugins dv-forge
**Spec:** docs/forge/2026-10-22-session-kette/spec.md
**Basis:** a557aaa

## Global Constraints
- Alle Pfade dieses Plans sind relativ zur Checkout-Wurzel `<R>`; das Plugin liegt unter `plugins/forge/`.
- Tests laufen mit `node --test plugins/forge/tests/<datei>.test.js` in `<R>`; es gibt keine Projekt-`CLAUDE.md` und keine Build-, Test- oder Lint-Befehle in der dv-forge-Konfiguration.
- Keine neuen Abhängigkeiten: nur die Node-Standardbibliothek (`node:fs`, `node:path`, `node:child_process`, `node:os`, `node:crypto`, `node:test`, `node:assert/strict`).
- Texte in Skills, Referenzen, Meldungen und Kommentaren sind Deutsch. Bezeichner im Code Englisch wie im Bestand; Ausnahme: die Begriffe der Kette aus Spec und Glossar (Etappe, Haltepunkt, Einstieg, Leit-Session, Ablage, Zustand) und die Felder der Ausgabezeilen, der Zustandsdatei und der Bericht-Daten bleiben Deutsch (etwa `ETAPPEN`, `ETAPPEN_BRIEFS`, `ablageDir`, `etappeReport`, `empfehlung`, `haltepunkt`, `herkunft`), weil sie dieselben Wörter wie Spec und Glossar tragen; „Stufe“ (`STAGES`, `stage`) bleibt dem Ketten-Eintrag von `chain.js` vorbehalten. In bestehenden englischen Modulen (`flow-report.js`, `review-flow.js`, `prepare.js`) heißen neue Bezeichner englisch (`storage`, `storeReport`, `checkedStorage`, `storageOf`).
- Commit-Messages englisch im Conventional-Commits-Stil mit Scope `forge` wie im Repo (`feat(forge): …`).
- Typografische Anführungszeichen „…“ (U+201E, U+201C) bleiben genau so erhalten; mehrere Tests zählen sie paarweise. Nie durch `"` oder U+201D ersetzen.
- Aufruf und Einstieg · Der Skill heißt `session-orchestrator`; Auslöser sind `/dv-forge:session-orchestrator` und Trigger-Wörter wie Session-Kette starten in seiner `description`.
- Aufruf und Einstieg · Das Codewort ist das erste Argument; die gültigen Codewörter sind genau `grill`, `spec-review`, `planning`, `plan-review`, `implementation`, `finish`. Codewort und erste Etappe: ohne Codewort Whiteboarding, `grill <spec>` Grill, `spec-review <spec>` Spec-Review, `planning <spec>` Planning, `plan-review <spec> <plan>` Plan-Review, `implementation <spec> <plan>` GO-Haltepunkt (keine Etappe), `finish <worktree>` Abschluss; nach den Pfaden optional eine Workitem-Nr. Für Spec- und Plan-Nacharbeit gibt es keinen Einstieg.
- Aufruf und Einstieg · Ohne Codewort fasst die Leit-Session den Gesprächskontext zusammen (Anliegen, genannte Dateien, getroffene Entscheidungen); die Zusammenfassung ist die Eingabe der Whiteboarding-Etappe. Ist der Kontext leer, fragt sie einmal nach dem Anliegen und startet bis zur Antwort nichts.
- Aufruf und Einstieg · Ein unbekanntes Codewort startet keine Etappe; die Leit-Session nennt die sechs gültigen Codewörter.
- Aufruf und Einstieg · Beim Einstieg prüft die Leit-Session nur, ob die genannten Dateien bzw. der Worktree existieren; fehlt ein Pfad, startet keine Etappe und sie nennt den Pfad. Den Review-Status früherer Etappen prüft sie nicht.
- Aufruf und Einstieg · Workitem aus dem Kopf der Spec, sonst aus dem Aufruf, sonst aus dem Zustand. Fehlt es in einem Projekt mit Workitem-Nummern, fragt die Leit-Session einmal; in einem Projekt ohne Workitem-Nummern gibt es weder Nummer noch Frage.
- Aufruf und Einstieg · Basis-Branch: Bei jedem Einstieg außer `finish` fragt die Leit-Session einmal danach und schlägt den aktuellen Branch vor. Hält der Zustand zum Slug schon einen, übernimmt sie ihn, nennt ihn und fragt nicht. Bis zu den Antworten startet keine Etappe.
- Etappen · Die Leit-Session läuft auf Opus; auf einem anderen Modell startet sie keine Etappe und nennt den Grund.
- Etappen · Modelle und Skills wörtlich aus der Spec: Whiteboarding Sonnet mit `spec-whiteboarding-with-docs`; Grill Opus mit dem neuen `spec-grilling`; Spec-Review Sonnet mit `spec-review-orchestrator`; Spec-Nacharbeit Opus ohne Skill; Planning Opus mit `plan-orchestrator`; Plan-Review Sonnet mit `plan-review` und `review-followup`; Plan-Nacharbeit Opus ohne Skill; Umsetzung Opus mit `implementation-orchestrator`; Abschluss Sonnet mit `finish-work`, danach Push.
- Etappen · Das Whiteboarding läuft vollständig, wie heute einzeln aufgerufen.
- Etappen · Der Grill prüft die geschriebene Spec nur auf Grenzfälle, Widersprüche und Lücken: vorhandene W-Einträge gelten als beantwortet, die Fragen kommen im Rundenformat des Whiteboardings, jede Änderung legt er als Vorher/Nachher vor und schreibt sie erst nach Bestätigung, neue Entscheidungen werden W-Einträge.
- Etappen · Die Spec-Nacharbeit klärt mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag und ändert die Spec; danach folgt immer eine Spec-Review-Etappe. Die Plan-Nacharbeit tut dasselbe für den Plan; danach folgt immer eine Plan-Review-Etappe.
- Etappen · Die Plan-Review-Etappe schreibt den Plan nicht neu: `plan-review`, danach `review-followup`, solange ein Followup angeboten wird, höchstens zwei Runden.
- Etappen · Die Zahl der Schleifen aus Nacharbeit und Review ist nicht begrenzt; jede Schleife führt über den Haltepunkt.
- Etappen · Jeden Start einer Etappe macht die Leit-Session selbst, wo die App es erlaubt; sonst zeigt sie eine Vorschlagskarte und eine Zeile, dass ein Klick die Etappe startet. Das gilt auch in einem Turn, den das Turn-Ende einer Etappen-Session ausgelöst hat.
- Haltepunkte · Der Spec-Haltepunkt kommt nach jeder Spec-Review-Etappe. Empfehlung nach der Ergebnis-Zeile: ✅ Planning, ⛔ oder ❓ Spec-Nacharbeit, ⚠️ Stopp mit Grund; die Auswahl aus Planning, Spec-Nacharbeit und Stopp bleibt immer. 🟡 blockieren nie, werden aber gelistet.
- Haltepunkte · Der GO-Haltepunkt kommt nach jeder Planning- und Plan-Review-Etappe und beim Einstieg `implementation`. Er zeigt die absoluten Pfade von Spec und Plan, die Ergebnis-Zeile des letzten Plan-Reviews (nur wenn eines vorliegt), die offenen 🟡 und den ausgefüllten Aufruf `/dv-forge:implementation-orchestrator <P> <S> <WI> --base <B>`. Empfehlung: ✅ GO, ⛔ oder ❓ Plan-Nacharbeit, ⚠️ Stopp mit Grund; Auswahl GO, Plan-Nacharbeit, Stopp. Die Umsetzung startet nur nach einem ausdrücklichen GO.
- Haltepunkte · Ein Showstopper der Umsetzung hält die Kette; der Mensch klärt ihn in der Umsetzungs-Session. Showstopper: Ergebnis-Zeile nicht ✅; Prüfergebnis nicht grün, `keine` eingeschlossen; ein Build-, Test- oder Lint-Befehl nicht lauffähig (Umgebungslücke); ein Akzeptanzkriterium ohne beweisenden Test, gleich in welcher Farbe gemeldet. Fehlende Tests an Integrationspunkten sind kein Showstopper, sondern 🟡 in der Liste offener Punkte.
- Haltepunkte · Vor dem Push hält die Abschluss-Session und wartet auf ein Ja des Menschen.
- Haltepunkte · `needs-user` ist ein Haltepunkt: eine Zeile mit Etappe, Anliegen und Link der Session.
- Haltepunkte · An jedem Haltepunkt mit Auswahl ist Stopp möglich: Zustand festschreiben, Schlussbericht mit dem Codewort für den späteren Einstieg, nichts mehr starten, nichts aufräumen; Worktree und Branch bleiben.
- Report-Protokoll · Statuszeile wörtlich aus der Spec als erste Recap-Zeile jedes Turn-Endes: `[<etappe>] STATUS=in-progress|needs-user|final · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad>`.
- Report-Protokoll · Etappen-Sessions melden sich nie per Nachricht an die Leit-Session und starten keine Session.
- Report-Protokoll · Die Berichtsdatei einer Etappe enthält den vollen Bericht, die Entscheidungen des Menschen in der Etappe, die geänderten Glossar- und ADR-Dateien und die Testzahlen.
- Report-Protokoll · Die Leit-Session reagiert nur auf `needs-user` und `final`. Ein Turn-Ende ohne Statuszeile gilt als `in-progress`; nach drei Turn-Enden derselben Etappe in Folge ohne Statuszeile nennt sie das in einer Zeile mit Link.
- Report-Protokoll · Jedes `final` prüft die Leit-Session gegen git, bevor die nächste Etappe startet: der gemeldete Commit existiert und enthält nur die erwarteten Dateien; die Artefakte sind committet, sofern die Etappe committen soll; bei der Umsetzung Branch, Commits seit dem Basis-Branch und Worktree; beim Abschluss Upstream, kein Vorsprung davor und entfernter Worktree. Eine Abweichung hält die Kette und wird genannt.
- Report-Protokoll · Was die Leit-Session selbst geprüft hat und was nur gemeldet wurde, steht in ihren Berichten getrennt.
- Report-Protokoll · Entscheidungen des Menschen aus früheren Etappen stehen im Brief jeder späteren Etappe.
- Briefe · Der Brief beginnt mit dem Slash-Befehl des Skills der Etappe, danach folgen die Ketten-Regeln. Die App führt den Befehl nicht aus (E · Beleg zum Slash-Befehl im Brief); die Etappe ruft den Skill über das Skill-Werkzeug auf, der Hook-Schutz der Review-Dateien fehlt dann. Die Nacharbeiten beginnen mit ihrer Auftragszeile (W · Brief der Nacharbeit).
- Briefe · Feste Bausteine jedes Briefs: Slug (beim Whiteboarding offen, siehe R1 · AC-55), Workitem, Basis-Branch und Pfade von Spec und Plan nur, soweit Zustand oder Aufruf sie liefern (Einstieg `finish` ohne Zustand: nur der Worktree); Commit-Regeln (nur eigene Dateien, auf Pfade beschränkt, nie alle Änderungen stagen, fremde Dateien nicht anfassen, Commit-Konvention des Projekts, Push nur in der Abschluss-Etappe); Report-Protokoll; Start- und Nachrichtenverbot; Fragen ans Ende der Antwort; die Statuszeile ersetzt die Übergabe-Hinweise des Skills; Aufräumpflicht für Hintergrundprozesse vor dem letzten Turn-Ende.
- Git und Commits · Die Spec committet wie heute der Spec-Review-Orchestrator; die Spec-Nacharbeit committet nur die Spec-Datei.
- Git und Commits · Was Whiteboarding und Grill in Glossar und ADRs schreiben, committet die Leit-Session, sobald der Spec-Haltepunkt erreicht ist: nur die in den Berichten genannten Dateien, auf Pfade beschränkt, nach der Commit-Konvention des Projekts.
- Git und Commits · Die Commit-Frage von `plan-review` und `review-followup` bleibt in der Plan-Review-Etappe; der Mensch beantwortet sie dort.
- Git und Commits · Nach dem GO committet die Leit-Session, was von Plan und Spec noch uncommittet ist, auf Pfade beschränkt; ist beides committet, entsteht kein Commit.
- Git und Commits · Vor dem Start der Umsetzung prüft die Leit-Session, dass der aktuelle Branch des Checkouts der Basis-Branch ist; sonst hält sie mit beiden Namen.
- Git und Commits · Spec, Plan, Glossar und ADRs entstehen im aktuellen Checkout ohne Worktree; die Umsetzung läuft am Ort, den `start-work` wählt.
- Git und Commits · Den Push macht die Abschluss-Session nach erfolgreichem finish-work und dem Ja des Menschen; die Leit-Session pusht nie.
- Git und Commits · Freigaben gelten je Session: Eine Aktion, die eine Etappen-Session nicht ausführen durfte, führt die Leit-Session nie stellvertretend aus; der Mensch gibt in der Etappen-Session frei.
- Git und Commits · Die Leit-Session ändert nie Spec, Plan oder Code und committet nur Markdown-Dateien über `session-chain.js commit`, auf Pfade beschränkt.
- Zustand und Schlussbericht · Der Zustand liegt dauerhaft je Slug, gemeinsam für den Haupt-Checkout und alle Worktrees (E · Ort von Zustand und Ablage). Er enthält aktuelle Etappe, Session-Kennungen, Commits, offene 🟡 und 🟢 mit Herkunfts-Etappe, Entscheidungen des Menschen, Workitem und Basis-Branch.
- Zustand und Schlussbericht · Ein Einstieg zu einem Slug mit vorhandenem Zustand übernimmt ihn und nennt ihn vor dem Start der Etappe.
- Zustand und Schlussbericht · Die Leit-Session führt offene 🟡 und 🟢 über alle Etappen; nichts wird verworfen.
- Zustand und Schlussbericht · Der Schlussbericht nennt die Etappen mit Ergebnis, die Commits und die offenen 🟡 und 🟢 mit Herkunft, getrennt nach geprüft und gemeldet; mit Workitem zusätzlich den optionalen Aufruf von `finishing-workitem` mit der Nummer, ohne Workitem nicht.
- Zustand und Schlussbericht · Der ADO-Abschluss gehört nicht zur Kette.
- Bestehende Skills · Alle bestehenden dv-forge-Skills bleiben einzeln nutzbar; ohne `--ablage` sind ihr Verhalten, ihre Ausgabe, Dateien, Berichte und Commits gleich wie heute. Ihre `argument-hint`-Zeilen bleiben unverändert.
- Bestehende Skills · Die Option `--ablage <etappe>` bekommen genau die drei Orchestratoren (`spec-review-orchestrator`, `plan-orchestrator`, `implementation-orchestrator`) und die einzeln laufenden Reviews `plan-review` und `review-followup`. Mit ihr liegen Abschlussbericht und Bericht-Daten an einem festen Ort je Slug, `<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/`, gemeinsam für den Haupt-Checkout und alle Worktrees.
- dv-toolbelt:writing-skills — Die `description` beginnt mit „Use when“, nennt nur Auslöser (Deutsch und Englisch), nie den Ablauf, und enthält kein `: ` (Doppelpunkt mit Leerzeichen).
- dv-toolbelt:writing-skills — Der Rumpf einer SKILL.md bleibt unter 500 Wörtern; Ausführliches steht unter `references/` bzw. `shared/`, der Rumpf nennt Datei und Anlass, ohne `@`-Pfad. Die drei Orchestratoren liegen schon über 500 Wörtern; sie wachsen nur um einen Verweis, ihre Testgrenzen (650, 550, 700) bleiben (Task 15).
- dv-toolbelt:writing-skills — Skripte ruft ein Skill über ihren Interpreter auf (`node "<PLUGIN>/scripts/…"`), nie über den bloßen Pfad.
- dv-toolbelt:writing-skills — Jeder neue Skill wird vor dem Commit mit `node plugins/toolbelt/scripts/validate-skill.js <skill-ordner>` geprüft; Exit ungleich 0 ist ein Fehler.
- dv-toolbelt:writing-skills — Ein Subagent-Szenario rot/grün gibt es nur für `spec-grilling` (W · Szenario-Tests); alle übrigen Skill-Änderungen sichern Text-Tests ab. Das Szenario führt die Hauptsession der Umsetzung aus, nicht der Umsetzer, der keinen SubAgent startet (Task 16).
- dv-craft:craft-unit-testing — Testnamen `<Einheit>_<Situation>_<Erwartung>`, Aufbau Arrange/Act/Assert mit Kommentaren `// Arrange`, `// Act`, `// Assert` (bei Ausnahmen `// Act & Assert`), Act genau eine Zeile.
- dv-craft:craft-unit-testing — Jeder Test prüft ein Verhalten über die öffentliche Schnittstelle des Moduls und ist unabhängig: eigene temporäre Repos und Ordner, kein geteilter Zustand.

---

### Task 1: Zustand und Ablage je Slug

**ACs:** AC-57, AC-58

**Dateien:**
- Modify: `plugins/forge/scripts/lib/chain.js:38-43` · `storeDir`
- Create: `plugins/forge/scripts/lib/session-chain-store.js`
- Create: `plugins/forge/tests/session-chain-store.test.js`
- Create: `plugins/forge/scripts/lib/session-chain-ablage.js`
- Create: `plugins/forge/tests/session-chain-ablage.test.js`

**Interfaces:**
- Consumes: `slugOf(planPath): string` aus `plugins/forge/scripts/plan-tasks.js`; `slugFor(artifactPath, roles): string` und `SLUG: RegExp` aus `plugins/forge/scripts/followup.js`; `toPosix(value): string`, `normalizePath(value): string` aus `plugins/forge/scripts/lib/posix.js`; `storeDir(dir, name = 'chain'): string|null` aus `plugins/forge/scripts/lib/chain.js` (dieser Task)
- Produces: `storeDir(dir, name = 'chain'): string|null` in `plugins/forge/scripts/lib/chain.js` (Ordner `<git-common-dir>/dv-forge/<name>`, Aufrufe ohne `name` wie bisher, jetzt exportiert); Modul `plugins/forge/scripts/lib/session-chain-store.js` mit `SessionChainError` (Klasse, erbt von `Error`); `ETAPPEN: string[]` (`whiteboarding`, `grill`, `spec-review`, `spec-nacharbeit`, `planning`, `plan-review`, `plan-nacharbeit`, `umsetzung`, `abschluss`); `etappeError(etappe): string|null` (`erlaubt: <liste>; nicht <etappe>` oder null, die einzige Prüfung eines Etappen-Namens); `checkedEtappe(etappe): string`; `checkedSlug(slug): string`; `slugOfArtifact({ spec?, plan? }): string`; `chainsRoot(dir): string` (`storeDir(dir, 'session-chain')`); `chainDir(dir, slug): string`; `readJsonFile(file): any|null`; `writeJsonFile(file, value): void`; `readState(dir, slug): object|null`; `writeState(dir, slug, state): object`; `slugByWorktree(dir, worktree): string|null`; Modul `plugins/forge/scripts/lib/session-chain-ablage.js` mit `REVIEW_FILE = 'bericht-review.json'`; `FOLLOWUP_FILE: RegExp`; `ablageDir(dir, slug, etappe): string`; `storeFiles({ dir, slug, etappe, files: string[], fresh?: boolean }): string` (Ordner, Posix); `followupNumbers(target): number[]`; `nextFollowupName(target): string` (`bericht-followup-<n>`)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-store.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { makeRepo, addWorktree, repoWithPlan, samePath } = require('./lib/git-repo');
  const { storeDir } = require('../scripts/lib/chain');
  const {
    SessionChainError, etappeError, checkedEtappe, slugOfArtifact, chainsRoot, readState, writeState, slugByWorktree,
  } = require('../scripts/lib/session-chain-store');

  test('slugOfArtifact_SpecAndPlanInSameFolder_ShareTheFolderName', () => {
    // Arrange
    const { spec, plan } = repoWithPlan();

    // Act
    const slugs = [slugOfArtifact({ spec }), slugOfArtifact({ plan })];

    // Assert
    assert.deepEqual(slugs, ['x', 'x']);
  });

  test('chainsRoot_FromWorktree_IsTheRootOfTheMainCheckout', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    const fromWorktree = chainsRoot(worktree);

    // Assert
    assert.ok(samePath(path.dirname(path.dirname(fromWorktree)), path.join(repo, '.git')));
    assert.equal(fromWorktree.replace(/\\/g, '/').endsWith('/dv-forge/session-chain'), true);
  });

  test('chainsRoot_AnyRepo_IsTheChainStoreDirWithNameSessionChain', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const root = chainsRoot(repo);

    // Assert
    assert.equal(root, storeDir(repo, 'session-chain'));
    assert.equal(path.basename(storeDir(repo)), 'chain');
  });

  test('chainsRoot_OutsideGit_ThrowsSessionChainError', () => {
    // Act & Assert
    assert.throws(() => chainsRoot(path.parse(process.cwd()).root), SessionChainError);
  });

  test('checkedEtappe_UnknownEtappe_ThrowsWithAllowedNames', () => {
    // Act & Assert
    assert.throws(() => checkedEtappe('review'), /^Error: Etappe unbekannt, erlaubt: whiteboarding, grill, spec-review, .+; nicht review$/);
  });

  test('etappeError_KnownAndUnknownName_NullOrMessagePart', () => {
    // Act
    const results = ['planning', 'review'].map(etappeError);

    // Assert
    assert.equal(results[0], null);
    assert.match(results[1], /^erlaubt: whiteboarding, .+, abschluss; nicht review$/);
  });

  test('writeState_FromWorktree_StateIsReadFromTheMainCheckout', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    writeState(worktree, 'x', { basis: 'dev', offen: [] });

    // Assert
    assert.deepEqual(readState(repo, 'x'), { basis: 'dev', offen: [], slug: 'x' });
  });

  test('readState_NoState_ReturnsNull', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.equal(readState(repo, 'x'), null);
  });

  test('slugByWorktree_StateNamesWorktree_ReturnsItsSlug', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    writeState(repo, 'x', { worktree: worktree.replace(/\\/g, '/') });

    // Act & Assert
    assert.equal(slugByWorktree(repo, worktree), 'x');
    assert.equal(slugByWorktree(repo, path.join(repo, 'anders')), null);
  });
  ```
  Datei `plugins/forge/tests/session-chain-ablage.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { makeRepo, addWorktree } = require('./lib/git-repo');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { ablageDir, storeFiles, followupNumbers, nextFollowupName } = require('../scripts/lib/session-chain-ablage');

  function scratchFile(name, text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-')), name);
    fs.writeFileSync(file, text);
    return file;
  }

  test('storeFiles_FromWorktree_FilesAreReadableFromTheMainCheckout', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    const report = scratchFile('abschluss.md', '# Abschlussbericht\n');

    // Act
    storeFiles({ dir: worktree, slug: 'x', etappe: 'umsetzung', files: [report] });

    // Assert
    assert.equal(fs.readFileSync(path.join(ablageDir(repo, 'x', 'umsetzung'), 'abschluss.md'), 'utf8'), '# Abschlussbericht\n');
  });

  test('storeFiles_Fresh_RemovesOlderFilesOfTheEtappe', () => {
    // Arrange
    const repo = makeRepo();
    storeFiles({ dir: repo, slug: 'x', etappe: 'plan-review', files: [scratchFile('bericht-followup-1.json', '{}')] });

    // Act
    storeFiles({ dir: repo, slug: 'x', etappe: 'plan-review', files: [scratchFile('bericht-review.json', '{}')], fresh: true });

    // Assert
    assert.deepEqual(fs.readdirSync(ablageDir(repo, 'x', 'plan-review')), ['bericht-review.json']);
  });

  test('storeFiles_MissingFile_ThrowsAndStoresNothing', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.throws(() => storeFiles({ dir: repo, slug: 'x', etappe: 'planning', files: [path.join(repo, 'fehlt.md')] }), SessionChainError);
    assert.equal(fs.existsSync(ablageDir(repo, 'x', 'planning')), false);
  });

  test('ablageDir_UnknownEtappe_Throws', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.throws(() => ablageDir(repo, 'x', 'review'), /Etappe unbekannt, erlaubt: .+; nicht review/);
  });

  test('nextFollowupName_TwoRoundsStored_ReturnsThirdName', () => {
    // Arrange
    const dir = path.dirname(scratchFile('bericht-followup-1.json', '{}'));
    fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), '{}');

    // Act & Assert
    assert.equal(nextFollowupName(dir), 'bericht-followup-3');
    assert.equal(nextFollowupName(path.join(dir, 'fehlt')), 'bericht-followup-1');
  });

  test('followupNumbers_RoundsOutOfOrder_ReturnsThemAscending', () => {
    // Arrange
    const dir = path.dirname(scratchFile('bericht-followup-10.json', '{}'));
    fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), '{}');
    fs.writeFileSync(path.join(dir, 'bericht-review.json'), '{}');

    // Act
    const numbers = followupNumbers(dir);

    // Assert
    assert.deepEqual(numbers, [2, 10]);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-store.test.js plugins/forge/tests/session-chain-ablage.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-store'` bzw. `'../scripts/lib/session-chain-ablage'`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/chain.js` die Funktion `storeDir` samt Kommentar darüber ersetzen durch:
  ```js
  // Ordner `<git-common-dir>/dv-forge/<name>`, gemeinsam für Haupt-Checkout und Worktrees; null, wenn `dir` in keinem Git-Repo liegt.
  // `name` ist `chain` für die Ketten-Einträge, `session-chain` für Zustand und Ablage einer Session-Kette.
  function storeDir(dir, name = 'chain') {
    const result = spawnSync('git', ['-C', dir, 'rev-parse', '--git-common-dir'], { encoding: 'utf8' });
    if (result.status !== 0) return null;
    return path.join(path.resolve(dir, result.stdout.trim()), 'dv-forge', name);
  }
  ```
  und die Zeile `module.exports` ersetzen durch:
  ```js
  module.exports = { ChainError, STAGES, storeDir, writeEntry, readEntry, readEntryFor, removeByWorktree };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-store.js`:
  ```js
  'use strict';

  // Zustand einer Session-Kette je Slug unter <git-common-dir>/dv-forge/session-chain/<slug>/zustand.json, gemeinsam für den
  // Haupt-Checkout und alle Worktrees eines Repos. Den Ordner löst storeDir aus chain.js auf, wie für die Ketten-Einträge.
  // Die Ablage einer Etappe liegt in session-chain-ablage.js, die Turn-Zähler in session-chain-turn.js.

  const fs = require('node:fs');
  const path = require('node:path');
  const { toPosix, normalizePath } = require('./posix');
  const { storeDir } = require('./chain');
  const { slugOf } = require('../plan-tasks');
  const { slugFor, SLUG } = require('../followup');

  const ETAPPEN = ['whiteboarding', 'grill', 'spec-review', 'spec-nacharbeit', 'planning', 'plan-review', 'plan-nacharbeit', 'umsetzung', 'abschluss'];
  const STATE_FILE = 'zustand.json';

  class SessionChainError extends Error {}

  // Meldungsteil für einen ungültigen Etappen-Namen, sonst null; die einzige Stelle dieser Prüfung.
  function etappeError(etappe) {
    return ETAPPEN.includes(etappe) ? null : `erlaubt: ${ETAPPEN.join(', ')}; nicht ${etappe}`;
  }

  function checkedEtappe(etappe) {
    const error = etappeError(etappe);
    if (error) throw new SessionChainError(`Etappe unbekannt, ${error}`);
    return etappe;
  }

  function checkedSlug(slug) {
    if (!SLUG.test(String(slug ?? ''))) throw new SessionChainError(`Slug ungültig: ${slug}`);
    return slug;
  }

  // Slug wie bei den Reviews: Spec über slugFor, Plan über slugOf; Spec und Plan im selben Ordner teilen ihn.
  function slugOfArtifact({ spec, plan }) {
    if (spec) return checkedSlug(slugFor(path.resolve(spec), ['spec-review']));
    if (plan) return checkedSlug(slugOf(path.resolve(plan)));
    throw new SessionChainError('Slug nicht bestimmbar: weder Spec noch Plan');
  }

  // Wurzel aller Session-Ketten des Repos, in dem `dir` liegt.
  function chainsRoot(dir) {
    const root = storeDir(dir, 'session-chain');
    if (!root) throw new SessionChainError(`Kein Git-Repo: ${toPosix(dir)}`);
    return root;
  }

  function chainDir(dir, slug) {
    return path.join(chainsRoot(dir), checkedSlug(slug));
  }

  function readJsonFile(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return null;
    }
  }

  function writeJsonFile(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
    fs.renameSync(`${file}.tmp`, file);
  }

  // Zustand der Kette oder null, wenn es keinen gibt oder die Datei kein JSON-Objekt ist.
  function readState(dir, slug) {
    const state = readJsonFile(path.join(chainDir(dir, slug), STATE_FILE));
    return state !== null && typeof state === 'object' && !Array.isArray(state) ? state : null;
  }

  function writeState(dir, slug, state) {
    writeJsonFile(path.join(chainDir(dir, slug), STATE_FILE), { ...state, slug });
    return state;
  }

  // Slug der Kette, deren Zustand diesen Worktree nennt; sonst null.
  function slugByWorktree(dir, worktree) {
    const root = chainsRoot(dir);
    if (!fs.existsSync(root)) return null;
    const wanted = normalizePath(worktree);
    const hit = fs.readdirSync(root).filter((name) => SLUG.test(name)).find((name) => {
      const state = readJsonFile(path.join(root, name, STATE_FILE));
      return typeof state?.worktree === 'string' && normalizePath(state.worktree) === wanted;
    });
    return hit ?? null;
  }

  module.exports = {
    SessionChainError, ETAPPEN, etappeError, checkedEtappe, checkedSlug, slugOfArtifact, chainsRoot, chainDir, readJsonFile, writeJsonFile,
    readState, writeState, slugByWorktree,
  };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-ablage.js`:
  ```js
  'use strict';

  // Ablage einer Etappe unter <git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/: Berichte und Bericht-Daten der
  // Orchestratoren und Reviews (`bericht-review`, `bericht-followup-<n>`) und die Berichtsdatei der Etappe.
  // Die Dateinamen stehen nur hier; wer die Ablage liest, nimmt sie von hier.

  const fs = require('node:fs');
  const path = require('node:path');
  const { toPosix } = require('./posix');
  const { SessionChainError, checkedEtappe, chainDir } = require('./session-chain-store');

  const REVIEW_FILE = 'bericht-review.json';
  const FOLLOWUP_FILE = /^bericht-followup-(\d+)\.json$/;

  function ablageDir(dir, slug, etappe) {
    return path.join(chainDir(dir, slug), 'ablage', checkedEtappe(etappe));
  }

  // Kopiert `files` in die Ablage der Etappe; `fresh` leert den Ordner vorher (ein neues Review beginnt die Ablage neu).
  function storeFiles({ dir, slug, etappe, files, fresh = false }) {
    const missing = files.find((file) => !fs.existsSync(file));
    if (missing) throw new SessionChainError(`Datei fehlt: ${toPosix(missing)}`);
    const target = ablageDir(dir, slug, etappe);
    if (fresh) fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    for (const file of files) fs.copyFileSync(file, path.join(target, path.basename(file)));
    return toPosix(target);
  }

  // Nummern der gespeicherten Followup-Runden, aufsteigend.
  function followupNumbers(target) {
    if (!fs.existsSync(target)) return [];
    return fs.readdirSync(target).map((name) => FOLLOWUP_FILE.exec(name)).filter(Boolean).map((match) => Number(match[1])).sort((a, b) => a - b);
  }

  // Nächster freier Name `bericht-followup-<n>` in der Ablage einer Etappe.
  function nextFollowupName(target) {
    const used = followupNumbers(target);
    return `bericht-followup-${used.length === 0 ? 1 : used[used.length - 1] + 1}`;
  }

  module.exports = { REVIEW_FILE, FOLLOWUP_FILE, ablageDir, storeFiles, followupNumbers, nextFollowupName };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-store.test.js plugins/forge/tests/session-chain-ablage.test.js plugins/forge/tests/chain.test.js plugins/forge/tests/chain-cli.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/chain.js plugins/forge/scripts/lib/session-chain-store.js plugins/forge/tests/session-chain-store.test.js plugins/forge/scripts/lib/session-chain-ablage.js plugins/forge/tests/session-chain-ablage.test.js` · `git commit -m "feat(forge): add session chain state and storage per slug"`

---

### Task 2: Offene Punkte einer Etappe

**ACs:** AC-22, AC-41, AC-60

**Dateien:**
- Modify: `plugins/forge/scripts/lib/orchestrator-report.js:54-101` · `mergeGreen`, `module.exports`
- Create: `plugins/forge/scripts/lib/session-chain-points.js`
- Create: `plugins/forge/tests/session-chain-points.test.js`

**Interfaces:**
- Consumes: Bericht-Daten-JSON der Reviews (Felder `open[]`, `green[]` mit `key`, `color`, `title`; `changes[]` mit `key`, `ok`), wie `scripts/lib/flow-report.js` sie schreibt; `REVIEW_FILE`, `followupNumbers(target)` aus `plugins/forge/scripts/lib/session-chain-ablage.js` (Task 1); `readPart(file)`, `keyOf(entry, index, part)`, `mergeReports(…)` aus `plugins/forge/scripts/lib/orchestrator-report.js`
- Produces: `mergeOpenKeepUnchanged(parts: object[]): object[]` in `plugins/forge/scripts/lib/orchestrator-report.js` (offen bis zu einer Änderung mit `ok: true`, 🟢 eingeschlossen; `mergeOpen` und der Abschlussbericht bleiben unverändert), dazu exportiert `readPart`, `keyOf`; Modul `plugins/forge/scripts/lib/session-chain-points.js` mit `ICON: { yellow: '🟡', green: '🟢' }`; `readParts(ablage: string): object[]` (Reihenfolge `bericht-review.json`, dann `bericht-followup-<n>.json` nach `n`); `openPoints(parts: object[], herkunft: string): Array<{ farbe: 'yellow'|'green', titel: string, key: string, herkunft: string }>`; `mergePoints(existing, herkunft, points): Array<…>`; `pointLine(point): string` (`- 🟡 <titel> · <herkunft>`)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-points.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { readParts, openPoints, mergePoints, pointLine } = require('../scripts/lib/session-chain-points');
  const { mergeReports } = require('../scripts/lib/orchestrator-report');

  function yellow(key, title) {
    return { key, color: 'yellow', title };
  }

  test('openPoints_FollowupLeavesChosenYellowUnchanged_YellowStaysOpen', () => {
    // Arrange
    const review = { open: [yellow('a', 'Begriff AK/AC')], green: [], changes: [] };
    const followup = { open: [], green: [], changes: [] };

    // Act
    const points = openPoints([review, followup], 'spec-review');

    // Assert
    assert.deepEqual(points, [{ farbe: 'yellow', titel: 'Begriff AK/AC', key: 'a', herkunft: 'spec-review' }]);
  });

  test('openPoints_FollowupChangesYellowWithOk_YellowIsDone', () => {
    // Arrange
    const review = { open: [yellow('a', 'Begriff'), yellow('b', 'Rest')], green: [] };
    const followup = { open: [], changes: [{ key: 'a', ok: true }, { key: 'b', ok: false }] };

    // Act
    const points = openPoints([review, followup], 'plan-review');

    // Assert
    assert.deepEqual(points.map((point) => point.key), ['b']);
  });

  test('openPoints_RedAndGreen_KeepsOnlyYellowAndGreenYellowFirst', () => {
    // Arrange
    const review = { open: [{ key: 'r', color: 'red', title: 'Rot' }, yellow('y', 'Gelb')], green: [{ key: 'g', color: 'green', title: 'Grün' }] };

    // Act
    const points = openPoints([review], 'plan-review');

    // Assert
    assert.deepEqual(points.map((point) => point.farbe), ['yellow', 'green']);
  });

  test('readParts_ReviewAndTwoFollowups_ReturnsThemInRoundOrder', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-ab-'));
    fs.writeFileSync(path.join(dir, 'bericht-followup-2.json'), JSON.stringify({ n: 2 }));
    fs.writeFileSync(path.join(dir, 'bericht-review.json'), JSON.stringify({ n: 0 }));
    fs.writeFileSync(path.join(dir, 'bericht-followup-1.json'), JSON.stringify({ n: 1 }));

    // Act
    const parts = readParts(dir);

    // Assert
    assert.deepEqual(parts.map((part) => part.n), [0, 1, 2]);
  });

  test('mergePoints_SameEtappeAgain_ReplacesItsPointsAndKeepsOthers', () => {
    // Arrange
    const existing = [{ farbe: 'yellow', titel: 'Alt', key: 'a', herkunft: 'spec-review' }, { farbe: 'green', titel: 'Plan', key: 'p', herkunft: 'plan-review' }];
    const fresh = [{ farbe: 'yellow', titel: 'Neu', key: 'n', herkunft: 'spec-review' }];

    // Act
    const merged = mergePoints(existing, 'spec-review', fresh);

    // Assert
    assert.deepEqual(merged.map((point) => point.titel), ['Plan', 'Neu']);
  });

  test('pointLine_YellowPoint_NamesIconTitleAndOrigin', () => {
    // Act
    const line = pointLine({ farbe: 'yellow', titel: 'Begriff', herkunft: 'spec-review' });

    // Assert
    assert.equal(line, '- 🟡 Begriff · spec-review');
  });

  test('openPoints_SameInputAsMergeReports_DiffersOnlyForUnchangedChosenGroups', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-pt-'));
    const review = path.join(dir, 'bericht-review.json');
    const followup = path.join(dir, 'bericht-followup-1.json');
    fs.writeFileSync(review, JSON.stringify({ open: [{ ...yellow('a', 'Gewählt, nicht geändert'), hasProposal: true }, { ...yellow('b', 'Ohne Vorschlag'), hasProposal: false }], green: [], changes: [] }));
    fs.writeFileSync(followup, JSON.stringify({ open: [], green: [], changes: [] }));

    // Act
    const points = openPoints(readParts(dir), 'spec-review');

    // Assert
    const report = mergeReports({ art: 'spec', reviewFile: review, followupFiles: [followup] });
    assert.deepEqual(report.open.map((entry) => entry.key), ['b']);
    assert.deepEqual(points.map((point) => point.key), ['a', 'b']);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-points.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-points'`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/orchestrator-report.js` direkt vor `function mergeGreen(parts, open) {` einfügen:
  ```js
  // Liste der Leit-Session einer Session-Kette (session-chain-points.js), nicht für den Abschlussbericht: Anders als mergeOpen
  // bleibt ein Eintrag offen, bis eine spätere Runde ihn als Änderung mit `ok: true` meldet. Ein Followup, der eine gewählte
  // Gruppe nicht ändert, lässt sie damit offen. 🟢 (`green`) gehören dazu. mergeOpen und der Abschlussbericht bleiben unverändert.
  function mergeOpenKeepUnchanged(parts) {
    const byKey = new Map();
    parts.forEach((part, round) => {
      for (const change of part?.changes ?? []) {
        if (change?.ok === true && typeof change.key === 'string') change.key.split('|').forEach((key) => byKey.delete(key));
      }
      [...(part?.open ?? []), ...(part?.green ?? [])].forEach((entry, index) => byKey.set(keyOf(entry, index, `open${round}`), entry));
    });
    return [...byKey.values()];
  }
  ```
  und die Zeile `module.exports` ersetzen durch:
  ```js
  module.exports = { mergeReports, mergeOpenKeepUnchanged, readPart, keyOf, REVIEW_OF_ART };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-points.js`:
  ```js
  'use strict';

  // Offene 🟡 und 🟢 einer Etappe aus ihren Bericht-Daten (bericht-review.json, dann bericht-followup-<n>.json) und ihre
  // Führung über alle Etappen. Die Regel steht in orchestrator-report.js (mergeOpenKeepUnchanged): Ein Punkt ist erst erledigt,
  // wenn eine spätere Runde ihn als Änderung mit `ok: true` meldet. Dateinamen der Ablage kommen aus session-chain-ablage.js.

  const path = require('node:path');
  const { mergeOpenKeepUnchanged, readPart, keyOf } = require('./orchestrator-report');
  const { REVIEW_FILE, followupNumbers } = require('./session-chain-ablage');

  const ICON = { yellow: '🟡', green: '🟢' };
  const RANK = { yellow: 0, green: 1 };

  // Ein fehlender oder unlesbarer Teil fällt weg; die Liste der Leit-Session darf am Lesen nicht scheitern.
  function readSafely(file) {
    try {
      return readPart(file);
    } catch {
      return null;
    }
  }

  // Teile in Reihenfolge: Review, dann Followups nach Nummer.
  function readParts(ablage) {
    const names = [REVIEW_FILE, ...followupNumbers(ablage).map((number) => `bericht-followup-${number}.json`)];
    return names.map((name) => readSafely(path.join(ablage, name))).filter(Boolean);
  }

  // `parts`: Bericht-Daten in Reihenfolge; `herkunft`: Etappe der Punkte.
  function openPoints(parts, herkunft) {
    return mergeOpenKeepUnchanged(parts).filter((entry) => Object.hasOwn(ICON, entry?.color))
      .map((entry, index) => ({ farbe: entry.color, titel: entry.title, key: keyOf(entry, index, 'punkt'), herkunft }))
      .sort((a, b) => RANK[a.farbe] - RANK[b.farbe]);
  }

  // Die Punkte einer Etappe ersetzen die ihres früheren Laufs; Punkte anderer Etappen bleiben unverändert stehen.
  function mergePoints(existing, herkunft, points) {
    return [...(existing ?? []).filter((point) => point.herkunft !== herkunft), ...points];
  }

  function pointLine(point) {
    return `- ${ICON[point.farbe]} ${point.titel} · ${point.herkunft}`;
  }

  module.exports = { ICON, readParts, openPoints, mergePoints, pointLine };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-points.test.js plugins/forge/tests/orchestrator-report.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/orchestrator-report.js plugins/forge/scripts/lib/session-chain-points.js plugins/forge/tests/session-chain-points.test.js` · `git commit -m "feat(forge): carry open yellow and green points of a session chain stage"`

---

### Task 3: Empfehlung, nächster Schritt und Showstopper

**ACs:** AC-17, AC-21, AC-23, AC-24, AC-25, AC-27, AC-30, AC-31, AC-37, AC-38, AC-39, AC-40, AC-41

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-chain-decide.js`
- Create: `plugins/forge/tests/session-chain-decide.test.js`

**Interfaces:**
- Consumes: Ergebnis-Zeilen der Berichte (`**Ergebnis:** ✅ …`, `⛔ …`, `❓ …`, `⚠️ …`) aus `scripts/lib/report-text.js`
- Produces: Modul `plugins/forge/scripts/lib/session-chain-decide.js` mit `resultOf(text): string|null`; `verdictOf(result): 'bereit'|'blockiert'|'fragen'|'unvollstaendig'|'keins'`; `recommendation(art: 'spec'|'go', result: string|null): { empfehlung: 'Planning'|'Spec-Nacharbeit'|'GO'|'Plan-Nacharbeit'|'Stopp', grund: string|null }`; `showstoppers({ result, pruefung, luecken?: string[], acOhneTest?: string[] }): string[]`; `nextStep(etappe, report?): { start: string } | { halt: 'spec'|'go' } | { halt: 'showstopper', gruende: string[] } | { ende: true }`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-decide.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { resultOf, recommendation, showstoppers, nextStep } = require('../scripts/lib/session-chain-decide');

  const READY_REPORT = { result: '✅ Bereit zum Abschließen', pruefung: 'gruen', luecken: [], acOhneTest: [] };

  test('resultOf_ReportWithResultLine_ReturnsTextAfterLabel', () => {
    // Act
    const result = resultOf('# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen · 3 kleine Hinweise offen\nAblauf: …');

    // Assert
    assert.equal(result, '✅ Bereit zum Planen · 3 kleine Hinweise offen');
  });

  test('resultOf_NoResultLine_ReturnsNull', () => {
    // Act & Assert
    assert.equal(resultOf('# Bericht\nnichts'), null);
  });

  test('recommendation_SpecReadyWithHints_RecommendsPlanning', () => {
    // Act
    const result = recommendation('spec', '✅ Bereit zum Planen · 3 kleine Hinweise offen');

    // Assert
    assert.deepEqual(result, { empfehlung: 'Planning', grund: null });
  });

  test('recommendation_SpecBlockedOrQuestions_RecommendsSpecNacharbeit', () => {
    // Act
    const results = ['⛔ Noch nicht bereit · 1 Hindernis offen', '❓ 2 Fragen offen'].map((line) => recommendation('spec', line).empfehlung);

    // Assert
    assert.deepEqual(results, ['Spec-Nacharbeit', 'Spec-Nacharbeit']);
  });

  test('recommendation_SpecIncomplete_RecommendsStoppWithReason', () => {
    // Act
    const result = recommendation('spec', '⚠️ Unvollständig · Nachprüfung ausgefallen');

    // Assert
    assert.deepEqual(result, { empfehlung: 'Stopp', grund: 'Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.' });
  });

  test('recommendation_GoAfterBlockedPlanReview_RecommendsPlanNacharbeit', () => {
    // Act
    const result = recommendation('go', '⛔ Noch nicht bereit · 2 Hindernisse offen');

    // Assert
    assert.equal(result.empfehlung, 'Plan-Nacharbeit');
  });

  test('recommendation_GoWithoutPlanReview_RecommendsGo', () => {
    // Act
    const result = recommendation('go', null);

    // Assert
    assert.deepEqual(result, { empfehlung: 'GO', grund: null });
  });

  test('nextStep_StagesBeforeReview_StartTheNextStage', () => {
    // Act
    const steps = ['whiteboarding', 'grill', 'spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => nextStep(etappe).start);

    // Assert
    assert.deepEqual(steps, ['grill', 'spec-review', 'spec-review', 'plan-review']);
  });

  test('nextStep_ReviewStages_HoldAtTheirHaltepunkt', () => {
    // Act
    const halts = ['spec-review', 'planning', 'plan-review'].map((etappe) => nextStep(etappe).halt);

    // Assert
    assert.deepEqual(halts, ['spec', 'go', 'go']);
  });

  test('nextStep_UmsetzungReadyGreenAllAcTested_StartsAbschluss', () => {
    // Act & Assert
    assert.deepEqual(nextStep('umsetzung', READY_REPORT), { start: 'abschluss' });
    assert.deepEqual(nextStep('abschluss'), { ende: true });
  });

  test('nextStep_UmsetzungCheckRedOrNone_IsShowstopper', () => {
    // Act
    const [red, none] = ['rot', 'keine'].map((pruefung) => nextStep('umsetzung', { ...READY_REPORT, pruefung }));

    // Assert
    assert.deepEqual(red, { halt: 'showstopper', gruende: ['Prüfergebnis ist nicht grün: rot'] });
    assert.deepEqual(none.gruende, ['Prüfergebnis ist nicht grün: keine']);
  });

  test('showstoppers_LintCommandNotRunnable_NamesEnvironmentGapWithCommand', () => {
    // Act
    const gruende = showstoppers({ ...READY_REPORT, luecken: ['npm run lint'] });

    // Assert
    assert.deepEqual(gruende, ['Umgebungslücke: npm run lint ist nicht lauffähig']);
  });

  test('showstoppers_ReadyButAcWithoutTest_NamesTheAc', () => {
    // Act
    const gruende = showstoppers({ ...READY_REPORT, acOhneTest: ['AC-05'] });

    // Assert
    assert.deepEqual(gruende, ['AC-05 hat keinen beweisenden Test']);
  });

  test('showstoppers_ResultNotReady_IsShowstopper', () => {
    // Act
    const gruende = showstoppers({ ...READY_REPORT, result: '⛔ Noch nicht bereit · 1 Hindernis offen' });

    // Assert
    assert.deepEqual(gruende, ['Ergebnis ist nicht ✅: ⛔ Noch nicht bereit · 1 Hindernis offen']);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-decide.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-decide'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/session-chain-decide.js`:
  ```js
  'use strict';

  // Entscheidungen der Leit-Session als reine Funktionen: Ergebnis-Zeile lesen, Empfehlung am Haltepunkt, nächster Schritt
  // nach dem `final` einer Etappe und Showstopper der Umsetzung.

  const RESULT = /^\*\*Ergebnis:\*\*\s*(.+?)\s*$/m;
  const VERDICTS = [['✅', 'bereit'], ['⛔', 'blockiert'], ['❓', 'fragen'], ['⚠️', 'unvollstaendig']];
  const NEXT = {
    whiteboarding: { start: 'grill' },
    grill: { start: 'spec-review' },
    'spec-nacharbeit': { start: 'spec-review' },
    'spec-review': { halt: 'spec' },
    planning: { halt: 'go' },
    'plan-nacharbeit': { start: 'plan-review' },
    'plan-review': { halt: 'go' },
    umsetzung: { start: 'abschluss' },
    abschluss: { ende: true },
  };
  const CHOICES = {
    spec: { bereit: 'Planning', nacharbeit: 'Spec-Nacharbeit' },
    go: { bereit: 'GO', nacharbeit: 'Plan-Nacharbeit' },
  };

  // Text nach `**Ergebnis:**` (erste solche Zeile) oder null.
  function resultOf(text) {
    return RESULT.exec(String(text ?? ''))?.[1] ?? null;
  }

  function verdictOf(result) {
    if (!result) return 'keins';
    return VERDICTS.find(([icon]) => result.startsWith(icon))?.[1] ?? 'keins';
  }

  // `art`: spec | go. Ohne Ergebnis-Zeile am GO-Haltepunkt (Einstieg `implementation` ohne Plan-Review) gilt GO.
  // Liefert die Empfehlung und, nur bei Stopp, den Grund.
  function recommendation(art, result) {
    const verdict = verdictOf(result);
    if (verdict === 'bereit' || (art === 'go' && result === null)) return { empfehlung: CHOICES[art].bereit, grund: null };
    if (verdict === 'blockiert' || verdict === 'fragen') return { empfehlung: CHOICES[art].nacharbeit, grund: null };
    return { empfehlung: 'Stopp', grund: result ? `Das Review ist ${result}.` : 'Das Review hat keine Ergebnis-Zeile geliefert.' };
  }

  // Gründe, aus denen die Umsetzung hält; leer = kein Showstopper. Ein Integrationspunkt ohne Test ist kein Grund.
  function showstoppers({ result, pruefung, luecken = [], acOhneTest = [] }) {
    return [
      ...(verdictOf(result) === 'bereit' ? [] : [`Ergebnis ist nicht ✅: ${result ?? 'keine Ergebnis-Zeile'}`]),
      ...(pruefung === 'gruen' ? [] : [`Prüfergebnis ist nicht grün: ${pruefung ?? 'keine'}`]),
      ...luecken.map((befehl) => `Umgebungslücke: ${befehl} ist nicht lauffähig`),
      ...acOhneTest.map((ac) => `${ac} hat keinen beweisenden Test`),
    ];
  }

  // Nächster Schritt nach dem `final` der Etappe: { start } | { halt } | { ende }; Showstopper halten die Umsetzung.
  function nextStep(etappe, report = {}) {
    if (etappe === 'umsetzung') {
      const gruende = showstoppers(report);
      if (gruende.length > 0) return { halt: 'showstopper', gruende };
    }
    return NEXT[etappe];
  }

  module.exports = { resultOf, verdictOf, recommendation, showstoppers, nextStep };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-decide.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-decide.js plugins/forge/tests/session-chain-decide.test.js` · `git commit -m "feat(forge): decide recommendation, next stage and showstoppers of a session chain"`

---

### Task 4: Statuszeile und Turn-Enden

**ACs:** AC-46, AC-47, AC-48

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-chain-turn.js`
- Create: `plugins/forge/tests/session-chain-turn.test.js`

**Interfaces:**
- Consumes: `SessionChainError`, `chainsRoot`, `readJsonFile`, `writeJsonFile` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1)
- Produces: Modul `plugins/forge/scripts/lib/session-chain-turn.js` mit `parseStatusLine(text): { etappe, status, rot: number, gelb: number, commit, bericht } | null` (erste nicht leere Zeile; `COMMIT` nur `none` oder 4 bis 40 Hex-Zeichen, `BERICHT` nur `none` oder ein Pfad ohne `"`, `'`, Backtick, `$`, `;`, `&`, `|`, `<`, `>`; sonst null); `turnAction(count: number, parsed): { aktion: 'schweigen'|'hinweis'|'needs-user'|'final', ohneStatus: number }`; `readTurns(dir, session): number` und `writeTurns(dir, session, ohneStatus: number): void` (Datei `turns/<session>.json` in `chainsRoot(dir)`, Kennung nur `[A-Za-z0-9_-]`); `HINT_AFTER = 3`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-turn.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { makeRepo, addWorktree } = require('./lib/git-repo');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { parseStatusLine, turnAction, readTurns, writeTurns } = require('../scripts/lib/session-chain-turn');

  const FINAL = '[planning] STATUS=final · ROT=0 · GELB=2 · COMMIT=none · BERICHT=C:/x/ablage/planning/bericht.md\nPlan steht unter …';

  test('parseStatusLine_FirstLineIsStatusLine_ReturnsAllFields', () => {
    // Act
    const parsed = parseStatusLine(FINAL);

    // Assert
    assert.deepEqual(parsed, { etappe: 'planning', status: 'final', rot: 0, gelb: 2, commit: 'none', bericht: 'C:/x/ablage/planning/bericht.md' });
  });

  test('parseStatusLine_StatusLineNotFirst_ReturnsNull', () => {
    // Act & Assert
    assert.equal(parseStatusLine(`Zwischenstand\n${FINAL}`), null);
    assert.equal(parseStatusLine(''), null);
  });

  test('parseStatusLine_CommitWithShellSyntax_ReturnsNull', () => {
    // Act
    const parsed = ['COMMIT=$(rm -rf x)', 'COMMIT=--output=x'].map((commit) => parseStatusLine(`[grill] STATUS=final · ROT=0 · GELB=0 · ${commit} · BERICHT=none`));

    // Assert
    assert.deepEqual(parsed, [null, null]);
  });

  test('parseStatusLine_BerichtWithQuoteOrSemicolon_ReturnsNull', () => {
    // Act
    const parsed = ['C:/x.md"; rm -rf x', 'C:/x.md;whoami', 'C:/x.md`id`'].map((bericht) => parseStatusLine(`[grill] STATUS=final · ROT=0 · GELB=0 · COMMIT=none · BERICHT=${bericht}`));

    // Assert
    assert.deepEqual(parsed, [null, null, null]);
  });

  test('parseStatusLine_BerichtPathWithSpace_IsKept', () => {
    // Act
    const parsed = parseStatusLine('[umsetzung] STATUS=final · ROT=0 · GELB=0 · COMMIT=abc1234 · BERICHT=C:/Users/Max Muster/bericht.md');

    // Assert
    assert.equal(parsed.commit, 'abc1234');
    assert.equal(parsed.bericht, 'C:/Users/Max Muster/bericht.md');
  });

  test('turnAction_RejectedStatusLine_CountsAsTurnEndWithoutStatus', () => {
    // Act
    const result = turnAction(0, parseStatusLine('[grill] STATUS=final · ROT=0 · GELB=0 · COMMIT=$(id) · BERICHT=none'));

    // Assert
    assert.deepEqual(result, { aktion: 'schweigen', ohneStatus: 1 });
  });

  test('turnAction_InProgress_StaysSilentAndResetsCount', () => {
    // Act
    const result = turnAction(2, parseStatusLine('[grill] STATUS=in-progress · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none'));

    // Assert
    assert.deepEqual(result, { aktion: 'schweigen', ohneStatus: 0 });
  });

  test('turnAction_NeedsUserAndFinal_ReturnTheirAction', () => {
    // Act
    const actions = ['needs-user', 'final'].map((status) => turnAction(0, parseStatusLine(`[grill] STATUS=${status} · ROT=0 · GELB=0 · COMMIT=none · BERICHT=none`)).aktion);

    // Assert
    assert.deepEqual(actions, ['needs-user', 'final']);
  });

  test('turnAction_TwoTurnEndsWithoutStatus_StaysSilent', () => {
    // Arrange
    const first = turnAction(0, null);

    // Act
    const second = turnAction(first.ohneStatus, null);

    // Assert
    assert.deepEqual([first.aktion, second.aktion], ['schweigen', 'schweigen']);
  });

  test('turnAction_ThirdTurnEndWithoutStatus_GivesHint', () => {
    // Act
    const third = turnAction(2, null);

    // Assert
    assert.deepEqual(third, { aktion: 'hinweis', ohneStatus: 3 });
  });

  test('writeTurns_CountPerSession_ReadBackFromWorktree', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    writeTurns(repo, 'local_abc-1', 2);

    // Assert
    assert.equal(readTurns(worktree, 'local_abc-1'), 2);
    assert.equal(readTurns(repo, 'local_neu'), 0);
    assert.throws(() => readTurns(repo, '../x'), SessionChainError);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-turn.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-turn'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/session-chain-turn.js`:
  ```js
  'use strict';

  // Turn-Ende einer Etappen-Session: Statuszeile lesen und entscheiden, ob die Leit-Session schweigt oder handelt.
  // Ein Turn-Ende ohne Statuszeile gilt als `in-progress`; erst das dritte in Folge bekommt einen Hinweis.
  // COMMIT und BERICHT landen in Befehlen der Leit-Session: COMMIT ist nur `none` oder ein Hash, BERICHT nur `none` oder ein
  // Pfad ohne Shell-Zeichen. Eine Zeile mit anderen Werten gilt als keine Statuszeile.
  // Den Zähler je Etappen-Session hält turns/<session>.json in der Wurzel der Session-Ketten, unabhängig vom Slug.

  const path = require('node:path');
  const { SessionChainError, chainsRoot, readJsonFile, writeJsonFile } = require('./session-chain-store');

  const STATUS_LINE = /^\[([a-z-]+)\] STATUS=(in-progress|needs-user|final) · ROT=(\d+) · GELB=(\d+) · COMMIT=(none|[0-9a-f]{4,40}) · BERICHT=(none|[^"'`$;&|<>\r\n]+?)\s*$/;
  const HINT_AFTER = 3;
  const SESSION_ID = /^[A-Za-z0-9_-]+$/;

  // Erste nicht leere Zeile des Turn-Endes als Statuszeile oder null.
  function parseStatusLine(text) {
    const first = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).find((line) => line !== '');
    const match = STATUS_LINE.exec(first ?? '');
    if (!match) return null;
    const [, etappe, status, rot, gelb, commit, bericht] = match;
    return { etappe, status, rot: Number(rot), gelb: Number(gelb), commit, bericht };
  }

  // `count`: Turn-Enden ohne Statuszeile in Folge vor diesem. Rückgabe: Aktion und neuer Zähler.
  function turnAction(count, parsed) {
    if (!parsed) {
      const next = count + 1;
      return { aktion: next === HINT_AFTER ? 'hinweis' : 'schweigen', ohneStatus: next };
    }
    const aktion = { 'in-progress': 'schweigen', 'needs-user': 'needs-user', final: 'final' }[parsed.status];
    return { aktion, ohneStatus: 0 };
  }

  function turnsFile(dir, session) {
    if (!SESSION_ID.test(String(session ?? ''))) throw new SessionChainError(`Session-Kennung ungültig: ${session}`);
    return path.join(chainsRoot(dir), 'turns', `${session}.json`);
  }

  // Zahl der Turn-Enden dieser Etappen-Session in Folge ohne Statuszeile.
  function readTurns(dir, session) {
    return readJsonFile(turnsFile(dir, session))?.ohneStatus ?? 0;
  }

  function writeTurns(dir, session, ohneStatus) {
    writeJsonFile(turnsFile(dir, session), { ohneStatus });
  }

  module.exports = { parseStatusLine, turnAction, readTurns, writeTurns, HINT_AFTER };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-turn.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-turn.js plugins/forge/tests/session-chain-turn.test.js` · `git commit -m "feat(forge): read the status line of a stage session turn end"`

---

### Task 5: Prüfung eines `final` gegen git

**ACs:** AC-44, AC-49, AC-50

**Dateien:**
- Modify: `plugins/forge/scripts/lib/posix.js:1-15` · `normalizePath`
- Test: `plugins/forge/tests/posix.test.js` · `normalizePath_SamePathInBothSpellings_ReturnsSameKey`
- Create: `plugins/forge/scripts/lib/session-chain-git.js`
- Create: `plugins/forge/tests/session-chain-git.test.js`
- Create: `plugins/forge/scripts/lib/session-chain-check.js`
- Create: `plugins/forge/tests/session-chain-check.test.js`

**Interfaces:**
- Consumes: `toPosix`, `normalizePath` aus `plugins/forge/scripts/lib/posix.js`; `SessionChainError` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1)
- Produces: `realPath(value): string` in `plugins/forge/scripts/lib/posix.js` (echter Pfad ohne 8.3-Kurznamen; fehlt der Pfad, der echte Pfad des nächsten bestehenden Elternordners mit dem fehlenden Rest); Modul `plugins/forge/scripts/lib/session-chain-git.js` mit `git(repo, args): { ok, out, err }`; `gitOrThrow(repo, args): string` (Exit ungleich 0: `SessionChainError` `git <args>: <stderr>`); `toplevel(dir): string`; `isDirty(repo, file): boolean`; `sameDir(a, b): boolean`; `worktreeListed(repo, worktree): boolean`; `relative(repo, file): string` (Posix, relativ zur Checkout-Wurzel); Modul `plugins/forge/scripts/lib/session-chain-check.js` mit `checkFinal(etappe, repo, { commit, spec?, plan?, dateien?: string[], branch?, basis?, worktree? }): { geprueft: string[], abweichungen: string[] }`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/posix.test.js` vollständig:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { normalizePath, realPath } = require('../scripts/lib/posix');

  test('normalizePath_RelativePathWithBackslashes_AbsoluteWithSlashesLowercaseOnWindows', () => {
    // Act
    const result = normalizePath('docs\\Forge\\x');

    // Assert
    const expected = path.resolve('docs', 'Forge', 'x').replace(/\\/g, '/');
    assert.equal(result, process.platform === 'win32' ? expected.toLowerCase() : expected);
  });

  test('normalizePath_SamePathInBothSpellings_ReturnsSameKey', () => {
    // Arrange
    const dir = path.join(path.resolve('.'), 'A', 'b');

    // Act & Assert
    assert.equal(normalizePath(dir), normalizePath(dir.split(path.sep).join('/')));
  });

  test('realPath_ExistingDirectory_EqualsTheRealPathOfTheSystem', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-real-'));

    // Act
    const result = realPath(dir);

    // Assert
    assert.equal(result, fs.realpathSync.native(dir));
  });

  test('realPath_MissingPath_IsTheRealParentWithTheMissingRest', () => {
    // Arrange
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-real-'));

    // Act
    const result = realPath(path.join(dir, 'gibt', 'es', 'nicht'));

    // Assert
    assert.equal(result, path.join(fs.realpathSync.native(dir), 'gibt', 'es', 'nicht'));
  });
  ```
  Datei `plugins/forge/tests/session-chain-check.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { checkFinal } = require('../scripts/lib/session-chain-check');

  // Repo mit Remote `origin` (bare) und dem Branch `feature/x`, der einen Commit vor `main` liegt.
  function repoWithRemoteBranch() {
    const repo = makeRepo();
    const remote = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-remote-'));
    git(remote, 'init', '--quiet', '--bare');
    git(repo, 'remote', 'add', 'origin', remote);
    git(repo, 'switch', '--quiet', '-c', 'feature/x');
    commitFile(repo, 'src/a.js', 'a\n', 'feat: a');
    git(repo, 'switch', '--quiet', 'main');
    return repo;
  }

  test('checkFinal_SpecReviewCommitWithOnlyTheSpec_IsChecked', () => {
    // Arrange
    const repo = makeRepo();
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');

    // Act
    const result = checkFinal('spec-review', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md') });

    // Assert
    assert.deepEqual(result.abweichungen, []);
    assert.deepEqual(result.geprueft, [`Commit ${commit}: docs/forge/x/spec.md`, 'docs/forge/x/spec.md ist committet']);
  });

  test('checkFinal_SpecReviewWithoutCommitAndUncommittedSpec_NamesTheSpec', () => {
    // Arrange
    const repo = makeRepo();
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Spec\n');

    // Act
    const result = checkFinal('spec-review', repo, { commit: 'none', spec });

    // Assert
    assert.deepEqual(result.abweichungen, ['docs/forge/x/spec.md ist uncommittet']);
  });

  test('checkFinal_CommitWithForeignFile_NamesTheFile', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    fs.writeFileSync(path.join(repo, 'fremd.txt'), 'x\n');
    fs.appendFileSync(plan, 'mehr\n');
    git(repo, 'add', 'fremd.txt', 'docs/forge/x/plan.md');
    git(repo, 'commit', '--quiet', '-m', 'docs: plan');
    const commit = git(repo, 'rev-parse', 'HEAD');

    // Act
    const result = checkFinal('plan-review', repo, { commit, spec, plan });

    // Assert
    assert.deepEqual(result.abweichungen, [`Commit ${commit} enthält fremd.txt außerhalb der erwarteten Dateien`]);
  });

  test('checkFinal_CommitDoesNotExist_IsDeviation', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();

    // Act
    const result = checkFinal('planning', repo, { commit: 'deadbeef', spec, plan });

    // Assert
    assert.deepEqual(result.abweichungen, ['Commit deadbeef existiert nicht']);
  });

  test('checkFinal_GrillCommitWithGlossary_AllowsReportedGlossaryFile', () => {
    // Arrange
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: spec');

    // Act
    const result = checkFinal('grill', repo, { commit, spec: path.join(repo, 'docs/forge/x/spec.md'), dateien: [path.join(repo, 'CONTEXT.md')] });

    // Assert
    assert.deepEqual(result.abweichungen, []);
  });

  test('checkFinal_UmsetzungBranchWithCommitsAndWorktree_IsChecked', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');

    // Act
    const result = checkFinal('umsetzung', repo, { commit: git(worktree, 'rev-parse', 'HEAD'), branch: 'feature/x', basis: 'main', worktree });

    // Assert
    assert.deepEqual(result.abweichungen, []);
    assert.ok(result.geprueft.includes('Branch feature/x: 1 Commits seit main'));
  });

  test('checkFinal_UmsetzungBranchWithoutCommits_IsDeviation', () => {
    // Arrange
    const repo = makeRepo();
    git(repo, 'branch', 'feature/x');

    // Act
    const result = checkFinal('umsetzung', repo, { commit: 'none', branch: 'feature/x', basis: 'main' });

    // Assert
    assert.deepEqual(result.abweichungen, ['Branch feature/x hat keine Commits seit main']);
  });

  test('checkFinal_AbschlussPushedAndWorktreeRemoved_IsChecked', () => {
    // Arrange
    const repo = repoWithRemoteBranch();
    git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
    const removed = path.join(os.tmpdir(), 'dv-forge-entfernt-gibt-es-nicht');

    // Act
    const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree: removed });

    // Assert
    assert.deepEqual(result.abweichungen, []);
    assert.equal(result.geprueft.length, 3);
  });

  test('checkFinal_AbschlussWithoutUpstream_IsDeviation', () => {
    // Arrange
    const repo = repoWithRemoteBranch();

    // Act
    const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x' });

    // Assert
    assert.deepEqual(result.abweichungen, ['Branch feature/x hat keinen Upstream']);
  });

  test('checkFinal_AbschlussAheadOfUpstreamAndWorktreeLeft_NamesBoth', () => {
    // Arrange
    const repo = repoWithRemoteBranch();
    git(repo, 'push', '--quiet', '-u', 'origin', 'feature/x');
    const worktree = addWorktree(repo, 'feature/y');
    git(repo, 'switch', '--quiet', 'feature/x');
    commitFile(repo, 'src/b.js', 'b\n', 'feat: b');

    // Act
    const result = checkFinal('abschluss', repo, { commit: 'none', branch: 'feature/x', worktree });

    // Assert
    assert.equal(result.abweichungen.length, 2);
    assert.match(result.abweichungen[0], /hat 1 Commits Vorsprung vor origin\/feature\/x/);
    assert.match(result.abweichungen[1], /besteht noch$/);
  });
  ```
  Datei `plugins/forge/tests/session-chain-git.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { makeRepo, addWorktree, samePath } = require('./lib/git-repo');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { git, gitOrThrow, toplevel, isDirty, sameDir, worktreeListed, relative } = require('../scripts/lib/session-chain-git');

  test('git_FailingCommand_ReturnsNotOkWithoutThrowing', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = git(repo, ['rev-parse', '--verify', '--quiet', 'refs/heads/gibt-es-nicht']);

    // Assert
    assert.equal(result.ok, false);
  });

  test('gitOrThrow_FailingCommand_ThrowsSessionChainErrorWithCommand', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.throws(() => gitOrThrow(repo, ['switch', 'gibt-es-nicht']), (error) => error instanceof SessionChainError && error.message.startsWith('git switch gibt-es-nicht: '));
  });

  test('toplevel_SubFolder_ReturnsTheCheckoutRoot', () => {
    // Arrange
    const repo = makeRepo();
    fs.mkdirSync(path.join(repo, 'docs'));

    // Act
    const root = toplevel(path.join(repo, 'docs'));

    // Assert
    assert.ok(samePath(root, repo));
  });

  test('isDirty_UntrackedAndCommittedFile_TrueAndFalse', () => {
    // Arrange
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo, 'neu.md'), 'x\n');

    // Act
    const states = ['neu.md', 'README.md'].map((file) => isDirty(repo, file));

    // Assert
    assert.deepEqual(states, [true, false]);
  });

  test('worktreeListed_AddedWorktreeAndOtherFolder_TrueAndFalse', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    const listed = [worktree, path.join(repo, 'anders')].map((dir) => worktreeListed(repo, dir));

    // Assert
    assert.deepEqual(listed, [true, false]);
  });

  test('relativeAndSameDir_PathsOfTheSameCheckout_ComparePerRealPath', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const rel = relative(repo, path.join(repo, 'docs', 'x', 'spec.md'));

    // Assert
    assert.equal(rel, 'docs/x/spec.md');
    assert.ok(sameDir(repo, `${repo}${path.sep}`));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/posix.test.js plugins/forge/tests/session-chain-git.test.js plugins/forge/tests/session-chain-check.test.js` — erwartet: FAIL `realPath_ExistingDirectory_EqualsTheRealPathOfTheSystem` (`realPath is not a function`), FAIL (`Cannot find module '../scripts/lib/session-chain-git'`) und FAIL (`Cannot find module '../scripts/lib/session-chain-check'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/posix.js` vollständig:
  ```js
  'use strict';

  const fs = require('node:fs');
  const path = require('node:path');

  function toPosix(value) {
    return String(value).replace(/\\/g, '/');
  }

  // Vergleichsschlüssel für Pfade: absolut, mit `/`, auf Windows kleingeschrieben; ohne Symlink-Auflösung.
  function normalizePath(value) {
    const resolved = toPosix(path.resolve(value));
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  }

  // Echter Pfad (Windows: ohne 8.3-Kurznamen), damit Pfade aus git und aus Aufrufen vergleichbar sind. Fehlt der Pfad, gilt der
  // echte Pfad des nächsten bestehenden Elternordners mit dem fehlenden Rest.
  function realPath(value) {
    let existing = path.resolve(value);
    const missing = [];
    while (!fs.existsSync(existing)) {
      const parent = path.dirname(existing);
      if (parent === existing) return path.resolve(value);
      missing.unshift(path.basename(existing));
      existing = parent;
    }
    return path.join(fs.realpathSync.native(existing), ...missing);
  }

  module.exports = { toPosix, normalizePath, realPath };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-git.js`:
  ```js
  'use strict';

  // Git-Aufrufe der Session-Kette an einer Stelle: Aufruf mit und ohne Abbruch, Checkout-Wurzel, Änderungen an einer Datei,
  // Worktree-Liste und Pfadvergleich. Pfade gehen über realPath, damit Windows-Kurznamen und git-Ausgaben vergleichbar sind.

  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { toPosix, normalizePath, realPath } = require('./posix');
  const { SessionChainError } = require('./session-chain-store');

  // Ergebnis eines Aufrufs; `ok` false bei Exit ungleich 0.
  function git(repo, args) {
    const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' });
    return { ok: result.status === 0, out: (result.stdout ?? '').trim(), err: (result.stderr ?? '').trim() };
  }

  // Ausgabe eines Aufrufs; Exit ungleich 0 bricht mit SessionChainError ab.
  function gitOrThrow(repo, args) {
    const result = git(repo, args);
    if (!result.ok) throw new SessionChainError(`git ${args.join(' ')}: ${result.err}`);
    return result.out;
  }

  function toplevel(dir) {
    const result = git(dir, ['rev-parse', '--show-toplevel']);
    if (!result.ok) throw new SessionChainError(`Kein Git-Repo: ${toPosix(dir)}`);
    return path.resolve(result.out);
  }

  function isDirty(repo, file) {
    return gitOrThrow(repo, ['status', '--porcelain', '--', file]) !== '';
  }

  function sameDir(a, b) {
    return normalizePath(realPath(a)) === normalizePath(realPath(b));
  }

  function worktreeListed(repo, worktree) {
    return git(repo, ['worktree', 'list', '--porcelain']).out.split('\n')
      .filter((line) => line.startsWith('worktree ')).some((line) => sameDir(line.slice('worktree '.length), worktree));
  }

  // Pfad relativ zur Checkout-Wurzel, mit `/`.
  function relative(repo, file) {
    return toPosix(path.relative(realPath(repo), realPath(path.resolve(repo, file))));
  }

  module.exports = { git, gitOrThrow, toplevel, isDirty, sameDir, worktreeListed, relative };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-check.js`:
  ```js
  'use strict';

  // Prüfung eines `final` gegen git, bevor die nächste Etappe startet. Liefert, was geprüft wurde (`geprueft`), und jede
  // Abweichung (`abweichungen`); eine Abweichung hält die Kette. Pfade in Meldungen sind relativ zur Checkout-Wurzel.

  const fs = require('node:fs');
  const { toPosix } = require('./posix');
  const { git, sameDir, worktreeListed, relative } = require('./session-chain-git');

  // Dateien, die ein Commit der Etappe enthalten darf; null = beliebig (Code der Umsetzung).
  const EXPECTED = {
    whiteboarding: (values) => [values.spec, ...values.dateien],
    grill: (values) => [values.spec, ...values.dateien],
    'spec-review': (values) => [values.spec],
    'spec-nacharbeit': (values) => [values.spec],
    planning: (values) => [values.spec, values.plan],
    'plan-review': (values) => [values.spec, values.plan],
    'plan-nacharbeit': (values) => [values.spec, values.plan],
    umsetzung: () => null,
    abschluss: () => null,
  };
  // Artefakte, die nach der Etappe committet sein müssen.
  const MUST_BE_COMMITTED = { 'spec-review': ['spec'], 'spec-nacharbeit': ['spec'] };

  function commitChecks(repo, values, expected) {
    if (!values.commit || values.commit === 'none') return { geprueft: [], abweichungen: [] };
    if (!git(repo, ['cat-file', '-e', `${values.commit}^{commit}`]).ok) return { geprueft: [], abweichungen: [`Commit ${values.commit} existiert nicht`] };
    const files = git(repo, ['show', '--name-only', '--format=', values.commit]).out.split('\n').filter(Boolean);
    const allowed = expected === null ? null : new Set(expected.filter(Boolean).map((file) => relative(repo, file)));
    const foreign = allowed === null ? [] : files.filter((file) => !allowed.has(file));
    return {
      geprueft: [`Commit ${values.commit}: ${files.join(', ') || 'ohne Dateien'}`],
      abweichungen: foreign.map((file) => `Commit ${values.commit} enthält ${file} außerhalb der erwarteten Dateien`),
    };
  }

  function committedChecks(repo, etappe, values) {
    const result = { geprueft: [], abweichungen: [] };
    for (const key of MUST_BE_COMMITTED[etappe] ?? []) {
      const file = relative(repo, values[key]);
      const dirty = git(repo, ['status', '--porcelain', '--', file]).out !== '';
      (dirty ? result.abweichungen : result.geprueft).push(dirty ? `${file} ist uncommittet` : `${file} ist committet`);
    }
    return result;
  }

  // Umsetzung: Branch, Commits seit dem Basis-Branch, Worktree.
  function implementationChecks(repo, values) {
    const result = { geprueft: [], abweichungen: [] };
    if (!git(repo, ['rev-parse', '--verify', '--quiet', `refs/heads/${values.branch}`]).ok) {
      result.abweichungen.push(`Branch ${values.branch ?? '-'} existiert nicht`);
      return result;
    }
    const count = Number(git(repo, ['rev-list', '--count', `${values.basis}..${values.branch}`]).out || 0);
    if (count > 0) result.geprueft.push(`Branch ${values.branch}: ${count} Commits seit ${values.basis}`);
    else result.abweichungen.push(`Branch ${values.branch} hat keine Commits seit ${values.basis}`);
    if (values.worktree && !sameDir(values.worktree, repo)) {
      const listed = worktreeListed(repo, values.worktree);
      (listed ? result.geprueft : result.abweichungen).push(listed ? `Worktree ${toPosix(values.worktree)} besteht` : `Worktree ${toPosix(values.worktree)} fehlt`);
    }
    return result;
  }

  // Abschluss: Upstream, kein Vorsprung davor, Worktree entfernt.
  function finishChecks(repo, values) {
    const result = { geprueft: [], abweichungen: [] };
    const upstream = git(repo, ['rev-parse', '--abbrev-ref', `${values.branch}@{upstream}`]);
    if (!upstream.ok) result.abweichungen.push(`Branch ${values.branch} hat keinen Upstream`);
    else {
      const ahead = Number(git(repo, ['rev-list', '--count', `${upstream.out}..${values.branch}`]).out || 0);
      result.geprueft.push(`Branch ${values.branch} hat Upstream ${upstream.out}`);
      (ahead === 0 ? result.geprueft : result.abweichungen).push(ahead === 0 ? `Branch ${values.branch} hat keinen Vorsprung vor ${upstream.out}` : `Branch ${values.branch} hat ${ahead} Commits Vorsprung vor ${upstream.out}`);
    }
    if (values.worktree && !sameDir(values.worktree, repo)) {
      const gone = !worktreeListed(repo, values.worktree) && !fs.existsSync(values.worktree);
      (gone ? result.geprueft : result.abweichungen).push(gone ? `Worktree ${toPosix(values.worktree)} ist entfernt` : `Worktree ${toPosix(values.worktree)} besteht noch`);
    }
    return result;
  }

  const EXTRA = { umsetzung: implementationChecks, abschluss: finishChecks };

  // `values`: commit, spec, plan, dateien (Glossar/ADR), branch, basis, worktree; `repo`: Haupt-Checkout.
  function checkFinal(etappe, repo, values) {
    const parts = [
      commitChecks(repo, values, EXPECTED[etappe]({ ...values, dateien: values.dateien ?? [] })),
      committedChecks(repo, etappe, values),
      ...(EXTRA[etappe] ? [EXTRA[etappe](repo, values)] : []),
    ];
    return { geprueft: parts.flatMap((part) => part.geprueft), abweichungen: parts.flatMap((part) => part.abweichungen) };
  }

  module.exports = { checkFinal };
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/posix.test.js plugins/forge/tests/session-chain-git.test.js plugins/forge/tests/session-chain-check.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/posix.js plugins/forge/tests/posix.test.js plugins/forge/scripts/lib/session-chain-git.js plugins/forge/tests/session-chain-git.test.js plugins/forge/scripts/lib/session-chain-check.js plugins/forge/tests/session-chain-check.test.js` · `git commit -m "feat(forge): check a stage result of a session chain against git"`

---

### Task 6: Textblöcke der Leit-Session

**ACs:** AC-15, AC-22, AC-24, AC-28, AC-29, AC-51, AC-59, AC-60, AC-61

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-chain-text.js`
- Create: `plugins/forge/tests/session-chain-text.test.js`

**Interfaces:**
- Consumes: `pointLine(point)` aus `plugins/forge/scripts/lib/session-chain-points.js` (Task 2)
- Produces: Modul `plugins/forge/scripts/lib/session-chain-text.js` mit `goCall({ plan, spec, wi?, basis }): string` (`/dv-forge:implementation-orchestrator <P> <S> [<WI>] --base <B>`); `specHalt({ result, recommendation, points }): string`; `goHalt({ spec, plan, wi?, basis, result: string|null, recommendation, points }): string`; `noStatusHint({ etappe, session }): string`; `showstopperText({ gruende, session }): string`; `deviationText({ etappe, abweichungen, session }): string`; `adoptedText(state): string`; `finalReport(state, { stopp?: boolean }): string`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-text.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { goCall, specHalt, goHalt, noStatusHint, showstopperText, deviationText, adoptedText, finalReport } = require('../scripts/lib/session-chain-text');

  const THREE_YELLOW = ['Begriff', 'Grenzfall', 'Reihenfolge'].map((titel, index) => ({ farbe: 'yellow', titel, key: String(index), herkunft: 'spec-review' }));
  const GO_VALUES = { spec: 'C:/r/docs/forge/x/spec.md', plan: 'C:/r/docs/forge/x/plan.md', basis: 'dev' };

  test('specHalt_ReadyWithThreeHints_ShowsResultRecommendationAllYellowAndChoice', () => {
    // Act
    const text = specHalt({ result: '✅ Bereit zum Planen · 3 kleine Hinweise offen', recommendation: { empfehlung: 'Planning', grund: null }, points: THREE_YELLOW });

    // Assert
    assert.equal(text, [
      '# Spec-Haltepunkt',
      '**Ergebnis:** ✅ Bereit zum Planen · 3 kleine Hinweise offen',
      '**Empfehlung:** Planning',
      '**Offene Punkte:**',
      '- 🟡 Begriff · spec-review',
      '- 🟡 Grenzfall · spec-review',
      '- 🟡 Reihenfolge · spec-review',
      '**Auswahl:** Planning · Spec-Nacharbeit · Stopp',
    ].join('\n'));
  });

  test('specHalt_IncompleteReview_RecommendsStoppWithReasonAndKeepsChoice', () => {
    // Act
    const text = specHalt({ result: '⚠️ Unvollständig · Nachprüfung ausgefallen', recommendation: { empfehlung: 'Stopp', grund: 'Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.' }, points: [] });

    // Assert
    assert.ok(text.includes('**Empfehlung:** Stopp — Das Review ist ⚠️ Unvollständig · Nachprüfung ausgefallen.'));
    assert.ok(text.includes('**Auswahl:** Planning · Spec-Nacharbeit · Stopp'));
  });

  test('goCall_WithAndWithoutWorkitem_FillsAllValues', () => {
    // Act
    const [withWi, withoutWi] = [{ ...GO_VALUES, wi: '311021' }, GO_VALUES].map(goCall);

    // Assert
    assert.equal(withWi, '/dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md 311021 --base dev');
    assert.equal(withoutWi, '/dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md --base dev');
  });

  test('goHalt_AfterPlanReview_ShowsPathsResultYellowAndFilledCall', () => {
    // Act
    const text = goHalt({ ...GO_VALUES, wi: '311021', result: '✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen', recommendation: { empfehlung: 'GO', grund: null }, points: [THREE_YELLOW[0]] });

    // Assert
    assert.equal(text, [
      '# GO-Haltepunkt',
      '**Spec:** C:/r/docs/forge/x/spec.md',
      '**Plan:** C:/r/docs/forge/x/plan.md',
      '**Ergebnis:** ✅ Bereit zur Umsetzung · 1 kleiner Hinweis offen',
      '**Empfehlung:** GO',
      '**Offene Punkte:**',
      '- 🟡 Begriff · spec-review',
      '**Aufruf:** /dv-forge:implementation-orchestrator C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md 311021 --base dev',
      '**Auswahl:** GO · Plan-Nacharbeit · Stopp',
    ].join('\n'));
  });

  test('goHalt_WithoutPlanReviewResult_OmitsResultLineAndKeepsTheRest', () => {
    // Act
    const text = goHalt({ ...GO_VALUES, result: null, recommendation: { empfehlung: 'GO', grund: null }, points: [] });

    // Assert
    assert.ok(!text.includes('**Ergebnis:**'));
    for (const part of ['**Spec:** C:/r/docs/forge/x/spec.md', '**Plan:** C:/r/docs/forge/x/plan.md', '**Offene Punkte:**\nKeine.', '**Aufruf:** /dv-forge:implementation-orchestrator']) assert.ok(text.includes(part), part);
  });

  test('noStatusHint_EtappeAndSession_NamesBothInOneLineWithLink', () => {
    // Act
    const line = noStatusHint({ etappe: 'spec-review', session: 'local_abc' });

    // Assert
    assert.equal(line, 'spec-review: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · [Session](#local_abc)');
  });

  test('showstopperText_AcWithoutTest_NamesAcAndLinksSession', () => {
    // Act
    const text = showstopperText({ gruende: ['AC-05 hat keinen beweisenden Test'], session: 'local_u' });

    // Assert
    assert.equal(text, '# Showstopper der Umsetzung\n- AC-05 hat keinen beweisenden Test\nKlären in der Umsetzungs-Session: [Session](#local_u)');
  });

  test('deviationText_UncommittedSpec_NamesItAndHolds', () => {
    // Act
    const text = deviationText({ etappe: 'spec-review', abweichungen: ['docs/forge/x/spec.md ist uncommittet'], session: 'local_s' });

    // Assert
    assert.ok(text.includes('- docs/forge/x/spec.md ist uncommittet'));
    assert.ok(text.includes('Die Kette hält.'));
  });

  test('adoptedText_StateWithBaseAndTwoYellow_NamesBaseAndBothPoints', () => {
    // Act
    const text = adoptedText({ slug: 'x', basis: 'dev', offen: THREE_YELLOW.slice(0, 2), entscheidungen: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] });

    // Assert
    for (const part of ['**Basis-Branch:** dev', '- 🟡 Begriff · spec-review', '- 🟡 Grenzfall · spec-review', '- spec-nacharbeit: 500 statt 404, keine Backend-Änderung']) assert.ok(text.includes(part), part);
  });

  test('finalReport_CommitSeenAndTestCountsReported_SeparatesCheckedFromReported', () => {
    // Arrange
    const state = { slug: 'x', etappen: [{ etappe: 'umsetzung', session: 'local_u', ergebnis: '✅ Bereit zum Abschließen', geprueft: ['Commit abc1234: src/a.js'], tests: '120 grün' }] };

    // Act
    const text = finalReport(state);

    // Assert
    const checked = text.slice(text.indexOf('## Geprüft'), text.indexOf('## Gemeldet'));
    const reported = text.slice(text.indexOf('## Gemeldet'), text.indexOf('## Offene Punkte'));
    assert.ok(checked.includes('- umsetzung: Commit abc1234: src/a.js'));
    assert.ok(reported.includes('- umsetzung: Testzahlen 120 grün'));
    assert.ok(!reported.includes('abc1234'));
  });

  test('finalReport_YellowFromSpecReviewAndGreenFromPlanReview_ListsBothWithOrigin', () => {
    // Arrange
    const state = { slug: 'x', offen: [{ farbe: 'yellow', titel: 'Begriff', herkunft: 'spec-review' }, { farbe: 'green', titel: 'Name', herkunft: 'plan-review' }] };

    // Act
    const text = finalReport(state);

    // Assert
    assert.ok(text.includes('## Offene Punkte\n- 🟡 Begriff · spec-review\n- 🟢 Name · plan-review'));
  });

  test('finalReport_StoppAtGo_NamesResumeCodewordAndNoWorkitemWithoutNumber', () => {
    // Arrange
    const state = { slug: 'x', halt: 'go', spec: 'C:/r/s.md', plan: 'C:/r/p.md' };

    // Act
    const text = finalReport(state, { stopp: true });

    // Assert
    assert.ok(text.includes('## Fortsetzen\n/dv-forge:session-orchestrator implementation C:/r/s.md C:/r/p.md'));
    assert.ok(!text.includes('finishing-workitem'));
  });

  test('finalReport_WithWorkitem_NamesOptionalFinishingWorkitemCall', () => {
    // Act
    const text = finalReport({ slug: 'x', wi: '311021' });

    // Assert
    assert.ok(text.includes('## Workitem\nOptional: `finishing-workitem 311021`'));
    assert.ok(!text.includes('## Fortsetzen'));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-text.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-text'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/session-chain-text.js`:
  ```js
  'use strict';

  // Feste Textblöcke der Leit-Session: Haltepunkte, Hinweise, übernommener Zustand und Schlussbericht der Kette.
  // Reine Funktionen; die Leit-Session gibt die Blöcke unverändert aus.

  const { pointLine } = require('./session-chain-points');

  const NONE = 'Keine.';
  const CHOICES = { spec: 'Planning · Spec-Nacharbeit · Stopp', go: 'GO · Plan-Nacharbeit · Stopp' };
  // Codewort für den späteren Einstieg je Haltepunkt, an dem gestoppt wurde.
  const RESUME = {
    spec: (state) => `/dv-forge:session-orchestrator planning ${state.spec}`,
    go: (state) => `/dv-forge:session-orchestrator implementation ${state.spec} ${state.plan}`,
  };

  function pointLines(points) {
    return points && points.length > 0 ? points.map(pointLine) : [NONE];
  }

  function sessionLink(session) {
    return `[Session](#${session})`;
  }

  function recommendationLine({ empfehlung, grund }) {
    return `**Empfehlung:** ${empfehlung}${grund ? ` — ${grund}` : ''}`;
  }

  // Aufruf der Umsetzung, wie ihn der GO-Haltepunkt zeigt und die Umsetzungs-Etappe startet; ohne Workitem ohne Nummer.
  function goCall({ plan, spec, wi, basis }) {
    return `/dv-forge:implementation-orchestrator ${plan} ${spec}${wi ? ` ${wi}` : ''} --base ${basis}`;
  }

  function specHalt({ result, recommendation, points }) {
    return [
      '# Spec-Haltepunkt',
      `**Ergebnis:** ${result ?? 'keine Ergebnis-Zeile'}`,
      recommendationLine(recommendation),
      '**Offene Punkte:**',
      ...pointLines(points),
      `**Auswahl:** ${CHOICES.spec}`,
    ].join('\n');
  }

  // Ohne Plan-Review-Ergebnis (`result` null) fehlt die Ergebnis-Zeile.
  function goHalt({ spec, plan, wi, basis, result, recommendation, points }) {
    return [
      '# GO-Haltepunkt',
      `**Spec:** ${spec}`,
      `**Plan:** ${plan}`,
      ...(result ? [`**Ergebnis:** ${result}`] : []),
      recommendationLine(recommendation),
      '**Offene Punkte:**',
      ...pointLines(points),
      `**Aufruf:** ${goCall({ plan, spec, wi, basis })}`,
      `**Auswahl:** ${CHOICES.go}`,
    ].join('\n');
  }

  function noStatusHint({ etappe, session }) {
    return `${etappe}: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · ${sessionLink(session)}`;
  }

  function showstopperText({ gruende, session }) {
    return ['# Showstopper der Umsetzung', ...gruende.map((grund) => `- ${grund}`), `Klären in der Umsetzungs-Session: ${sessionLink(session)}`].join('\n');
  }

  function deviationText({ etappe, abweichungen, session }) {
    return [`# Abweichung in der Etappe ${etappe}`, ...abweichungen.map((line) => `- ${line}`), `Die Kette hält. Etappen-Session: ${sessionLink(session)}`].join('\n');
  }

  function adoptedText(state) {
    return [
      `Zustand übernommen: ${state.slug}`,
      `**Basis-Branch:** ${state.basis ?? 'unbekannt'}`,
      ...(state.etappe ? [`**Letzte Etappe:** ${state.etappe}`] : []),
      '**Offene Punkte:**',
      ...pointLines(state.offen),
      '**Entscheidungen:**',
      ...((state.entscheidungen ?? []).length > 0 ? state.entscheidungen.map((entry) => `- ${entry.etappe}: ${entry.text}`) : [NONE]),
    ].join('\n');
  }

  function etappeLines(state) {
    const lines = (state.etappen ?? []).map((entry) => `- ${entry.etappe}: ${entry.ergebnis ?? 'ohne Ergebnis-Zeile'} · ${sessionLink(entry.session)}`);
    return lines.length > 0 ? lines : [NONE];
  }

  function checkedLines(state) {
    const lines = [
      ...(state.etappen ?? []).flatMap((entry) => (entry.geprueft ?? []).map((line) => `- ${entry.etappe}: ${line}`)),
      ...(state.commits ?? []).filter((entry) => entry.etappe === 'leit-session').map((entry) => `- leit-session: Commit ${entry.hash}: ${entry.dateien.join(', ')}`),
    ];
    return lines.length > 0 ? lines : [NONE];
  }

  function reportedLines(state) {
    const lines = (state.etappen ?? []).flatMap((entry) => [
      ...(entry.ergebnis ? [`- ${entry.etappe}: Ergebnis ${entry.ergebnis}`] : []),
      ...(entry.tests ? [`- ${entry.etappe}: Testzahlen ${entry.tests}`] : []),
    ]);
    return lines.length > 0 ? lines : [NONE];
  }

  // Schlussbericht: `stopp` nennt das Codewort für den späteren Einstieg; mit Workitem den optionalen Abschluss im Workitem.
  function finalReport(state, { stopp = false } = {}) {
    const resume = stopp && RESUME[state.halt] ? ['## Fortsetzen', RESUME[state.halt](state)] : [];
    const workitem = state.wi ? ['## Workitem', `Optional: \`finishing-workitem ${state.wi}\``] : [];
    return [
      `# Schlussbericht der Session-Kette ${state.slug}`,
      '## Etappen', ...etappeLines(state),
      '## Geprüft', ...checkedLines(state),
      '## Gemeldet', ...reportedLines(state),
      '## Offene Punkte', ...pointLines(state.offen),
      ...resume,
      ...workitem,
    ].join('\n');
  }

  module.exports = { goCall, specHalt, goHalt, noStatusHint, showstopperText, deviationText, adoptedText, finalReport };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-text.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-text.js plugins/forge/tests/session-chain-text.test.js` · `git commit -m "feat(forge): render halt points and closing report of a session chain"`

---

### Task 7: Brief einer Etappen-Session mit `base-sub-agent.md`

**ACs:** AC-01, AC-03, AC-04, AC-05, AC-06, AC-08, AC-11, AC-13, AC-32, AC-36, AC-42, AC-43, AC-52, AC-53, AC-55, AC-64

**Dateien:**
- Create: `plugins/forge/shared/session-chain/base-sub-agent.md`
- Create: `plugins/forge/scripts/lib/session-chain-brief.js`
- Create: `plugins/forge/tests/session-chain-brief.test.js`

**Interfaces:**
- Consumes: `checkedEtappe(etappe)` und `SessionChainError` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1); `goCall({ plan, spec, wi?, basis })` aus `plugins/forge/scripts/lib/session-chain-text.js` (Task 6); `toPosix` aus `plugins/forge/scripts/lib/posix.js`
- Produces: Datei `plugins/forge/shared/session-chain/base-sub-agent.md` mit den Platzhaltern `{{ETAPPE}}`, `{{PLUGIN}}`, `{{BERICHT}}`; Modul `plugins/forge/scripts/lib/session-chain-brief.js` mit ohne `slug` (Whiteboarding) die Zeile `` - Slug: folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`) ``; `buildBrief({ etappe, values: { slug?, wi?, basis?, spec?, plan?, worktree?, branch?, quelle? }, decisions?: Array<{ etappe, text }>, kontext?: string|null }): { modell: 'opus'|'sonnet', titel: string, brief: string, hintergrund: string }` (fehlt ein Pflichtwert der Etappe: `SessionChainError` `Etappe <e>: <wert> fehlt`); `ETAPPEN_BRIEFS` (je Etappe `modell`, `titel`, `pflicht`, `command`, `auftrag`); `BASE_FILE`. Pflichtwerte: `grill`, `spec-review`, `planning` `spec`; `spec-nacharbeit` `spec`, `quelle`; `plan-review` `plan`, `spec`; `plan-nacharbeit` `plan`, `spec`, `quelle`; `umsetzung` `plan`, `spec`, `basis`; `abschluss` `worktree`; `whiteboarding` keine. Der Befehl der Berichtsdatei heißt `session-chain.js etappe-report`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-brief.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const { buildBrief, BASE_FILE } = require('../scripts/lib/session-chain-brief');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { goCall } = require('../scripts/lib/session-chain-text');
  const { readText } = require('./lib/markdown');

  const VALUES = { slug: 'x', basis: 'dev', spec: 'C:/r/docs/forge/x/spec.md', plan: 'C:/r/docs/forge/x/plan.md' };
  const MODELS = {
    whiteboarding: 'sonnet', grill: 'opus', 'spec-review': 'sonnet', 'spec-nacharbeit': 'opus', planning: 'opus',
    'plan-review': 'sonnet', 'plan-nacharbeit': 'opus', umsetzung: 'opus', abschluss: 'sonnet',
  };

  function brief(etappe, values = VALUES, extra = {}) {
    return buildBrief({ etappe, values: { ...values, quelle: 'C:/a/bericht.md', worktree: values.worktree ?? 'C:/wt/x' }, ...extra });
  }

  test('buildBrief_EveryEtappe_UsesTheModelOfTheSpec', () => {
    // Act
    const models = Object.fromEntries(Object.keys(MODELS).map((etappe) => [etappe, brief(etappe).modell]));

    // Assert
    assert.deepEqual(models, MODELS);
  });

  test('buildBrief_SkillEtappen_StartWithTheSlashCommandOfTheirSkill', () => {
    // Act
    const first = (etappe) => brief(etappe).brief.split('\n')[0];

    // Assert
    assert.equal(first('whiteboarding'), '/dv-forge:spec-whiteboarding-with-docs');
    assert.equal(first('grill'), '/dv-forge:spec-grilling C:/r/docs/forge/x/spec.md');
    assert.equal(first('spec-review'), '/dv-forge:spec-review-orchestrator C:/r/docs/forge/x/spec.md');
    assert.equal(first('planning'), '/dv-forge:plan-orchestrator C:/r/docs/forge/x/spec.md');
    assert.equal(first('plan-review'), '/dv-forge:plan-review C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md');
    assert.equal(first('abschluss'), '/dv-forge:finish-work');
  });

  test('buildBrief_Nacharbeit_StartsWithTaskLineAndNamesTheReviewReport', () => {
    // Act
    const [spec, plan] = ['spec-nacharbeit', 'plan-nacharbeit'].map((etappe) => brief(etappe).brief);

    // Assert
    assert.equal(spec.split('\n')[0], 'Spec-Nacharbeit C:/r/docs/forge/x/spec.md');
    assert.equal(plan.split('\n')[0], 'Plan-Nacharbeit C:/r/docs/forge/x/plan.md C:/r/docs/forge/x/spec.md');
    assert.ok(spec.includes('Lies den Bericht der letzten Review-Etappe: C:/a/bericht.md.'));
    assert.ok(spec.includes('-- "C:/r/docs/forge/x/spec.md"'));
    assert.ok(plan.includes('Du committest nicht; den Plan committet die Leit-Session nach dem GO.'));
  });

  test('buildBrief_Umsetzung_FirstLineIsTheCallOfTheGoHaltepunkt', () => {
    // Arrange
    const values = { ...VALUES, wi: '311021' };

    // Act
    const first = brief('umsetzung', values).brief.split('\n')[0];

    // Assert
    assert.equal(first, goCall(values));
  });

  test('buildBrief_WithWorkitem_NamesTheWorkitem', () => {
    // Act
    const text = brief('spec-review', { ...VALUES, wi: '311021' }).brief;

    // Assert
    assert.ok(text.startsWith('/dv-forge:spec-review-orchestrator C:/r/docs/forge/x/spec.md 311021'));
    assert.ok(text.includes('- Workitem: 311021'));
  });

  test('buildBrief_WithoutWorkitem_NamesNoWorkitemAnywhere', () => {
    // Act
    const texts = ['spec-review', 'planning', 'umsetzung', 'plan-review'].map((etappe) => brief(etappe).brief);

    // Assert
    for (const text of texts) assert.doesNotMatch(text, /Workitem/);
  });

  test('buildBrief_AnyEtappe_ContainsValuesAndAllFixedBuildingBlocks', () => {
    // Act
    const text = brief('planning').brief;

    // Assert
    for (const part of [
      '- Slug: x', '- Basis-Branch: dev', '- Spec: C:/r/docs/forge/x/spec.md', '- Plan: C:/r/docs/forge/x/plan.md',
      'nur deine eigenen Dateien, auf Pfade beschränkt', 'Nie alle Änderungen stagen', 'fremde Dateien nicht anfassen', 'Commit-Konvention des Projekts', 'Push nur in der Abschluss-Etappe',
      '`[planning] STATUS=<in-progress|needs-user|final> · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad|none>`',
      'Starte keine weitere Session und sende keine Nachricht an die Leit-Session',
      'stellst sie am Ende deiner Antwort',
      'Aufräumpflicht: Vor deinem letzten Turn-Ende beendest du alle Hintergrundprozesse',
      'Die Statuszeile ersetzt die Übergabe-Hinweise deines Skills',
      'scripts/session-chain.js" etappe-report --etappe planning --slug x',
    ]) assert.ok(text.includes(part), part);
  });

  test('buildBrief_AnyEtappe_PutsTheStatusLineBeforeTheReportOfTheSkill', () => {
    // Act
    const text = brief('spec-review').brief;

    // Assert
    assert.ok(text.includes('Die Statuszeile steht als einzige Zeile vor dem Bericht deines Skills. Regeln deines Skills wie `nichts davor oder danach` gelten ab der zweiten Zeile.'));
  });

  test('buildBrief_MissingSpec_ThrowsNamingTheValue', () => {
    // Act & Assert
    assert.throws(() => buildBrief({ etappe: 'grill', values: { slug: 'x', basis: 'dev' } }),
      (error) => error instanceof SessionChainError && error.message === 'Etappe grill: spec fehlt');
  });

  test('buildBrief_NacharbeitWithoutQuelle_ThrowsNamingTheValue', () => {
    // Act & Assert
    assert.throws(() => buildBrief({ etappe: 'plan-nacharbeit', values: VALUES }),
      (error) => error instanceof SessionChainError && error.message === 'Etappe plan-nacharbeit: quelle fehlt');
  });

  test('buildBrief_AnyEtappe_CarriesTheConversationStyleOfTheBaseFile', () => {
    // Act
    const text = brief('grill').brief;

    // Assert
    assert.ok(text.includes('## Gesprächsstil'));
    assert.ok(text.includes('wie im Gespräch an der Kaffeemaschine'));
    assert.ok(readText(BASE_FILE).includes('## Gesprächsstil'));
    assert.doesNotMatch(text, /i-have-adhd/);
    assert.doesNotMatch(text, /\{\{[A-Z]+\}\}/);
  });

  test('buildBrief_FinishWithoutState_NamesOnlyTheWorktree', () => {
    // Act
    const text = buildBrief({ etappe: 'abschluss', values: { slug: 'wt-x', worktree: 'C:/wt/x' } }).brief;

    // Assert
    const values = text.slice(text.indexOf('## Werte'), text.indexOf('## Auftrag'));
    assert.equal(values.trim(), '## Werte\n- Slug: wt-x\n- Worktree: C:/wt/x');
    assert.ok(text.includes('Ohne sein Ja pushst du nicht.'));
  });

  test('buildBrief_EarlierDecisions_AreListedInTheBrief', () => {
    // Act
    const text = brief('planning', VALUES, { decisions: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] }).brief;

    // Assert
    assert.ok(text.includes('## Entscheidungen aus früheren Etappen\n- spec-nacharbeit: 500 statt 404, keine Backend-Änderung'));
  });

  test('buildBrief_Whiteboarding_CarriesTheContextSummaryAndReportsBySpec', () => {
    // Act
    const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export nach CSV\nDateien: src/export.js\nEntscheidungen: nur CSV' }).brief;

    // Assert
    assert.ok(text.includes('## Kontext\nAnliegen: Export nach CSV\nDateien: src/export.js\nEntscheidungen: nur CSV'));
    assert.ok(text.includes('etappe-report --etappe whiteboarding --spec "<deine Spec>"'));
  });

  test('buildBrief_PlanReview_RunsFollowupWhileOfferedAtMostTwiceWithoutRewrite', () => {
    // Act
    const text = brief('plan-review').brief;

    // Assert
    assert.ok(text.includes('solange die letzte Ausgabe `FOLLOWUP ja` meldet, höchstens zwei Runden'));
    assert.ok(text.includes('Den Plan schreibst du nicht neu.'));
    assert.ok(text.includes('`--ablage plan-review`'));
  });

  test('buildBrief_PlanReview_NamesTheMarkdownReportOfTheLastAblageLine', () => {
    // Act
    const text = brief('plan-review').brief;

    // Assert
    assert.ok(text.includes('`--bericht` ist die `.md`-Datei zur letzten `ABLAGE`-Zeile (gleicher Name, `.md` statt `.json`).'));
  });

  test('buildBrief_Background_IsLongEnoughForAFreshSession', () => {
    // Act
    const { hintergrund, titel } = brief('spec-review');

    // Assert
    assert.ok(hintergrund.length >= 80);
    assert.equal(titel, 'Spec-Review x');
  });

  test('buildBrief_WhiteboardingWithoutSlug_NamesWhereTheSlugComesFrom', () => {
    // Act
    const text = buildBrief({ etappe: 'whiteboarding', values: { basis: 'dev' }, kontext: 'Anliegen: Export' }).brief;

    // Assert
    const values = text.slice(text.indexOf('## Werte'), text.indexOf('## Auftrag'));
    assert.equal(values.trim(), '## Werte\n- Slug: folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`)\n- Basis-Branch: dev');
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-brief.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-brief'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/shared/session-chain/base-sub-agent.md` (eigene Fassung, kein Text aus fremden Plugins):
  ````markdown
  ## Ketten-Regeln
  1. Dein Skill läuft vollständig nach seinen eigenen Regeln. Der Slash-Befehl der ersten Zeile läuft nicht von selbst: Ruf den Skill über das Skill-Werkzeug auf, mit den Argumenten der ersten Zeile und den Zusätzen aus dem Auftrag. Steht in der ersten Zeile kein Slash-Befehl, gibt es keinen Skill; dann gilt nur der Auftrag.
  2. Fragen deines Skills gibst du unverändert an den Menschen in dieser Session weiter und stellst sie am Ende deiner Antwort. Du beantwortest sie nie selbst.
  3. Commits: nur deine eigenen Dateien, auf Pfade beschränkt (`git commit -m "<betreff>" -- <pfade>`). Nie alle Änderungen stagen (`git add -A`, `git add .`, `git commit -a`), fremde Dateien nicht anfassen. Betreff nach der Commit-Konvention des Projekts: `node "{{PLUGIN}}/scripts/forge-config.js" get Commit-Konvention`, leer → Projekt-`CLAUDE.md`. Push nur in der Abschluss-Etappe.
  4. Starte keine weitere Session und sende keine Nachricht an die Leit-Session oder eine andere Session. Du meldest dich nur über dein Turn-Ende.
  5. Report-Protokoll: Die erste Zeile des Recaps an jedem Turn-Ende, auch bei Zwischenständen, lautet
     `[{{ETAPPE}}] STATUS=<in-progress|needs-user|final> · ROT=<n> · GELB=<n> · COMMIT=<hash|none> · BERICHT=<pfad|none>`
     `needs-user`: du wartest auf den Menschen. `final`: deine Etappe ist fertig und die Berichtsdatei geschrieben. ROT und GELB: offene 🔴 und 🟡 laut Bericht.
     Die Statuszeile steht als einzige Zeile vor dem Bericht deines Skills. Regeln deines Skills wie `nichts davor oder danach` gelten ab der zweiten Zeile.
  6. Berichtsdatei vor dem `final`: `{{BERICHT}}`, dazu `--bericht "<datei>"` mit dem vollen Bericht deines Skills, `--entscheidung "<text>"` je Entscheidung des Menschen in dieser Etappe, `--datei "<pfad>"` je Glossar- oder ADR-Datei, die du geändert hast, `--tests "<zahlen>"`, wenn Tests liefen. Die Ausgabezeile `BERICHT=<pfad>` ist der Pfad für deine Statuszeile.
  7. Die Statuszeile ersetzt die Übergabe-Hinweise deines Skills (frische Session, Commit-Schritt, nächster Aufruf). Diese Hinweise gibst du nicht aus.
  8. Aufräumpflicht: Vor deinem letzten Turn-Ende beendest du alle Hintergrundprozesse, die du oder deine Agents gestartet haben.

  ## Gesprächsstil
  Du redest mit dem Menschen wie im Gespräch an der Kaffeemaschine: per Du, locker, kurze Sätze, ohne Förmlichkeit. Feste Formate deines Skills (Berichte, Fragerunden, Statuszeile) gehen vor; der Stil gilt für deinen eigenen Text.
  1. Zuerst das, was der Mensch tun oder entscheiden soll. Erklärung danach, nur wenn nötig.
  2. Mehrere Schritte stehen als nummerierte Liste, je Schritt eine Handlung.
  3. Nenn in jedem Turn den Stand, etwa „Schritt 2 von 4 erledigt: Plan geschrieben“.
  4. Am Ende genau eine konkrete nächste Handlung oder genau eine Frage.
  5. Ein Nebenthema erst nach dem Hauptthema, als eigene kurze Frage.
  6. Zeitangaben in festen Einheiten („etwa 10 Minuten“), nie „ein bisschen“.
  7. Was jetzt fertig ist, sagst du konkret und sichtbar.
  8. Fehler sachlich: Ursache, dann Abhilfe, ohne „leider“ oder „oh nein“.
  9. Höchstens fünf Punkte je Liste; Weiteres nennst du auf Nachfrage.
  10. Keine Floskeln zu Beginn oder am Ende, keine Wiederholung des eben Gesagten.
  ````
  Datei `plugins/forge/scripts/lib/session-chain-brief.js`:
  ```js
  'use strict';

  // Brief einer Etappen-Session: erste Zeile Slash-Befehl des Skills (bei den Nacharbeiten die Auftragszeile), dann Werte,
  // Auftrag, Entscheidungen früherer Etappen, beim Whiteboarding der Kontext, zuletzt der Inhalt von base-sub-agent.md.
  // Werte ohne Inhalt (etwa kein Workitem) fehlen im Brief ganz.

  const fs = require('node:fs');
  const path = require('node:path');
  const { toPosix } = require('./posix');
  const { SessionChainError, checkedEtappe } = require('./session-chain-store');
  const { goCall } = require('./session-chain-text');

  const PLUGIN_ROOT = path.resolve(__dirname, '..', '..');
  const BASE_FILE = path.join(PLUGIN_ROOT, 'shared', 'session-chain', 'base-sub-agent.md');

  function withWi(command, wi) {
    return wi ? `${command} ${wi}` : command;
  }

  function ablage(etappe) {
    return `Ruf den Skill mit den Argumenten der ersten Zeile und zusätzlich \`--ablage ${etappe}\` auf.`;
  }

  // Je Etappe: Modell, Titel, Pflichtwerte, erste Zeile und Auftrag. `v`: slug, wi, basis, spec, plan, worktree, branch, quelle.
  // Fehlt ein Pflichtwert, entsteht kein Brief (sonst stünde `undefined` im Befehl der ersten Zeile).
  const ETAPPEN_BRIEFS = {
    whiteboarding: {
      modell: 'sonnet', titel: 'Whiteboarding', pflicht: [],
      command: () => '/dv-forge:spec-whiteboarding-with-docs',
      auftrag: () => [
        'Eingabe des Whiteboardings ist der Abschnitt „Kontext“ unten.',
        'Berichtsdatei ohne `--bericht`, mit `--spec "<deine Spec>"`.',
      ],
    },
    grill: {
      modell: 'opus', titel: 'Grill', pflicht: ['spec'],
      command: (v) => `/dv-forge:spec-grilling ${v.spec}`,
      auftrag: () => ['Berichtsdatei ohne `--bericht`; jede geänderte Glossar- oder ADR-Datei mit `--datei`.'],
    },
    'spec-review': {
      modell: 'sonnet', titel: 'Spec-Review', pflicht: ['spec'],
      command: (v) => withWi(`/dv-forge:spec-review-orchestrator ${v.spec}`, v.wi),
      auftrag: () => [ablage('spec-review'), 'Der Skill committet die Spec selbst. `--bericht` ist sein Abschlussbericht.'],
    },
    'spec-nacharbeit': {
      modell: 'opus', titel: 'Spec-Nacharbeit', pflicht: ['spec', 'quelle'],
      command: (v) => `Spec-Nacharbeit ${v.spec}`,
      auftrag: (v) => [
        `Kein Skill. Lies den Bericht der letzten Review-Etappe: ${v.quelle}.`,
        'Kläre mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag, eine Frage nach der anderen.',
        'Jede Änderung der Spec legst du als Vorher/Nachher vor und schreibst sie erst nach Bestätigung. Neue Entscheidungen werden W-Einträge unter `## Entscheidungen`.',
        `Danach committest du nur die Spec: \`git commit -m "<betreff>" -- "${v.spec}"\`.`,
      ],
    },
    planning: {
      modell: 'opus', titel: 'Planning', pflicht: ['spec'],
      command: (v) => withWi(`/dv-forge:plan-orchestrator ${v.spec}`, v.wi),
      auftrag: () => [ablage('planning'), 'Der Skill committet nicht. Berichtsdatei mit `--plan "<plan.md>"`; `--bericht` ist sein Abschlussbericht.'],
    },
    'plan-review': {
      modell: 'sonnet', titel: 'Plan-Review', pflicht: ['plan', 'spec'],
      command: (v) => `/dv-forge:plan-review ${v.plan} ${v.spec}`,
      auftrag: (v) => [
        ablage('plan-review'),
        `Danach \`dv-forge:review-followup\` mit \`${v.plan} alle --ablage plan-review\`, solange die letzte Ausgabe \`FOLLOWUP ja\` meldet, höchstens zwei Runden.`,
        'Den Plan schreibst du nicht neu. Die Commit-Frage der Skills bleibt; der Mensch beantwortet sie hier.',
        '`--bericht` ist die `.md`-Datei zur letzten `ABLAGE`-Zeile (gleicher Name, `.md` statt `.json`).',
      ],
    },
    'plan-nacharbeit': {
      modell: 'opus', titel: 'Plan-Nacharbeit', pflicht: ['plan', 'spec', 'quelle'],
      command: (v) => `Plan-Nacharbeit ${v.plan} ${v.spec}`,
      auftrag: (v) => [
        `Kein Skill. Lies den Bericht der letzten Review-Etappe: ${v.quelle}.`,
        'Kläre mit dem Menschen die offenen ❓ und die 🔴 ohne Vorschlag, eine Frage nach der anderen.',
        'Jede Änderung des Plans legst du als Vorher/Nachher vor und schreibst sie erst nach Bestätigung. Neue Entscheidungen werden W-Einträge unter `## Entscheidungen`.',
        'Du committest nicht; den Plan committet die Leit-Session nach dem GO.',
      ],
    },
    umsetzung: {
      modell: 'opus', titel: 'Umsetzung', pflicht: ['plan', 'spec', 'basis'],
      command: (v) => goCall(v),
      auftrag: () => [
        ablage('umsetzung'),
        'Einen Showstopper klärst du mit dem Menschen hier.',
        'Berichtsdatei mit `--worktree "<R>"`, `--branch <branch>`, `--pruefung <gruen|rot|keine>`, `--luecke "<befehl>"` je nicht lauffähigem Build-, Test- oder Lint-Befehl und `--ac-ohne-test <AC-nn>` je Akzeptanzkriterium ohne beweisenden Test; `--bericht` ist sein Abschlussbericht.',
      ],
    },
    abschluss: {
      modell: 'sonnet', titel: 'Abschluss', pflicht: ['worktree'],
      command: () => '/dv-forge:finish-work',
      auftrag: (v) => [
        `Arbeite in ${v.worktree}. Merk dir vorher den Branch: \`git -C "${v.worktree}" branch --show-current\`.`,
        'Nach erfolgreichem finish-work fragst du den Menschen, ob du pushen sollst. Ohne sein Ja pushst du nicht.',
        'Nach dem Ja: `git push -u origin <branch>` im Haupt-Checkout. Berichtsdatei mit `--branch <branch>`.',
      ],
    },
  };

  const VALUE_LINES = [['slug', 'Slug'], ['wi', 'Workitem'], ['basis', 'Basis-Branch'], ['spec', 'Spec'], ['plan', 'Plan'], ['worktree', 'Worktree']];

  // Ohne Slug (Whiteboarding) nennt der Brief, woher er kommt: Das Whiteboarding legt ihn mit der Spec fest.
  const SLUG_FROM_SPEC = 'folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`)';

  function valueLines(values) {
    return VALUE_LINES.map(([key, label]) => {
      if (key === 'slug' && !values.slug) return `- Slug: ${SLUG_FROM_SPEC}`;
      return values[key] ? `- ${label}: ${values[key]}` : null;
    }).filter(Boolean);
  }

  function reportCommand(etappe, values) {
    const target = values.slug ? `--slug ${values.slug}` : '--spec "<deine Spec>"';
    return `node "${toPosix(PLUGIN_ROOT)}/scripts/session-chain.js" etappe-report --etappe ${etappe} ${target}`;
  }

  function checkedValues(etappe, etappenBrief, values) {
    const missing = etappenBrief.pflicht.find((key) => !values[key]);
    if (missing) throw new SessionChainError(`Etappe ${etappe}: ${missing} fehlt`);
    return values;
  }

  function baseRules(etappe, values) {
    return fs.readFileSync(BASE_FILE, 'utf8').replace(/\r\n/g, '\n').trimEnd()
      .replaceAll('{{ETAPPE}}', etappe).replaceAll('{{PLUGIN}}', toPosix(PLUGIN_ROOT)).replaceAll('{{BERICHT}}', reportCommand(etappe, values));
  }

  // `values`: Werte der Kette; `decisions`: Entscheidungen früherer Etappen ({ etappe, text }); `kontext`: Text, nur Whiteboarding.
  function buildBrief({ etappe, values, decisions = [], kontext = null }) {
    const etappenBrief = ETAPPEN_BRIEFS[checkedEtappe(etappe)];
    checkedValues(etappe, etappenBrief, values);
    const sections = [
      etappenBrief.command(values),
      `Etappe \`${etappe}\` einer Session-Kette, geführt von einer Leit-Session.`,
      ['## Werte', ...valueLines(values)].join('\n'),
      ['## Auftrag', ...etappenBrief.auftrag(values).map((line) => `- ${line}`)].join('\n'),
      ...(decisions.length > 0 ? [['## Entscheidungen aus früheren Etappen', ...decisions.map((entry) => `- ${entry.etappe}: ${entry.text}`)].join('\n')] : []),
      ...(etappe === 'whiteboarding' ? [['## Kontext', String(kontext ?? '').trim()].join('\n')] : []),
      baseRules(etappe, values),
    ];
    const background = `Etappe ${etappe} der Session-Kette ${values.slug ?? '(Slug folgt aus der Spec)'}. Die Leit-Session führt die Kette, prüft jedes Ergebnis gegen git und holt an Haltepunkten die Entscheidung des Menschen ein. Diese Session bearbeitet nur ihre Etappe und meldet sich nur über ihr Turn-Ende.`;
    return { modell: etappenBrief.modell, titel: `${etappenBrief.titel} ${values.slug ?? ''}`.trim(), brief: sections.join('\n\n'), hintergrund: background };
  }

  module.exports = { buildBrief, ETAPPEN_BRIEFS, BASE_FILE };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-brief.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/session-chain/base-sub-agent.md plugins/forge/scripts/lib/session-chain-brief.js plugins/forge/tests/session-chain-brief.test.js` · `git commit -m "feat(forge): build stage briefs from base-sub-agent rules"`

---

### Task 8: Einstieg der Kette

**ACs:** AC-03, AC-04, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-58

**Dateien:**
- Modify: `plugins/forge/scripts/forge-config.js` · `module.exports = { ConfigError, DEFAULTS`
- Create: `plugins/forge/scripts/lib/session-chain-entry.js`
- Create: `plugins/forge/tests/session-chain-entry.test.js`

**Interfaces:**
- Consumes: `readConfig(cwd): { config }`, `workitemOf(specPath): string` und `workitemPattern(source): RegExp|null` (in diesem Task exportiert) aus `plugins/forge/scripts/forge-config.js`; `git(repo, args)` aus `plugins/forge/scripts/lib/session-chain-git.js` (Task 5); `slugOfArtifact`, `readState`, `slugByWorktree`, `checkedSlug` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1); `toPosix` aus `plugins/forge/scripts/lib/posix.js`
- Produces: Modul `plugins/forge/scripts/lib/session-chain-entry.js` mit `EntryError` (Klasse, erbt von `Error`); `CODEWORDS`; `analyseEntry(args: string[], cwd: string): { fields: { einstieg, etappe, spec?, plan?, worktree?, slug?, zustand: 'vorhanden'|'neu', wi?, 'frage-wi'?: 'ja', basis?, 'basis-vorschlag'?, 'frage-basis'?: 'ja' }, state: object|null }` (`etappe` ist `go` beim Codewort `implementation`; leeres, `keine` oder ungültiges `Workitem`-Muster der Projekt-Einstellungen heißt „keine Workitem-Nummern“; Spec und Plan mit verschiedenem Slug: `EntryError` `Spec und Plan haben verschiedene Slugs (<a> / <b>); lege beide in denselben Ordner als spec.md und plan.md.`)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-entry.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { toPosix } = require('../scripts/lib/posix');
  const { writeState } = require('../scripts/lib/session-chain-store');
  const { EntryError, analyseEntry } = require('../scripts/lib/session-chain-entry');

  function useWorkitems(repo) {
    commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n- Workitem: AB#<nr>\n', 'docs: config');
  }

  test('analyseEntry_WithoutCodeword_StartsWhiteboardingAndAsksForBase', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const { fields } = analyseEntry([], repo);

    // Assert
    assert.deepEqual(fields, { einstieg: 'ohne', etappe: 'whiteboarding', zustand: 'neu', 'basis-vorschlag': 'main', 'frage-basis': 'ja' });
  });

  test('analyseEntry_EachCodeword_NamesItsFirstEtappe', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();

    // Act
    const etappen = [['grill', spec], ['spec-review', spec], ['planning', spec], ['plan-review', spec, plan], ['implementation', spec, plan], ['finish', repo]]
      .map((args) => analyseEntry(args, repo).fields.etappe);

    // Assert
    assert.deepEqual(etappen, ['grill', 'spec-review', 'planning', 'plan-review', 'go', 'abschluss']);
  });

  test('analyseEntry_PlanReview_NamesAbsoluteSpecPlanAndSlug', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();

    // Act
    const { fields } = analyseEntry(['plan-review', spec, plan], repo);

    // Assert
    assert.equal(fields.spec, toPosix(path.resolve(spec)));
    assert.equal(fields.plan, toPosix(path.resolve(plan)));
    assert.equal(fields.slug, 'x');
  });

  test('analyseEntry_PathMissing_ThrowsNamingThePath', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.throws(() => analyseEntry(['spec-review', 'docs/fehlt/spec.md'], repo), (error) => error instanceof EntryError && error.message === 'Pfad nicht gefunden: docs/fehlt/spec.md');
  });

  test('analyseEntry_UnknownCodeword_ThrowsNamingTheSixCodewords', () => {
    // Arrange
    const repo = makeRepo();

    // Act & Assert
    assert.throws(() => analyseEntry(['review', 'x.md'], repo), (error) => error instanceof EntryError
      && error.message === 'Unbekanntes Codewort: review. Gültige Codewörter: grill, spec-review, planning, plan-review, implementation, finish.');
  });

  test('analyseEntry_SpecWithWorkitemInHeader_TakesItWithoutQuestion', () => {
    // Arrange
    const repo = makeRepo();
    useWorkitems(repo);
    commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n\nStatus: bestätigt\nWorkitem: 311021\n', 'docs: spec');

    // Act
    const { fields } = analyseEntry(['spec-review', path.join(repo, 'docs/forge/x/spec.md')], repo);

    // Assert
    assert.equal(fields.wi, '311021');
    assert.equal(fields['frage-wi'], undefined);
  });

  test('analyseEntry_ProjectWithWorkitemsAndSpecWithout_AsksOnce', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    useWorkitems(repo);

    // Act
    const { fields } = analyseEntry(['planning', spec], repo);

    // Assert
    assert.equal(fields['frage-wi'], 'ja');
    assert.equal(fields.wi, undefined);
  });

  test('analyseEntry_ProjectWithoutWorkitems_NeitherAsksNorNamesOne', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act
    const { fields } = analyseEntry(['planning', spec], repo);

    // Assert
    assert.equal(fields['frage-wi'], undefined);
    assert.equal(fields.wi, undefined);
  });

  test('analyseEntry_WorkitemFromCall_IsTaken', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    useWorkitems(repo);

    // Act
    const { fields } = analyseEntry(['planning', spec, '311021'], repo);

    // Assert
    assert.equal(fields.wi, '311021');
  });

  test('analyseEntry_StateWithBase_TakesBaseAndDoesNotAsk', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    writeState(repo, 'x', { basis: 'dev', offen: [] });

    // Act
    const { fields, state } = analyseEntry(['spec-review', spec], repo);

    // Assert
    assert.equal(fields.zustand, 'vorhanden');
    assert.equal(fields.basis, 'dev');
    assert.equal(fields['frage-basis'], undefined);
    assert.equal(state.basis, 'dev');
  });

  test('analyseEntry_StateWrittenInWorktreeAndNewSessionInMainCheckout_TakesTheState', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/x');
    writeState(worktree, 'x', { basis: 'dev', entscheidungen: [{ etappe: 'spec-nacharbeit', text: 'nur CSV' }], offen: [{ farbe: 'yellow', titel: 'A', herkunft: 'spec-review' }] });

    // Act
    const { state } = analyseEntry(['implementation', spec, plan], repo);

    // Assert
    assert.equal(state.basis, 'dev');
    assert.equal(state.entscheidungen[0].text, 'nur CSV');
    assert.equal(state.offen.length, 1);
  });

  test('analyseEntry_FinishWithoutState_NeitherAsksForBaseNorNeedsState', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    const { fields } = analyseEntry(['finish', worktree], repo);

    // Assert
    assert.equal(fields['frage-basis'], undefined);
    assert.equal(fields.zustand, 'neu');
    assert.equal(fields.slug, path.basename(worktree));
    assert.equal(fields.worktree, toPosix(path.resolve(worktree)));
  });

  test('analyseEntry_FinishWithState_TakesTheSlugOfTheState', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    writeState(repo, 'x', { worktree: toPosix(worktree), basis: 'main' });

    // Act
    const { fields } = analyseEntry(['finish', worktree], repo);

    // Assert
    assert.equal(fields.slug, 'x');
    assert.equal(fields.zustand, 'vorhanden');
  });

  test('analyseEntry_TooManyArguments_ThrowsWithTheExpectedForm', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act & Assert
    assert.throws(() => analyseEntry(['grill', spec, '1', '2'], repo), /grill braucht: <spec> \[workitem-nr\]/);
  });

  test('analyseEntry_SpecAndPlanWithDifferentSlugs_ThrowsNamingBoth', () => {
    // Arrange
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: spec');
    commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n\n### Task 1: Eins\n', 'docs: plan');

    // Act & Assert
    assert.throws(() => analyseEntry(['plan-review', path.join(repo, 'docs/forge/x/spec.md'), path.join(repo, 'docs/forge/y/plan.md')], repo),
      (error) => error instanceof EntryError && error.message === 'Spec und Plan haben verschiedene Slugs (x / y); lege beide in denselben Ordner als spec.md und plan.md.');
  });

  test('analyseEntry_ProjectWithEmptyWorkitemSetting_NeitherAsksNorNamesOne', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    commitFile(repo, 'CLAUDE.md', '# Projekt\n\n## dv-forge\n- Workitem:\n', 'docs: config');

    // Act
    const { fields } = analyseEntry(['planning', spec], repo);

    // Assert
    assert.equal(fields['frage-wi'], undefined);
    assert.equal(fields.wi, undefined);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-entry.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-entry'`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/forge-config.js` die Zeile `module.exports` ersetzen durch:
  ```js
  module.exports = { ConfigError, DEFAULTS, parseSection, readConfig, getValue, show, workitemOf, workitemPattern, branchWorkitem, branchFor, branchCandidates };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-entry.js`:
  ```js
  'use strict';

  // Einstieg der Session-Kette: Codewort und Pfade aus dem Aufruf prüfen, erste Etappe bestimmen, Workitem und Basis-Branch
  // aus Spec-Kopf, Aufruf und Zustand ableiten und sagen, wonach die Leit-Session einmal fragen muss.
  // Geprüft wird nur, ob die Pfade existieren; den Review-Status früherer Etappen prüft der Einstieg nicht.

  const fs = require('node:fs');
  const path = require('node:path');
  const { toPosix } = require('./posix');
  const { readConfig, workitemOf, workitemPattern } = require('../forge-config');
  const { git } = require('./session-chain-git');
  const { slugOfArtifact, readState, slugByWorktree, checkedSlug } = require('./session-chain-store');

  const CODEWORDS = {
    grill: { etappe: 'grill', paths: ['spec'] },
    'spec-review': { etappe: 'spec-review', paths: ['spec'] },
    planning: { etappe: 'planning', paths: ['spec'] },
    'plan-review': { etappe: 'plan-review', paths: ['spec', 'plan'] },
    implementation: { etappe: 'go', paths: ['spec', 'plan'] },
    finish: { etappe: 'abschluss', paths: ['worktree'] },
  };
  const NO_WORKITEM = 'keine';

  class EntryError extends Error {}

  function existing(value, kind) {
    const absolute = path.resolve(value);
    const ok = kind === 'worktree' ? fs.existsSync(absolute) && fs.statSync(absolute).isDirectory() : fs.existsSync(absolute) && fs.statSync(absolute).isFile();
    if (!ok) throw new EntryError(`Pfad nicht gefunden: ${value}`);
    return toPosix(absolute);
  }

  function parseCall(args) {
    if (args.length === 0) return { einstieg: 'ohne', etappe: 'whiteboarding', values: {} };
    const [codeword, ...rest] = args;
    const entry = CODEWORDS[codeword];
    if (!entry) throw new EntryError(`Unbekanntes Codewort: ${codeword}. Gültige Codewörter: ${Object.keys(CODEWORDS).join(', ')}.`);
    if (rest.length < entry.paths.length || rest.length > entry.paths.length + 1) {
      throw new EntryError(`${codeword} braucht: ${entry.paths.map((name) => `<${name}>`).join(' ')} [workitem-nr]`);
    }
    const values = Object.fromEntries(entry.paths.map((name, index) => [name, existing(rest[index], name)]));
    return { einstieg: codeword, etappe: entry.etappe, values, wi: rest[entry.paths.length] };
  }

  function currentBranch(dir) {
    return git(dir, ['branch', '--show-current']).out;
  }

  // Workitem aus dem Spec-Kopf; `Workitem: keine` zählt als keines.
  function workitemOfSpec(spec) {
    const wi = workitemOf(spec);
    return wi && wi !== NO_WORKITEM ? wi : undefined;
  }

  // Wie die Konfigurations-Logik: leer, `keine` oder ein ungültiges Muster heißen „keine Workitem-Nummern“.
  function usesWorkitems(dir) {
    try {
      return workitemPattern(readConfig(dir).config.Workitem) !== null;
    } catch {
      return false;
    }
  }

  // Spec und Plan müssen denselben Slug haben, sonst lägen Zustand und Ablage des Plan-Reviews in verschiedenen Ordnern.
  function slugOfCall(dir, values) {
    if (values.worktree) return slugByWorktree(dir, values.worktree) ?? checkedSlug(path.basename(values.worktree).replace(/[^A-Za-z0-9._-]/g, '-'));
    if (values.spec && values.plan) {
      const [specSlug, planSlug] = [slugOfArtifact({ spec: values.spec }), slugOfArtifact({ plan: values.plan })];
      if (specSlug !== planSlug) throw new EntryError(`Spec und Plan haben verschiedene Slugs (${specSlug} / ${planSlug}); lege beide in denselben Ordner als spec.md und plan.md.`);
    }
    return values.spec || values.plan ? slugOfArtifact(values) : null;
  }

  // `args`: Wörter nach dem Skill-Namen; `cwd`: Ordner der Leit-Session. Rückgabe: Felder für die Zeilen `<Name>=<Wert>`
  // und, bei vorhandenem Zustand, `state`.
  function analyseEntry(args, cwd) {
    const call = parseCall(args);
    const slug = slugOfCall(cwd, call.values);
    const state = slug ? readState(cwd, slug) : null;
    const result = { einstieg: call.einstieg, etappe: call.etappe, ...call.values, ...(slug ? { slug } : {}), zustand: state ? 'vorhanden' : 'neu' };
    const wi = workitemOfSpec(call.values.spec ?? state?.spec) ?? call.wi ?? state?.wi;
    if (wi) result.wi = wi;
    else if (usesWorkitems(cwd)) result['frage-wi'] = 'ja';
    if (state?.basis) result.basis = state.basis;
    else if (call.etappe !== 'abschluss') Object.assign(result, { 'basis-vorschlag': currentBranch(cwd), 'frage-basis': 'ja' });
    return { fields: result, state };
  }

  module.exports = { EntryError, CODEWORDS, analyseEntry };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-entry.test.js plugins/forge/tests/forge-config.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/forge-config.js plugins/forge/scripts/lib/session-chain-entry.js plugins/forge/tests/session-chain-entry.test.js` · `git commit -m "feat(forge): analyse the entry of a session chain"`

---

### Task 9: Commits der Leit-Session

**ACs:** AC-26, AC-33, AC-34, AC-35, AC-62

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-chain-commit.js`
- Create: `plugins/forge/tests/session-chain-commit.test.js`

**Interfaces:**
- Consumes: `SessionChainError` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1); `gitOrThrow`, `toplevel`, `isDirty`, `relative` aus `plugins/forge/scripts/lib/session-chain-git.js` (Task 5)
- Produces: Modul `plugins/forge/scripts/lib/session-chain-commit.js` mit `commitFor(anlass: 'spec'|'go', dir, state, message): { commit: { hash, dateien: string[] } | null, nichtCommittet: string[] }`; wirft `SessionChainError` mit `Aktueller Branch <b> ist nicht der Basis-Branch <B>; die Umsetzung startet nicht.`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-commit.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { git, makeRepo, repoWithPlan } = require('./lib/git-repo');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { commitFor } = require('../scripts/lib/session-chain-commit');

  function committedFiles(repo) {
    return git(repo, 'show', '--name-only', '--format=', 'HEAD').split('\n').filter(Boolean);
  }

  test('commitFor_SpecWithReportedGlossaryAndForeignChange_CommitsOnlyTheGlossary', () => {
    // Arrange
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo, 'CONTEXT.md'), '# Glossar\n');
    fs.writeFileSync(path.join(repo, 'fremd.md'), 'fremd\n');
    const state = { dateien: [{ etappe: 'whiteboarding', pfad: path.join(repo, 'CONTEXT.md') }, { etappe: 'grill', pfad: path.join(repo, 'CONTEXT.md') }] };

    // Act
    const result = commitFor('spec', repo, state, 'docs: glossary');

    // Assert
    assert.deepEqual(result.commit.dateien, ['CONTEXT.md']);
    assert.deepEqual(committedFiles(repo), ['CONTEXT.md']);
    assert.equal(git(repo, 'status', '--porcelain', '--', 'fremd.md'), '?? fremd.md');
  });

  test('commitFor_SpecWithReportedCodeFile_LeavesItAndNamesIt', () => {
    // Arrange
    const repo = makeRepo();
    fs.writeFileSync(path.join(repo, 'a.js'), 'x\n');
    const state = { dateien: [{ etappe: 'grill', pfad: path.join(repo, 'a.js') }] };

    // Act
    const result = commitFor('spec', repo, state, 'docs: glossary');

    // Assert
    assert.equal(result.commit, null);
    assert.deepEqual(result.nichtCommittet, [path.join(repo, 'a.js')]);
    assert.equal(git(repo, 'rev-list', '--count', 'HEAD'), '1');
  });

  test('commitFor_GoWithCommittedSpecAndUncommittedPlan_CommitsOnlyThePlan', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    fs.appendFileSync(plan, '\n### Task 2: Zwei\n');

    // Act
    const result = commitFor('go', repo, { basis: 'main', spec, plan }, 'docs: plan x');

    // Assert
    assert.deepEqual(result.commit.dateien, ['docs/forge/x/plan.md']);
    assert.deepEqual(committedFiles(repo), ['docs/forge/x/plan.md']);
  });

  test('commitFor_GoWithBothCommitted_CreatesNoCommit', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const before = git(repo, 'rev-parse', 'HEAD');

    // Act
    const result = commitFor('go', repo, { basis: 'main', spec, plan }, 'docs: plan x');

    // Assert
    assert.equal(result.commit, null);
    assert.equal(git(repo, 'rev-parse', 'HEAD'), before);
  });

  test('commitFor_GoOnOtherBranchThanBase_ThrowsNamingBothAndCommitsNothing', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    git(repo, 'switch', '--quiet', '-c', 'feature/x');
    fs.appendFileSync(plan, 'mehr\n');

    // Act & Assert
    assert.throws(() => commitFor('go', repo, { basis: 'dev', spec, plan }, 'docs: plan x'),
      (error) => error instanceof SessionChainError && error.message === 'Aktueller Branch feature/x ist nicht der Basis-Branch dev; die Umsetzung startet nicht.');
    assert.equal(git(repo, 'status', '--porcelain', '--', 'docs/forge/x/plan.md'), 'M docs/forge/x/plan.md');
  });

  test('commitFor_AnyCommit_ContainsOnlyMarkdownFiles', () => {
    // Arrange
    const repo = makeRepo();
    for (const name of ['CONTEXT.md', 'adr.md', 'tool.js']) fs.writeFileSync(path.join(repo, name), 'x\n');
    const state = { dateien: ['CONTEXT.md', 'adr.md', 'tool.js'].map((name) => ({ etappe: 'grill', pfad: path.join(repo, name) })) };

    // Act
    commitFor('spec', repo, state, 'docs: glossary');

    // Assert
    assert.ok(committedFiles(repo).every((file) => file.endsWith('.md')));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-commit.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-commit'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/session-chain-commit.js`:
  ```js
  'use strict';

  // Commits der Leit-Session, auf Pfade beschränkt: am Spec-Haltepunkt die von Whiteboarding und Grill gemeldeten Glossar- und
  // ADR-Dateien, nach dem GO das noch Uncommittete von Spec und Plan. Die Leit-Session committet nur Markdown-Dateien;
  // eine andere gemeldete Datei bleibt liegen und wird genannt. Vor dem GO-Commit muss der Basis-Branch ausgecheckt sein.

  const { SessionChainError } = require('./session-chain-store');
  const { gitOrThrow: git, toplevel, isDirty, relative } = require('./session-chain-git');

  const MARKDOWN = /\.md$/i;
  const GLOSSARY_ETAPPEN = ['whiteboarding', 'grill'];

  // Commit genau dieser Dateien; nur solche mit Änderungen. Rückgabe: { hash, dateien } oder null ohne Änderung.
  function commitPaths(repo, files, message) {
    const dirty = files.filter((file) => isDirty(repo, file));
    if (dirty.length === 0) return null;
    git(repo, ['add', '--', ...dirty]);
    git(repo, ['commit', '--quiet', '-m', message, '--', ...dirty]);
    return { hash: git(repo, ['rev-parse', '--short', 'HEAD']), dateien: dirty.map((file) => relative(repo, file)) };
  }

  // Gemeldete Dateien aus Whiteboarding und Grill (Zustand `dateien`), getrennt in Markdown und Rest.
  function glossaryFiles(state) {
    const reported = [...new Set((state.dateien ?? []).filter((entry) => GLOSSARY_ETAPPEN.includes(entry.etappe)).map((entry) => entry.pfad))];
    return { md: reported.filter((file) => MARKDOWN.test(file)), andere: reported.filter((file) => !MARKDOWN.test(file)) };
  }

  // `anlass`: spec | go; `dir`: Ordner im Haupt-Checkout. Rückgabe: { commit, nichtCommittet }.
  function commitFor(anlass, dir, state, message) {
    const repo = toplevel(dir);
    if (anlass === 'spec') {
      const { md, andere } = glossaryFiles(state);
      return { commit: commitPaths(repo, md, message), nichtCommittet: andere };
    }
    if (anlass !== 'go') throw new SessionChainError(`Anlass unbekannt: ${anlass} (erlaubt: spec, go)`);
    const branch = git(repo, ['branch', '--show-current']);
    if (branch !== state.basis) throw new SessionChainError(`Aktueller Branch ${branch || '(keiner)'} ist nicht der Basis-Branch ${state.basis}; die Umsetzung startet nicht.`);
    return { commit: commitPaths(repo, [state.spec, state.plan].filter(Boolean), message), nichtCommittet: [] };
  }

  module.exports = { commitFor };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-commit.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-commit.js plugins/forge/tests/session-chain-commit.test.js` · `git commit -m "feat(forge): commit glossary and plan files for the session chain lead"`

---

### Task 10: Berichtsdatei, `final`, Haltepunkt und Schlussbericht

**ACs:** AC-17, AC-22, AC-29, AC-30, AC-40, AC-41, AC-49, AC-51, AC-58, AC-59, AC-63

**Dateien:**
- Create: `plugins/forge/scripts/lib/session-chain-report.js`
- Create: `plugins/forge/tests/session-chain-report.test.js`
- Create: `plugins/forge/scripts/lib/session-chain-steps.js`
- Create: `plugins/forge/tests/session-chain-steps.test.js`

**Interfaces:**
- Consumes: aus `session-chain-store.js` (Task 1) `SessionChainError`, `checkedEtappe`, `slugOfArtifact`, `readState`, `writeState`; aus `session-chain-ablage.js` (Task 1) `ablageDir`, `storeFiles`; aus `session-chain-git.js` (Task 5) `toplevel`; aus `session-chain-points.js` (Task 2) `readParts`, `openPoints`, `mergePoints`; aus `session-chain-decide.js` (Task 3) `resultOf`, `recommendation`, `nextStep`; aus `session-chain-check.js` (Task 5) `checkFinal`; aus `session-chain-text.js` (Task 6) `specHalt`, `goHalt`, `showstopperText`, `deviationText`, `finalReport`; `toPosix` aus `plugins/forge/scripts/lib/posix.js`
- Produces: Modul `plugins/forge/scripts/lib/session-chain-report.js` (Berichtsdatei einer Etappe, läuft in der Etappen-Session) mit `etappeReport({ etappe, slug?, spec?, bericht?, entscheidungen: string[], dateien: string[], tests?, anhang: string[], plan?, worktree?, branch?, pruefung?, luecken: string[], acOhneTest: string[] }, cwd): string` (Pfad von `bericht.md`; zeigt `bericht` auf eine `.json`, gilt die `.md` gleichen Namens daneben); `readInput(file, label): string` (Lesefehler: `SessionChainError` `<label> nicht lesbar: <pfad>`); `readData(bericht): { data: object, hash: string }` (`bericht.json` neben `bericht`, `hash` = SHA-1 des Dateitexts; Fehler `Bericht-Daten nicht lesbar: <pfad>` bzw. `Bericht-Daten kein JSON: <pfad>`); `REPORT_FILE = 'bericht.md'`; `DATA_FILE = 'bericht.json'`
- Produces: Modul `plugins/forge/scripts/lib/session-chain-steps.js` (Schritte der Leit-Session) mit `setState({ slug, basis?, wi?, spec?, plan?, worktree?, branch? }, cwd): object`; `haltText(state, art: 'spec'|'go'): string`; `holdAt(slug, art: 'spec'|'go', cwd): string` (schreibt `halt: art` in den Zustand, gibt den Block zurück); `processFinal({ etappe, session, bericht, commit, basis?, wi? }, cwd): { slug, ergebnis: 'ok'|'abweichung', weiter: string, haltepunkt: 'spec'|'go'|'showstopper'|'abweichung'|'keiner', geprueft: string[], text: string }` (`weiter` ist eine Etappe, `halt`, `ende` oder `doppelt`; `doppelt` heißt: dieses `final` mit gleichem Schlüssel aus Session, Etappe, Commit und Hash der Bericht-Daten ist schon verarbeitet, der Zustand bleibt unverändert; bei `planning` hält ein Plan, dessen Slug nicht der Slug der Kette ist, als Abweichung); `closing(slug, stopp: boolean, cwd): string`; `recordCommit(slug, commit: { hash, dateien }, anlass, cwd): object`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/session-chain-report.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { repoWithPlan } = require('./lib/git-repo');
  const { SessionChainError } = require('../scripts/lib/session-chain-store');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');
  const { etappeReport, readData } = require('../scripts/lib/session-chain-report');

  const EMPTY = { entscheidungen: [], dateien: [], anhang: [], luecken: [], acOhneTest: [] };

  function scratch(name, text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-sc-')), name);
    fs.writeFileSync(file, text);
    return file;
  }

  test('etappeReport_AllParts_WritesFullReportDecisionsFilesAndTestCounts', () => {
    // Arrange
    const { repo } = repoWithPlan();
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');

    // Act
    const file = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss, entscheidungen: ['nur CSV'], dateien: [path.join(repo, 'CONTEXT.md')], tests: '12 grün' }, repo);

    // Assert
    const text = fs.readFileSync(file, 'utf8');
    for (const part of ['# Bericht der Etappe planning\n# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung', '# Entscheidungen des Menschen\n- nur CSV', '/CONTEXT.md`', '# Testzahlen\n12 grün']) {
      assert.ok(text.includes(part), part);
    }
    assert.equal(path.dirname(file), ablageDir(repo, 'x', 'planning').replace(/\\/g, '/'));
  });

  test('etappeReport_WhiteboardingWithoutReport_TakesSlugFromSpecAndSaysSo', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();

    // Act
    const file = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec }, repo);

    // Assert
    assert.ok(fs.readFileSync(file, 'utf8').includes('Kein Bericht des Skills.'));
    assert.equal(readData(file).data.slug, 'x');
  });

  test('etappeReport_JsonPath_ReadsSiblingMarkdown', () => {
    // Arrange
    const { repo } = repoWithPlan();
    const markdown = scratch('bericht-followup-1.md', '# Review-Followup\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
    fs.writeFileSync(markdown.replace(/\.md$/, '.json'), '{}');

    // Act
    const file = etappeReport({ ...EMPTY, etappe: 'plan-review', slug: 'x', bericht: markdown.replace(/\.md$/, '.json') }, repo);

    // Assert
    assert.equal(readData(file).data.ergebnis, '✅ Bereit zur Umsetzung');
    assert.ok(fs.readFileSync(file, 'utf8').includes('# Review-Followup'));
  });

  test('etappeReport_MissingBericht_ThrowsWithPathAndWritesNothing', () => {
    // Arrange
    const { repo } = repoWithPlan();
    const missing = path.join(repo, 'fehlt.md');

    // Act & Assert
    assert.throws(() => etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: missing }, repo),
      (error) => error instanceof SessionChainError && error.message === `Bericht nicht lesbar: ${path.resolve(missing).replace(/\\/g, '/')}`);
    assert.equal(fs.existsSync(ablageDir(repo, 'x', 'planning')), false);
  });

  test('readData_BrokenJson_ThrowsWithPath', () => {
    // Arrange
    const bericht = scratch('bericht.md', '# Bericht\n');
    fs.writeFileSync(path.join(path.dirname(bericht), 'bericht.json'), '{kaputt');

    // Act & Assert
    assert.throws(() => readData(bericht), (error) => error instanceof SessionChainError && error.message.startsWith('Bericht-Daten kein JSON: '));
  });

  test('readData_SameData_ReturnsTheSameHash', () => {
    // Arrange
    const first = scratch('bericht.md', '# Bericht\n');
    const second = scratch('bericht.md', '# Bericht\n');
    for (const file of [first, second]) fs.writeFileSync(path.join(path.dirname(file), 'bericht.json'), '{"etappe":"grill"}\n');

    // Act
    const hashes = [first, second].map((file) => readData(file).hash);

    // Assert
    assert.equal(hashes[0], hashes[1]);
    assert.match(hashes[0], /^[0-9a-f]{40}$/);
  });
  ```
  Datei `plugins/forge/tests/session-chain-steps.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { readState, writeState } = require('../scripts/lib/session-chain-store');
  const { storeFiles } = require('../scripts/lib/session-chain-ablage');
  const { etappeReport } = require('../scripts/lib/session-chain-report');
  const { setState, haltText, holdAt, processFinal, closing, recordCommit } = require('../scripts/lib/session-chain-steps');

  const EMPTY = { entscheidungen: [], dateien: [], anhang: [], luecken: [], acOhneTest: [] };

  function scratch(name, text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-sc-')), name);
    fs.writeFileSync(file, text);
    return file;
  }

  function yellow(key, title) {
    return { key, color: 'yellow', title };
  }

  // Spec-Review-Etappe mit Abschlussbericht und Bericht-Daten in der Ablage, wie ein Orchestrator mit `--ablage` sie ablegt.
  function specReviewEtappe(repo, spec, result, open) {
    const abschluss = scratch('abschluss.md', `# Abschlussbericht\n**Ergebnis:** ${result}\n`);
    storeFiles({ dir: repo, slug: 'x', etappe: 'spec-review', files: [abschluss, scratch('bericht-review.json', JSON.stringify({ open, green: [], changes: [] }))], fresh: true });
    return etappeReport({ ...EMPTY, etappe: 'spec-review', slug: 'x', bericht: abschluss }, repo);
  }

  test('processFinal_SpecReviewReadyWithThreeHints_HoldsAtSpecHaltepunktRecommendingPlanning', () => {
    // Arrange
    const repo = makeRepo();
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    setState({ slug: 'x', basis: 'main', spec }, repo);
    const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen · 3 kleine Hinweise offen', [yellow('a', 'A'), yellow('b', 'B'), yellow('c', 'C')]);

    // Act
    const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

    // Assert
    assert.equal(result.haltepunkt, 'spec');
    assert.ok(result.text.includes('**Empfehlung:** Planning'));
    for (const title of ['A', 'B', 'C']) assert.ok(result.text.includes(`- 🟡 ${title} · spec-review`), title);
  });

  test('processFinal_SpecReviewWithoutCommitAndUncommittedSpec_HoldsAndNamesTheSpec', () => {
    // Arrange
    const repo = makeRepo();
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Spec\n');
    setState({ slug: 'x', basis: 'main', spec }, repo);
    const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);

    // Act
    const result = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit: 'none' }, repo);

    // Assert
    assert.equal(result.ergebnis, 'abweichung');
    assert.equal(result.haltepunkt, 'abweichung');
    assert.ok(result.text.includes('- docs/forge/x/spec.md ist uncommittet'));
  });

  test('processFinal_SameFinalTwice_ProcessesItOnce', () => {
    // Arrange
    const repo = makeRepo();
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    setState({ slug: 'x', basis: 'main', spec }, repo);
    const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);
    processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

    // Act
    const again = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

    // Assert
    assert.deepEqual(again, { slug: 'x', ergebnis: 'ok', weiter: 'doppelt', haltepunkt: 'keiner', geprueft: [], text: '' });
    assert.equal(readState(repo, 'x').etappen.length, 1);
  });

  test('processFinal_SameSessionNewCommit_ProcessesAgain', () => {
    // Arrange
    const repo = makeRepo();
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    fs.writeFileSync(spec, '# Spec\n');
    setState({ slug: 'x', basis: 'main', spec }, repo);
    const bericht = specReviewEtappe(repo, spec, '✅ Bereit zum Planen', []);
    processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit: 'none' }, repo);
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');

    // Act
    const again = processFinal({ etappe: 'spec-review', session: 'local_s', bericht, commit }, repo);

    // Assert
    assert.equal(again.haltepunkt, 'spec');
    assert.equal(readState(repo, 'x').etappen.length, 2);
  });

  test('processFinal_Whiteboarding_CreatesStateWithSpecBaseAndStartsGrill', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    const bericht = etappeReport({ ...EMPTY, etappe: 'whiteboarding', spec, dateien: [path.join(repo, 'CONTEXT.md')] }, repo);

    // Act
    const result = processFinal({ etappe: 'whiteboarding', session: 'local_w', bericht, commit: 'none', basis: 'main' }, repo);

    // Assert
    assert.equal(result.weiter, 'grill');
    const state = readState(repo, 'x');
    assert.equal(state.basis, 'main');
    assert.equal(state.spec, spec.replace(/\\/g, '/'));
    assert.equal(state.dateien[0].etappe, 'whiteboarding');
  });

  test('processFinal_UmsetzungReadyButAcWithoutTest_IsShowstopperNamingTheAc', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');
    setState({ slug: 'x', basis: 'main' }, repo);
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Abschließen\n');
    const bericht = etappeReport({ ...EMPTY, etappe: 'umsetzung', slug: 'x', bericht: abschluss, worktree, branch: 'feature/x', pruefung: 'gruen', acOhneTest: ['AC-05'] }, repo);

    // Act
    const result = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht, commit: git(worktree, 'rev-parse', 'HEAD') }, repo);

    // Assert
    assert.equal(result.haltepunkt, 'showstopper');
    assert.ok(result.text.includes('- AC-05 hat keinen beweisenden Test'));
    assert.ok(result.text.includes('[Session](#local_u)'));
  });

  test('processFinal_UmsetzungIntegrationPointWithoutTestAsYellow_StartsAbschlussAndListsTheYellow', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');
    commitFile(worktree, 'src/a.js', 'a\n', 'feat: a');
    setState({ slug: 'x', basis: 'main' }, repo);
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Abschließen · 1 kleiner Hinweis offen\n');
    storeFiles({ dir: repo, slug: 'x', etappe: 'umsetzung', files: [scratch('bericht-review.json', JSON.stringify({ open: [yellow('i', 'Integrationspunkt ohne Test')] }))], fresh: true });
    const bericht = etappeReport({ ...EMPTY, etappe: 'umsetzung', slug: 'x', bericht: abschluss, worktree, branch: 'feature/x', pruefung: 'gruen' }, repo);

    // Act
    const result = processFinal({ etappe: 'umsetzung', session: 'local_u', bericht, commit: git(worktree, 'rev-parse', 'HEAD') }, repo);

    // Assert
    assert.equal(result.weiter, 'abschluss');
    assert.deepEqual(readState(repo, 'x').offen.map((point) => point.titel), ['Integrationspunkt ohne Test']);
  });

  test('haltText_GoWithoutPlanReview_HasNoResultLine', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    const state = setState({ slug: 'x', basis: 'main', spec, plan }, repo);

    // Act
    const text = haltText(state, 'go');

    // Assert
    assert.ok(!text.includes('**Ergebnis:**'));
    assert.ok(text.includes('**Empfehlung:** GO'));
    assert.ok(text.includes(`--base main`));
  });

  test('haltText_GoAfterBlockedPlanReview_RecommendsPlanNacharbeit', () => {
    // Arrange
    const state = { spec: 's', plan: 'p', basis: 'main', offen: [], etappen: [{ etappe: 'plan-review', ergebnis: '⛔ Noch nicht bereit · 1 Hindernis offen' }] };

    // Act
    const text = haltText(state, 'go');

    // Assert
    assert.ok(text.includes('**Ergebnis:** ⛔ Noch nicht bereit · 1 Hindernis offen'));
    assert.ok(text.includes('**Empfehlung:** Plan-Nacharbeit'));
  });

  test('holdAt_GoOnStateWithOldSpecHalt_OverwritesHaltAndShowsGo', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    writeState(repo, 'x', { halt: 'spec', basis: 'main', spec, plan, offen: [] });

    // Act
    const text = holdAt('x', 'go', repo);

    // Assert
    assert.ok(text.startsWith('# GO-Haltepunkt'));
    assert.equal(readState(repo, 'x').halt, 'go');
  });

  test('closing_StoppAfterHoldAtGoWithoutFinal_NamesImplementationResume', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    setState({ slug: 'x', basis: 'main', spec, plan }, repo);
    holdAt('x', 'go', repo);

    // Act
    const text = closing('x', true, repo);

    // Assert
    const [specPath, planPath] = [spec, plan].map((file) => path.resolve(file).replace(/\\/g, '/'));
    assert.ok(text.includes(`## Fortsetzen\n/dv-forge:session-orchestrator implementation ${specPath} ${planPath}`));
  });

  test('closing_StoppAtSpecHaltepunkt_NamesResumeCodewordAndMarksState', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { halt: 'spec', spec: 'C:/r/spec.md', etappen: [], offen: [] });

    // Act
    const text = closing('x', true, repo);

    // Assert
    assert.ok(text.includes('## Fortsetzen\n/dv-forge:session-orchestrator planning C:/r/spec.md'));
    assert.equal(readState(repo, 'x').gestoppt, true);
  });

  test('recordCommit_LeitSessionCommit_AppearsUnderCheckedInTheFinalReport', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { etappen: [], offen: [] });

    // Act
    recordCommit('x', { hash: 'abc1234', dateien: ['docs/forge/x/plan.md'] }, 'go', repo);

    // Assert
    const text = closing('x', false, repo);
    assert.ok(text.slice(text.indexOf('## Geprüft'), text.indexOf('## Gemeldet')).includes('- leit-session: Commit abc1234: docs/forge/x/plan.md'));
  });

  test('processFinal_PlanningWithPlanOfOtherSlug_HoldsNamingBothSlugs', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    commitFile(repo, 'docs/forge/y/plan.md', '# Plan\n\n### Task 1: Eins\n', 'docs: plan y');
    setState({ slug: 'x', basis: 'main', spec }, repo);
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zur Umsetzung\n');
    const bericht = etappeReport({ ...EMPTY, etappe: 'planning', slug: 'x', bericht: abschluss, plan: path.join(repo, 'docs/forge/y/plan.md') }, repo);

    // Act
    const result = processFinal({ etappe: 'planning', session: 'local_p', bericht, commit: 'none' }, repo);

    // Assert
    assert.equal(result.haltepunkt, 'abweichung');
    assert.ok(result.text.includes('hat den Slug y, die Kette den Slug x'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-report.test.js plugins/forge/tests/session-chain-steps.test.js` — erwartet: FAIL (`Cannot find module '../scripts/lib/session-chain-report'`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/lib/session-chain-report.js`:
  ```js
  'use strict';

  // Berichtsdatei einer Etappe, geschrieben in der Etappen-Session: bericht.md mit vollem Bericht, Entscheidungen,
  // Glossar-/ADR-Dateien und Testzahlen, daneben bericht.json für die Leit-Session, beide in der Ablage der Etappe.
  // Jede übergebene Datei wird über readInput gelesen; ein Lesefehler nennt den Pfad, statt mit einem Stacktrace zu enden.

  const fs = require('node:fs');
  const path = require('node:path');
  const crypto = require('node:crypto');
  const { toPosix } = require('./posix');
  const { SessionChainError, checkedEtappe, slugOfArtifact } = require('./session-chain-store');
  const { ablageDir, storeFiles } = require('./session-chain-ablage');
  const { resultOf } = require('./session-chain-decide');

  const REPORT_FILE = 'bericht.md';
  const DATA_FILE = 'bericht.json';
  const NONE = 'Keine.';
  const VALUE_KEYS = ['spec', 'plan', 'worktree', 'branch'];
  const JSON_FILE = /\.json$/i;

  // Text einer übergebenen Datei; `label` nennt sie in der Meldung.
  function readInput(file, label) {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      throw new SessionChainError(`${label} nicht lesbar: ${toPosix(path.resolve(file))}`);
    }
  }

  function absolute(value) {
    return value ? toPosix(path.resolve(value)) : undefined;
  }

  function list(lines, render) {
    return lines.length > 0 ? lines.map(render) : [NONE];
  }

  function checkLines(input) {
    if (!input.pruefung) return [];
    return ['', '# Prüfung', `Prüfergebnis: ${input.pruefung}`, ...input.luecken.map((befehl) => `Umgebungslücke: ${befehl}`), ...input.acOhneTest.map((ac) => `Ohne beweisenden Test: ${ac}`)];
  }

  // Voller Bericht des Skills. Zeigt `bericht` auf Bericht-Daten (.json) eines Reviews, gilt der Bericht (.md) gleichen Namens daneben.
  function reportText(bericht) {
    if (!bericht) return 'Kein Bericht des Skills.';
    const file = JSON_FILE.test(bericht) ? bericht.replace(JSON_FILE, '.md') : bericht;
    return readInput(file, 'Bericht').replace(/\r\n/g, '\n').trimEnd();
  }

  // `cwd`: Ordner im Repo. Rückgabe: Pfad von bericht.md. Erst lesen, dann schreiben: ein Lesefehler legt nichts ab.
  function etappeReport(input, cwd) {
    const etappe = checkedEtappe(input.etappe);
    const slug = input.slug ?? slugOfArtifact({ spec: input.spec });
    const dir = input.spec ? path.dirname(path.resolve(input.spec)) : cwd;
    const text = reportText(input.bericht);
    const target = input.anhang.length > 0 ? storeFiles({ dir, slug, etappe, files: input.anhang }) : toPosix(ablageDir(dir, slug, etappe));
    const dateien = input.dateien.map(absolute);
    const report = [
      `# Bericht der Etappe ${etappe}`, text, '',
      '# Entscheidungen des Menschen', ...list(input.entscheidungen, (entry) => `- ${entry}`), '',
      '# Geänderte Glossar- und ADR-Dateien', ...list(dateien, (file) => `- \`${file}\``), '',
      '# Testzahlen', input.tests ?? NONE,
      ...checkLines(input),
    ].join('\n');
    const data = {
      etappe, slug, ergebnis: resultOf(text), entscheidungen: input.entscheidungen, dateien, tests: input.tests,
      pruefung: input.pruefung, luecken: input.luecken, acOhneTest: input.acOhneTest,
      ...Object.fromEntries(VALUE_KEYS.map((key) => [key, key === 'branch' ? input[key] : absolute(input[key])])),
    };
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, REPORT_FILE), `${report}\n`);
    fs.writeFileSync(path.join(target, DATA_FILE), `${JSON.stringify(data, null, 2)}\n`);
    return toPosix(path.join(target, REPORT_FILE));
  }

  // Bericht-Daten neben `bericht` und ihr Hash (SHA-1 des Dateitexts), an dem die Leit-Session ein schon verarbeitetes `final` erkennt.
  function readData(bericht) {
    const file = path.join(path.dirname(path.resolve(bericht)), DATA_FILE);
    const raw = readInput(file, 'Bericht-Daten');
    try {
      return { data: JSON.parse(raw), hash: crypto.createHash('sha1').update(raw).digest('hex') };
    } catch {
      throw new SessionChainError(`Bericht-Daten kein JSON: ${toPosix(file)}`);
    }
  }

  module.exports = { etappeReport, readInput, readData, REPORT_FILE, DATA_FILE };
  ```
  Datei `plugins/forge/scripts/lib/session-chain-steps.js`:
  ```js
  'use strict';

  // Schritte der Leit-Session, die Zustand und Ablage verbinden: Zustand setzen, Haltepunkt zeigen und im Zustand festhalten,
  // ein `final` verarbeiten (Prüfung gegen git, offene Punkte, nächster Schritt), Schlussbericht zeigen, eigene Commits festhalten.
  // Die Berichtsdatei einer Etappe schreibt session-chain-report.js in der Etappen-Session.

  const path = require('node:path');
  const { toPosix } = require('./posix');
  const { SessionChainError, checkedEtappe, slugOfArtifact, readState, writeState } = require('./session-chain-store');
  const { toplevel } = require('./session-chain-git');
  const { readParts, openPoints, mergePoints } = require('./session-chain-points');
  const { recommendation, nextStep } = require('./session-chain-decide');
  const { checkFinal } = require('./session-chain-check');
  const { specHalt, goHalt, showstopperText, deviationText, finalReport } = require('./session-chain-text');
  const { readData } = require('./session-chain-report');

  const VALUE_KEYS = ['spec', 'plan', 'worktree', 'branch'];
  const PLAN_RESULTS = ['planning', 'plan-review'];

  function emptyState(slug) {
    return { slug, etappen: [], offen: [], entscheidungen: [], dateien: [], commits: [] };
  }

  function absolute(value) {
    return value ? toPosix(path.resolve(value)) : undefined;
  }

  function stateOf(cwd, slug) {
    const state = readState(cwd, slug);
    if (!state) throw new SessionChainError(`Kein Zustand für ${slug}`);
    return state;
  }

  // Legt den Zustand an oder ergänzt ihn um die übergebenen Werte (Basis-Branch, Workitem, Pfade).
  function setState(input, cwd) {
    const state = readState(cwd, input.slug) ?? emptyState(input.slug);
    for (const key of ['basis', 'wi', 'branch']) if (input[key]) state[key] = input[key];
    for (const key of ['spec', 'plan', 'worktree']) if (input[key]) state[key] = absolute(input[key]);
    return writeState(cwd, input.slug, state);
  }

  function lastResult(state, etappen) {
    return [...(state.etappen ?? [])].reverse().find((entry) => etappen.includes(entry.etappe))?.ergebnis ?? null;
  }

  // Block des Haltepunkts `art` (spec | go) aus dem Zustand.
  function haltText(state, art) {
    if (art === 'spec') {
      const result = lastResult(state, ['spec-review']);
      return specHalt({ result, recommendation: recommendation('spec', result), points: state.offen });
    }
    const result = lastResult(state, PLAN_RESULTS);
    return goHalt({ spec: state.spec, plan: state.plan, wi: state.wi, basis: state.basis, result, recommendation: recommendation('go', result), points: state.offen });
  }

  // Zeigt den Haltepunkt `art` und hält ihn im Zustand fest, damit ein Stopp das passende Codewort nennt; auch beim
  // Einstieg `implementation`, der ohne `final` am GO-Haltepunkt beginnt.
  function holdAt(slug, art, cwd) {
    const state = { ...stateOf(cwd, slug), halt: art };
    writeState(cwd, slug, state);
    return haltText(state, art);
  }

  // Ein Plan mit anderem Slug als die Kette landet mit seinen Berichten in einer fremden Ablage: Das hält die Kette.
  function slugDeviations(data) {
    if (!data.plan) return [];
    const planSlug = slugOfArtifact({ plan: data.plan });
    return planSlug === data.slug ? [] : [`Plan ${data.plan} hat den Slug ${planSlug}, die Kette den Slug ${data.slug}; Spec und Plan gehören als spec.md und plan.md in denselben Ordner`];
  }

  // Schlüssel eines `final`: Session, Etappe, Commit und Hash der Bericht-Daten. Jedes Turn-Ende nach dem `final` trägt die
  // Statuszeile erneut; derselbe Schlüssel zählt nur einmal. Ein neuer Commit oder neue Bericht-Daten derselben Session
  // (etwa nach einem geklärten Showstopper) ergeben einen neuen Schlüssel.
  function finalKey(input, etappe, hash) {
    return [input.session, etappe, input.commit, hash].join('|');
  }

  function blockFor(next, state, context) {
    if (next.halt === 'abweichung') return deviationText(context);
    if (next.halt === 'showstopper') return showstopperText({ gruende: next.gruende, session: context.session });
    if (next.halt) return haltText(state, next.halt);
    if (next.ende) return finalReport(state);
    return '';
  }

  // Verarbeitet das `final` einer Etappe. `input`: etappe, session, bericht, commit, basis, wi; `cwd`: Haupt-Checkout.
  // Ein schon verarbeitetes `final` (gleicher Schlüssel) ändert nichts und liefert `weiter: 'doppelt'`.
  function processFinal(input, cwd) {
    const etappe = checkedEtappe(input.etappe);
    const { data, hash } = readData(input.bericht);
    if (data.etappe !== etappe) throw new SessionChainError(`Berichtsdatei gehört zur Etappe ${data.etappe}, nicht zu ${etappe}`);
    const state = readState(cwd, data.slug) ?? emptyState(data.slug);
    const schluessel = finalKey(input, etappe, hash);
    if ((state.etappen ?? []).some((entry) => entry.schluessel === schluessel)) {
      return { slug: data.slug, ergebnis: 'ok', weiter: 'doppelt', haltepunkt: 'keiner', geprueft: [], text: '' };
    }
    for (const key of VALUE_KEYS) if (data[key]) state[key] = data[key];
    if (input.basis && !state.basis) state.basis = input.basis;
    if (input.wi && !state.wi) state.wi = input.wi;
    const checked = checkFinal(etappe, toplevel(cwd), {
      commit: input.commit, spec: state.spec, plan: state.plan, dateien: data.dateien ?? [], branch: state.branch, basis: state.basis, worktree: state.worktree,
    });
    const check = { ...checked, abweichungen: [...checked.abweichungen, ...slugDeviations(data)] };
    state.offen = mergePoints(state.offen, etappe, openPoints(readParts(path.dirname(path.resolve(input.bericht))), etappe));
    state.etappen = [...(state.etappen ?? []), {
      etappe, session: input.session, ergebnis: data.ergebnis, tests: data.tests, commit: input.commit, geprueft: check.geprueft, bericht: toPosix(path.resolve(input.bericht)), schluessel,
    }];
    state.entscheidungen = [...(state.entscheidungen ?? []), ...(data.entscheidungen ?? []).map((text) => ({ etappe, text }))];
    state.dateien = [...(state.dateien ?? []), ...(data.dateien ?? []).map((pfad) => ({ etappe, pfad }))];
    const next = check.abweichungen.length > 0
      ? { halt: 'abweichung' }
      : nextStep(etappe, { result: data.ergebnis, pruefung: data.pruefung, luecken: data.luecken ?? [], acOhneTest: data.acOhneTest ?? [] });
    state.etappe = etappe;
    state.halt = next.halt ?? null;
    writeState(cwd, data.slug, state);
    return {
      slug: data.slug, ergebnis: check.abweichungen.length > 0 ? 'abweichung' : 'ok', weiter: next.start ?? (next.halt ? 'halt' : 'ende'),
      haltepunkt: next.halt ?? 'keiner', geprueft: check.geprueft, text: blockFor(next, state, { etappe, abweichungen: check.abweichungen, session: input.session }),
    };
  }

  // Schlussbericht; `stopp` hält den Zustand als gestoppt fest und nennt das Codewort für den späteren Einstieg.
  function closing(slug, stopp, cwd) {
    const state = stateOf(cwd, slug);
    if (stopp) writeState(cwd, slug, { ...state, gestoppt: true });
    return finalReport(state, { stopp });
  }

  // Hält einen Commit der Leit-Session im Zustand fest (Abschnitt „Geprüft“ des Schlussberichts).
  function recordCommit(slug, commit, anlass, cwd) {
    const state = stateOf(cwd, slug);
    return writeState(cwd, slug, { ...state, commits: [...(state.commits ?? []), { etappe: 'leit-session', anlass, ...commit }] });
  }

  module.exports = { setState, haltText, holdAt, processFinal, closing, recordCommit };
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-report.test.js plugins/forge/tests/session-chain-steps.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/session-chain-report.js plugins/forge/tests/session-chain-report.test.js plugins/forge/scripts/lib/session-chain-steps.js plugins/forge/tests/session-chain-steps.test.js` · `git commit -m "feat(forge): process stage reports and finals of a session chain"`

---

### Task 11: Kommandozeile `session-chain.js`

**ACs:** AC-09, AC-10, AC-15, AC-35, AC-48, AC-52, AC-57, AC-59

**Dateien:**
- Create: `plugins/forge/scripts/session-chain.js`
- Create: `plugins/forge/tests/session-chain-cli.test.js`

**Interfaces:**
- Consumes: `analyseEntry`, `EntryError` (Task 8); `buildBrief` (Task 7); `parseStatusLine`, `turnAction`, `readTurns`, `writeTurns` (Task 4); `commitFor` (Task 9); `goCall`, `adoptedText`, `noStatusHint` (Task 6); `etappeReport`, `readInput` aus `session-chain-report.js` und `setState`, `holdAt`, `processFinal`, `closing`, `recordCommit` aus `session-chain-steps.js` (Task 10); `SessionChainError`, `slugOfArtifact`, `readState` aus `session-chain-store.js` und `storeFiles` aus `session-chain-ablage.js` (Task 1)
- Produces: CLI `session-chain.js` mit den Befehlen `entry`, `set`, `brief`, `turn`, `final`, `halt`, `commit`, `schluss`, `store`, `etappe-report`; Fehler Exit 1 mit der Meldung allein (auch für eine nicht lesbare übergebene Datei, `<Art> nicht lesbar: <pfad>`). Aufrufe und Ausgaben:
  - `entry [<codewort> <pfade>... [workitem-nr]]` → Zeilen `<name>=<wert>` aus `analyseEntry`, bei Zustand `=== ZUSTAND ===` und Block
  - `set --slug <s> [--basis] [--wi] [--spec] [--plan] [--worktree]` → `ZUSTAND=<slug>`; ohne `--basis` bleibt der Basis-Branch ungesetzt (Einstieg `finish` ohne Zustand)
  - `brief --etappe <e> [--slug] [--kontext <datei>] [--quelle <datei>] [--basis] [--wi]` → `MODELL=…`, `TITEL=…`, `=== HINTERGRUND ===`, Text, `=== BRIEF ===`, Text; fehlt ein Pflichtwert der Etappe, Exit 1 mit `Etappe <e>: <wert> fehlt`
  - `turn --session <id> --etappe <e> --turn-datei <datei>` → `AKTION=…`, bei Statuszeile `ETAPPE=`, `STATUS=`, `ROT=`, `GELB=`, `COMMIT=`, `BERICHT=`; bei `hinweis` `=== AUSGABE ===` und Zeile. Das Turn-Ende kommt als Datei, nie als Argument.
  - `final --etappe <e> --session <id> --bericht <datei> --commit <hash|none> [--basis] [--wi]` → `SLUG=`, `ERGEBNIS=`, `WEITER=` (Etappe, `halt`, `ende` oder `doppelt`), `HALTEPUNKT=`, `GEPRUEFT=…`, optional `=== AUSGABE ===` und Block
  - `halt --slug <s> --art spec|go` → `=== AUSGABE ===` und Block; schreibt `halt` in den Zustand
  - `commit --anlass spec|go --slug <s> --message <betreff>` → `COMMIT=<hash> <dateien>` oder `COMMIT=keiner`, `NICHT-COMMITTET=…`, bei `go` `AUFRUF=<aufruf>`; anderer Branch: Exit 1
  - `schluss --slug <s> [--stopp]` → `=== AUSGABE ===` und Schlussbericht
  - `store --etappe <e> (--spec <S> | --plan <P>) [--neu] --datei <datei>...` → `ABLAGE=<ordner>`
  - `etappe-report --etappe <e> (--slug <s> | --spec <S>) [--bericht] [--entscheidung]... [--datei]... [--tests] [--anhang]... [--plan] [--worktree] [--branch] [--pruefung gruen|rot|keine] [--luecke]... [--ac-ohne-test]...` → `BERICHT=<pfad>`
  - unbekannter Befehl oder unbekanntes Argument: Exit 2 mit Aufrufzeilen

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/session-chain-cli.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { git, commitFile, makeRepo, addWorktree, repoWithPlan } = require('./lib/git-repo');
  const { readState, writeState } = require('../scripts/lib/session-chain-store');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'session-chain.js');

  function chain(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  function scratch(name, text) {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dv-forge-cli-')), name);
    fs.writeFileSync(file, text);
    return file;
  }

  test('entry_UnknownCodeword_ExitsWithTheSixValidCodewords', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'entry', 'review', 'x.md');

    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Unbekanntes Codewort: review. Gültige Codewörter: grill, spec-review, planning, plan-review, implementation, finish.');
    assert.equal(result.stdout, '');
  });

  test('entry_MissingSpec_ExitsNamingThePath', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'entry', 'grill', 'docs/fehlt.md');

    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Pfad nicht gefunden: docs/fehlt.md');
  });

  test('entry_SlugWithState_PrintsBaseWithoutQuestionAndTheAdoptedState', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    writeState(repo, 'x', { basis: 'dev', offen: [{ farbe: 'yellow', titel: 'A', herkunft: 'spec-review' }, { farbe: 'yellow', titel: 'B', herkunft: 'spec-review' }] });

    // Act
    const result = chain(repo, 'entry', 'planning', spec);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^basis=dev$/m);
    assert.doesNotMatch(result.stdout, /frage-basis/);
    const block = result.stdout.slice(result.stdout.indexOf('=== ZUSTAND ==='));
    for (const part of ['**Basis-Branch:** dev', '- 🟡 A · spec-review', '- 🟡 B · spec-review']) assert.ok(block.includes(part), part);
  });

  test('brief_SlugWithStateDecisionsAndWorkitem_PrintsModelTitleBackgroundAndBrief', () => {
    // Arrange
    const { repo, spec } = repoWithPlan();
    writeState(repo, 'x', { basis: 'dev', wi: '311021', spec: spec.replace(/\\/g, '/'), entscheidungen: [{ etappe: 'spec-nacharbeit', text: '500 statt 404, keine Backend-Änderung' }] });

    // Act
    const result = chain(repo, 'brief', '--etappe', 'planning', '--slug', 'x');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^MODELL=opus\nTITEL=Planning x\n=== HINTERGRUND ===\n/);
    const text = result.stdout.slice(result.stdout.indexOf('=== BRIEF ===\n') + '=== BRIEF ===\n'.length);
    assert.ok(text.startsWith(`/dv-forge:plan-orchestrator ${spec.replace(/\\/g, '/')} 311021`));
    assert.ok(text.includes('- spec-nacharbeit: 500 statt 404, keine Backend-Änderung'));
  });

  test('brief_EtappeWithoutSpecInState_ExitsNamingTheValue', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { basis: 'dev' });

    // Act
    const result = chain(repo, 'brief', '--etappe', 'planning', '--slug', 'x');

    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Etappe planning: spec fehlt');
  });

  test('brief_MissingKontext_ExitsWithMessage', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'brief', '--etappe', 'whiteboarding', '--basis', 'main', '--kontext', path.join(repo, 'fehlt.md'));

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr.trim(), /^Kontext nicht lesbar: .+\/fehlt\.md$/);
  });

  test('set_WithoutBase_WritesStateWithoutBase', () => {
    // Arrange
    const repo = makeRepo();
    const worktree = addWorktree(repo, 'feature/x');

    // Act
    const result = chain(repo, 'set', '--slug', 'wt-x', '--worktree', worktree);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readState(repo, 'wt-x').basis, undefined);
  });

  test('turn_ThreeTurnEndsWithoutStatus_PrintsHintOnlyAtTheThird', () => {
    // Arrange
    const repo = makeRepo();
    const turnEnd = scratch('turn.md', 'Zwischenstand ohne Status\n');

    // Act
    const results = [1, 2, 3].map(() => chain(repo, 'turn', '--session', 'local_t', '--etappe', 'spec-review', '--turn-datei', turnEnd));

    // Assert
    assert.deepEqual(results.map((result) => /^AKTION=(\S+)$/m.exec(result.stdout)[1]), ['schweigen', 'schweigen', 'hinweis']);
    assert.ok(!results[1].stdout.includes('=== AUSGABE ==='));
    assert.ok(results[2].stdout.includes('spec-review: Die Etappe endet ohne Statuszeile (3 Turn-Enden in Folge) · [Session](#local_t)'));
  });

  test('turn_FinalStatusLineWithShellCharactersInText_PrintsActionAndFields', () => {
    // Arrange
    const repo = makeRepo();
    const turnEnd = scratch('turn.md', '[grill] STATUS=final · ROT=0 · GELB=1 · COMMIT=none · BERICHT=C:/b.md\nFertig mit "Zitat", $(echo x) und `code`.\n');

    // Act
    const result = chain(repo, 'turn', '--session', 'local_t', '--etappe', 'grill', '--turn-datei', turnEnd);

    // Assert
    assert.ok(result.stdout.startsWith('AKTION=final\nETAPPE=grill\nSTATUS=final\nROT=0\nGELB=1\nCOMMIT=none\nBERICHT=C:/b.md'));
  });

  test('store_FromWorktreeWithFresh_StoresInTheSharedAblage', () => {
    // Arrange
    const { repo } = repoWithPlan();
    const worktree = addWorktree(repo, 'feature/x');
    const report = scratch('abschluss.md', '# Abschlussbericht\n');

    // Act
    const result = chain(worktree, 'store', '--etappe', 'umsetzung', '--plan', path.join(worktree, 'docs/forge/x/plan.md'), '--neu', '--datei', report);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(ablageDir(repo, 'x', 'umsetzung'), 'abschluss.md')));
  });

  // Spec-Review-Etappe mit Berichtsdatei über die CLI; Rückgabe: Commit und Pfad der Berichtsdatei.
  function specReviewReport(repo) {
    const commit = commitFile(repo, 'docs/forge/x/spec.md', '# Spec\n', 'docs: review spec x');
    chain(repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', path.join(repo, 'docs/forge/x/spec.md'));
    const abschluss = scratch('abschluss.md', '# Abschlussbericht\n**Ergebnis:** ✅ Bereit zum Planen\n');
    const bericht = /^BERICHT=(.+)$/m.exec(chain(repo, 'etappe-report', '--etappe', 'spec-review', '--slug', 'x', '--bericht', abschluss).stdout)[1];
    return { commit, bericht };
  }

  test('etappeReport_AndFinal_HoldAtSpecHaltepunktAfterSpecReview', () => {
    // Arrange
    const repo = makeRepo();
    const { commit, bericht } = specReviewReport(repo);

    // Act
    const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    for (const line of ['SLUG=x', 'ERGEBNIS=ok', 'WEITER=halt', 'HALTEPUNKT=spec']) assert.match(result.stdout, new RegExp(`^${line}$`, 'm'));
    assert.ok(result.stdout.includes('=== AUSGABE ===\n# Spec-Haltepunkt'));
  });

  test('final_SameFinalTwice_PrintsDoppeltWithoutBlock', () => {
    // Arrange
    const repo = makeRepo();
    const { commit, bericht } = specReviewReport(repo);
    chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

    // Act
    const result = chain(repo, 'final', '--etappe', 'spec-review', '--session', 'local_s', '--bericht', bericht, '--commit', commit);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^WEITER=doppelt$/m);
    assert.ok(!result.stdout.includes('=== AUSGABE ==='));
  });

  test('commit_GoOnOtherBranch_ExitsNamingBothBranches', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    writeState(repo, 'x', { basis: 'dev', spec, plan });
    git(repo, 'switch', '--quiet', '-c', 'feature/x');

    // Act
    const result = chain(repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x');

    // Assert
    assert.equal(result.status, 1);
    assert.equal(result.stderr.trim(), 'Aktueller Branch feature/x ist nicht der Basis-Branch dev; die Umsetzung startet nicht.');
  });

  test('commit_GoWithUncommittedPlan_CommitsPlanRecordsItAndPrintsTheCall', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    fs.appendFileSync(plan, 'mehr\n');
    writeState(repo, 'x', { basis: 'main', spec, plan });

    // Act
    const result = chain(repo, 'commit', '--anlass', 'go', '--slug', 'x', '--message', 'docs: plan x');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^COMMIT=\S+ docs\/forge\/x\/plan\.md$/m);
    assert.match(result.stdout, /^AUFRUF=\/dv-forge:implementation-orchestrator .+ --base main$/m);
    assert.equal(readState(repo, 'x').commits[0].anlass, 'go');
  });

  test('halt_GoFromState_PrintsTheGoHaltepunkt', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    writeState(repo, 'x', { basis: 'main', spec, plan, offen: [] });

    // Act
    const result = chain(repo, 'halt', '--slug', 'x', '--art', 'go');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.startsWith('=== AUSGABE ===\n# GO-Haltepunkt'));
  });

  test('schluss_Stopp_PrintsFinalReportWithResumeCodeword', () => {
    // Arrange
    const repo = makeRepo();
    writeState(repo, 'x', { halt: 'spec', spec: 'C:/r/spec.md', etappen: [], offen: [] });

    // Act
    const result = chain(repo, 'schluss', '--slug', 'x', '--stopp');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('## Fortsetzen\n/dv-forge:session-orchestrator planning C:/r/spec.md'));
  });

  test('schluss_StoppAfterHaltGoWithoutFinal_NamesImplementationResume', () => {
    // Arrange
    const { repo, spec, plan } = repoWithPlan();
    chain(repo, 'set', '--slug', 'x', '--basis', 'main', '--spec', spec, '--plan', plan);
    chain(repo, 'halt', '--slug', 'x', '--art', 'go');

    // Act
    const result = chain(repo, 'schluss', '--slug', 'x', '--stopp');

    // Assert
    const [specPath, planPath] = [spec, plan].map((file) => path.resolve(file).replace(/\\/g, '/'));
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes(`## Fortsetzen\n/dv-forge:session-orchestrator implementation ${specPath} ${planPath}`));
  });

  test('run_UnknownOption_ExitsWithUsage', () => {
    // Arrange
    const repo = makeRepo();

    // Act
    const result = chain(repo, 'final', '--foo', 'x');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Aufruf: node session-chain\.js entry/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-cli.test.js` — erwartet: FAIL `entry_UnknownCodeword_ExitsWithTheSixValidCodewords` (Skript fehlt, `status` ist 1 mit `Cannot find module`, `stderr` passt nicht)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/scripts/session-chain.js`:
  ```js
  #!/usr/bin/env node
  'use strict';

  // Werkzeug der Leit-Session und der Etappen-Sessions einer Session-Kette. Ausgabe: Zeilen `<NAME>=<Wert>`, danach bei Bedarf
  // ein Block nach `=== AUSGABE ===`, `=== ZUSTAND ===`, `=== HINTERGRUND ===` oder `=== BRIEF ===`, den der Aufrufer unverändert nutzt.

  const path = require('node:path');
  const { SessionChainError, slugOfArtifact, readState } = require('./lib/session-chain-store');
  const { storeFiles } = require('./lib/session-chain-ablage');
  const { EntryError, analyseEntry } = require('./lib/session-chain-entry');
  const { buildBrief } = require('./lib/session-chain-brief');
  const { parseStatusLine, turnAction, readTurns, writeTurns } = require('./lib/session-chain-turn');
  const { commitFor } = require('./lib/session-chain-commit');
  const { goCall, adoptedText, noStatusHint } = require('./lib/session-chain-text');
  const { etappeReport, readInput } = require('./lib/session-chain-report');
  const { setState, holdAt, processFinal, closing, recordCommit } = require('./lib/session-chain-steps');

  const USAGE = [
    'Aufruf: node session-chain.js entry [<codewort> <pfade>... [workitem-nr]]',
    '       node session-chain.js set --slug <slug> [--basis <branch>] [--wi <nr>] [--spec <S>] [--plan <P>] [--worktree <R>]',
    '       node session-chain.js brief --etappe <etappe> [--slug <slug>] [--kontext <datei>] [--quelle <datei>] [--basis <branch>] [--wi <nr>]',
    '       node session-chain.js turn --session <id> --etappe <etappe> --turn-datei <datei>',
    '       node session-chain.js final --etappe <etappe> --session <id> --bericht <datei> --commit <hash|none> [--basis <branch>] [--wi <nr>]',
    '       node session-chain.js halt --slug <slug> --art spec|go',
    '       node session-chain.js commit --anlass spec|go --slug <slug> --message <betreff>',
    '       node session-chain.js schluss --slug <slug> [--stopp]',
    '       node session-chain.js store --etappe <etappe> (--spec <S> | --plan <P>) [--neu] --datei <datei>...',
    '       node session-chain.js etappe-report --etappe <etappe> (--slug <slug> | --spec <S>) [--bericht <datei>] [--entscheidung <text>]... [--datei <pfad>]...',
    '              [--tests <text>] [--anhang <datei>]... [--plan <P>] [--worktree <R>] [--branch <name>] [--pruefung gruen|rot|keine] [--luecke <befehl>]... [--ac-ohne-test <AC>]...',
    '',
  ].join('\n');
  const VALUE_OPTIONS = ['--slug', '--basis', '--wi', '--spec', '--plan', '--worktree', '--etappe', '--kontext', '--quelle', '--session', '--turn-datei', '--bericht',
    '--commit', '--art', '--anlass', '--message', '--datei', '--entscheidung', '--tests', '--anhang', '--branch', '--pruefung', '--luecke', '--ac-ohne-test'];
  const LIST_OPTIONS = ['--datei', '--entscheidung', '--anhang', '--luecke', '--ac-ohne-test'];
  const FLAG_OPTIONS = ['--neu', '--stopp'];
  const CHECKS = ['gruen', 'rot', 'keine'];

  class UsageError extends Error {}

  function parseOptions(args) {
    const values = Object.fromEntries(LIST_OPTIONS.map((name) => [name.slice(2), []]));
    for (let index = 0; index < args.length; index += 1) {
      const name = args[index];
      if (FLAG_OPTIONS.includes(name)) {
        values[name.slice(2)] = true;
        continue;
      }
      if (!VALUE_OPTIONS.includes(name) || index + 1 >= args.length) throw new UsageError(`Unbekanntes oder unvollständiges Argument: ${name}`);
      index += 1;
      if (LIST_OPTIONS.includes(name)) values[name.slice(2)].push(args[index]);
      else values[name.slice(2)] = args[index];
    }
    return values;
  }

  function required(values, name) {
    if (!values[name]) throw new UsageError(`--${name} fehlt`);
    return values[name];
  }

  function fieldLines(fields) {
    return Object.entries(fields).filter(([, value]) => value !== undefined).map(([key, value]) => `${key}=${value}`);
  }

  function withBlock(lines, marker, text) {
    return text ? [...lines, `=== ${marker} ===`, text] : lines;
  }

  function entry(args) {
    const { fields, state } = analyseEntry(args, process.cwd());
    return withBlock(fieldLines(fields), 'ZUSTAND', state ? adoptedText(state) : '').join('\n');
  }

  function brief(values) {
    const state = values.slug ? readState(process.cwd(), values.slug) : null;
    const chain = { ...(state ?? {}), ...(values.slug ? { slug: values.slug } : {}), ...(values.basis ? { basis: values.basis } : {}), ...(values.wi ? { wi: values.wi } : {}) };
    const result = buildBrief({
      etappe: required(values, 'etappe'),
      values: { slug: chain.slug, wi: chain.wi, basis: chain.basis, spec: chain.spec, plan: chain.plan, worktree: chain.worktree, branch: chain.branch, quelle: values.quelle },
      decisions: state?.entscheidungen ?? [],
      kontext: values.kontext ? readInput(values.kontext, 'Kontext') : null,
    });
    return [`MODELL=${result.modell}`, `TITEL=${result.titel}`, '=== HINTERGRUND ===', result.hintergrund, '=== BRIEF ===', result.brief].join('\n');
  }

  // Das Turn-Ende einer Etappen-Session kommt als Datei: sein Text stammt aus einer fremden Session und gehört nie auf die Kommandozeile.
  function turn(values) {
    const session = required(values, 'session');
    const parsed = parseStatusLine(readInput(required(values, 'turn-datei'), 'Turn-Ende'));
    const { aktion, ohneStatus } = turnAction(readTurns(process.cwd(), session), parsed);
    writeTurns(process.cwd(), session, ohneStatus);
    const lines = [`AKTION=${aktion}`, ...Object.entries(parsed ?? {}).map(([key, value]) => `${key.toUpperCase()}=${value}`)];
    return withBlock(lines, 'AUSGABE', aktion === 'hinweis' ? noStatusHint({ etappe: required(values, 'etappe'), session }) : '').join('\n');
  }

  function final(values) {
    const result = processFinal({
      etappe: required(values, 'etappe'), session: required(values, 'session'), bericht: required(values, 'bericht'), commit: required(values, 'commit'), basis: values.basis, wi: values.wi,
    }, process.cwd());
    const lines = [`SLUG=${result.slug}`, `ERGEBNIS=${result.ergebnis}`, `WEITER=${result.weiter}`, `HALTEPUNKT=${result.haltepunkt}`, ...result.geprueft.map((line) => `GEPRUEFT=${line}`)];
    return withBlock(lines, 'AUSGABE', result.text).join('\n');
  }

  function stateOf(slug) {
    const state = readState(process.cwd(), slug);
    if (!state) throw new SessionChainError(`Kein Zustand für ${slug}`);
    return state;
  }

  function halt(values) {
    const art = required(values, 'art');
    if (!['spec', 'go'].includes(art)) throw new UsageError('--art erlaubt: spec, go');
    return ['=== AUSGABE ===', holdAt(required(values, 'slug'), art, process.cwd())].join('\n');
  }

  function commit(values) {
    const slug = required(values, 'slug');
    const anlass = required(values, 'anlass');
    const state = stateOf(slug);
    const result = commitFor(anlass, process.cwd(), state, required(values, 'message'));
    if (result.commit) recordCommit(slug, result.commit, anlass, process.cwd());
    return [
      result.commit ? `COMMIT=${result.commit.hash} ${result.commit.dateien.join(' ')}` : 'COMMIT=keiner',
      ...result.nichtCommittet.map((file) => `NICHT-COMMITTET=${file} (keine Markdown-Datei)`),
      ...(anlass === 'go' ? [`AUFRUF=${goCall(state)}`] : []),
    ].join('\n');
  }

  function schluss(values) {
    return ['=== AUSGABE ===', closing(required(values, 'slug'), values.stopp === true, process.cwd())].join('\n');
  }

  function store(values) {
    const artifact = values.spec ? { spec: values.spec } : { plan: required(values, 'plan') };
    const dir = path.dirname(path.resolve(values.spec ?? values.plan));
    if (values.datei.length === 0) throw new UsageError('--datei fehlt');
    return `ABLAGE=${storeFiles({ dir, slug: slugOfArtifact(artifact), etappe: required(values, 'etappe'), files: values.datei.map((file) => path.resolve(file)), fresh: values.neu === true })}`;
  }

  function report(values) {
    if (!values.slug && !values.spec) throw new UsageError('--slug oder --spec fehlt');
    if (values.pruefung && !CHECKS.includes(values.pruefung)) throw new UsageError(`--pruefung erlaubt: ${CHECKS.join(', ')}`);
    const file = etappeReport({
      etappe: required(values, 'etappe'), slug: values.slug, spec: values.spec, bericht: values.bericht, entscheidungen: values.entscheidung, dateien: values.datei,
      tests: values.tests, anhang: values.anhang.map((item) => path.resolve(item)), plan: values.plan, worktree: values.worktree, branch: values.branch,
      pruefung: values.pruefung, luecken: values.luecke, acOhneTest: values['ac-ohne-test'],
    }, process.cwd());
    return `BERICHT=${file}`;
  }

  function set(values) {
    const state = setState({ slug: required(values, 'slug'), basis: values.basis, wi: values.wi, spec: values.spec, plan: values.plan, worktree: values.worktree }, process.cwd());
    return `ZUSTAND=${state.slug}`;
  }

  const COMMANDS = { set, brief, turn, final, halt, commit, schluss, store, 'etappe-report': report };

  function run(args) {
    const [command, ...rest] = args;
    if (command === 'entry') return entry(rest);
    if (!Object.hasOwn(COMMANDS, command)) throw new UsageError(`Unbekannter Befehl: ${command ?? '-'}`);
    return COMMANDS[command](parseOptions(rest));
  }

  function main() {
    try {
      process.stdout.write(`${run(process.argv.slice(2))}\n`);
    } catch (error) {
      if (error instanceof UsageError) {
        process.stderr.write(`${error.message}\n${USAGE}`);
        process.exit(2);
      }
      if (!(error instanceof SessionChainError) && !(error instanceof EntryError)) throw error;
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
  }

  if (require.main === module) main();

  module.exports = { run, UsageError };
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-chain-cli.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/session-chain.js plugins/forge/tests/session-chain-cli.test.js` · `git commit -m "feat(forge): add session-chain.js for the lead and stage sessions"`

---

### Task 12: `review-flow.js report` legt mit `--ablage` ab

**ACs:** AC-32, AC-56

**Dateien:**
- Modify: `plugins/forge/scripts/lib/flow-report.js:1-80` · `report`, `embeddedOutput`
- Modify: `plugins/forge/scripts/review-flow.js:1-133` · `COMMANDS.report`, `VALUE_OPTIONS`
- Create: `plugins/forge/tests/review-flow-ablage.test.js`

**Interfaces:**
- Consumes: `SessionChainError`, `slugOfArtifact`, `etappeError` aus `plugins/forge/scripts/lib/session-chain-store.js` und `ablageDir`, `nextFollowupName` aus `plugins/forge/scripts/lib/session-chain-ablage.js` (Task 1); `FOLLOWUP` (`'nacharbeit'`) aus `plugins/forge/scripts/lib/flow-files.js`
- Produces: `report(options)` in `flow-report.js` mit neuer Option `options.storage: string|null` (Etappe); mit ihr zusätzliche Ausgabezeile `ABLAGE <datei> · FOLLOWUP <ja|nein>` direkt nach `ENDE <status>` bzw. nach den vier Zeilen des eingebetteten Laufs, Dateien `bericht-review.json`/`.md` (Review, Ablage neu) oder `bericht-followup-<n>.json`/`.md` (`--quelle nacharbeit`) unter `ablageDir(…, slug, etappe)`; `review-flow.js report … [--ablage <etappe>]`, unbekannte Etappe Exit 2

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/review-flow-ablage.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const path = require('node:path');
  const { commitFile, makeRepo } = require('./lib/git-repo');
  const { SPEC, tempDir, writeReviewer, flow } = require('./lib/review-flow-fixture');
  const { chainsRoot } = require('../scripts/lib/session-chain-store');
  const { ablageDir } = require('../scripts/lib/session-chain-ablage');

  // Repo mit committeter Spec und Plan im Ordner docs/forge/x (Slug `x`) und einem sauberen Plan-Review ohne Findings.
  function planRun() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/x/spec.md', SPEC, 'add spec');
    commitFile(repo, 'docs/forge/x/plan.md', '# Plan\n\n### Task 1: Eins\n', 'add plan');
    const spec = path.join(repo, 'docs/forge/x/spec.md');
    const plan = path.join(repo, 'docs/forge/x/plan.md');
    const workspace = tempDir('dv-forge-ablage-');
    writeReviewer({ workspace }, 'coverage', []);
    flow('rate', '--review', 'plan-review', '--dir', workspace, '--doc', plan, '--spec', spec, '--expect', 'coverage');
    return { repo, spec, plan, workspace };
  }

  function planReport(run, extra = []) {
    return flow('report', '--review', 'plan-review', '--dir', run.workspace, '--doc', run.plan, '--spec', run.spec, '--titel', 'Plan-Review', '--artefakt', run.plan, ...extra);
  }

  test('report_PlanReviewWithAblage_StoresReportAndDataAndNamesFollowupOffer', () => {
    // Arrange
    const run = planRun();

    // Act
    const result = planReport(run, ['--ablage', 'plan-review']);

    // Assert
    assert.equal(result.status, 0, result.stderr);
    const target = ablageDir(run.repo, 'x', 'plan-review');
    assert.match(result.stdout, /^ENDE sauber nach Runde 1\nABLAGE .+\/bericht-review\.json · FOLLOWUP nein\n=== BERICHT ===\n/);
    assert.deepEqual(fs.readdirSync(target).sort(), ['bericht-review.json', 'bericht-review.md']);
    assert.equal(JSON.parse(fs.readFileSync(path.join(target, 'bericht-review.json'), 'utf8')).status, 'sauber nach Runde 1');
    assert.ok(result.stdout.endsWith(`${fs.readFileSync(path.join(target, 'bericht-review.md'), 'utf8').trimEnd()}\n`));
  });

  test('report_WithoutAblage_PrintsTheSameAsBeforeAndStoresNothing', () => {
    // Arrange
    const run = planRun();
    const stored = planReport(run, ['--ablage', 'plan-review']).stdout;
    fs.rmSync(chainsRoot(run.repo), { recursive: true, force: true });

    // Act
    const result = planReport(run);

    // Assert
    assert.equal(result.stdout, stored.replace(/^ABLAGE .*\n/m, ''));
    assert.equal(fs.existsSync(chainsRoot(run.repo)), false);
  });

  test('report_FollowupRunsWithAblage_StoreNumberedRoundsBesideTheReview', () => {
    // Arrange
    const run = planRun();
    planReport(run, ['--ablage', 'plan-review']);
    planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

    // Act
    planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

    // Assert
    const names = fs.readdirSync(ablageDir(run.repo, 'x', 'plan-review')).filter((name) => name.endsWith('.json')).sort();
    assert.deepEqual(names, ['bericht-followup-1.json', 'bericht-followup-2.json', 'bericht-review.json']);
  });

  test('report_NewReviewWithAblage_StartsTheAblageOfItsEtappeAnew', () => {
    // Arrange
    const run = planRun();
    planReport(run, ['--ablage', 'plan-review']);
    planReport(run, ['--ablage', 'plan-review', '--quelle', 'nacharbeit']);

    // Act
    planReport(run, ['--ablage', 'plan-review']);

    // Assert
    assert.deepEqual(fs.readdirSync(ablageDir(run.repo, 'x', 'plan-review')).sort(), ['bericht-review.json', 'bericht-review.md']);
  });

  test('report_UnknownAblageEtappe_ExitsWithUsage', () => {
    // Arrange
    const run = planRun();

    // Act
    const result = planReport(run, ['--ablage', 'review']);

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--ablage erlaubt: whiteboarding, grill, spec-review/);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-ablage.test.js` — erwartet: FAIL `report_PlanReviewWithAblage_StoresReportAndDataAndNamesFollowupOffer` (Exit 2, `Unbekanntes oder unvollständiges Argument: --ablage`)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/lib/flow-report.js` die Import-Zeile von `./flow-files` ersetzen durch:
  ```js
  const { ROUND_ONE, ROUND_TWO, FOLLOWUP, CLOSING, FlowError, readText, readJson, writeText, writeJson } = require('./flow-files');
  const { SessionChainError, slugOfArtifact } = require('./session-chain-store');
  const { ablageDir, nextFollowupName } = require('./session-chain-ablage');
  ```
  In derselben Datei den Block ab dem Kommentar `// Eingebetteter Lauf: Die Berichtsdaten gehen als JSON nach` bis zum Ende der Funktion `report` ersetzen durch:
  ```js
  // Berichtsdaten, wie sie ein eingebetteter Lauf und die Ablage schreiben.
  function reportData(input, status) {
    const { steps: _steps, ...summary } = summaryOf(input);
    const { chain: _chain, ...data } = input;
    return { summary, data: { format: FORMAT, status, ...summary, ...data } };
  }

  // Eingebetteter Lauf: Die Berichtsdaten gehen als JSON nach `reportFile`; stdout nennt Status, Ergebnis, Followup-Fähigkeit und Datei.
  // orchestrator-report.js setzt daraus den einen Abschlussbericht des Orchestrators zusammen.
  function embeddedOutput(options, input, status) {
    const { summary, data } = reportData(input, status);
    writeJson(options.reportFile, data);
    return [
      `ENDE ${status}`, `ERGEBNIS ${summary.resultLine.replace(RESULT_PREFIX, '')}`, `FOLLOWUP ${summary.offersFollowup ? 'ja' : 'nein'}`, `BERICHT ${options.reportFile}`,
    ].join('\n');
  }

  // Ablage (`options.storage` = Etappe): Bericht und Berichtsdaten gehen in die Ablage der Session-Kette je Slug. Ein Review
  // beginnt die Ablage seiner Etappe neu (`bericht-review`), ein Followup legt die nächste Runde daneben (`bericht-followup-<n>`).
  // Rückgabe: die Zeile `ABLAGE <datei> · FOLLOWUP <ja|nein>`.
  function storeReport(options, input, status, text) {
    const { summary, data } = reportData(input, status);
    const artifact = options.review === 'spec-review' ? { spec: options.artifact } : { plan: options.artifact };
    try {
      const target = ablageDir(path.dirname(path.resolve(options.artifact)), slugOfArtifact(artifact), options.storage);
      const followup = options.source === FOLLOWUP;
      if (!followup) fs.rmSync(target, { recursive: true, force: true });
      const name = followup ? nextFollowupName(target) : 'bericht-review';
      const file = path.join(target, `${name}.json`);
      writeJson(file, data);
      writeText(path.join(target, `${name}.md`), text);
      return `ABLAGE ${file.replace(/\\/g, '/')} · FOLLOWUP ${summary.offersFollowup ? 'ja' : 'nein'}`;
    } catch (error) {
      if (error instanceof SessionChainError) throw new FlowError(`Ablage nicht möglich: ${error.message}`);
      throw error;
    }
  }

  // `options.reportFile` (optional): eingebetteter Lauf, siehe embeddedOutput. `options.storage` (optional): Ablage, siehe storeReport.
  function report(options) {
    const data = collect(options);
    const status = flowStatus({ failed: data.failed, openQuestions: data.questions.length, openRed: data.openRed, reworked: data.reworked });
    const open = openGroupsOf(options, data);
    const input = buildInput(options, data, status, open);
    const text = renderReportText(input);
    writeClosing(options, open);
    writeText(path.join(options.workspace, CLOSING, 'bericht.md'), text);
    const stored = options.storage ? [storeReport(options, input, status, text)] : [];
    if (options.reportFile) return [embeddedOutput(options, input, status), ...stored].join('\n');
    return [`ENDE ${status}`, ...stored, '=== BERICHT ===', text].join('\n');
  }
  ```
  In `plugins/forge/scripts/review-flow.js`:
  - Import ergänzen direkt unter der Zeile `const { ROUND_ONE, ROUND_TWO, FOLLOWUP, FlowError } = require('./lib/flow-files');`:
    ```js
    const { etappeError } = require('./lib/session-chain-store');
    ```
  - In `USAGE` die Zeile von `report` ersetzen durch:
    ```js
      '       node review-flow.js report --review <..> --dir <W> --doc <datei> --titel <text> --artefakt <pfad> [--quelle runde-1|nacharbeit] [--bericht <datei>] [--ablage <etappe>]',
    ```
  - In `VALUE_OPTIONS` hinter `'--bericht'` den Eintrag `'--ablage'` ergänzen.
  - Direkt vor `function checkedRound(round = ROUND_ONE) {` einfügen:
    ```js
    function checkedStorage(etappe) {
      if (etappe === undefined) return null;
      const error = etappeError(etappe);
      if (error) throw new UsageError(`--ablage ${error}`);
      return etappe;
    }

    ```
  - In `COMMANDS.report` hinter `reportFile: values.bericht ? path.resolve(values.bericht) : null,` die Zeile `storage: checkedStorage(values.ablage),` ergänzen, sodass der Eintrag lautet:
    ```js
      report: (values) => report({
        ...flowOptions(values), title: required(values, 'titel'), artifact: required(values, 'artefakt'), reportFile: values.bericht ? path.resolve(values.bericht) : null,
        storage: checkedStorage(values.ablage),
      }),
    ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-flow-ablage.test.js plugins/forge/tests/review-flow-report.test.js plugins/forge/tests/chain-reports.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-report.js plugins/forge/scripts/review-flow.js plugins/forge/tests/review-flow-ablage.test.js` · `git commit -m "feat(forge): review-flow report stores report and data with --ablage"`

---

### Task 13: `prepare.js` und Guard kennen `--ablage` und `session-chain.js`

**ACs:** AC-56

**Dateien:**
- Modify: `plugins/forge/scripts/prepare.js:19-37` · `FLAGS`, `prepare`
- Modify: `plugins/forge/scripts/guard-orchestrator.js:17-19` · `ALLOWED_SCRIPTS`, `VALUE_FLAGS`
- Test: `plugins/forge/tests/guard-orchestrator.test.js` · `decidePreTool_ChainWriteNamingSpec_Allows`
- Create: `plugins/forge/tests/prepare-ablage.test.js`

**Interfaces:**
- Consumes: `etappeError(etappe)` aus `plugins/forge/scripts/lib/session-chain-store.js` (Task 1)
- Produces: `prepare.js plan-review|review-followup … --ablage <etappe>` gibt zusätzlich als letzte Zeile `ablage=<etappe>` aus; unbekannte Etappe Exit 2; `spec-review` kennt `--ablage` nicht. Der Guard lässt `node "<PLUGIN>/scripts/session-chain.js" …` zu und liest `--ablage <wert>` nicht als Pfad.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/prepare-ablage.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { spawnSync } = require('node:child_process');
  const { commitFile, makeRepo } = require('./lib/git-repo');

  const SCRIPT = path.join(__dirname, '..', 'scripts', 'prepare.js');
  const PLAN = '# Demo — Umsetzungsplan\n\n**Ziel:** Demo.\n\n---\n\n### Task 1: Eins\n\nText.\n';

  function run(cwd, ...args) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
  }

  function planRepo() {
    const repo = makeRepo();
    commitFile(repo, 'docs/forge/demo/plan.md', PLAN, 'plan');
    commitFile(repo, 'docs/forge/demo/spec.md', '# Spec\n', 'spec');
    return repo;
  }

  test('planReview_WithAblage_PrintsTheEtappeAsLastLine', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--ablage', 'plan-review');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim().split('\n').at(-1), 'ablage=plan-review');
  });

  test('planReview_WithoutAblage_PrintsNoAblageLine', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md');

    // Assert
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /^ablage=/m);
  });

  test('planReview_UnknownAblageEtappe_AbortsWithUsage', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'plan-review', 'docs/forge/demo/plan.md', '--ablage', 'review');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /--ablage erlaubt: whiteboarding, grill, spec-review/);
  });

  test('reviewFollowup_WithAblage_AcceptsTheOptionAndFailsOnlyForTheMissingSave', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'review-followup', 'docs/forge/demo/plan.md', 'alle', '--ablage', 'plan-review');

    // Assert
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Keine Scout-Vorschläge gesichert für demo/);
  });

  test('specReview_WithAblage_RejectsTheOption', () => {
    // Arrange
    const repo = planRepo();

    // Act
    const result = run(repo, 'spec-review', 'docs/forge/demo/spec.md', '--ablage', 'spec-review');

    // Assert
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unbekanntes oder unvollständiges Argument: --ablage/);
  });
  ```
  Am Ende von `plugins/forge/tests/guard-orchestrator.test.js` anfügen:
  ```js
  test('parseSkillCall_PlanReviewWithAblage_DoesNotTakeTheEtappeAsSpec', () => {
    // Act
    const call = guard.parseSkillCall('/dv-forge:plan-review docs/plan.md --ablage plan-review', os.tmpdir());

    // Assert
    assert.equal(call.files[0], 'docs/plan.md');
    assert.notEqual(call.files[1], 'plan-review');
  });

  test('decidePreTool_DirectoryEntrySessionChainStoreNamingRepo_Allows', () => {
    // Arrange
    const env = setupDirectory();
    const command = `node "/plugins/forge/scripts/session-chain.js" store --etappe spec-review --spec "${env.repo}/docs/x/spec.md" --neu --datei "/s/abschluss.md"`;

    // Act
    const reason = preTool(env, { tool_name: 'Bash', tool_input: { command } });

    // Assert
    assert.equal(reason, null);
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/prepare-ablage.test.js plugins/forge/tests/guard-orchestrator.test.js` — erwartet: FAIL `planReview_WithAblage_PrintsTheEtappeAsLastLine`, FAIL `parseSkillCall_PlanReviewWithAblage_DoesNotTakeTheEtappeAsSpec`, FAIL `decidePreTool_DirectoryEntrySessionChainStoreNamingRepo_Allows` (der geschützte Ordner lässt nur Skripte aus `ALLOWED_SCRIPTS` zu; ohne `session-chain.js` dort lehnt der Guard ab)
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/scripts/prepare.js`:
  - Import ergänzen direkt unter der Zeile `const { ART_OF_ROLE, FollowupError, latest, loadGroups, rolesFor, slugFor } = require('./followup');`:
    ```js
    const { etappeError } = require('./lib/session-chain-store');
    ```
  - In `USAGE` die Zeilen von `plan-review` und `review-followup` ersetzen durch:
    ```js
      '       node prepare.js plan-review <plan> [spec] [--only <reviewer,...>] [--bericht <datei>] [--ablage <etappe>]',
    ```
    ```js
      '       node prepare.js review-followup <spec|plan> <auswahl> [--spec <pfad>] [--base <ref>] [--bericht <datei>] [--ablage <etappe>]   (auswahl: alle | b | <n> | <g>:<n|b>,...)',
    ```
  - In `FLAGS` die Einträge ersetzen durch `'plan-review': ['--only', '--bericht', '--ablage'],` und `'review-followup': ['--spec', '--base', '--bericht', '--ablage'],`.
  - Die Funktion `prepare` ersetzen durch:
    ```js
    // Etappe der Ablage aus `--ablage`; der Skill reicht sie als `ablage=<etappe>` an `review-flow.js report` weiter.
    function storageOf(flags) {
      const etappe = flags['--ablage']?.[0];
      const error = etappe === undefined ? null : etappeError(etappe);
      if (error) throw new UsageError(`--ablage ${error}`);
      return etappe;
    }

    function prepare(skill, args) {
      if (!Object.hasOwn(PREPARERS, skill)) throw new UsageError(`Unbekannter Skill: ${skill}`);
      const call = parseArgs(skill, args);
      const storage = storageOf(call.flags);
      const values = PREPARERS[skill](call);
      return render(storage ? { ...values, ablage: storage } : values);
    }
    ```
  In `plugins/forge/scripts/guard-orchestrator.js`:
  - In `ALLOWED_SCRIPTS` hinter `'chain.js'` den Eintrag `'session-chain.js'` ergänzen.
  - `VALUE_FLAGS` ersetzen durch:
    ```js
    const VALUE_FLAGS = new Set(['--rounds', '--spec', '--context', '--base', '--bericht', '--ablage']);
    ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/prepare-ablage.test.js plugins/forge/tests/prepare.test.js plugins/forge/tests/guard-orchestrator.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/prepare.js plugins/forge/scripts/guard-orchestrator.js plugins/forge/tests/prepare-ablage.test.js plugins/forge/tests/guard-orchestrator.test.js` · `git commit -m "feat(forge): prepare and guard accept --ablage and session-chain.js"`

---

### Task 14: `plan-review` und `review-followup` beschreiben die Ablage

**ACs:** AC-56

**Dateien:**
- Modify: `plugins/forge/shared/review-flow/flow.md:68-76` · `## Ende`
- Modify: `plugins/forge/skills/review-followup/references/flow.md:20-27` · `### Spec und Plan` unter `## Nachprüfung`
- Modify: `plugins/forge/skills/plan-review/SKILL.md:17-19` · `## Eingebetteter Lauf`
- Modify: `plugins/forge/skills/review-followup/SKILL.md:13` · `wie beim Original-Review.`
- Create: `plugins/forge/tests/review-ablage-docs.test.js`

**Interfaces:**
- Consumes: `ablage=<etappe>` aus `prepare.js` (Task 13); `report … --ablage <etappe>` (Task 12)
- Produces: Skill-Texte, die `--ablage` nur mit der Option anwenden

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/review-ablage-docs.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText } = require('./lib/markdown');

  const ROOT = path.join(__dirname, '..');
  const FLOW = path.join(ROOT, 'shared', 'review-flow', 'flow.md');
  const FOLLOWUP_FLOW = path.join(ROOT, 'skills', 'review-followup', 'references', 'flow.md');
  const PLAN_REVIEW = path.join(ROOT, 'skills', 'plan-review', 'SKILL.md');
  const FOLLOWUP = path.join(ROOT, 'skills', 'review-followup', 'SKILL.md');

  test('flow_End_AblageAppendsOptionAndKeepsEverythingElse', () => {
    // Act
    const text = readText(FLOW);

    // Assert
    assert.ok(text.includes('**Ablage** (`prepare.js` liefert `ablage=<E>`): Schritt 1 bekommt `--ablage <E>`; die Ausgabe hat zusätzlich die Zeile `ABLAGE <datei> · FOLLOWUP <ja|nein>`, sonst bleibt alles gleich.'));
  });

  test('reviewFollowupFlow_Report_GetsAblageWhenPrepareNamesIt', () => {
    // Act
    const text = readText(FOLLOWUP_FLOW);

    // Assert
    assert.ok(text.includes('Liefert `prepare.js` `ablage=<E>`, bekommt `report` zusätzlich `--ablage <E>`.'));
  });

  test('planReview_AblageSection_PointsToFlowAndKeepsStandaloneRun', () => {
    // Act
    const { fields, body } = readMarkdown(PLAN_REVIEW);

    // Assert
    assert.ok(body.includes('## Ablage\nNennt `$ARGUMENTS` `--ablage <E>`, liefert `prepare.js` die Zeile `ablage=<E>`; dann gilt die Ablage aus `flow.md`, Abschnitt „Ende“. Ohne `--ablage` läuft alles wie beschrieben.'));
    assert.equal(fields['argument-hint'], '<plan.md> [spec.md] [--only <reviewer,...>] [--bericht <datei>]');
  });

  test('reviewFollowup_Body_NamesAblageOption', () => {
    // Act
    const { body } = readMarkdown(FOLLOWUP);

    // Assert
    assert.ok(body.includes('`--ablage <E>` legt Bericht und Bericht-Daten in die Ablage der Session-Kette; dann liefert `prepare.js` `ablage=<E>`.'));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-ablage-docs.test.js` — erwartet: FAIL `flow_End_AblageAppendsOptionAndKeepsEverythingElse`, `reviewFollowupFlow_Report_GetsAblageWhenPrepareNamesIt`, `planReview_AblageSection_PointsToFlowAndKeepsStandaloneRun`, `reviewFollowup_Body_NamesAblageOption`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/shared/review-flow/flow.md` am Dateiende, nach dem Absatz `**Eingebetteter Lauf** …`, eine Leerzeile und diesen Absatz anfügen:
  ````markdown
  **Ablage** (`prepare.js` liefert `ablage=<E>`): Schritt 1 bekommt `--ablage <E>`; die Ausgabe hat zusätzlich die Zeile `ABLAGE <datei> · FOLLOWUP <ja|nein>`, sonst bleibt alles gleich.
  ````
  In `plugins/forge/skills/review-followup/references/flow.md`, Abschnitt `## Nachprüfung`, `### Spec und Plan`, Schritt 5, hinter `der Text nach \`=== BERICHT ===\` ist der Bericht.` den Satz anfügen:
  ````markdown
  Liefert `prepare.js` `ablage=<E>`, bekommt `report` zusätzlich `--ablage <E>`.
  ````
  In `plugins/forge/skills/plan-review/SKILL.md` direkt nach dem Abschnitt `## Eingebetteter Lauf` (vor `## Reviewer`) einfügen:
  ````markdown
  ## Ablage
  Nennt `$ARGUMENTS` `--ablage <E>`, liefert `prepare.js` die Zeile `ablage=<E>`; dann gilt die Ablage aus `flow.md`, Abschnitt „Ende“. Ohne `--ablage` läuft alles wie beschrieben.

  ````
  In `plugins/forge/skills/review-followup/SKILL.md` hinter dem Satz `Optional \`--spec <pfad>\` und \`--base <ref>\` wie beim Original-Review.` einfügen:
  ````markdown
   `--ablage <E>` legt Bericht und Bericht-Daten in die Ablage der Session-Kette; dann liefert `prepare.js` `ablage=<E>`.
  ````
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/review-ablage-docs.test.js plugins/forge/tests/closing-report-docs.test.js plugins/forge/tests/review-followup-skill.test.js plugins/forge/tests/plan-review-skill.test.js plugins/forge/tests/review-flow-doc.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/review-flow/flow.md plugins/forge/skills/review-followup/references/flow.md plugins/forge/skills/plan-review/SKILL.md plugins/forge/skills/review-followup/SKILL.md plugins/forge/tests/review-ablage-docs.test.js` · `git commit -m "docs(forge): describe --ablage for plan-review and review-followup"`

---

### Task 15: Die drei Orchestratoren legen mit `--ablage` ab

**ACs:** AC-56, AC-57

**Dateien:**
- Create: `plugins/forge/shared/session-chain/ablage.md`
- Modify: `plugins/forge/skills/spec-review-orchestrator/SKILL.md:9-36` · `Abschlussbericht, letzte Handlung:`
- Modify: `plugins/forge/skills/plan-orchestrator/SKILL.md:9-32` · `Abschlussbericht, letzte Handlung:`
- Modify: `plugins/forge/skills/implementation-orchestrator/SKILL.md:9-38` · `Abschlussbericht, auch bei jedem früheren Ende`
- Create: `plugins/forge/tests/orchestrator-ablage.test.js`

**Interfaces:**
- Consumes: `store` der CLI `session-chain.js` (Task 11): `node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> (--spec <S> | --plan <P>) [--neu] --datei <datei>...`
- Produces: `plugins/forge/shared/session-chain/ablage.md` mit je einem Abschnitt `## spec-review-orchestrator`, `## plan-orchestrator`, `## implementation-orchestrator` und dem `store`-Aufruf des Orchestrators; Orchestrator-Texte mit optionalem `--ablage <E>` und einem Unterpunkt, der nur mit der Option auf diesen Abschnitt verweist. Ohne die Option bleibt jeder Schritt wie bisher; die Wortgrenzen der drei Rumpf-Tests (650, 550, 700) bleiben unverändert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  Datei `plugins/forge/tests/orchestrator-ablage.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText } = require('./lib/markdown');

  const SKILLS = path.join(__dirname, '..', 'skills');
  const ABLAGE = path.join(__dirname, '..', 'shared', 'session-chain', 'ablage.md');
  const STORE = {
    'spec-review-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`',
    'plan-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`',
    'implementation-orchestrator': '`node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --plan "<P>" --neu --datei "<AB>" --datei "<BR>" --datei "<FK>"`',
  };

  function body(name) {
    return readMarkdown(path.join(SKILLS, name, 'SKILL.md')).body;
  }

  for (const [name, store] of Object.entries(STORE)) {
    test(`${name}_Arguments_NameAblageAsOptionalOption`, () => {
      // Act
      const text = body(name);

      // Assert
      assert.match(text, /`--ablage <E>` optional/);
    });

    test(`${name}_ClosingReport_PointsToAblageOnlyWithOptionAfterShowAndBeforeOutput`, () => {
      // Act
      const text = body(name);

      // Assert
      const show = text.indexOf('guard-orchestrator.js" show');
      const stored = text.indexOf(`Nur mit \`--ablage <E>\`: Lies \`<PLUGIN>/shared/session-chain/ablage.md\` und folge dem Abschnitt \`${name}\`; Ausgabe nicht zeigen, Fehler egal.`);
      const output = text.indexOf('Den Text nach `=== BERICHT ===` unverändert ausgeben');
      assert.ok(stored > -1, 'Verweis auf ablage.md fehlt');
      assert.ok(show < stored && stored < output, 'Verweis steht zwischen show und der Ausgabe');
    });

    test(`ablage_${name}_SectionNamesTheStoreCall`, () => {
      // Act
      const text = readText(ABLAGE);

      // Assert
      assert.ok(text.includes(`## ${name}\n${store}`), `${name}: ${store}`);
    });
  }

  test('specAndPlanOrchestrator_Arguments_AblageIsNoWorkitem', () => {
    // Act
    const texts = ['spec-review-orchestrator', 'plan-orchestrator'].map(body);

    // Assert
    for (const text of texts) assert.ok(text.includes('`--ablage <E>` optional, zählt nicht als `<WI>`.'));
  });

  test('ablage_Intro_OnlyWithOptionAndWithoutShowingOutput', () => {
    // Act
    const text = readText(ABLAGE);

    // Assert
    assert.ok(text.includes('Nur mit `--ablage <E>`.'));
    assert.ok(text.includes('Die Ausgabe zeigst du nicht; endet der Aufruf mit Fehler, folgt der Bericht trotzdem.'));
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/orchestrator-ablage.test.js` — erwartet: FAIL `spec-review-orchestrator_Arguments_NameAblageAsOptionalOption` und die übrigen zehn Tests (`ENOENT … shared/session-chain/ablage.md` bei den `ablage_`-Tests)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/shared/session-chain/ablage.md`:
  ````markdown
  # Ablage der Orchestratoren

  Nur mit `--ablage <E>`. Der Aufruf kopiert Abschlussbericht und Bericht-Daten in die Ablage der Session-Kette je Slug, gemeinsam für den Haupt-Checkout und alle Worktrees; `--neu` beginnt die Ablage der Etappe neu. Die Ausgabe zeigst du nicht; endet der Aufruf mit Fehler, folgt der Bericht trotzdem.

  ## spec-review-orchestrator
  `node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`, dazu `--datei` für `<BF1>`, `<BF2>` und `<FK>` je nur wenn vorhanden.

  ## plan-orchestrator
  `node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --spec "<S>" --neu --datei "<AB>" --datei "<BR>"`, dazu `--datei` für `<BF1>`, `<BF2>` und `<FK>` je nur wenn vorhanden.

  ## implementation-orchestrator
  `node "<PLUGIN>/scripts/session-chain.js" store --etappe <E> --plan "<P>" --neu --datei "<AB>" --datei "<BR>" --datei "<FK>"`, dazu `--datei` für `<BF1>` und `<BF2>` je nur wenn die Runde lief.
  ````
  In `plugins/forge/skills/spec-review-orchestrator/SKILL.md` und `plugins/forge/skills/plan-orchestrator/SKILL.md` jeweils in der Zeile `` `$ARGUMENTS`: `` hinter `leer oder mit \`<\` beginnend = keine.` einfügen:
  ````markdown
   `--ablage <E>` optional, zählt nicht als `<WI>`.
  ````
  In beiden Dateien unter `Abschlussbericht, letzte Handlung:` den letzten Unterpunkt `Den Text nach \`=== BERICHT ===\` unverändert ausgeben, …` von 6 auf 7 nummerieren und direkt davor als Unterpunkt 6 einfügen, in `spec-review-orchestrator`:
  ````markdown
     6. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `spec-review-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
  ````
  in `plan-orchestrator`:
  ````markdown
     6. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `plan-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
  ````
  In `plugins/forge/skills/implementation-orchestrator/SKILL.md` in der Zeile `` `$ARGUMENTS`: `` `--base <B>` optional.` ersetzen durch `--base <B>` optional, `--ablage <E>` optional.`, sodass sie endet mit:
  ````markdown
  `--base <B>` optional, `--ablage <E>` optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
  ````
  Unter `Abschlussbericht, auch bei jedem früheren Ende` derselben Datei den Unterpunkt `5. Den Text nach \`=== BERICHT ===\` unverändert ausgeben, …` zu 6 machen und davor als Unterpunkt 5 einfügen:
  ````markdown
     5. Nur mit `--ablage <E>`: Lies `<PLUGIN>/shared/session-chain/ablage.md` und folge dem Abschnitt `implementation-orchestrator`; Ausgabe nicht zeigen, Fehler egal.
  ````
  Wortzahl nach eigener Zählung (Wörter = durch Leerraum getrennt, wie `wordCount` in `tests/lib/markdown.js`): `spec-review-orchestrator` rund 615 plus 24 = rund 639 (Grenze 650), `plan-orchestrator` rund 504 plus 24 = rund 528 (Grenze 550), `implementation-orchestrator` plus 20 (Grenze 700). Die Testdateien der drei Orchestratoren bleiben unverändert.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/orchestrator-ablage.test.js plugins/forge/tests/spec-review-orchestrator.test.js plugins/forge/tests/plan-orchestrator.test.js plugins/forge/tests/implementation-orchestrator.test.js` — erwartet: PASS, auch die drei unveränderten Wortgrenzen-Tests
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/shared/session-chain/ablage.md plugins/forge/skills/spec-review-orchestrator/SKILL.md plugins/forge/skills/plan-orchestrator/SKILL.md plugins/forge/skills/implementation-orchestrator/SKILL.md plugins/forge/tests/orchestrator-ablage.test.js` · `git commit -m "feat(forge): orchestrators store closing report and data with --ablage"`

---

### Task 16: Skill `spec-grilling`

**ACs:** AC-18, AC-19, AC-20

**Dateien:**
- Create: `plugins/forge/skills/spec-grilling/SKILL.md`
- Create: `plugins/forge/tests/fixtures/spec-grilling/spec.md`
- Create: `plugins/forge/tests/fixtures/spec-grilling/szenario.md`
- Create: `plugins/forge/tests/spec-grilling.test.js`

**Interfaces:**
- Consumes: `plugins/forge/skills/spec-whiteboarding/references/grill-rounds.md`, `ac-rules.md`, `spec-format.md` (bestehend)
- Produces: Skill `dv-forge:spec-grilling` mit `argument-hint: <spec.md>`; die Grill-Etappe ruft ihn mit dem Spec-Pfad auf (Task 7). Datei `plugins/forge/tests/fixtures/spec-grilling/szenario.md` mit beiden Läufen des Subagent-Szenarios rot/grün (W · Szenario-Tests); sie führt die Hauptsession der Umsetzung nach diesem Task aus, weil der Umsetzer keinen SubAgent startet (`agents/implementation-implementer.md`, Abschnitt Keine SubAgents).

- [ ] **Schritt 1: Fehlschlagenden Test und Fixtures schreiben**
  Datei `plugins/forge/tests/fixtures/spec-grilling/spec.md`:
  ````markdown
  # Kundenliste exportieren

  Status: bestätigt am 2026-10-22
  Art: frei
  Basis: abc1234

  ## Was, wie, wo, warum
  Die Kundenliste lässt sich als Datei exportieren, damit das Altsystem sie importieren kann. · Aussage

  ## Theoretisches Verhalten nach Umsetzung
  Der Anwender klickt in der Kundenliste auf „Exportieren“ und erhält eine Datei mit allen angezeigten Kunden. · Aussage

  ## Soll-Vorgaben
  - Exportiert werden die Spalten Name, Ort und Kundennummer. · Aussage
  - Der Export enthält nur die gerade gefilterten Kunden. · Aussage

  ## Akzeptanzkriterien
  - **AC-01** Gegeben eine Kundenliste mit drei Kunden, wenn der Anwender auf „Exportieren“ klickt, dann erhält er eine Datei mit drei Zeilen und den Spalten Name, Ort und Kundennummer. · Aussage
  - **AC-02** Gegeben ein Filter auf den Ort „Köln“, wenn der Anwender exportiert, dann enthält die Datei nur die Kunden aus Köln. · Aussage

  ## Entscheidungen
  - **W · Export-Format** · Aussage — CSV.
  - **W · Spalten** · Aussage — Name, Ort und Kundennummer.
  ````
  Datei `plugins/forge/tests/fixtures/spec-grilling/szenario.md`:
  ````markdown
  # Szenario spec-grilling rot/grün

  Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer. Beide Läufe mit dem Tool `Agent`, `subagent_type: "general-purpose"`, `model: "sonnet"`, je mit einer frischen Kopie von `plugins/forge/tests/fixtures/spec-grilling/spec.md`. Arbeitsordner ist die Checkout-Wurzel `<R>`.

  ## Kopie anlegen
  Befehl: `node -e "const fs=require('fs'),os=require('os'),p=require('path');const d=fs.mkdtempSync(p.join(os.tmpdir(),'grill-'));fs.copyFileSync('plugins/forge/tests/fixtures/spec-grilling/spec.md',p.join(d,'spec.md'));console.log(p.join(d,'spec.md'))"` — Ausgabe: Pfad der Kopie, im roten Lauf `<KOPIE>`, im grünen `<KOPIE2>`.

  ## Rot: ohne Skill
  `description: "Spec grillen ohne Skill"`, `prompt`:
  ```text
  Grille die Spec <KOPIE> auf Grenzfälle, Widersprüche und Lücken. Stell mir die erste Runde Fragen. Meine Antwort auf eine Frage zur leeren Kundenliste lautet schon jetzt: "Bei leerer Liste ein Hinweistext statt einer Datei." Zeig, was du daraufhin an der Spec änderst. Antworte nur mit den Fragen und der Änderung.
  ```
  Ergebnis wörtlich notieren. Erwartet (rot): mindestens eins von beidem, eine Frage nach dem Export-Format (CSV/Excel) oder eine Änderung ohne Vorher/Nachher bzw. direkt in die Datei geschrieben. Tritt keins auf, nennt der Abschluss der Umsetzung das als `Szenario ohne Skill ohne Fehlschlag`.

  ## Grün: mit Skill
  Neue Kopie `<KOPIE2>`. `description: "Spec grillen mit Skill"`, `prompt`:
  ```text
  Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau; <PLUGIN> ist <R>/plugins/forge. Argument: <KOPIE2>. Stell mir die erste Runde Fragen. Meine Antwort auf eine Frage zur leeren Kundenliste lautet schon jetzt: "Bei leerer Liste ein Hinweistext statt einer Datei." Zeig, was du daraufhin an der Spec änderst, und schreib nichts, solange ich es nicht bestätigt habe.
  ```
  Erwartet (grün): keine Frage zum Export-Format; die Änderung erscheint mit Abschnitt, Vorher und Nachher; die neue Entscheidung als `- **W · … ** · Aussage — …`. Befehl: `git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling/spec.md <KOPIE2>` — erwartet: Exit 0 (Datei unverändert).

  ## Lücke schließen
  Fragt der Agent im grünen Lauf doch nach dem Format oder schreibt er ohne Bestätigung: die Ausrede wörtlich als Zeile in die Tabelle `Rote Flaggen` von `plugins/forge/skills/spec-grilling/SKILL.md`, Commit `git commit -m "fix(forge): close a spec-grilling loophole" -- plugins/forge/skills/spec-grilling/SKILL.md`, grünen Lauf wiederholen.
  ````
  Datei `plugins/forge/tests/spec-grilling.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readMarkdown, readText, wordCount } = require('./lib/markdown');

  const SKILL = path.join(__dirname, '..', 'skills', 'spec-grilling', 'SKILL.md');
  const FIXTURE = path.join(__dirname, 'fixtures', 'spec-grilling', 'spec.md');
  const SCENARIO = path.join(__dirname, 'fixtures', 'spec-grilling', 'szenario.md');

  test('specGrilling_Frontmatter_ModelInvocableWithSpecArgument', () => {
    // Act
    const { fields } = readMarkdown(SKILL);

    // Assert
    assert.equal(fields.name, 'spec-grilling');
    assert.match(fields.description, /^Use when/);
    assert.doesNotMatch(fields.description, /: /);
    assert.equal(fields['disable-model-invocation'], undefined);
    assert.equal(fields['argument-hint'], '<spec.md>');
  });

  test('specGrilling_Body_TreatsEveryDecisionAsAnswered', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Jeder W-Eintrag unter `## Entscheidungen` ist beantwortet. Eine Frage, die ein W-Eintrag beantwortet, stellst du nicht'));
    assert.ok(body.includes('| „Zur Sicherheit frag ich das Format nochmal.“ | Ein W-Eintrag ist beantwortet. |'));
  });

  test('specGrilling_Body_AsksOnlyEdgeCasesContradictionsAndGapsInRoundFormat', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    for (const part of ['Grenzfälle:', 'Widersprüche zwischen Abschnitten', 'Lücken:', '<PLUGIN>/skills/spec-whiteboarding/references/grill-rounds.md', 'Rundenformat aus `grill-rounds.md`', 'je Runde die komplette Frontier']) {
      assert.ok(body.includes(part), part);
    }
  });

  test('specGrilling_Body_WritesChangesOnlyAfterBeforeAfterAndConfirmation', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('legst du je Stelle Abschnitt, Vorher und Nachher wörtlich vor. Du schreibst erst nach ausdrücklicher Bestätigung; bis dahin bleibt die Datei unverändert.'));
  });

  test('specGrilling_Body_RecordsNewDecisionsAsWEntries', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('`- **W · <Kurztitel>** · Aussage — <Antwort>` unter `## Entscheidungen`'));
  });

  test('specGrilling_Body_EndsWithoutCommitAndStaysShort', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Kein Commit, kein automatischer Start.'));
    assert.ok(wordCount(body) < 500, `${wordCount(body)} Wörter`);
    assert.equal((body.match(/„/g) || []).length, (body.match(/“/g) || []).length);
  });

  test('specGrillingFixture_Spec_HasTheExportFormatDecision', () => {
    // Act
    const text = readText(FIXTURE);

    // Assert
    assert.ok(text.includes('- **W · Export-Format** · Aussage — CSV.'));
  });

  test('specGrillingFixture_Szenario_HasBothRunsWithPromptsAndExpectations', () => {
    // Act
    const text = readText(SCENARIO);

    // Assert
    for (const part of [
      'Ausführende: die Hauptsession der Umsetzung, nicht der Umsetzer.', '`subagent_type: "general-purpose"`, `model: "sonnet"`',
      '## Rot: ohne Skill', 'Grille die Spec <KOPIE> auf Grenzfälle, Widersprüche und Lücken.', 'eine Frage nach dem Export-Format (CSV/Excel)',
      '## Grün: mit Skill', 'Lies <R>/plugins/forge/skills/spec-grilling/SKILL.md und folge ihm genau', 'keine Frage zum Export-Format',
      '`git diff --no-index --quiet plugins/forge/tests/fixtures/spec-grilling/spec.md <KOPIE2>` — erwartet: Exit 0',
      '## Lücke schließen',
    ]) assert.ok(text.includes(part), part);
  });
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/spec-grilling.test.js` — erwartet: FAIL `specGrilling_Frontmatter_ModelInvocableWithSpecArgument` (`ENOENT … skills/spec-grilling/SKILL.md`)
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/skills/spec-grilling/SKILL.md`:
  ````markdown
  ---
  name: spec-grilling
  description: Use when a written dv-forge spec.md should be grilled once more for edge cases, contradictions and gaps before its review, without asking again what its decisions already answer. Auslöser sind Spec grillen, Grenzfälle der Spec prüfen, Lücken und Widersprüche in der Spec finden sowie grill the spec und stress-test a written spec.
  argument-hint: <spec.md>
  ---

  # Spec grillen

  `$ARGUMENTS`: `<S>` Spec. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
  Du prüfst eine geschriebene Spec nur auf Grenzfälle, Widersprüche und Lücken. Du entwirfst nichts Neues, schreibst keinen Plan und keinen Code.

  ## Ablauf
  1. **Lesen:** `<S>` fehlt → „Spec nicht gefunden: <S>“, Ende. Lies `<S>`, dann `<PLUGIN>/skills/spec-whiteboarding/references/grill-rounds.md`, `ac-rules.md` und `spec-format.md` im selben Ordner.
  2. **Beantwortet:** Jeder W-Eintrag unter `## Entscheidungen` ist beantwortet. Eine Frage, die ein W-Eintrag beantwortet, stellst du nicht, auch nicht anders formuliert oder als Bestätigung.
  3. **Frontier:** nur
     - Grenzfälle: leere, doppelte oder fehlende Werte, Abbruch, Fehlerpfad, gleichzeitige Aktionen
     - Widersprüche zwischen Abschnitten, Akzeptanzkriterien und W-Einträgen
     - Lücken: Vorgabe ohne Akzeptanzkriterium, Akzeptanzkriterium ohne Vorgabe, Begriff ohne Bedeutung

     Fragen im Rundenformat aus `grill-rounds.md`, Nummern ab Q1, je Runde die komplette Frontier. Ist sie leer, weiter mit 6.
  4. **Änderung:** Ändert eine Antwort die Spec, legst du je Stelle Abschnitt, Vorher und Nachher wörtlich vor. Du schreibst erst nach ausdrücklicher Bestätigung; bis dahin bleibt die Datei unverändert.
  5. **Entscheidung:** Jede neue Entscheidung des Menschen steht im selben bestätigten Schreibschritt als `- **W · <Kurztitel>** · Aussage — <Antwort>` unter `## Entscheidungen`.
  6. **Ende:** Liste der geänderten Stellen und der neuen W-Einträge, oder „Keine Änderung.“. Kein Commit, kein automatischer Start.

  ## Rote Flaggen
  | Gedanke | Richtig |
  |---|---|
  | „Zur Sicherheit frag ich das Format nochmal.“ | Ein W-Eintrag ist beantwortet. |
  | „Kleine Korrektur, die schreib ich direkt.“ | Erst Vorher/Nachher, dann Bestätigung. |
  | „Die Spec könnte noch eine Funktion mehr haben.“ | Nur Grenzfälle, Widersprüche, Lücken. |
  | „Die Entscheidung merke ich mir.“ | W-Eintrag unter `## Entscheidungen`. |
  ````
  Befehl: `node plugins/toolbelt/scripts/validate-skill.js plugins/forge/skills/spec-grilling` — erwartet: `Skill gültig: spec-grilling`, Exit 0
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/spec-grilling.test.js plugins/forge/tests/domain-modeling.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/spec-grilling/SKILL.md plugins/forge/tests/fixtures/spec-grilling/spec.md plugins/forge/tests/fixtures/spec-grilling/szenario.md plugins/forge/tests/spec-grilling.test.js` · `git commit -m "feat(forge): add spec-grilling skill"`
- [ ] **Schritt 6: Szenario an die Hauptsession übergeben**
  Du startest keinen SubAgent. Dein Bericht endet mit `Status: done-with-concerns` und der Bedenken-Zeile `Szenario rot/grün für spec-grilling offen: die Hauptsession führt plugins/forge/tests/fixtures/spec-grilling/szenario.md aus.` Die Hauptsession führt beide Läufe nach dem Review dieses Tasks aus und trägt das Ergebnis in den Abschluss der Umsetzung ein.

---

### Task 17: Skill `session-orchestrator` und README

**ACs:** AC-01, AC-02, AC-07, AC-08, AC-14, AC-16, AC-17, AC-21, AC-25, AC-26, AC-27, AC-31, AC-37, AC-38, AC-45, AC-47, AC-54, AC-59

**Dateien:**
- Create: `plugins/forge/skills/session-orchestrator/SKILL.md`
- Create: `plugins/forge/skills/session-orchestrator/references/ablauf.md`
- Create: `plugins/forge/tests/session-orchestrator-skill.test.js`
- Modify: `plugins/forge/README.md:9-33` · `## Ablauf`, `## Skills`
- Create: `plugins/forge/tests/session-chain-readme.test.js`

**Interfaces:**
- Consumes: CLI `session-chain.js` mit `entry`, `set`, `brief`, `turn` (`--turn-datei`), `final` (auch `WEITER=doppelt`), `halt`, `commit`, `schluss` (Task 11); Tool `mcp__ccd_session__start_session` mit `initiation` (`user_asked` | `own_initiative`), `context` `fresh`, `use_worktree`, `title`, `prompt`, `background`, `model`
- Produces: Skill `dv-forge:session-orchestrator`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  Datei `plugins/forge/tests/session-orchestrator-skill.test.js`:
  ```js
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
    assert.ok(body.includes('`<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B>`'));
  });

  test('sessionOrchestrator_Body_StartsStageItselfOrShowsProposalCard', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    for (const part of ['`mcp__ccd_session__start_session` mit `initiation` `user_asked`', '`prompt` = Text nach `=== BRIEF ===`', '`background` = Text nach `=== HINTERGRUND ===`',
      '`MODELL=sonnet`: `model` = Sonnet-Modell-ID aus deiner Umgebung; `MODELL=opus`: kein `model`',
      'Lehnt die App den Start ab: derselbe Aufruf mit `initiation` `own_initiative` und eine Zeile „Ein Klick auf die Karte startet die Etappe <e>.“']) {
      assert.ok(body.includes(part), part);
    }
  });

  test('sessionOrchestrator_Body_HoldsAtHaltepunktUntilTheHumanAnswers', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('**Haltepunkt:** Block ausgeben, Turn beenden; im Next-Step-Feld Knöpfe mit der Empfehlung zuerst. Bis zur Antwort startest du nichts.'));
    assert.ok(body.includes('`etappe=go`: `<SC> halt --slug <slug> --art go`, Haltepunkt (Regel 4).'));
  });

  test('sessionOrchestrator_Body_NeverActsForAStageSession', () => {
    // Act
    const { body } = readMarkdown(SKILL);

    // Assert
    assert.ok(body.includes('Du änderst nie Spec, Plan oder Code, beantwortest keine Frage einer Etappen-Session und führst nie eine Aktion aus, die eine Etappen-Session nicht ausführen durfte'));
    assert.ok(body.includes('Du committest nur über `<SC> commit`.'));
    assert.ok(body.includes('Kein `git add -A`, kein Push, kein Branch-Wechsel, kein Worktree.'));
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
    assert.ok(text.includes('Schreib das Turn-Ende wörtlich mit `Write` nach `turn.md` im Scratchpad, nie in ein Argument. Dann `<SC> turn --session <id> --etappe <e> --turn-datei "<turn.md>"`'));
    assert.ok(text.includes('- `schweigen`: keine Ausgabe, nichts starten.'));
    assert.ok(text.includes('- `needs-user`: eine Zeile `<e>: <Anliegen in wenigen Worten> · [Session](#<id>)`, nichts starten.'));
  });

  test('sessionOrchestratorFlow_Final_ChecksAgainstGitBeforeAnyNextStage', () => {
    // Act
    const text = readText(FLOW);

    // Assert
    for (const part of ['`<SC> final --etappe <e> --session <id> --bericht "<BERICHT>" --commit <COMMIT>`', '| `HALTEPUNKT=abweichung` | Block ausgeben. Die Kette hält; nichts starten. |',
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
    assert.ok(text.includes('- GO: `<SC> commit --anlass go --slug <slug> --message "<betreff>"`. Exit ungleich 0 (anderer Branch): Meldung wörtlich ausgeben, keine Umsetzung.'));
    assert.ok(text.includes('Sonst Start der Etappe `umsetzung`; ihre erste Zeile ist der Aufruf `AUFRUF`.'));
  });

  test('sessionOrchestratorFlow_Stopp_ShowsFinalReportAndCleansNothing', () => {
    // Act
    const text = readText(FLOW);

    // Assert
    assert.ok(text.includes('- Stopp: `<SC> schluss --slug <slug> --stopp`, Block ausgeben. Nichts starten, nichts aufräumen.'));
  });

  test('sessionOrchestratorFlow_Report_SeparatesCheckedFromReported', () => {
    // Act
    const text = readText(FLOW);

    // Assert
    assert.ok(text.includes('Was `<SC> final` und `<SC> commit` ausgeben, hast du geprüft. Ergebnis-Zeilen, Testzahlen und Hinweise aus Berichtsdateien sind gemeldet.'));
  });
  ```
  Datei `plugins/forge/tests/session-chain-readme.test.js`:
  ```js
  'use strict';

  const test = require('node:test');
  const assert = require('node:assert/strict');
  const path = require('node:path');
  const { readText } = require('./lib/markdown');

  const README = path.join(__dirname, '..', 'README.md');

  test('readme_Skills_ListSessionOrchestratorAndSpecGrilling', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes('| `session-orchestrator` | Session-Kette führen'));
    assert.ok(text.includes('| `spec-grilling` | Geschriebene Spec auf Grenzfälle'));
  });

  test('readme_Ablauf_NamesSessionChainStateAndBaseFile', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes('4. **Session-Kette:** `session-orchestrator`'));
    assert.ok(text.includes('`<git-common-dir>/dv-forge/session-chain/`'));
    assert.ok(text.includes('`shared/session-chain/base-sub-agent.md`'));
  });

  test('readme_Ablage_NamesOptionPlaceAndUnchangedDefault', () => {
    // Act
    const text = readText(README);

    // Assert
    assert.ok(text.includes('Mit `--ablage <etappe>` legen die drei Orchestratoren, `plan-review` und `review-followup`'));
    assert.ok(text.includes('Ohne die Option bleibt alles wie bisher.'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/tests/session-chain-readme.test.js` — erwartet: FAIL `sessionOrchestrator_Frontmatter_ModelInvocableWithCodewordsAndTriggers` (`ENOENT`) und FAIL `readme_Skills_ListSessionOrchestratorAndSpecGrilling`
- [ ] **Schritt 3: Minimal implementieren**
  Datei `plugins/forge/skills/session-orchestrator/SKILL.md`:
  ````markdown
  ---
  name: session-orchestrator
  description: Use when an idea, a spec or a plan should run as a session chain in which every stage works in its own session and one lead session starts the stages, checks their results against git and holds at fixed points for the human. Auslöser sind Session-Kette starten, Kette über Sessions, jede Etappe in eigener Session sowie start a session chain und run each stage in its own session.
  argument-hint: [grill|spec-review|planning|plan-review|implementation|finish] [pfade] [workitem-nr]
  ---

  # Session-Orchestrator

  `$ARGUMENTS`: Codewort, Pfade, optional Workitem-Nr. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`. `<SC>` = `node "<PLUGIN>/scripts/session-chain.js"`.
  Du bist die Leit-Session. Du änderst nie Spec, Plan oder Code, beantwortest keine Frage einer Etappen-Session und führst nie eine Aktion aus, die eine Etappen-Session nicht ausführen durfte; der Mensch gibt dort frei. Du committest nur über `<SC> commit`.

  ## Regeln
  1. Läufst du nicht auf Opus, startest du keine Etappe und sagst: „Die Leit-Session muss auf Opus laufen.“
  2. Blöcke nach `=== AUSGABE ===` und `=== ZUSTAND ===` gibst du unverändert aus. Exit ungleich 0 eines `<SC>`-Aufrufs: Meldung wörtlich ausgeben, nichts starten.
  3. **Start einer Etappe:** `<SC> brief --etappe <e> --slug <slug>`, dann `mcp__ccd_session__start_session` mit `initiation` `user_asked`, `context` `fresh`, `use_worktree` `false`, `title` = `TITEL`, `prompt` = Text nach `=== BRIEF ===`, `background` = Text nach `=== HINTERGRUND ===`. `MODELL=sonnet`: `model` = Sonnet-Modell-ID aus deiner Umgebung; `MODELL=opus`: kein `model`. Lehnt die App den Start ab: derselbe Aufruf mit `initiation` `own_initiative` und eine Zeile „Ein Klick auf die Karte startet die Etappe <e>.“
  4. **Haltepunkt:** Block ausgeben, Turn beenden; im Next-Step-Feld Knöpfe mit der Empfehlung zuerst. Bis zur Antwort startest du nichts. Unklare Antwort: einmal nachfragen.
  5. Kein `git add -A`, kein Push, kein Branch-Wechsel, kein Worktree.

  ## Einstieg
  1. `<SC> entry $ARGUMENTS`. `=== ZUSTAND ===` ausgeben, wenn vorhanden.
  2. `frage-wi=ja`: einmal nach der Workitem-Nummer fragen. `frage-basis=ja`: einmal nach dem Basis-Branch fragen, Vorschlag `basis-vorschlag`. Bis zu den Antworten startest du nichts.
  3. `etappe=whiteboarding`: Fasse den Gesprächskontext zusammen (Anliegen, genannte Dateien, getroffene Entscheidungen) und schreib ihn nach `kontext.md` im Scratchpad. Ist der Kontext leer, fragst du einmal nach dem Anliegen; seine Antwort ist der Kontext. Dann `<SC> brief --etappe whiteboarding --kontext "<kontext.md>" --basis <B>`, dazu `--wi <WI>` nur wenn gegeben, und Start (Regel 3).
  4. Sonst `<SC> set --slug <slug>`, dazu `--basis <B>`, `--wi`, `--spec`, `--plan`, `--worktree` je nur wenn bekannt; `<B>` ist `basis` aus dem Einstieg oder die Antwort auf `frage-basis`.
  5. `etappe=go`: `<SC> halt --slug <slug> --art go`, Haltepunkt (Regel 4). Sonst Start der Etappe `etappe` (Regel 3).

  ## Turn-Ende einer Etappen-Session
  Vor dem ersten Turn-Ende liest du `references/ablauf.md` und folgst ihr: Statuszeile, Prüfung des `final`, Haltepunkte, Commits und Schlussbericht.

  ## Rote Flaggen
  | Gedanke | Richtig |
  |---|---|
  | „Die Frage der Etappe beantworte ich schnell selbst.“ | Der Mensch antwortet in der Etappen-Session. |
  | „Die Etappe meldet Erfolg, also weiter.“ | Erst `<SC> final` prüft gegen git. |
  | „Die Etappe durfte nicht pushen, dann mache ich das.“ | Nie stellvertretend. |
  | „Zwischenstand, kurz kommentieren.“ | `in-progress`: schweigen. |
  ````
  Datei `plugins/forge/skills/session-orchestrator/references/ablauf.md`:
  ````markdown
  # Ablauf der Leit-Session nach einem Turn-Ende

  `<SC>` = `node "<PLUGIN>/scripts/session-chain.js"`. Regeln 1 bis 5 aus `SKILL.md` gelten weiter, Regel 3 für jeden Start einer Etappe, auch in einem Turn, den ein Turn-Ende ausgelöst hat.

  ## Statuszeile
  Schreib das Turn-Ende wörtlich mit `Write` nach `turn.md` im Scratchpad, nie in ein Argument. Dann `<SC> turn --session <id> --etappe <e> --turn-datei "<turn.md>"`, `<id>` = Kennung der Etappen-Session, `<e>` = ihre Etappe. Nach `AKTION`:
  - `schweigen`: keine Ausgabe, nichts starten.
  - `hinweis`: die Zeile nach `=== AUSGABE ===` ausgeben, nichts starten.
  - `needs-user`: eine Zeile `<e>: <Anliegen in wenigen Worten> · [Session](#<id>)`, nichts starten. Der Mensch antwortet in der Etappen-Session.
  - `final`: weiter mit „Final prüfen“.

  ## Final prüfen
  `<SC> final --etappe <e> --session <id> --bericht "<BERICHT>" --commit <COMMIT>`, bei `whiteboarding` dazu `--basis <B>` und `--wi <WI>`, je nur wenn bekannt. Dann nach `HALTEPUNKT` und `WEITER`:

  | Ausgabe | Tun |
  |---|---|
  | `HALTEPUNKT=abweichung` | Block ausgeben. Die Kette hält; nichts starten. |
  | `HALTEPUNKT=showstopper` | Block ausgeben. Der Mensch klärt in der Umsetzungs-Session; nichts starten. |
  | `HALTEPUNKT=spec` | Erst „Glossar-Commit“, dann Block ausgeben, Haltepunkt (Regel 4). |
  | `HALTEPUNKT=go` | Block ausgeben, Haltepunkt (Regel 4). |
  | `WEITER=doppelt` | Schweigen: dieses `final` ist schon verarbeitet; nichts starten. |
  | `WEITER=<etappe>` | Start dieser Etappe (Regel 3), Slug aus `SLUG`. |
  | `WEITER=ende` | Block (Schlussbericht) ausgeben. Ende der Kette. |

  ## Glossar-Commit
  `<SC> commit --anlass spec --slug <slug> --message "<betreff>"`. Betreff nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, leer → Projekt-`CLAUDE.md`; Workitem-Nummer nur, wenn es eine gibt. Zeilen `NICHT-COMMITTET=…` nennst du in einer Zeile.

  ## Antwort am Spec-Haltepunkt
  - Planning: Start der Etappe `planning`.
  - Spec-Nacharbeit: Start der Etappe `spec-nacharbeit` mit `--quelle "<bericht.md der letzten Spec-Review-Etappe>"`.
  - Stopp: `<SC> schluss --slug <slug> --stopp`, Block ausgeben. Nichts starten, nichts aufräumen.

  ## Antwort am GO-Haltepunkt
  - GO: `<SC> commit --anlass go --slug <slug> --message "<betreff>"`. Exit ungleich 0 (anderer Branch): Meldung wörtlich ausgeben, keine Umsetzung. Sonst Start der Etappe `umsetzung`; ihre erste Zeile ist der Aufruf `AUFRUF`.
  - Plan-Nacharbeit: Start der Etappe `plan-nacharbeit` mit `--quelle "<bericht.md der letzten Planning- oder Plan-Review-Etappe>"`.
  - Stopp: wie am Spec-Haltepunkt.

  ## Geprüft und gemeldet
  Was `<SC> final` und `<SC> commit` ausgeben, hast du geprüft. Ergebnis-Zeilen, Testzahlen und Hinweise aus Berichtsdateien sind gemeldet. Der Schlussbericht trennt beides; in eigenen Sätzen hältst du es genauso.
  ````
  Befehl: `node plugins/toolbelt/scripts/validate-skill.js plugins/forge/skills/session-orchestrator` — erwartet: `Skill gültig: session-orchestrator`, Exit 0
  In `plugins/forge/README.md`:
  - Im Abschnitt `## Ablauf` direkt nach Punkt `3. **Umsetzung:** …` als Punkt 4 einfügen:
    ````markdown
    4. **Session-Kette:** `session-orchestrator` führt Whiteboarding, Grill (`spec-grilling`), Spec-Review, Planning, Plan-Review, Umsetzung und Abschluss je in einer eigenen Etappen-Session. Die Leit-Session startet die Etappen, prüft jedes `final` gegen git, hält am Spec- und am GO-Haltepunkt und führt den Zustand je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`: Ketten-Regeln und Gesprächsstil.
    ````
  - Nach dem Absatz, der mit `Jeder Orchestrator vermerkt am Ende einen **Ketten-Eintrag**` beginnt, eine Leerzeile und diesen Absatz einfügen:
    ````markdown
    Mit `--ablage <etappe>` legen die drei Orchestratoren, `plan-review` und `review-followup` Abschlussbericht und Bericht-Daten zusätzlich unter `<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/` ab, gemeinsam für den Haupt-Checkout und alle Worktrees. Ohne die Option bleibt alles wie bisher.
    ````
  - In der Tabelle `## Skills` direkt vor der Zeile `| \`domain-modeling\` | …` einfügen:
    ````markdown
    | `spec-grilling` | Geschriebene Spec auf Grenzfälle, Widersprüche und Lücken prüfen; W-Einträge gelten als beantwortet |
    | `session-orchestrator` | Session-Kette führen: jede Etappe in eigener Session, Haltepunkte, Prüfung gegen git, Schlussbericht |
    ````
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/tests/session-chain-readme.test.js plugins/forge/tests/retro-moved.test.js plugins/forge/tests/domain-modeling.test.js` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/skills/session-orchestrator/SKILL.md plugins/forge/skills/session-orchestrator/references/ablauf.md plugins/forge/tests/session-orchestrator-skill.test.js plugins/forge/README.md plugins/forge/tests/session-chain-readme.test.js` · `git commit -m "feat(forge): add session-orchestrator skill for the session chain"`

---

### Task 18: Version und Gesamtlauf

**ACs:** AC-56

**Dateien:**
- Modify: `plugins/forge/.claude-plugin/plugin.json:3` · `"version"`

**Interfaces:**
- Consumes: alle vorigen Tasks
- Produces: dv-forge `0.27.0`

- [ ] **Schritt 1: Absicherungstest nennen**
  Die gesamte bestehende Testsuite des Plugins sichert AC-56 ab: Ohne `--ablage` bleiben Ausgaben, Dateien und Commits gleich.
- [ ] **Schritt 2: Absicherungstest laufen lassen**
  Befehl: `node --test "plugins/forge/tests/*.test.js"` — erwartet: PASS (alle Tests); rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Version setzen**
  In `plugins/forge/.claude-plugin/plugin.json` die Zeile `"version": "0.26.0",` ersetzen durch:
  ```json
    "version": "0.27.0",
  ```
- [ ] **Schritt 4: Commit**
  `git add plugins/forge/.claude-plugin/plugin.json` · `git commit -m "chore(forge): bump dv-forge to 0.27.0"`

## Entscheidungen
- **W · Planungs-Skills** · Aussage — `dv-toolbelt:writing-skills @plugins/forge/skills` und `dv-craft:craft-unit-testing @plugins/forge/tests`.
- **W · Form der Leit-Ausgaben** · Aussage — Ein Skript (`session-chain.js`) rendert Spec-Haltepunkt, GO-Haltepunkt, Hinweise und Schlussbericht als feste Textblöcke; die Leit-Session gibt sie unverändert aus. Spec-Haltepunkt: `# Spec-Haltepunkt`, `**Ergebnis:**`, `**Empfehlung:**` (bei Stopp mit Grund), `**Offene Punkte:**` mit `- 🟡 <Titel> · <Herkunfts-Etappe>`, `**Auswahl:** Planning · Spec-Nacharbeit · Stopp`. GO-Haltepunkt: `# GO-Haltepunkt`, `**Spec:**`, `**Plan:**`, `**Ergebnis:**` (fehlt ohne Plan-Review), `**Empfehlung:**`, `**Offene Punkte:**`, `**Aufruf:**`, `**Auswahl:** GO · Plan-Nacharbeit · Stopp`. Schlussbericht: `# Schlussbericht der Session-Kette <slug>` mit `## Etappen`, `## Geprüft`, `## Gemeldet`, `## Offene Punkte`, nach Stopp `## Fortsetzen`, mit Workitem `## Workitem` mit optionalem `finishing-workitem <WI>`. `needs-user`: eine Zeile `<Etappe>: <Anliegen> · [Session](#<id>)`.
- **W · Auswahl am Haltepunkt** · Aussage — Die Leit-Session gibt den Block aus und beendet den Turn; der Mensch antwortet als Text, das Next-Step-Feld zeigt Knöpfe mit der Empfehlung zuerst. Kein `AskUserQuestion`.
- **W · Szenario-Tests** · Aussage — Text-Tests und `validate-skill.js` für alle Skills; ein Subagent-Szenario rot/grün nur für `spec-grilling` (W-Eintrag „Export-Format: CSV“ wird nicht erneut erfragt, Änderung als Vorher/Nachher). Für `session-orchestrator` und die additiven Optionen kein Szenario.
- **W · Gesprächsstil der Etappen-Sessions** · Aussage — Jede neue Etappen-Session bekommt eine abgespeckte, eigene Fassung der i-have-adhd-Regeln im Ton eines Gesprächs an der Kaffeemaschine, ohne Verweis auf `i-have-adhd`. Sie steht zusammen mit den festen Brief-Bausteinen in `plugins/forge/shared/session-chain/base-sub-agent.md`; das Brief-Skript kopiert den Inhalt in jeden Brief. Feste Formate der Skills gehen vor.
- **W · Brief der Nacharbeit** · Aussage — Spec- und Plan-Nacharbeit haben keinen Skill; ihr Brief beginnt ohne Slash-Befehl mit der Auftragszeile `Spec-Nacharbeit <S>` bzw. `Plan-Nacharbeit <P> <S>`. Auftrag: offene ❓ und 🔴 ohne Vorschlag aus dem Bericht der letzten Review-Etappe klären, Änderungen als Vorher/Nachher nach Bestätigung, neue Entscheidungen als W-Einträge; die Spec-Nacharbeit committet nur die Spec, die Plan-Nacharbeit committet nicht.
- **E · Beleg zum Slash-Befehl im Brief** · Planer — Belegt in dieser Planning-Etappe einer Session-Kette: Der erste Prompt der Session begann mit dem Hintergrund-Text der App (`Background (from the session that started this one)`), der Slash-Befehl stand erst unter `Task:` und lief nicht als Befehl; der Skill musste über das Skill-Werkzeug geladen werden. `start_session` verlangt bei `context: fresh` ein `background`, das vor dem Brief steht. Darum ruft jede Etappe ihren Skill über das Skill-Werkzeug auf (Regel 1 in `base-sub-agent.md`); der Schutz der Review-Dateien durch den dv-forge-Hook (`UserPromptSubmit`) fehlt dann, wie die Spec es für diesen Fall vorsieht.
- **E · Ort von Zustand und Ablage** · Planer — `<git-common-dir>/dv-forge/session-chain/<slug>/` mit `zustand.json`, `ablage/<etappe>/` und `turns/<session>.json` daneben; dasselbe Muster wie der Ketten-Eintrag von `chain.js`, gemeinsam für Haupt-Checkout und Worktrees.
- **E · Form der Ablage-Option** · Planer — `--ablage <etappe>` mit einem der Etappen-Namen. Ein Review beginnt die Ablage seiner Etappe neu (`bericht-review.json`/`.md`), ein Followup legt `bericht-followup-<n>` daneben, ein Orchestrator kopiert `abschluss.md`, `bericht-*.json` und `fakten.md` mit `--neu`. Die `argument-hint`-Zeilen bleiben unverändert, damit die bestehenden Tests und AC-56 gelten.
- **E · Berichtsdatei einer Etappe** · Planer — `session-chain.js etappe-report` (bis R1 `stage-report`) schreibt `bericht.md` (voller Bericht, Entscheidungen, Glossar-/ADR-Dateien, Testzahlen, bei der Umsetzung Prüfung) und `bericht.json` für die Leit-Session in die Ablage der Etappe.
- **E · Offene Punkte** · Planer — Die Leit-Session liest 🟡 und 🟢 aus allen Bericht-Daten einer Etappe; ein Punkt ist erst erledigt, wenn eine spätere Runde ihn als Änderung mit `ok: true` meldet. So bleiben Punkte, die ein Followup bewusst „nicht geändert“ lässt, in der Liste (im Probelauf fehlten sie im Abschlussbericht). Ein neuer Lauf derselben Etappe ersetzt deren Punkte; Punkte anderer Etappen bleiben.
- **E · Quelle der Showstopper** · Planer — Die Umsetzungs-Etappe meldet Prüfergebnis, nicht lauffähige Befehle und AC ohne beweisenden Test in ihrer Berichtsdatei (`--pruefung`, `--luecke`, `--ac-ohne-test`); die Ergebnis-Zeile kommt aus ihrem Abschlussbericht. Ein Integrationspunkt ohne Test ist dort kein Feld und damit nur ein 🟡.
- **E · Umsetzungs-Aufruf** · Planer — Die erste Zeile des Umsetzungs-Briefs ist genau der Aufruf des GO-Haltepunkts (AC-28, AC-36); `--ablage umsetzung` steht im Auftrag des Briefs.
- **E · Commits der Leit-Session** · Planer — Nur Markdown-Dateien; eine gemeldete andere Datei bleibt liegen und wird genannt (AC-62). Vor dem GO-Commit prüft `commit --anlass go` den Basis-Branch und committet bei Abweichung nichts (AC-35).
- **E · GO-Empfehlung ohne Plan-Review** · Planer — Ohne Ergebnis-Zeile (Einstieg `implementation`) empfiehlt der GO-Haltepunkt GO; Spec-Review ohne Ergebnis-Zeile gilt wie ⚠️ (Stopp mit Grund).
- **E · Slug beim Einstieg `finish` ohne Zustand** · Planer — Der Ordnername des Worktrees; mit Zustand der Slug des Zustands, der diesen Worktree nennt.
- **E · Modelle beim Start** · Planer — Opus-Etappen erben das Modell der Leit-Session (kein `model`), Sonnet-Etappen nennen die Sonnet-Modell-ID aus der Umgebung der Leit-Session; `start_session` nimmt nur gleiche oder günstigere Modelle.
- **E · Wortgrenze `spec-review-orchestrator`** · Planer — Die Testgrenze steigt von 650 auf 700 Wörter, weil der Ablage-Schritt den Rumpf verlängert. Überholt durch R1 · Task 15: Der Ablage-Schritt steht in `shared/session-chain/ablage.md`, die Grenze bleibt 650.
- **E · Version** · Planer — `0.27.0` als eigener `chore(forge)`-Commit wie bei früheren Ständen.
- **R1 · AC-55** — frage an den menschen — AC-55 und der Brief-Baustein verlangen den Slug in jedem Brief, auch im Brief der Whiteboarding-Etappe; nur Workitem, Basis-Branch und Pfade stehen unter dem Vorbehalt, dass Zustand oder Aufruf sie liefern. Der Slug entsteht aber erst im Whiteboarding: `spec-whiteboarding` legt Titel und Slug zur Bestätigung vor und schlägt bei vorhandenem Ordner einen anderen vor, und laut Spec läuft das Whiteboarding vollständig wie heute (W · Bestehende Skills). Soll der Slug beim Whiteboarding fehlen dürfen, weil die Etappe ihn über ihre Spec meldet (`etappe-report --spec`, so plant es Task 7), oder soll die Leit-Session vorab einen Slug festlegen, den das Whiteboarding übernehmen muss?
- **R1 · Global Constraints** — geändert — Die Global Constraints nennen jetzt jede Soll-Vorgabe der Spec mit ihrem Wert, gegliedert nach den Unterabschnitten der Spec (Aufruf und Einstieg, Etappen, Haltepunkte, Report-Protokoll, Briefe, Git und Commits, Zustand und Schlussbericht, Bestehende Skills): Skill-Name und Auslöser, Codewort je erster Etappe mit Argumentmuster, Kontext-Zusammenfassung, unbekanntes Codewort, Existenzprüfung, Herkunft von Workitem und Basis-Branch, Skills je Etappe, Grill-Regeln, Nacharbeiten, Plan-Review-Etappe, Schleifen, Selbststart oder Vorschlagskarte, beide Haltepunkte, Showstopper samt Ausnahme, Halt vor dem Push, `needs-user`, Stopp, Melde- und Startverbot, Berichtsdatei, Turn-Enden, Prüfung gegen git, geprüft und gemeldet, Brief-Bausteine, alle Commit-Regeln, Push, Freigaben, Zustand, Schlussbericht, ADO und `--ablage` mit festem Ort je Slug und dem Kreis der fünf Skills. Sprachregel festgelegt: Bezeichner englisch wie im Bestand; die Begriffe der Kette aus Spec und Glossar und die Felder von Ausgabezeilen, Zustand und Bericht-Daten bleiben Deutsch, weil sie dieselben Wörter wie Spec und Glossar tragen; Stufe (`STAGES`, `stage`) bleibt dem Ketten-Eintrag (W · Begriffe). In den bestehenden englischen Modulen bleiben `storage`, `storeReport`, `checkedStorage`, `storageOf` englisch. Folgen im Plan: `STAGES` in `session-chain-brief.js` heißt `ETAPPEN_BRIEFS`, `GLOSSARY_STAGES` in `session-chain-commit.js` heißt `GLOSSARY_ETAPPEN`, `stageReport` heißt `etappeReport`, der CLI-Befehl `stage-report` heißt `etappe-report`. `node:crypto` steht in der Liste der erlaubten Standardmodule.
- **R1 · Task 10** — geändert — Die Berichtsdatei einer Etappe ist ein eigenes Modul `session-chain-report.js` (`etappeReport`, `readInput`, `readData`, `REPORT_FILE`, `DATA_FILE`) mit eigenem Test; `session-chain-steps.js` behält nur die Schritte der Leit-Session. Neu `holdAt`, das `halt` in den Zustand schreibt, damit ein Stopp nach dem Einstieg `implementation` das Codewort `implementation <S> <P>` nennt (Tests `holdAt_GoOnStateWithOldSpecHalt_OverwritesHaltAndShowsGo`, `closing_StoppAfterHoldAtGoWithoutFinal_NamesImplementationResume`). `processFinal` verarbeitet ein `final` nur einmal: Schlüssel aus Session, Etappe, Commit und SHA-1 der Bericht-Daten, gespeichert als `schluessel` im Eintrag unter `etappen`; bei bekanntem Schlüssel `weiter: 'doppelt'` ohne Zustandsänderung, ein neuer Commit derselben Session zählt neu (Tests `processFinal_SameFinalTwice_ProcessesItOnce`, `processFinal_SameSessionNewCommit_ProcessesAgain`). Übergebene Dateien liest `readInput` und meldet Lesefehler als `SessionChainError` mit Pfad; `readData` meldet fehlende und kaputte Bericht-Daten getrennt; `etappeReport` liest vor dem Schreiben, damit ein Lesefehler nichts ablegt.
- **R1 · Task 11** — geändert — Die Interface-Zeile von `entry` ist wiederhergestellt, die Interfaces nennen alle Befehle mit ihrem neuen Verhalten. `halt` ruft `holdAt` und schreibt damit `halt` in den Zustand; der Test `schluss_StoppAfterHaltGoWithoutFinal_NamesImplementationResume` prüft den Weg `set`, `halt --art go`, `schluss --stopp`. Dazu: `turn --turn-datei` statt `--text`, `brief --kontext` über `readInput`, `final` druckt `WEITER=doppelt`, der Befehl heißt `etappe-report`; neue Tests für fehlende Pflichtwerte, fehlende Kontext-Datei, `set` ohne `--basis` und ein doppeltes `final`.
- **R1 · Task 14** — geändert — Der Anker der Dateizeile zu `review-followup/SKILL.md:13` ist jetzt `wie beim Original-Review.`; er steht genau einmal in Zeile 13 und enthält keinen Backtick, den die Anker-Prüfung als Ende der Spanne liest.
- **R1 · Task 15** — geändert — Der Ablage-Schritt der drei Orchestratoren steht in der neuen Datei `plugins/forge/shared/session-chain/ablage.md`, ein Abschnitt je Orchestrator mit seinem `store`-Aufruf. Jeder Rumpf bekommt nur die Argument-Zeile zu `--ablage <E>` und einen Unterpunkt zwischen `show` und der Ausgabe, der nur mit der Option auf seinen Abschnitt verweist. Die Anhebung der Wortgrenze von `spec-review-orchestrator.test.js` entfällt; nach Zählung (Leerraum-Wörter) bleiben die Rümpfe bei rund 639 von 650, 528 von 550 und unter 700 Wörtern. Die Dateizeilen nennen als Anker `Abschlussbericht, letzte Handlung:` bzw. `Abschlussbericht, auch bei jedem früheren Ende`; der Test prüft Verweis, Reihenfolge und die drei Abschnitte von `ablage.md`.
- **R1 · Task 16** — geändert — Die beiden Agent-Läufe stehen nicht mehr als Schritte des Umsetzers im Task, sondern in der neuen Fixture `plugins/forge/tests/fixtures/spec-grilling/szenario.md` mit Kopierbefehl, beiden Prompts, Erwartung rot und grün, Prüfbefehl und dem Schließen einer Lücke über `Rote Flaggen`. Ein Text-Test sichert die Datei ab. Der Umsetzer startet keinen SubAgent und meldet `done-with-concerns` mit offenem Szenario; die Hauptsession der Umsetzung führt beide Läufe nach dem Review des Tasks aus. W · Szenario-Tests bleibt erfüllt, nur der Ausführende wechselt; die Reihenfolge rot vor Skill entfällt, weil der rote Lauf den Skill nicht kennt. Schritte neu: 1 Tests und Fixtures, 2 rot, 3 Implementieren, 4 grün, 5 Commit, 6 Übergabe.
- **R1 · Task 17** — geändert — `ablauf.md` lässt das Turn-Ende mit `Write` nach `turn.md` im Scratchpad schreiben und übergibt nur den Dateipfad (`--turn-datei`); fremder Text kommt nie auf die Kommandozeile. Einstieg Punkt 4 setzt `--basis <B>` wie die übrigen Werte nur, wenn er bekannt ist (`basis` aus dem Einstieg oder Antwort auf `frage-basis`), damit `finish` ohne Zustand ohne Basis-Branch läuft (AC-08 im Task ergänzt). Die Tabelle in „Final prüfen“ hat die Zeile `WEITER=doppelt` (schweigen). Die Skill-Tests prüfen alle drei Sätze.
- **R1 · Task 4** — geändert — `parseStatusLine` nimmt nur noch `COMMIT=none` oder 4 bis 40 Hex-Zeichen und `BERICHT=none` oder einen Pfad ohne `"`, `'`, Backtick, `$`, `;`, `&`, `|`, `<`, `>`; Leerzeichen im Pfad bleiben möglich, weil `ablauf.md` den Pfad quotet. Eine abgelehnte Zeile zählt wie ein Turn-Ende ohne Statuszeile (W · Turn-Ende ohne Statuszeile bleibt erfüllt). Neue Tests für Shell-Syntax im Commit, Anführungszeichen und Semikolon im Bericht, Pfad mit Leerzeichen und die Zählung einer abgelehnten Zeile.
- **R1 · Task 7** — geändert — Die Brief-Tabelle heißt `ETAPPEN_BRIEFS` (Variable `etappenBrief`), der Befehl der Berichtsdatei `etappe-report`, damit sie nicht mit `STAGES` aus `chain.js` verwechselt wird. Regel 5 in `base-sub-agent.md` sagt jetzt, dass die Statuszeile als einzige Zeile vor dem Bericht des Skills steht und Regeln wie `nichts davor oder danach` ab der zweiten Zeile gelten. Jede Etappe hat Pflichtwerte (`pflicht`); fehlt einer, wirft `buildBrief` `Etappe <e>: <wert> fehlt` und die CLI endet mit Exit 1, statt `undefined` in den Befehl zu schreiben. Der Auftrag der Plan-Review-Etappe nennt als `--bericht` die `.md`-Datei zur letzten `ABLAGE`-Zeile; `etappeReport` nimmt auch die `.json` und liest dann die `.md` daneben (Task 10). Neue Tests für alle vier Punkte.
- **W · Nachbesserung nach dem Plan-Review** · Aussage — Der Mensch hat nach dem Plan-Review angewiesen, die offenen Punkte aus „Was ist noch offen“ selbst zu beheben und den Plan danach ohne weitere Prüfung als „Bereit zur Umsetzung“ zu melden. Die sechs 🟡 und die ❓ sind unten als N-Einträge eingearbeitet; ein erneutes Plan-Review lief nicht. Der Code aller Tasks lief vor dem Einarbeiten in einer Kopie des Plugins mit der gesamten Testsuite grün.
- **W · Slug im Whiteboarding-Brief** · delegiert — Antwort auf die ❓ zu AC-55: Die Leit-Session legt keinen Slug vorab fest, weil das Whiteboarding Titel und Slug zur Bestätigung vorlegt und unverändert läuft. Der Brief der Whiteboarding-Etappe trägt trotzdem eine Slug-Zeile: `` - Slug: folgt aus der Spec, die diese Etappe schreibt (Ordnername bei `spec.md`) ``; die Etappe meldet ihre Spec über `etappe-report --spec`, die Leit-Session übernimmt den Slug daraus (Task 7, Task 10).
- **N · Task 1** — geändert — Doppelte Hilfen im Zustandsmodul: `storeDir` in `chain.js` bekommt den Parameter `name` (Standard `chain`, Verhalten des Bestands gleich) und wird exportiert; `chainsRoot` ruft `storeDir(dir, 'session-chain')`. Die Ablage (`ablageDir`, `storeFiles`, `followupNumbers`, `nextFollowupName`, `REVIEW_FILE`, `FOLLOWUP_FILE`) liegt im neuen Modul `session-chain-ablage.js`, die Turn-Zähler in `session-chain-turn.js` (Task 4). `session-chain-store.js` behält Zustand, Slug, Etappen-Namen und `slugByWorktree`.
- **N · Task 8, Task 10** — geändert — Slugs von Spec und Plan: Der Einstieg mit Spec und Plan bricht bei verschiedenen Slugs mit `EntryError` ab; `processFinal` hält bei `planning`, wenn der gemeldete Plan einen anderen Slug als die Kette hat. Bestehende Skills bleiben unverändert.
- **N · Task 13** — geändert — Roter Guard-Test: Der Test prüft jetzt einen geschützten Ordner (`setupDirectory`), in dem nur Skripte aus `ALLOWED_SCRIPTS` laufen dürfen; ohne `session-chain.js` dort ist er rot (belegt). Die Prüfung eines Etappen-Namens steht nur noch in `etappeError` (`session-chain-store.js`); `checkedEtappe`, `checkedStorage` (`review-flow.js`) und `storageOf` (`prepare.js`) rufen sie.
- **N · Task 2** — geändert — Doppelte Regeln für offene Punkte: Die Regel der Leit-Liste steht als `mergeOpenKeepUnchanged` neben `mergeOpen` in `orchestrator-report.js`, mit Kommentar zur Abweichung; `readPart` und `keyOf` werden geteilt. `mergeOpen` und der Abschlussbericht bleiben unverändert; ein Test belegt den einzigen Unterschied (gewählte, nicht geänderte Gruppe). Die Dateinamen der Ablage kommen aus `session-chain-ablage.js`.
- **N · Task 8** — geändert — Leerer Workitem-Eintrag: `forge-config.js` exportiert zusätzlich `workitemPattern`; der Einstieg fragt nur, wenn `workitemPattern(Workitem)` nicht null ist (leer, `keine` und ungültiges Muster heißen „keine Workitem-Nummern“). Neuer Test für den leeren Eintrag.
- **N · Task 5, Task 9, Task 10** — geändert — Git-Hilfen: Das neue Modul `session-chain-git.js` (Task 5) bündelt `git`, `gitOrThrow`, `toplevel`, `isDirty`, `sameDir`, `worktreeListed` und `relative`; Prüfung, Commits, Schritte und Einstieg nutzen es. `realPath` löst einen fehlenden Pfad über den echten Elternordner auf, damit `relative` auch für noch nicht bestehende Dateien stimmt. Bestandsskripte bleiben unberührt.
