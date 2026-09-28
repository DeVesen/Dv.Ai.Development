# Erfahrungsbericht Umsetzungsplan für kleine Frontend-Änderung aus fertiger Spec

**Lauf:** Aus einer bestätigten Spec wurde ein Umsetzungsplan geschrieben: Skill `dv-forge:plan-writing` (0.6.1). Er schreibt aus einer Spec einen Task-für-Task-Plan mit vollständigem Test- und Produktionscode. Dazu kamen die Pflicht-Planungs-Skills `dv-angular:angular-testing-vitest-conventions`, `dv-craft:craft-design-principles`, `dv-dotnet:dotnet-xunit-conventions` und `dv-dotnet:dotnet-ef-migrations`. Anschließend lief die Retrospektive mit `dv-forge:prozess-retrospektive` (0.7.0). Modell claude-opus-5-5, 2026-09-28.
**Ergebnis:** Ein Plan mit 2 Tasks: eine Zeile Produktionscode verschieben, dazu 6 neue Tests und namentlich genannte bestehende Absicherungstests für 10 ACs. Dauer 14 min, Eingaben des Menschen 6, Tokens neu 129k Hauptsession und 0k Subagents.

## Zahlen
- Dauer: 14 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 6 · API-Anfragen: 22 · Zusammenfassungen: 0
- Tokens Hauptsession: 129k neu gelesen, 2532k aus dem Cache, 19k Ausgabe
- Tokens Subagents: 0k in 0 Agents
- Tool-Aufrufe: Bash 15, Read 7, Skill 4, Grep 1, Write 1
- Skills: dv-angular:angular-testing-vitest-conventions 1, dv-craft:craft-design-principles 1, dv-dotnet:dotnet-xunit-conventions 1, dv-dotnet:dotnet-ef-migrations 1
- Tool-Fehler: 0, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):
- 4k Tokens · Read C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\features\experiment-wizard\
- 3k Tokens · Bash cd /c/Develop/Trumpf-LacAtlas-main; P="C:/Users/S.Reichert/.claude/plugins/cache
- 2k Tokens · Bash cd /c/Develop/Trumpf-LacAtlas-main; P="C:/Users/S.Reichert/.claude/plugins/cache
- 2k Tokens · Read C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\features\experiment-wizard\
- 2k Tokens · Read C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\services\states\parameter-t

Mehrfach gelesene Dateien:
- 3× C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\services\states\parameter-table.service.spec.ts
- 2× C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\services\states\parameter-table.service.ts
- 2× C:\Develop\Trumpf-LacAtlas-main\src\frontend\src\app\features\experiment-wizard\parameters\parameters-page\parameters-page.component.spec.ts

Wiederkehrende Shell-Befehle (ab 3×):
- 4× grep
- 3× sed

## MCP-Nutzung

Quelle: `C:\Users\S.Reichert\.claude\projects\C--Develop-Trumpf-LacAtlas-main\681be172-2a0b-43f5-8cd5-5138a610ad2b.jsonl` · Hauptagent + 0 SubAgent(s) · 28 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

Verfügbar, aber ungenutzt: 1a59c906-04da-521d-bda7-7f71b9f9e01c, 6f616b42-0ed8-571e-823f-ee4aca6b7ce9, ccd_connectors, ccd_directory, ccd_pr, ccd_session, ccd_session_mgmt, ccd_sidebar, ccd_view, ccd_window, claude-in-chrome, mcp-registry, plugin:context7:context7, plugin_context7_context7, scheduled-tasks, terminal

**Relevanz:**
- dev-mcp: in dieser Session verzichtbar. Die 4 `grep`- und 3 `sed`-Aufrufe über die Shell lieferten gezielte Zeilenbereiche ohne Fehler; beim Start war der Server laut Harness noch „still connecting“.
- codebase-analyzer: hätte wenig genützt. Die Symbole (eine Methode, zwei Test-`describe`-Blöcke) waren per `grep -n` in 1 Aufruf gefunden · Eindruck.
- browser-inspector: in dieser Session verzichtbar, Planung ohne laufende App. Der Server brach zudem mit „connection timed out after 30000ms“ ab.
- microsoft-learn: in dieser Session verzichtbar, kein .NET-Code betroffen.

## Positiv

1. **Planung ohne Fehlversuch und ohne Subagents.** 0 Tool-Fehler, 0 Wiederholungen, 14 min, 0k Subagent-Tokens. Der Code wurde mit `grep -n` auf Symbole eingegrenzt und danach nur in Zeilenbereichen gelesen. Das lohnt sich beizubehalten.
2. **Bestehende Tests als Absicherung benannt statt neu geschrieben.** 7 der 10 ACs deckt der Plan ganz oder teilweise mit namentlich genannten bestehenden Tests ab. Das Plan-Format sieht für „bleibt wie bisher“-ACs einen eigenen Absicherungsschritt vor; das hielt den Plan klein.

## Reibung

