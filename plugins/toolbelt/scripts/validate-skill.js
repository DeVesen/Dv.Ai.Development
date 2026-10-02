#!/usr/bin/env node
'use strict';

// Prüft den Kopf eines Skill-Ordners; Fehler beenden den Aufruf mit Exit 1, Warnungen nicht.

const { validateSkill, reportLines } = require('./lib/validate-skill');

const USAGE = 'Aufruf: node validate-skill.js <skill-ordner>\n';

function main(argv) {
  if (argv.length !== 1) {
    process.stderr.write(USAGE);
    return 2;
  }
  const result = validateSkill(argv[0]);
  process.stdout.write(`${reportLines(result).join('\n')}\n`);
  return result.errors.length === 0 ? 0 : 1;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main };
