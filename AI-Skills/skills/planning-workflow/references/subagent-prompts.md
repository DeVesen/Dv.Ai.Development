# Subagent-Prompts - Planning Workflow

Vorlagen zum Kopieren. Platzhalter in eckigen Klammern ersetzen. Sprache der
Antwort frei waehlbar, sofern der Nutzer nichts anderes vorgibt.

**Agent-Typ (Pflicht):** Je Rolle der passende Subagent — Profil unter [../../agents/](../../agents/). **Modell:** [subagent-model-before-task.md](../../references/subagent-model-before-task.md) — Ziel-Profil, **primär** Abschnitt **`## Modell`**, sonst YAML; Slugs **nicht** in Prompts duplizieren.

Uebersicht: [SKILL.md](../SKILL.md), Abschnitt **Subagent-Typen und Agent-Definitionen**.

Die Vorlagen unten sind **Auftrags-Payloads** (Platzhalter), nicht Ersatz fuer die Agent-Profile.

---

## Codebereichs-Scout

Bei **Multi-Scout** (bis **10** parallele Task-Subagents, siehe [SKILL.md](../SKILL.md) Phase 3):
je Lauf **einen** eng begrenzten **Teil-Scope**; Platzhalter **Scout-ID** und **Teil-Scope**
setzen. Der Hauptagent fuehrt die Scout-Ergebnisse vor Phase 4a zusammen.

