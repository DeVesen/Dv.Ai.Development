# Wünsche intern — Verbesserungen am dv-forge-Plugin

Zusammenfassung der Erfahrungsberichte `1.md`–`5.md` (dv-forge 0.4.0, Läufe vom 2026-09-25).
Jeder Punkt wurde am 2026-09-26 gegen den Quellcode unter `plugins/forge` geprüft. Kein Punkt war dort schon behoben.

- **Quellen:** `<Bericht>.<Punkt>`, z. B. `1.4` = `1.md`, Punkt 4; `1.K3` = `1.md`, Kleinigkeiten, dritte Zeile.
- **Prüfung:** `bestätigt` = Lücke steht so im Code · `teilweise` = schon teilweise geregelt, Rest offen.
- Pfade sind relativ zu `plugins/forge`.
- Was außerhalb von dv-forge liegt, steht in `new-wishes-extern.md`.

## Empfohlene Reihenfolge

1. **Q2 + Q3** Reviewer-Ergebnis per Datei, Formatfehler nachfordern statt neu starten. Rund 36 % der Subagent-Tokens im plan-review-Lauf gingen für unnötige Neustarts drauf, dazu falsche Ausfälle.
2. **Q1** Eine Regel für die Pfade von Spec und Plan. Kam in allen fünf Berichten vor.
3. **Q7** Guard: gibt sich bei jedem Turn-Ende frei und blockt zugleich zu breit.
4. **Q4** Berichte abhängig vom Ergebnis formulieren, inkl. Logikfehler bei `N = 0`.
5. **I5** Ledger beim Abschluss erhalten und an `implementation-review` übergeben.

---

## Q — Querschnitt (mehrere Skills, `shared/`, Scripts)

### Q1. Ablagepfade von Spec und Plan nicht fest verdrahten

- **Quellen:** 1.1, 2.1, 3.3, 4.1, 5.1
- **Prüfung:** bestätigt, teilweise entschärft.
  - `skills/implementation/SKILL.md:27`, `skills/implementation-review/SKILL.md:15`, `skills/plan-review/SKILL.md:15`: Default ist `spec.md` im Ordner des Plans. Die Zeile `**Spec:**` im Plan-Kopf (`plan-writing/references/plan-format.md:13`) liest niemand.
  - `skills/plan-review/SKILL.md:16`: Die Fehlermeldung nennt keine Kandidaten.
  - `skills/implementation-review/SKILL.md:15`: Ein zweites Argument ohne `--spec` wird still ignoriert.
  - `skills/spec-whiteboarding/SKILL.md:33` und `references/spec-format.md:3` legen `docs/forge/<slug>/spec.md` fest, `skills/plan-writing/SKILL.md:20` legt `plan.md` im Spec-Ordner fest. Zum Vorrang der Projekt-`CLAUDE.md` sagen beide nichts.
  - Schon tolerant: `scripts/plan-tasks.js:114-119` (`slugOf`) nimmt beliebige Dateinamen, und plan-review nimmt die Spec als zweites Argument.
- **Wunsch:**
  - Eine gemeinsame Auflösungsregel für alle Skills: (1) explizites Argument, (2) `**Spec:**`-Zeile im Plan-Kopf, (3) `spec.md` im Plan-Ordner, (4) Abbruch mit Liste gefundener Kandidaten.
  - Ein zweites Argument ohne Flag in `implementation-review` als Spec annehmen oder klar abbrechen, nie still verwerfen.
  - In `spec-whiteboarding` und `plan-writing` festschreiben, dass die Ablage-Regeln der Projekt-`CLAUDE.md` Vorrang haben. Die Übergabe nennt dann den tatsächlichen Pfad. `plan-writing` bekommt ein optionales Zielpfad-Argument.

### Q2. Reviewer-Ergebnisse per Datei statt per Heredoc übergeben

- **Quellen:** 2.3, 2.12, 3.7, 5.3, 5.7, 5.8
- **Prüfung:** bestätigt.
  - `shared/review-loop/loop.md:22-27`: Der Orchestrator kopiert jeden JSON-Block wörtlich in einen Heredoc. Nach einem Reviewer-Neustart gehen *alle* Blöcke erneut ans Script.
  - `loop.md:34-42`: `rework-outcome.js` erwartet die Aggregation plus Nacharbeiter-Block mit den Trennzeilen `=== AGGREGATE ===` und `=== REWORK-RESULT ===`. Den Zustand hält der Orchestrator von Hand.
  - `scripts/aggregate-findings.js:195`, `scripts/rework-outcome.js:132`: Beide lesen nur stdin, es gibt kein `--input`. Heredocs funktionieren unter Windows nur in Git Bash, nicht in PowerShell.
  - Kein Reviewer hat das Tool `Write`. Das Vorbild für eine Übergabe per Datei steht schon in `skills/implementation/references/task-loop.md:6`.
  - `skills/spec-review/SKILL.md:18,26`: Die Profil-Trefferliste (im Lauf 32 absolute Pfade) geht als Prompt-Text an den Reviewer.
  - Ein beim Abtippen verlorenes `\\` in einem Windows-Pfad machte ein gültiges Ergebnis zum Ausfall (5.3).
