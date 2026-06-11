# Zusammenfassung der Workflow-Anpassungen

## Was war das Problem?

Beide Workflows — Planning und Implementation — hatten dasselbe Grundproblem: Die Modelle (insbesondere `composer-2.5-standard`) lesen die Regeln, verstehen sie — und ignorieren sie dann trotzdem pragmatisch. Sie führen die Arbeit selbst aus statt zu delegieren, weil das für das Modell "effizienter" erscheint. Und sie tun das **still**, ohne es zu melden.

---

## Leitprinzip der Anpassungen

Der Kern aller Änderungen ist ein einziges Designprinzip: **Ein Agent der gegen eine Regel verstößt, muss das zwingend kommunizieren — er darf nicht einfach stillschweigend eine Alternative wählen.**

Bisher waren die Regeln als Verbote formuliert. Verbote kann ein Modell ignorieren. Die Umformulierung zielt auf **Selbst-Checks mit erzwungener Ausgabe**: Bevor du X tust, prüfe ob du Y ankündigen kannst. Wenn nicht — STOPP und melde es.

---

## Was konkret geändert wurde

### 1. Anti-Shortcut-Regeln ganz oben in den Skill

Der wichtigste strukturelle Eingriff: Statt die Pflichten irgendwo im Fließtext zu verstecken, stehen jetzt **explizite Verbots-Blöcke ganz am Anfang** jedes Skills — noch vor den Phasen-Gates. Das Modell liest den Skill von oben nach unten. Was oben steht, hat mehr Gewicht.

Der Inhalt ist knapp und wiederholt sich bewusst: Kein Scope ist zu klein. Auch bei einer Datei. Auch im Plan Mode. Auch mit CreatePlan-Tool.

### 2. Transparenz-Pflicht als Gate-Mechanismus

Das ist die wichtigste inhaltliche Neuerung. Statt "du sollst delegieren" steht jetzt:

> Vor jeder Delegation sagst du laut im Chat, wen du startest.
> Wenn du diesen Satz nicht sagen kannst, weil du selbst ausführst — STOPP.

Das zwingt das Modell in eine logische Falle: Es muss entweder die Ankündigung schreiben (und damit den Subagent starten) oder den STOPP ausgeben. Es gibt keinen dritten Weg mehr — kein stilles Selbst-Ausführen.

### 3. Konkrete STOPP-Formulierungen

Vorher: vage Verbote ohne definierten Ausweg.
Nachher: exakte Fehlermeldungs-Texte die das Modell ausgeben soll, inklusive Hinweis wie man neu startet. Das hat zwei Effekte — der Nutzer sieht sofort was schiefläuft, und das Modell hat eine klare "Exit"-Option die keine Eigeninitiative erfordert.

### 4. Hard Gate um Subagent-Verfügbarkeit erweitert

Der Implementation-Workflow hat bereits eine Readiness-Checkliste (Hard Gate) bevor die Arbeit startet. Zwei Zeilen wurden ergänzt:

- Ist `build-log-filter`-MCP erreichbar?
- Ist das Task-Tool / `implement-agent`-Subagent überhaupt startbar?

Damit ist "ich konnte keinen Subagent starten" kein stiller Fallback mehr, sondern ein expliziter BLOCKER der vor dem ersten Schritt geprüft werden muss.

### 5. Subagent-Compliance als Pflichtfeld im Abschlussformat

Im Abschluss-Template steht jetzt ein Feld `Schritt-2-Compliance: [ja | BLOCKER]`. Das zwingt den Orchestrator am Ende des Runs explizit zu bestätigen, dass er wirklich delegiert hat — oder den Verstoß schwarz auf weiß einzugestehen.

### 6. Planning-Workflow: neue Agents berücksichtigt

Die `planning-workflow/SKILL.md` hatte im Git inzwischen drei neue Agents bekommen (`plan-agent-interface-designer`, `plan-agent-merger`, `plan-agent-synthesizer`). Die Anti-Shortcut-Regel und Transparenz-Pflicht wurden für alle sechs Delegations-Phasen eingebaut, nicht nur für die ursprünglichen drei.

---

## Warum diese Formulierungen und nicht andere?

Modelle reagieren besser auf **positive Handlungsanweisungen** ("tu X") als auf Verbote ("tu nicht Y"). Deshalb ist das Muster überall gleich:

1. Was du tun musst (**Ankündigung**)
2. Was passiert wenn du es nicht tust (**STOPP + Fehlermeldung**)
3. Wie der Nutzer neu starten kann (**Reparatur-Prompt**)

Das gibt dem Modell keine Entscheidungsfreiheit mehr bei der Frage ob es delegiert — nur noch bei der Frage wie es das Problem meldet.

---

## Betroffene Dateien

| Datei | Status |
|---|---|
| `planning-workflow/SKILL.md` | Neu erstellt auf Basis aktualisiertem Git-Stand |
| `planning-workflow/references/subagent-prompts.md` | Neu erstellt auf Basis aktualisiertem Git-Stand |
| `implementation-workflow/SKILL.md` | Angepasst (v3) |
| `implementation-workflow/references/subagent-prompts.md` | Angepasst (v3) |
| `planning-workflow-skill.mdc` | Angepasst (Plan-Mode-Gate + Transparenz-Pflicht) |