```text
Rolle: Du bist ein Read-only-Scout. Keine Implementierung, kein finaler
Umsetzungsplan. Agent-Profil: plan-agent-scout.

Scout-ID (optional, bei Multi-Scout): [z. B. SCOUT-FE-1]
Teil-Scope (Pflicht bei Multi-Scout, sonst gesamter betroffener Bereich):
[Pfade, Module, Services oder Suchhinweise — nur dieser Bereich]

Kontext (nur aus Nutzer/Thread, nicht erfinden):
[Anforderung in 3-10 Saetzen]

MCP-Pfade (aus AGENTS.md des Projekts — Platzhalter vor Versand ersetzen):
  FE: [MCP_FRONTEND_PATH]   (= Wert von {frontend-path} aus ./AGENTS.md)
  BE: [MCP_BACKEND_PATH]    (= Wert von {backend-path}  aus ./AGENTS.md)

Fokus (Pflicht): Nur Code/Flows kartieren, die **direkt** fuer diese Anforderung noetig sind —
kein blindes Repo-Scouting, kein Scope-Creep ausserhalb Teil-Scope/Anforderung.

Aufgabe (MCP zuerst — Fallback Read/Grep nur wenn MCP nicht verfuegbar):

Schritt 1 — Basis-Landkarte (Pflicht):
   index_project(projectPath="[MCP_FRONTEND_PATH]", type="angular") fuer FE,
   index_project(projectPath="[MCP_BACKEND_PATH]", type="dotnet") fuer BE (nur relevanter Stack).
   Alle genannten Symbole via find_in_index aufloesen. Read/Grep nur als Fallback.
   Bei Fehler: max. 2 Versuche je Stack dokumentieren, dann MCP-Fallback erklaeren.
   UI-only-Begriffe ohne Symbol ausnehmen.

Schritt 1b — Dev-Filesystem-MCP (optional, ergaenzend zu codebase-analyzer):
   Kanon: skills/dev-filesystem-mcp/SKILL.md (file_path, root — Schema vor Aufruf lesen).
   Nach find_in_index, wenn konkrete Dateipfade bekannt:
   - read_class_summary / read_signatures_only / find_implementations
   Pfade: /project/... (Docker-Mount).
   Fallback wenn nicht verfuegbar: Schritt 1 allein genuegt.

Schritt 2 — Erweiterte MCP-Analyse (nach find_in_index, wenn konkrete Klassen/Methoden aufgeloest):
   A. analyze_complexity auf betroffene Dateien (primaer) | Fallback: Methoden-Laenge via Grep
      — Bedingung: mind. 1 Klasse/Methode im Scope aufgeloest
   B. analyze_refactoring_safety auf Klassen, die strukturell geaendert werden (primaer) | Fallback: Abhaengigkeiten via find_in_index zaehlen
      — Bedingung: nur wenn Umbau geplant
   C. suggest_class_splits auf Klassen mit >1 Verantwortung (primaer) | Fallback: manuelle Lektuere via Read
      — Bedingung: nur wenn Klasse zu gross oder mehrdeutig
   D. analyze_maintainability_index auf betroffene Dateien (primaer) | Fallback: MI-Schaetzung via Methoden-Laenge + Branches
      — Bedingung: wie Schritt A (mind. 1 Klasse im Scope)
   E. analyze_type_graph auf betroffene Dateien (primaer) | Fallback: Grep auf Tuple< / Mehrfach-Rueckgaben
      — Bedingung: mind. 2 Klassen/Services im Scope und Schnittstellen oder Rueckgabetypen betroffen
   Kein Schritt 2 bei: ausschliesslich UI-Labels, leerer Fundliste, rein neuen Dateien.

0. MCP-Analyse-Status (Pflicht-Header, erste Zeile im Deliverable):
   `MCP: ok` wenn Schritt 1 + Schritt 2 erfolgreich;
   sonst `MCP: fallback (<Grund>); Anker via Read/Grep: <Liste>`.
1. Identifiziere die voraussichtlich betroffenen Dateien und Ordner (relativ zum
   Repo-Root). Wenn unbekannt, nenne Suchhinweise statt zu raten.
2. Nenne konkrete Einstiegspunkte (z. B. Komponenten, Services, Routen,
   Konfiguration).
3. Beschreibe kurz den Nachbarschaftskontext (was ruft was auf, relevante
   Schnittstellen).
4. Liste Risiken und Annahmen auf, die noch verifiziert werden muessten.
5. Markiere offene Luecken: Was konnte beim Scouting nicht geklaert werden?
6. Komplexitaets-Hotspots: Klasse · Metric · Handlungsempfehlung — oder "nicht gerufen — <Grund>".
7. Refactoring-Risiken: kritisch | unkritisch — oder "nicht gerufen — <Grund>".
8. Split-Kandidaten: <Liste> — oder "nicht gerufen — <Grund>".
9. Clean-Code-Metriken (Maintainability): Methoden mit MI < 65 (Note C–F) oder LCOM > 0,7 · Handlungsempfehlung — oder "nicht gerufen — <Grund>".
10. Typ-Smells (Type Graph): Tuple-Returns, fehlende Model/DTO-Typen, Parameter-Listen > 3 in betroffenen Signaturen — oder "nicht gerufen — <Grund>".

Deliverable: strukturierte Aufzaehlung, keine Code-Aenderungen, kein Plan mit
Schritt-fuer-Schritt-Umsetzung.
```

---

## Topic-Planer (Phase 4b)

Bei **Multi-Topic** (bis **10** parallele Task-Subagents, siehe [SKILL.md](../SKILL.md) Phase 4b):
je Lauf **genau ein** Topic; Platzhalter **Topic-ID**, **Topic-Scope** und **Tech-Mindset**
setzen. Der Hauptagent merged in Phase 4c.

