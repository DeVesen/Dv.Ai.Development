# plugin-compiler (Prototyp)

Erzeugt Claude-Code-Plugins aus einer Quelle der Wahrheit:

- **dv-forge, vollständig:** Session-Orchestrator, alle Orchestratoren und Skills, alle 28 Sub-Agents, die geteilten Regeln, Hooks und Skripte. Die Prosa ist wortgleich zum Bestand; das belegt die Stufe „Äquivalenz“ im Build und die forge-Testsuite gegen `dist/forge`.
- **angular, Prototyp:** fünf Etappen (Spec bis Plan-Review) aus dem gemeinsamen Kern plus drei Angular-Regeln.

Bestehende Plugins unter `plugins/` bleiben unverändert.

```
src/
  glossary.yaml          Begriffe (Kern + dv-forge aus CONTEXT.md), avoid wird geprüft
  artifacts.yaml         Artefakte des Prototyps
  rules/*.yaml           gemeinsamer Kern R-0xx (Prototyp)
  phases/*.yaml          Etappen des Prototyps
  partials/*.md          Prosa des Prototyps (Grill-Mechanik, Verdict)
  templates/*.j2         Templates; rules-doc.md.j2 erzeugt forges Regeldateien
  plugins/forge.yaml     dv-forge: Version, Assets, Hooks als Daten, Äquivalenz-Referenz
  plugins/angular.yaml   angular: Profil, Etappen, eigene Regeln R-2xx
  forge/
    skills/<skill>/SKILL.md (+ references/)   Manifest (kind, role, model_invocation, frontmatter) + Body
    agents/<agent>.md                         Manifest (stage, type, frontmatter) + Body
    shared/**.md, README.md                   geteilte Dateien
    partials/*.md                             22 wortgleiche Blöcke, eingesetzt mit <<= partial('name') >>
    rules/orchestrator.yaml, dialog.yaml      26 Regeln als Daten (R-3xx, R-4xx)
    etappen.yaml                              Session-Kette, beim Build gegen den Code abgeglichen
tools/
  build.py, common.py, components.py          Compiler
  schemas/*.json                              JSON-Schema je Dateiart
  migrate/import_forge.py, import_rules.py    einmalige Migration plugins/forge → src/forge (nur mit --force erneut)
  smoke.sh                                    build, git diff, validate --strict, forge-Testsuite
dist/                                          Ausgabe (eingecheckt)
reports/forge-graph.md                         Aufrufgraph Leit-Session → Etappen → Skills → Sub-Agents (erzeugt)
```

Bauen: `python3 tools/build.py`. Abnahme: `tools/smoke.sh`. Test-Deploy: `TEST.md`. Fehlerdemos: `DEMO-BREAK.md`. Bestandsaufnahme und Befunde: `INVENTORY.md`.

Konventionen: Prototyp-Quellen nutzen `[[Begriff]]` und `[R-020]`; forge-Bodies nutzen eigene Jinja-Begrenzer (`<<= … >>`, `<% … %>`, `<# … #>`), weil der forge-Text `{{PLUGIN}}` wörtlich enthält. Offene Punkte stehen als `TODO(<Quelldatei>)`.