1. **Das Fakten-Skript der Retrospektive las eine fremde, parallel laufende Session.**
   *Situation:* Das Skript `session-facts.js` wertet das Sitzungsprotokoll aus und liefert die Zahlen für die Retrospektive. Ohne Parameter nimmt es „die neueste Session“ im Projektordner. Es lieferte die Zahlen einer anderen Session: 44 min, 6 Subagents, 521k Subagent-Tokens, Skills, die hier nie liefen. Das fiel erst auf, weil diese Session gar keine Subagents gestartet hatte. Ein zweiter Lauf mit `--file <Sitzungsprotokoll>` brachte die richtigen Zahlen.
   *Kosten:* 1 zusätzlicher Skript-Lauf, rund 3k Tokens. Hätte der Agent den Unterschied nicht bemerkt, wäre der Bericht mit falschen Zahlen entstanden.
   *Ursache:* „Neueste“ wird über die Änderungszeit der Protokolldatei bestimmt. Bei zwei gleichzeitig offenen Sessions im selben Projekt gewinnt die, die zuletzt geschrieben hat.
   *Besser gewesen:* Die eigene Session-ID ermitteln (sie steckt im Pfad des Scratchpad-Ordners) und das Skript gleich mit `--file` aufrufen.
   *Vorschlag:* Das Skript übernimmt die Session-ID aus der Umgebung oder als Parameter vom Skill. Wählt es trotzdem „neueste“, meldet es laut, wenn im selben Ordner mehrere Protokolle in den letzten Minuten geschrieben wurden.
   *Ziel:* Skript · `session-facts.js` (dv-forge, erzeugt die Zahlen für `dv-forge:prozess-retrospektive`)
   *Im Projekt:* Falsch gelesen: `93d0022f-…jsonl` (Spec-Whiteboarding-Session). Richtig: `681be172-2a0b-43f5-8cd5-5138a610ad2b.jsonl`.

2. **Ungeprüfte Annahme über die Test-CLI im Plan.**
   *Situation:* Der Plan ruft im letzten Task drei Testdateien in einem Lauf auf, über das mehrfach angegebene Argument `--include` des Test-Runners. Der Selbst-Check des Plan-Skills verlangt, jede Annahme über fremden Code in Paket oder Doku nachzusehen. Das geschah hier nicht: Der Agent las nur den Kopf des Wrapper-Skripts `angular-test.js`, das `ng test` mit gefilterter Ausgabe startet und weitere Argumente nach `--` durchreicht, nicht aber die Optionen des Angular-Test-Builders · Eindruck.
   *Kosten:* keine gemessenen. Risiko: 1 fehlschlagender Verifikationsschritt in der Umsetzung, danach eine Plan-Korrektur.
   *Ursache:* Der Selbst-Check nennt „Selektoren, Meldungstexte, Signaturen einer Bibliothek“, aber keine CLI-Optionen von Werkzeugen. Die Lücke fiel beim Abhaken nicht auf.
   *Besser gewesen:* Einmal den vorhandenen Verifikationsbefehl aus dem Plan mit einer bestehenden Testdatei laufen lassen (1–2 min) oder die Builder-Doku über Context7 abfragen.
   *Vorschlag:* Der Selbst-Check nennt ausdrücklich CLI-Optionen und Befehlsformen. Jeder Befehl, den der Plan verwendet, wird vor der Übergabe einmal trocken ausgeführt, bei Tests auf eine bestehende Datei.
   *Ziel:* Skill · `dv-forge:plan-writing` (Datei `references/self-check.md`)
   *Im Projekt:* `dv-forge: angular-test --root <R>/src/frontend -- --include … --include …` in Task 2, Schritt 2 von `docs/plans/2026-09-28-307623-score-comment-column-position.md`.

3. **Ablagepfad aus der Konfiguration widerspricht der Projektregel.**
   *Situation:* Der Plan-Skill bestimmt den Zielpfad über `forge-config.js get Plan-Ablage`; das Skript liest die Werkzeug-Einstellungen aus einem Block der Projekt-`CLAUDE.md`. Es lieferte `docs/plans/<datum>-<slug>.md`. Dieselbe `CLAUDE.md` schreibt weiter oben `docs/plans/YYYY-MM-DD-<workitem-nr>-<slug>.md` vor, mit Workitem-Nummer als Pflicht. Der Agent löste den Widerspruch still zugunsten der Projektregel.
   *Kosten:* keine Runde. Es bleibt ein stiller Entscheid, den ein anderer Agent anders treffen könnte · Eindruck.
   *Ursache:* Zwei Stellen in derselben Datei beschreiben dasselbe Ablagemuster, und nur eine davon wurde nachgezogen.
   *Besser gewesen:* Den Widerspruch im Chat in einem Satz nennen und die Projektregel als Grund der Wahl angeben.
   *Vorschlag:* Im dv-forge-Block `Spec-Ablage` und `Plan-Ablage` auf `<datum>-<workitem>-<slug>.md` setzen, damit nur noch eine Regel existiert.
   *Ziel:* CLAUDE.md · Projekt-`CLAUDE.md`, Abschnitt `## dv-forge`
   *Im Projekt:* `- Plan-Ablage: docs/plans/<datum>-<slug>.md` gegen den Abschnitt „Ablage: Specs und Pläne“.

