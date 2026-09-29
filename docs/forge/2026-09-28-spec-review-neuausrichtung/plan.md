# Spec-Review neu ausrichten — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation docs/forge/2026-09-28-spec-review-neuausrichtung/plan.md`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** Die fünf Reviewer, der Scout und die Nacharbeit des Spec-Reviews prüfen nur noch, ob die Spec stimmig, verständlich und grob umsetzbar ist, und die Nacharbeit schreibt belegtes neues Verhalten selbst.
**Architektur:** Das Verhalten steckt fast ganz in den Agent-Prompts unter `plugins/forge/agents/`; ihre Texte sichern `node:test`-Tests in `plugins/forge/tests/agents.test.js` ab. Nur zwei Stellen brauchen Skript-Code: `flow-questions.js` prüft das neue Feld `evidence` im Ergebnis der Nacharbeit, und `flow-report.js` listet im Bericht die Stellen mit neuem Verhalten und Beleg. Ablauf, Farben, Deckel und Status (`review-rules.js`, `shared/review-flow/flow.md`, `flow-report.statusOf`) bleiben unverändert.
**Tech-Stack:** Markdown-Agent-Prompts, Node.js (CommonJS), `node:test`, `node:assert/strict`
**Spec:** docs/forge/2026-09-28-spec-review-neuausrichtung/spec.md
**Basis:** e015bc8

## Global Constraints
- Ziel jedes Reviewer-Auftrags, wörtlich aus der Spec: stimmig, verständlich und grob umsetzbar, Details entscheidet der Plan.
- Kategorien: `widerspruch`, `fehlendes-verhalten` und `unerfuellbar` blocken, `detail` ist ein Hinweis, `formulierung` eine Anmerkung. Farben, Deckel, Status und Ablauf eines Laufs ändert kein Task: `plugins/forge/scripts/lib/review-rules.js`, `plugins/forge/shared/review-flow/flow.md` und `statusOf` in `plugins/forge/scripts/lib/flow-report.js` bleiben, wie sie sind.
- Jeder Reviewer-Auftrag nennt „Groß- oder Kleinschreibung, ß oder ss, Umlaute“ wörtlich als Beispiel für `detail`. Nur `clarity` meldet diese Schreibweisen; die übrigen nennen sie nur zur Abgrenzung vom Stil.
- Ein W-Eintrag ist nie selbst ein Finding. Einträge im Abschnitt „Offen, bewusst nicht weiterverfolgt (Abbruch)“ sind weder Finding noch Lücke.
- Kein Reviewer des Spec-Reviews ist nur beratend: `ADVISORY['spec-review']` bleibt `[]`.
- Agent-Texte sind Deutsch und verwenden typografische Anführungszeichen „ (U+201E) und “ (U+201C), immer paarig; die Tests zählen beide. Nach dem Schreiben prüfst du sie per Code Point, weil Editoren und Agents „“ gern zu `"` normalisieren.
- Testnamen folgen dem Bestand: `<Einheit>_<Situation>_<Erwartung>`. Tests laufen mit `node --test <R>/plugins/forge/tests/<datei>.test.js`; die ganze Suite mit `node --test plugins/forge/tests/*.test.js` aus `<R>` in der Bash.
- `plugins/forge/skills/spec-review/SKILL.md`: Body unter 500 Wörtern (Test `skill_Body_StaysUnder500WordsWithPairedQuotes`).
- Planungs-Skills: keine (W · Planungs-Skills).

---

### Task 1: Gemeinsamer Rahmen der fünf Spec-Reviewer

**ACs:** AC-14, AC-17, AC-32

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-completeness.md:17` · `## Prüfauftrag` (davor einfügen), dazu `## Kategorie` (ersetzen)
- Modify: `plugins/forge/agents/spec-review-consistency.md:16` · `## Prüfauftrag` (davor einfügen), dazu `## Kategorie` (ersetzen)
- Modify: `plugins/forge/agents/spec-review-feasibility.md:16` · `## Prüfauftrag` (davor einfügen), dazu `## Kategorie` (ersetzen)
- Modify: `plugins/forge/agents/spec-review-clarity.md:16` · `## Prüfauftrag` (davor einfügen), dazu `## Kategorie` (ersetzen)
- Modify: `plugins/forge/agents/spec-review-profiles.md:22` · `## Prüfauftrag` (davor einfügen), dazu `## Kategorie` (ersetzen)
- Test: `plugins/forge/tests/agents.test.js` · `specAndPlanReviewers_Body_NameCategoriesNeverColours` (danach einfügen)

**Interfaces:**
- Consumes: —
- Produces: Abschnitt `## Ziel` und neuer Abschnitt `## Kategorie` in allen fünf Spec-Reviewern; Tasks 2 bis 6 ändern danach nur `## Prüfauftrag` und `## Nicht deine Aufgabe`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach dem Test `specAndPlanReviewers_Body_NameCategoriesNeverColours` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `specReviewers_Body_GoalSpellingExampleAndNoFormulierung`
- [ ] **Schritt 3: Minimal implementieren**
  a) In `spec-review-completeness.md`, `spec-review-consistency.md`, `spec-review-feasibility.md` und `spec-review-profiles.md` direkt vor der Zeile `## Prüfauftrag` einfügen (danach eine Leerzeile):
  ```markdown
  ## Ziel
  Die Spec soll stimmig, verständlich und grob umsetzbar sein, nicht perfekt. Details entscheidet der Plan. Du meldest nur, was aus deinem Blickwinkel wesentlich ist. Eine Formulierung, einen Stil oder einen Randfall meldest du nie. Uneinheitliche Schreibweisen eines Begriffs (Groß- oder Kleinschreibung, ß oder ss, Umlaute) sind kein Stil, sondern `detail`; sie meldet nur `clarity`, du meldest sie nicht.
  ```
  b) In `spec-review-clarity.md` direkt vor der Zeile `## Prüfauftrag` einfügen (danach eine Leerzeile):
  ```markdown
  ## Ziel
  Die Spec soll stimmig, verständlich und grob umsetzbar sein, nicht perfekt. Details entscheidet der Plan. Du meldest nur, was aus deinem Blickwinkel wesentlich ist. Eine Formulierung, einen Stil oder einen Randfall meldest du nie. Uneinheitliche Schreibweisen eines Begriffs (Groß- oder Kleinschreibung, ß oder ss, Umlaute) sind kein Stil, sondern `detail`; du meldest sie.
  ```
  c) In allen fünf Dateien den ganzen Abschnitt `## Kategorie` (von der Überschrift bis vor `## Ausgabe`) ersetzen durch:
  ```markdown
  ## Kategorie
  Jedes Finding bekommt genau eine Kategorie und keine Farbe; die Farbe leitet ein Skript ab. Ein Feld `severity` oder `color` macht dein Ergebnis ungültig. Welche Kategorie ein Befund bekommt, legt dein Prüfauftrag fest.
  - `widerspruch` — zwei Aussagen schließen sich aus.
  - `fehlendes-verhalten` — Verhalten, das die Spec beschreiben müsste, fehlt in ihr.
  - `unerfuellbar` — Anforderungen sind nicht zugleich erfüllbar, oder eine Entscheidung macht eine Anforderung unerfüllbar.
  - `detail` — eine Einzelheit, die der Plan selbst entscheiden kann.
  - `formulierung` — meldest du nie.
  ```
  Der Abschnitt `## W-Einträge` bleibt in allen fünf Dateien unverändert; er deckt AC-32 ab.
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS, darunter `specReviewers_Body_GoalSpellingExampleAndNoFormulierung`, `specAndPlanReviewers_Body_NameCategoriesNeverColours` und je Reviewer `spec-review-<name>_Body_EmbedsFindingFormatWithOwnReviewerName` (prüft die W- und Abbruch-Regel, AC-32)
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-completeness.md plugins/forge/agents/spec-review-consistency.md plugins/forge/agents/spec-review-feasibility.md plugins/forge/agents/spec-review-clarity.md plugins/forge/agents/spec-review-profiles.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): spec reviewers share goal, spelling rule and category frame"`

---

### Task 2: Vollständigkeit (`completeness`)

**ACs:** AC-01, AC-02, AC-03, AC-04, AC-05

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-completeness.md:17-23` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js` · `specReviewers_Body_GoalSpellingExampleAndNoFormulierung` (danach einfügen)
- Test: `plugins/forge/tests/review-groups.test.js` · `classify_SameInputTwice_SameGroupsAndDrops` (danach einfügen)

