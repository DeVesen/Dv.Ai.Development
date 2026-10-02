#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { toPosix } = require('./lib/posix');

const TASK_HEADING = /^###\s+Task\s+(\d+):/;
const SECTION_HEADING = /^##\s/;
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const RULE = /^---\s*$/;
const USAGE = 'Aufruf: node plan-tasks.js list <plan> | brief <plan> <n> <dir> | header <plan> <dir> | slug <plan> | anchors <plan> <repo> <out>\n';

class PlanError extends Error {}

// Die eine Zerlegung eines Plan-Texts in Zeilen; readLines und die Skript-Prüfungen in plan-checks.js teilen sie.
function splitLines(text) {
  return String(text).replace(/\r\n/g, '\n').split('\n');
}

function readLines(planPath) {
  try {
    return splitLines(fs.readFileSync(planPath, 'utf8'));
  } catch {
    throw new PlanError(`Plan nicht gefunden oder nicht lesbar: ${planPath}`);
  }
}

function closesFence(fence, open) {
  return fence !== null && fence[1][0] === open[0] && fence[1].length >= open.length && fence[2].trim() === '';
}

function markFences(lines) {
  let open = null;
  return lines.map((line) => {
    const fence = FENCE.exec(line);
    if (open === null) {
      if (fence) open = fence[1];
      return fence !== null;
    }
    if (closesFence(fence, open)) open = null;
    return true;
  });
}

// Die eine Task-Zerlegung: Ein Task beginnt an einer Überschrift nach heading und endet an der nächsten Task- oder ##-Überschrift.
function taskSections(lines, heading = TASK_HEADING, fenced = markFences(lines)) {
  const sections = [];
  let open = null;
  lines.forEach((line, index) => {
    if (fenced[index]) return;
    const match = heading.exec(line);
    if (!match && !(open && SECTION_HEADING.test(line))) return;
    if (open) open.end = index;
    open = match ? { token: match[1], start: index, end: lines.length } : null;
    if (open) sections.push(open);
  });
  return sections;
}

function scanPlan(lines) {
  const fenced = markFences(lines);
  const tasks = taskSections(lines, TASK_HEADING, fenced).map(({ token, start, end }) => ({ number: Number(token), start, end }));
  const firstTask = tasks.length > 0 ? tasks[0].start : lines.length;
  let headerEnd = -1;
  for (let index = 0; index < firstTask && headerEnd === -1; index += 1) {
    if (!fenced[index] && RULE.test(lines[index])) headerEnd = index;
  }
  return { tasks, headerEnd: headerEnd === -1 ? firstTask : headerEnd };
}

function numberingError(tasks) {
  if (tasks.length === 0) return 'Kein Task gefunden (erwartet: "### Task 1: …")';
  const wrong = tasks.findIndex((task, index) => task.number !== index + 1);
  if (wrong === -1) return null;
  return `Task-Nummerierung lückenhaft: an Position ${wrong + 1} steht Task ${tasks[wrong].number}`;
}

function checkedPlan(planPath) {
  const lines = readLines(planPath);
  const scan = scanPlan(lines);
  const error = numberingError(scan.tasks);
  if (error) throw new PlanError(error);
  return { lines, ...scan };
}

function trimTrailing(block) {
  let end = block.length;
  while (end > 0 && (block[end - 1].trim() === '' || RULE.test(block[end - 1]))) end -= 1;
  return block.slice(0, end);
}

function listTasks(planPath) {
  return checkedPlan(planPath).tasks.map((task) => task.number);
}

