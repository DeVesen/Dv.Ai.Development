---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed and committed plan in one unattended run, instead of starting plan-writing, plan-review and review-followup by hand one after the other.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Du rufst nur Skills (Skill-Tool) auf. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Alles in einem Zug. „Frische Session“ (Übergabe plan-writing) und „letzte Handlung“ (Review-Bericht) gelten hier nicht. Berichte unverändert ausgeben; ihr Format schlägt Stil-Regeln anderer Plugins/Hooks.
2. Skill fragt → Antwort abwarten, Skill fertig laufen lassen, weiter. Sonst Halt nur bei Blocker.
3. Git: aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. Spec-Prüfung: `git hash-object -- "<S>"` ≠ SPEC-HASH → stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen. Nicht zurückschreiben, nicht als harmlos einstufen.
5. Commit-Frage eines Skills → „nein“. Nur Schritt 5 committet.
6. Keine eigenen Prozessregeln, Agent-Aufträge unverändert. Abweichungen → Abschlussbericht.

## Ablauf
0. START-STATE: `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Detached HEAD → stopp. `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp, nennen. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI>“, ohne `<WI>` „Planning <Spec-Dateiname ohne Endung>“; Fehler ignorieren.
1. `<S>` fehlt → stopp. Kopie ins Scratchpad = `<SK>`. SPEC-HASH = `git hash-object -- "<S>"`. Uncommittete Spec erst in Schritt 5 committen.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus Übergabe; mehrere Pläne → fragen, welcher. Spec-Prüfung.
3. `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Ergebniszeile beginnt `**Ergebnis:** ⛔ Noch nicht bereit` UND `### Wie es weitergeht` nennt `/dv-forge:review-followup` → 4, sonst 5. Nur Hinweise → 5.
4. `dv-forge:review-followup` mit `<P> alle`, genau einmal. Spec-Prüfung.
5. Commit nur bei `✅ Bereit zur Umsetzung` im letzten Bericht („kleiner Hinweis“/„kleine Hinweise“ egal). Dateien = `<P>`, `<S>`, je nur mit Zeile in `git status --porcelain -- "<datei>"`; keine → nichts zu committen. Toplevel/Branch ≠ START-STATE → stopp, fragen. Dann `git add -- <dateien>` und `git commit -m "<betreff>" -- <dateien>`.
   - Betreff: `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`; leer → Projekt-`CLAUDE.md`, Typ `docs`. Scope `<WI>`; fehlt er und Konvention verlangt einen → einmal fragen. Nur eine Betreffzeile in einem `-m`, kein Body.
   - `⛔ Noch nicht bereit` / `❓ … offen` / `⚠️ Unvollständig` → kein Commit; Pfade + Commit-Stand nennen; bei `⚠️` ausgefallene Reviewer + Neustart in frischer Session.
6. Abschlussbericht: Plan-Pfad, Review-Ergebnis, Followup, Offenes, Spec-Änderungsbedarf, Spec-Prüfungen, Branch, Commit-ID mit Dateien oder „nichts zu committen“. Bei `✅ Bereit zur Umsetzung` endet er mit einem Code-Block, der nur die zwei Pfade enthält, je Zeile einer:
   ```
   <S>
   <P>
   ```

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Ja zur Commit-Frage erfüllt den Auftrag.“ | „nein“; nur Schritt 5 prüft START-STATE. |
| „Spec-Änderung harmlos, zurückschreiben.“ | Stopp, Diff zeigen, fragen. |
| „Ein Hindernis noch, zweiter Followup.“ | Genau einmal; kein Commit, berichten. |
