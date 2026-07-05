# Plan · STORY-005 — auditor auflösen (Inner 7 → 6)

**Story:** `requests/stories/STORY-005_auditor-aufloesen-inner-7-auf-6.md` (type: story, parent: FEAT-001)
**Slug:** auditor-aufloesen-inner-7-auf-6
**Planungsmodus:** lean/solo (inline, kein plan-agent)
**Charakter:** Harness-Artefakt-Änderung — ausschließlich Markdown/Agent-Dateien. Kein .NET/Angular-Code.

---

## Phase 2 — Anforderung (Kurzfassung)

**Ziel:** auditor-Reviewer auflösen. Seine einzigartige Prüfung (Plan-Coverage-Vollständigkeit — „alle Testfall-Skizzen aus dem Planpaket umgesetzt?") erbt **verifier** als eigenen Checklisten-Punkt (nicht in bestehende AC-Coverage einschmelzen). **Go/No-Go entfällt** (redundant zu readiness SHIP/CONDITIONAL/NO-SHIP). Der Inner-Standard sinkt von 7 auf **6 Reviewer**: risk · design-principles · verifier · readiness · craft · guard.

**Randbedingungen (festgeschrieben):**
- Plan-Coverage-Vollständigkeit darf NICHT verloren gehen — eigener Abschnitt in verifier, nicht mit `### Akzeptanz-Coverage (§8/F4)` verschmelzen.
- `implement-review-auditor-agent.md` vollständig löschen.
- auditor-Payload + Go/No-Go-Zeile aus `subagent-prompts.md` entfernen.
- `implementation-flow.md`: alle Standard-7-Referenzen auf Standard-6 korrigieren, Auditor-Zeile aus Tabelle entfernen.
- Scope: exakt die 4 touches — keine weiteren Dateien.

**Verifikations-Befunde (Analyse des Ist-Stands):**
- `implement-review-auditor-agent.md` Z.19: „Liefert als einziger Impl-Reviewer ein Go/No-Go" — entfällt mit Datei-Löschung.
- `subagent-prompts.md` Z.426-436: Auditor-Payload-Block. Z.479-482: Auditor-Abschnitt im Review-Digest (inkl. Go/No-Go-Zeile). Z.507: „7 Rollen". Z.518: „Auditor: [Punkte oder —]".
- `implementation-flow.md`: 7-Referenzen an Zeilen 80, 103, 177, 202; Auditor-Tabellenzeile Z.125; Classifier-Zeilen 218/219 (Standard-7-Reviewer / Standard-7 + Integration); Reviewer-Liste Z.224; Abschnittstitel Z.420 + Z.422.
- Plan-Coverage im auditor: Z.27 „Akzeptanz→Test-Vollständigkeit: Alle Testfall-Skizzen aus dem Planpaket umgesetzt?" — dieser Punkt ist nicht in verifier enthalten; eigener neuer Abschnitt nötig.
- Go/No-Go ist ausschließlich in `auditor-agent.md` (Z.19/45/5) + `subagent-prompts.md` Z.481 (Review-Digest) — mit beiden Entfernungen vollständig eliminiert.

---

## Umsetzungs-Topologie

4 Slices, unabhängig (touch verschiedene Dateien) — sequenziell, kein Blocking.

| Slice | Datei | Art |
|-------|-------|-----|
| IMP-1 | `.claude/agents/implement-review-auditor-agent.md` | LÖSCHEN |
| IMP-2 | `.claude/agents/implement-review-verifier-agent.md` | ERWEITERN |
| IMP-3 | `.claude/skills/feature-delivery/flows/implementation-flow.md` | AKTUALISIEREN |
| IMP-4 | `.claude/skills/feature-delivery/references/subagent-prompts.md` | BEREINIGEN |

---

## IMP-1 — implement-review-auditor-agent.md LÖSCHEN

**Aktion:** Datei `.claude/agents/implement-review-auditor-agent.md` löschen.

**Prüft:** AC `AuditorProfilUndPayload_Entfernt` (Datei-Teil) · AC `GoNoGo_NochVorhanden_IstFehler` (Go/No-Go im Profil fällt mit der Datei weg).

---

## IMP-2 — implement-review-verifier-agent.md: Plan-Coverage-Punkt ergänzen

**Aktion:** Neuen Abschnitt `### Plan-Coverage-Vollständigkeit (von auditor geerbt — Pflicht)` nach `### Slice-Coverage-Check (zweites Netz)` einfügen — **nicht** in `### Akzeptanz-Coverage` einschmelzen.

**Inhalt des neuen Abschnitts:**
```
### Plan-Coverage-Vollständigkeit (von auditor geerbt — Pflicht)

- Alle Testfall-Skizzen aus dem Planpaket umgesetzt? (Plan-Akzeptanzliste vollständig abgearbeitet?)
- Kein Testfall-Skelett aus dem Planpaket übersprungen?
- Fehlende Umsetzung einer Planpaket-Testfall-Skizze → 🔴
```

**Output-Format:** `### Plan-Coverage`-Abschnitt im Output-Format-Block ergänzen:
```
### Plan-Coverage
- Alle Testfall-Skizzen aus Planpaket umgesetzt? [Ja | Nein: fehlende Skizzen]
```
— nach dem `### Slice-Coverage`-Block einfügen.

**Prüft:** AC `Verifier_PruetPlanCoverageVollstaendigkeit`.

---

## IMP-3 — implementation-flow.md: Standard-7 → Standard-6

**Konkrete Einzeländerungen (Reihenfolge top→down):**

| Stelle | Alter Text | Neuer Text |
|--------|-----------|-----------|
| Z.80 (implementiere-nur-Abschnitt) | `ohne die 7 Reviewer` | `ohne die 6 Reviewer` |
| Z.103 (Abgrenzung) | `PL/PM, 7 Reviewer)` | `PL/PM, 6 Reviewer)` |
| Z.125 (Tabelle Rollen) | Zeile `\| **Auditor** \| Review \| Sonnet \| …auditor-agent.md \|` | Zeile **entfernen** |
| Z.177 (Gate-1-Warnings) | `an alle 7 Reviewer + Fix-Planer` | `an alle 6 Reviewer + Fix-Planer` |
| Z.202 (Parallel-Pattern) | `UND 7 Reviewer-Agents` | `UND 6 Reviewer-Agents` |
| Z.218 (Classifier Single-Service) | `Standard-7-Reviewer` | `Standard-6-Reviewer` |
| Z.219 (Classifier Cross-Service) | `Standard-7 + Integration-Reviewer` | `Standard-6 + Integration-Reviewer` |
| Z.224 (Reviewer-Liste) | `Standard-7: risk (O) · … · auditor (S) · guard (S)` | `Standard-6: risk (O) · design-principles (O) · verifier (S) · readiness (S) · craft (S) · guard (S)` |
| Z.420 (Abschnittstitel 3.2) | `**3.2 Sieben Impl-Reviews** (parallel…)` | `**3.2 Sechs Impl-Reviews** (parallel…)` |
| Z.422 (Anzahl) | `7 Subagents, je eine Rolle.` | `6 Subagents, je eine Rolle.` |

**Prüft:** AC `InnerReviewerSet_Ist6` (Classifier + Reviewer-Set im Flow).

---

## IMP-4 — subagent-prompts.md: Reviewer-Set + auditor-Payload entfernen

**Konkrete Einzeländerungen:**

| Stelle | Aktion |
|--------|--------|
| Z.426-436: Block `### Impl-Review-Auditor` (inkl. Leerzeile davor + Divider `---` davor) | **Abschnitt komplett entfernen** |
| Z.479-482: `#### Auditor` + 3 Zeilen im Review-Digest-Template | **Block entfernen** (inkl. Leerzeile davor) |
| Z.507: `- Reviews je Iteration: 7 Rollen ausgeführt [ja/nein]` | `7` → `6` |
| Z.518: `- Auditor: [Punkte oder —]` | **Zeile entfernen** |

**Prüft:** AC `AuditorProfilUndPayload_Entfernt` (Payload-Teil) · AC `GoNoGo_NochVorhanden_IstFehler` (Go/No-Go im Digest-Block fällt weg) · AC `InnerReviewerSet_Ist6` (Rollen-Count im Abschlussformat).

---

## §8/F1 — Akzeptanz→Test-Liste (Prüfschritte, da kein automatisierter Test)

Da reine Markdown-Änderungen: „Tests" = Grep/Read-Struktur-Assertions nach der Umsetzung.

| # | Testname | Arrange | Act | Assert | Status |
|---|----------|---------|-----|--------|--------|
| T1 | `InnerReviewerSet_Ist6_InFlow` | `implementation-flow.md` nach IMP-3 | Grep nach „Standard-7" + „auditor" + „7 Reviewer" + „7 Subagents" | 0 Treffer | neu |
| T2 | `InnerReviewerSet_Ist6_InPrompts` | `subagent-prompts.md` nach IMP-4 | Grep nach „7 Rollen" + „Auditor" (Sektionskopf) | 0 Treffer | neu |
| T3 | `Verifier_PlanCoverageAbschnitt_Vorhanden` | `implement-review-verifier-agent.md` nach IMP-2 | Grep nach „Plan-Coverage-Vollständigkeit" | ≥1 Treffer | neu |
| T4 | `Verifier_PlanCoverageEigenerPunkt_NichtInACMap` | `implement-review-verifier-agent.md` | Read: Plan-Coverage unter eigenem `###`-Kopf? | `###`-Kopf vorhanden, nicht Unterabschnitt von `### Akzeptanz-Coverage` | neu |
| T5 | `AuditorProfil_Geloescht` | Repo nach IMP-1 | Glob `**/implement-review-auditor-agent.md` | 0 Treffer | neu |
| T6 | `AuditorPayload_Entfernt` | `subagent-prompts.md` nach IMP-4 | Grep nach „Impl-Review-Auditor" + „implement-review-auditor-agent" | 0 Treffer | neu |
| T7 | `GoNoGo_Entfernt` | alle 4 touch-Dateien nach Umsetzung | Grep nach „Go/No-Go" | 0 Treffer | neu |

---

## AC-Map (Plan-AC → Slice + Test)

| AC | Prüfschritte / Slices |
|----|----------------------|
| `InnerReviewerSet_Ist6` | IMP-3 (T1) + IMP-4 (T2) |
| `Verifier_PruetPlanCoverageVollstaendigkeit` | IMP-2 (T3 + T4) |
| `AuditorProfilUndPayload_Entfernt` | IMP-1 (T5) + IMP-4 (T6) |
| `GoNoGo_NochVorhanden_IstFehler` | IMP-1 implizit + IMP-4 (T7) |