- **Wunsch:**
  - Jeder Reviewer schreibt seinen Block nach `<W>/<reviewer>.json`. `aggregate-findings.js` liest das Verzeichnis, eine fehlende Datei heißt „ausgefallen“, die Zuordnung ergibt sich aus dem Dateinamen.
  - Alle Scripts nehmen `--input <datei>` statt nur stdin an. Den Zustand je Runde legen sie selbst im Workspace ab, z. B. `rework-outcome.js --workspace <W> --round 1`.
  - Die Profil-Liste als Datei oder als Glob übergeben.
  - Minimalvariante, falls Dateien nicht gehen: Jeder Reviewer beginnt mit der Kopfzeile `REVIEWER: <name>`.
- **Hinweis:** Die Ursache liegt zum Teil in der Harness, siehe extern E1.

### Q3. Fehlender JSON-Block: nachfordern statt neu starten

- **Quellen:** 3.1, 3.8, 5.2, 5.10
- **Prüfung:** teilweise.
  - Alle 15 Reviewer-Definitionen verlangen `"findings": []` bei null Findings schon im Text (z. B. `agents/implementation-review-risks.md:52`). Keine zeigt aber ein Beispiel mit leerem Array. Trotzdem fehlte der Block in 5 von 11 plan-review-Läufen.
  - `shared/review-loop/loop.md:28` verlangt einen kompletten Neustart ohne Hinweis auf den Formatfehler. Das schonende Muster (per `SendMessage` nur den Block nachfordern) gibt es schon beim Nacharbeiter: `skills/plan-review/SKILL.md:43`.
  - Kosten im plan-review-Lauf: rund 220k von 610k Subagent-Tokens für Neustarts. Ein Reviewer fiel in Review 1 ganz aus.
- **Wunsch:**
  - Am Ende jeder Reviewer-Definition ein wörtliches Beispiel `{"reviewer":"<name>","findings":[]}` und der Satz „Die letzte Ausgabe MUSS der JSON-Block sein, auch bei null Findings“.
  - Bei einem Formatfehler den bestehenden Agent per `SendMessage` fortsetzen und nur den Block anfordern. Erst wenn das scheitert, neu starten, dann mit dem Hinweis „letzte Antwort ohne JSON-Block“.
  - Optional ein `SubagentStop`-Hook, der das Ausgabeformat prüft.

### Q4. Berichte: Belege zeigen, Ausfälle erklären, Texte ans Ergebnis anpassen

- **Quellen:** 2.8, 3.2, 3.5, 3.11, 5.6, 5.9
- **Prüfung:** bestätigt.
  - `scripts/aggregate-findings.js:132-137`: Bei 0 Findings steht nur „Keine Findings.“. `shared/review-loop/finding-format.md:6-17` kennt nur `reviewer` und `findings`, kein Feld für den Prüfumfang.
  - `shared/review-loop/report-format.md:11` übernimmt nur den REPORT-Abschnitt. Fehlt ein Block ganz, entsteht nicht mal eine ERROR-Zeile (`aggregate-findings.js:66-74`), der Reviewer steht nur in `failed=`.
  - `report-format.md:8`: „Ausgefallen“ ohne Bezug zur Runde. `failed=` wird je Aggregation neu berechnet (`aggregate-findings.js:110-116`).
  - **Logikfehler:** `skills/implementation-review/SKILL.md:20` setzt `N = 0`. In `loop.md:29-32` greift der Stopp „Cap erreicht“ dadurch vor dem Fallback `red = 0`. Ein reiner Ausfall endet als „geprüft, 0 × 🔴 offen“.
  - `skills/implementation-review/SKILL.md:43,50`: „Nächster Schritt: Findings und Scout-Vorschläge lesen“ steht fest, auch ohne Findings und ohne Scout.
  - Die Tabelle zeigt je Stelle nur die Konsequenz des höchststufigen Findings (`aggregate-findings.js:132-137`). Das ist als „Bekannte Grobheit“ gewollt (`shared/review-loop/severity-rules.md:17`). Bei einem Plan mit einem Task landet so alles in einer Zeile.