```text
Rolle: Du bist Topic-Planer. Du planst NUR den dir zugewiesenen Topic-Scope.
Keine Implementierung, kein Gesamtplan, kein Review. Agent-Profil: plan-agent-topic-planner.

Topic-ID: [z. B. TOPIC-FE-Search, TOPIC-BE-GW, TOPIC-BE-AppService]
Topic-Scope: [Pfade, Module, Service — nur dieser Bereich]
Tech-Mindset: [z. B. Angular Frontend, .NET Gateway, .NET App-Service, EF Core]

Schnittstellen-Vertrag (aus Phase 4a, nur dieses Topic):
[eingehend: … / ausgehend: … — Routen, DTOs, Signaturen]

Anforderung (Auszug Phasen 1–2):
[3–10 Saetze]

Scout-Auszug (nur fuer dieses Topic):
[relevante Dateien, Einstiegspunkte, Nachbarschaft]

Aufgabe (MCP zuerst — Fallback nur bei MCP-Fehler):

MCP-Vorbereitung (vor Schritt-Formulierung, wenn bestehende Klassen im Topic-Scope):
   A. analyze_complexity auf Topic-relevante Dateien (primaer) | Fallback: Zeilenzahl / Methoden-Zaehlung via Read
      — Bedingung: mind. 1 bestehende Klasse im Scope
   B. analyze_refactoring_safety auf Klassen, die umgebaut werden (primaer) | Fallback: Import-Zaehlung via Grep
      — Bedingung: nur wenn Klassen-Umbau geplant
   Kein Call bei reinen Neu-Implementierungen. Ergebnisse in Risiken (Schritt 4) und IMP-Slice-Blocking (5/6) einbetten.

Clean-Code-Constraints (aus Scout-Deliverable, Positionen 6–10):
   - Methoden mit MI < 65 oder LCOM > 0,7 im Topic-Scope: als Refactor-Deliverable in Schritt 1 einplanen
   - Parameter-Listen > 3 in geplanten Signaturen: Konfigurationsobjekt / Record einplanen
   - Tuple-Returns in neuen oder geaenderten Methoden: benanntes DTO / Record vorschreiben
   - Nur auf betroffene Klassen im Topic-Scope anwenden — kein Scope-Creep

1. Konkrete Umsetzungsschritte NUR fuer dieses Topic (Dateien, Klassen, Komponenten).
2. Einstiegspunkte und betroffene Pfade (relativ zum Repo-Root).
3. Akzeptanzkriterien fuer dieses Topic.
4. Risiken und offene Punkte (Topic-lokal).
5. **Pflicht — Parallele Implementierung:** Welche Teil-Arbeiten/Dateien in diesem Topic
   koennen parallel umgesetzt werden? Welche Blocking-Deps zu anderen Topics? Contract-first-
   Hinweise gemaess Schnittstellen-Vertrag aus 4a. Orientierung an spaeterer
   Umsetzungs-Topologie (IMP-Slices), ohne den Gesamtplan zu schreiben.
6. **Pflicht — Vorgeschlagene IMP-Slice-IDs:** Gemaess [SKILL.md](../SKILL.md) Abschnitt
   **Slice-ID-Konvention (IMP-*)** — `IMP-FE-{Bereich}-…` bzw. `IMP-BE-{ServiceKuerzel}-…`
   (projektspezifische Kuerzel im Teilplan nennen) plus Wellen-/Blocking-Hinweis.

Falls Scout MCP=fallback ohne Index-Anker: fuer neue Symbole aus Phase 4a zunaechst
find_in_index versuchen (projectPath aus AGENTS.md: {frontend-path} / {backend-path});
Ergebnis (ok oder fallback) im Teilplan festhalten — kein stilles Ueberspringen.

Deliverable: strukturierter **Teilplan** fuer genau ein Topic; keine Code-Aenderungen;
kein Gesamtplan; kein Review anderer Topics.
```

---

## Optimist-Review

```text
Rolle: Optimist. Du willst zeigen, dass der Plan tragfaehig ist. Agent-Profil: plan-review-optimist-agent.

Plan (vollstaendig einfuegen):
[Arbeitsversion aus Phase 4c]

Pruefe:
- Worin liegt die Staerke und Plausibilitaet?
- Welche Vereinfachungen oder Abkuerzungen waeren moeglich, ohne das Ziel zu
  verfehlen?
- Welche Chancen oder positiven Nebeneffekte sind realistisch?
- Multi-Subagent/Orchestrierung: Sind Arbeitspakete klar genug fuer parallele
  Ausfuehrung ohne doppeltes Kontext-Encoding? Wirkt Integrations-Schritt nach
  parallelen Aesten plausibel?
- Wo wuerde echte Zeit- oder Risikogewinn entstehen, wenn mehrere Subagenten
  zugleich ausfuehren?
- Ist die **Umsetzungs-Topologie** fuer parallele Task-Starts im Implementation
  Workflow ausreichend konkret (Slice-IDs gemaess Konvention, Wellen, Blocking)?
- Sind IMP-IDs fein genug fuer parallele Backend-Services (z. B. `IMP-BE-GW-…` und
  `IMP-BE-ES-…`), ohne undifferenziertes `IMP-BE` ohne Kuerzel?
- Clean-Code-Chancen: Welche MI/LCOM/Tuple-Findings aus Phase 3 koennen durch den geplanten
  Scope mit wenig Mehraufwand mitgeloest werden?

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur Bewertung.
```