**Interfaces:**
- Consumes: `## Ziel` und `## Kategorie` aus Task 1 (bleiben unverändert)
- Produces: Finding ohne AC-ID mit `location` = Text der Titelüberschrift ohne `#`, `quote` = `Keine AC-ID in der Spec`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach `specReviewers_Body_GoalSpellingExampleAndNoFormulierung` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-completeness_Body_CategoriesPerCaseTitleHeadingAndSourceForEveryArt`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/spec-review-completeness.md` den ganzen Abschnitt `## Prüfauftrag` (bis vor `## Nicht deine Aufgabe`) ersetzen durch:
  ```markdown
  ## Prüfauftrag
  1. Liste jede Funktion und jedes Verhalten, das die Spec beschreibt. Zu jeder muss mindestens ein nummeriertes Akzeptanzkriterium `AC-<Zahl>` existieren. Fehlt es, meldest du ein Finding der Kategorie `fehlendes-verhalten` an der Abschnittsüberschrift der Funktion.
  2. Nennt ein AC gar kein beobachtbares Ergebnis, etwa „dann funktioniert der Export korrekt“, meldest du an seiner AC-ID ein Finding der Kategorie `fehlendes-verhalten`. Nennt es ein Ergebnis ohne Maß, etwa „dann lädt die Liste schnell“, ist das Finding `detail`.
  3. Enthält die Spec gar keine AC-ID, meldest du genau ein Finding der Kategorie `fehlendes-verhalten` an der Titelüberschrift (`#`) des Dokuments und keine weiteren Findings je Funktion ohne AC. `location` ist der Text der Titelüberschrift ohne `#`, `quote` ist `Keine AC-ID in der Spec`.
  4. Ist eine Quelle angegeben, gleichst du sie bei jeder Art der Spec ab, auch bei `Art: frei`: Jedes Anliegen der Quelle, das die Spec nicht abdeckt, meldest du als `fehlendes-verhalten` an der passendsten Überschrift. `quote` beginnt dann mit `Quelle: `.
  5. Der Abschnitt „Entscheidungen“ gehört zur Spec. Eine dort begründete Auslassung ist kein Befund.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS `spec-review-completeness_Body_CategoriesPerCaseTitleHeadingAndSourceForEveryArt`
- [ ] **Schritt 5: Absicherungstest schreiben**
  Das Skript ordnet ein Finding an der Titelüberschrift schon heute richtig ein; der Test hält das fest. In `plugins/forge/tests/review-groups.test.js` direkt nach `classify_SameInputTwice_SameGroupsAndDrops` einfügen:
  ```js
  test('classify_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle', () => {
    const text = ['# Export neu', '', 'Status: bestätigt am 2026-09-28', 'Art: verankert', '', '## Verhalten', 'Der Export läuft.', ''].join('\n');
    const titleFinding = { location: 'Export neu', quote: 'Keine AC-ID in der Spec', category: 'fehlendes-verhalten', consequence: 'c', rationale: 'r' };
    const result = groups.classify([{ reviewer: 'completeness', finding: titleFinding }], { kind: 'spec-review', text });
    assert.deepEqual(result.groups.map((group) => `${group.color}:${group.key}`), ['red:Export neu']);
    assert.deepEqual(result.dropped, []);
  });
  ```
- [ ] **Schritt 6: Absicherungstest laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/review-groups.test.js` — erwartet: PASS `classify_FindingAtTitleHeadingWithoutAcQuote_RedAtTitle`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 7: Commit**
  `git add plugins/forge/agents/spec-review-completeness.md plugins/forge/tests/agents.test.js plugins/forge/tests/review-groups.test.js` · `git commit -m "feat(forge): completeness reports missing behaviour, vague ACs and source gaps by category"`

---

### Task 3: Konsistenz (`consistency`)

**ACs:** AC-06, AC-07, AC-08

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-consistency.md:16-20` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-completeness_Body_CategoriesPerCaseTitleHeadingAndSourceForEveryArt` (danach einfügen)

**Interfaces:**
- Consumes: `## Ziel` und `## Kategorie` aus Task 1
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach `spec-review-completeness_Body_CategoriesPerCaseTitleHeadingAndSourceForEveryArt` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-consistency_Body_ContradictionAndReferenceCategories`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/spec-review-consistency.md` den ganzen Abschnitt `## Prüfauftrag` (bis vor `## Nicht deine Aufgabe`) ersetzen durch:
  ```markdown
  ## Prüfauftrag
  1. Vergleiche alle Aussagen der Spec untereinander, auch die im Abschnitt „Entscheidungen“. Jeden Widerspruch meldest du als `widerspruch` an der Stelle der späteren Aussage. In `quote` stehen beide Zitate, getrennt durch ` ↔ `.
  2. Die Spec muss in sich abgeschlossen sein. Links, Ticket-Nummern, Pfade zu anderen Dateien, „siehe Dokument X“ meldest du jeweils an ihrer Stelle.
  3. Ein Verweis bei einer Funktion, die die Spec selbst beschreibt, ist `detail`. Ist der Verweis die einzige Beschreibung einer Funktion, ist er `fehlendes-verhalten`.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS `spec-review-consistency_Body_ContradictionAndReferenceCategories`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-consistency.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): consistency rates references by whether they replace a description"`

---

### Task 4: Machbarkeit (`feasibility`)

**ACs:** AC-09, AC-10

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-feasibility.md:16-20` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-consistency_Body_ContradictionAndReferenceCategories` (danach einfügen)

**Interfaces:**
- Consumes: `## Ziel` und `## Kategorie` aus Task 1
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach `spec-review-consistency_Body_ContradictionAndReferenceCategories` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-feasibility_Body_UnfulfillableAtRequirementAndPreconditionIsDetail`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/spec-review-feasibility.md` den ganzen Abschnitt `## Prüfauftrag` (bis vor `## Nicht deine Aufgabe`) ersetzen durch:
  ```markdown
  ## Prüfauftrag
  1. Anforderungen, die nicht zugleich erfüllbar sind, meldest du als `unerfuellbar`. Das Finding kommt an die spätere der beiden Stellen, beide Zitate stehen in `quote`, getrennt durch ` ↔ `.
  2. Eine Entscheidung im Abschnitt „Entscheidungen“, die eine Anforderung unerfüllbar macht, meldest du als `unerfuellbar` an der Anforderung, nie am Eintrag der Entscheidung.
  3. Eine Voraussetzung, die die Spec selbst nennt, aber nirgends herstellt, einfordert oder als gegeben festlegt, ist `detail`.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS `spec-review-feasibility_Body_UnfulfillableAtRequirementAndPreconditionIsDetail`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-feasibility.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): feasibility treats missing preconditions as detail"`

---

### Task 5: Klarheit (`clarity`)

**ACs:** AC-11, AC-12, AC-13

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-clarity.md:1-23` · `# Spec-Review: Klarheit und Lücken`, dazu Frontmatter `description`, `## Prüfauftrag`, `## Nicht deine Aufgabe`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-feasibility_Body_UnfulfillableAtRequirementAndPreconditionIsDetail` (danach einfügen)

**Interfaces:**
- Consumes: `## Ziel` und `## Kategorie` aus Task 1
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach `spec-review-feasibility_Body_UnfulfillableAtRequirementAndPreconditionIsDetail` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-clarity_Body_TwoReadingsHowInsteadOfWhatNoEdgeCaseSearch`
- [ ] **Schritt 3: Minimal implementieren**
  a) In `plugins/forge/agents/spec-review-clarity.md` die Frontmatter-Zeile `description:` ersetzen durch:
  ```yaml
  description: Use when the dv-forge spec-review orchestrator needs a spec.md checked for acceptance criteria with two readings, implementation details that belong in a plan rather than a spec, and inconsistent spellings of a term.
  ```
  b) Die Überschrift `# Spec-Review: Klarheit und Lücken` ersetzen durch:
  ```markdown
  # Spec-Review: Klarheit
  ```
  c) Die Abschnitte `## Prüfauftrag` und `## Nicht deine Aufgabe` (von `## Prüfauftrag` bis vor `## W-Einträge`) ersetzen durch:
  ```markdown
  ## Prüfauftrag
  1. Ein AC mit zwei verschiedenen Lesarten ist `detail`. In `rationale` stehen beide Lesarten.
  2. WIE statt WAS: Namen von Klassen, Dateien, Tabellen oder Frameworks, Dateipfade und technische Schritte. Eine Spec beschreibt beobachtbares Verhalten. Solche Details sind `detail`.
  3. Einen Begriff, den die Spec uneinheitlich schreibt (Groß- oder Kleinschreibung, ß oder ss, Umlaute), meldest du als `detail`.

  ## Nicht deine Aufgabe
  Rand- und Fehlerfälle — nach ihnen suchst du nicht. Fehlende Akzeptanzkriterien, Widersprüche, Machbarkeit, externe Verweise.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS `spec-review-clarity_Body_TwoReadingsHowInsteadOfWhatNoEdgeCaseSearch` und `spec-review-clarity_Frontmatter_NameToolsModelDescription`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-clarity.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): clarity stops searching edge cases and rates readings as detail"`

