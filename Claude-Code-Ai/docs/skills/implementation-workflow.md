# Implementation Workflow

Strukturierte Code-Umsetzung mit Hard Gate, Slice-Agenten und iterativem Review-Loop. Verbindlich vor jeder schreibenden Repo-Änderung.

**Trigger:** `implementiere`, `setze um`, `fix`, `leg los`, `go ahead`, `IMP-*-Slice`, Hard Gate  
**Opt-out:** `ohne implement-skill`

---

## Ablauf

### Schritt 1 — Hard Gate

Vor der ersten Code-Änderung:
- Plan-Paket vollständig vorhanden (Slices, ACs, Wellen)?
- MCP-Server erreichbar (`dev-angular-mcp` / `dev-dotnet-mcp`)?
- Kein Shell-Build/Test ohne MCP-Freigabe (BLOCKER-Protokoll)?

### Schritt 2 — Slices (1–10)

Je Slice ein `implement-agent`-Subagent:
- Setzt **genau einen** IMP-Slice um (Code + Slice-lokale Build/Test-Verifikation)
- Build/Test **immer via MCP** — niemals `ng build` / `dotnet build` als Shell
- Kein stack-weites Technik-Gate — das ist Schritt 3

### Schritt 3 — Technik-Gate + Review-Loop (max. 3×)

Nach allen Slices:
1. Stack-weites Technik-Gate (Compiler, Tests, Linting via MCP)
2. 6 parallele Review-Agenten (Lehrer, Normalo, Oberlehrer, Optimist, Pessimist, Professor)
3. `implement-fix-planner-agent` erstellt evidenzbasierten Fix-Teilplan
4. Fix-Slices → zurück zu Schritt 2 (max. 3 Iterationen)

---

## Sub-Agents

| Agent | Modell | Rolle |
|-------|--------|-------|
| `implement-agent` | Sonnet | Einen IMP-Slice umsetzen (Code + lokale QS) |
| `implement-fix-planner-agent` | Sonnet | Fix-Plan nach Review-Findings erstellen |
| `implement-review-lehrer-agent` | Sonnet | Review: Fachliche Korrektheit, APIs, Typen, Tests |
| `implement-review-normalo-agent` | Sonnet | Review: Ship-Readiness, Pragmatik, Top-3-Empfehlungen |
| `implement-review-oberlehrer-agent` | Sonnet | Review: Handwerkliche und formale Mängel (min. 3 Kritikpunkte) |
| `implement-review-optimist-agent` | Sonnet | Review: Stärken, erfüllte ACs, Vereinfachungen |
| `implement-review-pessimist-agent` | Sonnet | Review: Blocker, Regressionen, ungetestete Public-API |
| `implement-review-professor-agent` | Opus | Review: Tiefenanalyse KRITISCH/WESENTLICH/FORMAL, Note 1–5 |

---

## Anti-Shortcuts (Hard Gate)

| Verboten | Richtig |
|----------|---------|
| `ng build` als Shell | `dev-angular-mcp` → `run_build` |
| `ng test` als Shell | `dev-angular-mcp` → `run_tests` |
| `dotnet build` als Shell | `dev-dotnet-mcp` → `run_build` |
| `dotnet test` als Shell | `dev-dotnet-mcp` → `run_tests` |

Ausnahme: Shell-Fallback nur nach expliziter BLOCKER-Freigabe durch den User. Dann `build-log-filter` für Log-Verdichtung.

---

## Slice-ID-Konvention

```
IMP-FE-{Bereich}     Frontend-Slice  (z. B. IMP-FE-Auth, IMP-FE-Dashboard)
IMP-BE-{Kürzel}      Backend-Slice   (z. B. IMP-BE-UserSvc, IMP-BE-Migrations)
```

---

## Zusammenspiel mit anderen Skills

- **Vorher:** [`planning-workflow`](./planning-workflow.md) liefert das Plan-Paket
- **Build/Test:** [`dev-tooling-mcp`](./dev-tooling-mcp.md) für MCP-Auswahl
- **Log-Analyse:** [`build-log-filter`](./build-log-filter.md) im Shell-Fallback
- **Code-Analyse:** [`codebase-analyzer`](./codebase-analyzer.md) für Index und Symbole
