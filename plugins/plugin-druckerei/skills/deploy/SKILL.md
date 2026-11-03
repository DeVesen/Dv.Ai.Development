---
name: deploy
description: Use when a Plugin-Druckerei project should be delivered as a final plugin with a new version - only after the human asks for it. Runs the try-deploy first and stops if anything is red, then raises the version, prints into dist/ and checks the printed plugin again.
argument-hint: "[patch|minor|major] [plugin]"
disable-model-invocation: true
---

# Deploy

Liefert ein Plugin des Projekts mit neuer Version aus: nach `dist/`. Nur wenn der Try-Deploy grün ist. Commit und Push sind eigene Freigaben des Menschen.

## Ablauf
1. **Plugin:** das zweite Argument, sonst das einzige Plugin des Projekts. Hat das Projekt mehrere und kein Argument nennt eines, fragst du einmal, mit `druckerei status` als Liste.
2. **Stufe:** das erste Argument. Fehlt es, empfiehlst du eine und fragst einmal:
   - `major`: ein Skill, Agent oder Befehl entfällt oder heißt anders, oder bestehendes Verhalten ändert sich so, dass Nutzer etwas anders machen müssen.
   - `minor`: neue Skills, Agents, Regeln oder Fähigkeiten, Bestehendes bleibt nutzbar.
   - `patch`: Korrekturen, Texte, Begründungen, Tests.
   Grundlage der Empfehlung sind die Änderungen seit dem letzten Deploy (`git diff` der Quellen, `CHANGES.yaml`).
3. `druckerei deploy --stufe <stufe> --plugin <plugin>`. Der Befehl
   1. führt den Try-Deploy aus und bricht bei Rot ab,
   2. erhöht die Version im Bestellschein (bei Plugins mit Änderungsprotokoll samt Eintrag für `plugin.json`),
   3. druckt nach `dist/`,
   4. prüft das gedruckte Plugin mit TÜV und Tests und nimmt bei Rot alles zurück (Version und `dist/` wie vorher).
4. **Ergebnis:** eine Zeile `Deploy: <plugin> <alt> → <neu>` oder die Ursache des Abbruchs mit den Problemen wie beim Try-Deploy.
5. **Danach:** Biete den Commit an (Bestellschein, Änderungsprotokoll, `dist/`), mit einer Nachricht nach der Commit-Konvention des Projekts. Du committest erst nach Ja und pushst nie ohne ausdrückliche Freigabe.

## Rote Flaggen
| Gedanke | Richtig |
|---|---|
| „Try-Deploy rot, aber nur Kleinigkeiten.“ | Kein Deploy; erst beheben (Skill `try-deploy`). |
| „Version erhöhe ich schnell selbst.“ | Nur `druckerei deploy`. |
| „Deploy ist durch, ich pushe gleich mit.“ | Commit und Push sind eigene Freigaben. |
