---
name: spec-review
description: Runs a fresh-context reviewer over a finished spec.md and records its verdict APPROVE or NEEDS_CHANGES with a severity-rated finding list next to the spec. Use when a grilled spec should be checked before planning.
argument-hint: <spec.md>
disable-model-invocation: true
---
<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/phases/spec-review.yaml -->

# Spec-Review

`$ARGUMENTS`: `<spec.md>` · `<PLUGIN>` = `${CLAUDE_PLUGIN_ROOT}`

Du orchestrierst, sonst nichts. Du liest die Spec nicht, bewertest keine Findings und änderst nichts an der Spec. Der Reviewer prüft, du legst sein Ergebnis unverändert ab.

## Eingang und Artefakt

- Eingang: `spec.md`; das erste Argument ist der Pfad zu `spec.md`, alle anderen Artefakte liegen im selben Ordner.
- Artefakt: `<spec-ordner>/spec-review.md`
- Gate: Bericht mit Verdict und Befundliste neben der Spec abgelegt; Verdict APPROVE nur ohne offenes 🔴.
- Hook: `scripts/gate-spec-review.sh` blockiert `/angular:spec-review` mit Exit-Code 2, wenn ein Pflichtartefakt fehlt (R-050).

## Ablauf

1. **Eingang:** Fehlt die Spec, meldest du „Spec nicht gefunden: <pfad>“ und endest. (→ R-050)
2. **Review:** Starte den Agent `angular:spec-review` über das Agent-Werkzeug als frische Instanz im Vordergrund, mit genau den Eingabezeilen aus dem Abschnitt Reviewer. Keine weiteren Inhalte, keine Findings früherer Läufe. (→ R-030)
3. **Ablegen:** Schreib die Antwort des Reviewers unverändert nach `spec-review.md` im Ordner der Spec, darüber die Zeile `# Spec-Review: <spec-pfad>`. Gibt es die Datei schon, ersetzt sie den Bericht des vorigen Laufs. TODO(forge/shared/review-flow/flow.md): forge hat Runde 1, eine Nacharbeit, Nachprüfung und Scout; der Prototyp hat nur Runde 1.
4. **Ende:** Im Chat steht als letzte Handlung genau die Zeile `Review abgeschlossen: <APPROVE|NEEDS_CHANGES> · Bericht: <pfad>`, nichts davor oder danach. (→ R-004) TODO(forge/README.md): Die forge-Statuszeile enthält zusätzlich `FOLLOWUP <ja|nein>`; Followup gibt es im Prototyp nicht.

## Reviewer

Agent `angular:spec-review`, Eingabezeilen:

- `Spec:` absoluter Pfad zur `spec.md`

## Regeln

- **R-050 · Pflichtartefakte vor dem Start.** Eine Etappe startet nur, wenn ihre Pflichtartefakte vorliegen; das prüft ihr Gate. Fehlt eines, meldest du „<Artefakt> nicht gefunden: <pfad>“ und endest. *Warum:* Jede Etappe arbeitet auf dem Artefakt ihrer Vorgänger; Grill und Plan-Writing enden in dv-forge bei fehlender Spec mit „Spec nicht gefunden“.
- **R-030 · Frischer Kontext.** Der Reviewer läuft als frische Instanz. Er liest nur die Dateien aus seinem Auftrag, keinen Chatverlauf und keine Findings früherer Runden, und er ändert keine Datei. *Warum:* TODO(forge/shared/review-flow/flow.md): forge schreibt die frische Instanz vor (Runde 1, Schritt 1), nennt aber keinen Grund.
- **R-031 · Nur Wesentliches.** Der Reviewer meldet nur, was bei der Umsetzung zu falschem Bau oder zum Steckenbleiben führt. Formulierung, Stilvorlieben und „wäre schön“ sind keine Findings. *Warum:* 🔴 heißt, ein Planer oder Implementierer würde etwas Falsches bauen oder müsste raten; nur das blockt.
- **R-032 · Wörtliches Zitat.** Jedes Finding zitiert seine Stelle wörtlich aus dem geprüften Dokument; Zitate aus einer Zusatzquelle beginnen mit `Quelle: `. *Warum:* Ein erfundener Beleg soll keine Nacharbeit erzwingen; im Spec-Review wird ein Finding, dessen Zitat nicht in der Spec steht, höchstens 🟡.
- **R-033 · Kategorie bestimmt die Severity.** Jedes Finding bekommt genau eine Kategorie; die Severity folgt fest aus der Tabelle der Kategorien. *Warum:* TODO(forge/scripts/lib/implementation-categories.js): forge vergibt die Farbe per Code aus der Kategorie, nennt aber keinen Grund. Siehe INVENTORY a1: severity-rules.md sagt das Gegenteil.
- **R-034 · Verdict.** Das Verdict ist `APPROVE`, wenn kein 🔴 offen ist, sonst `NEEDS_CHANGES`. 🟡 und 🟢 ändern das Verdict nicht. *Warum:* Sauber heißt in dv-forge kein 🔴; nur ein offenes 🔴 löst eine Followup-Runde aus, 🟡 und 🟢 stehen nur im Bericht.
- **R-014 · W-Einträge sind bindend.** Jede Entscheidung des Menschen steht als `- **W · <Kurztitel>** · <Beleg-Tag> — <Antwort>` unter `## Entscheidungen`. Ein W-Eintrag ist beantwortet und bindend; du fragst nicht erneut danach, auch nicht anders formuliert oder als Bestätigung. *Warum:* W-Einträge sind die bindenden Entscheidungen des Menschen; ein W-Eintrag ist deshalb nie selbst ein Finding.
- **R-004 · Ende ohne nächsten Schritt.** Am Ende steht nur das Ergebnis der Etappe, wie ihr Ablauf es nennt. Kein Befehl, kein Hinweis auf einen nächsten Schritt, kein Commit, kein automatischer Start. *Warum:* Über den Fortgang entscheidet nicht die Etappe; in dv-forge entscheidet ihn die Leit-Session mit dem Menschen.

## Beispiele

Beispiele stehen in [references/beispiele.md](references/beispiele.md); sie sind keine Pflicht.
