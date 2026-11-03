# Einordnen: welcher Baustein, oder mehrere?

Eine neue Anforderung kommt fast nie als fertiger Baustein. Du zerlegst sie, bevor du schreibst. Geh die Fragen der Reihe nach durch; jede Frage, die mit Ja endet, ergibt einen Teil. Mehrere Ja heißen: aufteilen.

## Die Fragen

1. **Ist es ein Begriff, der unklar oder mehrdeutig verwendet wird?** → Wörterbuch-Eintrag; verbotene Synonyme unter `avoid`.
2. **Ist es eine Aussage, die gelten soll, sich prüfen lässt und eine Begründung hat?** („Reviewer ändern nichts“, „Commits nur mit Pfaden“) → **Regel** mit ID, Warum und Durchsetzung.
   - Gilt sie in mehreren Plugins? → Kern (`src/rules/`). Nur in einem? → `rules:` im Bestellschein mit `applies_to`.
   - Gehört sie zu einer Gruppe von Regeln, die als Datei zur Laufzeit gelesen wird? → Regeldatei.
3. **Muss sie mechanisch erzwungen werden, auch wenn ein Modell sie übersieht?** → zusätzlich **Hook** und Skript-Asset; die Regel bekommt `enforce: hook` und `enforced_by`. Prüft ein Skript sie nur, ohne zu blockieren: `enforce: script`.
4. **Ist es ein Arbeitsschritt mit Eingang, Ergebnis und Fertig-Kriterium?** → **Etappe**. Gehört er in eine Kette, die ein Leit-Skill startet: Eintrag in `etappen.yaml`.
5. **Ist es eine Anweisung für eine Situation, die Claude oder der Mensch auslöst?** → **Skill**.
   - Tippt nur der Mensch sie (Freigaben, Auslieferung)? → `model_invocation: disabled`.
   - Startet sie ein anderer Skill? → `role: intern`. Ist sie der Einstieg? → `role: startbefehl`.
   - Beispiele, lange Tabellen, Hintergrund → **Beiblatt** daneben.
6. **Braucht es einen frischen Blick, eingeschränkte Werkzeuge oder Parallelität?** → **Agent**. Ein Prüfer bekommt kein Edit.
7. **Ist es eine Kurzwahl, die der Mensch tippt, ohne dass ein Skill nötig ist?** → **Befehl**.
8. **Muss derselbe Text wortgleich an mehreren Stellen stehen, ohne eigene Begründung?** (Ausgabeformat, Kategorien-Liste) → **Textbaustein**. Hat er eine Begründung, ist er eine Regel (Frage 2).
9. **Lesen mehrere Skills den Text zur Laufzeit?** → **geteilte Datei**.
10. **Ist es Code, ein Test oder Testmaterial?** → **Asset**.

## Aufteilen

Teile auf, sobald eines davon zutrifft:
- **Zwei Aussagen in einem Satz** mit „und“, die sich einzeln prüfen lassen → zwei Regeln.
- **Verschiedene Durchsetzung:** Ein Teil steht nur im Text, ein anderer braucht einen Sensor → zwei Regeln.
- **Verschiedener Geltungsbereich:** Ein Teil gilt überall, ein anderer nur in einem Plugin → Kernregel und Plugin-Regel.
- **Regel plus Ablauf:** „Nach dem Review prüft ein Skript X, sonst Stopp“ → Regel (was gilt, warum), Etappe oder Skill-Schritt (wann), Hook oder Skript (wie erzwungen).
- **Skill über 500 Zeilen** oder mit langen Beispielen → Beiblätter abtrennen; wiederholter Text → Textbaustein.
- **Agent mit zwei Prüfaufträgen**, die getrennt ablehnen könnten → zwei Agents.

## Beispiele

| Anforderung | Teile |
|---|---|
| „Reviewer dürfen nichts ändern, weil sonst niemand das Ergebnis nachvollzieht.“ | Regel (Kern, `enforce: text`) · im Deckblatt jedes Prüfers `tools` ohne Edit |
| „Nie in dist/ schreiben; das soll hart verhindert werden.“ | Regel (`enforce: hook`, `enforced_by: scripts/wache.js`) · Hook `PreToolUse` · Skript als Asset |
| „Alle Fragen einer Runde zusammen stellen, mit Empfehlung.“ | Regel (Warum: Der Mensch antwortet einmal) · Textbaustein mit dem Format je Frage, eingesetzt in jedem fragenden Skill |
| „Ein neuer Prüfschritt nach dem Plan, mit eigenem Bericht.“ | Etappe (Eingang: Plan, Ergebnis: Bericht, Gate) · Agent · Regeln, die die Etappe nennt |
| „Das Wort ‚Phase‘ soll nicht mehr vorkommen, es heißt ‚Etappe‘.“ | Wörterbuch: `avoid: [Phase]` beim Begriff Etappe; der Druck meldet jede Stelle |

## Vorlegen

Bevor du schreibst, legst du das Ergebnis in einer Zeile je Teil vor, mit Ort und neuer ID, und fragst einmal nach. Ist die Zuordnung eindeutig und belegt, sagst du das und schreibst nach Freigabe.
