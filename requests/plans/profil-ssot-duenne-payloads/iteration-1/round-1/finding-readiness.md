# finding-readiness

Reviewer: readiness
MCP: BLOCKER (fallback: Read/Grep — dev-mcp + codebase-analyzer nicht verfügbar in Cloud-Linux-Session)
Verdikt: NO-SHIP

---

## Findings-Tabelle

| File | Line | Tier-Vorschlag | Befund | Failure-Scenario |
|------|------|:--------------:|--------|------------------|
| `.claude/agents/implement-scribe-agent.md` | — | 🔴 | Datei-Handoff-Abschnitt fehlt im Profil; Pointer im Scribe-1-3-Payload (`Datei-Handoff: implement-scribe-agent.md`) ist dangling. Profil hat nur Content-Bullets in `## Rückgabe an Orchestrator`, keine Anweisung zu: Datei-Name (`scribe-<slice>.md`), Schreib-Pfad, Pointer-Kurzform. | Scribe-1-3-Agent liest Profil, findet kein `## Datei-Handoff` → gibt Rückgabe inline zurück. PL erwartet `scribe-<slice>.md` im Runden-Pfad → Datei nicht vorhanden → Digest-Bau bricht, Inner Loop blockiert. Regression: Datei-Handoff-Anweisung war vor W1 im Payload vorhanden und wurde gestrippt unter der (unverifizierten) Annahme, sie stehe im Profil. |
| `.claude/agents/implement-scribe-agent.md` | — | 🟡 | Post-Scribe-Verifikation (`read_files_batch` aller Touched Paths) nicht im Profil. Plan klassifizierte sie als „Ablauf-Kopie, steht in Profil" — Verifikation fehlt; Profile-Abschnitt existiert nicht (grep-bestätigt). | Scribe-1-3-Agent überspringt `read_files_batch`-Schritt → stille Write-Failures werden nicht erkannt. Scribe 4-5 hat die Anweisung noch (unangetastet); Scribe 1-3 verliert sie durch W1. |
| `.claude/agents/implement-scribe-agent.md` | 41 | 🟢 | `## Angular Hard Rules` nutzt `##`-Ebene, während umgebende Abschnitte auf `###`-Ebene laufen (Phase 1, Phase 2). Kein funktionaler Impact. | Kosmetisch: Leser erwartet `###`-Abschnitt im Zweistufigen-Ablauf-Kontext; geringe Verwirrung beim ersten Lesen. |

---

## Ship-Readiness

**NO-SHIP**

🔴 vor Ship:
1. 🔴 `implement-scribe-agent.md` — `## Datei-Handoff`-Abschnitt ergänzen mit: (a) `Schreibe [SecondBrain-Runden-Pfad]/scribe-<slice>.md` (Felder: Summary Red/Green, Touched Paths, Build/Test-Matrix, Risiken/Blocker); (b) `Rückgabe an den PL: NUR Pointer + Verdikt-Kurzform scribe-<slice>.md · <RED|GREEN> · Dateien:<n> · build:<ok|fail> test:<ok|fail> — kein Summary-Body inline`. Referenz-Vorlage: Scribe-4-5-Block in `subagent-prompts.md` Z.249-254.
2. 🔴 `implement-scribe-agent.md` — `Post-Scribe-Verifikation`-Abschnitt ergänzen: `mcp__dev-mcp__read_files_batch([alle Touched Paths]) — kein natives Read/Grep; Verifikations-Ergebnis im Summary festhalten`. Fix-Hinweis: analog Scribe-4-5-Block Z.245-247.

🟢 nach Ship:
3. 🟢 Heading-Ebene `## Angular Hard Rules` auf `###` angleichen — rein kosmetisch.

**Begründung:** W1 hat Datei-Handoff-Beschreibung und Post-Scribe-Verifikation aus dem Scribe-1-3-Payload gestrippt unter der (unverifizierten) Plan-Annahme, beide stünden im Profil. Grep-Befund: weder `Datei-Handoff` noch `read_files_batch` noch `Rückgabe.*NUR Pointer` in `implement-scribe-agent.md` vorhanden. Das 🔴 Datei-Handoff-Finding macht Scribe-1-3-Dispatches funktional broken — kein scribe-*.md → kein Digest → Inner Loop blockiert. Die übrigen Änderungen (W0 OnPush-Migration, 7 Reviewer-Payloads, PL/PM-Payloads) sind korrekt und ship-ready.
