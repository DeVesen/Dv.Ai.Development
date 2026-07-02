# Code-Landkarte — Verbindliche Recherche-Reihenfolge

Dieser Abschnitt gilt für **alle** Agenten und Workflows, die Code im Repo betreffen:
Haupt-Chat, **buddy-agent**, **plan-agent**,
Implementierung/Review — sobald der Nutzer oder die Anforderung **programmierbare Symbole** meint.

## Grundsatz

**Backend (.NET) und Frontend (Angular) sind Code.** Wenn von einer **Stelle im Code** die Rede ist,
wird zuerst die **strukturelle Landkarte** (Projekt-Index) genutzt — **nicht** sofort `Grep`/`rg`.

**Kein Code-Landkarten-Pfad** für rein **UI-/Domänen-Sprache** ohne programmierbares Symbol, z. B.:
„OK-Button", „Artikel-Input", „Speichern-Klick", „Tab Versuche", sichtbarer Button-Text in der Oberfläche.
Dort: bestehende UX-/Test-/i18n-Recherche (Labels, `aria-label`, Template-Text, E2E-Selektoren,
Komponenten-Namen wenn der Nutzer sie nennt) — **ohne** `index_project` nur wegen eines Button-Worts.

## Entscheidungsbaum (Pflicht vor jeder Code-Recherche)

| Nutzer / Anforderung meint … | Erste Aktion | Danach |
|------------------------------|--------------|--------|
| **Klasse, Interface, Service, Component, Record, Enum, Namespace** | `index_project` (falls Session/Cache fehlt) → `find_in_index` | `Read` der genannten Datei; Grep nur für fehlende Details |
| **Methode, Funktion, Property, Feld, Route, Endpoint, DI-Token** (Name bekannt) | wie oben mit `query` = Typ- oder Container-Name; Methode per `Read` + ggf. `analyze_ast_only` | `find_symbol_references` für konkrete Aufrufstellen (statt Grep); Grep nur wenn Index/Datei nicht reicht |
| **Interface oder Basisklasse wird geändert** (Vererbungs-Scope) | `find_in_index` → betroffenen Typ lokalisieren | `find_type_hierarchy(direction: "down")` — alle Ableitungen/Implementierungen als Scope-Liste |
| **„Von hier nach dort"** (zwei Code-Anker: Datei+Zeile oder zwei Symbole) | `find_in_index` für beide Anker-Typen; optional `analyze_type_graph` / `analyze_dataflow` für Klassen-/Service-Grenzen | Grep für konkrete Aufrufzeilen; keine Spekulation ohne Fundstelle |
| **Ordner, Feature, Modul** („im FileService", „Search-Grid") | `index_project` → `find_in_index` mit Teilstring | gezieltes `Read` |
| **„Baut der Scope?" / Compiler-Fehler im Scope** | `analyze_compiler_diagnostics(path, severity: "error")` | Bei Fehlern: Blocker vor Umbau; Scout meldet in Risiken |
| **Post-Implementation / geänderte Dateien nach Slice** | `suggest_boyscout_actions(filePaths, type)` | Ein Call: Compiler-Gate + Top-5-Findings; Opt-out: `kein boyscout` |
| **UI-Element, Label, Flow in der Oberfläche** (ohne Klassenname) | **Kein** Index-Zwang | Suche nach Komponente/Template/Übersetzung; erst bei genanntem `@Component`/`selector` → Landkarte |
| **Unklar** (Code vs. UI?) | **Eine** Klärungsfrage | dann Entscheidungsbaum |

## MCP-Pfade (verbindlich)

Parameter `projectPath`, `filePath`, `solutionPath` für **codebase-analyzer**:
**Windows-Absolutpfade** (`C:\...`) — kein `/workspace/`-Präfix mehr (MCP läuft nativ als Node-Prozess).

| Ableitung | Regel |
|-----------|--------|
| Kanon | `.cursor/references/mcp-project-paths.md` — Windows-Absolutpfade aus Spalte „Host path" |
| Fallback | `.cursor/skill-params.json` — Host-Pfade direkt als Windows-Absolutpfad übergeben |
| dev-mcp | Windows-Absolutpfad `C:\...` — siehe [dev-mcp/SKILL.md](../../dev-mcp/SKILL.md) |

**VERBOTEN als MCP-Argument:** `/workspace/`-Pfade, relative Pfade, `{frontend-path}`/`{backend-path}`-Platzhalter.
Bei `Path not found: ...`: sofort korrigieren — **kein** zweiter Versuch mit demselben Format.

Deploy-Kanon (wird bei Install generiert): `mcp-project-paths.md` (project-specific, not in this repo). `./AGENTS.md` ist optional.