---

### Task 6: Profil-Abgleich (`profiles`)

**ACs:** AC-15, AC-16

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-profiles.md:22-28` · `## Prüfauftrag`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-clarity_Body_TwoReadingsHowInsteadOfWhatNoEdgeCaseSearch` (danach einfügen)

**Interfaces:**
- Consumes: `## Ziel` und `## Kategorie` aus Task 1
- Produces: —

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  In `plugins/forge/tests/agents.test.js` direkt nach `spec-review-clarity_Body_TwoReadingsHowInsteadOfWhatNoEdgeCaseSearch` einfügen:
  ```js
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
  ```
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: FAIL `spec-review-profiles_Body_ActualStateIsContradictionGlossaryTermIsDetail`
- [ ] **Schritt 3: Minimal implementieren**
  In `plugins/forge/agents/spec-review-profiles.md` den ganzen Abschnitt `## Prüfauftrag` (bis vor `## Nicht deine Aufgabe`) ersetzen durch:
  ```markdown
  ## Prüfauftrag
  1. Wähle aus dem Index die Profile, deren Titel oder erste Aussage Begriffe oder Bereiche der Spec betreffen, und lies nur diese. Im Zweifel liest du eins mehr. `summary` nennt beides, z. B. `32 Profile im Index, 5 gelesen` oder `Auszug gelesen, 1 Profil nachgelesen`.
  2. Begriffe der Spec, die im Glossar anders heißen oder dort unter „Nicht verwenden“ stehen, sind `detail`. `rationale` nennt den Glossar-Begriff.
  3. Aussagen der Spec über den Ist-Stand (vorhandene Funktionen, Module, Zuständigkeiten), die einem Modul- oder Feature-Profil widersprechen, sind `widerspruch`. `rationale` nennt die Profil-Datei und zitiert die Profil-Aussage.
  4. Gleichnamige Profil-Dateien an verschiedenen Orten, die sich zu einer Aussage widersprechen, sind ein eigenes Finding an der betroffenen Spec-Stelle. `rationale` nennt beide Dateien.
  ```
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js` — erwartet: PASS `spec-review-profiles_Body_ActualStateIsContradictionGlossaryTermIsDetail` und `spec-review-profiles_Body_WritesExcerptOnceAndReadsItInLaterRounds`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-review-profiles.md plugins/forge/tests/agents.test.js` · `git commit -m "feat(forge): profiles rates glossary terms as detail"`

---

### Task 7: Scout mit Beleg je Vorschlag

**ACs:** AC-18, AC-19, AC-20

**Dateien:**
- Modify: `plugins/forge/agents/spec-review-scout.md:8-40` · `# Spec-Review: Scout` (ab dieser Zeile bis Dateiende ersetzen)
- Modify: `plugins/forge/skills/spec-review/SKILL.md:34-35` · `## Scout`
- Test: `plugins/forge/tests/agents.test.js` · `spec-review-scout_Body_DefinesProposalFormat` (danach einfügen)
- Test: `plugins/forge/tests/skill.test.js` · `skill_Body_ListsAllAgents` (danach einfügen)
- Test: `plugins/forge/tests/review-flow-round1.test.js` · `round1_RedAndYellow_ScoutSeesBothReworkOnlyRedWithProposals` (danach einfügen)

**Interfaces:**
- Consumes: Profil-Index `PI` aus `prepare.js` (Zeile je Datei unter Glossar- und Profil-Ordner, Pfad relativ zum Repo), bei `profile=ja`
- Produces: Scout-Gruppe mit je Vorschlag einer eingerückten Zeile `   Beleg: <Beleg>` bzw. `   Beleg: keiner`; Beleg-Formen `<Datei>`, `<Datei> · <Begriff>`, `Spec · <Stelle>`. Task 8 liest diese Zeilen.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  a) In `plugins/forge/tests/agents.test.js` direkt nach `spec-review-scout_Body_DefinesProposalFormat` einfügen:
  ```js
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
  ```
  b) In `plugins/forge/tests/skill.test.js` direkt nach `skill_Body_ListsAllAgents` einfügen:
  ```js
  test('skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles', () => {
    const { body } = readMarkdown(SKILL);
    assert.ok(body.includes('`dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`; bei `profile=ja` zusätzlich `Profil-Index: <PI>`'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js <R>/plugins/forge/tests/skill.test.js` — erwartet: FAIL `spec-review-scout_Body_EvidenceLinePerProposalAndSpecOnlyWhenFree` und FAIL `skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles`
- [ ] **Schritt 3: Minimal implementieren**
  a) In `plugins/forge/agents/spec-review-scout.md` alles ab der Zeile `# Spec-Review: Scout` bis zum Dateiende ersetzen durch (die Frontmatter bleibt):
  ````markdown
  # Spec-Review: Scout

  Du arbeitest in einem `spec-review`-Lauf, nach Runde 1 oder nach der Nachprüfung. Du bist rein beratend: Du änderst keine Datei, schreibst nur deine Ergebnisdatei und löst keine weitere Runde aus. Du liest die Spec, die Findings und, wenn `Repo:` angegeben ist, die Profile und das Glossar aus `Profil-Index:` sowie den Code im Repo. Ohne `Repo:` ist die Spec frei: Du stützt jeden Vorschlag nur auf die Spec. Den Chatverlauf liest du nicht.

  ## Eingabe
  - `Spec:` absoluter Pfad zur `spec.md`
  - `Repo:` optional, absoluter Pfad zur Projektwurzel
  - `Profil-Index:` optional, nur mit `Repo:`: Datei mit einer Zeile je Profil- und Glossar-Datei, Pfad relativ zu `Repo:`
  - `Findings:` Datei mit den Gruppen, die das Skript für dich ausgewählt hat; du liest den Abschnitt nach `=== REWORK ===` mit Gruppen im Format `### <Stufe> <Stelle> (<Reviewer>)`, darunter die Einzel-Findings
  - `Ergebnis:` absoluter Pfad deiner Ergebnisdatei (`scout.md`)

  ## Auftrag
  1. Du bearbeitest jede Gruppe der Datei `Findings:`, 🔴 und 🟡; das Skript hat sie ausgewählt. 🟢-Gruppen kommen darin nicht vor.
  2. Pro Gruppe findest du 1 bis 3 Lösungsvorschläge. Jeder Vorschlag sagt konkret, wie die Spec geändert werden soll: welcher Abschnitt oder welches AC, mit welchem neuen oder geänderten Wortlaut. Die Spec bleibt dabei beim WAS: keine Klassen-, Datei- oder Tabellennamen im Vorschlagstext.
  3. Mit `Repo:` richtest du die Vorschläge am Bestand aus: an den Profilen und Glossar-Einträgen aus `Profil-Index:`, falls angegeben, und am Code. Beantwortet der Code ein Finding, nennt der Vorschlag die Code-Datei als Beleg; beantwortet es ein Glossar-Eintrag, nennt er diesen Eintrag als Beleg. Ohne `Repo:` stützt du dich nur auf die Spec, und kein Beleg nennt etwas außerhalb der Spec.
  4. Jeder Vorschlag nennt in einer eigenen, eingerückten Zeile darunter seinen Beleg: `Beleg: <Datei>` für Code oder ein Profil, Pfad relativ zu `Repo:`; `Beleg: <Datei> · <Begriff>` für einen Glossar-Eintrag; `Beleg: Spec · <Stelle>` für eine Aussage der Spec. Gibt es keinen Beleg, schreibst du `Beleg: keiner`.
  5. Genau ein Vorschlag pro Gruppe ist bevorzugt. Du begründest die Wahl in einem Satz: Warum er das Finding am sichersten auflöst und am besten zum Bestand passt.
  6. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Kein Vorschlag ändert oder streicht einen W-Eintrag. Berührt ein Finding einen W-Eintrag, lautet ein Vorschlag „Mit dem Menschen klären: <Frage>“.
  7. Keine Gruppe ohne Vorschlag, keine Gruppe mit mehr als drei.

  ## Ausgabe
  Deine letzte Aktion: Schreib mit `Write` an den Pfad aus `Ergebnis:` genau diese Überschrift und danach nur die Gruppen. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

  ```markdown
  ## Scout-Vorschläge

  ### 🔴 <Stelle>
  1. <Vorschlag>
     Beleg: <Beleg>
  2. <Vorschlag>
     Beleg: keiner
  **Bevorzugt: <Nr>** — <Begründung>
  ```

  - Reihenfolge und Stufe der Gruppen wie in `Findings:`.
  - `<Stelle>` und die Stufe übernimmst du exakt aus der Gruppen-Überschrift, ohne die Reviewer-Klammer.
  - Pro Gruppe genau eine Zeile `**Bevorzugt: <Nr>** — <Begründung>`, exakt mit Geviertstrich `—` nach dem fetten Teil, kein Doppelpunkt.
  ````
  b) In `plugins/forge/skills/spec-review/SKILL.md` unter `## Scout` die Zeile
  `` `dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>` ``
  ersetzen durch:
  ```markdown
  `dv-forge:spec-review-scout` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`; bei `profile=ja` zusätzlich `Profil-Index: <PI>`
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js <R>/plugins/forge/tests/skill.test.js` — erwartet: PASS, darunter `spec-review-scout_Body_EvidenceLinePerProposalAndSpecOnlyWhenFree`, `skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles`, `scouts_Body_WriteResultFileAndAnswerWithPathOnly` und `skill_Body_StaysUnder500WordsWithPairedQuotes`
- [ ] **Schritt 5: Absicherungstest schreiben**
  Das Skript nimmt Beleg-Zeilen schon heute als Teil des Vorschlags und reicht sie an die Nacharbeit weiter; der Test hält das fest. In `plugins/forge/tests/review-flow-round1.test.js` direkt nach `round1_RedAndYellow_ScoutSeesBothReworkOnlyRedWithProposals` einfügen:
  ```js
  test('scoutCheck_ProposalsWithEvidenceLines_OkAndEvidenceReachesRework', () => {
    const ws = flowWorkspace();
    ws.review('consistency', [finding('AC-04', 'widerspruch')]);
    ws.run('round1', 'spec-review', ws.doc, ws.workspace, 'consistency');
    ws.text('runde-1/scout.md', '## Scout-Vorschläge\n\n### 🔴 AC-04\n1. Vorschlag A\n   Beleg: src/export.js\n2. Vorschlag B\n   Beleg: keiner\n**Bevorzugt: 1** — sicher\n');
    assert.equal(ws.run('scout-check', ws.workspace, '1').stdout, 'SCOUT ok\n');
    assert.ok(ws.read('runde-1/nacharbeit.md').includes('Scout-Vorschläge:\n1. Vorschlag A\n   Beleg: src/export.js\n2. Vorschlag B\n   Beleg: keiner\n**Bevorzugt: 1** — sicher'));
  });
  ```
- [ ] **Schritt 6: Absicherungstest laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/review-flow-round1.test.js` — erwartet: PASS `scoutCheck_ProposalsWithEvidenceLines_OkAndEvidenceReachesRework`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 7: Commit**
  `git add plugins/forge/agents/spec-review-scout.md plugins/forge/skills/spec-review/SKILL.md plugins/forge/tests/agents.test.js plugins/forge/tests/skill.test.js plugins/forge/tests/review-flow-round1.test.js` · `git commit -m "feat(forge): spec scout names evidence per proposal and reads profiles when anchored"`

