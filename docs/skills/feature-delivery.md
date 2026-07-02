# feature-delivery

Orchestrator-Skill für vollständige Feature-Umsetzung (.NET + Angular). Deckt den gesamten Bogen: Anforderung → Plan → Umsetzung → Qualitätssicherung → Ergebnis.

> **Agent-Kanon (Pflicht):** [`.claude/skills/feature-delivery/SKILL.md`](../../.claude/skills/feature-delivery/SKILL.md)

feature-delivery akzeptiert **ausschließlich Stories** (`type: story`, `status: ready`). Epics/Features → REFUSE; fehlendes Story-Format → Rückfrage + Bestätigung. Details: Story-Gate in der SKILL.md.

---

## Branch-Guard (erste Aktion aller schreibenden Einstiege)

Erste Aktion von `plane`, `implementiere`, `implementiere nur` und From-existing-plan — noch **vor** dem Story-Gate:

```
git rev-parse --abbrev-ref HEAD
```

- Aktueller Branch = Default-Branch (`master`/`main`) → **STOPP.** Feature-Branch-Namen nach Konvention `feat-<nnn>-<slug>` vorschlagen, nach Bestätigung `git checkout -b …`, erst dann läuft der Flow.
- Beliebiger anderer Branch → kein Guard-Stopp, direkt weiter.
- **Review-Trigger** (`code-inspection`, `delivery-inspection`) sind **nicht** geblockt — uncommitted-scoped und branch-unabhängig; auf dem Default-Branch nur der Hinweis „kein Feature-Delta".

---

## Einstiege

| Trigger | Einstieg | Verhalten |
|---------|----------|-----------|
| `plane`, `plan`, `plane nur`, `plane only`, `nur planen`, `erstelle einen Plan` | **Plan-only** | **Immer lean/solo** (der Orchestrator plant ohne Planungs-Subagents und ohne Review-Loop). Plan persistiert unter `requests/plans/plan-<slug>.md` → Story auf `planned` → **STOPP**. **Kein Auto-Implement.** |
| `implementiere`, `implement`, `setze um`, `liefere`, `umsetzen`, `feature-delivery`, `fix` | **Implementieren — voll** | Setzt einen **existierenden** Plan um, mit allen Schleifen: Scribes → Build/Test → Inner-Loop (max. 5 Runden, 7 Reviewer, PL/PM, SecondBrain) → Outer-Delivery-Inspection. Plant **nicht** selbst; verlangt `status: planned`. Story → `reviewed` (bei Outer-Verdikt `OK`). |
| `implementiere nur` | **Implementieren — nur (Lean Single-Pass)** | Schlanker Scribe-Einzeldurchlauf + slice-scoped Build/Test **bis grün (max. 5 Fix-Versuche)**. **Keine** Reviewer, kein PL/PM, kein SecondBrain, keine Delivery-Inspection. Test-First-Scribe-Qualität bleibt voll. Grün → `implemented`, sonst → `blocked`. |
| `setze plan X um`, `implementiere plan X`, `führe plan X aus` | **From-existing-plan** | Überspringt den Planungs-Flow, lädt den bestehenden Plan → volle Loops (wie `implementiere`) → `reviewed`. |

**Already-Planned:** Story mit `status: planned` + `plan`-Referenz → der verlinkte Plan wird automatisch geladen; das Verb entscheidet die Tiefe (`implementiere` = volle Loops → `reviewed`, `implementiere nur` = Lean Single-Pass → `implemented`/`blocked`).

**Wichtig — kein Auto-Planning:** `implementiere` auf `status: ready` **ohne** Plan → STOPP + Hinweis *„erst `plane [ID]` ausführen"*. Planung und Umsetzung sind zwei getrennte, explizite Aufrufe; `plane` kettet nie automatisch in die Umsetzung.

---

## Review-on-Demand (beratend — kein Auto-Fix, kein Status-Flip)

Zwei **beratende** Trigger auf den aktuellen Arbeitsstand. Reiner Befund; der Nutzer bleibt PM und entscheidet nach dem Report selbst über Nachschärfen oder Abnahme.

| Trigger | Prüft | Umfang |
|---------|-------|--------|
| `code-inspection` | Code-Qualität/Korrektheit über den Diff. **Kein Feature nötig.** | 6 `implement-review-*`-Agents (risk · design-principles · craft · auditor · guard · readiness) parallel, **ohne** Fix-Anwendung. |
| `delivery-inspection FEATURE-X` | Anforderungserfüllung. **Feature-Bezug PFLICHT und explizit** — ohne Feature-Argument → **STOPP**. | Lädt das Feature → referenzierte Stories → ACs und prüft den Diff dagegen (Reuse des `delivery-inspection`-Skills, advisory single-pass). |

- **Default-Scope beider** = alle uncommitteten Änderungen inkl. untracked (`git diff HEAD` + untracked-Liste), branch-unabhängig. **Merge-Base-Alternative** (`git diff <merge-base>..HEAD`) bei bereits committetem Feature.
- **Ausgabe:** Befund-Datei `Requests/reviews/<feature>-<inspection>-<n>.md` (nach Story/Bereich gruppiert) **+ Chat-Kurzfassung**.
- **Kein** Story-Status geändert, **kein** Auto-Fix. Nachschärfen bleibt manuell: `implementiere STORY-X`.

Ablauf-Detail: [`flows/review-flow.md`](../../.claude/skills/feature-delivery/flows/review-flow.md).

---

## Lean-Mode (Default)

Planung ist **immer** lean/solo — der Orchestrator (`plan-agent`, Opus) plant solo, ohne Planungs-Subagents und ohne Review-Loop. Synonyme: `schlank planen`, `lean planen`, `kompakt planen`, `Solo-Planung` (bedeutungsgleich).

**`lean impl` (opt-in, `implementiere lean impl`):** reduziert den Impl-Review von 7 auf 3 Reviewer (risk · craft · readiness) — oder collapsed via `impl-quality-review-agent` (`implementiere lean impl collapsed`, 1 Agent / 1 Approval, alle Lenses intern). Scribes, Gates und Test-First bleiben voll.

---

## Status-Maschine (Story)

`offen` → `ready` → `planned` (durch `plane`) → `implemented` (durch `implementiere nur`, grün) / `reviewed` (durch volles `implementiere`) / `blocked` (durch `implementiere nur`, rot nach 5 Fix-Versuchen) → `done`/`accepted` (setzt der Nutzer als PM manuell). `implemented` und `reviewed` sind garantiert grüne Zustände.

---

## Flows

- **Planungs-Flow:** [`flows/planning-flow.md`](../../.claude/skills/feature-delivery/flows/planning-flow.md)
- **Implementations-Flow:** [`flows/implementation-flow.md`](../../.claude/skills/feature-delivery/flows/implementation-flow.md)
- **Review-on-Demand-Flow:** [`flows/review-flow.md`](../../.claude/skills/feature-delivery/flows/review-flow.md)

## Ablösung

Löst `planning-workflow` und `implementation-workflow` ab. Alle Flows liegen unter `.claude/skills/feature-delivery/flows/`.
