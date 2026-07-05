# finding-risk.md

Reviewer: risk
MCP: BLOCKER (fallback: Read/Grep/Glob — dev-mcp + codebase-analyzer nicht verfügbar in Cloud-Linux-Session)
Pflicht-MCPs nicht ausführbar: detect_untested_public_api · analyze_refactoring_safety · find_symbol_references
Fallback dokumentiert: alle Prüfungen via Read auf implement-scribe-agent.md, implement-round-executor.md, implement-supervisor.md, subagent-prompts.md, plan-agent.md, reviewer-gate-canon.md, implement-review-design-principles-agent.md, implement-scribe-opus-agent.md, subagent-delegation-boilerplate.md

Linse-lokale Lesart: **CLEAN** — 0 🔴-Vorschläge. OnPush-Migration (W0) korrekt ausgeführt; Profil enthält Regel; Pointer im Slim-Payload zeigt auf belegten Abschnitt. Alle Payload-Pointer gegen referenzierte Profile verifiziert (PL: Schritt 0-6 in implement-round-executor.md ✅ · PM: tier-gesteuertes Urteil in implement-supervisor.md ✅ · Reviewer-Kanon: reviewer-gate-canon.md ✅). Keine Security-Schwachstelle, kein Code-Contract-Drift (md-only Scope). Zwei 🟡-Risiken für künftige Code-Projekte identifiziert.

---

## Findings-Tabelle

| File | Line | Tier-Vorschlag | Befund | Failure-Scenario |
|------|------|:--------------:|--------|------------------|
| `subagent-prompts.md` (Scribe Runden 1-3 Block) + `implement-scribe-agent.md` | slim block ca. Z.194-207; Profil Z.76-84 | 🟡 | **Post-Scribe-Verifikation fehlt in Profil + Slim-Payload.** Plan (Block 4) klassifizierte "Post-Scribe-Verifikation (Pflicht — MCP-First): mcp__dev-mcp__read_files_batch([alle Touched Paths])" als "Ablauf-Kopie, steht in implement-scribe-agent.md nach Migration". Read auf implement-scribe-agent.md belegt: kein "Post-Scribe-Verifikation"-Abschnitt vorhanden (Profil enthält nur "## Rückgabe an Orchestrator" mit Inhalts-Feldern, Z.76-84). Slim-Payload enthält Pointer "Datei-Handoff: implement-scribe-agent.md" ohne fallback-Instruction. Scribe 4-5 (Opus) behält Instruction explizit im Payload (Scope-Cut, Z.245-248 in subagent-prompts.md) — Asymmetrie Sonnet- vs. Opus-Scribe entsteht. | Scribe (Runden 1-3) in Angular/.NET Projekt überspringt read_files_batch-Verifikationsschritt (kein Pflicht-Signal mehr im Payload, kein Abschnitt im Profil). Gemeldete Touched Paths basieren auf Schreibversuchen, nicht auf verifizierten Schreib-Ergebnissen. PL baut Digest mit potenziell veralteten Touched Paths → Slice-Coverage-Check false-positive für mis-gespeicherte Dateien. |
| `subagent-prompts.md` (Scribe Runden 1-3 Block, Pointer "Datei-Handoff") + `implement-scribe-agent.md` (Z.76-84) | slim block ca. Z.194-207; Profil Z.76-84 | 🟡 | **Datei-Handoff-Protokoll (scribe-\<slice\>.md + pointer-only Rückgabe) nicht im Profil.** Slim-Payload enthält Pointer "Datei-Handoff: implement-scribe-agent.md" + Variable "SecondBrain-Runden-Pfad:[...]". Read auf implement-scribe-agent.md: "## Rückgabe an Orchestrator" listet Inhalts-Felder (Slice-ID, Summary, Touched Paths...) ohne explizite Anweisung "Schreibe [SecondBrain-Runden-Pfad]/scribe-\<slice\>.md" und ohne "Rückgabe = NUR Pointer + Verdikt-Kurzform — kein Report-Body". Scribe 4-5 Payload enthält beide Anweisungen explizit (Z.248-254, Scope-Cut, unberührt). Mitigationen: PL-Profil (implement-round-executor.md Z.54) erwartet scribe-\<slice\>.md + pointer-only; subagent-prompts.md Header (Z.8-11) beschreibt Datei-Handoff global — aber der Header ist Dispatcher-Wissen, kein Scribe-Input. | Scribe (Runden 1-3) liest "Rückgabe an Orchestrator" im Profil als Inline-Rückgabe-Anweisung (analog zu implementierer-compact Template in derselben Datei). Liefert Summary-Body inline statt Datei-Write + Pointer. PL erwartet scribe-\<slice>.md (nicht gefunden) → Digest baut ohne Scribe-Daten → Slice-Coverage-Tabelle unvollständig → Downstream-Reviewer erhalten fehlende Evidenz-Grundlage. |

---

## Priorisiert nach Konsequenz

1. 🟡 **Post-Scribe-Verifikation** — Pflicht-Verifikationsschritt (read_files_batch) aus Scribe 1-3 Payload entfernt, nicht ins Profil übernommen. Plan-Klassifikation "Ablauf-Kopie im Profil" war unzutreffend. Asymmetrie zu Scribe 4-5 (Opus), der Instruction behält.
   - Fix-Hinweis: Abschnitt "## Post-Scribe-Verifikation (Pflicht — MCP-First)" in `implement-scribe-agent.md` ergänzen: `mcp__dev-mcp__read_files_batch([alle Touched Paths]) — kein natives Read/Grep; Verifikations-Ergebnis im Summary festhalten`.

2. 🟡 **Datei-Handoff-Protokoll** — "Schreibe scribe-\<slice\>.md + NUR Pointer zurück" explizit nur noch in Scribe 4-5 Payload; für Scribe 1-3 weder im Slim-Payload noch im Profil. PL-seitige Erwartung (implement-round-executor.md Z.54) federt ab, garantiert aber nicht die Scribe-seitige Ausführung.
   - Fix-Hinweis: In `implement-scribe-agent.md` "## Rückgabe an Orchestrator" ergänzen: "Schreibe `[SecondBrain-Runden-Pfad]/scribe-\<slice\>.md` mit diesen Feldern. Rückgabe an PL: **NUR Pointer + Verdikt-Kurzform** `scribe-\<slice\>.md · <RED|GREEN> · Dateien:<n> · build:<ok|fail> test:<ok|fail>` — kein Summary-Body inline."
