# angular-testing-jest-conventions — Autoren-Modus (`improve-skill`)

Ablauf, wenn du diesen Skill verbessern willst — neue Regel, Korrektur, Klarstellung.

## Schritt 1 — Triage: Wohin gehört die Verbesserung?
| Die Verbesserung ist … | Ziel | Wie |
|---|---|---|
| Portable Konvention / Naming / Struktur | **Skill-Body** (`SKILL.md`/`references`/`templates`) | projekt-agnostisch, tabellarisch |
| Regel, die Subagenten befolgen müssen | **`op-using-skill.md`-Marker-Block-Template** | generisch, füttert nächsten Bootstrap |
| Portable Erinnerung / Persistenz | **`op-using-skill.md`-Memory-Template** | Memory-Format, generisch |
| Projektspezifisch | **NICHT** in den Skill → Projekt-`CLAUDE.md` / Memory | — |

## Schritt 2 — Portabilitäts-Gate (Pflicht vor jedem Schreiben)
Scanne den geplanten Text auf: Projektnamen (Firmen-/Produktnamen), Absolutpfade (Windows/Unix),
Ports/lokale Adressen, konkrete Framework-/Paketversionen eines Projekts, Lizenz-/Build-Lock-Spezifika.
**Treffer → generalisieren** (`<Projektpfad>\...`, `<Project>`) **oder umleiten** (Projekt-`CLAUDE.md`/Memory).
Erst nach erfolgtem Gate schreiben.

## Schritt 3 — Ausführen je Ziel
### Ziel 1 — Skill-Body
Portabilitäts-Gate durchlaufen. In `SKILL.md`/`references`/`templates` editieren: neue Regel als
Tabellenzeile oder knappe „Statt X → nimm Y"-Formulierung — kein Projektbezug. Betrifft die Regel
auch Subagenten → zusätzlich Ziel 2.

### Ziel 2 — Subagenten-Regel (im `op-using-skill.md`-Marker-Block-Template)
Portabilitäts-Gate durchlaufen. Den Block-Inhalt (Schritt 2 von `op-using-skill.md`) generisch
ergänzen. **Closed Loop:** Beim nächsten `bootstrap`-Run propagiert die Regel automatisch in jedes
Projekt — kein manuelles Nachpflegen einzelner Projekt-`CLAUDE.md`.

### Ziel 3 — Memory-Template
Neues portables, dauerhaft nützliches Wissen als Memory-Template in `op-using-skill.md` (Schritt 4/5-Format)
aufnehmen, damit der nächste Bootstrap es anlegt.

**Kein Server-Ticket-Ziel** (kein Server hinter einem Konventions-Skill). Framework-/Tooling-Grenzen
sind projektspezifisch → Umleitung nach Projekt-`CLAUDE.md`/Memory.
