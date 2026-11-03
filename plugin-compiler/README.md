# plugin-compiler (Prototyp)

Erzeugt Claude-Code-Plugins aus einer Quelle der Wahrheit:

- **dv-forge 0.35.0, vollständig:** Session-Orchestrator, alle Orchestratoren und Skills, alle 28 Sub-Agents, die geteilten Regeln, Hooks, Skripte, Tests und Golden-Sets. Grundlage ist dv-forge 0.34.0 plus `fix/forge-handover-stability`. Jede Abweichung davon steht mit Befund-Nummer in `src/forge/CHANGES.yaml`; der Build gleicht jede Datei mit `plugins/forge` ab, und die forge-Testsuite läuft gegen `dist/forge`.
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
    assets/                                   Skripte, Tests, Golden-Sets (unverändert kopiert)
    CHANGES.yaml                              Änderungsprotokoll: Abweichungen vom Bestand je Befund, mit abgenommenem Stand
tools/
  migrate/import_forge.py, import_rules.py    einmalige Migration plugins/forge → src/forge (nur mit --force erneut)
  smoke.sh                                    Try-Deploy der Druckerei und Vergleich mit dem eingecheckten dist/
druckerei.yaml                                 macht den Ordner zum Projekt der Plugin-Druckerei
dist/                                          Ausgabe (eingecheckt)
reports/forge-graph.md                         Aufrufgraph Leit-Session → Etappen → Skills → Sub-Agents (erzeugt)
```

Der Compiler selbst ist seit dem Plugin **dv-plugin-druckerei** (`plugins/plugin-druckerei`) allgemein; dieser Ordner ist sein erstes Projekt. Prüfen: `druckerei pruefen` (Try-Deploy). Ausliefern mit neuer Version: `druckerei deploy --stufe patch|minor|major --plugin <name>`. Eine gewollte Änderung an einer schon geänderten Datei nimmst du mit `druckerei abnehmen` ab. Abnahme: `tools/smoke.sh`. Test-Deploy: `TEST.md`. Fehlerdemos: `DEMO-BREAK.md`. Bestandsaufnahme und Befunde: `INVENTORY.md`.

Konventionen: Prototyp-Quellen nutzen `[[Begriff]]` und `[R-020]`; forge-Bodies nutzen eigene Jinja-Begrenzer (`<<= … >>`, `<% … %>`, `<# … #>`), weil der forge-Text `{{PLUGIN}}` wörtlich enthält. Offene Punkte stehen als `TODO(<Quelldatei>)`.
