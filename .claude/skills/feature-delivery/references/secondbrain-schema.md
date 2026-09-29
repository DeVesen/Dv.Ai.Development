# SecondBrain — Datei-basiertes Gedächtnis (Schema)

**Zweck:** Externes Gedächtnis für `feature-delivery`. Kontinuität läuft über persistierte
Markdown-Dateien statt über ein wachsendes Chat-Fenster. Reviewer, Scribes und andere gespawnte
Rollen schreiben ihr Deliverable in **eine eigene Datei** und geben dem Treiber **nur einen Pointer
plus Verdikt-Kurzform** zurück — **kein Report-Body im Agent-Return**. So wächst kein Fenster
unbegrenzt; der Kontext-Compact (ein Volumen-Problem) wird entschärft.

**Flow-agnostisch:** Das Layout ist bewusst nicht impl-spezifisch geschnitten. Der Planning-Flow
(Scouts, Topic-Planer, 6 Plan-Reviewer) kann dasselbe Verzeichnis- und Handoff-Muster später
wiederverwenden (eigenes Vorhaben).

**Herkunft:** FEAT-001 Entscheidung 5. STORY-032 verdrahtet den Datei-Handoff für den
Impl-Review-Loop (Reviewer + Scribes + Digest). STORY-033 splittet die Rollen (dünner
Session-Treiber + throwaway Leaves je Runde) auf demselben Layout. STORY-034 verdrahtet
die Tier-/Outer-Loop-Logik: das **Digest-Leaf** vergibt autoritative Tiers und schreibt die Tier-Zähler
in den Index, das **Outer-Verdikt-PM-Leaf** schreibt die `outer/`-Artefakte (di-digest, pm-verdict, delta).

> **Korrektur (Harness-Grundwahrheit):** Fan-out gehört **ausschliesslich der Session** — alle
> `Agent`-Calls sind asynchron, Kind-Completions landen bei der Session, nie beim spawnenden Sub-Agent.
> Der ursprüngliche STORY-033/034-Split ließ einen „PL"-Sub-Agent Scribes/Reviewer und einen
> „Terminal-PM" die DI dispatchen; das ist entfernt. Die **Session** faechert (Scribes, Reviewer,
> Fix-Planer, DI) und faehrt die Gates; die throwaway Leaves (Digest-Leaf `implement-round-executor`,
> PM-Leaf `implement-supervisor`) **lesen/verdichten/urteilen nur** und dispatchen nichts.

---

## Verzeichnis-Layout (pro Feature)

```
requests/plans/<feature>/
├── secondbrain-index.md              # HEISS — kompakter, immer aktueller Gesamtzustand (inkl. autoritativer Tier-Zähler)
├── iteration-N/                      # Outer-Loop-Iteration (N = 1, 2, …)
│   └── round-M/                      # Inner-Loop-Runde (M = 1..5)
│       ├── scribe-<slice>.md         # Scribe-Deliverable je IMP-Slice (Summary + Touched Paths + Build/Test)
│       ├── finding-<reviewer>.md     # Reviewer-Deliverable je Rolle (Struktur-Tabelle, Tier-VORSCHLAG)
│       └── digest.md                 # Konsolidierung + AUTORITATIVE Tiers — vom Digest-Leaf aus finding-*.md gebaut
├── outer/                            # Outer-Loop-Artefakte (STORY-034 — Session faechert DI, Outer-Verdikt-PM-Leaf urteilt)
│   ├── di-N/                         # Delivery-Inspection der Outer-Iteration N
│   │   ├── di-finding-<rolle>.md     # DI-Reviewer-Deliverable je Rolle (Pointer-Handoff statt Payload)
│   │   └── di-digest.md              # DI-Konsolidierung — Outer-Verdikt-PM-Leaf liest daraus den Outer-Verdikt
│   ├── pm-verdict-N.md               # PM-Urteil je Outer-Iteration (Inner-final vom PM-Leaf + 🟡-Begründungen + Outer-Verdikt vom Outer-Verdikt-PM-Leaf)
│   └── delta-N.md                    # Delta-Protokoll je Outer-Iteration (nur bei Requirement-Gap)
```

