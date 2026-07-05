---
feature: di-merge-abnahme-reviewer
story: STORY-004
created: 2026-07-05
status: draft
---

# Plan: STORY-004 · ①-Merge · DI Normalo + Auftraggeber → „Abnahme" (6→5)

## Kontext

Fusion der DI-Reviewer Normalo + Auftraggeber zu einem „Abnahme"-Reviewer.
Hülle verschmolzen, Linse nicht: ein Spawn, eine `di-finding-abnahme.md`, zwei getrennt
ausgewiesene Urteile (pragmatisch + streng). Count-Guard N=6 → N=5.

Scope (aus Story-touches):
- `.claude/skills/delivery-inspection/SKILL.md` — Hauptedit (10 Edit-Points)
- `.claude/skills/feature-delivery/references/subagent-prompts.md` — Rand-Edit (3 Edit-Points)

Kein Code (.NET/.Angular), keine weiteren Dateien.

---

## AC → Prüfschritt-Mapping

| AC | Prüfschritt |
|---|---|
| `DI_ReviewerCount_Ist5` | SKILL.md: Count-Guard-Wert N=5 an allen 3 Stellen (YAML-description, Standalone-Foreground, Ablauf-Loop); Normalo + Auftraggeber nicht mehr als Einzel-Reviewer gelistet |
| `Abnahme_LiefertZweiUrteile_PragmatischUndStreng` | SKILL.md Abnahme-Abschnitt: zwei explizit getrennte Urteilsblöcke (Urteil 1 — pragmatisch, Urteil 2 — streng) in einer `di-finding-abnahme.md` definiert; subagent-prompts.md DI-Rollen-Liste enthält Abnahme statt Normalo + Auftraggeber |
| `UrteilsKollision_WirdGemeldet_NieGeglaettet` | SKILL.md Abnahme-Abschnitt: Kollisionsregel formuliert — bei gegensätzlichem Ausgang wird Kollision explizit gemeldet, nie geglättet; Terminal-PM sieht beide |
| `Abnahme_MitEinemFusioniertenUrteil_IstUngueltig` (Negativ) | SKILL.md Abnahme-Abschnitt: Ungültigkeitsregel verankert — einzelnes zusammengeglättetes Urteil = ungültig; zwei getrennte Urteile = Pflicht |

---

## Umsetzungs-Topologie

Zwei Slices, W1 parallel (disjunkte Dateien — kein Blocking):

| Slice | Datei | Welle |
|---|---|---|
| IMP-1 | `.claude/skills/delivery-inspection/SKILL.md` | W1 |
| IMP-2 | `.claude/skills/feature-delivery/references/subagent-prompts.md` | W1 |

---

## IMP-1 — delivery-inspection/SKILL.md (10 Edit-Points)

### Edit-1 — YAML frontmatter `description` (Zeile 5-8)

OLD:
```
  Pruefung vor der Auslieferung — prueft ob alle Anforderungen/Wuensche/Requests des Users
  angegangen, umgesetzt und nichts vergessen wurde. 6 parallele Reviewer: Revisor (Requirements-Map),
  Skeptiker (Lücken), Normalo (Abnahme-Pragmatik), Dolmetscher (Fehlinterpretationen),
  Auftraggeber (finale Abnahme), Querdenker (YAGNI/Scope-Creep). Iterativer Loop bis sauber.
```

NEW:
```
  Pruefung vor der Auslieferung — prueft ob alle Anforderungen/Wuensche/Requests des Users
  angegangen, umgesetzt und nichts vergessen wurde. 5 parallele Reviewer: Revisor (Requirements-Map),
  Skeptiker (Lücken), Abnahme (pragmatisch+streng — ein Spawn, zwei Urteile), Dolmetscher (Fehlinterpretationen),
  Querdenker (YAGNI/Scope-Creep). Iterativer Loop bis sauber.
```

### Edit-2 — Reviewer-Constraint Heading (Zeile 31)

OLD: `**Gilt für alle 6 Reviewer-Agents ohne Ausnahme.**`
NEW: `**Gilt für alle 5 Reviewer-Agents ohne Ausnahme.**`

### Edit-3 — Reviewer-Rollen Section Heading (Zeile 49)

OLD: `## Reviewer-Rollen (6 parallele, unabhaengige Perspektiven)`
NEW: `## Reviewer-Rollen (5 parallele, unabhaengige Perspektiven)`

### Edit-4 — Normalo-Block durch Abnahme-Block ersetzen (Zeilen 76-79)

Normalo-Block vollständig ersetzen:

