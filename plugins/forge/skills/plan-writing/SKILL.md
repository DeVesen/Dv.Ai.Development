---
name: plan-writing
description: Use when an approved dv-forge spec.md has to become an implementation plan with exact files, interfaces and test-first steps before any code is written.
disable-model-invocation: true
argument-hint: <spec.md> [ziel.md]
---

# Plan-Writing

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Kündige an: „Ich schreibe mit dv-forge:plan-writing den Umsetzungsplan.“

## Leitbild
Du schreibst für einen Umsetzer, der sein Handwerk beherrscht, aber null Kontext zu Projekt, Werkzeugen und Fachgebiet hat — und dessen Testentwurf du nicht vertrauen darfst. Alles steht im Plan: Dateien, Code, Tests, nachzulesende Doku, Prüfung. Kleine Tasks. DRY. YAGNI. TDD. Häufige Commits.

## Ablauf
1. **Spec lesen.** Das erste Argument ist die Spec. Fehlt die Datei: melden „Spec nicht gefunden: <pfad>“ und Ende. Steht im Kopf `Status: Abbruch` oder `abgetrennt`: warnen und den Menschen entscheiden lassen. Zeigt `git status --porcelain -- <spec>` eine Zeile, warnst du: Die Spec ist nicht committet.
2. **Umfang prüfen.** Beschreibt die Spec mehrere unabhängige Teilsysteme, empfiehlst du einen Plan pro Teilsystem und fragst nach. Jeder Plan muss für sich lauffähige, testbare Software ergeben.
3. **Ziel festlegen:** das zweite Argument, sonst `node "<PLUGIN>/scripts/forge-config.js" get Plan-Ablage` mit `<spec-ordner>` eingesetzt. Existiert die Datei schon: nachfragen, nie überschreiben.
4. **Kontext lesen:** genau diese Quellen — die Spec, die Projekt-`CLAUDE.md`, den betroffenen Code, Glossar und Profile an den Orten aus `forge-config.js get Glossar` und `get Profile`, und Dateien, die der Mensch ausdrücklich mitgibt. Andere Specs oder Pläne suchst du nie, auch nicht zur selben Workitem-Nummer. Dann legst du die Dateistruktur nach `references/task-rules.md` fest.
5. **Planungs-Skills laden:** `forge-config.js get Planungs-Skills`, jeden genannten Skill über das Skill-Tool laden; ihre Kernregeln kommen unter `Global Constraints`. Ist er leer, fragst du einmal, welche gelten.
6. **Offene Fragen** stellst du dem Menschen, eine Frage pro Nachricht, mit Empfehlung und Grund. Dazu gehören echte Architektur-Alternativen; geplant wird genau eine. Offen ist auch jedes AC, das ein Ergebnis fordert, dessen Form die Spec nicht festlegt — diese Form wählst du nicht selbst. Jede Antwort notierst du sofort als W-Eintrag mit Tag `Aussage`. Sagt der Mensch „entscheide du“, gilt deine Empfehlung mit Tag `delegiert`. Du triffst keine Annahme stillschweigend.
7. **Plan schreiben** nach `references/plan-format.md` und `references/task-rules.md`, mit `**Basis:**` aus `git rev-parse --short HEAD`.
8. **Selbst-Check** nach `references/self-check.md`; Befunde korrigierst du sofort im Plan.
9. **Übergabe:** Plan-Pfad nennen und als nächste Schritte: Spec und Plan committen, dann in einer frischen Session der Befehl in einem Code-Block:
   ```
   /dv-forge:plan-review <pfad/plan.md>
   ```
   Du committest nichts selbst.

## Rote Flaggen
| Gedanke | Stattdessen |
|---|---|
| „Ein kurzer Plan ohne Code reicht.“ | Der Umsetzer hat null Kontext. Jeder Code-Schritt enthält vollständigen Code. |
| „Das nehme ich einfach an.“ | Frage an den Menschen, Antwort als W-Eintrag. |
| „Das entscheide ich schnell selbst.“ | Legt die Spec eine Form nicht fest, die ein AC braucht, fragst du. |
| „Der alte Plan zum Thema hilft.“ | Andere Specs und Pläne liest du nie; sie lenken einen Neuanlauf. |
| „Wie Task 3, nur anders.“ | Code wiederholen; Tasks werden womöglich außer der Reihe gelesen. |
| „Tests kommen am Ende.“ | Jeder Task beginnt mit einem fehlschlagenden Test. |
| „Zeilennummern reichen.“ | `Modify` braucht einen stabilen Anker. |
