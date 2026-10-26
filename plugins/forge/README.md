# dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops. Jede Stufe erzeugt ein Dokument (`spec.md`, `plan.md`, Umsetzungsbericht), das parallele Reviewer prüfen, ein Rework-Agent überarbeitet und ein Verifier abschließend gegenprüft.

**Startbefehl:** dv-forge betritt man nur über `/dv-forge:session-orchestrator`, auch mit fertiger Spec oder fertigem Plan mitten in der Kette; die Leit-Session führt durch die Etappen. Alle anderen Skills der Tabelle unten, die als `intern` stehen, sind Unter-Skills der Session-Kette: Ein Hook weist ihren getippten Befehl ab und nennt den Startbefehl. Zum Debuggen hängt man `--debug` an; der Unter-Skill läuft dann ohne Garantie für den Normalweg, mit Slug aus dem Pfad von Spec oder Plan und Etappe aus dem Namen des Skills. Etappen-Sessions rufen ihre Skills über das Skill-Werkzeug ohne `--debug` auf. Die Unter-Skills bleiben im Menü sichtbar, weil das Verbergen auch das Tippen mit `--debug` verhinderte. `init`, `commit-message`, `domain-modeling` und `merge-conflict-resolution` sind Werkzeuge ohne Etappe und bleiben von Hand aufrufbar.

Die Regeln der Orchestratoren (Git-Verbote, Ausgabe, Rote Flaggen) und das Maximum der Followup-Runden stehen in `shared/orchestrator-rules.md`, an keiner anderen Stelle; Skills, Brief und diese README verweisen darauf.

## Ablauf

1. **Spec:** `spec-whiteboarding` (oder `spec-whiteboarding-with-docs`, verankert im bestehenden System) macht aus einer Anfrage eine `spec.md`. `spec-review` prüft sie. `spec-review-orchestrator` verkettet `spec-review` mit den Followup-Runden (`review-followup`) und committet die Spec einmal im aktuellen Branch.
2. **Plan:** `plan-writing` macht aus der Spec einen Umsetzungsplan mit exakten Dateien und Test-first-Schritten. `plan-review` prüft ihn. `plan-orchestrator` verkettet beides samt den Followup-Runden in einem Lauf; er committet nicht.
3. **Umsetzung:** `start-work` bereitet Branch oder Worktree vor, `implementation` setzt den Plan Task für Task um, `implementation-review` prüft das Ergebnis, `finish-work` schließt die Arbeit ab. `implementation-orchestrator` verkettet `start-work`, `implementation` und `implementation-review` samt den Followup-Runden in einem Lauf und endet mit einem Abschlussbericht; der Worktree bleibt, `finish-work` ruft nur der Mensch, nichts wird gepusht.
4. **Session-Kette:** `session-orchestrator` führt Whiteboarding, Grill (`spec-grilling`), Spec-Review, Planning, Plan-Review, Umsetzung und Abschluss je in einer eigenen Etappen-Session. Die Leit-Session startet die Etappen, prüft jedes `final` gegen git, hält am Spec- und am GO-Haltepunkt und führt den Zustand je Slug unter `<git-common-dir>/dv-forge/session-chain/`. Jeder Brief enthält den Inhalt von `shared/session-chain/base-sub-agent.md`: Ketten-Regeln und Gesprächsstil. Das Whiteboarding prüft seine Spec in derselben Etappen-Session mit dem Spec-Review-Orchestrator; jede Etappe meldet ihr `final` zusätzlich per Nachricht an die Leit-Session.

**Spec-Format:** `scripts/spec-lint.js <spec.md>` prüft das Spec-Format ohne KI (Abschnitte, Kopf, lückenlose AC-IDs, Gegeben/wenn/dann, Beleg-Tags, W-Einträge, Abbruch). Whiteboarding und Grill rufen es nach dem Schreiben auf, der Spec-Review nutzt es als Skript-Prüfung (Formfehler 🔴, Kopf und Warnungen 🟡), und die Session-Kette hält bei Formfehlern nach Whiteboarding, Grill und Spec-Nacharbeit.

**Prüfläufe:** `scripts/verify-run.js --repo <R>` führt `Build`, `Test` und `Lint` aus den Projekt-Einstellungen aus und schreibt Exit-Codes, Ausgabe-Ende und HEAD als JSON (`ergebnis` gruen, rot, docker oder keine). `finish-work`, der Implementierungs-Orchestrator, der Abschluss der Umsetzung (Zeile `Gesamtlauf:`) und der Implementierungs-Review nutzen es statt eigener Läufe. `scripts/implementation-checks.js` gleicht dort zusätzlich die Dateien des Plans mit dem Diff ab (geplant, aber nicht geändert: 🔴; ungeplant geändert: 🟡) und liefert das Ergebnis als Reviewer `skript`.

