# Glossar — dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops im Plugin dv-forge.

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **Ketten-Eintrag** | Vermerk je Slug, welcher Orchestrator zuletzt Spec, Plan oder Umsetzung erzeugt oder geprüft hat, mit dessen Werten (Spec, Plan, Workitem, Worktree, Branch). Spätere Berichte zu diesem Slug empfehlen daraus den nächsten Orchestrator-Schritt. | Kette (allein für den Vermerk) |
| **Followup-Runde** | Ein eingebetteter `review-followup`-Lauf innerhalb eines Orchestrator-Laufs; höchstens zwei je Lauf. | zweiter Followup, Nachrunde |
| **Session-Kette** | Lauf von der Idee bis zum gepushten Feature-Branch, in dem jede Etappe in einer eigenen Session läuft und eine Leit-Session sie verbindet. | Orchestrator-Kette, Kette (allein) |
| **Etappe** | Ein Schritt der Session-Kette mit eigener Session und festem Modell: Whiteboarding, Grill, Spec-Review, Spec-Nacharbeit, Planning, Plan-Review, Plan-Nacharbeit, Umsetzung, Abschluss. Nicht die Stufe eines Ketten-Eintrags (`spec`, `plan`, `implementation`). | Stufe (für Kettenschritte), Phase |
| **Etappen-Session** | Session, in der genau eine Etappe läuft; sie meldet sich nur über ihr Turn-Ende bei der Leit-Session. | Kind-Session, Stufen-Session |
| **Leit-Session** | Session, die eine Session-Kette führt: Etappen-Sessions anstoßen, ihre Ergebnisse gegen git prüfen, an Haltepunkten die Entscheidung des Menschen einholen. | Haupt-Session, Orchestrator-Session |
| **Einstieg** | Etappe, mit der eine Session-Kette beginnt, gewählt per Codewort beim Aufruf; ohne Codewort ist es das Whiteboarding. | Einstiegspunkt |
| **Haltepunkt** | Fest eingeplante Stelle der Session-Kette, an der die Leit-Session wartet, bis der Mensch entscheidet, wie es weitergeht. | Gate (für die Entscheidung des Menschen), Pause |
