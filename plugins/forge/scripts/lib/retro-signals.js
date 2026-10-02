'use strict';

// Messwert-Signale: je Signal eine Prüfung der gemessenen Zahlen und ein Hinweis auf mögliche Ursache oder Lösung.

const BASELINE_HIGH_TOKENS = 40000;
const SILENCE_LONG_MINUTES = 10;

const SIGNALS = [
  { name: 'Tool-Fehler', fires: (m) => m.errors > 0, hint: 'Meldung prüfen; ein Exit-Code ungleich 0 bei grünem Lauf ist kein Befund, sonst Regel im Skill oder Werkzeug nachschärfen.' },
  { name: 'Blockierte Aufrufe', fires: (m) => m.denials > 0, hint: 'Hook oder Berechtigung zu streng, oder der Skill nennt den erlaubten Weg nicht.' },
  { name: 'Abgelehnte Aufrufe', fires: (m) => m.rejections > 0, hint: 'Der Mensch wollte einen anderen Weg; vorher fragen oder den Weg im Skill festlegen.' },
  { name: 'Unterbrechungen', fires: (m) => m.interruptions > 0, hint: 'Der Mensch griff ein; Zwischenstände früher zeigen.' },
  { name: 'Wiederholte Aufrufe', fires: (m) => m.repeats > 0, hint: 'Gleicher Aufruf direkt erneut: Ergebnis war unklar; Ausgabe des Werkzeugs eindeutiger machen.' },
  { name: 'Zusammenfassungen', fires: (m) => m.compactions > 0, hint: 'Zu viel Text im Kontext; große Ergebnisse in Dateien statt in den Verlauf.' },
  { name: 'Erwartete MCP ungenutzt', fires: (m) => m.expectedUnused > 0, hint: 'Im Bericht je Server entscheiden: verzichtbar oder übersehen; die Ersatz-Kandidaten zeigen, womit stattdessen gelesen wurde.' },
  { name: 'Build-Werkzeuge über die Shell', fires: (m) => m.toolchainShell > 0, hint: 'Vorgesehenen Weg prüfen: Skript, Hook oder Skill-Regel.' },
  { name: 'Hohe Grundlast', fires: (m) => m.baselineTokens >= BASELINE_HIGH_TOKENS, hint: 'Große Anhänge der ersten Anfrage (Skill-Liste, Anweisungen, Hook-Texte) kürzen oder abschalten.' },
  { name: 'Cache-Neuaufbau', fires: (m) => m.cacheRebuilds > 0, hint: 'Nach der Pause wurde der ganze Kontext neu geschrieben; vor langen Pausen abschließen oder frisch starten.' },
  { name: 'Große Kontextlasten', fires: (m) => m.contextLoads > 0, hint: 'Ergebnis filtern oder in eine Datei schreiben; jede folgende Anfrage liest es mit.' },
  { name: 'Lange Tool-Läufe', fires: (m) => m.longRuns > 0, hint: 'Gezielter laufen lassen oder im Hintergrund, während anderes weitergeht.' },
  { name: 'Läufe ohne Änderung', fires: (m) => m.idleReruns > 0, hint: 'Gleicher Build-, Test- oder Lint-Lauf ohne Änderung dazwischen: Ergebnis des letzten Laufs weiterverwenden.' },
  { name: 'Mehrfach gelesene Dateien', fires: (m) => m.repeatedReads > 0, hint: 'Ausschnitt lesen oder das Gebrauchte einmal in eine Datei schreiben.' },
  { name: 'Wiederkehrende Shell-Befehle', fires: (m) => m.recurringCommands > 0, hint: 'Kandidat für ein Skript oder einen Hook.' },
  { name: 'Lange Stille', fires: (m) => m.silenceMinutes >= SILENCE_LONG_MINUTES, hint: 'Lange Strecke ohne Text an den Menschen; Zwischenstände geben, damit er früher eingreifen kann.' },
];

function signalHints(measured) {
  const lines = SIGNALS.filter((signal) => signal.fires(measured)).map((signal) => `- ${signal.name}: ${signal.hint}`);
  return lines.length > 0 ? lines : ['- keine Messwert-Signale'];
}

module.exports = { SIGNALS, signalHints };
