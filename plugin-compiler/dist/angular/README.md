<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/plugins/angular.yaml -->

# angular

Spezifizieren und Planen für Angular-Projekte, gemeinsamer Kern plus Angular-Toolchain-Regeln (Prototyp aus plugin-compiler).

Version 0.1.0, Profil `angular`. Erzeugt von `plugin-compiler/tools/build.py`; Änderungen gehören in `plugin-compiler/src/`.

| Etappe | Skill | Reviewer | Gate-Hook |
|---|---|---|---|
| Spec | `/angular:spec` | – | – |
| Grill | `/angular:grill` | – | `scripts/gate-grill.sh` |
| Spec-Review | `/angular:spec-review` | `angular:spec-review` | `scripts/gate-spec-review.sh` |
| Plan | `/angular:plan` | – | `scripts/gate-plan.sh` |
| Plan-Review | `/angular:plan-review` | `angular:plan-review` | `scripts/gate-plan-review.sh` |

```text
/plugin marketplace add ./plugin-compiler/dist
/plugin install angular@dv-plugin-compiler-demo
```

Regeln: 27 aus dem gemeinsamen Kern, 3 nur in angular.
