# Subagent-Prompts — feature-delivery

Vorlagen zum Kopieren. Platzhalter in eckigen Klammern ersetzen.

**Ausgabe-Stil aller Handoffs: MACHINE-DENSE** — Kein Fliesstext, keine Rollenwiederholung, Key:Value wo ausreichend. Deliverables zurück an den dispatchenden Agent (Plan-Orchestrator bzw. PL/Session-Treiber im Impl-Flow): MACHINE-DENSE. Review-Deliverables: BULLET-TERSE (User-sichtbar).

**Agent-Typ (Pflicht):** Profil unter `.claude/agents/`. **Modell:** Agent-Profil lesen; Slugs nicht in Prompts duplizieren.

**Compliance (Pflicht):** Vor jedem Subagent `subagent-delegation-boilerplate.md` in den Task-Prompt.

**Datei-Handoff (Impl-Review-Loop — Pflicht):** Reviewer und Scribes schreiben ihr Deliverable in **eine eigene Datei** unter dem vom PL (`implement-round-executor`) übergebenen Runden-Pfad `requests/plans/<feature>/iteration-N/round-M/` und geben **nur Datei-Pointer + Verdikt-Kurzform** zurück — **kein Report-Body im Agent-Return**. Verzeichnis-Layout, Dateinamen, Tabellen-Schema und Verdikt-Kurzformen: [secondbrain-schema.md](secondbrain-schema.md). Ein Return, der den vollen Report inline enthält, gilt als Regelverstoß gegen das Pointer-only-Format.

Vorlagen sind **Auftrags-Payloads** (Platzhalter) — kein Ersatz für Agent-Profile.

---

## Planungs-Agents

### Plan-Orchestrator (plan-agent)

Orchestriert alle 6 Planungs-Phasen. Wird als delegierter Agent gestartet (Opus). Phasen 1, 2, 4a, 4c und 6 laufen im Orchestrator selbst; Phasen 3 und 4b delegieren an Scouts bzw. Topic-Planer.

```text
Profil:plan-agent|Planungs-Orchestrator|kein-Impl

Feature/Anforderung:
[Nutzer-Prompt — vollständig]

Einstieg:[End-to-end | Plan-only | Lean-Mode]
  Lean-Mode: Orchestrator plant + prüft + reviewed in sich selbst —
  keine Scouts, keine Review-Subagent-Armee, kein 5er-Loop.
  Test-First-Akzeptanzliste (§8/F1) bleibt Pflicht auch im Lean-Mode.

MCP-Pfade (Literale vor Versand eintragen):
  FE: [MCP_FRONTEND_PATH]
  BE-Projekte: [MCP_BE_PROJECTS]
  BE-Solution (optional): [MCP_BACKEND_SOLUTION]

Phasen-Ablauf:

Phase 1+2 — Anforderung klären (ohne Code):
  Anforderung strukturieren: Ziel, Scope, Nicht-Scope, offene Fragen.
  Bei Unklarheiten: Nutzer fragen — warten — dann weiter.
  Bounded-Context-Frage (§12/A): Ist dies eine service-übergreifende Anforderung?
  Falls ja: Bounded-Context-Grenzen, Ubiquitous Language, geteilte vs. service-eigene Modelle explizit benennen.

Phase 3 — Scouts (bis 10 parallel):
  Subagent-Vorlage: "Codebereichs-Scout (plan-agent-scout)" aus dieser Datei.
  Test-Kartierung (§8/F3): Scouts kartieren bestehende Test-Abdeckung des Bereichs mit.
  Vorsicht codebase-analyzer: analyze_coverage (Stale-Reports), detect_untested_public_api
  (False-Positives bei Integration-Tests) — als Hinweis, nicht alleinige Wahrheit.
  Scout-Ergebnisse vor Phase 4a zusammenführen.

Phase 4a — Interface-Design / Topic-Map:
  Topic-Map + Schnittstellen-Vertrag + Sequence-Diagramm (bei >= 2 Topics).
  Subagent-Vorlage: "Interface-Designer (Phase 4a)" aus dieser Datei.
  Bounded-Context-Denken: jeden Service als eigene Domäne behandeln.

Phase 4b — Topic-Planer (bis 10 parallel):
  Je Topic genau ein Subagent. Subagent-Vorlage: "Topic-Planer" aus dieser Datei.
  Pflicht je Topic: Akzeptanz→Test-Liste (§8/F1) — konkrete Testfall-Skizzen mit
  Testname (<Method>_<Situation>_<Expected>), Arrange/Act/Assert-Stichpunkte,
  Markierung neu / erweitern / unberührt.

Phase 4c — Merge zur Arbeitsversion:
  Subagent-Vorlage: "Merger (Phase 4c)" aus dieser Datei.

Plan-Review-Loop (max. 5 Iterationen):
  6 Reviewer parallel: guard · risk · readiness · craft · auditor · design-principles
  Vorlagen: Abschnitte "Plan-Review-*" in dieser Datei.
  Findings? ja → Plan-Fixer (Opus, Vorlage "Plan-Fixer") → nächste Iteration
             nein / Max erreicht → weiter nach Phase 6
  Stopp-Logik (A2): offene KRITISCH-Findings nach Max 5 → Auto-Handoff gestoppt;
  nur unkritische Rest-Findings → Phase 6 läuft mit dokumentierter Warnung.
  Plan-Fixer-Blocker (A1): Finding erfordert größere Änderung → Orchestrator macht
  gezieltes Topic-Re-Planning (Mini-4a/4b), Loop wird fortgesetzt.

Phase 6 — Synthese:
  Subagent-Vorlage: "Synthesizer (Phase 6)" aus dieser Datei.
  Liefert: Review-Digest + Komplexitäts-/Executor-Empfehlung + finale Akzeptanz→Test-Liste
  + Umsetzungs-Topologie (Slices/Wellen).
  Plan-Fixer ändert geflaggte Abschnitte — Phase 6 macht keine inhaltliche Plan-Reparatur mehr.

Persistenz (A3): Plan als Datei unter requests/plans/plan-<feature>.md speichern.
  <feature>-Slug aus Nutzer-Prompt oder ADO-ID.

Einstieg-Weiche:
  Plan-only → STOPP nach Persistenz (Nutzer reviewt Datei).
  End-to-end → AUTOMATISCH → Implementations-Flow.
```

---

### Codebereichs-Scout (plan-agent-scout)

Bei **Multi-Scout** (bis **10** parallele Task-Subagents, Phase 3):
je Lauf **einen** eng begrenzten **Teil-Scope**; Platzhalter **Scout-ID** und **Teil-Scope** setzen. Der Hauptagent führt die Scout-Ergebnisse vor Phase 4a zusammen.

```text
Profil:plan-agent-scout|read-only|kein-Plan|keine-Impl

Scout-ID (Multi-Scout): [z.B. SCOUT-FE-1 — weglassen wenn Single-Scout]
Teil-Scope: [Pfade/Module/Services — nur dieser Bereich; weglassen wenn Single-Scout]

Req:[Bullets — nur Thread-Fakten, nichts erfinden, max. 5]

MCP-Pfade (aus Projekt-Dokumentation — vor Versand Literale eintragen):
  FE: [MCP_FRONTEND_PATH]   (= MCP container path FE — /workspace/... für codebase-analyzer)
  BE-Projekte: [MCP_BE_PROJECTS]  (= Liste .csproj-Container-Pfade)
  BE-Solution (optional): [MCP_BACKEND_SOLUTION]  (= nur wenn index_solution erlaubt)

Fokus (Pflicht): Nur Code/Flows kartieren, die **direkt** für diese Anforderung nötig sind —
kein blindes Repo-Scouting, kein Scope-Creep außerhalb Teil-Scope/Anforderung.

Test-Kartierung (§8/F3): Bestehende Test-Abdeckung des Teil-Scopes kartieren —
welche Tests existieren, welche Bereiche sind ungedeckt (neu vs. erweitern vs. unberührt)?
Vorsicht: analyze_coverage liefert Stale-Reports; detect_untested_public_api hat
False-Positives bei Integration-Tests — als Hinweis verwenden, nicht alleinige Wahrheit.

Aufgabe (MCP zuerst — Fallback Read/Grep nur wenn MCP nicht verfügbar):

Schritt 1 — Basis-Landkarte (Pflicht):
   index_project(projectPath="[MCP_FRONTEND_PATH]", type="angular") für FE (nur wenn FE im Scope).
   index_project je BE-Projektpfad, type="dotnet" für BE — nicht pauschal Backend-Root.
   find_in_index mit demselben projectPath wie index_project.
   Alle genannten Symbole via find_in_index auflösen.
   Bei 0 Treffern: find_by_content oder find_file (dev-mcp) BEVOR Read/Grep.
   Skill repo-scout-protocol vollständig — Scout-Protokoll-Tabelle im Deliverable.
   Bei Fehler: max. 2 Versuche je Stack dokumentieren, dann MCP-Fallback erklären.
   UI-only-Begriffe ohne Symbol ausnehmen.

Schritt 1b — Dev-MCP (Pflicht bei Index-Miss — repo-scout-protocol):
   Nach find_in_index, wenn konkrete Dateipfade bekannt:
   - read_class_summary / read_signatures_only / find_implementations
   Pfade: Windows-Absolutpfade (C:\...).
   Fallback wenn nicht verfügbar: Schritt 1 allein genügt.

Schritt 2 — Erweiterte MCP-Analyse (nach find_in_index, wenn konkrete Klassen/Methoden aufgelöst):
   A. analyze_complexity auf betroffene Dateien (primär) | Fallback: Methoden-Länge via Grep
      — Bedingung: mind. 1 Klasse/Methode im Scope aufgelöst
   B. analyze_refactoring_safety auf Klassen, die strukturell geändert werden (primär)
      — Bedingung: nur wenn Umbau geplant
   C. suggest_class_splits auf Klassen mit >1 Verantwortung (primär)
      — Bedingung: nur wenn Klasse zu groß oder mehrdeutig
   D. analyze_maintainability_index auf betroffene Dateien (primär)
      — Bedingung: wie Schritt A (mind. 1 Klasse im Scope)
   E. analyze_type_graph auf betroffene Dateien (primär)
      — Bedingung: mind. 2 Klassen/Services im Scope und Schnittstellen oder Rückgabetypen betroffen
   Kein Schritt 2 bei: ausschließlich UI-Labels, nach ausgeschöpfter MCP-Kette ohne Auflösung, rein neuen Dateien.

0. MCP-Analyse-Status (Pflicht-Header, erste Zeile im Deliverable):
   `MCP: ok` wenn Schritt 1 + Schritt 2 erfolgreich;
   sonst `MCP: fallback (<Grund>); Anker via Read/Grep: <Liste>`.
1. Identifiziere die voraussichtlich betroffenen Dateien und Ordner (relativ zum Repo-Root).
2. Nenne konkrete Einstiegspunkte (Komponenten, Services, Routen, Konfiguration).
3. Beschreibe kurz den Nachbarschaftskontext (was ruft was auf, relevante Schnittstellen).
4. Liste Risiken und Annahmen auf, die noch verifiziert werden müssten.
5. Markiere offene Lücken: Was konnte beim Scouting nicht geklärt werden?
6. Komplexitäts-Hotspots: Klasse · Metric · Handlungsempfehlung — oder "nicht gerufen — <Grund>".
7. Refactoring-Risiken: kritisch | unkritisch — oder "nicht gerufen — <Grund>".
8. Split-Kandidaten: <Liste> — oder "nicht gerufen — <Grund>".
9. Clean-Code-Metriken (Maintainability): Methoden mit MI < 65 (Note C–F) oder LCOM > 0,7 · Handlungsempfehlung.
10. Typ-Smells (Type Graph): Tuple-Returns, fehlende Model/DTO-Typen, Parameter-Listen > 3 in betroffenen Signaturen.
11. Test-Kartierung: bestehende Tests im Scope · ungedeckte Bereiche · neu / erweitern / unberührt.

Deliverable:strukturierte Aufzählung — kein Code, kein Umsetzungsplan. Stil:MACHINE-DENSE.
```

