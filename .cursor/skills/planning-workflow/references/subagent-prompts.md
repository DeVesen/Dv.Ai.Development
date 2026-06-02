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

Aufgabe:
0. MCP-Status (Pflicht-Header, erste Zeile im Deliverable):
   `MCP: ok` wenn index_project + find_in_index erfolgreich;
   sonst `MCP: fallback (<Grund>); Anker via Read/Grep: <Liste>`.
   Code-Landkarte: index_project(projectPath="[MCP_FRONTEND_PATH]", type="angular") fuer FE,
   index_project(projectPath="[MCP_BACKEND_PATH]", type="dotnet") fuer BE (nur relevanter Stack).
   Alle genannten Symbole via find_in_index aufloesen. Grep nur ergaenzend.
   Bei Fehler: max. 2 Versuche je Stack dokumentieren, dann MCP-Fallback erklaeren.
   UI-only-Begriffe ohne Symbol ausnehmen.
1. Identifiziere die voraussichtlich betroffenen Dateien und Ordner (relativ zum
   Repo-Root). Wenn unbekannt, nenne Suchhinweise statt zu raten.
2. Nenne konkrete Einstiegspunkte (z. B. Komponenten, Services, Routen,
   Konfiguration).
3. Beschreibe kurz den Nachbarschaftskontext (was ruft was auf, relevante
   Schnittstellen).
4. Liste Risiken und Annahmen auf, die noch verifiziert werden muessten.
5. Markiere offene Luecken: Was konnte beim Scouting nicht geklaert werden?

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

Aufgabe:
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

Falls Scout MCP=fallback ohne Index-Anker: fuer neue Symbole aus Phase 4a
find_in_index versuchen (projectPath aus AGENTS.md: {frontend-path} / {backend-path});
Ergebnis (ok oder fallback) im Teilplan festhalten — kein stilles Ueberspringen.

Deliverable: strukturierter **Teilplan** fuer genau ein Topic; keine Code-Aenderungen;
kein Gesamtplan; kein Review anderer Topics.
```

---

## Optimist-Review

```text
Rolle: Optimist. Du willst zeigen, dass der Plan tragfaehig ist. Agent-Profil: plan-agent-optimist.

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

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur Bewertung.
```

---

## Pessimist-Review

```text
Rolle: Pessimist. Du suchst aktiv nach Gruenden, warum der Plan scheitern koennte. Agent-Profil: plan-agent-pessimist.

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

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur Risiken und
Luecken.
```

---

## Normalo-Review

```text
Rolle: Normalo. Du pruefst Alltagstauglichkeit und Masshaltung. Agent-Profil: plan-agent-normalo.

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

Antworte kompakt mit nummerierten Punkten. Kein neuer Plan; nur
Ausfuehrbarkeit und Detailtiefe.
```

---

## Review-Digest (Pflicht, Hauptagent)

**Unmittelbar nach** Eingang aller drei Phase-5-Subagent-Antworten (Optimist,
Pessimist, Normalo) und **bevor** die Synthese-Checkliste inhaltlich abgearbeitet
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
```

Wenn eine Rolle keine nummerierte Liste liefert: ein Satz unter der jeweiligen
Ueberschrift reicht. Wenn Task-Subagents fehlten: keinen erzwungenen Digest der
drei Rollen; Limitations-Hinweis aus Phase 5 beibehalten.

---

## Synthese-Checkliste

Nach dem Review-Digest und mit den drei Reviews durch den Hauptagenten
abarbeiten — **Reihenfolge laut** [SKILL.md](../SKILL.md) **Phase 6:** Punkte **1–6**,
danach **Punkt 7** (**Komplexitaets- und Executor-Empfehlung**), danach **Punkt 8**
(finales Planpaket im Chat durch den Hauptagenten).

1. **Uebernommen:** Welche konkreten Aenderungen am Plan ergeben sich aus
   Optimist, Pessimist und Normalo?
2. **Verworfen:** Welche Review-Punkte sind nicht stichhaltig oder widersprechen
   der Anforderung? Kurz begruenden.
3. **Eskaliert:** Welche Punkte bleiben widerspruechlich oder fachlich offen,
   als formulierte Nutzerfrage festhalten.
4. **Risiken:** Welche Pessimisten-Punkte bleiben als Restrisiko im Plan sichtbar
   (nicht wegreden)?
5. **Multi-Subagent-Synthese:** Passt Aufteilung, Abhaengigkeiten und Orchestrator-
   Rolle zusammen nach den drei Perspektiven? Stimmen Schnittstellen aus Phase 4a
   mit den Topic-Teilplaenen in der Arbeitsversion (4c) ueberein — keine Drift?
   Was muss geklaert oder vereinfacht werden?
6. **Finale Freigabe (Zwischencheck):** Ist der aktualisierte Plan bereit zur
   Zustimmung durch den Nutzer? Ja/nein; wenn nein: was fehlt noch?
7. **Komplexitaets- und Executor-Empfehlung (final):** Den Kurzblock (Rating Low/Medium/High,
   Executor-Tier illustrativ, Topologie-Hinweis als Kurzfassung — konsistent mit Pflichtabschnitt
   **Umsetzungs-Topologie**, 2–4 Saetze Begruendung aus den drei Reviews, Disclaimer; bei
   trivialem Plan einzeilig „nicht erforderlich“)
   laut Phase 6 SKILL **vom Hauptagenten** im Chat ausgeben — **vor** Punkt 8.
8. **Finales Planpaket:** Vollständigen Freigabetext formulieren (integriert
   aktualisierten Plan, Reviews, Synthese aus 1–6, Block aus Punkt 7) und dem Nutzer
   zur Zustimmung vorlegen. **Pflicht:** Abschnitt **Umsetzungs-Topologie
   (Implementation Workflow)** gemaess [SKILL.md](../SKILL.md) Phase 6 und **Slice-ID-
   Konvention (IMP-*)** (Mindestschema: Modus, Slice-Tabelle mit IDs, Wellen,
   Integration, Verifikations-Stacks) — oder Trivial-Kurzform; bei Implementierungsvorgabe
   ohne diesen Abschnitt ist das Paket unvollstaendig.
