# Erfahrungsbericht Umsetzungsplan für eine Full-Stack-Änderung (Backend + Frontend) aus fertiger Spec

**Lauf:** `/dv-forge:plan-writing` auf eine bestätigte Spec (neuer dritter Status-Zustand, betrifft Backend-Enum, Berechnung, Start-Backfill, Tabelle, Eingabeformular, Dashboard). Planungs-Skills: `dv-dotnet:dotnet-xunit-conventions`, `dv-angular:angular-testing-vitest-conventions`, `dv-dotnet:dotnet-ef-migrations`, `dv-craft:craft-design-principles`. Danach Commit des Plans auf Zuruf. Modell claude-opus-5-5, 2026-09-28.
**Ergebnis:** Plan mit 8 Tasks (3 Backend, 5 Frontend), 19 von 19 ACs abgedeckt, 2 Entscheidungen des Menschen als W-Einträge, ein Commit. Dauer 17 min, Eingaben des Menschen 7, Tokens neu 210k Hauptsession und 0k Subagents.

## Zahlen
- Dauer: 17 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 7 · API-Anfragen: 49 · Zusammenfassungen: 0
- Tokens Hauptsession: 210k neu gelesen, 7713k aus dem Cache, 71k Ausgabe
- Tokens Subagents: 0k in 0 Agents
- Tool-Aufrufe: Bash 42, Skill 4, AskUserQuestion 2, Grep 1, Write 1
- Skills: dv-dotnet:dotnet-xunit-conventions 1, dv-angular:angular-testing-vitest-conventions 1, dv-dotnet:dotnet-ef-migrations 1, dv-craft:craft-design-principles 1
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):
- 4k Tokens · Bash cat <Spec> + Konfig-Abfragen
- 3k Tokens · Bash cat <Service> + Program + Report-Service-Ausschnitte
- 3k Tokens · Bash sed-Ausschnitte einer großen Frontend-Komponente
- 3k Tokens · Bash cat <Interface-Datei> + grep über Status-Stellen
- 2k Tokens · Bash sed-Ausschnitte eines Frontend-Services

Mehrfach gelesene Dateien:
- keine

Wiederkehrende Shell-Befehle (ab 3×):
- 14× sed
- 8× grep
- 6× cat
- 4× ls

## MCP-Nutzung

Quelle: `C:\Users\S.Reichert\.claude\projects\C--Develop-Trumpf-LacAtlas-main\c6076fad-a8d0-4201-ab91-04d73c718c50.jsonl` · Hauptagent + 0 SubAgent(s) · 50 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

Verfügbar, aber ungenutzt: 1a59c906-04da-521d-bda7-7f71b9f9e01c, 6f616b42-0ed8-571e-823f-ee4aca6b7ce9, ccd_connectors, ccd_directory, ccd_pr, ccd_session, ccd_session_mgmt, ccd_sidebar, ccd_view, ccd_window, claude-in-chrome, mcp-registry, plugin:context7:context7, plugin_context7_context7, scheduled-tasks, terminal

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Bash | 42 | – | – | Hauptagent (42) |
| Grep | 1 | – | – | Hauptagent (1) |
| Write | 1 | – | – | Hauptagent (1) |

### Shell-Fallback-Kandidaten (0)

Keine Shell-Aufrufe von dotnet, ng, npm, npx, pnpm, yarn oder git mv.

**Relevanz:**
- dev-mcp: hätte genützt, weil 14 `sed -n <von>,<bis>p`-Ausschnitte genau das sind, was `read_lines`/`read_files_batch` in einem Aufruf liefern.
- codebase-analyzer: hätte genützt, weil alle Verwendungen eines Enum-Werts und eines Status-Literals per Hand mit `grep` über Backend und Frontend gesucht wurden (`find_symbol_references` / `read_method` hätten Methodenkörper wie `mapParamSetsToRows` oder `finalizeSavedRow` ohne Zeilenraten geliefert).
- browser-inspector: verzichtbar in dieser Session (reine Planung, kein laufendes UI).
- microsoft-learn: verzichtbar in dieser Session (keine unsichere .NET-API; Enum-Serialisierung ließ sich im Code nachsehen).

## Positiv