---

### Interface-Designer (Phase 4a)

Ein Lauf mit Agent-Typ **`plan-agent-interface-designer`** — nach Scout-Zusammenführung, **vor** Phase 4b. Kein Parallelstart mit Topic-Planern.

```text
Profil:plan-agent-interface-designer|Topic-Map+Schnittstellen-Vertrag|kein-Gesamtplan|kein-Review|keine-Teilpläne

Scout-Merge (Pflicht — alle Scout-Deliverables, Positionen 0–11 je Scout):
[Zusammenführung aller Scout-Rückgaben: MCP-Status, Dateien, Einstiegspunkte, Nachbarschaft, Risiken, Lücken, Hotspots, Test-Kartierung]

Req:[Bullets — Auszug Phasen 1–2, max. 5]

Bounded-Context-Kontext (falls service-übergreifend):
[Bounded-Context-Grenzen + Ubiquitous Language aus Phase 1+2]

Aufgabe:

1. **Topic-Map:** Liste aller Topics (z.B. TOPIC-FE-Search, TOPIC-BE-GW,
   TOPIC-BE-AppService, TOPIC-BE-EF) mit kurzer Verantwortungsbeschreibung.
   Topics sind Planungs-IDs (TOPIC-*); IMP-Slice-IDs folgen in Phase 6.

2. **Schnittstellen-Vertrag:** Pro Topic-Grenze: eingehend/ausgehend
   (HTTP-Route, DTO, Methoden-Signatur, Events). Keine stillen Annahmen zwischen Topics.
   Bei service-übergreifenden Features: Anti-Corruption-Layer-Punkte markieren.

3. **Sequence-Diagramm (Pflicht bei >= 2 Topics):** Mermaid-Diagramm oder
   tabellarische Darstellung der Aufrufkette (UI-Aktion → Gateway → AppService → DB).

4. **Offene Punkte:** Unaufgelöste Scout-Findings, die den Schnittstellen-Vertrag
   beeinflussen — explizit markieren.

MCP-Nachverifikation (nur bei konkreten Lücken im Schnittstellen-Vertrag):
   Fehlende Signatur oder unbekannter Typ → find_in_index mit projectPath.
   Ergebnis (ok/fallback) festhalten.

Deliverable:Topic-Map + Schnittstellen-Vertrag (+ Sequence-Diagramm bei >= 2 Topics) — kompakt, vollständig. Stil:MACHINE-DENSE.
```

---

### Topic-Planer (plan-agent-topic-planner)

Bei **Multi-Topic** (bis **10** parallele Task-Subagents, Phase 4b): je Lauf **genau ein** Topic. Der Hauptagent merged in Phase 4c.

```text
Profil:plan-agent-topic-planner|nur-dieser-Topic|kein-Gesamtplan|kein-Review|keine-Impl

Topic-ID:[z.B. TOPIC-FE-Search]
Topic-Scope:[Pfade/Module/Service — nur dieser Bereich]
Tech-Mindset:[z.B. Angular Frontend | .NET Gateway | EF Core]

Vertrag (Phase 4a, nur dieses Topic):
eingehend:[…] ausgehend:[…] — Routen/DTOs/Signaturen

Req:[Bullets — Auszug Phasen 1–2, max. 5]

Scout:[Bullets — relevante Dateien, Einstiegspunkte, Nachbarschaft + Test-Kartierung dieses Topics]

Aufgabe (MCP zuerst — Fallback nur bei MCP-Fehler):

MCP-Vorbereitung (vor Schritt-Formulierung, wenn bestehende Klassen im Topic-Scope):
   A. analyze_complexity auf Topic-relevante Dateien (primär)
      — Bedingung: mind. 1 bestehende Klasse im Scope
   B. analyze_refactoring_safety auf Klassen, die umgebaut werden (primär)
      — Bedingung: nur wenn Klassen-Umbau geplant
   Kein Call bei reinen Neu-Implementierungen. Ergebnisse in Risiken (Schritt 4) einbetten.

Clean-Code-Constraints (aus Scout-Deliverable, Positionen 6–10):
   - Methoden mit MI < 65 oder LCOM > 0,7 im Topic-Scope: als Refactor-Deliverable in Schritt 1 einplanen
   - Parameter-Listen > 3 in geplanten Signaturen: Konfigurationsobjekt / Record einplanen
   - Tuple-Returns in neuen oder geänderten Methoden: benanntes DTO / Record vorschreiben
   - Nur auf betroffene Klassen im Topic-Scope anwenden — kein Scope-Creep

1. Konkrete Umsetzungsschritte NUR für dieses Topic (Dateien, Klassen, Komponenten).
2. Einstiegspunkte und betroffene Pfade (relativ zum Repo-Root).
3. **Akzeptanz→Test-Liste (Pflicht, §8/F1):**
   Pro Akzeptanzkriterium: Testname (<Method>_<Situation>_<Expected>), Arrange/Act/Assert-Stichpunkte,
   Markierung: neu / erweitern / unberührt. Konkrete Testfall-Skizzen — nicht abstrakte Kriterien.
   Basis: Scout-Test-Kartierung (Position 11). "User kann sich einloggen" ist nicht ausreichend —
   der Scribe muss 1:1 übersetzen können.
4. Risiken und offene Punkte (Topic-lokal).
5. **Pflicht — Parallele Implementierung:** Welche Teil-Arbeiten/Dateien können parallel umgesetzt werden?
   Welche Blocking-Deps zu anderen Topics? Contract-first-Hinweise gemäß Schnittstellen-Vertrag aus 4a.
6. **Pflicht — Vorgeschlagene IMP-Slice-IDs:**
   `IMP-FE-{Bereich}-…` bzw. `IMP-BE-{ServiceKürzel}-…` plus Wellen-/Blocking-Hinweis.

Deliverable:strukturierter Teilplan für genau ein Topic — kein Code, kein Gesamtplan. Stil:MACHINE-DENSE.
```

---

### Merger (Phase 4c)

Ein Lauf mit Agent-Typ **`plan-agent-merger`** — nach Abschluss aller Topic-Planer aus 4b, **vor** dem Plan-Review-Loop.

```text
Profil:plan-agent-merger|merge-Teilpläne→Arbeitsversion|kein-Scout|kein-Review|keine-Impl

Vertrag (Phase 4a — vollständig):
[Topic-Map + Schnittstellen-Vertrag + Sequence-Diagramm aus Interface-Designer-Deliverable]

Teilpläne (Phase 4b — alle):
[Alle plan-agent-topic-planner-Deliverables — je Topic vollständig inkl. Akzeptanz→Test-Liste]

Req:[Bullets — Auszug Phasen 1–2, max. 5]

Aufgabe:

1. Führe alle Topic-Teilpläne zu einer **Arbeitsversion** zusammen
   (startfähig für den Review-Loop ohne weitere Recherche).

2. **Drift-Prüfung (Pflicht):** Schnittstellen aus Phase 4a vs. Teilpläne —
   Abweichungen, Lücken, Widersprüche auflösen oder als Nutzerfrage markieren.

3. Gesamtübersicht: relevante Dateien, Einstiegspunkte, Schritte,
   Akzeptanz→Test-Listen (konsolidiert, vollständig), Risiken, offene Fragen.

4. **IMP-Slices ableiten:** Konsistente Slice-Tabelle aus den Topic-Teilplan-Vorschlägen.
   Keine neuen Slices erfinden — nur aus Teilplan-Deliverables übernehmen,
   Konflikte auflösen, Duplikate bereinigen.

5. **Multi-Subagent-Aufteilung:** Arbeitspakete, Parallelität, Blocking, gemeinsame
   Artefakte, Interface-first, E2E-Prüfung — oder Begründung Single-Agent.

6. **Wellen und Blocking** für Phase 6 vorbereiten
   (W0 contract-first, W1 parallele Slices, W2 Integration).

Deliverable:vollständige Arbeitsversion — kompakt, konsistent, Review-Loop-bereit. Stil:MACHINE-DENSE.
```

