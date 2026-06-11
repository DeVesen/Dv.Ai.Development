# Subagent-Delegations-Boilerplate (copy into Task-Prompt)

Orchestrator: **Pflicht** vor jedem Subagent-Start — Block unten (angepasst) in den Task-Prompt einfügen. Nicht paraphrasieren, nicht weglassen.

---

```markdown
## Agent-Compliance (Pflicht — vor Start vollständig lesen und einhalten)

1. Lade und **befolge** (nicht nur überfliegen):
   - `.cursor/references/agent-compliance.md`
   - Dein Agent-Profil unter `.cursor/agents/<profil>.md` (Pflicht-Dokumente dort vollständig)
   - Alle im Auftrag genannten Rules (`.cursor/rules/*.mdc`) und Skills — **vollständig**
2. **Workflow:** Nur innerhalb des zugewiesenen Scopes; kein Scope-Creep; keine stille Planänderung.
3. **MCP-First (alle Phasen):** `./mcps.md` lesen; MCPs bevorzugt vor Read/Grep einsetzen. Fallback auf Read/Grep nur nach ausgeschöpfter MCP-Kette oder MCP-BLOCKER — mit Begründung dokumentieren. Ausnahme: reine UI-Labels ohne Symbol.
4. **Build/Test (in-scope):** Rule `build-log-filter.mdc` Schritte 1–8 **pro Shell-Lauf**; Diagnose nur aus intern gelesenem MCP; Verifikations-Matrix pro Lauf.
5. **Verboten:** Roh-Konsole/Shell-Tool-UI/terminals/*.txt als Reasoning-Input; Workflow-Phasen überspringen; Skills ignorieren nach dem Laden.
6. **MCP down (build-log-filter, in-scope):** `BLOCKER: build-log-filter nicht erreichbar` — stoppen, an Orchestrator melden.
7. **Rückgabe:** Summary, touched paths, Compliance bestätigt (ja/nein), Verifikations-Matrix (falls Build/Test), Blockers.
```

---

Rollen-spezifische Vorlage **zusätzlich** aus dem Workflow-Skill (`subagent-prompts.md`) einbinden — dieser Block ersetzt sie **nicht**.
