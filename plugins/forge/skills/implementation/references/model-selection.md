# Modellwahl

Nimm für jede Rolle das schwächste Modell, das sie sicher schafft; das spart Kosten und Zeit. Gib das Modell bei jedem `Agent`-Aufruf ausdrücklich mit `model` an. Ohne Angabe erbt der SubAgent das Modell dieser Session, meist das teuerste.

## Rundenzahl schlägt Token-Preis
Schwache Modelle brauchen bei mehrschrittiger Arbeit oft zwei- bis dreimal so viele Runden und kosten am Ende mehr. `sonnet` ist deshalb die Untergrenze für Task- und Final-Reviews und für Umsetzer, die aus Prosa arbeiten.

## Umsetzer
| Auftrag | Modell |
|---|---|
| Der Brief enthält den vollständigen Code; Umsetzen heißt Abschreiben und Testen | `haiku` |
| Mechanischer Fix in einer Datei | `haiku` |
| Mehrere Dateien mit Integrationsfragen oder Arbeit aus Prosa | `sonnet` |
| Design-Urteil oder breites Verständnis des Codes nötig | `opus` |

## Reviewer
| Rolle | Modell |
|---|---|
| Task-Review | `sonnet`; bei heiklen Diffs (Nebenläufigkeit, Security, Verträge, großer Umfang) `opus` |
| Re-Review einer kleinen Fix-Runde | `haiku`, sonst `sonnet` |
| Final-Review | immer `opus` |

## Eskalation in der Fix-Schleife
Ab Runde 4 übernimmt ein frischer Umsetzer eine Stufe über dem bisherigen: `haiku` → `sonnet` → `opus`; `opus` bleibt `opus`.
