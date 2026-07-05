# finding-guard.md

Reviewer:guard · MCP:BLOCKER(fallback:Read/Grep/Bash) · Verdikt:CLEAN

---

## Findings-Tabelle

| File | Line | Tier-Vorschlag | Befund | Failure-Scenario |
|------|------|:--------------:|--------|-----------------|
| `subagent-prompts.md` | 236–242 | 🟢 | Scribe-4-5-Payload (implement-scribe-opus-agent) retains Angular Hard Rules Volltext — pre-existing, explizit unangetastet (commit c61e484: "8 unangetastete Blöcke"). Kein W0/W1-Regressionsbeitrag. | §5 — out-of-scope; kein akuter Defekt |

---

## PRESERVE — Fix-Agent: nicht ändern ohne begründete Notwendigkeit

1. `implement-scribe-agent.md` Zeilen 41–47 — `## Angular Hard Rules — OnPush + async-Listen` als eigenständiger Abschnitt; 1:1 aus Payload migriert. Kern-Deliverable W0; Regressions-Anker für alle Scribe-Agents die auf das Profil zeigen.
2. `subagent-prompts.md` Zeilen 194–206 — Scribe-1-3-Payload: OnPush ausschließlich als Pointer-Beschriftung in Ablauf-Zeile (`OnPush-Regel`), nicht als Volltext. Migrations-Guard-Ziel präzise erfüllt.
3. `subagent-prompts.md` Zeilen 25–44 — plan-agent-Payload: ausschließlich Pointer + variable Rundendaten; bereits vor W1 slimmed und korrekt unberührt gelassen.
4. `subagent-prompts.md` Zeilen 113–126 — PL-Payload: Pointer + variable Rundendaten. `Ablauf Schritt 0-6 … implement-round-executor.md` ist Pointer-Label, keine Ablauf-Kopie.
5. `subagent-prompts.md` Zeilen 130–144 — PM-Payload: Pointer + variable Rundendaten. `Ablauf tier-gesteuertes Urteil … implement-supervisor.md` ist Pointer-Label, keine Ablauf-Kopie (korrekt von Scribe dokumentiert).
6. `subagent-prompts.md` Zeilen 360–450 — alle 7 Impl-Review-Payloads: Pointer + Kanon-Pointer + variable Rundendaten; kein Profil-Ablauf im Payload. Design-Principles-Block: stale IODA-Input korrekt entfernt.
7. `subagent-delegation-boilerplate.md` — unverändert; Punkt 1 (`.claude/references/agent-compliance.md` + Profil-Pfad + Skills) intakt.

---

## Erfüllte ACs

- AC-1: plan-agent-Payload = Pointer + variable Rundendaten, keine planning-flow/Profil-Kopie ✓
- AC-2: alle 7 Impl-Reviewer-Payloads pointer-only; Ablaufschritte ausschließlich im jeweiligen Profil ✓
- AC-3 (Guard): `subagent-delegation-boilerplate.md` Punkt 1 unverändert ✓
- AC-4 (Negativ): kein überarbeiteter Payload dupliziert Profil-Ablauf; alle 10 in W1 bearbeiteten Blöcke pointer-clean ✓
- Migrations-Guard: OnPush-Regel in `implement-scribe-agent.md` Profil vorhanden (Zeilen 41–47); Scribe-1-3-Payload ohne Volltext ✓
