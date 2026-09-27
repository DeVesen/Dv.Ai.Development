# Spec aufteilen

Sagt der Mensch „trenn das auf“ oder etwas Gleichwertiges, zerlegst du das Vorhaben in mehrere Specs.

1. **Schnitt vorschlagen:** welche Teile es gibt, was im aktuellen Teil bleibt und welche W-Einträge zu welchem Teil gehören. Eine Nachricht, eine Bestätigung.
2. **Aktueller Teil:** Die Runden laufen mit dem verbleibenden Umfang weiter wie bisher.
3. **Abgetrennte Teile:** Je Teil schreibst du sofort eine eigene Datei am Zielpfad aus `Spec-Ablage`, mit eigenem Slug. Sie folgt `spec-format.md`, mit zwei Unterschieden:
   - Status-Zeile `Status: abgetrennt aus <slug des Ursprungs> am <YYYY-MM-DD>, Whiteboarding offen`
   - Abschnitte enthalten nur, was schon geklärt ist, mit seinen Tags. Die zugehörigen W-Einträge ziehen mit um. Ein Abschnitt ohne Inhalt bleibt als Überschrift stehen.
4. **Übergabe ergänzen:** je abgetrenntem Teil Pfad und der Hinweis, ihn später mit `/dv-forge:spec-whiteboarding <pfad>` weiterzuführen.

Eine abgetrennte Spec ist kein Review-Kandidat. Wird das Whiteboarding mit ihrem Pfad gestartet, ist ihr Inhalt der Start-Stand: geklärte Punkte bleiben, die Frontier beginnt bei allem Übrigen.
