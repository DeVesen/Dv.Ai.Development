'use strict';

// Setzt aus einem geprüften Entwurf und dem Snapshot der Session den Erfahrungsbericht zusammen.

const { parseDraft, newTargets } = require('./retro-draft');

const IDEA = /^- \*\*(.+?)\*\*/;

function trimBlank(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === '') start += 1;
  while (end > start && lines[end - 1].trim() === '') end -= 1;
  return lines.slice(start, end);
}

function withAppended(lines, added) {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end -= 1;
  const lead = end === 0 ? [''] : [];
  return [...lead, ...lines.slice(0, end), ...added, ...lines.slice(end)];
}

function withoutDuplicateIdeas(lines) {
  const seen = new Set();
  return lines.filter((line) => {
    const name = line.match(IDEA)?.[1];
    if (!name) return true;
    const first = !seen.has(name);
    seen.add(name);
    return first;
  });
}

// „Neue Ideen“ nennt jedes neu:-Ziel genau einmal: fehlende hängt das Skript an, doppelte fallen weg.
function ideaLines(sectionLines, targets) {
  const kept = withoutDuplicateIdeas(sectionLines);
  const named = new Set(kept.map((line) => line.match(IDEA)?.[1]).filter(Boolean));
  const missing = [...new Map(targets.filter((target) => !named.has(target.name)).map((target) => [target.name, target])).values()];
  if (missing.length === 0) return kept;
  const added = missing.map((target) => `- **${target.name}** (\`neu:\` ${target.art}): sichtbar geworden an „${target.finding}“`);
  return withAppended(kept.filter((line) => line.trim() !== '- keine'), added);
}

function headerLine(snapshot, date) {
  return `**Session:** Modell ${snapshot.model || '?'} · Skills ${snapshot.skills.join(', ') || '-'} · ${date}`;
}

function compose(text, snapshot, date) {
  const draft = parseDraft(text);
  const titleAt = draft.head.findIndex((line) => /^# /.test(line));
  const relevanceAt = draft.head.findIndex((line) => line.startsWith('**Relevanz:**'));
  const targets = newTargets(text);
  const sections = [...draft.sections.entries()]
    .flatMap(([name, lines]) => [`## ${name}`, ...(name === 'Neue Ideen' ? ideaLines(lines, targets) : lines)]);
  return [
    draft.title,
    '',
    headerLine(snapshot, date),
    ...trimBlank(draft.head.slice(titleAt + 1, relevanceAt)),
    `**Kennzahlen:** ${snapshot.headline}.`,
    '',
    '## Zahlen',
    snapshot.numbers,
    '',
    '## MCP-Nutzung',
    '',
    snapshot.mcp,
    '',
    ...trimBlank(draft.head.slice(relevanceAt)),
    '',
    ...sections,
  ].join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n');
}

module.exports = { compose };
