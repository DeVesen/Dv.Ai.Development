---
name: work-review
description: "Automatischer Qualitäts-Review sobald ein Deliverable fertiggestellt wurde — Skill-Paket, Dokumentation, PDF, PPTX, Analyse, Recherche-Ergebnis oder Markdown-Dokument. Beauftragt vier parallele Reviewer-Perspektiven: Pessimist (fehlende Details), Strenger Lehrer (fachliche Fehler), Normalo (Vollständigkeit & Pragmatik), Professor (gründlichste Tiefenanalyse auf Doktorarbeit-Niveau). Fixes danach direkt anwenden. Opt-out: kein-review, no-review, skip-review."
---

Trigger: Immer wenn ein Deliverable abgeschlossen wurde — Skill erstellt, SKILL.md angelegt, Referenz-Dokumentation fertig, PDF/PPTX/Markdown erstellt, Recherche-Paket fertig, Bericht abgeschlossen. Nicht bei einzelnen Code-Fixes, kleinen Edits oder interaktiven Gesprächen.

Ablauf:

Vier Reviewer-Sub-Agents parallel beauftragen — alle unabhängig, alle gleichzeitig
Alle vier Reports abwarten
Kritische Findings sofort direkt fixen
Abschlussbericht: was wurde gefixed, was bleibt offen

Die vier Reviewer-Rollen:

Pessimist — findet jeden vergessenen I-Punkt. Prüft Vollständigkeit (fehlt ein Feature, Abschnitt, Beispiel?), Tiefe (wo ist die Doku zu dünn?), Querverweise, Edge Cases, ob ein Nutzer das Dokument über erwartete Suchbegriffe findet. Liefert Top-3-Ranking der schlimmsten Lücken.

Strenger Lehrer — sucht aktiv nach Fehlern und will sie finden. Prüft fachliche Korrektheit (Fakten, API-Signaturen, Syntax, Versionsnummern), veraltete Information, Widersprüche im Dokument, irreführende Aussagen, fehlerhafte Code-Beispiele. Rangliste nach potenziellem Schaden.

Normalo — pragmatische Nutzerperspektive. Prüft ob man den Output direkt produktiv einsetzen kann, einheitliche Formatierung, logische Struktur, Alltagstauglichkeit. Gesamtbewertung + Top-3 konkrete Handlungsempfehlungen.

Professor — der gründlichste und strengste Reviewer. Behandelt jedes Deliverable wie eine Doktorarbeit: prüft wissenschaftliche Präzision, Beweisführung und Nachvollziehbarkeit jeder Aussage, Konsistenz der Terminologie, Vollständigkeit der Quellenangaben und Begründungen, logische Stringenz des Gesamtaufbaus sowie ob jede Behauptung entweder belegt oder klar als Annahme gekennzeichnet ist. Vergibt eine Gesamtnote (1–5) mit ausführlicher Begründung und liefert eine priorisierte Liste aller Mängel — von schwerwiegend bis stilistisch — die einer Verteidigung vor einem Fachgremium standhalten müsste.