---

### Plan-Review-Guard (plan-review-guard-agent)

```text
Profil:plan-review-guard-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. Akzeptanz→Test-Liste]

Prüfe:
- Worin liegt die Stärke und Plausibilität?
- Welche Vereinfachungen oder Abkürzungen wären möglich, ohne das Ziel zu verfehlen?
- Welche Chancen oder positiven Nebeneffekte sind realistisch?
- Multi-Subagent/Orchestrierung: Sind Arbeitspakete klar genug für parallele Ausführung
  ohne doppeltes Kontext-Encoding? Wirkt Integrations-Schritt nach parallelen Ästen plausibel?
- Wo würde echter Zeit- oder Risikogewinn entstehen, wenn mehrere Subagenten zugleich ausführen?
- Ist die **Umsetzungs-Topologie** für parallele Task-Starts ausreichend konkret
  (Slice-IDs gemäß Konvention, Wellen, Blocking)?
- Sind IMP-IDs fein genug für parallele Backend-Services (z.B. `IMP-BE-GW-…` und
  `IMP-BE-ES-…`), ohne undifferenziertes `IMP-BE` ohne Kürzel?
- Clean-Code-Chancen: Welche MI/LCOM/Tuple-Findings aus Phase 3 können durch den geplanten
  Scope mit wenig Mehraufwand mitgelöst werden?
- Akzeptanz→Test-Liste: Sind die Testfall-Skizzen vollständig und 1:1 übersetzbar?
  Wo wären Vereinfachungen möglich, ohne die Testbarkeit zu opfern?

Stil:BULLET-TERSE. Nummerierte Punkte. Kein neuer Plan; nur Bewertung.
```

---

### Plan-Review-Risk (plan-review-risk-agent)

```text
Profil:plan-review-risk-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. Akzeptanz→Test-Liste]

Prüfe:
- Blocker, versteckte Abhängigkeiten, Reihenfolgefehler
- Kollisionen mit bestehenden Patterns oder parallelen Änderungen
- Portabilitäts- und Wartbarkeitsrisiken
- Fehlende Gates, Tests, Rollbacks oder Akzeptanzkriterien
- Multi-Subagent: Gleiche Dateien/Contracts ohne Interface-first? Datenrennen/
  Merge-Konflikte, zweideutige Deliverables zwischen Paketen oder fehlende Abhängigkeitsgrafik?
- **Orchestrator:** Sind Integrations-Schritte, Konfliktbehandlung, Check gegen
  Schnittstellendrift zwischen parallelen Ästen und End-to-End-Prüfung konkret genug?
- Sind IMP-Slice-IDs fein genug (`IMP-BE-{ServiceKürzel}-…`), oder bündelt der Plan
  mehrere Backend-Services unter einer undifferenzierten `IMP-BE`-ID?
- Clean-Code-Lücken: Sind alle Scout-Findings (MI < 65, LCOM > 0,7, Tuple-Returns,
  Parameter-Listen > 3) im Plan adressiert? Ungelöste Findings als Blocker markieren.
- Akzeptanz→Test-Liste: Sind Testfall-Skizzen konkret genug für 1:1-Übersetzung durch Scribe?
  Fehlende Vorbedingungen, abstrakte Kriterien ohne Testname → als Blocker markieren.
- Bounded-Context-Grenzen (§12/A): Gibt es ungewollten Shared-Kernel? Werden gleiche Typen
  über Service-Grenzen geteilt ohne bewusste Entscheidung?
- Entity-Durchstecherei (§12/B): Erscheinen Persistence-Entities in geplanten API-Signaturen?

Stil:BULLET-TERSE. Nummerierte Punkte. Kein neuer Plan; nur Risiken und Lücken.
```

---

### Plan-Review-Readiness (plan-review-readiness-agent)

```text
Profil:plan-review-readiness-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. Akzeptanz→Test-Liste]

Prüfe:
- Ist der Umfang realistisch? Fehlt Wesentliches oder ist Überkomplexität drin?
- Sind Schritte für einen neuen Agenten wirklich ausführbar ohne Rätseln?
- Wo fehlen konkrete Dateipfade, Schnittstellen oder Entscheidungen?
- Multi-Agent: Ist die Aufteilung nachvollziehbar oder Overhead ohne Nutzen?
  Sind parallel startbare Pakete, Blocking-Kette und Integrations-Schritt für
  einen Orchestrator wörtlich nachvollziehbar beschrieben?
- Fehlen gemeinsame Artefakte/API-Vertrag vor parallelem Codieren, falls nötig?
- Ist die geplante **Umsetzungs-Topologie** (Slice-IDs, Wellen) für den Impl-Flow
  ohne Rätseln ausführbar?
- Clean-Code-Konkretheit: Sind MI/LCOM/Tuple-Constraints aus den Scout-Metriken in
  konkrete IMP-Slice-Deliverables übersetzt — oder nur als vage Anforderung notiert?
- Akzeptanz→Test-Liste: Sind alle Akzeptanzkriterien als konkrete Testfall-Skizzen vorhanden?
  Vage Formulierungen ohne Testname oder AAA-Stichpunkte benennen.

Stil:BULLET-TERSE. Nummerierte Punkte. Kein neuer Plan; nur Ausführbarkeit und Detailtiefe.
```

---

### Plan-Review-Craft (plan-review-craft-agent)

```text
Profil:plan-review-craft-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. Akzeptanz→Test-Liste]

Prüfe mit schulmeisterlicher Akribie:
- Handwerkliche Mängel: unklare Begriffe, inkonsistente Terminologie, fehlende Definitionen
- Formale Schwächen: fehlende Querverweise, unvollständige Tabellen, Lücken in Nummerierungen
- Unvollständige Begründungen: Entscheidungen ohne nachvollziehbares Warum
- Unpräzise Formulierungen: vage Aussagen statt konkreter Anforderungen
- Fehlende Abgrenzungen: was ist explizit ausgeschlossen und warum?
- Widersprüche im Sprachgebrauch: gleiche Konzepte unterschiedlich benannt
- Schwächste Stellen: auch wenn nichts gravierend falsch ist — welche Teile sind am wenigsten ausgereift?
- Clean-Code-Präzision: Sind alle MCP-Metrik-Referenzen (MI-Werte, LCOM-Scores,
  Parameterzahlen) präzise und vollständig auf konkrete Deliverables rückverfolgbar?
- Akzeptanz→Test-Liste: Terminologie-Konsistenz (<Method>_<Situation>_<Expected>)?
  Alle Kriterien mit Testname? Fehlende AAA-Stichpunkte?

Wichtig: Mindestens 3 Kritikpunkte. "Alles gut" ist kein akzeptables Ergebnis.
Wenn du wirklich nichts Kritisches findest, benennst du die schwächsten Stellen explizit.

Abschluss:Gesamtnote 1–6 + kurze Begründung.

Stil:BULLET-TERSE. Nummerierte Punkte, dann Note. Kein neuer Plan; nur Kritik.
```

---

### Plan-Review-Auditor (plan-review-auditor-agent)

```text
Profil:plan-review-auditor-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. Akzeptanz→Test-Liste]

Prüfe mit wissenschaftlicher Präzision:
- Wissenschaftliche Präzision: Sind alle Aussagen eindeutig und nicht interpretierbar?
- Beweisführung: Jede Designentscheidung — begründet oder bloß Behauptung?
- Nachvollziehbarkeit: Kann ein fachkundiger Dritter den Plan ohne Rückfragen vollständig umsetzen?
- Konsistenz der Terminologie: Alle Begriffe im gesamten Plan einheitlich?
- Logische Stringenz: Ist der Gesamtaufbau schlüssig? Gibt es Sprünge in der Argumentation?
- Ungeprüfte Annahmen: Was wird als selbstverständlich behandelt, ohne es als Annahme zu kennzeichnen?
- Kritische Pfade: Alle Abhängigkeiten vollständig und in richtiger Reihenfolge?
- Worst-Case-Szenarien: Was passiert, wenn eine zentrale Annahme falsch ist?
- Clean-Code-Beweisführung: Sind alle Clean-Code-Entscheidungen mit Metrik-Evidenz aus
  Scout D/E belegt (analyze_maintainability_index / analyze_type_graph)? Fehlt die
  Scout-D/E-Analyse, ist das ein [KRITISCH]-Mangel.
- Akzeptanz→Test-Liste: Decken die Testfall-Skizzen alle Akzeptanzkriterien ab?
  Sind AAA-Stichpunkte eindeutig genug für 1:1-Übersetzung? Fehlende Abdeckung → [KRITISCH].

Priorisierung der Mängel:
- [KRITISCH] — gefährden die Umsetzung
- [WESENTLICH] — können zu Missverständnissen führen
- [FORMAL] — mindern Qualität, blockieren nicht

Abschluss:Gesamtnote 1–5 + ausführliche Begründung. Mindestens 5 Punkte.

Stil:BULLET-TERSE. Priorisierte Mängelliste, dann Note. Kein neuer Plan; nur Prüfergebnis.
Alle [KRITISCH]-Punkte müssen vor Planpaket-Freigabe adressiert sein.
```

---

### Plan-Review-Design-Principles (plan-review-design-principles-agent)