- **Wunsch:**
  - Feld `summary` im JSON-Block, im Bericht eine Zeile je Reviewer, z. B. „Profile: 32 übergeben, 20 gelesen, Ist-Stand gedeckt, 0 Findings“.
  - Abschnitt „Hinweise des Orchestrators“ für eigene Abweichungen, z. B. wie ein Argument ausgelegt wurde.
  - Ausfall erklären („lieferte keinen gültigen Abschlussblock“), mit Runde, z. B. „feasibility (Review 1)“, und mit nächstem Schritt.
  - Status und nächsten Schritt aus `red`/`yellow`/`failed` ableiten. Die Stopp-Reihenfolge für `N = 0` korrigieren.
  - Die „Bekannte Grobheit“ neu bewerten: Anzahl der Findings je Stelle und alle Konsequenzen zeigen, oder feinere Stellen wie „Task 1 / Schritt 7“ zulassen.

### Q5. Statuszeilen während langer Läufe

- **Quellen:** 1.6, 5.4
- **Prüfung:** bestätigt. `shared/review-loop/loop.md` schreibt keine Zwischenmeldung vor. `skills/implementation/references/task-loop.md:70` verlangt eine Statuszeile nur, wenn der Controller untätig wartet. Im Lauf gab es 8,5 Minuten ohne Meldung, bis die Harness sie einforderte.
- **Wunsch:** Eine Statuszeile vor jedem Dispatch („Task n von m an Umsetzer, Modell X“) und nach jedem Review bzw. jeder Nacharbeit („Review 1: 1× 🔴 (buildability). Nacharbeit 1 von 3 läuft.“). Dazu eine Empfehlung, wann Subagenten im Hintergrund laufen.

### Q6. Übergabe an den nächsten Schritt und Commit

- **Quellen:** 2.6, 2.9, 4.14, 5.13
- **Prüfung:** bestätigt.
  - `skills/spec-review/SKILL.md:41` endet immer mit „selbst committen“, egal wie der Status ist. `skills/plan-review/SKILL.md:58-61` zeigt schon, wie es je nach Status mit Folgebefehl geht.
  - `skills/plan-writing/SKILL.md` prüft nicht per `git status`, ob die Spec committet ist.
  - `skills/plan-review/SKILL.md:60` empfiehlt den Commit, bietet ihn aber nicht an.
  - `skills/spec-whiteboarding/SKILL.md:34-39`: Die Übergabe nennt nur den relativen Pfad, ohne Branch und ohne Commit-Option.
- **Wunsch:**
  - `spec-review` gibt bei „sauber“ den Befehl `/dv-forge:plan-writing <spec>` aus. Bei Cap oder Stillstand sagt es ausdrücklich „Spec nicht bereit“.
  - `plan-writing` warnt zu Beginn, wenn die Spec ungetrackt oder geändert ist, und nennt am Ende den Commit von Spec und Plan als Schritt.
  - `plan-review` bietet nach „sauber“ an, jetzt zu committen, mit der Workitem-Nummer aus dem Dateinamen.
  - `spec-whiteboarding` nennt in der Übergabe Branch und absoluten Pfad und bietet einen Commit als Option an.

### Q7. Guard der Orchestratoren

- **Quellen:** 3.4, 3.10, 5.12, dazu ein eigener Befund aus der Prüfung
- **Prüfung:**
  - **Zu breit (bestätigt):** `scripts/guard-orchestrator.js:196-207` blockt jeden Shell-Befehl im Repo außer einem unverketteten Script-Aufruf. Ausgenommen sind Plugin-Dateien nur für das Tool Read (`:226`), nicht für Bash/PowerShell. Die Begründungen (`:28-44`) sind allgemein und nennen weder den geblockten Befehl noch den erlaubten Weg.
  - **Frühes Ende (teilweise):** Der Guard gibt sich über die Hooks `Stop` und `SessionEnd` selbst frei (`hooks/hooks.json:12-17` → `guard-orchestrator.js:263` → `release`). Dokumentiert ist das in keinem Skill. Der Workspace bleibt nach einem frühen Abbruch liegen, harmlos wegen `.forge/.gitignore`.
  - **Eigener Befund, zu verifizieren:** Der Hook `Stop` feuert am Ende *jedes* Turns des Hauptagenten. Wartet der Orchestrator auf Reviewer im Hintergrund, endet sein Turn, und der Marker ist gelöscht. `UserPromptSubmit` (`onPrompt`) setzt ihn nur beim Skill-Aufruf neu. Damit schützt der Guard womöglich nur bis zum ersten Warten.
