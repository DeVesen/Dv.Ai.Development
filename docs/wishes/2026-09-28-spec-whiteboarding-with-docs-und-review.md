# Erfahrungsbericht Workitem lesen, Spec mit Bestandsabgleich schreiben, Spec-Review-Loop

**Lauf:** Workitem aus Azure DevOps gelesen (Skill `ado-cli`), fachliche Spec im Dialog erarbeitet (`dv-forge:spec-whiteboarding-with-docs` mit `dv-forge:spec-whiteboarding` und `dv-forge:domain-modeling`), Spec automatisch geprüft (`dv-forge:spec-review`, 5 Reviewer, Nacharbeiter, Scout), Scout-Vorschlag übernommen, committet (`commit-message`). Session-Modell claude-opus-5-5, Reviewer claude-sonnet-5, 2026-09-28.
**Ergebnis:** Bestätigte, verankerte Spec mit 19 Akzeptanzkriterien, Review sauber nach 4 Runden, ein neuer Glossar-Eintrag, ein Commit. Dauer 54 min, Eingaben des Menschen 32, Tokens neu 168k Hauptsession und rund 700k Subagents (3399k gesamt inkl. Cache).

## Zahlen
- Dauer: 54 min · Modelle: claude-opus-5-5
- Eingaben des Menschen: 32 · API-Anfragen: 70 · Zusammenfassungen: 0
- Tokens Hauptsession: 168k neu gelesen, 11240k aus dem Cache, 35k Ausgabe
- Tokens Subagents: 3399k in 25 Agents
- Tool-Aufrufe: Agent 25, Bash 15, Skill 4, Grep 3, Read 2, Write 2
- Skills: dv-forge:spec-whiteboarding-with-docs 1, dv-forge:spec-whiteboarding 1, dv-forge:domain-modeling 1, commit-message 1
- Tool-Fehler: 2, davon blockiert oder verweigert: 0 · direkt wiederholte gleiche Aufrufe: 0

Größte Tool-Ergebnisse (etwa 4 Zeichen je Token):
- 10k Tokens · Read docs/application/feature/experiment-wizard/feature.md (4×, je ein Profil-Reviewer)
- 4k Tokens · Grep (?i)result|parameter.?set|parametersatz|status|tack

Mehrfach gelesene Dateien:
- 24× die Spec
- 4× profile-index.md
- je 4× sechs Profil-/Glossar-Dateien (experiment-dashboard, experiment-wizard, result-entry, report-generation, domain-terms, frontend-terms)

Wiederkehrende Shell-Befehle (ab 3×):
- 5× sed
- 4× cat
- 4× grep

Subagent-Tokens gesamt je Review-Runde (5 Reviewer): Runde 1 437k, Runde 2 474k, Runde 3 684k, Runde 4 515k. Davon Profil-Reviewer: 187k, 190k, 373k, 197k. Nacharbeiter 3× rund 100k, Scout 151k, Bestands-Explore 839k.

## MCP-Nutzung

Quelle: Session-Protokoll · Hauptagent + 25 SubAgent(s) · 191 Tool-Aufrufe, davon 0 MCP

| Server | Status | Aufrufe | Fehler | Wiederholt | Tools | Agents |
|---|---|---|---|---|---|---|
| dev-mcp | **erwartet, ungenutzt** | 0 | – | – | – | – |
| codebase-analyzer | **erwartet, ungenutzt** | 0 | – | – | – | – |
| browser-inspector | **erwartet, ungenutzt** | 0 | – | – | – | – |
| microsoft-learn | **erwartet, ungenutzt** | 0 | – | – | – | – |

### Native Tools

| Tool | Aufrufe | Fehler | Wiederholt | Agents |
|---|---|---|---|---|
| Read | 60 | – | 38 | dv-forge:spec-review-profiles (33), dv-forge:spec-rework (6), dv-forge:spec-review-clarity (4), dv-forge:spec-review-feasibility (4), dv-forge:spec-review-completeness (4), dv-forge:spec-review-consistency (4), dv-forge:spec-review-scout (3), Hauptagent (2) |
| Bash | 26 | 1 | – | Hauptagent (15), Explore (11) |
| Write | 26 | – | – | dv-forge:spec-review-profiles (5), dv-forge:spec-review-clarity (4), dv-forge:spec-review-feasibility (4), dv-forge:spec-review-completeness (4), dv-forge:spec-review-consistency (4), dv-forge:spec-rework (3), Hauptagent (2) |
| Edit | 15 | – | – | dv-forge:spec-rework (15) |
| Grep | 10 | – | – | Explore (4), Hauptagent (3), dv-forge:spec-review-scout (3) |

