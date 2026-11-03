# plugin-compiler (Prototyp)

Erzeugt die Claude-Code-Plugins `forge` und `angular` aus einer Quelle der Wahrheit. Bestehende Plugins unter `plugins/` bleiben unverändert.

```
src/
  glossary.yaml        ein Begriff, eine Definition, verbotene Synonyme (avoid)
  artifacts.yaml       Artefakte der Etappen (spec.md, spec-review.md, plan.md, plan-review.md)
  rules/*.yaml         gemeinsamer Kern: R-0xx mit text, why, enforce (text|hook), source
  phases/*.yaml        Etappen: after, inputs, outputs, gate, rules, required, format, examples, review
  plugins/*.yaml       je Plugin: version, profile, emit (Etappen, Commands), eigene Regeln R-1xx/R-2xx
  partials/*.md        wiederverwendbare Prosa (Grill-Mechanik, Verdict)
  templates/*.j2       skill, agent, gate-hook, references, command, readme
tools/
  build.py             laden → prüfen → auflösen → rendern → linten → schreiben
  schemas/*.json       JSON-Schema je Dateiart
  smoke.sh             build, git diff auf dist/, claude plugin validate --strict
dist/                  Ausgabe (eingecheckt, GENERIERT – nicht editieren)
```

Bauen: `python3 tools/build.py` (Abhängigkeiten in `requirements.txt`). Test-Deploy: `TEST.md`. Fehlerdemo: `DEMO-BREAK.md`. Bestandsaufnahme: `INVENTORY.md`.

Konventionen im Quelltext: Fachbegriffe als `[[Begriff]]` oder `[[Begriff|Form]]`, Regelverweise im Ablauf als `[R-020]`, offene Punkte als `TODO(<Quelldatei>)`.