- `<feature>` — Plan-Slug (identisch zum bestehenden `plan-<feature>.md`). Die bestehende Plan-Datei
  `requests/plans/plan-<feature>.md` bleibt unverändert; das SecondBrain-Verzeichnis ist **additiv**.
- `iteration-N` — Outer-Loop-Iteration (Stakeholder-Schleife). Für STORY-032 genügt `iteration-1`.
- `round-M` — Inner-Loop-Runde (Impl-Fix-Loop, 1–5).
- `<reviewer>` — Impl-Reviewer-Rollen-Slug in kebab-case: `risk`, `design-principles`, `verifier`, `readiness`,
  `craft`, `auditor`, `guard`. Cross-Service zusätzlich `integration`. Collapsed-Modus:
  `quality-review` (ein Reviewer, alle Lenses).
- `<slice>` — IMP-Slice-ID in lowercase kebab (z. B. `imp-fe-search-rules`).
- `<rolle>` (DI) — Delivery-Inspection-Rollen-Slug in kebab-case: `revisor`, `skeptiker`, `normalo`,
  `dolmetscher`, `auftraggeber`, `querdenker`.
- `outer/di-N/` und `outer/pm-verdict-N.md` und `outer/delta-N.md` sind **je Outer-Iteration N** (nicht je Runde);
  die Session legt `outer/di-N/` an, bevor sie die DI faechert.

**Delta-Relokation (STORY-034):** Das Delta-Protokoll wandert aus `requests/plans/plan-<feature>-delta-<N>.md`
in die SecondBrain unter `outer/delta-N.md` — alle Outer-Loop-Artefakte liegen damit gebündelt unter `outer/`
(Alternative wäre `delta.md` im Feature-Wurzelverzeichnis gemäß ursprünglicher Reservierung; `outer/`-Bündelung
gewählt für Artefakt-Kohäsion). Format unverändert (s. u.).

**Audit-Trail-Pflicht:** SecondBrain-Historie wird verdichtet (heiß/kalt, s. u.), aber **nie
gelöscht**. Steht im Einklang mit `docs/silent-shortcut-prevention.md` — der kontrollierte
Digest-Handoff ist bewusster, protokollierter Informationsverlust, kein stiller Shortcut.

---

## Handoff-Vertrag (verbindlich für jede gespawnte Rolle)

> **Datei schreiben, Pointer zurückgeben.** Jede Rolle schreibt ihr vollständiges Deliverable in
> **genau ihre eine** Datei unter dem vom Treiber übergebenen Runden-Pfad und gibt zurück:
>
> 1. **Datei-Pointer** — relativer Pfad der geschriebenen Datei.
> 2. **Verdikt-Kurzform** — eine Zeile (Zähler/Status, s. u.).
>
> **Kein Report-Body im Return.** Ein Rückgabeformat, das den vollen Report inline enthält, gilt als
> Regelverstoß gegen das Pointer-only-Format (Negativ-Kriterium STORY-032).

Der Treiber legt `iteration-N/round-M/` an, **bevor** er die Rollen spawnt, und übergibt jeder Rolle
den Runden-Pfad. Die Rolle hängt nur ihren Dateinamen an.

### Verdikt-Kurzform je Rolle (eine Zeile)

| Rolle | Kurzform-Muster |
|-------|-----------------|
| risk | `finding-risk.md · 🔴:<n> 🟡:<n>` |
| design-principles | `finding-design-principles.md · 🔴:<n> 🟡:<n> 🟢:<n>` |
| verifier | `finding-verifier.md · AC-Coverage:<vollständig\|fehlend:Liste> · Fehler:<n>` |
| readiness | `finding-readiness.md · <SHIP\|CONDITIONAL\|NO-SHIP>` |
| craft | `finding-craft.md · Note:<1-6> · Kritikpunkte:<n>` |
| auditor | `finding-auditor.md · Note:<1-5> · <GO\|NO-GO> · 🔴:<n>` |
| guard | `finding-guard.md · PRESERVE:<n> · erfüllte-ACs:<n>` |
| quality-review (collapsed) | `finding-quality-review.md · Fixable:<n> · Klärung:<n> · <Fix-Planer nötig\|Loop beenden>` |
| scribe | `scribe-<slice>.md · <RED\|GREEN> · Dateien:<n> · build:<ok\|fail> test:<ok\|fail>` |

