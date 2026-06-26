# Story-Splitting — Pattern nach Richard Lawrence

Ziel jedes Splits: **duenne, vertikale Scheiben**, die je fuer sich Wert liefern und in *einem*
Sprint baubar sind. Nie horizontal nach Schicht (DB / API / UI) schneiden — das ergibt
unauslieferbare Teile.

## Die 9 Pattern

| # | Pattern | Schneide nach … | Typischer Ausloeser |
|---|---------|-----------------|---------------------|
| 1 | **Workflow Steps** | Schritten eines Ablaufs | „Nutzer durchlaeuft mehrere Stationen" |
| 2 | **Business Rule Variations** | Geschaeftsregel-Varianten | viele Sonderfaelle/Regeln in einer Story |
| 3 | **Major Effort** | dem groessten Aufwandsbrocken zuerst | eine Variante kostet 80 % der Zeit |
| 4 | **Simple / Complex** | einfachem Kern vs. komplexen Zusaetzen | „im Kern simpel, mit vielen Ausnahmen" |
| 5 | **Variations in Data** | Datenvarianten (Typen, Quellen, Formate) | „funktioniert fuer X, Y, Z" |
| 6 | **Data Entry Methods** | Eingabe-/Bedienvarianten | mehrere UI-Wege fuer dieselbe Aktion |
| 7 | **Defer Performance** | „erst korrekt, dann schnell" | NFR-Performance treibt den Aufwand |
| 8 | **Operations (CRUD)** | Create / Read / Update / Delete | „Verwaltung von …" |
| 9 | **Break Out a Spike** | Wissen vs. Umsetzung | zu viel Unsicherheit fuer eine Schaetzung |

## Meta-Pattern (Reihenfolge der Anwendung)

1. **Erst Workflow/CRUD** als grobe Achse pruefen — liefert meist die natuerlichsten Scheiben.
2. **Dann Varianten** (Business Rule / Data / Data Entry) anwenden, wenn eine Achse zu dick bleibt.
3. **Simple/Complex + Major Effort** als „Hamburger": die duenne Happy-Path-Scheibe zuerst, Sonder-
   faelle als Folge-Stories.
4. **Spike nur**, wenn ohne Erkenntnisgewinn keine Schaetzung moeglich ist — Spike ist kein Wert,
   sondern Wissensbeschaffung; eng timeboxen.

## Anwendung im Skill

- Bei Story-Schnitt aus einem Feature: 1–2 passende Pattern vorschlagen, **nicht** alle aufzaehlen.
- Jede entstehende Story einzeln gegen [INVEST](invest-check.md) pruefen — besonders **S**mall und
  **V**aluable.
- Ergibt ein Split unauslieferbare Teile (reine Schicht-Slices), Pattern wechseln.
