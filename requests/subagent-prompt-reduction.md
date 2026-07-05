# Subagent-Prompt- & Reviewer-Reduktion — feature-delivery

**Status:** Brainstorming abgeschlossen (via `/grill-me`), entscheidungsreif — noch nicht geplant, noch nicht umgesetzt.
**Ziel:** Token-/Kontext-Verbrauch der von PM/PL (und plan-agent) gestarteten Sub-Agents senken — ohne Verlust an Review-Genauigkeit.
**Grundrichtung:** Pro-Agent-Prompt senken **(B)** + gezielte Reviewer-Reduktion. **Kein** Blanko-Fan-out-Verzicht (⑤ bewusst geparkt).

---

## Kernbefund

Der **Rückgabe-Pfad** ist bereits schlank (Pointer-only, File-Handoff, machine-dense). Die Tokens
stecken im **Eingangs-Pfad**: Prompt (Boilerplate + Payload + Kontext-Daten) **plus** das, was der
Sub-Agent auf Befehl **liest** (agent-compliance + Profil + „genannte Skills vollständig" + Kanon).

---

## Aktiver Scope — beschlossen

### A · Prompt-Diät (alle Übergaben: inner + outer + Planung)

| # | Beschluss | Detail |
|---|-----------|--------|
| **②** | **Profil = Single Source of Truth, Payloads dünn** | Ablauf lebt nur im Agent-Profil (wird per Boilerplate-Punkt 1 ohnehin garantiert gelesen). Payload trägt nur **Pointer + variable Rundendaten**. Heute ist jeder Payload in `subagent-prompts.md` eine zweite Kopie seines Profils. **Größter Einzel-Gewinn: `plan-agent`-Payload** — trippelt heute `planning-flow.md` + Profil + Payload. Gilt für: PL, PM, Scribe, alle Impl-Reviewer, Fix-Planer, plan-agent. |
| **④** | **Read-Scoping — konservativ** | Nur beweisbare Redundanz + klar überdimensionierte Voll-Reads. **Konkret:** Doppel-Read `codebase-analyzer/SKILL.md` beim Fix-Planer (Pflicht-Punkt 2 = 3) raus. Große Skills auf **benannte Sektion** verengen, wo sauberer Anker existiert; im Zweifel voller Read. **Boilerplate unangetastet** — Steuerung nur über das im Payload *Benannte* (Boilerplate-Regel „nicht paraphrasieren/weglassen" bleibt gewahrt). |
| **①** | **Geteilte Evidenz als Pointer** | PL schreibt Slice-Coverage-Tabelle + `review_git_diff`-Befunde **einmal** in `round-M/evidence.md`; die Impl-Reviewer bekommen den Pointer statt des Inline-Blocks ×N. **PL-seitige** Ersparnis (kein N×-Evidenz-Block im Opus-Output), reviewer-seitig neutral. **Nur Impl-Seite** — DI-Reviewer können es nicht (kein Tool-Call erlaubt). |

### B · Reviewer-Struktur

| # | Beschluss | Detail |
|---|-----------|--------|
| **① Merge** | **Normalo + Auftraggeber → „Abnahme"** (outer/DI) | *Ein* Agent (ein Spawn, ein Kontext, eine `di-finding-abnahme.md`), aber **zwei getrennt ausgewiesene Urteile**: pragmatisch (nutzbar/alltagstauglich?) + streng (unterschreibbar? das *Richtige* gebaut?). Kollision der beiden wird **gemeldet, nie geglättet** — Terminal-PM sieht beide. Fusion der Hülle, nicht der Linse. **DI 6 → 5.** *(Name „Abnahme" — Konventionswahl, anderes Wort genügt.)* |
| **③ Auflösung** | **auditor auflösen** (inner) | Die *eine* einzigartige Prüfung — unabhängige **Plan-Coverage-Vollständigkeit** („alle Testfall-Skizzen aus dem Planpaket umgesetzt?") — erbt **verifier** (besitzt AC-Coverage ohnehin) als expliziter Checklisten-Punkt. **Go/No-Go entfällt** (redundant zu readiness SHIP/CONDITIONAL/NO-SHIP). **Inner Standard-7 → 6** (risk · design-principles · verifier · readiness · craft · guard). |
| **⑥** | **🟢 abgeschafft — Tier-Achse binär 🔴/🟡** | Reviewer melden nur noch 🔴 (blockt) + 🟡 (meldet, blockt nicht). **§3-Tripwire kippt:** Präferenz/Politur ohne Folge → **kein Finding** (statt „→ 🟢"). §1+§3 verschmelzen zu: *keine Folge → nicht aufführen.* **Mindest-Mengen gestrichen** (craft ≥3, auditor ≥5 — waren die 🟢-Fabrik). §5/§7-🟢-Fluchttüren („höchstens 🟢-Notiz" / „🟢-only") → **„nicht melden".** **Positiv-Blöcke §8.3 bleiben** (PRESERVE-Liste, Ship-/AC-Map — keine 🟢-Findings, sondern mandatierte Deliverables). Begründung: 🟢 blockt nie, kostet aber auf jeder Pipeline-Stufe Token und löst beim Leser das irreführende „aha, was denn?" aus. |

---

## Wirkungs-Landkarte

- **Reviewer-Seite** entlasten → ②, ④, ⑥, ③, ①-Merge
- **Dispatcher-Seite (PL)** entlasten → ①, ⑥ (schlankerer Digest/Index)
- **Planungs-Seite** entlasten → ② (plan-agent-Payload), ④ (Read-Fan-out)

## Resultierende Zählungen
- Inner Impl-Reviewer: **Standard-7 → 6** (auditor weg)
- Outer DI-Reviewer: **6 → 5** (Normalo+Auftraggeber → Abnahme)
- Tier-Achse: **3-stufig → binär** (🟢 weg)

---

## Strang C · Task-normalisierter Planner-Output-Contract (⑧) — eigenes, größeres Feature

**Herkunft:** ⑦ „Plan als Pointer" (Plan-Text nicht mehr in Scribe/Fix-Planer/Reviewer inlinen, sondern
Pointer + Slice-ID). ⑦ spart bei Reviewern/Ganzplan-Lesern aber nur *dispatcher-seitig*. **⑧ subsumiert ⑦**
und macht es beidseitig.

**Idee:** Planner-Output ist nicht *ein* Plan-Dokument, sondern eine **normalisierte Task-„Datenbank"**:
`tasks/task-NNN.md` pro Task + `tasks/index.md` (Topologie). Handoff überträgt in Iteration 1 **nur Verweise**
(Task-ID-Pointer), jeder Agent liest **nur seine winzige Task-Datei** → spart auf **beiden** Seiten.
**Kopplung:** Output-Contract des Planners = Input-Contract des Umsetzers → gemeinsam zu betrachten/definieren.

### Granularität — Zwei-Ebenen-Modell (beschlossen: testbar, kein Kontextverlust)
- **Task-Atom = eine vertikale, eigenständig test-first-verifizierbare Verhaltenseinheit** (≈ heutiger IMP-Slice),
  eine Datei je Task. **Grenze an der Vertragsnaht, nicht an der Uhr.**
- **3–5-Min-Granularität = Schritt-Checkliste *im* Task**, nicht als Task-Grenze. (Harte 3–5-Min-als-Task
  verworfen: zerschneidet den Test-First-Zyklus, Datei-Explosion, Kontextverlust.)
- Task-Kriterien: (1) ≥1 Akzeptanztest rot→grün *im* Task · (2) eine Verantwortung (kein „und") ·
  (3) unabhängig verifizierbar (sonst explizite `depends-on`) · (4) Naht = neuer Endpoint/DTO/Komponenten-Vertrag/Regel.

### Task-Datei-Schema
```
tasks/task-007.md
  ## Vertrag/Refs      ← Pointer auf Interface-Kontrakt (Kontext gewahrt)
  ## Akzeptanz→Test    ← ≥1 Test, rot→grün (F1)
  ## Schritte          ← 3–5-Min-Checkliste
  ## touches / depends-on / wave
tasks/index.md         ← Topologie (Wellen/Blocking) = einziger Ganzblick für PL/Reviewer
```

### Cut-Prozedur (Planner, mechanisch)
1. Von Topic-Map / IMP-Slices ausgehen. 2. Je Slice an jeder Vertragsnaht schneiden → ein Task je Naht.
3. Akzeptanzkriterien (§8/F1) → Tasks mappen (1:n); Kriterium über 2 Tasks → Abhängigkeit notieren.
4. Task ohne eigenen Test → Schritt, hochfalten; Task mit „und" → splitten.
5. Annotieren: `id · wave · touches · depends-on · acceptance-tests · contract-refs`. 6. `tasks/index.md` = Topologie.

**Scope-Abgrenzung:** ⑧ ändert den **Planner-Output-Contract** → **nicht** Teil des A/B-Prompt-Diät-Features,
sondern ein **eigener, größerer Strang** (eigene requirement-definition). Synergien: `touches`-Parallelisierung,
`implementiere nur`-Pfad, Resumability (Status je Task-Datei), erleichtert später ⑤.

---

## Betroffene Dateien (grobe Karte für die spätere Planung)

| Datei | Änderung |
|-------|----------|
| `.claude/skills/feature-delivery/references/reviewer-gate-canon.md` | ⑥: §1/§3/§4/§5/§7/§8 — 🟢 raus, Achse binär, Tripwire → „kein Finding" |
| `.claude/skills/feature-delivery/references/secondbrain-schema.md` | ⑥: Tier-Zähler `Tier 🟢 offen` raus, Digest-Roll-up, Tier-Klassifikation |
| `.claude/skills/feature-delivery/references/subagent-prompts.md` | ②④ (Payloads dünn), Reviewer-Sets (auditor raus, Abnahme rein), 🟢 aus allen Rückgabe-Kurzformen |
| `.claude/skills/delivery-inspection/SKILL.md` | ①-Merge: Abnahme-Rolle statt Normalo+Auftraggeber, Count-Guard N=6 → **5** |
| `.claude/agents/plan-agent.md`, `implement-round-executor.md`, `implement-supervisor.md`, `implement-scribe-agent.md`, alle `implement-review-*.md` | ②: Profil führend, Payload-Dopplung raus |
| `.claude/agents/implement-review-verifier-agent.md` | ③: erbt Plan-Coverage-Vollständigkeit |
| `.claude/agents/implement-review-auditor-agent.md` | ③: **löschen** (+ Payload in subagent-prompts.md) |
| `.claude/skills/feature-delivery/flows/implementation-flow.md` | Change-Scope-Classifier (Standard-7 → 6), Digest/Abschlussformat |

---

## Potential-Liste (bewusst geparkt — NICHT in diesem Scope)

| Idee | Warum geparkt |
|------|---------------|
| **⑤ Collapsed-Reviewer 7→1** | Fan-out-Reduktion tauscht Review-*Tiefe* gegen Token — inhaltliche Qualitätsentscheidung. **Live-Vergleichslauf** gegen den Vollsatz, bevor committet wird. |
| **Merge ② Revisor + Skeptiker → „Vollständigkeit"** | Vereint die bewusst getrennten Sub-Linsen Regression + **Security** → Security-Verwässerung (teuerstes Risiko). Sicherheit ~4/10. |
| **Merge ④ craft + design-principles** | Modell-Mismatch (Sonnet vs. Opus) + design-principles = Gate-3-Rückgrat. Ersparnis ~3/10, Sicherheit ~2/10. |
| **③ Rollen-Varianten der Boilerplate** | Reviewer-Variante ohne Build/Test-Punkte 4/6 — weicht die „nicht weglassen"-Anti-Shortcut-Regel auf. Erst wenn Grundtaktung sitzt. |
| **(b) Sektions-Scoping als genereller Default** | Aggressiver als ④ — Under-Reading-Gefahr. |
| **(X) DI-×6-Inline / `kein-Tool-Call` aufweichen** | Ein geteilter Read für DI würde ① auch dort bringen, kauft aber die Budget-/Context-Abbrüche ein, gegen die der Constraint (`SKILL.md:44`) gebaut ist. Seltenster Pfad, kleiner Payoff. |

### Merge-Scorecard (geschätzt, 1–10, 10 = überragend gut)
| Merge | Ersparnis | Sicherheit | Status |
|-------|:---:|:---:|--------|
| ① Normalo+Auftraggeber | 4 | 8 | **aktiv** |
| ③ auditor auflösen | 6 | 5 | **aktiv** |
| ② Revisor+Skeptiker | 4 | 4 | geparkt |
| ④ craft+design-principles | 3 | 2 | geparkt |

---

## Nächster Schritt

Entscheidungsreif. Drei Stränge:
1. **A · Prompt-Diät** (②④①) — mechanisch, risikoarm, betrifft Payloads + Profile.
2. **B · Reviewer-Struktur** (①-Merge, ③-Auflösung, ⑥-🟢-Abschaffung) — Kanon + DI + Reviewer-Profile.
3. **C · Task-normalisierter Planner-Output-Contract** (⑧, subsumiert ⑦) — **eigenes, größeres Feature**,
   eigene requirement-definition; ändert Planner- + Umsetzer-Contract.

- A und B: ein Feature mit Stories (Handoff-Prompt für `/requirement-definition` bereits erstellt).
- C: separat, weil Planner-Contract-Umbau.
- A/B berühren teils dieselben Dateien — bei Parallelisierung `touches`-Überschneidung von `subagent-prompts.md` beachten.
