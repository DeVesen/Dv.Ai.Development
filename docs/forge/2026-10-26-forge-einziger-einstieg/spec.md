# dv-forge: session-orchestrator als einziger Startbefehl

Status: bestätigt am 2026-10-26
Art: frei
Basis: cb5c698

## Was, wie, wo, warum
- dv-forge wird ab sofort nur noch über den Startbefehl `/dv-forge:session-orchestrator` betreten, egal ob beim Whiteboarding oder mit fertiger Spec oder fertigem Plan mitten in der Session-Kette. · Aussage
- Unter-Skills sind die 13 Etappen-Skills `spec-whiteboarding-with-docs`, `spec-grilling`, `spec-review`, `spec-review-orchestrator`, `plan-writing`, `plan-review`, `plan-orchestrator`, `implementation`, `implementation-review`, `implementation-orchestrator`, `review-followup`, `start-work` und `finish-work` sowie `spec-whiteboarding`. Alle Agents darunter sind Etappen-intern. · Aussage
- `init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe; sie bleiben von Hand aufrufbar. · Aussage
- Heute ist jede Ebene eigenständig lauffähig ausgelegt. Das erzeugt zwei Betriebsarten der Review-Skills (mit und ohne `--bericht`), kopierte Regeln, zwei Datenkanäle (`--bericht` und `--ablage`) und „Wie es weitergeht“-Ausgaben für den Menschen. · Anhang
- Diese Spec ist Teil A eines Vorhabens mit vier Teilen. A umfasst: einziger Startbefehl, Wegfall aller Weiter-Hinweise und Commit-Fragen, Wegfall der Doppel-Betriebsart, ein Datenkanal, Regeln an einer Stelle. · Aussage
- Abgetrennt und getrennt weiterverfolgt: B (Review-Schleife von Spec- und Plan-Review), C (ein State-Store, eine Berichtsstufe), D (Absicherung der sieben Einstiege, auch der Aufrufe durch das Modell). · Aussage

## Theoretisches Verhalten nach Umsetzung
- Der Mensch startet immer mit `/dv-forge:session-orchestrator`; die Leit-Session führt durch die Etappen. · Aussage
- Etappen geben nur ihr Ergebnis aus (Pfad, Status). Keine Empfehlung, kein Befehl `/dv-forge:…`, kein Hinweis auf eine frische Session, keine Commit-Frage. Was folgt, entscheidet die Leit-Session. · Aussage
- Blockade-Meldungen und Rückfragen der Leit-Session bleiben. · Aussage
- Review-Skills laufen in genau einer Betriebsart: Bericht in die Ablage der Etappe im Arbeitsbereich der Session-Kette, dazu eine Statuszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>`. Die Etappen-Statuszeile `[etappe] STATUS=…` bleibt Aufgabe der Etappen-Session und besteht daneben. · Anhang
- Zählregel: Ein Review-Skill gibt genau eine Review-Statuszeile aus; die Etappen-Statuszeile zählt dabei nicht mit. · Aussage
- Daten zwischen Etappe und Leit-Session laufen über genau einen Kanal, die Ablage. Sie ist immer eingeschaltet; die Parameter `--bericht` und `--ablage` entfallen. · Anhang
- Kein Unter-Skill fragt nach einem Commit. Etappen committen ihre eigenen Pfade ohne Rückfrage; die Leit-Session committet Glossar, Whiteboarding und GO wie bisher. · Aussage
- Ein Unter-Skill, den ein Mensch von Hand tippt, ohne den Debug-Schalter anzugeben, wird abgewiesen; die Meldung nennt den Startbefehl. Dafür sorgt ein Hook auf getippte Befehle, nicht der Text des Skills. · Aussage
- Mit dem Debug-Schalter `--debug` läuft der Unter-Skill wie im Normallauf, ohne Garantie für den Normalweg. Ohne Etappe und Brief ergeben sich Slug aus dem Pfad von Spec oder Plan und Etappe aus dem Namen des Skills. · Aussage
- Aufrufe durch eine Etappen-Session über das Skill-Werkzeug laufen ohne Debug-Schalter. · Anhang
- Unter-Skills sind in Beschreibung und README als intern gekennzeichnet. Sie bleiben im Menü sichtbar, weil das Verbergen (`user-invocable: false`) auch das Tippen mit `--debug` verhindern würde. · Anhang