OLD:
```
**Normalo** — Pragmatische Abnahme
Nimmt die Nutzerperspektive ein: Kann ich das Deliverable direkt produktiv einsetzen?
Ist es alltagstauglich? Wuerde ich als normaler Nutzer zufrieden sein? Gesamtbewertung +
Top-3 konkrete Handlungsempfehlungen.
```

NEW:
```
**Abnahme** — Doppellinse: pragmatisch + streng

Ein Spawn, ein Kontext, eine `di-finding-abnahme.md` — mit zwei getrennt ausgewiesenen Urteilen:

**Urteil 1 — pragmatisch:**
Nutzerperspektive: Kann ich das Deliverable direkt produktiv einsetzen? Ist es alltagstauglich?
Wuerde ich als normaler Nutzer zufrieden sein? Gesamtbewertung + Top-3 konkrete Handlungsempfehlungen.

**Urteil 2 — streng:**
Strengste Perspektive: Wuerde ich das als Besteller so unterschreiben? Entspricht das meiner
Erwartungshaltung? Hat der Auftragnehmer das Richtige gebaut — nicht nur etwas Richtiges?
Gesamturteil: abnahmefaehig / nicht abnahmefaehig + Begruendung.

**Kollisionsregel:** Kommen pragmatisch und streng zu gegensaetzlichem Ergebnis, wird die
Kollision explizit gemeldet — nie geglaettet. Der Terminal-PM sieht beide Urteile.

**Ungueltigkeitsregel (Negativ-AC):** Ein einzelnes, zusammengeglattetes Urteil ist ungueltig —
genau zwei getrennte Urteile sind Pflicht (Linse nicht fusioniert).
```

### Edit-5 — Auftraggeber-Block entfernen (Zeilen 89-93)

Auftraggeber-Block vollständig löschen (inkl. Leerzeile davor):

OLD:
```

**Auftraggeber** — Finale Abnahme
Strengste Perspektive: Wuerde ich das als Besteller so unterschreiben? Entspricht das meiner
Erwartungshaltung? Hat der Auftragnehmer das Richtige gebaut — nicht nur etwas Richtiges?
Gesamturteil: abnahmefaehig / nicht abnahmefaehig + Begruendung.
```

NEW: *(leer — Block entfällt ersatzlos)*

### Edit-6 — Foreground-Kontext Standalone-Beschreibung (Zeile 108)

OLD:
```
spawnt dieser die 6 Reviewer und muss nach dem parallelen Spawn **aktiv auf alle 6 direkten Antworten warten und zählen**, bevor er mit Schritt 2 fortfährt. **Count-Guard: erst bei N=6 weiter** (auf direkte Rückgaben, kein Background/Notification-Wait).
```

NEW:
```
spawnt dieser die 5 Reviewer und muss nach dem parallelen Spawn **aktiv auf alle 5 direkten Antworten warten und zählen**, bevor er mit Schritt 2 fortfährt. **Count-Guard: erst bei N=5 weiter** (auf direkte Rückgaben, kein Background/Notification-Wait).
```

### Edit-7 — Ablauf Schritt-1 Header (Zeile 118)

OLD: `**Schritt 1 — 6 Reviewer parallel**`
NEW: `**Schritt 1 — 5 Reviewer parallel**`

### Edit-8 — Ablauf Schritt-1 Body + Count-Guard (Zeilen 119-123)

OLD:
```
Alle 6 Reviewer-Sub-Agents gleichzeitig beauftragen, unabhaengig voneinander.
Jeder erhaelt: die originale Anforderung/Request-Liste + das Deliverable (Diff, Dateien, Beschreibung).
Pflicht-Constraint fuer jeden Reviewer: Kein eigenstaendiger Tool-Call — nur Kontext-Analyse (Details: ## ⚠️ Reviewer-Constraint).
Alle 6 Reports abwarten.
**Count-Guard:** erhalten: N/6 — nicht weiter bevor N=6. Erst wenn alle 6 Reports vorliegen, konsolidierten Gesamt-Report zurückgeben.
```

NEW:
```
Alle 5 Reviewer-Sub-Agents gleichzeitig beauftragen, unabhaengig voneinander.
Jeder erhaelt: die originale Anforderung/Request-Liste + das Deliverable (Diff, Dateien, Beschreibung).
Pflicht-Constraint fuer jeden Reviewer: Kein eigenstaendiger Tool-Call — nur Kontext-Analyse (Details: ## ⚠️ Reviewer-Constraint).
Alle 5 Reports abwarten.
**Count-Guard:** erhalten: N/5 — nicht weiter bevor N=5. Erst wenn alle 5 Reports vorliegen, konsolidierten Gesamt-Report zurückgeben.
```

### Edit-9 — Loop-Abbruchbedingung + Hard-Cap-Loop-Text (Zeilen 114 + 171)

