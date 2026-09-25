# Task-Schleife

`<P>` ist der Plan, `<W>` der Arbeitsbereich, `<R>` das Repo, `<PLUGIN>` die Plugin-Wurzel; der Skill nennt dir die Werte.

## Was in deinen Kontext gehört
Alles, was du in einen Auftrag schreibst und was ein SubAgent zurückgibt, bleibt für den Rest der Session in deinem Kontext. Übergib Artefakte deshalb als Dateien: Brief, Bericht, Paket. Füge nie gesammelte Zusammenfassungen früherer Tasks ein; ein frischer Umsetzer braucht seinen Task, die Schnittstellen, die er berührt, und die Global Constraints.

## Bündeln
Nennt der Plan mehrere kleine, gleichartige Tasks, etwa dieselbe Einzeilen-Änderung, Konstante oder Feld-Ergänzung in mehreren Dateien, gehen sie gebündelt an einen Umsetzer: ein Brief mit allen Dateien und Änderungen, ein Review über das gemeinsame Diff. Einen eigenen Umsetzer bekommt jeder Task, der eigenes Urteil, eigene Tests oder ein eigenes Review braucht.

## 1. Umsetzer starten
1. `BASE` = Ausgabe von `git rev-parse HEAD`.
2. Brief-Pfad = Ausgabe von `node "<PLUGIN>/scripts/plan-tasks.js" brief "<P>" <n> "<W>"`.
3. Ein `Agent`-Aufruf `dv-forge:implementation-implementer`, `model` nach `model-selection.md`, mit genau diesen Zeilen:
   - `Brief: <Brief-Pfad>` mit dem Hinweis: zuerst lesen, das ist die Anforderung, Werte daraus exakt übernehmen
   - `Bericht: <W>/task-<n>-report.md`
   - `Repo: <R>`
   - `Kontext:` ein Satz zur Einordnung; Schnittstellen und Festlegungen früherer Tasks, die der Brief nicht kennen kann; deine Auflösung jeder Mehrdeutigkeit, die dir im Brief auffällt; Verweise auf geparkte Findings im Bereich dieses Tasks
4. Merk dir die Agent-ID für die Fix-Runden 1 bis 3.
5. Es arbeitet nie mehr als ein Umsetzer gleichzeitig.

## 2. Rückgabe behandeln
- `done` → weiter mit dem Task-Review.
- `done-with-concerns` → Bedenken lesen. Betreffen sie Korrektheit oder Umfang, klärst du sie vor dem Review. Sind es Beobachtungen wie "die Datei wird groß", notierst du sie und gehst zum Review.
- `needs-context` → fehlenden Kontext liefern und denselben Umsetzer fortsetzen.
- `blocked` → Ursache einordnen und etwas ändern:
  1. Kontext fehlt → mehr Kontext, gleiches Modell
  2. mehr Denkarbeit nötig → stärkeres Modell
  3. Task zu groß → in Teile zerlegen
  4. Plan falsch → Urteil ins Ledger, neuer Auftrag mit dem Urteil unter `Kontext:`

Denselben Auftrag wiederholst du nie unverändert. Fragt der Umsetzer etwas, antwortest du vollständig, bevor er weiterarbeitet.

## 3. Task-Review
1. Paket-Pfad = Ausgabe von `node "<PLUGIN>/scripts/review-package.js" <BASE> HEAD "<W>"`. Nie `HEAD~1` als Basis; das schneidet Tasks mit mehreren Commits ab.
2. `dv-forge:implementation-task-reviewer` mit `Brief:`, `Bericht:`, `Paket:` und `Global Constraints:`. Unter `Global Constraints:` stehen die bindenden Zeilen des Plans wörtlich: exakte Werte, Formate und Beziehungen zwischen Komponenten.
3. Keine offenen Prüfaufträge wie "prüf alle Verwendungen" ohne konkreten Grund, keine Wiederholung der Tests.
4. Du urteilst nicht vorab. Steht in deinem Auftrag "nicht melden", "höchstens 🟡" oder "der Plan hat das entschieden", streichst du es.
5. Fehlt dem Bericht das Spec-Urteil oder der Findings-Teil, gilt das Review als nicht erfolgt.
6. Jedes ⚠️ klärst du selbst mit deinem Wissen über Plan und Nachbar-Tasks. Ist es eine echte Lücke, zählt es wie ❌.

