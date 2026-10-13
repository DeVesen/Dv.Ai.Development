'use strict';

// MSB3021/MSB3026/MSB3027: MSBuild kann eine Ausgabedatei nicht überschreiben, weil ein laufender Prozess sie hält.

const COPY_FAILED = /MSB30(?:21|26|27)/;
const LOCKED_BY = /locked by:?\s*"?([^"\r\n(]+?)\s*\((\d+)\)/i;

function lockHint(output) {
  const lines = output.split(/\r?\n/);
  if (!lines.some((line) => COPY_FAILED.test(line))) return null;
  const holder = lines.map((line) => LOCKED_BY.exec(line)).find(Boolean);
  const who = holder ? `Gesperrt von Prozess ${holder[1]} (PID ${holder[2]}).` : 'Ein laufender Prozess hält die Datei gesperrt.';
  return `${who} Prozess beenden oder in einen anderen Ordner bauen: \`-- -c Release\` oder \`-- -o <Ordner im Repo>\`. `
    + 'Ein Ausgabeordner außerhalb des Repos kann Tests brechen, die ab `AppContext.BaseDirectory` suchen.';
}

module.exports = { lockHint };
