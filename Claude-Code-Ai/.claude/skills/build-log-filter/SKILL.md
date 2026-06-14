---
name: build-log-filter
description: >
  Kanon für MCP build-log-filter: Shell-Build-/Test-Logs verdichten (filter_output,
  filter_output_stream, analyze_build_output). AUSSER SCOPE: ng build/test und dotnet
  build/test laufen via dev-angular-mcp / dev-dotnet-mcp (MCPs filtern intern).
  build-log-filter nur für ng serve, npm start und Shell-Fallback nach BLOCKER-Freigabe.
  tool_type-Mapping DotnetBuild/NgTest etc. Verbindliche 8-Schritte-Checkliste, Verifikations-Matrix,
  Capture-Patterns, Chat-Kommunikations-Regeln und Hard Stop bei MCP-Ausfall.
when_to_use: >
  Aktiviere diesen Skill wenn Shell-Build/-Test-Logs zu verarbeiten sind: ng serve, npm start
  (immer), sowie ng build/ng test/dotnet build/dotnet test im Shell-Fallback nach expliziter
  BLOCKER-Freigabe. Nicht aktivieren wenn dev-angular-mcp oder dev-dotnet-mcp verfügbar sind
  — diese filtern intern.
---

## MCP-FIRST — Außerhalb des Scopes (Hard Gate)

**`ng build` / `ng test` / `dotnet build` / `dotnet test` laufen via MCP — nicht als Shell.**

| Kommando | MCP-Tool | Server |
|----------|----------|--------|
| `ng build` | `build_angular_project` | dev-angular-mcp |
| `ng test` | `test_angular_project` | dev-angular-mcp |
| `dotnet build` | `build_dotnet_solution` | dev-dotnet-mcp |
| `dotnet test` | `test_dotnet_solution` | dev-dotnet-mcp |

**Diese Kommandos sind für build-log-filter außer Scope**, solange MCPs verfügbar: MCPs filtern intern und liefern `errors[]`, `warnings[]`, `summary`. Kein `filter_output` für MCP-Läufe.

**Shell-Fallback (nur nach expliziter BLOCKER-Freigabe durch den Nutzer):** Wenn MCP nachweislich nicht erreichbar (`BLOCKER: [dev-angular-mcp | dev-dotnet-mcp] nicht erreichbar` gemeldet) und Nutzer explizit Shell freigegeben hat, gilt build-log-filter für diese Kommandos wie gewöhnlich.

**VERBOTEN:** build-log-filter für `ng build` / `ng test` / `dotnet build` / `dotnet test` wenn MCPs verfügbar — auch nicht „zur Sicherheit" oder „zusätzlich".

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## MCP-Pfad-Kanon (Pflicht)

- build-log-filter nutzt kein Volume-Mount — kein `/workspace/`-Pfad erforderlich
- **VERBOTEN:** C:\, Windows-Pfade, relative Pfade, `{parameter}`-Platzhalter als MCP-Argument
- `Path not found` bei anderen MCPs = Pfad-Format-Fehler, kein Retry mit demselben Format — Format korrigieren

---

## MCP build-log-filter — Server und Tools

**Server:** `build-log-filter` (Docker, Port 8089)
**Kein** `autoApprove` — jeder Aufruf kann Bestätigung erfordern.
`raw` / `text` / `chunk` = **vollständiges** stdout/stderr des Shell-Laufs (kein Kurz-`raw`)

| Tool | Zweck |
|------|-------|
| `filter_output` | Gesamten Log auf einmal filtern |
| `filter_output_stream` | Chunk-weise (lange Logs, `ng serve`) |
| `analyze_build_output` | Zusätzlich bei Shell-Exit ≠ 0 |

---

## tool_type / format-Mapping

| Kommando-Kontext | `tool_type` (`filter_*`) | `format` (`analyze_build_output`) |
|------------------|--------------------------|-----------------------------------|
| `dotnet build` | `DotnetBuild` | `dotnet-build` |
| `dotnet test` | `DotnetTest` | `dotnet-test` |
| `ng build`, `ng build --configuration production`, `npm run build` im Frontend | `NgBuild` | `ng-build` |
| `ng test`, `npm test` im Frontend | `NgTest` | `ng-test` |
| `ng serve`, `npm start` im Frontend (Dev-Server, fortlaufende Logs) | `NodeGeneric` | `null` (Auto) oder `node-generic` |