**Relevanz:**
- codebase-analyzer: hätte genützt, weil die Bestandssuche nach einem Enum und seinen Verwendungen genau `find_in_index`/`find_symbol_references` entspricht; stattdessen lief ein Explore-Agent mit 839k Tokens, und die Projekt-`CLAUDE.md` nennt codebase-analyzer als ersten Suchweg.
- dev-mcp: verzichtbar in dieser Session (nur Doku, keine Dateioperationen jenseits Lesen/Schreiben einer Spec).
- browser-inspector: verzichtbar in dieser Session (keine UI-Prüfung).
- microsoft-learn: verzichtbar in dieser Session (keine .NET-API-Frage).

## Positiv

1. **Bestandsabgleich vor der ersten Fragerunde ersparte Fragen.** Ein einziger Such-Agent lieferte Status-Berechnung, die sieben Pflichtfelder, alle Anzeigestellen und zwei vorhandene Inkonsistenzen; die Fragerunden brauchten danach nur 3 Antworten des Menschen („Vorwort …“, „alle ok“, „beide ja“) bis zur leeren Frontier.
2. **Mensch korrigierte die Kernregel früh, nicht erst im Review.** Die Empfehlung zu Q1 („jeder Result-Wert zählt“) wurde in Runde 1 per Freitext überstimmt; weil jede Runde die komplette Frontier zeigte, kam das vor dem Entwurf.
3. **Review-Loop konvergierte ohne Ausfall.** 20 Reviewer-Läufe, 0 ausgefallen, Fortschritt in jeder Runde (`PROGRESS true`), sauber nach Runde 4 mit einem einzelnen 🟡.

## Reibung

1. **Nacharbeiter legte neues Fachverhalten fest, das der Mensch nie bestätigt hat.**
   *Situation:* Der Mensch hatte die Spec wortgleich bestätigt. In Nacharbeit 3 ergänzte der Nacharbeiter-Agent zwei neue Verhaltensregeln samt Akzeptanzkriterien (Status bei fehlgeschlagenem Speichern; bei gleichzeitiger Bearbeitung gewinnt der zuletzt gespeicherte Stand) als Antwort auf 🟡-Findings eines Klarheits-Reviewers. Der Mensch sah das nur als Einzeiler im Orchestrator-Bericht.
   *Kosten:* 2 fachliche Entscheidungen ohne Mensch in einer als „bestätigt“ markierten Spec; Risiko, dass Plan und Code darauf bauen · Eindruck.
   *Ursache:* Der Nacharbeiter darf Findings frei auflösen; es gibt keine Trennung zwischen „Formulierung schärfen“ und „neues Verhalten entscheiden“. Das Whiteboarding verlangt für jede spätere Änderung Vorher/Nachher und erneute Bestätigung — der Review-Loop umgeht diese Regel.
   *Besser gewesen:* Findings, deren Lösung neues Verhalten festlegt, als offene Frage im Bericht an den Menschen geben statt sie einzuarbeiten; der Rest der Nacharbeit läuft weiter.
   *Vorschlag:* Nacharbeiter klassifiziert jede Änderung als „Klarstellung“ oder „neue Entscheidung“; neue Entscheidungen landen als eigener Abschnitt im Bericht und werden nicht geschrieben.
   *Ziel:* Agent · `dv-forge:spec-rework` (arbeitet Reviewer-Findings in die Spec ein)
   *Im Projekt:* AC-18, AC-19 und die R3-Einträge in `docs/specs/2026-09-28-307326-result-status-in-progress.md`.

