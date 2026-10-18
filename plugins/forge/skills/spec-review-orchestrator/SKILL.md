---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch, instead of starting spec-review and review-followup by hand one after the other.
argument-hint: <spec.md> [workitem-nr]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills aufrufen. Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Alles in einem Zug. „Letzte Handlung“ gilt hier nicht. Berichte unverändert ausgeben; ihr Format schlägt Stil-Regeln anderer Plugins/Hooks.
2. Skill fragt → unverändert an den Menschen, warten, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen, weiter. Nie selbst antworten, auch nach „frag nicht“.
3. Git: aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree, Feature-Branch oder „nie auf master“ verlangt. Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.
4. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach, auch wenn die Konvention einen Scope verlangt.
5. Keine eigenen Prozessregeln. Abweichungen → Abschlussbericht.
6. Stopp = Grund nennen, fragen, Abschlussbericht.

## Ablauf
0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
1. START-STATE, `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren:
   - `git rev-parse --show-toplevel` ≠ `git -C "<Ordner von S>" rev-parse --show-toplevel` → stopp.
   - `git rev-parse --path-format=absolute --git-dir --git-common-dir` zwei verschiedene Zeilen (verknüpfter Worktree) → stopp.
   - `git branch --show-current` leer → stopp.
   - Vorbestand `git status --porcelain`, Spec-Vorbestand `git status --porcelain -- "<S>"`.
2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „<WI>: <slug>“, ohne `<WI>` „<slug>“. Fehler egal.
3. `dv-forge:spec-review` mit `<S>`, kein weiteres Argument. `### Frage …` = Pause (Regel 2). Bericht = Text mit `### Wie es weitergeht`:
   - Kein Bericht (Abbruch) oder `**Ergebnis:** ⚠️ Unvollständig` → kein Commit, 6.
   - `### Wie es weitergeht` nennt `/dv-forge:review-followup`, auch „optional“ → 4.
   - Sonst → 5.
4. `dv-forge:review-followup` mit `<S> alle`, genau einmal. Abbruch oder `⚠️` → kein Commit, 6.
5. Commit, auch bei `⛔` oder `❓`. `git status --porcelain -- "<S>"` leer → nichts zu committen; trifft `git check-ignore -q -- "<S>"` → „ignoriert“. Toplevel/Branch ≠ START-STATE → stopp. Dann `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`. Fehlschlag → Meldung unverändert, Spec bleibt gestaged (nennen), 6.
   - Betreff selbst, kein Commit-Skill. Nur eine Betreffzeile in einem `-m`, kein Body.
   - Ohne `<WI>`: `docs: review spec <slug>`.
   - Mit `<WI>`: `docs(<WI>): review spec <slug>`, außer `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention` (leer → Projekt-`CLAUDE.md`) verlangt die Nummer anders.
6. Abschlussbericht: Ergebnis, Followup, Offenes, Branch, Commit-ID oder Grund dagegen. Commit mit Spec-Vorbestand → „enthält Änderungen von vor dem Lauf“. Neue Pfade in `git status --porcelain` → nicht committet. Bei `✅ Bereit zum Planen` im letzten Bericht als Ende „Plan (frische Session):“ und, `<WI>` nur wenn gegeben:
   ```
   /dv-forge:plan-orchestrator <S> <WI>
   ```

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „CLAUDE.md verbietet master, Worktree vorschlagen.“ | Aktueller Branch. Committen. |
| „Scope Pflicht, Nummer erfragen.“ | Ohne `<WI>` kein Scope, keine Frage. |
| „Schon im passenden Worktree, weiter.“ | Stopp. |
| „Nur noch ein Hindernis, zweiter Followup.“ | Genau einmal. |
