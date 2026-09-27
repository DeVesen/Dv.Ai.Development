# Selbst-Check nach dem Schreiben

Nach dem letzten Task liest du die Spec noch einmal mit frischem Blick und hältst den Plan dagegen. Das ist eine Checkliste für dich selbst, kein SubAgent.

1. **Spec-Abdeckung:** Zeig für jede AC-ID und jede Soll-Vorgabe der Spec auf den Task, der sie umsetzt. Findest du keinen, ergänzt du den Task.
2. **Platzhalter-Scan:** Durchsuch den Plan nach jedem Muster aus `task-rules.md`, Abschnitt „Verbotene Platzhalter“.
3. **Namens- und Typ-Konsistenz:** Heißen Funktionen, Typen und Felder in späteren Tasks genauso wie dort, wo sie entstehen, und haben sie dieselbe Signatur? `ladeKunden()` in Task 2 und `holeKunden()` in Task 5 ist ein Fehler.
4. **Format:** Task-Nummern lückenlos ab 1, jede `Modify`-Zeile und jede bestehende `Test`-Datei mit Anker, jede Verifikation laut Projekt-`CLAUDE.md` erlaubt, `## Entscheidungen` am Ende.
5. **Fremd-Code:** Jede Annahme über Code, den das Projekt nicht selbst schreibt — Selektoren, Meldungstexte, Signaturen einer Bibliothek —, hast du im installierten Paket oder in der Doku nachgesehen, etwa über Context7. Was du nicht nachsehen konntest, steht nicht im Plan.
6. **Tool-Aufrufe:** Jeder Tool-Aufruf im Plan stimmt mit dem echten Schema des Tools überein; lade es dafür per `ToolSearch`. Ältere Pläne sind keine Quelle für Parameternamen.
7. **Planungs-Skills:** Jede Kernregel aus den geladenen Planungs-Skills steht unter `Global Constraints`, und kein Task verletzt sie.

Was du findest, korrigierst du sofort im Plan. Ein zweiter Durchgang ist nicht nötig.
