# Eigenes Glossar-Format

Gilt nur, wenn `glossary-target.md` das eigene Glossar gewählt hat.

## CONTEXT.md

```markdown
# Glossar — <Bereich>

<ein Satz: wofür dieser Bereich steht>

| Begriff | Bedeutung | Nicht verwenden |
|---|---|---|
| **<kanonischer Begriff>** | <was er IST, höchstens zwei Sätze> | <Synonyme, kommagetrennt> |
```

- Ein Konzept, ein kanonischer Begriff. Konkurrierende Wörter stehen unter „Nicht verwenden“.
- Nur projektspezifische Fachbegriffe, keine allgemeinen Programmierbegriffe.
- Die Bedeutung sagt, was der Begriff IST, nicht, wie er umgesetzt ist.

## CONTEXT-MAP.md

Nur bei mehreren Bereichen. Sie listet jeden Bereich mit dem Pfad zu seinem `CONTEXT.md` und einem Satz Beschreibung:

```markdown
# Kontext-Karte

| Bereich | Glossar | Beschreibung |
|---|---|---|
| <Bereich> | `<pfad>/CONTEXT.md` | <ein Satz> |
```
