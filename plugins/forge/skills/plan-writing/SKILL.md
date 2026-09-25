---
name: plan-writing
description: Use when an approved dv-forge spec.md has to become an implementation plan with exact files, interfaces and test-first steps before any code is written.
disable-model-invocation: true
argument-hint: <spec.md>
---

# Plan-Writing

Argumente: `$ARGUMENTS`

Kündige an: „Ich schreibe mit dv-forge:plan-writing den Umsetzungsplan.“

## Leitbild
Du schreibst für einen Umsetzer, der sein Handwerk beherrscht, aber null Kontext zu diesem Projekt, seinen Werkzeugen und dem Fachgebiet hat — und dessen Gespür für guten Testentwurf du nicht vertrauen darfst. Alles, was er braucht, steht im Plan: welche Dateien, welcher Code, welche Tests, welche Doku er nachlesen muss, wie er prüft. Kleine Tasks. DRY. YAGNI. TDD. Häufige Commits.

## Ablauf
1. **Spec lesen.** Das erste Argument ist die Spec. Fehlt die Datei: melden „Spec nicht gefunden: <pfad>“ und Ende. Steht im Kopf `Status: Abbruch`: warnen und den Menschen entscheiden lassen, ob du weitermachst.
2. **Umfang prüfen.** Beschreibt die Spec mehrere unabhängige Teilsysteme, empfiehlst du einen Plan pro Teilsystem und fragst nach. Jeder Plan muss für sich lauffähige, testbare Software ergeben.
3. **Ziel festlegen:** `plan.md` im Ordner der Spec. Existiert sie schon: nachfragen, nie überschreiben.
4. **Kontext lesen:** Projekt-`CLAUDE.md` und den betroffenen Code. Dann legst du die Dateistruktur nach `references/task-rules.md` fest.
5. **Offene Fragen** stellst du dem Menschen, eine Frage pro Nachricht, mit Empfehlung und Grund. Dazu gehören echte Architektur-Alternativen; geplant wird genau eine. Offen ist auch jedes AC, das ein Ergebnis fordert, dessen Form die Spec nicht festlegt — diese Form wählst du nicht selbst. Jede Antwort notierst du sofort als W-Eintrag mit Tag `Mensch`. Sagt der Mensch „entscheide du“, gilt deine Empfehlung mit Tag `delegiert`. Du triffst keine Annahme stillschweigend.
6. **Plan schreiben** nach `references/plan-format.md` und `references/task-rules.md`.
7. **Selbst-Check** nach `references/self-check.md`; Befunde korrigierst du sofort im Plan.
8. **Übergabe:** Plan-Pfad nennen, dazu den Befehl in einem Code-Block:
   ```
   /dv-forge:plan-review <pfad/plan.md>
   ```
   und den Hinweis, ihn in einer frischen Session zu starten. Du committest nichts.

## Rote Flaggen
| Gedanke | Stattdessen |
|---|---|
| „Die Spec ist klar, ein kurzer Plan ohne Code reicht.“ | Der Umsetzer hat null Kontext. Jeder Code-Schritt enthält vollständigen Code. |
| „Das nehme ich einfach an.“ | Frage an den Menschen, Antwort als W-Eintrag. |
| „Keine echte Alternative, das entscheide ich schnell selbst.“ | Legt die Spec eine Form nicht fest, die ein AC braucht, fragst du — sonst baut der Umsetzer deine Annahme. |
| „Wie Task 3, nur anders.“ | Code wiederholen; Tasks werden womöglich außer der Reihe gelesen. |
| „Tests kommen am Ende.“ | Jeder Task beginnt mit einem fehlschlagenden Test. |
| „Zeilennummern reichen.“ | `Modify` braucht einen stabilen Anker. |
