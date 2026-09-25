# Selbst-Check nach dem Schreiben

Nach dem letzten Task liest du die Spec noch einmal mit frischem Blick und hältst den Plan dagegen. Das ist eine Checkliste für dich selbst, kein SubAgent.

1. **Spec-Abdeckung:** Zeig für jede AC-ID und jede Soll-Vorgabe der Spec auf den Task, der sie umsetzt. Findest du keinen, ergänzt du den Task.
2. **Platzhalter-Scan:** Durchsuch den Plan nach jedem Muster aus `task-rules.md`, Abschnitt „Verbotene Platzhalter“.
3. **Namens- und Typ-Konsistenz:** Heißen Funktionen, Typen und Felder in späteren Tasks genauso wie dort, wo sie entstehen, und haben sie dieselbe Signatur? `ladeKunden()` in Task 2 und `holeKunden()` in Task 5 ist ein Fehler.
4. **Format:** Task-Nummern lückenlos ab 1, jede `Modify`-Zeile mit Anker, jede Verifikation laut Projekt-`CLAUDE.md` erlaubt, `## Entscheidungen` am Ende.

Was du findest, korrigierst du sofort im Plan. Ein zweiter Durchgang ist nicht nötig.
