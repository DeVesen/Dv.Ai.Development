---
name: code-review-mcp
description: >
  Aktiviere diesen Skill sobald der User über Code spricht — egal ob er plant,
  gerade schreibt oder fertig ist. Der MCP hat 23 Tools für Angular und .NET.
  Dieser Skill erklärt welche Tools es gibt und wann sie einzusetzen sind.
  Bei Code-Symbolen (Klasse, Methode, Property, Service, Route): zuerst
  index_project/find_in_index, Grep nur ergänzend. UI-Labels ohne Symbol:
  keine Landkarte. Siehe Abschnitt Code-Landkarte.
---

# Code-Review-MCP

## Alle verfügbaren Tools

### ① Code Review
| Tool | Was es tut |
|------|------------|
| `review_file` | Einzelne Datei vollständig analysieren — SOLID, Security, Performance, Best Practices. Gibt Score 1–10 und konkrete Fixes. |
| `review_code` | Code direkt aus dem Chat reviewen (Copy-Paste, kein Dateipfad nötig). |
| `review_git_diff` | Alle Änderungen seit dem letzten Commit reviewen — staged oder unstaged. |
| `review_files_batch` | Mehrere Dateien auf einmal reviewen, kombinierter Report. |
| `analyze_ast_only` | Nur Struktur lesen ohne LLM — Klassen, Methoden, Abhängigkeiten. Sehr schnell, ideal für CI. |

### ② Projekt-Index & Navigation
| Tool | Was es tut |
|------|------------|
| `index_project` | Vollständige Landkarte des Projekts: alle Klassen, Services, Components, Routes, Abhängigkeitsgraph, Architektur-Warnungen. Wird gecacht (5 min). |
| `find_in_index` | Gezielt nach einer Klasse, einem Service oder Interface suchen — gibt Datei, Zeile, Methoden und Abhängigkeiten zurück. |
| `review_with_index` | Review einer Datei mit vollem Projektkontext — das LLM sieht den ganzen Abhängigkeitsgraphen bevor es die Datei liest. |

### ③ Erweiterte Code-Analyse
| Tool | Was es tut |
|------|------------|
| `analyze_complexity` | Zyklomatische Komplexität pro Methode — zählt alle Verzweigungen (if, for, &&, catch …). Ab CC≥10 Warnung, ab ≥15 kritisch. |
| `analyze_dead_code` | Findet Code der nicht mehr genutzt wird: private Methoden/Felder die nie aufgerufen werden, unused Imports, nie verwendete Interfaces. |
| `analyze_nullability` | Stellen wo das Programm abstürzen kann weil ein Wert unerwartet leer ist: !, .Result, FirstOrDefault().Property ohne Check, subscribe ohne error-Handler. |
| `analyze_duplicates` | Findet Methoden mit identischer Logik an verschiedenen Stellen — via normalisiertem AST-Hash (erkennt Duplikate trotz anderer Variablennamen). |
| `analyze_refactoring_safety` | Zeigt wie viele Stellen im Projekt eine Methode oder Klasse verwenden, ob sie Teil eines Interface-Kontrakts ist, ob Templates betroffen sind. Risikoabschätzung vor dem Umbau. |
| `generate_auto_fixes` | Erstellt konkrete Before/After-Fixes: Angular (@Input→input(), *ngIf→@if, \| async→toSignal(), OnPush), .NET (.Result→await, fehlende CancellationToken, null-Guards). |
| `analyze_dataflow` | Verfolgt wie Daten zwischen Klassen fließen — findet nullable Rückgabewerte die ohne Null-Check weiterverwendet werden, nicht-awaitete Tasks, unsubscribed Observables. |
| `analyze_advanced_all` | Führt alle 7 obigen Analysen in einem Aufruf aus und liefert einen Gesamtbericht. |

### ④ Klassen-Schnitt
| Tool | Was es tut |
|------|------------|
| `suggest_class_splits` | Berechnet LCOM-Score (Kohäsion), findet Methoden-Cluster via Union-Find, erstellt eine Field-Access-Map und schlägt konkrete Splits vor — mit neuen Klassennamen und Methoden-Zuteilung. Urgency: none / low / medium / high / critical. |

