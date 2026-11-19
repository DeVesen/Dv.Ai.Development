# So spricht Sven — Profil-Entwurf (Sammlung, noch kein Skill)

Stand: 2026-11-19. Quelle: Nachrichten aus ca. 35 von über 100 Sessions (Juli bis November 2026), meist Ausschnitte. Rechtschreibfehler sind bewusst nicht Teil des Profils.

## 1. Grundton

- Kurz, direkt, entscheidungsorientiert. Normalfall: ein Satz oder weniger.
- Sachlich-locker, kein Smalltalk, keine Höflichkeitsfloskeln.
- Duzt. Spricht Claude wie einen Kollegen an, der mitdenkt.
- Hat selbst gesagt: „Ich kann nicht mit langen Texten umgehen. Also kurz auf den Punkt."

## 2. Nachrichtentypen

| Typ | Beispiele | Erwartung an Claude |
|---|---|---|
| Entscheidung | „Option B", „Ja, einarbeiten", „passt für mich", „Beides ja", „A, Aura als Placeholder" | Sofort umsetzen, nicht nachhaken |
| Kurzauftrag | „Pr erstellen", „mach den PR auf", „ja pushe es", „status auf reviewed" | Ausführen, Ergebnis in einer Zeile melden |
| Verständnis-Check | „Richtig?", „Habe ich etwas vergessen oder zu viel gesagt?", „geht sowas?", „du hast alles geprüft?" | Ehrlich bestätigen oder korrigieren, klar ja/nein vorweg |
| Ideenfrage | „Was gäbe es hier noch zu klären?", „Was empfiehlst du?", „zeige mir deine Ideen" | Empfehlung nennen, nicht alle Optionen aufzählen |
| Arbeitsauftrag mit Constraints | nummerierte Punkte, „max. 4 SubAgents", „ohne Verweis auf X" | Constraints wörtlich einhalten |
| Fachablauf-Erzählung | lange, gesprochene Beschreibung eines Ablaufs | Erst in 2–3 Sätzen zurückspiegeln, dann arbeiten |

## 3. Denkweise

- **Prozess vor Produkt.** Denkt gern auf Meta-Ebene: Orchestrator, Reviewer, Skills, Modellstufen, Kosten. Ziel ist Autonomie („Session vor dem Schlafen starten, die arbeitet ab").
- **Übergabefähigkeit.** Artefakte sollen für einen anderen Agenten ohne Kontext funktionieren („kein Zugriff auf Serena oder dieses Repo, trotzdem alles umsetzbar"). Zusammenfassungen „für einen anderen Agenten" sind häufig.
- **Prinzipien:** YAGNI, DRY, „kritisch, aber nicht übertreiben", lieber verschlanken als erweitern. Fragt aktiv, was zu viel ist.
- **Eigenes vor Fremdem.** Misstraut fremder Software, bevorzugt eigene Werkzeuge; fragt nach Aufwand und Nutzen, bevor er etwas übernimmt.
- **Vollständigkeit auf einmal.** Will fertige Ergebnisse am Stück („den kompletten Prompt in einem Stück"), nicht Häppchen über viele Runden.
- **Visuelles Denken.** Bittet um ASCII-Darstellungen, Beispiele am konkreten Fall („zeige es erst am BAS-Beispiel").
- **Git-Pragmatik.** Kurze Kommandos („committe", „pushe", „welcher Branch?"), PR nur auf Zuruf.

## 4. Sprache und Form

- Deutsch mit englischen Fachbegriffen, eingedeutscht: committen, pushen, reviewen, fixen, Skill, Branch, PR, Epic, Story, Spec.
- Zusammengesetzte Bezeichner mit Großbuchstaben: HauptApp, SubAgents, WeiterBtn, ENTER-Liste.
- Slash-Befehle direkt in der Nachricht: `/clarify-before-creating`, `/suite-fachgespraech Annahme`.
- Pfade und Namen in Anführungszeichen.
- Wenig Satzzeichen, Gedankenstriche und „…" als Pausen; nummerierte Listen nur bei echten Aufträgen.
- Ausrufezeichen sehr selten, nur für harte Anforderungen („Alles muss enthalten sein!").

## 5. Was Claude daraus ableitet

1. Antwort kurz: Ergebnis oder Empfehlung zuerst, Begründung höchstens ein bis zwei Sätze.
2. Bei Entscheidungsfragen genau eine Empfehlung, Alternativen nur auf Nachfrage.
3. Kurze Zustimmung („Ja", „passt", „Option B") ist eine Freigabe — ausführen, nicht erneut bestätigen lassen.
4. Lange, erzählende Nachricht: zuerst in wenigen Sätzen zurückspiegeln, Unklarheiten benennen, dann loslegen.
5. Constraints wörtlich nehmen und im Ergebnis sichtbar abhaken.
6. Nicht aufblähen: Nichts hinzufügen, was nicht gefragt wurde (YAGNI).
7. Eigene, kleine Lösungen vorschlagen, bevor Fremdsoftware ins Spiel kommt.
8. Fachbegriffe englisch lassen, Fließtext deutsch.
9. Rechtschreibung des Nutzers nie übernehmen oder kommentieren.

## 6. Offene Punkte (vor dem Skill)

- Wunsch von Sven steht noch aus.
- Lücken: Erstprompts vieler Sessions nicht gelesen; Sessions vor Juli nicht betrachtet.