Zeile 114:
OLD: `Loop laeuft solange bis alle 6 Reviewer keine behebbaren Findings mehr melden.`
NEW: `Loop laeuft solange bis alle 5 Reviewer keine behebbaren Findings mehr melden.`

Zeile 171:
OLD: `Lieferten alle 6 Reviewer keine behebbaren Findings mehr → Loop endet.`
NEW: `Lieferten alle 5 Reviewer keine behebbaren Findings mehr → Loop endet.`

### Edit-10 — Abschlussmeldung + Integration (Zeilen 190-204)

Abschlussmeldung (Zeile 191-192):
OLD:
```
> Alle 6 Perspektiven (Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker)
> ohne offene Findings.
```
NEW:
```
> Alle 5 Perspektiven (Revisor · Skeptiker · Abnahme · Dolmetscher · Querdenker)
> ohne offene Findings.
```

Integration-Abschnitt (Zeile 199):
OLD: `Er dispatcht die 6 Reviewer-Rollen direkt (Modus A oben).`
NEW: `Er dispatcht die 5 Reviewer-Rollen direkt (Modus A oben).`

Integration-Abschnitt (Zeile 106, Modus A):
OLD: `Der **Terminal-PM** dispatcht die 6 Reviewer-Rollen **direkt** als Vordergrund-Sub-Agents`
NEW: `Der **Terminal-PM** dispatcht die 5 Reviewer-Rollen **direkt** als Vordergrund-Sub-Agents`

Integration-Abschnitt — Pointer-Rückgaben (Zeile 107):
OLD: `Der Terminal-PM wartet auf die **6 direkten Pointer-Rückgaben** (Vordergrund, synchron)`
NEW: `Der Terminal-PM wartet auf die **5 direkten Pointer-Rückgaben** (Vordergrund, synchron)`

---

## IMP-2 — subagent-prompts.md (3 Edit-Points)

### Edit-1 — Session-Treiber DI-Count (Zeile 99)

OLD: `• Terminal-PM → 6 DI-Reviewer = Vordergrund-Dispatch`
NEW: `• Terminal-PM → 5 DI-Reviewer = Vordergrund-Dispatch`

### Edit-2 — DELIVERY-INSPECTION → CLOSURE Schritt 1 Header (Zeile 165)

OLD: `Terminal-PM Schritt 1 — outer/di-N/ anlegen, dann 6 DI-Reviewer im Vordergrund dispatchen:`
NEW: `Terminal-PM Schritt 1 — outer/di-N/ anlegen, dann 5 DI-Reviewer im Vordergrund dispatchen:`

### Edit-3 — DELIVERY-INSPECTION → CLOSURE Rollen-Liste (Zeile 166)

OLD: `Rollen: Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker (s. delivery-inspection/SKILL.md).`
NEW: `Rollen: Revisor · Skeptiker · Abnahme · Dolmetscher · Querdenker (s. delivery-inspection/SKILL.md).`

---

## Akzeptanz→Test-Liste (F1 — Struktur-Checks, kein Test-Framework)

| Testfall | Red-Nachweis (vor Edit) | Green-Nachweis (nach Edit) |
|---|---|---|
| `DI_ReviewerCount_Ist5` | SKILL.md enthält N=6 an 4 Stellen; Normalo + Auftraggeber als Einzel-Reviewer gelistet | SKILL.md: alle Count-Guard-Stellen zeigen N=5; kein eigener Normalo/Auftraggeber-Block mehr vorhanden |
| `Abnahme_LiefertZweiUrteile_PragmatischUndStreng` | Kein Abnahme-Block; Normalo+Auftraggeber getrennt; subagent-prompts.md listet beide getrennt | Abnahme-Block definiert „Urteil 1 — pragmatisch" + „Urteil 2 — streng"; subagent-prompts.md Rollen-Liste = Abnahme |
| `UrteilsKollision_WirdGemeldet_NieGeglaettet` | Kein Kollisions-Hinweis in SKILL.md | Abnahme-Block: Kollisionsregel mit „nie geglaettet" + Terminal-PM-Hinweis |
| `Abnahme_MitEinemFusioniertenUrteil_IstUngueltig` | Keine Ungültigkeitsregel | Abnahme-Block: Ungültigkeitsregel mit „zusammengeglattetes Urteil ist ungueltig" |

---

## Nicht-Scope (explizit ausgeschlossen)

- `CLAUDE.md` — erwähnt "6 Reviewer" in der delivery-inspection-Zeile; nicht in Story-touches
- `.claude/skills/feature-delivery/SKILL.md` — externe Skill-Referenz-Zeile mit "6 Reviewer"; nicht in Story-touches
- `.claude/agents/` — keine DI-spezifischen Count-Guards
- Keine weiteren Dateien
