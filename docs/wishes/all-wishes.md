# Verbesserungs-Wunschliste (konsolidiert)

**Stand:** 2026-09-28 · **Quelle:** 11 Erfahrungsberichte aus `docs/wishes/` (alle vom 2026-09-28, dv-forge 0.6.1 → 0.7.0).
Gleiche Wünsche aus mehreren Berichten sind zusammengeführt; die Häufigkeit steht in Klammern und dient als Priorität.

**Kürzel der Quellberichte:**

| Kürzel | Bericht |
|---|---|
| BR | `2026-09-28-branch-name-workitem-doppelt.md` |
| IRA | `2026-09-28-implementation-review-und-abschluss.md` |
| IUR | `2026-09-28-implementation-und-review.md` |
| PR1 | `2026-09-28-plan-review-loop.md` |
| PR2 | `2026-09-28-plan-review-loop-2.md` |
| PWF | `2026-09-28-plan-writing-frontend.md` |
| PWS | `2026-09-28-plan-writing-fullstack.md` |
| RS | `2026-09-28-prozess-retrospektive-selbstpruefung.md` |
| RR | `2026-09-28-prozess-retrospektive.md` |
| SW | `2026-09-28-spec-whiteboarding-und-review.md` |
| SWD | `2026-09-28-spec-whiteboarding-with-docs-und-review.md` |

---

## 1. Top-Prioritäten (größter Hebel, mehrfach gemeldet)

1. **Hauptsession nicht mehr pro Reviewer zweimal wecken** (5×: PR1, PR2, IUR, SW, SWD)
   Jeder Hintergrund-Reviewer erzeugt Bericht + Fertig-Benachrichtigung, die Hauptsession antwortet jeweils nur „warte weiter“. Bis zu 40 Leerlauf-Züge je Review, geschätzt 1–4 Mio. Cache-Tokens je Session.
   *Wunsch:* Reviewer parallel im Vordergrund starten (eine Nachricht, mehrere Agent-Calls, `run_in_background: false`) **oder** neues Skript `wait-results.js --dir <D> --expect <liste> --timeout <s>`, das erst bei vollständigem Ergebnisordner zurückkehrt.
   *Achtung:* `shared/review-loop/loop.md:39` schreibt heute „Reviewer laufen parallel im Hintergrund“ fest — das ist eine **Regeländerung**, keine erlaubte Variante (RR).
   *Ziel:* `shared/review-loop/loop.md` · `neu:` Skript `wait-results`

2. **`session-facts.js` zuverlässig machen** (7×: PWF, SW, PR1, PR2, RR, RS, IRA)
   - Liest ohne Parameter die *neueste* Protokolldatei — bei parallelen Sessions die falsche (PWF, SW). *Wunsch:* Session-ID vom Skill übergeben (`--session <id>` / `--file`); ohne Parameter laut warnen, wenn mehrere Protokolle kürzlich geschrieben wurden. Nach Neustart in frischer Session greift es ebenfalls die falsche (IRA).
   - Zählt Agent-Rückmeldungen und Task-Benachrichtigungen als „Eingaben des Menschen“ (21 statt 5, 7 statt 2, 14 statt 6, 32 …) (PR1, PR2, RR, SW, SWD, IUR). *Wunsch:* nur echte Nutzereingaben zählen.
   - Kein Zeitraum-Filter; Teil-Retros nur per Handschnitt (RS, RR). *Wunsch:* `--from-command`/`--until-command` bzw. `--from`/`--to`.
   - Zählt keine Harness-Hinweise (Stille-Hinweis, Verzeichniswechsel, Kontext-Warnungen) und keine längste Strecke ohne Nachricht an den Menschen (RS).
   - Trennt Wartezeit auf den Menschen nicht von aktiver Arbeitszeit (RS).
   - `--skeleton <Zieldatei>`: schreibt „Zahlen“ und „MCP-Nutzung“ deterministisch vor, Modell ergänzt nur den Rest — spart Ausgabe-Tokens und Abschreibfehler (RR).

