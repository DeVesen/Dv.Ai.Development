# Bestellstatus abfragen

Status: bestätigt am 2026-09-20

## Was, wie, wo, warum
Kunden sollen den Status einer Bestellung selbst abfragen können, damit weniger Support-Anfragen entstehen. · Aussage

## Theoretisches Verhalten nach Umsetzung
Ein Kunde fragt eine Bestellnummer ab und sieht den Status und, falls bezahlt, das Zahlungsdatum. · Aussage

## Soll-Vorgaben
- Antwortzeit unter 2 Sekunden. · Aussage
- Zahlungsdaten kommen vom externen Zahlungsdienst. · Aussage

## Akzeptanzkriterien
- **AC-01** Gegeben eine existierende Bestellung, wenn der Kunde ihre Nummer abfragt, dann sieht er ihren Status.
- **AC-02** Gegeben eine unbekannte Bestellnummer, wenn der Kunde sie abfragt, dann sieht er „Bestellung nicht gefunden“.
- **AC-03** Gegeben eine bezahlte Bestellung, wenn der Kunde sie abfragt, dann sieht er zusätzlich das Zahlungsdatum.
- **AC-04** Gegeben der Zahlungsdienst antwortet nicht, wenn der Kunde eine bezahlte Bestellung abfragt, dann sieht er den Status ohne Zahlungsdatum und den Hinweis „Zahlungsdaten derzeit nicht verfügbar“.

## Entscheidungen
- **W · Kanal** · Aussage — Abfrage nur über die bestehende HTTP-API, keine neue Oberfläche.