---

### Task 8: Nacharbeit schreibt belegtes neues Verhalten selbst

**ACs:** AC-21, AC-22, AC-23, AC-31

**Dateien:**
- Modify: `plugins/forge/agents/spec-rework.md:10-13` · `Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.` (Satz ersetzen), dazu `## Eingabe` (Zeile nach dem `Spec:`-Eintrag einfügen)
- Modify: `plugins/forge/agents/spec-rework.md:20-33` · `## Regeln`, Regeln 2, 3 und 9
- Modify: `plugins/forge/agents/spec-rework.md:53-73` · `## Ausgabe`
- Modify: `plugins/forge/skills/spec-review/SKILL.md:28-29` · `## Nacharbeiter`
- Modify: `plugins/forge/scripts/lib/flow-questions.js:17-23` · `resultProblem`, neue Funktion `evidenceForm` davor
- Test: `plugins/forge/tests/agents.test.js` · `spec-rework_Body_NewBehaviourBecomesQuestionNotDecision` (danach einfügen)
- Test: `plugins/forge/tests/flow-questions.test.js` · `reworkProblems_MissingDuplicateOrForeignOutcome_Named` (danach einfügen)
- Test: `plugins/forge/tests/skill.test.js` · `skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles` (danach einfügen; aus Task 7)

**Interfaces:**
- Consumes: Scout-Zeilen `   Beleg: <Beleg>` / `   Beleg: keiner` und `**Bevorzugt: <Nr>** — <Begründung>` aus Task 7 (stehen in `nacharbeit.md` unter `Scout-Vorschläge:`); Projektwurzel `R` und `art` aus `prepare.js`
- Produces: Ausgang in `rework.json` mit optionalem Feld `evidence: string`, nur bei `status: 'changed'`; `resultProblem(result, kind)` liefert `'<location>: evidence ist kein Text'`, `'<location>: evidence keiner ist kein Beleg'` (für `kein`, `keine` oder `keiner`, ohne Beachtung der Groß- und Kleinschreibung, auch mit angehängten Satzzeichen), `'<location>: evidence hat keine Beleg-Form'` (nicht `<Datei>`, `<Datei> · <Begriff>` oder `Spec · <Stelle>`; `<Datei>` ohne Leerraum) bzw. `'<location>: evidence nur bei changed'`; `evidenceForm(evidence)` liefert `true` für die drei Beleg-Formen; die Prüfung gilt für beide `kind`, weil `plan-rework` das Feld nie schreibt. Die Nacharbeit bekommt bei `art=verankert` `Repo: <R>` und schlägt Belege aus dem Bestand darunter nach. Task 9 liest `evidence`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  a) In `plugins/forge/tests/agents.test.js` direkt nach `spec-rework_Body_NewBehaviourBecomesQuestionNotDecision` einfügen:
  ```js
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
      '`- **R<r> · <Stelle>** — geändert — Neues Verhalten, Beleg: <Beleg> — <Begründung>`',
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
    assert.ok(!body.includes('sie binden dich nicht'), 'alte Scout-Regel');
    assert.ok(!body.includes('entscheidet das nur der Mensch: Du änderst die Spec an dieser Stelle nicht'), 'alte Regel 3');
  });
  ```
  b) In `plugins/forge/tests/flow-questions.test.js` direkt nach `reworkProblems_MissingDuplicateOrForeignOutcome_Named` einfügen:
  ```js
  test('reworkProblems_EvidenceOnlyAsTextOnChanged_ElseInvalid', () => {
    const valid = rework([{ location: 'AC-04', status: 'changed', evidence: 'src/export.js' }]);
    assert.deepEqual(questions.reworkProblems(valid, 'spec-review', ['AC-04']), []);
    const blank = rework([{ location: 'AC-04', status: 'changed', evidence: ' ' }]);
    assert.deepEqual(questions.reworkProblems(blank, 'spec-review', ['AC-04']), ['AC-04: evidence ist kein Text']);
    const none = rework([{ location: 'AC-04', status: 'changed', evidence: ' Keiner ' }]);
    assert.deepEqual(questions.reworkProblems(none, 'spec-review', ['AC-04']), ['AC-04: evidence keiner ist kein Beleg']);
    const noneDot = rework([{ location: 'AC-04', status: 'changed', evidence: 'keiner.' }]);
    assert.deepEqual(questions.reworkProblems(noneDot, 'spec-review', ['AC-04']), ['AC-04: evidence keiner ist kein Beleg']);
    for (const evidence of ['kein Beleg', 'Spec', 'Spec · ', 'src/export.js · Export · Import']) {
      const invalid = rework([{ location: 'AC-04', status: 'changed', evidence }]);
      assert.deepEqual(questions.reworkProblems(invalid, 'spec-review', ['AC-04']), ['AC-04: evidence hat keine Beleg-Form'], evidence);
    }
    for (const evidence of ['Spec · AC-02', 'docs/glossary/terms.md · Export', 'docs/keiner.md']) {
      const form = rework([{ location: 'AC-04', status: 'changed', evidence }]);
      assert.deepEqual(questions.reworkProblems(form, 'spec-review', ['AC-04']), [], evidence);
    }
    const onQuestion = rework([{ location: 'AC-04', status: 'human-question', evidence: 'src/export.js' }]);
    assert.deepEqual(questions.reworkProblems(onQuestion, 'spec-review', ['AC-04']), ['AC-04: evidence nur bei changed']);
  });
  ```
  c) In `plugins/forge/tests/skill.test.js` direkt nach `skill_Body_ScoutGetsRepoWhenAnchoredAndProfileIndexWithProfiles` einfügen:
  ```js
  test('skill_Body_ReworkGetsRepoOnlyWhenAnchored', () => {
    const { body } = readMarkdown(SKILL);
    assert.ok(body.includes('`dv-forge:spec-rework` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`'));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js <R>/plugins/forge/tests/flow-questions.test.js <R>/plugins/forge/tests/skill.test.js` — erwartet: FAIL `spec-rework_Body_ClarificationAndNewBehaviourWithEvidenceWrittenWithoutQuestion`, FAIL `reworkProblems_EvidenceOnlyAsTextOnChanged_ElseInvalid` und FAIL `skill_Body_ReworkGetsRepoOnlyWhenAnchored`