## MCP-Werkzeugkette (Planung & Code-Navigation)

**Schritt 0 — Projektwurzel wählen:**

| Stack | `projectPath` | `type` | Wann |
|-------|---------------|--------|------|
| Angular FE | Windows-Absolutpfad aus mcp-project-paths.md | `angular` | Standard FE-Stack |
| .NET Backend (Einzel-.csproj) | Windows-Absolutpfad aus mcp-project-paths.md **Backend project routing** | `dotnet` | Symbol liegt in diesem Projekt |
| .NET Multi-Projekt | **Mehrere** `index_project` auf betroffene `.csproj`-Verzeichnisse | `dotnet` | Standard bei Multi-Stack-Backend |
| .NET Solution (optional) | Windows-Absolutpfad der `.sln` — Tool: `index_solution` | — | **Nur** wenn mcp-project-paths.md freigibt **und** Smoke-Test grün (siehe Known Issues) |

Pfade aus mcp-project-paths.md direkt (als Windows-Absolutpfad) an codebase-analyzer übergeben.

Bei Multi-Stack-Aufgaben: pro benötigtem `.csproj`/FE-Root einmal `index_project` (Cache ~5 min, `useCache: true`). Orchestrator/Scout dokumentiert, welche Indizes gelaufen sind.

## MCP-Pfadauflösung (nativ) — Pflicht-Playbook

Bei `index_project`-Fehler: Pfade in dieser Reihenfolge prüfen — **max. 2 Versuche je Stack**:

| Versuch | Pfad |
|---------|------|
| 1 (primär) | Windows-Absolutpfad aus mcp-project-paths.md |
| 2 (Fallback) | Windows-Absolutpfad direkt aus Repo-Struktur ableiten (`C:\Develop\...\src\frontend`) |

**Dokumentationspflicht bei Fehler** — jeder fehlgeschlagene Call im Scout-Deliverable:
```
Rufe index_project(projectPath="<Pfad>") → Fehler: <Fehlermeldung>
```
Nach 2 Fehlern pro Stack: **MCP-Fallback deklarieren** (kein weiteres Raten):
```
MCP-Fallback: <Grund>; Anker via Read/Grep: <Liste der Einstiegspunkte>
```

**Fehlerdiagnose:** `Path not found: ...` = falscher Pfad — Windows-Absolutpfad prüfen, kein Verbindungsproblem.

## .NET Multi-Projekt — index_solution Known Issue

Manche Solutions (z. B. komplexe `.sln`) liefern:
`No projects found in solution: ...` — obwohl die Solution gültig ist. Ursache: MSBuild/Solution-Parsing im MCP.

**Verbindliche Regel:**

- `index_solution` ist **kein** primärer Schritt, solange mcp-project-paths.md kein `index_solution: allowed` (mit grünem Smoke-Test) ausweist.
- Stattdessen: `index_project` je betroffenem `.csproj`-Verzeichnis (Routing-Tabelle mcp-project-paths.md).
- `find_in_index`: `projectPath` = **dasselbe** `.csproj`, in dem das Symbol liegt — nicht Backend-Root, nicht Solution-Pfad.
- Wenn `index_project` auf ein Verzeichnis mit `.sln` den Hinweis „use index_solution" liefert: **nicht** blind folgen — zuerst mcp-project-paths.md prüfen; bei Known Issue direkt konkretes `.csproj` indexieren.

Smoke-Tests: [mcp-smoke-test.md](../../../references/mcp-smoke-test.md).

**Schritt 1 — Landkarte (einmal pro Stack/.csproj pro Session/Aufgabe):**

`index_project` mit `projectPath` (MCP container path), `type` (`angular` | `dotnet` | `auto`), `format: llm`.

Multi-.csproj-Backend: nur die für den Scope **nötigen** `.csproj`-Verzeichnisse indexieren — Liste im Deliverable.

Kurz im Agent-Log: 2–3 Sätze — welche Bereiche/Services betroffen, auffällige Abhängigkeiten/Warnungen.

**Schritt 2 — Symbol lokalisieren (bei jedem genannten Typ/Service/Component):**

`find_in_index` mit `query` = exakter oder partieller Name; `projectPath` aus **Backend project routing** (mcp-project-paths.md), nicht pauschal Backend-Root.

Ergebnis nutzen für: Dateipfad, Zeile, Methodenliste, Abhängigkeiten — **bevor** `Grep` auf den Klassennamen.

## Index-Abdeckung & 0-Treffer-Interpretation

