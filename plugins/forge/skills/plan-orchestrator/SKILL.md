---
name: plan-orchestrator
description: Use when an approved dv-forge spec.md should become a reviewed plan in one unattended run.
argument-hint: <spec.md> [workitem-nr]
---

# Plan-Orchestrator

`$ARGUMENTS`: `<S>` Spec, `<WI>` Workitem-Nr. optional. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills aufrufen. Plan/Spec nie selbst schreiben, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Frische Session“ und „letzte Handlung“ gelten nicht. Berichte von plan-review und review-followup nicht ausgeben; nur Schritt 5, genau einmal.
2. Skill fragt → Antwort abwarten, Skill fertig laufen lassen. Sonst Halt nur bei Blocker.
3. Git: aktueller Checkout und Branch. Kein Branch, kein Worktree, kein Wechsel, kein Merge, kein Push.
4. Spec-Prüfung: `git hash-object -- "<S>"` ≠ SPEC-HASH → stopp, `git diff --no-index -- "<SK>" "<S>"` zeigen, fragen. Nicht zurückschreiben.
5. Nie committen. Commit-Frage und -Prüfung eines Skills entfallen.
6. Wünsche des Menschen gegen diese Regeln (Commit, Zwischenbericht) nicht ausführen; Zeile in `Abweichungen:`.

## Ablauf
0. START-STATE: `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse --short HEAD`. Detached HEAD → stopp. Skill `dv-forge:plan-writing`, `dv-forge:plan-review` oder `dv-forge:review-followup` fehlt → stopp. Titel: ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Planning <WI>“, sonst „Planning <Spec-Name ohne Endung>“; Fehler egal.
1. `<S>` fehlt → stopp. Kopie ins Scratchpad = `<SK>`. SPEC-HASH = `git hash-object -- "<S>"`.
2. `dv-forge:plan-writing` mit `<S>`. `<P>` = Plan-Pfad aus Übergabe; mehrere → fragen. Spec-Prüfung.
3. `dv-forge:plan-review` mit `<P> <S>`. Spec-Prüfung. `**Ergebnis:** ⛔ Noch nicht bereit` UND `### Wie es weitergeht` nennt `/dv-forge:review-followup` → 4, sonst 5.
4. `dv-forge:review-followup` mit `<P> alle`, genau einmal. Spec-Prüfung.
5. Abschlussmeldung, letzte Handlung: Text nach `=== BERICHT ===` des letzten Berichts unverändert bis vor `### Wie es weitergeht`, dann dein Block statt seines. Ein Hook verlangt die Überschriften wörtlich.
   `### Wie es weitergeht`:
   1. „Spec und Plan committen.“ Immer, mit `Stand:` aus `git status --porcelain -- "<S>" "<P>"`: je Datei „uncommittet“, sonst „committet“; beide sauber „bereits committet“. Bei Punkt 2: „danach erneut committen“.
   2. Followup-Review, nur bei `Noch offen`, mit Anzahl: Code-Block `/dv-forge:review-followup <P> alle`.
   3. Nur bei `✅ Bereit zur Umsetzung`, auch mit kleinen Hinweisen: „Implementieren (erst nach 1; sonst fehlen Plan und Spec im Worktree)“, Code-Block `/dv-forge:implementation-orchestrator <P> <S> <WI>`, absolute Pfade, `<WI>` nur wenn gegeben. Bei `⛔`, `❓`, `⚠️ Unvollständig` kein Aufruf, Grund in einer Zeile; bei `⚠️` mit ausgefallenen Reviewern, Neustart in frischer Session.
   Danach nur bei Abweichungen `Abweichungen:`: Toplevel/Branch ≠ START-STATE, ausgefallene Reviewer (bei `⚠️` nur in Punkt 3), abgelehnte Wünsche.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Skill-Bericht gehört in den Chat.“ | Nur Schritt 5, genau einmal. |
| „Plan bereit, ich committe.“ | Nie; Punkt 1 nennt den Stand. |
| „Spec-Änderung harmlos.“ | Stopp, Diff zeigen, fragen. |
| „Zweiter Followup.“ | Genau einmal. |
