---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch.
argument-hint: <spec.md> [workitem-nr]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills aufrufen. Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Letzte Handlung“ gilt nicht. Skill-Berichte nicht ausgeben; nur Schritt 6, genau einmal.
2. Skill fragt → unverändert an den Menschen, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen. Nie selbst antworten.
3. Git: aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree oder „nie auf master“ verlangt. Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.
4. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach.
5. Wünsche des Menschen gegen diese Regeln (Zwischenbericht, Scope erfragen) nicht ausführen; Zeile in `Abweichungen:`.
6. Stopp = Grund nennen, fragen, Schritt 6.

## Ablauf
0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
1. START-STATE, `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren. Stopp bei: `git rev-parse --show-toplevel` ≠ `git -C "<Ordner von S>" rev-parse --show-toplevel`; `git rev-parse --path-format=absolute --git-dir --git-common-dir` mit zwei verschiedenen Zeilen (Worktree); `git branch --show-current` leer. Vorbestand `git status --porcelain`, Spec-Vorbestand `git status --porcelain -- "<S>"`.
2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „<WI>: <slug>“, ohne `<WI>` „<slug>“. Fehler egal.
3. `dv-forge:spec-review` mit `<S>`, kein weiteres Argument. `### Frage …` = Pause (Regel 2). Bericht = Text mit `### Wie es weitergeht`:
   - Kein Bericht oder `**Ergebnis:** ⚠️ Unvollständig` → kein Commit, 6.
   - `### Wie es weitergeht` nennt `/dv-forge:review-followup`, auch „optional“ → 4, sonst 5.
4. `dv-forge:review-followup` mit `<S> alle`, genau einmal. Abbruch oder `⚠️` → kein Commit, 6.
5. Commit, auch bei `⛔` oder `❓`. `git status --porcelain -- "<S>"` leer → nichts zu committen; `git check-ignore -q -- "<S>"` trifft → „ignoriert“. Toplevel/Branch ≠ START-STATE → stopp. Sonst `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`. Fehlschlag → Meldung, Spec bleibt gestaged (nennen), 6.
   - Betreff: eine Zeile, ein `-m`, kein Body. Ohne `<WI>`: `docs: review spec <slug>`. Mit `<WI>`: `docs(<WI>): review spec <slug>`, außer `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention` (leer → Projekt-`CLAUDE.md`) verlangt es anders.
6. Abschlussmeldung, letzte Handlung: Text nach `=== BERICHT ===` des letzten Berichts unverändert bis vor `### Wie es weitergeht`, dann dein Block statt seines. Ein Hook verlangt die Überschriften wörtlich.
   `### Wie es weitergeht`:
   1. „Spec committen.“ Immer, mit Ergebnis: Commit-ID, „nichts zu committen“, „ignoriert“ oder Grund dagegen. Bei Punkt 2: „danach erneut committen“.
   2. Followup-Review, nur bei `Noch offen`, mit Anzahl: Code-Block `/dv-forge:review-followup <S> alle`.
   3. Bei `✅ Bereit zum Planen`: „Plan (frische Session)“, Code-Block `/dv-forge:plan-orchestrator <S> <WI>`, `<WI>` nur wenn gegeben. Bei `⛔`, `❓`, `⚠️ Unvollständig` oder Abbruch kein Aufruf, Grund in einer Zeile.
   Danach nur bei Abweichungen `Abweichungen:`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`, ausgefallene Reviewer.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „CLAUDE.md verbietet master.“ | Aktueller Branch. Committen. |
| „Scope Pflicht, Nummer erfragen.“ | Ohne `<WI>` kein Scope, keine Frage. |
| „Zweiter Followup.“ | Genau einmal. |
