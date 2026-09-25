---
name: domain-modeling
description: Use when domain terms in a conversation are fuzzy, overloaded, or contradict the project glossary, the code, or module and feature profiles, when a term has just been clarified and belongs in the glossary, or when a hard-to-reverse decision may deserve an ADR.
---

# Domain Modeling

Aktive Begriffsarbeit während eines Gesprächs: Begriffe herausfordern, schärfen, mit Szenarien testen und gegen Code und Profile prüfen. Jeder geklärte Begriff landet sofort im Glossar-Ziel.

## Start

Glossar-Ziel nach `references/glossary-target.md` bestimmen und seine vorhandenen Einträge lesen.

## Während der Sitzung

1. **Gegen das Glossar prüfen.** Widerspricht ein verwendeter Begriff dem Glossar, sofort benennen: verwendetes Wort, Glossar-Eintrag, Unterschied.
2. **Unscharfe Begriffe schärfen.** Einen kanonischen Begriff vorschlagen; konkurrierende Wörter kommen unter „Nicht verwenden“.
3. **Szenarien erzwingen.** Grenzfälle mit konkreten Szenarien durchspielen, etwa: „Ein Kunde kündigt am Tag der Verlängerung — ist das noch ein aktiver Vertrag?“
4. **Gegen Code und Profile prüfen.** Widerspricht eine Aussage dem Code oder einem Profil, mit Fundstelle benennen.
5. **Sofort schreiben.** Ein geklärter Begriff geht direkt ins Glossar-Ziel, nicht gesammelt am Ende. Format im eigenen Glossar: `references/context-format.md`.
6. **ADRs sparsam.** Nur anbieten, wenn alle drei Kriterien aus `references/adr-format.md` zutreffen. Geschrieben wird erst nach Zustimmung.

## Was ins Glossar gehört

Nur Begriffe: kanonischer Name, Bedeutung, zu meidende Synonyme. Keine Implementierungsdetails, keine Spec-Inhalte, keine allgemeinen Programmierbegriffe.

## Red Flags

- „Ich schreibe die Begriffe am Ende gesammelt“ — jeder geklärte Begriff sofort.
- „Das Synonym ist ja gemeint, das lasse ich durchgehen“ — Widerspruch benennen.
- „Die Entscheidung ist wichtig, also ein ADR“ — nur mit allen drei Kriterien.
- „Ich lege `CONTEXT.md` schon mal an“ — erst mit dem ersten geklärten Begriff.
- „Ich schreibe direkt in die Glossar-Datei von working-capturing“ — nur über dessen Skill.
