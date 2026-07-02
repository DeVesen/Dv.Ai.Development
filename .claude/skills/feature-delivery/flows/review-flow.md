# Review-Flow — Review-on-Demand (`code-inspection`, `delivery-inspection FEATURE-X`)

Zwei **beratende** Review-Trigger. Sie prüfen den aktuellen Arbeitsstand auf Abruf und liefern einen
Befund — sie **fixen nichts, flippen keinen Status, ketten in keine Umsetzung**. Der Nutzer bleibt
Projektmanager und entscheidet nach dem Report selbst über Nachschärfen (`implementiere STORY-X`) oder
Abnahme.

Verbindliche Prompt-Vorlagen der Reviewer: [../references/subagent-prompts.md](../references/subagent-prompts.md).

---

## Gemeinsame Grundregeln (gelten für beide Trigger)

| Regel | Detail |
|-------|--------|
| **Beratend** | **Kein** Auto-Fix, **kein** Story-Status-Flip, **kein** SecondBrain, **kein** Inner/Outer-Loop, **keine** PL/PM-Rollen, **kein** Runden-Cap. Reiner Befund. |
| **Branch-unabhängig** | **Kein** Branch-Guard-Stopp (STORY-003). Uncommitted-scoped, funktioniert auf jedem Branch. Auf dem Default-Branch (`master`/`main`) ohne uncommittete Änderungen und ohne Merge-Base-Delta: nur Hinweis *„kein Feature-Delta — nichts zu prüfen"*, kein Abbruch mit Fehler. |
| **MCP-First** | Diff/Changed-Files über `dev-mcp` (`git_diff_summary`, `git_changed_files`) bzw. `git`; Symbol-/Code-Lookup der Reviewer über die MCPs (Reviewer folgen ihren eigenen Profilen). |
| **Ausgabe** | Befund-**Datei** unter `Requests/reviews/<feature>-<inspection>-<n>.md` (nach Story bzw. Bereich gruppiert) **+ Chat-Kurzfassung**. Details: Schritt C. |
| **Dispatch** | Reviewer laufen im **Vordergrund**, direkte Rückgabe (kein Background-Task, kein Notification-Wait) — dasselbe Muster wie der PL→Impl-Reviewer-Dispatch. |

---

## Schritt A — Scope bestimmen (beide Trigger)

**Default-Scope = alle uncommitteten Änderungen inkl. neuer/untracked Dateien**, branch-unabhängig.

1. **Getrackte Änderungen:** `git diff HEAD` (Working-Tree + Index gegen letzten Commit) —
   via `git_diff_summary` / `git_changed_files` (dev-mcp) oder `git diff HEAD --name-only` + `git diff HEAD`.
2. **Untracked/neue Dateien:** `git ls-files --others --exclude-standard` — diese Dateien
   **vollständig** als „neu hinzugefügt" in den Scope aufnehmen (kein Diff-Kontext, da kein Vorzustand).

Der Scope beider Trigger ist damit `git diff HEAD` **+ untracked-Liste** — deckt auch Dateien ab, die
noch nie committet wurden.

### Merge-Base-Alternative (bereits committetes Feature)

Ist der uncommittete Scope **leer** (getrackter `git diff HEAD` liefert nichts **und** keine untracked
Dateien) — das Feature ist bereits committet — dann automatisch auf den **Merge-Base-Branch-Diff**
umschalten:

```
git merge-base master HEAD      # Basis, an der der Feature-Branch abzweigt
git diff <merge-base>..HEAD     # vollständiges Feature-Delta seit Abzweig
```

