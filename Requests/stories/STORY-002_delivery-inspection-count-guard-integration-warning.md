---
id: STORY-002
type: story
status: implemented
slug: delivery-inspection-count-guard-integration-warning
---

# STORY-002 — SKILL.md: Count-Guard in Schritt 1 + Routing-Constraint in Integration-Sektion

Als AI-Workflow-Entwickler möchte ich, dass `delivery-inspection/SKILL.md` in Schritt 1 einen expliziten N=6 Count-Guard enthält und die Integration-Sektion den Routing-Constraint (Notifications gehen an Main-Thread) mit STORY-031-Referenz dokumentiert, damit DI weder mit Partial-Completion abschließt noch der Orchestrator über den Constraint im Dunkeln bleibt.

## Kontext

SKILL.md Schritt 1 sagt bereits "Alle 6 Reports abwarten" — aber kein expliziter Count-Guard verhindert Partial-Completion. Die Integration-Sektion (Zeilen 185–190) enthält keinen einzigen Treffer für "foreground/background/Notification/STORY-031". Entscheidung (grill-me Option C): Guard in Schritt 1 (actionable) + vollständige Erklärung in Integration-Sektion.

## Scope (drin / bewusst nicht drin)

**Drin:**
- Schritt 1: Guard-Zeile "erhalten: N/6 — nicht weiter bevor N=6" vor Klassifikations-Schritt
- Schritt 1: Hinweis "konsolidierten Einzel-Report zurückgeben"
- Integration-Sektion: Routing-Constraint + STORY-031 + Foreground-Hinweis

**Nicht drin:**
- Änderungen am Review-Loop-Ablauf oder den Reviewer-Rollen
- Standalone-Nutzungs-Overhead (keine Top-Level-WARNING)

## INVEST

- **I** — unabhängig von STORY-001/003/004
- **N** — Count-Guard ist Pflicht-Check vor Klassifikation, keine Empfehlung
- **V** — zwei Ergänzungen in einer Datei, sofort prüfbar
- **E** — 2 Stellen, < 15 Zeilen Ergänzung insgesamt
- **T** — testbar per Datei-Read beider Abschnitte

<!-- rd:ac:start -->
`DeliveryInspectionSkill_Schritt1_CountGuard_VorKlassifikation`
- Arrange: `.claude/skills/delivery-inspection/SKILL.md`, Schritt 1 — "6 Reviewer parallel"
- Act: Schritt 1 lesen, insbesondere den Abschluss-Satz vor Schritt 2
- Assert: Expliziter Guard vorhanden: "erhalten: N/6 — nicht weiter bevor N=6"; Hinweis auf konsolidierten Rückgabe-Report
Status: implemented

`DeliveryInspectionSkill_IntegrationSektion_RoutingConstraint_MitStory031`
- Arrange: SKILL.md, Abschnitt "Integration mit feature-delivery" (ab Zeile 185)
- Act: Abschnitt lesen
- Assert: Routing-Constraint dokumentiert ("Notifications gehen an Main-Thread, nicht zurück an Orchestrator"); STORY-031-Referenz; Foreground-Mandat erwähnt
Status: implemented

`DeliveryInspectionSkill_StandaloneNutzung_KeinTopLevelOverhead`
- Arrange: SKILL.md, erster sichtbarer Abschnitt (Reviewer-Rollen, Ablauf)
- Act: Top-Level lesen
- Assert: Kein WARNING-Block im Haupt-Ablauf sichtbar — Standalone-Nutzer sieht keine Routing-Verwirrung
Status: implemented

`DeliveryInspectionSkill_OhneCountGuard_PartialCompletionUnbemerkt` (Negativ)
- Arrange: SKILL.md ohne Guard (alter Zustand), 4 von 6 Reviewer abgeschlossen
- Act: DI-Ablauf nach Schritt 1
- Assert: Kein Stopp — Klassifikation startet mit unvollständigem Report-Set; Partial-Completion als Complete behandelt
Status: implemented
<!-- rd:ac:end -->
