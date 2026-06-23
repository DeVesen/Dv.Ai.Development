# acceptance-design

Prüft Anforderungen auf Testbarkeit und schärft untestbare Kriterien nach. Die **WAS**-Hälfte im TDD-Prinzip — komplementär zu `test-design` (die WIE-Hälfte).

> **Agent-Kanon (Pflicht):** [`.claude/skills/acceptance-design/SKILL.md`](../../.claude/skills/acceptance-design/SKILL.md)

---

## Trigger

`schärfe Anforderung`, `Akzeptanzkriterien prüfen`, `Akzeptanzkriterien schärfen`, `testbare Kriterien`, `@acceptance-design`, `Anforderung auf Testbarkeit prüfen`

## Ablauf

1. Anforderung vollständig lesen
2. Jedes Akzeptanzkriterium gegen den Prüfkatalog abgleichen
3. Testbare Kriterien in F1-Format übersetzen; untestbare schärfen oder als Rückfrage markieren
4. Unklare Kriterien dem Nutzer vorlegen — warten
5. Ausgabe: Akzeptanzliste (F1-Format) + Befund + offene Rückfragen

## Agent

`acceptance-design-agent` — harness-weit discoverable via `.claude/agents/acceptance-design-agent.md`

## Opt-out

`ohne acceptance-design`
