# Orchestrator-Kette und Followup-Runden

Status: bestätigt am 2026-10-19
Art: verankert
Basis: cffa8d4

## Was, wie, wo, warum
Die drei Orchestratoren von dv-forge (Spec-Review-Orchestrator, Plan-Orchestrator, Implementation-Orchestrator) empfehlen am Ende ihres Abschlussberichts den nächsten Orchestrator-Schritt. Ruft der Mensch danach für dasselbe Artefakt einen Einzel-Skill auf (Spec-Review, Plan-Review, Implementation-Review oder Review-Followup), empfiehlt dessen Bericht heute den Einzel-Skill der nächsten Stufe; Workitem und Orchestrator-Kette gehen verloren. Ursache: Die Berichte kennen nur die Art des Reviews, nicht die Kette, aus der das Artefakt kommt. · Aussage

Teil A führt den Ketten-Eintrag ein: Jeder Orchestrator vermerkt je Slug, welche Stufe er zuletzt erzeugt oder geprüft hat und mit welchen Werten (Spec, Plan, Workitem, Worktree, Branch). Spätere Berichte derselben Stufe zu diesem Slug empfehlen daraus den Orchestrator-Schritt. finish-work entfernt den Eintrag. · Aussage

Teil B vereinheitlicht die Followup-Regel: Alle drei Orchestratoren starten eine Followup-Runde, sobald das Review einen Followup anbietet, unabhängig von ✅, ⛔ oder ❓. Es gibt bis zu zwei Followup-Runden je Lauf. 🟢 werden nie eingearbeitet, aber im Abschlussbericht gelistet. · Aussage

Heute startet der Plan- und der Implementation-Orchestrator den Followup nur bei ⛔; 🟡 bei ✅ bleiben liegen. Jeder Orchestrator läuft höchstens einen Followup. 🟢 erscheinen in keinem Bericht. · Git

## Theoretisches Verhalten nach Umsetzung
Nach einem Plan-Orchestrator-Lauf empfiehlt jeder spätere Plan-Review- oder Review-Followup-Bericht zum selben Plan bei „bereit“ den Implementation-Orchestrator mit Plan, Spec und Workitem. Das gilt beim ersten, zweiten und jedem weiteren Aufruf. Analog empfehlen Spec-Review und Review-Followup nach dem Spec-Review-Orchestrator den Plan-Orchestrator. Nach dem Implementation-Orchestrator empfehlen Implementation-Review und dessen Followup finish-work mit Worktree-Pfad und Push-Hinweis. Das gilt im Haupt-Checkout und in jedem Worktree desselben Repos. Ohne vorherigen Orchestrator-Lauf sehen alle Berichte aus wie heute. · Aussage

Ein Orchestrator, dessen Review einen Followup anbietet, arbeitet 🔴 und 🟡 mit Vorschlag in Followup-Runde 1 ein. Bietet danach noch etwas einen Followup an, folgt genau eine Runde 2, nie eine dritte. Was danach offen ist, steht unter „Was ist noch offen“, ebenso alle 🟢. „Wie es weitergeht“ bietet im Orchestrator-Bericht keinen Review-Followup mehr an. · Aussage