**Messdaten:** Jeder Spec-, Plan- und Implementierungs-Review hängt eine Zeile an `<git-common-dir>/dv-forge/metrics/reviews.jsonl` (Farben je Runde, verworfene Findings, Nacharbeit, Fragen, Ausfälle, Nachforderungen, Belege je Reviewer). Jeder Sub-Agent (nicht nur dv-forge) hängt beim Ende eine Zeile an `<git-common-dir>/dv-forge/metrics/agents.jsonl` (`agent_type`, `agent_id`, `tokens` mit `input`, `cached`, `output`, `dauerMs` vom ersten bis letzten Zeitstempel des Transkripts, `toolAufrufe`). Die Session-Kette schreibt je Slug `events.jsonl` neben `zustand.json` (Start, final mit Dauer und offenen Punkten, Haltepunkt, Antwort, Commit, Schluss). dv-forge liefert nur die Rohdaten; die Auswertung gehört nach `toolbelt`.

**Golden-Sets:** `evals/` hält je Review einen Fall mit eingebauten Mängeln und den Befunden, die gefunden werden sollen. `scripts/eval-review.js` misst Läufe daraus (Recall, Precision, Belegquote, Stabilität über mehrere Läufe), siehe `evals/README.md`.

**Nacharbeit-Werkzeuge:** `implementation-report.js followup` legt den Bericht eines Implementierungs-Followups in die Ablage und gibt `ENDE`, `STATUSZEILE` und `BEHALTEN` aus. Die Prüfung nach Grill und Spec-Nacharbeit vergleicht die Spec mit der Kopie `spec-vor-<etappe>.md` vom Etappenstart, `spec-commit.js` committet die Spec des Spec-Reviews, und `review-flow.js report` legt Bericht und Bericht-Daten in die Ablage und gibt `ENDE` und `STATUSZEILE` aus. Die fünf Implementierungs-Reviewer vergeben nur Kategorien (`scripts/lib/implementation-categories.js`), die Farbe setzt der Code; `implementation-verdict.js` liest das Urteil aus ihrem Bericht. `verify-run.js --basis` hält den Basis-Lauf vor Task 1 fest, `ledger.js check|next|tdd` prüft das Ledger, nennt den nächsten Schritt und weist auf Tests nach dem Produktivcode hin. `spec-lint.js --runde` prüft die Form einer Grill-Runde, die Skript-Prüfung `spec-terms` meldet verworfene Synonyme des Glossars, `spec-path.js` bestimmt den Zielpfad der Spec beim Whiteboarding, und `implementation-checks.js` liefert zusätzlich mechanische Code-Hinweise (verschluckte Fehler, Secret-Muster, sehr große Zuwächse) als 🟡.

Alle drei Orchestratoren enden mit genau einem Abschlussbericht in drei Abschnitten (`# Abschlussbericht`, `# Was sich … geändert hat`, `# Was ist noch offen`); er nennt keinen nächsten Schritt, die Leit-Session entscheidet über den Fortgang. Review und Followup zeigen keinen Bericht, sondern geben als einzige Ausgabe ihre Review-Statuszeile aus: `Review abgeschlossen: <ergebnis> · FOLLOWUP <ja|nein> · Bericht: <ablage-datei>`. `FOLLOWUP ja` heißt nur, dass eine offene Gruppe einen gesicherten Vorschlag hat; ob eine Runde läuft, entscheidet `orchestrator-state.js next`. `orchestrator-report.js` setzt den Endstand aus den Bericht-Daten in der Ablage zusammen; `orchestrator-state.js ablage` nennt die Dateien des Laufs.

Die drei Orchestratoren iterieren Integration → Re-Review (`review-followup <A> alle`), solange der letzte Bericht ein offenes 🔴 mit Scout-Vorschlag nennt; `orchestrator-state.js next` entscheidet das aus den Bericht-Daten (`NEXT=followup|weiter|ende`, bei vorzeitigem Ende trotz 🔴 `ABBRUCH=maximum|stillstand`). 🟡 und 🟢 lösen keine Runde aus und stehen im Abschlussbericht unter `Was ist noch offen`; ⚠️ beendet den Lauf. Maximum und Stillstand-Regel (dieselbe 🔴-Stelle nach zwei aufeinanderfolgenden Runden offen) stehen in `shared/orchestrator-rules.md`. Der Abschlussbericht nennt `Iterationen: <n> von <max>` und bei vorzeitigem Ende `Abbruch: <grund>`; die Leit-Session zeigt die Zeile am Haltepunkt und führt offene 🔴 mit Herkunft. Die Integration setzt den bevorzugten Vorschlag um; eine Abweichung steht mit Begründung im Bericht (`Abweichung: …`).

