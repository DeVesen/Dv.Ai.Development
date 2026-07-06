# Plan — STORY-003 · Geteilte Evidenz als Pointer

- Story: `requests/stories/STORY-003_geteilte-evidenz-als-pointer.md`
- Planungs-Modus: lean/solo
- Planungs-Datum: 2026-07-05

## Ziel

PL (`implement-round-executor`) schreibt Slice-Coverage-Tabelle + `review_git_diff`-Befunde
**einmal** pro Runde in `round-M/evidence.md`. Die Impl-Reviewer bekommen im Payload den
**Pointer** auf diese Datei statt des bisherigen Inline-Evidenz-Blocks ×N.
Ersparnis: PL-seitig (kein N-fach wiederholter Block im Opus-Output).
DI-Reviewer: bleiben unverändert (kein Tool-Call erlaubt — können `evidence.md` nicht lesen).

---

## AC-Map (jedes AC auf Prüfschritt gemappt)

| AC | Prüfschritt | Slice |
|----|-------------|-------|
| `PL_SchreibtEvidence_EinmalProRunde` | In `implement-round-executor.md` Schritt 2 steht explizit ein "Schreibe `round-M/evidence.md`"-Block mit Slice-Coverage-Tabelle + `review_git_diff`-Befunden; Schritt 4 enthält **keinen** Inline-Evidenz-Block mehr | IMP-001 |
| `ImplReviewerPayload_TraegtEvidencePointer` | Alle 7 Impl-Reviewer-Templates in `subagent-prompts.md` tragen `Evidenz-Pointer:[…/evidence.md]` statt `Aktueller Diff / betroffene Pfade:[…]` bzw. `Slice-Coverage-Tabelle:[…]` | IMP-002 |
| `DiReviewer_BleibtInline_KeinPointer` (Negativ) | `DELIVERY-INSPECTION → CLOSURE` in `subagent-prompts.md` ist unverändert — kein `Evidenz-Pointer`-Feld, originale Inline-Evidenz-Übergabe (Story-ACs + Diff + Gate-Status + Summary) erhalten | IMP-002 (Nicht-Änderung) |
| `ReviewerErgebnis_Unveraendert` (Guard) | `evidence.md` enthält exakt dieselben Felder (Slice-Coverage-Tabelle + `review_git_diff`-Befunde), die vorher inline übergeben wurden — keine Information weggelassen oder verändert; nur Zugriffspfad ändert sich | IMP-001 (Inhalt), IMP-002 (Konsistenz) |

---

## Umsetzungs-Topologie

```
W1: IMP-001 (implement-round-executor.md) → W2: IMP-002 (subagent-prompts.md)
```

Seriell: W2 baut auf dem in W1 definierten `evidence.md`-Format/Inhalt auf.

| Slice-ID | Datei | Welle | Scope |
|----------|-------|-------|-------|
| IMP-001 | `.claude/agents/implement-round-executor.md` | W1 | Schritt 2: evidence.md schreiben; Schritt 4: Pointer statt Inline-Block |
| IMP-002 | `.claude/skills/feature-delivery/references/subagent-prompts.md` | W2 | 7 Impl-Reviewer-Templates: Pointer statt Inline-Block; DI-Sektion: unverändert |

---

## IMP-001 — `.claude/agents/implement-round-executor.md`

### Änderung 1: Schritt 2 — Integration-Checkpoint (Ergänzung)