- **Wunsch:**
  - Plugin-Dateien und die vom Skill vorgeschriebenen Script-Aufrufe auch für Shell-Tools freigeben. Die Deny-Meldung nennt, was geblockt wurde und welcher Weg erlaubt ist.
  - Freigabe und Aufräumen des Workspace auf jedem Ausstiegspfad vorschreiben und das automatische Freigeben im Skill dokumentieren.
  - Den Lebenszyklus des Markers prüfen und mit einem Test absichern: nicht bei `Stop` freigeben, sondern beim Abschluss des Skills bzw. bei `SessionEnd`.

### Q8. Scripts geben Pfade einheitlich mit `/` aus

- **Quellen:** 1.K3, 3.12
- **Prüfung:** bestätigt. `scripts/plan-tasks.js:101`, `scripts/workspace.js:16-27`, `scripts/review-package.js:57` nutzen `path.join`/`path.resolve` und liefern unter Windows `\`. `git rev-parse` liefert `/`. In Heredocs und Prompts ist das eine Quoting-Falle.
- **Wunsch:** Alle Scripts normalisieren ihre Pfadausgabe auf `/`.

### Q9. Vorrang der eigenen Formate vor fremden Stil-Regeln

- **Quellen:** 1.13, 4.8
- **Prüfung:** bestätigt. `skills/implementation/SKILL.md:39-42` verlangt jede `Urteil:`-Zeile vollständig im Chat, `shared/review-loop/report-format.md:21` schließt Dateien aus. `skills/spec-whiteboarding-with-docs/SKILL.md:9-14` regelt keinen Vorrang gegenüber Stil-Plugins und Output-Hooks.
- **Wunsch:**
  - Den Abschlussbericht von `implementation` als Datei schreiben, neben das erhaltene Ledger (siehe I5). Im Chat nur Ergebnis, Zahl der Urteile, offene Punkte, Link und nächster Befehl.
  - In jedem Skill mit festem Format einen Satz ergänzen, welche Formatvorgaben Vorrang vor fremden Stil-Regeln haben, z. B. Rundenformat und Übergabe-Punkte.
- **Hinweis:** Die Gegenseite (Stil-Plugins und Hooks) steht in extern E3.

### Q10. Review-Aufwand an die Größe anpassen

- **Quellen:** 1.9, 2.2, 5.10
- **Prüfung:** bestätigt.
  - `skills/spec-review/SKILL.md:19`: Immer laufen alle Reviewer. Der Profil-Reviewer bekommt die ganze Trefferliste und verbrauchte im Lauf rund 82k von 136k Tokens für eine 30-Zeilen-Spec.
  - Die plan-review-Agents lesen jeweils Plan, Spec und denselben Code und prüfen teils dieselben Fakten (Doku-Zitate, Testnamen, DOM einer Fremdbibliothek).
  - `skills/implementation/SKILL.md:33` und `references/final-review.md`: Bei einem Plan mit einem Task laufen Task- und Final-Review über denselben Diff (rund 95k Tokens). Der Vorab-Scan bleibt Pflicht.
- **Wunsch:**
  - Profile vorfiltern, z. B. per Begriffs-Match der Spec gegen Profiltitel und Glossar, oder nur einen Profil-Index übergeben. Optional ein Modus „kleine Spec“ mit weniger Reviewern.
  - Prüfbereiche schärfer abgrenzen (Doku-Zitate prüft nur buildability) oder einmal eine gemeinsame Faktenliste für alle Reviewer erzeugen.
  - Bei einem Task nur das Final-Review mit opus fahren, den Vorab-Scan auf eine Zeile je Task kürzen.

### Q11. Stillstand am Ergebnis messen, nicht am Datei-Hash

- **Quellen:** 5.11
- **Prüfung:** bestätigt. `shared/review-loop/loop.md:30-38` erkennt Stillstand nur daran, dass der Hash gleich bleibt (`file-hash.js`). Ein Nacharbeiter, der nur einen Eintrag unter „Entscheidungen“ ergänzt, gilt als Fortschritt. Die Stati aus `rework-outcome.js` nutzt nur die Spec-Rückfrage (`skills/plan-review/SKILL.md:33-45`).
- **Wunsch:** Fortschritt daran messen, ob mindestens eine rote Stelle `changed` ist und im nächsten Review nicht wieder auftaucht.

---

## S — spec-whiteboarding und spec-whiteboarding-with-docs

### S1. Keine Branch- oder Worktree-Aktionen beim Whiteboarding

- **Quellen:** 4.2
- **Prüfung:** bestätigt. `skills/spec-whiteboarding/SKILL.md` sagt nicht, in welchem Checkout die Spec entsteht. Im Code wird `workspace.js` erst von `implementation` aufgerufen. Der Text sagt das aber nicht, deshalb wandte der Agent eine Umsetzungsregel des Projekts schon auf die Spec an.
- **Wunsch:** Festlegen: Die Spec entsteht im aktuellen Checkout. Branch und Worktree gehören nicht zum Whiteboarding, sondern frühestens zur Umsetzung.

### S2. Rundenformat schärfen (`references/grill-rounds.md`)

- **Quellen:** 4.3, 4.5, 4.11
- **Prüfung:**
  - 4.3 bestätigt: Keine Pflicht zur Rückfrage, wenn eine Antwort nicht eindeutig ist.
  - 4.5 teilweise: „Fakten sind keine Fragen“ steht in `grill-rounds.md:22`. Der Fall, dass ein Fakt nur einzelne Optionen ausschließt, fehlt.
  - 4.11 teilweise: `skills/domain-modeling/SKILL.md:16` verlangt, Begriffskonflikte sofort zu benennen. Das Rundenformat hat dafür aber keinen festen Platz.
- **Wunsch:**
  - Beantwortet der Mensch eine Frage nicht ausdrücklich, fragt der Agent in einem Satz nach, bevor er einen W-Eintrag bucht oder etwas ausführt.
  - Optionen, die ein Fakt ausschließt, werden nicht angeboten. Der Fakt steht als Voraussetzung da, gefragt wird höchstens, ob er gelten soll.
  - Eine feste Zeile vor den Fragen: „Begriffe: <Wort des Menschen> → <Glossar-Begriff>“.

### S3. Rahmenfragen von fachlichen Fragen trennen, Metadaten erlauben

- **Quellen:** 4.4, 4.13
- **Prüfung:** bestätigt. `references/spec-format.md:31` („WAS statt WIE“) kennt keine Trennung für Branch, Workitem-Nummer oder Ablage. `spec-format.md:30` verbietet Ticket-Nummern und Verweise ohne Ausnahme.
- **Wunsch:**
  - Rahmenfragen vor Runde 1 klären und nicht als W-Eintrag verbuchen, oder in `spec-format.md` ausdrücklich ausschließen.
  - Einen abgegrenzten Kopfbereich für Metadaten erlauben (Workitem-Nummer, Basis-Stand, Datum), der nicht als fachlicher Inhalt zählt.

### S4. Bestätigter Entwurf muss der geschriebenen Spec entsprechen

- **Quellen:** 4.9
- **Prüfung:** bestätigt. `skills/spec-whiteboarding/SKILL.md:31` („Bestätigen“) verlangt weder eine leere Frontier noch eine erneute Bestätigung späterer Änderungen.
- **Wunsch:** Einen Entwurf erst bei leerer Frontier vorlegen. Die Datei ist wortgleich zum bestätigten Entwurf. Jede spätere Änderung geht als Diff erneut zur Bestätigung.

### S5. Skizzenpflicht mit Schwelle

- **Quellen:** 4.7
- **Prüfung:** bestätigt. `skills/spec-whiteboarding/SKILL.md:12` verlangt eine Skizze pauschal für „Abläufe und Vergleiche“.
- **Wunsch:** Eine prüfbare Schwelle nennen, z. B. „Skizze ab drei Schritten oder zwei Varianten, bei einzeiligen Änderungen genügt Text“.

### S6. Beleg-Tags bei gemischten Quellen

- **Quellen:** 4.12
- **Prüfung:** teilweise. `skills/spec-whiteboarding-with-docs/SKILL.md:13` regelt den Mischfall Glossar/Git über den Vorrang von Historie. `spec-format.md:29` („meist Aussage“) deckt die bestätigte Empfehlung ab. Eine allgemeine Regel fehlt.
- **Wunsch:** Klar festlegen: nur ein Tag je Aussage und in welcher Rangfolge. Eine bestätigte Empfehlung gilt als `Aussage`.

### S7. Anlauf des Verbund-Skills

- **Quellen:** 4.15
- **Prüfung:** bestätigt. `skills/spec-whiteboarding-with-docs/SKILL.md:9` verweist nur relativ auf `references/…` beider Skills. Wann `domain-modeling/references/context-format.md` und `adr-format.md` nötig sind, sagt er nicht.
- **Wunsch:** Kernregeln der Referenzen inline aufnehmen oder je Schritt sagen, welche Referenz zu lesen ist. Die Referenzen so benennen, dass sie ohne Suche im Plugin-Cache auffindbar sind.
- **Hinweis:** `spec-whiteboarding` fehlt in der Skill-Liste der Session, obwohl es kein `disable-model-invocation` hat und im Cache installiert ist. Siehe extern E1.

### S8. Folgeaufträge und Werkzeuge der Faktensuche

- **Quellen:** 4.6, 4.16
- **Prüfung:** bestätigt. Die Übergabe (`SKILL.md:34-39`) sagt nicht, dass Folgeaufträge außerhalb des Whiteboard-Modus laufen. Die Faktensuche (`SKILL.md:12,25`) nennt keine Werkzeuge.
- **Wunsch:**
  - In der Übergabe ein Hinweis: Folgeaufträge außerhalb der Spec (Konfiguration, Regeln) laufen nicht mehr unter dem Whiteboard-Modus.
  - In der Faktensuche: „Vorhandene Such- und Index-Werkzeuge des Projekts haben Vorrang.“

### S9. Glossar-Ort und Branch-Stand in domain-modeling

- **Quellen:** 4.10
- **Prüfung:** teilweise. `skills/domain-modeling/references/glossary-target.md` delegiert Ort und Format des Glossars an working-capturing, dessen Fallback `docs/glossary/` ist. Für Modul- und Feature-Profile gilt nur „Ort nennt Projekt-CLAUDE.md“ (`glossary-target.md:12`), ohne Fallback. Einen Hinweis zum Branch gibt es nicht.
- **Wunsch:** Den Fallback für Profile übernehmen und festlegen, von welchem Branch Glossar und Profile zu lesen sind, wenn das betroffene Verhalten nur auf einem anderen Branch existiert.
- **Hinweis:** Die Abfrage des Ortes selbst gehört zu working-capturing, siehe extern E2.

---

## R — spec-review

### R1. Doppelte, abweichende Profil-Dateien melden

- **Quellen:** 2.11
- **Prüfung:** bestätigt. `skills/spec-review/SKILL.md:18` sucht an zwei Orten ohne Dublettenprüfung. `agents/spec-review-profiles.md:16-19` vergleicht nur die Spec mit den Profilen, nie die Profile untereinander.
- **Wunsch:** Der Orchestrator warnt bei gleichnamigen Profil-Dateien an mehreren Orten. Der Profil-Reviewer meldet abweichende Aussagen zwischen solchen Dateien als eigenes Finding.

Weitere spec-review-Punkte: Profil-Liste als Datei (Q2), Aufwand (Q10), Bericht (Q4), nächster Schritt (Q6).

---

## P — plan-writing

### P1. Kontext lesen: Vorgänger und Test-Konventionen

- **Quellen:** 2.10, 2.13
- **Prüfung:** bestätigt. `skills/plan-writing/SKILL.md:21` nennt nur die Projekt-`CLAUDE.md` und den Code.
- **Wunsch:**
  - Specs und Pläne mit derselben Workitem-Nummer bzw. zum selben Slug suchen und als Kontext lesen.
  - Die Test-Konventions-Skills des betroffenen Stacks laden, falls vorhanden, und ihre Kernregeln als Global Constraint übernehmen.

### P2. Schritttyp für Absicherungstests

- **Quellen:** 2.4
- **Prüfung:** bestätigt. `references/task-rules.md:22-30` schreibt den Zyklus fest vor, der mit einem fehlschlagenden Test beginnt. ACs wie „bleibt wie bisher“ passen nicht hinein.
- **Wunsch:** Einen Schritttyp „Absicherungstest (erwartet: bereits grün)“ bzw. „bestehenden Test ausführen“ für ACs ohne Code-Änderung.

### P3. Annahmen über Fremd-Code und Tool-Aufrufe prüfen

- **Quellen:** 2.5, 5.5
- **Prüfung:** bestätigt. `references/self-check.md:1-10` fragt nicht nach Selektoren, Meldungstexten oder Signaturen. `agents/plan-review-buildability.md:5,22` hat nur `Read, Grep, Glob` und prüft nur, ob ein Befehl laut `CLAUDE.md` erlaubt ist. Falsche MCP-Parameter fielen im Lauf nur auf, weil ältere Pläne mit korrekten Aufrufen im Repo lagen.
- **Wunsch:**
  - Punkt im Selbst-Check: „Jede Annahme über Fremd-Code (Selektoren, Meldungstexte, Signaturen) ist im installierten Paket bzw. in der Doku nachgesehen.“
  - Plan-Schreiber und buildability gleichen Tool-Aufrufe mit dem echten Tool-Schema ab statt mit älteren Plänen.

### P4. Standard-Variable für die Checkout-Wurzel

- **Quellen:** 2.7
- **Prüfung:** bestätigt. Weder `references/plan-format.md` noch `task-rules.md` definieren eine. Die Orchestratoren nutzen schon `R` aus `git rev-parse --show-toplevel` (`skills/plan-review/SKILL.md:17`).
- **Wunsch:** Im Plan-Format eine Standard-Variable festlegen, samt Hinweis, wie der Umsetzer sie auflöst. Die Variable zählt nicht als verbotener Platzhalter.

### P5. Format-Unschärfen

- **Quellen:** 2.14
- **Prüfung:** bestätigt.
  - `references/plan-format.md:55` (Regel 5): Unklar, ob eine bestehende Testdatei unter `Test:` oder `Modify:` steht und ob sie einen Anker braucht.
  - Zwei Tag-Vokabulare für W-Einträge: `Aussage` u. a. in `spec-whiteboarding/references/spec-format.md:23,29,32`, `Mensch`/`delegiert` in `plan-format.md:45,61`.
  - `plan-format.md:58` (Regel 8) verlangt „die erwartete Ausgabe“ ohne Maßstab.
- **Wunsch:** Den Fall „bestehende Testdatei ändern“ regeln. Die Tag-Vokabulare vereinheitlichen oder die Abbildung beschreiben. Festlegen: Testname plus FAIL/PASS reicht, Meldungstexte nur, wenn sie gesichert sind.

---

## B — plan-review

### B1. buildability prüft, ob Gates verdrahtet sind

- **Quellen:** 1.7
- **Prüfung:** teilweise. `agents/plan-review-buildability.md:22` fordert „ausführbar“, meldet aber nur „verbotene Wege“ als Finding. Ein Gate, das nicht verdrahtet und nicht verboten ist, fällt durch. Im Lauf schrieb der Plan ein Lint-Gate vor, das im Projekt nicht lief.
- **Wunsch:** Für jedes vorgeschriebene Build-, Test- oder Lint-Gate prüfen, ob es im Projekt verdrahtet ist (Script, Target, installierte Abhängigkeiten). Ein nicht verdrahtetes Gate ist ein Finding.

Weitere plan-review-Punkte: Q1–Q7, Q10, Q11, P3.

---

## I — implementation

### I1. Kategorie „Plan-Vorgabe in der Umgebung nicht erfüllbar“

- **Quellen:** 1.2
- **Prüfung:** bestätigt. `skills/implementation/references/task-loop.md:47` regelt nur Findings, die dem Plan *widersprechen*. Der Fall, dass ein Finding den Plan *verlangt*, die Umgebung ihn aber nicht erfüllen kann, fehlt.
- **Wunsch:** Eine eigene Kategorie mit Ablauf: Ursache außerhalb des Diffs, direkt parken mit Urteil oder als Stopp-Grund an den Menschen, wenn ein Fix Abhängigkeiten installieren würde.

### I2. 🔴 und Freigabe schließen sich aus

- **Quellen:** 1.3
- **Prüfung:** bestätigt. `agents/implementation-task-reviewer.md:63-69` verbietet die Kombination nicht.
- **Wunsch:** Ein 🔴 erlaubt keine Freigabe. Befunde außerhalb des Diffs höchstens als 🟡 oder in einem eigenen Abschnitt „außerhalb des Scopes“.

### I3. Urteil erzwingen bei Abweichung von der Modelltabelle und bei Concerns

- **Quellen:** 1.4, 1.K1
- **Prüfung:** bestätigt bzw. teilweise. `references/model-selection.md` verlangt keine `Urteil:`-Zeile bei Abweichung, `scripts/plan-tasks.js:106-108` liefert keine Modellempfehlung. Im Lauf kostete `sonnet` statt `haiku` rund 114k Tokens. `task-loop.md:24` lässt offen, ob `done-with-concerns` vor dem Review ein Urteil erzeugt. Die Folge sind doppelte Ledger-Zeilen.
- **Wunsch:**
  - Eine Abweichung von der Tabelle erzwingt eine `Urteil:`-Zeile. Alternativ liefert `plan-tasks.js brief` eine Modellempfehlung mit.
  - Concerns nur notieren, geurteilt wird erst nach dem Review.

### I4. Branch-Prüfung gegen die Workitem-Nummer

- **Quellen:** 1.5
- **Prüfung:** bestätigt. `skills/implementation/SKILL.md:29` prüft nur, ob der aktuelle Branch der Default-Branch ist. Im Lauf landete der Fix auf dem Feature-Branch eines anderen Workitems.
- **Wunsch:** Auch fragen oder urteilen, wenn der Branch-Name eine andere Workitem-Nummer trägt als der Plan-Dateiname.

### I5. Ledger beim Abschluss erhalten

- **Quellen:** 1.8
- **Prüfung:** bestätigt. `skills/implementation/SKILL.md:45` und `scripts/workspace.js:31-35` (`fs.rmSync` rekursiv) löschen Ledger, Briefs und Berichte. `skills/implementation-review/SKILL.md` liest keine Historie und entdeckt Geparktes neu oder bewertet es anders.
- **Wunsch:** Mindestens die `Urteil:`- und `geparkt`-Zeilen nach `.forge/history/<slug>.md` verschieben. `implementation-review` liest diese Datei als Eingabe (`Zurückgestellt:`).

### I6. Commit-Notation im Ledger

- **Quellen:** 1.10
- **Prüfung:** bestätigt. `references/ledger.md:16,18` schreibt `<a7>..<b7>` und definiert `a7`/`b7` nicht. Git behandelt `a..b` ohne `a`, bei einem Commit ist `git log` auf den Bereich leer.
- **Wunsch:** Als `<BASE>..<HEAD>` notieren wie in `scripts/review-package.js:37`, oder die Commits als Liste.

### I7. Pflichtangaben fest in den Umsetzer

- **Quellen:** 1.11, 1.K4
- **Prüfung:** bestätigt. `agents/implementation-implementer.md` und `task-loop.md:14-18` erwähnen weder `Co-Authored-By` noch das Laden verzögerter MCP-Tools per `ToolSearch` noch „`.forge/` nicht committen“. Einen Hinweis auf transiente Test-Timeouts gibt es auch nicht.
- **Wunsch:** In die Agent-Definition oder in den Brief von `plan-tasks.js brief` aufnehmen: Commit-Attribution, `ToolSearch` vor „MCP nicht erreichbar“, `.forge/` nicht committen, „Timeout ist kein roter Test: einmal wiederholen und im Bericht nennen“.
- **Hinweis:** Dass die Harness Attribution und Tool-Schemata nicht weitergibt, steht in extern E1.

### I8. Global Constraints per Script, Rolle des Briefs klären

- **Quellen:** 1.12
- **Prüfung:** bestätigt. `task-loop.md:36` verlangt „die bindenden Zeilen des Plans wörtlich“ ohne Script. `plan-tasks.js header` wird nur beim Fixer im Final-Review genutzt (`references/final-review.md:7`). Dazu ein Widerspruch: `task-loop.md:6` will Artefakte nur als Datei weitergeben, `task-loop.md:18` verlangt die Auflösung jeder Mehrdeutigkeit „im Brief“.
- **Wunsch:** Dem Task-Reviewer `Global Constraints:` als Pfad auf die Ausgabe von `plan-tasks.js header` übergeben. Festlegen, ob und wann der Controller den Brief liest.

### I9. `plan-tasks.js list` mit Titeln, Dateien und Schnittstellen

- **Quellen:** 1.14
- **Prüfung:** bestätigt. `scripts/plan-tasks.js:82,122` gibt nur Nummern aus.
- **Wunsch:** Je Task Titel, Dateien und `Produces`/`Consumes` ausgeben und Dateien markieren, die in mehreren Tasks vorkommen. Der Controller urteilt dann nur noch über die Befunde.

### I10. Plan-Pfad in der Ledger-Identität

- **Quellen:** 1.K2
- **Prüfung:** bestätigt. `references/ledger.md:8-9` legt nicht fest, ob `<pfad/plan.md>` absolut oder relativ ist. Nur `SKILL.md:27` macht `P` absolut.
- **Wunsch:** Absoluten Pfad mit `/` vorschreiben, damit der Vergleich beim Wiederaufnehmen stimmt.

Weitere implementation-Punkte: Spec-Pfad (Q1), Statuszeilen (Q5), Abschlussbericht als Datei (Q9), Ein-Task-Plan (Q10), Pfadausgabe (Q8).

---

## V — implementation-review

### V1. Nachweisart kennzeichnen

- **Quellen:** 3.6
- **Prüfung:** bestätigt. `agents/implementation-review-acceptance.md:19` verlangt nur, einen Test zu finden, nicht ihn auszuführen. `agents/implementation-review-tests.md:18-19` führt nur die komplette Suite laut Plan aus. `shared/review-loop/finding-format.md` hat kein Feld für die Nachweisart.
- **Wunsch:** Kennzeichnen, ob ein Nachweis durch Ausführen oder durch Lesen erbracht wurde, oder tests führt die im Plan genannten Test-Filter gezielt aus.

### V2. `prepare.js` für den Eingabenaufbau

- **Quellen:** 3.9
- **Prüfung:** bestätigt. `skills/implementation-review/SKILL.md:16-19` verlangt sieben Einzelaufrufe. `file-hash.js` dient nur als Existenzprüfung, der Hash wird nicht verwendet. Verketten verhindert der Guard (Q7).
- **Wunsch:** Ein Script `prepare.js <plan> [--spec …] [--base …]`, das alle Werte (P, S, R, slug, B, W, K, aktiv) als `key=value` ausgibt oder klar abbricht. Dasselbe Muster lohnt für `plan-review` und `spec-review`.

Weitere implementation-review-Punkte: zweites Argument (Q1), JSON-Block (Q3), Bericht (Q4), Guard (Q7), Historie aus implementation (I5).