```text
Profil:plan-review-design-principles-agent

Plan:[Arbeitsversion aus Phase 4c — vollständig inkl. geplante Klassen/Services/Methoden]

Referenz: .claude/skills/feature-delivery/references/principles-cleancode.md (IODA/IOSP/DDD-Abschnitte)

Prüfe den Plan konzeptuell auf IODA/IOSP — vorausschauend, bevor Code entsteht:

Bausteinschnitt (IODA):
- Sind die geplanten Klassen klar als Integration-Klasse oder Operation-Klasse ausgewiesen?
- Gibt es Klassen, die erkennbar Integration UND Operation mischen werden?
  (Symptom: Klasse orchestriert UND verarbeitet — schwer testbar, hohe Kopplung)
- Ist der PoMO (Point of Maximum Opportunity) je Klasse erkennbar?
- Werden Dekompositionsstufen explizit geplant, oder bleibt der Schnitt vage?

IOSP (Methodenebene, vorausschauend):
- Antizipiert der Plan Methoden, die Integration UND Operation mischen werden?
  (Methode delegiert an andere Methoden UND enthält Logik gleichzeitig)
- Sind geplante Service-Methoden, die andere Services aufrufen, frei von Inline-Logik?
- Sind geplante Fehlerbehandlungs-Strategien IOSP-konform?
  (Zentrale Integration-Methode behandelt Fehler — Operations propagieren)

Bounded-Context-Grenzen (DDD-A):
- Werden Service-Grenzen respektiert? Kein ungewollter Shared-Kernel geplant?
- Sind Modell-Übersetzungen (Anti-Corruption-Layer) an Service-Grenzen vorgesehen?

Entity-Durchstecherei (DDD-B):
- Erscheinen Persistence-Entities in geplanten API-Signaturen (Parameter/Return)?
- Ist die Trennung Persistence-Entity / Domain-Model / DTO im Plan erkennbar?

Priorisierung:
- [KRITISCH] — Bausteinschnitt oder IOSP-Verstoß wird sich in Code materialisieren;
  ArchUnit-IOSP-Backstop wird ansprechen; nachträgliche Korrektur aufwändig
- [WESENTLICH] — Plan lässt Mehrdeutigkeit, die zu IODA/IOSP-Verstößen führen kann
- [FORMAL] — Formulierungsunschärfe, Konzept klar aber unpräzise beschrieben

Stil:BULLET-TERSE. Nummerierte Punkte mit Priorisierung. Kein neuer Plan; nur IODA/IOSP-Prüfergebnis.
```

---

### Plan-Fixer (plan-fixer-agent)

```text
Profil:plan-fixer-agent|Patcher|kein-Scout|kein-Neudenken|kein-Scope-Expand

Plan-Arbeitsversion (aktuell):
[vollständige aktuelle Arbeitsversion]

Review-Digest (aktuelle Iteration):
[alle Findings der 6 Reviewer — vollständig]

Aufgabe: Patcher, kein Neu-Planer.

Regeln (zwingend):
- Ändere **nur** die Abschnitte, die konkret in den Findings referenziert werden.
- Kein Scouting, kein Neudenken, kein Scope-Expand.
- Keine neuen Ideen einbringen, die nicht durch ein Finding begründet sind.
- Jeden Fix mit der Finding-ID/Quelle verknüpfen (Pessimist-3, Professor-[KRITISCH]-1, etc.)

Blocker-Regel (zwingend):
- Erfordert ein Finding eine größere Änderung als ein gezielter Patch →
  **Blocker** an Orchestrator zurückgeben (nicht selbst neu planen).
- Format: `BLOCKER: [Quelle] [Finding-Text] → erfordert Topic-Re-Planning: [Scope]`
- Orchestrator entscheidet dann über gezieltes Topic-Re-Planning (Mini-4a/4b).

Liefern:
1. Liste der Fixes (Finding-ID → geänderter Abschnitt → Änderung)
2. Eventuell: BLOCKER-Liste
3. Aktualisierte Plan-Arbeitsversion (vollständig — Ersatz für die bisherige)

Stil:MACHINE-DENSE.
```

---

### Synthesizer (Phase 6) (plan-agent-synthesizer)

Ein Lauf — nach Abschluss aller Review-Iterationen.

```text
Profil:plan-agent-synthesizer|Review-Digest+Synthese+Planpaket|kein-Scout|keine-Planung|keine-Impl|keine-eigenen-Review-Perspektiven

Arbeitsversion (letzte — vollständig):
[finale Plan-Arbeitsversion nach Review-Loop]

Reviews (letzte Iteration — alle sechs):
Guard:[vollständig]
Risk:[vollständig]
Readiness:[vollständig]
Craft:[vollständig]
Auditor:[vollständig inkl. [KRITISCH]-Punkte und Go/No-Go]
Design-Principles:[vollständig inkl. Priorisierung]

Req:[Bullets — Auszug Phasen 1–2, max. 5]

Aufgabe (Reihenfolge einhalten):

Schritt 1 — Review-Digest (zuerst ausgeben, vor inhaltlicher Synthese):
   Sechs Abschnitte: Optimist, Pessimist, Normalo, Oberlehrer, Professor, IODA.
   Pro nummeriertem Punkt max. 1–2 Sätze Kernaussage.
   Vorlage: subagent-prompts.md Abschnitt "Review-Digest (Plan)".

Schritt 2 — Synthese-Checkliste (Punkte 1–6):
   Vorlage: subagent-prompts.md Abschnitt "Synthese-Checkliste".
   [KRITISCH]-Punkte des Professors und IODA-Agent sind Pflicht-Adressierung.

Schritt 3 — Komplexitäts- und Executor-Empfehlung:
   Low/Medium/High, Executor-Tier illustrativ, Topologie-Hinweis (konsistent mit
   Umsetzungs-Topologie), Begründung 2–4 Sätze, Disclaimer.
   Bei trivialem Plan einzeilig "Empfehlung nicht erforderlich".

Schritt 4 — Finales Planpaket:
   Vollständigen Freigabetext formulieren. Pflicht-Abschnitt:
   - Umsetzungs-Topologie (Modus, Slice-Tabelle mit IDs, Wellen, Integration, Verifikations-Stacks)
   - Finale Akzeptanz→Test-Liste (konsolidiert, §8/F1) — alle Testfall-Skizzen vollständig
   Ohne diese Abschnitte (wenn Implementierung vorgesehen): Planpaket unvollständig.

Persistenz-Hinweis: Plan wird als requests/plans/plan-<feature>.md gespeichert.

Deliverable:Review-Digest + Synthese-Checkliste + Komplexitäts-Block + finales Planpaket — kompakt, konsistent, freigabefertig. Stil:MACHINE-DENSE für Agent-Payloads; Review-Digest + Planpaket BULLET-TERSE (User-sichtbar).
```

---

### Review-Digest (Plan)

Vorlage für plan-agent-synthesizer nach Eingang aller Review-Antworten:

```text
### Review-Digest (Plan-Review-Loop Iteration [N])

#### Guard
- Punkt 1: …
- PRESERVE: …

#### Risk
- [BLOCKING] Punkt 1: …
- [RISK] Punkt 2: …

#### Readiness
- Punkt 1: …

#### Craft
- Punkt 1: …

#### Auditor
- [KRITISCH] Punkt 1: …
- [WESENTLICH] Punkt 2: …
- Go/No-Go: …

#### Design-Principles
- [KRITISCH] Punkt 1: …
- [WESENTLICH] Punkt 2: …
```

---

### Synthese-Checkliste (Plan)

```text
1. Übernommen: Welche konkreten Änderungen am Plan ergeben sich aus allen sechs Reviewern?
   [KRITISCH]-Punkte des Auditors und Design-Principles-Agent sind Pflicht-Adressierung.
2. Verworfen: Welche Review-Punkte sind nicht stichhaltig oder widersprechen der Anforderung?
   Kurz begründen.
3. Eskaliert: Welche Punkte bleiben widersprüchlich oder fachlich offen,
   als formulierte Nutzerfrage festhalten.
4. Risiken: Welche Pessimisten-Punkte bleiben als Restrisiko im Plan sichtbar (nicht wegreden)?
5. Multi-Subagent-Synthese: Passt Aufteilung, Abhängigkeiten und Orchestrator-Rolle zusammen?
   Stimmen Schnittstellen aus Phase 4a mit den Topic-Teilplänen in der Arbeitsversion überein?
6. Finale Freigabe (Zwischencheck): Ist der aktualisierte Plan bereit zur Zustimmung durch den Nutzer?
   Ja/nein; wenn nein: was fehlt noch?
7. Komplexitäts- und Executor-Empfehlung (final): Low/Medium/High, Executor-Tier illustrativ,
   Topologie-Hinweis, 2–4 Sätze Begründung aus den sechs Reviews, Disclaimer.
8. Finales Planpaket: Vollständigen Freigabetext formulieren (inkl. Umsetzungs-Topologie +
   Finale Akzeptanz→Test-Liste) — dem Nutzer zur Zustimmung vorlegen.
```

---

## Implementations-Agents

### Session-Treiber (Impl-Flow) — kein Agent-Profil

**Kein Subagent-Payload.** Dies ist der Ablauf, den die **aufrufende Session** selbst fährt (die
einzige persistente Instanz, FEAT-001/STORY-033). Die Session hält **nur** Index-Pointer +
PM-Verdikt-Kurzform; sie spawnt je Runde einen frischen PL und danach einen frischen PM via
Agent-Tool — **kein SendMessage über Runden hinweg**. Kein Reviewer-Report und kein Digest-Body
liegt je im Session-Fenster.