Die Kurzform trägt genug Signal, damit der Treiber ohne Report-Body entscheiden kann
(Findings vorhanden? → Fix-Loop). Inhalt für den Fix-Planer kommt aus den Dateien, nicht aus dem Return.

---

## `finding-<reviewer>.md` — Struktur-Tabelle

Vorbild: `ReportFindings`. Jede Reviewer-Datei beginnt mit einem Kopf und trägt dann die
Findings als Tabelle.

```markdown
# finding-<reviewer> — Iteration N · Runde M

- Reviewer: <rolle>
- MCP: <ok | fallback (<Grund>)>
- Verdikt: <Kurzform gemäß Tabelle oben>

| File | Line | Tier-Vorschlag | Befund | Failure-Scenario |
|------|------|:--------------:|--------|------------------|
| src/... | 42 | 🔴 | <ein Satz> | <konkrete Eingabe/Zustand → falsches Ergebnis/Crash> |
| ... | | | | |
```

Spalten:

| Spalte | Inhalt |
|--------|--------|
| **File** | Repo-relativer Pfad der betroffenen Datei. Bei nicht-lokalisierbaren Befunden: `—`. |
| **Line** | 1-basierte Zeile, wenn aus Diff/Datei bestimmbar; sonst `—`. |
| **Tier-Vorschlag** | Genau **🔴/🟡/🟢** — eine Achse, kein zweites Severity-Vokabular (`[KRITISCH]/[WESENTLICH]/[FORMAL]`, `BLOCKING/RISK` u. ä. entfallen). 🔴 blockt · 🟡 begründungspflichtig · 🟢 frei — **Vorschlag** des Reviewers, nicht bindend. Die **autoritative** Tier-Vergabe (Digest-Leaf) und der mechanische Tier-Guard (Session) sind unten in `## Tier-Klassifikation` spezifiziert; das Digest-Leaf konsolidiert die Vorschläge beim Digest-Bau. Security-Findings `critical` sind immer 🔴. |
| **Befund** | Ein Satz: was ist falsch. |
| **Failure-Scenario** | Konkrete Eingabe/Zustand → falsches Ergebnis oder Crash. Kein abstraktes „könnte Probleme geben". |

**Rollen mit Nicht-Findings-Deliverable** (guard: PRESERVE-Liste; verifier: AC-Map; readiness:
Ship-Entscheidung) tragen ihren rollenspezifischen Block **unter** der Tabelle in derselben Datei
(z. B. `## PRESERVE`, `## AC-Map`, `## Ship-Readiness`). Die Tabelle bleibt für die eigentlichen
Findings; ein Reviewer ohne Findings schreibt eine leere Tabelle + seinen Block.

---

## `scribe-<slice>.md` — Scribe-Deliverable

```markdown
# scribe-<slice> — Iteration N · Runde M

- Slice-ID: IMP-...
- Phase: <RED | GREEN>
- Verdikt: <Kurzform>

## Touched Paths
- src/...
- ...

## Build/Test-Matrix
| Lauf | Tool | Ergebnis |
|------|------|----------|
| Build | build_dotnet_solution | ok |
| Test  | test_dotnet_solution  | 45/45 |

## Summary
<Red: welche Tests fehlgeschlagen; Green: welche grün>

## Offene Risiken / Blocker
- ...
```

Der Treiber liest **Touched Paths** aus dieser Datei für den Slice-Coverage-Check und für die
Reviewer-Evidenz — nicht aus dem Agent-Return.

---

## `digest.md` — Runden-Konsolidierung (vom Digest-Leaf, mit autoritativer Tier-Vergabe)

