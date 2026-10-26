---
name: spec-whiteboarding-with-docs
description: Use when a request should be grilled into a dv-forge spec.md that is anchored in the existing system — code, git history, glossary, module and feature profiles — while the project glossary is actively challenged and updated alongside. Gilt als intern und ist Teil der Session-Kette; Start nur über /dv-forge:session-orchestrator.
---

# Spec Whiteboarding mit Bestand

Verbund aus zwei Skills: Lade jetzt über das Skill-Tool zuerst `dv-forge:spec-whiteboarding`, dann `dv-forge:domain-modeling`. Beide gelten vollständig. Wo sie kollidieren, gelten diese Vorrangregeln:

1. **Bestand:** Grundhaltung 1 und die Red Flag „Ich schau kurz im Code nach“ des Whiteboardings gelten hier nicht. Fakten aus Code, Git, Glossar, Profilen und Historie suchst du selbst, bevor du fragst: zuerst mit den Werkzeugen aus `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-config.js" get Suche`, dann mit der normalen Suche. Such-Agents nur mit `model: sonnet` und fester Rückgabe: Datei:Zeile, Rolle. Die Feature-Profile der betroffenen Bildschirme liest du vollständig und hältst Code-Aussagen dagegen. Gelesen wird nur der aktuelle Branch-Stand; was dort fehlt, gilt als nicht vorhanden.
2. **Belege:** Zusätzlich gelten `Git` (Code-Stand und Commits des Branches) und `Historie` (Glossar, Profile, ADRs). Die Spec bekommt `Art: verankert`.
3. **Sperre:** Schreiben ins Glossar-Ziel und ADRs ist trotz Sperre erlaubt. Die Sperre gilt nur für brainstorming, Plan und Code.
4. **Begriffe:** Die Spec verwendet ausschließlich die kanonischen Begriffe des Glossars. Ein verworfenes Synonym steht höchstens in dem W-Eintrag, der den Begriff festlegt. Weicht ein Wort des Menschen ab, steht vor den Fragen der Runde die Zeile `Begriffe: <Wort des Menschen> → <Glossar-Begriff>`.
5. **Runden:** Die Glossar-Arbeit ersetzt keine Runde. Ein Begriffskonflikt wird als Frage in die laufende Frontier aufgenommen, im Rundenformat des Whiteboardings.
6. **Selbstcheck:** Vor dem Entwurf prüfst du jede Soll-Vorgabe mit „exakt“, „immer“, „nie“ gegen alle ACs; schließt ein AC aus, was die Vorgabe verlangt, wird das eine Frage der Runde. Nach dem Schreiben gilt `spec-lint.js` wie im Whiteboarding.

## Welche Referenz wann
`<R>` = `${CLAUDE_PLUGIN_ROOT}/skills`

| Schritt | Lesen |
|---|---|
| Start | `<R>/domain-modeling/references/glossary-target.md` |
| Begriff schreiben | `<R>/domain-modeling/references/context-format.md` |
| ADR erwägen | `<R>/domain-modeling/references/adr-format.md` |
| Runden, Spec schreiben | aus `<R>/spec-whiteboarding/references/`: `grill-rounds.md`, `ac-rules.md`, `spec-format.md` |
