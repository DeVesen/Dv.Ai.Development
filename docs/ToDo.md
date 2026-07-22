# ToDo

## Offene Punkte

### Superpowers Bootstrap verifizieren

**Hintergrund:** Alle lokalen Skills wurden auf Superpowers SDO-Format umgestellt
(`description: Use when...`). Das ist notwendig, aber nicht hinreichend.

Der eigentliche Trigger-Mechanismus hängt davon ab, ob Superpowers' Bootstrap
bei Session-Start läuft. Ohne Bootstrap sind die Skills "dead weight — present
on disk but never invoked." (Quelle: superpowers `writing-skills/SKILL.md`)

**Acceptance-Test (Superpowers-Vorgabe):**
Neue Session öffnen und schreiben:
> "Let's make a react todo list"

Wenn der `brainstorming`-Skill automatisch triggert (ohne expliziten Aufruf),
läuft der Bootstrap korrekt und alle lokalen Skills werden zuverlässig erkannt.

**Referenz:** `.claude/plugins/superpowers/skills/writing-skills/SKILL.md` → Abschnitt SDO
