---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed plan in one run — plan-writing, plan-review and at most one review-followup chained automatically, the spec kept unchanged, spec and plan committed once at the end.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

Argumente: `$ARGUMENTS` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}` · Spec `<S>` = erstes Argument · Workitem-Nummer `<WI>` = zweites Argument, optional.

Du verkettest `dv-forge:plan-writing`, `dv-forge:plan-review` und `dv-forge:review-followup` über das Skill-Tool. Plan und Spec schreibst, prüfst und änderst du nie selbst, und du beurteilst keine Findings; das tun die Skills und ihre Agents.

## Regeln
1. **Durchlaufen:** Alle Schritte laufen im selben Zug. Nach einem Skill endet der Zug erst, wenn alle Schritte fertig sind oder ein Stopp greift. Die frische Session aus der Übergabe von plan-writing und die „letzte Handlung“ eines Review-Berichts gelten hier nicht: Nach dem Bericht geht es weiter. Jeden Bericht gibst du unverändert aus; sein Format hat Vorrang vor Stil-Regeln anderer Plugins oder Hooks.
2. **Fragen:** Stellt ein Skill Fragen, wartest du auf die Antwort, lässt den Skill zu Ende laufen und machst mit dem nächsten Schritt weiter. Sonst hältst du nur bei Blockern an und fragst.
3. **Git:** aktueller Checkout, aktueller Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. **Spec-Prüfung:** `git hash-object -- "<S>"` muss SPEC-HASH ergeben. Sonst: stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen.
5. **Commit-Frage:** Fragt plan-review oder review-followup, ob Spec und Plan committet werden sollen, antwortest du „nein“; Schritt 5 committet.
6. Du erfindest keine Prozessregeln und änderst keine Agent-Aufträge. Abweichungen von Plan oder Spec meldest du im Abschlussbericht.

## Ablauf
0. **Start:** START-STATE aus `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Leerer Branch (detached HEAD): stopp, melden. Fehlt einer der drei Skills in der Skill-Liste oder ist er gesperrt: stopp, ihn nennen. Session-Titel per ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, Titel „Planning <WI>“, ohne `<WI>` „Planning <Spec-Dateiname ohne Endung>“; scheitert das: eine Zeile, weiter.
1. **Spec-Stand:** Fehlt `<S>`: stopp, melden. Kopie der Spec ins Scratchpad außerhalb des Repos, Pfad `<SK>`. SPEC-HASH = `git hash-object -- "<S>"`. Nicht committen, nicht fragen; eine uncommittete Spec geht in Schritt 5 mit, die Warnung von plan-writing dazu ist bekannt.
2. **Plan schreiben:** `dv-forge:plan-writing` mit `<S>`. Plan-Pfad `<P>` aus der Übergabe. Spec nicht gefunden, Umfang auf mehrere Pläne verteilt oder Entscheidung nötig: anhalten wie Regel 2; bei mehreren Plänen fragen, mit welchem es weitergeht. Spec-Prüfung.
3. **Plan prüfen:** `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Beginnt die Ergebniszeile mit `**Ergebnis:** ⛔ Noch nicht bereit` und nennt `### Wie es weitergeht` den Befehl `/dv-forge:review-followup`: Schritt 4, sonst Schritt 5. Offene Hinweise allein lösen Schritt 4 nicht aus.
4. **Followup, genau einmal:** `dv-forge:review-followup` mit `<P> alle`. Spec-Prüfung.
5. **Commit:** nur bei Ergebniszeile `✅ Bereit zur Umsetzung` im letzten Bericht; offene „kleiner Hinweis“ oder „kleine Hinweise“ zählen nicht. Dateien sind `<P>` und `<S>`, jede nur, wenn `git status --porcelain -- "<datei>"` eine Zeile zeigt. Keine Datei: nichts zu committen. Sonst Toplevel und Branch mit START-STATE vergleichen (Abweichung: stopp, fragen), dann `git add -- <dateien>` und `git commit -m "<betreff>" -- <dateien>`.
   - Betreff nach `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention`, leer: Projekt-`CLAUDE.md` (Conventional Commits, Typ `docs`). `<WI>` als Scope; ohne `<WI>` kein Scope, verlangt die Konvention einen: einmal fragen. Nur eine Betreffzeile in einem `-m`, kein Body, kein commit-message-Skill.
   - Bei `⛔ Noch nicht bereit`, `❓ … offen` oder `⚠️ Unvollständig`: kein Commit. Beide Pfade nennen und ob sie committet sind; bei `⚠️` die ausgefallenen Reviewer nennen und einen Neustart in frischer Session empfehlen.
6. **Abschlussbericht:** Plan-Pfad, Review-Ergebnis, was der Followup umgesetzt hat, was offen ist, Spec-Änderungsbedarf aus den Berichten, Ergebnis der Spec-Prüfungen, Branch, Commit-ID mit Dateien oder „nichts zu committen“.