const FILE_LINE = /^\s*-\s*(Create|Modify|Test):\s*`([^`:]+)(?::(\d+)-(\d+))?(?::[^`]*)?`(.*)$/;
const ANCHOR_REST = /^\s*·\s*(.+?)\s*$/;
const INTERFACE_LINE = /^\s*-\s*(Produces|Consumes):\s*(.+)$/;

function parseFileLine(line) {
  const match = FILE_LINE.exec(line);
  if (!match) return null;
  const anchor = ANCHOR_REST.exec(match[5]);
  return {
    kind: match[1],
    path: match[2].trim(),
    range: match[3] ? { from: Number(match[3]), to: Number(match[4]) } : null,
    anchor: anchor ? anchor[1].replace(/^`([^`]*)`.*$/, '$1') : null,
  };
}

function taskTitle(lines, task) {
  return lines[task.start].replace(TASK_HEADING, '').trim();
}

function describeTask(lines, task) {
  const block = lines.slice(task.start, task.end);
  const title = taskTitle(lines, task);
  const files = [];
  const interfaces = { Produces: [], Consumes: [] };
  let fences = 0;
  for (const line of block) {
    const file = parseFileLine(line);
    if (file) files.push({ kind: file.kind, path: file.path });
    const iface = INTERFACE_LINE.exec(line);
    if (iface) interfaces[iface[1]].push(iface[2].trim());
    if (FENCE.test(line)) fences += 1;
  }
  return { number: task.number, title, files, interfaces, codeBlocks: Math.floor(fences / 2) };
}

function describeTasks(planPath) {
  const { lines, tasks } = checkedPlan(planPath);
  return tasks.map((task) => describeTask(lines, task));
}

function recommendModel(description) {
  const changed = description.files.filter((file) => file.kind !== 'Test').length;
  return changed <= 1 && description.codeBlocks >= 2 ? 'haiku' : 'sonnet';
}

function sharedFiles(descriptions) {
  const byPath = new Map();
  for (const description of descriptions) {
    for (const file of description.files) {
      const numbers = byPath.get(file.path) ?? [];
      if (!numbers.includes(description.number)) numbers.push(description.number);
      byPath.set(file.path, numbers);
    }
  }
  return [...byPath.entries()].filter(([, numbers]) => numbers.length > 1);
}

function formatOverview(descriptions) {
  const rows = descriptions.map((description) => {
    const files = description.files.map((file) => file.path).join(', ') || '-';
    const produces = description.interfaces.Produces.join('; ') || '-';
    const consumes = description.interfaces.Consumes.join('; ') || '-';
    return `Task ${description.number}: ${description.title} | Dateien: ${files} | Produces: ${produces} | Consumes: ${consumes} | Modell: ${recommendModel(description)}`;
  });
  const shared = sharedFiles(descriptions).map(([file, numbers]) => `MEHRFACH ${file}: ${numbers.map((n) => `Task ${n}`).join(', ')}`);
  return [...rows, ...shared].join('\n');
}

function buildHeader(planPath) {
  const { lines, headerEnd } = checkedPlan(planPath);
  return `${trimTrailing(lines.slice(0, headerEnd)).join('\n')}\n`;
}

function buildBrief(planPath, number) {
  const { lines, tasks, headerEnd } = checkedPlan(planPath);
  const task = tasks.find((entry) => entry.number === number);
  if (!task) throw new PlanError(`Task ${number} nicht im Plan: ${planPath}`);
  const header = trimTrailing(lines.slice(0, headerEnd));
  const body = trimTrailing(lines.slice(task.start, task.end));
  return `${[...header, '', ...body].join('\n')}\n`;
}

function writeFile(dir, name, content) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return toPosix(file);
}

function writeBrief(planPath, number, dir) {
  return writeFile(dir, `task-${number}-brief.md`, buildBrief(planPath, number));
}

function briefWithModel(planPath, number, dir) {
  const file = writeBrief(planPath, number, dir);
  const description = describeTasks(planPath).find((entry) => entry.number === number);
  return `${file}\nmodell=${recommendModel(description)}`;
}

function writeHeader(planPath, dir) {
  return writeFile(dir, 'header-brief.md', buildHeader(planPath));
}

function slugOf(planPath) {
  const absolute = path.resolve(planPath);
  const name = path.basename(absolute);
  if (name.toLowerCase() === 'plan.md') return path.basename(path.dirname(absolute));
  return path.basename(name, path.extname(name));
}

const COMMANDS = {
  list: { arity: 1, run: ([plan]) => formatOverview(describeTasks(plan)) },
  brief: { arity: 3, run: ([plan, number, dir]) => briefWithModel(plan, Number(number), dir) },
  header: { arity: 2, run: ([plan, dir]) => writeHeader(plan, dir) },
  slug: { arity: 1, run: ([plan]) => slugOf(plan) },
  anchors: { arity: 3, run: ([plan, repo, out]) => require('./plan-anchors').writeAnchors(plan, repo, out) },
};

function isValidCall(command, args) {
  if (!Object.hasOwn(COMMANDS, command) || args.length !== COMMANDS[command].arity) return false;
  return command !== 'brief' || /^\d+$/.test(args[1]);
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!isValidCall(command, args)) {
    process.stderr.write(USAGE);
    process.exit(2);
  }
  try {
    process.stdout.write(`${COMMANDS[command].run(args)}\n`);
  } catch (error) {
    if (!(error instanceof PlanError)) throw error;
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  PlanError, scanPlan, numberingError, listTasks, describeTasks, recommendModel, formatOverview, buildHeader, buildBrief, writeBrief, writeHeader, slugOf,
  checkedPlan, markFences, parseFileLine, taskTitle, taskSections, splitLines,
};

// Nach module.exports: das Kommando anchors lädt plan-anchors.js, das diese Exporte braucht.
if (require.main === module) main();
