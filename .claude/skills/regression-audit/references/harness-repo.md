# Harness- / Config- / Doku-Repo — Regressions-Audit Playbook

## Anwendungsbereich

Dieses Playbook greift, wenn:
- kein klassisches Test-Tooling gefunden wurde, **oder**
- es sich um ein Harness-Repo handelt (`.claude/skills/`, `CLAUDE.md`, keine Produktivcode-Artefakte), **oder**
- es sich um ein reines Config- oder Doku-Repo handelt (Markdown, YAML, JSON).

---

## Kernmechanismus: Referenzintegrität statt Tests

Ohne klassische Tests lautet die Prüffrage:

> Wurde Definition X geändert, ohne alle Stellen zu aktualisieren, die X referenzieren?

---

## Schritt 1: Geänderte Definitions-Dateien identifizieren

```bash
git log --oneline --since="N days ago" --name-only --diff-filter=ACMRD
```

Dateitypen mit Regressions-Relevanz in diesem Kontext:

| Dateityp | Regressions-Risiko |
|----------|--------------------|
| `SKILL.md` | Trigger, Opt-out, Dateinamen in ToC-Tabellen geändert? |
| `references/op-*.md` | Ablauf geändert ohne SKILL.md-ToC-Update? |
| `CLAUDE.md` | Verweise auf Skills/MCPs/Pfade noch aktuell? |
| `*.json` (Settings, MCP-Config) | Feld umbenannt → alle referenzierenden Stellen geprüft? |
| Prompt-Templates | Variable oder Platzhalter umbenannt → alle Verwender mitgezogen? |

---

## Schritt 2: Referenzintegrität prüfen

Für jede geänderte Definitions-Datei:

1. **Wer referenziert diese Datei?** (Grep auf Dateinamen / Symbol / Key)
2. **Wurden diese referenzierenden Stellen ebenfalls angepasst?**
3. **Sind alle Links in ToC-Tabellen (SKILL.md) noch gültig?**

```bash
# Beispiel: Wurde eine references/-Datei umbenannt?
grep -r "references/alter-name.md" .claude/skills/
```

---

## Schritt 3: Test-Drift-Äquivalent (Skill-Drift)

Wurde eine `SKILL.md` geändert, ohne dass die Änderung durch eine erkennbare
Anforderung aus einem Issue, einer Konversation oder einem Kommentar begründet ist?
→ gelb im Test-Drift-Abschnitt des Reports (Bezeichnung: „Skill-Drift-Signal").

Wurde ein `references/op-*.md` geändert, das Abläufe beschreibt, ohne dass die
übergeordnete `SKILL.md` angepasst wurde?
→ gelb (Ablauf und ToC sind auseinander gedriftet).

---

## Report-Hinweise für Harness- / Doku-Repos

- Umbenannte Dateien ohne Grep auf alle Referenzierenden → immer rot.
- Geänderte Frontmatter-Felder (`name`, Trigger) ohne CLAUDE.md-Update → gelb.
- Neue Skills ohne Eintrag in CLAUDE.md → gelb.
- Broken Links in ToC-Tabellen explizit auflisten, nicht pauschal erwähnen.