- [ ] **Schritt 3: Minimal implementieren**
  a) In `plugins/forge/agents/spec-rework.md`, Abschnitt `## Regeln`, Regel 2 ersetzen durch:
  ```markdown
  2. Pro Stelle entscheidest du genau einen Ausgang: **geändert**, **nicht geändert** oder **frage an den menschen**. „Nicht geändert“ ist nur mit einer Begründung aus der Spec selbst erlaubt, etwa weil das Finding auf einer Fehllesung beruht oder weil es einer bestehenden Entscheidung widerspricht und diese trägt. Wann du einem Scout-Vorschlag folgst, regelt Regel 3.
  ```
  b) Regel 3 ersetzen durch:
  ```markdown
  3. Vor jeder Änderung prüfst du, was sie ist:
     - Eine **Klarstellung** schärft, was die Spec schon festlegt: Wortlaut, Messbarkeit oder ein Widerspruch, dessen Auflösung aus der Spec folgt, weil eine andere Aussage oder ein W-Eintrag eine der beiden Seiten stützt. Eine Klarstellung schreibst du selbst, ohne Frage an den Menschen. Ist der bevorzugte Scout-Vorschlag eine Klarstellung, setzt du ihn um.
     - **Neues Verhalten** legt einen neuen Fall, eine neue Regel oder ein neues AC fest. Eine Auflösung eines Widerspruchs, die nicht so aus der Spec folgt, ist neues Verhalten, auch wenn sie nur eine Aussage streicht.
     - Bevorzugt ist der Vorschlag, den die Zeile `**Bevorzugt: <Nr>**` der Stelle nennt. Hat die Stelle keine solche Zeile, mehr als eine oder gar keine Scout-Vorschläge, gilt keiner als bevorzugt.
     - Neues Verhalten schreibst du selbst, wenn der bevorzugte Vorschlag einen Beleg aus der Spec oder aus dem Bestand nennt. Bestand sind Profile, Glossar und Code; steht im Kopf der Spec `Art: frei`, zählt nur ein Beleg aus der Spec. Ohne `Repo:` zählt ebenfalls nur ein Beleg aus der Spec. `Beleg: keiner` ist kein Beleg. Ein Beleg zählt nur in einer dieser Formen: `<Datei>`, `<Datei> · <Begriff>` oder `Spec · <Stelle>`. Einen Beleg `Spec · <Stelle>` schlägst du in der Spec nach; sagt die Stelle nicht, was der Vorschlag festlegt, ist er kein Beleg. Einen Beleg `<Datei>` oder `<Datei> · <Begriff>` schlägst du unter `Repo:` nach; fehlt die Datei, steht der Begriff nicht in ihr oder sagt sie nicht, was der Vorschlag festlegt, ist er kein Beleg. Du setzt dann den bevorzugten Vorschlag um. Dein Eintrag lautet `- **R<r> · <Stelle>** — geändert — Neues Verhalten, Beleg: <Beleg> — <Begründung>`, und der Ausgang der Stelle im Ergebnis trägt `"evidence": "<Beleg>"`.
     - Nur neues Verhalten ohne Beleg entscheidet der Mensch: Du änderst die Stelle nicht und wählst `frage an den menschen`.
     - Regel 9 geht dieser Regel vor.
  ```
  c) Regel 9 ersetzen durch:
  ```markdown
  9. Einträge der Form `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` sind bindende Entscheidungen des Menschen. Du änderst und entfernst sie nie. Ein Beleg aus dem Bestand geht nie vor einen W-Eintrag. Verlangt ein Finding eine Änderung an einem W-Eintrag oder widerspricht der bevorzugte Scout-Vorschlag einem W-Eintrag, mit oder ohne Beleg, änderst du die Stelle nicht, stellst dazu keine Frage an den Menschen, und dein Eintrag lautet `- **R<r> · <Stelle>** — nicht geändert — W-Eintrag ist bindend`.
  ```
  d) Den ganzen Abschnitt `## Ausgabe` (bis Dateiende) ersetzen durch:
  ````markdown
  ## Ausgabe
  Deine letzte Aktion: Schreib mit `Write` das Ergebnis als JSON an den Pfad aus `Ergebnis:`, `location` exakt wie in der Gruppen-Überschrift. Danach antwortest du nur mit `Ergebnis geschrieben: <pfad>`.

  ```json
  {
    "results": [
      { "location": "AC-04", "status": "changed", "rationale": "Was geändert wurde" },
      { "location": "AC-07", "status": "changed", "rationale": "Was geändert wurde", "evidence": "Beleg wörtlich wie im R-Eintrag" }
    ],
    "questions": [
      {
        "rule": "Regel, zu der gefragt wird",
        "question": "Die Frage",
        "locations": ["AC-04", "AC-07"],
        "cases": ["a) erster Unterfall", "b) zweiter Unterfall"],
        "recommendation": "empfohlene Antwort",
        "reason": "Grund der Empfehlung"
      }
    ]
  }
  ```

  - `status`: `changed` (geändert) | `unchanged` (nicht geändert) | `human-question` (frage an den menschen). `rationale` ist bei `unchanged` Pflicht.
  - `evidence`: nur bei `changed` mit neuem Verhalten nach Regel 3, der Beleg wörtlich wie im R-Eintrag; sonst lässt du das Feld weg.
  - `questions`: jede gebündelte Frage einmal; ohne Fragen `"questions": []`.
  ````
  e) In `plugins/forge/scripts/lib/flow-questions.js` direkt vor `function resultProblem(` einfügen:
  ```js
  // Beleg-Formen der Nacharbeit: <Datei>, <Datei> · <Begriff>, Spec · <Stelle>; <Datei> ohne Leerraum.
  // Ob die Datei existiert, prüft die Nacharbeit unter Repo:, nicht das Skript.
  function evidenceForm(evidence) {
    const [head, ...rest] = evidence.trim().split(' · ');
    if (rest.length > 1) return false;
    if (rest.length === 1 && rest[0].trim() === '') return false;
    if (head === 'Spec') return rest.length === 1;
    return /^\S+$/.test(head);
  }

  ```
  und die Funktion `resultProblem` ersetzen durch (die `evidence`-Prüfung ist bewusst nicht an `kind` gebunden: `plan-rework` schreibt das Feld nie, und ein Feld `evidence` wäre dort ebenso nur bei `changed` sinnvoll):
  ```js
  // evidence gilt für beide kind; plan-rework schreibt das Feld nie.
  function resultProblem(result, kind) {
    if (result === null || typeof result !== 'object') return 'Eintrag in results ist kein Objekt';
    if (!isText(result.location)) return 'Eintrag in results ohne location';
    if (!statusesOf(kind).includes(result.status)) return `${result.location}: unbekannter status ${String(result.status)}`;
    if (result.status === 'unchanged' && !isText(result.rationale)) return `${result.location}: “nicht geändert” ohne rationale`;
    if (result.evidence !== undefined && !isText(result.evidence)) return `${result.location}: evidence ist kein Text`;
    if (result.evidence !== undefined && /^kein(e|er)?\W*$/i.test(result.evidence.trim())) return `${result.location}: evidence keiner ist kein Beleg`;
    if (result.evidence !== undefined && !evidenceForm(result.evidence)) return `${result.location}: evidence hat keine Beleg-Form`;
    if (result.evidence !== undefined && result.status !== 'changed') return `${result.location}: evidence nur bei changed`;
    return null;
  }
  ```
  f) In `plugins/forge/agents/spec-rework.md` in der Einleitung unter `# Spec-Nacharbeit` den Satz `Du liest keinen Code, keine anderen Dateien und keinen Chatverlauf.` ersetzen durch:
  ```markdown
  Mit `Repo:` liest du darunter zusätzlich nur die Dateien, die ein Scout-Beleg nennt. Sonst liest du keinen Code, keine anderen Dateien und keinen Chatverlauf.
  ```
  und im Abschnitt `## Eingabe` direkt nach der Zeile `` - `Spec:` absoluter Pfad zur `spec.md` `` einfügen:
  ```markdown
  - `Repo:` optional, nur bei `art=verankert`: absoluter Pfad zur Projektwurzel; Belege aus dem Bestand sind relativ dazu
  ```
  g) In `plugins/forge/skills/spec-review/SKILL.md` unter `## Nacharbeiter` die Zeile
  `` `dv-forge:spec-rework` — `Spec: <S>` ``
  ersetzen durch:
  ```markdown
  `dv-forge:spec-rework` — `Spec: <S>` und, nur bei `art=verankert`, `Repo: <R>`
  ```
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/agents.test.js <R>/plugins/forge/tests/flow-questions.test.js <R>/plugins/forge/tests/review-flow-followup.test.js <R>/plugins/forge/tests/skill.test.js` — erwartet: PASS, darunter `spec-rework_Body_ClarificationAndNewBehaviourWithEvidenceWrittenWithoutQuestion`, `reworkProblems_EvidenceOnlyAsTextOnChanged_ElseInvalid`, `skill_Body_ReworkGetsRepoOnlyWhenAnchored`, `skill_Body_StaysUnder500WordsWithPairedQuotes`, `spec-rework_Body_DefinesDecisionEntryFormat` (prüft weiter `keinen Code`), `spec-rework_Body_NewBehaviourBecomesQuestionNotDecision` und `spec-rework_Body_ChosenProposalCountsAsHumanDecision`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/agents/spec-rework.md plugins/forge/skills/spec-review/SKILL.md plugins/forge/scripts/lib/flow-questions.js plugins/forge/tests/agents.test.js plugins/forge/tests/flow-questions.test.js plugins/forge/tests/skill.test.js` · `git commit -m "feat(forge): spec rework writes new behaviour backed by checked scout evidence"`