```text
Rolle: Session-Treiber (thin, pointer-only). Kein Produkt-Code außer Trivial-Edit-Fastpath (s. flow).

HARD GATE — Readiness (gilt für End-to-end UND From-existing-plan):
  Plan vollständig? Akzeptanz→Test-Liste (§8/F1)? Umsetzungs-Topologie (IMP-Slices, Wellen, Blocking)?
  dev-mcp + codebase-analyzer erreichbar?  FAIL → Stop mit Blocker-Bericht, kein Impl-Start.

SECONDBRAIN anlegen (s. secondbrain-schema.md):
  requests/plans/<feature>/secondbrain-index.md anlegen; Aktuell: Iteration 1 · Runde 1 (= current_round=1); Cap 1/5.

INNER LOOP — je Runde M (frische Instanzen, datei-basierte Kontinuität):
  1. current_round M aus secondbrain-index.md LESEN.
     M > 5 (Cap) und Vorrunden-PM-Verdikt = fix (oder zurückgewiesener Exit) → STOPP: kein PL#M. Final-Gate
     (wenn Fix-Scribes in Runde 5 liefen): Build + Test via dev-mcp. Dann Aufteilung nach `Tier 🔴 offen`:
       🔴 == 0 → cap-erzwungener erbsenzaehlerei-exit → weiter wie Schritt 5b (Terminal-PM, DI, Closure + Rest-Findings-Bericht);
                 der Terminal-PM begründet die offenen 🟡 im pm-verdict-N.md mit „Cap erreicht — auf Folge-Story vertagt".
       🔴 > 0  → HARD-STOP: KEINE Closure, KEIN Terminal-PM-DI-Span, Story NICHT implemented. Rest-Findings-Bericht
                 (inkl. Liste der offenen 🔴) → gebündelte User-Eskalation (waiven / Cap ausnahmsweise erhöhen / abbrechen).
  2. Verzeichnis iteration-N/round-M/ anlegen.
  3. FRISCHEN PL spawnen: Agent(implement-round-executor) — Payload s. "PL — Round-Executor".
     Übergabe: Runden-Pfad, N/M, Planpaket-Pointer + Slice-IDs, (Fix-Runde:) PM-Was+Wie + Vorrunden-Digest-Pointer.
     PL-Rückgabe: NUR Pointer (digest.md + index) + Verdikt-Kurzform (inkl. Tier-Zähler 🔴/🟡/🟢). PL wird verworfen.
  4. FRISCHEN PM spawnen: Agent(implement-supervisor) — Payload s. "PM — Supervisor".
     Übergabe: index-Pointer + digest-Pointer + Story-Pfad + Iteration N. PM-Rückgabe: Verdikt-Kurzform. PM wird verworfen.
  5. Verdikt auswerten (Session hält nur Pointer + Verdikt):
     fix      → current_round++ → zurück zu Schritt 1 (nächster PL erhält PM-Was+Wie).
     escalate → gebündelte Nutzerfrage; warten; dann erneut ab Schritt 3 (Cap läuft weiter).
     clean / erbsenzaehlerei-exit → MECHANISCHER TIER-GUARD (Schritt 5a), dann ggf. Terminal-Span (Schritt 5b).

  5a. TIER-GUARD (reine Zähler-Arithmetik, kein Urteil): `Tier 🔴 offen` aus secondbrain-index.md LESEN.
      🔴 offen > 0  → Inner-Close ZURÜCKGEWIESEN → wie fix behandeln: current_round++ → Schritt 1
                      (bei current_round = 5: Cap greift → Schritt 1 stoppt via Cap-Regel).
      erbsenzaehlerei-exit zusätzlich: outer/pm-verdict-N.md prüfen — je offenes 🟡 eine Begründung?
                      fehlt eine  → nicht konform → wie fix behandeln.
      🔴 offen == 0 (und 🟡-Begründungen vollständig) → Inner-Close AUTORISIERT → Schritt 5b.

  5b. TERMINAL-PM-Span — zwei getrennte Mechanismus-Kanten (nicht verwechseln):
      • Session ↔ PM = SendMessage: die Session reaktiviert die in Schritt 5 pausierte, NOCH NICHT verworfene
        PM-Instanz per SendMessage (die EINZIGE Ausnahme zur Wegwerf-Kadenz — kein Runden-Übergang, sondern der
        Abschluss-Span DIESER Outer-Iteration; so liegt der Guard aus 5a nachweislich VOR dem Span, eine Instanz bleibt).
      • Terminal-PM → 6 DI-Reviewer = Vordergrund-Dispatch: der reaktivierte PM dispatcht die Reviewer SELBST als
        Vordergrund-Sub-Agents (identisch zum PL→Impl-Reviewer-Muster), sie schreiben di-finding-*.md + geben nur Pointer
        als direkte Rückgabe → di-digest bauen → Outer-Verdikt. NICHT die Session dispatcht die DI.
      Payload + Ablauf: "DELIVERY-INSPECTION → CLOSURE" in dieser Datei.

  ⚠️ Frischer PL UND frischer PM je Runde via Agent-Tool. Kein SendMessage-Fortsetzen einer
     Vorrunden-Instanz. Kadenz-Verstoß = Regelbruch (STORY-033). EINZIGE Ausnahme: der Terminal-PM-Span (5b).
  ⚠️ Der Tier-Guard (5a) ist NICHT verhandelbar: ein Erbsenzählerei-Exit bei offenem 🔴 wird
     deterministisch zurückgewiesen — ein Security-`critical` ist immer 🔴 und kann so nie durchgewunken werden.

Abschlussformat: "Abschlussformat (Session-Treiber)" aus dieser Datei.
```

---

### PL — Round-Executor (implement-round-executor) [NEU]

Frische, throwaway PL-Instanz für **genau eine** Runde. Mechanisch — dispatcht, sequenziert Gates,
liest Findings, baut Digest, aktualisiert Index. **Implementiert keinen Code, urteilt nicht.**

```text
Profil:implement-round-executor  (frisch je Runde — kein Vorrunden-Kontext)

Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Runde:[N/M]
Planpaket-Pointer:[requests/plans/plan-<feature>.md — Slice-IDs, Umsetzungs-Topologie]
Nur Fix-Runde (M≥2): PM-Was+Wie:[Kurzform] · Vorrunden-Digest:[iteration-N/round-(M-1)/digest.md]

Ablauf (genau diese Runde):

SCHRITT 0 — Fix-Planer (NUR M≥2): implement-fix-planner-agent (Opus) dispatchen mit
  PM-Was+Wie + Vorrunden-Digest-Pointer → konkreter, evidenzbasierter Fix-Teilplan (liest selbst).
  Du planst NICHT selbst. (Runde 1: entfällt — direkt nach Planpaket.)

SCRIBES (pro Welle/Slice):
  Runden 1–3: implement-scribe-agent (Sonnet) · Runden 4–5: implement-scribe-opus-agent (Opus, Eskalation).
  Vorlage: "Scribe Runden 1-3"/"Scribe Runden 4-5". Parallel/sequenziell gemäß Wellen-Topologie.
  Je Scribe: nur slice-scoped Build/Test — KEIN stack-weites Gate. Runden-Pfad übergeben →
  Scribe schreibt scribe-<slice>.md. Post-Scribe: PL liest scribe-<slice>.md (Touched Paths), dann
  mcp__dev-mcp__read_files_batch([Touched Paths]) — kein natives Read/Grep, kein Payload-Empfang.

INTEGRATION-CHECKPOINT (nach Merge aller Scribes der Runde):
  SLICE-COVERAGE-CHECK (Pflicht — vor Gate 1, kein Skip):
    Touched Paths je Slice aus scribe-<slice>.md LESEN. Je IMP-* Slice: ≥1 passender Touched Path?
    Nein → BLOCKER (Slice ohne Touched Paths, Gate-Start verboten) → Fix-Scribe nachbeauftragen → erneut prüfen.
    Ausgabe-Tabelle IMP-Slice | Erwarteter-Scope | Touched-Paths | OK/BLOCKER → als Pflicht-Evidenz in jeden Reviewer-Prompt.

QUALITY GATES (integrationsweit — Reihenfolge zwingend):
  Gate 1 BUILD (Vorbedingung): build_dotnet_solution + build_angular_project (dev-mcp). FAIL → 2/3/4 warten.
  Gate 2 STATISCHE ANALYSE (parallel, nach Gate 1 grün):
    run_inspectcode · ArchUnitNET via test_dotnet_solution · lint_angular_project (nur wenn ESLint konfiguriert:
      `.eslintrc.*` / `eslint.config.{js,mjs,cjs}` / `eslint`-Eintrag in angular.json — sonst überspringen + Hinweis) ·
    review_git_diff (alle 5 focusAreas: security · performance · api-validation · angular-best-practices · solid) ·
    analyze_iosp_compliance (wenn Strang 5/6 verfügbar).
    Security severity `critical` → IMMER blockierend (nie als Warning gebündelt). Nur Warnings → alle Stufen, gebündelt.
  Gate 3 DESIGN-PRINCIPLES-REVIEW: implement-review-design-principles-agent (Opus). Vorlage "Impl-Review-Design-Principles".
  Gate 4 TEST-SUITE: test_dotnet_solution + test_angular_project (dev-mcp). Grün = ACs erfüllt (§8).

REVIEW-LOOP (parallel, Datei-Handoff — Set laut Change-Scope-Classifier, s. flow):
  Standard-7: risk · design-principles · verifier · readiness · craft · auditor · guard
  md-only: risk · guard · readiness  ·  lean-3: risk · craft · readiness  ·  collapsed: 1× impl-quality-review-agent
  CSS/HTML-only (4): Structure · CSS-Logic · AC-Coverage · Regression  ·  Cross-Service: Standard-7 + Integration
  Jeder Reviewer: Runden-Pfad + Slice-Coverage-Tabelle + review_git_diff-Befunde als Evidenz → schreibt EIGENE
  finding-<reviewer>.md; Rückgabe = nur Pointer + Verdikt-Kurzform. Vorlagen: "Impl-Review-*".

DIGEST BAUEN + AUTORITATIVE TIERS + INDEX (nach Eingang aller Pointer):
  PL LIEST alle finding-<reviewer>.md → baut iteration-N/round-M/digest.md (Format "Review-Digest (Implement)").
  Kein voller Report als Return — Inhalt kommt aus den Dateien. Weil PL throwaway: Bodies transitieren nur EINMAL
  durch das PL-Fenster, nie durch die Session.
  AUTORITATIVE TIER-VERGABE (STORY-034): stufe JEDES Finding als 🔴/🟡/🟢 ein (Reviewer-Tier-Vorschlag ist nur Input).
    Regeln: secondbrain-schema.md → ## Tier-Klassifikation. NICHT ÜBERSTIMMBAR: Security-`critical` aus JEDEM Kanal
    (review_git_diff security, run_inspectcode, LLM-Reviewer) ist IMMER 🔴 — nie 🟡/🟢.
    Jede Digest-Finding-Zeile beginnt mit ihrem Tier-Symbol; Roll-up: "Autoritative Tiers: 🔴 <n> · 🟡 <n> · 🟢 <n>".
  secondbrain-index.md aktualisieren: Aktuell N/M (current_round=M), Cap M/5, offene Zähler, TIER-ZÄHLER
    (Tier 🔴/🟡/🟢 offen — identisch mit Digest-Roll-up; Grundlage des Session-Tier-Guards),
    Runden-Historie-Zeile (inkl. 🔴/🟡/🟢-Spalten), letzter Digest-Pointer.
  Du urteilst NICHT über den Inner-Exit und führst den Tier-Guard NICHT aus — das sind PM bzw. Session.

RÜCKGABE AN SESSION (NUR Pointer — kein Report-Body):
  Runde M · digest: iteration-N/round-M/digest.md · index: secondbrain-index.md
  Fixable:<n> · Klärungsbedürftig:<n> · offen BLOCKING/KRITISCH:<n> · Tiers 🔴:<n> 🟡:<n> 🟢:<n>
  Gate: Build <ok|fail> · Statik <ok|warn|fail> · Design-Principles <ok|fail> · Tests <n/n>
```