| Symbol-Typ | Im Index? | Bei 0 Treffern |
|------------|-----------|----------------|
| Angular Component, Service | Ja | Richtiges `{mcp-frontend-path}`? → dann Filesystem-MCP |
| Angular Guard, Pipe (nicht indexiert), Route-only | Nein / nur Route-Liste | **Kein** erneutes `index_project` — sofort `find_by_content` / Grep auf Dateiname |
| .NET Class/Interface in falschem .csproj | Ja, anderes Projekt | Routing-Tabelle mcp-project-paths.md — anderes `{mcp-be-*}` indexieren |
| String-Literal, Route-Pfad | Nein | Grep |

**Kein Schluss „Symbol fehlt im Repo"** ohne Checkliste (Hard Gate):

1. `projectPath` ist ein Windows-Absolutpfad (`C:\...`)?
2. FE vs. BE vs. konkretes `.csproj` korrekt (Routing-Tabelle)?
3. `index_project` für **dieses** `projectPath` in Session erfolgreich (Output mit Summary)?
4. Symbol-Typ in Abdeckungs-Matrix geprüft?
5. Backend: `index_solution` nur wenn mcp-project-paths.md erlaubt **und** zuvor erfolgreich getestet?
6. Erst danach: `find_by_content` / `find_file` (dev-mcp, Windows-Absolutpfad `C:\...`) → Read/Grep mit dokumentiertem MCP-Fallback

**Verboten:** Mehr als 2 Pfad-/Index-Versuche pro Stack ohne dokumentierten MCP-BLOCKER.

**0 Treffer bei `find_in_index`:** mindestens `find_by_content` oder `find_file` (dev-mcp) — **bevor** natives Read/Grep. Scout-Kette: [repo-scout-protocol/SKILL.md](../../repo-scout-protocol/SKILL.md).

**Schritt 3 — Vertiefung (optional, nach Bedarf):**

| Situation | Tool |
|-----------|------|
| Architektur / Layer / Zyklen | `analyze_type_graph` |
| Vererbung eines bekannten Typs (Scope vor Interface-/Basisklassen-Änderung) | `find_type_hierarchy` (`direction: down` für Implementor-Scope, `up` für Basiskette) |
| Datenfluss zwischen Services | `analyze_dataflow` |
| Umbau an bestehender API | `analyze_refactoring_safety` mit `targetName` |
| Nur Struktur einer Datei, schnell | `analyze_ast_only` auf `filePath` |

**Schritt 4 — Grep/Read (ergänzend, nicht Ersatz für Schritt 1–2):**

- `Grep`: Aufrufketten, String-Literale, Vorkommen einer Methode, Vorkommen in Tests, Markdown, Config.
- `Read`: implementierende Datei, Controller, Template — **nach** Index-Treffer.

**Verboten bei Symbol-Bezug:** als **erste** Reaktion nur `Grep` auf den Klassennamen, wenn der Nutzer explizit eine Klasse/Methode/Property meint und der MCP erreichbar ist.

**Hard Stop:** MCP nicht erreichbar → transparent melden; dann Fallback `Grep`/`Read` mit Hinweis „ohne Landkarte".

## Ausgabe-Regeln

| Agent | Landkarte intern | In Chat / Deliverable |
|-------|------------------|------------------------|
| **buddy-agent** | Pflicht bei explizitem Code-Wunsch oder Symbol-Fragen | **Keine** Code-Dumps im Standard; **Pfade + Symbolnamen + 1-Satz-Kette** |
| **plan-agent** | bei der solo-Planung: `index_project` pro Stack zur Code-Landkarte | Strukturierte Liste: Dateien, Einstiegspunkte, Aufrufketten — **kurze** Zitate nur wenn nötig |
| **Haupt-Chat** | bei Code-Fragen des Nutzers | wie diese Rule |

## Checkliste vor „fertig recherchiert"

- [ ] MCP-`projectPath` als Windows-Absolutpfad aus mcp-project-paths.md?
- [ ] Backend: richtiges `.csproj` aus „Backend project routing"?
- [ ] `index_project` für dieses `projectPath` in der Aufgabe schon gelaufen (oder Cache gültig)?
- [ ] Alle **vom Nutzer genannten** Typen über `find_in_index` aufgelöst (oder Abdeckungs-Matrix + Filesystem-MCP)?
- [ ] Grep nur für Lücken (Caller, Strings, Routes, Guards), nicht als erster Schritt bei Symbol-Frage?
- [ ] UI-only-Bezug nicht fälschlich über Index erzwungen?
- [ ] Bei MCP-Fehler: Hard-Gate-Checkliste abgearbeitet (max. 2 Versuche)?