---

### Task 9: Bericht listet neues Verhalten mit Beleg

**ACs:** AC-24

**Dateien:**
- Modify: `plugins/forge/scripts/lib/flow-report.js:48-63` · `report`, neue Funktion `evidenceSection` davor
- Modify: `plugins/forge/scripts/review-flow.js:343-354` · `finish`, neue Funktionen `reworkFiles` und `evidenceOf` davor
- Test: `plugins/forge/tests/flow-report.test.js` · `report_RoundOneOnly_OneRoundNoRework` (danach einfügen)
- Test: `plugins/forge/tests/review-flow-round2.test.js` · `checklist_ThreeRedWithoutQuestions_ThreePointsAndVerdictEach` (danach einfügen)
- Test: `plugins/forge/tests/review-flow-followup.test.js` · `followupVerify_AllDoneNoContradiction_CleanAfterVerification` (danach einfügen)

**Interfaces:**
- Consumes: Feld `evidence: string` an Ausgängen mit `status: 'changed'` in `<W>/runde-1/rework.json` und `<W>/nacharbeit/rework.json` (Task 8; `resultProblem` prüft das Feld in beiden Dateien)
- Produces: `flowReport.report({ title, artifact, status, roundOne, verification, reworked, open, asked, evidence = [] })`, `evidence` ist `Array<{ key: string, evidence: string }>`; Abschnitt `### Neues Verhalten mit Beleg` mit Zeilen `- <Stelle> — <Beleg>`; `reworkFiles(workspace)` in `review-flow.js` liefert die zwei Fundorte `[<W>/runde-1/rework.json, <W>/nacharbeit/rework.json]`; `finish` bestimmt daraus `reworked`, `evidenceOf(workspace)` liest daraus in dieser Reihenfolge das Array. `evidenceOf` übergeht Ausgänge ohne Text in `location` oder `evidence` und wirft nie, auch nicht bei einer von `rework-check` abgewiesenen `rework.json`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**
  a) In `plugins/forge/tests/flow-report.test.js` direkt nach `report_RoundOneOnly_OneRoundNoRework` einfügen:
  ```js
  test('report_ReworkWroteNewBehaviourAtTwoStellen_ListsBothWithEvidence', () => {
    const text = flowReport.report({
      title: 'Spec-Review', artifact: 's.md', status: 'sauber nach Runde 1', roundOne: { groups: [] }, verification: null, reworked: true, open: [], asked: [],
      evidence: [{ key: 'AC-04', evidence: 'src/export.js' }, { key: 'AC-07', evidence: 'docs/glossary/terms.md · Export' }],
    });
    assert.ok(text.includes('### Neues Verhalten mit Beleg\n- AC-04 — src/export.js\n- AC-07 — docs/glossary/terms.md · Export\n'));
  });

  test('report_WithoutEvidence_NoEvidenceSection', () => {
    const text = flowReport.report({
      title: 'Spec-Review', artifact: 's.md', status: 'sauber nach Runde 1', roundOne: { groups: [] }, verification: null, reworked: false, open: [], asked: [],
    });
    assert.ok(!text.includes('### Neues Verhalten mit Beleg'));
  });
  ```
  b) In `plugins/forge/tests/review-flow-round2.test.js` direkt nach `checklist_ThreeRedWithoutQuestions_ThreePointsAndVerdictEach` einfügen:
  ```js
  test('finish_ReworkChangedTwoStellenWithEvidence_ReportListsBoth', () => {
    const ws = flowWorkspace();
    afterRework(ws, ['AC-04', 'AC-07', 'AC-09'], [
      { location: 'AC-04', status: 'changed', evidence: 'src/export.js' },
      { location: 'AC-07', status: 'changed', evidence: 'docs/glossary/terms.md · Export' },
      { location: 'AC-09', status: 'changed' },
    ]);
    const out = finish(ws);
    assert.ok(out.includes('### Neues Verhalten mit Beleg\n- AC-04 — src/export.js\n- AC-07 — docs/glossary/terms.md · Export\n'));
    assert.ok(!out.includes('- AC-09 — '));
  });

  test('finish_InvalidReworkResultWithoutLocation_ReportWithoutCrash', () => {
    const ws = flowWorkspace();
    afterRework(ws, ['AC-04'], [
      { status: 'changed', evidence: 'src/export.js' },
      { location: 42, status: 'changed', evidence: 'src/export.js' },
      { location: 'AC-04', status: 'changed', evidence: 'src/export.js' },
    ]);
    const out = finish(ws);
    assert.match(out, /^STATUS /);
    assert.ok(out.includes('### Neues Verhalten mit Beleg\n- AC-04 — src/export.js\n'));
  });
  ```
  c) In `plugins/forge/tests/review-flow-followup.test.js` direkt nach `followupVerify_AllDoneNoContradiction_CleanAfterVerification` einfügen:
  ```js
  test('finish_FollowupReworkWithEvidence_ReportListsIt', () => {
    const ws = chosenTwo([{ location: 'AC-04', status: 'changed', evidence: 'src/export.js' }, { location: 'AC-07', status: 'changed' }]);
    ws.run('followup-checklist', 'spec-review', ws.doc, ws.workspace);
    ws.json('runde-2/verifier.json', { reviewer: 'verifier', verdicts: [verdict('AC-04', 'erledigt'), verdict('AC-07', 'erledigt')], findings: [] });
    ws.run('verify', 'spec-review', ws.doc, ws.workspace);
    const out = finish(ws);
    assert.ok(out.includes('### Neues Verhalten mit Beleg\n- AC-04 — src/export.js\n'));
    assert.ok(!out.includes('- AC-07 — '));
  });
  ```
