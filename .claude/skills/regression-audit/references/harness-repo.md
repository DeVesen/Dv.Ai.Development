# Harness- / Config- / Doku-Repo — Regressions-Audit Playbook

## Anwendungsbereich

Dieses Playbook greift, wenn:
- kein klassisches Test-Tooling gefunden wurde, **oder**
- es sich um ein Harness-Repo handelt (`.claude/skills/`, `CLAUDE.md`, keine Produktivcode-Artefakte), **oder**
- es sich um ein reines Config- oder Doku-Repo handelt (Markdown, YAML, JSON).

---

## Kernmechanismus: Theoretische Verhaltens-Verifikation

Ohne ausführbare Tests lautet die Prüffrage:

> Spiegelt der heutige Zustand der Datei / des Eintrags noch den zuletzt intendierten Soll-Zustand wider?

Intent-Evolution gilt auch hier (→ `commit-intent.md`): Commits können bewusst den
Soll-Zustand ändern. Der **aktuellste Commit eines Bereichs** definiert, was heute gelten soll.

---

## Schritt 1: Geänderte Definitions-Dateien identifizieren

```bash
git log --oneline --since="N days ago" --name-only --diff-filter=ACMRD
```

Dateitypen mit Regressions-Relevanz:

| Dateityp | Regressions-Risiko |
|----------|--------------------|
| `SKILL.md` | Trigger, Opt-out, Dateinamen in ToC-Tabellen geändert? |
| `references/*.md` | Ablauf geändert ohne SKILL.md-ToC-Update? |
| `CLAUDE.md` | Verweise auf Skills / MCPs / Pfade noch aktuell? |
| `*.json` (Settings, MCP-Config) | Feld umbenannt → alle referenzierenden Stellen geprüft? |
| Prompt-Templates | Variable oder Platzhalter umbenannt → alle Verwender mitgezogen? |

---

## Schritt 2: Verhaltens-Verifikation (theoretisch, kumulativ)

Pro geändertem Bereich: Intent aus letztem Commit bestimmen (→ `commit-intent.md`),
dann aktuellen Zustand dagegen prüfen.

| Intent-Typ | Prüffrage heute |
|------------|----------------|
| Skill-Trigger geändert | Werden die neuen Trigger korrekt im Frontmatter beschrieben? Ist CLAUDE.md konsistent? |
| Ablauf in `references/*.md` geändert | Stimmt der SKILL.md-ToC noch mit den tatsächlich vorhandenen Dateien überein? |
| Config-Wert geändert | Ist der Wert heute so gesetzt wie intendiert? Kein widersprüchlicher Eintrag anderswo? |
| Doku-Abschnitt ergänzt | Ist der Abschnitt vollständig und noch aktuell vorhanden? |
| Datei umbenannt | Sind alle Referenzierenden angepasst? (Grep — siehe unten) |

---

## Schritt 3: Referenzintegrität prüfen

Für jede umbenannte oder gelöschte Datei:

```bash
# Alle Stellen finden die auf den alten Namen verweisen
grep -r "<alter-dateiname>" .
```

Für jede geänderte SKILL.md ToC-Tabelle: Links prüfen ob alle referenzierten Dateien existieren.

---

## Schritt 4: TDD-Verletzungs-Äquivalent (Skill-Drift-Signal)

Analog zum TDD-Verletzungs-Signal: Eine Definition wurde geändert, aber die
„begleitende Stelle" (Gegenstück) wurde nicht mitgezogen.

| Änderung X | Erwartetes Gegenstück Y |
|------------|------------------------|
| Neuer Skill angelegt | Eintrag in CLAUDE.md vorhanden? |
| `references/*.md` neu angelegt | Zeigt SKILL.md-ToC auf diese Datei? |
| Frontmatter-`name` geändert | Alle `@<skill-name>`-Referenzen anderswo angepasst? |
| MCP-Konfiguration geändert | Alle Skill-Dateien die diesen MCP referenzieren, konsistent? |

Fehlendes Y → gelb. Fehlendes Y bei zentralen Einstiegspunkten (CLAUDE.md, SKILL.md) → rot.

---

## Schritt 5: Test-Drift-Äquivalent (Intentionsdrift-Signal)

Wurde eine Definitions-Datei geändert, ohne dass die Änderung durch einen erkennbaren
Auslöser begründet ist (Issue, Konversation, Commit-Message-Kontext)?

→ gelb im Intentionsdrift-Abschnitt des Reports.

---

## Report-Hinweise für Harness- / Doku-Repos

- Umbenannte Dateien ohne vollständigen Grep → immer rot.
- Geänderte Frontmatter-Felder (`name`, Trigger) ohne CLAUDE.md-Konsistenzprüfung → gelb.
- Neue Skills ohne CLAUDE.md-Eintrag → gelb.
- Broken Links in ToC-Tabellen explizit auflisten — nicht pauschal erwähnen.
- Theoretische Verifikation klar als solche kennzeichnen: *„Kein ausführbarer Test — theoretische Analyse."*
