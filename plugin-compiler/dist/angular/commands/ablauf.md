---
description: 'Zeigt den Ablauf von angular: Etappen, Befehle, Artefakte und Gates.'
---
<!-- GENERIERT - nicht editieren. Quelle: plugin-compiler/src/plugins/angular.yaml (emit.commands) -->

# Ablauf von angular

Gib diese Übersicht unverändert aus und sonst nichts.

| # | Etappe | Befehl | Eingang | Artefakt | Gate |
|---|---|---|---|---|---|
| 1 | Spec | `/angular:spec [anliegen]` | Gespräch | `spec.md` | Frontier leer; Inhalt, Titel und Slug ausdrücklich bestätigt; Datei am Zielpfad wortgleich mit dem Entwurf geschrieben. |
| 2 | Grill | `/angular:grill <spec.md>` | `spec.md` | `spec.md` | Frontier leer; jede Änderung nach Bestätigung geschrieben; jede neue Entscheidung steht als W-Eintrag in der Spec. Hook blockt ohne Pflichtartefakt. |
| 3 | Spec-Review | `/angular:spec-review <spec.md>` | `spec.md` | `spec-review.md` | Bericht mit Verdict und Befundliste neben der Spec abgelegt; Verdict APPROVE nur ohne offenes 🔴. Hook blockt ohne Pflichtartefakt. |
| 4 | Plan | `/angular:plan <spec.md> [ziel.md]` | `spec.md`, `spec-review.md` | `plan.md` | Plan im Format unten geschrieben; jedes AC in mindestens einem Task; Selbst-Check erledigt. Hook blockt ohne Pflichtartefakt. |
| 5 | Plan-Review | `/angular:plan-review <plan.md>` | `plan.md`, `spec.md` | `plan-review.md` | Bericht mit Verdict und Befundliste neben dem Plan abgelegt; Verdict APPROVE nur ohne offenes 🔴. Hook blockt ohne Pflichtartefakt. |

Profil: `angular`, Planungs-Skills: `dv-angular:toolchain`, `dv-angular:angular-testing`, `dv-angular:angular-project-layout`.