3. **Gewählte Scout-Vorschläge per Prozess umsetzen statt per Hand** (3×: PR1, SW, IUR)
   Nach „sauber mit offenen 🟡“ oder nach der Auswahl „Scout-Vorschlag 1“ arbeitet heute der Hauptagent die Änderungen ohne Re-Review ein und committet direkt.
   *Wunsch:* Abschlussbericht bietet „bevorzugte Scout-Vorschläge übernehmen“ an; Nacharbeiter (`plan-rework` / `spec-rework`) setzt sie um und trägt die Entscheidung ein; danach schmales Nach-Review nur der betroffenen Reviewer. Für die Implementierung: `neu:` Skill `review-vorschlaege-umsetzen` — baut aus Findings-Datei + Vorschlagsnummer einen Brief mit Zeilenankern, wählt das Modell nach `model-selection.md`, lässt `implementation-re-reviewer` nur das Fix-Diff prüfen.
   *Ziel:* `dv-forge:plan-review`, `dv-forge:spec-review`, `dv-forge:spec-rework`, `dv-forge:plan-rework` · `neu:` Skill

4. **Gleiche Dateien nicht von jedem Reviewer neu lesen / Anker einmal prüfen** (4×: PR1, PR2, IRA, SWD)
   Plan 12–19×, Spec bis 24×, Service 28× gelesen; buildability und feasibility gleichen dieselben Anker doppelt ab (73 % der Subagent-Tokens bei 0 Findings, PR2).
   *Wunsch:* `neu:` Skript `plan-anchor-check` (bzw. `plan-anchors`): extrahiert alle `Datei:Zeile`-Anker, Pfade und zitierten Codeblöcke eines Plans deterministisch, prüft sie gegen das Repo, schreibt `<W>/anchors.md` für alle Reviewer. feasibility auf „Reihenfolge, Abhängigkeiten, Konsistenz zwischen Tasks“ zuschneiden. Regel in allen Reviewer-Agents: „Plan einmal ganz lesen, danach nur Ausschnitte per Zeilenbereich“; optional Task-Inhaltsübersicht mit Zeilennummern aus `prepare.js`.

5. **Branch-Name mit doppelter Workitem-Nummer beheben** (2×: BR, IUR)
   Slug = Plan-Dateiname inkl. `YYYY-MM-DD-<workitem>-`, dadurch `feature/<nr>-<datum>-<nr>-<slug>` (60 statt ~40 Zeichen, bricht Namenskonvention).
   *Wunsch:* `branchFor()` in `forge-config.js` entfernt führendes `^\d{4}-\d{2}-\d{2}-` und danach die Workitem-Nummer (nach konfiguriertem `Workitem`-Muster). Dateinamen ohne Datum/Nummer bleiben unverändert. Workspace, Base-Tag `forge-base/<slug>` und Ledger behalten den vollen Slug; nur Branch und Worktree-Ordner (`work.js`) werden gekürzt. `work.js start` findet bestehende Branches in alter Form weiter. Tests für alle Kombinationen inkl. Ordnerform `…/<slug>/plan.md`. Plugin-Doku zu `Branch-Schema` sagt, was `<slug>` genau enthält.
   *Entscheidung des Menschen:* Plugin ändern, nicht die Projekt-Konfiguration.

---

## 2. Review-Loop (gemeinsam für Spec-, Plan- und Implementierungs-Review)

- **Nur betroffene Reviewer erneut laufen lassen** (PR1): `--only <reviewer>` oder automatische Auswahl aus Diff seit letztem Review + offenen Findings. Zweiter Durchlauf mit 5 Reviewern für 2 kleine Änderungen kostete ~1,4 Mio. Tokens ohne neuen Befund.
- **Schlanke Besetzung für kleine Eingaben** (SW): `prepare.js` misst die Spec-Größe (z. B. ≤ 12 ACs) und schlägt einen kombinierten Reviewer für Vollständigkeit/Konsistenz/Machbarkeit vor.
- **Scout auf `sonnet` statt `opus`** (SW, IRA): Opus nur bei 🔴. Ein Scout-Lauf für ein reines Doku-🟡 kostete 163k Tokens.
- **`aggregate-findings.js` transparent machen** (SWD): meldete `yellow=0` bei 3 berichteten 🟡. Zeile „eingelesen je Reviewer“ ausgeben und zusammengelegte/verworfene Findings begründen.
- **Fortschrittsprüfung inhaltlich statt nach Stelle** (PR1): `rework-outcome.js progress` wertet ein neues Finding an derselben Kriterium-ID mit anderem Inhalt als Fortschritt, nicht als Stillstand.
- **Orchestrator-Start eindeutig beschreiben** (IUR, IRA): Hook `guard-orchestrator.js` blockt verkettete Bash-Befehle (`cat loop.md && node …`, `; echo "EXIT=$?"`). Im Skill ergänzen: „Plugin-Dateien mit Read, Skripte als einzelner `node`-Aufruf ohne Verkettung.“
- **Zwischenmeldungen „x von 5 fertig“ weglassen** (SWD): ~20× im Chat ohne Informationswert.