### ⑤ Code Intelligence
| Tool | Was es tut |
|------|------------|
| `analyze_maintainability_index` | Berechnet den Microsoft Maintainability Index (0–100, Note A–F) pro Methode aus Halstead-Volumen + Zyklomatischer Komplexität + Lines of Code. Dazu LCOM (Kohäsion) pro Klasse. |
| `analyze_type_graph` | Vollständiger Typ-Graph: alle Klassen, Interfaces, Enums, Records als Nodes; extends/implements/injects/returns als Edges. Findet Zyklen, Orphan-Typen, Layer-Violations und meistverwendete Typen. |
| `analyze_control_flow` | Baut ein Kontrollflussmodell pro Methode: findet unerreichbaren Code nach return/throw, immer-wahre Bedingungen, fehlende Return-Pfade, Endlosschleifen, nested subscribe() (Angular), async void (.NET). |

### ⑥ Test-Qualität & Coverage
| Tool | Was es tut |
|------|------------|
| `analyze_coverage` | Liest lcov.info (Angular) oder coverage.cobertura.xml (.NET) und zeigt Line/Branch/Function-Coverage pro Datei, Grade A–F, nicht-gecoverte Methoden namentlich. Kein eigener Test-Run — braucht vorhandenen Report. |
| `analyze_test_quality` | Analysiert Testdateien statisch ohne sie auszuführen: findet Tests ohne Assertions, Tautologien (expect(true).toBe(true)), Mock-Heavy-Tests, fehlende Fehler-Szenarien, blockierendes async. |
| `analyze_test_health` | Kombiniert Coverage-Report und Test-Qualität in einem Dashboard — zeigt priorisiert was zuerst angegangen werden sollte. |

---

## Wichtige Parameter

- `projectPath` = Wurzelverzeichnis des Projekts
- `type` = `"angular"` oder `"dotnet"` (oder `"auto"` für automatische Erkennung)
- `filePath` = absoluter oder relativer Pfad zur Datei
- Kein Build nötig für 20 der 23 Tools — nur die Coverage-Tools brauchen einen vorherigen Test-Run

---

## Code-Landkarte — Verbindliche Recherche-Reihenfolge

Dieser Abschnitt gilt für **alle** Agenten und Workflows, die Code im Repo betreffen:
Haupt-Chat, **buddy-agent**, **plan-agent**, **plan-agent-scout**, **plan-agent-topic-planner**,
Implementierung/Review — sobald der Nutzer oder die Anforderung **programmierbare Symbole** meint.

### Grundsatz

**Backend (.NET) und Frontend (Angular) sind Code.** Wenn von einer **Stelle im Code** die Rede ist,
wird zuerst die **strukturelle Landkarte** (Projekt-Index) genutzt — **nicht** sofort `Grep`/`rg`.

**Kein Code-Landkarten-Pfad** für rein **UI-/Domänen-Sprache** ohne programmierbares Symbol, z. B.:
„OK-Button", „Artikel-Input", „Speichern-Klick", „Tab Versuche", sichtbarer Button-Text in der Oberfläche.
Dort: bestehende UX-/Test-/i18n-Recherche (Labels, `aria-label`, Template-Text, E2E-Selektoren,
Komponenten-Namen wenn der Nutzer sie nennt) — **ohne** `index_project` nur wegen eines Button-Worts.

### Entscheidungsbaum (Pflicht vor jeder Code-Recherche)