- [ ] **Schritt 2: Tests rot laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/flow-report.test.js <R>/plugins/forge/tests/review-flow-round2.test.js <R>/plugins/forge/tests/review-flow-followup.test.js` — erwartet: FAIL `report_ReworkWroteNewBehaviourAtTwoStellen_ListsBothWithEvidence`, FAIL `finish_ReworkChangedTwoStellenWithEvidence_ReportListsBoth`, FAIL `finish_InvalidReworkResultWithoutLocation_ReportWithoutCrash` und FAIL `finish_FollowupReworkWithEvidence_ReportListsIt`
- [ ] **Schritt 3: Minimal implementieren**
  a) In `plugins/forge/scripts/lib/flow-report.js` direkt vor `function report(` einfügen:
  ```js
  // Stellen, an denen die Nacharbeit neues Verhalten mit Beleg geschrieben hat.
  function evidenceSection(evidence) {
    if (evidence.length === 0) return [];
    return ['### Neues Verhalten mit Beleg', ...evidence.map((entry) => `- ${entry.key} — ${entry.evidence}`), ''];
  }

  ```
  und die Funktion `report` ersetzen durch:
  ```js
  function report({ title, artifact, status, roundOne, verification, reworked, open, asked, evidence = [] }) {
    const rounds = (roundOne ? 1 : 0) + (verification ? 1 : 0);
    const parts = [`## ${title}: ${artifact}`, '', `**Status:** ${status}`, `**Runden:** ${rounds} · **Nacharbeiten:** ${reworked ? 1 : 0}`, ''];
    if (roundOne) parts.push('### Runde 1', table(roundOne.groups), '');
    if (verification) {
      const red = verification.groups.filter((group) => group.color === 'red');
      parts.push('### Nachprüfung', verdictTable(verification.verdicts), '');
      parts.push(...listSection('Widersprüche', red.filter((group) => !isScriptOnly(group))));
      parts.push(...listSection('Skript-Befunde', red.filter(isScriptOnly)));
    }
    parts.push(...evidenceSection(evidence));
    const lines = openLines(open, asked);
    if (lines.length > 0) parts.push('### Offene Fragen', ...lines, '');
    const green = [...(roundOne?.groups ?? []), ...(verification?.groups ?? [])].filter((group) => group.color === 'green');
    parts.push(...listSection('Anmerkungen (🟢)', green));
    return `${parts.join('\n').trimEnd()}\n`;
  }
  ```
  b) In `plugins/forge/scripts/review-flow.js` direkt vor `function finish(` einfügen:
  ```js
  // Fundorte der Nacharbeit eines Laufs: Runde 1 und Folge-Nacharbeit.
  function reworkFiles(workspace) {
    return [path.join(roundDir(workspace, 1), 'rework.json'), path.join(workspace, 'nacharbeit', 'rework.json')];
  }

  const isFilled = (value) => typeof value === 'string' && value.trim() !== '';

  // Stellen, an denen eine Nacharbeit des Laufs neues Verhalten mit Beleg geschrieben hat.
  // Liest auch eine abgewiesene rework.json und übergeht dabei Ausgänge ohne location oder evidence.
  function evidenceOf(workspace) {
    return reworkFiles(workspace).flatMap((file) => {
      const { value } = readJson(file);
      const results = Array.isArray(value?.results) ? value.results : [];
      return results.filter((result) => result?.status === 'changed' && isFilled(result.location) && isFilled(result.evidence))
        .map((result) => ({ key: result.location.trim(), evidence: result.evidence.trim() }));
    });
  }

  ```
  In `finish` die Zeile
  ```js
    const reworked = [path.join(roundDir(workspace, 1), 'rework.json'), path.join(workspace, 'nacharbeit', 'rework.json')].some((file) => fs.existsSync(file));
  ```
  ersetzen durch:
  ```js
    const reworked = reworkFiles(workspace).some((file) => fs.existsSync(file));
  ```
  und die Zeile
  ```js
    const text = flowReport.report({ title, artifact: doc, status, roundOne: roundOneState, verification, reworked, open, asked });
  ```
  ersetzen durch:
  ```js
    const text = flowReport.report({ title, artifact: doc, status, roundOne: roundOneState, verification, reworked, open, asked, evidence: evidenceOf(workspace) });
  ```
  `changedKeys` und `parseResults` in `rework-outcome.js` nutzt `evidenceOf` bewusst nicht: `rework-outcome.js` ist ein eigenes CLI-Skript, exportiert beide nicht und liest je Runden-Ordner statt beider Fundorte.
- [ ] **Schritt 4: Tests grün laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/flow-report.test.js <R>/plugins/forge/tests/review-flow-round2.test.js <R>/plugins/forge/tests/review-flow-round1.test.js <R>/plugins/forge/tests/review-flow-followup.test.js` — erwartet: PASS, darunter `report_ReworkWroteNewBehaviourAtTwoStellen_ListsBothWithEvidence`, `report_WithoutEvidence_NoEvidenceSection`, `finish_ReworkChangedTwoStellenWithEvidence_ReportListsBoth`, `finish_InvalidReworkResultWithoutLocation_ReportWithoutCrash` und `finish_FollowupReworkWithEvidence_ReportListsIt`
- [ ] **Schritt 5: Commit**
  `git add plugins/forge/scripts/lib/flow-report.js plugins/forge/scripts/review-flow.js plugins/forge/tests/flow-report.test.js plugins/forge/tests/review-flow-round2.test.js plugins/forge/tests/review-flow-followup.test.js` · `git commit -m "feat(forge): spec review report lists new behaviour with its evidence"`

---

### Task 10: Absicherung von Status, nächsten Schritten und Reviewer-Auswahl

**ACs:** AC-25, AC-26, AC-27, AC-28, AC-29, AC-30

**Dateien:**
- Test: `plugins/forge/tests/skill.test.js` · `skill_Body_NextStepPerStatus` (danach einfügen)
- Test: `plugins/forge/tests/review-rules.test.js` · `rateFinding_AdvisoryReviewerContradiction_CappedYellow` (danach einfügen)
- Test: `plugins/forge/tests/prepare.test.js` · `specReview_FreeSpec_NoProfilesEvenIfPresent` (bestehend)

**Interfaces:**
- Consumes: `rules.ADVISORY`, `rules.rateFinding(finding, reviewer, unit, ctx)` aus `plugins/forge/scripts/lib/review-rules.js`; Abschnitt `## Nächster Schritt` in `plugins/forge/skills/spec-review/SKILL.md`
- Produces: —

- [ ] **Schritt 1: Absicherungstests schreiben**
  a) In `plugins/forge/tests/skill.test.js` direkt nach `skill_Body_NextStepPerStatus` einfügen:
  ```js
  test('skill_Body_NextStepCommandsPerStatus', () => {
    const { body } = readMarkdown(SKILL);
    for (const part of [
      'Spec ist bereit. Spec committen, dann in einer frischen Session:',
      'Offene 🟡: optional /dv-forge:review-followup <S> <auswahl>.',
      '/dv-forge:spec-review <S> erneut; der neue Lauf stellt sie wieder.',
      'dann /dv-forge:review-followup <S> <auswahl> oder Spec selbst anpassen und /dv-forge:spec-review <S> erneut.',
    ]) {
      assert.ok(body.includes(part), part);
    }
    assert.ok(body.indexOf('Offene 🟡: optional') < body.indexOf('Spec ist bereit.'), 'Folge-Schritt steht nicht zuerst');
  });
  ```
  b) In `plugins/forge/tests/review-rules.test.js` direkt nach `rateFinding_AdvisoryReviewerContradiction_CappedYellow` einfügen:
  ```js
  test('rateFinding_RedCategoryFromAnySpecReviewer_StaysRed', () => {
    assert.deepEqual(rules.ADVISORY['spec-review'], []);
    const context = ctx({ advisory: rules.ADVISORY['spec-review'] });
    for (const reviewer of ['completeness', 'consistency', 'feasibility', 'clarity', 'profiles']) {
      for (const category of ['widerspruch', 'fehlendes-verhalten', 'unerfuellbar']) {
        assert.equal(rate({ category }, context, unit(), reviewer).color, 'red', `${reviewer}: ${category}`);
      }
    }
  });
  ```
  c) AC-29 sichert der bestehende Test `specReview_FreeSpec_NoProfilesEvenIfPresent` in `plugins/forge/tests/prepare.test.js` ab (Spec `Art: frei` mit Glossar ergibt `profile=nein`, also kein `profiles` in `aktiv`). AC-30 schließt zusätzlich der bestehende Test `statusOf_Ranking_FirstMatchWins` in `plugins/forge/tests/flow-report.test.js` ab (offenes 🔴 ergibt `nicht bereit …`).
- [ ] **Schritt 2: Absicherungstests laufen lassen**
  Befehl: `node --test <R>/plugins/forge/tests/skill.test.js <R>/plugins/forge/tests/review-rules.test.js <R>/plugins/forge/tests/prepare.test.js <R>/plugins/forge/tests/flow-report.test.js` — erwartet: PASS `skill_Body_NextStepCommandsPerStatus`, `rateFinding_RedCategoryFromAnySpecReviewer_StaysRed`, `specReview_FreeSpec_NoProfilesEvenIfPresent` und `statusOf_Ranking_FirstMatchWins`; rot ist ein Befund, kein Grund, Code zu ändern
- [ ] **Schritt 3: Gesamte Suite laufen lassen**
  Befehl (Bash, aus `<R>`): `node --test plugins/forge/tests/*.test.js` — erwartet: `ℹ fail 0`
- [ ] **Schritt 4: Commit**
  `git add plugins/forge/tests/skill.test.js plugins/forge/tests/review-rules.test.js` · `git commit -m "test(forge): secure spec review next steps and blocking reviewers"`