## 3. Plan-Review

- **Coverage-Reviewer zerlegt Kriterien in Teilaussagen** (PR1): je fehlender Teilaussage ein Finding. Heute wurde ein AC mit vier Stellen über zwei komplette Durchläufe Stück für Stück bemängelt (~6 Mio. Tokens).
- **Nacharbeiter prüft das ganze Kriterium**, nicht nur den zitierten Teil (PR1).
- **Buildability-Reviewer eingrenzen** (PR1): Orchestrator gibt erlaubte Build-/Test-/Lint-Befehle (`forge-config.js get Test`) als Eingabezeile mit; Prompt verbietet Recherche in Plugin-Quellen und `node_modules`, außer der Plan importiert etwas, das im Projekt nirgends vorkommt. Teuerster Lauf: 40 Tools / 1,8 Mio. vs. günstiger Lauf 14 Tools / 348k.
- **Architecture-Reviewer sucht Duplikate** (IUR): bei Codeblöcken mit „Muster aus <Datei>“ oder gleichnamigen neuen Funktionen nach vorhandenen Gegenstücken suchen. Übersehene Kopie eines Test-Helfers verursachte die teuerste Nachbesserung (3,5 Mio. Tokens).
- **Commit-Frage nur, wenn nötig** (PR2): vor „Soll ich Spec und Plan committen?“ `git status --porcelain <Spec> <Plan>` prüfen (`DIRTY=<liste>` aus Skript); bei leerer Liste direkt zum nächsten Befehl.

## 4. Spec-Review und Spec-Erstellung

- **Nacharbeiter trifft keine Fachentscheidungen** (SWD): jede Änderung als „Klarstellung“ oder „neue Entscheidung“ klassifizieren; neue Entscheidungen landen als offene Frage im Bericht an den Menschen, nicht in der bestätigten Spec. (Fall: zwei neue ACs ohne Bestätigung.)
- **Profil-Reviewer liest Auszüge statt ganzer Profile** (SW, SWD): Runde 1 schreibt Auszug der relevanten Abschnitte in den Arbeitsbereich, ab Runde 2 nur Auszug + geänderte Spec-Stellen. War 45 % aller Reviewer-Tokens.
- **Whiteboarding-with-docs: Profile ganz lesen + Selbstcheck** (SWD): Feature-Profile der betroffenen Bildschirme vollständig lesen, Code-Aussagen des Such-Agents dagegenhalten; vor dem Entwurf jede absolute Soll-Vorgabe („exakt/immer/nie“) gegen alle ACs prüfen. Drei 🔴 aus Runde 1 hätten dort auffallen können (3 Zusatzrunden, ~25 min).
- **Bestandssuche per Code-Index statt Explore-Agent** (SWD): Schrittfolge „erst `forge-config Suche` → `find_in_index` / `find_symbol_references`, dann Agent“; Such-Agents mit kleinerem Modell. Ein Explore-Lauf kostete 839k Tokens.
- **Pflicht-Skizze nur bei Nutzen** (SW): Skizze nur für Abläufe/Verzweigungen, Reihenfolgen und Listen bleiben Text; falls Skizze, nur das nötige `visualize`-Modul laden (`read_me` lieferte 63k Zeichen).
- **Folge-Skill mit Aufruf-Sperre** (SWD): „lies X und dann /skill-B“ scheitert, weil B nur vom Menschen aufrufbar ist. Befehl sofort kopierbar ausgeben oder Sperre aufheben, wenn der Skillname wörtlich in der Nutzereingabe steht.
- **`prepare.js`: Fehlalarm abstellen** (SW): Warnung „gleichnamige Profile an mehreren Orten“ bei üblicher Ordner-je-Profil-Struktur (`feature.md`/`module.md`).