## Soll-Vorgaben
- Ketten-Einträge liegen an einem Ort je Repository, gemeinsam für Haupt-Checkout und alle Worktrees. · Aussage
- Je Slug gibt es höchstens einen Ketten-Eintrag; der zuletzt geschriebene gewinnt. Der Slug wird so gebildet wie bei den Reviews für das Artefakt der Stufe. · Aussage
- Ein Orchestrator schreibt den Eintrag in seinem Abschluss-Schritt, vor dem Abschlussbericht, auch nach einem Stopp, sofern das Artefakt seiner Stufe feststeht: Spec beim Spec-Review-Orchestrator, Plan beim Plan-Orchestrator, Worktree und Branch beim Implementation-Orchestrator. · Aussage
- Ein Bericht nutzt nur einen Eintrag derselben Stufe: Spec-Review und sein Followup nur `spec`, Plan-Review und sein Followup nur `plan`, Implementation-Review und sein Followup nur `implementation`. · Aussage
- Ein Eintrag, dessen Spec-, Plan- oder (bei `implementation`) Worktree-Pfad nicht existiert, wird ignoriert. · Aussage
- Mit Eintrag ändern Einzel-Berichte von Spec und Plan nur den Befehl des Schritts zur nächsten Stufe; Commit-Zeile und Beschriftung bleiben. Einzel-Berichte der Implementierung übernehmen die Zeilen des Orchestrator-Berichts: Worktree-Zeile, Abschluss-Schritt mit Pfad, Push-Zeile. · Aussage
- Ohne Workitem im Eintrag steht der Orchestrator-Befehl ohne Nummer, wie im Orchestrator-Bericht. · Aussage
- Eingebettete Läufe (`--bericht`) werden durch einen Eintrag nicht verändert. · Aussage
- Eine Followup-Runde startet bei „FOLLOWUP ja“ und jedem Ergebnis außer ⚠️. · Aussage
- Höchstens zwei Followup-Runden je Orchestrator-Lauf. · Aussage
- Eine Änderung an Spec oder Plan während einer Runde wird nach der Runde erkannt; sie und ein Abbruch oder ⚠️ stoppen den Orchestrator nach jeder Runde. · Aussage
- Commit-Verhalten unverändert: Der Spec-Review-Orchestrator committet einmal nach der letzten Runde, der Plan-Orchestrator nie, die Implementierung über den Implementer. · Aussage
- Der Implementation-Orchestrator lässt Build, Test und Lint genau einmal laufen, nach der letzten Followup-Runde. · Aussage
- Der Implementation-Followup behält die Vorschläge gewählter Gruppen, die das Nach-Review nicht als behoben bestätigt, und bietet dann einen Followup an. Neue Schäden aus dem Nach-Review haben keinen Vorschlag. · Aussage
- 🟢 werden nie eingearbeitet. Sie erscheinen nur im Orchestrator-Abschlussbericht, ohne Einfluss auf Ergebnis-Zeile und nächste Schritte. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben ein Plan-Orchestrator-Lauf mit Workitem 311404 für Plan P und Spec S, wenn danach `/dv-forge:review-followup P alle` direkt läuft und „✅ Bereit zur Umsetzung“ ergibt, dann nennt „Wie es weitergeht“ die Schritte „Spec und Plan committen (ich frage dich danach).“ und „In einer frischen Session umsetzen:“ mit `/dv-forge:implementation-orchestrator P S 311404`. · Aussage
- **AC-02** Gegeben derselbe Ketten-Eintrag wie in AC-01, wenn `/dv-forge:plan-review P` zum zweiten und zum dritten Mal direkt läuft und „✅ Bereit zur Umsetzung“ ergibt, dann nennt jeder Bericht `/dv-forge:implementation-orchestrator P S 311404` statt `/dv-forge:implementation P`. · Aussage
- **AC-03** Gegeben ein Plan-Review mit Ketten-Eintrag der Stufe `plan` und „✅ … kleine Hinweise offen“, wenn der Bericht entsteht, dann stehen die Hinweis-Schritte wie heute davor und der Umsetzungs-Schritt nennt den Implementation-Orchestrator-Befehl. · Aussage
- **AC-04** Gegeben ein Spec-Review-Orchestrator-Lauf mit Workitem W für Spec S, wenn danach `/dv-forge:spec-review S` oder `/dv-forge:review-followup S alle` direkt läuft und „✅ Bereit zum Planen“ ergibt, dann nennt der Bericht „In einer frischen Session den Plan schreiben:“ mit `/dv-forge:plan-orchestrator S W`. · Aussage
- **AC-05** Gegeben ein Ketten-Eintrag der Stufe `spec` ohne Workitem, wenn ein Spec-Review „bereit“ ergibt, dann lautet der Befehl `/dv-forge:plan-orchestrator S` ohne Nummer. · Aussage
- **AC-06** Gegeben ein Implementation-Orchestrator-Lauf mit Worktree R und Branch b, wenn danach `/dv-forge:implementation-review P` in R läuft und „✅ Bereit zum Abschließen“ ergibt, dann beginnt „Wie es weitergeht“ mit `Worktree bleibt: R`, nennt den Schritt „Arbeit abschließen (nur manuell, in R):“ mit `/dv-forge:finish-work` und endet mit ``Nicht gepusht: `git push -u origin b` ``. · Aussage
- **AC-07** Gegeben derselbe Eintrag wie in AC-06 und ein Implementation-Review mit ⛔, wenn der Bericht entsteht, dann stehen die Worktree-Zeile davor und die Push-Zeile danach, die Hindernis-Schritte dazwischen wie heute. · Aussage
- **AC-08** Gegeben derselbe Eintrag wie in AC-06, wenn `/dv-forge:review-followup P alle` zum Implementation-Review in R direkt läuft und mit „✅ Bereit zum Abschließen“ endet, dann nennt sein nächster Schritt `/dv-forge:finish-work` mit Worktree R, die Worktree-Zeile und die Push-Zeile mit Branch b; das Angebot eines weiteren Followups ändert daran nichts. · Aussage
- **AC-09** Gegeben kein Ketten-Eintrag zum Slug, wenn ein Spec-Review, Plan-Review, Implementation-Review oder Review-Followup als Einzel-Skill einen Bericht erzeugt, dann ist der angezeigte Bericht Byte für Byte gleich dem Bericht vor dieser Änderung. · Aussage
- **AC-10** Gegeben ein Ketten-Eintrag, den der Plan-Orchestrator im Haupt-Checkout geschrieben hat, wenn ein Bericht zu diesem Slug in einem Worktree desselben Repos entsteht, dann nutzt er diesen Eintrag; umgekehrt ebenso. · Aussage
- **AC-11** Gegeben ein Ketten-Eintrag der Stufe `implementation` oder `plan`, wenn ein Spec-Review zu diesem Slug „bereit“ ergibt, dann nennt der Bericht `/dv-forge:plan-writing S` wie ohne Eintrag. · Aussage
- **AC-12** Gegeben ein Ketten-Eintrag der Stufe `spec`, wenn ein Plan-Review zu diesem Slug „bereit“ ergibt, dann nennt der Bericht `/dv-forge:implementation P` wie ohne Eintrag. · Aussage
- **AC-13** Gegeben ein Ketten-Eintrag, dessen Spec- oder Plan-Pfad nicht existiert, wenn ein Bericht derselben Stufe entsteht, dann gleicht er dem Bericht ohne Eintrag. · Aussage
- **AC-14** Gegeben ein Ketten-Eintrag der Stufe `implementation`, dessen Worktree-Pfad nicht existiert, wenn ein Implementation-Review-Bericht entsteht, dann gleicht er dem Bericht ohne Eintrag. · Aussage
- **AC-15** Gegeben ein Spec-Review-Orchestrator-Lauf und danach ein Plan-Orchestrator-Lauf für denselben Slug, wenn danach ein Plan-Review läuft, dann nennt sein Bericht den Implementation-Orchestrator-Befehl. · Aussage
- **AC-16** Gegeben ein Plan-Orchestrator-Lauf, der nach dem Plan-Review mit ⛔ endet, wenn der Abschluss-Schritt läuft, dann existiert danach ein Ketten-Eintrag der Stufe `plan` mit Plan, Spec und gegebenem Workitem. · Aussage
- **AC-17** Gegeben ein Plan-Orchestrator-Lauf, der stoppt, bevor ein Plan feststeht, wenn der Abschluss-Schritt läuft, dann bleibt ein vorhandener Ketten-Eintrag zum Slug unverändert und es entsteht keiner. · Aussage
- **AC-18** Gegeben ein Ketten-Eintrag zum Slug, wenn ein Orchestrator Review und Followup eingebettet laufen lässt, dann sind deren Ausgabezeilen (`ERGEBNIS`, `FOLLOWUP`) und der Abschlussbericht des Orchestrators gleich denen ohne Eintrag. · Aussage
- **AC-19** Gegeben ein Ketten-Eintrag der Stufe `implementation`, wenn finish-work erfolgreich endet (vor Ort oder nach Entfernen des Worktrees), dann existiert kein Ketten-Eintrag zum Slug mehr; ein folgendes Implementation-Review gleicht dem ohne Eintrag. · Aussage
- **AC-20** Gegeben ein Ketten-Eintrag, wenn finish-work wegen offener Dateien oder roter Prüfung abbricht, dann bleibt der Eintrag unverändert. · Aussage
- **AC-21** Gegeben ein Plan-Review mit „✅ Bereit zur Umsetzung · 3 kleine Hinweise offen“ und `FOLLOWUP ja`, wenn der Plan-Orchestrator weiterläuft, dann startet er Followup-Runde 1 ohne Rückfrage an den Menschen. · Aussage
- **AC-22** Gegeben ein Implementation-Review mit „✅ Bereit zum Abschließen“, 🟡 mit Vorschlag und `FOLLOWUP ja`, wenn der Implementation-Orchestrator weiterläuft, dann startet er Followup-Runde 1 vor Build, Test und Lint. · Aussage
- **AC-23** Gegeben ein Plan-Review mit „❓ … offen“ und `FOLLOWUP ja`, wenn der Plan-Orchestrator weiterläuft, dann startet er Followup-Runde 1. · Aussage
- **AC-24** Gegeben ein Review mit `FOLLOWUP nein` oder „⚠️ Unvollständig“, wenn der Orchestrator weiterläuft, dann startet er keine Followup-Runde. · Aussage
- **AC-25** Gegeben Followup-Runde 1 endet mit `FOLLOWUP ja`, wenn der Orchestrator weiterläuft, dann startet er genau eine Followup-Runde 2; endet auch sie mit `FOLLOWUP ja`, startet er keine dritte und listet das Offene unter „Was ist noch offen“. · Aussage
- **AC-26** Gegeben Followup-Runde 1 endet mit `FOLLOWUP nein`, wenn der Orchestrator weiterläuft, dann startet er keine Runde 2. · Aussage
- **AC-27** Gegeben Followup-Runde 1 bricht ab oder endet mit ⚠️, wenn der Orchestrator weiterläuft, dann startet er keine Runde 2 und geht zum Abschluss; der Spec-Review-Orchestrator committet dann nicht. · Aussage
- **AC-28** Gegeben im Plan-Orchestrator ändert sich die Spec während Followup-Runde 1, wenn die Runde endet, dann stoppt er vor Runde 2, zeigt den Spec-Diff und fragt. · Aussage
- **AC-29** Gegeben im Implementation-Orchestrator ändert sich Plan oder Spec während einer Followup-Runde, wenn die Runde endet, dann stoppt er, zeigt den Diff und fragt; Build, Test und Lint laufen nicht. · Aussage
- **AC-30** Gegeben der Implementation-Orchestrator läuft zwei Followup-Runden und die letzte endet mit ✅, wenn er weiterläuft, dann laufen Build, Test und Lint genau einmal, nach Runde 2. · Aussage
- **AC-31** Gegeben ein Implementation-Followup, dessen Nach-Review mindestens eine gewählte Gruppe nicht als behoben bestätigt, wenn er endet, dann meldet er `FOLLOWUP ja`, behält nur die Vorschläge dieser nicht bestätigten Gruppen, und ein folgender `/dv-forge:review-followup P alle` setzt nur diese um, nicht die bereits bestätigten. · Aussage
- **AC-32** Gegeben ein Implementation-Followup mit Urteil „alle behoben, keine neuen 🔴“ und ohne nicht gewählte Gruppen, wenn er endet, dann meldet er `FOLLOWUP nein` und es bleibt kein Vorschlag gesichert. · Aussage
- **AC-33** Gegeben der Spec-Review-Orchestrator läuft zwei Followup-Runden ohne Abbruch, wenn er committet, dann entsteht genau ein Commit, der die Änderungen beider Runden enthält. · Aussage
- **AC-34** Gegeben der Plan-Orchestrator läuft zwei Followup-Runden, wenn er endet, dann hat er keinen Commit erzeugt. · Aussage
- **AC-35** Gegeben ein Review mit zwei 🟢 an verschiedenen Stellen, wenn der Orchestrator-Abschlussbericht entsteht, dann listet „Was ist noch offen“ beide nach den 🔴, 🟡 und ❓ als `- 🟢 **<Stelle>** · aus: <Blickwinkel>` mit Konsequenz-Satz; Ergebnis-Zeile und „Wie es weitergeht“ gleichen denen ohne 🟢. · Aussage
- **AC-36** Gegeben eine Stelle ist im Review 🟢 und in der Nachprüfung einer Followup-Runde 🟡, wenn der Abschlussbericht entsteht, dann steht sie nur als 🟡. · Aussage
- **AC-37** Gegeben 🟢 aus Review und aus Nachprüfung oder Nach-Review einer Followup-Runde, wenn der Abschlussbericht entsteht, dann steht jede Stelle genau einmal als 🟢 und keine Followup-Runde hat sie eingearbeitet. · Aussage
- **AC-38** Gegeben ein Orchestrator-Lauf mit null oder einer Followup-Runde, wenn der Abschlussbericht entsteht, dann gleicht er in Aufbau und Wortlaut dem heutigen Bericht für dasselbe Review-Ergebnis, abgesehen von (a) 🟢-Einträgen unter „Was ist noch offen“, (b) dem Wegfall des Review-Followup-Schritts in „Wie es weitergeht“ und (c) Inhalten, die aus Followup-Runden folgen, die heute nicht gestartet würden. · Aussage
- **AC-39** Gegeben ein Orchestrator-Lauf mit zwei Followup-Runden, wenn der Abschlussbericht entsteht, dann stehen die Ablauf-Zeilen `Followup 1: …` und `Followup 2: …`; „Was sich geändert hat“ enthält die Änderungen beider Runden, wobei Runde 2 einen Eintrag derselben Stelle ersetzt; „Was ist noch offen“ zeigt den Stand nach Runde 2 plus offene 🔴/🟡 ohne Vorschlag aus Review und Runde 1. · Aussage
- **AC-40** Gegeben ein Orchestrator-Lauf endet nach seinen Followup-Runden mit einem 🔴 mit Vorschlag, wenn der Abschlussbericht entsteht, dann nennt „Wie es weitergeht“ keinen `/dv-forge:review-followup`, sondern den Schritt „selbst beheben bzw. Dokument anpassen, dann erneut prüfen“ mit dem Review-Befehl. · Aussage
- **AC-41** Gegeben ein Orchestrator-Lauf endet mit ✅ und offenen 🟡 mit Vorschlag, wenn der Abschlussbericht entsteht, dann nennt „Wie es weitergeht“ keinen `/dv-forge:review-followup`, sondern den optionalen Selbst-Schritt und danach den Schritt zur nächsten Stufe. · Aussage
- **AC-42** Gegeben ein Implementation-Followup ohne nicht gewählte Gruppen, dessen Nach-Review alle gewählten Gruppen als behoben bestätigt und ein neues 🔴 ohne Vorschlag findet, wenn er endet, dann meldet er `FOLLOWUP nein`, es bleibt kein Vorschlag gesichert, und der neue Schaden steht unter „Was ist noch offen“. · Aussage

