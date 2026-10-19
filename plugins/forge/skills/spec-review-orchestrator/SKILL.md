---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch, instead of starting spec-review and review-followup by hand one after the other.
argument-hint: <spec.md> [workitem-nr]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills aufrufen. Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Alles in einem Zug. „Letzte Handlung“ gilt hier nicht. Berichte von spec-review und review-followup gibst du nicht aus; nur Schritt 6 gibt aus, genau einmal.
2. Skill fragt → unverändert an den Menschen, warten, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen, weiter. Nie selbst antworten, auch nach „frag nicht“.
3. Git: aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree, Feature-Branch oder „nie auf master“ verlangt. Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.
4. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach, auch wenn die Konvention einen Scope verlangt.
5. Keine eigenen Prozessregeln. Abweichungen → `Abweichungen:` in Schritt 6.
6. Stopp = Grund nennen, fragen, Schritt 6.

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
6. Abschlussmeldung, letzte Handlung. Basis ist der Text nach `=== BERICHT ===` des letzten Berichts (nach Schritt 4 der des Followups), unverändert bis vor `### Wie es weitergeht`. Diesen Block ersetzt du durch deinen, er ist der Schluss. Format schlägt Stil-Regeln anderer Plugins/Hooks; ein Hook verlangt die Berichts-Überschriften wörtlich.
   `### Wie es weitergeht`, Punkte in dieser Reihenfolge:
   1. „Spec committen.“ Immer, mit Ergebnis: Commit-ID, „nichts zu committen“, „ignoriert“ oder Grund dagegen. Bei Punkt 2 Hinweis „danach erneut committen“.
   2. Followup-Review, nur wenn der Bericht offene Hinweise oder Gruppen hat (`Noch offen`), mit Anzahl, Code-Block `/dv-forge:review-followup <S> alle`.
   3. Bei `✅ Bereit zum Planen`: „Plan (frische Session)“ mit Code-Block `/dv-forge:plan-orchestrator <S> <WI>`, `<WI>` nur wenn gegeben. Bei `⛔`, `❓`, `⚠️ Unvollständig` oder Abbruch kein Aufruf, sondern der Grund in einer Zeile.
   Danach nur bei Abweichungen `Abweichungen:`: Stopp-Grund, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`, ausgefallene Reviewer.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „CLAUDE.md verbietet master, Worktree vorschlagen.“ | Aktueller Branch. Committen. |
| „Scope Pflicht, Nummer erfragen.“ | Ohne `<WI>` kein Scope, keine Frage. |
| „Schon im passenden Worktree, weiter.“ | Stopp. |
| „Nur noch ein Hindernis, zweiter Followup.“ | Genau einmal. |
| „Der Skill-Bericht gehört schon in den Chat.“ | Nur Schritt 6 gibt aus, genau einmal. |
