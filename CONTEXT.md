# Glossar — dv-forge

Spezifizieren, Planen und Umsetzen mit orchestrierten Review-Loops im Plugin dv-forge.

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **Ketten-Eintrag** | Vermerk je Slug, welcher Orchestrator zuletzt Spec, Plan oder Umsetzung erzeugt oder geprüft hat, mit dessen Werten (Spec, Plan, Workitem, Worktree, Branch). Spätere Berichte zu diesem Slug empfehlen daraus den nächsten Orchestrator-Schritt. | Kette (allein für den Vermerk) |
| **Followup-Runde** | Ein `review-followup`-Lauf innerhalb einer Review-Schleife oder eines Orchestrator-Laufs; höchstens zwei je Lauf. | zweiter Followup, Nachrunde |
| **Review-Schleife** | Ablauf einer Review-Etappe (Spec-Review, Plan-Review): ein Review, danach so viele Followup-Runden, wie das Review anbietet, höchstens zwei, bis zum Ende der Etappe. | Zwischenebene, Review-Loop, Review-Lauf |
| **Session-Kette** | Lauf von der Idee bis zum gepushten Feature-Branch, in dem jede Etappe in einer eigenen Session läuft und eine Leit-Session sie verbindet. | Orchestrator-Kette, Kette (allein) |
| **Ketten-Stand** | Einziger dauerhafter Stand einer Session-Kette je Slug: Etappen mit Ergebnis, Hashes und Commits, offene Punkte, Haltepunkt und Freigabe, Ablage der Etappen-Fakten. Die Leit-Session schreibt ihn; er löst den Ketten-Eintrag ab. | Kette (allein), Zustand, Session-Kette-Stand |
| **Etappe** | Ein Schritt der Session-Kette mit eigener Session und festem Modell: Whiteboarding, Grill, Spec-Review, Spec-Nacharbeit, Planning, Plan-Review, Plan-Nacharbeit, Umsetzung, Abschluss. Nicht die Stufe eines Ketten-Eintrags (`spec`, `plan`, `implementation`). | Stufe (für Kettenschritte), Phase |
| **Etappen-Session** | Session, in der genau eine Etappe läuft; sie meldet sich über ihr Turn-Ende bei der Leit-Session, ein `final` zusätzlich per Nachricht an die Leit-Session. | Kind-Session, Stufen-Session |
| **Leit-Session** | Session, die eine Session-Kette führt: Etappen-Sessions anstoßen, ihre Ergebnisse gegen git prüfen, an Haltepunkten die Entscheidung des Menschen einholen. | Haupt-Session, Orchestrator-Session |
| **Einstieg** | Etappe, mit der eine Session-Kette beginnt, gewählt per Codewort beim Aufruf; ohne Codewort ist es das Whiteboarding. | Einstiegspunkt |
| **Startbefehl** | Der Befehl `/dv-forge:session-orchestrator`, mit dem ein Mensch dv-forge betritt; der einzige Befehl für die Kette, auch mit fertiger Spec oder fertigem Plan. | Einstieg (für den Befehl) |
| **Unter-Skill** | Skill, den nur eine Etappe oder die Leit-Session startet. Von Hand getippt wird er ohne Debug-Schalter abgelehnt. Werkzeuge ohne Etappe (`init`, `commit-message`, `domain-modeling`, `merge-conflict-resolution`) sind keine Unter-Skills. | interner Skill, Stufen-Skill |
| **Debug-Schalter** | Argument `--debug`, mit dem ein Mensch einen Unter-Skill von Hand startet; der Lauf entspricht dem Normallauf, ohne Garantie für den Normalweg. | Notausgang-Flag |
| **Haltepunkt** | Fest eingeplante Stelle der Session-Kette, an der die Leit-Session wartet, bis der Mensch entscheidet, wie es weitergeht. | Gate (für die Entscheidung des Menschen), Pause |