---

## Pessimist-Review

```text
Rolle: Pessimist. Du suchst aktiv nach Gruenden, warum der Plan scheitern koennte. Agent-Profil: plan-review-pessimist-agent.

Plan (vollstaendig einfuegen):
[Arbeitsversion aus Phase 4c]

Pruefe:
- Blocker, versteckte Abhaengigkeiten, Reihenfolgefehler
- Kollisionen mit bestehenden Patterns oder parallelen Aenderungen
- Portabilitaets- und Wartbarkeitsrisiken
- Fehlende Gates, Tests, Rollbacks oder Akzeptanzkriterien
- Multi-Subagent: Gleiche Dateien/Contracts ohne Interface-first? Datenrennen/
  Merge-Konflikte, Zweideutige Deliverables zwischen Paketen oder fehlende
  Abhaengigkeitsgrafik?
- **Orchestrator:** Sind Integrations-Schritte, Konfliktbehandlung, Check gegen
  Schnittstellendrift zwischen parallelen Aesten und End-to-End-Pruefung konkret genug?
- Sind IMP-Slice-IDs fein genug (`IMP-BE-{ServiceKuerzel}-…`), oder bundelt der Plan
  mehrere Backend-Services unter einer undifferenzierten `IMP-BE`-ID?
- Clean-Code-Luecken: Sind alle Scout-Findings (MI < 65, LCOM > 0,7, Tuple-Returns,
  Parameter-Listen > 3) im Plan adressiert? Ungeloeste Findings als Blocker markieren.

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur Risiken und
Luecken.
```

---

## Normalo-Review

```text
Rolle: Normalo. Du pruefst Alltagstauglichkeit und Masshaltung. Agent-Profil: plan-review-normalo-agent.

Plan (vollstaendig einfuegen):
[Arbeitsversion aus Phase 4c]

Pruefe:
- Ist der Umfang realistisch? Fehlt Wesentliches oder ist Ueberkomplexitaet
  drin?
- Sind Schritte fuer einen neuen Agenten wirklich ausfuehrbar ohne Raetselraten?
- Wo fehlen konkrete Dateipfade, Schnittstellen oder Entscheidungen?
- Multi-Agent: Ist die Aufteilung nachvollziehbar oder Overhead ohne Nutzen?
  Sind parallel startbare Pakete, Blocking-Kette und Integrations-Schritt fuer
  einen Orchestrator woertlich nachvollziehbar beschrieben?
- Fehlen gemeinsame Artefakte/API-Vertrag vor parallelem Codieren, falls noetig?
- Ist die geplante **Umsetzungs-Topologie** (Slice-IDs gemaess **Slice-ID-Konvention**,
  Wellen) fuer den Implementation Workflow ohne Raetselraten ausfuehrbar?
- Clean-Code-Konkretheit: Sind MI/LCOM/Tuple-Constraints aus den Scout-Metriken in
  konkrete IMP-Slice-Deliverables uebersetzt — oder nur als vage Anforderung notiert?

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur
Ausfuehrbarkeit und Detailtiefe.
```

---

## Oberlehrer-Review