## Soll-Vorgaben
- Vorbedingung: Das Verzeichnis `plugins/forge` hat keine uncommitteten Änderungen. `CONTEXT.md` und die Spec-Ordner unter `docs/forge/` sind ausgenommen. · Aussage
- Der Steuerfluss der Session-Kette bleibt: die Entscheidung „Followup oder Ende“ und die Angabe, ob ein Followup folgt. · Anhang
- Der Chat-Bericht der Leit-Session bleibt bis Teil C unverändert, nur der Abschnitt „Wie es weitergeht“ entfällt. · Aussage
- In den Abschlussberichten der drei Orchestrator-Skills und in den Review-Berichten entfallen „Wie es weitergeht“ und die Empfehlung aus dem Ketten-Eintrag. Das Schreiben des Ketten-Eintrags bleibt unverändert bis Teil C. · Aussage
- Die Pflichttext-Prüfung für den Chat-Bericht wird nur so weit angepasst, wie der Wegfall der Doppel-Betriebsart und der Wegfall des Abschnitts „Wie es weitergeht“ im Chat-Bericht es erzwingen. · Aussage
- Begriff: Pflichttext-Prüfung bezeichnet die Prüfung, die in der Entscheidung zum Pflichttext als „Pflichttext-Hook“ geführt wird. · Aussage
- Die Regeln (Git-Verbote, „unverändert ausgeben“, Rote Flaggen) und das Maximum der Followup-Runden (zwei) stehen je an genau einer Stelle, einer gemeinsamen Regeldatei des Plugins. Orchestrator-Skills, README und Brief verweisen darauf oder lesen den Wert. · Anhang
- Ein Prüftest im Plugin sichert AC-04, AC-11 und AC-12 mechanisch ab. Er baut seine Suchmuster aus Teilstrings und findet sich nicht selbst. Alle Tests und Evals des Plugins, die den entfallenen Parameter übergeben oder ein Altformat erzeugen, bauen Namen und Marker aus Teilstrings zusammen; im Klartext steht beides nirgends im Plugin. · Anhang
- Start- und Abschluss-Skills werden auf Empfehlungstexte geprüft; gefundene entfallen. · Anhang
- Tests und Evals des Plugins werden mit angepasst und sind danach grün. · Aussage
- Altdateien im Format der Doppel-Betriebsart werden nicht mehr gelesen; es gibt keinen Migrationspfad. Eine Ablage im alten Format zählt als fehlende Voraussetzung. · Aussage
- Vor der Hook-Umsetzung zeigt ein Probe-Lauf mit einem Debug-Hook, ob der Befehlsname des Hooks das Präfix `dv-forge:` trägt und wie der Hook auf getippte Plugin-Skills feuert; die Hook-Muster richten sich danach. · Anhang
- Reihenfolge der Teile: A, danach C, danach B; D läuft parallel. · Anhang