2. **Drei rote Findings stammten aus dem Whiteboarding und hätten dort auffallen können.**
   *Situation:* Runde 1 fand 3 × 🔴: (a) eine Soll-Vorgabe „Label exakt [X]“ widersprach den Dashboard-Kriterien mit Präfix, (b) für zwei der sieben Pflichtfelder war „gesetzt“ nicht definiert, (c) die Spec behauptete eine gesperrte Auswahl-Checkbox, die laut Feature-Profil seit Wochen toter Code ist. (c) kam aus dem Bericht des Such-Agenten, der eine Codestelle zitierte, ohne das Profil gegenzulesen.
   *Kosten:* 3 zusätzliche Review-Runden à rund 440–680k Subagent-Tokens plus 3 Nacharbeiten à rund 100k; rund 25 min Laufzeit.
   *Ursache:* Das Whiteboarding mit Bestand las Glossar und Profile nur per Stichwort-Grep, nicht die Feature-Profile der betroffenen Bildschirme im Ganzen; der Entwurf wurde nicht selbst auf Widersprüche zwischen Soll-Vorgaben und Kriterien geprüft.
   *Besser gewesen:* Vor Runde 1 die zwei, drei Feature-Profile der betroffenen Bildschirme vollständig lesen und Code-Aussagen des Such-Agenten dagegenhalten; vor dem Vorlegen des Entwurfs jede Soll-Vorgabe mit „exakt/immer/nie“ gegen alle Kriterien prüfen.
   *Vorschlag:* Pflichtschritt im Skill: betroffene Feature-Profile ganz lesen; Selbstcheck „absolute Soll-Vorgaben gegen alle ACs“ vor dem Entwurf.
   *Ziel:* Skill · `dv-forge:spec-whiteboarding-with-docs` (Spec im Dialog mit Abgleich gegen Code, Glossar und Profile)
   *Im Projekt:* `docs/application/feature/experiment-wizard/feature.md` (Report-Gate `#296459`, Checkbox-Gating tot seit 2026-08-24); Explore-Aussage zu `parameter-table.service.ts:774`.

3. **Verkettete Anweisung scheiterte an einem nur vom Menschen aufrufbaren Skill.**
   *Situation:* Der Mensch schrieb in einem Satz „lies [Workitem] und dann /[Skill B]“. Nach dem Lesen versuchte der Agent, Skill B aufzurufen; der ist für Modell-Aufruf gesperrt, der Mensch musste ihn separat eintippen.
   *Kosten:* 1 zusätzliche Eingabe des Menschen, rund 1 min.
   *Ursache:* Die Sperre ist sinnvoll gegen eigenmächtiges Starten, unterscheidet aber nicht, ob der Mensch den Skill im selben Prompt ausdrücklich verlangt hat.
   *Besser gewesen:* Sofort nach dem Lesen den kopierbaren Befehl ausgeben (so geschehen) — oder schon beim Start ankündigen, dass Teil 2 eine eigene Eingabe braucht.
   *Vorschlag:* Hinweis im lesenden Skill bzw. in der Projekt-`CLAUDE.md`: Folge-Skills mit Aufruf-Sperre nicht versuchen, sondern Befehl ausgeben; alternativ Sperre aufheben, wenn der Skillname wörtlich in der Nutzereingabe steht.
   *Ziel:* Plugin · `dv-forge` (Frontmatter von `spec-whiteboarding-with-docs`)
   *Im Projekt:* Prompt „/ado-cli lies 307326 und dann /dv-forge:spec-whiteboarding-with-docs“.

4. **Aggregation meldete 0 × 🟡, obwohl Reviewer 3 × 🟡 berichtet hatten.**
   *Situation:* In Runde 3 meldeten der Vollständigkeits-Reviewer 1 und der Klarheits-Reviewer 2 gelbe Findings; das Aggregationsskript gab `red=2 yellow=0` aus.
   *Kosten:* 3 Findings verschwanden womöglich aus der Nacharbeit; der Nacharbeiter arbeitete sie dennoch ein (laut seinem Bericht), das Verhalten ist also unklar · Eindruck.
   *Ursache:* Unbekannt; Zusammenlegung nach Stelle oder Schwellwert im Skript · Eindruck.
   *Besser gewesen:* Aggregator gibt je Reviewer die gezählten Findings aus, damit Abweichungen sichtbar sind.
   *Vorschlag:* `aggregate-findings.js` zeigt eine Zeile „eingelesen je Reviewer“ und begründet zusammengelegte oder verworfene Findings.
   *Ziel:* Skript · `aggregate-findings.js` (fasst Reviewer-JSONs zu Status und Bericht zusammen)
   *Im Projekt:* `.forge/spec-review/2026-09-28-307326-result-status-in-progress/runde-3/`.

## Sparpotenzial