## Entscheidungen
- **W · Runde 2 Implementierung** · Aussage — Der Implementation-Followup behält Vorschläge unbestätigter Gruppen und meldet `FOLLOWUP ja`; Runde 2 gibt es damit auch beim Implementation-Orchestrator.
- **W · 🟢 im Bericht** · Aussage — Alle 🟢 aus Review, Nachprüfungen und Nach-Reviews, je Stelle einmal, höhere Farbe gewinnt; nach 🔴/🟡/❓; ohne Einfluss auf Ergebnis und Schritte; nur im Orchestrator-Bericht.
- **W · Stufe des Eintrags** · Aussage — Ein Bericht nutzt nur einen Ketten-Eintrag derselben Stufe.
- **W · Zeitpunkt des Eintrags** · Aussage — Schreiben im Abschluss-Schritt, auch nach Stopp, sofern das Artefakt der Stufe feststeht.
- **W · Text mit Eintrag** · Aussage — Spec/Plan: nur der Befehl wechselt, Commit-Zeile und Beschriftung bleiben; Implementierung: Worktree-Zeile, Abschluss mit Pfad, Push-Zeile immer.
- **W · Ungültiger Eintrag** · Aussage — Fehlt Spec-, Plan- oder Worktree-Pfad, wird der Eintrag ignoriert.
- **W · Kein Followup-Angebot im Orchestrator-Bericht** · Aussage — Nach den Runden bietet „Wie es weitergeht“ keinen Review-Followup an; 🔴 selbst beheben und erneut prüfen, 🟡 optional selbst.
- **W · Followup bei ❓** · Aussage — Followup-Runde bei `FOLLOWUP ja` und jedem Ergebnis außer ⚠️.
- **W · Begriffe** · Aussage — „Ketten-Eintrag“ und „Followup-Runde“ sind kanonisch und stehen im Glossar.
- **W · Ablauf-Zeilen** · Aussage — Eine Runde: `Followup: …` wie heute; zwei Runden: `Followup 1: …`, `Followup 2: …`.
- **R1 · AC-31** — geändert — Neues Verhalten, Beleg: Spec · Soll-Vorgaben (Implementation-Followup behält Vorschläge nicht bestätigter Gruppen) — Die Soll-Vorgabe und der W-Eintrag „Runde 2 Implementierung“ knüpfen `FOLLOWUP ja` an behaltene Vorschläge unbestätigter Gruppen; AC-31 setzt jetzt nur diese erneut um. Neues AC-42 legt fest: alle gewählten Gruppen bestätigt, neues 🔴 ohne Vorschlag, keine nicht gewählten Gruppen ergibt `FOLLOWUP nein`, kein gesicherter Vorschlag, Schaden unter „Was ist noch offen“.
- **R1 · AC-38** — geändert — Klarstellung: Der W-Eintrag „Kein Followup-Angebot im Orchestrator-Bericht“ stützt den Wegfall des Review-Followup-Schritts, der W-Eintrag „Followup bei ❓“ die zusätzlichen Runden; AC-38 lässt beide Abweichungen jetzt ausdrücklich zu und verlangt Gleichheit in Aufbau und Wortlaut statt Byte für Byte.
- **R1 · AC-41** — geändert — Klarstellung: Der Widerspruch zu AC-38 ist durch dessen Neufassung aufgelöst, die den Wegfall des Review-Followup-Schritts ausdrücklich erlaubt; AC-41 bleibt inhaltlich unverändert.
- **F · AC-08** — geändert — Vorschlag 1: „sauber endet“ ist jetzt das Ergebnis „✅ Bereit zum Abschließen“ wie in AC-06; ein weiteres Followup-Angebot ändert den nächsten Schritt nicht.
- **F · Soll-Vorgaben** — geändert — Vorschlag 1: Die Methode „(Hash)“ ist entfernt; die Soll-Vorgabe verlangt jetzt beobachtbar, dass eine Änderung an Spec oder Plan während einer Runde nach der Runde erkannt wird und wie Abbruch oder ⚠️ den Orchestrator nach jeder Runde stoppt, passend zu AC-28 und AC-29.