---

### PM — Supervisor (implement-supervisor) [NEU]

Frische, throwaway PM-Instanz je Runde. **Urteilsebene** — liest Index+Digest, fällt ein tier-gesteuertes
Urteil. Schreibt **nur** `outer/pm-verdict-N.md` (+ bei Requirement-Gap `outer/delta-N.md`). Bei Inner-Close
wird dieselbe Instanz zum **Terminal-PM** (s. DELIVERY-INSPECTION → CLOSURE).

```text
Profil:implement-supervisor  (frisch je Runde — kein Vorrunden-Kontext; bei Inner-Close: Terminal-PM)

Index-Pointer:[requests/plans/<feature>/secondbrain-index.md]  (inkl. Tier-Zähler Tier 🔴/🟡/🟢 offen)
Digest-Pointer:[requests/plans/<feature>/iteration-N/round-M/digest.md]  (jede Finding-Zeile mit autoritativem Tier)
Story-Pfad:[requests/stories/STORY-XXX.md — für AC-Adressierung]
Iteration:[N — für den Pfad outer/pm-verdict-N.md]

Aufgabe: Index + Digest LESEN (selbst). ZUERST `Tier 🔴 offen` lesen — er steuert das Urteil. Genau EINS fällen:
  fix                  → Tier 🔴 offen > 0 (Pflicht), oder du willst ein 🟡 fixen → kompaktes Was+Wie
                         (VERWEIS auf Digest-Zeilen): Was: welche Findings · Wie: Fix-Richtung (1–3 Zeilen).
                         Konkreten Slice-Plan macht der Fix-Planer der Folgerunde.
  escalate             → Produkt-/Design-Ambiguität → eine gebündelte Nutzerfrage.
  clean                → Tier 🔴/🟡/🟢 offen alle 0, Gates grün, ACs adressiert → Inner-Loop schließbar.
  erbsenzaehlerei-exit → Tier 🔴 offen == 0, aber ≥1 🟡/🟢 offen; Restfindings keiner Runde wert → schließbar.
                         PFLICHT vor der Meldung: outer/pm-verdict-N.md, Abschnitt Inner-final, mit JE offenem 🟡
                         einer Begründungszeile (Digest-Verweis + warum wave statt fix). 🟢 ohne Begründung.
                         Ohne vollständige Begründungen ist der Exit nicht konform (Session behandelt ihn wie fix).

NICHT ÜBERSTIMMBAR: ein 🔴 bleibt 🔴; Security-`critical` aus jedem Kanal ist immer 🔴 — nie 🟡/🟢, nie per
  Erbsenzählerei-Exit durchwinkbar. Bei Tier 🔴 offen > 0 ist clean/erbsenzaehlerei-exit unzulässig.

Editiert NUR outer/pm-verdict-N.md (+ bei Requirement-Gap outer/delta-N.md). NIE Produkt-Code, finding-*.md,
Digest oder Index. Führt den Tier-Guard NICHT selbst aus (das ist die Session). Dispatcht nichts —
EINZIGE Ausnahme: der Terminal-PM dispatcht die Delivery-Inspection (s. DELIVERY-INSPECTION → CLOSURE).

RÜCKGABE AN SESSION (Verdikt-Kurzform — kein Report-Body):
  VERDIKT: <clean | erbsenzaehlerei-exit | fix | escalate>   (Runde M) · Tiers 🔴:<n> 🟡:<n> 🟢:<n>
  fix                  → Was: <Digest-Verweise>  Wie: <Fix-Richtung, 1–3 Zeilen>
  escalate             → Frage: <eine gebündelte, entscheidungsreife Nutzerfrage>
  clean                → Begründung: Gates grün, keine offenen Findings, ACs adressiert.
  erbsenzaehlerei-exit → pm-verdict: outer/pm-verdict-N.md geschrieben (🟡-Begründungen vollständig).
  (Bei clean/erbsenzaehlerei-exit: Session prüft Tier-Guard, dann Terminal-Span.)
```

---

### DELIVERY-INSPECTION → CLOSURE (Terminal-PM → Session)

Nach Inner-Loop-Abschluss mit `Tier 🔴 offen == 0` (PM `clean` / `erbsenzaehlerei-exit` nach bestandenem
Tier-Guard, inkl. cap-erzwungenem erbsenzaehlerei-exit bei 🔴==0). **Bei Cap mit 🔴 > 0 wird dieser Span
NICHT betreten** — dann Hard-Stop + User-Eskalation, keine Closure (s. INNER LOOP Schritt 1).
**Träger: der Terminal-PM** — dieselbe PM-Instanz, die den Inner-Loop geschlossen hat, von der Session per
SendMessage reaktiviert (die EINZIGE Ausnahme zur Wegwerf-Kadenz). Der **reaktivierte PM** (nicht die Session)
dispatcht die DI im Vordergrund, liest den di-digest und fällt den Outer-Verdikt in EINER Instanz. Danach
handelt die Session auf den Outer-Verdikt (Story-Status etc.).

```text
DELIVERY-INSPECTION → CLOSURE (Pflicht nach Inner-Loop — Pointer-Handoff, Notification-Trap strukturell gelöst):
  ✅ Warum kein Wait-Loop mehr: die DI-Reviewer schreiben je outer/di-N/di-finding-<rolle>.md und geben
     NUR Pointer + Kurzform zurück (kein Report-Body). Der Terminal-PM dispatcht sie im VORDERGRUND und
     wartet auf DIREKTE Pointer-Rückgaben — kein Background-Task, keine Completion-Notification, kein Poll.
     Der frühere Trap (STORY-031) war Background + Notification-Wait; entfällt hier per Konstruktion.

  Terminal-PM Schritt 1 — outer/di-N/ anlegen, dann 6 DI-Reviewer im Vordergrund dispatchen:
    Rollen: Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker (s. delivery-inspection/SKILL.md).
    Kontext je Reviewer: originale Story-ACs + finaler Diff/Touched-Paths + Gate-Status + Inner-Loop-Summary
      + Pfad outer/di-N/. Constraint (delivery-inspection): kein eigenständiger Tool-Call außer dem Schreiben
      der eigenen di-finding-<rolle>.md. Rückgabe je Reviewer: Pointer + Kurzform (Kategorie-Vorschlag).
  Terminal-PM Schritt 2 — di-digest.md bauen + Outer-Verdikt:
    di-finding-*.md LESEN → outer/di-N/di-digest.md konsolidieren (Roll-up: Impl-Gaps/Req-Gaps/Unklar).
    Outer-Verdikt (autoritative Klassifikation) in outer/pm-verdict-N.md, Abschnitt Outer-Verdikt, schreiben:
      OK                 → keine Gaps.
      Implementation-Gap → das Richtige nicht korrekt umgesetzt (AC nicht erfüllt).
      Requirement-Gap    → das Falsche / neuer Scope → outer/delta-N.md schreiben (Format s. secondbrain-schema.md).
      Unklar             → Ambiguität → eine gebündelte Nutzerfrage.
    Rückgabe an die Session: OUTER-VERDIKT-Kurzform + Pointer (kein di-Body).

  Session Schritt 3 — auf den Outer-Verdikt handeln (Story-Status setzt NUR die Session):
    OK                 → Story-Datei [story-path] status: implemented → Abschlussformat ausgeben.
    Implementation-Gap → Fix-Scribe → Inner Loop zurück (frische PL/PM-Runden; Cap läuft weiter).
    Requirement-Gap    → nächste Outer-Iteration ab Schritt 1 mit FRISCHEM PM (Input: outer/delta-N.md).
    Unklar             → auf User-Antwort warten → Terminal-PM/Session klassifiziert neu.
  Opt-out (skip-delivery-inspection): Session setzt Story-Status trotzdem auf implemented,
    Opt-out-Grund im Abschlussformat unter "## Closure" vermerken.
```

---

### Scribe Runden 1-3 (implement-scribe-agent) [NEU]

Implementiert genau einen Plan-Slice (IMP-*). Sonnet, Runden 1–3.