4. **Plan-Format hat keinen Platz für „keine offenen Fragen“.**
   *Situation:* Das Plan-Format erlaubt unter `## Entscheidungen` nur W-Einträge (Antworten des Menschen) und R-Einträge (Nacharbeit im Review). In dieser Planung gab es keine Frage an den Menschen. Der Agent schrieb deshalb einen formlosen Eintrag „keine W-Einträge — …“ mit der Begründung einer Entwurfswahl.
   *Kosten:* keine gemessenen. Das Review-Skript, das den Plan zerlegt, könnte den formlosen Eintrag als Formfehler melden · Eindruck.
   *Ursache:* Für Entwurfswahlen, die kein AC festlegt und die der Agent ohne Rückfrage trifft, sieht das Format keinen Eintragstyp vor.
   *Besser gewesen:* Die Entwurfswahl (Spalte als eigene Top-Level-Spalte statt als Kind der Gruppe) kurz beim Menschen bestätigen lassen. Dann wäre sie ein regulärer W-Eintrag gewesen.
   *Vorschlag:* Das Format bekommt einen Eintragstyp für sichtbare Entwurfswahlen des Planers, etwa `E · <Kurztitel> · Planer`, und einen festen Satz für „keine Fragen gestellt“.
   *Ziel:* Skill · `dv-forge:plan-writing` (Datei `references/plan-format.md`)
   *Im Projekt:* Letzter Abschnitt von `docs/plans/2026-09-28-307623-score-comment-column-position.md`.

## Sparpotenzial

1. **Planungs-Skills für eine nicht betroffene Plattform geladen.**
   *Situation:* Der Plan-Skill lädt alle vier in der Projektkonfiguration genannten Planungs-Skills, zwei davon für .NET-Backend-Tests und Datenbank-Migrationen. Die Änderung betraf nur das Frontend. Beide Skills landeten vollständig im Kontext und erzeugten zwei Plan-Zeilen „gilt hier nicht“.
   *Ersparnis:* je frontend-only Session rund 2–3k Tokens im Kontext, danach in jeder weiteren Anfrage aus dem Cache mitgeschleppt (22 Anfragen) · Eindruck.
   *Besser gewesen:* Nach dem Lesen des betroffenen Codes nur die Skills der berührten Plattformen laden und die übrigen im Plan mit einer Zeile als nicht betroffen vermerken.
   *Vorschlag:* In der Projektkonfiguration werden die Planungs-Skills je Plattform gruppiert (etwa `Planungs-Skills-Frontend`, `Planungs-Skills-Backend`). Der Plan-Skill lädt nur die Gruppen, deren Pfade die Dateiliste des Plans berührt.
   *Ziel:* Skill · `dv-forge:plan-writing` (Schritt 5 „Planungs-Skills laden“) zusammen mit Skript `forge-config.js`
   *Im Projekt:* `dv-dotnet:dotnet-xunit-conventions` und `dv-dotnet:dotnet-ef-migrations` geladen, obwohl nur `src/frontend/**` betroffen ist.

2. **Große Testdatei in drei Teilen nacheinander gelesen.**
   *Situation:* Eine Testdatei mit über 1.700 Zeilen wurde dreimal gelesen (Kopf mit Helfern, Beginn des Haupt-`describe`, Block der betroffenen Spalte), eine zweite Testdatei zweimal. Die Lesevorgänge liefen nacheinander, obwohl die Stellen nach dem ersten `grep -n` schon bekannt waren.
   *Ersparnis:* 1–2 API-Runden je Session, rund 1 min · Eindruck.
   *Besser gewesen:* Nach dem `grep -n` alle nötigen Zeilenbereiche beider Dateien in einem einzigen parallelen Tool-Block lesen.
   *Vorschlag:* Im Plan-Skill ein Hinweis unter „Kontext lesen“: erst Symbole und Zeilen verorten, dann alle Bereiche gebündelt lesen.
   *Ziel:* Skill · `dv-forge:plan-writing` (Schritt 4 „Kontext lesen“)
   *Im Projekt:* `parameter-table.service.spec.ts` (Zeilen 1–215, 379–468, 1240–1404) und `parameters-page.component.spec.ts` (60–199, 635–1009).

## Neue Ideen

(keine: alle Vorschläge betreffen bestehende Werkzeuge)

## Kleinigkeiten

- Die Harness-Meldung „The user hasn't heard from you in a while“ kam zweimal während der Code-Analyse. Kurze Zwischenstände nach je 3–4 Lese-Aufrufen hätten sie vermieden.
- Das Plugin wechselte während der Session von dv-forge 0.6.1 (Plan-Skill) auf 0.7.0 (Retrospektive). Beide Versionen liegen parallel im Plugin-Cache.