1. **Offene Fragen einzeln, mit Empfehlung, sofort beantwortet.** Zwei `AskUserQuestion`-Aufrufe (Architektur-Alternative, konkreter Farbton), beide mit „(Recommended)“-Option, beide ohne Nachfrage übernommen; keine Korrektur durch den Menschen im ganzen Lauf.
2. **Null Tool-Fehler, null Wiederholungen, kein Shell-Fallback.** 50 Aufrufe ohne Fehlschlag; Testbefehle im Plan nutzen durchgehend die vorgeschriebenen Wrapper-Skripte.
3. **Vier Planungs-Skills in einer einzigen Nachricht parallel geladen.** Spart drei Runden gegenüber sequenziellem Laden.
4. **Code-Befund außerhalb der AC-Liste gefunden und begründet eingeplant.** Eine Lösch-Aktion erkannte gespeicherte Zeilen nur an den zwei alten Status-Labels; der neue Zustand wäre im Backend nie gelöscht worden. Der Plan deckt das über den allgemeinen Spec-Satz „verhält sich für alle statusabhängigen Regeln wie der alte Zustand“ ab, statt die Spec zu erweitern.

## Reibung

1. **Lange stille Erkundung, Harness mahnte mehrfach ein Lebenszeichen an.**
   *Situation:* Zwischen Frage und erstem Zwischenstand lagen jeweils 6–10 sequenzielle Lese-Aufrufe. Die Umgebung meldete fünfmal „The user hasn't heard from you in a while“, erst dann kam ein Einzeiler-Status.
   *Kosten:* 5 Unterbrechungen; der Mensch sah rund 12 der 17 Minuten keinen Fortschritt · Eindruck (Minutenzahl geschätzt aus der Reihenfolge der Aufrufe).
   *Ursache:* Der Skill `dv-forge:plan-writing` (schreibt Umsetzungspläne aus Specs) legt in Schritt 4 „Kontext lesen“ fest, aber keinen Zeitpunkt für Zwischenstände; die Erkundung lief als eine lange Kette einzelner Shell-Leseaufrufe.
   *Besser gewesen:* 1. Nach dem Spec-Lesen einen Satz Status mit geplanter Reihenfolge (Backend → Tabelle → Formular → Dashboard). 2. Die Erkundung in einen Explore-Subagent geben, der nur die Fundstellen-Tabelle zurückliefert. 3. Nach jedem Bereich einen Einzeiler.
   *Vorschlag:* Im Skill vor Schritt 6 einen Pflicht-Zwischenstand „gelesene Bereiche, gefundene Stellen, nächste Frage“ verankern; bei mehr als zwei betroffenen Schichten die Erkundung an einen Subagent delegieren.
   *Ziel:* Skill · `dv-forge:plan-writing`
   *Im Projekt:* Bereiche: `ResultService`/`ResultStatusBackfillService`, `parameter-table.service.ts`, `parameters-page.component.ts`, `result.component.ts`, `experiment-dashboard/*`.

## Sparpotenzial

1. **Große Wiederlese-Last durch viele kleine Aufrufe in einer wachsenden Session.**
   *Situation:* 49 API-Anfragen lasen zusammen 7.713k Tokens aus dem Cache, bei nur 210k neu gelesenen Tokens. Jede der 42 Shell-Leseaktionen war eine eigene Runde, die den gesamten bisherigen Kontext erneut einlas.
   *Ersparnis:* Halbierung der Runden (z. B. 20 statt 42 Leseaufrufe) spart grob 3.500k Cache-Tokens je vergleichbarer Session · Eindruck (lineare Schätzung).
   *Besser gewesen:* 1. Einen Explore-Subagent mit „alle Stellen, die den Status lesen oder setzen, plus zugehörige Tests mit Test-Namen“ beauftragen. 2. Im Hauptkontext nur dessen Tabelle und die tatsächlich zu ändernden Methodenkörper lesen, gebündelt über ein Batch-Lese-Tool.
   *Vorschlag:* Im Skill für Planungen über mehrere Schichten eine Erkundung per Subagent mit fester Rückgabeform (Datei:Zeile, Rolle, betroffener Test) vorsehen.
   *Ziel:* Skill · `dv-forge:plan-writing`
   *Im Projekt:* Suchbegriffe `resultStatus`, `ResultStatus.Complete`, `'Created'`, `'N/A'`, `hasResult`.