| Nutzer / Anforderung meint … | Erste Aktion | Danach |
|------------------------------|--------------|--------|
| **Klasse, Interface, Service, Component, Record, Enum, Namespace** | `index_project` (falls Session/Cache fehlt) → `find_in_index` | `Read` der genannten Datei; Grep nur für fehlende Details |
| **Methode, Funktion, Property, Feld, Route, Endpoint, DI-Token** (Name bekannt) | wie oben mit `query` = Typ- oder Container-Name; Methode per `Read` + ggf. `analyze_ast_only` | Grep **nur** für Aufrufer wenn Index/Datei nicht reicht |
| **„Von hier nach dort"** (zwei Code-Anker: Datei+Zeile oder zwei Symbole) | `find_in_index` für beide Anker-Typen; optional `analyze_type_graph` / `analyze_dataflow` für Klassen-/Service-Grenzen | Grep für konkrete Aufrufzeilen; keine Spekulation ohne Fundstelle |
| **Ordner, Feature, Modul** („im FileService", „Search-Grid") | `index_project` → `find_in_index` mit Teilstring | gezieltes `Read` |
| **UI-Element, Label, Flow in der Oberfläche** (ohne Klassenname) | **Kein** Index-Zwang | Suche nach Komponente/Template/Übersetzung; erst bei genanntem `@Component`/`selector` → Landkarte |
| **Unklar** (Code vs. UI?) | **Eine** Klärungsfrage | dann Entscheidungsbaum |

### MCP-Werkzeugkette (Planung & Code-Navigation)

**Schritt 0 — Projektwurzel wählen:**

| Stack | `projectPath` | `type` |
|-------|---------------|--------|
| Angular FE | `{frontend-path}` aus `./AGENTS.md` | `angular` |
| .NET Backend | `{backend-path}` aus `./AGENTS.md` | `dotnet` |

`{frontend-path}` und `{backend-path}` sind Platzhalter — die konkreten Werte stehen in `./AGENTS.md` des jeweiligen Projekts.
Bei Multi-Stack-Aufgaben: **pro Stack einmal** `index_project` (Cache ~5 min, `useCache: true`).

**MCP-Pfadauflösung (Docker/Windows) — Pflicht-Playbook:**

Bei `index_project`-Fehler: Pfade in dieser Reihenfolge prüfen — **max. 2 Versuche je Stack**:

| Versuch | Pfad |
|---------|------|
| 1 (primär) | `{frontend-path}` bzw. `{backend-path}` (relativ, aus `./AGENTS.md`) |
| 2 (Fallback) | `/workspace/{frontend-path}` bzw. `/workspace/{backend-path}` (absolut im Container) |

**Dokumentationspflicht bei Fehler** — jeder fehlgeschlagene Call im Scout-Deliverable:
```
Rufe index_project(projectPath="<Pfad>") → Fehler: <Fehlermeldung>
```
Nach 2 Fehlern pro Stack: **MCP-Fallback deklarieren** (kein weiteres Raten):
```
MCP-Fallback: <Grund>; Anker via Read/Grep: <Liste der Einstiegspunkte>
```

### Bekannte MCP-Limitation (Docker ohne Volume-Mount)

Das `code-review-mcp`-Image läuft laut `.cursor/mcp.json` **ohne** `-v`-Mount. Ohne Volume-Mount hat der Container keinen Zugriff auf Projektdateien — `index_project` und `find_in_index` scheitern, bis die IDE (Cursor) den Workspace automatisch bereitstellt oder ein Mount in `.cursor/mcp.json` ergänzt wird. Die Pfade aus der Tabelle oben (relativ `{frontend-path}` / `/workspace/{frontend-path}`) gelten nur wenn ein Mount aktiv ist. **Kein Raten** über die zwei dokumentierten Versuche hinaus.

**Schritt 1 — Landkarte (einmal pro Stack pro Session/Aufgabe):**

`index_project` mit `projectPath`, `type` (`angular` | `dotnet` | `auto`), `format: llm`.

Kurz im Agent-Log: 2–3 Sätze — welche Bereiche/Services betroffen, auffällige Abhängigkeiten/Warnungen.

**Schritt 2 — Symbol lokalisieren (bei jedem genannten Typ/Service/Component):**

`find_in_index` mit `query` = exakter oder partieller Name.

Ergebnis nutzen für: Dateipfad, Zeile, Methodenliste, Abhängigkeiten — **bevor** `Grep` auf den Klassennamen.

**Schritt 3 — Vertiefung (optional, nach Bedarf):**

| Situation | Tool |
|-----------|------|
| Architektur / Layer / Zyklen | `analyze_type_graph` |
| Datenfluss zwischen Services | `analyze_dataflow` |
| Umbau an bestehender API | `analyze_refactoring_safety` mit `targetName` |
| Nur Struktur einer Datei, schnell | `analyze_ast_only` auf `filePath` |

