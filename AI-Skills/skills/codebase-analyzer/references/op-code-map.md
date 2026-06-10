# Code-Landkarte — Verbindliche Recherche-Reihenfolge

Dieser Abschnitt gilt für **alle** Agenten und Workflows, die Code im Repo betreffen:
Haupt-Chat, **buddy-agent**, **plan-agent**, **plan-agent-scout**, **plan-agent-topic-planner**,
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

## MCP-Werkzeugkette (Planung & Code-Navigation)

**Schritt 0 — Projektwurzel wählen:**

| Stack | `projectPath` / `solutionPath` | `type` | Wann |
|-------|-------------------------------|--------|------|
| Angular FE | `/workspace/{frontend-path}` aus `./AGENTS.md` | `angular` | Standard FE-Stack |
| .NET Backend (Einzelprojekt) | `/workspace/{backend-path}` aus `./AGENTS.md` | `dotnet` | Ein `.csproj`-Root |
| .NET Multi-Projekt | `/workspace/<name>.sln` (Solution-Datei oder Verzeichnis mit `.sln`) | — (Tool: `index_solution`) | Wenn `.sln` im `/workspace/`-Root **oder** `index_project`-Output `projectReferences` / `externalDependencies` zeigt |

`{frontend-path}` und `{backend-path}` sind Platzhalter — die konkreten Werte stehen in `./AGENTS.md` des jeweiligen Projekts. Präfix immer `/workspace/` voranstellen (Container-Pfad, kein Windows-Pfad, kein IDE-relativer Pfad).

Bei Multi-Stack-Aufgaben: **pro Stack einmal** `index_project` (Angular + Einzel-.NET) bzw. **`index_solution`** wenn das Backend eine `.sln` mit mehreren Projekten ist (Cache ~5 min, `useCache: true`).

**Volume-Mount-Voraussetzung:** Die `.cursor/mcp.json` muss `-v ${workspaceFolder}:/workspace:ro` enthalten. Ohne Mount schlagen alle dateibasierten Tools fehl — dann MCP-Fallback deklarieren und auf Read/Grep ausweichen.

**MCP-Pfadauflösung (Docker) — Pflicht-Playbook:**

Bei `index_project`-Fehler: Pfade in dieser Reihenfolge prüfen — **max. 2 Versuche je Stack**:

| Versuch | Pfad |
|---------|------|
| 1 (primär) | `/workspace/{frontend-path}` bzw. `/workspace/{backend-path}` (absolut im Container) |
| 2 (Fallback) | `/workspace` allein als `projectPath` mit `type: auto` |

**Dokumentationspflicht bei Fehler** — jeder fehlgeschlagene Call im Scout-Deliverable:
```
Rufe index_project(projectPath="<Pfad>") → Fehler: <Fehlermeldung>
```
Nach 2 Fehlern pro Stack: **MCP-Fallback deklarieren** (kein weiteres Raten):
```
MCP-Fallback: <Grund>; Anker via Read/Grep: <Liste der Einstiegspunkte>
```

**Fehlerdiagnose:** `File not found: /app/...` = Container-Pfad fehlt `/workspace/`-Präfix — kein Verbindungsproblem.

**Schritt 1 — Landkarte (einmal pro Stack pro Session/Aufgabe):**

`index_project` mit `projectPath`, `type` (`angular` | `dotnet` | `auto`), `format: llm`.

**Entscheidungspunkt .NET Multi-Projekt:** Wenn der `index_project`-Output `projectReferences` oder `externalDependencies` enthält → **`index_solution(solutionPath)`** als Folgeaufruf (gleiche Session, Cache ~5 min). Danach `find_in_index` / `find_symbol_references` / `analyze_refactoring_safety` mit dem **Solution-Pfad** (`.sln` oder Solution-Verzeichnis) statt nur `{backend-path}`.

Kurz im Agent-Log: 2–3 Sätze — welche Bereiche/Services betroffen, auffällige Abhängigkeiten/Warnungen.

**Schritt 2 — Symbol lokalisieren (bei jedem genannten Typ/Service/Component):**

`find_in_index` mit `query` = exakter oder partieller Name.

Ergebnis nutzen für: Dateipfad, Zeile, Methodenliste, Abhängigkeiten — **bevor** `Grep` auf den Klassennamen.

**0 Treffer bei `find_in_index`:** mindestens `find_by_content` oder `find_file` (dev-filesystem-mcp) — **bevor** natives Read/Grep. Scout-Kette: [repo-scout-protocol/SKILL.md](../../repo-scout-protocol/SKILL.md).

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
| **plan-agent-scout** | Pflicht Phase 3 | Strukturierte Liste: Dateien, Einstiegspunkte, Aufrufketten — **kurze** Zitate nur wenn nötig |
| **plan-agent** | vor Scout-Delegation optional einmal `index_project` pro Stack | Scout-Auftrag enthält **bereits indexierte** Anker |
| **Haupt-Chat** | bei Code-Fragen des Nutzers | wie diese Rule |

## Checkliste vor „fertig recherchiert"

- [ ] Stack-Wurzel (`frontend` / `backend`) gewählt?
- [ ] `index_project` für diesen Stack in der Aufgabe schon gelaufen (oder Cache gültig)?
- [ ] Alle **vom Nutzer genannten** Typen über `find_in_index` aufgelöst?
- [ ] Grep nur für Lücken (Caller, Strings, Routes), nicht als erster Schritt bei Symbol-Frage?
- [ ] UI-only-Bezug nicht fälschlich über Index erzwungen?