## 5. Plan-Writing

- **Zwischenstände verankern** (PWS, PWF): Pflicht-Zwischenstand vor Schritt 6 („gelesene Bereiche, gefundene Stellen, nächste Frage“); Harness mahnte bis zu 5× „hasn't heard from you“.
- **Erkundung bei mehreren Schichten delegieren** (PWS): Explore-Subagent mit fester Rückgabeform (Datei:Zeile, Rolle, betroffener Test). 42 sequenzielle Shell-Leseaufrufe = 7,7 Mio. Cache-Tokens.
- **Symbol-/Batch-Tools nennen** (PWS): unter „Kontext lesen“ `find_symbol_references`, `read_method`, `read_files_batch` ausdrücklich nennen, sobald die Projekt-`CLAUDE.md` sie unter „Suche“ listet. Erst verorten, dann alle Bereiche gebündelt parallel lesen (PWF).
- **Planungs-Skills je Plattform laden** (PWF, PWS): Konfiguration gruppiert Planungs-Skills (`Planungs-Skills-Frontend` / `-Backend`); nur Gruppen laden, deren Pfade die Dateiliste des Plans berührt.
- **Selbst-Check um CLI-Optionen erweitern** (PWF): jede im Plan verwendete Befehlsform einmal trocken ausführen (bei Tests auf eine bestehende Datei) oder per Context7 belegen. Datei `references/self-check.md`.
- **Wrapper-Syntax mit Filter-Beispiel in `references/plan-format.md`** (PWS), z. B.
  `dv-forge: dotnet-test --path <Testprojekt> -- --filter "FullyQualifiedName~<Klasse>"` und
  `dv-forge: angular-test --root src/frontend -- --include <pfad>.spec.ts`.
- **Eintragstyp für Entwurfswahlen** (PWF): `references/plan-format.md` bekommt `E · <Kurztitel> · Planer` und einen festen Satz für „keine Fragen gestellt“.

## 6. Implementierung, Implementierungs-Review und Abschluss

- **Test-Reviewer verifiziert fremde rote Tests einzeln** (IUR): rote Tests außerhalb des Diffs einzeln wiederholen, nur reproduzierbar rote als 🔴, sonst 🟢 „flaky im Gesamtlauf“. Zwei Schein-🔴 durch Timeouts im parallelen Lauf.
- **Grüne Gesamtläufe mit Commit-Hash wiederverwenden** (IUR, IRA): Umsetzung schreibt `letzter-gesamtlauf: <commit> <n>/<n> grün` in den Bericht; Test-Reviewer läuft nur die Specs des Pakets, wenn seitdem kein Code geändert wurde; `finish-work` überspringt den Testlauf bei HEAD = Commit und sauberem Arbeitsbaum. Spart ~1–7 min und hätte einen Abbruch vermieden.
- **`prepare.js implementation-review` prüft Bericht gegen HEAD** (IRA): warnen, wenn der im Umsetzungsbericht genannte Endcommit ≠ HEAD.
- **Zurückgestellt-Abschnitt als eigene Datei** (IRA): `prepare.js` schreibt nur „Zurückgestellt“ als kleine Datei `Z` statt auf den ganzen Umsetzungsbericht zu zeigen (~20–30k Tokens je Runde).
- **`forge-config.js get` fällt auf Haupt-Checkout zurück** (IRA): im Worktree fehlt die gitignorierte Projekt-`CLAUDE.md`, Build/Test/Lint kamen leer zurück. Haupt-Checkout ist über `work.js check` (`haupt=`) bekannt.
- **Vorgeschriebenen Testweg erzwingen** (IUR): `neu:` Hook `test-weg-guard` blockt `mcp__dev-mcp__test_angular_project` / `test_dotnet_solution`, wenn die Projekt-`CLAUDE.md` unter „Test:“ ein dv-forge-Skript nennt. Drei Agents umgingen die Vorgabe.
- **Offene „visuell prüfen“-Punkte nicht liegen lassen** (IUR): browser-inspector-Blick wäre billig gewesen.

## 7. Worktree und Node-Pakete

