# dv-kickoff

Projekt-Kickoff für Projektleitung und Architektur: vom vagen Projektstart zu einem gemeinsamen Basisbild, das Menschen und Agenten gleichermaßen lesen können.

## Skills

| Skill | Rolle | Wofür |
|---|---|---|
| `kickoff-init` | beide | Ablageort der Ergebnisdateien und Dokumentsprache festlegen; schreibt den Block `Kickoff` in die Projekt-`CLAUDE.md` |
| `project-brief` | Projektleitung | Rahmen festhalten: Ziel, Umfang, erwartete Last, Budget, Team, Cloud-Ziel, Pipeline-Stil. Bleibt auf Business-Ebene |
| `architecture-design` | Architektur | Architektur im Gespräch klären (Stil, Technik, Schnittstellen, Struktur, Betrieb, Sicherheit und Auth); Ergebnis sind Checkliste, Konzept und Übersichtsgrafik |
| `codebase-orientation` | Entwicklung | Bestehendes Repo prüfen, mit den Architekturdokumenten abgleichen und einen kurzen `CLAUDE.md`-Block für Agenten schreiben (Quellen, Stack, Befehle, Regeln) |

Die Skills sind unabhängig voneinander: `architecture-design` braucht keinen Brief und liest stattdessen alles, was der Nutzer mitgibt (`.md`, PDF, Notizen). Ohne Unterlagen wird mehr gefragt.

## Typischer Ablauf

1. `kickoff-init` einmal pro Projekt. Ohne diesen Schritt gelten die Standardwerte.
2. `project-brief` (Projektleitung), optional.
3. `architecture-design` (Architektur).
4. `codebase-orientation`, sobald Code oder Architekturdokumente vorliegen, damit die Agenten sich zurechtfinden.

Spezifikation, Plan und Umsetzung gehören weiterhin zu `dv-forge`. Die Kickoff-Skills schreiben keine Specs und Pläne.

## Ergebnisse

Standardmäßig unter `docs/architecture/` (anpassbar über `kickoff-init`):

| Datei | Inhalt |
|---|---|
| `project-brief.md` | Rahmendaten des Projekts |
| `architecture-checklist.md` | Kurze Checkliste, ein überprüfbarer Fakt je Zeile |
| `architecture-concept.md` | Ausführliches Konzept mit Begründungen, Ordnerbäumen, Mermaid-Diagrammen und Entscheidungsprotokoll |
| `architecture-overview.svg` | Übersichtsgrafik: Verlaufsrechtecke sind Anwendungen, weiße Kästchen Module, gestrichelt ist „später vorgesehen“ |

Jede Aussage trägt einen von drei Status: **ENTSCHIEDEN** (vom Nutzer bestätigt), **ABLEITUNG** (folgt aus Entscheidungen, nicht bestätigt) oder **OFFEN**. Die Dokumente sprechen die bei `kickoff-init` gewählte Sprache, die Skills selbst sind englisch.

## Arbeitsweise

- Eine Frage pro Nachricht, immer mit Empfehlung, Begründung und Alternativen. Der Nutzer entscheidet.
- Erst lesen, dann fragen. Was Unterlagen schon beantworten, wird als ABLEITUNG zurückgespielt.
- Dateien entstehen nur auf Bitte, committet wird nie. Die `CLAUDE.md` wird erst nach Zustimmung geändert.
- Ein Befehl im `CLAUDE.md`-Block wird ausprobiert oder als „unverified“ markiert, nie geraten.

## Einrichten

```text
/plugin install dv-kickoff@dv-ai-development
```

Danach `kickoff-init` ausführen, zum Beispiel mit „Kickoff einrichten“.

## Grenzen

- Die Prüfung von Mermaid-Diagrammen braucht einen Browser mit Netzwerk oder `mmdc`. Ohne beides melden die Skills die Diagramme als nicht gerendert.
- Ein Export der Dokumente als PDF ist nicht enthalten.
- Das automatische Optimieren der Skill-Beschreibungen war mit dem mitgelieferten Werkzeug nicht aussagekräftig. Ob die Skills im Alltag von selbst anspringen, ist nicht gemessen.