Jeder Orchestrator vermerkt am Ende einen **Ketten-Eintrag** je Slug (Stufe, Spec, Plan, Workitem, Worktree, Branch) mit `scripts/chain.js`, abgelegt unter `<git-common-dir>/dv-forge/chain/`, gemeinsam für den Haupt-Checkout und alle Worktrees; `finish-work` entfernt den Eintrag. Berichte nennen ihn nicht als Empfehlung.

Die Ablage ist der eine Datenkanal zwischen Etappe und Leit-Session und immer eingeschaltet: Review und Followup legen Bericht und Bericht-Daten unter `<git-common-dir>/dv-forge/session-chain/<slug>/ablage/<etappe>/` ab, die Orchestratoren ihren Abschlussbericht, gemeinsam für den Haupt-Checkout und alle Worktrees. Slug und Etappe legt `prepare.js` fest; ein neues Review beginnt die Ablage seiner Etappe neu. Bericht-Daten im Format der früheren Doppel-Betriebsart liest keine Etappe und migriert niemand: Sie zählen als fehlende Voraussetzung.

## Skills

| Skill | Wofür | Aufruf |
|---|---|---|
| `init` | dv-forge in einem Projekt einrichten, insbesondere den dv-forge-Abschnitt der Projekt-`CLAUDE.md` | von Hand |
| `spec-whiteboarding`, `spec-whiteboarding-with-docs` | Aus Anfrage oder Idee eine Spec erarbeiten | intern |
| `spec-review`, `plan-review`, `implementation-review` | Review durch parallele Reviewer, ein Rework, eine Verifikation | intern |
| `review-followup` | Gewählte Scout-Vorschläge aus einem Review umsetzen | intern |
| `spec-review-orchestrator` | Spec prüfen, nacharbeiten und committen in einem Lauf; kein Worktree, kein Branch-Wechsel | intern |
| `plan-writing` | Spec in Plan überführen | intern |
| `plan-orchestrator` | Plan schreiben, prüfen und nacharbeiten in einem Lauf; kein Commit, die Spec bleibt unverändert | intern |
| `start-work`, `implementation`, `finish-work` | Arbeit vorbereiten, umsetzen, abschließen | intern |
| `implementation-orchestrator` | Umsetzen, prüfen und nacharbeiten in einem Lauf; Worktree bleibt, `finish-work` ruft nur der Mensch, Plan und Spec bleiben unverändert, kein Push | intern |
| `spec-grilling` | Geschriebene Spec auf Grenzfälle, Widersprüche und Lücken prüfen; W-Einträge gelten als beantwortet | intern |
| `session-orchestrator` | Session-Kette führen: jede Etappe in eigener Session, Haltepunkte, Prüfung gegen git, Schlussbericht | Startbefehl |
| `domain-modeling` | Unscharfe oder widersprüchliche Fachbegriffe klären, ADRs anstoßen | von Hand |
| `merge-conflict-resolution` | Gestoppten Merge oder Rebase auflösen | von Hand |
| `commit-message` | Commit-Message im Conventional-Commits-Stil schreiben (Text ausgeben, nicht committen); `init` trägt ihn als `Commit-Konvention` ein | von Hand |

Das Modell darf alle Skills außer `init` selbst aufrufen, auch aus Sub-Agenten, damit ein Orchestrator Review-, Plan- und Umsetzungsabläufe verketten kann. `init` trägt `disable-model-invocation: true`, weil es einen Dialog mit dem Nutzer führt. Der Startbefehl und die Werkzeuge ohne Etappe sind die einzigen Skills, die der Nutzer ohne `--debug` selbst tippt.

## Agents

Unter [`agents/`](agents) liegen die Spezialisten der Review-Loops, gruppiert nach Stufe:

- `spec-review-*`, `spec-rework`
- `plan-review-*`, `plan-rework`
- `implementation-*` (Implementer, Task-Reviewer, Re-Reviewer, Final-Reviewer) und `implementation-review-*`

Jede Stufe hat einen `*-scout`, der für offene Findings konkrete Lösungsvorschläge macht.

## Einrichten

```text
/plugin install dv-forge@dv-ai-development
```

Danach im Projekt `/dv-forge:init` ausführen.