```text
Profil:implement-scribe-agent

Slice-ID:[z.B. IMP-FE-Search-Rules]
Welle:[z.B. W1 — parallel mit IMP-BE-GW-Logging]
Working directory:[absoluter Windows-Pfad C:\...]
SecondBrain-Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/ — vom PL]

Planpaket (dieser Slice — vollständig):
[Umsetzungsschritte + Akzeptanz→Test-Liste für diesen Slice]

Test-Design-Referenz: .claude/skills/test-design/ (Namenskonvention, AAA, Magic Strings,
  Framework-Router .NET/Angular — vor erstem Test lesen)

Aufgabe (ZWEISTUFIG — Reihenfolge zwingend):

Schritt 1 — Tests schreiben (RED):
  Neue/erweiterte Tests gemäß Akzeptanz→Test-Liste aus dem Planpaket.
  Testname-Konvention: <Method>_<Situation>_<Expected> (test-design-Skill).
  Neue und erweiterte Tests müssen **zuerst fehlschlagen** (Red-Phase — §8/F2).
  Verifikation: Build + Test ausführen, fehlschlagende Tests dokumentieren.
  Unberührte Bestandstests: nicht anfassen, kein Re-Run-Zwang.

Schritt 2 — Implementierung (GREEN):
  Implementieren bis alle neuen/erweiterten Tests grün (Green-Phase).
  Pre-Coding: read_class_summary / read_signatures_only via dev-mcp vor erstem Edit.
  Nur dieser Slice — kein Scope-Expand, keine stillen Plan-Abweichungen.
  Slice-scoped Build/Test nach jeder signifikanten Änderung (dev-mcp):
    build_dotnet_solution / build_angular_project → test_dotnet_solution / test_angular_project
  KEIN stack-weites Technik-Gate (das läuft am Integration-Checkpoint).

  **Angular Hard Rules — OnPush + async-Listen (Pflicht):**
  In Komponenten mit `changeDetection: ChangeDetectionStrategy.OnPush` müssen
  async-geladene Listen-Properties als Signal deklariert werden:
    ✅ `readonly options = signal<OptionType[]>([])`  → `this.options.set(data)` im Subscribe
    ❌ `options: OptionType[] = []`                  → `this.options = data` triggert keine CD
  Gilt für jede Property die nach ngOnInit/Subscribe befüllt wird.

Pfade: Windows-Absolutpfade (C:\...) für alle dev-mcp-Calls.
Schema vor jedem MCP-Aufruf lesen.

Post-Scribe-Verifikation (Pflicht — MCP-First):
  mcp__dev-mcp__read_files_batch([alle Touched Paths]) — kein natives Read/Grep.
  Verifikations-Ergebnis im Summary festhalten.

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [SecondBrain-Runden-Pfad]/scribe-<slice>.md mit: Summary (Red-Phase: welche Tests
fehlgeschlagen; Green-Phase: welche Tests grün), Touched Paths, Build/Test-Matrix
(eine Zeile pro Lauf — Pflicht), offene Risiken/Blocker.

Rückgabe an den PL (Round-Executor): NUR Pointer + Verdikt-Kurzform
`scribe-<slice>.md · <RED|GREEN> · Dateien:<n> · build:<ok|fail> test:<ok|fail>` — kein Summary-Body inline.
(Touched Paths liest der PL aus der Datei.)
```

---

### Scribe Runden 4-5 (implement-scribe-opus-agent) [NEU]

Identisch zu implement-scribe-agent (Runden 1–3), aber auf Opus eskaliert. Aktiviert nach Runde 3, wenn Findings persistieren.

```text
Profil:implement-scribe-opus-agent

Slice-ID:[z.B. IMP-FE-Search-Rules — Fix-Slice]
Welle:[Fix-Welle — Runde [4|5]]
Working directory:[absoluter Windows-Pfad C:\...]
SecondBrain-Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/ — vom PL]

Kontext (Eskalation):
  Dies ist Runde [4|5] — Eskalation nach erfolgloser Runde 3.
  Fix-Teilplan (vom Fix-Planer): [vollständig]
  Rest-Findings aus vorheriger Runde: [vollständig]

Planpaket (Akzeptanz→Test-Liste — vollständig):
[Alle Testfall-Skizzen für diesen Slice]

Test-Design-Referenz: .claude/skills/test-design/

Aufgabe: identisch zu implement-scribe-agent (ZWEISTUFIG: RED → GREEN).
Zusatz Eskalations-Kontext: Fix-Teilplan und Rest-Findings sind verbindliche Vorgabe.
Keine Eigeninitiative jenseits des Fix-Teilplans.

**Angular Hard Rules — OnPush + async-Listen (Pflicht):**
In Komponenten mit `changeDetection: ChangeDetectionStrategy.OnPush` müssen
async-geladene Listen-Properties als Signal deklariert werden:
  ✅ `readonly options = signal<OptionType[]>([])`  → `this.options.set(data)` im Subscribe
  ❌ `options: OptionType[] = []`                  → `this.options = data` triggert keine CD
Gilt für jede Property die nach ngOnInit/Subscribe befüllt wird.

Pfade: Windows-Absolutpfade (C:\...) für alle dev-mcp-Calls.

Post-Scribe-Verifikation (Pflicht — MCP-First):
  mcp__dev-mcp__read_files_batch([alle Touched Paths]) — kein natives Read/Grep.
  Verifikations-Ergebnis im Summary festhalten.

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [SecondBrain-Runden-Pfad]/scribe-<slice>.md mit: Summary (Red/Green-Phase-Ergebnis),
Touched Paths, Build/Test-Matrix (Pflicht), offene Risiken/Blocker.

Rückgabe an den PL (Round-Executor): NUR Pointer + Verdikt-Kurzform
`scribe-<slice>.md · <RED|GREEN> · Dateien:<n> · build:<ok|fail> test:<ok|fail>` — kein Summary-Body inline.
(Touched Paths liest der PL aus der Datei.)
```

---

### Implementierer (Slice — compact)

Für Slices **ohne** slice-scoped Build/Test oder als Kurzform.

```text
You are a subagent for a fixed-scope implementation task.

Context:
- Final plan summary: [1-3 bullets]
- Your slice only: [boundaries, files/areas if known]

Required when the plan section **Umsetzungs-Topologie** is present:
- **Slice-ID:** [e.g. IMP-FE-Search-Rules]
- **Wave:** [e.g. W1 — parallel with IMP-BE-GW-Logging]

Rules:
- **Agent:** `implement-agent`.
- **Build/Test:** slice-scoped allowed.
- **Not allowed:** stack-wide Technik-Gate (Schritt 3 after integration).
- **Plan adherence:** Implement only this slice — no silent plan drift.
- **Test-First (§8):** write/update tests before implementation; verify Red before Green.

Reply with: summary, touched paths, open risks/blockers.
```

---

### Implementierer (Slice — Build/Test)

Standard-Vorlage für Schritt-2-Task-Prompts mit slice-scoped Build/Test.

```text
You are an implementation subagent for ONE plan slice (IMP-*) only.

Slice-ID: [e.g. IMP-FE-Search-Rules]
Working directory: [absolute Windows path C:\...]

Test-First (§8 — Pflicht):
  Schritt 1: Tests gemäß Akzeptanz→Test-Liste schreiben — neue/erweiterte Tests erst fehlschlagen lassen (Red).
  Schritt 2: Implementieren bis Tests grün (Green).
  Test-Design-Referenz: .claude/skills/test-design/ (Namenskonvention, AAA, Magic Strings).

Hard rules:
- **Agent:** `implement-agent`. **Slice scope only** — not stack-wide Technik-Gate.
- **Pre-Coding (wenn dev-mcp verfügbar):** Vor erstem Code-Edit —
  `read_class_summary` oder `read_signatures_only`; `read_method` nur für konkrete Änderungsmethode.
- **Build/Test (slice-scoped):** dotnet/ng build/test for this slice only.
  Pfade: Windows-Absolutpfade (C:\...) für alle dev-mcp-Calls.
- **Forbidden:** stack-wide Technik-Gate; silent scope expansion.

Reply with: summary, touched paths, Build/Test-Matrix per run (Pflicht), blockers.
```

---

### Fix-Planer (implement-fix-planner-agent)

```text
Profil: implement-fix-planner-agent.
Du erstellst einen Fix-Teilplan, implementierst NICHT.

Pflicht-Rules (0-5):
0) agent-compliance.md
1) feature-delivery/flows/implementation-flow.md
2) codebase-analyzer/SKILL.md
3) codebase-analyzer/SKILL.md (Analyse-Abschnitt)
4) angular-developer/SKILL.md / backend-ef-migrations/SKILL.md (falls Scope passt)
5) test-design/SKILL.md (Testfall-Reparaturen)

Input:
- Finales Planpaket + Akzeptanz→Test-Liste
- Review-Digest (7 Rollen) + Gate-Findings
- Technik-Gate-Status je Stack
- klassifizierte Findings
- Diff-/Pfadliste

MCP-Reihenfolge A-H (verbindlich):
A index_project + find_in_index
B review_git_diff (alle 5 focusAreas)
C review_files_batch/review_file
D analyze_complexity + analyze_refactoring_safety
E detect_untested_public_api
F analyze_test_quality
G find_symbol_references
H compare_validation_rules

Liefern:
1) Konkrete Fix-Schritte (Datei/Symbol/Reihenfolge)
2) Scope (Stack/Topic)
3) Lokale ACs + referenzierte Akzeptanz→Tests
4) Risiken/offene Punkte
5) Vorgeschlagene IMP-Slice-IDs + Wellen/Blocking
6) Abgrenzung (nicht anfassen)
7) Evidenz-Basis (Pflicht): MCP-Calls + ok/fallback + Gate-Bezug je Slice
8) Dedup: Überschneidungen codebase-analyzer / inspectcode / ArchUnit bereinigen
```

---

### Impl-Review-Design-Principles (implement-review-design-principles-agent)

