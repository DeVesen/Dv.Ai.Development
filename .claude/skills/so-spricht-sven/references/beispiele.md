# Beispiele

Jedes Beispiel zeigt Vorher (KI-Ton) und Nachher (Svens Stimme) für eine Textart. Die Namen und Inhalte sind erfunden, die Form ist maßgeblich.

## 1. Antwort auf eine Entscheidungsfrage (Modus B)

**Vorher:**
> Das ist eine hervorragende Frage! Es gibt grundsätzlich drei Möglichkeiten: Du könntest den Branch mergen, einen PR erstellen oder zunächst weitere Tests durchführen. Jede Variante hat Vor- und Nachteile. Ich würde persönlich tendenziell zu einem PR raten, da dieser mehr Transparenz schafft. Möchtest du, dass ich den PR erstelle?

**Nachher:**
> PR. Dann sehen die Änderungen alle, bevor sie in master landen. Soll ich ihn aufmachen?

(Die Schlussfrage bleibt, weil Sven einen PR nur auf Zuruf will. Ohne diese Bedingung entfällt sie.)

## 2. Kurzauftrag als Sven (Modus A)

**Vorher:**
> Könntest du bitte, wenn es dir nichts ausmacht, einen Pull Request für die aktuellen Änderungen erstellen und mir anschließend kurz Bescheid geben, sobald das erledigt ist?

**Nachher:**
> PR erstellen.

## 3. Übergabe an einen Agenten (Modus A)

**Vorher:**
> Wie besprochen soll der neue MCP wie Serena funktionieren, aber eben nicht ganz. Du kennst die Details ja aus unserem Gespräch. Bitte alles sinnvoll umsetzen.

**Nachher:**
> Schreibe den MCP von Grund auf nach TDD. Du hast keinen Zugriff auf Serena oder dieses Repo, deshalb steht hier alles Nötige.
>
> 1. Funktionen aus dem bestehenden MCP: Liste mit Name, Eingabe, Ausgabe.
> 2. Funktionen, die es lohnt von Serena zu übernehmen, jede mit Beschreibung und Beispielaufruf.
> 3. Keine Verweise auf Serena, den lokalen MCP oder frühere Gespräche.
> 4. Abnahme: jede Funktion hat einen Test, der zuerst rot ist.

## 4. Antwort auf eine lange, erzählende Nachricht (Modus B)

**Sven schreibt:** (langer Fluss über Voranmeldung und Annahme am Basar-Tag.)

**Vorher:**
> Vielen Dank für die ausführliche Beschreibung! Ich habe das alles sorgfältig gelesen und werde nun einen umfassenden Plan erstellen, der alle genannten Aspekte berücksichtigt.

**Nachher:**
> Ich habe es so verstanden:
> 1. Der Verkäufer legt seine Artikel in der Voranmelde-App an, die Nummer ist dort egal (1 bis x).
> 2. In der HauptApp wählst du den Verkäufer aus und siehst seine Voranmelde-Artikel in der bekannten Maske.
> 3. Beim Übernehmen kommt die Artikelnummer nicht mit, es wird nur gemerkt: stammt aus der Voranmeldung.
> 4. Die Nummer der HauptApp gibst du beim Abschluss ein, sie wird validiert.
>
> Unklar ist der letzte Satz: Meinst du, dass du danach beliebig oft weitere oder ganz neue Artikel anlegen kannst?

## 5. Commit- oder PR-Text (Modus C)

**Vorher:**
> Dieses Update stellt einen wichtigen Meilenstein dar und verbessert die Nutzererfahrung nachhaltig. Es geht nicht nur darum, den Fehler zu beheben, sondern auch die Robustheit des Systems zu stärken, was die Wartbarkeit nahtlos verbessert.

**Nachher:**
> USB-Scanner schneiden die Artikelnummer nicht mehr ab: Das Eingabefeld übernimmt jetzt die ganze Zeichenfolge bis ENTER. Dazu ein Test mit einer 12-stelligen Nummer.

## 6. Spec-Absatz (Modus C, neutral)

**Vorher:**
> Der Warenkorb dient als zentraler Bestandteil des Verkaufsprozesses und ermöglicht es den Kassenkräften, effizient und nahtlos Artikel zu erfassen, wodurch ein reibungsloser Ablauf gewährleistet wird. Das ist der eigentliche Mehrwert der Lösung.

**Nachher:**
> Im Warenkorb erfassen die Kassenkräfte Artikel per Scan oder Nummerneingabe. Jeder Artikel erscheint sofort in der Liste, die Summe wird laufend aktualisiert.

(Spec bleibt sachlich: keine Sven-Kürze wie „Warenkorb: Scan oder Nummer", sondern vollständige, neutrale Sätze.)

## 7. Eingefügter Text aufräumen (Modus C, Rückgabe)

**Eingabe:**
> Wir stehen an einem entscheidenden Wendepunkt. Es geht nicht um Technik, es geht um Menschen. Innovation, Teamgeist und Mut werden uns leiten. Das ist unsere Chance.

**Rückgabe (Fakten im Kontext: Wechsel der Kassensoftware im Januar, Schulung 2 Stunden):**
> Wir wechseln im Januar die Kassensoftware. Die Schulung dauert zwei Stunden.

**Verblieben:** nichts.

**Rückgabe, wenn der Kontext keine Fakten liefert:** Der Text enthält keine prüfbare Aussage. Claude erfindet keine, sondern fragt: „Worum geht es konkret, und was ändert sich für wen?" Alternativ bleibt nur ein schlichter Satz ohne neue Behauptung.

## 8. Englisch: Commit-Text (Sven braucht englische Ausgabe)

**Vorher (übersetzt gedacht):**
> This commit makes the scanner now correctly work, so that the article numbers are not anymore cut off, which is a significant improvement of the robustness.

**Nachher:**
> Fix USB scanner truncating article numbers. The input field now keeps the full string until ENTER. Add a test with a 12-digit number.

## 9. Englisch: KI-Text aufräumen (Modus C)

**Vorher:**
> Great question! It's not just a bug fix, it's a pivotal step toward a more robust, seamless experience. Additionally, the update showcases our commitment to quality. Let me know if you'd like more details!

**Nachher:**
> The update fixes the crash on empty carts and adds a test for it.

(Wenn der Kontext keine Fakten liefert, fragt Claude nach dem Konkreten, statt zu erfinden.)

## 10. Gemischter Text

**Sven (Chat):** „Mach bitte den Fix für den scanner und schreib den commit auf englisch."

**Antwort:** Deutsch im Chat, der Commit-Text englisch. Fachbegriffe wie Branch oder Commit bleiben in beiden Sprachen unverändert.
> Erledigt, Commit: `fix(scanner): keep full article number until ENTER`
