# Subagent — Modell vor Task (Pflicht)

Gilt für jeden Aufrufer, der einen **Task-Subagent** mit Agent-Typ aus [`.claude/agents/`](../agents/) startet (Planning, Implementation, ADO, verschachtelte Delegation).

## Regel

1. **Vor** dem Task das **Ziel-Profil** lesen (`<agent-name>.md` unter `.claude/agents/`).
2. Modellwahl **primär** aus Abschnitt **`## Modell`** im Body.
3. **Fehlt** Abschnitt **`## Modell`** → `model:` im YAML-Frontmatter desselben Profils.
4. Slugs, Fallback-Ketten, Host-Regeln und BLOCKER **nur** im Ziel-Profil — **nicht** in Skills, Prompts oder Parent-Agent-Profilen duplizieren.
5. Enthält **Modell** eine Kette mit Host-Regel → Task-Parameter `model` auf ersten **verfügbaren** Slug setzen; bei BLOCKER stoppen — Logik nur im Ziel-Profil.
6. **`modelUsed`** im Delegations-/Abschlussbericht nennen.

## Verweise statt Duplikate

Skills und Subagent-Prompts verweisen **nur** auf diese Referenz und das jeweilige Ziel-Profil — **keine** Modell-Listen kopieren.
