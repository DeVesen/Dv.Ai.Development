# Beispiele — testbar vs. untestbar

## Vollständige Durchläufe

### Beispiel 1 — Login-Feature

**Eingabe (Prosa):**
> „Der Nutzer soll sich einloggen können und danach seine Daten sehen."

**Prüfung:**
- Verletzt Kriterium 2 (nicht atomar: zwei Verhalten in einem Kriterium)
- Beide Teilverhalten einzeln schärfbar

**Ausgabe:**

```
## Geschärfte Akzeptanzliste

`Login_MitGültigerEmail_RedirectZuDashboard`
- Arrange: Nutzer mit gültigen Credentials existiert
- Act: POST /auth/login {email, password}
- Assert: HTTP 200, Location-Header = /dashboard
Status: neu

`Login_MitUngültigemPasswort_Returns401`
- Arrange: Nutzer existiert, Passwort falsch
- Act: POST /auth/login {email, wrongPassword}
- Assert: HTTP 401, Body enthält Fehlercode "INVALID_CREDENTIALS"
Status: neu

`GetProfile_NachLogin_ZeigtNutzerdaten`
- Arrange: Nutzer ist eingeloggt (gültiger JWT)
- Act: GET /profile
- Assert: HTTP 200, Response enthält {name, email} des eingeloggten Nutzers
Status: neu

## Befund

> „Der Nutzer soll sich einloggen können und danach seine Daten sehen."
Schärfbar weil: Kriterium 2 (nicht atomar — zwei Verhalten)
→ Aufgeteilt in drei Kriterien (Login-Erfolg, Login-Fehler, Profil-Abruf)
```

---

### Beispiel 2 — Performance-Anforderung (Rückfrage nötig)

**Eingabe:**
> „Das System soll schnell reagieren."

**Prüfung:**
- Verletzt Kriterium 1 (kein messbares Ergebnis: „schnell" ist subjektiv)
- Nicht schärfbar ohne Schwellenwert

**Ausgabe:**

```
## Rückfragen

1. Was gilt als „schnell"? Bitte einen Schwellenwert nennen (z. B. „Antwort unter 200 ms" oder „p95 < 500 ms unter Last").
```

*(Nach Antwort: Akzeptanzliste ausgeben)*

---

### Beispiel 3 — Implementierungsdetail (schärfbar)

**Eingabe:**
> „Bestellungen sollen via Redis gecacht werden."

**Prüfung:**
- Verletzt Kriterium 5 (nicht lösungswegfrei: beschreibt WIE, nicht WAS)
- Schärfbar: das Ziel ist vermutlich Latenz

**Ausgabe:**

```
## Geschärfte Akzeptanzliste

`GetOrder_WiederholterAbruf_AntwortetUnter50ms`
- Arrange: Bestellung wurde bereits einmal abgerufen
- Act: GET /orders/{id} (zweiter Aufruf)
- Assert: HTTP 200, Antwortzeit < 50 ms (ohne erneute DB-Abfrage messbar via Response-Header X-Cache: HIT)
Status: neu

## Befund

> „Bestellungen sollen via Redis gecacht werden."
Schärfbar weil: Kriterium 5 (Implementierungsdetail statt Verhalten)
→ Geschärft auf beobachtbares Latenz-/Cache-Verhalten
```

---

## Schnell-Referenz: testbar vs. untestbar

| Formulierung | Problem | Geschärft |
|---|---|---|
| „funktioniert korrekt" | Kriterium 1 (subjektiv) | `<Method>_<Situation>_<Ergebnis>` mit binärem Assert |
| „sollte besser sein" | Kriterium 1 (kein Schwellenwert) | Rückfrage |
| „einloggen und Profil sehen" | Kriterium 2 (nicht atomar) | Zwei separate Kriterien |
| „intern im Service-Layer validieren" | Kriterium 3 (nicht beobachtbar) | Über API-Response formulieren |
| „wenn etwas schiefgeht" | Kriterium 4 (keine Vorbedingung) | Rückfrage: welcher Fehlerfall? |
| „via Redis speichern" | Kriterium 5 (Lösungsweg) | Auf Latenz/Verhalten umformulieren |
