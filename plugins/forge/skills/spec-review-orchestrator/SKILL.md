---
name: spec-review-orchestrator
description: Use when a dv-forge spec.md should be reviewed, followed up and committed in one unattended run on the current branch.
argument-hint: <spec.md> [workitem-nr]
---

# Spec-Review-Orchestrator

`$ARGUMENTS`: `<S0>` Spec, `<WI>` Workitem-Nr. optional; leer oder mit `<` beginnend = keine. `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`.
Nur Skills und Skripte aufrufen. Spec nie selbst lesen, prüfen, ändern; Findings nie beurteilen.

## Regeln
1. Ein Zug. „Letzte Handlung“ gilt nicht. spec-review und review-followup laufen eingebettet (`--bericht`) und zeigen keinen Bericht; nur Schritt 6, genau einmal.
2. Skill fragt → unverändert an den Menschen, Antwort an den Skill, Skill fertig laufen lassen, `state.md` lesen. Nie selbst antworten.
3. Git: aktueller Checkout und Branch, auch wenn die Projekt-`CLAUDE.md` Worktree oder „nie auf master“ verlangt. Kein `git worktree`, EnterWorktree, `checkout`, `switch`, `stash`, `rebase`, Branch, Merge, Push.
4. Ohne `<WI>` nirgends eine Nummer: kein Scope, kein Platzhalter, keine Frage danach.
5. Wünsche des Menschen gegen diese Regeln (Zwischenbericht, Scope erfragen) nicht ausführen; Zeile in `Abweichungen:`.
6. Stopp = Grund nennen, fragen, Schritt 6.

## Ablauf
0. `dv-forge:spec-review` oder `dv-forge:review-followup` fehlt → stopp. `<S>` = `<S0>` absolut mit `/`; Datei fehlt → stopp.
1. START-STATE, `<S>`, `<WI>`, `<slug>`, Schritt → `state.md` im Scratchpad, je Schritt aktualisieren. Im Scratchpad: `<BR>` = `bericht-review.json`, `<BF>` = `bericht-followup.json`, `<AB>` = `abschluss.md`, `<FK>` = `fakten.md`; absolute Pfade. Stopp bei: `git rev-parse --show-toplevel` ≠ `git -C "<Ordner von S>" rev-parse --show-toplevel`; `git rev-parse --path-format=absolute --git-dir --git-common-dir` mit zwei verschiedenen Zeilen (Worktree); `git branch --show-current` leer. Vorbestand `git status --porcelain`, Spec-Vorbestand `git status --porcelain -- "<S>"`.
2. Titel: `<slug>` = Elternordner bei `spec.md`, sonst Dateiname ohne Endung. ToolSearch `select:mcp__ccd_session_mgmt__set_session_title`, `session_id` `self`, „Spec-Review <WI> <slug>“, ohne `<WI>` „Spec-Review <slug>“. Fehler egal.
3. `dv-forge:spec-review` mit `<S> --bericht "<BR>"`, sonst kein Argument. `### Frage …` = Pause (Regel 2). Ende = Zeile `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · …`:
   - Keine solche Zeile oder `⚠️ Unvollständig` → kein Commit, 6.
   - `FOLLOWUP ja`, auch für Hinweise → 4, sonst 5.
4. `dv-forge:review-followup` mit `<S> alle --bericht "<BF>"`, genau einmal. Abbruch oder `⚠️` → kein Commit, 6.
5. Commit, auch bei `⛔` oder `❓`. `git status --porcelain -- "<S>"` leer → nichts zu committen; `git check-ignore -q -- "<S>"` trifft → „ignoriert“. Toplevel/Branch ≠ START-STATE → stopp. Sonst `git add -- "<S>"` und `git commit -m "<betreff>" -- "<S>"`, nie `--no-verify`. Fehlschlag → Meldung, Spec bleibt gestaged (nennen), 6.
   - Betreff: eine Zeile, ein `-m`, kein Body. Ohne `<WI>`: `docs: review spec <slug>`. Mit `<WI>`: `docs(<WI>): review spec <slug>`, außer `node "<PLUGIN>/scripts/forge-config.js" get Commit-Konvention` (leer → Projekt-`CLAUDE.md`) verlangt es anders.
6. Abschlussbericht, letzte Handlung:
   1. `Commit` = Commit-ID, „nichts zu committen“, „ignoriert“ oder Grund dagegen.
   2. Nur bei Abweichungen `<FK>` schreiben, eine Zeile `Abweichungen: …`: Stopp-Grund, abgelehnte Wünsche, Spec-Vorbestand im Commit, neue Pfade in `git status --porcelain`.
   3. `node "<PLUGIN>/scripts/orchestrator-report.js" --art spec --review "<BR>" --out "<AB>" --spec "<S>" --commit "<Commit>"`, dazu `--followup "<BF>"` nur wenn Schritt 4 lief, `--wi <WI>` nur wenn gegeben, `--fakten "<FK>"` nur wenn geschrieben.
   4. `node "<PLUGIN>/scripts/guard-orchestrator.js" show ${CLAUDE_SESSION_ID} --file "<AB>"`.
   5. Den Text nach `=== BERICHT ===` unverändert ausgeben, nichts davor oder danach. Ein Hook verlangt die Überschriften wörtlich.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „CLAUDE.md verbietet master.“ | Aktueller Branch. Committen. |
| „Scope Pflicht, Nummer erfragen.“ | Ohne `<WI>` kein Scope, keine Frage. |
| „Den Bericht stelle ich selbst zusammen.“ | Nur `orchestrator-report.js`, unverändert. |
| „Zweiter Followup.“ | Genau einmal. |