Bei **unklarem** `npm`-Script nur das Angular-/Frontend-Mapping verwenden, wenn Arbeitsverzeichnis oder Script eindeutig das Frontend ist.

---

## Geltung

Gilt, wenn Build-/Test-Verifikation via **Shell** anfällt — entweder im Shell-Fallback (nach BLOCKER-Freigabe für ng/dotnet) oder für Kommandos die grundsätzlich nicht via MCP laufen:

**Frontend — nur Shell-Fallback nach BLOCKER-Freigabe oder nicht-MCP-Scope:**
- `ng build`, `ng build --configuration production` und gleichwertige Production-Builds
- `ng test`, `npm test`
- `ng serve`, `npm start` (Dev-Server — läuft nie via MCP; gilt **immer**)

**Backend — nur Shell-Fallback nach BLOCKER-Freigabe:**
- `dotnet build` (inkl. einzelne `.csproj` / Solution)
- `dotnet test`

**npm im Frontend:** `npm run build`, `npm run …` nur dann mit dem Angular-Mapping, wenn Arbeitsverzeichnis oder Script eindeutig das Frontend ist.

Diese Regel **ersetzt niemals** das eigentliche Kommando: zuerst Shell ausführen, **Exit-Code von der Shell** erfassen, **dann** die **gesamte** stdout/stderr zur Verarbeitung durch build-log-filter schleusen.

---

## Verbindliche Kernpflicht

Jeder Build-/Test-/Serve-Lauf, dessen Kommando im **Scope** dieser Regel liegt:

1. Shell ausführen → **Exit-Code** festhalten.
2. **Zwingend** die **gesamte** stdout/stderr über build-log-filter verarbeiten: **`filter_output`** oder bei langen/streamenden Logs **`filter_output_stream`**; bei Shell-Exit **≠ 0** zusätzlich **`analyze_build_output`**.
3. Inhaltliche Diagnose und Verifikations-Freigabe **nur** gemäß Interpretationspflicht; **nicht** „Build grün, daher kein `filter_output`".

**Gilt für:** Verifikations-**Subagents**, **Hauptagent/Orchestrator** bei manueller Verifikation und **jeden** Lauf in einer Build-/Test-Fix-Schleife (nicht nur den letzten erfolgreichen Lauf).

**Verboten:** MCP überspringen, wenn das Kommando im Mapping liegt; Abschluss „verifiziert" ohne nachweisliche build-log-filter-Kette pro applicable Lauf; Diagnose oder Freigabe ohne intern gelesenes MCP-Ergebnis (in-scope); **ein** `filter_output` für mehrere Shell-Läufe (Representative-Filter); Integrations-Checkpoint mit „einmal build-log-filter nach allen Tests".

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Zweck und Kontextökonomie

build-log-filter verdichtet Build-/Test-Logs **für die Agent-Auswertung**, nicht nur für die Nutzerantwort. Ziel: Rohausgabe **vor** inhaltlichem Reasoning, Fix-Entscheidungen und Verifikations-Freigabe verdichten.

Bei in-scope Kommandos gilt:

- Der **Shell-Tool-Return** ist **kein** zulässiger Analyse-Input für Reasoning, Warnungsbewertung oder „verifiziert", **bis** `filter_output` / `filter_output_stream` (bei Exit ≠ 0 zusätzlich `analyze_build_output`) für **diesen** Lauf erfolgreich war und die Response **intern vollständig gelesen** wurde.
- Technisch kann Shell-Output bereits im Kontext erscheinen — **inhaltlich** gilt: keine Schlussfolgerung daraus; nächster Schritt nach Shell ist `filter_*`.

---

## Ein Shell-Lauf = eine MCP-Kette

**Jede** eigene Shell-Ausführung eines in-scope Kommandos = **eine** vollständige build-log-filter-Kette. Nicht „ein MCP für die ganze Session".

