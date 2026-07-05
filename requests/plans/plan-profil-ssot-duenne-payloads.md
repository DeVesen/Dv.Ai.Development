# Plan · STORY-001 — Profil = Single Source of Truth, dünne Payloads

**Story:** `requests/stories/STORY-001_profil-ssot-duenne-payloads.md` (type: story, parent: FEAT-001)
**Slug:** profil-ssot-duenne-payloads
**Planungsmodus:** lean/solo (plan-agent, Opus)
**Charakter:** reine Harness-Artefakt-Änderung (Markdown). Kein .NET/Angular-Code. `dev-mcp`/`codebase-analyzer` in dieser Cloud-Linux-Session nicht verfügbar → Analyse + „Tests" laufen als Grep/Read-gestützte Struktur-Prüfungen.

---

## Phase 2 — Anforderung (Kurzfassung)

**Ziel:** Jeder der 11 gelisteten Sub-Agent-Payload-Blöcke in `subagent-prompts.md` trägt nach der Diät nur noch **(a) Pointer** (auf Agent-Profil bzw. Kanon-Datei) + **(b) variable Rundendaten** (Runde N/M, Slice-IDs, Runden-Pfad, Story-Pfad, MCP-Pfade, Planpaket-Pointer). Der **Ablauf** (Phasen, Schritte, Regeln) lebt ausschließlich im jeweiligen `.claude/agents/<profil>.md`. Boilerplate-Punkt 1 („Profil vollständig lesen") garantiert, dass der Ablauf beim Dispatch gelesen wird — die Payload-Kopie ist reine Redundanz.

**Randbedingungen (festgeschrieben, nicht neu entscheiden):**
- Zu verschlankende Blöcke (genau diese, in Reihenfolge der Datei): `Plan-Orchestrator (plan-agent)` · `PL — Round-Executor` · `PM — Supervisor` · `Scribe Runden 1-3` · 7× `Impl-Review-*` (Design-Principles, Risk, Verifier, Readiness, Craft, Auditor, Guard).
- **Unangetastet** (nicht in touches): `Session-Treiber`, `DELIVERY-INSPECTION → CLOSURE`, `Scribe Runden 4-5`, `Implementierer (Slice — compact)`, `Implementierer (Slice — Build/Test)`, `Fix-Planer`, `Review-Digest (Implement)`, `Abschlussformat`.
- **Harte Grenze:** `.claude/references/subagent-delegation-boilerplate.md` Punkt 1 bleibt **unverändert** (Guard-AC).
- **Migrations-Pflicht:** Die „Angular Hard Rules — OnPush + async-Listen"-Regel steht im `Scribe Runden 1-3`-Payload, aber **nicht** im Profil `implement-scribe-agent.md`. Sie muss **zuerst** ins Profil verschoben werden, bevor sie aus dem Payload entfernt wird — sonst Content-Regression (Negativ-AC `Payload_MitProfilKopie_IstRegression` würde formal grün sein, aber Wissen ginge verloren).
- **Scope-Cut (bewusst):** `implement-scribe-opus-agent.md` + `Scribe Runden 4-5`-Block sind NICHT in touches — die OnPush-Regel bleibt dort im Payload stehen (weiterhin Dopplung, akzeptierter Scope-Cut laut Story).

**Akzeptanzkriterien:** 4 ACs aus Story (inkl. Guard + Negativszenario), 1:1 übernommen in §8/F1-Liste unten, plus 1 abgeleiteter Migrations-Guard.

**Verifikations-Befunde (Phase 4a-Recherche, bereits geprüft):**
- PL-Payload Reviewer-Set-Enumeration (Z.194-197) → steht in `implementation-flow.md` Z.208-227. Profil zeigt via „s. flow" dorthin. Strippen ⇒ kein Wissensverlust.
- PL-Payload Gate-Details (inspectcode/ArchUnit/ESLint-Bedingung/analyze_iosp_compliance/5 focusAreas/Security-critical) → `implementation-flow.md` Z.167-193, 380. Strippen ⇒ kein Wissensverlust.
- OnPush-Regel → 0 Treffer in `implement-scribe-agent.md` ⇒ echter Migrations-Fall.

---

## Phase 4a — Klassifikations-Prinzip (gilt für jeden Block)

Pro Zeile eines Payload-Blocks genau eine der drei Kategorien bestimmen:

| Kategorie | Kriterium | Aktion |
|-----------|-----------|--------|
| **Ablauf-Kopie** | Satz beschreibt Phasen/Schritte/Regeln, die wörtlich oder sinngleich im Ziel-Profil (bzw. in der vom Profil per Pointer referenzierten Kanon-/Flow-Datei) stehen | **streichen** |
| **Pointer** | Verweist auf Profil/Kanon-Datei, oder benennt Rolle/Einstieg/Modus als kurzen Orientierungs-Marker | **behalten / als Pointer umformulieren** |
| **Variable Rundendaten** | Runden-/slice-/story-spezifischer Wert, der nicht im Profil stehen kann (Platzhalter `[…]`) | **behalten** |
| **Orphan (Migrations-Fall)** | Satz ist weder Ablauf-Kopie (nicht im Profil/Kanon) noch variable Rundendaten | **zuerst ins Profil verschieben, dann aus Payload streichen** — nie ersatzlos löschen |

**Kanon-Ziel-Payload nach Diät (Schablone je Block):**
```
Profil:<profil-name>  (+ ggf. Alias / Einstieg-Marker)
<Pointer auf Kanon-Datei(en), falls im Original referenziert>
<variable Rundendaten als [Platzhalter]>
```

### Bounded-Context / §12
Kein service-übergreifendes Feature — reine Doku-Domäne. Ein Bounded Context: „Harness-Agent-Konfiguration". Keine geteilten Modelle, kein Shared-Kernel-Thema. §12 nicht anwendungsrelevant über den einen Kontext hinaus.

### Test-Abdeckung (§8/F3)
Keine bestehende automatisierte Test-Suite für Markdown-Payloads. Alle „Tests" sind **neu** und laufen als Grep/Read-Struktur-Assertions (manuell/skriptbar). Guard-AC (Boilerplate) ist **unberührt**.

---

## Phase 4a — Per-Block-Teilpläne (Klassifikations-Ergebnis)

### Block 1 — `Plan-Orchestrator (plan-agent)` (subagent-prompts.md Z.25-82)
- **Streichen (Ablauf-Kopie, steht in `plan-agent.md` + `planning-flow.md`):** gesamter „Phasen-Ablauf (alle solo)" Z.45-81 (Phase 1+2 / 4a / 4c / 6, Plan-Coverage-Check-Beschreibung, Persistenz-Erklärung, STOPP-Erklärung); die Lean/solo-Erläuterungssätze unter „Einstieg" Z.36-38.
- **Behalten als Pointer:** `Profil:plan-agent|…|kein-Impl` (Z.30); Einstieg-Marker „Plan-only" (eine Zeile); neuer Pointer-Satz „Ablauf + Phasen + Plan-Coverage-Check + §UA + §8/F1: vollständig in `.claude/agents/plan-agent.md` (lädt `planning-flow.md`)".
- **Behalten als variable Rundendaten:** `Feature/Anforderung: [Nutzer-Prompt]` (Z.32-33); MCP-Pfade-Block `[MCP_FRONTEND_PATH]`/`[MCP_BE_PROJECTS]`/`[MCP_BACKEND_SOLUTION]` (Z.40-43); Story-/Slug-Platzhalter für Persistenzpfad.
- **Migrations-Fall:** keiner (alle Ablaufsätze bereits in Profil+Flow).

### Block 2 — `PL — Round-Executor` (Z.151-219)
- **Streichen (Ablauf-Kopie, steht in `implement-round-executor.md` Schritt 0-6 bzw. `implementation-flow.md`):** Ablauf Schritt 0/Scribes/Integration-Checkpoint/Quality-Gates-Detail (Z.183-193)/Review-Loop inkl. Reviewer-Set-Enumeration (Z.194-197)/Digest+Tiers+Index (Z.202-213).
- **Behalten als Pointer:** `Profil:implement-round-executor`; Pointer „Ablauf Schritt 0-6, Gate-Scope, Reviewer-Sets: `implement-round-executor.md` + `implementation-flow.md`"; Rückgabe-Format-Pointer (Kurzform steht im Profil Schritt 6).
- **Behalten als variable Rundendaten:** Runden-Pfad `[…/iteration-N/round-M/]`; `[N/M]`; Planpaket-Pointer + Slice-IDs; Fix-Runde-Zusatz `PM-Was+Wie`/`Vorrunden-Digest`.
- **Migrations-Fall:** keiner (Enumeration + Gate-Details in flow verifiziert).

### Block 3 — `PM — Supervisor` (Z.223-262)
- **Streichen (Ablauf-Kopie, steht in `implement-supervisor.md`):** Aufgaben-/Urteils-Beschreibung, 4 Verdikt-Definitionen, „Nicht überstimmbar", Editier-Grenzen, Terminal-PM-Verweis (alles im Profil).
- **Behalten als Pointer:** `Profil:implement-supervisor`; Pointer „tier-gesteuertes Urteil (clean/erbsenzaehlerei-exit/fix/escalate), Terminal-PM-Span, Verboten-Liste: `implement-supervisor.md`".
- **Behalten als variable Rundendaten:** Index-Pointer; Digest-Pointer; Story-Pfad; Iteration `[N]`.
- **Migrations-Fall:** keiner.

### Block 4 — `Scribe Runden 1-3` (Z.308-365) — **enthält den Migrations-Fall**
- **Migrations-Fall (Pflicht, VOR dem Strippen):** OnPush-Block Z.343-348 → nach `implement-scribe-agent.md` verschieben (neuer Abschnitt „## Angular Hard Rules — OnPush + async-Listen", eingeordnet in Phase 2/Green). Erst nach nachgewiesener Präsenz im Profil aus dem Payload entfernen.
- **Streichen (Ablauf-Kopie, steht in `implement-scribe-agent.md` nach Migration):** ZWEISTUFIG RED→GREEN-Beschreibung (Z.326-342); MCP-Pflicht/slice-scoped Build-Test; Post-Scribe-Verifikation; Datei-Handoff-Beschreibung; Rückgabe-Format (Kurzform im Profil).
- **Behalten als Pointer:** `Profil:implement-scribe-agent`; Test-Design-Referenz-Pointer `.claude/skills/test-design/`; Pointer „Ablauf RED→GREEN, MCP-Build/Test, OnPush-Regel, Datei-Handoff: `implement-scribe-agent.md`".
- **Behalten als variable Rundendaten:** Slice-ID; Welle; Working directory; SecondBrain-Runden-Pfad; Planpaket (dieser Slice) `[Umsetzungsschritte + Akzeptanz→Test-Liste]`.

### Blöcke 5-11 — die 7 `Impl-Review-*`-Payloads
Gemeinsames Muster (jeder Payload dupliziert Prüfschwerpunkte + Pflicht-MCP + Output-/Findings-Format + Datei-Handoff, die alle im jeweiligen Profil stehen):

| Block | Payload-Z. | Profil | Streichen (Ablauf-Kopie im Profil) | Behalten Pointer | Behalten variable Rundendaten |
|-------|-----------|--------|-----------------------------------|------------------|------------------------------|
| Design-Principles | 518-563 | `implement-review-design-principles-agent.md` | IODA/IOSP/DDD-Prüfschritte, Tier-Kriterien, MCP-Liste, Datei-Handoff. **Zusätzlich:** stale Input-Verweis „IODA-Vorgaben aus Plan-Review-IODA" (Z.526-528) — es gibt kein Plan-Review mehr (lean/solo) → streichen. | `Profil:…design-principles-agent`; Kanon-Pointer `reviewer-gate-canon.md` | Runden-Pfad; Diff-/Gate-2-Status-Pointer |
| Risk | 567-591 | `implement-review-risk-agent.md` | Prüfschwerpunkte, Pflicht-MCP, Datei-Handoff, Bounded-Context-Bullets | `Profil:…risk-agent`; Kanon-Pointer | Runden-Pfad; Diff-/Gate-Status |
| Verifier | 595-619 | `implement-review-verifier-agent.md` | Prüfschwerpunkte, AC-Map-/Slice-Coverage-Regeln, MCP, Datei-Handoff | `Profil:…verifier-agent`; Kanon-Pointer | Runden-Pfad; Diff; **Slice-Coverage-Tabelle** (Pflicht-Input vom PL) |
| Readiness | 623-639 | `implement-review-readiness-agent.md` | Pflicht-MCP, Datei-Handoff, Prüfschwerpunkte | `Profil:…readiness-agent`; Kanon-Pointer | Runden-Pfad; Gate-Status |
| Craft | 643-659 | `implement-review-craft-agent.md` | Pflicht-MCP, Datei-Handoff, „mind. 3 Kritikpunkte" | `Profil:…craft-agent`; Kanon-Pointer | Runden-Pfad; Diff |
| Auditor | 663-683 | `implement-review-auditor-agent.md` | Pflicht-MCP, Datei-Handoff, Note/Go-No-Go-Regeln, „mind. 5 Punkte" | `Profil:…auditor-agent`; Kanon-Pointer | Runden-Pfad; Diff |
| Guard | 687-703 | `implement-review-guard-agent.md` | Pflicht-MCP, Datei-Handoff, PRESERVE-/erfüllte-ACs-Regeln | `Profil:…guard-agent`; Kanon-Pointer | Runden-Pfad; Diff |

- **Migrations-Fall:** keiner in den 7 Reviewer-Blöcken (jede Prüf-/MCP-/Format-Zeile ist im Profil vorhanden; verifiziert beim Profil-Lesen). Der stale „Plan-Review-IODA"-Verweis wird ersatzlos gestrichen (kein Wissen — er referenziert ein abgeschafftes Artefakt).

---

## Phase 4c — Konsolidierung / Drift-Prüfung

**Drift-Prüfung (Schnittstelle Payload↔Profil):** Jeder Payload-Pointer muss auf einen Profil-Abschnitt zeigen, der den Inhalt tatsächlich trägt. Ergebnis der Plan-Recherche (alle 11 Ziel-Profile beim Planen gelesen):
- Alle 11 Blöcke: Ablauf im Profil vorhanden (bzw. Profil→flow-Pointer intakt). Kein ungedeckter Pointer.
- Einzige Lücke: OnPush (Block 4) — durch W0-Migration geschlossen, bevor Block 4 gestrippt wird.
- Kein Widerspruch offen; keine Nutzerfrage nötig.

### Profil-Deckungs-Prüfung vor Streichen (Pflicht-Umsetzungsschritt, je Block)
Damit die Deckungs-Zusage nicht Planungs-Behauptung bleibt, sondern beim Umsetzen erzwungen wird:
**Bevor** eine Zeile aus einem Payload-Block gestrichen wird, prüft der Umsetzer je Block explizit —
für jeden als „Ablauf-Kopie" markierten Satz: existiert der Inhalt im Ziel-Profil **oder** in der vom
Profil per Pointer referenzierten Kanon-/Flow-Datei (`planning-flow.md`, `implementation-flow.md`,
`reviewer-gate-canon.md`, `secondbrain-schema.md`)?
- **Ja** → streichen erlaubt.
- **Nein** (Orphan) → **zuerst** in das jeweilige **in-scope**-Profil (`.claude/agents/<profil>.md`)
  migrieren, **dann** streichen. Ziel ist immer das Profil (in touches), **nie** eine out-of-scope-Flow-Datei.
Dieser Schritt ist die generalisierte Form der OnPush-Behandlung — er macht den OnPush-Fall zur Regel
statt zum Sonderfall und schließt das Risiko „Pointer zeigt auf Profil-Abschnitt, der den Inhalt nicht
trägt". Recherche-Stand: nur OnPush (Block 4) ist ein Orphan; alle übrigen Ablaufsätze sind gedeckt.
Der Umsetzungsschritt bleibt dennoch Pflicht als deterministischer Riegel.

**Ausführungs-Reihenfolge zwingend:** W0 (OnPush-Migration) vor der Verschlankung von Block 4. Alle anderen Blöcke unabhängig.

**Nicht-anfassen-Abgrenzung:** die 8 nicht gelisteten Payload-Blöcke; `subagent-delegation-boilerplate.md`; `implement-scribe-opus-agent.md`; `implementation-flow.md`; `reviewer-gate-canon.md`; `secondbrain-schema.md`.

---

## Phase 6 — Synthese

### Komplexitäts- und Executor-Empfehlung
**Low.** Mechanische, gut abgegrenzte Markdown-Reduktion mit genau einem Migrations-Fall (OnPush). Klar verifizierbar per Grep. Empfehlung: `implementiere nur` (Lean Single-Pass) genügt, da kein Code, keine Build/Test-Gates, keine FE/BE-Reviewer-Tiefe nötig. *Disclaimer: Empfehlung, keine Vorgabe — der Nutzer entscheidet den Implement-Trigger.*

### Umsetzungs-Topologie
**Modus:** `sequential` (ein Editor-Strang; W0 blockiert Block-4-Strip).

| Slice-ID | Scope | Deliverable | parallel mit | blockiert durch |
|----------|-------|-------------|--------------|-----------------|
| IMP-DOC-Scribe-Migration | `implement-scribe-agent.md` | OnPush-Regel als neuer Profil-Abschnitt ergänzt | — | — |
| IMP-DOC-Payload-Slim | `subagent-prompts.md` — alle 11 Blöcke verschlanken (Block 4 OnPush-Zeilen erst nach W0 entfernen) | 11 Payloads = Pointer + variable Rundendaten | — | IMP-DOC-Scribe-Migration (nur für Block 4) |
| IMP-DOC-Verify | Struktur-Assertions (Grep/Read) über beide geänderten Dateien + Guard-Datei | §8/F1-Liste 0-Treffer/Präsenz bestätigt | — | IMP-DOC-Payload-Slim, IMP-DOC-Scribe-Migration |

**Wellen:**
- **W0 (contract-first):** IMP-DOC-Scribe-Migration.
- **W1:** IMP-DOC-Payload-Slim (alle 11 Blöcke; Block 4 nach W0).
- **W2 (Integration/Verify):** IMP-DOC-Verify.

**Integration:** kein Build/kein stack-weites Gate (Markdown). Integration = W2-Struktur-Assertions.
**Implement-Review-Loop-Verweis:** bei `implementiere` greift der md-only-Reviewer-Satz (risk · guard · readiness) laut Change-Scope-Classifier; bei `implementiere nur` entfällt der Reviewer-Loop.

---

## §8/F1 — Finale Akzeptanz→Test-Liste

„Testausführung" = Grep/Read-gestützte Struktur-Prüfung. Testnamen 1:1 aus Story (Konvention `<Method>_<Situation>_<Expected>`), plus ein abgeleiteter Migrations-Guard.

### `Payload_PlanAgent_TraegtNurPointerUndRundendaten`  — neu  (AC-1)
- **Arrange:** verschlankter `Plan-Orchestrator (plan-agent)`-Block in `subagent-prompts.md`.
- **Act:** Block lesen; grep im Block-Bereich nach Ablaufsatz-Fragmenten aus `planning-flow.md`/`plan-agent.md`, z. B. `"Topic-Map + Schnittstellen-Vertrag"`, `"Teilpläne zusammenführen, Drift-Prüfung"`, `"Komplexitäts-/Executor-Empfehlung"`, `"delivery-inspection Sub-Agents auf den fertigen Plan"`.
- **Assert:** **0 Treffer** für Ablaufsatz-Fragmente; verbleibend nur Pointer-Zeilen (`Profil:plan-agent`, Ablauf-Pointer) + variable Rundendaten (`[Nutzer-Prompt]`, `[MCP_*]`, Slug/Story-Platzhalter).

### `Payload_ImplReviewer_OhneProfilDopplung`  — neu  (AC-2)
- **Arrange:** je ein verschlankter Impl-Reviewer-Block (Referenzfälle Risk + Verifier) in `subagent-prompts.md`.
- **Act:** Block lesen; grep nach profil-eigenen Ablauf-/Prüfschritt-Fragmenten, z. B. Risk `"Regressionen und versteckte Seiteneffekte"`, Verifier `"Explizite AC-Map"` / `"Slice-Präsenz-Check"`; prüfen, ob eine `Kanon-Pointer reviewer-gate-canon.md`-Zeile + `Profil:`-Zeile vorhanden ist.
- **Assert:** Prüfschritte **nicht** im Payload (0 Treffer der Prüfschritt-Fragmente); Payload referenziert Profil + Kanon per Pointer; variable Rundendaten (Runden-Pfad, Diff-Pointer, bei Verifier Slice-Coverage-Tabelle) bleiben.

### `Boilerplate_Punkt1_ProfilRead_Unveraendert`  — unberührt  (AC-3, Guard)
- **Arrange:** `.claude/references/subagent-delegation-boilerplate.md`.
- **Act:** Punkt 1 („Lade und **befolge** … Dein Agent-Profil unter `.claude/agents/<profil>.md`…") lesen; ggf. `git diff` der Datei prüfen.
- **Assert:** Punkt 1 wörtlich **unverändert** vorhanden; Datei nicht in der Änderungsmenge dieser Story (git status: keine Modifikation).

### `Payload_MitProfilKopie_IstRegression`  — neu  (AC-4, Negativ)
- **Arrange:** alle 11 überarbeiteten Payload-Blöcke.
- **Act:** je Block ein Signatur-Ablaufsatz aus dem Ziel-Profil als Suchmuster (z. B. PL `"AUTORITATIVE TIER-VERGABE"` / `"Nach Merge aller Scribes"`; PM `"tier-gesteuertes Urteil"` / Verdikt-Definitionszeilen; Scribe `"Roter Schritt erzwingen"` / RED→GREEN-Schrittzeilen; Design-Principles `"Bausteinschnitt (IODA)"`; Guard `"PRESERVE — Fix-Agent"` …) über den jeweiligen Block-Bereich greppen.
- **Assert:** **0 Treffer** in jedem Block — keine Payload dupliziert ihren Profil-Ablauf. Ein einziger Treffer gilt als Regression → Fix.

### `Scribe_OnPushRegel_InProfilVorhanden`  — neu  (abgeleiteter Migrations-Guard)
- **Arrange:** `implement-scribe-agent.md` nach W0-Migration.
- **Act:** grep nach `OnPush` / `ChangeDetectionStrategy.OnPush` / `signal<` / `async-Listen` im Profil; parallel grep im `Scribe Runden 1-3`-Payload nach denselben Fragmenten.
- **Assert:** **≥1 Treffer im Profil** (Regel migriert, nicht verloren) **und 0 Treffer im `Scribe Runden 1-3`-Payload** (aus Payload entfernt). Verhindert, dass AC-4 durch ersatzloses Löschen „grün" wird, während Wissen verschwindet. *(Nicht redundant zu AC-4: AC-4 = 0-Treffer im Payload; dieser Test = ≥1-Treffer im Profil. Erst die Kombination schließt den Löschen-ohne-Migration-Pfad.)*

### `Payload_UnberuehrteBloecke_Unveraendert`  — neu  (Regressions-Guard, Kollateral in derselben Datei)
- **Arrange:** die 8 NICHT-gelisteten Payload-Blöcke in `subagent-prompts.md` (Session-Treiber, DELIVERY-INSPECTION → CLOSURE, Scribe Runden 4-5, Implementierer Slice-compact, Implementierer Slice-Build/Test, Fix-Planer, Review-Digest, Abschlussformat).
- **Act:** `git diff subagent-prompts.md` auf die Zeilenbereiche dieser 8 Blöcke einschränken (bzw. Block-Bereiche vor/nach vergleichen).
- **Assert:** **0 geänderte Zeilen** in den 8 Blöcken — insbesondere bleibt die OnPush-Regel im `Scribe Runden 4-5`-Block stehen (bewusster Scope-Cut). Jede Änderung außerhalb der 11 Ziel-Blöcke = Kollateral-Regression → Fix.
- **Status:** unberührt (Guard-Charakter; die 8 Blöcke sollen sich nicht ändern).

---

## Uncertainty Audit (§UA)

### Offen
- *(keine)* — Scope, Blockliste, Migrations-Fall und Guard sind in Story + Task-Payload eindeutig festgeschrieben.

### Selbst-entschieden (Annahmen des plan-agent)
1. **OnPush-Einordnung im Scribe-Profil:** Die migrierte Regel wird als eigener Abschnitt „## Angular Hard Rules — OnPush + async-Listen" in `implement-scribe-agent.md` eingefügt, thematisch in Phase 2/Green verankert. Alternative Platzierung (z. B. unter „Verboten") wäre valide; ein Wort genügt zur Korrektur.
2. **Stale-Verweis-Streichung (Design-Principles-Payload):** Der Input-Verweis „IODA-Vorgaben aus Plan-Review-IODA" wird ersatzlos gestrichen. **Belegte Staleness:** das Profil `implement-review-design-principles-agent.md` sagt selbst (Z.19 + Z.97): „die Planung läuft lean/solo im `plan-agent`, es gibt keinen separaten Plan-Reviewer" — ein „Plan-Review-IODA"-Artefakt existiert im Flow nicht mehr. Der Verweis zeigt also ins Leere; Streichen = Entfernen einer Ablauf-Kopie eines abgeschafften Artefakts, kein Wissensverlust. Fällt unter „auf Pointer + Rundendaten verschlanken". Alternative (Verweis behalten) wäre falsch, da dangling.
3. **Pointer-Formulierung:** Konkreter Wortlaut der neuen Pointer-Zeilen (z. B. „Ablauf vollständig in `<profil>.md`") ist plan-agent-Vorschlag; Stil/Länge frei anpassbar, solange kein Ablauf-Satz zurückkehrt.
4. **Executor-Empfehlung `implementiere nur`:** Empfehlung wegen Low-Komplexität + fehlender Code-Gates; nicht bindend.
5. **MCP-Pfad-Platzhalter im plan-agent-Payload:** bleiben als variable Rundendaten erhalten (auch wenn in Cloud-Linux-Sessions FE/BE entfallen) — sie sind kein Ablauf, sondern runden-spezifische Literale.

---

## Plan-Coverage-Check

### Part A — Requirements-Coverage (delivery-inspection Sub-Agents)
Status: **durchgeführt** — 6 delivery-inspection-Rollen (Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker) auf den fertigen Plan, N=6. Verdikte: bedingt freigabefähig mit Auflagen; kein echter CRITICAL-Defekt in der Plan-Korrektheit.

**Akzeptierte Findings → gepatcht:**
- *Deckungs-Prüfung nur für PL+OnPush belegt* (Revisor F2, Skeptiker CRIT-1/2) → neuer Pflicht-Umsetzungsschritt „Profil-Deckungs-Prüfung vor Streichen" (Phase 4c), generalisiert die OnPush-Behandlung auf alle 11 Blöcke.
- *Kein Regressions-Guard für die 8 unangetasteten Blöcke in derselben Datei* (Revisor F1) → neuer Test `Payload_UnberuehrteBloecke_Unveraendert`.
- *Stale-Verweis-Streichung unbelegt* (Querdenker F2, Dolmetscher) → Evidenz (Profil Z.19/97) im §UA nachgetragen.

**Override-Protokoll (Reviewer-Findings, die ich als bereits-gedeckt/kein-Mangel überstimme):**
- **Override: Querdenker F1 — der 5. Test ist NICHT redundant zu AC-4.** AC-4 = 0-Treffer im Payload; `Scribe_OnPushRegel_InProfilVorhanden` = ≥1-Treffer im Profil. Nur die Kombination verhindert Scheingrün durch ersatzloses Löschen. Kein YAGNI. (Ref: Story-AC-4 „Negativ" + Migrations-Pflicht.)
- **Override: Normalo/Dolmetscher „Grep-Muster/Guard nicht mechanisch" — bereits im Plan.** §8/F1 führt wörtliche Grep-Fragmente je AC; AC-3 ist als `git status`/wörtlicher Read-Vergleich formuliert. Reviewer sahen nur die Kontext-Zusammenfassung, nicht den Plan-Volltext. (Ref: §8/F1.)
- **Override: Dolmetscher/Auftraggeber/Revisor F3 „Scope-Cut nicht quittiert" — bereits im Plan.** Randbedingungen „Scope-Cut (bewusst)" + Phase-4c-Abgrenzung nennen `implement-scribe-opus-agent.md` + Scribe-4-5 explizit als unberührt. (Ref: Randbedingungen.)

Keine offenen klärungsbedürftigen Findings → kein zweiter DI-Durchlauf nötig (Anti-Shortcut erfüllt: ein realer Sub-Agent-Durchlauf mit 6 Rollen).

### Part B — AC/TDD-Coverage (Orchestrator-Tabelle)

| Plan-Schritt / Slice | Akzeptanzkriterium | Testname | AAA-Stichpunkte | Status |
|----------------------|--------------------|----------|-----------------|--------|
| IMP-DOC-Payload-Slim (Block 1) | AC-1 | `Payload_PlanAgent_TraegtNurPointerUndRundendaten` | vorhanden (§8/F1) | vollständig |
| IMP-DOC-Payload-Slim (Blöcke 5-11) | AC-2 | `Payload_ImplReviewer_OhneProfilDopplung` | vorhanden | vollständig |
| Guard (Boilerplate unberührt) | AC-3 | `Boilerplate_Punkt1_ProfilRead_Unveraendert` | vorhanden | vollständig |
| IMP-DOC-Payload-Slim (alle 11 Blöcke) | AC-4 | `Payload_MitProfilKopie_IstRegression` | vorhanden | vollständig |
| IMP-DOC-Scribe-Migration (W0) | Migrations-Pflicht (implizit, verhindert AC-4-Scheingrün) | `Scribe_OnPushRegel_InProfilVorhanden` | vorhanden | vollständig |
| IMP-DOC-Payload-Slim (Kollateral-Guard, 8 unberührte Blöcke) | R3 unangetastet (implizit) | `Payload_UnberuehrteBloecke_Unveraendert` | vorhanden | vollständig |

Alle Einträge `vollständig`. Plan-Coverage-Check abgeschlossen (Part A durchgeführt + gepatcht, Part B vollständig).

---

## STOPP
Planung endet hier — **kein Auto-Implement** (SKILL.md Story-Gate). Story → `planned`.
Umsetzung erst auf expliziten Trigger: `implementiere STORY-001` (volle Loops) bzw. `implementiere nur STORY-001` (Lean Single-Pass, empfohlen).