## Akzeptanzkriterien
- **AC-01** Gegeben eine beliebige Etappe ist durchgelaufen, wenn sie ihre Ausgabe liefert, dann enthält sie keinen Befehl `/dv-forge:…`, keinen Hinweis „in frischer Session erneut starten“, keine Commit-Frage und keine Empfehlung für einen nächsten Schritt. · Aussage
- **AC-02** Gegeben ein Review ist abgeschlossen, wenn die Session-Kette über den Fortgang entscheidet, dann liefert die Etappe den Followup-Wert `ja` oder `nein` ausschließlich als Bestandteil der Review-Statuszeile, ohne eigene zweite Ausgabe, und die Session-Kette wählt „Followup“ oder „Ende“ wie vor der Änderung. · Anhang
- **AC-03** Gegeben ein Review-Skill (Spec, Plan, Umsetzung, Followup) läuft in der Session-Kette, wenn er endet, dann liegt sein Bericht in der Ablage der Etappe und der Skill gibt genau eine Review-Statuszeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>` aus; die Etappen-Statuszeile `[etappe] STATUS=…` steht daneben und zählt nicht mit. · Anhang
- **AC-04** Gegeben alle Dateien des Plugins nach der Änderung, wenn sie nach `--bericht` und nach „eingebettet“ durchsucht werden, dann gibt es keinen Treffer. · Aussage
- **AC-05** Gegeben ein Skript des Plugins, wenn es mit `--bericht` oder `--ablage` aufgerufen wird, dann bricht es mit einer Fehlermeldung „unbekannter Parameter“ und einem Fehler-Exitcode ab. · Aussage
- **AC-06** Gegeben ein Mensch tippt den Befehl eines Unter-Skills ohne `--debug`, wenn er den Prompt abschickt, dann weist der Hook ihn ab, die Meldung nennt `/dv-forge:session-orchestrator` als Startbefehl, und nichts wird geschrieben oder geändert. · Aussage
- **AC-07** Gegeben ein Mensch tippt den Befehl eines Unter-Skills mit `--debug`, wenn der Skill läuft, dann arbeitet er in der Ablage (Slug aus dem Pfad, Etappe aus dem Skill-Namen), gibt genau eine Statuszeile und keinen Weiter-Hinweis aus (bei einem Review-Skill ist das die Review-Statuszeile `Review abgeschlossen: …`; die Etappen-Statuszeile `[etappe] STATUS=…` steht daneben und zählt nicht mit), und seine Skripte nehmen `--debug` ohne Fehler an. · Aussage
- **AC-08** Gegeben ein Unter-Skill des Plugins, wenn seine Beschreibung und die README gelesen werden, dann steht an beiden „intern“ mit Verweis auf `/dv-forge:session-orchestrator`. · Aussage
- **AC-09** Gegeben eine Etappe findet eine fehlende Voraussetzung, wenn sie endet, dann lautet ihre Etappen-Statuszeile `STATUS=needs-user` und die einzige weitere Zeile nach dieser Etappen-Statuszeile nennt die Ursache in einem Satz. · Aussage
- **AC-10** Gegeben der Plan-Review und alle anderen Skills mit früherer Commit-Frage, wenn sie enden, dann stellen sie keine Commit-Frage; Etappen committen ihre eigenen Pfade ohne Rückfrage, die Leit-Session committet Glossar, Whiteboarding und GO. · Aussage
- **AC-11** Gegeben die Regeln Git-Verbote, „unverändert ausgeben“ und Rote Flaggen, wenn alle Dateien des Plugins danach durchsucht werden, dann steht jede Regel in genau einer Datei, der gemeinsamen Regeldatei, und Orchestrator-Skills verweisen nur darauf. · Aussage
- **AC-12** Gegeben das Maximum der Followup-Runden, wenn alle Dateien des Plugins nach seinem Wert durchsucht werden, dann ist er an genau einer Stelle festgelegt, der gemeinsamen Regeldatei. · Anhang
- **AC-13** Gegeben die Leit-Session gibt den Chat-Bericht aus, wenn der Bericht erscheint, dann enthält er keinen Abschnitt „Wie es weitergeht“ und sonst dieselben Abschnitte wie vor der Änderung. · Aussage
- **AC-14** Gegeben ein vollständiger Chat-Bericht (ohne den entfallenen Abschnitt „Wie es weitergeht“), wenn die Pflichttext-Prüfung läuft, dann lässt sie ihn passieren; gegeben ein gekürzter Bericht, dann weist sie ihn zurück. · Aussage
- **AC-15** Gegeben die Tests und Evals des Plugins nach der Änderung, wenn sie vollständig laufen, dann sind alle grün, und keiner erwartet noch die Doppel-Betriebsart. · Aussage
- **AC-16** Gegeben ein Mensch tippt `init`, `commit-message`, `domain-modeling` oder `merge-conflict-resolution` ohne `--debug`, wenn er den Prompt abschickt, dann weist der Hook ihn nicht ab. · Aussage
- **AC-17** Gegeben eine Etappen-Session ruft ihren Unter-Skill über das Skill-Werkzeug ohne `--debug` auf, wenn der Hook läuft, dann lässt er den Aufruf passieren. · Anhang
- **AC-18** Gegeben eine Ablage im alten Format der Doppel-Betriebsart, wenn eine Etappe sie lesen müsste, dann liest sie sie nicht, endet mit `STATUS=needs-user` und nennt in einem Satz, dass die Ablage im alten Format vorliegt. · Aussage
- **AC-19** Gegeben ein Review-Bericht zu einem Slug mit Ketten-Eintrag, wenn er erscheint, dann nennt er keinen Orchestrator-Schritt als Empfehlung. · Aussage

## Entscheidungen
- **W · Schnitt** · Aussage — Vier Teilprojekte; diese Spec ist Teil A, B bis D werden abgetrennt.
- **W · Startbefehl** · Aussage — Der Befehl `/dv-forge:session-orchestrator` heißt Startbefehl; „Einstieg“ bleibt die Etappe, mit der eine Session-Kette beginnt.
- **W · Unter-Skills** · Aussage — 14 Skills sind Unter-Skills, vier Werkzeuge ohne Etappe bleiben von Hand aufrufbar; die Liste steht nur in der Hook-Konfiguration.
- **W · Notausgang** · Aussage — Unter-Skills laufen von Hand nur mit ausdrücklichem Debug-Schalter `--debug` und ohne Garantie.
- **W · Sichtbarkeit** · Aussage — Unter-Skills sind als intern gekennzeichnet und bleiben im Menü sichtbar; Verbergen würde den Notausgang verhindern.
- **W · Sperre** · Aussage — Ein Hook auf getippte Befehle sperrt den Aufruf ohne Debug-Schalter; Aufrufe durch das Modell gehören zu Teil D.
- **W · Aufruf ohne Debug-Schalter** · Aussage — Abweisung mit Hinweis auf den Startbefehl; keine Weiterleitung.
- **W · Meldungen** · Aussage — Blockade-Meldungen und Rückfragen der Leit-Session bleiben; Empfehlungen und Weiter-Hinweise entfallen.
- **W · Commits** · Aussage — Kein Unter-Skill fragt nach einem Commit; Etappen committen ihre eigenen Pfade ohne Rückfrage, die Leit-Session committet Glossar, Whiteboarding und GO.
- **W · Orchestrator-Skills** · Aussage — Die drei Orchestrator-Skills bleiben Etappen-Skills; „Wie es weitergeht“ und die Empfehlung aus dem Ketten-Eintrag entfallen, das Schreiben des Ketten-Eintrags bleibt bis Teil C.
- **W · Ablage** · Aussage — Die Ablage ist der eine Datenkanal und immer eingeschaltet; `--bericht` und `--ablage` entfallen, die Review-Statuszeile besteht neben der Etappen-Statuszeile.
- **W · Regeln und Rundenzahl** · Aussage — Regeln und das Followup-Maximum stehen in der gemeinsamen Regeldatei; ein Prüftest mit Teilstring-Mustern sichert das ab.
- **W · Fehlende Voraussetzung** · Aussage — Die Etappe endet mit `STATUS=needs-user` und der Ursache in einem Satz; eine Ablage im Altformat zählt dazu, ohne Migration.
- **W · Vorbedingung Working Tree** · Aussage — `plugins/forge` ist sauber; `CONTEXT.md` und die Spec-Ordner sind ausgenommen, weil mehrere Teile dort schreiben.
- **W · Evals und Tests** · Aussage — Beides gehört in Teil A und ist danach grün.
- **W · Altbestand** · Aussage — Kein Migrationspfad für Altdateien.
- **W · Pflichttext-Hook** · Aussage — Nur minimale Anpassung in A; der Chat-Bericht bleibt bis Teil C.
- **W · Übergabe-Texte** · Aussage — Jede Übergabe mit Befehl oder Hinweis entfällt in allen Etappen; sie geben nur Ergebnis aus.
- **R1 · AC-07** — geändert — Klarstellung: „genau eine Statuszeile“ meint bei Review-Skills die Review-Statuszeile `Review abgeschlossen: …`; die Etappen-Statuszeile steht daneben und zählt nicht mit. Das folgt aus der Verhaltensbeschreibung und aus W · Ablage („die Review-Statuszeile besteht neben der Etappen-Statuszeile“). AC-03 und AC-07 sind entsprechend geschärft, AC-09 präzisiert „einzige weitere Zeile“ als Zeile nach der Etappen-Statuszeile.
- **R1 · Soll-Vorgaben** — geändert — Klarstellung: Die Pflichttext-Prüfung darf auch so weit angepasst werden, wie der in den Soll-Vorgaben festgelegte Wegfall des Abschnitts „Wie es weitergeht“ es erzwingt; sonst wäre AC-14 nicht erfüllbar. Das bleibt eine minimale Anpassung im Sinne von W · Pflichttext-Hook. AC-14 nennt jetzt ausdrücklich, dass der vollständige Bericht diesen Abschnitt nicht mehr enthält.
- **F · AC-02** — geändert — Vorschlag 1: AC-02 legt fest, dass der Followup-Wert `ja` oder `nein` ausschließlich Bestandteil der Review-Statuszeile ist und keine eigene zweite Ausgabe entsteht; das deckt sich mit der Statuszeile aus AC-03.
- **F · AC-03** — geändert — Vorschlag 1: Im Verhaltensabschnitt steht jetzt die Zählregel „genau eine Review-Statuszeile, die Etappen-Statuszeile zählt nicht mit“. AC-03, AC-07 und AC-09 sprechen bereits von der Review-Statuszeile bzw. nennen beide Zeilen ausdrücklich und bleiben unverändert.
- **F · AC-05** — geändert — Vorschlag 1: Die Soll-Vorgabe zum Prüftest verlangt jetzt, dass alle Tests und Evals, die den entfallenen Parameter übergeben oder ein Altformat erzeugen, Namen und Marker aus Teilstrings bauen; damit bleiben AC-04, AC-05 und AC-18 gemeinsam erfüllbar.
- **F · Was, wie, wo, warum** — geändert — Vorschlag 1: „Wie geht's weiter“ heißt jetzt einheitlich „Wie es weitergeht“; in den Soll-Vorgaben steht ein Begriffssatz, dass die Pflichttext-Prüfung die in der Entscheidung als „Pflichttext-Hook“ geführte Prüfung ist. Die Entscheidungstexte bleiben unverändert.