## 4. Fix-Schleife
Auslöser: ❌, ein 🔴 oder ein bestätigtes ⚠️.

Vorher:
- 🟡 und 🟢 schreibst du als `Task <n>: zurückgestellt: …` ins Ledger. Sie kommen nie in die Schleife; über sie entscheidet das Final-Review.
- Widerspricht ein Finding dem Plantext, auch mit dem Vermerk `plan-vorgeschrieben`, urteilst du mit der Spec als Maßstab und schreibst das Urteil ins Ledger, bevor du handelst. Du verwirfst das Finding nicht, weil der Plan es so will, und beauftragst keinen Fix gegen den Plan ohne Urteil.

Eine Runde ist ein Fix-Auftrag plus ein Re-Review; es gibt höchstens 5 Runden:
- **Runde 1 bis 3:** denselben Umsetzer per `SendMessage` fortsetzen, mit den offenen Findings wörtlich. Geht das nicht, startest du einen frischen Umsetzer mit `Brief:`, `Bericht:` und `Findings:`; die Berichtsdatei ist das Gedächtnis.
- **Runde 4 und 5:** frischer Umsetzer eine Modellstufe höher, mit `Brief:`, `Bericht:`, `Findings:` und unter `Kontext:` dem Satz: Ein früherer Umsetzer hat diesen Task <k>-mal versucht; er gehört jetzt dir, in der Berichtsdatei steht, was versucht wurde.
- **In jeder Runde:** Du nennst im Fix-Auftrag die abdeckenden Testdateien. Vor dem Re-Review prüfst du, dass der Fix-Bericht Tests, Befehl und Ausgabe nennt.
- **Re-Review:** Paket-Pfad = Ausgabe von `review-package.js <FIX_BASE> HEAD "<W>"`, wobei `FIX_BASE` der Stand ist, den die vorige Prüfung sah. Dann `dv-forge:implementation-re-reviewer` mit `Brief:`, `Findings:`, `Bericht:`, `Paket:`. Neue 🔴 im Fix-Diff kommen zu den offenen Findings; Beobachtungen außerhalb werden zurückgestellt.
- **Nach jeder Runde:** `Task <n>: Fix-Runde <r>/5 (…)` ins Ledger.

Du behebst nie selbst etwas. Dein Kontext bleibt für die Koordination frei, und ein eigener Fix ginge ungeprüft durch.

## 5. Breaker nach Runde 5
Sind nach dem Re-Review der fünften Runde noch Findings offen, beauftragst du nichts mehr und urteilst über jedes einzeln:
- Der Reviewer irrt oder der Punkt ist strittig → `Task <n>: geparkt — <Finding> — Urteil: <warum der Code so bleibt>`
- echt, aber nichts baut darauf auf → ebenso parken, mit dem Vermerk "echt, zurückgestellt"
- echt und tragend, weil ein späterer Task darauf aufbaut oder es einen Plan-Fehler zeigt → die kleinste Korrektur festlegen, die die abhängige Arbeit freigibt, als `Urteil:` ins Ledger und unter `Kontext:` in den nächsten Auftrag. Du hältst nur an, wenn danach jeder Weg geraten wäre.

Du urteilst nur am Cap. Früher zu urteilen, um eine Schleife zu beenden, ist ein Vorab-Urteil unter anderem Namen. Jedes Urteil ist eine Ledger-Zeile.

## 6. Task abschließen
Ist das Review sauber oder jedes offene Finding am Cap mit Urteil geparkt, schreibst du `Task <n>: fertig (…)` ins Ledger, in derselben Nachricht wie die übrige Buchführung. Mit offenen 🔴 ohne Fix oder Urteil gehst du nie zum nächsten Task.

## Warten auf SubAgents
Du fragst keine Warte-Schnittstelle in kurzen Abständen ab und wartest auch nicht stumm ohne Ende. Hast du lokale Arbeit wie Ledger, nächstes Paket oder Bericht lesen, arbeitest du weiter. Bist du wirklich untätig, wartest du in Abschnitten von fünf bis zehn Minuten und schreibst dazwischen eine Statuszeile. SubAgents, die fertig sind, aber nicht berichtet haben, gehst du nach.
