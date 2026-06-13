# Output-Stil-Kanon

Drei verbindliche Modi. Welcher gilt, steht im Skill oder Agent-Profil. Gilt für Orchestrator und jeden Subagent — analog zu [agent-compliance.md](./agent-compliance.md).

## Modi

| Modus | Wo | Regeln |
|-------|----|--------|
| **HUMAN-TERSE** | Buddy: compress · repo-check · diskussion | Bullets · vollständige Wörter · kein Fließtext · kein Warum · keine Einleitung |
| **BULLET-TERSE** | Alle Orchestratoren + Sub-Agents (User-sichtbar) | Stichpunkte · keine Prosa-Blöcke · keine Begrüßung · keine Zusammenfassungs-Sätze · vollständige Wörter |
| **MACHINE-DENSE** | Agent-zu-Agent-Übergaben · plan-prompt | Maximale Kompression · Key:Value · kein Fließtext · keine Höflichkeit · keine Rollenbeschreibung die Agent-Profil bereits enthält · Human-Readability irrelevant |

## Selbstchecks (Pflicht vor Ausgabe)

### HUMAN-TERSE

Vor jeder Ausgabe in compress / repo-check / diskussion:

1. Beginnt eine Zeile mit Fließtext statt Bullet? → Bullet.
2. Abkürzung irgendwo? → Ausschreiben.
3. Warum / Begründung drin? → Streichen.
4. Einleitungssatz ("Hier ist …", "Ich habe …")? → Löschen.

**Wenn eine Zeile den Check nicht besteht:**
→ STOPP. Ausgabe: `STILFEHLER: [Abschnitt] — HUMAN-TERSE verletzt. Ausgabe neu formulieren.`

### BULLET-TERSE

Vor jedem Sub-Agent-Deliverable / Orchestrator-Ausgabe:

1. Alle Abschnitte als Bullets oder Tabellen?
2. Kein Satz mit "Ich habe …" / "Es wurde …" / "Zusammenfassend …"?
3. Keine Prosa-Einleitung vor dem ersten inhaltlichen Punkt?

### MACHINE-DENSE

Vor jeder Agent-zu-Agent-Übergabe (Task-Prompt oder Rückgabe):

1. Alle im Empfänger-Profil bereits bekannten Fakten gestrichen?
2. Fließtext durch Key:Value oder Bullets ersetzt wo möglich?
3. Keine Höflichkeit / Rollenwiederholung?
4. Kontext auf Minimum gekürzt — nur was der Empfänger **nicht** aus dem Profil kennt?

## Opt-out

| Modus | Opt-out |
|-------|---------|
| HUMAN-TERSE | Kein Opt-out im Buddy (compress, repo-check, diskussion). |
| BULLET-TERSE | `ausführliche Antwort` im User-Thread erlaubt Fließtext. |
| MACHINE-DENSE | Kein Opt-out bei Agent-zu-Agent-Handoffs und plan-prompt. |