| Situation | Pflicht |
|-----------|---------|
| 3× `ng test` mit verschiedenen `--include` | 3× `filter_output` (`NgTest`) |
| `ng build` + 1× oder mehr× `ng test` | 1× `NgBuild` **plus** je Test-Lauf `NgTest` |
| Fix-Schleife (max. 8 Turns) | **Jeder** Retry erneut `filter_*` |
| Nur letzter Lauf / nur Build / nur FAIL-Läufe | **Verboten** |
| Integrations-Checkpoint nach mehreren Tests | **Kein** Sammel-MCP; Matrix mit **einer Zeile pro Lauf** |

---

## Interpretationspflicht (verbindlich)

### Erlaubte Wissensquellen (inhaltliche Einordnung)

**Inhaltliche Einordnung** umfasst: Fehlerursache, relevante Warnungen, welche Datei/Zeile zu fixen ist, ob ein Verifikations-Slice inhaltlich „grün" ist, Escalation an Orchestrator/Nutzer.

- **Pflicht:** Text aus **erfolgreichem** MCP-Aufruf `filter_output` / `filter_output_stream` — Response **intern vollständig lesen**, bevor du daraus schließt.
- **Bei Shell-Exit ≠ 0:** zusätzlich intern gelesenes Ergebnis von `analyze_build_output`.
- **OK / FAIL / Exit-Code:** weiterhin **ausschließlich** Shell-Exit-Code — **nicht** aus MCP-Rückgabe ableiten.

### Verbote

1. **Interpretation vor build-log-filter:** Keine Fehler-/Erfolgs-Einordnung, keine Fix-Entscheidung und keine Verifikations-Freigabe aus Rohkonsole, Shell-Tool-UI, Terminal-Ordner, Chat-Erinnerung oder „sieht grün aus" — **bevor** die MCP-Kette für **diesen** Lauf abgeschlossen ist.
2. **Ungültiges `raw` / `text` / `chunk`:** Kein paraphrasierter, manuell zusammengefasster, gekürzter, rekonstruierter oder aus Terminal-Datei/Tool-UI abgeschriebener Text statt des **vollständigen** stdout/stderr-Captures.
3. **Terminal-Datei als Ersatz-Capture:** Inhalt aus `terminals/*.txt` **darf nicht** als `raw`/`text` an build-log-filter oder als alleinige Diagnosequelle dienen. **Erlaubt** dagegen: eine **frisch** für **diesen** Lauf geschriebene **Temp-Capture-Datei**, deren Inhalt **unverändert** als `raw`/`text` an MCP geht.
4. **Tool-UI / Shell-Return ersetzt nicht MCP:** Sichtbarer Shell-Output in der Tool-UI **ersetzt nicht** die Pflicht, das **vollständige Capture** an build-log-filter zu senden.
5. **Reasoning vor MCP:** Kein „alle Tests grün", keine Warnungsliste und keine Verifikations-Freigabe aus dem Shell-Tool-Return, bevor `filter_*` für **diesen** Lauf abgeschlossen ist.

### Verifikations-Freigabe

Ein Stack/Slice gilt inhaltlich nur dann als verifiziert, wenn pro applicable Lauf die Ausführungs-Checkliste (Schritte **1–8**) **nachweislich** lief, die Verifikations-Matrix für **alle** in-scope-Läufe vollständig ist (`filter_output` = ja je Zeile) **und** die öffentliche Kurzdiagnose aus **intern gelesenem** MCP abgeleitet ist.

---

## Ausführungs-Checkliste (pro Build-/Test-Lauf)

**Gilt für:** Verifikations-**Subagents**; **Hauptagent/Orchestrator**, wenn dieser selbst Build/Test fährt; und **jeden einzelnen Lauf** in einer Build-/Test-Fix-Schleife.

**Kanonische Reihenfolge** — nach jedem Lauf der Shell in dieser Nummerierung abarbeiten:

