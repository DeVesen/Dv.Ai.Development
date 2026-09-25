# Titel als URL-Slug

Status: bestätigt am 2026-09-20

## Was, wie, wo, warum
Artikel-Titel sollen als lesbarer Teil einer URL nutzbar sein, damit Links sprechend sind. · Aussage

## Theoretisches Verhalten nach Umsetzung
Aus einem Titel entsteht ein Slug aus Kleinbuchstaben, Ziffern und Bindestrichen. · Aussage

## Soll-Vorgaben
- Node.js 24, keine npm-Abhängigkeiten. · Aussage
- Tests laufen mit `node --test`. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben der Titel „Hallo Welt“, wenn der Slug gebildet wird, dann ist er `hallo-welt`.
- **AC-02** Gegeben der Titel „Über Größe“, wenn der Slug gebildet wird, dann ist er `ueber-groesse`.
- **AC-03** Gegeben ein Titel nur aus Sonderzeichen, wenn der Slug gebildet wird, dann endet der Aufruf mit dem Fehler „Titel ergibt keinen Slug“.

## Entscheidungen
- **W · Umlaute** · Aussage — Umlaute werden ausgeschrieben (ä → ae, ö → oe, ü → ue, ß → ss).