Das **Digest-Leaf** (`implement-round-executor`) baut `digest.md` durch **Lesen** der von der Session
gesammelten `finding-*.md`-Dateien der Runde — es empfängt keine vollen Reports als Agent-Rückgabe.
Format = „Review-Digest (Implement)" aus `subagent-prompts.md`: ein Abschnitt je Reviewer, plus Roll-up.
**Beim Digest-Bau vergibt das Digest-Leaf die autoritative Tier-Einstufung** je Finding
(s. `## Tier-Klassifikation` unten) — die `Tier-Vorschlag`-Spalte der Reviewer ist nur Input, nicht bindend.

```markdown
# digest — Iteration N · Runde M

Quellen: finding-risk.md, finding-design-principles.md, … (gelesen)

## Roll-up
- Fixable: <n> · Klärungsbedürftig: <n>
- Offene 🔴: <n>
- Autoritative Tiers: 🔴 <n> · 🟡 <n> · 🟢 <n>   ← identisch mit den Index-Zählern
- Gate-Status: Build <..> · Statik <..> · Tests <..>

## Risk
- 🔴 … (Kanal: risk-review)
## Design-Principles
- 🟡 …
## Verifier
- AC-Map: <vollständig | fehlend: Liste>   (fehlender AC-Test → das Finding ist 🔴)
## Readiness
- <SHIP | CONDITIONAL | NO-SHIP>
## Craft
- 🟢 …
## Auditor
- Go/No-Go: … · Note: …
## Guard
- PRESERVE: … · erfüllte ACs: …
```

Jede Finding-Zeile trägt das **autoritative** Tier-Symbol (🔴/🟡/🟢) als erstes Zeichen. Security-Findings
Severity `critical` sind im Digest **immer** 🔴 — unabhängig vom Reviewer-Vorschlag und vom Kanal.

Der Fix-Planer erhält den **Pointer auf `digest.md`** (und bei Bedarf die finding-Datei-Pfade) und
liest selbst — kein Digest-Body im Session-Fenster über die Roll-up-Zeilen hinaus. Das **PM-Leaf** liest
denselben Digest + die Index-Tier-Zähler für sein Urteil.

**Historie / aktueller Stand (Ist = STORY-033/034, korrigiert):** In STORY-032 las noch der monolithische
Treiber selbst — die finding-Bodies transitierten beim Digest-Bau einmal durch **seinen** Kontext; das
entfernte bereits die runden-übergreifende Akkumulation und den Payload-Bloat. **Seit dem
throwaway-Rollen-Split (STORY-033) baut das Digest-Leaf den Digest**, nicht der Treiber: die finding-Bodies
transitieren einmal durch das throwaway-**Digest-Leaf**-Fenster, die **Session sieht ausschließlich Pointer**
(nie einen finding- oder Digest-Body). Die Session **faechert** die Reviewer und **sammelt** deren Pointer;
das Digest-Leaf **liest** sie nur — es dispatcht nichts. Das ist der aktuell gültige Zustand.

---

## `secondbrain-index.md` — heißer Zustand

Kompakter, immer aktueller Gesamtzustand. Vom **Digest-Leaf** nach jeder Runde aktualisiert. Trägt keine
Report-Bodies — nur Zeiger und Zähler. Die **Tier-Zähler sind autoritativ** und die Grundlage des
mechanischen Tier-Guards (die Session liest sie, s. u.).

```markdown
# SecondBrain-Index — <feature>

- Aktuell: Iteration <N> · Runde <M>
- Runden-Cap: <M>/5
- Letzter Digest: iteration-N/round-M/digest.md

## Tier-Zähler (autoritativ — vom Digest-Leaf vergeben; Grundlage des mechanischen Tier-Guards)
- Tier 🔴 offen: <n>   — blockt Inner-Exit; ein offenes 🔴 → nächste Runde Pflicht
- Tier 🟡 offen: <n>   — begründungspflichtig (Erbsenzählerei-Wave nur mit Begründung je Finding im pm-verdict-N.md)
- Tier 🟢 offen: <n>   — frei durchwinkbar

## Runden-Historie
| Iteration | Runde | Reviewer | Fixable | 🔴 | 🟡 | 🟢 | Digest | Status |
|-----------|-------|----------|---------|----|----|----|--------|--------|
| 1 | 1 | 7 | 3 | 2 | 1 | 0 | …/digest.md | fix-loop |
| 1 | 2 | 7 | 0 | 0 | 1 | 2 | …/digest.md | Erbsenzählerei-Exit |
| 2 | 5 | 7 | 1 | 1 | 0 | 0 | …/digest.md | Hard-Stop (Cap, 🔴 offen → User-Eskalation, NICHT implemented) |
```

