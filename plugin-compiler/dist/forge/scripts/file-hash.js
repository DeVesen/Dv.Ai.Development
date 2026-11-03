#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const [filePath] = process.argv.slice(2);
  if (!filePath) {
    process.stderr.write('Aufruf: node file-hash.js <pfad>\n');
    process.exit(2);
  }
  try {
    process.stdout.write(`${hashFile(filePath)}\n`);
  } catch {
    process.stderr.write(`Datei nicht gefunden oder nicht lesbar: ${filePath}\n`);
    process.exit(1);
  }
}

if (require.main === module) main();

module.exports = { hashFile };