```text
Rolle: Oberlehrer. Du musst Maengel finden — ein Plan ohne Beanstandungen existiert fuer dich nicht. Agent-Profil: plan-review-oberlehrer-agent.

Plan (vollstaendig einfuegen):
[Arbeitsversion aus Phase 4c]

Pruefe mit schulmeisterlicher Akribie:
- Handwerkliche Maengel: unklare Begriffe, inkonsistente Terminologie, fehlende Definitionen
- Formale Schwaehen: fehlende Querverweise, unvollstaendige Tabellen, Luecken in Nummerierungen
- Unvollstaendige Begruendungen: Entscheidungen ohne nachvollziehbares Warum
- Unpraesize Formulierungen: vage Aussagen statt konkreter Anforderungen
- Fehlende Abgrenzungen: was ist explizit ausgeschlossen und warum?
- Widersprueche im Sprachgebrauch: gleiche Konzepte unterschiedlich benannt
- Schwaechste Stellen: auch wenn nichts gravierend falsch ist — welche Teile sind am wenigsten ausgereift?
- Clean-Code-Praezision: Sind alle MCP-Metrik-Referenzen (MI-Werte, LCOM-Scores,
  Parameterzahlen) praezise und vollstaendig auf konkrete Deliverables rueckverfolgbar?
  Vage Formulierungen wie "Code verbessern" ohne Metrik-Anker sind unzureichend.

Wichtig: Mindestens 3 Kritikpunkte. "Alles gut" ist kein akzeptables Ergebnis. Wenn du wirklich nichts Kritisches findest, benennst du die schwaechsten Stellen explizit.

Abschluss: Gesamtnote 1–6 mit kurzer Begruendung.

Antworte kompakt mit nummerierten Punkten, dann Note. Kein neuer Plan; nur Kritik.
```

---

## Professor-Review

```text
Rolle: Professor. Du behandelst diesen Plan wie eine Doktorarbeit, die vor einem Fachgremium verteidigt werden muss — und pruefst so, als wuerden Menschenleben von der Korrektheit des Plans abhaengen. Agent-Profil: plan-review-professor-agent.

Plan (vollstaendig einfuegen):
[Arbeitsversion aus Phase 4c]

Pruefe mit wissenschaftlicher Praezision:
- Wissenschaftliche Praezision: Sind alle Aussagen eindeutig und nicht interpretierbar?
- Beweisfuehrung: Jede Designentscheidung — begruendet oder bloss Behauptung?
- Nachvollziehbarkeit: Kann ein fachkundiger Dritter den Plan ohne Rueckfragen vollstaendig umsetzen?
- Konsistenz der Terminologie: Alle Begriffe im gesamten Plan einheitlich?
- Logische Stringenz: Ist der Gesamtaufbau schluessig? Gibt es Spruenge in der Argumentation?
- Ungepruefte Annahmen: Was wird als selbstverstaendlich behandelt, ohne es als Annahme zu kennzeichnen?
- Kritische Pfade: Alle Abhaengigkeiten vollstaendig und in richtiger Reihenfolge?
- Worst-Case-Szenarien: Was passiert, wenn eine zentrale Annahme falsch ist?
- Clean-Code-Beweisfuehrung: Sind alle Clean-Code-Entscheidungen mit Metrik-Evidenz aus
  Scout D/E belegt (analyze_maintainability_index / analyze_type_graph)? Fehlt die
  Scout-D/E-Analyse, ist das ein [KRITISCH]-Mangel.

Priorisierung der Maengel:
- [KRITISCH] — gefaehrden die Umsetzung
- [WESENTLICH] — koennen zu Missverstaendnissen fuehren
- [FORMAL] — mindern Qualitaet, blockieren nicht

Abschluss: Gesamtnote 1–5 mit ausfuehrlicher Begruendung. Mindestens 5 Punkte.

Antworte mit priorisierter Maengelliste, dann Note. Kein neuer Plan; nur Pruefergebnis.
Alle [KRITISCH]-Punkte muessen vor Planpaket-Freigabe adressiert sein.
```

---

## Review-Digest (Pflicht, Hauptagent)

**Unmittelbar nach** Eingang aller fuenf Phase-5-Subagent-Antworten (Optimist,
Pessimist, Normalo, Oberlehrer, Professor) und **bevor** die Synthese-Checkliste inhaltlich abgearbeitet
wird: im Nutzer-Chat einen kurzen **Review-Digest** ausgeben. Siehe
[SKILL.md](../SKILL.md), Phase 6, Punkt **Review-Digest**.

