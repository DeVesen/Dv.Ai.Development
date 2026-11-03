'use strict';

const fs = require('node:fs');
const path = require('node:path');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

function readMarkdown(file) {
  const text = readText(file);
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) return { fields: {}, body: text };
  const fields = Object.fromEntries(match[1].split('\n').map((line) => {
    const index = line.indexOf(':');
    return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
  }));
  return { fields, body: match[2] };
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function listMarkdown(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => path.join(dir, entry));
}

module.exports = { readText, readMarkdown, wordCount, listMarkdown };
