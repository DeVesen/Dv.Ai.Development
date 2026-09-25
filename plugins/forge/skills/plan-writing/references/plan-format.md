# Plan-Format

Der Plan liegt als `plan.md` im Ordner der Spec. Er hat genau diesen Aufbau:

````markdown
# <Titel> — Umsetzungsplan

> Umsetzung mit `/dv-forge:implementation <plan.md>`, Task für Task, sequentiell. Schritte nutzen Checkbox-Syntax (`- [ ]`).

**Ziel:** <ein Satz>
**Architektur:** <2–3 Sätze>
**Tech-Stack:** <Technologien>
**Spec:** <Pfad zur spec.md>

## Global Constraints
- <projektweite Vorgabe, Wert wörtlich aus der Spec>

---

### Task 1: <Komponente>

**ACs:** AC-01, AC-03

**Dateien:**
- Create: `exakter/pfad.ext`
- Modify: `exakter/pfad.ext:123-145` · `Klasse.methode`
- Test: `tests/exakter/pfad.ext`

**Interfaces:**
- Consumes: <exakte Signaturen aus früheren Tasks>
- Produces: <exakte Namen, Parameter- und Rückgabetypen für spätere Tasks>

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**
  <vollständiger Testcode>
- [ ] **Schritt 2: Test rot laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: FAIL mit „<meldung>“
- [ ] **Schritt 3: Minimal implementieren**
  <vollständiger Code>
- [ ] **Schritt 4: Test grün laufen lassen**
  Befehl: `<befehl oder Tool-Aufruf>` — erwartet: PASS
- [ ] **Schritt 5: Commit**
  `git add <dateien>` · `git commit -m "<message>"`

## Entscheidungen
- **W · <Kurztitel>** · Mensch | delegiert — <Antwort>
- **R<r> · <Stelle>** — geändert | nicht geändert | spec-rückfrage — <Begründung>
````

## Regeln

1. **Kopf:** `Ziel` ist genau ein Satz, `Architektur` zwei bis drei Sätze. `Spec` nennt den Pfad der Spec, aus der der Plan entsteht; der Umsetzer liest beide. Der Kopf nennt den Umsetzungs-Befehl `/dv-forge:implementation <plan.md>`.
2. **Global Constraints:** Jede projektweite Vorgabe der Spec — Versionsgrenzen, erlaubte Abhängigkeiten, Namens- und Textregeln, Plattformvorgaben — steht hier als eine Zeile, mit exakt den Werten aus der Spec. Jeder Task erbt diesen Abschnitt, ohne ihn zu wiederholen.
3. **Task-Überschriften** lauten exakt `### Task <n>: <Komponente>`. `<n>` ist eine ganze Zahl, lückenlos aufsteigend ab 1. Zusätze wie „Task 3a“ oder „Task 3.1“ sind verboten, denn spätere Stufen zerlegen den Plan per Skript.
4. **ACs:** Jeder Task nennt unter `**ACs:**` die AC-IDs, die er umsetzt. Jedes AC der Spec steht in mindestens einem Task.
5. **Dateien:** exakte Pfade. `Create` für neue Dateien, `Modify` für bestehende, `Test` für die Testdatei.
6. **Stabiler Anker bei `Modify`:** Nach `·` steht ein Anker, der auch dann gültig bleibt, wenn ein früherer Task dieselbe Datei ändert: ein Symbol (`Klasse.methode`, Funktionsname) oder, bei Dateien ohne Symbole, eine eindeutige Überschrift bzw. Zeichenfolge in Backticks. Maßgeblich ist der Anker; die Zeilenangabe dient nur der Orientierung.
7. **Interfaces:** Der Umsetzer eines Tasks sieht nur seinen Task. `Consumes` und `Produces` sind sein einziger Weg, Namen und Typen der Nachbar-Tasks zu kennen — deshalb exakte Funktionsnamen, Parameter- und Rückgabetypen, keine Umschreibungen.
8. **Schritte:** Jeder Code-Schritt enthält den vollständigen Code in einem Code-Block. Jeder Lauf-Schritt nennt den genauen Befehl bzw. Tool-Aufruf und die erwartete Ausgabe.
9. **Befehl oder Tool-Aufruf:** Eine Verifikation ist ein Shell-Befehl oder ein Tool-Aufruf mit exakten Parametern, z. B. dev-mcp `test_dotnet_solution` mit `test_project_path`. Maßgeblich ist die Projekt-`CLAUDE.md`: Verbietet sie einen Weg, etwa Tests über die Shell, nutzt der Plan den dort vorgeschriebenen. Ein Befehl, den der Umsetzer nicht ausführen darf, ist ein Plan-Fehler.
10. **Commit pro Task:** Der letzte Schritt jedes Tasks staged genau die Dateien des Tasks und committet.
11. **Entscheidungen:** Jede Antwort des Menschen während der Planung steht als W-Eintrag mit Tag `Mensch` oder `delegiert`. W-Einträge sind bindend. R-Einträge schreibt nur der Nacharbeiter des Plan-Reviews.
