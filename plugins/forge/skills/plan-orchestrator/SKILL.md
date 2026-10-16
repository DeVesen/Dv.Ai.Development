---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed and committed plan in one unattended run, instead of starting plan-writing, plan-review and review-followup by hand one after the other.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · Spec `<S>` = erstes Argument · Workitem-Nummer `<WI>` = zweites, optional.

Du verkettest `dv-forge:plan-writing`, `dv-forge:plan-review` und `dv-forge:review-followup` über das Skill-Tool. Plan und Spec schreibst, prüfst und änderst du nie selbst, Findings beurteilst du nicht.

## Regeln
1. **Durchlaufen:** Alles läuft im selben Zug. Die frische Session aus der Übergabe von plan-writing und die „letzte Handlung“ eines Review-Berichts gelten hier nicht. Jeden Bericht gibst du unverändert aus; sein Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.
2. **Fragen:** Stellt ein Skill Fragen, wartest du auf die Antwort, lässt den Skill fertig laufen und machst weiter. Sonst hältst du nur bei Blockern an.
3. **Git:** aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. **Spec-Prüfung:** `git hash-object -- "<S>"` muss SPEC-HASH ergeben. Sonst: stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen. Nicht zurückschreiben, nicht selbst als harmlos einstufen.
5. **Commit-Frage:** Fragt plan-review oder review-followup nach dem Commit, antwortest du „nein“; Schritt 5 committet.
6. Keine eigenen Prozessregeln, keine geänderten Agent-Aufträge. Abweichungen kommen in den Abschlussbericht.

## Ablauf
0. **Start:** START-STATE aus `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Detached HEAD: stopp. Fehlt einer der drei Skills: stopp, ihn nennen. Session-Titel per ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`: „Planning <WI>“, sonst „Planning <Spec-Dateiname ohne Endung>“; Fehler ignorieren.
1. **Spec-Stand:** Fehlt `<S>`: stopp. Kopie ins Scratchpad als `<SK>`, SPEC-HASH = `git hash-object -- "<S>"`. Eine uncommittete Spec geht erst in Schritt 5 mit.
2. **Plan schreiben:** `dv-forge:plan-writing` mit `<S>`, Plan-Pfad `<P>` aus der Übergabe. Mehrere Pläne: fragen, mit welchem es weitergeht. Spec-Prüfung.
3. **Plan prüfen:** `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Beginnt die Ergebniszeile mit `**Ergebnis:** ⛔ Noch nicht bereit` und nennt `### Wie es weitergeht` den Befehl `/dv-forge:review-followup`: Schritt 4, sonst Schritt 5. Hinweise allein lösen Schritt 4 nicht aus.
4. **Followup, genau einmal:** `dv-forge:review-followup` mit `<P> alle`. Spec-Prüfung.
5. **Commit:** nur bei `✅ Bereit zur Umsetzung` im letzten Bericht; „kleiner Hinweis“ oder „kleine Hinweise“ zählen nicht. Dateien: `<P>` und `<S>`, jede nur, wenn `git status --porcelain -- "<datei>"` eine Zeile zeigt; keine: nichts zu committen. Toplevel und Branch mit START-STATE vergleichen (Abweichung: stopp, fragen), dann `git add -- <dateien>` und `git commit -m "<betreff>" -- <dateien>`.
   - Betreff nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, leer: Projekt-`CLAUDE.md`, Typ `docs`. Scope `<WI>`; fehlt er und verlangt die Konvention einen: einmal fragen. Nur eine Betreffzeile in einem `-m`, kein Body.
   - Bei `⛔ Noch nicht bereit`, `❓ … offen` oder `⚠️ Unvollständig`: kein Commit. Pfade und Commit-Stand nennen; bei `⚠️` ausgefallene Reviewer und Neustart empfehlen.
6. **Abschlussbericht:** Plan-Pfad, Review-Ergebnis, Followup, Offenes, Spec-Änderungsbedarf, Spec-Prüfungen, Branch, Commit-ID mit Dateien oder „nichts zu committen“.

## Rote Flaggen
| Gedanke | Stattdessen |
|---|---|
| „Ja zur Commit-Frage setzt den Auftrag doch um.“ | „nein“; nur Schritt 5 prüft den Startzustand. |
| „Die Spec-Änderung ist harmlos, ich schreibe sie zurück.“ | Stopp, Diff zeigen, fragen. |
| „Nur noch ein Hindernis, ein zweiter Followup.“ | Genau einmal. Kein Commit, berichten. |