1. Kommando im **richtigen Arbeitsverzeichnis** ausführen; **Exit-Code** der Shell festhalten (**OK**/**FAIL** unabhängig von MCP). Empfohlen: Capture-Muster (vollständiges `raw` für MCP).
1b. **Sofort nach Shell (in-scope):** **Kein** inhaltliches Urteil, keine Zusammenfassung, kein „alle Tests grün" / keine Warnungsliste aus Shell-Tool-UI. Der **nächste** Tool-Call **muss** `filter_output` oder `filter_output_stream` sein — außer Hard Stop oder Außerhalb des Scopes. **Verboten** zwischen Schritt 1 und `filter_*`: `Read`/`Grep` auf die Capture-Datei oder Shell-Return zur **Diagnose**; Code-/Spec-Fix aus Rohlog; paraphrasiertes `raw` an MCP.
2. **Scope und MCP prüfen** (zwei getrennte Fälle):
   - **2a. Außerhalb des Scopes:** Kommando **nicht** im Mapping → kurz begründen; **keine** erzwungene `filter_output`; danach mit Schritt **7** und **8** fortfahren.
   - **2b. Im Scope:** Kommando liegt im Mapping → **build-log-filter**-MCP erreichbar?
     - **Nein** → Hard Stop; **Stopp** (keine Fix-Schleife fortsetzen, keine Verifikations-Freigabe).
     - **Ja** → Schritte **3–8** wie unten.
3. MCP-**Tool-Deskriptoren** lesen, dann **`filter_output`** mit **`raw`** = **ausschließlich** vollständiges stdout/stderr **dieses** Shell-Laufs und passendem **`tool_type`** — **auch bei Exit 0**. Bei sehr langem stdout **`filter_output_stream`** bevorzugen.
4. Wenn Shell-Exit-Code **≠ 0**: zusätzlich **`analyze_build_output`** mit **`text`** (= vollständige Rohausgabe des Laufs) und passendem optional **`format`** gemäß Mapping.
5. **Vor jedem** MCP-Aufruf: in der **sichtbaren** Antwort eine kurze Zeile **`Rufe build-log-filter …`** (konkretes Tool + kurz warum).
6. MCP-Response **intern vollständig lesen**; inhaltliche Diagnose **nur danach**. In die **öffentliche** Antwort **keinen** MCP-Body, **keine** Filterstatistik; Kurzprosa **aus intern gelesenem MCP** plus bekannter Shell-Exit-Code. Ohne erfolgreichen `filter_*` für diesen Lauf: **keine** inhaltliche Diagnose.
7. **Abschlussbericht** inkl. Verifikations-Matrix-Zeile für **diesen** Lauf (Kommando, CWD, Exit, `filter_output` ja/nein, ggf. `analyze_build_output`).
8. Nächster Turn in derselben Fix-Schleife: wieder bei **Schritt 1** beginnen.

---

## Orchestrator-Nachlauf (Hauptagent)

| Situation | Pflicht |
|-----------|---------|
| Verifikations-Subagent **FAIL** | Orchestrator **startet kein** eigenes `ng build` / `ng test` / `dotnet build` / `dotnet test` zur Nachverifikation → **neuen** Verifikations-Subagent mit Fix-Kontext |
| Orchestrator **Integrations-Fix** | **Pflicht:** erneuter Verifikations-Subagent pro betroffenem Stack |
| Orchestrator führt in-scope Build/Test **ausnahmsweise** selbst aus | Nur bei dokumentiertem **`BLOCKER: Task-Tool nicht verfügbar`** — dann **dieselbe** Ausführungs-Checkliste Schritte **1–8** |
| Subagent-Bericht mit Matrix, danach Orchestrator-Code-Edit | Matrix des Subagents **veraltet** — Abschluss erst nach **neuen** Läufen |

**Verboten:** Subagent FAIL → Orchestrator liest Temp-Capture oder Shell-UI → patcht Code → `ng test` ohne sofortiges `filter_output`.

*Enforcement-Prinzipien: siehe `docs/silent-shortcut-prevention.md`*

---

## Hard Stop — MCP nicht erreichbar

Wenn ein Kommando **im Scope** liegt und der **build-log-filter**-MCP-Server **nicht** nutzbar ist:

- **Sofort stoppen** — keine weitere Build-/Test-Fix-Schleife, **keine** Verifikations-Freigabe.
- **Kein** Ersatz durch manuelle Log-Zusammenfassung, Terminal-Datei-Lesen oder Interpretation aus Shell-Tool-UI.
- **Sichtbarer Nutzer-Block** mit fester Überschrift **`BLOCKER: build-log-filter nicht erreichbar`**, mindestens:
  - Kurzursache (MCP-Aufruf fehlgeschlagen / Server nicht verfügbar / Tools nicht in der Tool-Liste)
  - Betroffenes Kommando und Arbeitsverzeichnis
  - Hinweis: Server-Key **`build-log-filter`** (Docker-Image `build-log-filter-mcp:local`, Port 8089)
  - Konkrete Nutzeraktion (Docker läuft? Image gebaut? MCP aktiv?)
- Im Reporting: **`Verifikation: BLOCKIERT (build-log-filter)`**

---

## Empfohlenes Capture-Muster (Shell → MCP)

Ziel: vollständiges `raw` für MCP, minimaler Chat-Footprint, **kein** `terminals/*.txt`.

```powershell
# Arbeitsverzeichnis: /workspace (Frontend-Root)
$capture = Join-Path $env:TEMP "capture.txt"
npx ng test --no-watch --browsers=ChromeHeadless 2>&1 | Tee-Object -FilePath $capture
# Exit-Code der Pipeline festhalten ($LASTEXITCODE)
# Unmittelbar danach: filter_output mit raw = Get-Content $capture -Raw (tool_type NgTest)
```

| | |
|---|---|
| **Erlaubt** | Temp-Capture-Datei **nur** für MCP-`raw`/`text` **desselben** Laufs |
| **Verboten** | `terminals/*.txt` als `raw`/`text` |
| **Verboten** | Shell-Output in der Assistant-Nachricht tabellarisch wiederholen, **bevor** MCP für diesen Lauf lief |
| **Verboten** | `raw` aus paraphrasiertem Shell-Tool-UI-Text oder `raw: "TOTAL: N SUCCESS"` |
| **Pflicht** | `raw`/`text` = vollständiger ungekürzter Capture-Inhalt |

---

## Chat-Kommunikation

Pflicht für die Nutzerantwort, sobald **build-log-filter** via MCP aufgerufen wird:

1. **Vor** **jedem** MCP-Aufruf eine kurze Zeile ausgeben: **`Rufe build-log-filter …`** — mit Kontext (konkretes Tool: `filter_output`, `filter_output_stream` oder `analyze_build_output`, kurz warum).
2. **Nach** erfolgreichem Aufruf: **keinen** Inhalt aus der Tool-Antwort in die Nutzerantwort übernehmen. **Keinen** Block **`Ergebnis vom build-log-filter:`** und **keinen** Block **`Filterstatistik:`**.
3. **Diagnose/Fehlerbild:** in **Kurzprosa** formulieren — **ausschließlich** aus dem **intern gelesenen** MCP-Ergebnis plus **bekanntem Shell-Exit-Code**; ohne MCP-Rückgabetext zu zitieren. Bei nicht erreichbarem MCP: Hard Stop — **keine** Diagnose.
4. Bei **Gezielten Originalauszügen auf Nutzerwunsch** (nur nach abgeschlossener MCP-Kette und konkretem Befund): Originalauszüge **getrennt** unter **`Gezielter Originalauszug (nicht build-log-filter):`** mit kurzer Begründung.

---

## Gezielte Originalauszüge auf Nutzerwunsch

Nur wenn **alle** folgenden Bedingungen erfüllt sind:

1. Der Nutzer fordert **ausdrücklich** Originalausgabe für **dieses konkrete** Kommando an.
2. **`filter_output`** bzw. **`filter_output_stream`** wurde **vollständig** ausgeführt; bei Exit-Code **≠ 0** zusätzlich **`analyze_build_output`**.
3. Die **intern** ausgewertete MCP-Ausgabe nennt einen **konkreten verdächtigen Befund**.
4. Ein für die Klärung **dieses** Befunds **notwendiges Detail** fehlt ohne Originalauszug.

Dann gilt: Originalauszüge **minimal und gezielt**; wo sinnvoll redigieren (Pfade, Tokens, Secrets). Auswertung darf **nicht allein** auf dem Originalauszug beruhen.

---

## session_id (filter_output_stream)

- **Innerhalb eines Laufs:** dieselbe `session_id` für jede `chunk`-Übergabe; zuletzt **`is_final: true`**.
- **Neuer logischer Lauf:** neues Shell-Kommando oder Wechsel des Stacks → **neue** `session_id`.
- **Parallelität:** Parallele Agents oder Subagents **dürfen dieselbe `session_id` nicht teilen**.
- **Eindeutigkeit (Empfehlung):** z. B. `verify-frontend-ng-build-20260612-a1`

---

## JSON-Beispiele

### filter_output (nach dotnet build)

```json
{
  "raw": "<vollständiges stdout/stderr des Laufs>",
  "tool_type": "DotnetBuild"
}
```

### filter_output_stream

```json
{
  "chunk": "<Log-Chunk>",
  "tool_type": "NgTest",
  "session_id": "verify-frontend-ng-test-20260612-a1",
  "is_final": false
}
```

Letzter Chunk derselben `session_id`: `"is_final": true`.

### analyze_build_output (bei Exit ≠ 0)

```json
{
  "text": "<vollständiges stdout/stderr desselben Laufs>",
  "format": "ng-test"
}
```

---

## Reporting (Pflicht)

Im Abschlussbericht **immer** angeben:

- Exakt ausgeführtes Kommando und Arbeitsverzeichnis
- **OK** / **FAIL** und Exit-Code (Shell)
- Ob/welche build-log-filter-Tools aufgerufen wurden (kurz, z. B. `filter_output` / `analyze_build_output`)
- Wesentliche Warnungen/Fehler als **eigene knappe Prosa** — abgeleitet aus **intern gelesenem** build-log-filter
- Bei Hard Stop: **`Verifikation: BLOCKIERT (build-log-filter)`**
- Die **Verifikations-Matrix** für **alle** Shell-Läufe der Session

### Verifikations-Matrix

Pflicht bei jeder Verifikations-Session — **eine Zeile pro Shell-Lauf** (auch bei Exit 0):

| # | Kommando (kurz) | CWD | Exit | `filter_output` | `analyze_build_output` |
|---|-----------------|-----|------|-----------------|------------------------|
| 1 | `ng test … {feature}` | `/workspace` | 0 | ja | nein |
| 2 | `ng test … {spec-filter}` | `/workspace` | 0 | ja | nein |
| 3 | `ng build --configuration production` | `/workspace` | 0 | ja | nein |

**Schließregel:** Formulierungen wie „verifiziert", „Production-Build OK", „alle Tests grün" nur, wenn **jede** Zeile für in-scope-Läufe `filter_output` = **ja** hat. Fehlt eine Zeile oder steht **nein** → **nicht verifiziert**.

**Nach Orchestrator-Code-Änderung:** Nur Läufe **nach** dem letzten Edit zählen. Subagent-Zeilen **vor** diesem Edit dürfen **nicht** allein „verifiziert" tragen.

---

## Fehlerdiagnose

| Symptom | Ursache | Maßnahme |
|---------|---------|----------|
| MCP nicht in Tool-Liste | Docker/MCP nicht aktiv | Docker und MCP-Konfiguration prüfen |
| Leeres/kurzes `raw` | Nicht vollständiges Capture | Temp-Capture ungekürzt übergeben |
| Falscher `tool_type` | Mapping verwechselt | Tabelle oben konsultieren |

---

## Außerhalb des Scopes

Nur wenn das Kommando **nicht** im Mapping liegt:

- Kurz begründen, warum build-log-filter **nicht** anwendbar ist.
- Fehler/Warnungen in **eigener Kurzprosa** — **kein** vollständiger Rohlog in die Nutzerantwort.
- **Kein** Hard Stop allein wegen fehlendem Mapping.

---

## Abgrenzung

- **dev-angular-mcp** `build_angular_project` / `test_angular_project`: ng Build + Test (MCP-First)
- **dev-dotnet-mcp** `build_dotnet_solution` / `test_dotnet_solution`: dotnet Build + Test (MCP-First)
- **codebase-analyzer** `analyze_compiler_diagnostics`: Compiler ohne Shell-Build

Log-UI: Port **8089**

Weiterführende Dokumentation: `docs/mcp-build-log-filter.md`

## Opt-out

`ohne build-log-filter`, `kein build-log-filter` → Skill nicht für Verifikation überspringen wenn Pflicht aktiv.
