# Kundenliste exportieren

Status: bestätigt am 2026-10-22
Art: frei
Basis: abc1234

## Was, wie, wo, warum
Die Kundenliste lässt sich als Datei exportieren, damit das Altsystem sie importieren kann. · Aussage

## Theoretisches Verhalten nach Umsetzung
Der Anwender klickt in der Kundenliste auf „Exportieren“ und erhält eine Datei mit allen angezeigten Kunden. · Aussage

## Soll-Vorgaben
- Exportiert werden die Spalten Name, Ort und Kundennummer. · Aussage
- Der Export enthält nur die gerade gefilterten Kunden. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben eine Kundenliste mit drei Kunden, wenn der Anwender auf „Exportieren“ klickt, dann erhält er eine Datei mit drei Zeilen und den Spalten Name, Ort und Kundennummer. · Aussage
- **AC-02** Gegeben ein Filter auf den Ort „Köln“, wenn der Anwender exportiert, dann enthält die Datei nur die Kunden aus Köln. · Aussage

## Entscheidungen
- **W · Export-Format** · Aussage — CSV.
- **W · Spalten** · Aussage — Name, Ort und Kundennummer.