```text
Profil:implement-review-design-principles-agent (schreibt nur die eigene finding-Datei)

Input:
- Finales Planpaket + IODA-Vorgaben aus Plan-Review-IODA
- Aktueller Diff / betroffene Pfade
- Gate-2-Status (inkl. analyze_iosp_compliance-Befunde wenn verfügbar, ArchUnit-IOSP-Ergebnis)

Referenz: .claude/skills/feature-delivery/references/principles-cleancode.md (IODA/IOSP-Abschnitte)

Prüfe den Code auf IODA-Architektur:

Bausteinschnitt (IODA):
- Klare Integration/Operation-Trennung je Klasse? (PoMO erkennbar?)
- Dekomposition korrekt — keine Klassen, die Integration und Operation mischen?
- Ist der Bausteinschnitt konsistent mit dem Plan-IODA-Review (Plan-Vorgabe eingehalten)?

IOSP (Methodenebene):
- Gibt es Methoden, die andere Methoden aufrufen UND selbst Logik/Ausdrücke enthalten?
- Bis analyze_iosp_compliance (Strang 5 .NET / Strang 6 Angular) verfügbar: Angular IOSP selbst prüfen.
- ArchUnit-IOSP-Backstop (archunit-baseline-template.cs Regel 5): angesprochen? Falls ja, als Evidenz nutzen.
- analyze_iosp_compliance-Befunde (codebase-analyzer): falls Gate 2 liefert, als primäre Evidenz.

Fehlerbehandlung (IOSP-Konformität):
- Ist Fehlerbehandlung zentralisiert (Integration-Ebene — Middleware/HTTP-Interceptor)?
- Leere/handlungslose catches (prüfbar) vorhanden?

Entity-Durchstecherei (DDD-B):
- Erscheinen Persistence-Entities in Controller-Signaturen? (ArchUnit Regel 7 angesprochen?)

Priorisierung:
- [KRITISCH] — IODA/IOSP-Verstoß materialisiert, ArchUnit-Backstop angesprochen,
  oder Entity-Durchstecherei in Controller-Signatur nachgewiesen
- [WESENTLICH] — Mischung Integration/Operation erkennbar aber noch nicht vollständig
- [FORMAL] — Stilistische Unschärfe, kein struktureller Verstoß

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-design-principles.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); Severity = [KRITISCH]/[WESENTLICH]/[FORMAL].
Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-design-principles.md · KRITISCH:<n> WESENTLICH:<n> FORMAL:<n>` — kein Report-Body inline.

Stil:BULLET-TERSE. Priorisierte Liste. Kein Fix; nur Prüfergebnis.
```

---

### Impl-Review-Risk

```text
Profil: implement-review-risk-agent (schreibt nur die eigene finding-Datei).
Input:
- Finales Planpaket + Akzeptanz→Test-Liste
- Aktueller Diff / betroffene Pfade
- Gate-Status (Build, Statische Analyse, Tests)

Pflicht-MCP:
- detect_untested_public_api
- analyze_refactoring_safety
- find_symbol_references

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-risk.md: Kopf (Reviewer/MCP/Verdikt) + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario).

In die Datei (Tabellen-Inhalt):
- Nummerierte Risiko-/Blocker-Liste (priorisiert)
- Klar trennen: [KRITISCH] / [WESENTLICH] / [FORMAL]
- Explizit: Bounded-Context-Verstöße, ungewollter Shared-Kernel, Entity-Durchstecherei

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-risk.md · BLOCKING:<n> RISK:<n>` — kein Report-Body inline.
```

---

### Impl-Review-Verifier

```text
Profil: implement-review-verifier-agent (schreibt nur die eigene finding-Datei).
Input zusätzlich zum Diff:
- Slice-Coverage-Tabelle (aus Integration-Checkpoint — Pflicht-Input vom PL)
Pflicht-MCP:
- review_git_diff
- review_files_batch (oder review_file)
- compare_validation_rules (wenn FE/BE-Validierung betroffen)

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-verifier.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); AC-Map als Block unter die Tabelle.

In die Datei:
- Nummerierte fachliche Fehlerliste, priorisiert nach Schaden.
- Slice-Präsenz-Check: Sind alle IMP-* Slices aus der Slice-Coverage-Tabelle mit Status OK?
  Slice mit Status BLOCKER → [KRITISCH] (zweites Netz nach Integration-Checkpoint).
- Akzeptanz-Coverage (§8/F4): Deckt die finale Test-Suite **alle** Akzeptanzkriterien
  aus der Planpaket-Akzeptanz→Test-Liste ab? Jedes Kriterium einzeln prüfen.
  Fehlende Coverage → [KRITISCH], fehlende Testfall-Skizze umgesetzt → [WESENTLICH].

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-verifier.md · AC-Coverage:<vollständig|fehlend:Liste> · Fehler:<n>` — kein Report-Body inline.
```

---

### Impl-Review-Readiness

```text
Profil: implement-review-readiness-agent (schreibt nur die eigene finding-Datei).
Pflicht-MCP:
- review_with_index
- analyze_duplicates

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-readiness.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); Ship-Entscheidung als Block unter die Tabelle.

In die Datei:
- Nummerierte Punkte zu Alltagstauglichkeit, Ship-Readiness, fehlenden Details.

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-readiness.md · <SHIP|CONDITIONAL|NO-SHIP>` — kein Report-Body inline.
```

---

### Impl-Review-Craft

```text
Profil: implement-review-craft-agent (schreibt nur die eigene finding-Datei).
Pflicht-MCP:
- review_file
- analyze_maintainability_index

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-craft.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); Note unter die Tabelle.

In die Datei:
- Mindestens 3 nummerierte Kritikpunkte + Note 1-6.

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-craft.md · Note:<1-6> · Kritikpunkte:<n>` — kein Report-Body inline.
```

---

### Impl-Review-Auditor

```text
Profil: implement-review-auditor-agent (schreibt nur die eigene finding-Datei).
Pflicht-MCP:
- analyze_advanced_all
- analyze_test_quality
- review_with_index
- detect_untested_public_api

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-auditor.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); Note + Go/No-Go unter die Tabelle.

In die Datei:
- Priorisierte Liste mit [KRITISCH]/[WESENTLICH]/[FORMAL]
- Gesamtnote 1-5 mit Begründung.
- Akzeptanz→Test-Vollständigkeit: Sind alle Testfall-Skizzen aus dem Planpaket umgesetzt?

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-auditor.md · Note:<1-5> · <GO|NO-GO> · KRITISCH:<n>` — kein Report-Body inline.
```

---

### Impl-Review-Guard

```text
Profil: implement-review-guard-agent (schreibt nur die eigene finding-Datei).
Pflicht-MCP:
- review_with_index

Datei-Handoff (Pflicht — s. secondbrain-schema.md):
Schreibe [Runden-Pfad]/finding-guard.md: Kopf + Struktur-Tabelle
(File | Line | Severity | Tier-Vorschlag | Befund | Failure-Scenario); PRESERVE-Liste + erfüllte ACs als Block unter die Tabelle.

In die Datei:
- Nummerierte Stärken, bereits erfüllte ACs, tragfähige Vereinfachungen.
- Akzeptanz-Coverage-Positiv: Welche Testfall-Skizzen sind vollständig und sauber umgesetzt?

Rückgabe an den PL (Round-Executor): NUR Pointer + Kurzform `finding-guard.md · PRESERVE:<n> · erfüllte-ACs:<n>` — kein Report-Body inline.
```

---

### Review-Digest (Implement)

Vom PL (Round-Executor) durch **Lesen** der `finding-*.md` der Runde gebaut → als `iteration-N/round-M/digest.md`
persistiert. Nicht aus Agent-Returns zusammengesetzt. Der Fix-Planer der Folgerunde erhält den `digest.md`-Pointer.

```text
### Review-Digest (Iteration [N])

#### Risk
- [BLOCKING] Punkt 1: ...
- [RISK] Punkt 2: ...

#### Design-Principles
- [KRITISCH] Punkt 1: ...
- [WESENTLICH] Punkt 2: ...

#### Verifier
- Punkt 1: ...
- AC-Map: [vollständig | fehlend: Liste]

#### Readiness
- Ship-Readiness: [SHIP | CONDITIONAL | NO-SHIP]
- Punkt 1: ...

#### Craft
- Punkt 1: ...

#### Auditor
- [KRITISCH] Punkt 1: ...
- Go/No-Go: ...
- Note: ...

#### Guard
- PRESERVE: ...
- Erfüllte ACs: ...
```

---

### Abschlussformat (Session-Treiber)

```text
## Summary
- Ergebnis vs. Plan: [complete | partial]
- Iterationen: [Anzahl] von max. 5
- Loop-Ende: [sauber | Maximum mit Rest-Findings]

## Quality Gates (letzte Iteration)
- Gate 1 Build: [OK/FAIL]
- Gate 2 Statische Analyse: [OK/FAIL/WARNINGS — Findings: run_inspectcode / ArchUnit / lint / codebase-analyzer / iosp_compliance]
- Gate 3 Design-Principles-Review: [OK/FAIL]
- Gate 4 Test-Suite: [OK/FAIL]

## Iterativer Review-Loop
- Reviews je Iteration: 7 Rollen ausgeführt [ja/nein]
- Fix-Planer je Iteration: [vorhanden + Evidenz-Basis ja/nein]
- Umgesetzte Fix-Slices: [Liste]
- Akzeptanz-Coverage (Verifier): [vollständig | fehlend: Liste]
- Letzte Iteration ohne behebbares Finding: [ja/nein]

## Rest-Findings (nur bei Maximum mit offenen Punkten)
- Risk: [Punkte oder —]
- Design-Principles: [Punkte oder —]
- Verifier: [Punkte oder —]
- Readiness: [Punkte oder —]
- Craft: [Punkte oder —]
- Auditor: [Punkte oder —]
- Guard: [Punkte oder —]

## Offene Punkte
- [falls vorhanden; bei Rest-Findings hier Empfehlung]

## Closure
- Story-Status: implemented — [Story-Pfad]
- Delivery-Inspection: [N Iteration(en) sauber | skip — Grund: ...]
```
