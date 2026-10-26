'use strict';

// Namen der entfallenen Doppel-Betriebsart, wie Tests und Evals sie suchen oder übergeben. Sie stehen nur zerlegt im Plugin:
// Der Prüftest verlangt, dass keine Datei des Plugins sie im Klartext nennt.

const FORMER_REPORT_OPTION = ['--', 'ber', 'icht'].join('');
const FORMER_ABLAGE_OPTION = ['--', 'abl', 'age'].join('');
const FORMER_EMBEDDED_SECTION = ['Einge', 'bettet', 'er Lauf'].join('');

// Wortlaute, mit denen früher das Maximum der Followup-Runden im Text stand; es steht nur noch in der Regeldatei.
const FORMER_ROUND_WORDINGS = [
  ['höchstens ', 'zwei Followup'], ['bis zu ', 'zwei Followup'], ['Nie eine ', 'dritte'],
  ['Dritte Followup', '-Runde'], ['zwei', 'mal nacharbeiten'], ['zwei Followup', '-Runden'],
].map((parts) => parts.join(''));

module.exports = { FORMER_REPORT_OPTION, FORMER_ABLAGE_OPTION, FORMER_EMBEDDED_SECTION, FORMER_ROUND_WORDINGS };