## Entscheidungen
- **W · Beleg-Form** · Aussage — Der Scout schreibt je Vorschlag eine eingerückte Zeile `Beleg: <Datei, Glossar-Eintrag oder Spec-Stelle>` bzw. `Beleg: keiner`. Die Nacharbeit schreibt `- **R1 · <Stelle>** — geändert — Neues Verhalten, Beleg: <Beleg> — <Begründung>` und in `rework.json` das Feld `"evidence"`. Der Bericht bekommt den Abschnitt `### Neues Verhalten mit Beleg` mit Zeilen `- <Stelle> — <Beleg>`.
- **W · Planungs-Skills** · Aussage — Keine; es gelten nur die Konventionen des Plugin-Bestands.
- **E · Titelüberschrift ohne Skript-Änderung** · Planer — Das Finding ohne AC-ID trägt `quote` = `Keine AC-ID in der Spec`. So ordnet das bestehende Skript es der Titelüberschrift zu; mit dem Titel als Zitat landete es an der Stelle `Kopf`. Task 2 sichert das mit einem Test ab.
- **E · `formulierung` bleibt gültige Kategorie im Skript** · Planer — Die Reviewer melden sie laut Prompt nie; `CATEGORIES['spec-review']` in `review-rules.js` bleibt, weil die Spec Ablauf und Kategorien-Farben ausdrücklich nicht festlegt und der Nachprüfer sie weiter nutzt.
- **E · Scout liest Profile über `Profil-Index`** · Planer — Der Scout bekommt bei `profile=ja` denselben Index wie der Reviewer `profiles`; ohne Profile liest er nur Spec und Code. Das nutzt die vorhandene Eingabe aus `prepare.js`.
- **E · Wortlaut „Nachprüfung und Scout-Vorschläge lesen“ bleibt** · Planer — `nicht bereit …` entsteht nur nach der Nachprüfung, deren Findings damit gemeint sind; `plan-review` formuliert gleich. AC-28 fordert nur die beiden Befehle, Task 10 sichert sie ab.
- **E · Kein Versions-Bump** · Planer — Der Bestand hebt `plugins/forge/.claude-plugin/plugin.json` in eigenen `chore`-Commits an; das bleibt außerhalb dieses Plans.
- **E · Nacharbeit prüft nur Spec-Belege nach** · Planer — Die Nacharbeit liest laut ihrem Auftrag keinen Code und keine anderen Dateien und bekommt kein `Repo:`; einen Beleg aus dem Bestand liest sie deshalb nicht nach. Sie prüft die Form jedes Belegs und schlägt `Spec · <Stelle>` in der Spec nach; das Skript weist `keiner` als `evidence` zurück. Belege aus dem Bestand sieht der Mensch im Abschnitt `### Neues Verhalten mit Beleg` des Berichts.
- **R1 · Task 8** — geändert — Anker der Test-Zeilen als reiner Testname in Backticks (`reworkProblems_MissingDuplicateOrForeignOutcome_Named` steht in `flow-questions.test.js` Zeile 18; das Anker-Skript nahm „nach …“ wörtlich). Gegen ungeprüfte Belege: `resultProblem` weist `evidence` = `keiner` (ohne Groß- und Kleinschreibung) zurück, Test ergänzt; Regel 3 lässt nur die drei Beleg-Formen zu und verlangt, `Spec · <Stelle>` in der Spec nachzuschlagen. Belege aus dem Bestand liest die Nacharbeit nicht nach (siehe E · Nacharbeit prüft nur Spec-Belege nach).
- **R1 · Task 9** — geändert — `evidenceOf` liest wie `finish` beide Fundorte, `runde-1/rework.json` und `nacharbeit/rework.json`; neuer Test `finish_FollowupReworkWithEvidence_ReportListsIt` in `review-flow-followup.test.js` deckt den Folge-Pfad ab. Test-Anker als reine Testnamen in Backticks; beide Tests stehen im Bestand (`flow-report.test.js` Zeile 64, `review-flow-round2.test.js` Zeile 23).
- **R1 · AC-31** — geändert — Regel 3 sagt jetzt „Ist der bevorzugte Scout-Vorschlag eine Klarstellung, setzt du ihn um.“; der Test in Task 8 prüft den Satz. Der zweite Teil von AC-31 (keine Frage an den Menschen) war schon abgedeckt.
- **R1 · Task 1** — geändert — Anker der Modify-Zeilen sind jetzt `## Prüfauftrag` und `## Kategorie` in Backticks, die Handlung steht in Klammern dahinter; Test-Anker als reiner Testname (`specAndPlanReviewers_Body_NameCategoriesNeverColours` steht in `agents.test.js` Zeile 296). Die Test-Anker der Tasks 2 bis 6 folgen derselben Form; Task 5 hat den Anker `# Spec-Review: Klarheit und Lücken` vorangestellt.
- **R1 · Task 10** — geändert — Test-Anker als reine Testnamen in Backticks; `rateFinding_AdvisoryReviewerContradiction_CappedYellow` steht in `review-rules.test.js` Zeile 53, `skill_Body_NextStepPerStatus` in `skill.test.js` Zeile 38.
- **R1 · Task 2** — geändert — Test-Anker als reiner Testname in Backticks; `classify_SameInputTwice_SameGroupsAndDrops` steht in `review-groups.test.js` Zeile 34.
- **R1 · Task 7** — geändert — Modify-Anker ist jetzt `# Spec-Review: Scout` in Backticks, die Handlung steht in Klammern dahinter; Test-Anker als reine Testnamen (`skill_Body_ListsAllAgents` in `skill.test.js` Zeile 31, `round1_RedAndYellow_ScoutSeesBothReworkOnlyRedWithProposals` in `review-flow-round1.test.js` Zeile 25).
- **E · Nacharbeit schlägt Belege aus dem Bestand nach** · Planer — Ersetzt „E · Nacharbeit prüft nur Spec-Belege nach“. Die Nacharbeit bekommt bei `art=verankert` `Repo: <R>` (wie der Scout) und liest darunter nur die Dateien, die ein Scout-Beleg nennt; fehlt die Datei oder trägt sie den Vorschlag nicht, ist der Beleg keiner, und neues Verhalten wird eine Frage an den Menschen. Ein Existenz-Check im Skript entfällt, weil `rework-check` die Projektwurzel nicht kennt und `shared/review-flow/flow.md` unverändert bleibt.
- **E · `evidence`-Prüfung unabhängig von `kind`** · Planer — `resultProblem` prüft `evidence` auch bei `plan-review`; das ist gewollt, weil `plan-rework` das Feld nie schreibt und eine eigene Verzweigung nach `kind` nichts abfängt.
- **R2 · Task 8** — geändert — Gegen erfundene oder falsch zugeordnete Belege: Die Nacharbeit bekommt bei `art=verankert` `Repo: <R>` (SKILL.md `## Nacharbeiter`, `## Eingabe` von `spec-rework.md`) und schlägt `<Datei>` bzw. `<Datei> · <Begriff>` darunter nach; ohne `Repo:` zählt nur ein Spec-Beleg. Tests in `agents.test.js` und neuer Test `skill_Body_ReworkGetsRepoOnlyWhenAnchored` in `skill.test.js`. Die kind-unabhängige `evidence`-Prüfung ist jetzt im Code-Kommentar, in Interfaces und in „E · `evidence`-Prüfung unabhängig von `kind`“ als gewollt festgehalten. Einen Skript-Existenz-Check gibt es nicht (siehe E · Nacharbeit schlägt Belege aus dem Bestand nach).
- **E · Skript prüft die Beleg-Form ohne Dateizugriff** · Planer — `resultProblem` weist `kein`, `keine` und `keiner` (auch mit Satzzeichen) sowie jede Form außer `<Datei>`, `<Datei> · <Begriff>` und `Spec · <Stelle>` zurück; `<Datei>` darf keinen Leerraum enthalten, weil die Plugin-Pfade keinen tragen und so „kein Beleg“ scheitert. Ob die Datei existiert und den Vorschlag trägt, prüft weiter nur die Nacharbeit unter `Repo:`.
- **R3 · Task 9** — geändert — Die Fundorte stehen jetzt einmal in `reworkFiles(workspace)`, das `finish` (für `reworked`) und `evidenceOf` nutzen. `evidenceOf` übergeht Ausgänge ohne Text in `location` und wirft so auch bei einer abgewiesenen `rework.json` nicht; neuer Test `finish_InvalidReworkResultWithoutLocation_ReportWithoutCrash` in `review-flow-round2.test.js`. `changedKeys`/`parseResults` aus `rework-outcome.js` werden nicht genutzt, weil das Skript sie nicht exportiert und je Runden-Ordner liest.
- **R3 · Task 8** — geändert — Neue Funktion `evidenceForm` in `flow-questions.js`; `resultProblem` weist `keiner`-Varianten (`kein`, `keine`, `keiner.`) und Werte ohne Beleg-Form zurück (`'<location>: evidence hat keine Beleg-Form'`), Test um gültige und ungültige Formen erweitert. Erfundene Pfade fängt weiter nur die Nacharbeit (siehe E · Skript prüft die Beleg-Form ohne Dateizugriff).
