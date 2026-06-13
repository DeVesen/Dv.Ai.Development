# Planning Workflow

Mehrstufige Planungsarchitektur für Feature-, Refactoring- und Migrations-Planung. Produziert ein verbindliches Plan-Paket mit Implementations-Slices für den [Implementation Workflow](./implementation-workflow.md).

**Trigger:** `plane`, `Roadmap`, `Architektur`, `Refactoring planen`, `Feature planen`  
**Opt-out:** `ohne plan-skill` / `ohne planning-workflow`

---

## Phasen

| Phase | Inhalt |
|-------|--------|
| **1 — Anforderung** | Reine Anforderungsarbeit, keine Code-Recherche. Klärungsfragen, Ziel formulieren. |
| **2 — Zwischenstand** | Kurze Zusammenfassung des Anforderungsbilds. |
| **3 — Code-Scouting** | 1–10 `plan-agent-scout`-Läufe erkunden Pfade, Einstiegspunkte, Nachbarschaft. |
| **4a — Interface-Design** | Orchestrator `plan-agent`: Topic-Map + Schnittstellen-Vertrag. Optional: `plan-agent-interface-designer`. |
| **4b — Topic-Planung** | Bis zu 10 `plan-agent-topic-planner`-Läufe — je ein FE/BE-Topic mit ACs und IMP-Slice-IDs. |
| **4c — Merge** | `plan-agent-merger` + `plan-agent-synthesizer` verdichten zur Arbeitsversion. |
| **5 — Review** | 5 parallele Review-Agenten (Normalo, Oberlehrer, Optimist, Pessimist, Professor). |
| **6 — Synthese & Paket** | Finales Plan-Paket: Topologie, Wellen, 1–10 IMP-Slices (IMP-FE-`{Bereich}` / IMP-BE-`{Kürzel}`). |

---

## Sub-Agents

| Agent | Modell | Rolle |
|-------|--------|-------|
| `plan-agent-scout` | Sonnet | Read-only Codebereichs-Erkundung (Phase 3) |
| `plan-agent-interface-designer` | Sonnet | Schnittstellen-Design und API-Vertrag (Phase 4a, optional) |
| `plan-agent-topic-planner` | Sonnet | Einzelnes FE/BE-Topic planen mit ACs (Phase 4b) |
| `plan-agent-merger` | Sonnet | Topic-Pläne zusammenführen (Phase 4c) |
| `plan-agent-synthesizer` | Sonnet | Finale Verdichtung zur Arbeitsversion (Phase 4c) |
| `plan-review-normalo-agent` | Sonnet | Review: Alltagstauglichkeit & Ausführbarkeit |
| `plan-review-oberlehrer-agent` | Sonnet | Review: Handwerkliche und formale Mängel |
| `plan-review-optimist-agent` | Sonnet | Review: Stärken und Chancen |
| `plan-review-pessimist-agent` | Sonnet | Review: Blocker, Risiken, Integrationsfallen |
| `plan-review-professor-agent` | Sonnet | Review: Tiefenanalyse auf Doktorarbeit-Niveau |

---

## Output-Format

Das Plan-Paket enthält:
- Feature-Beschreibung und Ziel
- Topic-Map (FE/BE-Bereiche)
- Schnittstellen-Vertrag (API-Typen, DTOs)
- 1–10 IMP-Slices mit ID, Scope, ACs und Wellen-Zuordnung
- Parallele Slices und Integrationspunkte

---

## Zusammenspiel mit anderen Skills

- **Vorher:** [`buddy-agent`](./buddy-agent.md) für Anforderungs-Sparring und Schärfen
- **Danach:** [`implementation-workflow`](./implementation-workflow.md) übernimmt das Plan-Paket
- **Scout-Recherche:** [`repo-scout-protocol`](./repo-scout-protocol.md) definiert die MCP-Fallback-Kette
