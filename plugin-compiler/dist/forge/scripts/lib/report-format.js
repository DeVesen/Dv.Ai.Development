'use strict';

// Format der Bericht-Daten, die ein Review direkt in der Ablage der Session-Kette ablegt (`bericht-review.json`,
// `bericht-followup-<n>.json`). Dateien ohne dieses Format stammen aus der früheren Doppel-Betriebsart: Sie werden nicht
// gelesen und nicht migriert; wer sie lesen müsste, meldet `Ablage im alten Format`.

const { FlowError } = require('./flow-error');

const REPORT_FORMAT = 2;

class ReportFormatError extends FlowError {}

function assertCurrentFormat(data, file) {
  if (data?.format !== REPORT_FORMAT) throw new ReportFormatError(`Ablage im alten Format: ${file}`);
  return data;
}

module.exports = { REPORT_FORMAT, ReportFormatError, assertCurrentFormat };
