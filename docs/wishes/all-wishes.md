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
| 3 · Scout-Vorschläge umsetzen | Neuer Folge-Skill `dv-forge:review-followup` für alle drei Review-Arten; ersetzt keine Reviewer, läuft nach dem Review. Nach-Review: **eine Runde nur mit den betroffenen Reviewern** (bei Implementierung: `implementation-re-reviewer` auf Fix-Diff). Voraussetzungen: Scout schreibt `Ergebnis: <D>/scout.md`; Loop sichert `aggregate.md` + `scout.md` nach `.forge/followup/<rolle>/<slug>/`; betroffene Reviewer aus `### <Stufe> <Stelle> (<Reviewer>)`; Nacharbeiter bekommen Modus „nur diese Vorschläge“ | umgesetzt (`skills/review-followup`, `scripts/followup.js`, `prepare.js review-followup`, Scouts schreiben `scout.md`, `loop.md` sichert vor `remove`, F-Einträge; Nach-Review Implementierung ohne Scout; Spec `docs/superpowers/specs/2026-09-28-review-followup-und-plan-anker-design.md`) |
| 4 · Anker einmal prüfen | Neues Kommando `plan-tasks.js anchors <plan> <repo> <out>` schreibt `<W>/anchors.md` (Modify: Datei + Anker-Zeile · Create: Datei fehlt noch · Ausschnitt mit Zeilennummern **nur bei angegebenem Zeilenbereich** · Task-Übersicht mit Plan-Zeilenbereichen); `prepare.js plan-review` liefert `A=`; alle Plan-Reviewer bekommen `Anker: <A>`; buildability meldet nur ❌-Zeilen, feasibility prüft keine Existenz mehr; Regel „Plan einmal ganz, dann Abschnitte“. Nicht dabei: Symbol-Existenz aus `Consumes`, Profil-Auszug Spec-Review | umgesetzt (`scripts/plan-anchors.js` über `plan-tasks.js anchors`, `A=` aus `prepare.js`, ⚠ bei früherem Task, Anker-Suche wörtlich dann letztes Glied) |
| 5 · Branch doppelte Nummer | `branchFor()` streicht führendes Datum immer, führende Workitem-Nummer nur bei `<workitem>` im Schema (auch Form ohne Präfix vor `#`); Slug/Workspace/Base-Tag/Ledger unverändert; `work.js start` setzt alte lange Branches fort (`branchCandidates`) | umgesetzt (`forge-config.js`, `work.js`, `init`-Doku, Tests) |
| Abschn. 2 · A1 Scout-Modell | Alle 3 Scouts auf `sonnet`; kein „opus bei 🔴“-Schalter | umgesetzt |
| Abschn. 2 · A2 Orchestrator-Start | `loop.md`: Plugin-Dateien mit `Read`, Skripte als einzelner `node`-Aufruf ohne Verkettung | umgesetzt |
| Abschn. 2 · A3 Zwischenmeldungen | durch Punkt 1 erledigt | erledigt |
| Abschn. 2 · B4 Aggregation transparent | nach `STATUS` Zeilen `EINGELESEN <reviewer>=r/g/g … · n Findings an m Stellen` und `HOCHGESTUFT <Stellen>`; `yellow=0` bei gemeldeten 🟡 war kein Bug (Gruppierung je Stelle, 🟡 von 2 Reviewern → 🔴) | umgesetzt |
| Abschn. 2 · B5 Fortschritt inhaltlich | geänderte rote Stelle zählt als Fortschritt, wenn sie verschwindet (`FIXED`) oder mit anderem Inhalt (Zitat · Konsequenz) wiederkommt (`RENEWED`); gleicher Inhalt bleibt Stillstand | umgesetzt |
| Abschn. 2 · C6 `--only` | `prepare.js` liefert `aktiv=` für alle drei Reviews, `--only <reviewer,...>` wählt aus (feste Reihenfolge, Unbekanntes → Exit 2, `profiles` ohne Profile → WARN); Automatik aus Diff kommt ins Paket 3/4 | umgesetzt |
| Abschn. 2 · C7 schlanke Besetzung | zurückgestellt, erst mit mehr Berichten; `--only` deckt es manuell ab | zurückgestellt |
| Abschn. 3 · Coverage Teilaussagen | `plan-review-coverage` zerlegt jedes AC in Teilaussagen, hakt jede ab, nennt alle fehlenden in **einem** Finding | umgesetzt |
| Abschn. 3 · Nacharbeiter ganzes AC | `plan-rework` Regel 8: bei Finding an `AC-<n>` das ganze AC gegen den Plan prüfen, alle Lücken in derselben Nacharbeit schließen | umgesetzt |
| Abschn. 3 · Buildability eingrenzen | `prepare.js plan-review` liefert `Build=`/`Test=`/`Lint=` wörtlich aus der Konfiguration, Reviewer bekommt sie als Eingabe; keine Plugin-Quellen, `node_modules` nur für Auftrag 8 | umgesetzt |
| Abschn. 3 · Architecture Wiederverwendung | Auftrag 4: bei „Muster aus <Datei>“ und neuen Funktionen/Klassen/Test-Helfern nach Gegenstücken suchen; Kopie statt Wiederverwendung → Finding | umgesetzt |
| Abschn. 3 · Commit-Frage | `plan-review` bei `sauber`: nach Guard-Freigabe `git status --porcelain -- "<S>" "<P>"`, leer → keine Frage | umgesetzt |
| Abschn. 4 · Nacharbeiter ohne Fachentscheidung | Ursache war Regel 3 in `spec-rework` („naheliegendste, konservativste Festlegung“). Ersetzt: Klarstellung schreiben, **neues Verhalten** → Status `human-question`, Spec an der Stelle unverändert; `spec-review` Zusatz-Stopp `Fragen an den Menschen in Runde r` + Abschnitt „Fragen an den Menschen“ | umgesetzt |
| Abschn. 4 · Profil-Auszug | `prepare.js` liefert `PA=<W>/profil-auszug.md`; Profil-Reviewer schreibt ihn in Runde 1, spätere Runden lesen nur ihn und ergänzen bei Bedarf | umgesetzt |
| Abschn. 4 · Whiteboarding mit Bestand | betroffene Feature-Profile vollständig lesen, Code-Aussagen dagegenhalten; Regel 6 Selbstcheck „exakt/immer/nie“ gegen alle ACs | umgesetzt |
| Abschn. 4 · Bestandssuche | Such-Agents nur `model: sonnet`, Rückgabe Datei:Zeile, Rolle (Code-Index-Vorrang stand schon in Regel 1) | umgesetzt |
| Abschn. 4 · Skizze | nur für Abläufe/Verzweigungen, Reihenfolgen und Listen bleiben Text (Skill jetzt 499 von 500 Wörtern) | umgesetzt |
| Abschn. 4 · Fehlalarm Profile | `feature.md`, `module.md`, `README.md`, `index.md` von der Doppelt-Warnung ausgenommen | umgesetzt |
| Abschn. 4 · Aufruf-Sperre Folge-Skill | bleibt; Sperre schützt vor Selbststart des Dialog-Skills, Kosten 1 Eingabe | nicht ändern |
| Abschn. 5 · Zwischenstände | neue Referenz `plan-writing/references/context-reading.md`: nach Spec ein Satz mit Reihenfolge der Bereiche, nach jedem Bereich ein Einzeiler | umgesetzt |
| Abschn. 5 · Erkundung delegieren | ab mehr als zwei Schichten Such-Agent `model: sonnet`, Rückgabe `Datei:Zeile, Rolle, betroffener Test` | umgesetzt |
| Abschn. 5 · Code-Index + gebündelt lesen | zuerst `forge-config get Suche`, erst verorten, dann alle Bereiche in einem parallelen Block | umgesetzt |
| Abschn. 5 · Planungs-Skills je Plattform | Syntax `<skill> @<pfad>` in `Planungs-Skills`; ohne `@` immer, mit `@` nur wenn der Plan den Pfad berührt; Doku in `init` (ohne Skriptänderung, das Modell wertet aus) | umgesetzt |
| Abschn. 5 · Selbst-Check CLI | `self-check.md` Punkt 5: CLI-Optionen und Befehlsformen; jeder Testbefehl einmal auf bestehende Testdatei oder per Doku belegt | umgesetzt |
| Abschn. 5 · Wrapper-Beispiel | `plan-format.md` Regel 10 nennt zusätzlich `angular-test … -- --include …` | umgesetzt |
| Abschn. 5 · E-Einträge | `- **E · <Kurztitel>** · Planer — <Wahl und Grund>`, nicht bindend, nur für Wahlen ohne AC-Bezug; Zeile `- Keine Fragen an den Menschen.` | umgesetzt |
| Abschn. 6 · Fremde rote Tests | `implementation-review-tests`: roter Test außerhalb des Pakets läuft einzeln nach; nur einzeln rot ist `red`, sonst `green` `flaky im Gesamtlauf` | umgesetzt |
| Abschn. 6 · Grünen Gesamtlauf wiederverwenden | Ledger-Zeile `Gesamtlauf: <HEAD> grün (<n> Tests)`; `ledger.js archive` schreibt Abschnitt `## Stand` (Stand + letzter Gesamtlauf); Test-Reviewer und `finish-work` lassen die Suite weg, wenn seitdem nur Doku (`.md`) geändert wurde | umgesetzt |
| Abschn. 6 · Bericht gegen HEAD | `prepare.js implementation-review` meldet `WARN` mit allen Commits nach `Stand` ohne den Bericht selbst (bzw. „nicht prüfbar“ bei Git-Fehler); Skill übernimmt `WARN` in die Hinweise. Gefunden: 8.3- vs. Langpfad unter Windows, per `realpath` gelöst | umgesetzt |
| Abschn. 6 · Zurückgestellt als eigene Datei | Umsetzungsbericht ist schon ein Auszug (Abschlussbericht, Urteile, Zurückgestellt) | nicht ändern |
| Abschn. 6 · Konfiguration im Worktree | `forge-config.js readConfig` fällt ohne eigene `CLAUDE.md` auf die des Haupt-Checkouts zurück (`source=haupt`), CLI meldet das auf stderr | umgesetzt |
| Abschn. 6 · Testweg | Ursache war das MCP-Beispiel in `implementation-implementer` Regel 3 und `implementation-review-tests` Auftrag 1; jetzt: Befehl aus Brief bzw. `Test:` genau so, „auch kein MCP-Tool mit gleichem Zweck“; `prepare.js implementation-review` liefert `Test=`. Hook `test-weg-guard` zurückgestellt | umgesetzt, Hook zurückgestellt |
| Abschn. 6 · Visuell prüfen | kein visueller Check im Plugin, Browser-Werkzeug projektabhängig | zurückgestellt |
| Abschn. 7 · Node-Pakete prüfen | kein neues Skript: `angular-test.js` prüft vor dem Lauf die Pakete der Test-Builder aus `angular.json` (z. B. `@angular/build`) und bricht sonst sofort ab mit „Node-Pakete fehlen: … npm ci ausführen“; erkennt auch tote Junctions | umgesetzt |
| Abschn. 7 · Junction automatisch | nicht umsetzen: die Junction auf den Paketordner des Haupt-Checkouts war die Ursache des Vorfalls | nicht ändern |
| Abschn. 8 · dev-mcp Fehlerzeile | `AngularRunner`: gemeinsamer Fallback `FailureLines` für Karma/Jest/Vitest (Zeilen mit error/could not find/cannot find/not found aus stdout+stderr, sonst letzte Zeilen), Node-Warnungen getrennt in `warnings`; 12 neue xUnit-Tests | umgesetzt, **Deploy offen** (`deploy.ps1` löscht `tool-calls.ndjson` im Ziel, vorher sichern; laufenden Server erst stoppen) |
| Abschn. 9 · Platz im Skill | Tabelle „Häufige Fehler“ nach `prozess-retrospektive/references/common-mistakes.md` ausgelagert (Skill 494 → 460 Wörter trotz Ergänzungen) | umgesetzt |
| Abschn. 9 · Regel-Aussagen belegen | neue Zeile: Regel eines anderen Werkzeugs mit `datei:zeile` zitieren oder `Eindruck`; Vorschlag dagegen ist Regeländerung | umgesetzt |
| Abschn. 9 · Nicht gemessene Zahlen | neue Zeile: per `grep -c` im Protokoll zählen, sonst weglassen oder `Eindruck` | umgesetzt |
| Abschn. 9 · Werkzeugfehler | `report-format.md` Regel: Werkzeugfehler ist nie Kleinigkeit, bekommt `Ziel:` | umgesetzt |
| Abschn. 9 · Rohdaten vs. Anonymisierung | „Zahlen“ und „MCP-Nutzung“ ausdrücklich von der Platzhalter-Regel ausgenommen (Rest erledigte `--skeleton`) | umgesetzt |
| Abschn. 9 · Commit-Konvention | Schritt 4: nach Ja Commit nach `forge-config get Commit-Konvention` mit Workitem-Nummer der Session; unklar → vorher fragen | umgesetzt |
| Abschn. 9 · Frische Session | Schritt 1: Cache je Anfrage über ~200k → Wiederholung in frischer Session mit `--file <pfad>` aus `Quelle:` empfehlen | umgesetzt |
| Abschn. 10 · Auto-Review bei Doku-Diff | `commit-message` Schritt 1.5 entfällt, wenn der Staged-Diff keine Code-Dateien enthält. Hier im Repo umgesetzt; die abweichende, nicht versionierte Kopie in Trumpf-LacAtlas ändert der dortige Agent per Prompt | umgesetzt hier, LacAtlas per Prompt |
| Abschn. 11a · Ablagepfade | in LacAtlas schon gelöst („Vorrang vor Spec-/Plan-Ablage im dv-forge-Block“); `<workitem>` in der Ablage setzen die Skills ohnehin nicht ein | nicht ändern |
| Abschn. 11b · Worktree-Pflicht Doku | in LacAtlas schon gelöst („Davor … Commit im aktuellen Checkout“) | erledigt |
| Abschn. 11c · Diagnoseweg Tests | Ursache in den Vorlagen: „kein stiller Shell-Fallback, falls das Projekt einen Test-MCP vorschreibt“ (dv-dotnet, dv-angular: 3 Skills + 2 Bootstrap-Vorlagen). Neu: Testbefehl des Projekts (dv-forge `Test:`) genau so, kein anderes Werkzeug mit gleichem Zweck, direkter Aufruf nur angekündigt zur Diagnose, zählt nie als grün. dv-dotnet und dv-angular 1.1.1; LacAtlas-Block per Bootstrap neu schreiben (Prompt) | umgesetzt hier, LacAtlas per Prompt |
