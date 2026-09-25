#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TASK_HEADING = /^###\s+Task\s+(\d+):/;
const SECTION_HEADING = /^##\s/;
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const RULE = /^---\s*$/;
const USAGE = 'Aufruf: node plan-tasks.js list <plan> | brief <plan> <n> <dir> | header <plan> <dir> | slug <plan>\n';

class PlanError extends Error {}

function readLines(planPath) {
  try {
    return fs.readFileSync(planPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
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

function scanPlan(lines) {
  const fenced = markFences(lines);
  const tasks = [];
  let headerEnd = -1;
  let open = null;
  lines.forEach((line, index) => {
    if (fenced[index]) return;
    const heading = TASK_HEADING.exec(line);
    if (heading || (open && SECTION_HEADING.test(line))) {
      if (open) open.end = index;
      open = heading ? { number: Number(heading[1]), start: index, end: lines.length } : null;
      if (open) tasks.push(open);
      return;
    }
    if (headerEnd === -1 && tasks.length === 0 && RULE.test(line)) headerEnd = index;
  });
  const firstTask = tasks.length > 0 ? tasks[0].start : lines.length;
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
  return file;
}

function writeBrief(planPath, number, dir) {
  return writeFile(dir, `task-${number}-brief.md`, buildBrief(planPath, number));
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
  list: { arity: 1, run: ([plan]) => listTasks(plan).join('\n') },
  brief: { arity: 3, run: ([plan, number, dir]) => writeBrief(plan, Number(number), dir) },
  header: { arity: 2, run: ([plan, dir]) => writeHeader(plan, dir) },
  slug: { arity: 1, run: ([plan]) => slugOf(plan) },
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

if (require.main === module) main();

module.exports = { PlanError, scanPlan, numberingError, listTasks, buildHeader, buildBrief, writeBrief, writeHeader, slugOf };