(Zeile 3 illustriert den Cap-Sonderfall: Runde 5 mit offenem 🔴 → keine Outer-Verdikt-Sequenz, keine Closure, User-Eskalation — die 🔴-Invariante wird am Cap nicht durchbrochen.)

**Verdichtung heiß/kalt:** Der Index bleibt heiß (nur aktueller Zustand + Tier-Zähler + Historien-Tabelle).
Vollständige finding-/digest-/di-/pm-verdict-Dateien bleiben in ihren Ordnern liegen (kalt), werden **nie
gelöscht**. Bei Iterationsabschluss verdichtet das Digest-Leaf die abgeschlossene Iteration im Index auf
eine Historien-Zeile; die Detaildateien bleiben als Audit-Trail erhalten.

---

## Tier-Klassifikation (autoritativ — STORY-034)

Drei Tiers, drei Konsequenzen. Das **Digest-Leaf** vergibt die autoritative Einstufung beim Digest-Bau; die
Reviewer liefern nur einen `Tier-Vorschlag`. Das Digest-Leaf schreibt die offenen Zähler in den Index.

| Tier | Bedeutung | Wirkung auf den Inner-Exit |
|------|-----------|----------------------------|
| 🔴 | Blockierend — Correctness-Bug, ungetestete Public-API/fehlender AC-Test, Contract-Drift, Regression, **Security-`critical`** | Blockt den Inner-Exit. **Ein offenes 🔴 → nächste Runde Pflicht.** |
| 🟡 | Begründungspflichtig — behebbar, aber ein Wave ist vertretbar | Darf nur mit **schriftlicher Begründung je Finding** im `pm-verdict-N.md` gewaved werden (sonst Fix nötig). |
| 🟢 | Frei — kosmetisch, kein Verhaltens-/Vertragseinfluss | Frei durchwinkbar, keine Begründung nötig. |

**Einstufungsregeln (deterministisch, in dieser Reihenfolge):**

1. **Security-`critical` → immer 🔴.** Ein Finding mit Severity `critical` aus **jedem** Kanal
   (`review_git_diff` security-focusArea, `run_inspectcode`, ein LLM-Reviewer) ist 🔴 — unabhängig
   vom Reviewer-`Tier-Vorschlag`. Es ist **nie** als Erbsenzählerei (🟡/🟢) einstufbar. Diese Regel
   ist nicht überstimmbar — weder vom Digest-Leaf noch vom PM-Leaf.