**Position:** Nach dem bestehenden Slice-Coverage-Check-Block (Zeile 59: "Diese Slice-Coverage-Tabelle
geht als Pflicht-Evidenz in jeden Reviewer-Prompt.") und nach dem Interface-/Contract-Drift-Check.

**Einfügen** (neuer Pflicht-Block am Ende von Schritt 2):

```
**Evidence-Datei schreiben (Pflicht, nach Slice-Coverage-Check + review_git_diff):**
Schreibe `round-M/evidence.md` mit:
- Slice-Coverage-Tabelle (IMP-Slice → Touched Paths, aus den `scribe-<slice>.md` aggregiert)
- `review_git_diff`-Befunde (alle focusAreas)
Diese Datei ist die **einzige** Evidenz-Quelle aller Impl-Reviewer dieser Runde —
kein N×-Block im PL-Output (Schritt 4 übergibt nur noch den Pointer).
```

**Warum hier:** Schritt 2 ist der logische Ort — Slice-Coverage-Tabelle wird bereits dort gebaut,
und `review_git_diff` läuft als Teil der Gate-Sequenz (Schritt 3) oder Analyse. Erst wenn beide
Datenquellen vorliegen, kann `evidence.md` geschrieben werden. Der Schreibvorgang ist abgeschlossen,
bevor die Reviewer in Schritt 4 dispatcht werden.

> **Anmerkung zum `review_git_diff`-Zeitpunkt:** Schritt 2 erwähnt `review_git_diff` nicht explizit.
> Der Diff-Lauf liegt typischerweise beim Interface-/Contract-Drift-Check. Die Formulierung
> "nach Slice-Coverage-Check + `review_git_diff`" stellt sicher, dass beide Inputs vorliegen,
> ohne die Gate-Reihenfolge (Schritt 3) zu verändern. Wenn der Scribe den review_git_diff
> erst nach Schritt 3 (Gates) kennt, wird der evidence.md-Block an das Ende von Schritt 3 (nach
> Gate 4 — TEST-SUITE) verschoben, direkt vor Schritt 4. Die Scribe-Sicht auf den Diff nach den
> Gates ist der sicherere Ort; der Plan lässt diese Verortungsentscheidung dem Scribe offen, solange
> evidence.md **vor** Schritt 4 vorliegt.

### Änderung 2: Schritt 4 — Reviewer (Evidenz-Übergabe)

**Position:** Zeile 72, Satz "Jeder Reviewer bekommt den Runden-Pfad + Slice-Coverage-Tabelle +
`review_git_diff`-Befunde als Evidenz + den Kanon-Pointer..."

**Alt:**
```
Jeder Reviewer bekommt den Runden-Pfad + Slice-Coverage-Tabelle + `review_git_diff`-Befunde
als Evidenz + den Kanon-Pointer `../skills/feature-delivery/references/reviewer-gate-canon.md`
```

**Neu:**
```
Jeder Reviewer bekommt den Runden-Pfad + **Evidenz-Pointer `round-M/evidence.md`**
(enthält: Slice-Coverage-Tabelle + `review_git_diff`-Befunde; vom PL in Schritt 2 geschrieben)
+ den Kanon-Pointer `../skills/feature-delivery/references/reviewer-gate-canon.md`
```

### Nicht verändert

- Schritt 6 (Rückgabe) — unverändert
- DI-Reviewer-Übergaben — nicht vorhanden in diesem Profil (liegt beim Terminal-PM via `subagent-prompts.md`)
- Verboten-Liste — unverändert

---

## IMP-002 — `.claude/skills/feature-delivery/references/subagent-prompts.md`

### Änderungsregel (gilt für alle 7 Impl-Reviewer-Templates)

- **Entfernen:** `Aktueller Diff / betroffene Pfade:[…]` und `Slice-Coverage-Tabelle (Pflicht-Input vom PL):[…]`
- **Hinzufügen:** `Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]`
- **Unverändert:** Gate-Status-Felder, Runden-Pfad, Kanon-Pointer, Profil-Zeile, Ablauf-Referenz

### Änderungen je Template (7 Stück)

#### Impl-Review-Design-Principles (ca. Zeile 362–368)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
Gate-2-Status (inkl. analyze_iosp_compliance-Befunde):[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-2-Status (inkl. analyze_iosp_compliance-Befunde):[…]
```

#### Impl-Review-Risk (ca. Zeile 374–381)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
Gate-Status (Build, Statische Analyse, Tests):[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-Status (Build, Statische Analyse, Tests):[…]
```

#### Impl-Review-Verifier (ca. Zeile 387–394)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
Slice-Coverage-Tabelle (Pflicht-Input vom PL):[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

*(Beide Felder werden durch den einen Pointer abgedeckt — der Verifier liest Diff + Slice-Coverage
aus `evidence.md`.)*

#### Impl-Review-Readiness (ca. Zeile 400–407)

Kein `Aktueller Diff`-Feld vorhanden; `evidence.md`-Pointer wird ergänzt (konsistent mit dem
PL-Verhalten in Schritt 4, der allen Reviewern den Pointer gibt):

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Gate-Status:[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
Gate-Status:[…]
```

#### Impl-Review-Craft (ca. Zeile 413–420)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

#### Impl-Review-Auditor (ca. Zeile 426–433)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

#### Impl-Review-Guard (ca. Zeile 439–446)

Alt:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Aktueller Diff / betroffene Pfade:[…]
```

Neu:
```
Runden-Pfad:[requests/plans/<feature>/iteration-N/round-M/]
Evidenz-Pointer:[requests/plans/<feature>/iteration-N/round-M/evidence.md]
```

### Randbedingung: `DELIVERY-INSPECTION → CLOSURE` (kein Eingriff)

Der Block ab "Terminal-PM Schritt 1" bleibt vollständig unverändert:
```
Kontext je Reviewer: originale Story-ACs + finaler Diff/Touched-Paths + Gate-Status + Inner-Loop-Summary
  + Pfad outer/di-N/ + Kanon-Pointer ...
Constraint (delivery-inspection): kein eigenständiger Tool-Call außer dem Schreiben der eigenen di-finding-<rolle>.md.
```
Diese DI-Evidenz bleibt inline — `delivery-inspection/SKILL.md:44` verbietet eigenständige
Tool-Calls für DI-Reviewer; ein `Read evidence.md`-Aufruf wäre ein Regelverstoß.

---

## Dokumentations-Schuld (außerhalb des Scope — Folge-Task)

`secondbrain-schema.md` — Verzeichnis-Layout unter `round-M/` listet `evidence.md` noch nicht auf.
Vorschlag für Folge-Task: Eintrag `evidence.md — Geteilte Evidenz-Datei (Slice-Coverage-Tabelle +
review_git_diff-Befunde, einmal pro Runde vom PL geschrieben)` im Verzeichnis-Layout ergänzen.
Scope dieser Story bewusst nicht erweitert (touches: nur 2 Dateien, festgeschrieben).

---

## Akzeptanz→Test-Liste (§8/F1)

### F1-AC-1: `PL_SchreibtEvidence_EinmalProRunde`

- **Arrange:** `implement-round-executor.md` nach IMP-001 angewendet; Runde M mit Slice-Coverage + `review_git_diff`-Befunden
- **Act:** Schritt 2 lesen → Pflicht-Block "Evidence-Datei schreiben" vorhanden; Schritt 4 lesen → kein Inline-Evidenz-Block (keine `Slice-Coverage-Tabelle + review_git_diff-Befunde als Evidenz`-Formulierung mehr)
- **Assert:**
  - Genau ein Schreib-Aufruf `round-M/evidence.md` in Schritt 2 spezifiziert
  - Inhalt: Slice-Coverage-Tabelle **und** `review_git_diff`-Befunde explizit benannt
  - Schritt 4: nur noch `Evidenz-Pointer round-M/evidence.md`, kein Inline-Block

### F1-AC-2: `ImplReviewerPayload_TraegtEvidencePointer`

- **Arrange:** `subagent-prompts.md` nach IMP-002 angewendet; alle 7 Impl-Reviewer-Templates
- **Act:** Jedes der 7 Templates prüfen: `Evidenz-Pointer:[…/evidence.md]` vorhanden; `Aktueller Diff / betroffene Pfade:[…]` und `Slice-Coverage-Tabelle (Pflicht-Input vom PL):[…]` nicht mehr vorhanden
- **Assert:** Alle 7 Templates mit Pointer; kein Inline-Diff-Block in keinem der 7

### F1-AC-3: `DiReviewer_BleibtInline_KeinPointer` (Negativ)

- **Arrange:** `subagent-prompts.md` nach IMP-002 angewendet; Block `DELIVERY-INSPECTION → CLOSURE` → Terminal-PM Schritt 1
- **Act:** DI-Reviewer-Kontext-Zeile prüfen: `originale Story-ACs + finaler Diff/Touched-Paths + Gate-Status + Inner-Loop-Summary`; kein `Evidenz-Pointer`-Feld vorhanden
- **Assert:** DI-Block unverändert; `Evidenz-Pointer` kommt im DI-Abschnitt nicht vor

### F1-AC-4: `ReviewerErgebnis_Unveraendert` (Guard)

- **Arrange:** IMP-001 + IMP-002 angewendet
- **Act:** `evidence.md`-Inhaltsdefinition (IMP-001 Schritt 2) mit bisherigem Inline-Block (Schritt 4 alt) vergleichen
- **Assert:** `evidence.md` enthält exakt Slice-Coverage-Tabelle + `review_git_diff`-Befunde = identisch zum früheren Inline-Block; kein Information-Delta
