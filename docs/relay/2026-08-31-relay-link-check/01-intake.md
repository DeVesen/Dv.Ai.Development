# Intake — 2026-08-31-relay-link-check

**Requester:** Sven (repo owner)

**Request, in the requester's words:**

> "Die Relay-Skills verweisen teils auf Dateien unter `references/` — wenn so ein
> Link ins Leere zeigt, merkt das niemand. Ich hätte gern ein kleines Skript, das
> alle SKILL.md der Relay-Skills auf tote relative Links prüft, damit ich es lokal
> und später in CI laufen lassen kann."

**Clarified in conversation:**
- Only relative links matter; external URLs and pure anchors are out of scope.
- Output should be plain lines a CI log can grep; non-zero exit on any broken link.
- No new dependencies — plain Node.
