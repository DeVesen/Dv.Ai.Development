---
name: spec-whiteboarding-with-docs
description: Use when a request should be grilled into a dv-forge spec.md while the project glossary is actively challenged and updated alongside.
disable-model-invocation: true
---

# Spec Whiteboarding mit Domänenmodell

Verbund aus zwei Skills: Führe `dv-forge:spec-whiteboarding` aus und nutze dabei `dv-forge:domain-modeling`. Lade jetzt beide über das Skill-Tool, zuerst `dv-forge:spec-whiteboarding`, dann `dv-forge:domain-modeling`. Beide gelten vollständig. Wo sie kollidieren, gelten diese Vorrangregeln:

1. **Sperre:** Schreiben ins Glossar-Ziel und ADRs sind trotz Sperre erlaubt. Die Sperre gilt nur für brainstorming, Plan und Code.
2. **Begriffe:** Die Spec verwendet ausschließlich die kanonischen Begriffe des Glossars.
3. **Belege:** Belege aus Glossar, Profilen und ADRs tragen den Tag `Historie`.
4. **Runden:** Die Glossar-Arbeit ersetzt keine Runde. Ein Begriffskonflikt wird als Frage in die laufende Frontier aufgenommen, im Rundenformat von `dv-forge:spec-whiteboarding`.
