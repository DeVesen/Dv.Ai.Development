# Auslöse-Test für die Beschreibung

Die Beschreibung entscheidet, ob ein Agent den Skill überhaupt lädt. Teste sie deshalb mit Anfragen, wie echte Anwender sie schreiben.

## Anfragen sammeln

Schreibe etwa 20 Testanfragen, je zur Hälfte „soll auslösen“ und „soll nicht auslösen“:

```json
[
  { "query": "die Anfrage im Wortlaut", "should_trigger": true },
  { "query": "eine Anfrage, bei der der Skill nicht gebraucht wird", "should_trigger": false }
]
```

**Soll auslösen (8 bis 10).** Verschiedene Formulierungen derselben Absicht, förmlich und umgangssprachlich. Dazu Anfragen, die den Skill nicht beim Namen nennen, ihn aber klar brauchen. Seltene Anwendungsfälle gehören dazu, ebenso Fälle, in denen der Skill mit einem anderen konkurriert und gewinnen soll.

**Soll nicht auslösen (8 bis 10).** Die wertvollsten Negativfälle sind knappe Fehlgriffe: Anfragen, die Wörter oder Begriffe des Skills teilen, aber etwas anderes brauchen. Nahe Themen und mehrdeutige Formulierungen, bei denen ein reiner Stichwortabgleich fälschlich auslösen würde. Offensichtlich Unpassendes prüft nichts, etwa „Schreibe eine Fibonacci-Funktion“ für einen PDF-Skill.

Jede Anfrage ist konkret: Dateinamen, Spaltennamen, ein Stück Hintergrund, auch Tippfehler und Kürzel. Anfragen aus einem einzigen Schritt („lies Datei X“) lösen Skills ohnehin selten aus, weil der Agent sie allein erledigt. Nimm Aufgaben, bei denen ein Skill wirklich hilft.

## Aufteilen

Teile die Anfragen in eine Trainingsmenge (etwa 60 Prozent) und eine Testmenge (etwa 40 Prozent). Mit der Trainingsmenge verbesserst du die Beschreibung, mit der Testmenge prüfst du, ob die Verbesserung auch bei ungesehenen Anfragen wirkt. Beide Mengen enthalten Auslöser und Fehlgriffe.

## Messen

1. Stelle jede Anfrage in einer frischen Sitzung, in der der Skill mit seiner Beschreibung gelistet ist, und notiere, ob er geladen wird.
2. Stelle jede Anfrage dreimal, denn einzelne Läufe schwanken. Die Auslöse-Rate ist der Anteil der Läufe, die den Skill laden.
3. Bei „soll auslösen“ erwartest du eine hohe, bei „soll nicht auslösen“ eine niedrige Rate.

## Verbessern

1. Sieh dir die Anfragen an, bei denen die Rate falsch liegt, und formuliere die Beschreibung um: fehlende Auslöser ergänzen, Wörter streichen, die zu Fehlgriffen führen.
2. Miss Trainings- und Testmenge neu.
3. Höchstens fünf Runden. Wähle die Fassung mit der besten Rate auf der Testmenge, nicht auf der Trainingsmenge; sonst passt die Beschreibung nur auf die geübten Anfragen.

Auch beim Verbessern nennt die Beschreibung nur den Auslöser, nie den Ablauf.