2. **Behebbar + verhaltens-/vertrags-/testrelevant → 🔴.** Correctness-Bug, fehlender
   AC-Test (Verifier AC-Map „fehlend"), Contract-Drift, Regression.
3. **Behebbar, aber Wave vertretbar → 🟡.** Struktur-/Design-Kosten ohne akuten Defekt, stilistische
   Rule-Violation mit lokalem Scope.
4. **Kosmetisch → 🟢.** Namens-/Kommentar-Nuancen, reine Präferenz ohne Verhaltensbezug.

**PM-Hochstufung (sichere Richtung):** Die Digest-Leaf-Tiers sind autoritativ, aber das PM-Leaf darf ein Finding
**verschärfen**, nie abschwächen: ein 🟢, das er für begründungspflichtig hält → als 🟡 behandeln
(Begründung) oder fixen; ein 🟡/🟢, das er für blockierend hält → `fix`. So wird eine Digest-Leaf-Unter-Einstufung
abgefangen, ohne je die 🔴-schützende Richtung zu verletzen. Das PM-Leaf schreibt den Index-Zähler nicht — die
Hochstufung wirkt über sein Urteil, nicht über den mechanischen 🔴-Guard.

**Aggregat-Regel:** `Tier 🔴 offen > 0` ⇒ der Inner-Loop **kann nicht** als clean/erbsenzaehlerei-exit
schließen (nächste Runde Pflicht). `Tier 🔴 offen == 0` ⇒ Inner-Exit möglich, entweder als
`clean` (auch 🟡/🟢 == 0) oder als **Erbsenzählerei-Exit** (🟡/🟢 offen, jedes offene 🟡 im
`pm-verdict-N.md` begründet).

**Mechanischer Tier-Guard (Session):** Vor jedem Inner-Exit liest die Session den Index-Zähler
`Tier 🔴 offen`. Meldet der PM einen Erbsenzählerei-Exit, während der Zähler `> 0` ist, weist die
Session den Exit **deterministisch** zurück und erzwingt die nächste Inner-Runde. Der 🔴-Guard ist reine
Zähler-Arithmetik — kein Urteil, keine Auslegung. Beim `erbsenzaehlerei-exit` kommt eine mechanische
Vollständigkeitsprüfung hinzu (je offenes 🟡 eine Begründung im `pm-verdict-N.md`, sonst wird der
Exit wie `fix` behandelt) — ebenfalls kein Urteil, nur Vorhandensein.

**Am Max-5-Cap bleibt die 🔴-Invariante erhalten (kein stilles Durchwinken):** Der Cap begrenzt die
Fix-**Runden**, nicht die 🔴-Regel. Greift der Cap bei `Tier 🔴 offen == 0`, ist der Abschluss ein
(cap-erzwungener) Erbsenzählerei-Exit → Outer-Verdikt-Sequenz → Closure. Greift er bei `Tier 🔴 offen > 0`, gibt es
**keine** Closure und **keine** Outer-Verdikt-Sequenz: Hard-Stop + Rest-Findings-Bericht (inkl. offener 🔴) →
**User-Eskalation**; die Story bleibt **nicht** `implemented`. So kann ein Security-`critical` auch am Cap
nie still ausgeliefert werden.

---

## `outer/pm-verdict-N.md` — PM-Urteil (STORY-034)

Zwei PM-Leaf-Läufe schreiben diese Datei je Outer-Iteration N: das **PM-Leaf** der Schluss-Runde den
Abschnitt **Inner-final**, das **Outer-Verdikt-PM-Leaf** (nach dem Session-DI-Fan-out) den Abschnitt
**Outer-Verdikt**. Sie ist der Audit-Trail beider Urteile (s. `implement-supervisor.md`).

```markdown
# pm-verdict — Outer-Iteration N

## Inner-final-Verdikt
- Modus: <clean | erbsenzaehlerei-exit>
- Basis: Index-Tier-Zähler 🔴:<n> 🟡:<n> 🟢:<n> (aus secondbrain-index.md gelesen)
- Runde bei Close: M

### 🟡-Begründungen (Pflicht bei erbsenzaehlerei-exit — je offenes 🟡 eine Zeile)
| 🟡-Finding (Digest-Verweis) | Warum wave statt fix (schriftliche Begründung) |
|-----------------------------|--------------------------------------------------|
| Craft-Zeile 2 (Naming) | Rein lokal, kein Verhaltensbezug; Fix in Folge-Story billiger als Runde. |

## Outer-Verdikt (nach Delivery-Inspection)
- DI-Digest: outer/di-N/di-digest.md (gelesen)
- Klassifikation: <OK | Implementation-Gap | Requirement-Gap | Unklar>
- Konsequenz: <Closure | Fix-Scribe → Inner Loop | Delta-Protokoll outer/delta-N.md → Outer Loop | Nutzer-Eskalation>
```

**Konformitäts-Regel:** Ein `erbsenzaehlerei-exit` **ohne** vollständige 🟡-Begründungstabelle
(jedes offene 🟡 eine Zeile) ist **nicht konform** — die Session behandelt ihn wie einen offenen
Fix (nächste Runde). Bei `Tier 🟡 offen == 0` bleibt die Tabelle leer.

---

## `outer/di-N/` — Delivery-Inspection (Session faechert, Pointer-Handoff, STORY-034 korrigiert)

Die **Session** faechert die 6 DI-Reviewer (nur sie empfaengt Sub-Agent-Completions — Harness-Grundwahrheit)
und sammelt deren Pointer ein; danach liest das **Outer-Verdikt-PM-Leaf** die Findings. Jeder DI-Reviewer
schreibt seine Befunde in `di-finding-<rolle>.md` und gibt **nur Pointer + Kurzform** zurück — kein
Report-Body im Return. So transitiert kein DI-Report durch das Session-Fenster (Fenster-Disziplin). Die
frühere Notification-Trap (STORY-031) bleibt hier aus, weil es **keinen zwischengeschalteten Dispatcher**
mehr gibt — die Session faechert direkt; der Pointer-Handoff ist Fenster-Disziplin, nicht der Trap-Grund.

```markdown
# di-finding-<rolle> — Outer-Iteration N

- Rolle: <revisor | skeptiker | normalo | dolmetscher | auftraggeber | querdenker>
- Verdikt: <Kurzform der Rolle, z. B. „abnahmefähig" / „2 Gaps">

| Anforderung/AC | Kategorie | Befund | Nachweis |
|----------------|-----------|--------|----------|
| AC „Login-Sperre" | Requirement-Gap | Ziel hat sich geändert: PO will jetzt … | Story §3 vs. Ist |
```

**Kategorie** je Befund (Vorschlag der DI-Rolle; das Outer-Verdikt-PM-Leaf klassifiziert autoritativ):
`Implementation-Gap` · `Requirement-Gap` · `Unklar` · `—` (kein Gap).

`di-digest.md` — das **Outer-Verdikt-PM-Leaf** liest die `di-finding-*.md` und konsolidiert sie (es ist die
Instanz, die den Outer-Verdikt trägt — kein anderer baut den di-digest):

```markdown
# di-digest — Outer-Iteration N

Quellen: di-finding-revisor.md, … (gelesen)

## Roll-up
- Implementation-Gaps: <n> · Requirement-Gaps: <n> · Unklar: <n>
- Gesamt-Abnahme: <OK | nicht abnahmefähig>

## Befunde (klassifiziert)
- [Requirement-Gap] … (Quelle: auftraggeber)
- [Implementation-Gap] … (Quelle: skeptiker)
```

Das Outer-Verdikt-PM-Leaf liest **nur** `di-digest.md` (+ bei Bedarf die Finding-Dateien) für den Outer-Verdikt.

---

## `outer/delta-N.md` — Delta-Protokoll (Requirement-Gap, STORY-034)

Nur bei mindestens einem Requirement-Gap. Relokation des bestehenden Delta-Protokoll-Formats aus
`implementation-flow.md` in die SecondBrain (Inhalt unverändert). Verbindliche Eingabe für Schritt 1
der nächsten Outer-Iteration; die nächste Iteration startet mit **frischen** Leaves durchweg (harte Grenze —
kein Leaf spannt in die Folge-Iteration hinein).

```markdown
## Delta-Protokoll — Outer Loop Iteration N

### PO/Stakeholder-Befunde
- [Befund]: [Beschreibung]

### Änderungen am Request
- Neu: [neue Anforderung / neues AC]
- Weggefallen: [AC oder Scope der entfernt wird]
- Modifiziert: [bestehendes AC das sich ändert]

### Betroffene Plan-Teile
- [Topic / Slice / Bereich]: [wie betroffen]
- Unverändert (wird geerbt): [Liste]

### Planungs-Hinweis für Iteration N+1
- Anzahl AC-Änderungen: [N]
- Re-Planung läuft lean/solo (einziger Planungsmodus); nur die betroffenen Topics werden neu geplant.
```