**Schritt 4 — Grep/Read (ergänzend, nicht Ersatz für Schritt 1–2):**

- `Grep`: Aufrufketten, String-Literale, Vorkommen einer Methode, Vorkommen in Tests, Markdown, Config.
- `Read`: implementierende Datei, Controller, Template — **nach** Index-Treffer.

**Verboten bei Symbol-Bezug:** als **erste** Reaktion nur `Grep` auf den Klassennamen, wenn der Nutzer explizit eine Klasse/Methode/Property meint und der MCP erreichbar ist.

**Hard Stop:** MCP nicht erreichbar → transparent melden; dann Fallback `Grep`/`Read` mit Hinweis „ohne Landkarte".

### Ausgabe-Regeln

| Agent | Landkarte intern | In Chat / Deliverable |
|-------|------------------|------------------------|
| **buddy-agent** | Pflicht bei explizitem Code-Wunsch oder Symbol-Fragen | **Keine** Code-Dumps im Standard; **Pfade + Symbolnamen + 1-Satz-Kette** |
| **plan-agent-scout** | Pflicht Phase 3 | Strukturierte Liste: Dateien, Einstiegspunkte, Aufrufketten — **kurze** Zitate nur wenn nötig |
| **plan-agent** | vor Scout-Delegation optional einmal `index_project` pro Stack | Scout-Auftrag enthält **bereits indexierte** Anker |
| **Haupt-Chat** | bei Code-Fragen des Nutzers | wie diese Rule |

### Checkliste vor „fertig recherchiert"

- [ ] Stack-Wurzel (`frontend` / `backend`) gewählt?
- [ ] `index_project` für diesen Stack in der Aufgabe schon gelaufen (oder Cache gültig)?
- [ ] Alle **vom Nutzer genannten** Typen über `find_in_index` aufgelöst?
- [ ] Grep nur für Lücken (Caller, Strings, Routes), nicht als erster Schritt bei Symbol-Frage?
- [ ] UI-only-Bezug nicht fälschlich über Index erzwungen?

---

## Die drei Phasen

### 🟡 PLANUNG — bevor Code geschrieben wird

Signale: "Ich will bauen…", "Wir planen…", "Wie gehe ich das an?", "Ich will X ändern…"

Relevante Tools: `index_project` · `find_in_index` · `suggest_class_splits` · `analyze_refactoring_safety` · `analyze_type_graph` · `analyze_maintainability_index` · `analyze_dataflow`

**Gewinn:** Weiß vor dem ersten Tastendruck was vorhanden ist, was bricht und wie der beste Schnitt aussieht.

### 🔵 IMPLEMENTIERUNG — während oder direkt nach dem Schreiben

Signale: "Schau dir das an…", "Ist das okay?", "Vor dem Commit…", "Hier mein Code…"

Relevante Tools: `review_file` · `review_code` · `review_git_diff` · `review_files_batch` · `analyze_nullability` · `analyze_complexity` · `generate_auto_fixes` · `analyze_control_flow` · `analyze_dead_code` · `analyze_ast_only`

**Gewinn:** Sofortiges Feedback wie ein erfahrener Kollege — mit konkreten Fixes, nicht nur Hinweisen.

### 🟢 NACH IMPLEMENTIERUNG — nach Tests und vor dem Merge

Signale: "Tests laufen durch…", "Feature ist fertig…", "Vor dem Merge…", "Sprint-End…", "Release…"

Relevante Tools: `analyze_coverage` · `analyze_test_quality` · `analyze_test_health` · `analyze_duplicates` · `review_with_index` · `review_files_batch` · `analyze_advanced_all`

**Gewinn:** Vollständiges Qualitätsbild — was ist getestet, was ist gut getestet, was fehlt noch vor dem Merge.

> ⚠️ `analyze_coverage` und `analyze_test_health` benötigen einen vorherigen Test-Run mit Coverage-Flag:
> Angular: `ng test --code-coverage` · .NET: `dotnet test --collect:"XPlat Code Coverage"`