1. **Profil-Reviewer liest in jeder Runde dieselben sechs Profile neu.**
   *Situation:* Der Profil-Reviewer (gleicht die Spec gegen Glossar und Feature-Profile ab) lief viermal, las jedes Mal dieselben 6 Dateien, darunter ein 10k-Token-Profil, und war mit 187–373k Tokens pro Lauf der teuerste Reviewer (947k gesamt, 45 % aller Reviewer-Tokens).
   *Ersparnis:* rund 500–600k Tokens je Review mit 4 Runden.
   *Besser gewesen:* Runde 1 wählt die relevanten Profile und schreibt einen Auszug der relevanten Abschnitte in den Arbeitsbereich; ab Runde 2 liest der Reviewer nur diesen Auszug und die geänderten Spec-Stellen.
   *Vorschlag:* Profil-Auszug als Datei im Review-Arbeitsbereich, von `prepare.js` bzw. Runde 1 erzeugt und weitergegeben.
   *Ziel:* Agent · `dv-forge:spec-review-profiles` (prüft Spec gegen Projekt-Glossar und Profile)
   *Im Projekt:* `experiment-wizard/feature.md` 4× gelesen, je rund 10k Tokens.

2. **Bestandssuche per Explore-Agent auf dem großen Modell statt Code-Index.**
   *Situation:* Für die Frage „wo wird [Status-Enum] berechnet, angezeigt, weiterverwendet“ lief ein Explore-Agent mit 16 Tool-Aufrufen und 839k Tokens (79k neu) auf dem Session-Modell. Der Code-Index-Server `codebase-analyzer` (Symbolsuche und Referenzen) stand bereit und wird in der Projekt-`CLAUDE.md` als erster Suchweg genannt; 0 Aufrufe.
   *Ersparnis:* geschätzt 500–700k Tokens je Bestandssuche · Eindruck.
   *Besser gewesen:* `find_in_index` auf das Enum, `find_symbol_references` auf Enum und Anzeige-Konstante, danach nur die gefundenen Stellen lesen; bei Bedarf Such-Agent mit kleinerem Modell.
   *Vorschlag:* Im Skill mit Bestandsabgleich den Suchweg „erst forge-config `Suche`, dann Agent“ als konkrete Schrittfolge mit Tool-Namen, und Such-Agents mit kleinerem Modell dispatchen.
   *Ziel:* Skill · `dv-forge:spec-whiteboarding-with-docs`
   *Im Projekt:* `ResultStatus`, `RESULT_STATUS_CREATED`; Explore-Auftrag „Result-Status Bestand finden“.

3. **Orchestrator wird für jeden Reviewer einzeln geweckt.**
   *Situation:* Die Reviewer laufen im Hintergrund; jeder Abschluss weckt die Hauptsession zweimal (Bericht und Benachrichtigung). Bei 5 Reviewern × 4 Runden entstanden rund 40 Wartezyklen, in denen die Hauptsession nur „x von 5 fertig“ ausgab; die Hauptsession las dabei 11,2M Tokens aus dem Cache.
   *Ersparnis:* geschätzt 30+ API-Anfragen und mehrere Millionen Cache-Tokens je Review · Eindruck.
   *Besser gewesen:* Die 5 Reviewer in einer Nachricht parallel im Vordergrund starten; die Aufrufe laufen trotzdem gleichzeitig, und die Hauptsession wird nur einmal pro Runde fortgesetzt.
   *Vorschlag:* Im Review-Loop Reviewer parallel im Vordergrund statt im Hintergrund starten, oder ein Warte-Skript, das erst bei vollständigem Ergebnisordner zurückkehrt.
   *Ziel:* Plugin · `dv-forge` (`shared/review-loop/loop.md`, gemeinsamer Ablauf aller Review-Orchestratoren)
   *Im Projekt:* `.forge/spec-review/<slug>/runde-1..4/`.

## Neue Ideen

- (keine neuen Werkzeuge; alle Vorschläge betreffen bestehende)

## Kleinigkeiten

- Der zweite Tool-Fehler (`ls` mit Exit-Code 2) war ein gewollter Existenz-Check vor dem Schreiben der Spec, kein Fehlschlag.
- Beim Commit warnte Git, dass LF in CRLF umgewandelt wird (Spec und Glossar mit LF geschrieben).
- Zwischenmeldungen „x von 5 Reviewern fertig“ kamen im Chat rund 20-mal und trugen keine Information für den Menschen.
