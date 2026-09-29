---
id: STORY-002
parent: FEAT-001
type: story
status: implemented
slug: feature-delivery-worktree-bootstrap
depends_on: [STORY-001]
touches: [feature-delivery/flows/implementation-flow.md]
---

# feature-delivery: Frischer-Worktree-Bootstrap

**Als** Nutzer des Harness
**möchte ich**, dass ein frisch angelegter Worktree automatisch build-fähig gemacht wird
**damit** Build/Test im Worktree grün laufen, ohne dass ich manuell installiere.

## Beschreibung

Ein frischer `git worktree add`-Checkout enthält nur getrackte Dateien — Gitignoriertes
(`node_modules`, `.env`, `appsettings.*.local.json`) fehlt (D7):

- **Konditional nach `touches`:** Feature berührt Frontend → `npm ci` im Frontend-Pfad des Worktrees
  (warmer Cache); **Backend-only → `npm` überspringen**. `dotnet restore` läuft ohnehin beim Build.
- **Optionale Config-Kopier-Liste** für gitignorierte Pflichtdateien — Default leer, pro Projekt befüllbar.
- Nur bei **frischem** Worktree; bestehender Worktree (Story 2–4) → kein Re-Bootstrap.

## INVEST
Erfüllt. Unabhängig testbar; klar abgegrenzt (nur der Bootstrap-Schritt im Implementation-Flow).

## Akzeptanzkriterien

<!-- rd:ac:start -->
`Bootstrap_FrischerWorktreeMitFrontendTouch_FuehrtNpmCiAus`
- Arrange: frischer Worktree; Story-`touches` enthält Frontend-Bereich
- Act: Bootstrap-Schritt vor erstem Build
- Assert: `npm ci` im Frontend-Verzeichnis des Worktrees ausgeführt
Status: umgesetzt (dokumentiert in flows/implementation-flow.md → Worktree-Bootstrap)

`Bootstrap_BackendOnlyFeature_UeberspringtNpm`   (Abgrenzung)
- Arrange: frischer Worktree; `touches` nur Backend
- Act: Bootstrap-Schritt
- Assert: kein `npm ci`; nur .NET-Pfad wird vorbereitet
Status: umgesetzt (dokumentiert in flows/implementation-flow.md → Worktree-Bootstrap)

`Bootstrap_BestehenderWorktree_KeinReBootstrap`   (Negativ)
- Arrange: Worktree existiert bereits inkl. `node_modules`
- Act: zweite Story desselben Features
- Assert: kein erneutes `npm ci`
Status: umgesetzt (dokumentiert in flows/implementation-flow.md → Worktree-Bootstrap)

`Bootstrap_ConfigKopierListeGesetzt_KopiertPflichtdateien`
- Arrange: Config-Liste enthält `appsettings.Development.json`; frischer Worktree
- Act: Bootstrap-Schritt
- Assert: Datei aus Haupt-Checkout in den Worktree kopiert
Status: umgesetzt (dokumentiert in flows/implementation-flow.md → Worktree-Bootstrap)
<!-- rd:ac:end -->

## Annahmen / Offene Punkte
- Config-Kopier-Liste braucht ein Konfig-Zuhause → **entschieden bei Umsetzung:** wird in der
  projekteigenen `CLAUDE.md` deklariert (selber Projekt-Map-Abschnitt wie `<repo-dir>`), Default leer
  wenn Block fehlt. Alternative (eigene Referenzdatei unter `.claude/references/`) verworfen zugunsten
  einer einzigen Projekt-Fundstelle.
