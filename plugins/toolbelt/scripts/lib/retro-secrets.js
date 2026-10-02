'use strict';

// Was ein committeter Bericht nicht tragen darf: Geheimnisse aus Befehlen, Eingaben und Fehlertexten
// und lokale Pfade samt Benutzerordner, soweit sie auf das Protokoll oder den Projektordner zeigen.

const { escapeRegExp } = require('./regexp');

// Je Art ein Muster; ein Schlüsselwort zählt erst mit `:` oder `=` und einem Wert ab 8 Zeichen, damit Wörter wie „Tokens“ oder „Token: nein“ nicht anschlagen.
// Das Schlüsselwort darf die Endung eines Namens sein (`API_TOKEN=…`, `DB_PASSWORD=…`), die übliche Form in Shell-Befehlen.
// Grenze: Ein nackter Wert ohne Schlüsselwort und ohne bekanntes Präfix (etwa ein Azure-DevOps-PAT) bleibt unerkannt;
// ein Muster ohne Präfix träfe jeden Hash und jede lange Kennung.
const SECRETS = [
  ['Schlüssel mit Wert', /[\w-]*(?:password|passwort|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*["']?[^\s"'`,;]{8,}/gi],
  ['Bearer-Token', /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/g],
  ['Zugangsdaten in URL', /:\/\/[^\s/:@`]+:[^\s/@`]+@/g],
  ['AWS-Schlüssel', /\bAKIA[0-9A-Z]{16}\b/g],
  ['GitHub-Token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
];
const MASK = '***';
const SOURCE = /^Quelle: `([^`]+)`/m;

function masked(line) {
  return SECRETS.reduce((text, [, pattern]) => text.replace(pattern, MASK), line);
}

// Jeder Treffer einzeln, mit Zeilennummer und maskierter Zeile: Die Meldung trägt das Geheimnis nicht selbst weiter.
// `search` beachtet `lastIndex` der globalen Muster nicht, jede Zeile wird unabhängig geprüft.
function secretViolations(text) {
  return text.split('\n').flatMap((line, index) => SECRETS
    .filter(([, pattern]) => line.search(pattern) !== -1)
    .map(([kind]) => `Geheimnis im Bericht: ${kind} in Zeile ${index + 1}: ${masked(line).trim()}`));
}

// Nur die Zeile `Quelle:` der MCP-Nutzung: Sie nennt den Dateinamen des Protokolls statt seines absoluten Pfads.
function withFileNameSource(mcp) {
  return mcp.replace(SOURCE, (_, file) => `Quelle: \`${file.split(/[\\/]/).pop()}\``);
}

// Pfade unter dem Projektordner der Session stehen im Bericht relativ zu ihm; Tool-Eingaben mischen `/` und `\`,
// Windows-Pfade (mit Laufwerksbuchstaben) vergleicht es ohne Groß-/Kleinschreibung. Pfade außerhalb bleiben, wie sie sind.
function relativeToProject(text, cwd) {
  const root = String(cwd ?? '').replace(/[\\/]+$/, '');
  if (!text || !root) return text;
  const pattern = root.split(/[\\/]/).map(escapeRegExp).join('[\\\\/]');
  return text.replace(new RegExp(`${pattern}[\\\\/]`, /^[A-Za-z]:/.test(root) ? 'gi' : 'g'), '');
}

module.exports = { secretViolations, withFileNameSource, relativeToProject };