Der Merge-Base-Scope ist außerdem **explizit anforderbar** (z. B. *„code-inspection gegen master"*),
auch wenn uncommittete Änderungen vorliegen.

| Befund Working-Tree | gewählter Scope |
|---|---|
| uncommittete Änderungen und/oder untracked Dateien vorhanden | `git diff HEAD` + untracked-Liste (Default) |
| Working-Tree sauber, Feature committet | `git diff <merge-base>..HEAD` (Merge-Base-Alternative) |
| Working-Tree sauber **und** kein Merge-Base-Delta (z. B. frisch auf `master`) | Hinweis *„kein Feature-Delta"*, kein Reviewer-Lauf |

Den gewählten Scope im Chat in einem Halbsatz nennen (*„Scope: uncommitted (git diff HEAD + 2 untracked)"*
bzw. *„Scope: Merge-Base master..HEAD, da Feature committet"*).

---

## Schritt B — Reviewer dispatchen

### B1 — `code-inspection` (Code-Qualität/Korrektheit — **kein Feature nötig**)

Prüft den Diff auf handwerkliche Qualität und Korrektheit — unabhängig von Anforderungen.

- **Kein Feature-Argument nötig.** `code-inspection` läuft ohne Feature-/Story-Bezug direkt über den Scope.
- **6 `implement-review-*`-Agents parallel im Vordergrund, read-only, ohne Fix-Anwendung:**

  | Agent | Linse |
  |-------|-------|
  | `implement-review-risk-agent` | BLOCKING/RISK — Regressionen, ungetestete Public-API, Security, Contract-Drift |
  | `implement-review-design-principles-agent` | IODA/IOSP, SOLID, persönliche Design-Regeln, DDD-Grenzen |
  | `implement-review-craft-agent` | Naming, Verschachtelung/Guard Clauses, toter Code, Fehler-Verschlucken |
  | `implement-review-auditor-agent` | Unabhängige Tiefenanalyse — Vollständigkeitslücken, Konsistenzbrüche |
  | `implement-review-guard-agent` | PRESERVE-Liste — was ist tragfähig und schützenswert |
  | `implement-review-readiness-agent` | Ship-Readiness — SHIP/CONDITIONAL/NO-SHIP + Top-3 |

  **Jeder Reviewer erhält:** den Diff + Touched Paths + Scope-Beschreibung. **Kein** Feature-/AC-Kontext
  (den gibt es hier bewusst nicht).
  **Auftrag:** reiner Befund — **kein** Fix, **keine** Fix-Anwendung, **kein** Digest-Bau,
  **keine** Tier-Autorität (das ist Inner-Loop-Sache).

> **Konventionsentscheidung (User-sichtbar):** `code-inspection` nutzt die **6** registrierten
> `implement-review-*`-Agents (risk · design-principles · craft · auditor · guard · readiness). Der
> 7. Inner-Loop-Reviewer **`verifier`** entfällt bewusst — sein Kern-Deliverable ist die AC-Map
> (jedes Akzeptanzkriterium auf einen Test gemappt), und `code-inspection` hat **keinen** AC-Kontext.
> AC-/Anforderungsprüfung ist Aufgabe von `delivery-inspection`. Falls `verifier` doch mitlaufen soll:
> ein Wort genügt.

### B2 — `delivery-inspection FEATURE-X` (Anforderungserfüllung — **Feature-Bezug PFLICHT**)

Prüft, ob der Diff die Anforderungen des Features erfüllt — aus Besteller-Perspektive.

**Feature-Bezug-Gate (zuerst, verbindlich):**

| Aufruf | Reaktion |
|--------|----------|
| `delivery-inspection FEATURE-X` (Feature-Id explizit angegeben) | weiter mit Laden |
| `delivery-inspection` **ohne** Feature-Argument | **STOPP** — **keine** Prüfung, kein Reviewer-Lauf. Meldung: *„⚠️ `delivery-inspection` verlangt einen expliziten Feature-Bezug. Bitte das zu prüfende Feature angeben: `delivery-inspection FEAT-XXX`."* |

**Feature → Stories → ACs laden (nach bestandenem Gate):**

1. Feature-Datei laden: `Requests/features/<FEATURE-X>_*.md`.
2. Den referenzierten Stories folgen — aus dem `children:`-Frontmatter bzw. der Story-Liste des Features.
3. Für jede referenzierte Story deren Akzeptanzkriterien (Block `<!-- rd:ac:start --> … rd:ac:end -->`)
   einlesen und zu einer **aggregierten AC-Liste** zusammenführen (je AC: Story-Id + Testname + Assert).

**6 Reviewer-Rollen der `delivery-inspection` dispatchen — Reuse des bestehenden Skills:**

Die 6 Rollen aus [../../delivery-inspection/SKILL.md](../../delivery-inspection/SKILL.md)
(Revisor · Skeptiker · Normalo · Dolmetscher · Auftraggeber · Querdenker), **parallel im Vordergrund**.

- **Jeder Reviewer erhält:** die aggregierte AC-Liste (nach Story gruppiert) + den Diff/Touched Paths + Scope-Beschreibung.
- **Advisory Single-Pass:** Nur **Schritt 1** der delivery-inspection (6 Reviewer parallel, jeder liefert
  seine Befunde). Die **Fix-Iteration der delivery-inspection (Schritte 3–6) entfällt** — dieser Trigger
  ist beratend: kein Nachliefern, kein Fix, kein Loop. Die Befunde fließen direkt in den Report (Schritt C).
- **Count-Guard:** erst weiter, wenn alle **6** Reviewer-Rückgaben vorliegen (direkte Vordergrund-Rückgaben).

---

## Schritt C — Befund-Datei schreiben + Chat-Kurzfassung

**Kein Story-Status wird verändert. Kein Auto-Fix. Kein Commit.** Die Ausgabe ist rein dokumentierend.

### Report-Pfad

```
Requests/reviews/<feature>-<inspection>-<n>.md
```

- Verzeichnis `Requests/reviews/` bei Bedarf anlegen (existiert im frischen Repo noch nicht).
- `<inspection>` = `code-inspection` **oder** `delivery-inspection`.
- `<feature>`:
  - **delivery-inspection:** die (Pflicht-)Feature-Id, z. B. `FEAT-001`.
  - **code-inspection:** der Slug des aktuellen Feature-Branches (`feat-<nnn>-<slug>` → `<slug>`), da
    „ein Feature = ein Branch" gilt. Auf einem Nicht-Feature-Branch (z. B. `master`) Fallback `code`.
- `<n>` = **laufender Zähler pro `<feature>`+`<inspection>`-Kombination**, beginnend bei `1`. Vor dem
  Schreiben `Requests/reviews/` nach vorhandenen `<feature>-<inspection>-*.md` scannen, höchstes `<n>`
  ermitteln, `+1`.

Beispiele: `Requests/reviews/FEAT-001-delivery-inspection-1.md`,
`Requests/reviews/fd-einstiege-redesign-code-inspection-2.md`.

### Report-Aufbau (nach Story bzw. Bereich gruppiert)

```markdown
# <Inspection-Typ> — <feature> — Report #<n>

- **Datum/Scope:** <uncommitted | merge-base master..HEAD>
- **Geprüfte Dateien:** <n Dateien> (Liste)
- **Trigger:** code-inspection | delivery-inspection <FEATURE-X>
- **Charakter:** beratend — kein Fix, kein Status-Flip

## Zusammenfassung
<1–3 Sätze Gesamtbild + Finding-Zähler nach Schweregrad>

## Befunde — <STORY-XXX: Titel>        ← delivery-inspection: je referenzierter Story
                                          ← code-inspection: je Datei/Bereich (kein Story-Bezug vorhanden)
| # | Datei:Zeile | Schweregrad | Reviewer | Befund | Failure-Szenario / betroffener AC |
|---|-------------|-------------|----------|--------|-----------------------------------|
| … | … | 🔴/🟡/🟢 | risk/… bzw. Skeptiker/… | … | … |

## Befunde — <nächste Story / nächster Bereich>
…

## Nicht-abgedeckte ACs (nur delivery-inspection)
<je Story: welche aggregierten ACs im Diff nicht nachweisbar erfüllt sind>

## Empfehlung (beratend)
<Priorisierte Punkte; Hinweis: Nachschärfen manuell via `implementiere STORY-X`>
```

**Gruppierung:**
- **delivery-inspection:** nach **referenzierter Story** (jede Story des Features = ein Abschnitt mit ihren ACs und den Befunden dagegen).
- **code-inspection:** nach **Datei/Bereich** — es gibt keinen Feature-/Story-Bezug, deshalb ist die
  Datei die natürliche Gruppierungseinheit (im Report vermerken).

### Chat-Kurzfassung

Nach dem Schreiben im Chat ausgeben:
- Report-Pfad (klickbar) + gewählter Scope.
- Finding-Zähler nach Schweregrad (🔴/🟡/🟢) bzw. je Reviewer-Rolle.
- Top-3 Befunde als Einzeiler.
- Expliziter Hinweis: *„Beratend — kein Status geändert, kein Fix angewandt. Nachschärfen: `implementiere STORY-X`."*

---

## Abgrenzung

| | `code-inspection` | `delivery-inspection FEATURE-X` |
|---|---|---|
| Feature-Bezug | nicht nötig | **Pflicht + explizit** (sonst STOPP) |
| Prüffokus | Code-Qualität/Korrektheit über den Diff | Anforderungserfüllung (Feature→Stories→ACs) gegen den Diff |
| Reviewer | 6 `implement-review-*` (ohne `verifier`) | 6 `delivery-inspection`-Rollen (advisory single-pass) |
| Fix / Status / Loop | keiner | keiner |
| Ausgabe | `Requests/reviews/<slug>-code-inspection-<n>.md` | `Requests/reviews/<FEATURE-X>-delivery-inspection-<n>.md` |

Beide Trigger sind **entkoppelt** von den Implement-Verben (`implementiere`, `implementiere nur`) — sie
setzen nichts um und ersetzen weder den Inner-Loop noch die in `implementiere` integrierte
Outer-Delivery-Inspection.