2. **Ausschnitte per `sed -n` statt über vorhandene Lese-Tools.**
   *Situation:* 14 `sed`- und 8 `grep`-Aufrufe über die Shell, um Methodenkörper, Test-Blöcke und Import-Zeilen herauszuschneiden; mehrfach mit geratenen Zeilenbereichen, die zu breit waren. Die MCP-Server `dev-mcp` (Datei-Lesen/Suchen/Patchen) und `codebase-analyzer` (Symbol-Index, Methoden lesen, Verwendungen finden) waren verbunden, aber nie genutzt.
   *Ersparnis:* etwa 10 Runden und 5–10k Tokens unnötig breiter Ausschnitte je Session · Eindruck.
   *Besser gewesen:* 1. `find_symbol_references` für den Enum-Wert und das Status-Literal. 2. `read_method` für die 6 zu ändernden Methoden. 3. `read_files_batch` für die Test-Setups.
   *Vorschlag:* Im Skill bei „Kontext lesen“ ausdrücklich die Symbol-Tools nennen, sobald die Projekt-`CLAUDE.md` sie unter „Suche“ listet; die Projekt-`CLAUDE.md` tut das bereits, der Skill greift es nur nicht auf.
   *Ziel:* Skill · `dv-forge:plan-writing`
   *Im Projekt:* `CLAUDE.md`-Zeile „Suche: codebase-analyzer (index_project, find_in_index, find_symbol_references), graphify (docs/graphify-out)“.

3. **Syntax der Test-Wrapper im Plugin-Skript nachgelesen.**
   *Situation:* Für exakte Test-Befehle im Plan musste der Agent die Usage-Zeilen der Wrapper-Skripte `dotnet-test.js` und `angular-test.js` (führen Tests mit gefilterter Ausgabe aus) per `grep` im Plugin-Cache suchen, um Filter-Parameter (`-- --filter …`, `-- --include …`) zu bestätigen.
   *Ersparnis:* 2 Runden je Plan · Eindruck.
   *Besser gewesen:* Die Aufruf-Syntax samt Filter-Beispiel steht im Skill-Referenzdokument, der Agent übernimmt sie ohne Suche.
   *Vorschlag:* In `references/plan-format.md` je Wrapper ein Beispiel mit Einzeltest-Filter aufnehmen.
   *Ziel:* Skill · `dv-forge:plan-writing`
   *Im Projekt:* genutzte Form `dv-forge: dotnet-test --path src/backend/tests/<Projekt> -- --filter "FullyQualifiedName~<Klasse>"` und `dv-forge: angular-test --root src/frontend -- --include src/app/<pfad>.spec.ts`.

4. **Test-Anker für jede zu ändernde Datei per Hand ermittelt.**
   *Situation:* Für jede Produktionsdatei suchte der Agent die zugehörige Testdatei, deren `describe`/`it`- bzw. `[Fact]`-Namen mit Zeilen und die Setup-Helfer (Mock-Fabriken) — sechsmal dieselbe Folge aus `ls`, `grep "describe(\|it("` und `sed`.
   *Ersparnis:* 6–8 Runden je Plan · Eindruck.
   *Besser gewesen:* Ein Aufruf „Test-Landkarte für diese 8 Dateien“ liefert Testdatei, Testnamen mit Zeile und Helfer-Funktionen.
   *Vorschlag:* Deterministisches Skript, das zu einer Liste von Produktionsdateien die gespiegelten Testdateien und deren Test-Namen mit Zeilen ausgibt.
   *Ziel:* Skript · `neu:` Skript · test-landkarte
   *Im Projekt:* betroffen `ResultServiceTests.cs`, `ResultStatusBackfillServiceTests.cs`, `ReportServiceTests.cs`, `parameter-table.service.spec.ts`, `parameters-page.component.spec.ts`, `result.component.spec.ts`, `experiment-dashboard-tree.rules.spec.ts`.

## Neue Ideen

- **test-landkarte** (`neu:` Skript): gibt zu Produktionsdateien die zugehörigen Testdateien, Testnamen mit Zeilennummer und Setup-Helfer aus; schließt die wiederholte Handsuche aus Sparpotenzial 4 und liefert zugleich stabile Anker für `Test:`-Zeilen im Plan.

## Kleinigkeiten

- Das Arbeitsverzeichnis wanderte durch `cd` in Shell-Aufrufen rund zehnmal mit; ohne Folgen, aber Rauschen im Verlauf. Absolute Pfade ohne `cd` hätten es vermieden.
- `dv-dotnet:dotnet-ef-migrations` wurde geladen, obwohl am Ende keine Migration nötig war; als Planungs-Skill aus der Konfiguration trotzdem korrekt, nur ohne Nutzen in diesem Lauf.
