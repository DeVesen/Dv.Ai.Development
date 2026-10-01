'use strict';

// Bausteine der Init-Skills: Hinweisblock und MCP-Sätze in der CLAUDE.md, MCP-Einträge in der .mcp.json, Schalter für den Hook.
// Die Textfunktionen sind rein; nur die Funktionen ab applyClaudeMd berühren Dateien.
// Diese Datei ist in dv-dotnet und dv-angular inhaltsgleich, weil Plugins keine Dateien teilen.

const fs = require('node:fs');
const path = require('node:path');

const MCP_START = '<!-- dv-mcp:start -->';
const MCP_END = '<!-- dv-mcp:end -->';

const MCP_SERVERS = {
  context7: {
    entry: { type: 'http', url: 'https://mcp.context7.com/mcp' },
    sentence: 'Bei Fragen zu Bibliotheken und Frameworks den MCP `context7` nutzen.',
  },
  'microsoft-learn': {
    entry: { type: 'http', url: 'https://learn.microsoft.com/api/mcp' },
    sentence: 'Bei Fragen zur Microsoft- und .NET-Dokumentation den MCP `microsoft-learn` nutzen.',
  },
};

function eolOf(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function appended(text, block) {
  const eol = eolOf(text);
  if (text === '') return `${block}${eol}`;
  const gap = text.endsWith(eol) ? eol : `${eol}${eol}`;
  return `${text}${gap}${block}${eol}`;
}

function withBlock(text, start, end, block) {
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  return pattern.test(text) ? text.replace(pattern, () => block) : appended(text, block);
}

// Hinweisblock eines Stack-Plugins; ohne Befehle und ohne Pfade, nur der Skill-Name.
function withStackBlock(text, stack) {
  const start = `<!-- ${stack.plugin}:start -->`;
  const end = `<!-- ${stack.plugin}:end -->`;
  const block = [
    start,
    `## ${stack.plugin}`,
    '',
    `- Bauen, Testen, Linten: Skill \`${stack.skill}\` aufrufen, bevor gebaut, getestet oder gelintet wird.`,
    end,
  ].join(eolOf(text));
  return withBlock(text, start, end, block);
}

// Ein Satz je MCP, erkennbar an seiner Markierung; der zweite Init-Lauf, gleich welches Plugin, fügt nichts hinzu.
function withMcpSentence(text, server) {
  const marker = `<!-- dv-mcp:${server} -->`;
  if (text.includes(marker)) return text;
  const eol = eolOf(text);
  const line = `- ${MCP_SERVERS[server].sentence} ${marker}`;
  if (text.includes(MCP_END)) return text.replace(MCP_END, () => `${line}${eol}${MCP_END}`);
  return appended(text, [MCP_START, '## MCP-Server', '', line, MCP_END].join(eol));
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObject(text) {
  try {
    const value = JSON.parse(text);
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// jsonText ist der Inhalt der .mcp.json oder null, wenn es sie nicht gibt.
function withMcpServer(jsonText, server) {
  const entry = MCP_SERVERS[server].entry;
  if (jsonText === null) return { status: 'angelegt', text: toJson({ mcpServers: { [server]: entry } }) };
  const config = parseObject(jsonText);
  const servers = config?.mcpServers ?? {};
  if (config === null || !isPlainObject(servers)) return { status: 'ungueltig', text: jsonText };
  if (Object.hasOwn(servers, server)) return { status: 'vorhanden', text: jsonText };
  return { status: 'ergaenzt', text: toJson({ ...config, mcpServers: { ...servers, [server]: entry } }) };
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

// Wendet edit auf die CLAUDE.md im Wurzelordner an und legt sie an, falls sie fehlt. Gibt zurück, ob sich etwas änderte.
function applyClaudeMd(root, edit) {
  const file = path.join(root, 'CLAUDE.md');
  const before = readIfExists(file) ?? '';
  const after = edit(before);
  if (after === before) return false;
  fs.writeFileSync(file, after);
  return true;
}

// Trägt den MCP in die .mcp.json ein. Gibt den Status zurück: angelegt, ergaenzt, vorhanden oder ungueltig.
function applyMcpServer(root, server) {
  const file = path.join(root, '.mcp.json');
  const { status, text } = withMcpServer(readIfExists(file), server);
  if (status === 'angelegt' || status === 'ergaenzt') fs.writeFileSync(file, text);
  return status;
}

function hookMarkerFile(stack) {
  return path.join('.claude', `${stack.plugin}.json`);
}

function writeHookMarker(root, stack) {
  const file = path.join(root, hookMarkerFile(stack));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toJson({ hook: true }));
  return file;
}

function readHookMarker(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')).hook === true;
  } catch {
    return null;
  }
}

// Die erste lesbare Schalter-Datei ab startDir aufwärts entscheidet; ohne Datei ist der Hook aus.
function hookEnabled(startDir, stack) {
  for (let dir = path.resolve(startDir); ; dir = path.dirname(dir)) {
    const marker = readHookMarker(path.join(dir, hookMarkerFile(stack)));
    if (marker !== null) return marker;
    if (path.dirname(dir) === dir) return false;
  }
}

module.exports = { MCP_SERVERS, withStackBlock, withMcpSentence, withMcpServer, applyClaudeMd, applyMcpServer, hookMarkerFile, writeHookMarker, hookEnabled };
