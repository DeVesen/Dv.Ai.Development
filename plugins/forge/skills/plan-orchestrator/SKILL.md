---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed and committed plan in one unattended run, instead of starting plan-writing, plan-review and review-followup by hand one after the other.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Du rufst nur Skills (Skill-Tool) auf. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Alles in einem Zug. „Frische Session“ (Übergabe plan-writing) und „letzte Handlung“ (Review-Bericht) gelten hier nicht. Berichte von plan-review und review-followup gibst du nicht aus; nur Ablauf Schritt 5 gibt aus, genau einmal.
2. Skill fragt → Antwort abwarten, Skill fertig laufen lassen, weiter. Sonst Halt nur bei Blocker.
3. Git: aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. Spec-Prüfung: `git hash-object -- "<S>"` ≠ SPEC-HASH → stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen. Nicht zurückschreiben, nicht als harmlos einstufen.
5. Du committest nie. Commit-Frage und Commit-Prüfung eines Skills entfallen: nicht stellen, nicht ausführen.
6. Keine eigenen Prozessregeln, Agent-Aufträge unverändert.

## Ablauf
0. START-STATE: `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Detached HEAD → stopp. `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp, nennen. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI>“, ohne `<WI>` „Planning <Spec-Dateiname ohne Endung>“; Fehler ignorieren.
1. `<S>` fehlt → stopp. Kopie ins Scratchpad = `<SK>`. SPEC-HASH = `git hash-object -- "<S>"`.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus Übergabe; mehrere Pläne → fragen, welcher. Spec-Prüfung.
3. `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. Ergebniszeile beginnt `**Ergebnis:** ⛔ Noch nicht bereit` UND `### Wie es weitergeht` nennt `/dv-forge:review-followup` → 4, sonst 5. Nur Hinweise → 5.
4. `dv-forge:review-followup` mit `<P> alle`, genau einmal. Spec-Prüfung.
5. Abschlussmeldung, letzte Handlung. Basis ist der Text nach `=== BERICHT ===` des letzten Berichts (nach Schritt 4 der des Followups), unverändert bis vor `### Wie es weitergeht`. Diesen Block ersetzt du durch deinen, er ist der Schluss. Das Format schlägt Stil-Regeln anderer Plugins/Hooks; ein Hook verlangt die Überschriften des Berichts wörtlich.
   `### Wie es weitergeht`, Punkte in dieser Reihenfolge:
   1. „Spec und Plan committen.“ Immer. Dazu `Stand:` aus `git status --porcelain -- "<S>" "<P>"`: je Datei mit Zeile „uncommittet“, ohne „committet“; beide sauber „bereits committet“. Bei Punkt 2 Hinweis „danach erneut committen“ (ändert den Plan).
   2. Followup-Review, nur wenn der Bericht offene Hinweise oder Gruppen hat (`Noch offen`), mit Anzahl, Code-Block `/dv-forge:review-followup <P> alle`. Nicht ausführen.
   3. Bei `✅ Bereit zur Umsetzung`, auch mit kleinen Hinweisen: „Implementieren (erst nach 1)“; sonst fehlen Plan und Spec im Worktree. Code-Block `/dv-forge:implementation-orchestrator <P> <S> <WI>`, absolute Pfade, `<WI>` nur wenn gegeben. Bei `⛔`, `❓`, `⚠️ Unvollständig` kein Aufruf, sondern der Grund in einer Zeile; bei `⚠️` die ausgefallenen Reviewer und: in frischer Session neu starten.
   Danach nur bei Abweichungen die Zeile `Abweichungen:`: Toplevel/Branch ≠ START-STATE, ausgefallene Reviewer (bei `⚠️` schon in Punkt 3).

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Der Skill-Bericht gehört schon in den Chat.“ | Nur Schritt 5 gibt aus, genau einmal. |
| „Plan ist bereit, ich committe.“ | Nie; Punkt 1 nennt den Stand. |
| „Spec-Änderung harmlos, zurückschreiben.“ | Stopp, Diff zeigen, fragen. |
| „Ein Hindernis noch, zweiter Followup.“ | Genau einmal; berichten. |