- **`neu:` Skript `check-node-modules`** (IRA): vor jedem Frontend-Testlauf (Aufruf aus `finish-work` und `implementation-review-tests`) prüfen, ob Paketordner samt Test-Builder existiert und eine Junction auf ein gültiges Ziel zeigt; sonst sofort stoppen mit „Pakete fehlen, `npm ci` ausführen“.
- **`work.js`-Option `worktree-node-modules`** (IUR): bei gleichem Lockfile Junction auf die Abhängigkeiten des Haupt-Checkouts automatisch anlegen und vor dem Entfernen des Worktrees lösen (heute Handarbeit laut Memory).

## 8. dev-mcp

- **`test_angular_project`: echte Fehlerzeile durchreichen** (IRA): erste `Error:`-Zeile immer in `errors`, Warnungen (`MaxListenersExceededWarning`, veraltete Builder) getrennt ausweisen. Heute kam nur „no tests“, die Ursache (`Could not find the '@angular/build:unit-test' builder's node package.`) erst per Shell.

## 9. Prozess-Retrospektive (Skill)

- **Regel-Aussagen belegen** (RR): in „Häufige Fehler“ ergänzen: „Aussage über eine Regel eines anderen Werkzeugs aus dem Gedächtnis → Regeltext zitieren oder `Eindruck`.“
- **Nicht gemessene Zahlen zählen oder markieren** (RS): jede Zahl, die nicht aus dem Skript kommt, per `grep -c` im Protokoll belegen, sonst weglassen oder `Eindruck`.
- **Werkzeugfehler sind nie Kleinigkeit** (RR): in `references/report-format.md` klarstellen, dass ein Fehler in einem Werkzeug immer ein Befund mit `Ziel:` ist.
- **Widerspruch „Zahlen unverändert“ vs. Anonymisierung auflösen** (RS): „Zahlen“ und „MCP-Nutzung“ als Rohdaten von der Außenstehenden-Regel ausnehmen — oder das Skript erzeugt selbst eine anonymisierte Ausgabe.
- **Commit mit Konvention** (RS): Schritt 4 um „beim Commit: `commit-message` laden, Workitem-Nummer der Session übernehmen oder fragen“ ergänzen (Platzhalter `#000000` wurde eigenmächtig gewählt).
- **Frische Session für Retro bei großem Kontext** (RS): ab ~200k Kontext Lauf in neuer Session empfehlen und fertigen Aufruf mit Protokollpfad nennen (~1 Mio. Cache-Tokens weniger).

## 10. Skill `commit-message`

- **Auto-Review bei reinem Doku-Diff überspringen** (PR1, SW): Schritt 1.5 nur, wenn `git diff --staged --name-only` Code-Dateien enthält. Heute: ToolSearch + `review_git_diff` mit Ergebnis „No .NET or Angular files found in the diff.“

## 11. Projekt-`CLAUDE.md` (Zielprojekt, nicht Plugin)

- **Ablagepfade vereinheitlichen** (PWF, BR): im `## dv-forge`-Block `Spec-Ablage`/`Plan-Ablage` auf `<datum>-<workitem>-<slug>.md` setzen, damit nur eine Regel existiert.
- **Worktree-Pflicht für Doku klären** (SW): Satz ergänzen „Specs und Pläne dürfen direkt auf dem Integrationsbranch committet werden.“
- **Erlaubten Diagnoseweg für Tests nennen** (IRA): direkter Testaufruf nur angekündigt, nur zur Fehlerdiagnose, Ergebnis zählt nie als grün (Test-Konvention 9).

---

## 12. Neue Werkzeuge (Übersicht)

| Name | Art | Zweck | Quelle |
|---|---|---|---|
| `wait-results` | Skript | blockiert bis alle Reviewer-Ergebnisdateien da sind | PR1 (+ Top 1) |
| `plan-anchor-check` / `plan-anchors` | Skript | Plan-Anker einmal deterministisch prüfen, Datei für alle Reviewer | PR1, PR2 |
| `test-landkarte` | Skript | zu Produktionsdateien: Testdateien, Testnamen mit Zeile, Setup-Helfer | PWS |
| `check-node-modules` | Skript | Node-Pakete/Junction vor Frontend-Tests prüfen | IRA |
| `worktree-node-modules` | Option in `work.js` | Junction automatisch anlegen/lösen | IUR |
| `test-weg-guard` | Hook | MCP-Testtools blocken, wenn dv-forge-Skript vorgeschrieben | IUR |
| `review-vorschlaege-umsetzen` | Skill | Scout-Vorschläge nach Nummer umsetzen + Fix-Diff re-reviewen | IUR |