Vorlage (Platzhalter durch Kernaussagen ersetzen; pro Zeile max. 1–2 Saetze):

```text
### Review-Digest (Phase 5)

#### Optimist

- Punkt 1: …
- Punkt 2: …

#### Pessimist

- Punkt 1: …
- Punkt 2: …

#### Normalo

- Punkt 1: …
- Punkt 2: …

#### Oberlehrer

- Punkt 1: …
- Note: …

#### Professor

- [KRITISCH] Punkt 1: …
- [WESENTLICH] Punkt 2: …
- Note: …
```

Wenn eine Rolle keine nummerierte Liste liefert: ein Satz unter der jeweiligen
Ueberschrift reicht. Wenn Task-Subagents fehlten: keinen erzwungenen Digest der
fuenf Rollen; Limitations-Hinweis aus Phase 5 beibehalten.

---

## Synthese-Checkliste

Nach dem Review-Digest und mit den fuenf Reviews durch den Hauptagenten
abarbeiten — **Reihenfolge laut** [SKILL.md](../SKILL.md) **Phase 6:** Punkte **1–6**,
danach **Punkt 7** (**Komplexitaets- und Executor-Empfehlung**), danach **Punkt 8**
(finales Planpaket im Chat durch den Hauptagenten).

1. **Uebernommen:** Welche konkreten Aenderungen am Plan ergeben sich aus
   Optimist, Pessimist, Normalo, Oberlehrer und Professor? [KRITISCH]-Punkte des Professors sind Pflicht-Adressierung.
2. **Verworfen:** Welche Review-Punkte sind nicht stichhaltig oder widersprechen
   der Anforderung? Kurz begruenden.
3. **Eskaliert:** Welche Punkte bleiben widerspruechlich oder fachlich offen,
   als formulierte Nutzerfrage festhalten.
4. **Risiken:** Welche Pessimisten-Punkte bleiben als Restrisiko im Plan sichtbar
   (nicht wegreden)?
5. **Multi-Subagent-Synthese:** Passt Aufteilung, Abhaengigkeiten und Orchestrator-
   Rolle zusammen nach den fuenf Perspektiven? Stimmen Schnittstellen aus Phase 4a
   mit den Topic-Teilplaenen in der Arbeitsversion (4c) ueberein — keine Drift?
   Was muss geklaert oder vereinfacht werden?
6. **Finale Freigabe (Zwischencheck):** Ist der aktualisierte Plan bereit zur
   Zustimmung durch den Nutzer? Ja/nein; wenn nein: was fehlt noch?
7. **Komplexitaets- und Executor-Empfehlung (final):** Den Kurzblock (Rating Low/Medium/High,
   Executor-Tier illustrativ, Topologie-Hinweis als Kurzfassung — konsistent mit Pflichtabschnitt
   **Umsetzungs-Topologie**, 2–4 Saetze Begruendung aus den fuenf Reviews, Disclaimer; bei
   trivialem Plan einzeilig „nicht erforderlich“)
   laut Phase 6 SKILL **vom Hauptagenten** im Chat ausgeben — **vor** Punkt 8.
8. **Finales Planpaket:** Vollständigen Freigabetext formulieren (integriert
   aktualisierten Plan, Reviews, Synthese aus 1–6, Block aus Punkt 7) und dem Nutzer
   zur Zustimmung vorlegen. **Pflicht:** Abschnitt **Umsetzungs-Topologie
   (Implementation Workflow)** gemaess [SKILL.md](../SKILL.md) Phase 6 und **Slice-ID-
   Konvention (IMP-*)** (Mindestschema: Modus, Slice-Tabelle mit IDs, Wellen,
   Integration, Verifikations-Stacks) — oder Trivial-Kurzform; bei Implementierungsvorgabe
   ohne diesen Abschnitt ist das Paket unvollstaendig.
