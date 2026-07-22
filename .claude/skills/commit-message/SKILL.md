---
name: commit-message
description: >
  Use when creating a git commit message: /commit, "commit message schreiben",
  "schreib den commit", "was soll ich committen", "commit text", "commit fuer die Aenderungen".
  Conventional Commits with mandatory work-item scope (AB#123, JIRA-456, #78).
  Outputs a code block only — never executes git commit.
---

## Ablauf

### 1 — Git-Zustand lesen

```bash
git status
git diff
git diff --staged
```

Alle drei ausführen — staged und unstaged zusammen ergeben das vollständige Bild.

### 2 — Work-Item ermitteln

Reihenfolge (erster Treffer gewinnt):

1. **Explizit im Prompt** — User nennt Work-Item direkt (z. B. „für AB#1234")
2. **Konversations-Kontext** — Im bisherigen Gespräch genanntes Work-Item
3. **Branch-Name** — Regex-Extraktion:
   - `AB#\d+` → Azure DevOps Work-Item
   - `[A-Z]{2,}-\d+` → Jira-Issue (z. B. `PROJ-42`)
   - `#\d+` → GitHub-Issue
4. **Nachfragen** — Kein Treffer: einmalig fragen: *„Welches Work-Item betrifft dieser Commit? (z. B. AB#1234)"*

### 3 — Nachricht generieren

**Format (Conventional Commits):**

```
<type>(<work-item>): <imperative summary>

[optionaler Body — nur wenn das "Warum" nicht offensichtlich ist]
```

**Typen:**

| Typ | Wann |
|-----|------|
| `feat` | Neue Funktionalität, sichtbares Feature |
| `fix` | Bugfix |
| `refactor` | Umstrukturierung ohne Verhaltensänderung |
| `perf` | Performance-Verbesserung |
| `test` | Tests hinzufügen oder ändern |
| `docs` | Nur Dokumentation |
| `chore` | Tooling, Konfiguration, Dependencies |
| `build` | Build-System, CI-Konfiguration |
| `style` | Formatierung, kein Logik-Change |
| `revert` | Rückgängig machen eines Commits |

**Subject-Zeile:**
- ≤72 Zeichen (harter Grenzwert)
- ≤50 Zeichen anstreben
- Imperativ: „Add", „Fix", „Remove" — nicht „Added", „Fixes", „Removes"
- Kein Punkt am Ende
- Work-Item immer im Scope: `feat(AB#1234): Add user profile page`

**Body:**
- Nur wenn das „Warum" ohne Kontext unklar ist
- Breaking Changes, Migrations, Security-Fixes → immer Body
- Leerzeile zwischen Subject und Body

### 4 — Ausgabe

Ausschließlich ein Code-Block:

````
```
feat(AB#1234): Add user profile page with avatar upload

Replaces the placeholder with a full edit form. Avatar is stored
in Blob Storage; URL written to the user record on save.
```
````

**Niemals:**
- `git commit` ausführen
- KI-Zuschreibung, „This commit", „Claude"
- Emoji (außer das Projekt verwendet sie konventionell)
- Mehrere Alternativen anbieten — eine Nachricht, die beste

---

## Qualitätscheck vor Ausgabe

- [ ] Work-Item vorhanden?
- [ ] Typ korrekt gewählt?
- [ ] Subject ≤72 Zeichen?
- [ ] Imperativ-Formulierung?
- [ ] Body nur wenn nötig?