## 13. Beibehalten (hat sich bewährt)

- Ergebnisübergabe über Dateien + Aggregation per Skript hält den Hauptkontext klein (PR1, PR2, IRA, IUR).
- Reviewer werten „Zurückgestellt“ aus und melden begründete Punkte nicht erneut (IRA, IUR).
- Scout-Vorschläge mit Code, Zeilenankern und Folgestellen sind direkt übernehmbar (PR1).
- Plan mit vollständigem Code erlaubt Umsetzung auf kleinstem Modell ohne Fix-Runde (IUR).
- Faktensuche in Git-Historie und Code vor der ersten Rückfrage spart Fragerunden (SW, SWD).
- Offene Fragen einzeln mit „(Recommended)“-Option stellen (PWS); Planungs-Skills parallel in einer Nachricht laden (PWS).
- Bei Fragen zum Plugin-Verhalten zuerst die Skripte lesen, nicht die Skill-Prosa auslegen (BR).
- Fakten und Referenzdokumente der Retro in einem Shell-Aufruf holen (RR, RS).

---

## 14. Entscheidungen (Durchsprache 2026-09-28)

| Punkt | Entscheidung | Stand |
|---|---|---|
| 1 · Hauptsession-Weckzüge | Reviewer parallel im **Vordergrund** (`run_in_background: false`), Hintergrund ausdrücklich verboten; kein Warte-Skript | umgesetzt (`shared/review-loop/loop.md`, Test) |
| 2 · `session-facts.js` | a `--session ${CLAUDE_SESSION_ID}` + Warnung bei mehreren frischen Sessions · c `--since-command <skill>` / `--occurrence <n>` · d `--skeleton <datei>` aus der Vorlage in `report-format.md`; nebenbei: Slash-Befehle zählen als Eingabe des Menschen. b (restlicher Zählfehler) erst an echtem Protokoll nach Punkt 1 prüfen | a, c, d umgesetzt; b offen |
| 3 · Scout-Vorschläge umsetzen | Neuer Folge-Skill `dv-forge:review-followup` für alle drei Review-Arten; ersetzt keine Reviewer, läuft nach dem Review. Nach-Review: **eine Runde nur mit den betroffenen Reviewern** (bei Implementierung: `implementation-re-reviewer` auf Fix-Diff). Voraussetzungen: Scout schreibt `Ergebnis: <D>/scout.md`; Loop sichert `aggregate.md` + `scout.md` nach `.forge/followup/<rolle>/<slug>/`; betroffene Reviewer aus `### <Stufe> <Stelle> (<Reviewer>)`; Nacharbeiter bekommen Modus „nur diese Vorschläge“ | geplant, als Paket mit Punkt 4 über Spec + Plan |
| 4 · Anker einmal prüfen | Neues Kommando `plan-tasks.js anchors <plan> <repo> <out>` schreibt `<W>/anchors.md` (Modify: Datei + Anker-Zeile · Create: Datei fehlt noch · Ausschnitt mit Zeilennummern **nur bei angegebenem Zeilenbereich** · Task-Übersicht mit Plan-Zeilenbereichen); `prepare.js plan-review` liefert `A=`; alle Plan-Reviewer bekommen `Anker: <A>`; buildability meldet nur ❌-Zeilen, feasibility prüft keine Existenz mehr; Regel „Plan einmal ganz, dann Abschnitte“. Nicht dabei: Symbol-Existenz aus `Consumes`, Profil-Auszug Spec-Review | geplant, im Paket mit Punkt 3 |
| 5 · Branch doppelte Nummer | `branchFor()` streicht führendes Datum immer, führende Workitem-Nummer nur bei `<workitem>` im Schema (auch Form ohne Präfix vor `#`); Slug/Workspace/Base-Tag/Ledger unverändert; `work.js start` setzt alte lange Branches fort (`branchCandidates`) | umgesetzt (`forge-config.js`, `work.js`, `init`-Doku, Tests) |
